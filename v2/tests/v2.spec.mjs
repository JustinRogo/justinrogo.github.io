import { test, expect } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resources } from "../src/content.js";
const manifest = JSON.parse(
  await readFile(new URL("../../data/pages.json", import.meta.url), "utf8"),
);
const root = new URL("../../", import.meta.url);
const nav = (page) =>
  page.getByRole("navigation", { name: "Primary navigation", exact: true });
const visibleView = (page) => page.locator("[data-view]:not([hidden])");
const screenshots = new URL("../../.impeccable/review/", import.meta.url);

test.beforeEach(async ({ page }) => {
  // Test-only fixtures. No external writes, bookings, or real form submissions.
  await page.route("https://**/*", async (route) => {
    if (!["GET", "HEAD"].includes(route.request().method()))
      throw new Error("External write attempted");
    const url = route.request().url();
    if (url.includes("api.open-meteo.com"))
      return route.fulfill({
        json: {
          current: {
            temperature_2m: 58,
            apparent_temperature: 56,
            weather_code: 2,
            time: "2026-11-01T12:00",
          },
        },
      });
    if (url.includes("api.github.com")) return route.fulfill({ json: [] });
    if (url.includes("events.uconn.edu"))
      return route.fulfill({
        contentType: "application/xml",
        body: "<rss><channel></channel></rss>",
      });
    return route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>External service test fixture</title><p>External service test fixture.</p>",
    });
  });
});

