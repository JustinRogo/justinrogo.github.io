import { test, expect } from "./original-style.mjs";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("jr-v2-assembly-seen", "1"));
  await page.route("https://**/*", (route) => route.abort());
});

test("the raw HTML carries link-preview tags and the page's real text", async ({ page, request }) => {
  const html = await (await request.get("/")).text();
  const tag = (property) => html.match(new RegExp(`property="${property}"\\s+content="([^"]+)"`))?.[1];
  expect(tag("og:title")).toContain("Justin Rogowski");
  expect(tag("og:description")).toBeTruthy();
  expect(tag("og:url")).toBe("https://justinrogo.github.io/");
  const image = tag("og:image");
  expect(image).toMatch(/^https:\/\/justinrogo\.github\.io\//);
  const card = await request.get(new URL(image).pathname);
  expect(card.ok()).toBe(true);
  expect(card.headers()["content-type"]).toContain("image/jpeg");

  // Static copy must stay in step with what the app renders.
  await page.goto("/");
  const flat = html.replace(/\s+/g, " ");
  for (const selector of [".hero-description", ".hero-role > span"]) {
    expect(flat).toContain(await page.locator(selector).innerText());
  }
  expect(flat).toContain("Library Information Coordinator");
});

test("React replaces the static text, which remains readable if the app cannot load", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".glass-hero")).toBeVisible();
  await expect(page.locator(".static-hero")).toHaveCount(0);
  await expect(page.locator("h1:visible")).toHaveCount(1);

  await page.route("**/v2/assets/app.js*", (route) => route.abort());
  await page.goto("/");
  const hero = page.locator(".static-hero");
  await expect(hero.getByRole("heading", { name: "Justin Rogowski" })).toBeVisible();
  await expect(hero).toHaveCSS("opacity", "1");
  await expect(hero.getByRole("link", { name: "Email" })).toHaveAttribute("href", "mailto:justin.rogowski@uconn.edu");

  // Reduced motion cancels animations, which must not leave the text hidden.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(hero).toHaveCSS("opacity", "1");
  await expect(hero.getByRole("heading", { name: "Justin Rogowski" })).toBeVisible();
});

test("the events column only sticks when all of it fits on screen", async ({ page }) => {
  const column = page.locator(".home-events-column");
  await page.setViewportSize({ width: 1366, height: 2000 });
  await page.goto("/?intro=0#/home");
  await expect(column).toHaveCSS("position", "sticky");
  // The app compares offsetHeight, which rounds; a fractional boundingBox height would be off by one.
  const height = await column.evaluate((node) => node.offsetHeight);
  await page.setViewportSize({ width: 1366, height: height + 100 });
  await expect(column).toHaveCSS("position", "static");
  await page.setViewportSize({ width: 1366, height: height + 101 });
  await expect(column).toHaveCSS("position", "sticky");
});

test("the tab title and browser color match the page before and after the app loads", async ({ page, request }) => {
  const html = await (await request.get("/")).text();
  expect(html).toContain("<title>Justin Rogowski · UConn Law Library</title>");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.route("**/v2/assets/app.js*", (route) => route.abort());
  await page.goto("/");
  const color = page.locator('meta[name="theme-color"]');
  await expect(color).toHaveAttribute("content", "#060f23");
  await page.unroute("**/v2/assets/app.js*");
  await page.goto("/");
  await expect(page.locator(".glass-hero")).toBeVisible();
  await expect(page).toHaveTitle("Justin Rogowski · UConn Law Library");
  await expect(color).toHaveAttribute("content", "#060f23");
  await page.goto("/#/projects");
  await expect(page).toHaveTitle("Projects · Justin Rogowski");
});

test("every new-tab link says so to assistive technology", async ({ page }) => {
  for (const route of ["home", "projects", "tools", "about", "more"]) {
    await page.goto(`/?intro=0#/${route}`);
    await expect(page.locator(`[data-view="${route}"]`)).toBeVisible();
    await expect(page.locator(".primary-nav a").first()).toBeVisible();
    await page.waitForLoadState("load");
    const unlabeled = await page.locator('a[target="_blank"]').evaluateAll((links) =>
      links
        .filter((link) => link.getAttribute("aria-describedby") !== "opens-new-tab")
        .map((link) => link.href),
    );
    expect(unlabeled, route).toEqual([]);
  }
  await expect(page.locator("#opens-new-tab")).toHaveText("Opens in a new tab");
  const donate = page.getByRole("link", { name: "Donate to the Law Library" });
  await expect(donate).toHaveAccessibleDescription("Opens in a new tab");
});

