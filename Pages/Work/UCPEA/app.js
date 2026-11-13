'use strict';

// Motion only answers something the person just did. Content is visible by
// default, so a skipped or failed animation never hides anything.
const UCPEAMotion = (() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const easeOut = 'cubic-bezier(0.16, 1, 0.3, 1)';

  // Fade new content in, drifting from (x, y). With reduced motion it only fades.
  function arrive(elements, { x = 0, y = 8, duration = 240, stagger = 0 } = {}) {
    if (document.hidden || !Element.prototype.animate) return;
    const calm = reducedMotion.matches;
    [elements].flat().filter(element => element && !element.hidden).forEach((element, index) => {
      element.getAnimations().filter(animation => animation.id === 'ucpea-arrive').forEach(animation => animation.cancel());
      element.animate([
        { opacity: 0, transform: calm ? 'none' : `translate(${x}px, ${y}px)` },
        { opacity: 1, transform: 'none' },
      ], {
        id: 'ucpea-arrive',
        duration: calm ? 160 : duration,
        delay: calm ? 0 : Math.min(index * stagger, 120),
        easing: easeOut,
        fill: 'backwards',
      });
    });
  }

  // Run a DOM change inside a view transition, tagging <html> so CSS can style it.
  function transition(kind, update) {
    const root = document.documentElement;
    if (!document.startViewTransition || document.hidden) {
      update();
      return null;
    }
    root.dataset.transition = kind;
    const viewTransition = document.startViewTransition(update);
    viewTransition.finished.finally(() => {
      if (root.dataset.transition === kind) delete root.dataset.transition;
    });
    return viewTransition;
  }

  return {
    arrive,
    transition,
    get reduced() { return reducedMotion.matches; },
  };
})();

const themeToggle = document.getElementById('theme-toggle');
const themeColor = document.querySelector('meta[name="theme-color"]');

function setTheme(theme, persist = true) {
  document.documentElement.dataset.theme = theme;
  themeColor.content = getComputedStyle(document.documentElement).getPropertyValue('--ucpea-surface').trim();
  UCPEAViews.messageTo(document.querySelector('#tool-view iframe')?.contentWindow, 'theme', { theme });

  if (themeToggle) {
    const isDark = theme === 'dark';
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
    themeToggle.title = `Switch to ${isDark ? 'light' : 'dark'} mode`;
  }

  if (persist) {
    try {
      localStorage.setItem('ucpea-dashboard-theme', theme);
    } catch (error) {
      // Theme persistence is optional.
    }
  }
}

setTheme(document.documentElement.dataset.theme || 'light', false);

themeToggle?.addEventListener('click', () => {
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});

