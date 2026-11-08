import { test, expect } from "./original-style.mjs";

const url = "/v2/?intro=0#/about?section=strengths";
const luminance = ([r, g, b]) => {
  const channel = (value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
// Resolves any computed color, including color-mix() results, to sRGB bytes.
const rgb = (page, color) =>
  page.evaluate((value) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d");
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);
    return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
  }, color);
const open = async (page, { theme = "dark", calm = true } = {}) => {
  await page.goto("/v2/?intro=0");
  await page.evaluate(
    ([theme, calm]) =>
      localStorage.setItem(
        "jr-v2-preferences",
        JSON.stringify({ theme, calm, atmosphere: false }),
      ),
    [theme, calm],
  );
  await page.goto(url);
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
};
const showBoard = (page) =>
  page
    .getByRole("group", { name: "Strengths to show", exact: true })
    .getByRole("button", { name: "By domain", exact: true })
    .click();

test.beforeEach(async ({ page }) => {
  await page.route("https://**/*", (route) => {
    if (!["GET", "HEAD"].includes(route.request().method()))
      throw new Error("External write attempted");
    return route.abort();
  });
});

test("strand shows 34 ranked bars with tooltips and an accessible name", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page);
  const strand = page.getByRole("toolbar", {
    name: "Strengths strand: all 34 themes in rank order, colored by domain.",
  });
  await expect(strand).toBeVisible();
  const bars = strand.locator(".strength-helix-bar");
  await expect(bars).toHaveCount(34);
  expect(await bars.evaluateAll((nodes) => nodes.map((node) => Number(node.dataset.rank)))).toEqual(
    Array.from({ length: 34 }, (_, index) => index + 1),
  );
  // Sits between the view controls and the cards, and uses the overview's domain colors.
  const strandBox = await strand.boundingBox();
  const controls = await page.locator(".strength-controls").boundingBox();
  const board = await page.locator(".strength-board-frame").boundingBox();
  expect(controls.y + controls.height).toBeLessThanOrEqual(strandBox.y);
  expect(strandBox.y + strandBox.height).toBeLessThanOrEqual(board.y);
  expect(board.y - (strandBox.y + strandBox.height)).toBeLessThanOrEqual(16);
  expect(strandBox.height).toBe(80);
  await expect(strand.locator('[data-rank="1"] .strength-helix-mark')).toHaveCSS("fill", "rgb(16, 185, 129)");
  await expect(strand.locator('[data-rank="4"] .strength-helix-mark')).toHaveCSS("fill", "rgb(124, 58, 237)");
  await expect(strand.locator('[data-rank="6"] .strength-helix-mark')).toHaveCSS("fill", "rgb(0, 102, 255)");
  await expect(strand.locator('[data-rank="15"] .strength-helix-mark')).toHaveCSS("fill", "rgb(255, 126, 95)");

  // Two outlines. Every bar is full height, one pitch apart, clear of the sloped ends.
  await expect(strand.locator(".strength-helix-outline")).toHaveCount(2);
  const marks = await strand.locator(".strength-helix-mark").evaluateAll((nodes) =>
    nodes.map((node) => ({
      centre: Number(node.getAttribute("x")) + Number(node.getAttribute("width")) / 2,
      left: Number(node.getAttribute("x")),
      right: Number(node.getAttribute("x")) + Number(node.getAttribute("width")),
      height: Number(node.getAttribute("height")),
    })),
  );
  expect(new Set(marks.map((mark) => mark.height)).size).toBe(1);
  expect(marks[0].height).toBeGreaterThan(60);
  const pitch = marks[1].centre - marks[0].centre;
  marks.slice(1).forEach((mark, index) => {
    if (index !== 4) expect(Math.abs(mark.centre - marks[index].centre - pitch)).toBeLessThan(0.01);
  });
  const flatRuns = await strand.locator(".strength-helix-outline").evaluateAll((nodes) =>
    nodes.map((node) => {
      const xs = node.getAttribute("points").split(" ").map((point) => Number(point.split(",")[0]));
      return { start: xs[1], end: xs[2], tip: xs[3] };
    }),
  );
  expect(marks[0].left).toBeGreaterThan(flatRuns[0].start);
  expect(marks[4].right).toBeLessThan(flatRuns[0].end);
  expect(marks[5].left).toBeGreaterThan(flatRuns[1].start);
  expect(marks[33].right).toBeLessThan(flatRuns[1].end);
  expect(flatRuns[0].tip).toBeGreaterThan(marks[4].centre);
  expect(flatRuns[0].tip).toBeLessThan(marks[5].centre);

  // Hover and keyboard both reveal the tooltip; arrows rove a single tab stop.
  await strand.locator('[data-rank="20"]').hover();
  await expect(page.locator(".strength-helix-tip")).toHaveText("#20 Command · Influencing");
  await page.mouse.move(0, 0);
  await expect(page.locator(".strength-helix-tip")).toHaveCount(0);
  await expect(strand.locator('[tabindex="0"]')).toHaveCount(1);
  await strand.locator('[data-rank="1"]').focus();
  await expect(page.locator(".strength-helix-tip")).toHaveText("#1 Ideation · Strategic Thinking");
  await page.keyboard.press("ArrowRight");
  await expect(strand.locator('[data-rank="2"]')).toBeFocused();
  await page.keyboard.press("End");
  await expect(page.locator(".strength-helix-tip")).toHaveText("#34 Consistency · Executing");
  const tip = await page.locator(".strength-helix-tip").boundingBox();
  expect(tip.x + tip.width).toBeLessThanOrEqual(strandBox.x + strandBox.width + 1);
});