test("project names match everywhere and featured screenshots leave naming to the title", async ({ page }) => {
  await page.goto("/?intro=0#/home");
  const featured = page.locator(".selected-bento");
  for (const name of ["AI Corner Updates", "Midnight Tarot"]) {
    await expect(featured.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  await expect(featured.locator("img").first()).toBeAttached();
  expect(await featured.locator("img").evaluateAll((images) => images.every((image) => image.alt === ""))).toBe(true);
  await page.goto("/?intro=0#/projects");
  for (const name of ["AI Corner Updates", "Midnight Tarot"]) {
    await expect(page.locator(".project-card").getByRole("heading", { name, exact: true })).toBeVisible();
  }
  await expect(page.getByText("AI Corner Blog")).toHaveCount(0);
  await expect(page.getByText("Tarot Reading")).toHaveCount(0);
});

test("the heading holds only phrasing content and keeps its name with effects on or off", async ({ page }) => {
  await page.goto("/?intro=0#/home");
  await expect(page.locator(".tech-text-canvas")).toHaveCount(2);
  await expect(page.locator("h1 :is(div, p, section)")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Justin Rogowski", exact: true })).toBeVisible();
  const line = await page.locator(".tech-line-0").boundingBox();
  expect(line.height).toBeGreaterThan(40);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".tech-text-canvas")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Justin Rogowski", exact: true })).toBeVisible();
});

test("phones show contact and donate labels without changing link names", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/?intro=0#/home");
  const contacts = page.locator(".portrait-contact-actions");
  for (const [label, name] of [
    ["Book", "Book a meeting"],
    ["Email", "Email Justin"],
    ["Teams", "Start a Teams chat"],
    ["Call", "Call Justin"],
  ]) {
    const link = contacts.getByRole("link", { name, exact: true });
    await expect(link.locator(".orbit-label")).toHaveText(label);
    await expect(link.locator(".orbit-label")).toBeVisible();
    const fits = await link.evaluate((el) => el.scrollWidth <= el.clientWidth);
    expect(fits, label).toBe(true);
  }
  const donate = page.getByRole("link", { name: "Donate to the Law Library", exact: true });
  await expect(donate).toContainText("Donate");
  await expect(donate.locator(".topbar-donate-more")).toBeHidden();
  await expect(donate.getByText("Donate", { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  const fitsTopbar = () => page.locator(".topbar").evaluate((bar) => bar.scrollWidth <= bar.clientWidth);
  expect(await fitsTopbar()).toBe(true);
  for (const width of [364, 340, 320]) {
    await page.setViewportSize({ width, height: 812 });
    await expect(page.locator(".topbar")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `page at ${width}`).toBe(width);
    expect(await fitsTopbar(), `top bar at ${width}`).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(contacts.locator(".orbit-label").first()).toBeHidden();
  await expect(donate.locator(".topbar-donate-more")).toBeVisible();
});

test("the intro plays without console errors", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("ERR_FAILED")) errors.push(message.text());
  });
  await page.goto("/?replayIntro=1#/home");
  const layer = page.locator(".assembly-layer");
  await expect(layer).toHaveAttribute("data-assembly-state", "assembling");
  await expect(layer).toHaveAttribute("data-assembly-state", "complete", { timeout: 15000 });
  expect(errors).toEqual([]);
});

test("every project preview has smaller copies and Home loads only those", async ({ page, request }) => {
  const { pages } = await (await request.get("/data/pages.json")).json();
  for (const { path } of pages) {
    const name = path.replace(/^Pages\//, "").replace(/\.html$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const base = `/v2/assets/project-previews/${name}`;
    const full = await request.get(`${base}.jpg`);
    for (const width of [480, 800]) {
      const copy = await request.get(`${base}-${width}.webp`);
      expect(copy.ok(), `${name} at ${width}`).toBe(true);
      expect((await copy.body()).length).toBeLessThan((await full.body()).length);
    }
  }
  const loaded = [];
  page.on("response", (response) => loaded.push(new URL(response.url()).pathname));
  await page.goto("/?intro=0#/home");
  const previews = page.locator(".selected-bento img");
  await expect(previews).toHaveCount(4);
  await previews.first().scrollIntoViewIfNeeded();
  await expect.poll(() => previews.first().evaluate((image) => image.currentSrc)).toMatch(/-480\.webp$/);
  await expect(page.locator(".portrait-photo img")).toHaveJSProperty("complete", true);
  expect(await page.locator(".portrait-photo img").evaluate((image) => image.naturalWidth)).toBe(360);
  expect(loaded).toContain("/v2/assets/justin.webp");
  expect(loaded).not.toContain("/v2/assets/justin.png");
  expect(loaded.filter((path) => path.startsWith("/v2/assets/project-previews/") && path.endsWith(".jpg"))).toEqual([]);
});

test("the homepage font loads from V2's own assets", async ({ page }) => {
  const fonts = [];
  page.on("response", (response) => {
    if (response.url().endsWith(".woff2")) fonts.push([new URL(response.url()).pathname, response.status()]);
  });
  await page.goto("/?intro=0#/home");
  await expect(page.locator(".glass-hero")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(fonts).toContainEqual(["/v2/assets/fonts/Geist.woff2", 200]);
  expect(fonts.filter(([path]) => path.startsWith("/Pages/"))).toEqual([]);
  expect(await page.evaluate(() => document.fonts.check('16px Geist'))).toBe(true);
});

test("How can I help? links to booking, requests, and library search", async ({ page }) => {
  for (const [name, heading, width] of [
    ["Book a meeting", "Let’s find a time.", 1366],
    ["Start a request", "Something I can help with?", 800],
    ["Search the library", "A good place to start looking.", 375],
  ]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/?intro=0#/home");
    const help = page.getByRole("region", { name: "How can I help?" });
    await expect(help.getByRole("link")).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await help.getByRole("link", { name }).click();
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
});

test("bad URLs get a page that works from any depth and isn't indexed", async ({ page, request }) => {
  const response = await request.get("/404.html");
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain('name="robots" content="noindex"');
  expect(html).not.toMatch(/(?:href|src)="(?!\/|https:)/);
  await page.route("**/some/deep/missing-page", (route) =>
    route.fulfill({ status: 404, contentType: "text/html", body: html }),
  );
  const failed = [];
  page.on("response", (asset) => {
    if (asset.status() >= 400 && !asset.url().endsWith("missing-page")) failed.push(asset.url());
  });
  await page.goto("/some/deep/missing-page");
  await expect(page.getByRole("heading", { name: "A little off the map." })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(failed).toEqual([]);
  await page.getByRole("link", { name: "browse the projects" }).click();
  await expect(page.locator('[data-view="projects"]')).toBeVisible();
});

test("the sidebar saves room on short screens and doesn't repeat the name on Home", async ({ page }) => {
  const groups = page.locator(".sidebar-branches").getByRole("button", { name: "Projects", exact: true });
  const identity = page.locator(".sidebar-identity");
  const nav = page.locator(".primary-nav");

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/?intro=0#/home");
  await expect(groups).toHaveAttribute("aria-expanded", "false");
  await expect(identity).toBeHidden();
  await groups.click();
  await expect(groups).toHaveAttribute("aria-expanded", "true");

  // A view that highlights an item in the group still shows it.
  await page.goto("about:blank");
  await page.goto("/?intro=0#/projects?group=Work");
  await expect(groups).toHaveAttribute("aria-expanded", "true");

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("about:blank");
  await page.goto("/?intro=0#/home");
  await expect(groups).toHaveAttribute("aria-expanded", "true");
  await expect(identity).toBeHidden();
  const onHome = await nav.boundingBox();
  await page.locator(".primary-nav").getByRole("link", { name: "About" }).click();
  await expect(identity).toBeVisible();
  await expect(identity).toContainText("Justin Rogowski");
  expect((await nav.boundingBox()).y).toBe(onHome.y);
});
