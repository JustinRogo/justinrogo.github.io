import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  await page.route("https://**/*", route => route.abort());
  await page.addInitScript(() => {
    if (!localStorage.getItem("jr-v2-preferences")) localStorage.setItem("jr-v2-preferences", JSON.stringify({ theme: "dark", calm: true, atmosphere: true, background: "aurora" }));
  });
});

test("project previews and varied cards fit desktop, tablet, phone, filters, and resized sidebars", async ({ page }) => {
  await mkdir(".impeccable/projects", { recursive: true });
  for (const width of [1440, 921, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/v2/?intro=0#/projects");
    await expect(page.locator(".project-card")).toHaveCount(15);
    for (const image of await page.locator(".project-preview img:visible").all()) {
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
    }
    const bounds = await page.locator(".project-tile").evaluateAll(elements => elements.map(el => {
      const r = el.getBoundingClientRect();
      return { x: r.x, right: r.right, width: Math.round(r.width), height: Math.round(r.height), clipped: el.querySelector(".project-card").scrollHeight > el.clientHeight + 2 };
    }));
    expect(bounds.every(r => r.x >= 0 && r.right <= width && !r.clipped)).toBe(true);
    if (width >= 768) {
      expect(new Set(bounds.map(r => r.width)).size).toBeGreaterThan(1);
      expect(new Set(bounds.map(r => r.height)).size).toBeGreaterThan(1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `.impeccable/projects/${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1320, height: 1000 });
  await page.evaluate(() => document.documentElement.style.setProperty("--sidebar-width", "180px"));
  await expect.poll(() => page.locator(".project-bento").evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length)).toBe(3);
  await page.evaluate(() => document.documentElement.style.setProperty("--sidebar-width", "320px"));
  await expect.poll(() => page.locator(".project-bento").evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length)).toBe(2);
  await page.getByRole("searchbox", { name: "Search projects" }).fill("Tarot");
  await expect(page.locator(".project-card")).toHaveCount(1);
  await expect(page.locator(".project-preview img")).toHaveAttribute("alt", "Screenshot of Tarot Reading");
  await page.getByRole("button", { name: "Save Tarot Reading", exact: true }).click();
  await page.getByRole("button", { name: /^Saved/ }).click();
  await expect(page.locator(".project-card")).toHaveCount(1);
});

test("reduced transparency keeps every selected background visibly distinct", async ({ page, context }) => {
  await mkdir(".impeccable/projects", { recursive: true });
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] });
  await page.goto("/v2/?intro=0#/projects");
  const host = page.locator(".page-background");
  await expect(host).toBeVisible();
  await page.addStyleTag({ content: "#root > :not(.page-background) { visibility: hidden !important; }" });
  const hashes = [];
  for (const choice of ["none", "shape-waves", "antigravity", "fractal", "aurora", "orbits"]) {
    await page.evaluate(value => {
      const prefs = JSON.parse(localStorage.getItem("jr-v2-preferences"));
      localStorage.setItem("jr-v2-preferences", JSON.stringify({ ...prefs, background: value }));
    }, choice);
    // React reads preferences on mounting, just as it does on a return visit.
    await page.reload();
    await expect(host).toHaveAttribute("data-background", choice);
    await expect(host).toBeVisible();
    await expect(host).toHaveAttribute("data-motion", "still");
    if (choice !== "none") await expect(host.locator(".page-background-renderer")).toHaveCount(1);
    await page.addStyleTag({ content: "#root > :not(.page-background) { visibility: hidden !important; }" });
    const screenshot = await host.screenshot({ path: `.impeccable/projects/background-${choice}.png` });
    hashes.push(createHash("sha256").update(screenshot).digest("hex"));
  }
  expect(new Set(hashes).size).toBe(6);
});
