import { useEffect, useLayoutEffect, useRef } from 'react';

/* Collection spotlight adapted from React Bits Spotlight Card.
 * https://reactbits.dev/components/spotlight-card
 * Copyright (c) 2026 David Haz. See assets/react-bits-LICENSE.txt.
 * Keep the established summary markup, keyboard focus and motion safeguards.
 */
export function useCollectionSpotlight(treeRef) {
  useEffect(() => {
    const tree = treeRef.current;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const controller = new AbortController();
    const options = { signal: controller.signal, passive: true };
    let frame = 0;
    let current = null;
    let pointer = null;
    function clear() {
      cancelAnimationFrame(frame);
      frame = 0;
      current?.classList.remove('is-spotlit');
      current = null;
      pointer = null;
    }
    tree.addEventListener('pointermove', event => {
      if (!finePointer.matches || reducedMotion.matches || event.pointerType !== 'mouse') return;
      const summary = event.target.closest('.page-collection__summary');
      if (!summary) { clear(); return; }
      if (current !== summary) { clear(); current = summary; }
      pointer = { x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = current.getBoundingClientRect();
        current.style.setProperty('--spotlight-x', `${pointer.x - rect.left}px`);
        current.style.setProperty('--spotlight-y', `${pointer.y - rect.top}px`);
        current.classList.add('is-spotlit');
      });
    }, options);
    tree.addEventListener('pointerleave', clear, options);
    tree.addEventListener('pointercancel', clear, options);
    window.addEventListener('scroll', clear, options);
    window.addEventListener('blur', clear, options);
    finePointer.addEventListener('change', clear, options);
    reducedMotion.addEventListener('change', clear, options);
    return () => { controller.abort(); clear(); };
  }, [treeRef]);
}

export function useTabIndicator(tablistRef, indicatorRef, active) {
  const positionRef = useRef(null);
  useLayoutEffect(() => {
    const tablist = tablistRef.current;
    const indicator = indicatorRef.current;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const controller = new AbortController();
    let resizeFrame = 0;
    let disposed = false;
    function position(animate = false) {
      const button = tablist.querySelector('.tab[aria-selected="true"]');
      if (!button?.offsetWidth) return;
      // Read the interpolated geometry before cancelling an in-flight animation.
      const previous = indicator.getBoundingClientRect();
      const ready = tablist.classList.contains('has-indicator');
      indicator.getAnimations().forEach(animation => animation.cancel());
      const width = button.offsetWidth;
      const height = button.offsetHeight;
      const transform = `translate(${button.offsetLeft}px, ${button.offsetTop}px)`;
      Object.assign(indicator.style, { width: `${width}px`, height: `${height}px`, transform });
      tablist.classList.add('has-indicator');
      if (animate && ready && !reducedMotion.matches) {
        const box = tablist.getBoundingClientRect();
        const x = previous.left - box.left - tablist.clientLeft + tablist.scrollLeft;
        const y = previous.top - box.top - tablist.clientTop + tablist.scrollTop;
        indicator.animate([
          { transform: `translate(${x}px, ${y}px) scale(${previous.width / width}, ${previous.height / height})` },
          { transform },
        ], { duration: 300, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
      }
    }
    function schedule() {
      if (disposed) return;
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => position());
    }
    positionRef.current = position;
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    [tablist, ...tablist.querySelectorAll('.tab')].forEach(element => observer?.observe(element));
    window.addEventListener('resize', schedule, { signal: controller.signal, passive: true });
    reducedMotion.addEventListener('change', schedule, { signal: controller.signal });
    document.fonts?.ready.then(schedule);
    position();
    return () => {
      disposed = true;
      positionRef.current = null;
      observer?.disconnect();
      controller.abort();
      cancelAnimationFrame(resizeFrame);
      indicator.getAnimations().forEach(animation => animation.cancel());
    };
  }, [tablistRef, indicatorRef]);
  useLayoutEffect(() => { positionRef.current?.(true); }, [active]);
}