test("hovering a card or bar highlights its partner in every view", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page);
  const strand = page.locator(".strength-helix");
  const bar = (rank) => strand.locator(`[data-rank="${rank}"]`);
  const cell = (rank) => page.locator(`.strength-cell[data-rank="${rank}"]`);
  const linkedBars = strand.locator("[data-linked]");
  const linkedCells = page.locator(".strength-cell[data-linked]");

  // Keyboard focus links too, before any pointer use.
  await bar(1).focus();
  await expect(cell(1)).toHaveAttribute("data-linked", "");
  await page.keyboard.press("ArrowRight");
  await expect(cell(2)).toHaveAttribute("data-linked", "");
  await expect(linkedCells).toHaveCount(1);
  await page.locator("#cliftonstrengths-heading").focus();
  await expect(linkedCells).toHaveCount(0);

  // Card to bar: only that bar keeps its domain color.
  await cell(21).locator(".flip-card").hover();
  await expect(linkedBars).toHaveCount(1);
  await expect(bar(21)).toHaveAttribute("data-linked", "");
  await expect(bar(21).locator(".strength-helix-mark")).toHaveCSS("fill", "rgb(0, 102, 255)");
  await expect(bar(4).locator(".strength-helix-mark")).not.toHaveCSS("fill", "rgb(124, 58, 237)");
  await expect(cell(21).locator(".flip-card__face--front")).toHaveCSS("background-color", "rgb(0, 102, 255)");
  await expect(page.locator(".strength-helix-tip")).toHaveCount(0);

  // Bar to card: a muted card takes its full color, with text that stays readable.
  await page.mouse.move(0, 0);
  await expect(linkedBars).toHaveCount(0);
  await expect(linkedCells).toHaveCount(0);
  await expect(bar(4).locator(".strength-helix-mark")).toHaveCSS("fill", "rgb(124, 58, 237)");
  await bar(15).hover();
  await expect(cell(15)).toHaveAttribute("data-linked", "");
  const face = cell(15).locator(".flip-card__face--front");
  await expect(face).toHaveCSS("background-color", "rgb(255, 126, 95)");
  await expect(face).toHaveCSS("color", "rgb(7, 21, 40)");
  await expect(page.locator(".strength-helix-tip")).toHaveText("#15 Communication · Influencing");

  // Meanwhile every other card turns the same gray, whatever its domain or rank.
  const gray = await cell(1).locator(".flip-card__face--front").evaluate((node) => getComputedStyle(node).backgroundColor);
  expect(await rgb(page, gray)).not.toEqual([16, 185, 129]);
  await expect(cell(4).locator(".flip-card__face--front")).toHaveCSS("background-color", gray);
  await expect(cell(21).locator(".flip-card__face--front")).toHaveCSS("background-color", gray);
  await expect(cell(15).locator(".flip-card__face--front")).not.toHaveCSS("background-color", gray);
  await page.mouse.move(0, 0);
  await expect(cell(1).locator(".flip-card__face--front")).toHaveCSS("background-color", "rgb(16, 185, 129)");

  // Hovering a card leaves the others in color.
  await cell(21).locator(".flip-card").hover();
  await expect(cell(1).locator(".flip-card__face--front")).toHaveCSS("background-color", "rgb(16, 185, 129)");

  // A bar whose card is filtered out highlights alone and doesn't change the view.
  const topFive = page.getByRole("button", { name: "Top 5", exact: true });
  await topFive.click();
  await bar(20).hover();
  await expect(bar(20)).toHaveAttribute("data-linked", "");
  await expect(linkedCells).toHaveCount(0);
  await expect(topFive).toHaveAttribute("aria-pressed", "true");
  await expect(cell(1).locator(".flip-card__face--front")).toHaveCSS("background-color", "rgb(16, 185, 129)");
  // In the list views the rank badge goes gray with its card.
  await bar(3).hover();
  await expect(cell(1).locator(".strength-rank")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await bar(3).hover();
  await expect(cell(3)).toHaveAttribute("data-linked", "");
  await cell(1).locator(".flip-card").hover();
  await expect(bar(1)).toHaveAttribute("data-linked", "");
  await expect(linkedBars).toHaveCount(1);

  // Focus left on a card by a mouse click doesn't hold the highlight.
  await bar(3).click();
  await expect(cell(3).locator(".flip-card")).toBeFocused();
  await page.mouse.move(0, 0);
  await expect(linkedCells).toHaveCount(0);
  await expect(linkedBars).toHaveCount(0);
});

