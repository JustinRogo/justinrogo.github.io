import { test, expect } from "./original-style.mjs";
import { mkdir } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("jr-v2-preferences", JSON.stringify({ theme: "dark", calm: false, atmosphere: false, intro: false })));
  await page.route("https://**/*", route => route.abort());
});

test("featured cards reuse the project screenshots, keep their destinations, and fit every screen", async ({ page }) => {
  await mkdir(".impeccable/featured-strengths", { recursive: true });
  for (const width of [1440, 1183, 801, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/v2/?intro=0&featured=${width}#/home`);
    const grid = page.locator(".selected-bento");
    await grid.scrollIntoViewIfNeeded();
    const previews = grid.locator(".featured-project-preview img");
    await expect(previews).toHaveCount(4);
    for (const image of await previews.all()) await expect.poll(() => image.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
    await expect(grid.locator(".bento-statutes-art")).toHaveText("§§");
    await expect(grid.locator(".bento-statutes-art")).toHaveCSS("height", "36px");
    for (const card of await grid.locator(".bento-project").all()) {
      expect(await card.evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
      expect(await card.locator("h3").evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      const [copy, open] = await Promise.all([card.locator(".bento-copy").boundingBox(), card.locator(".bento-open").boundingBox()]);
      expect(copy.y + copy.height).toBeLessThanOrEqual(open.y + 1);
      const preview = await card.locator(".featured-project-preview").boundingBox();
      expect(preview.y + preview.height).toBeLessThanOrEqual(open.y + 1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `.impeccable/featured-strengths/featured-${width}.png` });
  }
  const featured = await page.locator(".selected-bento .bento-project").evaluateAll(cards => cards.map(card => ({
    href: card.closest("a").getAttribute("href"), src: card.querySelector("img").getAttribute("src"),
  })));
  await page.goto("/v2/?intro=0#/projects");
  for (const card of featured) await expect(page.locator(`.project-description[href="${card.href}"] .project-preview-landscape`)).toHaveAttribute("src", card.src);
});

test("strength cards preserve rankings, domains, descriptions, all filters, and keyboard/pointer flipping", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/v2/?intro=0#/about?section=strengths");
  const cards = page.locator(".strength.flip-card");
  await page.getByRole("button", { name: "Top 5", exact: true }).click();
  await expect(cards).toHaveCount(5);
  const card = cards.first();
  await expect(card.locator(".strength-card-front .strength-rank")).toHaveText("1");
  await expect(card.locator(".strength-card-front .strength-name")).toHaveText("Ideation");
  await expect(card.locator(".strength-card-domain")).toHaveText("Strategic Thinking");
  await expect(card.locator(".flip-card__face--front")).toHaveCSS("background-color", "rgb(16, 185, 129)");
  const small = await card.boundingBox();
  expect(small.height).toBe(180);
  await card.click();
  await expect(card).toHaveAttribute("aria-pressed", "true");
  const large = await card.boundingBox();
  expect(large.width).toBeGreaterThan(small.width * 1.9);
  expect(large.height).toBeGreaterThan(small.height * 1.9);
  await expect(card.locator(".flip-card__face--front")).toHaveAttribute("inert", "");
  await expect(card.locator(".strength-card-back p")).toContainText("finding connections between ideas");
  await expect(card).toHaveAttribute("aria-description", /finding connections between ideas/);
  await expect.poll(() => card.locator(".flip-card__rotor").evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).m11 < -.95)).toBe(true);
  await card.focus();
  await page.keyboard.press("Space");
  await expect(card).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("Enter");
  await expect(card).toHaveAttribute("aria-pressed", "true");
  const filters = page.getByRole("group", { name: "Strengths to show", exact: true });
  await filters.getByRole("button", { name: "Top 10", exact: true }).click();
  await expect(cards).toHaveCount(10);
  await filters.getByRole("button", { name: "All 34", exact: true }).click();
  await expect(cards).toHaveCount(34);
  await expect(page.locator(".strength-domain-group > h3")).toHaveText(["Strategic Thinking", "Relationship Building", "Executing", "Influencing"]);
  const ranks = await cards.locator(".strength-rank").allTextContents();
  expect(ranks.map(Number).sort((a, b) => a - b)).toEqual(Array.from({ length: 34 }, (_, index) => index + 1));
  for (const item of await cards.all()) {
    expect(await item.locator(".strength-card-back p").textContent()).not.toBe("");
  }
  // Opening a card preserves domain order while dense placement fills beside it.
  const cells = page.locator(".strength-domain-group").first().locator(".strength-cell");
  const expanded = await cells.first().boundingBox();
  const packed = await cells.nth(1).boundingBox();
  expect(packed.y).toBeLessThan(expanded.y + expanded.height);
  expect(packed.x).toBeGreaterThanOrEqual(expanded.x + expanded.width);
  await filters.getByRole("button", { name: "Top 5", exact: true }).click();
  await expect(cards).toHaveCount(5);
  await expect(card).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});

test("strength faces remain readable on narrow screens and flip instantly in Calm and reduced motion", async ({ page }) => {
  await mkdir(".impeccable/featured-strengths", { recursive: true });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/v2/?intro=0&strengthWidth=${width}#/about`);
    await page.getByRole("button", { name: "Top 5", exact: true }).click();
    const card = page.locator(".strength.flip-card").first();
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveCSS("height", "180px");
    await page.screenshot({ path: `.impeccable/featured-strengths/strengths-${width}-front.png` });
    await card.focus();
    await page.keyboard.press("Enter");
    await expect(card).toHaveAttribute("aria-pressed", "true");
    const back = card.locator(".strength-card-back");
    expect(await back.evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    expect(await page.locator(".strength-cell").evaluateAll(cells => {
      const boxes = cells.map(cell => cell.getBoundingClientRect());
      return boxes.every((box, index) => boxes.slice(index + 1).every(other =>
        Math.min(box.right, other.right) - Math.max(box.left, other.left) <= 1 ||
        Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top) <= 1));
    })).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `.impeccable/featured-strengths/strengths-${width}-back.png` });
  }
  const card = page.locator(".strength.flip-card").first();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(card).toHaveAttribute("data-motion", "still");
  await expect(card.locator(".flip-card__rotor")).toHaveCSS("transform", "none");
  await card.click();
  await expect(card).toHaveAttribute("data-fade", "front");
  await page.getByRole("link", { name: "More", exact: true }).click();
  await page.getByRole("button", { name: "Appearance & motion" }).click();
  await page.getByRole("radio", { name: "Light", exact: true }).check();
  await page.getByRole("switch", { name: /^Calm mode/ }).check();
  await page.keyboard.press("Escape");
  await page.goBack();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(card).toHaveAttribute("data-motion", "still");
  await card.focus();
  await page.keyboard.press("Enter");
  await expect(card).toHaveAttribute("data-fade", "back");
  await expect(card.locator(".flip-card__face--back")).toHaveCSS("opacity", "1");
  await expect(card.locator(".flip-card__rotor")).toHaveCSS("transform", "none");
  await page.screenshot({ path: ".impeccable/featured-strengths/strengths-320-light-calm.png" });
  await page.emulateMedia({ forcedColors: "active" });
  await expect(card.locator(".flip-card__face--back")).toHaveCSS("border-top-width", "2px");
});

