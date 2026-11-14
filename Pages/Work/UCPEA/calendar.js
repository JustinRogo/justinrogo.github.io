'use strict';

(() => {
  if (typeof UCPEACalendarData === 'undefined') return;
  const data = UCPEACalendarData;
  const monthHeading = document.getElementById('calendar-month');
  const monthView = document.getElementById('calendar-month-view');
  const agendaView = document.getElementById('calendar-agenda');
  const previous = document.getElementById('calendar-previous');
  const next = document.getElementById('calendar-next');
  const dialog = document.getElementById('calendar-event-dialog');
  const todayCard = document.getElementById('hero-today-card');
  const timeZone = 'America/New_York';
  const easternDate = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const dayLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
  const timeLabel = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone });
  const eventDateLabel = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone: 'UTC' });
  const eventDateTimeLabel = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone });
  let today = dateKey(easternDate, new Date());
  let currentMonth = today.slice(0, 7);
  let selectedMonth = currentMonth;

  function dateKey(formatter, date) {
    const parts = Object.fromEntries(formatter.formatToParts(date).map(({ type, value }) => [type, value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function timeRange(start, end) {
    return end > start ? timeLabel.formatRange(start, end) : timeLabel.format(start);
  }

  function eventWhen(event, day) {
    if (event.start) {
      const start = new Date(event.start);
      const end = new Date(event.end);
      const startDay = dateKey(easternDate, start);
      if (startDay !== dateKey(easternDate, end)) {
        return `${eventDateTimeLabel.formatRange(start, end)} Eastern time`;
      }
      const date = eventDateLabel.format(new Date(startDay + 'T00:00:00Z'));
      return `${date} · ${timeRange(start, end)} Eastern time`;
    }
    const first = new Date((event.firstDay || day) + 'T00:00:00Z');
    const last = new Date((event.lastDay || day) + 'T00:00:00Z');
    return `${eventDateLabel.formatRange(first, last)} · All day`;
  }

  function showEvent(event, day, trigger) {
    const details = data.details?.[event.details] || {};
    document.getElementById('calendar-event-title').textContent = event.title;
    document.getElementById('calendar-event-when').textContent = eventWhen(event, day);

    document.getElementById('calendar-event-location').textContent = details.location || '';
    document.getElementById('calendar-location').hidden = !details.location;
    const description = document.getElementById('calendar-event-description');
    // The snapshot generator sanitizes this HTML before publishing it.
    description.innerHTML = details.description || '';
    description.hidden = !details.description;

    const attachments = (details.attachments || []).map(attachment => {
      const item = element('li');
      const link = element('a', '', attachment.title);
      link.href = attachment.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      item.append(link);
      return item;
    });
    document.getElementById('calendar-event-attachments').replaceChildren(...attachments);
    document.getElementById('calendar-attachments').hidden = !attachments.length;

    trigger.focus({ preventScroll: true });
    dialog.showModal();
  }

  function eventList(events, day, detailedTime = false) {
    const list = element('ul', 'calendar-events');
    for (const event of events) {
      const item = element('li');
      const button = element('button', 'calendar-event-button');
      button.type = 'button';
      button.setAttribute('aria-haspopup', 'dialog');
      if (event.start) {
        const start = new Date(event.start);
        const end = new Date(event.end);
        const label = detailedTime ? timeRange(start, end) : timeLabel.format(start);
        const time = element('time', 'calendar-event-time', label);
        time.dateTime = event.start;
        button.append(time);
      } else if (detailedTime) {
        button.append(element('span', 'calendar-event-time', 'All day'));
      }
      button.append(element('span', 'calendar-event-title', event.title));
      button.addEventListener('click', () => showEvent(event, day, button));
      item.append(button);
      list.append(item);
    }
    return list;
  }

  function renderMonth(firstDate, monthDays) {
    const table = element('table', 'calendar-grid');
    table.setAttribute('aria-labelledby', 'calendar-month');
    const headingRow = table.createTHead().insertRow();
    for (const day of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
      const heading = element('th', '', day);
      heading.scope = 'col';
      headingRow.append(heading);
    }
    const body = table.createTBody();
    const firstWeekday = firstDate.getUTCDay();
    for (let week = 0; week * 7 < firstWeekday + monthDays.length; week++) {
      const row = body.insertRow();
      for (let weekday = 0; weekday < 7; weekday++) {
        const cell = row.insertCell();
        const day = monthDays[week * 7 + weekday - firstWeekday];
        if (!day) {
          cell.className = 'calendar-outside-month';
          continue;
        }
        const date = element('time', 'calendar-day', String(day.date.getUTCDate()));
        date.dateTime = day.key;
        if (day.key === today) date.setAttribute('aria-current', 'date');
        cell.append(date);
        if (day.events.length) cell.append(eventList(day.events, day.key));
      }
    }
    monthView.replaceChildren(table);
  }

  // On phones the current month opens on what's coming up: earlier days and
  // anything past the next three event days fold away behind one button.
  const expandButton = document.getElementById('calendar-expand');
  let agendaExpanded = false;

  function renderAgenda(monthDays) {
    const groups = element('ul', 'calendar-agenda-days');
    const eventDays = monthDays.filter(day => day.events.length);
    const upcoming = eventDays.filter(day => day.key >= today);
    const folding = selectedMonth === currentMonth && upcoming.length > 0;
    const shown = new Set(upcoming.slice(0, 3));
    for (const day of eventDays) {
      const group = element('li', 'calendar-agenda-day');
      if (folding && !shown.has(day)) group.dataset.folded = '';
      const heading = element('h4');
      const date = element('time', '', dayLabel.format(day.date));
      date.dateTime = day.key;
      if (day.key === today) date.setAttribute('aria-current', 'date');
      heading.append(date);
      group.append(heading, eventList(day.events, day.key, true));
      groups.append(group);
    }
    agendaView.replaceChildren(groups);
    const folded = folding && eventDays.length > shown.size;
    agendaView.classList.toggle('is-folded', folded && !agendaExpanded);
    expandButton.hidden = !folded || agendaExpanded;
    expandButton.textContent = `Show all of ${monthLabel.format(new Date(selectedMonth + '-01T00:00:00Z')).split(' ')[0]}`;
  }

  expandButton.addEventListener('click', () => {
    agendaExpanded = true;
    agendaView.classList.remove('is-folded');
    expandButton.setAttribute('aria-expanded', 'true');
    expandButton.hidden = true;
    const revealed = Array.from(agendaView.querySelectorAll('[data-folded]'));
    revealed[0]?.querySelector('button')?.focus({ preventScroll: true });
    UCPEAMotion.arrive(revealed, { y: 6, duration: 220, stagger: 18 });
  });

  // Phones: the hero names today's date, and the Today card shows the next
  // event still to come. Its row opens that event's details directly.
  const heroDate = document.getElementById('hero-date');
  const heroDateLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone });
  const nextRow = document.getElementById('home-next');
  let nextEvent = null;

  function upcomingEvent() {
    const now = Date.now();
    const days = Object.keys(data.days).filter(key => key >= today).sort();
    for (const day of days) {
      const event = data.days[day].find(item => day > today || !item.end || new Date(item.end).getTime() > now);
      if (event) return { event, day, count: data.days[day].length };
    }
    return null;
  }

  function renderNext() {
    heroDate.dateTime = today;
    heroDate.textContent = heroDateLabel.format(new Date());
    heroDate.hidden = false;
    nextEvent = upcomingEvent();
    if (!nextRow || !nextEvent) return;
    const { event, day, count } = nextEvent;
    const tomorrow = dateKey(easternDate, new Date(new Date(today + 'T12:00:00Z').getTime() + 86_400_000));
    const dayName = day === today ? 'Today' : day === tomorrow ? 'Tomorrow' : dayLabel.format(new Date(day + 'T00:00:00Z'));
    const time = event.start ? timeLabel.format(new Date(event.start)) : 'All day';
    const more = count > 1 ? ` · ${count - 1} more` : '';
    document.getElementById('home-next-when').textContent = `${dayName} · ${time}${more}`;
    document.getElementById('home-next-title').textContent = event.title;
    nextRow.setAttribute('aria-haspopup', 'dialog');
  }

  nextRow?.addEventListener('click', event => {
    if (!nextEvent || !UCPEAViews.isPlainClick(event, nextRow)) return;
    event.preventDefault();
    showEvent(nextEvent.event, nextEvent.day, nextRow);
  });

  function render() {
    const firstDate = new Date(selectedMonth + '-01T00:00:00Z');
    const dayCount = new Date(Date.UTC(firstDate.getUTCFullYear(), firstDate.getUTCMonth() + 1, 0)).getUTCDate();
    const monthDays = Array.from({ length: dayCount }, (_, index) => {
      const key = selectedMonth + '-' + String(index + 1).padStart(2, '0');
      return { key, date: new Date(key + 'T00:00:00Z'), events: data.days[key] || [] };
    });
    monthHeading.textContent = monthLabel.format(firstDate);
    previous.disabled = selectedMonth <= data.firstMonth && selectedMonth <= currentMonth;
    next.disabled = selectedMonth >= data.lastMonth && selectedMonth >= currentMonth;
    document.getElementById('calendar-empty').hidden = monthDays.some(day => day.events.length);
    renderMonth(firstDate, monthDays);
    renderAgenda(monthDays);
  }

  function shiftMonth(offset) {
    const month = new Date(selectedMonth + '-01T00:00:00Z');
    month.setUTCMonth(month.getUTCMonth() + offset);
    selectedMonth = month.toISOString().slice(0, 7);
    render();
    slideMonth(offset);
  }

  // The new month slides in from the side you moved toward.
  function slideMonth(direction) {
    if (!direction) return;
    UCPEAMotion.arrive([monthHeading, monthView, agendaView], { x: 14 * Math.sign(direction), y: 0, duration: 240 });
  }

  function renderToday() {
    const events = data.days[today] || [];
    todayCard.hidden = !events.length;
    const date = document.getElementById('hero-today-date');
    date.dateTime = today;
    date.textContent = dayLabel.format(new Date(today + 'T00:00:00Z'));
    document.getElementById('hero-today-events').replaceChildren(eventList(events, today, true));
  }

  function updateToday() {
    const day = dateKey(easternDate, new Date());
    if (day === today || dialog.open) return;
    const followingCurrentMonth = selectedMonth === currentMonth;
    today = day;
    currentMonth = today.slice(0, 7);
    if (followingCurrentMonth) selectedMonth = currentMonth;
    render();
    renderToday();
    renderNext();
  }

  previous.addEventListener('click', () => shiftMonth(-1));
  next.addEventListener('click', () => shiftMonth(1));
  function showCurrentMonth() {
    const direction = currentMonth.localeCompare(selectedMonth);
    selectedMonth = currentMonth;
    render();
    slideMonth(direction);
  }
  document.getElementById('calendar-today').addEventListener('click', showCurrentMonth);
  document.getElementById('hero-today-link').addEventListener('click', event => {
    if (UCPEAViews.isPlainClick(event, event.currentTarget)) showCurrentMonth();
  });
  dialog.addEventListener('close', updateToday);
  document.addEventListener('visibilitychange', updateToday);
  setInterval(updateToday, 60_000);

  const updated = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone }).format(new Date(data.updatedAt));
  const sync = document.getElementById('calendar-sync');
  sync.textContent = `Eastern time · Synced ${updated}`;
  sync.hidden = false;
  render();
  renderToday();
  renderNext();
  document.getElementById('calendar-unavailable').hidden = true;
  document.getElementById('calendar-content').hidden = false;
})();
