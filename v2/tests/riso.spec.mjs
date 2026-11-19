// Risograph, the third site style. Like botanical.spec.mjs, this file uses
// plain Playwright so each test controls the saved style itself.
import { test, expect } from "@playwright/test";

const KEY = "jr-v2-preferences";
const prefs = (page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "null"), KEY);
const choose = (page, saved) =>
  page.addInitScript(
    ([key, value]) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(value));
    },
    [KEY, { theme: "system", calm: false, atmosphere: true, intro: true, background: "auto", ...saved }],
  );

test.beforeEach(async ({ page }) => {
  await page.route("https://**/*", (route) => {
    if (!["GET", "HEAD"].includes(route.request().method()))
      throw new Error("External write attempted");
    return route.abort();
  });
  await page.addInitScript(() => localStorage.setItem("jr-v2-assembly-seen", "1"));
});

test("the picker offers all three styles and switches to Risograph without a reload", async ({ page }) => {
  await page.goto("/v2/#/home");
  await page.evaluate(() => (window.__sameDocument = true));
  await page.getByRole("button", { name: "Appearance and motion settings" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator('input[name="site-style"]')).toHaveCount(3);
  await dialog.getByRole("radio", { name: /^Risograph/ }).check();
  const root = page.locator("html");
  await expect(root).toHaveAttribute("data-style", "riso");
  expect(await page.evaluate(() => window.__sameDocument)).toBe(true);
  // Risograph has its own light labels and backgrounds.
  await expect(dialog.getByRole("radio", { name: "Cream paper" })).toBeVisible();
  await expect(dialog.getByRole("radio", { name: "Black paper" })).toBeVisible();
  await expect(dialog.getByRole("radio", { name: "Cut shapes", exact: true })).toBeChecked();
  await dialog.getByRole("radio", { name: "Press sheet", exact: true }).check();
  await expect(page.locator(".page-background-riso")).toHaveAttribute(
    "data-background",
    "riso-press-sheet",
  );
  expect(await prefs(page)).toMatchObject({ style: "riso", risoBackground: "press-sheet" });
  // Botanical's own choice is untouched, and switching back keeps both.
  await dialog.getByRole("radio", { name: /^Botanical/ }).check();
  await expect(root).toHaveAttribute("data-style", "botanical");
  await expect(dialog.getByRole("radio", { name: "Conservatory", exact: true })).toBeChecked();
  await dialog.getByRole("radio", { name: /^Risograph/ }).check();
  await expect(dialog.getByRole("radio", { name: "Press sheet", exact: true })).toBeChecked();
});

test("a saved Risograph choice is painted before the app starts", async ({ page }) => {
  await choose(page, { style: "riso", theme: "dark" });
  await page.goto("/v2/#/home");
  const root = page.locator("html");
  await expect(root).toHaveAttribute("data-style", "riso");
  await expect(root).toHaveAttribute("data-theme", "dark");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#1c1a18");
  expect(await page.locator("#riso-fonts").count()).toBe(1);
  await expect(page.locator("#botanical-fonts")).toHaveCount(0);
});

test("Risograph prints on paper: no glass, its own art, and a readable name", async ({ page }) => {
  await choose(page, { style: "riso", theme: "light" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/v2/#/home");
  await expect(page.getByRole("heading", { level: 1, name: "Justin Rogowski" })).toBeVisible();
  await expect(page.locator(".glass-surface")).toHaveCount(0);
  await expect(page.locator(".tech-heading canvas")).toHaveCount(0);
  await expect(page.locator(".hero-flora")).toHaveCount(0);
  await expect(page.locator(".hero-print")).toBeVisible();
  await expect(page.locator(".wordmark .riso-mark")).toBeVisible();
  // The portrait is a two-plate print with one accessible image.
  await expect(page.locator(".hero-portrait .riso-plate")).toHaveCount(2);
  await expect(page.getByRole("img", { name: "Justin Rogowski" })).toHaveCount(1);
  await expect(page.locator(".page-background-riso")).toHaveAttribute("data-background", "riso-shapes");
  await expect(page.locator(".app-footer")).toContainText("Printed by Justin");
});

test("contrast modes drop Risograph's texture and off-register plates", async ({ page }) => {
  await choose(page, { style: "riso", theme: "light" });
  await page.emulateMedia({ contrast: "more" });
  await page.goto("/v2/#/home");
  await expect(page.locator(".hero-print")).toBeHidden();
  const shadow = await page
    .locator(".tech-heading > span")
    .last()
    .evaluate((el) => getComputedStyle(el).textShadow);
  expect(shadow).toBe("none");
});

test("an unknown saved style falls back to Botanical", async ({ page }) => {
  await choose(page, { style: "letterpress" });
  await page.goto("/v2/#/home");
  await expect(page.locator("html")).toHaveAttribute("data-style", "botanical");
});

test("style short links save the style and open the homepage at the same view", async ({ page }) => {
  // A first visit: nothing saved yet.
  await page.goto("/r/#/projects");
  await expect(page).toHaveURL(/127\.0\.0\.1:4392\/#\/projects$/);
  await expect(page.locator("html")).toHaveAttribute("data-style", "riso");
  await expect(page.getByRole("heading", { level: 1, name: /Projects/ })).toBeVisible();
  // A complete record, so the app accepts it rather than falling back.
  expect(await prefs(page)).toMatchObject({ style: "riso", theme: "system", calm: false, atmosphere: true });
  // A returning visitor keeps their other settings; only the style changes.
  await page.evaluate((key) => {
    const saved = JSON.parse(localStorage.getItem(key));
    localStorage.setItem(key, JSON.stringify({ ...saved, theme: "dark", calm: true }));
  }, KEY);
  await page.goto("/b");
  await expect(page).toHaveURL(/127\.0\.0\.1:4392\/$/);
  await expect(page.locator("html")).toHaveAttribute("data-style", "botanical");
  expect(await prefs(page)).toMatchObject({ style: "botanical", theme: "dark", calm: true });
  await page.goto("/o/");
  await expect(page.locator("html")).toHaveAttribute("data-style", "original");
  // The plain address then keeps whatever the visitor last chose.
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-style", "original");
});

for (const [width, height] of [[375, 812], [700, 1000], [1440, 900]]) {
  for (const colorScheme of ["light", "dark"]) {
    test(`Risograph has no horizontal overflow at ${width}px in ${colorScheme}`, async ({ page }) => {
      await choose(page, { style: "riso" });
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
