const dayMs = 86_400_000;
const pageSize = 14;
const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const easternDate = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', year: 'numeric', month: 'numeric', day: 'numeric',
});
const fullDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const monthDate = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const yearDate = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'UTC' });
const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact' });
const sleepTime = (value) => {
  const minutes = Math.round(value);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};
const bpm = (value) => `${decimal.format(value)} bpm`;
const stageSeries = [
  { field: 'sleep_deep_minutes', label: 'Deep', color: '--deep' },
  { field: 'sleep_rem_minutes', label: 'REM', color: '--rem' },
  { field: 'sleep_light_minutes', label: 'Light', color: '--light' },
  { field: 'sleep_awake_minutes', label: 'Awake', color: '--awake' },
  { field: 'unclassified', label: 'Unclassified', color: '--unclassified' },
];
const heartSeries = [
  { field: 'heart_rate_min_bpm', label: 'Minimum', color: '--minimum', dash: [5, 4], style: 'dashed' },
  { field: 'heart_rate_max_bpm', label: 'Maximum', color: '--maximum', dash: [1, 3], style: 'dotted' },
  { field: 'heart_rate_bpm', label: 'Average', color: '--accent', dash: [], style: '' },
];
const metrics = [
  {
    key: 'steps',
    title: 'Steps',
    display: (value) => `${whole.format(value)} steps`,
    cell: (value) => whole.format(value),
    tick: (value) => compact.format(value),
    series: [{ field: 'steps', color: '--accent', dash: [] }],
  },
  {
    key: 'sleep_minutes',
    title: 'Sleep',
    display: sleepTime,
    cell: sleepTime,
    tick: (value) => `${decimal.format(value / 60)}h`,
    series: stageSeries,
  },
  {
    key: 'heart_rate_bpm',
    title: 'Heart rate',
    display: (value) => `${bpm(value)} avg.`,
    cell: bpm,
    tick: (value) => `${value}`,
    series: heartSeries,
  },
];

const id = (value) => document.getElementById(value);
const dashboard = id('dashboard');
const history = id('history');
const ranges = document.querySelectorAll('button[data-range]');
const weekdayFilter = id('weekday-filter');
const weekdaySummary = weekdayFilter.querySelector('summary');
const weekdayOptions = id('weekday-options');
const weekdayInputs = [1, 2, 3, 4, 5, 6, 0].map((day) => {
  const label = document.createElement('label');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = true;
  input.value = day;
  label.append(input, weekdayNames[day]);
  weekdayOptions.insertBefore(label, weekdayOptions.querySelector('.weekday-actions'));
  return input;
});
let range = '30';
let page = 0;
let rowsByDay;
let finish;
let filteredDays = [];
let buckets = [];
let charts = [];

function yearBefore(time) {
  const date = new Date(time);
  const year = date.getUTCFullYear() - 1;
  const month = date.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Date.UTC(year, month, Math.min(date.getUTCDate(), daysInMonth));
}

function startOfRange(first, last) {
  if (range === 'all') return first;
  if (range === 'year') return yearBefore(last) + dayMs;
  return last - (Number(range) - 1) * dayMs;
}