function initDashboardNavigation() {
  const { body, documentElement } = document;
  const topbar = document.querySelector('.site-header');
  const sidebar = document.getElementById('dashboard-sidebar');
  const menuToggle = document.getElementById('menu-toggle');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const resourcesToggle = document.getElementById('resources-toggle');
  const resources = document.getElementById('member-resources');
  const dockHome = document.getElementById('dock-home');
  const dockContract = document.getElementById('dock-contract');
  const main = document.getElementById('main-content');
  const footer = document.querySelector('.site-footer');
  const toolView = document.getElementById('tool-view');
  const headerContext = document.querySelector('.header-context');
  const localViews = new Map(Array.from(main.querySelectorAll('[data-dashboard-view]'), element => [
    element.id,
    {
      element,
      title: element.querySelector('h1').textContent,
      dockLink: document.querySelector(`.mobile-dock a[href="index.html?view=${element.id}"]`),
      guides: Array.from(element.querySelectorAll('[data-view-guide]')),
      guideLinks: Array.from(element.querySelectorAll('.guide-index a')),
      defaultGuide: element.querySelector('[data-default-guide]'),
    },
  ]));
  const links = Array.from(sidebar.querySelectorAll('.primary-nav a[href^="index.html#"]'));
  const toolLinks = Array.from(sidebar.querySelectorAll('.primary-nav a[href^="index.html?view="]'));
  const sections = links.map(link => document.getElementById(link.hash.slice(1)));
  const mobileLayout = window.matchMedia('(max-width: 800px)');
  const dashboardTitle = document.title;
  const dashboardPath = UCPEAViews.dashboardURL().pathname;
  let frame;
  let activeView = '';
  let frameHash = '';

  function setOpenMenu(menu) {
    if (menu) body.dataset.menuOpen = menu;
    else delete body.dataset.menuOpen;

    const navigationOpen = menu === 'navigation';
    const resourcesOpen = menu === 'resources';
    menuToggle.setAttribute('aria-expanded', String(navigationOpen));
    menuToggle.setAttribute('aria-label', navigationOpen ? 'Close navigation' : 'Open navigation');
    resourcesToggle.setAttribute('aria-expanded', String(resourcesOpen));
    main.inert = Boolean(menu);
    footer.inert = Boolean(menu);
  }

  menuToggle.addEventListener('click', () => {
    const open = body.dataset.menuOpen !== 'navigation';
    setOpenMenu(open ? 'navigation' : '');
    if (open) sidebar.querySelector('[aria-current]')?.focus();
  });

  resourcesToggle.addEventListener('click', () => {
    const open = body.dataset.menuOpen !== 'resources';
    setOpenMenu(open ? 'resources' : '');
    if (open) {
      resources.open = true;
      resources.querySelector('a').focus();
    }
  });

  sidebarToggle.addEventListener('click', () => {
    const compact = body.dataset.sidebar !== 'compact';
    const label = compact ? 'Expand sidebar' : 'Collapse sidebar';
    body.dataset.sidebar = compact ? 'compact' : 'expanded';
    sidebarToggle.setAttribute('aria-label', label);
    sidebarToggle.title = label;
  });

  mobileLayout.addEventListener('change', () => setOpenMenu(''));

  document.addEventListener('keydown', event => {
    const menu = body.dataset.menuOpen;
    if (event.key === 'Escape' && menu) {
      event.preventDefault();
      setOpenMenu('');
      (menu === 'resources' ? resourcesToggle : menuToggle).focus();
    }
  });

  function closeMenuOutside(event) {
    const menu = body.dataset.menuOpen;
    if (menu && !sidebar.contains(event.target) &&
        !menuToggle.contains(event.target) && !resourcesToggle.contains(event.target)) {
      setOpenMenu('');
      if (event.type === 'click' && event.target === body) {
        (menu === 'resources' ? resourcesToggle : menuToggle).focus();
      }
    }
  }

  document.addEventListener('click', closeMenuOutside);
  document.addEventListener('focusin', closeMenuOutside);

  let activeLink = links[0];
  let pendingFrame;

  function setActiveLink(link, state) {
    activeLink?.removeAttribute('aria-current');
    link?.setAttribute('aria-current', state);
    activeLink = link;
  }

  function updateCurrentSection() {
    pendingFrame = undefined;
    if (activeView) return;
    const threshold = topbar.offsetHeight + 2;
    const atBottom = window.scrollY > 0 &&
      window.scrollY + window.innerHeight >= documentElement.scrollHeight - 2;
    const index = atBottom
      ? links.length - 1
      : sections.findLastIndex(section => section.getBoundingClientRect().top <= threshold);
    const currentLink = links[Math.max(0, index)];

    if (currentLink !== activeLink) setActiveLink(currentLink, 'location');
  }

  function scheduleSectionUpdate() {
    pendingFrame ??= window.requestAnimationFrame(updateCurrentSection);
  }

  function isDashboardView(key) {
    return localViews.has(key) || Object.hasOwn(UCPEAViews.views, key);
  }

  // My Rights and Benefits became one Rights & Benefits page. Old links and
  // bookmarks still work: they open the same guide on the combined page.
  const renamedViews = { 'my-rights': 'rights-benefits', benefits: 'rights-benefits' };

  function readDestination(url) {
    const key = url.searchParams.get('view');
    const target = document.getElementById(url.hash.slice(1));
    if (Object.hasOwn(renamedViews, key)) return { key: renamedViews[key], hash: url.hash, legacyLink: true };
    if (!key && url.hash === '#updates') return { key: 'union-wire', hash: '', legacyLink: true };
    if (!key && url.hash === '#deadlines') {
      const hash = url.searchParams.get('benefit') === 'childcare' ? '#benefit-childcare' : '#deadlines';
      return { key: 'rights-benefits', hash, legacyLink: true };
    }
    const localView = target?.closest('[data-dashboard-view]');
    if (!key && localView) {
      return { key: localView.id, hash: target === localView ? '' : url.hash, legacyLink: true };
    }
    return { key, hash: url.hash };
  }

  function showView({ focus = false, restoreScroll, scrollHome = false, animate = false } = {}) {
    const url = new URL(location.href);
    const { key, hash, legacyLink } = readDestination(url);
    if (legacyLink) {
      url.searchParams.set('view', key);
      url.searchParams.delete('benefit');
      url.hash = hash;
      history.replaceState(history.state, '', url);
    }

    const tool = Object.hasOwn(UCPEAViews.views, key) ? UCPEAViews.views[key] : null;
    const localView = localViews.get(key);
    const previousView = activeView;
    activeView = tool || localView ? key : '';
    body.toggleAttribute('data-tool-view', Boolean(tool));
    body.toggleAttribute('data-local-view', Boolean(localView));
    toolView.hidden = !tool;
    for (const view of localViews.values()) {
      view.element.hidden = view !== localView;
      view.dockLink?.setAttribute('aria-current', view === localView ? 'page' : 'false');
    }
    dockHome.setAttribute('aria-current', activeView ? 'false' : 'page');
    dockContract.setAttribute('aria-current', activeView === 'current-contract' ? 'page' : 'false');

    const title = tool?.title ?? localView?.title;
    document.title = title ? title + ' | ' + dashboardTitle : dashboardTitle;
    headerContext.textContent = title || 'Member dashboard';
    if (activeView && activeView !== previousView) {
      const link = toolLinks.find(item => new URL(item.href).searchParams.get('view') === key);
      setActiveLink(link, 'page');
    }

    if (!tool && frame) {
      toolView.replaceChildren();
      frame = undefined;
      frameHash = '';
    }

    let focusTarget = main;
    if (tool) {
      if (key !== previousView || (!hash && frameHash)) {
        const source = new URL(tool.file, location.href);
        source.searchParams.set('dashboard', documentElement.dataset.theme);
        source.hash = hash;

        const nextFrame = document.createElement('iframe');
        nextFrame.src = source.href;
        nextFrame.title = tool.title;
        nextFrame.allow = 'clipboard-write';
        nextFrame.addEventListener('load', () => {
          if (nextFrame !== frame) return;
          UCPEAViews.messageTo(frame.contentWindow, 'theme', { theme: documentElement.dataset.theme });
          UCPEAViews.messageTo(frame.contentWindow, 'show-hash', { hash: frameHash });
        });
        frame = nextFrame;
        toolView.replaceChildren(frame);
      } else if (hash !== frameHash) {
        UCPEAViews.messageTo(frame.contentWindow, 'show-hash', { hash });
      }
      frameHash = hash;
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else if (localView) {
      const target = document.getElementById(hash.slice(1));
      const selectedGuide = target?.closest('[data-view-guide]') ?? localView.defaultGuide;
      const guideOpening = Boolean(selectedGuide?.hidden);
      for (const guide of localView.guides) guide.hidden = guide !== selectedGuide;
      // A guide opening under its list on the same page settles in from just above.
      if (animate && key === previousView && guideOpening) UCPEAMotion.arrive(selectedGuide, { y: -6, duration: 220 });
      for (const link of localView.guideLinks) {
        const open = link.hash === `#${selectedGuide?.id}`;
        link.setAttribute('aria-current', open ? 'location' : 'false');
        // Without a default guide, each link toggles its guide open and closed.
        if (!localView.defaultGuide) link.setAttribute('aria-expanded', String(open));
      }
      focusTarget = target && localView.element.contains(target) && !target.closest('[hidden]')
        ? target : localView.element;
      // Guides in a labeled group (Rights & Benefits) open under their own list,
      // and the page scrolls so that group's heading sits at the top.
      const groupTitle = focusTarget === selectedGuide
        ? selectedGuide?.closest('.guide-group')?.querySelector('.guide-group-title') : null;
      // Elsewhere, switching guides on the same page keeps the page still. It
      // only scrolls when the chosen guide would otherwise be off-screen (phones).
      const switchingGuide = key === previousView && focusTarget === selectedGuide;
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (typeof restoreScroll === 'number') {
        window.scrollTo({ top: restoreScroll, behavior: 'instant' });
      } else if (groupTitle) {
        groupTitle.scrollIntoView({ block: 'start', behavior: switchingGuide && !calm ? 'smooth' : 'instant' });
      } else if (switchingGuide) {
        if (focusTarget.getBoundingClientRect().top > window.innerHeight - 96) {
          focusTarget.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
      } else if (focusTarget === localView.element || localView.defaultGuide) {
        window.scrollTo({ top: 0, behavior: 'instant' });
      } else {
        focusTarget.scrollIntoView({ behavior: 'instant' });
      }
    } else {
      focusTarget = document.getElementById(hash.slice(1)) || main;
      if (hash === '#salary-calculator') focusTarget.open = true;
      if (typeof restoreScroll === 'number') {
        window.scrollTo({ top: restoreScroll, behavior: 'instant' });
      } else if (scrollHome || previousView) {
        focusTarget.scrollIntoView({ behavior: previousView ? 'instant' : 'auto' });
      }
      scheduleSectionUpdate();
    }

    // Moving to a different view: the new page rises into place. Hash jumps
    // within the same view only scroll.
    if (animate && activeView !== previousView) {
      UCPEAMotion.arrive(tool ? toolView : localView ? localView.element : main, { y: 10, duration: 260 });
    }

    if (focus) focusTarget.focus({ preventScroll: true });
  }

  function navigate(key, hash) {
    const destination = UCPEAViews.dashboardURL(key, hash);
    if (destination.href !== location.href) {
      if ((key || '') !== activeView) {
        history.replaceState({ ...history.state, dashboardScroll: window.scrollY }, '');
      }
      history.pushState(null, '', destination);
    }
    setOpenMenu('');
    showView({ focus: true, scrollHome: true, animate: true });
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!UCPEAViews.isPlainClick(event, link)) return;
    const destination = new URL(link.href);
    if (destination.origin !== location.origin || destination.pathname !== dashboardPath) return;
    const { key, hash } = readDestination(destination);
    if (!link.getAttribute('href').startsWith('index.html') || (key && !isDashboardView(key))) return;
    event.preventDefault();
    // Selecting the open guide again closes it, where the page has no default
    // guide to fall back to. The page stays where it is.
    const localView = localViews.get(key);
    if (localView && !localView.defaultGuide && key === activeView &&
        localView.guideLinks.includes(link) && link.getAttribute('aria-current') === 'location') {
      history.pushState(null, '', UCPEAViews.dashboardURL(key));
      showView({ restoreScroll: window.scrollY });
      return;
    }
    navigate(key, hash);
  });

  document.querySelector('.skip-link').addEventListener('click', event => {
    if (!frame) return;
    event.preventDefault();
    frame.focus();
  });

  window.addEventListener('popstate', event => {
    setOpenMenu('');
    showView({ restoreScroll: event.state?.dashboardScroll, animate: true });
  });

  window.addEventListener('hashchange', () => {
    // Native fragment links can reach a legacy route without reloading.
    if (readDestination(new URL(location.href)).legacyLink) showView();
  });

  window.addEventListener('message', event => {
    if (!UCPEAViews.isFrom(event, frame?.contentWindow)) return;
    const { type, view, hash, replace } = event.data || {};
    if (typeof hash !== 'string' || (hash && !hash.startsWith('#'))) return;
    if (type === 'ucpea-tool-link' && (!view || isDashboardView(view))) {
      navigate(view, hash);
    }
    if (type === 'ucpea-tool-hash' && hash !== frameHash) {
      frameHash = hash;
      const destination = UCPEAViews.dashboardURL(activeView, hash);
      if (replace) history.replaceState(null, '', destination);
      else history.pushState(null, '', destination);
    }
  });

  window.addEventListener('scroll', scheduleSectionUpdate, { passive: true });
  new ResizeObserver(scheduleSectionUpdate).observe(sections[0]);
  showView();

  menuToggle.hidden = false;
  sidebarToggle.hidden = false;
  body.setAttribute('data-navigation-ready', '');
}

