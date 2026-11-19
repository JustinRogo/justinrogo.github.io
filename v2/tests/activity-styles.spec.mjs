// Daily Activity follows the homepage's saved site style and light/dark choice.
import { test, expect } from "@playwright/test";

const KEY = "jr-v2-preferences";
const PAGE = "/Pages/Personal/Daily-Activity/";
const save = (page, value) =>
  page.addInitScript(
    ([key, value]) => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem(key, JSON.stringify(value));
        sessionStorage.setItem("seeded", "1");
      }
    },
    [KEY, value],
  );

test.beforeEach(async ({ page }) => {
  await page.route("https://**/*", (route) => route.abort());
});

for (const [style, colour, paper] of [
  ["botanical", "rgb(47, 96, 69)", "#efe8d8"],
  ["original", "rgb(18, 92, 212)", "#e6efff"],
  ["riso", "rgb(39, 71, 201)", "#f2e9d4"],
]) {
  test(`Daily Activity prints in ${style}`, async ({ page }) => {
    await save(page, { theme: "light", calm: false, atmosphere: true, style });
    await page.goto(PAGE);
    await expect(page.locator("#dashboard")).toBeVisible();
    const root = page.locator("html");
    await expect(root).toHaveAttribute("data-style", style);
    await expect(root).toHaveAttribute("data-theme", "light");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", paper);
    // The steps colour the charts read comes from the style.
    const steps = await page.locator('.metric[data-metric="steps"], [data-metric="steps"]').first()
      .evaluate((el) => getComputedStyle(el).getPropertyValue("--metric").trim());
    const resolved = await page.evaluate((value) => {
      const probe = document.createElement("i");
      probe.style.color = value;
      document.body.append(probe);
      const colour = getComputedStyle(probe).color;
      probe.remove();
      return colour;
    }, steps);
    expect(resolved).toBe(colour);
  });
}

test("no saved style opens in Botanical, and dark follows the saved choice", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(PAGE);
  await expect(page.locator("html")).toHaveAttribute("data-style", "botanical");
  await save(page, { theme: "dark", calm: false, atmosphere: true, style: "riso" });
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("changing the style on the homepage updates an open Daily Activity tab", async ({ context }) => {
  const activity = await context.newPage();
  await activity.route("https://**/*", (route) => route.abort());
  await activity.goto(PAGE);
  await expect(activity.locator("#dashboard")).toBeVisible();
  await expect(activity.locator("html")).toHaveAttribute("data-style", "botanical");
  await activity.evaluate(() => {
    window.__redraws = 0;
    addEventListener("site-style-change", () => window.__redraws++);
  });
  const home = await context.newPage();
  await home.route("https://**/*", (route) => route.abort());
  await home.goto(PAGE);
  await home.evaluate((key) => {
    localStorage.setItem(key, JSON.stringify({ theme: "system", calm: false, atmosphere: true, style: "riso" }));
  }, KEY);
  await expect(activity.locator("html")).toHaveAttribute("data-style", "riso");
  await expect.poll(() => activity.evaluate(() => window.__redraws)).toBeGreaterThan(0);
});

for (const style of ["botanical", "riso"]) {
  test(`${style} Daily Activity has no horizontal overflow on a phone`, async ({ page }) => {
    await save(page, { theme: "light", calm: false, atmosphere: true, style });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(PAGE);
    await expect(page.locator("#dashboard")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}

test("the site shell wraps Daily Activity and links back to the homepage", async ({ page }) => {
  await save(page, { theme: "light", calm: false, atmosphere: true, style: "riso" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(PAGE);
  await expect(page.locator("#dashboard")).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Primary navigation" });
  await expect(nav.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/#/home");
  await expect(nav.getByRole("link", { name: "About" })).toHaveAttribute("href", "/#/about");
  await expect(page.locator(".topbar")).toBeVisible();
  // The fallback masthead stays hidden while the shell is present.
  await expect(page.locator(".masthead")).toBeHidden();
  // Keyboard: skip link first, then the rail.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  // Settings restyles the page and the charts redraw.
  await page.evaluate(() => {
    window.__redraws = 0;
    addEventListener("site-style-change", () => window.__redraws++);
  });
  await page.getByRole("button", { name: "Appearance and motion settings" }).click();
  await page.getByRole("dialog").getByRole("radio", { name: /^Botanical/ }).check();
  await expect(page.locator("html")).toHaveAttribute("data-style", "botanical");
  await expect.poll(() => page.evaluate(() => window.__redraws)).toBeGreaterThan(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).style, KEY)).toBe("botanical");
});

test("without the shell script, the page keeps its own masthead", async ({ page }) => {
  await page.route("**/v2/assets/shell.js", (route) => route.abort());
  await page.goto(PAGE);
  await expect(page.locator("#dashboard")).toBeVisible();
  await expect(page.locator(".masthead")).toBeVisible();
  await expect(page.locator(".sidebar")).toHaveCount(0);
});
