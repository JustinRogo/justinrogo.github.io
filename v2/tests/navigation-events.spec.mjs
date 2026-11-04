import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const feed = `<?xml version="1.0"?><rss xmlns:livewhale="http://www.livewhale.com/" xmlns:georss="http://www.georss.org/georss"><channel>
${["Connect in the Café", "Law and public service", "Library research workshop", "An evening with alumni"].map((title, index) => `<item><title>${title}</title><link>https://events.uconn.edu/law-school/event/${index + 1}</link><pubDate>Thu, 05 Nov 2026 ${17 + index}:45:00 +0000</pubDate>${index < 3 ? `<livewhale:image_full>https://events.uconn.edu/poster-${index}.svg</livewhale:image_full>` : ""}<georss:featurename>Law Library</georss:featurename></item>`).join("")}
<item><title>Unsafe event</title><link>javascript:alert(1)</link></item>
<item><title>Connect in the Café</title><link>https://events.uconn.edu/law-school/event/1</link></item>
</channel></rss>`;
test.beforeEach(async ({ page, context }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("jr-v2-preferences")) localStorage.setItem("jr-v2-preferences", JSON.stringify({ theme: "dark", calm: false, atmosphere: false, intro: false }));
  });
  await context.route("https://**/*", route => {
    const url = route.request().url();
    if (url.includes("/live/rss/")) return route.fulfill({ contentType: "application/rss+xml", body: feed });
    if (url.includes("/poster-")) return route.fulfill({ contentType: "image/svg+xml", headers: { "Access-Control-Allow-Origin": "*" }, body: `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="${url.includes("poster-1") ? "#ad550f" : "#2451a0"}"/><text x="50" y="100" fill="white" font-size="38">UConn Law event</text></svg>` });
    if (url.includes("/law-school/event/")) return route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Event destination</title><h1>Event destination</h1>" });
    return route.abort();
  });
});

