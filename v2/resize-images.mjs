// Writes the smaller WebP copies the site loads. capture-project-previews.mjs runs this
// after new screenshots; run `node v2/resize-images.mjs` after replacing the portrait.
import { chromium } from "@playwright/test";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const previewWidths = [480, 800];
const assets = new URL("./assets/", import.meta.url);
const previews = new URL("project-previews/", assets);

async function convert(page, source, target, width, quality) {
  const bytes = await readFile(source);
  const type = source.pathname.endsWith(".png") ? "image/png" : "image/jpeg";
  const url = `data:${type};base64,${bytes.toString("base64")}`;
  const output = await page.evaluate(
    async ({ url, width, quality }) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = Math.round((image.naturalHeight * width) / image.naturalWidth);
      const context = canvas.getContext("2d");
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/webp", quality);
    },
    { url, width, quality },
  );
  if (!output.startsWith("data:image/webp")) throw new Error("This browser cannot encode WebP.");
  await writeFile(target, Buffer.from(output.split(",")[1], "base64"));
}

export async function resizeImages() {
  const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : undefined });
  try {
    const page = await browser.newPage();
    const screenshots = (await readdir(previews)).filter(
      (name) => name.endsWith(".jpg") && !name.endsWith("-portrait.jpg"),
    );
    for (const name of screenshots)
      for (const width of previewWidths)
        await convert(page, new URL(name, previews), new URL(name.replace(".jpg", `-${width}.webp`), previews), width, 0.8);
    await convert(page, new URL("justin.png", assets), new URL("justin.webp", assets), 360, 0.86);
    console.log(`Resized ${screenshots.length} previews and the portrait.`);
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await resizeImages();
