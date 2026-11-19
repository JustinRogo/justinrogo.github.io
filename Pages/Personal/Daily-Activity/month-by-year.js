const shortMonth = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const longMonth = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' });
const monthLabels = Array.from({ length: 12 }, (_, month) => shortMonth.format(Date.UTC(2000, month, 1)));
const monthNames = Array.from({ length: 12 }, (_, month) => longMonth.format(Date.UTC(2000, month, 1)));

function tickSize(span) {
  const target = Math.max(span / 4, 1);
  const power = 10 ** Math.floor(Math.log10(target));
  return [1, 2, 2.5, 5, 10].find((factor) => factor * power >= target) * power;
}

// Average per recorded day for each month of each year, limited to the selected weekdays.
function monthlyAverages(rowsByDay, key, weekdays) {
  const totals = new Map();
  for (const [time, row] of rowsByDay) {
    const value = row[key];
    if (!Number.isFinite(value)) continue;
    const date = new Date(time);
    if (!weekdays.has(date.getUTCDay())) continue;
    const year = date.getUTCFullYear();
    if (!totals.has(year)) totals.set(year, Array.from({ length: 12 }, () => [0, 0]));
    const month = totals.get(year)[date.getUTCMonth()];
    month[0] += value;
    month[1]++;
  }
  return new Map([...totals]
    .sort(([a], [b]) => a - b)
    .map(([year, months]) => [year, months.map(([sum, count]) => (count ? sum / count : undefined))]));
}