test("navigation collapses by keyboard, keeps names/settings, persists, and restores the resized width", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/v2/?intro=0#/more");
  const sidebar = page.locator(".sidebar");
  const resize = page.getByRole("separator", { name: "Resize sidebar" });
  await resize.focus();
  await page.keyboard.press("ArrowRight");
  const expandedWidth = (await sidebar.boundingBox()).width;
  const collapse = page.getByRole("button", { name: "Collapse navigation", exact: true });
  await collapse.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Expand navigation" })).toHaveAttribute("aria-expanded", "false");
  await expect(sidebar).toHaveCSS("width", "72px");
  await expect(page.locator(".sidebar-identity")).toBeHidden();
  await expect(page.locator(".sidebar-branches")).toBeHidden();
  await expect(resize).toHaveCount(0);
  const nav = page.getByRole("navigation", { name: "Primary navigation", exact: true });
  for (const label of ["Home", "Projects", "Tools", "About", "More"]) {
    const link = nav.getByRole("link", { name: label, exact: true });
    await expect(link).toBeVisible();
    expect((await link.boundingBox()).width).toBeGreaterThanOrEqual(44);
  }
  await page.locator(".sidebar").getByRole("button", { name: "Appearance and motion settings" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(sidebar).toHaveCSS("width", "72px");
  await page.setViewportSize({ width: 375, height: 900 });
  await expect(page.locator(".sidebar-toggle")).toBeHidden();
  await expect(nav.getByRole("link", { name: "Home", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Expand navigation" }).click();
  expect((await sidebar.boundingBox()).width).toBe(expandedWidth);
  await expect(resize).toHaveAttribute("aria-valuenow", String(expandedWidth));
});

test("events use native card links with manual controls, pause, and vertical page scrolling", async ({ page, context }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 1201, height: 1004 });
  await page.goto("/v2/?intro=0#/home");
  const section = page.locator(".law-events");
  await section.scrollIntoViewIfNeeded();
  await expect(page.getByText("Around here lately", { exact: true })).toHaveCount(0);
  await expect(section.locator(".circular-gallery")).toHaveAttribute("data-renderer", "webgl");
  await section.getByRole("button", { name: "Pause event gallery" }).click();
  await expect(section.getByRole("button", { name: "Play event gallery" })).toBeVisible();
  await expect(section.locator(".event-count")).toHaveText("1 / 4");
  await expect(section.locator(".circular-gallery-labels")).toContainText("Nov 5, 12:45 PM EST");
  await expect(section.locator(".circular-gallery-labels")).toContainText("Nov 5, 1:45 PM EST");
  await expect(section.locator('[data-gallery-list] a').first()).toHaveAttribute("aria-label", /Connect in the Café/);
  await expect(section.locator(".event-selection,.event-title,.event-card-brand")).toHaveCount(0);
  await section.getByRole("button", { name: "Next event" }).click();
  const card = section.getByRole("link", { name: /Law and public service/ });
  await expect(card).toHaveAttribute("href", "https://events.uconn.edu/law-school/event/2");
  await expect(card).toHaveAttribute("target", "_blank");
  await expect(card).toHaveAttribute("aria-current", "true");
  const [clicked] = await Promise.all([context.waitForEvent("page"), card.click()]);
  await expect(clicked).toHaveURL("https://events.uconn.edu/law-school/event/2");
  await clicked.close();
  await page.bringToFront();
  await card.focus();
  await page.keyboard.press("ArrowRight");
  await expect(section.getByRole("link", { name: /Library research workshop/ })).toBeFocused();
  const [keyboard] = await Promise.all([context.waitForEvent("page"), page.keyboard.press("Enter")]);
  await expect(keyboard).toHaveURL("https://events.uconn.edu/law-school/event/3");
  await keyboard.close();
  await page.bringToFront();
  const dragCard = section.getByRole("link", { name: /Library research workshop/ });
  await dragCard.scrollIntoViewIfNeeded();
  const box = await dragCard.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 90, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  expect(context.pages()).toHaveLength(1);
  await section.getByRole("link", { name: /Connect in the Café/ }).focus();
  await page.keyboard.press("Home");
  await expect(section.locator(".event-count")).toHaveText("1 / 4");
  await section.getByRole("link", { name: /Connect in the Café/ }).hover();
  const before = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 220);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
  await section.getByRole("button", { name: "Play event gallery" }).click();
  await expect(section.getByRole("button", { name: "Pause event gallery" })).toBeVisible();
  await page.getByRole("navigation", { name: "Primary navigation", exact: true }).getByRole("link", { name: "More", exact: true }).click();
  await expect(section.locator("canvas")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("gallery fits narrow screens and both themes; reduced motion and lost WebGL show accessible event cards", async ({ page }) => {
  await mkdir(".impeccable/events", { recursive: true });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`/v2/?intro=0&galleryWidth=${width}#/home`);
    const section = page.locator(".law-events");
    await section.scrollIntoViewIfNeeded();
    await expect(section.locator(".circular-gallery")).toHaveAttribute("data-renderer", "webgl");
    await section.getByRole("button", { name: "Pause event gallery" }).click();
    await page.screenshot({ path: `.impeccable/events/${width}-gallery.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  const section = page.locator(".law-events");
  await expect(section.locator("canvas")).toHaveCount(0);
  await expect(section.locator(".event-static-card")).toHaveCount(4);
  for (const card of await section.locator(".event-static-card").all()) {
    await expect(card.locator(".event-card-body h3")).toBeVisible();
    await expect(card.locator(".event-card-body h3")).toHaveCSS("text-align", "center");
    const poster = card.locator(".event-card-body img");
    if (await poster.count()) {
      expect(await card.evaluate(el => Boolean(el.querySelector("h3").compareDocumentPosition(el.querySelector("img")) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    }
    await expect(card.locator(".event-date")).toContainText("PM EST");
  }
  await expect(section.getByRole("link", { name: /Law and public service/ })).toHaveAttribute("href", "https://events.uconn.edu/law-school/event/2");
  await page.locator(".topbar").getByRole("button", { name: "Appearance and motion settings" }).click();
  await page.getByRole("radio", { name: "Light", exact: true }).check();
  await page.keyboard.press("Escape");
  await section.scrollIntoViewIfNeeded();
  await page.screenshot({ path: ".impeccable/events/320-light-still.png" });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(section.locator("canvas")).toHaveCount(1);
  await section.locator("canvas").evaluate(canvas => canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true })));
  await expect(section.locator("canvas")).toHaveCount(0);
  await expect(section.locator(".event-static-card")).toHaveCount(4);
});

test("events have no section surface or duplicate details across transparency and contrast modes", async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] });
  await page.goto("/v2/?intro=0#/home");
  const section = page.locator(".law-events");
  await expect(section.locator(".glass-layer,.event-selection,.event-card-brand")).toHaveCount(0);
  await expect(section).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(section).toHaveCSS("border-top-width", "0px");
  await expect(section).toHaveCSS("box-shadow", "none");
  await expect(page.locator(".glass-hero > .glass-layer")).toHaveClass(/glass-layer-opaque/);
  await page.emulateMedia({ contrast: "more" });
  await expect(section.locator(".glass-layer,.event-selection")).toHaveCount(0);
  await expect(section.locator(".event-static-card")).toHaveCount(4);
  await page.emulateMedia({ contrast: "no-preference", forcedColors: "active" });
  await expect(section.locator(".glass-layer")).toHaveCount(0);
});

test("empty, failed, and malformed event feeds keep the calendar link and a retry action", async ({ page }) => {
  await page.route("**/live/rss/**", route => route.fulfill({ contentType: "application/rss+xml", body: "<rss><channel/></rss>" }));
  await page.goto("/v2/?intro=0#/home");
  const section = page.locator(".law-events");
  await expect(section).toContainText("No upcoming events returned");
  await expect(section.getByRole("link", { name: "All events" })).toHaveAttribute("href", "https://events.uconn.edu/law-school/");
  await page.route("**/live/rss/**", route => route.fulfill({ contentType: "application/rss+xml", body: "<rss>invalid" }));
  await page.reload();
  await expect(section).toContainText("The events feed is unavailable");
  await page.route("**/live/rss/**", route => route.fulfill({ contentType: "application/rss+xml", body: feed }));
  await section.getByRole("button", { name: "Try again" }).click();
  await expect(section.locator(".circular-gallery")).toHaveCount(1);
});
