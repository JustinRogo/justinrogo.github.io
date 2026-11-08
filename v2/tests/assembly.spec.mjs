import { test, expect } from "./original-style.mjs";
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(
  await readFile(new URL("../../data/pages.json", import.meta.url), "utf8"),
);
const shots = new URL("../../.impeccable/review/", import.meta.url);
const shotPath = (name) =>
  new URL(name, shots).pathname.replace(/^\/(\w:)/, "$1");
const layer = (page) => page.locator(".assembly-layer");
const primary = (page) =>
  page.getByRole("navigation", { name: "Primary navigation", exact: true });

test.beforeEach(async ({ page }) => {
  await page.route("https://**/*", (route) => {
    if (!["GET", "HEAD"].includes(route.request().method()))
      throw new Error("External write attempted");
    return route.abort();
  });
  await page.addInitScript(() => {
    localStorage.setItem(
      "jr-v2-preferences",
      JSON.stringify({
        theme: "dark",
        calm: false,
        atmosphere: true,
        background: "orbits",
      }),
    );
    window.__assemblyArrivals = [];
    const observer = new MutationObserver((changes) => {
      for (const change of changes) {
        const cursor = change.target;
        const id = cursor.dataset?.target;
        if (!id) continue;
        let target = document.querySelector(`[data-assembly-id="${id}"]`);
        if (id.startsWith("featured-") && id !== "featured-heading")
          target = target?.closest(".magic-bento__cell");
        if (!target) continue;
        const c = cursor.getBoundingClientRect(),
          b = target.getBoundingClientRect();
        window.__assemblyArrivals.push({
          id,
          x: c.x,
          y: c.y,
          left: Math.max(8, b.left),
          top: Math.max(8, b.top),
          right: Math.min(innerWidth - 8, b.right),
          bottom: Math.min(innerHeight - 8, b.bottom),
        });
      }
    });
    observer.observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-target"],
    });
  });
});