test("strand click widens the filter when needed, scrolls, and focuses the target", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page);
  const filters = page.getByRole("group", { name: "Strengths to show", exact: true });
  await filters.getByRole("button", { name: "Top 5", exact: true }).click();
  const strand = page.locator(".strength-helix");
  await strand.locator('[data-rank="3"]').click();
  await expect(filters.getByRole("button", { name: "Top 5", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('.strength-cell[data-rank="3"] .flip-card')).toBeFocused();

  await strand.locator('[data-rank="8"]').click();
  await expect(filters.getByRole("button", { name: "Top 10", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('.strength-cell[data-rank="8"] .flip-card')).toBeFocused();

  await strand.locator('[data-rank="30"]').evaluate((node) => node.scrollIntoView({ block: "center" }));
  await strand.locator('[data-rank="30"]').click();
  await expect(filters.getByRole("button", { name: "All 34", exact: true })).toHaveAttribute("aria-pressed", "true");
  const cell = page.locator('.strength-cell[data-rank="30"]');
  await expect(cell.locator(".flip-card")).toBeFocused();
  await expect(cell).toBeInViewport();
  await expect(cell).toHaveAttribute("data-located", "");

  await showBoard(page);
  await strand.locator('[data-rank="21"]').evaluate((node) => node.scrollIntoView({ block: "center" }));
  await strand.locator('[data-rank="21"]').focus();
  await page.keyboard.press("Enter");
  await expect(filters.getByRole("button", { name: "By domain", exact: true })).toHaveAttribute("aria-pressed", "true");
  const tile = page.locator('.strength-tile[data-rank="21"]');
  await expect(tile.locator(".flip-card")).toBeFocused();
  await expect(tile).toBeInViewport();
});

test("strand grows in once seen, and stays still under reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page, { calm: false });
  const helix = page.locator(".strength-helix");
  await expect(helix).toHaveAttribute("data-reveal", /running|done/);
  await expect(helix).toHaveAttribute("data-reveal", "done", { timeout: 5000 });
  await expect(helix.locator('[data-rank="34"] .strength-helix-mark')).toHaveCSS("transform", "none");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(helix).toHaveAttribute("data-reveal", "done");
  expect(
    await helix.locator(".strength-helix-mark").evaluateAll((nodes) =>
      nodes.every((node) => getComputedStyle(node).animationName === "none" && getComputedStyle(node).transform === "none"),
    ),
  ).toBe(true);
});

test("strand fits narrow containers as a single row of bars", async ({ page }) => {
  for (const width of [375, 320]) {
    await page.setViewportSize({ width, height: 800 });
    await open(page);
    const helix = page.locator(".strength-helix");
    await expect(helix).toHaveAttribute("data-compact", "true");
    await expect(helix.locator(".strength-helix-outline")).toHaveCount(0);
    await expect(helix.locator(".strength-helix-bar")).toHaveCount(34);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  // Shrinking a page that is already open must not leave the strand wider than the screen.
  await page.setViewportSize({ width: 1236, height: 800 });
  await open(page);
  await expect(page.locator(".strength-helix-outline")).toHaveCount(2);
  await page.setViewportSize({ width: 375, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await expect(page.locator(".strength-helix-outline")).toHaveCount(0);
  const shrunk = await page.locator(".strength-helix svg").boundingBox();
  expect(shrunk.width).toBeLessThanOrEqual(375);
  // The outline returns by container width, not viewport width.
  await page.setViewportSize({ width: 1024, height: 800 });
  await open(page);
  const box = await page.locator(".strength-helix").boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(640);
  await expect(page.locator(".strength-helix-outline")).toHaveCount(2);
});

test("By domain is the first, default view, and flips alphabetical cards in place", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page);
  const views = page.getByRole("group", { name: "Strengths to show", exact: true }).getByRole("button");
  await expect(views).toHaveText(["By domain", "Top 5", "Top 10", "All 34"]);
  await expect(views.first()).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".strength-board-column > h3")).toHaveText([
    "Executing",
    "Influencing",
    "Relationship Building",
    "Strategic Thinking",
  ]);
  await expect(page.locator(".strength-tile")).toHaveCount(34);
  for (const column of await page.locator(".strength-board-column").all()) {
    const names = await column.locator(".strength-tile-name").allTextContents();
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  }
  const heading = page.locator(".strength-board-column > h3").first();
  await expect(heading).toHaveCSS("text-transform", "uppercase");
  await expect(heading).toHaveCSS("border-bottom-color", "rgb(124, 58, 237)");

  const tile = page.locator('.strength-tile[data-rank="1"]');
  await expect(tile.locator(".strength-tile-rank")).toHaveCSS("font-size", "24px");
  await expect(tile.locator(".strength-tile-rank")).toHaveCSS("font-weight", "300");
  const top = await tile.locator(".strength-tile-name").evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
  const high = await page.locator('.strength-tile[data-rank="7"] .strength-tile-name').evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
  expect(high).toBeLessThan(top);
  await expect(page.locator('.strength-tile[data-rank="7"] .strength-tile-rank')).toHaveCSS("font-size", "24px");

  const card = tile.locator(".flip-card");
  const closed = await tile.boundingBox();
  await card.focus();
  await page.keyboard.press("Enter");
  await expect(card).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(tile.locator(".strength-card-back p")).toContainText("finding connections between ideas");
  await expect(tile.locator(".flip-card__face--back")).toHaveAttribute("aria-hidden", "false");
  const opened = await tile.boundingBox();
  expect(opened.width).toBeGreaterThan(closed.width * 1.8);
  await page.keyboard.press("Enter");
  await expect(card).toHaveAttribute("aria-pressed", "false");
  await expect(card).toBeFocused();
  expect(Math.abs((await tile.boundingBox()).width - closed.width)).toBeLessThanOrEqual(1);

  // Leaving the board restores the flip cards.
  await page.getByRole("button", { name: "Top 5", exact: true }).click();
  await expect(page.locator(".strength.flip-card")).toHaveCount(5);
  await expect(page.locator(".strength-tile")).toHaveCount(0);
});

