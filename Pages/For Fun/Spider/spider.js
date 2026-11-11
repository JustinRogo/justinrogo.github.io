/* Shared by the Wikipedia experiment and the live-page bookmarklet. No dependencies. */
const COLORS = ['#ff2d95', '#2de2ff', '#8b5cf6', '#ffffff'];
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/* Each species has its own palette, body, leg length, and gait. `ink` colours the text it infects.
   legScale stretches reach; pace/rest/step tune walking speed, probing pauses, and footstep timing. */
export const SPECIES = {
  weaver: { name: 'Neon Weaver', latin: 'Araneae.exe', body: 'mesh', legScale: 1, legWidth: .85,
    pace: 1, rest: .22, step: 1, main: '#ff2d95', leg: '#a5f3ff', joint: '#2de2ff', feet: ['#ff2d95', '#ffffff'],
    glow: '#2de2ff', silk: '#a5e8ff', ink: ['#ff2d95', '#2de2ff', '#8b5cf6'] },
  jumper: { name: 'Jumping Spider', latin: 'Salticidae.exe', body: 'jumper', legScale: .74, legWidth: 1.35,
    pace: 1.4, rest: .45, step: .7, main: '#ffb02e', leg: '#ffd68a', joint: '#ff2d95', feet: ['#ffb02e', '#ffffff'],
    glow: '#ff9d2e', silk: '#ffd9a0', ink: ['#ffb02e', '#ff2d95', '#ff6b3d'] },
  longlegs: { name: 'Daddy Longlegs', latin: 'Pholcidae.exe', body: 'longlegs', legScale: 1.28, legWidth: .55,
    pace: .7, rest: .12, step: 1.5, main: '#c4b5fd', leg: '#ece7ff', joint: '#a78bfa', feet: ['#ffffff', '#c4b5fd'],
    glow: '#a78bfa', silk: '#ddd6fe', ink: ['#a78bfa', '#7dd3fc', '#c084fc'] },
  widow: { name: 'Black Widow', latin: 'Latrodectus.exe', body: 'widow', legScale: 1, legWidth: 1,
    pace: .9, rest: .3, step: 1.1, main: '#ff2e4d', leg: '#ff9aa8', joint: '#ff2e4d', feet: ['#ff2e4d', '#ffffff'],
    glow: '#ff2e4d', silk: '#ffc2cb', ink: ['#ff2e4d', '#ff5470', '#ff8a3d'] },
  tarantula: { name: 'Glitch Tarantula', latin: 'Theraphosidae.exe', body: 'tarantula', legScale: .9, legWidth: 1.8,
    pace: .75, rest: .35, step: 1.3, main: '#b8ff3c', leg: '#dcffa0', joint: '#2de2ff', feet: ['#b8ff3c', '#ffffff'],
    glow: '#b8ff3c', silk: '#e4ffb5', ink: ['#b8ff3c', '#2de2ff', '#5dff9f'] },
};

/* Individual sizes on top of species. Smaller spiders have shorter legs and move faster. */
export const SIZES = {
  runt: { label: 'Runt', scale: .7, speed: 1.55, note: 'tiny and quick' },
  small: { label: 'Small', scale: .85, speed: 1.22, note: 'nimble' },
  adult: { label: 'Adult', scale: 1, speed: 1, note: 'full grown' },
  giant: { label: 'Giant', scale: 1.22, speed: .76, note: 'big and slow' },
};

/* Diets decide what a spider hunts: it seeks matching text and only mutates (and follows) its prey.
   Footholds are links, footnotes, and short spans of up to seven words. */