const helpTopics = {
  workplace: {
    eyebrow: 'Workplace support',
    title: 'Start with a steward or the UCPEA office',
    summary: 'You do not need to decide whether an issue is a formal grievance before asking for guidance. A union representative can help you understand the process and applicable timelines.',
    steps: [
      ['Write down the facts', 'Keep relevant dates, messages, documents, and the names of people involved.'],
      ['Contact UCPEA promptly', 'Contractual timelines can be short, so do not wait for the situation to resolve itself.'],
      ['Review the governing language', 'Articles 23 and 41 cover grievances and representation rights.'],
    ],
    links: [
      ['Find a steward', 'https://ucpea.ct.aft.org/stewards', true],
      ['Open the discipline guide', 'index.html?view=rights-benefits#discipline', false],
      ['Open Article 23', 'index.html?view=current-contract#article-23', false],
    ],
  },
  duties: {
    eyebrow: 'Classification and duties',
    title: 'Document the work before starting a position audit',
    summary: 'A position audit may be appropriate when a majority of your duties and responsibilities have changed enough that your current classification no longer describes the work.',
    steps: [
      ['Compare old and current duties', 'Collect your job description and specific examples of sustained new responsibilities.'],
      ['Meet with your supervisor', 'Article 31 describes this as the first step when an employee identifies significant changes.'],
      ['Talk with UCPEA', 'A steward can help distinguish reclassification from temporary higher-level duties and explain the timelines.'],
    ],
    links: [
      ['Open the position audit guide', 'index.html?view=rights-benefits#position-audit', false],
      ['Open Article 31', 'index.html?view=current-contract#article-31', false],
      ['Contact UCPEA', 'mailto:ucpeaoffice@ucpea.org?subject=Question%20about%20changed%20job%20duties', false],
    ],
  },
  leave: {
    eyebrow: 'Time away from work',
    title: 'Identify the kind of leave and check its notice rules',
    summary: 'Different rules apply to vacation, sick leave, parental benefits, educational leave, and unpaid leave. Start with the reason and likely duration, then confirm the procedure.',
    steps: [
      ['Choose the closest leave category', 'Articles 6 and 9–15 cover the most common paid and unpaid leave situations.'],
      ['Save supporting information', 'Keep requests, approvals or denials, and any documentation required by the applicable provision.'],
      ['Ask before a deadline passes', 'Contact UCPEA if the correct leave type is unclear or a request has been denied.'],
    ],
    links: [
      ['Track holiday time', 'index.html?view=rights-benefits#holiday-time', false],
      ['Open sick leave', 'index.html?view=current-contract#article-11', false],
      ['Open parental benefits', 'index.html?view=current-contract#article-12', false],
    ],
  },
  development: {
    eyebrow: 'Career development',
    title: 'Check who should pay before applying',
    summary: 'UCPEA funding supports eligible self-directed development. If training is required for your departmental work, Article 34.3 says the University pays for it.',
    steps: [
      ['Confirm the activity is eligible', 'Review the official guidance for conferences, workshops, memberships, training, and eligible certificates.'],
      ['Apply at least 15 days ahead', 'Use the deadline planner in the professional development guide to calculate the application date.'],
      ['Finish the reimbursement step', 'Reimbursement or expense reallocation is due within 28 calendar days after the activity ends.'],
    ],
    links: [
      ['Open the professional development guide', 'index.html?view=rights-benefits#benefit-professional-development', false],
      ['Official PD guidance', 'https://ucpea.ct.aft.org/professional-development', true],
    ],
  },
  benefits: {
    eyebrow: 'Member benefits',
    title: 'Go to the current benefit workflow',
    summary: 'Tuition and childcare programs have distinct eligibility, documentation, and filing rules. Use the official workflow for the benefit you need.',
    steps: [
      ['Review eligibility first', 'Confirm whether the benefit covers the employee, a dependent, or particular types of expenses.'],
      ['Collect the required records', 'Applications may require receipts, course information, or other supporting documentation.'],
      ['Confirm the filing date', 'See the childcare guide for expense periods and UConn HR for tuition deadlines.'],
    ],
    links: [
      ['Childcare reimbursement', 'index.html?view=rights-benefits#benefit-childcare', false],
      ['Tuition benefits', 'index.html?view=rights-benefits#benefit-tuition', false],
      ['Browse all benefits', 'index.html?view=rights-benefits', false],
    ],
  },
  membership: {
    eyebrow: 'Membership and participation',
    title: 'Add your voice to the union',
    summary: 'Membership provides a vote in union decisions and supports the organization that bargains and enforces workplace protections for professional employees.',
    steps: [
      ['Learn what membership enables', 'Review UCPEA’s explanation of member participation and collective action.'],
      ['Complete the official membership card', 'Submit membership information only through UCPEA’s official form.'],
      ['Connect with your area', 'A steward can share meetings, committees, and other ways to participate.'],
    ],
    links: [
      ['Why become a member?', 'https://ucpea.ct.aft.org/union-wire/why-become-union-member', true],
      ['Official membership card', 'https://zfrmz.com/95FULSBdGhrD9O4cjEAa', true],
    ],
  },
};

