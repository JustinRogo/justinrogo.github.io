'use strict';

(() => {
  const dialog = document.getElementById('dashboard-tutorial');
  const spotlight = document.getElementById('tutorial-spotlight');
  const title = document.getElementById('tutorial-title');
  const copy = document.getElementById('tutorial-copy');
  const progress = document.getElementById('tutorial-progress');
  const back = document.getElementById('tutorial-back');
  const next = document.getElementById('tutorial-next');
  const toolView = document.getElementById('tool-view');
  const header = document.querySelector('.site-header');

  const steps = [
    {
      view: '',
      title: 'Overview',
      targets: ['.home-today', '.hero-copy', '#hero-title'],
      copy: ['Check upcoming events and the latest from Union Wire. From here, you can open the contract, find guidance in Rights & Benefits, or jump to tools like the Salary & Band Planner.'],
    },
    {
      view: 'current-contract',
      title: 'Contract',
      targets: ['.reader-search', '.searchbox', '.contract-hero h1'],
      copy: ['Search the current collective bargaining agreement or jump to an article. Find the contract language on pay, leave, job protections, and other working conditions.'],
    },
    {
      view: 'board',
      title: 'Bulletin Board',
      targets: ['.board-toolbar', '#board-title'],
      copy: [
        'Browse announcements and events from your Area and the Union-wide board. Area Stewards can post to their own Area’s board.',
        'Sign in and turn on Show notifications in the account menu to get push alerts on this device. You can receive alerts for new posts on your Area’s board or the Union-wide board when the publisher sends one.',
      ],
    },
    {
      view: 'committees',
      title: 'Committees',
      targets: ['.committee-jump', '#committees-title'],
      copy: ['See who serves on the Executive Board and UCPEA committees and what each group does. Select Join a committee to open the interest form.'],
    },
    {
      view: 'area-explorer',
      title: 'Area Explorer',
      targets: ['.mobile-map-views', '.map-toolbar', '#map-sheet'],
      copy: ['Explore UCPEA areas on the map or search by building, area, or steward to find your Area and its steward.'],
    },
  ];

  let stepIndex = 0;
  let startingPage;
  let tutorialPage;
  let observedTarget;
  let positionFrame;
  const resize = new ResizeObserver(queuePosition);
  resize.observe(dialog);

  function setSpotlight(bounds, target = null) {
    if (observedTarget !== target) {
      if (observedTarget) resize.unobserve(observedTarget);
      if (target) resize.observe(target);
      observedTarget = target;
    }
    dialog.toggleAttribute('data-spotlight', Boolean(bounds));
    spotlight.hidden = !bounds;
    if (bounds) {
      const { left, top, width, height } = bounds;
      Object.assign(spotlight.style, {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
      });
    }
  }

  function positionSpotlight() {
    positionFrame = undefined;
    if (!dialog.open) return;
    if (copy.scrollHeight > copy.clientHeight) copy.tabIndex = 0;
    else copy.removeAttribute('tabindex');
    const step = steps[stepIndex];
    const frame = Object.hasOwn(UCPEAViews.views, step.view) ? toolView.querySelector('iframe') : null;
    const source = frame ? frame.contentDocument : document;
    const frameRect = frame?.getBoundingClientRect();
    const panelTop = dialog.getBoundingClientRect().top;
    const headerBottom = header.getBoundingClientRect().bottom;
    const padding = 5;
    for (const selector of step.targets) {
      const target = source?.querySelector(selector);
      const rect = target?.getBoundingClientRect();
      if (!rect?.width || !rect.height) continue;
      const offsetX = frameRect?.left ?? 0;
      const offsetY = frameRect?.top ?? 0;
      const left = Math.max(2, frameRect?.left ?? 0, rect.left + offsetX - padding);
      const top = Math.max(headerBottom + 2, frameRect?.top ?? 0, rect.top + offsetY - padding);
      const right = Math.min(document.documentElement.clientWidth - 2, frameRect?.right ?? Infinity, rect.right + offsetX + padding);
      const bottom = Math.min(panelTop - 8, frameRect?.bottom ?? Infinity, rect.bottom + offsetY + padding);
      if (right - left < 24 || bottom - top < 20) continue;
      setSpotlight({ left, top, width: right - left, height: bottom - top }, target);
      return;
    }
    setSpotlight();
  }

  function queuePosition() {
    if (dialog.open) positionFrame ??= requestAnimationFrame(positionSpotlight);
  }

  function renderStep() {
    const step = steps[stepIndex];
    setSpotlight();
    tutorialPage = UCPEAViews.dashboardURL(step.view);
    UCPEADashboard.showTutorialPage(tutorialPage, startingPage.state);
    title.textContent = step.title;
    progress.textContent = `Step ${stepIndex + 1} of ${steps.length}`;
    copy.replaceChildren(...step.copy.map(text => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      return paragraph;
    }));
    back.disabled = stepIndex === 0;
    next.textContent = stepIndex === steps.length - 1 ? 'Done' : 'Next';
    copy.scrollTop = 0;
    if (dialog.open) title.focus({ preventScroll: true });
    queuePosition();
  }

  document.getElementById('account-menu-tutorial').addEventListener('click', () => {
    if (startingPage) return;
    startingPage = { url: location.href, state: history.state, scroll: window.scrollY };
    stepIndex = 0;
    dialog.returnValue = '';
    renderStep();
    dialog.showModal();
    queuePosition();
  });

  back.addEventListener('click', () => {
    stepIndex--;
    renderStep();
  });
  next.addEventListener('click', () => {
    if (stepIndex === steps.length - 1) {
      dialog.close();
    } else {
      stepIndex++;
      renderStep();
    }
  });
  document.getElementById('tutorial-end').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    setSpotlight();
    if (dialog.returnValue !== 'navigation' && location.href === tutorialPage.href) {
      UCPEADashboard.showTutorialPage(startingPage.url, startingPage.state, startingPage.scroll);
      document.getElementById('account-menu-button').focus({ preventScroll: true });
    }
    startingPage = undefined;
  });
  window.addEventListener('popstate', () => {
    if (dialog.open) dialog.close('navigation');
  });
  toolView.addEventListener('load', queuePosition, true);
  window.addEventListener('resize', queuePosition);
  window.addEventListener('scroll', queuePosition, { passive: true });
})();
