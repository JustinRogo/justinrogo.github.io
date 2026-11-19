// Captures the Risograph style for review: node v2/.impeccable/capture-riso.mjs [out-dir] [names...]
// Needs the V2 dev server on 127.0.0.1:4392. External requests are blocked.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const out = process.argv[2] || "v2/.impeccable/review";
const only = process.argv.slice(3);
mkdirSync(out, { recursive: true });
const shots = [
  ["desktop", 1440, 900, "light", "home", true],
  ["desktop-dark", 1440, 900, "dark", "home", true],
  ["user-700", 700, 1000, "light", "home", true],
  ["mobile", 390, 844, "light", "home", true],
  ["mobile-dark", 390, 844, "dark", "home", true],
  ["projects", 1440, 900, "light", "projects", false],
  ["about", 1440, 900, "light", "about", true],
  ["tools", 1440, 900, "light", "tools", false],
  ["more", 1440, 900, "light", "more", true],
  ["about-dark", 1440, 900, "dark", "about", false],
  ["mobile-portrait", 390, 844, "light", "home", "portrait"],
  ["more-700", 700, 1000, "light", "more", true],
];
const browser = await chromium.launch({
  channel: process.platform === "win32" ? "msedge" : undefined,
});
for (const [name, width, height, theme, view, full] of shots) {
  if (only.length && !only.includes(name)) continue;
  const page = await browser.newPage({ viewport: { width, height } });
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (/^https?:\/\/(127\.0\.0\.1|localhost)/.test(url) || url.includes("fonts.g")) return route.continue();
    return route.abort();
  });
  // Registered last, so it takes precedence over the catch-all.
  // A fixed reading, so the weather panel shows its figure in review.
  await page.route("https://api.open-meteo.com/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        current: { time: "2026-11-18T20:00", temperature_2m: 48.2, apparent_temperature: 44.1, weather_code: 3 },
      }),
    }),
  );
  await page.addInitScript((theme) => {
    localStorage.setItem("jr-v2-assembly-seen", "1");
    localStorage.setItem(
      "jr-v2-preferences",
      JSON.stringify({
        theme, calm: false, atmosphere: true, intro: false, background: "auto",
        style: "riso", risoBackground: "shapes", botanicalBackground: "conservatory",
      }),
    );
  }, theme);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`http://127.0.0.1:4392/v2/#/${view}`);
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.fonts.ready);
  if (full === "portrait") {
    await page.locator(".hero-portrait").scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 160));
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: full === true });
  await page.close();
}
await browser.close();
console.log("captured", out);
