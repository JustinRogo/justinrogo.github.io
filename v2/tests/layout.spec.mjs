import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://**/*", (route) => {
    if (!["GET", "HEAD"].includes(route.request().method()))
      throw new Error("External write attempted");
    return route.abort();
  });
  await page.addInitScript(() =>
    localStorage.setItem(
      "jr-v2-preferences",
      JSON.stringify({ theme: "dark", calm: true, atmosphere: false }),
    ),
  );
});

test("the topbar stays in view on desktop only and clears anything scrolled to", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/v2/?intro=0#/about");
  const topbar = page.locator(".topbar");
  await expect(topbar).toHaveCSS("position", "sticky");
  await page.evaluate(() => window.scrollTo({ top: 1500, behavior: "instant" }));
  const stuck = await topbar.boundingBox();
  expect(stuck.y).toBe(0);
  // It paints over page content, and a card lifted on hover doesn't rise above it.
  expect(
    await page.evaluate(({ x, y }) => Boolean(document.elementFromPoint(x, y).closest(".topbar")), {
      x: stuck.x + stuck.width / 2,
      y: stuck.y + stuck.height / 2,
    }),
  ).toBe(true);
  await page.goto("/v2/?intro=0#/about?section=contact");
  await expect(page.locator("#say-hello-heading")).toBeFocused();
  const heading = await page.locator("#say-hello-heading").boundingBox();
  const bar = await topbar.boundingBox();
  expect(heading.y).toBeGreaterThanOrEqual(bar.y + bar.height);
  // Stays reachable with the keyboard, and the rail still sits beside it.
  await expect(topbar.getByRole("link", { name: "Donate to the Law Library" })).toBeInViewport();
  expect(bar.x).toBeGreaterThanOrEqual((await page.locator(".sidebar").boundingBox()).width);

  await page.setViewportSize({ width: 800, height: 900 });
  await expect(topbar).toHaveCSS("position", "relative");
  await page.setViewportSize({ width: 375, height: 800 });
  await expect(topbar).toHaveCSS("position", "relative");
  await page.evaluate(() => window.scrollTo({ top: 1500, behavior: "instant" }));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect((await topbar.boundingBox()).y).toBeLessThan(0);
});

test("the scrolled topbar fills the workspace without moving its controls", async ({ page }) => {
  for (const width of [2560, 1440, 1150, 801]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/v2/?intro=0&topbar=${width}#/home`);
    const topbar = page.locator(".topbar");
    const donate = topbar.getByRole("link", { name: "Donate to the Law Library" });
    const hero = await page.locator(".glass-hero").boundingBox();
    const atTop = await topbar.boundingBox();
    expect(atTop.x).toBeCloseTo(hero.x);
    expect(atTop.width).toBeCloseTo(hero.width);
    await expect(topbar).toHaveCSS("border-radius", "6px");
    const donateAtTop = await donate.boundingBox();

    await page.evaluate(() => window.scrollTo({ top: 400, behavior: "instant" }));
    await expect(topbar).toHaveCSS("border-radius", "0px");
    const docked = await topbar.boundingBox();
    expect(docked.y).toBe(0);
    expect(docked.x).toBeCloseTo((await page.locator(".sidebar").boundingBox()).width);
    expect(docked.x + docked.width).toBeCloseTo(await page.evaluate(() => document.documentElement.clientWidth));
    expect((await donate.boundingBox()).x).toBeCloseTo(donateAtTop.x);

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect(topbar).toHaveCSS("border-radius", "6px");
    expect((await topbar.boundingBox()).width).toBeCloseTo(hero.width);
  }
});

test("the topbar eases out when motion is allowed", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "jr-v2-preferences",
      JSON.stringify({ theme: "dark", calm: false, atmosphere: false }),
    ),
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/v2/?intro=0#/home");
  const running = await page.evaluate(() => {
    window.scrollTo({ top: 400, behavior: "instant" });
    window.dispatchEvent(new Event("scroll"));
    return document.querySelector(".topbar").getAnimations().map((a) => a.transitionProperty);
  });
  expect(running).toContain("width");
});

