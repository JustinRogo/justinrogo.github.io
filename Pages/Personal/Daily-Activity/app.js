const dayMs = 86_400_000;
const pageSize = 14;
const fullDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const yearDate = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'UTC' });
const whole = new Intl.NumberFormat('en-US');
const decimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact' });
const sleepTime = (value) => {
  const minutes = Math.round(value);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};
const metrics = {
  steps: {
    title: 'Daily steps',
    note: 'Samsung Health’s daily total across devices.',
    display: (value) => `${whole.format(value)} steps`,
    cell: (value) => whole.format(value),
    tick: (value) => compact.format(value),
  },
  sleep_minutes: {
    title: 'Time in recorded sleep sessions',
    note: 'Grouped by wake date. Sessions may include time awake.',
    display: sleepTime,
    cell: sleepTime,
    tick: (value) => `${decimal.format(value / 60)}h`,
  },
  heart_rate_bpm: {
    title: 'Daily average heart rate',
    note: 'Average of recorded readings, in beats per minute.',
    display: (value) => `${decimal.format(value)} bpm`,
    cell: (value) => `${decimal.format(value)} bpm`,
    tick: (value) => `${value}`,
  },
};

const id = (value) => document.getElementById(value);
const dashboard = id('dashboard');
const canvas = id('chart');
const context = canvas.getContext('2d');
const tooltip = id('chart-tooltip');
const guide = id('chart-guide');
const selections = document.querySelectorAll('button[data-metric], button[data-range]');
let metric = 'steps';
let range = '30';
let page = 0;
let rowsByDay;
let coverage;
let start;
let finish;
let days;
let plot;

function startOfRange(first, last) {
  if (range === 'all') return first;
  if (range !== 'year') return last - (Number(range) - 1) * dayMs;
  const date = new Date(last);
  const year = date.getUTCFullYear() - 1;
  const month = date.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Date.UTC(year, month, Math.min(date.getUTCDate(), daysInMonth)) + dayMs;
}

function showSelection() {
  for (const button of selections) {
    button.setAttribute('aria-pressed', String(button.dataset.metric === metric || button.dataset.range === range));
  }
  for (const heading of document.querySelectorAll('[data-column]')) {
    heading.classList.toggle('current-column', heading.dataset.column === metric);
  }
  const definition = metrics[metric];
  const entries = coverage[metric];
  finish = entries.at(-1);
  start = startOfRange(entries[0], finish);
  days = Math.round((finish - start) / dayMs) + 1;
  id('metric-title').textContent = definition.title;
  id('metric-note').textContent = definition.note;
  id('latest-date').textContent = fullDate.format(finish);
  id('latest-value').textContent = definition.display(rowsByDay.get(finish)[metric]);
  const period = `${fullDate.format(start)} – ${fullDate.format(finish)}`;
  id('chart-dates').textContent = period;
  canvas.setAttribute('aria-label', `${definition.title}, ${period}. Individual values are in the daily table.`);
  page = 0;
  drawChart();
  renderTable();
}

function renderTable() {
  const fragment = document.createDocumentFragment();
  const firstRow = page * pageSize;
  const endRow = Math.min(firstRow + pageSize, days);
  for (let index = firstRow; index < endRow; index++) {
    const day = finish - index * dayMs;
    const row = document.createElement('tr');
    const dateCell = document.createElement('th');
    dateCell.scope = 'row';
    dateCell.textContent = fullDate.format(day);
    row.append(dateCell);
    for (const [key, definition] of Object.entries(metrics)) {
      const cell = document.createElement('td');
      const value = rowsByDay.get(day)?.[key];
      cell.textContent = value === undefined ? '—' : definition.cell(value);
      if (value === undefined) {
        cell.className = 'missing';
        cell.setAttribute('aria-label', 'No record');
      } else if (key === metric) {
        cell.className = 'current-column';
      }
      row.append(cell);
    }
    fragment.append(row);
  }
  id('daily-rows').replaceChildren(fragment);
  id('page').textContent = `Page ${page + 1} of ${Math.ceil(days / pageSize)}`;
  id('newer').disabled = page === 0;
  id('older').disabled = endRow === days;
}

function tickSize(span) {
  const target = Math.max(span / 4, 1);
  const power = 10 ** Math.floor(Math.log10(target));
  return [1, 2, 2.5, 5, 10].find((factor) => factor * power >= target) * power;
}

