import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const snapshot = { items: [
  { title: "Connecticut’s Forgotten Witch Trials", link: "https://library.law.uconn.edu/witch-trials/", pubDate: "2026-10-23T18:21:19Z", thumbnail: "https://library-law.media.uconn.edu/witch.png" },
  { title: "Congo Week 2026", link: "https://library.law.uconn.edu/congo/", pubDate: "2026-10-16T20:17:31Z", thumbnail: "https://library-law.media.uconn.edu/congo.png" },
  { title: "What Makes Lawyers Happy?", link: "https://library.law.uconn.edu/happy/", pubDate: "2026-10-03T14:12:32Z", thumbnail: "" },
  { title: "Introducing: The Ioffe Collection", link: "https://library.law.uconn.edu/ioffe/", pubDate: "2026-09-18T17:36:54Z", thumbnail: "https://library-law.media.uconn.edu/broken.png" },
] };

test.beforeEach(async ({ page, context }) => {
  await page.addInitScript(() => localStorage.setItem("jr-v2-preferences", JSON.stringify({ theme: "dark", calm: false, atmosphere: false, intro: false })));
  await page.route("**/data/pocket-part.json", route => route.fulfill({ json: snapshot }));
  await context.route("https://**/*", route => {
    const url = route.request().url();
    if (url.includes("broken.png")) return route.abort();
    if (url.includes("library-law.media.uconn.edu")) return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#255985"/><circle cx="300" cy="300" r="150" fill="#eda775"/></svg>' });
    if (url.includes("library.law.uconn.edu")) return route.fulfill({ contentType: "text/html", body: "<title>Blog post</title><h1>Blog post</h1>" });
    if (url.includes("/live/rss/")) return route.fulfill({ contentType: "application/rss+xml", body: "<rss><channel></channel></rss>" });
    return route.abort();
  });
});

test("Pocket Part replaces the contact section with linked image/text cards and stacks as the page scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/v2/?intro=0#/home");
  await expect(page.getByRole("heading", { name: "Have a good problem?" })).toHaveCount(0);
  const section = page.locator(".home-pocket-part");
  await expect(section.getByRole("heading", { name: "The Pocket Part", exact: true })).toBeVisible();
  const links = section.locator(".pocket-post-link");
  await expect(links).toHaveCount(4);
  await expect(links.first().locator("time")).toHaveText("Oct 23, 2026");
  await expect(links.nth(2)).not.toHaveClass(/has-image/);
  const root = section.locator(".scroll-stack");
  const origin = await root.evaluate(el => el.getBoundingClientRect().top + scrollY);
  await page.evaluate(y => window.scrollTo({ top: y - 108, behavior: "instant" }), origin);
  await expect(links.first().locator("img")).toBeVisible();
  const [image, copy] = await Promise.all([links.first().locator("img").boundingBox(), links.first().locator(".pocket-post-copy").boundingBox()]);
  expect(Math.abs(image.width - copy.width)).toBeLessThan(1);
  expect(image.x).toBeLessThan(copy.x);
  const [secondImage, secondCopy] = await Promise.all([links.nth(1).locator("img").boundingBox(), links.nth(1).locator(".pocket-post-copy").boundingBox()]);
  expect(secondImage.x).toBeGreaterThan(secondCopy.x);
  await page.evaluate(y => window.scrollTo({ top: y + 800, behavior: "instant" }), origin);
  await expect(section.locator(".pocket-post").first()).not.toHaveCSS("transform", "none");
  // Tabbing back to a buried card reveals it instead of leaving focus behind the pile.
  await links.first().focus();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(origin);
  const popup = page.waitForEvent("popup");
  await page.keyboard.press("Enter");
  const post = await popup;
  await expect(post).toHaveURL(snapshot.items[0].link);
  await post.close();
  await links.last().focus();
  await expect(links.last()).not.toHaveClass(/has-image/);
  expect(errors).toEqual([]);
});

