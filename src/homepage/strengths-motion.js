import { gsap } from 'gsap';

/* Pointer lighting adapted from React Bits Spotlight Card, matching the
 * homepage collection rows. Copyright (c) 2026 David Haz.
 * https://reactbits.dev/components/spotlight-card
 * See assets/react-bits-LICENSE.txt. Native buttons retain focus and input.
 */
export function mountStrengthsMotion(root) {
  const items = [...root.querySelectorAll('.item')];
  const quiet = matchMedia('(prefers-reduced-motion: reduce), (prefers-contrast: more), (forced-colors: active)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const controller = new AbortController();
  const options = { signal: controller.signal, passive: true };
  let tweens = [];
  let frame = 0;
  let lit = null;
  let pointer = null;

  function clearSpotlight() {
    cancelAnimationFrame(frame);
    frame = 0;
    lit?.classList.remove('is-spotlit');
    lit = null;
    pointer = null;
  }

  function settle() {
    tweens.forEach(tween => tween.kill());
    tweens = [];
    gsap.set(items, { clearProps: 'transform,transformOrigin,opacity,willChange' });
  }

  function stop() {
    clearSpotlight();
    settle();
  }

  root.addEventListener('pointermove', event => {
    if (quiet.matches || !finePointer.matches || event.pointerType !== 'mouse') return;
    const item = event.target.closest('.item');
    if (!item || !root.contains(item)) { clearSpotlight(); return; }
    if (lit !== item) { clearSpotlight(); lit = item; }
    pointer = { x: event.clientX, y: event.clientY };
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const rect = lit.getBoundingClientRect();
      lit.style.setProperty('--spotlight-x', `${pointer.x - rect.left}px`);
      lit.style.setProperty('--spotlight-y', `${pointer.y - rect.top}px`);
      lit.classList.add('is-spotlit');
    });
  }, options);
  root.addEventListener('pointerleave', clearSpotlight, options);
  root.addEventListener('pointercancel', clearSpotlight, options);
  window.addEventListener('scroll', clearSpotlight, options);
  window.addEventListener('blur', clearSpotlight, options);
  // Restoring motion must not clear a pointer event from the same frame.
  quiet.addEventListener('change', () => { if (quiet.matches) stop(); }, options);
  finePointer.addEventListener('change', () => { if (!finePointer.matches) clearSpotlight(); }, options);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); }, options);

  let previousWidth = root.clientWidth;
  const observer = new ResizeObserver(([entry]) => {
    if (entry.contentRect.width !== previousWidth) stop();
    previousWidth = entry.contentRect.width;
  });
  observer.observe(root);

  return {
    settle: stop,
    capture() {
      // Capture interpolated positions before stopping an interrupted filter.
      const boxes = new Map(items.filter(item => item.getClientRects().length)
        .map(item => [item, item.getBoundingClientRect()]));
      stop();
      return boxes;
    },
    transition(previous) {
      if (quiet.matches || document.hidden || !root.getClientRects().length) return;
      items.filter(item => item.getClientRects().length).forEach(item => {
        const before = previous.get(item);
        const after = item.getBoundingClientRect();
        const from = before ? {
          x: before.left - after.left, y: before.top - after.top,
          scaleX: before.width / after.width, scaleY: before.height / after.height, opacity: 1,
        } : { x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 0.35 };
        if (before && Math.abs(from.x) < 0.5 && Math.abs(from.y) < 0.5 && Math.abs(before.width - after.width) < 0.5) return;
        tweens.push(gsap.fromTo(item, { ...from, transformOrigin: '0 0', willChange: 'transform,opacity' }, {
          x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1,
          duration: 0.24, ease: 'power3.out',
          clearProps: 'transform,transformOrigin,opacity,willChange',
        }));
      });
    },
    dispose() { controller.abort(); observer.disconnect(); stop(); },
  };
}
