// Optional, read-only network check. Never books, submits, or changes external data.
import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  channel: process.platform === "win32" ? "msedge" : undefined,
});
const page = await browser.newPage();
await page.goto("http://127.0.0.1:4392/v2/#/more", {
  waitUntil: "domcontentloaded",
});
const urls = [
  "../data/pages.json",
  "../data/pocket-part.json",
  "../data/cards_count.json",
  "https://api.open-meteo.com/v1/forecast?latitude=41.76&longitude=-72.67&current=temperature_2m,apparent_temperature,weather_code&temperature_unit=fahrenheit&timezone=America%2FNew_York",
  "https://api.github.com/repos/JustinRogo/justinrogo.github.io/commits?per_page=3",
  "https://api.github.com/repos/UConn-Law-Library/uconn-law-library.github.io/commits?per_page=3",
  "https://api.github.com/repos/UConn-Law-Library/CGS/commits?per_page=3",
  "https://events.uconn.edu/live/rss/events/group/Law%20School/categories_campus/UConn%20Law/header/All%20Events",
];
const results = await page.evaluate(
  async (urls) =>
    Promise.all(
      urls.map(async (url) => {
        try {
          const response = await fetch(url, {
            signal: AbortSignal.timeout(12000),
          });
          const body = await response.text();
          return {
            source: url,
            status: response.status,
            bytes: body.length,
            type: response.headers.get("content-type"),
          };
        } catch (error) {
          return { source: url, unavailable: error.message };
        }
      }),
    ),
  urls,
);
console.log(JSON.stringify(results, null, 2));
console.log("UI errors:", await page.locator(".fatal-error").count());
console.log(
  "Rendered GitHub entries:",
  await page.locator(".more-columns .link-row").count(),
);
await browser.close();
