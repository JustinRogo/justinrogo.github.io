import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import GlassSurface from './vendor/GlassSurface.jsx';
import './glass-material.css';

// The upstream component supplies the material, never the content container.
// Keeping it behind the content avoids filtering text or creating containing
// blocks for widgets, popovers and controls inside the existing page sections.
export function GlassMaterial() {
  const ref = useRef(null);
  const [refraction, setRefraction] = useState(false);

  useLayoutEffect(() => {
    const host = ref.current.closest('.card');
    host.classList.add('homepage-glass');
    return () => host.classList.remove('homepage-glass');
  }, []);

  useEffect(() => {
    const queries = [
      matchMedia('(min-width: 800px) and (hover: hover) and (pointer: fine)'),
      matchMedia('(prefers-reduced-motion: reduce)'),
      matchMedia('(prefers-reduced-transparency: reduce)'),
      matchMedia('(prefers-contrast: more)'),
      matchMedia('(forced-colors: active)'),
    ];
    const controller = new AbortController();
    function sync() {
      setRefraction(queries[0].matches && queries.slice(1).every(query => !query.matches));
    }
    queries.forEach(query => query.addEventListener('change', sync, { signal: controller.signal }));
    sync();
    return () => controller.abort();
  }, []);

  return <div ref={ref} className="glass-material" aria-hidden="true" inert>
    <GlassSurface width="100%" height="100%" borderRadius={16}
      borderWidth={0.12} brightness={50} opacity={0.96} blur={14}
      displace={0.35} distortionScale={-100} redOffset={0} greenOffset={4} blueOffset={8}
      backgroundOpacity={0.08} saturation={1.15} refraction={refraction} renderer="svg" />
  </div>;
}