function drawChart() {
  const { width, height } = canvas.getBoundingClientRect();
  if (!rowsByDay || !context || !width) return;
  hideTooltip();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  context.setTransform(scale, 0, 0, scale, 0, 0);
  const theme = getComputedStyle(canvas);
  const color = (name) => theme.getPropertyValue(name).trim();
  const points = coverage[metric].filter((day) => day >= start).map((day) => [day, rowsByDay.get(day)[metric]]);
  const values = points.map(([, value]) => value);
  const lowest = metric === 'heart_rate_bpm' ? Math.max(0, Math.min(...values) - 5) : 0;
  const highest = Math.max(lowest + 5, ...values);
  const step = metric === 'sleep_minutes' ? Math.max(60, Math.ceil(highest / 240) * 60) : tickSize(highest - lowest);
  const floor = Math.floor(lowest / step) * step;
  const ceiling = Math.ceil(highest / step) * step;
  const left = 38;
  const right = width - 11;
  const top = 15;
  const bottom = height - 29;
  plot = { left, right, top, bottom };
  const x = (day) => left + ((day - start) / Math.max(dayMs, finish - start)) * (right - left);
  const y = (value) => bottom - (value - floor) / (ceiling - floor) * (bottom - top);
  context.font = '11px Geist, system-ui, sans-serif';
  context.fillStyle = color('--muted');
  context.strokeStyle = color('--grid');
  context.textAlign = 'right';
  context.textBaseline = 'middle';
  for (let tick = floor; tick <= ceiling; tick += step) {
    context.fillText(metrics[metric].tick(tick), left - 7, y(tick));
    context.beginPath();
    context.moveTo(left, y(tick));
    context.lineTo(right, y(tick));
    context.stroke();
  }
  const formatter = days > 550 ? yearDate : shortDate;
  const xLabels = width < 420 ? 3 : 6;
  let previousLabel;
  context.textBaseline = 'top';
  for (let index = 0; index < Math.min(xLabels, days); index++) {
    const lastTick = Math.max(1, Math.min(xLabels, days) - 1);
    const day = start + Math.round((days - 1) * index / lastTick) * dayMs;
    const label = formatter.format(day);
    if (label === previousLabel) continue;
    context.textAlign = index === 0 ? 'left' : index === lastTick ? 'right' : 'center';
    context.fillText(label, x(day), bottom + 9);
    previousLabel = label;
  }
  context.strokeStyle = color('--accent');
  context.fillStyle = color('--accent');
  context.lineWidth = days > 365 ? 1 : 2;
  context.lineJoin = 'round';
  context.beginPath();
  points.forEach(([day, value], index) => {
    if (day - points[index - 1]?.[0] === dayMs) context.lineTo(x(day), y(value));
    else context.moveTo(x(day), y(value));
  });
  context.stroke();
  points.forEach(([day, value], index) => {
    const isolated = day - points[index - 1]?.[0] !== dayMs && points[index + 1]?.[0] - day !== dayMs;
    if (days <= 31 || isolated) {
      context.beginPath();
      context.arc(x(day), y(value), days > 365 ? 1.3 : 2.5, 0, 2 * Math.PI);
      context.fill();
    }
  });
}

function showTooltip(event) {
  if (!plot) return;
  const bounds = canvas.getBoundingClientRect();
  const fraction = Math.min(1, Math.max(0, (event.clientX - bounds.left - plot.left) / (plot.right - plot.left)));
  const index = Math.round(fraction * (days - 1));
  const day = start + index * dayMs;
  const selectedX = plot.left + (index / Math.max(1, days - 1)) * (plot.right - plot.left);
  const value = rowsByDay.get(day)?.[metric];
  tooltip.textContent = `${fullDate.format(day)} · ${value === undefined ? 'No record' : metrics[metric].display(value)}`;
  tooltip.hidden = false;
  tooltip.style.left = `${Math.min(selectedX, bounds.width - tooltip.offsetWidth)}px`;
  guide.style.left = `${selectedX}px`;
  guide.style.top = `${plot.top}px`;
  guide.style.height = `${plot.bottom - plot.top}px`;
  guide.hidden = false;
}

function hideTooltip() {
  tooltip.hidden = true;
  guide.hidden = true;
}

for (const button of selections) {
  button.addEventListener('click', () => {
    metric = button.dataset.metric ?? metric;
    range = button.dataset.range ?? range;
    showSelection();
  });
}
id('newer').addEventListener('click', () => { page -= 1; renderTable(); });
id('older').addEventListener('click', () => { page += 1; renderTable(); });
canvas.addEventListener('pointermove', (event) => { if (event.pointerType === 'mouse') showTooltip(event); });
canvas.addEventListener('click', showTooltip);
canvas.addEventListener('pointerleave', (event) => { if (event.pointerType === 'mouse') hideTooltip(); });
new ResizeObserver(drawChart).observe(canvas);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', drawChart);
document.fonts.ready.then(drawChart);

try {
  const response = await fetch('./daily.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error('Daily summaries request failed.');
  const rows = await response.json();
  rowsByDay = new Map(rows.map((row) => [Date.parse(row.date), row]));
  coverage = Object.fromEntries(Object.keys(metrics).map((key) => [key,
    Array.from(rowsByDay).filter(([, row]) => row[key] !== undefined).map(([day]) => day),
  ]));
  if (Object.values(coverage).some((dates) => dates.length === 0)) throw new Error('Daily summaries are incomplete.');
  dashboard.hidden = false;
  showSelection();
  id('status').hidden = true;
} catch {
  dashboard.hidden = true;
  id('status').textContent = 'Daily activity couldn’t load. Refresh the page to try again.';
}