const helpButtons = Array.from(document.querySelectorAll('[data-help-topic]'));
const helpResultEyebrow = document.getElementById('help-result-eyebrow');
const helpResultTitle = document.getElementById('help-result-title');
const helpResultSummary = document.getElementById('help-result-summary');
const helpResultSteps = document.getElementById('help-result-steps');
const helpResultActions = document.getElementById('help-result-actions');

function showHelpTopic(topicKey) {
  const topic = helpTopics[topicKey];
  if (!topic || !helpResultTitle || !helpResultSteps || !helpResultActions) return;
  const changed = !helpButtons.some(button => button.dataset.helpTopic === topicKey && button.classList.contains('is-active'));

  helpButtons.forEach(button => {
    const active = button.dataset.helpTopic === topicKey;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  helpResultEyebrow.textContent = topic.eyebrow;
  helpResultTitle.textContent = topic.title;
  helpResultSummary.textContent = topic.summary;

  helpResultSteps.replaceChildren(...topic.steps.map(([title, detail], index) => {
    const item = document.createElement('li');
    const number = document.createElement('span');
    number.textContent = String(index + 1);
    const copy = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = title;
    const small = document.createElement('small');
    small.textContent = detail;
    copy.append(strong, small);
    item.append(number, copy);
    return item;
  }));

  helpResultActions.replaceChildren(...topic.links.map(([label, href, external], index) => {
    const link = document.createElement('a');
    link.className = `button ${index === 0 ? 'button-primary' : 'button-secondary'}`;
    link.href = href;
    if (external) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    link.append(`${label} `);
    const arrow = document.createElement('span');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = external ? '↗' : '→';
    link.append(arrow);
    return link;
  }));

  // The answer is rewritten in place; a short rise shows that it changed.
  if (changed) {
    UCPEAMotion.arrive([
      helpResultEyebrow, helpResultTitle, helpResultSummary,
      ...helpResultSteps.children, helpResultActions,
    ], { y: 6, duration: 220, stagger: 24 });
  }
}

helpButtons.forEach(button => {
  button.addEventListener('click', () => showHelpTopic(button.dataset.helpTopic));
});

const activityStart = document.getElementById('activityStart');
const activityEnd = document.getElementById('activityEnd');
const activityStartLabel = document.getElementById('activityStartLabel');
const activityEndField = document.getElementById('activityEndField');
const activityRangeToggle = document.getElementById('activityRangeToggle');
const calculateDeadlineButton = document.getElementById('calculateDeadline');
const resetDeadlineButton = document.getElementById('resetDeadline');
const deadlineError = document.getElementById('deadlineError');
const deadlineResultTitle = document.getElementById('deadlineResultTitle');
const deadlineResultSummary = document.getElementById('deadlineResultSummary');
const deadlineDates = document.getElementById('deadlineDates');
const deadlineCalendar = document.getElementById('deadlineCalendar');
let deadlineCalendarUrl = '';

const deadlineDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

function parseLocalDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(2000, 0, 1, 12);
  date.setFullYear(year, month - 1, day);
  return year > 0 && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

function addCalendarDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function toIcsDate(date) {
  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
}

function calendarText(value) {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/[;,]/g, '\\$&');
}

function buildCalendarFile(events) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const body = events.map((event, index) => [
    'BEGIN:VEVENT',
    `UID:${event.uid ?? `ucpea-${toIcsDate(event.date)}-${index}`}@justinrogo.github.io`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${toIcsDate(event.date)}`,
    `DTEND;VALUE=DATE:${toIcsDate(addCalendarDays(event.date, 1))}`,
    `SUMMARY:${calendarText(event.title)}`,
    `DESCRIPTION:${calendarText(event.description)}`,
    ...(event.reminderDays ? [
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `TRIGGER:-P${event.reminderDays}D`,
      `DESCRIPTION:${calendarText(event.title)}`,
      'END:VALARM',
    ] : []),
    'END:VEVENT',
  ].join('\r\n')).join('\r\n');
  const file = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//UCPEA Member Dashboard//EN', body, 'END:VCALENDAR', ''].join('\r\n');
  return new Blob([file], { type: 'text/calendar;charset=utf-8' });
}

function createCalendarFile(events) {
  if (deadlineCalendarUrl) URL.revokeObjectURL(deadlineCalendarUrl);
  deadlineCalendarUrl = URL.createObjectURL(buildCalendarFile(events));
  deadlineCalendar.href = deadlineCalendarUrl;
  deadlineCalendar.hidden = false;
}

function setDeadlineCards(items) {
  deadlineDates.replaceChildren(...items.map(([label, date]) => {
    const card = document.createElement('div');
    const span = document.createElement('span');
    span.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = deadlineDateFormatter.format(date);
    card.append(span, strong);
    return card;
  }));
}

function showDeadlineError(message) {
  deadlineError.textContent = message;
  deadlineError.hidden = false;
}

function clearDeadlineError() {
  deadlineError.textContent = '';
  deadlineError.hidden = true;
}

function resetDeadlineResult() {
  clearDeadlineError();
  deadlineCalendar.hidden = true;
  deadlineDates.replaceChildren(...['Application due', 'Reimbursement due'].map(label => {
    const card = document.createElement('div');
    const span = document.createElement('span');
    span.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = '—';
    card.append(span, strong);
    return card;
  }));
  deadlineResultTitle.textContent = 'Enter your activity dates';
  deadlineResultSummary.textContent = 'The planner will show the application and reimbursement dates here.';
}

function calculateDeadline() {
  resetDeadlineResult();

  const start = parseLocalDate(activityStart.value);
  const end = activityEnd.value ? parseLocalDate(activityEnd.value) : start;
  if (!start) {
    showDeadlineError('Enter the activity or membership date.');
    return;
  }
  if (!end) {
    showDeadlineError('Enter a valid end date.');
    return;
  }
  if (end < start) {
    showDeadlineError('The activity end date must be on or after the start date.');
    return;
  }

  const applicationDue = addCalendarDays(start, -15);
  const reimbursementDue = addCalendarDays(end, 28);
  deadlineResultTitle.textContent = 'Your planning dates';
  deadlineResultSummary.textContent = start.getTime() === end.getTime()
    ? `For an activity on ${deadlineDateFormatter.format(start)}.`
    : `For an activity beginning ${deadlineDateFormatter.format(start)} and ending ${deadlineDateFormatter.format(end)}.`;
  setDeadlineCards([
    ['Apply no later than', applicationDue],
    ['Reimbursement due', reimbursementDue],
  ]);
  createCalendarFile([
    { date: applicationDue, title: 'UCPEA professional development application deadline', description: 'Confirm the current requirements and submit through the official UCPEA professional development workflow.' },
    { date: reimbursementDue, title: 'UCPEA professional development reimbursement deadline', description: 'Submit reimbursement or expense reallocation through the official workflow.' },
  ]);
}

function setActivityRange(expanded) {
  activityEndField.hidden = !expanded;
  activityRangeToggle.setAttribute('aria-expanded', String(expanded));
  activityRangeToggle.textContent = expanded ? 'Remove end date' : 'Add end date';
  activityStartLabel.textContent = expanded ? 'Activity or membership start date' : 'Activity or membership date';
  if (!expanded) activityEnd.value = '';
}

activityRangeToggle.hidden = false;
activityRangeToggle.addEventListener('click', () => {
  const expanded = activityEndField.hidden;
  if (!expanded && activityEnd.value) resetDeadlineResult();
  setActivityRange(expanded);
  if (expanded) activityEnd.focus();
});
activityStart.addEventListener('input', () => {
  activityEnd.min = activityStart.value;
  resetDeadlineResult();
});
activityEnd.addEventListener('input', resetDeadlineResult);
calculateDeadlineButton?.addEventListener('click', calculateDeadline);
resetDeadlineButton?.addEventListener('click', () => {
  activityStart.value = '';
  activityEnd.min = '';
  setActivityRange(false);
  resetDeadlineResult();
});

[activityStart, activityEnd].forEach(input => {
  input?.addEventListener('keydown', event => {
    if (event.key === 'Enter') calculateDeadline();
  });
});

initDashboardNavigation();

const SALARY_BANDS = {
  2025: {
    1: [46989, 61085, 75182], 2: [52627, 68415, 84203], 3: [58942, 76625, 94308],
    4: [66015, 85820, 105625], 5: [73937, 96119, 118300], 6: [82810, 107653, 132496],
    7: [92747, 120571, 148395], 8: [103877, 135040, 166203], 9: [116342, 151244, 186147],
  },
  2026: {
    1: [48163, 62612, 77061], 2: [53943, 70126, 86309], 3: [60416, 78541, 96666],
    4: [67666, 87966, 108265], 5: [75786, 98522, 121257], 6: [84880, 110344, 135808],
    7: [95066, 123585, 152105], 8: [106474, 138416, 170358], 9: [119250, 155025, 190801],
  },
  2027: {
    1: [49367, 64178, 78988], 2: [55291, 71879, 88466], 3: [61926, 80504, 99082],
    4: [69358, 90165, 110972], 5: [77680, 100985, 124289], 6: [87002, 113103, 139203],
    7: [97442, 126675, 155908], 8: [109135, 141876, 174617], 9: [122232, 158901, 195571],
  },
};

const salaryCalculator = document.getElementById('salary-calculator');

if (salaryCalculator) {
  const baseSalaryInput = salaryCalculator.querySelector('#baseSalary');
  const startingYearInput = salaryCalculator.querySelector('#startingYear');
  const salaryLevelInput = salaryCalculator.querySelector('#salaryLevel');
  const meritAmountInput = salaryCalculator.querySelector('#meritAmount');
  const reclassPercentInput = salaryCalculator.querySelector('#reclassPercent');
  const reclassYearInput = salaryCalculator.querySelector('#reclassYear');
  const membershipEligibleInput = salaryCalculator.querySelector('#membershipEligible');
  const satisfactoryPerformanceInput = salaryCalculator.querySelector('#satisfactoryPerformance');
  const probationCompleteInput = salaryCalculator.querySelector('#probationComplete');
  const calculateButton = salaryCalculator.querySelector('#calculateSalary');
  const resetButton = salaryCalculator.querySelector('#resetSalary');
  const errorBox = salaryCalculator.querySelector('#salaryError');
  const rows = salaryCalculator.querySelector('#salaryRows');
  const finalSalary = salaryCalculator.querySelector('#finalSalary');
  const totalIncrease = salaryCalculator.querySelector('#totalIncrease');
  const percentChange = salaryCalculator.querySelector('#percentChange');
  const biweeklyIncrease = salaryCalculator.querySelector('#biweeklyIncrease');
  const salaryEligibility = salaryCalculator.querySelector('#salaryEligibility');
  const salaryBand = salaryCalculator.querySelector('#salaryBand');
  const salaryBandLabel = salaryCalculator.querySelector('#salaryBandLabel');
  const salaryBandRange = salaryCalculator.querySelector('#salaryBandRange');
  const salaryBandMeter = salaryCalculator.querySelector('#salaryBandMeter');
  const salaryBandMessage = salaryCalculator.querySelector('#salaryBandMessage');

  const currency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const wholeCurrency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  function getNumber(input) {
    const value = Number(input.value);
    return Number.isFinite(value) ? value : 0;
  }

  function formatPercent(value) {
    return `${value.toFixed(2)}%`;
  }

  function showSalaryError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function clearSalaryError() {
    errorBox.textContent = '';
    errorBox.hidden = true;
  }

  function addSalaryRow(date, label, salaryBefore, increaseAmount, salaryAfter) {
    const row = document.createElement('tr');

    [date, label, currency.format(salaryBefore), currency.format(increaseAmount)].forEach(value => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    });

    const afterCell = document.createElement('td');
    const afterValue = document.createElement('strong');
    afterValue.textContent = currency.format(salaryAfter);
    afterCell.append(afterValue);
    row.append(afterCell);
    rows.append(row);
  }

  function showBandPosition(salary, level) {
    if (!level) {
      salaryBand.hidden = true;
      return;
    }

    const [minimum, midpoint, maximum] = SALARY_BANDS[2027][level];
    salaryBand.hidden = false;
    salaryBandLabel.textContent = `2027 Level ${level} salary band`;
    salaryBandRange.textContent = `${wholeCurrency.format(minimum)} – ${wholeCurrency.format(maximum)} · midpoint ${wholeCurrency.format(midpoint)}`;

    const rawPosition = ((salary - minimum) / (maximum - minimum)) * 100;
    salaryBandMeter.style.width = `${Math.max(0, Math.min(100, rawPosition))}%`;

    if (salary < minimum) {
      salaryBandMessage.textContent = `The estimate is ${wholeCurrency.format(minimum - salary)} below the 2027 minimum. Confirm your classification and salary with UCPEA or Human Resources.`;
    } else if (salary > maximum) {
      salaryBandMessage.textContent = `The estimate is ${wholeCurrency.format(salary - maximum)} above the 2027 maximum. Review Article 32.3 and confirm how the amount would be administered.`;
    } else {
      const midpointDifference = salary - midpoint;
      const relation = midpointDifference >= 0 ? 'above' : 'below';
      salaryBandMessage.textContent = `${Math.round(rawPosition)}% through the band and ${wholeCurrency.format(Math.abs(midpointDifference))} ${relation} the midpoint.`;
    }
  }

  function calculateSalary() {
    clearSalaryError();

    const baseSalary = getNumber(baseSalaryInput);
    const startingYear = Number(startingYearInput.value);
    const salaryLevel = Number(salaryLevelInput.value) || 0;
    const meritAmount = getNumber(meritAmountInput);
    const reclassPercent = getNumber(reclassPercentInput);
    const reclassYear = Number(reclassYearInput.value);
    const meetsCoreConditions = membershipEligibleInput.checked && satisfactoryPerformanceInput.checked;
    const receivesPbc = meetsCoreConditions && probationCompleteInput.checked;

    if (baseSalary <= 0) {
      showSalaryError('Please enter an annual base salary greater than $0.');
      return;
    }

    if (meritAmount < 0) {
      showSalaryError('Please enter a 2027 discretionary merit estimate of $0 or more.');
      return;
    }

    if (reclassPercent !== 0 && (reclassPercent < 3 || reclassPercent > 10)) {
      showSalaryError('Enter a reclassification estimate from 3% through 10%, or leave the field blank.');
      return;
    }

    if (reclassPercent > 0 && reclassYear < startingYear) {
      showSalaryError('Choose a reclassification year that is not earlier than the first increase being modeled.');
      return;
    }

    rows.replaceChildren();
    let salary = baseSalary;
    let estimatedLumpSum = 0;

    function applyReclassification(year) {
      if (reclassPercent <= 0 || reclassYear !== year) return;
      const salaryBefore = salary;
      const increaseAmount = salaryBefore * (reclassPercent / 100);
      salary += increaseAmount;
      addSalaryRow(
        `Before July 1, ${year}`,
        `${formatPercent(reclassPercent)} reclassification estimate`,
        salaryBefore,
        increaseAmount,
        salary,
      );
    }

    function applyPbc(year, yearOpeningSalary, rate, label) {
      if (!receivesPbc) return;
      const fullAmount = yearOpeningSalary * rate;
      let baseAmount = fullAmount;
      let lumpSum = 0;
      const bandMaximum = salaryLevel ? SALARY_BANDS[year][salaryLevel][2] : 0;

      if (bandMaximum) {
        baseAmount = Math.min(fullAmount, Math.max(0, bandMaximum - salary));
        lumpSum = fullAmount - baseAmount;
      }

      const salaryBefore = salary;
      salary += baseAmount;
      estimatedLumpSum += lumpSum;
      addSalaryRow(
        `July 1, ${year}`,
        lumpSum > 0 ? `${label}; ${currency.format(lumpSum)} estimated non-base lump sum` : label,
        salaryBefore,
        baseAmount,
        salary,
      );
    }

    for (let year = startingYear; year <= 2027; year += 1) {
      applyReclassification(year);
      const yearOpeningSalary = salary;

      if (meetsCoreConditions) {
        const generalIncrease = yearOpeningSalary * 0.025;
        salary += generalIncrease;
        addSalaryRow(`July 1, ${year}`, '2.5% general wage increase', yearOpeningSalary, generalIncrease, salary);
      } else {
        addSalaryRow(`July 1, ${year}`, 'General wage increase not modeled — eligibility condition not met', salary, 0, salary);
      }

      const pbcRate = year === 2027 ? 0.015 : 0.02;
      applyPbc(year, yearOpeningSalary, pbcRate, `${formatPercent(pbcRate * 100)} performance-based compensation`);

      if (year === 2027 && meritAmount > 0 && receivesPbc) {
        let baseMerit = meritAmount;
        let meritLumpSum = 0;
        const bandMaximum = salaryLevel ? SALARY_BANDS[2027][salaryLevel][2] : 0;
        if (bandMaximum) {
          baseMerit = Math.min(meritAmount, Math.max(0, bandMaximum - salary));
          meritLumpSum = meritAmount - baseMerit;
        }
        const salaryBefore = salary;
        salary += baseMerit;
        estimatedLumpSum += meritLumpSum;
        addSalaryRow(
          'July 1, 2027',
          meritLumpSum > 0
            ? `Discretionary merit estimate; ${currency.format(meritLumpSum)} estimated non-base lump sum`
            : 'Discretionary merit estimate',
          salaryBefore,
          baseMerit,
          salary,
        );
      }
    }

    const increaseTotal = salary - baseSalary;
    finalSalary.textContent = currency.format(salary);
    totalIncrease.textContent = currency.format(increaseTotal);
    percentChange.textContent = formatPercent((increaseTotal / baseSalary) * 100);
    biweeklyIncrease.textContent = currency.format(increaseTotal / 26);

    const eligibilityNotes = [];
    if (meetsCoreConditions) {
      eligibilityNotes.push('General wage increases are included for the selected years.');
      eligibilityNotes.push(receivesPbc
        ? 'Performance-based compensation is included.'
        : 'Performance-based compensation is omitted because the initial probationary period is marked incomplete.');
    } else {
      const missing = [];
      if (!membershipEligibleInput.checked) missing.push('the applicable January 1 bargaining-unit date');
      if (!satisfactoryPerformanceInput.checked) missing.push('the satisfactory-performance condition');
      eligibilityNotes.push(`Scheduled Article 32 increases are not modeled because the estimate does not meet ${missing.join(' and ')}.`);
    }
    if (meritAmount > 0 && !receivesPbc) eligibilityNotes.push('The discretionary merit estimate was omitted because the PBC conditions are not met.');
    if (estimatedLumpSum > 0) eligibilityNotes.push(`${currency.format(estimatedLumpSum)} is shown as an estimated non-base lump sum because the selected band maximum was reached.`);
    if (reclassPercent > 0) eligibilityNotes.push('The reclassification amount is only an estimate; Article 31 may also require movement to the new band minimum.');
    salaryEligibility.textContent = eligibilityNotes.join(' ');

    showBandPosition(salary, salaryLevel);
  }

  function resetSalary() {
    clearSalaryError();
    baseSalaryInput.value = '';
    startingYearInput.value = '2027';
    salaryLevelInput.value = '';
    meritAmountInput.value = '';
    reclassPercentInput.value = '';
    reclassYearInput.value = '2027';
    membershipEligibleInput.checked = true;
    satisfactoryPerformanceInput.checked = true;
    probationCompleteInput.checked = true;
    finalSalary.textContent = '$0';
    totalIncrease.textContent = '$0';
    percentChange.textContent = '0%';
    biweeklyIncrease.textContent = '$0';
    salaryEligibility.textContent = 'Eligibility assumptions have not been evaluated yet.';
    salaryBand.hidden = true;

    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.className = 'salary-calculator__empty';
    cell.textContent = 'Enter values and select Calculate salary.';
    row.append(cell);
    rows.replaceChildren(row);
  }

  function openSalaryCalculatorFromHash() {
    if (window.location.hash === '#salary-calculator') salaryCalculator.open = true;
  }

  calculateButton.addEventListener('click', calculateSalary);
  resetButton.addEventListener('click', resetSalary);

  [baseSalaryInput, startingYearInput, salaryLevelInput, meritAmountInput, reclassPercentInput, reclassYearInput].forEach(input => {
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') calculateSalary();
    });
  });

  window.addEventListener('hashchange', openSalaryCalculatorFromHash);
  openSalaryCalculatorFromHash();
  clearSalaryError();
}