function renderComparison() {
  const { year, month, day } = Object.fromEntries(easternDate.formatToParts(new Date())
    .map(({ type, value }) => [type, value]));
  const yesterday = Date.UTC(Number(year), Number(month) - 1, Number(day)) - dayMs;
  const first = yearBefore(yesterday);
  const previous = rowsByDay.get(yesterday);
  const date = id('comparison-date');
  date.dateTime = new Date(yesterday).toISOString().slice(0, 10);
  date.textContent = shortDate.format(yesterday);
  const items = metrics.map((metric) => {
    const { key, title, cell } = metric;
    let total = 0;
    let count = 0;
    for (let time = first; time < yesterday; time += dayMs) {
      const value = rowsByDay.get(time)?.[key];
      if (value === undefined) continue;
      total += value;
      count++;
    }
    const average = count ? total / count : undefined;
    const value = previous?.[key];
    const term = document.createElement('dt');
    term.textContent = title;
    const current = document.createElement('dd');
    current.className = 'comparison-value';
    current.textContent = value === undefined ? 'No record' : cell(value);
    const reference = document.createElement('dd');
    reference.className = 'comparison-reference';
    if (average === undefined) {
      reference.textContent = 'No year average';
    } else {
      const averageValue = document.createElement('span');
      averageValue.textContent = cell(average);
      reference.append('Year avg. ', averageValue);
    }
    const item = document.createElement('div');
    item.append(term, current);
    if (value !== undefined && average !== undefined) {
      const difference = document.createElement('dd');
      difference.className = 'comparison-difference';
      const precision = key === 'heart_rate_bpm' ? 10 : 1;
      const delta = (Math.round(value * precision) - Math.round(average * precision)) / precision;
      const magnitude = key === 'sleep_minutes' && Math.round(Math.abs(delta)) < 60
        ? `${Math.round(Math.abs(delta))}m` : cell(Math.abs(delta));
      difference.textContent = delta === 0 ? 'At average' : `${delta < 0 ? '−' : '+'}${magnitude}`;
      item.append(difference);
    }
    item.append(reference);
    return item;
  });
  id('comparison-values').replaceChildren(...items);
  id('comparison').hidden = false;
}

function sleepBreakdown(row) {
  if (row.sleep_minutes === undefined) return row;
  const stages = Object.fromEntries(stageSeries.slice(0, -1).map(({ field }) => [field, row[field] ?? 0]));
  const classified = Object.values(stages).reduce((sum, minutes) => sum + minutes, 0);
  return { ...row, ...stages, unclassified: Math.max(0, row.sleep_minutes - classified) };
}

function chartBuckets() {
  if (range !== 'all') {
    return filteredDays.map((time) => ({ time, row: rowsByDay.get(time) ?? {} }));
  }
  const months = new Map();
  for (const time of filteredDays) {
    const date = new Date(time);
    const month = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
    if (!months.has(month)) months.set(month, {});
    const totals = months.get(month);
    for (const [field, value] of Object.entries(rowsByDay.get(time) ?? {})) {
      if (typeof value !== 'number') continue;
      const samples = totals[field] ??= [0, 0];
      samples[0] += value;
      samples[1]++;
    }
  }
  return Array.from(months, ([time, totals]) => ({
    time,
    row: Object.fromEntries(Object.entries(totals).map(([field, [total, count]]) => [field, total / count])),
  }));
}

function showSelection() {
  for (const button of ranges) button.setAttribute('aria-pressed', String(button.dataset.range === range));
  const start = startOfRange(rowsByDay.keys().next().value, finish);
  const weekdays = new Set(weekdayInputs.filter((input) => input.checked).map((input) => Number(input.value)));
  const filtered = weekdays.size < weekdayNames.length;
  weekdayFilter.toggleAttribute('data-filtered', filtered);
  id('weekday-label').textContent = filtered ? `Day of week · ${weekdays.size}` : 'Day of week';
  filteredDays = [];
  for (let time = start; time <= finish; time += dayMs) {
    if (weekdays.has(new Date(time).getUTCDay())) filteredDays.push(time);
  }
  buckets = chartBuckets();
  const period = `${fullDate.format(start)} – ${fullDate.format(finish)}`;
  id('view-dates').textContent = period;
  id('view-grain').textContent = range === 'all' ? 'Monthly averages' : '';
  for (const chart of charts) {
    const interval = range === 'all' ? 'monthly averages' : 'daily values';
    const latest = filteredDays.findLast((time) => rowsByDay.get(time)?.[chart.metric.key] !== undefined);
    chart.latestValue.textContent = latest === undefined ? 'No matching records' : chart.metric.display(rowsByDay.get(latest)[chart.metric.key]);
    chart.latestLabel.hidden = latest === undefined;
    if (latest !== undefined) {
      chart.latestTime.dateTime = rowsByDay.get(latest).date;
      chart.latestTime.textContent = fullDate.format(latest);
    }
    const guidance = buckets.length ? 'Use the left and right arrows to explore the chart.' : 'No matching dates.';
    chart.canvas.setAttribute('aria-label', `${chart.metric.title}, ${interval}, ${period}. ${guidance}`);
    drawChart(chart);
  }
  page = 0;
  if (history.open) renderTable();
}

