// Botanical is the default site style. Unlike the other specs, this file uses
// plain Playwright so visitors start without any pinned style.
import { test, expect } from "@playwright/test";

const KEY = "jr-v2-preferences";
const prefs = (page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "null"), KEY);

test.beforeEach(async ({ page }) => {
  await page.route("https://**/*", (route) => {
    if (!["GET", "HEAD"].includes(route.request().method()))
      throw new Error("External write attempted");
    return route.abort();
  });
  await page.addInitScript(() => localStorage.setItem("jr-v2-assembly-seen", "1"));
});

test("new visitors get Botanical, painted before the app starts", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/v2/#/home");
  const root = page.locator("html");
  await expect(root).toHaveAttribute("data-style", "botanical");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#efe8d8");
  await expect(page.getByRole("heading", { level: 1, name: "Justin Rogowski" })).toBeVisible();
  // Matte paper instead of glass: no refraction layers, no canvas name.
  await expect(page.locator(".glass-surface")).toHaveCount(0);
  await expect(page.locator(".tech-heading canvas")).toHaveCount(0);
  await expect(page.locator(".hero-flora")).toBeVisible();
  await expect(page.locator(".portrait-wreath")).toBeVisible();
  // The wordmark's arrow becomes a sprig, and the shortcut menu grows leaves.
  await expect(page.locator(".wordmark .wordmark-sprig")).toBeVisible();
  await expect(page.locator(".wordmark svg")).toHaveCount(1);
  expect(await page.locator(".sidebar .branched-menu__leaf").count()).toBeGreaterThan(0);
  const heading = await page
    .locator(".tech-heading")
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(heading).toContain("Fraunces");
  await expect(page.locator(".page-background-botanical")).toHaveAttribute(
    "data-background",
    "botanical-conservatory",
  );
});

test("saved preferences without a style also open in Botanical", async ({ page }) => {
  await page.addInitScript((key) => {
    if (!localStorage.getItem(key))
      localStorage.setItem(key, JSON.stringify({ theme: "dark", calm: false, atmosphere: true, background: "orbits" }));
  }, KEY);
  await page.goto("/v2/#/home");
  await expect(page.locator("html")).toHaveAttribute("data-style", "botanical");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#0c1b14");
});

test("switching to Original needs no reload and persists; backgrounds stay separate", async ({ page }) => {
  await page.goto("/v2/#/home");
  await page.evaluate(() => (window.__sameDocument = true));
  await page.getByRole("button", { name: "Appearance and motion settings" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: "Herbarium" }).check();
  await expect(page.locator(".page-background-botanical")).toHaveAttribute(
    "data-background",
    "botanical-herbarium",
  );
  await dialog.getByRole("radio", { name: /^Original/ }).check();
  await expect(page.locator("html")).toHaveAttribute("data-style", "original");
  expect(await page.evaluate(() => window.__sameDocument)).toBe(true);
  // Original keeps its own background list and choice.
  await expect(dialog.getByRole("radio", { name: "Device default" })).toBeChecked();
  expect(await prefs(page)).toMatchObject({ style: "original", botanicalBackground: "herbarium" });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-style", "original");
  await expect(page.locator(".hero-flora")).toHaveCount(0);
  await expect(page.locator(".living-pothos")).toHaveCount(0);
});

test("Pip grows with scrolling and keeps its watering", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/v2/#/home");
  const pip = page.locator(".living-pothos-sidebar");
  await expect(pip).toBeVisible();
  const grow = () => pip.evaluate((el) => Number(el.style.getPropertyValue("--grow")));
  const start = await grow();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(grow).toBeGreaterThan(start);
  const water = page.getByRole("button", { name: "Water Pip, the resident pothos" });
  await water.click();
  await water.click();
  await expect(page.getByRole("status").filter({ hasText: "Pip" })).toHaveText("Pip stretches toward the light.");
  expect(await page.evaluate(() => localStorage.getItem("jr-v2-pip"))).toBe("2");
});

test("reduced motion turns Botanical's flourishes off", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/v2/#/home");
  await expect(page.locator("html")).toHaveAttribute("data-flourish", "off");
  await expect(page.locator(".page-background-botanical")).toHaveAttribute("data-motion", "still");
});

for (const [width, height] of [[375, 812], [768, 1024], [1440, 900]]) {
  for (const colorScheme of ["light", "dark"]) {
    test(`Botanical has no horizontal overflow at ${width}px in ${colorScheme}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ colorScheme });
      for (const view of ["home", "projects", "tools", "about", "more"]) {
        await page.goto(`/v2/#/${view}`);
        await expect(page.locator(`[data-view="${view}"] h1`)).toBeVisible();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        );
        expect(overflow, view).toBeLessThanOrEqual(1);
      }
    });
  }
}
