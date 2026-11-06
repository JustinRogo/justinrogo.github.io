import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ical from "node-ical";
import { integrations } from "../v2/src/content.js";
import { civilDate, easternDay, shiftDay } from "../v2/src/calendarDates.js";

const source = integrations.calendar.replace("/calendar/published/", "/owa/calendar/")
  .replace(/\.html$/, ".ics");
const output = fileURLToPath(new URL("../data/outlook-availability.json", import.meta.url));
const labels = new Map([
  ["FREE", "Free"], ["BUSY", "Busy"], ["TENTATIVE", "Tentative"],
  ["AWAY", "Out of Office"], ["OOF", "Out of Office"], ["OUT OF OFFICE", "Out of Office"],
  ["WORKING ELSEWHERE", "Working elsewhere"],
]);

// node-ical expands DATE-only values as local civil dates, independent of UTC offsets.
function allDayKey(date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0")).join("-");
}

export function parseOutlookAvailability(ics, now = new Date()) {
  if (!/^BEGIN:VCALENDAR\s/i.test(ics.trim()) || !/END:VCALENDAR$/i.test(ics.trim())) {
    throw new Error("Outlook did not return an iCalendar feed.");
  }
  const today = easternDay(now);
  const firstDay = shiftDay(today, -31);
  const lastDay = shiftDay(today, 92);
  const range = {
    from: civilDate(shiftDay(firstDay, -1)),
    to: civilDate(shiftDay(lastDay, 2)),
    expandOngoing: true,
  };
  const days = {};
  for (const item of Object.values(ical.sync.parseICS(ics))) {
    if (item.type !== "VEVENT" || !item.start) continue;
    for (const { start, end, isFullDay, summary, event } of ical.expandRecurringEvent(item, range)) {
      if (event.status === "CANCELLED") continue;
      const dayKey = isFullDay ? allDayKey : easternDay;
      const startDay = dayKey(start);
      const endDay = end > start ? dayKey(new Date(end.getTime() - 1)) : startDay;
      // Export only a fixed availability label and dates. Titles and all other ICS fields stay private.
      const label = labels.get(String(event["MICROSOFT-CDO-BUSYSTATUS"] || summary).trim().toUpperCase())
        || (event.transparency === "TRANSPARENT" ? "Free" : event.status === "TENTATIVE" ? "Tentative" : "Busy");
      const allDay = isFullDay || String(event["MICROSOFT-CDO-ALLDAYEVENT"]).toUpperCase() === "TRUE";
      for (let day = startDay < firstDay ? firstDay : startDay;
        day <= lastDay && day <= endDay; day = shiftDay(day, 1)) {
        (days[day] ??= []).push({
          label,
          start: allDay ? null : start.toISOString(),
          end: allDay ? null : end.toISOString(),
        });
      }
    }
  }
  for (const entries of Object.values(days)) entries.sort((a, b) => (a.start || "").localeCompare(b.start || ""));
  return { schemaVersion: 1, updatedAt: now.toISOString(), firstDay, lastDay, days };
}

export async function refreshOutlookAvailability() {
  try {
    const response = await fetch(source, {
      headers: { accept: "text/calendar" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Outlook returned HTTP ${response.status}.`);
    const calendar = parseOutlookAvailability(await response.text());
    await writeFile(`${output}.tmp`, JSON.stringify(calendar) + "\n");
    await rename(`${output}.tmp`, output);
    console.log(`Updated Outlook availability for ${Object.keys(calendar.days).length} days.`);
  } catch {
    const saved = await readFile(output, "utf8").catch(() => null);
    console.warn(`Outlook availability refresh failed. ${saved ? "Using the saved snapshot." : "The Outlook link remains available."}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await refreshOutlookAvailability();
}
