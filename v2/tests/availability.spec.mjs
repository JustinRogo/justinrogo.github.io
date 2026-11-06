import { expect, test } from "@playwright/test";
import { parseOutlookAvailability } from "../../scripts/update-outlook-availability.mjs";

const snapshot = parseOutlookAvailability(`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Availability//EN
BEGIN:VEVENT
UID:weekly
DTSTAMP:20261105T000000Z
DTSTART;TZID=Eastern Standard Time:20261029T090000
DTEND;TZID=Eastern Standard Time:20261029T103000
RRULE:FREQ=WEEKLY;COUNT=4
EXDATE;TZID=Eastern Standard Time:20261112T090000
X-MICROSOFT-CDO-BUSYSTATUS:BUSY
SUMMARY:Private meeting title
DESCRIPTION:Private meeting details
END:VEVENT
BEGIN:VEVENT
UID:away
DTSTAMP:20261105T000000Z
DTSTART;VALUE=DATE:20261106
DTEND;VALUE=DATE:20261108
X-MICROSOFT-CDO-BUSYSTATUS:OOF
END:VEVENT
END:VCALENDAR`, new Date("2026-11-05T15:00:00Z"));

test("Outlook import retains availability only and handles recurrence, DST and all-day ranges", () => {
  expect(snapshot.days["2026-10-29"]).toEqual([
    { label: "Busy", start: "2026-10-29T13:00:00.000Z", end: "2026-10-29T14:30:00.000Z" },
  ]);
  expect(snapshot.days["2026-11-05"]).toEqual([
    { label: "Busy", start: "2026-11-05T14:00:00.000Z", end: "2026-11-05T15:30:00.000Z" },
  ]);
  expect(snapshot.days["2026-11-12"]).toBeUndefined();
  for (const day of ["2026-11-06", "2026-11-07"]) {
    expect(snapshot.days[day]).toEqual([{ label: "Out of Office", start: null, end: null }]);
  }
  expect(snapshot.days["2026-11-08"]).toBeUndefined();
  expect(JSON.stringify(snapshot)).not.toContain("Private");
});

test("Tools displays the native calendar, keeps the donation link and moves old quick links to More", async ({ page }) => {
  await page.route("https://**/*", (route) => route.abort());
  const busyDay = [
    ...snapshot.days["2026-11-05"],
    { label: "Busy", start: "2026-11-05T16:00:00Z", end: "2026-11-05T17:00:00Z" },
    { label: "Tentative", start: "2026-11-05T19:00:00Z", end: "2026-11-05T20:00:00Z" },
    { label: "Busy", start: "2026-11-05T21:30:00Z", end: "2026-11-05T22:00:00Z" },
  ];
  await page.route("**/data/outlook-availability.json", (route) => route.fulfill({
    json: { ...snapshot, days: { ...snapshot.days, "2026-11-05": busyDay } },
  }));
  await page.clock.setFixedTime(new Date("2026-11-05T15:00:00Z"));
  await page.setViewportSize({ width: 1247, height: 1244 });
  await page.goto("/#/tools?panel=calendar");
  await expect(page.getByRole("heading", { name: "My Calendar" })).toBeVisible();
  await expect(page.getByRole("link", { name: "View in Outlook" })).toBeVisible();
  await expect(page.getByText("Published Outlook availability, in Eastern Time.")).toHaveCount(0);
  const month = page.getByRole("table", { name: "November 2026 availability" });
  const thursday = month.getByRole("button", { name: /Thursday, November 5, 2026/ });
  const agenda = month.locator(".calendar-agenda");
  await expect(thursday.getByText("9:00 AM – 10:30 AM")).toBeVisible();
  await expect(thursday.getByText("+1 more")).toBeVisible();
  await expect(agenda).toHaveCount(0);
  await thursday.click();
  await expect(agenda.getByText("4:30 PM – 5:00 PM")).toBeVisible();
  await thursday.click();
  await expect(agenda).toHaveCount(0);

  await page.setViewportSize({ width: 320, height: 900 });
  await expect(thursday.getByText("9:00 AM – 10:30 AM")).toBeHidden();
  await thursday.click();
  await expect(agenda).toContainText("9:00 AM – 10:30 AM");
  await page.getByRole("button", { name: /Friday, November 6, 2026/ }).click();
  await expect(agenda).toContainText("All day");
  await expect(agenda.getByText("Out of Office")).toBeVisible();
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.getByRole("table", { name: "December 2026 availability" })).toBeVisible();
  await expect(page.locator(".calendar-agenda")).toHaveCount(0);
  await expect(page.locator("iframe")).toHaveCount(0);
  const donation = page.getByRole("link", { name: "Donate to the Law Library" });
  await expect(donation).toBeVisible();
  await expect(donation).toHaveAttribute("href", /giving\.uconn\.edu.*LawLibraryEndowmentFund/);
  await expect(page.locator(".tool-nav").getByRole("link", { name: "Quick links" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await page.goto("/#/tools?panel=resources");
  await expect(page.getByRole("heading", { name: /A little more to explore/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Quick links", exact: true })).toBeVisible();

  await page.setViewportSize({ width: 801, height: 900 });
  await page.goto("/?intro=0#/home");
  const topbar = page.locator(".topbar");
  const rim = await topbar.boundingBox();
  const donateButton = await donation.boundingBox();
  const weather = await topbar.locator(".local-time").boundingBox();
  const themeButton = await topbar.getByRole("button", { name: /switch to/i }).boundingBox();
  expect(donateButton.x + donateButton.width).toBeLessThanOrEqual(weather.x);
  expect(themeButton.x + themeButton.width).toBeLessThanOrEqual(rim.x + rim.width);
});

test("My Day shares the Eastern Time calendar and styles older Away entries", async ({ page }) => {
  await page.route("https://**/*", (route) => route.abort());
  await page.route("**/data/outlook-availability.json", (route) => route.fulfill({
    json: {
      ...snapshot,
      days: {
        ...snapshot.days,
        "2026-11-06": [
          { label: "Away", start: null, end: null },
          { label: "Busy", start: "2026-11-06T19:00:00Z", end: "2026-11-06T19:30:00Z" },
        ],
      },
    },
  }));
  await page.clock.setFixedTime(new Date("2026-11-07T02:00:00Z"));
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/?intro=0#/home");
  const myDay = page.getByRole("region", { name: "My Day" });
  await expect(myDay).toContainText("Friday, November 6, 2026");
  const away = myDay.getByRole("listitem").filter({ hasText: "Out of Office" });
  await expect(away).toContainText("All day");
  await expect(away).toHaveCSS("background-image", /conic-gradient/);
  await expect(myDay.getByText("2:00 PM – 2:30 PM")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);

  await page.setViewportSize({ width: 1247, height: 1244 });
  await myDay.getByRole("link", { name: "Full calendar" }).click();
  const day = page.getByRole("button", { name: /Friday, November 6, 2026/ });
  const entry = day.locator(".calendar-cell-entry").filter({ hasText: "Out of Office" });
  await expect(entry).toHaveCSS("background-image", /conic-gradient/);
  await expect(day.getByText("2:00 PM – 2:30 PM")).toBeVisible();
});