function renderTable() {
  const fragment = document.createDocumentFragment();
  const days = filteredDays.length;
  const firstRow = page * pageSize;
  const endRow = Math.min(firstRow + pageSize, days);
  for (let index = firstRow; index < endRow; index++) {
    const day = filteredDays[days - 1 - index];
    const row = document.createElement('tr');
    const dateCell = document.createElement('th');
    dateCell.scope = 'row';
    dateCell.textContent = fullDate.format(day);
    row.append(dateCell);
    for (const metric of metrics) {
      const cell = document.createElement('td');
      const value = rowsByDay.get(day)?.[metric.key];
      cell.textContent = value === undefined ? '—' : metric.cell(value);
      if (value === undefined) {
        cell.className = 'missing';
        cell.setAttribute('aria-label', 'No record');
      }
      row.append(cell);
    }
    fragment.append(row);
  }
  if (days === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.className = 'empty-table';
    cell.textContent = 'No dates match your filters.';
    row.append(cell);
    fragment.append(row);
  }
  id('daily-rows').replaceChildren(fragment);
  id('page').textContent = days ? `Page ${page + 1} of ${Math.ceil(days / pageSize)}` : '0 days';
  id('newer').disabled = page === 0;
  id('older').disabled = endRow === days;
}

function tickSize(span) {
  const target = Math.max(span / 4, 1);
  const power = 10 ** Math.floor(Math.log10(target));
  return [1, 2, 2.5, 5, 10].find((factor) => factor * power >= target) * power;
}

