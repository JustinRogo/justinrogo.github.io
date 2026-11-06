// Refresh committed preview images from the actual destinations in the project index.
// Start `npm run dev:v2` first. Only GET/HEAD requests are permitted during capture.
import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resizeImages } from "./resize-images.mjs";

const origin = process.env.PREVIEW_ORIGIN || "http://127.0.0.1:4392";
const output = new URL("./assets/project-previews/", import.meta.url);
const { pages } = JSON.parse(await readFile(new URL("../data/pages.json", import.meta.url), "utf8"));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : undefined });
const sources = [];
try {
  for (const project of pages) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
    await page.route("**/*", route => ["GET", "HEAD"].includes(route.request().method()) ? route.continue() : route.abort());
    const url = project.href || new URL(project.path.split("/").map(encodeURIComponent).join("/"), origin).href;
    const name = project.path.replace(/^Pages\//, "").replace(/\.html$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".jpg";
    try {
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      if (!response?.ok()) throw new Error(`HTTP ${response?.status()}`);
      await page.evaluate(() => document.fonts.ready);
      // Let initial application data and procedural canvases settle before the still.
      await page.waitForTimeout(2000);
      await page.screenshot({ path: fileURLToPath(new URL(name, output)), type: "jpeg", quality: 82, animations: "disabled" });
      const index = pages.indexOf(project);
      let portraitImage;
      if (index % 8 === 4 && index + 3 < pages.length) {
        portraitImage = name.replace(".jpg", "-portrait.jpg");
        await page.setViewportSize({ width: 600, height: 1200 });
        await page.screenshot({ path: fileURLToPath(new URL(portraitImage, output)), type: "jpeg", quality: 82, animations: "disabled" });
      }
      sources.push({ path: project.path, image: name, portraitImage, url, captured: new Date().toISOString() });
      console.log(`Captured ${project.title}`);
    } catch (error) {
      throw new Error(`Cannot capture ${project.title} at ${url}: ${error.message}`);
    } finally {
      await page.close();
    }
  }
  await writeFile(new URL("sources.json", output), JSON.stringify(sources, null, 2) + "\n");
  await resizeImages();
} finally {
  await browser.close();
}
