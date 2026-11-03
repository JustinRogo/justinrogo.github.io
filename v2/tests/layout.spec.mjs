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
    expect(
      await preview
        .locator(".strength-domain-bar span")
        .evaluateAll((nodes) =>
          nodes.map((node) => Number(node.style.flexGrow)),
        ),
    ).toEqual([206, 170, 114, 105]);
    const image = await portrait.locator("img").boundingBox(),
      bar = await preview.locator(".strength-domain-bar").boundingBox();
    expect(bar.y).toBeGreaterThan(image.y + image.height);
    await preview.click();
    await expect(page).toHaveURL(/#\/about\?section=strengths$/);
    await expect(page.locator("#cliftonstrengths-heading")).toBeFocused();
    expect(
      (await page.locator("#cliftonstrengths-heading").boundingBox()).y,
    ).toBeLessThan(60);
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
  expect(workspace.x).toBeGreaterThan(sideBox.x + sideBox.width);
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

test("box corners are halved, circular portraits remain circular, and booking embeds stay opt-in without the removed disclaimer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/v2/#/home");
  for (const [selector, radius] of [
    [".sidebar", "12px"],
    [".topbar", "10px"],
    [".glass-hero", "12px"],
    [".hero-actions .primary", "5.5px"],
    [".magic-bento__card", "11px"],
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