test("all domain cards fit their expanded descriptions and do not overlap neighboring tiles", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/v2/?intro=0#/about");
  await page.getByRole("button", { name: "All 34", exact: true }).click();
  for (const card of await page.locator(".strength.flip-card").all()) {
    await card.focus();
    await page.keyboard.press("Enter");
    await expect(card).toHaveAttribute("aria-pressed", "true");
    const back = card.locator(".strength-card-back");
    expect(await back.evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    await page.keyboard.press("Space");
    await expect(card).toHaveAttribute("aria-pressed", "false");
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test.describe("touch interaction", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("tapping flips a strength and a vertical swipe still scrolls the page", async ({ page, context }) => {
    await page.goto("/v2/?intro=0#/about");
    const card = page.locator(".strength.flip-card").first();
    await card.scrollIntoViewIfNeeded();
    await card.tap();
    await expect(card).toHaveAttribute("aria-pressed", "true");
    const box = await card.boundingBox();
    const before = await page.evaluate(() => scrollY);
    const cdp = await context.newCDPSession(page);
    const x = Math.round(box.x + box.width / 2);
    const start = Math.round(Math.min(700, box.y + box.height - 50));
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: start }] });
    for (const distance of [25, 60, 100, 150, 200]) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: start - distance }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 50);
    await expect(card).toHaveAttribute("aria-pressed", "true");
  });
});