test("desktop and phone assemble the original nodes at measured coordinates and restore every style", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Screenshots can take longer than the solo Layout phase on slower runners.
  // Control JS time so capture speed cannot change the choreography being checked.
  await page.clock.install();
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    // Freeze before navigation: otherwise asset loading can consume Layout's
    // brief phase before the screenshot sequence has taken control of time.
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 10000));
    await page.goto(`/v2/?replayIntro=1&capture=${width}#/home`);
    await expect(layer(page)).toHaveAttribute(
      "data-assembly-state",
      /preparing|assembling/,
    );
    await expect(
      page.locator(".selected-bento .magic-bento__card"),
    ).toHaveCount(4);
    // Record settled font geometry, as the cold-load intro now does.
    await page.evaluate(() => document.fonts.ready);
    await page.clock.runFor(100);
    await page.evaluate(() => {
      const nodes = [
        document.querySelector(".glass-hero"),
        document.querySelector("h1"),
        document.querySelector(".primary-nav"),
        ...document.querySelectorAll(".magic-bento__cell"),
      ];
      window.__originalAssemblyNodes = nodes;
      window.__originalAssemblyBoxes = nodes.map((node) => {
        return {
          x: node.offsetLeft,
          y: node.offsetTop,
          width: node.offsetWidth,
          height: node.offsetHeight,
        };
      });
    });
    await page.screenshot({ path: shotPath(`assembly-${width}-initial.png`) });
    await expect(page.locator(".ambient-blue")).toHaveCSS(
      "animation-play-state",
      "paused",
    );
    await page.clock.runFor(1250);
    await expect(layer(page)).toHaveAttribute("data-assembly-stage", "layout");
    expect(
      await page
        .locator(".agent-cursor")
        .evaluateAll((nodes) =>
          nodes
            .slice(1)
            .every((node) => getComputedStyle(node).opacity === "0"),
        ),
    ).toBe(true);
    await expect(page.locator(".glass-hero")).toHaveCSS("opacity", "0");
    expect(
      await page
        .locator(".assembly-wireframe")
        .evaluateAll(
          (nodes) =>
            nodes.filter((node) => Number(getComputedStyle(node).opacity) > 0)
              .length,
        ),
    ).toBeGreaterThanOrEqual(2);
    await page.screenshot({
      path: shotPath(`assembly-${width}-wireframe.png`),
    });
    await page.clock.runFor(1300);
    await expect(layer(page)).toHaveAttribute("data-assembly-stage", "content");
    await page.clock.runFor(1100);
    await expect(layer(page)).toHaveAttribute(
      "data-assembly-state",
      "assembling",
    );
    await page.screenshot({
      path: shotPath(`assembly-${width}-construction.png`),
    });
    await page.clock.runFor(3000);
    await expect(layer(page)).toHaveAttribute(
      "data-assembly-state",
      "complete",
      { timeout: 8000 },
    );
    await expect(page.getByRole("button", { name: "Skip intro" })).toHaveCount(
      0,
    );
    await expect(page.locator(".glass-hero")).toBeVisible();
    await page.screenshot({ path: shotPath(`assembly-${width}-complete.png`) });
    const result = await page.evaluate(() => {
      const finalNodes = [
        document.querySelector(".glass-hero"),
        document.querySelector("h1"),
        document.querySelector(".primary-nav"),
        ...document.querySelectorAll(".magic-bento__cell"),
      ];
      return {
        identity: finalNodes.every(
          (node, i) => node === window.__originalAssemblyNodes[i],
        ),
        shifts: finalNodes.map((node, i) => {
          const b = {
              x: node.offsetLeft,
              y: node.offsetTop,
              width: node.offsetWidth,
              height: node.offsetHeight,
            },
            old = window.__originalAssemblyBoxes[i];
          return Math.max(
            ...["x", "y", "width", "height"].map((key) =>
              Math.abs(b[key] - old[key]),
            ),
          );
        }),
        clean: [
          ...document.querySelectorAll("[data-assembly-id],.magic-bento__cell"),
        ].every(
          (node) =>
            !node.style.opacity &&
            !node.style.transform &&
            !node.style.clipPath,
        ),
        arrivals: window.__assemblyArrivals,
        overlayHidden:
          getComputedStyle(document.querySelector(".assembly-layer"))
            .visibility === "hidden",
        wiresHidden: [
          ...document.querySelectorAll(".assembly-wireframe"),
        ].every((node) => getComputedStyle(node).opacity === "0"),
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
      };
    });
    expect(result.identity).toBe(true);
    expect(result.clean).toBe(true);
    expect(result.overlayHidden).toBe(true);
    expect(result.wiresHidden).toBe(true);
    expect(result.overflow).toBe(false);
    expect(Math.max(...result.shifts)).toBeLessThan(2);
    expect(result.arrivals.some((arrival) => arrival.id === "navigation")).toBe(
      true,
    );
    expect(result.arrivals.some((arrival) => arrival.id === "hero-title")).toBe(
      true,
    );
    for (const arrival of result.arrivals) {
      expect(arrival.x, arrival.id).toBeGreaterThanOrEqual(arrival.left - 30);
      expect(arrival.x, arrival.id).toBeLessThanOrEqual(arrival.right + 30);
      expect(arrival.y, arrival.id).toBeGreaterThanOrEqual(arrival.top - 30);
      expect(arrival.y, arrival.id).toBeLessThanOrEqual(arrival.bottom + 30);
    }
    await page.clock.resume();
    await primary(page)
      .getByRole("link", { name: "About", exact: true })
      .click();
    await expect(page).toHaveURL(/#\/about$/);
  }
  expect(errors).toEqual([]);
});

