/* Dwellwise — app.js
   Everything is driven by scroll. Nothing here leaves the page: no network
   calls, no permissions, no storage beyond one sessionStorage flag. */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const pageStart = Date.now();

  const timeNow = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  function platformName() {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) return 'an iPhone';
    if (/iPad/.test(ua)) return 'an iPad';
    if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'an Android phone' : 'an Android tablet';
    if (/Windows/.test(ua)) return 'a Windows computer';
    if (/Mac/.test(ua)) return 'a Mac';
    if (/Linux|CrOS/.test(ua)) return 'a computer';
    return 'a screen';
  }

  /* ---------- Hero personalisation (perfectly normal) ---------- */
  const hour = new Date().getHours();
  $('#phone-greet').textContent = hour < 5 ? 'Good evening 👋' : hour < 12 ? 'Good morning 👋' : hour < 18 ? 'Good afternoon 👋' : 'Good evening 👋';
  $('#you-where').textContent = `Reading this at ${timeNow()}`;

  /* ---------- Favicons & title ---------- */
  const favicon = $('#favicon');
  const ICON_HOME = favicon.href;
  const ICON_EYE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23000'/%3E%3Cpath d='M3 16c4-6 8.5-8 13-8s9 2 13 8c-4 6-8.5 8-13 8S7 22 3 16z' fill='%23e7e5e4'/%3E%3Ccircle cx='16' cy='16' r='5' fill='%237f1d1d'/%3E%3Ccircle cx='16' cy='16' r='2.4' fill='%23000'/%3E%3C/svg%3E";
  let baseTitle = document.title;
  let iconState = 'home';
  const setIcon = (s) => { if (s !== iconState) { iconState = s; favicon.href = s === 'eye' ? ICON_EYE : ICON_HOME; } };

  let dread = 0;
  let titleTimer = 0;
  document.addEventListener('visibilitychange', () => {
    if (dread < 0.35) return;
    clearTimeout(titleTimer);
    if (document.hidden) {
      document.title = 'Come back.';
    } else {
      document.title = 'There you are.';
      titleTimer = setTimeout(() => { document.title = baseTitle; }, 2600);
    }
  });

  /* ---------- Counters ---------- */
  function formatCount(el, v) {
    const dec = +(el.dataset.decimals || 0);
    if (el.dataset.format === 'compact') {
      return v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? Math.round(v / 1e3) + 'K' : Math.round(v) + '';
    }
    return v.toFixed(dec) + (el.dataset.suffix || '');
  }
  const countIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      countIO.unobserve(e.target);
      const el = e.target, target = +el.dataset.count;
      if (reduced || target === 0) { el.textContent = formatCount(el, target); continue; }
      const t0 = performance.now();
      const step = (t) => {
        const k = clamp((t - t0) / 1600);
        el.textContent = formatCount(el, target * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => { el.textContent = formatCount(el, 0); countIO.observe(el); });

  /* ---------- Text that changes while you're reading it ---------- */
  const GLYPHS = '▓▒░█#%&@$?/\\';
  function morph(el, to) {
    if (reduced) { el.textContent = to; return; }
    const from = el.textContent;
    const len = Math.max(from.length, to.length);
    const reveal = Array.from({ length: len }, (_, i) => 250 + (i / len) * 900 + Math.random() * 300);
    const t0 = performance.now();
    el.classList.add('morphing');
    const step = (t) => {
      const dt = t - t0;
      let out = '', done = true;
      for (let i = 0; i < len; i++) {
        if (dt >= reveal[i]) out += to[i] || '';
        else {
          done = false;
          out += dt > reveal[i] - 350 ? GLYPHS[(Math.random() * GLYPHS.length) | 0] : (from[i] || '');
        }
      }
      el.textContent = out;
      if (!done) requestAnimationFrame(step);
      else { el.textContent = to; el.classList.remove('morphing'); }
    };
    requestAnimationFrame(step);
  }
  const morphTimers = new Map();
  const morphIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const el = e.target;
      if (e.isIntersecting) {
        if (!morphTimers.has(el)) {
          morphTimers.set(el, setTimeout(() => { morphIO.unobserve(el); morph(el, el.dataset.becomes); }, 1500));
        }
      } else {
        clearTimeout(morphTimers.get(el));
        morphTimers.delete(el);
      }
    }
  }, { threshold: 1, rootMargin: '0px 0px -20% 0px' });
  $$('[data-becomes]').forEach((el) => morphIO.observe(el));

  /* ---------- FAQ ---------- */
  const faqWatch = $('#faq-watch');
  faqWatch.closest('details').addEventListener('toggle', (e) => {
    if (!e.target.open) return;
    const mins = Math.max(1, Math.round((Date.now() - pageStart) / 60000));
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    faqWatch.textContent = `Yes. It’s ${timeNow()}. You’re on ${platformName()}${dark ? ', and you like it dark in there' : ''}. You’ve been on this page for ${mins} minute${mins === 1 ? '' : 's'}. You haven’t looked behind you once.`;
  });
  const faqLast = $('#faq-last');
  let faqLastTimer = 0, faqLastAuto = false;
  faqLast.addEventListener('toggle', () => { if (faqLast.open && !faqLastAuto) clearTimeout(faqLastTimer); });
  new IntersectionObserver((entries, io) => {
    for (const e of entries) {
      if (e.isIntersecting && !faqLast.open) {
        faqLastTimer = setTimeout(() => {
          if (faqLast.open) return;
          faqLastAuto = true;
          $('p', faqLast).textContent = 'It doesn’t matter. Keep scrolling. We’ll show you.';
          faqLast.open = true;
          io.disconnect();
        }, 2200);
      } else clearTimeout(faqLastTimer);
    }
  }, { threshold: 1 }).observe(faqLast);

  /* ---------- Newsletter (nothing is ever sent anywhere) ---------- */
  const nlForm = $('#nl-form'), nlInput = $('#nl-email'), nlMsg = $('#nl-msg');
  let typedOnce = false;
  nlInput.addEventListener('input', () => {
    if (!typedOnce && nlInput.value.length > 3) {
      typedOnce = true;
      nlMsg.textContent = 'Is that your real email? It isn’t the one we have.';
    }
  });
  nlForm.addEventListener('submit', (e) => {
    e.preventDefault();
    nlInput.value = '';
    nlInput.placeholder = 'already subscribed';
    nlInput.disabled = true;
    $('button', nlForm).textContent = 'Subscribed';
    nlMsg.textContent = 'Thank you. You were already subscribed. You have always been subscribed.';
  });

  /* ---------- Insights log ---------- */
  const NOW = timeNow();
  const LOG = [
    ['7:02 PM', 'You got home.'],
    ['7:15 PM', 'You made dinner. Pasta, we think.'],
    ['8:40 PM', 'You watched two episodes. You skipped the intro.'],
    ['10:58 PM', 'You checked that the front door was locked.'],
    ['10:59 PM', 'It was.'],
    ['11:31 PM', 'You went to bed.'],
    ['11:52 PM', 'You fell asleep.'],
    ['1:12 AM', 'Front door unlocked.', 'g'],
    ['1:12 AM', 'Guest detected. Guest profile: none.', 'g'],
    ['1:40 AM', 'Guest went to the kitchen. Guest did not eat.', 'g'],
    ['2:03 AM', 'Guest stood in the hallway for 41 minutes.', 'g'],
    ['2:47 AM', 'Guest stood in the bedroom doorway.', 'g'],
    ['3:00 AM', 'Guest stood by your bed.', 'rep'],
    ['3:00 AM', 'Guest stood by your bed.', 'rep'],
    ['3:00 AM', 'Guest stood by your bed.', 'rep'],
    ['3:33 AM', 'You rolled over. Guest did not move.', 'g'],
    ['4:10 AM', 'Guest learned your routine.', 'g'],
    ['6:58 AM', 'You woke up. You told someone you slept well.'],
    ['6:58 AM', 'Guest is still here.', 'g'],
    [NOW, 'You are reading this.', 'now'],
    [NOW, 'Guest is reading this too.', 'now'],
  ];
  const logEl = $('#log');
  logEl.innerHTML = LOG.map(([t, msg, cls]) => `<li${cls ? ` class="${cls}"` : ''}><time>${t}</time><span>${msg}</span></li>`).join('');
  const logItems = $$('li', logEl);
  const icSub = $('.ic-sub');

  /* ---------- Eyes ---------- */
  const eyesEl = $('#eyes');
  const pairs = [];
  (() => {
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    let tries = 0;
    while (pairs.length < 30 && tries++ < 400) {
      const x = rand(), y = rand();
      if (x > 0.22 && x < 0.78 && y > 0.38 && y < 0.62) continue; // keep the line of text clear
      if (pairs.some((p) => Math.hypot(p.x - x, (p.y - y) * 0.6) < 0.11)) continue;
      const s = Math.round(16 + rand() * 46);
      const div = document.createElement('div');
      div.className = 'e-pair';
      div.style.cssText = `left:${(x * 92).toFixed(2)}%;top:${(y * 92).toFixed(2)}%;--s:${s}px`;
      div.innerHTML = '<span class="e"><i></i></span><span class="e"><i></i></span>';
      eyesEl.appendChild(div);
      pairs.push({ x, y, el: div, order: rand() });
    }
    pairs.sort((a, b) => a.order - b.order);
  })();

  let mouse = null;
  addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { mouse = { x: e.clientX, y: e.clientY }; queueTrack(); } }, { passive: true });

  function aimPupils(container, pupilSel, maxPx) {
    for (const p of $$(pupilSel, container)) {
      if (!mouse) { p.style.setProperty('--px', '0px'); p.style.setProperty('--py', '0px'); continue; }
      const r = p.parentElement.getBoundingClientRect();
      const dx = mouse.x - (r.left + r.width / 2), dy = mouse.y - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const m = Math.min(maxPx(r), d / 12);
      p.style.setProperty('--px', `${((dx / d) * m).toFixed(1)}px`);
      p.style.setProperty('--py', `${((dy / d) * m * 0.6).toFixed(1)}px`);
    }
  }
  let trackQueued = false, eyesVisible = false, testimonialEyesVisible = false;
  function queueTrack() {
    if (trackQueued) return;
    trackQueued = true;
    requestAnimationFrame(() => {
      trackQueued = false;
      if (eyesVisible) aimPupils(eyesEl, '.e i', (r) => r.width * 0.26);
      if (testimonialEyesVisible) aimPupils($('.a-eyes'), '.pupil', () => 3);
    });
  }
  new IntersectionObserver(([e]) => { eyesVisible = e.isIntersecting; }).observe($('.eyes-field'));
  new IntersectionObserver(([e]) => { testimonialEyesVisible = e.isIntersecting; queueTrack(); }).observe($('.a-eyes'));
  setInterval(() => {
    if (!eyesVisible) return;
    const open = pairs.filter((p) => p.el.classList.contains('open'));
    if (!open.length) return;
    const p = open[(Math.random() * open.length) | 0].el;
    p.classList.add('blink');
    setTimeout(() => p.classList.remove('blink'), 150);
  }, 450);

  /* ---------- Ghost cursor ---------- */
  const ghost = $('.ghost-cursor');
  let ghostOn = false, gx = -50, gy = -50;
  function ghostLoop() {
    if (!ghostOn) return;
    if (mouse) {
      gx += (mouse.x - 26 - gx) * 0.035;
      gy += (mouse.y + 18 - gy) * 0.035;
      ghost.style.transform = `translate(${gx.toFixed(1)}px, ${gy.toFixed(1)}px)`;
    }
    requestAnimationFrame(ghostLoop);
  }
  function setGhost(on) {
    if (on === ghostOn || !finePointer) return;
    ghostOn = on;
    root.classList.toggle('ghost', on);
    if (on) { if (mouse) { gx = mouse.x - 200; gy = mouse.y + 160; } requestAnimationFrame(ghostLoop); }
  }

  /* ---------- Sound (optional, procedural, starts only on click) ---------- */
  const sound = (() => {
    let ctx = null, master, pad = [], padGain, droneGain, droneFilter, noiseGain, on = false;
    function build() {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
      padGain = ctx.createGain(); padGain.gain.value = 0.05; padGain.connect(master);
      [261.63, 329.63, 392.0, 523.25].forEach((f, i) => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const g = ctx.createGain(); g.gain.value = i === 3 ? 0.4 : 1;
        o.connect(g); g.connect(padGain); o.start(); pad.push(o);
      });
      droneFilter = ctx.createBiquadFilter(); droneFilter.type = 'lowpass'; droneFilter.frequency.value = 180; droneFilter.Q.value = 6;
      droneGain = ctx.createGain(); droneGain.gain.value = 0; droneFilter.connect(droneGain); droneGain.connect(master);
      [55, 58.27, 82.4].forEach((f) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(droneFilter); o.start(); });
      const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.7;
      noiseGain = ctx.createGain(); noiseGain.gain.value = 0;
      noise.connect(bp); bp.connect(noiseGain); noiseGain.connect(master); noise.start();
    }
    function update(dr) {
      if (!ctx || !on) return;
      const t = ctx.currentTime;
      const sour = smooth(0.3, 0.75, dr);
      pad[1].detune.setTargetAtTime(-sour * 90, t, 0.4);
      pad[2].detune.setTargetAtTime(sour * 55, t, 0.4);
      pad[3].detune.setTargetAtTime(-sour * 140, t, 0.4);
      padGain.gain.setTargetAtTime(0.05 * (1 - smooth(0.55, 0.8, dr)), t, 0.5);
      droneGain.gain.setTargetAtTime(0.07 * smooth(0.35, 0.9, dr), t, 0.6);
      droneFilter.frequency.setTargetAtTime(140 + 500 * smooth(0.5, 1, dr), t, 0.6);
      noiseGain.gain.setTargetAtTime(0.025 * smooth(0.6, 1, dr), t, 0.6);
    }
    function sting() {
      if (!ctx || !on) return;
      const t = ctx.currentTime, g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09, t + 0.02); // five saws summed: keep peaks under clipping
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      g.connect(master);
      [98, 103.8, 146.8, 155.6, 311].forEach((f) => {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 1.5, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.4);
        o.connect(g); o.start(t); o.stop(t + 2.3);
      });
    }
    function toggle() {
      if (!ctx) build();
      on = !on;
      if (on) { ctx.resume(); master.gain.setTargetAtTime(0.8, ctx.currentTime, 0.4); update(dread); }
      else { master.gain.setTargetAtTime(0, ctx.currentTime, 0.2); setTimeout(() => { if (!on) ctx.suspend(); }, 600); }
      return on;
    }
    return { toggle, update, sting };
  })();
  const soundBtn = $('#sound-toggle');
  soundBtn.addEventListener('click', () => {
    const on = sound.toggle();
    soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.title = on ? 'Mute ambient sound' : 'Play ambient sound';
  });

  /* ---------- CCTV ---------- */
  const cctv = (() => {
    const canvas = $('#cctv'), ctx = canvas.getContext('2d');
    const sticky = $('.cctv-sticky');
    const stamp = $('#cctv-stamp'), motion = $('#cctv-motion'), count = $('#cctv-count'), caption = $('#cctv-caption');
    const noise = document.createElement('canvas'); noise.width = 160; noise.height = 120;
    const nctx = noise.getContext('2d'), nimg = nctx.createImageData(160, 120);
    let W = 0, H = 0, visible = false, f = 0, key = -1, burstUntil = 0, stung = false, running = false;

    const CAPTIONS = ['', 'Motion detected in the living room.', 'It’s fine. It’s only a guest.', 'That’s your chair.', 'It knows where the camera is.', '', 'It isn’t on camera anymore.'];

    function resize() {
      const iw = Math.max(320, Math.min(560, Math.round(innerWidth / 2.2)));
      W = canvas.width = iw;
      H = canvas.height = Math.round(iw * (innerHeight / innerWidth));
    }
    resize();
    addEventListener('resize', resize);

    function keyFor(v) { return v < 0.1 ? 0 : v < 0.26 ? 1 : v < 0.42 ? 2 : v < 0.58 ? 3 : v < 0.73 ? 4 : v < 0.86 ? 5 : 6; }
    function localT(v) { const b = [0, 0.1, 0.26, 0.42, 0.58, 0.73, 0.86, 1]; const k = keyFor(v); return clamp((v - b[k]) / (b[k + 1] - b[k])); }

    // Scene is drawn in a 1600×900 virtual room, fitted to the canvas.
    function sceneTransform() {
      // Cover on wide screens; on tall phones, letterbox but keep the chair, door and window in frame.
      const s = Math.min(Math.max(W / 1600, H / 900), W / 850);
      ctx.setTransform(s, 0, 0, s, (W - 1600 * s) / 2, (H - 900 * s) / 2);
    }

    function room() {
      let g = ctx.createLinearGradient(0, 0, 0, 560);
      g.addColorStop(0, '#2a2e2a'); g.addColorStop(1, '#3a3e39');
      ctx.fillStyle = g; ctx.fillRect(-200, -100, 2000, 660);
      g = ctx.createLinearGradient(0, 560, 0, 1000);
      g.addColorStop(0, '#2b2d29'); g.addColorStop(1, '#171816');
      ctx.fillStyle = g; ctx.fillRect(-200, 560, 2000, 500);
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 3;
      for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(800 + i * 140, 560); ctx.lineTo(800 + i * 420, 1000); ctx.stroke(); }
      ctx.fillStyle = '#1e201d'; ctx.fillRect(-200, 552, 2000, 12);
      // window + moonlight
      g = ctx.createLinearGradient(300, 140, 520, 400);
      g.addColorStop(0, '#6c777b'); g.addColorStop(1, '#4b5558');
      ctx.fillStyle = g; ctx.fillRect(300, 140, 220, 260);
      ctx.fillStyle = '#1f221f'; ctx.fillRect(405, 140, 10, 260); ctx.fillRect(300, 262, 220, 10);
      ctx.fillStyle = '#20231f'; ctx.fillRect(272, 120, 40, 330); ctx.fillRect(508, 120, 40, 330);
      ctx.fillStyle = 'rgba(140,160,165,.10)';
      ctx.beginPath(); ctx.moveTo(300, 590); ctx.lineTo(520, 590); ctx.lineTo(620, 760); ctx.lineTo(330, 760); ctx.fill();
      // picture frame
      ctx.fillStyle = '#242723'; ctx.fillRect(620, 190, 130, 100);
      ctx.fillStyle = '#3d413c'; ctx.fillRect(632, 202, 106, 76);
      // doorway + door
      ctx.fillStyle = '#4a4f48'; ctx.fillRect(898, 160, 174, 400);
      ctx.fillStyle = '#0d0e0d'; ctx.fillRect(910, 172, 150, 388);
      ctx.fillStyle = '#2c2f2b';
      ctx.beginPath(); ctx.moveTo(1060, 172); ctx.lineTo(1118, 150); ctx.lineTo(1118, 600); ctx.lineTo(1060, 560); ctx.fill();
      // lamp
      ctx.fillStyle = '#1b1d1a'; ctx.fillRect(1226, 290, 8, 360); ctx.fillRect(1196, 640, 68, 10);
      ctx.beginPath(); ctx.moveTo(1195, 300); ctx.lineTo(1265, 300); ctx.lineTo(1250, 230); ctx.lineTo(1210, 230); ctx.fill();
    }

    function figure(cx, feetY, h, o = {}) {
      const top = feetY - h, a = o.alpha ?? 1;
      ctx.save();
      ctx.fillStyle = `rgba(3,3,3,${a})`; ctx.strokeStyle = `rgba(3,3,3,${a})`;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // legs
      ctx.beginPath();
      ctx.moveTo(cx - 0.08 * h, top + 0.5 * h); ctx.lineTo(cx - 0.015 * h, top + 0.5 * h); ctx.lineTo(cx - 0.03 * h, feetY); ctx.lineTo(cx - 0.065 * h, feetY);
      ctx.moveTo(cx + 0.08 * h, top + 0.5 * h); ctx.lineTo(cx + 0.015 * h, top + 0.5 * h); ctx.lineTo(cx + 0.03 * h, feetY); ctx.lineTo(cx + 0.065 * h, feetY);
      ctx.fill();
      // torso
      ctx.beginPath();
      ctx.moveTo(cx - 0.125 * h, top + 0.2 * h);
      ctx.quadraticCurveTo(cx, top + 0.165 * h, cx + 0.125 * h, top + 0.2 * h);
      ctx.lineTo(cx + 0.085 * h, top + 0.53 * h); ctx.lineTo(cx - 0.085 * h, top + 0.53 * h); ctx.closePath(); ctx.fill();
      // arms — too long
      ctx.lineWidth = 0.028 * h;
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + sd * 0.115 * h, top + 0.21 * h);
        ctx.quadraticCurveTo(cx + sd * 0.17 * h, top + 0.5 * h, cx + sd * 0.15 * h, top + 0.86 * h);
        ctx.stroke();
        ctx.lineWidth = 0.008 * h;
        for (let i = -1.5; i <= 1.5; i++) {
          ctx.beginPath(); ctx.moveTo(cx + sd * 0.15 * h, top + 0.86 * h);
          ctx.lineTo(cx + sd * (0.15 + i * 0.012) * h, top + (0.93 + Math.abs(i) * -0.008) * h); ctx.stroke();
        }
        ctx.lineWidth = 0.028 * h;
      }
      if (o.noHead) { ctx.restore(); return; }
      // neck + head
      ctx.fillRect(cx - 0.016 * h, top + 0.12 * h, 0.032 * h, 0.07 * h);
      ctx.save();
      ctx.translate(cx, top + 0.075 * h); ctx.rotate(o.tilt || 0);
      ctx.beginPath(); ctx.ellipse(0, 0, 0.055 * h, 0.078 * h, 0, 0, Math.PI * 2); ctx.fill();
      if (o.eyes) {
        for (const sd of [-1, 1]) {
          const ex = sd * 0.021 * h, ey = -0.004 * h;
          const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, 0.02 * h);
          g.addColorStop(0, `rgba(235,235,225,${o.eyes})`); g.addColorStop(0.25, `rgba(200,200,190,${o.eyes * 0.5})`); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, ey, 0.02 * h, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
      ctx.restore();
    }

    // Fixed per-tooth lengths so the teeth don't shimmer frame to frame.
    const TEETH = Array.from({ length: 17 }, (_, i) => 0.035 + ((i * 7919) % 11) / 11 * 0.05);
    const blob = (x, y, rx, ry, inner, outer, a) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
      g.addColorStop(0, inner); g.addColorStop(a, inner); g.addColorStop(1, outer);
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    };

    function face(cx, cy, s, tilt, a = 1) {
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(tilt); ctx.globalAlpha = a;
      // gaunt head: wide temples, a jaw that narrows too far
      ctx.beginPath();
      ctx.moveTo(0, -1.12 * s);
      ctx.bezierCurveTo(0.5 * s, -1.12 * s, 0.66 * s, -0.55 * s, 0.6 * s, -0.12 * s);
      ctx.bezierCurveTo(0.55 * s, 0.35 * s, 0.42 * s, 0.75 * s, 0.2 * s, 1.0 * s);
      ctx.quadraticCurveTo(0, 1.12 * s, -0.2 * s, 1.0 * s);
      ctx.bezierCurveTo(-0.42 * s, 0.75 * s, -0.55 * s, 0.35 * s, -0.6 * s, -0.12 * s);
      ctx.bezierCurveTo(-0.66 * s, -0.55 * s, -0.5 * s, -1.12 * s, 0, -1.12 * s);
      let g = ctx.createRadialGradient(0, 0.25 * s, 0.05 * s, 0, 0, 1.15 * s);
      g.addColorStop(0, '#a3a497'); g.addColorStop(0.4, '#6b6d63'); g.addColorStop(0.75, '#2c2d28'); g.addColorStop(1, '#070707');
      ctx.fillStyle = g; ctx.fill();
      // shadows: brow ridge, temples, sunken cheeks
      blob(0, -0.36 * s, 0.6 * s, 0.14 * s, 'rgba(0,0,0,.45)', 'rgba(0,0,0,0)', 0.2);
      for (const sd of [-1, 1]) {
        blob(sd * 0.36 * s, 0.26 * s, 0.17 * s, 0.3 * s, 'rgba(0,0,0,.6)', 'rgba(0,0,0,0)', 0.1);
        blob(sd * 0.52 * s, -0.42 * s, 0.14 * s, 0.3 * s, 'rgba(0,0,0,.5)', 'rgba(0,0,0,0)', 0.1);
      }
      // eye sockets, not quite the same size; black running from both
      const eyes = [[-0.25, -0.1, 0.2, 0.25, -0.01], [0.27, -0.07, 0.23, 0.29, 0.035]];
      for (const [ex0, ey0, rx, ry, look] of eyes) {
        const ex = ex0 * s, ey = ey0 * s;
        blob(ex, ey, rx * 1.35 * s, ry * 1.35 * s, 'rgba(0,0,0,.95)', 'rgba(0,0,0,0)', 0.45);
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(ex, ey + 0.02 * s, rx * 0.62 * s, ry * 0.7 * s, ex0 * 0.6, 0, Math.PI * 2); ctx.fill();
        const tg = ctx.createLinearGradient(0, ey + 0.1 * s, 0, ey + 0.75 * s);
        tg.addColorStop(0, 'rgba(0,0,0,.95)'); tg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = tg; ctx.beginPath();
        ctx.moveTo(ex - 0.05 * s, ey + 0.12 * s);
        ctx.quadraticCurveTo(ex - 0.03 * s, ey + 0.5 * s, ex - 0.012 * s, ey + 0.75 * s);
        ctx.quadraticCurveTo(ex + 0.004 * s, ey + 0.45 * s, ex + 0.04 * s, ey + 0.12 * s);
        ctx.fill();
        const px = ex + look * s, py = ey + 0.01 * s;
        const pg = ctx.createRadialGradient(px, py, 0, px, py, 0.035 * s);
        pg.addColorStop(0, 'rgba(255,255,248,1)'); pg.addColorStop(0.25, 'rgba(240,240,225,.4)'); pg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, 0.035 * s, 0, Math.PI * 2); ctx.fill();
      }
      // nasal cavity
      ctx.fillStyle = 'rgba(4,4,4,.9)'; ctx.beginPath();
      ctx.moveTo(0, 0.1 * s);
      ctx.quadraticCurveTo(-0.1 * s, 0.24 * s, -0.055 * s, 0.31 * s); ctx.lineTo(0, 0.27 * s); ctx.lineTo(0.055 * s, 0.31 * s);
      ctx.quadraticCurveTo(0.1 * s, 0.24 * s, 0, 0.1 * s); ctx.fill();
      // the mouth, and the cuts that keep going toward the ears
      ctx.strokeStyle = '#030303'; ctx.lineCap = 'round';
      for (const sd of [-1, 1]) {
        for (const [w, al] of [[0.03, 0.9], [0.014, 1]]) {
          ctx.lineWidth = w * s; ctx.globalAlpha = a * al;
          ctx.beginPath(); ctx.moveTo(sd * 0.38 * s, 0.5 * s); ctx.quadraticCurveTo(sd * 0.5 * s, 0.44 * s, sd * 0.54 * s, 0.12 * s); ctx.stroke();
        }
      }
      ctx.globalAlpha = a;
      ctx.fillStyle = '#020202'; ctx.beginPath();
      ctx.moveTo(-0.4 * s, 0.5 * s);
      ctx.quadraticCurveTo(0, 0.86 * s, 0.4 * s, 0.5 * s);
      ctx.quadraticCurveTo(0, 0.62 * s, -0.4 * s, 0.5 * s);
      ctx.fill();
      ctx.strokeStyle = 'rgba(178,176,160,.6)'; ctx.lineWidth = 0.016 * s; ctx.lineCap = 'butt';
      TEETH.forEach((len, i) => {
        const x = (-0.34 + i * 0.0425) * s, k = x / (0.4 * s);
        const yTop = 0.5 * s + 0.06 * s * (1 - k * k) + 0.008 * s;
        ctx.beginPath(); ctx.moveTo(x, yTop); ctx.lineTo(x + 0.004 * s, yTop + len * s * (1 - Math.abs(k) * 0.5)); ctx.stroke();
      });
      ctx.restore();
    }

    function chairAndYou(phoneGlow) {
      // backrest
      ctx.fillStyle = '#2a2d27';
      ctx.beginPath(); ctx.roundRect(575, 545, 270, 300, [60, 60, 10, 10]); ctx.fill();
      // you: head bowed over a phone, lit from below
      ctx.fillStyle = '#070807';
      ctx.beginPath(); ctx.roundRect(630, 655, 160, 200, 50); ctx.fill();
      ctx.fillRect(696, 650, 28, 30);
      const hg = ctx.createRadialGradient(712, 650, 4, 710, 625, 58);
      hg.addColorStop(0, '#5d6a72'); hg.addColorStop(0.45, '#1c2124'); hg.addColorStop(1, '#070807');
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.ellipse(710, 618, 40, 50, 0.12, 0, Math.PI * 2); ctx.fill();
      if (phoneGlow) {
        let g = ctx.createRadialGradient(710, 650, 5, 710, 640, 95);
        g.addColorStop(0, 'rgba(170,200,230,.30)'); g.addColorStop(1, 'rgba(170,200,230,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(710, 640, 95, 80, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(205,225,245,.9)'; ctx.fillRect(694, 738, 30, 22);
        g = ctx.createRadialGradient(709, 749, 2, 709, 749, 60);
        g.addColorStop(0, 'rgba(190,215,240,.35)'); g.addColorStop(1, 'rgba(190,215,240,0)');
        ctx.fillStyle = g; ctx.fillRect(640, 690, 140, 120);
      }
      // arms + seat front
      ctx.fillStyle = '#23261f';
      ctx.beginPath(); ctx.roundRect(548, 690, 82, 220, 26); ctx.fill();
      ctx.beginPath(); ctx.roundRect(790, 690, 82, 220, 26); ctx.fill();
      ctx.fillStyle = '#1a1c17'; ctx.fillRect(610, 800, 200, 120);
    }

    function hand(x, y, s) {
      ctx.strokeStyle = '#050505'; ctx.lineCap = 'round';
      ctx.lineWidth = 14 * s; ctx.beginPath(); ctx.moveTo(x - 60 * s, y - 120 * s); ctx.quadraticCurveTo(x - 20 * s, y - 40 * s, x, y); ctx.stroke();
      ctx.lineWidth = 5 * s;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + (10 + i * 10) * s, y + 5 * s, x + (14 + i * 12) * s, y + (40 + i * 6) * s); ctx.stroke(); }
    }

    function scene(k, lt, t) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      if (k === 5) {
        const s = Math.min(H * 0.46, W * 0.7) * (1 + lt * 0.12);
        const fx = W / 2 + Math.sin(t / 900) * 3, fy = H * 0.52, tl = Math.sin(t / 1400) * 0.05 + 0.1;
        face(fx, fy, s, tl);
        face(fx + 4 + Math.sin(t / 130) * 2, fy, s, tl, 0.18); // a smeared second image, like a bad signal
        return;
      }
      sceneTransform();
      room();
      const sway = Math.sin(t / 1700) * 4;
      const creep = 1 + lt * 0.06;
      if (k === 1) figure(985 + sway * 0.3, 560, 360 * creep, { eyes: 0.35 + lt * 0.3 });
      if (k === 2) figure(1005 + sway, 700, 520 * creep, { eyes: 0.6, tilt: 0.12 });
      if (k === 3) figure(760 + sway, 900, 780 * creep, { eyes: 0.8, tilt: -0.18 });
      if (k === 4) {
        // hunched forward over you, head dropped below its shoulders
        figure(745, 980, 900, { noHead: true });
        face(745 + sway, 270 + lt * 40, 120 * (1 + lt * 0.15), 0.42, 0.95);
      }
      chairAndYou(true);
      if (k === 3) hand(808, 548, 1 + lt * 0.05);
      if (k === 4) { hand(820, 552, 1.05); ctx.save(); ctx.translate(1420, 0); ctx.scale(-1, 1); hand(820, 552, 1.05); ctx.restore(); }
    }

    function post(t, burst) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const px = nimg.data;
      for (let i = 0; i < px.length; i += 4) { const v = (Math.random() * 255) | 0; px[i] = px[i + 1] = px[i + 2] = v; px[i + 3] = 255; }
      nctx.putImageData(nimg, 0, 0);
      ctx.globalAlpha = burst ? 0.75 : 0.13;
      ctx.drawImage(noise, 0, 0, W, H);
      ctx.globalAlpha = 1;
      if (burst) {
        for (let i = 0; i < 6; i++) {
          const y = Math.random() * H, h = 4 + Math.random() * 30;
          ctx.drawImage(canvas, 0, y, W, h, (Math.random() - 0.5) * 60, y, W, h);
        }
      }
      // rolling band
      const by = ((t / 22) % (H + 120)) - 60;
      const g = ctx.createLinearGradient(0, by - 50, 0, by + 50);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.045)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, by - 50, W, 100);
      // scanlines
      ctx.fillStyle = 'rgba(0,0,0,.22)';
      for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
      // green-grey tint + vignette
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = '#b9c8b6'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.7)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }

    function hud(k) {
      const d = new Date(), p2 = (n) => String(n).padStart(2, '0');
      stamp.textContent = `${p2(d.getMonth() + 1)}-${p2(d.getDate())}-${d.getFullYear()}  ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
      motion.classList.toggle('on', k >= 1 && k <= 5);
      count.textContent = k === 0 ? 'OCCUPANTS: 1' : k === 6 ? 'OCCUPANTS: 2 · 1 NOT VISIBLE' : 'OCCUPANTS: 2';
    }

    function frame(t) {
      if (!visible) { running = false; return; }
      const k = keyFor(f), lt = localT(f);
      if (k !== key) {
        const prev = key;
        key = k;
        if (prev !== -1) burstUntil = t + (reduced ? 120 : 320);
        caption.classList.remove('on');
        const text = CAPTIONS[k];
        setTimeout(() => { if (key === k && text) { caption.textContent = text; caption.classList.add('on'); } }, 450);
        if (k === 5 && !stung) {
          stung = true;
          sound.sting();
          if (!reduced) { sticky.classList.remove('shake'); void sticky.offsetWidth; sticky.classList.add('shake'); }
        }
        if (k < 4) stung = false;
      }
      const burst = t < burstUntil;
      scene(burst && Math.random() < 0.5 ? Math.max(0, k - 1) : k, lt, t);
      post(t, burst);
      hud(k);
      requestAnimationFrame(frame);
    }

    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !running) { running = true; requestAnimationFrame(frame); }
    }).observe(sticky);

    return { setProgress(v) { f = v; } };
  })();

  /* ---------- Haunted state: once you've seen the end, the top isn't safe ---------- */
  function haunt() {
    if (root.classList.contains('haunted')) return;
    root.classList.add('haunted');
    try { sessionStorage.setItem('dwellwise-haunted', '1'); } catch { /* fine */ }
    $('#announce-text').textContent = 'You live here now.';
    $('#announce a').textContent = 'Stay →';
    $('#hero-title').innerHTML = 'Your home,<br><span class="grad">but ours.</span>';
    $('#hero-lede').textContent = 'Dwellwise learned your routines. Now you can learn ours. There’s no need to get up. There’s no need to look around.';
    $('#phone-greet').textContent = 'Welcome back 👋';
    $('#phone-sub').textContent = 'You never left.';
    $('#door-state').textContent = 'Unlocked';
    $('#fc1-text').textContent = 'Night routine complete';
    $('#fc2-kpi').textContent = '+1';
    $('#fc2-text').textContent = 'heartbeat detected';
    $('#presence-count').textContent = '2 people home';
    $('#presence-count').closest('.tile').classList.add('t-presence');
    $('#logo-text').textContent = 'Dwell';
    $('#nav-cta').textContent = 'Stay';
    $('.eyebrow').lastChild.textContent = ' 1 new occupant detected';
    baseTitle = document.title = 'Dwellwise — Welcome home';
  }
  try { if (sessionStorage.getItem('dwellwise-haunted') === '1') haunt(); } catch { /* fine */ }

  const endEl = $('.end');
  new IntersectionObserver(([e]) => { if (e.isIntersecting) { endEl.classList.add('seen'); haunt(); } }, { threshold: 0.5 }).observe(endEl);
  $('#end-stay').addEventListener('click', () => { scrollTo({ top: 0, behavior: 'instant' }); });

  /* ---------- Scroll driver ---------- */
  const insights = $('.insights'), eyesField = $('.eyes-field'), cctvSec = $('.cctv');
  const theme = $('meta[name="theme-color"]');
  const sectionProgress = (el) => { const r = el.getBoundingClientRect(); return clamp(-r.top / (r.height - innerHeight)); };

  let ticking = false;
  function onScroll() {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    dread = clamp(scrollY / Math.max(1, max));
    root.style.setProperty('--dread', dread.toFixed(3));

    const darkNav = insights.getBoundingClientRect().top <= 68;
    root.classList.toggle('dark-nav', darkNav);
    root.classList.toggle('hide-nav', cctvSec.getBoundingClientRect().top <= 1);
    theme.content = darkNav ? '#000000' : '#ffffff';
    setIcon(dread > 0.5 || root.classList.contains('haunted') ? 'eye' : 'home');
    setGhost(dread > 0.42 && dread < 0.97);

    // insights log
    const ip = sectionProgress(insights);
    const shown = Math.round(ip * (logItems.length + 1));
    logItems.forEach((li, i) => li.classList.toggle('on', i < shown));
    icSub.textContent = shown >= logItems.length - 1 ? 'Right now, at your home' : 'Last night at your home';

    // eyes
    const ep = sectionProgress(eyesField);
    eyesField.style.setProperty('--ep', ep.toFixed(3));
    const openCount = Math.round(smooth(0.02, 0.75, ep) * pairs.length);
    pairs.forEach((p, i) => p.el.classList.toggle('open', i < openCount));
    queueTrack();

    cctv.setProgress(sectionProgress(cctvSec));
    sound.update(dread);
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();
})();