const text = el => el.textContent.trim();
export const DIETS = {
  omnivore: { label: 'Omnivore', prey: 'anything it touches', test: () => true },
  vowels: { label: 'Vowel hunter', prey: 'links that start with a vowel',
    test: el => { const link = el.closest('a'); return Boolean(link) && /^[aeiou]/i.test(text(link)); } },
  numbers: { label: 'Number cruncher', prey: 'digits, dates, and footnotes', test: el => /\d/.test(text(el)) },
  capitals: { label: 'Name dropper', prey: 'capitalized words', test: el => /(^|[\s(“"])\p{Lu}/u.test(text(el)) },
  links: { label: 'Link lurker', prey: 'links and citations', test: el => Boolean(el.closest('a, sup')) },
  bold: { label: 'Emphasis eater', prey: 'bold, italics, and headings',
    test: el => Boolean(el.closest('b, strong, i, em, h1, h2, h3, h4, th, dt, caption') || el.querySelector?.('b, strong, i, em')) },
  long: { label: 'Sesquipedalian', prey: 'words of nine or more letters', test: el => /\p{L}{9,}/u.test(text(el)) },
};

const shuffle = items => {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
};

/** A random order of every species; spider n uses entry n, so spiders on a page never repeat. */
export function shuffledSpecies() { return shuffle(Object.keys(SPECIES)); }

/** A full random cast: distinct species, distinct diets, and a spread of sizes. */
export function rollCast() {
  const diets = shuffle(Object.keys(DIETS));
  const sizes = shuffle(['runt', 'small', 'adult', 'adult', 'giant']);
  return shuffledSpecies().map((species, i) => ({ species, size: sizes[i], diet: diets[i] }));
}

/** Accepts species ids or partial specimens and returns five complete, distinct specimens. */
function normalizeCast(cast) {
  const entries = (Array.isArray(cast) ? cast : []).map(entry => typeof entry === 'string' ? { species: entry } : entry || {});
  const result = [], filler = rollCast();
  for (const entry of entries) {
    if (!SPECIES[entry.species] || result.some(item => item.species === entry.species)) continue;
    result.push({ species: entry.species, size: SIZES[entry.size] ? entry.size : 'adult', diet: DIETS[entry.diet] ? entry.diet : 'omnivore' });
  }
  for (const extra of filler) if (result.length < 5 && !result.some(item => item.species === extra.species)) result.push(extra);
  return result;
}

export class WebCrawler {
  constructor({ root, canvas, viewport = window, speed = 1, count = 1, cast = rollCast(),
    paused = matchMedia('(prefers-reduced-motion: reduce)').matches,
    maxMutations = 420, intensity = .65, onStats = () => {}, onPlant = () => {}, onEnd = () => {} }) {
    this.root = root;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.viewport = viewport;
    this.speed = speed;
    this.setIntensity(intensity);
    this.paused = paused;
    this.maxMutations = clamp(maxMutations, 0, 1000);
    this.onStats = onStats;
    this.onPlant = onPlant;
    this.onEnd = onEnd;
    // Spider n is cast[n]: species, size, and diet stay fixed for this crawler.
    this.cast = normalizeCast(cast);
    this.dietMemo = new WeakMap();
    this.endTime = 0;
    this.endNotified = false;
    this.originals = new Map();
    this.debris = [];
    this.silk = [];
    this.hoverAnchor = null;
    this.focusAnchor = null;
    this.spiders = [];
    this.candidates = [];
    this.lastScan = -Infinity;
    this.lastStats = 0;
    this.time = 0;
    this.scrollRemainder = 0;
    this.dirty = true;
    this.destroyed = false;
    this.invalidate = () => { this.dirty = true; this.lastScan = -Infinity; };
    this.visibility = () => { this.previous = 0; this.invalidate(); };
    this.scrollTarget = viewport;
    this.onScroll = () => { this.dirty = true; };
    this.scrollTarget.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.invalidate, { passive: true });
    document.addEventListener('visibilitychange', this.visibility);
    this.observer = new ResizeObserver(this.invalidate);
    this.observer.observe(canvas);
    this.pointerMove = event => {
      this.hoverAnchor = event.pointerType === 'touch' ? null : this.attractionAnchor(event.target, event.clientX, event.clientY);
    };
    this.pointerLeave = () => { this.hoverAnchor = null; };
    this.focusIn = event => { this.focusAnchor = this.attractionAnchor(event.target); };
    this.focusOut = () => { this.focusAnchor = null; };
    root.addEventListener('pointermove', this.pointerMove, { passive: true });
    root.addEventListener('pointerleave', this.pointerLeave);
    root.addEventListener('focusin', this.focusIn);
    root.addEventListener('focusout', this.focusOut);
    this.setCount(count);
    this.tick = this.tick.bind(this);
    this.raf = requestAnimationFrame(this.tick);
  }

  bounds() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
    if (this.width !== width || this.height !== height || this.dpr !== dpr) {
      const oldWidth = this.width || width, oldHeight = this.height || height;
      this.width = width; this.height = height; this.dpr = dpr;
      this.canvas.width = Math.round(width * dpr);
      this.canvas.height = Math.round(height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const spider of this.spiders) {
        spider.x = clamp(spider.x == null ? width * .46 : spider.x / oldWidth * width, 22, Math.max(22, width - 22));
        spider.y = clamp(spider.y == null ? height * .32 : spider.y / oldHeight * height, 22, Math.max(22, height - 22));
        spider.goal = null;
      }
      this.lastScan = -Infinity;
    }
    this.rect = rect;
  }

  setCount(count) {
    const desired = clamp(Math.round(Number(count) || 1), 1, 5);
    while (this.spiders.length < desired) {
      const id = this.spiders.length, specimen = this.cast[id % this.cast.length];
      this.spiders.push({ species: SPECIES[specimen.species], size: SIZES[specimen.size],
        diet: { id: specimen.diet, ...DIETS[specimen.diet] },
        x: this.width ? this.width * (.3 + id * .1) : undefined,
        y: this.height ? this.height * (.28 + id * .06) : undefined,
        seed: Math.random() * 100, angle: Math.PI, vx: 0, vy: 0, pace: 70,
        restUntil: 0, goal: null, lastPlant: null, lastSilkTime: -Infinity,
        legs: Array.from({ length: 8 }, (_, i) => ({ index: i, foot: null,
          target: null, progress: 0, duration: .22, plantedAt: -Infinity, cooldown: i * .045 })) });
    }
    this.spiders.length = desired;
    this.invalidate();
  }

  setSpeed(speed) { this.speed = clamp(Number(speed) || 1, .25, 3); }
  setIntensity(value) { this.intensity = clamp(Number.isFinite(Number(value)) ? Number(value) : .65, 0, 1); }
  setPaused(paused) { this.paused = Boolean(paused); this.previous = 0; this.dirty = true; }

  attractionAnchor(target, clientX, clientY) {
    const el = target?.closest?.('a, span, p, li, td, h1, h2, h3, strong, em');
    if (!el || !this.root.contains(el) || !el.textContent.trim()
      || el.closest('[data-crawler-ui], button, input, textarea, select, [contenteditable]')) return null;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return { el, u: clientX == null ? .5 : clamp((clientX - rect.left) / rect.width, 0, 1),
      v: clientY == null ? .5 : clamp((clientY - rect.top) / rect.height, 0, 1) };
  }

  leaveSilk(spider, anchor) {
    const previous = spider.lastPlant;
    spider.lastPlant = { ...anchor };
    if (!previous || previous.el === anchor.el || this.time - spider.lastSilkTime < .8 || Math.random() > .18) return;
    const a = this.point(previous), b = this.point(anchor);
    if (!a || !b || distance(a, b) > this.reach(spider) * 2.5) return;
    spider.lastSilkTime = this.time;
    if (this.silk.length >= 36) this.silk.shift();
    this.silk.push({ a: previous, b: { ...anchor }, born: this.time, life: 12, color: spider.species?.silk });
  }

  scan() {
    // Refresh visible targets only 3 times/second; per-frame geometry is limited to planted feet.
    const all = this.root.querySelectorAll('a[href], sup, span, b, strong, em, p, li, h2, h3');
    this.candidates = [];
    for (let i = 0; i < all.length && i < 12000; i++) {
      const el = all[i];
      if (el.matches('p, li') && el.querySelector('span, a, strong')) continue;
      if (!el.textContent.trim() || el.closest('[data-crawler-ui], script, style, nav, button, input, textarea, select, [contenteditable]')) continue;
      // A wrapped phrase has several line boxes; plant on text, not its enclosing whitespace.
      for (const r of [...el.getClientRects()].slice(0, 3)) {
        if (!r.width || !r.height || r.bottom < this.rect.top || r.top > this.rect.bottom || r.right < this.rect.left || r.left > this.rect.right) continue;
        this.candidates.push({ el, x: clamp(r.left + r.width * .5 - this.rect.left, 4, this.width - 4),
          y: clamp(r.top + Math.min(r.height / 2, 14) - this.rect.top, 4, this.height - 4),
          link: el.matches('a, sup'), large: r.width > 300 || r.height > 70 });
      }
      if (this.candidates.length >= 450) break;
    }
  }

  anchor(candidate) {
    const r = candidate.el.getBoundingClientRect();
    return { el: candidate.el, u: clamp((candidate.x + this.rect.left - r.left) / r.width, .05, .95),
      v: clamp((candidate.y + this.rect.top - r.top) / r.height, .05, .95) };
  }

  point(anchor) {
    if (!anchor || !anchor.el.isConnected) return null;
    const r = anchor.el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return { x: r.left + r.width * anchor.u - this.rect.left,
      y: r.top + r.height * anchor.v - this.rect.top };
  }

  /** Whether this spider's diet includes the element. Spiders without a diet eat anything. */
  eats(spider, el) {
    const diet = spider?.diet;
    if (!diet || diet.id === 'omnivore' || !el) return true;
    let memo = this.dietMemo.get(el);
    if (!memo) this.dietMemo.set(el, memo = {});
    return memo[diet.id] ??= diet.test(el);
  }

  picky(spider) { return Boolean(spider?.diet && spider.diet.id !== 'omnivore'); }

  chooseGoal(spider) {
    const kind = spider.species || SPECIES.weaver, reach = this.reach(spider), picky = this.picky(spider);
    let best = null, score = Infinity;
    for (const candidate of this.candidates) {
      const d = distance(spider, candidate);
      if (d > reach * 2.4 || d < 55) continue;
      // Picky eaters steer hard toward untouched prey.
      const prey = picky && this.eats(spider, candidate.el) && !this.originals.has(candidate.el);
      const value = Math.abs(d - reach * 1.2) + (candidate.y < spider.y - 45 ? 55 : 0)
        - (candidate.link ? 30 : 0) + (this.originals.has(candidate.el) ? 40 : 0)
        - (prey ? 90 : 0) + Math.random() * 75;
      if (value < score) { score = value; best = candidate; }
    }
    spider.goal = best ? this.anchor(best) : null;
    spider.goalUntil = this.time + 1.5 + Math.random() * 2;
    spider.pace = (48 + Math.random() * 58) * kind.pace * (spider.size?.speed || 1);
    if (Math.random() < kind.rest) spider.restUntil = this.time + .25 + Math.random() * .75;
  }

  /** Leg reach in CSS pixels; a spider argument applies its species' leg length and its size. */
  reach(spider) {
    const base = clamp(Math.min(this.width || 500, this.height || 500) * .34, 100, 175);
    if (!spider) return base;
    return base * clamp((spider.species?.legScale || 1) * (spider.size?.scale || 1), .6, 1.45);
  }

  legPose(spider, index, spread = 1) {
    const side = index < 4 ? -1 : 1, row = index % 4;
    const reach = this.reach(spider);
    const c = Math.cos(spider.angle), s = Math.sin(spider.angle);
    const project = (x, y) => ({ x: spider.x + x * c - y * s, y: spider.y + x * s + y * c });
    return { hip: project(side * 5, (row - 1.5) * 4),
      ideal: project(side * reach * [.66, .87, .83, .63][row] * spread,
        reach * [-.7, -.28, .3, .72][row] * spread - 16),
      outward: { x: side * c, y: side * s } };
  }

  legJoint(hip, foot, outward, spider) {
    const d = Math.max(.001, distance(hip, foot));
    const nx = -(foot.y - hip.y) / d, ny = (foot.x - hip.x) / d;
    const bend = nx * outward.x + ny * outward.y < 0 ? -1 : 1;
    const segment = this.reach(spider) * .68;
    const height = Math.sqrt(Math.max(0, segment * segment - d * d / 4));
    return { x: (hip.x + foot.x) / 2 + nx * height * bend,
      y: (hip.y + foot.y) / 2 + ny * height * bend };
  }

  infect(anchor, spider) {
    const el = anchor.el;
    if (!el.isConnected || this.originals.has(el) || this.originals.size >= this.maxMutations) return;
    if (!this.eats(spider, el)) return; // Not on the menu: the spider just walks over it.
    this.originals.set(el, el.getAttribute('style'));
    // Picky eaters savour their prey a little more dramatically.
    const strength = this.picky(spider) ? Math.min(1, this.intensity + .2) : this.intensity;
    const ink = spider?.species?.ink || COLORS;
    const color = ink[Math.floor(Math.random() * 3)];
    const set = (name, value) => el.style.setProperty(name, value, 'important');
    const effect = strength < .25 ? (Math.random() < .5 ? 1 : 5) : Math.floor(Math.random() * 6);
    switch (effect) {
      case 0:
        set('background-color', color); set('color', '#090b10'); set('box-shadow', `0 0 12px ${color}66`);
        if (Math.random() < .24 * strength) { set('font-size', `${1 + .9 * strength}em`); set('letter-spacing', `${3 * strength}px`); }
        break;
      case 1: set('outline', `1px solid ${color}`); set('outline-offset', '2px'); break;
      case 2: set('font-family', 'monospace'); set('color', color); set('letter-spacing', `${strength}px`); break;
      case 3: set('font-family', 'Georgia, serif'); set('font-size', `${1 + (Math.random() < .3 * strength ? 1.8 : .45) * strength}em`); set('color', '#ff365e'); break;
      case 4:
        set('display', 'inline-block'); set('transform', `rotate(${((Math.random() - .5) * (Math.random() < .24 * strength ? 200 : 40) * strength).toFixed(1)}deg)`); set('color', color);
        break;
      case 5: set('color', color); set('text-shadow', `2px 1px ${color}66`); break;
    }
    if (Math.random() < .49 * strength && this.debris.length < 48) {
      const text = el.textContent.trim().match(/\b\d+\b/)?.[0] || el.textContent.trim().slice(0, 22);
      if (text) this.debris.push({ anchor, text, color, dx: Math.random() * 130 - 65,
        dy: -12 - Math.random() * 50, rotation: Math.random() * .7 - .35,
        size: 11 + Math.random() * 17 * strength });
    }
  }

  move(spider, dt) {
    if (this.time >= (spider.goalUntil || 0) || (spider.goal && !this.point(spider.goal))) this.chooseGoal(spider);
    const attraction = this.point(this.hoverAnchor || this.focusAnchor);
    const goal = attraction || this.point(spider.goal);
    const phase = this.time * 1.9 + spider.seed;
    const resting = !attraction && this.time < spider.restUntil;
    let vx = Math.sin(phase * .6) * 22, vy = 34 + Math.cos(phase * .7) * 16;
    if (goal) {
      const dx = goal.x - spider.x, dy = goal.y - spider.y, d = Math.hypot(dx, dy) || 1;
      const pace = attraction ? Math.min(d * 1.4, 85) : spider.pace;
      vx = dx / d * pace + (attraction ? 0 : Math.sin(phase) * 13);
      vy = dy / d * pace + (attraction ? 0 : Math.cos(phase * 1.3) * 10);
      if (d < 32) spider.goalUntil = 0;
    }
    const reach = this.reach(spider);
    if (spider.x < reach * .4) vx += 50;
    if (spider.x > this.width - reach * .4) vx -= 50;
    if (spider.y > this.height * .72) vy -= 65;
    if (spider.y < reach * .4) vy += 50;
    if (resting) { vx *= .08; vy *= .08; }
    // Planted feet pull the body toward their support polygon, keeping the crawl grounded.
    let supportX = 0, supportY = 0, support = 0;
    for (const leg of spider.legs) {
      const foot = this.point(leg.foot);
      if (!foot || leg.target || distance(spider, foot) > reach * 1.2) continue;
      const ideal = this.legPose(spider, leg.index).ideal;
      supportX += foot.x - ideal.x; supportY += foot.y - ideal.y; support++;
    }
    if (support) { vx += clamp(supportX / support * .5, -24, 24); vy += clamp(supportY / support * .5, -24, 24); }
    const blend = 1 - Math.exp(-dt * 7);
    spider.vx += (vx - spider.vx) * blend; spider.vy += (vy - spider.vy) * blend;
    const turn = Math.atan2(spider.vy, spider.vx) + Math.PI / 2;
    const angularDifference = Math.atan2(Math.sin(turn - spider.angle), Math.cos(turn - spider.angle));
    if (Math.hypot(spider.vx, spider.vy) > 8) spider.angle += angularDifference * (1 - Math.exp(-dt * 5));
    spider.x = clamp(spider.x + spider.vx * dt, 25, Math.max(25, this.width - 25));
    spider.y = clamp(spider.y + spider.vy * dt, 25, Math.max(25, this.height - 25));
    let swinging = spider.legs.filter(leg => leg.target).length;
    for (const leg of spider.legs) {
      leg.cooldown -= dt;
      if (leg.target) {
        const target = this.point(leg.target);
        leg.progress = Math.min(1, leg.progress + dt / leg.duration);
        if (!target) { leg.target = null; continue; }
        if (leg.progress >= 1) {
          leg.foot = leg.target; leg.target = null; leg.cooldown = .12 + Math.random() * .18;
          leg.plantedAt = this.time;
          this.infect(leg.foot, spider);
          this.leaveSilk(spider, leg.foot);
          this.onPlant(leg.foot.el, this.time, { spider, prey: this.eats(spider, leg.foot.el) });
          if (this.paused || this.destroyed) return;
        }
        continue;
      }
      const foot = this.point(leg.foot);
      const { hip, ideal } = this.legPose(spider, leg.index);
      const needsStep = !foot || distance(spider, foot) > reach || distance(ideal, foot) > reach * .48
        || foot.y < -10 || foot.y > this.height + 10
        || (this.time - leg.plantedAt > 2.5 && leg.index % 4 < 2);
      if (!needsStep || swinging >= 3 || leg.cooldown > 0) continue;
      const occupied = new Set(spider.legs.map(l => (l.target || l.foot)?.el));
      const picky = this.picky(spider);
      let best = null, score = Infinity;
      for (const candidate of this.candidates) {
        if (distance(spider, candidate) > reach * .98 || distance(spider, candidate) < 20) continue;
        const value = distance(ideal, candidate) + (candidate.link ? -12 : 0)
          + (occupied.has(candidate.el) ? reach : 0) + (candidate.large ? 35 : 0)
          + (this.originals.has(candidate.el) ? 16 : 0)
          + (picky ? (this.eats(spider, candidate.el) ? -22 : 8) : 0);
        if (value < score) { score = value; best = candidate; }
      }
      if (best) {
        leg.start = foot && distance(spider, foot) < reach * 1.25 ? foot : hip;
        leg.target = this.anchor(best); leg.progress = 0;
        leg.duration = (.16 + Math.random() * .14) * (spider.species?.step || 1) / Math.sqrt(spider.size?.speed || 1); swinging++;
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.lineCap = 'round';
    ctx.save(); ctx.lineWidth = .6;
    for (const thread of this.silk) {
      const a = this.point(thread.a), b = this.point(thread.b);
      if (!a || !b) continue;
      ctx.strokeStyle = thread.color || '#a5e8ff';
      ctx.globalAlpha = .22 * Math.max(0, 1 - (this.time - thread.born) / thread.life);
      ctx.beginPath(); ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + 6, b.x, b.y); ctx.stroke();
    }
    ctx.restore();
    for (const debris of this.debris) {
      const p = this.point(debris.anchor);
      if (!p || p.y < -70 || p.y > this.height + 70) continue;
      ctx.save(); ctx.translate(p.x + debris.dx, p.y + debris.dy); ctx.rotate(debris.rotation);
      ctx.font = `${debris.size}px monospace`; ctx.fillStyle = debris.color; ctx.globalAlpha = .8;
      ctx.fillText(debris.text, 0, 0); ctx.restore();
    }
    this.spiders.forEach(spider => {
      const kind = spider.species || SPECIES.weaver;
      const color = kind.main;
      spider.legs.forEach(leg => {
        const { hip, outward } = this.legPose(spider, leg.index);
        const reach = this.reach(spider);
        let foot = this.point(leg.foot);
        if (foot && distance(spider, foot) > reach * 1.24) { leg.foot = null; foot = null; }
        if (leg.target) {
          const target = this.point(leg.target);
          if (target && distance(spider, target) <= reach * 1.24) {
            const t = leg.progress, smooth = t * t * (3 - 2 * t);
            foot = { x: leg.start.x + (target.x - leg.start.x) * smooth,
              y: leg.start.y + (target.y - leg.start.y) * smooth - Math.sin(t * Math.PI) * 16 };
          } else leg.target = null;
        }
        if (!foot) foot = this.legPose(spider, leg.index, .55).ideal;
        const joint = this.legJoint(hip, foot, outward, spider);
        // A dark under-stroke keeps the neon visible on both page themes.
        ctx.beginPath(); ctx.moveTo(hip.x, hip.y); ctx.lineTo(joint.x, joint.y); ctx.lineTo(foot.x, foot.y);
        const legWidth = kind.legWidth * Math.sqrt(spider.size?.scale || 1);
        ctx.strokeStyle = '#080b16'; ctx.lineWidth = legWidth + 1.65; ctx.stroke();
        ctx.strokeStyle = leg.index % 3 ? kind.leg : color; ctx.lineWidth = legWidth; ctx.stroke();
        if (kind.body === 'tarantula') {
          // Bristles along the femur, plus a chromatic-aberration ghost of the leg.
          for (let t = .2; t < .9; t += .2) {
            const x = hip.x + (joint.x - hip.x) * t, y = hip.y + (joint.y - hip.y) * t;
            ctx.beginPath(); ctx.moveTo(x - 2, y - 2); ctx.lineTo(x + 2, y + 2); ctx.moveTo(x + 2, y - 2); ctx.lineTo(x - 2, y + 2);
            ctx.strokeStyle = kind.leg; ctx.lineWidth = .6; ctx.stroke();
          }
          ctx.save(); ctx.globalAlpha = .45; ctx.translate(1.5, 0);
          ctx.beginPath(); ctx.moveTo(hip.x, hip.y); ctx.lineTo(joint.x, joint.y); ctx.lineTo(foot.x, foot.y);
          ctx.strokeStyle = '#2de2ff'; ctx.lineWidth = .7; ctx.stroke(); ctx.restore();
        }
        for (const [p, r, fill] of [[joint, kind.body === 'longlegs' ? 1.1 : 1.5, kind.joint], [foot, 1.6, kind.feet[leg.index % 2]]]) {
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
        }
      });
      ctx.save(); ctx.translate(spider.x, spider.y); ctx.rotate(spider.angle);
      ctx.shadowColor = kind.glow; ctx.shadowBlur = 4;
      const scale = spider.size?.scale || 1;
      ctx.scale(scale, scale);
      this.drawBody(ctx, spider, kind);
      ctx.restore();
    });
  }

  /* Bodies are drawn in local space: the head points toward -y. */
  drawBody(ctx, spider, kind) {
    const pulse = Math.sin(this.time * 5 + spider.seed) * 1.5;
    const ellipse = (x, y, rx, ry, fill, stroke, width = 1) => {
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = '#080b16'; ctx.lineWidth = width + 1.5; ctx.stroke(); ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
    };
    const dot = (x, y, r, fill) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); };

    switch (kind.body) {
      case 'jumper': {
        // Fuzzy compact body with the salticid's two huge forward eyes.
        ellipse(0, 8 + pulse * .4, 7, 9, '#1a1006', kind.main, 1);
        ctx.beginPath(); ctx.moveTo(-4, 6); ctx.lineTo(0, 9); ctx.lineTo(4, 6); ctx.moveTo(-3, 11); ctx.lineTo(0, 13.5); ctx.lineTo(3, 11);
        ctx.strokeStyle = '#ff2d95'; ctx.lineWidth = .9; ctx.stroke();
        ellipse(0, -5, 7.5, 6.5, '#21140a', kind.main, 1);
        const blink = Math.sin(this.time * 1.7 + spider.seed) > .97 ? .3 : 1;
        for (const side of [-1, 1]) {
          dot(side * 3.2, -9, 2.9, '#ffffff');
          dot(side * 3.2, -9.3, 1.6 * blink, '#080b16');
          dot(side * 2.7, -10, .6, '#ffffff');
          dot(side * 6.2, -6.8, 1, kind.joint);
        }
        break;
      }
      case 'longlegs': {
        // A tiny bead of a body suspended between very long legs.
        ellipse(0, 3 + pulse * .3, 3.6, 6, 'rgba(196, 181, 253, .25)', kind.main, .8);
        ellipse(0, -4.5, 2.6, 2.4, 'rgba(196, 181, 253, .35)', kind.main, .8);
        dot(-.9, -5.6, .55, '#ffffff'); dot(.9, -5.6, .55, '#ffffff');
        break;
      }
      case 'widow': {
        // Glossy black abdomen with the red hourglass.
        ellipse(0, 9 + pulse * .3, 9, 10, '#07070b', kind.main, 1);
        ctx.beginPath(); ctx.ellipse(-3, 5, 3, 4.5, -.5, Math.PI * 1.1, Math.PI * 1.6);
        ctx.strokeStyle = 'rgba(255, 255, 255, .55)'; ctx.lineWidth = .9; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-3.2, 5.5); ctx.lineTo(3.2, 5.5); ctx.lineTo(0, 9.5); ctx.lineTo(3.2, 13.5); ctx.lineTo(-3.2, 13.5); ctx.lineTo(0, 9.5); ctx.closePath();
        ctx.fillStyle = kind.main; ctx.fill();
        ellipse(0, -5, 4.6, 5, '#0b0b12', kind.main, .9);
        dot(-1.4, -8.2, .7, kind.main); dot(1.4, -8.2, .7, kind.main);
        break;
      }
      case 'tarantula': {
        // Chunky, hairy, and slightly corrupted: a cyan ghost flickers beside the body.
        const glitch = Math.sin(this.time * 9 + spider.seed * 3) > .8 ? 2.5 : 1;
        ctx.save(); ctx.globalAlpha = .5; ctx.shadowBlur = 0;
        ellipse(glitch, 9, 9.5, 10.5, null, '#2de2ff', .8);
        ctx.restore();
        ellipse(0, 9 + pulse * .3, 9.5, 10.5, '#0d1405', kind.main, 1.1);
        ctx.beginPath();
        for (let i = 0; i < 18; i++) {
          const a = i / 18 * Math.PI * 2, x = Math.cos(a) * 9.5, y = 9 + Math.sin(a) * 10.5;
          ctx.moveTo(x, y); ctx.lineTo(x * 1.22, 9 + (y - 9) * 1.22);
        }
        ctx.strokeStyle = kind.leg; ctx.lineWidth = .7; ctx.stroke();
        ellipse(0, -5, 7.5, 6.5, '#121c08', kind.main, 1.1);
        for (const [x, y] of [[-2, -8], [2, -8], [0, -9.5]]) dot(x, y, .9, '#2de2ff');
        break;
      }
      default: {
        // The original triangulated neon mesh.
        const nodes = [[-8,-7], [7,-8], [-10,6], [9,7], [0,15 + pulse], [0,-14], [pulse,1]];
        for (const [a,b] of [[0,1],[0,2],[1,3],[2,3],[2,4],[3,4],[0,5],[1,5],[0,6],[1,6],[2,6],[3,6],[4,6]]) {
          ctx.beginPath(); ctx.moveTo(...nodes[a]); ctx.lineTo(...nodes[b]);
          ctx.strokeStyle = '#080b16'; ctx.lineWidth = 2.3; ctx.stroke();
          ctx.strokeStyle = a % 2 ? '#b8f5ff' : kind.main; ctx.lineWidth = .85; ctx.stroke();
        }
        nodes.forEach(([x,y], i) => dot(x, y, i === 6 ? 2 : 1.4, i % 2 ? '#fff' : '#2de2ff'));
      }
    }
  }

  autoScroll(dt) {
    if (this.point(this.hoverAnchor || this.focusAnchor)) return;
    const leader = this.spiders.reduce((a,b) => a.y > b.y ? a : b);
    const focus = this.height * .42;
    const rate = clamp(28 + (leader.y - focus) * .4, 0, 58);
    this.scrollRemainder += dt * rate * (this.time < leader.restUntil ? .25 : 1);
    if (this.scrollRemainder < 1) return;
    const pixels = Math.floor(this.scrollRemainder);
    this.scrollRemainder -= pixels;
    const scroller = this.viewport === window ? document.scrollingElement : this.viewport;
    const before = scroller.scrollTop;
    if (this.viewport === window) window.scrollBy({ top: pixels, behavior: 'instant' });
    else this.viewport.scrollTop += pixels;
    const scrolled = scroller.scrollTop - before;
    // Camera follows the crawl; both body and feet move with the document.
    for (const spider of this.spiders) spider.y = clamp(spider.y - scrolled, 25, Math.max(25, this.height - 25));
  }

  checkEnd(dt) {
    if (this.paused || this.destroyed || this.endNotified) return;
    const scroller = this.viewport === window ? document.scrollingElement : this.viewport;
    const atEnd = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
    this.endTime = atEnd ? this.endTime + dt : 0;
    // Linger at the final links; short articles get at least twelve seconds of crawling.
    if (this.endTime >= 6 && this.time >= 12) {
      this.endNotified = true;
      this.onEnd();
    }
  }

  tick(now) {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame(this.tick);
    if (document.hidden) { this.previous = 0; return; }
    if (this.paused && !this.dirty) { this.previous = 0; return; }
    this.bounds();
    const dt = this.previous ? Math.min((now - this.previous) / 1000, .04) * this.speed : 0;
    this.previous = now;
    if (!this.paused) {
      this.time += dt;
      this.silk = this.silk.filter(thread => this.time - thread.born < thread.life && thread.a.el.isConnected && thread.b.el.isConnected);
      if (now - this.lastScan > 320) { this.scan(); this.lastScan = now; }
      for (const spider of this.spiders) {
        this.move(spider, dt);
        if (this.paused || this.destroyed) return;
      }
      this.autoScroll(dt);
      this.checkEnd(dt);
      if (this.paused || this.destroyed) return;
    }
    this.draw(); this.dirty = false;
    if (now - this.lastStats > 500) {
      this.onStats({ mutations: this.originals.size, capped: this.originals.size >= this.maxMutations });
      this.lastStats = now;
    }
  }

  reset() {
    for (const [el, style] of this.originals) {
      if (style === null) el.removeAttribute('style'); else el.setAttribute('style', style);
    }
    this.originals.clear(); this.debris = []; this.silk = [];
    this.hoverAnchor = null; this.focusAnchor = null;
    this.time = 0; this.endTime = 0; this.endNotified = false;
    const count = this.spiders.length; this.spiders = []; this.setCount(count);
    this.onStats({ mutations: 0, capped: false });
  }

  destroy({ restore = true } = {}) {
    this.destroyed = true; cancelAnimationFrame(this.raf);
    this.scrollTarget.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.invalidate);
    document.removeEventListener('visibilitychange', this.visibility);
    this.observer.disconnect();
    this.root.removeEventListener('pointermove', this.pointerMove);
    this.root.removeEventListener('pointerleave', this.pointerLeave);
    this.root.removeEventListener('focusin', this.focusIn);
    this.root.removeEventListener('focusout', this.focusOut);
    if (restore) this.reset();
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}

