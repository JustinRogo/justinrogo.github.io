'use strict';

(() => {
  const byId = id => document.getElementById(id);
  const easternDateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const hoursFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

  function todayInConnecticut() {
    const parts = Object.fromEntries(easternDateFormatter.formatToParts().map(part => [part.type, part.value]));
    return parseLocalDate(`${parts.year}-${parts.month}-${parts.day}`);
  }

  function readPastDate(input) {
    const date = parseLocalDate(input.value);
    if (input.validity.badInput || (input.value && (!date || date > todayInConnecticut()))) {
      return { error: 'Enter a valid date on or before today.' };
    }
    return { date };
  }

  const formatDate = date => deadlineDateFormatter.format(date);
  const dateValue = date => toIcsDate(date).replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');

  const appealDecision = byId('appeal-decision');
  const appealRating = byId('appeal-rating');
  const appealDate = byId('appeal-date');
  const launchDate = parseLocalDate('2026-09-15');

  function updateAppeal() {
    const decision = appealDecision.value;
    const reviewableDecision = ['zero', 'one', 'revoked'].includes(decision);
    const canEstimate = reviewableDecision && appealRating.value === 'yes';
    byId('appeal-rating-field').hidden = !reviewableDecision;
    byId('appeal-date-field').hidden = !canEstimate;
    appealDate.removeAttribute('aria-invalid');

    let message = 'Choose the decision you received to see your next step.';
    if (decision === 'pending') {
      message = 'The four-week window starts when you receive a decision. Contact UCPEA if you need help following up.';
    } else if (decision === 'two-plus') {
      message = 'Approval for two or more remote days falls outside the Article 16.5 internal review criteria. Contact UCPEA if you have questions about your situation.';
    } else if (reviewableDecision) {
      message = {
        '': 'Check the rating on your most recent evaluation to continue.',
        no: 'Article 16.5 requires a rating of Good or better on your most recent evaluation. Contact UCPEA about your options.',
        unknown: 'Contact UCPEA to confirm how the evaluation requirement applies to your situation.',
        yes: 'Your answers meet the Article 16.5 decision and rating criteria. File through Kuali within four weeks of receiving the decision.',
      }[appealRating.value];
    }

    if (canEstimate) {
      const { date, error } = readPastDate(appealDate);
      if (error) {
        appealDate.setAttribute('aria-invalid', 'true');
        message = error;
      } else if (date) {
        const usedLaunchDate = date < launchDate;
        const due = addCalendarDays(usedLaunchDate ? launchDate : date, 28);
        message = `Estimated filing deadline: ${formatDate(due)}.`;
        if (usedLaunchDate) message += ' This uses UCPEA’s September 15, 2026 launch date.';
        if (due < todayInConnecticut()) message += ' This date has passed. Contact UCPEA promptly to discuss your options.';
      }
    }

    byId('appeal-result').textContent = message;
  }

  appealDecision.addEventListener('change', updateAppeal);
  appealRating.addEventListener('change', updateAppeal);
  appealDate.addEventListener('input', updateAppeal);
  updateAppeal();
  byId('appeal-check').hidden = false;

  const auditDate = byId('audit-date');
  auditDate.addEventListener('input', () => {
    const { date, error } = readPastDate(auditDate);
    if (error) auditDate.setAttribute('aria-invalid', 'true');
    else auditDate.removeAttribute('aria-invalid');
    byId('audit-result').textContent = error || (date
      ? `Estimated written result due: ${formatDate(addCalendarDays(date, 84))}.`
      : 'Use the date on HR’s confirmation of receipt.');
  });
  byId('audit-date-field').hidden = false;

  function readAnyDate(input) {
    const date = parseLocalDate(input.value);
    if (input.validity.badInput || (input.value && !date)) return { error: 'Enter a valid date.' };
    return { date };
  }

  function addMonths(date, months) {
    const result = new Date(date);
    const day = result.getDate();
    result.setDate(1);
    result.setMonth(result.getMonth() + months);
    const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(day, lastDay));
    return result;
  }

  const disciplineStage = byId('discipline-stage');
  const disciplineDate = byId('discipline-date');
  const disciplineStages = {
    interview: {
      message: 'You have the right to union representation at this interview (Article 22.3(a)). Contact a steward before the meeting. Going without one requires a written waiver.',
    },
    leave: {
      message: 'Paid administrative leave is part of the disciplinary process but isn’t discipline (Article 22.3(d)). You can’t be suspended without pay until after a hearing. Contact UCPEA now, before any interview or hearing is scheduled.',
    },
    hearing: {
      label: 'Date of the hearing (optional)',
      anyDate: true,
      message: 'You must get at least 15 calendar days’ written notice with the date, time, place, and specific charges. Union representation is an entitlement, and you can call witnesses. Attend the hearing: missing it without a legitimate reason means immediate termination under Article 22.3(b).',
    },
    warning: {
      label: 'Date you received it (optional)',
      grievance: true,
      message: 'You can write a rebuttal for your personnel file (Article 19.5) and ask UCPEA whether to file a grievance. Later, you can ask to have the letter removed: after 12 months for a warning or 24 months for a reprimand, if you have no further discipline.',
    },
    decision: {
      label: 'Date you received the decision (optional)',
      grievance: true,
      message: 'Suspension without pay, a withheld performance increase, demotion, and dismissal can be appealed to arbitration (Article 22.3(e)). Contact UCPEA right away.',
    },
  };

  function updateDiscipline() {
    const stage = disciplineStages[disciplineStage.value];
    byId('discipline-date-field').hidden = !stage?.label;
    if (stage?.label) byId('discipline-date-label').textContent = stage.label;
    disciplineDate.removeAttribute('aria-invalid');

    let message = stage?.message ?? 'Choose what you received to see your rights at that stage.';
    if (stage?.label && disciplineDate.value) {
      const { date, error } = stage.anyDate ? readAnyDate(disciplineDate) : readPastDate(disciplineDate);
      if (error) {
        disciplineDate.setAttribute('aria-invalid', 'true');
        message = error;
      } else if (stage.anyDate) {
        message += ` The written decision is due by ${formatDate(addCalendarDays(date, 15))}.`;
      } else {
        const due = addCalendarDays(date, 35);
        message += ` Estimated grievance deadline: ${formatDate(due)}, 35 calendar days after the event (Article 23.2). Ask UCPEA to confirm the date.`;
        if (due < todayInConnecticut()) {
          message += ' That date has passed. If you were on leave or didn’t know about the event, you may have 14 days after returning to work, so contact UCPEA now.';
        }
      }
    }
    byId('discipline-result').textContent = message;
  }

  disciplineStage.addEventListener('change', () => {
    disciplineDate.value = '';
    updateDiscipline();
  });
  disciplineDate.addEventListener('input', updateDiscipline);
  updateDiscipline();
  byId('discipline-check').hidden = false;

  const removalType = byId('removal-type');
  const removalDate = byId('removal-date');
  const removalReminder = byId('removal-reminder');
  let removalURL;

  function updateRemoval() {
    if (removalURL) URL.revokeObjectURL(removalURL);
    removalURL = undefined;
    removalReminder.hidden = true;
    removalDate.removeAttribute('aria-invalid');

    const months = { warning: 12, reprimand: 24 }[removalType.value];
    const letter = removalType.value === 'warning' ? 'letter of warning' : 'letter of reprimand';
    const { date, error } = readPastDate(removalDate);
    let message = 'Choose the type of letter and enter its date.';
    if (error) {
      removalDate.setAttribute('aria-invalid', 'true');
      message = error;
    } else if (months && date) {
      const eligible = addMonths(date, months);
      if (eligible <= todayInConnecticut()) {
        message = `${months} months have passed. If you’ve had no further discipline since ${formatDate(date)}, you can ask to have the ${letter} removed now.`;
      } else {
        message = `You can ask to have the ${letter} removed on or after ${formatDate(eligible)}, if you have no further discipline before then.`;
        removalURL = URL.createObjectURL(buildCalendarFile([{
          date: eligible,
          uid: `ucpea-file-removal-${removalType.value}-${dateValue(date)}`,
          title: `Request removal of UCPEA ${letter}`,
          description: 'Article 19.6: if you have had no further discipline, request removal in writing. Ask UCPEA about the current process.',
        }]));
        removalReminder.href = removalURL;
        removalReminder.hidden = false;
      }
    } else if (months) {
      message = 'Enter the date on the letter.';
    }
    byId('removal-result').textContent = message;
  }

  removalType.addEventListener('change', updateRemoval);
  removalDate.addEventListener('input', updateRemoval);
  updateRemoval();
  byId('removal-check').hidden = false;

  const storageKey = 'ucpea-dashboard-holiday-time-v1';
  const transitionStart = '2026-08-21';
  const transitionEnd = parseLocalDate('2027-08-21');
  const form = byId('holiday-form');
  const earned = byId('holiday-earned');
  const hours = byId('holiday-hours');
  const submit = byId('holiday-submit');
  const cancel = byId('holiday-cancel');
  const remember = byId('holiday-remember');
  const errorBox = byId('holiday-error');
  const storageHelp = byId('holiday-storage-help');
  const list = byId('holiday-entries');
  const empty = byId('holiday-empty');
  const clear = byId('holiday-clear');
  const status = byId('holiday-status');
  const template = byId('holiday-entry');
  let entries = [];
  let editingId;
  let reminderURLs = [];
  let lastRenderedDate;

  function validHours(value) {
    return Number.isFinite(value) && value > 0 &&
      Number.isSafeInteger(Math.round(value * 100)) && Math.round(value * 100) / 100 === value;
  }

  function readEntries(saved) {
    const stored = JSON.parse(saved);
    if (!Array.isArray(stored)) throw new Error('Invalid saved holiday time');
    const seen = new Set();
    return stored.filter(entry => {
      if (!entry || typeof entry.id !== 'string' || !/^[a-f0-9-]{36}$/.test(entry.id) ||
          seen.has(entry.id) || typeof entry.earned !== 'string' || !parseLocalDate(entry.earned) ||
          !validHours(entry.hours)) return false;
      seen.add(entry.id);
      return true;
    });
  }

  function saveEntries() {
    if (!remember.checked) return false;
    try {
      localStorage.setItem(storageKey, JSON.stringify(entries));
      storageHelp.textContent = 'Entries are saved on this browser. Turn off this option to remove the saved copy.';
      return true;
    } catch {
      storageHelp.textContent = 'This browser could not save your latest changes. You can continue tracking time on this page.';
      return false;
    }
  }

  function expiration(entry) {
    if (entry.earned < transitionStart) return { date: transitionEnd, transition: true };
    const date = parseLocalDate(entry.earned);
    const planningDate = addCalendarDays(date, 365);
    const anniversary = new Date(date);
    anniversary.setFullYear(date.getFullYear() + 1);
    if (anniversary.getMonth() !== date.getMonth()) anniversary.setDate(0);
    return { date: planningDate, alternate: anniversary.getTime() === planningDate.getTime() ? null : anniversary };
  }

  function setError(message = '') {
    errorBox.textContent = message;
    errorBox.hidden = !message;
  }

  function resetForm() {
    editingId = undefined;
    form.reset();
    submit.textContent = 'Add time';
    cancel.hidden = true;
    earned.removeAttribute('aria-invalid');
    hours.removeAttribute('aria-invalid');
    setError();
  }

  for (const field of [earned, hours]) {
    field.addEventListener('input', () => {
      field.removeAttribute('aria-invalid');
      setError();
    });
  }

  function editEntry(entry) {
    resetForm();
    editingId = entry.id;
    earned.value = entry.earned;
    hours.value = entry.hours;
    submit.textContent = 'Save changes';
    cancel.hidden = false;
    earned.focus();
  }

  function renderEntries() {
    reminderURLs.forEach(url => URL.revokeObjectURL(url));
    reminderURLs = [];
    const today = todayInConnecticut();
    lastRenderedDate = today.getTime();
    const upcoming = addCalendarDays(today, 30);
    const sorted = entries.map(entry => ({ entry, ...expiration(entry) }))
      .sort((left, right) => left.date - right.date || left.entry.earned.localeCompare(right.entry.earned));

    list.replaceChildren(...sorted.map(({ entry, date, alternate, transition }, index) => {
      const row = template.content.firstElementChild.cloneNode(true);
      const earnedLabel = formatDate(parseLocalDate(entry.earned));
      const expirationLabel = row.querySelector('time');
      expirationLabel.dateTime = dateValue(date);
      expirationLabel.textContent = formatDate(date);
      const dueStatus = row.querySelector('.holiday-expiration-status');
      if (date < today) {
        dueStatus.textContent = 'Expired';
      } else if (date <= upcoming) {
        dueStatus.textContent = date.getTime() === today.getTime() ? 'Last day to use' : 'Use within 30 days';
        dueStatus.classList.add('is-due');
      } else {
        dueStatus.textContent = 'Use by date';
      }
      row.querySelector('strong').textContent = `${hoursFormatter.format(entry.hours)} h`;
      row.querySelector('.holiday-entry__hours span').textContent = `Earned ${earnedLabel}`;
      const note = row.querySelector('.holiday-entry__note');
      if (transition) {
        note.textContent = 'UCPEA payroll transition date';
      } else if (alternate) {
        note.textContent = `The UCPEA FAQ’s one-year date is ${formatDate(alternate)}. Confirm your expiration date in payroll.`;
      } else {
        note.hidden = true;
      }

      const [reminder, edit, remove] = row.querySelector('.holiday-entry__actions').children;
      const reminderDate = alternate && alternate < date ? alternate : date;
      const url = URL.createObjectURL(buildCalendarFile([{
        date: reminderDate,
        uid: `ucpea-holiday-${entry.id}`,
        title: 'UCPEA holiday time use-by date',
        description: 'Confirm your holiday time expiration in payroll.',
        reminderDays: 7,
      }]));
      reminderURLs.push(url);
      reminder.href = url;
      reminder.setAttribute('aria-label', `Save calendar reminder for time earned ${earnedLabel}`);
      edit.setAttribute('aria-label', `Edit time earned ${earnedLabel}`);
      edit.addEventListener('click', () => editEntry(entry));
      remove.setAttribute('aria-label', `Remove time earned ${earnedLabel}`);
      remove.addEventListener('click', () => {
        entries = entries.filter(item => item.id !== entry.id);
        if (editingId === entry.id) resetForm();
        saveEntries();
        renderEntries();
        status.textContent = `Removed holiday time earned ${earnedLabel}.`;
        const nextRow = list.children[Math.min(index, list.children.length - 1)];
        (nextRow?.querySelector('button:last-child') ?? earned).focus();
      });
      return row;
    }));

    empty.hidden = entries.length > 0;
    clear.hidden = entries.length === 0;
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const { date, error } = readPastDate(earned);
    const enteredHours = hours.valueAsNumber;
    earned.removeAttribute('aria-invalid');
    hours.removeAttribute('aria-invalid');
    if (!date || error) {
      setError(error || 'Enter the date you earned the time.');
      earned.setAttribute('aria-invalid', 'true');
      earned.focus();
      return;
    }
    if (!validHours(enteredHours)) {
      setError('Enter hours earned greater than zero, with up to two decimal places.');
      hours.setAttribute('aria-invalid', 'true');
      hours.focus();
      return;
    }
    const entry = { id: editingId ?? crypto.randomUUID(), earned: earned.value, hours: enteredHours };
    status.textContent = `${editingId ? 'Updated' : 'Added'} holiday time earned ${formatDate(date)}.`;
    entries = editingId ? entries.map(item => item.id === editingId ? entry : item) : [...entries, entry];
    resetForm();
    saveEntries();
    renderEntries();
    earned.focus();
  });

  cancel.addEventListener('click', () => {
    resetForm();
    earned.focus();
  });

  clear.addEventListener('click', () => {
    entries = [];
    resetForm();
    saveEntries();
    renderEntries();
    status.textContent = 'Cleared all holiday time entries.';
    earned.focus();
  });

  remember.addEventListener('change', () => {
    if (remember.checked) {
      if (!saveEntries()) remember.checked = false;
      return;
    }
    try {
      localStorage.removeItem(storageKey);
      storageHelp.textContent = 'The saved copy was removed. Current entries will clear when you reload or close this page.';
    } catch {
      remember.checked = true;
      storageHelp.textContent = 'This browser could not remove the saved copy. Use your browser’s site data settings to clear it.';
    }
  });

  window.addEventListener('storage', event => {
    if ((event.key !== storageKey && event.key !== null) || !remember.checked) return;
    if (event.newValue === null) {
      remember.checked = false;
      storageHelp.textContent = 'Saving was turned off in another tab. Current entries are temporary.';
    } else {
      try {
        entries = readEntries(event.newValue);
        if (editingId && !entries.some(entry => entry.id === editingId)) resetForm();
        renderEntries();
        status.textContent = 'Updated holiday time from another tab.';
      } catch {
        storageHelp.textContent = 'Saved entries could not be read. You can continue tracking time on this page.';
      }
    }
  });

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) {
      entries = readEntries(saved);
      remember.checked = true;
      storageHelp.textContent = 'Entries are saved on this browser. Turn off this option to remove the saved copy.';
    }
  } catch {
    storageHelp.textContent = 'Saved entries could not be read. You can continue tracking time on this page.';
  }

  renderEntries();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && todayInConnecticut().getTime() !== lastRenderedDate) renderEntries();
  });
  byId('holiday-tracker').hidden = false;
})();
