import { Fragment, useState } from "react";
import { calendarTimeZone, civilDate, easternDay, shiftDay } from "../calendarDates.js";
import { integrations } from "../content.js";
import { useClock, useResource } from "../hooks.js";
import { GlassLayer } from "./Glass.jsx";
import Icon from "./Icon.jsx";
import { ExternalLink, LoadState, SectionTitle } from "./UI.jsx";
import "./AvailabilityCalendar.css";

const monthFormat = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const dayFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeZone: "UTC" });
const timeFormat = new Intl.DateTimeFormat("en-US", { timeStyle: "short", timeZone: calendarTimeZone });
const updatedFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: calendarTimeZone });
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const visibleEntryLimit = 3;

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

function useAvailability() {
  return useResource("/data/outlook-availability.json", parseSnapshot);
}

function entryTime({ start, end }, day) {
  if (!start) return "All day";
  const begins = new Date(start);
  const ends = new Date(end);
  const from = easternDay(begins) === day ? timeFormat.format(begins) : "12:00 AM";
  const to = easternDay(ends) === day ? timeFormat.format(ends) : "midnight";
  return start === end ? from : `${from} – ${to}`;
}

function AvailabilityEntry({ entry, day, compact = false }) {
  const Element = compact ? "span" : "li";
  const label = entry.label === "Away" ? "Out of Office" : entry.label;
  return (
    <Element className={compact ? "calendar-cell-entry" : undefined} data-status={label}>
      <strong>{label}</strong>
      <span>{entryTime(entry, day)}</span>
    </Element>
  );
}

function AvailabilityEntries({ entries, day }) {
  if (!entries?.length) return <p className="muted">No availability entries for this date.</p>;
  return (
    <ul className="calendar-entries">
      {entries.map((entry, index) => <AvailabilityEntry entry={entry} day={day} key={index} />)}
    </ul>
  );
}

export function MyDay() {
  const snapshot = useAvailability();
  const today = easternDay(useClock());
  return (
    <section className="my-day glass-host" aria-labelledby="my-day-title">
      <GlassLayer />
      <SectionTitle
        headingProps={{ id: "my-day-title" }}
        action={<a className="text-link" href="#/tools?panel=calendar">Full calendar <Icon name="next" size={16} /></a>}
      >
        My Day
      </SectionTitle>
      <div className="my-day-schedule">
        <p className="my-day-date muted"><time dateTime={today}>{dayFormat.format(civilDate(today))}</time> · ET</p>
        <LoadState resource={snapshot} message="Calendar availability is temporarily unavailable.">
          {({ firstDay, lastDay, days }) => today < firstDay || today > lastDay
            ? <p className="muted">The saved calendar does not cover today.</p>
            : <AvailabilityEntries day={today} entries={days[today]} />}
        </LoadState>
      </div>
    </section>
  );
}

function CalendarMonth({ snapshot }) {
  const { firstDay, lastDay, days, updatedAt } = snapshot;
  const today = easternDay(new Date());
  const hasToday = today >= firstDay && today <= lastDay;
  const [selection, setSelection] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const selected = selection || (hasToday ? today : lastDay);
  const monthStart = `${selected.slice(0, 7)}-01`;
  const weekdayOffset = civilDate(monthStart).getUTCDay();
  const firstCell = shiftDay(monthStart, -weekdayOffset);
  const dateAfterMonth = civilDate(monthStart);
  dateAfterMonth.setUTCMonth(dateAfterMonth.getUTCMonth() + 1);
  const nextMonth = dateAfterMonth.toISOString().slice(0, 10);
  const daysInMonth = civilDate(shiftDay(nextMonth, -1)).getUTCDate();
  const weekCount = Math.ceil((weekdayOffset + daysInMonth) / 7);

  function selectDay(day, showEntries = false) {
    setSelection(day);
    setExpanded(showEntries);
  }

  function moveMonth(offset) {
    const target = civilDate(monthStart);
    target.setUTCMonth(target.getUTCMonth() + offset);
    const day = target.toISOString().slice(0, 10);
    selectDay(day < firstDay ? firstDay : day);
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
          <button className="button" type="button" disabled={!hasToday || selected === today} onClick={() => selectDay(today)}>
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
          {Array.from({ length: weekCount }, (_, week) => {
            const weekStart = shiftDay(firstCell, week * 7);
            const showAgenda = expanded && selected >= weekStart && selected <= shiftDay(weekStart, 6);
            return (
              <Fragment key={weekStart}>
                <tr>
                  {weekdays.map((_, column) => {
                    const day = shiftDay(weekStart, column);
                    const available = day >= monthStart && day < nextMonth && day >= firstDay && day <= lastDay;
                    const entries = days[day] || [];
                    const count = entries.length;
                    return (
                      <td className="calendar-cell" key={day}>
                        {available ? (
                          <button type="button" className="calendar-day" data-selected={day === selected}
                            aria-expanded={expanded && day === selected}
                            aria-current={day === today ? "date" : undefined}
                            aria-label={`${dayFormat.format(civilDate(day))}, ${count} ${count === 1 ? "entry" : "entries"}`}
                            onClick={() => selectDay(day, day !== selected || !expanded)}>
                            <span className="calendar-day-number">
                              {Number(day.slice(8))}
                              {count > 0 && <span className="calendar-count">{count}</span>}
                            </span>
                            {count > 0 && (
                              <span className="calendar-cell-entries">
                                {entries.slice(0, visibleEntryLimit).map((entry, index) => (
                                  <AvailabilityEntry entry={entry} day={day} compact key={index} />
                                ))}
                                {count > visibleEntryLimit && <span className="calendar-more">+{count - visibleEntryLimit} more</span>}
                              </span>
                            )}
                          </button>
                        ) : <span className="calendar-inactive-day">{Number(day.slice(8))}</span>}
                      </td>
                    );
                  })}
                </tr>
                {showAgenda && (
                  <tr>
                    <td className="calendar-agenda" colSpan={7}>
                      <h3>{dayFormat.format(civilDate(selected))}</h3>
                      <AvailabilityEntries day={selected} entries={days[selected]} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      <p className="small muted">Last synced {updatedFormat.format(new Date(updatedAt))} ET.</p>
    </div>
  );
}

export default function AvailabilityCalendar() {
  const snapshot = useAvailability();
  return (
    <section className="embed-panel">
      <header className="calendar-panel-header">
        <Icon name="calendar" size={36} />
        <h2 tabIndex={-1}>My Calendar</h2>
        <ExternalLink className="button" href={integrations.calendar}>
          View in Outlook <Icon name="external" size={18} />
        </ExternalLink>
      </header>
      <LoadState resource={snapshot} message="The availability calendar is temporarily unavailable. You can still open Outlook.">
        {(data) => <CalendarMonth snapshot={data} />}
      </LoadState>
    </section>
  );
}
