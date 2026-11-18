const easternDate = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', year: 'numeric', month: 'numeric', day: 'numeric',
});
export const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
export const decimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const percentage = new Intl.NumberFormat('en-US', { style: 'percent' });
export const sleepTime = (value) => {
  const minutes = Math.round(value);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};
export const bpm = (value) => `${decimal.format(value)} bpm`;
const comparisonMetrics = [
  { key: 'steps', title: 'Steps', cell: whole.format },
  { key: 'sleep_minutes', title: 'Sleep', cell: sleepTime },
  { key: 'heart_rate_bpm', title: 'Heart rate', cell: bpm },
];

export function yearBefore(time) {
  const date = new Date(time);
  const year = date.getUTCFullYear() - 1;
  const month = date.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Date.UTC(year, month, Math.min(date.getUTCDate(), daysInMonth));
}

export function activityComparison(rowsByDay, now = new Date()) {
  const { year, month, day } = Object.fromEntries(easternDate.formatToParts(now)
    .map(({ type, value }) => [type, value]));
  const yesterday = Date.UTC(Number(year), Number(month) - 1, Number(day) - 1);
  const first = yearBefore(yesterday);
  const metrics = comparisonMetrics.map(({ key, title, cell }) => {
    let total = 0;
    let count = 0;
    for (let time = first; time < yesterday; time += 86_400_000) {
      const sample = rowsByDay.get(time)?.[key];
      if (!Number.isFinite(sample)) continue;
      total += sample;
      count++;
    }
    const average = count ? total / count : undefined;
    const value = rowsByDay.get(yesterday)?.[key];
    const hasValue = Number.isFinite(value);
    const ratio = hasValue && average > 0 ? value / average : undefined;
    let difference;
    if (hasValue && count) {
      const precision = key === 'heart_rate_bpm' ? 10 : 1;
      const delta = (Math.round(value * precision) - Math.round(average * precision)) / precision;
      const magnitude = key === 'sleep_minutes' && Math.round(Math.abs(delta)) < 60
        ? `${Math.round(Math.abs(delta))}m` : cell(Math.abs(delta));
      difference = delta === 0 ? 'At average' : `${delta < 0 ? '−' : '+'}${magnitude}`;
    }
    return {
      key, title, ratio, difference,
      percent: ratio === undefined ? '—' : percentage.format(ratio),
      value: hasValue ? cell(value) : 'No record',
      average: count ? cell(average) : undefined,
    };
  });
  return { yesterday, metrics };
}