export function runBookmarklet() {
  if (window.__webCrawlerBookmarklet) { window.__webCrawlerBookmarklet.close(); return; }
  const host = document.createElement('div');
  host.dataset.crawlerUi = '';
  host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:none!important;';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>:host{font:12px monospace}canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.tools{position:absolute;right:16px;top:16px;display:flex;gap:8px;align-items:center;background:#090b10;color:#2de2ff;border:1px solid #2de2ff;padding:10px;border-radius:5px;pointer-events:auto}button{font:12px monospace;background:#171c28;color:white;border:1px solid #647084;border-radius:3px;padding:6px;cursor:pointer}button:focus-visible{outline:2px solid #ff2d95}</style><canvas aria-hidden="true"></canvas><div class="tools" role="group" aria-label="Web Crawler bookmarklet">WEB CRAWLER <button class="pause" type="button">Pause</button><button class="reset" type="button">Reset</button><button class="close" type="button" aria-label="Close crawler and restore page">Close ×</button></div>`;
  document.documentElement.append(host);
  const crawler = new WebCrawler({ root: document.body, canvas: shadow.querySelector('canvas') });
  const pause = shadow.querySelector('.pause');
  pause.textContent = crawler.paused ? 'Resume' : 'Pause';
  pause.onclick = () => { crawler.setPaused(!crawler.paused); pause.textContent = crawler.paused ? 'Resume' : 'Pause'; };
  shadow.querySelector('.reset').onclick = () => crawler.reset();
  const close = () => { crawler.destroy(); host.remove(); delete window.__webCrawlerBookmarklet; window.removeEventListener('keydown', escape); };
  const escape = event => { if (event.key === 'Escape') close(); };
  shadow.querySelector('.close').onclick = close;
  window.addEventListener('keydown', escape);
  window.__webCrawlerBookmarklet = { crawler, close };
}