function plotChart(chart, width, height) {
  const { ctx, metric, series, canvas } = chart;
  const theme = getComputedStyle(canvas);
  const color = (name) => theme.getPropertyValue(name).trim();
  if (!buckets.length) {
    chart.plot = undefined;
    ctx.font = '11px Geist, system-ui, sans-serif';
    ctx.fillStyle = color('--muted');
    ctx.textAlign = 'center';
    ctx.fillText('No dates match your filters', width / 2, height / 2);
    return;
  }
  const sleeping = metric.key === 'sleep_minutes';
  const values = buckets.flatMap(({ row }) => sleeping
    ? [row.sleep_minutes]
    : series.map(({ field }) => row[field])).filter(Number.isFinite);
  const lowest = metric.key === 'heart_rate_bpm' && values.length ? Math.max(0, Math.min(...values) - 5) : 0;
  const highest = Math.max(lowest + 5, ...values);
  const step = sleeping ? Math.max(60, Math.ceil(highest / 240) * 60) : tickSize(highest - lowest);
  const floor = Math.floor(lowest / step) * step;
  const ceiling = Math.ceil(highest / step) * step;
  const left = 36;
  const right = width - 8;
  const top = 11;
  const bottom = height - 24;
  const spacing = (right - left) / buckets.length;
  const x = (index) => left + (index + 0.5) * spacing;
  const y = (value) => bottom - (value - floor) / (ceiling - floor) * (bottom - top);
  chart.plot = { left, right, top, bottom, spacing, x };
  ctx.font = '11px Geist, system-ui, sans-serif';
  ctx.fillStyle = color('--muted');
  ctx.strokeStyle = color('--grid');
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  if (values.length) {
    for (let tick = floor; tick <= ceiling; tick += step) {
      ctx.fillText(metric.tick(tick), left - 6, y(tick));
      ctx.beginPath();
      ctx.moveTo(left, y(tick));
      ctx.lineTo(right, y(tick));
      ctx.stroke();
    }
  } else {
    ctx.textAlign = 'center';
    ctx.fillText('No records in this range', (left + right) / 2, (top + bottom) / 2);
  }
  const formatter = range === 'all' ? yearDate : shortDate;
  const lastTick = Math.max(1, Math.min(width < 420 ? 3 : 6, buckets.length) - 1);
  let previousLabel;
  ctx.textBaseline = 'top';
  for (let tick = 0; tick <= lastTick; tick++) {
    const index = Math.round((buckets.length - 1) * tick / lastTick);
    const label = formatter.format(buckets[index].time);
    if (label === previousLabel) continue;
    ctx.textAlign = tick === 0 ? 'left' : tick === lastTick ? 'right' : 'center';
    const labelX = tick === 0 ? Math.max(left, x(index) - ctx.measureText(label).width / 2)
      : tick === lastTick ? Math.min(right, x(index) + ctx.measureText(label).width / 2)
      : x(index);
    ctx.fillText(label, labelX, bottom + 6);
    previousLabel = label;
  }
  if (sleeping) {
    const barWidth = Math.min(34, spacing * 0.8);
    for (const [index, { row }] of buckets.entries()) {
      let total = 0;
      for (const { field, color: seriesColor } of series) {
        const value = row[field] ?? 0;
        if (value <= 0) continue;
        ctx.fillStyle = color(seriesColor);
        ctx.fillRect(x(index) - barWidth / 2, y(total + value), barWidth, y(total) - y(total + value));
        total += value;
      }
    }
    return;
  }
  for (const { field, color: seriesColor, dash } of series) {
    ctx.strokeStyle = ctx.fillStyle = color(seriesColor);
    ctx.lineWidth = dash.length ? 1.25 : 1.9;
    ctx.setLineDash(dash);
    ctx.beginPath();
    for (const [index, { row }] of buckets.entries()) {
      const value = row[field];
      if (value === undefined) continue;
      if (buckets[index - 1]?.row[field] !== undefined) ctx.lineTo(x(index), y(value));
      else ctx.moveTo(x(index), y(value));
    }
    ctx.stroke();
    ctx.setLineDash([]);
    for (const [index, { row }] of buckets.entries()) {
      const value = row[field];
      if (value === undefined) continue;
      const isolated = buckets[index - 1]?.row[field] === undefined && buckets[index + 1]?.row[field] === undefined;
      if (isolated || buckets.length <= 14) {
        ctx.beginPath();
        ctx.arc(x(index), y(value), dash.length ? 1.6 : 2.2, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }
}

function drawChart(chart) {
  const { canvas, ctx } = chart;
  const { width, height } = canvas.getBoundingClientRect();
  if (!rowsByDay || !ctx || !width) return;
  hideTooltip(chart);
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  plotChart(chart, width, height);
}

function tooltipLines(chart, row) {
  const { metric, series } = chart;
  if (row[metric.key] === undefined) return ['No record'];
  if (metric.key === 'steps') return [metric.display(row.steps)];
  if (metric.key === 'heart_rate_bpm') {
    return [heartSeries[2], ...series.filter(({ field }) => field !== metric.key)]
      .filter(({ field }) => row[field] !== undefined)
      .map(({ field, label }) => `${label} ${bpm(row[field])}`);
  }
  return [`Total ${sleepTime(row.sleep_minutes)}`, ...series
    .filter(({ field }) => row[field] > 0)
    .map(({ field, label }) => `${label} ${sleepTime(row[field])}`)];
}

function showTooltip(chart, index, announce = false) {
  const { canvas, tooltip, guide, plot, live } = chart;
  if (!plot) return;
  chart.index = index;
  const { time, row } = buckets[index];
  const label = range === 'all' ? monthDate.format(time) : fullDate.format(time);
  const lines = tooltipLines(chart, row);
  const date = document.createElement('time');
  date.textContent = label;
  const detail = lines.map((line) => {
    const span = document.createElement('span');
    span.textContent = line;
    return span;
  });
  tooltip.replaceChildren(date, ...detail);
  tooltip.hidden = false;
  const selectedX = plot.x(index);
  tooltip.style.left = `${Math.max(0, Math.min(selectedX, canvas.clientWidth - tooltip.offsetWidth))}px`;
  guide.style.left = `${selectedX}px`;
  guide.style.top = `${plot.top}px`;
  guide.style.height = `${plot.bottom - plot.top}px`;
  guide.hidden = false;
  if (announce) live.textContent = [label, ...lines].join('. ');
}

function hideTooltip(chart) {
  chart.tooltip.hidden = true;
  chart.guide.hidden = true;
  chart.index = undefined;
  chart.live.textContent = '';
}

function createChart(metric, rows) {
  const section = id('chart-template').content.firstElementChild.cloneNode(true);
  section.querySelector('h2').textContent = metric.title;
  const series = metric.series.filter(({ field }) => rows.some((row) => row[field] !== undefined));
  const legend = section.querySelector('.legend');
  for (const { label, color, style } of series) {
    if (!label) continue;
    const item = document.createElement('li');
    const marker = document.createElement('span');
    marker.className = style === undefined ? 'swatch' : `swatch line ${style}`;
    marker.style.setProperty('--series', `var(${color})`);
    item.append(marker, label);
    legend.append(item);
  }
  legend.hidden = legend.childElementCount === 0;
  const canvas = section.querySelector('canvas');
  const chart = {
    canvas, metric, series, ctx: canvas.getContext('2d'),
    latestValue: section.querySelector('.latest strong'),
    latestLabel: section.querySelector('.latest span'),
    latestTime: section.querySelector('.latest time'),
    tooltip: section.querySelector('.tooltip'),
    guide: section.querySelector('.chart-guide'),
    live: section.querySelector('[role="status"]'),
  };
  const point = (event) => {
    if (!chart.plot) return;
    const offset = event.clientX - canvas.getBoundingClientRect().left - chart.plot.left;
    const index = Math.max(0, Math.min(buckets.length - 1, Math.floor(offset / chart.plot.spacing)));
    showTooltip(chart, index);
  };
  canvas.addEventListener('pointermove', (event) => { if (event.pointerType === 'mouse') point(event); });
  canvas.addEventListener('click', point);
  canvas.addEventListener('pointerleave', (event) => { if (event.pointerType === 'mouse') hideTooltip(chart); });
  canvas.addEventListener('blur', () => hideTooltip(chart));
  canvas.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      hideTooltip(chart);
      return;
    }
    const delta = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (delta === undefined || !chart.plot) return;
    event.preventDefault();
    const index = chart.index === undefined ? buckets.length - 1 : chart.index + delta;
    showTooltip(chart, Math.max(0, Math.min(buckets.length - 1, index)), true);
  });
  new ResizeObserver(() => drawChart(chart)).observe(canvas);
  id('charts').append(section);
  return chart;
}

