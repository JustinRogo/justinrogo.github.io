const dayOrder = [1, 2, 3, 4, 5, 6, 0];
const monthName = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });

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

export function initSummaryViews({ rowsByDay, metrics, dayMs, weekdayNames, fullDate }) {
  const weekMetric = document.getElementById('typical-metric');
  const week = document.getElementById('typical-week');
  const weekDetail = document.getElementById('typical-detail');
  const heatMetric = document.getElementById('heat-metric');
  const heatYear = document.getElementById('heat-year');
  const heatGrid = document.getElementById('heat-grid');
  const heatScroll = document.getElementById('heat-scroll');
  const heatDetail = document.getElementById('heat-detail');
  const metricsByKey = new Map(metrics.map((metric) => [metric.key, metric]));
  const dates = Array.from(rowsByDay.keys());
  const latestDate = dates.at(-1);
  const firstYear = new Date(dates[0]).getUTCFullYear();
  const latestYear = new Date(latestDate).getUTCFullYear();
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
    const start = Date.UTC(year, 0, 1);
    const end = Date.UTC(year + 1, 0, 1);
    const datesInYear = Array.from({ length: (end - start) / dayMs }, (_, index) => start + index * dayMs);
    const positives = datesInYear.map((time) => rowsByDay.get(time)?.[metric.key]).filter((value) => value > 0).sort((a, b) => a - b);
    const breaks = positives.length ? [0.25, 0.5, 0.75].map((fraction) => quantile(positives, fraction)) : [];
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
      const button = textElement('button', 'heat-day', '');
      button.type = 'button';
      button.style.gridArea = `${position % 7 + 2} / ${column}`;
      button.dataset.level = !included ? 'filtered'
        : value === undefined ? 'missing' : value === 0 ? 'zero'
          : 1 + breaks.filter((limit) => value > limit).length;
      button.title = `${fullDate.format(time)} · ${label}`;
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
    if (initial || changed) renderHeatmap({ reveal: initial });
  };
}
