import { useLayoutEffect, useRef, useState } from 'react';
import Antigravity from './vendor/Antigravity.jsx';

// Stardust preset with the explicit overrides from the shared React Bits URL.
export const ANTIGRAVITY_SETTINGS = Object.freeze({
  colors: ['#275dff', '#f97316'],
  particleShape: 'tetrahedron', particleSize: 1.25, rotationSpeed: 0.3,
  depthFactor: 2.5, ambient: 0.38, particleVariance: 0.6,
  magnetRadius: 3, ringRadius: 5, count: 1050, waveAmplitude: 3.8,
  lerpSpeed: 0.07, colorSpeed: 0.17, colorMode: 'radial',
  fieldStrength: 7.5, waveSpeed: 0.9, pulseSpeed: 5.7, waveCount: 3,
});

function StaticParticles({ light }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const canvas = ref.current;
    const context = canvas.getContext('2d');
    if (!context) return;
    function draw() {
      const { width, height } = canvas.getBoundingClientRect();
      const ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2400000 / Math.max(1, width * height)));
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      let seed = 1337;
      const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      for (let index = 0; index < ANTIGRAVITY_SETTINGS.count; index++) {
        const x = random() * width;
        const y = random() * height;
        const radius = Math.hypot(x - width / 2, y - height / 2) / Math.max(width, height);
        const size = Math.max(1.2, height / 360) * (0.5 + random() * 1.5);
        context.fillStyle = ANTIGRAVITY_SETTINGS.colors[radius > 0.3 ? 1 : 0];
        context.globalAlpha = (light ? 0.28 : 0.4) * (0.3 + random() * 0.7);
        context.beginPath();
        context.moveTo(x, y - size);
        context.lineTo(x + size * 0.866, y + size / 2);
        context.lineTo(x - size * 0.866, y + size / 2);
        context.closePath();
        context.fill();
      }
      context.globalAlpha = 1;
    }
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [light]);
  return <canvas ref={ref} className="background-static" aria-hidden="true" />;
}

// Restored from 8f3254c, with the host controlling theme and motion preferences.
export function AntigravityBackground({ light, animated, interactive }) {
  const [status, setStatus] = useState('fallback');
  return <div className="site-background__layers" data-background-state={animated ? status : 'static'}>
    <StaticParticles light={light} />
    {animated && <Antigravity {...ANTIGRAVITY_SETTINGS} lightMode={light}
      interactive={interactive} autoAnimate maxDevicePixelRatio={1.5} onStatus={setStatus} />}
  </div>;
}