test("all manifest destinations survive, with filtering, direct title links and saved projects", async ({
  page,
}) => {
  await page.goto("/v2/#/projects");
  await expect(page.locator(".project-row")).toHaveCount(manifest.pages.length);
  for (const item of manifest.pages) {
    await expect(
      page.getByRole("link", { name: `Open ${item.title}`, exact: true }),
    ).toHaveAttribute(
      "href",
      item.href ||
        `../${item.path.split("/").map(encodeURIComponent).join("/")}`,
    );
  }
  await page
    .getByRole("group", { name: "Project categories" })
    .getByRole("button", { name: /^For Fun/ })
    .click();
  await expect(page.locator(".project-row")).toHaveCount(6);
  await page.getByRole("searchbox", { name: "Search projects" }).fill("wave");
  await expect(page.locator(".project-row")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Save Wave Function Collapse", exact: true })
    .click();
  await expect(page.locator(".project-description")).toHaveAttribute(
    "href",
    "../Pages/For%20Fun/Wave-Function-Collapse.html",
  );
  await expect(page.locator(".project-description")).toHaveAttribute(
    "target",
    "_blank",
  );
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Unsave Wave Function Collapse",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("searchbox", { name: "Search projects" })
    .fill("not a real project");
  await expect(
    page.getByRole("heading", { name: "No projects found." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Browse all projects" }).click();
  await expect(page.locator(".project-row")).toHaveCount(manifest.pages.length);
});

test("browser history, direct routes, navigation focus and refreshes work", async ({
  page,
}) => {
  await page.goto("/v2/");
  await nav(page).getByRole("link", { name: "Projects", exact: true }).click();
  await expect(
    visibleView(page).getByRole("heading", { level: 1 }),
  ).toBeFocused();
  await nav(page).getByRole("link", { name: "About", exact: true }).click();
  await page.goBack();
  await expect(
    nav(page).getByRole("link", { name: "Projects", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.goForward();
  await expect(
    nav(page).getByRole("link", { name: "About", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.goto("/v2/#/tools?panel=booking");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Let’s find a time." }),
  ).toBeVisible();
  await page.goto("/v2/#/unknown");
  await expect(
    page.getByRole("heading", { name: "A little off the map." }),
  ).toBeVisible();
});

test("catalog builds all five original search destinations without writing data", async ({
  page,
  context,
}) => {
  await page.goto("/v2/#/tools");
  for (const [type, scope] of [
    ["Books & more", "MyInst_and_CI"],
    ["Journals", "EJOURNALS"],
    ["Databases", "DATABASES"],
    ["Course reserves", "CourseReserves"],
    ["Research guides", null],
  ]) {
    await page.getByLabel("Search in").selectOption(type);
    await page
      .getByRole("searchbox", { name: "Library search query" })
      .fill("law, policy & history");
    const opened = context.waitForEvent("page");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    const popup = await opened;
    await popup.waitForURL(
      /(?:primo\.exlibrisgroup\.com|libguides\.law\.uconn\.edu)/,
    );
    const url = new URL(popup.url());
    if (scope) {
      expect(url.searchParams.get("search_scope")).toBe(scope);
      expect(url.searchParams.get("vid")).toBe("01UCT_LAW:01UCT_LAW");
      expect(url.searchParams.get("query")).toBe(
        "any,contains,law  policy & history",
      );
    } else expect(url.searchParams.get("q")).toBe("law, policy & history");
    await popup.close();
  }
});

test("request preview cannot submit externally and keeps its draft across views", async ({
  page,
}) => {
  const writes = [];
  page.on("request", (req) => {
    if (req.method() !== "GET") writes.push(req.url());
  });
  await page.goto("/v2/#/tools?panel=request");
  await page.getByLabel("Your name").fill("Prototype test");
  await page.getByLabel("Email", { exact: true }).fill("test@example.com");
  await page.getByLabel("Subject", { exact: true }).fill("A test draft");
  await page.getByLabel("What are you thinking?").fill("Local preview only.");
  await page.getByRole("button", { name: "Preview request" }).click();
  await expect(page.getByRole("dialog")).toContainText("Nothing has been sent");
  await page.keyboard.press("Escape");
  await nav(page).getByRole("link", { name: "Home", exact: true }).click();
  await nav(page).getByRole("link", { name: "Tools", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Tools", exact: true })
    .getByRole("link", { name: "Request", exact: true })
    .click();
  await expect(page.getByLabel("Subject", { exact: true })).toHaveValue(
    "A test draft",
  );
  expect(writes).toEqual([]);
});

test("settings support keyboard dismissal, focus return, persistence and system reduced motion", async ({
  page,
}) => {
  await page.goto("/v2/");
  const trigger = page
    .locator(".topbar")
    .getByRole("button", { name: "Appearance and motion settings" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: "Dark", exact: true }).check();
  await dialog.getByRole("switch", { name: /^Calm mode/ }).check();
  await expect(page.locator("html")).toHaveAttribute("data-calm", "true");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-calm", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await trigger.click();
  await dialog.getByRole("switch", { name: /^Calm mode/ }).uncheck();
  await expect(page.locator("html")).toHaveAttribute("data-calm", "true");
  await expect(dialog).toContainText(
    "Your device’s reduced-motion setting is active",
  );
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  }
});

test("request previews dismiss on browser history and restore focus and scrolling", async ({
  page,
}) => {
  await page.goto("/v2/#/tools");
  await page
    .getByRole("navigation", { name: "Tools", exact: true })
    .getByRole("link", { name: "Request", exact: true })
    .click();
  await page.getByLabel("Your name").fill("History test");
  await page.getByLabel("Email", { exact: true }).fill("test@example.com");
  await page.getByLabel("Subject", { exact: true }).fill("Local draft");
  await page.getByLabel("What are you thinking?").fill("Never send this.");
  await page.getByRole("button", { name: "Preview request" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "A good place to start looking." }),
  ).toBeFocused();
  expect(
    await page.locator("body").evaluate((el) => el.style.overflow),
  ).not.toBe("hidden");
  await page.goForward();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Preview request" }).click();
  await page.evaluate(() => {
    location.hash = "#/about";
  });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    visibleView(page).getByRole("heading", { level: 1 }),
  ).toBeFocused();
  expect(
    await page.locator("body").evaluate((el) => el.style.overflow),
  ).not.toBe("hidden");
});

test("small text contrast and system contrast preferences meet the accessibility floor", async ({
  page,
}) => {
  async function contrast(text, background) {
    return page.evaluate(
      ([textSelector, bgSelector]) => {
        const ctx = document.createElement("canvas").getContext("2d");
        const luminance = (color) => {
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 1, 1);
          const channels = [...ctx.getImageData(0, 0, 1, 1).data]
            .slice(0, 3)
            .map((c) => {
              const v = c / 255;
              return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
            });
          return (
            channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
          );
        };
        const a = luminance(
          getComputedStyle(document.querySelector(textSelector)).color,
        );
        const b = luminance(
          getComputedStyle(document.querySelector(bgSelector)).backgroundColor,
        );
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      },
      [text, background],
    );
  }
  await page.goto("/v2/#/tools");
  await page.evaluate(() =>
    localStorage.setItem(
      "jr-v2-preferences",
      JSON.stringify({ theme: "light", calm: false, atmosphere: true }),
    ),
  );
  await page.reload();
  expect(
    await contrast(".tool-nav a:not([aria-current])", ".tool-nav"),
  ).toBeGreaterThanOrEqual(4.5);
  await nav(page).getByRole("link", { name: "About", exact: true }).click();
  expect(
    await contrast(
      ".strength-executing .strength-rank",
      ".strength-executing .strength-rank",
    ),
  ).toBeGreaterThanOrEqual(4.5);
  await page.emulateMedia({ contrast: "more" });
  await expect(page.locator("html")).toHaveAttribute("data-calm", "true");
  await page.emulateMedia({
    contrast: "no-preference",
    forcedColors: "active",
  });
  await expect(page.locator("html")).toHaveAttribute("data-calm", "true");
  await page.emulateMedia({
    forcedColors: "none",
    reducedMotion: "no-preference",
  });
  await expect(page.locator("html")).toHaveAttribute("data-calm", "false");
});

test("all 34 existing strengths are available and disclosures work by keyboard", async ({
  page,
}) => {
  await page.goto("/v2/#/about");
  await expect(page.locator(".strength")).toHaveCount(5);
  await page.getByRole("button", { name: "All 34", exact: true }).click();
  await expect(page.locator(".strength")).toHaveCount(34);
  await page.locator(".strength summary").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".strength").first()).toHaveAttribute("open", "");
});

test("the requested React Bits render, react to pointers, and stop in Calm mode", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/v2/");
  await page.evaluate(() =>
    localStorage.setItem(
      "jr-v2-preferences",
      JSON.stringify({ theme: "dark", calm: false, atmosphere: true }),
    ),
  );
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".tech-text-canvas")).toHaveCount(2);
  await expect(
    page.getByRole("heading", { level: 1, name: "Justin Rogowski" }),
  ).toBeVisible();
  await expect(page.locator(".glass-hero .glass-surface")).toBeVisible();
  const filterIds = await page
    .locator(".glass-surface__filter filter")
    .evaluateAll((nodes) => nodes.map((node) => node.id));
  expect(new Set(filterIds).size).toBe(filterIds.length);
  const canvas = page.locator(".tech-text-canvas").first();
  await expect
    .poll(() =>
      canvas.evaluate((el) => {
        const pixels = el
          .getContext("2d")
          .getImageData(0, 0, el.width, el.height).data;
        let count = 0;
        for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) count++;
        return count;
      }),
    )
    .toBeGreaterThan(500);
  const before = await canvas.evaluate((el) => el.toDataURL());
  await canvas.hover({ position: { x: 160, y: 50 } });
  await expect
    .poll(() => canvas.evaluate((el) => el.toDataURL()))
    .not.toBe(before);
  const card = page.locator(".magic-bento__card").first();
  await expect(page.locator(".magic-bento")).toHaveAttribute("data-motion", "");
  await card.hover({ position: { x: 40, y: 30 } });
  await expect
    .poll(() =>
      card.evaluate(
        (el) => parseFloat(el.style.getPropertyValue("--mb-near")) || 0,
      ),
    )
    .toBeGreaterThan(0.2);
  await page
    .locator(".topbar")
    .getByRole("button", { name: "Appearance and motion settings" })
    .click();
  await page.getByRole("switch", { name: /^Calm mode/ }).check();
  await page.keyboard.press("Escape");
  await expect(page.locator(".tech-text-canvas")).toHaveCount(0);
  await expect(page.locator(".magic-bento")).not.toHaveAttribute("data-motion");
  await expect(page.locator(".page-background")).toHaveAttribute(
    "data-motion",
    "still",
  );
});

test("branched shortcuts use normal links and collapsed groups leave keyboard order", async ({
  page,
}) => {
  await page.goto("/v2/");
  const shortcuts = page.getByRole("navigation", { name: "Explore shortcuts" });
  const tools = shortcuts.getByRole("button", {
    name: "Useful shortcuts",
    exact: true,
  });
  await expect(tools).toHaveAttribute("aria-expanded", "false");
  await expect(
    shortcuts.getByRole("link", { name: "Book a meeting", exact: true }),
  ).toHaveCount(0);
  await tools.focus();
  await page.keyboard.press("Enter");
  await expect(tools).toHaveAttribute("aria-expanded", "true");
  const booking = shortcuts.getByRole("link", {
    name: "Book a meeting",
    exact: true,
  });
  await expect(booking).toHaveAttribute("href", "#/tools?panel=booking");
  await booking.click();
  await expect(
    page.getByRole("heading", { name: "Let’s find a time." }),
  ).toBeVisible();
  await page.goBack();
  await expect(shortcuts).toBeVisible();
  await shortcuts
    .getByRole("button", { name: "Quick links", exact: true })
    .click();
  for (const [label, href] of resources) {
    const link = shortcuts.getByRole("link", { name: label, exact: true });
    await expect(link).toHaveAttribute("href", href);
    await expect(link).toHaveAttribute("target", "_blank");
  }
  await shortcuts
    .getByRole("link", { name: "Library projects", exact: true })
    .click();
  await expect(page.locator(".project-row")).toHaveCount(3);
});

test("source failures have recovery actions and retain access to the original site", async ({
  page,
}) => {
  await page.route("**/data/pages.json", (r) =>
    r.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("/v2/#/projects");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await page.unroute("**/data/pages.json");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator(".project-row")).toHaveCount(manifest.pages.length);
});

test("original Work, UCPEA and For Fun collections expose every page on desktop and phone", async ({
  page,
}) => {
  const collections = [
    [
      "Work",
      manifest.pages.filter(
        (p) =>
          !p.path.startsWith("Pages/For Fun/") &&
          !p.path.startsWith("Pages/Work/UCPEA/"),
      ),
      5,
    ],
    [
      "UCPEA",
      manifest.pages.filter((p) => p.path.startsWith("Pages/Work/UCPEA/")),
      4,
    ],
    [
      "For Fun",
      manifest.pages.filter((p) => p.path.startsWith("Pages/For Fun/")),
      6,
    ],
  ];
  for (const width of [1024, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/v2/#/home");
    await expect(
      page.locator(".selected-bento .magic-bento__card"),
    ).toHaveCount(4);
    if (width < 800)
      await nav(page).getByRole("link", { name: "More", exact: true }).click();
    const menu = page
      .locator(width < 800 ? ".mobile-branches" : ".sidebar-branches")
      .getByRole("navigation", { name: "Explore shortcuts" });
    for (const [name, pages, count] of collections) {
      const toggle = menu.getByRole("button", { name, exact: true });
      const section = menu.locator(".branched-menu__section").filter({
        has: page.getByRole("button", { name, exact: true }),
      });
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await expect(section.getByRole("link")).toHaveCount(0);
      await toggle.focus();
      await page.keyboard.press("Enter");
      await expect(section.getByRole("link")).toHaveCount(count);
      if (name === "UCPEA") {
        await expect(section.getByRole("link").first()).toHaveText(
          "UCPEA Member Dashboard",
        );
        const contracts = section.getByRole("list", {
          name: "UCPEA Member Dashboard pages",
          exact: true,
        });
        await expect(contracts.getByRole("link")).toHaveText([
          "Current Contract",
          "Contract History",
          "Contract Comparison",
        ]);
        await section.getByRole("link").first().focus();
        for (const label of [
          "Current Contract",
          "Contract History",
          "Contract Comparison",
        ]) {
          await page.keyboard.press("Tab");
          await expect(
            contracts.getByRole("link", { name: label, exact: true }),
          ).toBeFocused();
        }
      }
      for (const item of pages) {
        const contractLabel =
          name === "UCPEA"
            ? {
                "UCPEAContract.html": "Current Contract",
                "UCPEA_Contract_History.html": "Contract History",
                "UCPEA_Contract_Comparison.html": "Contract Comparison",
              }[item.path.split("/").pop()]
            : undefined;
        const link = section.getByRole("link", {
          name: contractLabel || item.title,
          exact: true,
        });
        await expect(link).toHaveAttribute(
          "href",
          item.href ||
            `../${item.path.split("/").map(encodeURIComponent).join("/")}`,
        );
        await expect(link).toHaveAttribute("target", "_blank");
        expect(
          await link.evaluate(
            (el) =>
              el.querySelector(".branched-menu__label").getBoundingClientRect()
                .height <= el.getBoundingClientRect().height,
          ),
        ).toBe(true);
      }
      await toggle.press("Enter");
      await expect(section.getByRole("link")).toHaveCount(0);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
});

test("phone touch destinations remain fixed and content clears the dock", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.route("https://**/*", (route) => route.abort());
  await page.goto("http://127.0.0.1:4392/v2/");
  for (const label of ["Projects", "Tools", "About", "More", "Home"]) {
    const link = nav(page).getByRole("link", { name: label, exact: true });
    await link.tap();
    await expect(link).toHaveAttribute("aria-current", "page");
    const box = await link.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.y + box.height).toBeLessThanOrEqual(812);
  }
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  const footer = await page.locator(".app-footer").boundingBox();
  const dock = await nav(page).boundingBox();
  expect(footer.y + footer.height).toBeLessThanOrEqual(dock.y + 1);
  await context.close();
});

test("V1 core files remain byte-identical to the base branch", async () => {
  for (const name of [
    "index.html",
    "main.js",
    "style.css",
    "data/pages.json",
    "src/homepage/WidgetTabs.jsx",
  ]) {
    const current = await readFile(new URL(name, root));
    const original = execFileSync("git", ["show", `main:${name}`], {
      cwd: root,
      maxBuffer: 4 * 1024 * 1024,
    });
    const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
    // Git's CRLF checkout normalization is not a source change.
    expect(hash(Buffer.from(current.toString().replace(/\r\n/g, "\n")))).toBe(
      hash(original),
    );
  }
});

test("responsive visual and overflow review across five sizes, both themes and every view", async ({
  page,
}) => {
  test.setTimeout(180000);
  await mkdir(screenshots, { recursive: true });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [375, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 600 ? 900 : 1000 });
    for (const theme of ["light", "dark"]) {
      await page.goto("/v2/");
      await page.evaluate(
        (theme) =>
          localStorage.setItem(
            "jr-v2-preferences",
            JSON.stringify({ theme, calm: true, atmosphere: true }),
          ),
        theme,
      );
      await page.reload();
      await page.evaluate(() => document.fonts.ready);
      const views =
        width === 375 || width === 1440
          ? ["home", "projects", "tools", "about", "more"]
          : ["home"];
      for (const view of views) {
        if (view !== "home")
          await nav(page)
            .getByRole("link", {
              name: view[0].toUpperCase() + view.slice(1),
              exact: true,
            })
            .click();
        await expect(
          visibleView(page).getByRole("heading", { level: 1 }),
        ).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await page.evaluate(() => document.fonts.ready);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        ).toBe(true);
        await page.screenshot({
          path: new URL(
            `${width}-${theme}-${view}.png`,
            screenshots,
          ).pathname.replace(/^\/(\w:)/, "$1"),
          fullPage: true,
          animations: "disabled",
        });
      }
    }
  }
  expect(errors).toEqual([]);
});
