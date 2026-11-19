import { initMonthByYear } from './month-by-year.js';

const dayOrder = [1, 2, 3, 4, 5, 6, 0];
const monthName = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const heatBandNames = ['Low', 'Lower middle', 'Upper middle', 'High'];
const number = new Intl.NumberFormat('en-US');

function quantile(sortedValues, fraction) {
  const position = (sortedValues.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (position - lower);
}

export function trailingWeek(rowsByDay, date, key, dayMs) {
  if (rowsByDay.get(date)?.[key] === undefined) return undefined;
  let sum = 0;
  let count = 0;
  for (let offset = 0; offset < 7; offset++) {
    const value = rowsByDay.get(date - offset * dayMs)?.[key];
    if (value !== undefined) {
      sum += value;
      count++;
    }
  }
  return count >= 4 ? sum / count : undefined;
}

function textElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function initSleepScatter(rowsByDay, metrics, fullDate, firstYear, latestYear) {
  const canvas = document.getElementById('sleep-scatter');
  const ctx = canvas.getContext('2d');
  const detail = document.getElementById('scatter-detail');
  const count = document.getElementById('scatter-count');
  const steps = metrics.get('steps');
  const sleep = metrics.get('sleep_minutes');
  const start = document.getElementById('scatter-start');
  const end = document.getElementById('scatter-end');
  const legend = document.getElementById('scatter-legend');
  const slider = start.parentElement;
  for (const input of [start, end]) {
    input.min = firstYear;
    input.max = latestYear;
    input.value = input === start ? firstYear : latestYear;
    input.disabled = firstYear === latestYear;
  }
  const pairs = [];
  for (const [time, row] of rowsByDay) {
    if (!Number.isFinite(row.sleep_minutes) || !Number.isFinite(row.steps)) continue;
    const date = new Date(time);
    pairs.push({ time, year: date.getUTCFullYear(), weekday: date.getUTCDay(), minutes: row.sleep_minutes, count: row.steps });
  }
  const hueForYear = (year) => (213 + (year - firstYear) * 137.508) % 360;
  let weekdays = new Set();
  let points = [];
  let positions = [];
  let selected = -1;

  function draw() {
    const { width, height } = canvas.getBoundingClientRect();
    if (!ctx || !width) return;
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    positions = [];
    if (!points.length) return;

    const theme = getComputedStyle(canvas);
    const color = (key) => theme.getPropertyValue(key).trim();
    const left = 42;
    const right = width - 12;
    const top = 23;
    const bottom = height - 41;
    const maxHours = Math.max(...points.map(({ minutes }) => minutes / 60));
    const maxSteps = Math.max(...points.map(({ count }) => count));
    const hourTick = Math.max(1, Math.ceil(maxHours / 4));
    const stepTick = Math.max(1000, Math.ceil(maxSteps / 4000) * 1000);
    const upperHours = Math.max(hourTick, Math.ceil(maxHours / hourTick) * hourTick);
    const upperSteps = Math.max(stepTick, Math.ceil(maxSteps / stepTick) * stepTick);
    const x = (hours) => left + hours / upperHours * (right - left);
    const y = (stepsPerDay) => bottom - stepsPerDay / upperSteps * (bottom - top);

    ctx.font = '11px Geist, system-ui, sans-serif';
    ctx.fillStyle = color('--muted');
    ctx.strokeStyle = color('--grid');
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let tick = 0; tick <= upperSteps; tick += stepTick) {
      ctx.fillText(steps.tick(tick), left - 6, y(tick));
      ctx.beginPath();
      ctx.moveTo(left, y(tick));
      ctx.lineTo(right, y(tick));
      ctx.stroke();
    }
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText('Steps', left, 2);
    ctx.textAlign = 'center';
    for (let tick = 0; tick <= upperHours; tick += hourTick) ctx.fillText(String(tick), x(tick), bottom + 6);
    ctx.fillText('Recorded sleep (hours)', (left + right) / 2, height - 15);

    positions = points.map(({ minutes, count }) => ({ x: x(minutes / 60), y: y(count) }));
    const lightness = color('--year-lightness');
    const yearColor = (year) => `hsl(${hueForYear(year)} 65% ${lightness})`;
    ctx.globalAlpha = points.length > 200 ? .58 : .85;
    for (const [index, point] of positions.entries()) {
      if (!index || points[index].year !== points[index - 1].year) ctx.fillStyle = yearColor(points[index].year);
      ctx.beginPath();
      ctx.arc(point.x, point.y, points.length > 200 ? 2.2 : 3.4, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const active = positions[selected];
    ctx.fillStyle = yearColor(points[selected].year);
    ctx.beginPath();
    ctx.arc(active.x, active.y, 5.1, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = color('--ink');
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  function select(index) {
    selected = index;
    const point = points[index];
    detail.textContent = point
      ? `${fullDate.format(point.time)} · ${sleep.cell(point.minutes)} in recorded sleep sessions · ${steps.display(point.count)}`
      : 'No dates with both sleep and step records in this view.';
    draw();
  }

  function pointAt(event) {
    const bounds = canvas.getBoundingClientRect();
    let nearest = -1;
    let distance = 20;
    for (const [index, point] of positions.entries()) {
      const candidate = Math.hypot(point.x - (event.clientX - bounds.left), point.y - (event.clientY - bounds.top));
      if (candidate > distance) continue;
      distance = candidate;
      nearest = index;
    }
    if (nearest >= 0 && nearest !== selected) select(nearest);
  }

  canvas.addEventListener('pointermove', (event) => { if (event.pointerType === 'mouse') pointAt(event); });
  canvas.addEventListener('click', pointAt);
  canvas.addEventListener('keydown', (event) => {
    if (!points.length) return;
    const index = { ArrowLeft: selected - 1, ArrowRight: selected + 1, Home: 0, End: points.length - 1 }[event.key];
    if (index === undefined) return;
    event.preventDefault();
    select(Math.min(points.length - 1, Math.max(0, index)));
  });
  new ResizeObserver(draw).observe(canvas);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw);
  document.fonts.ready.then(draw);

  function filterYears() {
    const previous = points[selected]?.time;
    const from = start.valueAsNumber;
    const through = end.valueAsNumber;
    document.getElementById('start-label').textContent = from;
    document.getElementById('end-label').textContent = through;
    const span = Math.max(1, latestYear - firstYear);
    slider.style.setProperty('--start-gap', `calc((100% - var(--thumb)) * ${(from - firstYear) / span})`);
    slider.style.setProperty('--end-gap', `calc((100% - var(--thumb)) * ${(latestYear - through) / span})`);
    points = pairs.filter(({ year, weekday }) => year >= from && year <= through && weekdays.has(weekday));
    const years = [...new Set(points.map(point => point.year))];
    legend.replaceChildren(...years.map(year => {
      const item = document.createElement('li');
      const dot = textElement('span', 'swatch', '');
      dot.style.setProperty('--year-hue', hueForYear(year));
      item.append(dot, String(year));
      return item;
    }));
    legend.hidden = !years.length;
    count.textContent = `${number.format(points.length)} paired ${points.length === 1 ? 'day' : 'days'}`;
    canvas.hidden = points.length === 0;
    canvas.setAttribute('aria-label', `Sleep and next-day steps, ${count.textContent}. Use the left and right arrows to explore days.`);
    const existing = points.findIndex(({ time }) => time === previous);
    select(existing < 0 ? points.length - 1 : existing);
  }
  function updateEndpoint(input) {
    if (start.valueAsNumber > end.valueAsNumber) input.value = input === start ? end.value : start.value;
    filterYears();
  }
  for (const input of [start, end]) input.addEventListener('input', () => updateEndpoint(input));
  slider.addEventListener('pointerdown', event => {
    if (event.target === start || event.target === end || firstYear === latestYear) return;
    const thumb = parseFloat(getComputedStyle(slider).getPropertyValue('--thumb'));
    const bounds = slider.getBoundingClientRect();
    const travel = bounds.width - 2 * thumb;
    const x = event.clientX - bounds.left - thumb / 2;
    const span = latestYear - firstYear;
    const lowX = (start.valueAsNumber - firstYear) / span * travel;
    const highX = thumb + (end.valueAsNumber - firstYear) / span * travel;
    const input = Math.abs(x - lowX) <= Math.abs(x - highX) ? start : end;
    input.value = firstYear + Math.round((x - (input === end ? thumb : 0)) / travel * span);
    input.focus();
    updateEndpoint(input);
  });
  return (selectedWeekdays) => {
    weekdays = selectedWeekdays;
    filterYears();
  };
}

export function initSummaryViews({ rowsByDay, metrics, dayMs, weekdayNames, fullDate }) {
  const weekMetric = document.getElementById('typical-metric');
  const week = document.getElementById('typical-week');
  const weekDetail = document.getElementById('typical-detail');
  const heatMetric = document.getElementById('heat-metric');
  const heatYear = document.getElementById('heat-year');
  const heatGrid = document.getElementById('heat-grid');
  const heatScroll = document.getElementById('heat-scroll');
  const heatDetail = document.getElementById('heat-detail');
  const heatSwatches = document.querySelectorAll('#heat-scale i');
  const metricsByKey = new Map(metrics.map((metric) => [metric.key, metric]));
  const dates = Array.from(rowsByDay.keys());
  const latestDate = dates.at(-1);
  const firstYear = new Date(dates[0]).getUTCFullYear();
  const latestYear = new Date(latestDate).getUTCFullYear();
  const updateScatter = initSleepScatter(rowsByDay, metricsByKey, fullDate, firstYear, latestYear);
  const updateMonthly = initMonthByYear({ rowsByDay, metrics, firstYear, latestYear });
  let weekdays = new Set();
  let selectedDays = [];
  let weekSelection;
  let heatSelection;

  for (const select of [weekMetric, heatMetric]) {
    for (const { key, title } of metrics) select.add(new Option(title, key));
  }
  for (let year = latestYear; year >= firstYear; year--) heatYear.add(new Option(year, year));

  function renderTypicalWeek() {
    const metric = metricsByKey.get(weekMetric.value);
    week.closest('section').dataset.metric = metric.key;
    const groups = Array.from({ length: 7 }, () => []);
    for (const time of selectedDays) {
      const value = rowsByDay.get(time)?.[metric.key];
      if (value !== undefined) groups[new Date(time).getUTCDay()].push(value);
    }
    const stats = dayOrder.filter((day) => weekdays.has(day)).map((day) => {
      const values = groups[day].sort((a, b) => a - b);
      if (!values.length) return { day, count: 0 };
      const [low, median, high] = [0.25, 0.5, 0.75].map((fraction) => quantile(values, fraction));
      return { day, count: values.length, low, median, high };
    });
    week.replaceChildren();
    if (!stats.some(({ count }) => count)) {
      weekDetail.textContent = 'No records for this metric in the selected dates.';
      return;
    }
    const highest = Math.max(1, ...stats.map(({ high }) => high ?? 0));
    const select = (item) => {
      weekSelection = item.day;
      for (const button of week.children) {
        button.setAttribute('aria-pressed', String(Number(button.dataset.day) === item.day));
      }
      weekDetail.textContent = item.count
        ? `${weekdayNames[item.day]} · Median ${metric.cell(item.median)} · Middle 50% ${metric.cell(item.low)} to ${metric.cell(item.high)} · ${item.count} recorded ${item.count === 1 ? 'day' : 'days'}`
        : `${weekdayNames[item.day]} · No record`;
    };
    for (const item of stats) {
      const button = textElement('button', 'typical-row', '');
      button.type = 'button';
      button.dataset.day = item.day;
      const label = textElement('span', '', weekdayNames[item.day].slice(0, 3));
      const track = textElement('span', item.count ? 'typical-track' : '', '');
      track.setAttribute('aria-hidden', 'true');
      if (item.count) {
        track.style.setProperty('--low', `${item.low / highest * 100}%`);
        track.style.setProperty('--median', `${item.median / highest * 100}%`);
        track.style.setProperty('--spread', `${(item.high - item.low) / highest * 100}%`);
        track.append(textElement('span', 'typical-band', ''), textElement('span', 'typical-dot', ''));
      }
      button.append(label, track, textElement('span', 'typical-value', item.count ? metric.cell(item.median) : '—'));
      button.setAttribute('aria-label', item.count ? `${weekdayNames[item.day]}, median ${metric.cell(item.median)}` : `${weekdayNames[item.day]}, no record`);
      button.addEventListener('click', () => select(item));
      week.append(button);
    }
    select(stats.find(({ day }) => day === weekSelection) ?? stats.find(({ count }) => count));
  }

  function renderHeatmap({ reveal = false } = {}) {
    const year = Number(heatYear.value);
    const metric = metricsByKey.get(heatMetric.value);
    heatGrid.closest('section').dataset.metric = metric.key;
    const start = Date.UTC(year, 0, 1);
    const end = Date.UTC(year + 1, 0, 1);
    const datesInYear = Array.from({ length: (end - start) / dayMs }, (_, index) => start + index * dayMs);
    const positives = datesInYear.map((time) => rowsByDay.get(time)?.[metric.key]).filter((value) => value > 0).sort((a, b) => a - b);
    const breaks = positives.length ? [0.25, 0.5, 0.75].map((fraction) => quantile(positives, fraction)) : [];
    for (const [index, swatch] of heatSwatches.entries()) {
      if (!breaks.length) {
        swatch.title = heatBandNames[index];
        continue;
      }
      const upper = breaks[index];
      const lower = breaks[index - 1];
      const range = lower === undefined ? `up to about ${metric.cell(upper)}`
        : upper === undefined ? `above about ${metric.cell(lower)}`
          : `about ${metric.cell(lower)} to ${metric.cell(upper)}`;
      swatch.title = `${heatBandNames[index]} · ${range}`;
    }
    const offset = (new Date(start).getUTCDay() + 6) % 7;
    const cells = new Map();
    const fragment = document.createDocumentFragment();
    heatGrid.style.setProperty('--weeks', Math.ceil((datesInYear.length + offset) / 7));
    for (const [index, day] of dayOrder.entries()) {
      if (index % 2) continue;
      const label = textElement('span', 'heat-weekday', weekdayNames[day].slice(0, 3));
      label.style.gridArea = `${index + 2} / 1`;
      label.setAttribute('aria-hidden', 'true');
      fragment.append(label);
    }
    for (const [index, time] of datesInYear.entries()) {
      const date = new Date(time);
      const position = index + offset;
      const column = Math.floor(position / 7) + 2;
      if (date.getUTCDate() === 1) {
        const month = textElement('span', 'heat-month', monthName.format(time));
        month.style.gridArea = `1 / ${column} / 2 / span 2`;
        month.setAttribute('aria-hidden', 'true');
        fragment.append(month);
      }
      const value = rowsByDay.get(time)?.[metric.key];
      const included = weekdays.has(date.getUTCDay());
      const label = included ? (value === undefined ? 'No record' : metric.display(value)) : 'Filtered out';
      const band = value > 0 ? breaks.filter((limit) => value > limit).length : undefined;
      const button = textElement('button', 'heat-day', '');
      button.type = 'button';
      button.style.gridArea = `${position % 7 + 2} / ${column}`;
      button.dataset.level = !included ? 'filtered'
        : value === undefined ? 'missing' : value === 0 ? 'zero' : band + 1;
      button.title = `${fullDate.format(time)} · ${label}`;
      if (included && band !== undefined) button.title += ` · ${heatBandNames[band]}`;
      button.setAttribute('aria-label', button.title);
      button.setAttribute('aria-pressed', 'false');
      button.tabIndex = -1;
      button.addEventListener('click', () => select(time));
      button.addEventListener('keydown', (event) => {
        const delta = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 }[event.key];
        if (delta === undefined) return;
        event.preventDefault();
        const next = time + delta * dayMs;
        if (cells.has(next)) {
          select(next);
          cells.get(next).focus();
        }
      });
      cells.set(time, button);
      fragment.append(button);
    }
    const select = (time) => {
      const former = cells.get(heatSelection);
      if (former) {
        former.tabIndex = -1;
        former.setAttribute('aria-pressed', 'false');
      }
      const button = cells.get(time);
      button.tabIndex = 0;
      button.setAttribute('aria-pressed', 'true');
      heatSelection = time;
      heatDetail.textContent = button.title;
    };
    heatGrid.replaceChildren(fragment);
    const initial = cells.has(heatSelection) ? heatSelection : Math.min(latestDate, end - dayMs);
    select(initial);
    if (reveal) {
      const button = cells.get(initial);
      heatScroll.scrollLeft = button.offsetLeft - heatScroll.clientWidth / 2;
    }
    document.getElementById('heat-filter-key').hidden = weekdays.size === 7;
  }

  weekMetric.addEventListener('change', renderTypicalWeek);
  heatMetric.addEventListener('change', () => renderHeatmap());
  heatYear.addEventListener('change', () => renderHeatmap({ reveal: true }));
  return (days, selectedWeekdays) => {
    const initial = selectedDays.length === 0 && heatGrid.childElementCount === 0;
    const changed = weekdays.size !== selectedWeekdays.size || [...weekdays].some((day) => !selectedWeekdays.has(day));
    weekdays = selectedWeekdays;
    selectedDays = days;
    renderTypicalWeek();
    if (initial || changed) updateScatter(weekdays);
    if (initial || changed) updateMonthly(weekdays);
    if (initial || changed) renderHeatmap({ reveal: initial });
  };
}
