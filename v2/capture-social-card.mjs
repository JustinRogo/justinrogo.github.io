// Regenerates the link-preview image in index.html's og:image tag.
// Run `node v2/capture-social-card.mjs` after changing the name, role, or portrait.
import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const asset = (path) => readFile(new URL(path, import.meta.url), "base64");
const font = await asset("./assets/fonts/Geist.woff2");
const portrait = await asset("./assets/justin.png");

const html = `<!doctype html>
<style>
  @font-face { font-family: Geist; src: url(data:font/woff2;base64,${font}); font-weight: 100 900; }
  * { box-sizing: border-box; margin: 0; }
  body {
    width: 1200px; height: 630px; padding: 0 96px;
    display: flex; align-items: center; justify-content: space-between;
    font-family: Geist, sans-serif; color: #f2f6ff;
    background:
      radial-gradient(700px 500px at 88% 12%, rgba(43, 116, 255, .34), transparent 70%),
      radial-gradient(620px 460px at 8% 100%, rgba(255, 134, 47, .2), transparent 70%),
      #060f23;
  }
  h1 { font-size: 118px; font-weight: 550; line-height: 1.04; letter-spacing: -.03em; }
  h1 span { display: block; color: #ffa96b; }
  .role { margin-top: 34px; font-size: 34px; font-weight: 500; color: #7db6ff; }
  .org { margin-top: 8px; font-size: 30px; color: #c9d6ec; }
  .photo {
    flex: none; width: 320px; height: 320px; padding: 7px; border-radius: 50%;
    background: linear-gradient(135deg, #4996ff 35%, #ff862f);
  }
  .photo img { display: block; width: 100%; height: 100%; border-radius: 50%; }
</style>
<div>
  <h1>Justin<span>Rogowski</span></h1>
  <p class="role">Library Information Coordinator</p>
  <p class="org">UConn School of Law</p>
</div>
<div class="photo"><img src="data:image/png;base64,${portrait}" alt=""></div>`;

const browser = await chromium.launch({
  channel: process.platform === "win32" ? "msedge" : undefined,
});
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: fileURLToPath(new URL("./assets/social-card.jpg", import.meta.url)),
    type: "jpeg",
    quality: 88,
  });
} finally {
  await browser.close();
}