test("My Day sits beside How can I help until the two no longer fit", async ({ page }) => {
  const overlaps = (a, b) => a.y < b.y + b.height && b.y < a.y + a.height;
  for (const [width, sideBySide] of [[2560, true], [1440, true], [1150, true], [930, false], [801, false], [768, false], [375, false], [320, false]]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/v2/?intro=0&row=${width}#/home`);
    const help = await page.locator(".home-help").boundingBox();
    const myDay = await page.getByRole("region", { name: "My Day" }).boundingBox();
    if (sideBySide) {
      expect(myDay.x).toBeGreaterThanOrEqual(help.x + help.width);
      expect(myDay.y).toBeCloseTo(help.y);
      expect(myDay.height).toBeCloseTo(help.height);
    } else {
      expect(overlaps(help, myDay)).toBe(false);
      expect(myDay.y).toBeGreaterThan(help.y);
      expect(myDay.width).toBeCloseTo(help.width);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
});

test("topbar follows the content edges across viewport and sidebar widths", async ({
  page,
}) => {
  await page.setViewportSize({ width: 2560, height: 1000 });
  await page.goto("/v2/#/home");

  const expectAligned = async () => {
    const topbar = await page.locator(".topbar").boundingBox();
    const hero = await page.locator(".glass-hero").boundingBox();
    expect(topbar.x).toBeCloseTo(hero.x);
    expect(topbar.width).toBeCloseTo(hero.width);
  };

  await expectAligned();
  const handle = page.getByRole("separator", { name: "Resize sidebar" });
  await handle.focus();
  await page.keyboard.press("End");
  await expect(handle).toHaveAttribute("aria-valuenow", "360");
  await expectAligned();
  await page.locator(".sidebar-toggle").click();
  await expect(page.locator(".sidebar")).toHaveCSS("width", "72px");
  await expectAligned();

  for (const width of [3840, 1440, 1150, 801, 800, 601, 600, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await expectAligned();
  }
});

test("portrait contacts and shared strengths preview work on desktop and phone", async ({
  page,
}) => {
  for (const width of [320, 375, 1243]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`/v2/?contacts=${width}#/home`);
    const portrait = page.locator(".hero-portrait");
    const nameRight = await page.locator(".tech-heading").evaluate((heading) => {
      const range = document.createRange();
      range.selectNodeContents(heading.lastElementChild);
      return range.getBoundingClientRect().right;
    });
    const heroBox = await page.locator(".glass-hero").boundingBox();
    expect(nameRight).toBeLessThan(heroBox.x + heroBox.width - 12);
    const links = portrait.locator(".portrait-contact-actions");
    for (const [name, href] of [
      ["Book a meeting", "#/tools?panel=booking"],
      ["Email Justin", "mailto:justin.rogowski@uconn.edu"],
      ["Call Justin", "tel:+18605705109"],
      [
        "Start a Teams chat",
        "https://teams.microsoft.com/l/chat/0/0?users=justin.rogowski@uconn.edu",
      ],
    ]) {
      const link = links.getByRole("link", { name, exact: true });
      await expect(link).toHaveAttribute("href", href);
      const box = await link.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await expect(
      links.getByRole("link", { name: "Start a Teams chat", exact: true }),
    ).toHaveAttribute("target", "_blank");
    await expect(
      portrait.getByRole("link", { name: "Explore creative experiments" }),
    ).toHaveCount(0);
    const preview = portrait.getByRole("link", {
      name: "View my CliftonStrengths",
      exact: true,
    });
    // The preview is a small strand: both outlines and all 34 bars in rank order and domain color.
    const miniHelix = preview.locator(".strength-helix-mini");
    await expect(miniHelix).toHaveAttribute("aria-label", /all 34 themes in rank order/);
    await expect(miniHelix.locator(".strength-helix-outline")).toHaveCount(2);
    const miniBars = miniHelix.locator(".strength-helix-mark");
    await expect(miniBars).toHaveCount(34);
    await expect(miniBars.nth(0)).toHaveCSS("fill", "rgb(16, 185, 129)");
    await expect(miniBars.nth(3)).toHaveCSS("fill", "rgb(124, 58, 237)");
    await expect(miniBars.nth(5)).toHaveCSS("fill", "rgb(0, 102, 255)");
    await expect(miniBars.nth(14)).toHaveCSS("fill", "rgb(255, 126, 95)");
    const image = await portrait.locator("img").boundingBox(),
      bar = await miniHelix.boundingBox();
    expect(bar.y).toBeGreaterThan(image.y + image.height);
    await preview.click();
    await expect(page).toHaveURL(/#\/about\?section=strengths$/);
    await expect(page.locator("#cliftonstrengths-heading")).toBeFocused();
    // Below the desktop topbar when it is stuck; at the top of the screen otherwise.
    const headingTop = (await page.locator("#cliftonstrengths-heading").boundingBox()).y;
    const topbarPosition = await page.locator(".topbar").evaluate((bar) => getComputedStyle(bar).position);
    if (topbarPosition === "sticky") {
      const bar = await page.locator(".topbar").boundingBox();
      expect(headingTop).toBeGreaterThanOrEqual(bar.y + bar.height);
      expect(headingTop).toBeLessThan(140);
    } else {
      expect(headingTop).toBeLessThan(60);
    }
    await page.reload();
    await expect(page.locator("#cliftonstrengths-heading")).toBeFocused();
    await page.goBack();
    await expect(
      page.getByRole("heading", { name: "Justin Rogowski", exact: true }),
    ).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
});

test("desktop sidebar resizes by pointer and keyboard, persists, and yields to compact navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/v2/#/home");
  const sidebar = page.locator(".sidebar"),
    handle = page.getByRole("separator", {
      name: "Resize sidebar",
      exact: true,
    });
  await expect(sidebar).toHaveCSS("width", "240px");
  const box = await handle.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 64, box.y + box.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(sidebar).toHaveCSS("width", "304px");
  await expect(handle).toHaveAttribute("aria-valuenow", "304");
  await handle.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(handle).toHaveAttribute("aria-valuenow", "296");
  await page.keyboard.press("Shift+ArrowRight");
  await expect(handle).toHaveAttribute("aria-valuenow", "320");
  const sideBox = await sidebar.boundingBox(),
    workspace = await page.locator(".workspace").boundingBox();
  expect(workspace.x).toBe(sideBox.x + sideBox.width);
  await page.reload();
  await expect(sidebar).toHaveCSS("width", "320px");
  await handle.focus();
  await page.keyboard.press("Home");
  await expect(sidebar).toHaveCSS("width", "200px");
  await page.keyboard.press("End");
  await expect(sidebar).toHaveCSS("width", "360px");
  await page.keyboard.press("Enter");
  await expect(sidebar).toHaveCSS("width", "240px");
  await page.keyboard.press("ArrowRight");
  await handle.dblclick();
  await expect(sidebar).toHaveCSS("width", "240px");
  await page.setViewportSize({ width: 768, height: 1000 });
  await expect(handle).toHaveCount(0);
  await expect(sidebar).toHaveCSS("width", "68px");
  await page.setViewportSize({ width: 375, height: 900 });
  await expect(sidebar).toHaveCSS("width", "351px");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(sidebar).toHaveCSS("width", "240px");
  await page.setViewportSize({ width: 801, height: 1000 });
  await handle.focus();
  await page.keyboard.press("End");
  await expect(sidebar).toHaveCSS("width", "256px");
  const headingBox = await page.locator(".tech-heading").boundingBox(),
    portraitBox = await page.locator(".hero-portrait").boundingBox();
  expect(portraitBox.y).toBeGreaterThan(headingBox.y + headingBox.height);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

test("glass corners follow the preset, portraits stay circular, and booking embeds stay opt-in", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/v2/#/home");
  for (const [selector, radius] of [
    [".sidebar", "0px"],
    [".topbar", "6px"],
    [".glass-hero", "6px"],
    [".hero-actions .primary", "5.5px"],
    [".magic-bento__card", "6px"],
  ]) {
    await expect(page.locator(selector).first()).toHaveCSS(
      "border-top-left-radius",
      radius,
    );
  }
  await expect(page.locator(".portrait-photo img")).toHaveCSS(
    "border-top-left-radius",
    "50%",
  );
  await page.goto("/v2/#/about");
  await expect(page.locator(".strength-overview")).toHaveCSS(
    "border-top-left-radius",
    "11px",
  );
  await page.goto("/v2/#/tools?panel=booking");
  await expect(page.getByText(/Microsoft may require cookies/)).toHaveCount(0);
  await expect(page.locator("iframe.service-frame")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Load embedded view", exact: true })
    .click();
  await expect(page.locator("iframe.service-frame")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Close embedded view", exact: true })
    .click();
  await expect(page.locator("iframe.service-frame")).toHaveCount(0);
});

test("compact sidebar settings stays inside the rail and opens settings", async ({ page }) => {
  for (const width of [601, 781, 800, 801]) {
    await page.setViewportSize({ width, height: 1004 });
    await page.goto("/v2/");
    const button = page.locator(".sidebar-settings-button");
    await expect(button.locator("span")).toBeVisible({ visible: width > 800 });
    const rail = await page.locator(".sidebar").boundingBox();
    const bounds = await button.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(rail.x);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(rail.x + rail.width);
    await button.click();
    await expect(page.getByRole("dialog")).toBeVisible();
  }
});
