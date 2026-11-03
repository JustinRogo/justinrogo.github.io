import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  await page.route("https://**/*", (route) => {
    if (!["GET", "HEAD"].includes(route.request().method()))
      throw new Error("External write attempted");
    return route.abort();
  });
});
const openSettings = (page) =>
  page
    .locator(".topbar")
    .getByRole("button", { name: "Appearance and motion settings" })
    .click();

test("background defaults follow device size; explicit choices persist and only the selected renderer mounts", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/v2/?intro=0#/about");
  const host = page.locator(".page-background");
  await expect(host).toHaveAttribute("data-background", "shape-waves");
  await expect(host.locator(".shape-waves")).toHaveCount(1);
  await expect(host.locator(".site-background__layers")).toHaveAttribute(
    "data-background-state",
    /active|fallback/,
  );
  await page.setViewportSize({ width: 375, height: 900 });
  await expect(host).toHaveAttribute("data-background", "aurora");
  await expect(host.locator("canvas")).toHaveCount(0);
  await expect(host.locator(".site-background__aurora")).toHaveCount(1);
  await openSettings(page);
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: "Fractal", exact: true }).check();
  await expect(host.locator(".fractal-background")).toHaveCount(1);
  await expect(
    host.locator(".shape-waves,.antigravity,.site-background__aurora"),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(host).toHaveAttribute("data-background", "fractal");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(host).toHaveAttribute("data-background", "fractal");
  await openSettings(page);
  for (const [name, selected, selector] of [
    ["Antigravity", "antigravity", ".background-static"],
    ["Aurora", "aurora", ".site-background__aurora"],
    ["Orbits", "orbits", ".atmosphere"],
    ["None", "none", null],
    ["Device default", "shape-waves", ".background-static"],
  ]) {
    await dialog.getByRole("radio", { name, exact: true }).check();
    await expect(host).toHaveAttribute("data-background", selected);
    if (selector) await expect(host.locator(selector)).toHaveCount(1);
    else await expect(host.locator(".page-background-renderer")).toHaveCount(0);
    await expect(host.locator(".page-background-renderer")).toHaveCount(
      selector ? 1 : 0,
    );
  }
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 430, height: 900 });
  await expect(host).toHaveAttribute("data-background", "aurora");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/v2/?replayIntro=1#/home");
  await expect(page.locator(".assembly-layer")).toHaveAttribute(
    "data-assembly-state",
    /preparing|assembling/,
  );
  await expect(host).toHaveAttribute("data-motion", "still");
  await expect(page.locator(".assembly-layer")).toHaveAttribute(
    "data-assembly-state",
    "complete",
    { timeout: 10000 },
  );
  await expect(host).toHaveAttribute("data-motion", "moving");
  expect(errors).toEqual([]);
});

test("backgrounds respect Calm, reduced motion, contrast, storage failure, and V1 preference isolation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("site-background", "fractal");
    localStorage.setItem(
      "jr-v2-preferences",
      JSON.stringify({
        theme: "dark",
        calm: false,
        atmosphere: true,
        background: "shape-waves",
      }),
    );
  });
  await page.goto("/v2/?intro=0#/home");
  const host = page.locator(".page-background");
  await expect(host).toHaveAttribute("data-background", "shape-waves");
  await expect(host).toHaveAttribute("data-motion", "still");
  await expect(host.locator(".shape-waves")).toHaveCount(0);
  await expect(host.locator(".background-static")).toHaveCount(1);
  await openSettings(page);
  const dialog = page.getByRole("dialog");
  for (const name of ["Antigravity", "Fractal", "Aurora", "Orbits"]) {
    await dialog.getByRole("radio", { name, exact: true }).check();
    await expect(host).toHaveAttribute("data-motion", "still");
    await expect(host.locator(".shape-waves,.antigravity")).toHaveCount(0);
  }
  await page.emulateMedia({ reducedMotion: "no-preference", contrast: "more" });
  await expect(host.locator(".page-background-renderer")).toHaveCount(0);
  await page.emulateMedia({ contrast: "no-preference" });
  await dialog.getByRole("switch", { name: /^Calm mode/ }).check();
  await expect(host).toHaveAttribute("data-motion", "still");
  expect(
    await page.evaluate(() => localStorage.getItem("site-background")),
  ).toBe("fractal");
  await page.keyboard.press("Escape");
  await page.addInitScript(() => {
    Storage.prototype.getItem = Storage.prototype.setItem = () => {
      throw new DOMException("Storage blocked", "SecurityError");
    };
  });
  await page.reload();
  await openSettings(page);
  await page
    .getByRole("dialog")
    .getByRole("radio", { name: "Aurora", exact: true })
    .check();
  await expect(host).toHaveAttribute("data-background", "aurora");
});

test("social profile buttons and the sidebar contact shortcut preserve native destinations and anchored focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1236, height: 1000 });
  await page.goto("/v2/?intro=0#/about");
  const social = page.getByRole("group", { name: "Social profiles" });
  for (const [name, href] of [
    ["LinkedIn", "https://www.linkedin.com/in/justin-rogowski/"],
    ["GitHub", "https://github.com/JustinRogo"],
  ]) {
    const link = social.getByRole("link", { name, exact: true });
    await expect(link).toHaveAttribute("href", href);
    await expect(link).toHaveAttribute("target", "_blank");
    expect((await link.boundingBox()).height).toBeGreaterThanOrEqual(44);
  }
  await expect(
    page.locator(".sidebar .prototype-label,.sidebar .v1-link"),
  ).toHaveCount(0);
  const connect = page
    .locator(".sidebar")
    .getByRole("link", { name: "Let’s connect" });
  await connect.click();
  await expect(page).toHaveURL(/#\/about\?section=contact$/);
  await expect(page.locator("#say-hello-heading")).toBeFocused();
  await expect(page.locator("#say-hello-heading")).toBeInViewport();
  await page.evaluate(() => window.scrollTo(0, 0));
  await connect.click();
  await expect(page.locator("#say-hello-heading")).toBeInViewport();
  await page.reload();
  await expect(page.locator("#say-hello-heading")).toBeFocused();
  await page.goBack();
  await expect(page).toHaveURL(/#\/about$/);
  await page.setViewportSize({ width: 375, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

test("background settings and selected still backgrounds fit both themes on desktop and phone", async ({
  page,
}) => {
  await mkdir(".impeccable/review/backgrounds", { recursive: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/v2/?intro=0#/home");
    await openSettings(page);
    const dialog = page.getByRole("dialog");
    for (const theme of ["Light", "Dark"]) {
      await dialog.getByRole("radio", { name: theme, exact: true }).check();
      for (const name of ["Shape Waves", "Antigravity", "Fractal", "Aurora"]) {
        await dialog.getByRole("radio", { name, exact: true }).check();
        await page.keyboard.press("Escape");
        await page.screenshot({
          path: `.impeccable/review/backgrounds/${width}-${theme}-${name.replace(" ", "-")}.png`,
        });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        ).toBe(true);
        await openSettings(page);
      }
      await page.screenshot({
        path: `.impeccable/review/backgrounds/${width}-${theme}-settings.png`,
      });
      for (let i = 0; i < 18; i++) {
        await page.keyboard.press("Tab");
        expect(
          await dialog.evaluate((el) => el.contains(document.activeElement)),
        ).toBe(true);
      }
    }
    await page.keyboard.press("Escape");
  }
});