test("cleanup restores content when equal-time tweens revert in creation order", async ({ page }) => {
  await page.addInitScript(() => {
    const sort = Array.prototype.sort;
    Array.prototype.sort = function (compare) {
      // GSAP's equal-time comparator returns a negative value in both directions.
      // Firefox can keep those tweens in creation order, unlike Chromium.
      if (!this.length || !this.every((entry) =>
        typeof entry?.g === "number" && typeof entry?.t?.revert === "function"
      )) return sort.call(this, compare);
      const order = new Map(this.map((entry, index) => [entry, index]));
      return sort.call(this, (a, b) =>
        a.g === b.g ? order.get(a) - order.get(b) : compare(a, b)
      );
    };
  });
  await page.goto("/v2/");
  await expect(layer(page)).toHaveAttribute("data-assembly-state", "assembling");
  await expect(layer(page)).toHaveAttribute("data-assembly-state", "complete", { timeout: 10000 });
  const hidden = await page.locator("[data-assembly-id],.magic-bento__cell")
    .evaluateAll((nodes) => nodes.filter((node) => getComputedStyle(node).opacity === "0")
      .map((node) => node.dataset.assemblyId || node.className));
  expect(hidden).toEqual([]);
  expect(await page.locator("[data-assembly-id],.magic-bento__cell")
    .evaluateAll((nodes) => nodes.every((node) =>
      !node.style.opacity && !node.style.transform && !node.style.clipPath
    ))).toBe(true);
  await expect(page.locator(".glass-hero")).toHaveCSS("opacity", "1");
  await expect(page.locator(".hero-actions")).toHaveCSS("opacity", "1");
});