export function initMonthByYear({ rowsByDay, metrics, firstYear, latestYear }) {
  const id = (value) => document.getElementById(value);
  const metricSelect = id('monthly-metric');
  const yearSelect = id('monthly-year');
  const canvas = id('monthly-chart');
  const detail = id('monthly-detail');
  const legend = id('monthly-legend');
  const section = canvas.closest('section');
  const ctx = canvas.getContext('2d');
  const metricsByKey = new Map(metrics.map((metric) => [metric.key, metric]));
  for (const { key, title } of metrics) metricSelect.add(new Option(title, key));
  for (let year = latestYear; year >= firstYear; year--) yearSelect.add(new Option(year, year));
  let weekdays = new Set();
  let series = new Map();
  let month = new Date([...rowsByDay.keys()].at(-1)).getUTCMonth();
  let plot;

  const metric = () => metricsByKey.get(metricSelect.value);
  const selectedYear = () => Number(yearSelect.value);
  const format = (value) => (metric().key === 'steps' ? `${metric().cell(value)} steps` : metric().cell(value));

  function swatch(className) {
    const marker = document.createElement('span');
    marker.className = `swatch line ${className}`;
    marker.style.setProperty('--series', 'var(--metric)');
    return marker;
  }

  function describe() {
    const year = selectedYear();
    const entries = [...series].filter(([, months]) => months[month] !== undefined);
    const parts = [`${monthNames[month]} ${year}`];
    const value = series.get(year)?.[month];
    parts.push(value === undefined ? 'No record' : format(value));
    if (entries.length > 1) {
      const sorted = entries.sort(([, a], [, b]) => b[month] - a[month]);
      const [highYear, high] = sorted[0];
      const [lowYear, low] = sorted.at(-1);
      const average = sorted.reduce((sum, [, months]) => sum + months[month], 0) / sorted.length;
      parts.push(`Highest ${highYear}, ${format(high[month])}`, `Lowest ${lowYear}, ${format(low[month])}`,
        `Average of ${sorted.length} years ${format(average)}`);
    }
    detail.textContent = parts.join(' · ');
  }

  function draw() {
    const { width, height } = canvas.getBoundingClientRect();
    if (!ctx || !width) return;
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const theme = getComputedStyle(canvas);
    const color = (name) => theme.getPropertyValue(name).trim();
    const { key, tick } = metric();
    const values = [...series.values()].flat().filter(Number.isFinite);
    ctx.font = '11px Geist, system-ui, sans-serif';
    ctx.fillStyle = color('--muted');
    if (!values.length) {
      plot = undefined;
      ctx.textAlign = 'center';
      ctx.fillText('No records match your filters', width / 2, height / 2);
      return;
    }
    const sleeping = key === 'sleep_minutes';
    const lowest = key === 'heart_rate_bpm' ? Math.max(0, Math.min(...values) - 5) : 0;
    const highest = Math.max(lowest + 5, ...values);
    const step = sleeping ? Math.max(60, Math.ceil(highest / 240) * 60) : tickSize(highest - lowest);
    const floor = Math.floor(lowest / step) * step;
    const ceiling = Math.ceil(highest / step) * step;
    const left = 40;
    const right = width - 10;
    const top = 10;
    const bottom = height - 24;
    const spacing = (right - left) / 12;
    const x = (index) => left + (index + 0.5) * spacing;
    const y = (value) => bottom - (value - floor) / (ceiling - floor) * (bottom - top);
    plot = { left, spacing, y };

    ctx.strokeStyle = color('--grid');
    ctx.lineWidth = 1;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let value = floor; value <= ceiling; value += step) {
      ctx.fillText(tick(value), left - 6, y(value));
      ctx.beginPath();
      ctx.moveTo(left, y(value));
      ctx.lineTo(right, y(value));
      ctx.stroke();
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const narrow = spacing < 34;
    for (const [index, label] of monthLabels.entries()) {
      ctx.fillText(narrow ? label[0] : label, x(index), bottom + 7);
    }

    ctx.strokeStyle = color('--border');
    ctx.beginPath();
    ctx.moveTo(x(month), top);
    ctx.lineTo(x(month), bottom);
    ctx.stroke();

    const line = (months, width, alpha) => {
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (const [index, value] of months.entries()) {
        if (value === undefined) continue;
        if (months[index - 1] !== undefined) ctx.lineTo(x(index), y(value));
        else ctx.moveTo(x(index), y(value));
      }
      ctx.stroke();
      for (const [index, value] of months.entries()) {
        if (value === undefined || months[index - 1] !== undefined || months[index + 1] !== undefined) continue;
        ctx.beginPath();
        ctx.arc(x(index), y(value), width + 0.6, 0, 2 * Math.PI);
        ctx.fill();
      }
    };
    const highlighted = selectedYear();
    const others = [...series].filter(([year]) => year !== highlighted);
    ctx.strokeStyle = ctx.fillStyle = color('--metric');
    ctx.lineJoin = 'round';
    for (const [index, [, months]] of others.entries()) {
      line(months, 1.25, 0.16 + 0.34 * (others.length > 1 ? index / (others.length - 1) : 1));
    }
    const chosen = series.get(highlighted);
    if (chosen) {
      line(chosen, 2.4, 1);
      for (const [index, value] of chosen.entries()) {
        if (value === undefined) continue;
        const active = index === month;
        ctx.beginPath();
        ctx.arc(x(index), y(value), active ? 5 : 3.2, 0, 2 * Math.PI);
        ctx.fillStyle = color('--metric');
        ctx.fill();
        ctx.lineWidth = active ? 1.6 : 2;
        ctx.strokeStyle = active ? color('--ink') : color('--surface');
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function render() {
    section.dataset.metric = metric().key;
    series = monthlyAverages(rowsByDay, metric().key, weekdays);
    const years = [...series.keys()];
    const highlighted = selectedYear();
    const current = document.createElement('li');
    current.append(swatch(''), String(highlighted));
    const rest = document.createElement('li');
    rest.append(swatch('faded'), 'Other years');
    legend.replaceChildren(current, ...(years.some((year) => year !== highlighted) ? [rest] : []));
    canvas.setAttribute('aria-label', `${metric().title} by month for ${years.length} ${years.length === 1 ? 'year' : 'years'}, ${highlighted} highlighted. Use the left and right arrows to move between months and the up and down arrows to change years.`);
    describe();
    draw();
  }

  function pick(event, chooseYear) {
    if (!plot) return;
    const bounds = canvas.getBoundingClientRect();
    const index = Math.max(0, Math.min(11, Math.floor((event.clientX - bounds.left - plot.left) / plot.spacing)));
    const pointerY = event.clientY - bounds.top;
    const changed = index !== month;
    month = index;
    if (chooseYear) {
      let nearest;
      let distance = 18;
      for (const [year, months] of series) {
        if (months[month] === undefined) continue;
        const gap = Math.abs(plot.y(months[month]) - pointerY);
        if (gap < distance) [nearest, distance] = [year, gap];
      }
      if (nearest !== undefined && nearest !== selectedYear()) {
        yearSelect.value = nearest;
        render();
        return;
      }
    }
    if (changed) {
      describe();
      draw();
    }
  }

  metricSelect.addEventListener('change', render);
  yearSelect.addEventListener('change', render);
  canvas.addEventListener('pointermove', (event) => { if (event.pointerType === 'mouse') pick(event, false); });
  canvas.addEventListener('click', (event) => pick(event, true));
  canvas.addEventListener('keydown', (event) => {
    const options = yearSelect.options;
    const moves = {
      ArrowLeft: () => { month = Math.max(0, month - 1); },
      ArrowRight: () => { month = Math.min(11, month + 1); },
      Home: () => { month = 0; },
      End: () => { month = 11; },
      ArrowUp: () => { yearSelect.selectedIndex = Math.max(0, yearSelect.selectedIndex - 1); },
      ArrowDown: () => { yearSelect.selectedIndex = Math.min(options.length - 1, yearSelect.selectedIndex + 1); },
    };
    if (!moves[event.key]) return;
    event.preventDefault();
    moves[event.key]();
    render();
  });
  new ResizeObserver(draw).observe(canvas);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw);
  document.fonts.ready.then(draw);

  return (selectedWeekdays) => {
    weekdays = selectedWeekdays;
    render();
  };
}
