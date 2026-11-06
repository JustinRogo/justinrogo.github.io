import { useState } from "react";
import { calendarTimeZone, civilDate, easternDay, shiftDay } from "../calendarDates.js";
import { integrations } from "../content.js";
import { useResource } from "../hooks.js";
import Icon from "./Icon.jsx";
import { ExternalLink, LoadState } from "./UI.jsx";
import "./AvailabilityCalendar.css";

const monthFormat = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const dayFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeZone: "UTC" });
const timeFormat = new Intl.DateTimeFormat("en-US", { timeStyle: "short", timeZone: calendarTimeZone });
const updatedFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: calendarTimeZone });
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseSnapshot(text) {
  const snapshot = JSON.parse(text);
  if (
    snapshot?.schemaVersion !== 1 || !snapshot.days ||
    !Number.isFinite(Date.parse(snapshot.updatedAt)) ||
    !Number.isFinite(civilDate(snapshot.firstDay).getTime()) ||
    !Number.isFinite(civilDate(snapshot.lastDay).getTime()) ||
    snapshot.firstDay > snapshot.lastDay
  ) {
    throw new Error("Invalid availability snapshot");
  }
  return snapshot;
}

function entryTime({ start, end }, day) {
  if (!start) return "All day";
  const begins = new Date(start);
  const ends = new Date(end);
  const from = easternDay(begins) === day ? timeFormat.format(begins) : "12:00 AM";
  const to = easternDay(ends) === day ? timeFormat.format(ends) : "midnight";
  return start === end ? from : `${from} – ${to}`;
}

function CalendarMonth({ snapshot }) {
  const { firstDay, lastDay, days, updatedAt } = snapshot;
  const today = easternDay(new Date());
  const hasToday = today >= firstDay && today <= lastDay;
  const [selection, setSelection] = useState(null);
  const selected = selection || (hasToday ? today : lastDay);
  const monthStart = `${selected.slice(0, 7)}-01`;
  const weekdayOffset = civilDate(monthStart).getUTCDay();
  const firstCell = shiftDay(monthStart, -weekdayOffset);
  const dateAfterMonth = civilDate(monthStart);
  dateAfterMonth.setUTCMonth(dateAfterMonth.getUTCMonth() + 1);
  const nextMonth = dateAfterMonth.toISOString().slice(0, 10);
  const daysInMonth = civilDate(shiftDay(nextMonth, -1)).getUTCDate();
  const weekCount = Math.ceil((weekdayOffset + daysInMonth) / 7);
  const selectedEntries = days[selected] || [];

  function moveMonth(offset) {
    const target = civilDate(monthStart);
    target.setUTCMonth(target.getUTCMonth() + offset);
    const day = target.toISOString().slice(0, 10);
    setSelection(day < firstDay ? firstDay : day);
  }

  return (
    <div className="availability-calendar">
      {!hasToday && <p className="load-state">This snapshot no longer covers today. Open Outlook for the latest availability.</p>}
      <div className="calendar-toolbar">
        <h3 aria-live="polite">{monthFormat.format(civilDate(monthStart))}</h3>
        <div className="calendar-controls">
          <button className="icon-button" type="button" aria-label="Previous month"
            disabled={monthStart.slice(0, 7) === firstDay.slice(0, 7)} onClick={() => moveMonth(-1)}>
            <Icon name="previous" size={16} />
          </button>
          <button className="button" type="button" disabled={!hasToday || selected === today} onClick={() => setSelection(today)}>
            Today
          </button>
          <button className="icon-button" type="button" aria-label="Next month"
            disabled={nextMonth > lastDay} onClick={() => moveMonth(1)}>
            <Icon name="next" size={16} />
          </button>
        </div>
      </div>
      <table aria-label={`${monthFormat.format(civilDate(monthStart))} availability`}>
        <thead><tr>{weekdays.map((day) => <th scope="col" key={day}>{day}</th>)}</tr></thead>
        <tbody>
          {Array.from({ length: weekCount }, (_, week) => (
            <tr key={week}>
              {weekdays.map((_, column) => {
                const day = shiftDay(firstCell, week * 7 + column);
                const available = day >= monthStart && day < nextMonth && day >= firstDay && day <= lastDay;
                const count = days[day]?.length || 0;
                return (
                  <td key={day}>
                    {available ? (
                      <button type="button" aria-pressed={day === selected}
                        aria-current={day === today ? "date" : undefined}
                        aria-label={`${dayFormat.format(civilDate(day))}, ${count} entries`}
                        onClick={() => setSelection(day)}>
                        <span>{Number(day.slice(8))}</span>
                        {count > 0 && <span className="calendar-count" aria-hidden="true">{count}</span>}
                      </button>
                    ) : <span className="calendar-inactive-day">{Number(day.slice(8))}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="calendar-agenda" aria-live="polite">
        <h3>{dayFormat.format(civilDate(selected))}</h3>
        {selectedEntries.length ? (
          <ul>{selectedEntries.map((entry, index) => (
            <li key={index}><strong>{entry.label}</strong><span>{entryTime(entry, selected)}</span></li>
          ))}</ul>
        ) : <p>No availability entries for this date.</p>}
      </div>
      <p className="small muted">Last synced {updatedFormat.format(new Date(updatedAt))} ET.</p>
    </div>
  );
}

export default function AvailabilityCalendar() {
  const snapshot = useResource("/data/outlook-availability.json", parseSnapshot);
  return (
    <section className="embed-panel">
      <Icon name="calendar" size={36} />
      <h2 tabIndex={-1}>See what’s on my calendar.</h2>
      <p>Published Outlook availability, in Eastern Time.</p>
      <ExternalLink className="button" href={integrations.calendar}>
        Open in Outlook <Icon name="external" size={18} />
      </ExternalLink>
      <LoadState resource={snapshot} message="The availability calendar is temporarily unavailable. You can still open Outlook.">
        {(data) => <CalendarMonth snapshot={data} />}
      </LoadState>
    </section>
  );
}