test("navigation remains clickable during preparation, wireframing, and crew assembly", async ({
  page,
}) => {
  for (const delay of [0, 500, 2300]) {
    await page.goto(`/v2/?replayIntro=1&navigation=${delay}#/home`);
    if (delay) await page.waitForTimeout(delay);
    await primary(page)
      .getByRole("link", { name: "Projects", exact: true })
      .click();
    await expect(page).toHaveURL(/#\/projects$/);
    await expect(
      page.getByRole("heading", { name: /^Projects & Pages/ }),
    ).toBeFocused();
  }
});

test("page-load autoplay, forced replay, repeated replay, resize and keyboard interruption work", async ({
  page,
}) => {
  await page.goto("/v2/#/home");
  await expect(layer(page)).toHaveAttribute(
    "data-assembly-state",
    /preparing|assembling/,
  );
  await page.keyboard.press("Tab");
  await expect(layer(page)).toHaveAttribute("data-assembly-state", "complete", {
    timeout: 8000,
  });
  await expect(page.locator(".ambient-blue")).toHaveCSS(
    "animation-play-state",
    "running",
  );
  await primary(page)
    .getByRole("link", { name: "Projects", exact: true })
    .click();
  await primary(page).getByRole("link", { name: "Home", exact: true }).click();
  await expect(layer(page)).toHaveAttribute("data-assembly-state", "complete");
  await page.reload();
  await expect(layer(page)).toHaveAttribute("data-assembly-state", "complete");
  await page.getByRole("button", { name: "Replay animation" }).click();
  await expect(layer(page)).toHaveAttribute(
    "data-assembly-state",
    /preparing|assembling/,
  );
  await page.setViewportSize({ width: 430, height: 900 });
  await expect(layer(page)).toHaveAttribute("data-assembly-state", "complete");
  await expect(page.locator(".hero-actions a").first()).toBeVisible();
  await page.getByRole("button", { name: "Replay animation" }).click();
  await expect(layer(page)).toHaveAttribute(
    "data-assembly-state",
    /preparing|assembling/,
  );
  await primary(page)
    .getByRole("link", { name: "Projects", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/projects$/);
  await primary(page).getByRole("link", { name: "Home", exact: true }).click();
  await expect(layer(page)).toHaveAttribute("data-assembly-state", "complete");
  await page.goto("/v2/?replayIntro=1#/home");
  await expect(layer(page)).toHaveAttribute(
    "data-assembly-state",
    /preparing|assembling/,
  );
  await page.keyboard.press("Escape");
  await expect(layer(page)).toHaveAttribute("data-assembly-state", "complete");
});

for (const width of [1440, 375]) {
  test(`the intro autoplays on a first visit, not for returning visitors, at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/v2/");
    await expect(layer(page)).toHaveAttribute("data-assembly-state", "assembling");
    await page.waitForTimeout(1000);
    await expect(layer(page)).toHaveAttribute("data-assembly-state", "assembling");
    await expect(page.locator(".agent-cursor").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(layer(page)).toHaveAttribute("data-assembly-state", "complete");
    for (const visit of [() => page.reload(), () => page.goto("/v2/?returning=1#/home")]) {
      await visit();
      await expect(layer(page)).toHaveAttribute("data-assembly-state", "complete");
      await expect(page.getByRole("button", { name: "Skip intro" })).toHaveCount(0);
      await expect(page.locator(".glass-hero")).toHaveCSS("opacity", "1");
      await expect(page.locator(".hero-actions a").first()).toHaveCSS("opacity", "1");
    }
    await page.getByRole("button", { name: "Replay animation" }).click();
    await expect(layer(page)).toHaveAttribute("data-assembly-state", /preparing|assembling/);
    await page.keyboard.press("Escape");
    await page.goto("/v2/?replayIntro=1#/home");
    await expect(layer(page)).toHaveAttribute("data-assembly-state", /preparing|assembling/);
  });
}

test("a font that finishes loading after the intro starts does not end it", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/v2/");
  await expect(layer(page)).toHaveAttribute("data-assembly-state", "assembling");
  // A late face that changes no measured geometry used to cancel the whole intro.
  await page.evaluate(() => document.fonts.dispatchEvent(new Event("loadingdone")));
  await page.waitForTimeout(500);
  await expect(layer(page)).toHaveAttribute("data-assembly-state", "assembling");
  await expect(layer(page)).toHaveAttribute("data-assembly-state", "complete", { timeout: 8000 });
});

test("blocked storage falls back to one intro per page load", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    for (const method of ["getItem", "setItem"]) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (key, ...rest) {
        if (key === "jr-v2-assembly-seen") throw new DOMException("Blocked", "SecurityError");
        return original.call(this, key, ...rest);
      };
    }
  });
  for (let load = 0; load < 2; load++) {
    await (load ? page.reload() : page.goto("/v2/"));
    await expect(layer(page)).toHaveAttribute("data-assembly-state", /preparing|assembling/);
    await page.keyboard.press("Escape");
    await expect(layer(page)).toHaveAttribute("data-assembly-state", "complete");
  }
  expect(errors).toEqual([]);
});

test("the first Home visit from a deep link tolerates router focus and preserves navigation", async ({
  page,
}) => {
  await page.goto("/v2/#/projects");
  await expect(layer(page)).toHaveAttribute("data-assembly-state", "skipped");
  await primary(page).getByRole("link", { name: "Home", exact: true }).click();
  await expect(layer(page)).toHaveAttribute(
    "data-assembly-state",
    /preparing|assembling/,
  );
  await expect(
    page.getByRole("heading", { name: "Justin Rogowski", exact: true }),
  ).toBeFocused();
  await expect(layer(page)).toHaveAttribute("data-assembly-state", "complete", {
    timeout: 8000,
  });
  await primary(page)
    .getByRole("link", { name: "Projects", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/projects$/);
});

test("motion preferences, disabling the intro, and changing reduced motion always show the real page", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/v2/?replayIntro=1");
  await expect(layer(page)).toHaveAttribute("data-assembly-state", "skipped");
  await expect(
    page.getByRole("heading", { name: "Justin Rogowski", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Replay animation" }),
  ).toBeDisabled();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(layer(page)).toHaveAttribute(
    "data-assembly-state",
    /preparing|assembling/,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(layer(page)).toHaveAttribute("data-assembly-state", "skipped");
  await expect(page.locator(".hero-actions a").first()).toHaveCSS(
    "opacity",
    "1",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/v2/?intro=0&replayIntro=1");
  await expect(layer(page)).toHaveAttribute("data-assembly-state", "skipped");
  await expect(
    page.getByRole("button", { name: "Replay animation" }),
  ).toBeDisabled();
  await page.goto("/v2/#/home");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Appearance and motion settings" })
    .click();
  await page.getByRole("switch", { name: /^Homepage assembly/ }).uncheck();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Replay animation" }),
  ).toBeDisabled();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Appearance and motion settings" })
    .click();
  await page.getByRole("switch", { name: /^Homepage assembly/ }).check();
  await page.getByRole("switch", { name: /^Calm mode/ }).check();
  await page.keyboard.press("Escape");
  await expect(layer(page)).toHaveAttribute("data-assembly-state", "skipped");
  await expect(page.locator(".hero-description")).toHaveCSS("opacity", "1");
});

test("late project data remains live and scroll interruption cannot strand hidden components", async ({
  page,
}) => {
  await page.route("**/data/pages.json", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1900));
    await route.fulfill({ json: manifest });
  });
  await page.goto("/v2/?replayIntro=1");
  await expect(layer(page)).toHaveAttribute(
    "data-assembly-state",
    /preparing|assembling/,
  );
  await expect(page.locator(".selected-bento .magic-bento__card")).toHaveCount(
    4,
  );
  await expect(layer(page)).toHaveAttribute("data-assembly-state", "complete");
  await expect(page.locator(".magic-bento__cell").first()).toHaveCSS(
    "opacity",
    "1",
  );
  await page.getByRole("button", { name: "Replay animation" }).click();
  await expect(layer(page)).toHaveAttribute(
    "data-assembly-state",
    /preparing|assembling/,
  );
  await page.mouse.wheel(0, 350);
  await expect(layer(page)).toHaveAttribute("data-assembly-state", "complete");
  expect(
    await page
      .locator("[data-assembly-id],.magic-bento__cell")
      .evaluateAll((nodes) =>
        nodes.every(
          (el) =>
            !el.style.opacity && !el.style.clipPath && !el.style.transform,
        ),
      ),
  ).toBe(true);
});

test("direct Home autoplay waits for cold-load fonts and reaches the crew stage", async ({ page }) => {
  const { promise: fontReady, resolve: releaseFont } = Promise.withResolvers();
  await page.route("**/*.woff2", async (route) => {
    await fontReady;
    await route.continue();
  });
  try {
    await page.goto("/v2/#/home", { waitUntil: "domcontentloaded" });
    await expect(layer(page)).toHaveAttribute("data-assembly-state", "preparing");
    await page.evaluate(() => {
      window.visualViewport?.dispatchEvent(new Event("resize"));
      document.dispatchEvent(new Event("visibilitychange"));
      document.querySelector("#main").focus({ preventScroll: true });
    });
    await page.setViewportSize({ width: 768, height: 900 });
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(layer(page)).toHaveAttribute("data-assembly-state", "skipped");
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(layer(page)).toHaveAttribute("data-assembly-state", "preparing");
    // Hold the font past the old 1.2-second limit, which started the intro too early.
    await page.waitForTimeout(1500);
    expect(await layer(page).getAttribute("data-assembly-state")).toBe("preparing");
  } finally {
    releaseFont();
  }
  await page.evaluate(() => document.fonts.ready);
  await expect(layer(page)).toHaveAttribute("data-assembly-state", "assembling");
  await expect(layer(page)).toHaveAttribute("data-assembly-stage", "content");
  await expect(layer(page)).toHaveAttribute("data-assembly-state", "assembling");
  await expect(layer(page)).toHaveAttribute("data-assembly-state", "complete", { timeout: 8000 });
});
