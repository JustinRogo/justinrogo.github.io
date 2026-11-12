import { access, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ical from 'node-ical';
import lzString from 'lz-string';
import sanitizeHtml from 'sanitize-html';
import { calendarTimeZone, civilDate, easternDay, shiftDay } from '../../../v2/src/calendarDates.js';

// Styled Calendar's public embed uses this anonymous feed for the events it displays.
const source = 'https://embed.styledcalendar.com/api/get-styled-calendar-events-data/?styledCalendarId=BeQlhkDJKGvzX3726Qh8';
const output = fileURLToPath(new URL('./calendar-events.js', import.meta.url));
const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
const dateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/;

function calendarProperty(name, value, zone) {
  if (dateOnly.test(value)) return name + ';VALUE=DATE:' + value.replaceAll('-', '');
  if (!dateTime.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new Error('Invalid calendar date.');
  }
  const localTime = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  const parts = Object.fromEntries(localTime.formatToParts(new Date(value)).map(({ type, value }) => [type, value]));
  return `${name};TZID=${zone}:${parts.year}${parts.month}${parts.day}T${parts.hour}${parts.minute}${parts.second}`;
}

// node-ical represents DATE-only values as local civil dates.
function allDayKey(date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map(value => String(value).padStart(2, '0')).join('-');
}

function expandEvent(row, range) {
  const zone = row.timeZone || calendarTimeZone;
  if (!/^[A-Za-z0-9_+\-/]+$/.test(zone)) throw new Error('Invalid calendar time zone.');
  const properties = [
    calendarProperty('DTSTART', row.start, zone),
    calendarProperty('DTEND', row.end || row.start, zone),
    ...(row.recurrence || []).map(rule => {
      if (!/^(RRULE|RDATE|EXDATE)(?:;[^:\r\n]+)?:[^\r\n]+$/.test(rule)) {
        throw new Error('Invalid calendar recurrence.');
      }
      return rule;
    }),
    ...(row.exdate || []).map(date => calendarProperty('EXDATE', date, zone)),
  ];
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', 'UID:ucpea-event',
    ...properties, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const event = ical.sync.parseICS(ics)['ucpea-event'];
  return ical.expandRecurringEvent(event, range);
}

function readEventDetails({ location, description, attachments } = {}) {
  const result = {};
  if (typeof location === 'string' && location.trim()) result.location = location.trim();
  if (typeof description === 'string' && description.trim()) {
    const html = sanitizeHtml(description, {
      allowedTags: ['p', 'div', 'br', 'a', 'strong', 'b', 'em', 'i', 'u', 'sup', 'ul', 'ol', 'li', 'hr', 'blockquote'],
      allowedAttributes: { a: ['href', 'target', 'rel'] },
      allowedSchemes: ['https', 'http', 'mailto'],
      allowProtocolRelative: false,
      transformTags: { a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }) },
    }).trim();
    if (html) result.description = html;
  }
  const files = (Array.isArray(attachments) ? attachments : []).flatMap(attachment => {
    if (typeof attachment?.fileUrl !== 'string') return [];
    try {
      const url = new URL(attachment.fileUrl);
      if (!['https:', 'http:'].includes(url.protocol)) return [];
      const title = typeof attachment.title === 'string' ? attachment.title.trim() : '';
      return [{ title: title || url.hostname, url: url.href }];
    } catch {
      return [];
    }
  });
  if (files.length) result.attachments = files;
  return result;
}

export function parseCalendarFeed(feed, now = new Date()) {
  if (!Array.isArray(feed.compressedEventsAndIds)) throw new Error('Unexpected Styled Calendar feed.');
  const rows = feed.compressedEventsAndIds.flatMap(({ compressedEvents }) => {
    const events = JSON.parse(lzString.decompressFromUTF16(compressedEvents));
    if (!Array.isArray(events)) throw new Error('Unexpected Styled Calendar events.');
    return events;
  });
  const today = easternDay(now);
  const firstDay = rows.reduce((earliest, row) => {
    const start = row.start.slice(0, 10);
    return start < earliest ? start : earliest;
  }, today);
  const horizon = civilDate(today.slice(0, 7) + '-01');
  horizon.setUTCMonth(horizon.getUTCMonth() + 13);
  const lastDay = rows.reduce((latest, row) => {
    const end = (row.end || row.start).slice(0, 10);
    return end > latest ? end : latest;
  }, shiftDay(horizon.toISOString().slice(0, 10), -1));
  const range = {
    from: civilDate(shiftDay(firstDay, -1)),
    to: civilDate(shiftDay(lastDay, 2)),
    expandOngoing: true,
  };
  const days = {};
  const details = [];
  for (const row of rows) {
    const title = row.title.trim().replace(/\s+/g, ' ');
    if (!title) continue;
    const metadata = readEventDetails(row.extendedProps || {});
    const detailIndex = Object.keys(metadata).length ? details.push(metadata) - 1 : undefined;
    for (const { start, end, isFullDay } of expandEvent(row, range)) {
      const dayKey = isFullDay ? allDayKey : easternDay;
      const startDay = dayKey(start);
      const endDay = end > start ? dayKey(new Date(end.getTime() - 1)) : startDay;
      const entry = { title, details: detailIndex };
      if (!isFullDay) {
        entry.start = start.toISOString();
        entry.end = end.toISOString();
      } else if (startDay !== endDay) {
        entry.firstDay = startDay;
        entry.lastDay = endDay;
      }
      for (let day = startDay; day <= endDay && day <= lastDay; day = shiftDay(day, 1)) {
        (days[day] ??= []).push(entry);
      }
    }
  }
  for (const events of Object.values(days)) {
    events.sort((a, b) => (a.start || '').localeCompare(b.start || '') || a.title.localeCompare(b.title));
  }
  return { updatedAt: now.toISOString(), firstMonth: firstDay.slice(0, 7), lastMonth: lastDay.slice(0, 7), days, details };
}

export async function refreshUCPEACalendar() {
  try {
    const response = await fetch(source, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Styled Calendar returned HTTP ${response.status}.`);
    const calendar = parseCalendarFeed(await response.json());
    await writeFile(`${output}.tmp`, `// Generated by update-calendar.mjs.\nconst UCPEACalendarData = ${JSON.stringify(calendar, null, 2)};\n`);
    await rename(`${output}.tmp`, output);
    console.log(`Updated the UCPEA calendar for ${Object.keys(calendar.days).length} dates.`);
  } catch (error) {
    const saved = await access(output).then(() => true, () => false);
    console.warn(`UCPEA calendar refresh failed. ${error.message} ${saved ? 'Using the saved calendar.' : 'The official calendar link remains available.'}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await refreshUCPEACalendar();
}