for (const button of ranges) {
  button.addEventListener('click', () => {
    range = button.dataset.range;
    showSelection();
  });
}
weekdayOptions.addEventListener('change', showSelection);
for (const [button, checked] of [['all-weekdays', true], ['clear-weekdays', false]]) {
  id(button).addEventListener('click', () => {
    for (const input of weekdayInputs) input.checked = checked;
    showSelection();
  });
}
document.addEventListener('click', (event) => {
  if (weekdayFilter.open && !weekdayFilter.contains(event.target)) weekdayFilter.open = false;
});
weekdayFilter.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || !weekdayFilter.open) return;
  weekdayFilter.open = false;
  weekdaySummary.focus();
});
id('newer').addEventListener('click', () => { page -= 1; renderTable(); });
id('older').addEventListener('click', () => { page += 1; renderTable(); });
history.addEventListener('toggle', () => { if (history.open) renderTable(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => charts.forEach(drawChart));
document.fonts.ready.then(() => charts.forEach(drawChart));

try {
  const response = await fetch('./daily.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error('Daily summaries request failed.');
  const rows = (await response.json()).map(sleepBreakdown);
  if (!metrics.every(({ key }) => rows.some((row) => row[key] !== undefined))) {
    throw new Error('Daily summaries are incomplete.');
  }
  rowsByDay = new Map(rows.map((row) => [Date.parse(row.date), row]));
  finish = Date.parse(rows.at(-1).date);
  renderComparison();
  charts = metrics.map((metric) => createChart(metric, rows));
  dashboard.hidden = false;
  showSelection();
  id('status').hidden = true;
} catch {
  dashboard.hidden = true;
  id('status').textContent = 'Daily activity couldn’t load. Refresh the page to try again.';
}