test("By domain tiles meet AA contrast, stay square, and reflow in both themes", async ({ page }) => {
  test.setTimeout(240000);
  const expected = { 1440: 4, 1280: 4, 1024: 2, 768: 2, 375: 1 };
  for (const [width, columns] of Object.entries(expected)) {
    await page.setViewportSize({ width: Number(width), height: 1000 });
    for (const theme of ["dark", "light"]) {
      await open(page, { theme });
      const tracks = await page.locator(".strength-board").evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").length);
      expect(tracks).toBe(columns);
      await expect
        .poll(() => page.locator(".strength-board-tiles").first().evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").length))
        .toBe(2);
      const tiles = await page.locator(".strength-tile").evaluateAll((nodes) =>
        nodes.map((node) => {
          const face = node.querySelector(".flip-card__face--front");
          const front = node.querySelector(".strength-tile-front");
          const style = getComputedStyle(face);
          return {
            background: style.backgroundColor,
            color: style.color,
            width: node.offsetWidth,
            height: node.offsetHeight,
            fits: front.scrollWidth <= front.clientWidth + 1 && front.scrollHeight <= front.clientHeight + 1,
            name: node.textContent,
          };
        }),
      );
      expect(tiles).toHaveLength(34);
      for (const facts of tiles) {
        expect(Math.abs(facts.width - facts.height), facts.name).toBeLessThanOrEqual(1);
        expect(facts.fits, facts.name).toBe(true);
        const ratio = contrast(await rgb(page, facts.background), await rgb(page, facts.color));
        expect(ratio, `${facts.name} ${theme}`).toBeGreaterThanOrEqual(4.5);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      // Grayed cards stay readable.
      await page.locator('.strength-helix [data-rank="1"]').hover();
      const grayed = await page.locator('.strength-cell[data-rank="2"] .flip-card__face--front').evaluate((node) => {
        const style = getComputedStyle(node);
        return [style.backgroundColor, style.color];
      });
      expect(contrast(await rgb(page, grayed[0]), await rgb(page, grayed[1])), `gray card ${theme}`).toBeGreaterThanOrEqual(4.5);
      await page.mouse.move(0, 0);
      // Every description stays readable once its card is open.
      for (const card of await page.locator(".strength-tile .flip-card").all()) {
        await card.focus();
        await page.keyboard.press("Enter");
        const clipped = await card.evaluate((node) => {
          const back = node.querySelector(".strength-card-back");
          const face = node.querySelector(".flip-card__face--back");
          return back.scrollHeight > face.clientHeight + 1 || back.scrollWidth > back.clientWidth + 1;
        });
        expect(clipped, await card.getAttribute("aria-label")).toBe(false);
        await page.keyboard.press("Enter");
      }
      await page.locator(".strength-helix").evaluate((node) => node.scrollIntoView({ block: "start", behavior: "instant" }));
      await page.screenshot({ path: `.impeccable/review/strengths-board-${width}-${theme}.png` });
    }
  }
});
