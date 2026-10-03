/* Shared by the Wikipedia experiment and the live-page bookmarklet. No dependencies. */
const COLORS = ['#ff2d95', '#2de2ff', '#8b5cf6', '#ffffff'];
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export class WebCrawler {
  constructor({ root, canvas, viewport = window, speed = 1, count = 1,
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
      const id = this.spiders.length;
      this.spiders.push({ x: this.width ? this.width * (.3 + id * .1) : undefined,
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
    if (!a || !b || distance(a, b) > this.reach() * 2.5) return;
    spider.lastSilkTime = this.time;
    if (this.silk.length >= 36) this.silk.shift();
    this.silk.push({ a: previous, b: { ...anchor }, born: this.time, life: 12 });
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

  chooseGoal(spider) {
    let best = null, score = Infinity;
    for (const candidate of this.candidates) {
      const d = distance(spider, candidate);
      if (d > this.reach() * 2.4 || d < 55) continue;
      const value = Math.abs(d - this.reach() * 1.2) + (candidate.y < spider.y - 45 ? 55 : 0)
        - (candidate.link ? 30 : 0) + (this.originals.has(candidate.el) ? 40 : 0)
        + Math.random() * 75;
      if (value < score) { score = value; best = candidate; }
    }
    spider.goal = best ? this.anchor(best) : null;
    spider.goalUntil = this.time + 1.5 + Math.random() * 2;
    spider.pace = 48 + Math.random() * 58;
    if (Math.random() < .22) spider.restUntil = this.time + .25 + Math.random() * .75;
  }

  reach() { return clamp(Math.min(this.width || 500, this.height || 500) * .34, 100, 175); }

  legPose(spider, index, spread = 1) {
    const side = index < 4 ? -1 : 1, row = index % 4;
    const reach = this.reach();
    const c = Math.cos(spider.angle), s = Math.sin(spider.angle);
    const project = (x, y) => ({ x: spider.x + x * c - y * s, y: spider.y + x * s + y * c });
    return { hip: project(side * 5, (row - 1.5) * 4),
      ideal: project(side * reach * [.66, .87, .83, .63][row] * spread,
        reach * [-.7, -.28, .3, .72][row] * spread - 16),
      outward: { x: side * c, y: side * s } };
  }

  legJoint(hip, foot, outward) {
    const d = Math.max(.001, distance(hip, foot));
    const nx = -(foot.y - hip.y) / d, ny = (foot.x - hip.x) / d;
    const bend = nx * outward.x + ny * outward.y < 0 ? -1 : 1;
    const segment = this.reach() * .68;
    const height = Math.sqrt(Math.max(0, segment * segment - d * d / 4));
    return { x: (hip.x + foot.x) / 2 + nx * height * bend,
      y: (hip.y + foot.y) / 2 + ny * height * bend };
  }

  infect(anchor) {
    const el = anchor.el;
    if (!el.isConnected || this.originals.has(el) || this.originals.size >= this.maxMutations) return;
    this.originals.set(el, el.getAttribute('style'));
    const strength = this.intensity;
    const color = COLORS[Math.floor(Math.random() * 3)];
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
    const reach = this.reach();
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
          this.infect(leg.foot);
          this.leaveSilk(spider, leg.foot);
          this.onPlant(leg.foot.el, this.time);
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
      let best = null, score = Infinity;
      for (const candidate of this.candidates) {
        if (distance(spider, candidate) > reach * .98 || distance(spider, candidate) < 20) continue;
        const value = distance(ideal, candidate) + (candidate.link ? -12 : 0)
          + (occupied.has(candidate.el) ? reach : 0) + (candidate.large ? 35 : 0)
          + (this.originals.has(candidate.el) ? 16 : 0);
        if (value < score) { score = value; best = candidate; }
      }
      if (best) {
        leg.start = foot && distance(spider, foot) < reach * 1.25 ? foot : hip;
        leg.target = this.anchor(best); leg.progress = 0;
        leg.duration = .16 + Math.random() * .14; swinging++;
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.lineCap = 'round';
    ctx.save(); ctx.lineWidth = .6; ctx.strokeStyle = '#a5e8ff';
    for (const thread of this.silk) {
      const a = this.point(thread.a), b = this.point(thread.b);
      if (!a || !b) continue;
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
    this.spiders.forEach((spider, index) => {
      const color = COLORS[index % 3];
      spider.legs.forEach(leg => {
        const { hip, outward } = this.legPose(spider, leg.index);
        const reach = this.reach();
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
        const joint = this.legJoint(hip, foot, outward);
        // A dark under-stroke keeps the neon visible on both page themes.
        ctx.beginPath(); ctx.moveTo(hip.x, hip.y); ctx.lineTo(joint.x, joint.y); ctx.lineTo(foot.x, foot.y);
        ctx.strokeStyle = '#080b16'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.strokeStyle = leg.index % 3 ? '#a5f3ff' : color; ctx.lineWidth = .85; ctx.stroke();
        for (const [p, r, fill] of [[joint, 1.5, '#2de2ff'], [foot, 1.6, leg.index % 2 ? '#ff2d95' : '#fff']]) {
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
        }
      });
      ctx.save(); ctx.translate(spider.x, spider.y); ctx.rotate(spider.angle);
      const pulse = Math.sin(this.time * 5 + spider.seed) * 1.5;
      const nodes = [[-8,-7], [7,-8], [-10,6], [9,7], [0,15 + pulse], [0,-14], [pulse,1]];
      ctx.shadowColor = '#2de2ff'; ctx.shadowBlur = 4; ctx.lineWidth = .9;
      for (const [a,b] of [[0,1],[0,2],[1,3],[2,3],[2,4],[3,4],[0,5],[1,5],[0,6],[1,6],[2,6],[3,6],[4,6]]) {
        ctx.beginPath(); ctx.moveTo(...nodes[a]); ctx.lineTo(...nodes[b]);
        ctx.strokeStyle = '#080b16'; ctx.lineWidth = 2.3; ctx.stroke();
        ctx.strokeStyle = a % 2 ? '#b8f5ff' : color; ctx.lineWidth = .85; ctx.stroke();
      }
      nodes.forEach(([x,y], i) => { ctx.beginPath(); ctx.arc(x,y, i === 6 ? 2 : 1.4,0,Math.PI * 2); ctx.fillStyle = i % 2 ? '#fff' : '#2de2ff'; ctx.fill(); });
      ctx.restore();
    });
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
