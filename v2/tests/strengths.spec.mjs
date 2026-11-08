import { test, expect } from "./original-style.mjs";
import { readFile } from "node:fs/promises";

const legacy = await readFile(
  new URL("../../src/homepage/legacy-widgets.js", import.meta.url),
  "utf8",
);
const originalReflection = (id) =>
  legacy
    .match(
      new RegExp(
        `<div id="${id}" class="content(?: active)?">\\s*<p>([\\s\\S]*?)</p>`,
      ),
    )[1]
    .replace(/\s+/g, " ")
    .trim();
const expected = [
  ["thinking", "Strategic Thinking", "34.6%", "rgb(16, 185, 129)"],
  ["relationship", "Relationship Building", "28.6%", "rgb(0, 102, 255)"],
  ["executing", "Executing", "19.2%", "rgb(124, 58, 237)"],
  ["influencing", "Influencing", "17.6%", "rgb(255, 126, 95)"],
];
test.beforeEach(async ({ page }) => {
  await page.route("https://**/*", (route) => {
    if (!["GET", "HEAD"].includes(route.request().method()))
      throw new Error("External write attempted");
    return route.abort();
  });
});

test("CliftonStrengths preserves V1 reflections, domain colors, and all-34 rank weighting across filters", async ({
  page,
}) => {
  await page.goto("/v2/#/about");
  const chart = page.getByRole("img", {
    name: /^Rank-weighted CliftonStrengths domain balance/,
  });
  await expect(chart).toBeVisible();
  const label = await chart.getAttribute("aria-label");
  for (const [id, name, percentage, color] of expected) {
    expect(label).toContain(`${name} ${percentage}`);
    await expect(
      page.locator(`.strength-domain-legend [data-domain="${id}"]`),
    ).toHaveText(`${name}${percentage}`);
    await expect(chart.locator(`[data-domain="${id}"]`)).toHaveCSS(
      "background-color",
      color,
    );
  }
  const weights = await chart
    .locator("span")
    .evaluateAll((nodes) => nodes.map((node) => Number(node.style.flexGrow)));
  expect(weights).toEqual([206, 170, 114, 105]);
  expect(weights.reduce((sum, value) => sum + value, 0)).toBe(595);
  for (const limit of [10, 34, 5]) {
    await page
      .getByRole("group", { name: "Strengths to show" })
      .getByRole("button", {
        name: limit === 34 ? "All 34" : `Top ${limit}`,
        exact: true,
      })
      .click();
    await expect(page.locator(".strength")).toHaveCount(limit);
    await expect(chart).toHaveAttribute("aria-label", label);
  }
  const reflection = page.locator(".strength-reflection-card");
  await expect(reflection.locator(".flip-card__face--front p")).toHaveText(
    originalReflection("best"),
  );
  await expect(reflection.locator(".flip-card__face--back p")).toHaveText(originalReflection("overextended"));
  await reflection.focus();
  await page.keyboard.press("Enter");
  await expect(reflection).toHaveAttribute("aria-pressed", "true");
  await expect(reflection).toHaveAttribute("aria-label", /When I’m overextended/);
  await expect(reflection.locator(".flip-card__face--back")).toHaveAttribute("aria-hidden", "false");
  await page.keyboard.press("Space");
  await expect(reflection).toHaveAttribute("aria-pressed", "false");
  await expect(reflection.locator(".flip-card__face--front")).toHaveAttribute("aria-hidden", "false");
});

test("strengths overview and reflections fit narrow screens in both themes", async ({
  page,
}) => {
  for (const width of [375, 1024]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await page.goto(`/v2/?strengths=${width}-${theme}#/about`);
      await page.evaluate(
        (theme) =>
          localStorage.setItem(
            "jr-v2-preferences",
            JSON.stringify({ theme, calm: true, atmosphere: false }),
          ),
        theme,
      );
      await page.reload();
      await page.evaluate(() => document.fonts.ready);
      await page
        .locator(".strengths")
        .evaluate((el) =>
          el.scrollIntoView({ block: "start", behavior: "instant" }),
        );
      await page.screenshot({
        path: `.impeccable/review/strengths-${width}-${theme}.png`,
        fullPage: false,
      });
      const bar = await page.locator(".strength-domain-bar").boundingBox();
      const parts = await page
        .locator(".strength-domain-bar > span")
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getBoundingClientRect().width),
        );
      expect(
        Math.abs(parts.reduce((sum, value) => sum + value, 0) - bar.width),
      ).toBeLessThan(1);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      const reflection = page.locator(".strength-reflection-card");
      await reflection.focus();
      await page.keyboard.press("Enter");
      await expect(reflection).toHaveAttribute("data-fade", "back");
      await expect(reflection.locator(".flip-card__rotor")).toHaveCSS("transform", "none");
      for (const face of await reflection.locator(".strength-reflection-content").all()) {
        expect(await face.evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
      }
      await page.getByRole("button", { name: "All 34", exact: true }).click();
      for (const [id, , , color] of expected) {
        await expect(
          page.locator(`.strength-${id} .strength-rank`).first(),
        ).toHaveCSS("background-color", color);
      }
    }
  }
});