test("Pocket Part remains readable on phones, in both themes, and with Calm or reduced motion", async ({ page }) => {
  await mkdir(".impeccable/pocket-stack", { recursive: true });
  for (const width of [1440, 1279, 1200, 1199, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/v2/?intro=0&stackWidth=${width}#/home`);
    const section = page.locator(".home-pocket-part");
    const root = section.locator(".scroll-stack");
    const events = page.locator(".law-events");
    const [eventBox, blogBox] = await Promise.all([events.boundingBox(), section.boundingBox()]);
    if (width >= 1200) {
      expect(blogBox.x).toBeGreaterThan(eventBox.x + eventBox.width);
      expect(Math.abs(blogBox.y - eventBox.y)).toBeLessThan(1);
    } else expect(blogBox.y).toBeGreaterThan(eventBox.y + eventBox.height);
    await root.scrollIntoViewIfNeeded();
    const origin = await root.evaluate(el => el.getBoundingClientRect().top + scrollY);
    const stride = await root.locator(".scroll-stack__slot").first().evaluate(el => el.offsetHeight + 72);
    for (const [name, offset] of [["start", 0], ["middle", stride * 1.5], ["end", stride * 3]]) {
      await page.evaluate(y => window.scrollTo({ top: y, behavior: "instant" }), origin - 108 + offset);
      await page.waitForTimeout(100);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `.impeccable/pocket-stack/${width}-${name}.png` });
    }
    const last = root.locator(".scroll-stack__slot").last();
    expect(Math.abs((await last.boundingBox()).y - 108)).toBeLessThan(2);
  }
  const stack = page.locator(".pocket-stack");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(stack).toHaveClass(/is-static/);
  await expect(stack.locator(".scroll-stack__slot").first()).toHaveCSS("position", "relative");
  await page.getByRole("link", { name: "More", exact: true }).click();
  await page.getByRole("button", { name: "Appearance & motion" }).click();
  await page.getByRole("radio", { name: "Light", exact: true }).check();
  await page.getByRole("switch", { name: /^Calm mode/ }).check();
  await page.keyboard.press("Escape");
  await page.goBack();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(stack).toHaveClass(/is-static/);
  await stack.locator(".pocket-post-link").first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: ".impeccable/pocket-stack/320-light-calm.png" });
  for (const post of await stack.locator(".pocket-post").all()) await expect(post).toHaveCSS("transform", "none");
});

test("empty, invalid, and unavailable blog feeds preserve the blog link and retry", async ({ page }) => {
  await page.route("**/data/pocket-part.json", route => route.fulfill({ json: { items: [{ title: "Unsafe", link: "javascript:alert(1)", pubDate: "bad" }] } }));
  await page.goto("/v2/?intro=0#/home");
  const section = page.locator(".home-pocket-part");
  await expect(section.getByText(/No posts returned/)).toBeVisible();
  await expect(section.getByRole("link", { name: "All posts" })).toHaveAttribute("href", "https://library.law.uconn.edu/the-pocket-part/");
  await page.route("**/data/pocket-part.json", route => route.fulfill({ status: 503, body: "offline" }));
  await page.reload();
  await expect(section.getByText("The Pocket Part feed is unavailable right now.")).toBeVisible();
  await page.route("**/data/pocket-part.json", route => route.fulfill({ json: snapshot }));
  await section.getByRole("button", { name: "Try again" }).click();
  await expect(section.locator(".pocket-post-link")).toHaveCount(4);
});

test("Home and More share the blog feed without losing posts in either navigation order", async ({ page }) => {
  await page.goto("/v2/?intro=0#/home");
  await expect(page.locator(".pocket-post-link")).toHaveCount(4);
  const nav = page.getByRole("navigation", { name: "Primary navigation", exact: true });
  await nav.getByRole("link", { name: "More", exact: true }).click();
  await expect(page.locator(".blog-feed .post")).toHaveCount(4);
  await page.reload();
  await expect(page.locator(".blog-feed .post")).toHaveCount(4);
  await nav.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page.locator(".pocket-post-link")).toHaveCount(4);
});
