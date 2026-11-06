export const calendarTimeZone = "America/New_York";

const easternDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: calendarTimeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const civilDate = (day) => new Date(`${day}T00:00:00Z`);

export function easternDay(date) {
  const parts = easternDate.formatToParts(date);
  return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type).value).join("-");
}

export function shiftDay(day, offset) {
  const date = civilDate(day);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
