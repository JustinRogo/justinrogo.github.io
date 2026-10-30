import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ShapeWaves from './vendor/ShapeWaves.jsx';
import { AntigravityBackground } from './AntigravityBackground.jsx';
import { FractalBackground } from './FractalBackground.jsx';
import './site-background.css';
import './legacy-backgrounds.css';

// Explicit values from the shared React Bits Shape Waves URL.
export const SHAPE_WAVES_SETTINGS = Object.freeze({
  text: '', textSize: 0.24, shapes: 'mixed',
  hoverColor: '#f97316', color: '#913d00', backgroundColor: '#00173a',
  direction: 175, glow: 1.75, flow: 2.3, fade: 0.3, brightness: 0.48,
  splashStrength: 0.75, splashRadius: 28, dotSize: 0.58, cellSize: 8,
  scale: 1.6, contrast: 3, speed: 0.7,
});

function StaticShapes() {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const canvas = ref.current;
    const context = canvas.getContext('2d');
    if (!context) return;
    function draw() {
      const { width, height } = canvas.getBoundingClientRect();
      const ratio = Math.min(devicePixelRatio || 1, 1.5,
        Math.sqrt(2400000 / Math.max(1, width * height)));
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const { cellSize, dotSize, color, backgroundColor, fade, scale, contrast, brightness } = SHAPE_WAVES_SETTINGS;
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, width, height);
      context.fillStyle = color;
      const cols = Math.max(1, Math.round(width / cellSize));
      const cell = width / cols;
      const rows = Math.max(1, Math.floor(height / cell));
      const originY = (height - rows * cell) / 2;
      const smoothstep = (a, b, value) => {
        const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
        return t * t * (3 - 2 * t);
      };
      // A deterministic still approximation of the shader's coherent shape bands.
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = (col + 0.5) * cell;
          const y = originY + (row + 0.5) * cell;
          const px = x / (32 * cell * scale);
          const py = y / (32 * cell * scale);
          const noise = (Math.sin(px * 4.3 + Math.sin(py * 3.1)) +
            Math.cos(py * 5.7 - Math.sin(px * 2.8))) / 2;
          const tone = Math.max(0, Math.min(0.999999,
            (noise * 0.5 + (brightness - 0.5) * 0.4) * 2.8 * contrast + 0.5));
          const shape = 2 - Math.floor(tone * 3);
          const qx = Math.abs(x / width * 2 - 1);
          const qy = Math.abs(y / height * 2 - 1);
          const radius = Math.pow(qx ** 2.5 + qy ** 2.5, 1 / 2.5) / Math.pow(2, 1 / 2.5);
          context.globalAlpha = 1 - smoothstep(Math.max(0, 1 - fade * 2.2), 1, radius);
          const size = cell * 0.5 * dotSize;
          context.beginPath();
          if (shape === 0) context.rect(x - size, y - size, size * 2, size * 2);
          else if (shape === 1) context.arc(x, y, size, 0, Math.PI * 2);
          else {
            context.moveTo(x, y - size);
            context.lineTo(x + size, y + size);
            context.lineTo(x - size, y + size);
            context.closePath();
          }
          context.fill();
        }
      }
      context.globalAlpha = 1;
    }
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);
  return <canvas ref={ref} className="background-static" aria-hidden="true" />;
}

function ShapeWavesBackground({ animated, interactive }) {
  const [status, setStatus] = useState('fallback');
  return <div className="site-background__layers" data-background-state={animated ? status : 'static'}>
    <StaticShapes />
    {animated && <ShapeWaves {...SHAPE_WAVES_SETTINGS}
      interactive={interactive} onStatus={setStatus} />}
  </div>;
}

function AuroraBackground({ animated, visible }) {
  return <div className="site-background__aurora" data-animated={animated} data-visible={visible} aria-hidden="true">
    <div className="glow-aurora glow-aurora-1" />
    <div className="glow-aurora glow-aurora-2" />
    <div className="glow-aurora glow-aurora-3" />
  </div>;
}

export function SiteBackground() {
  const [background, setBackground] = useState(() => document.body.dataset.background || 'shape-waves');
  const [light, setLight] = useState(() => document.body.classList.contains('light'));
  const [visible, setVisible] = useState(() => !document.hidden);
  const [animated, setAnimated] = useState(() => !matchMedia('(prefers-reduced-motion: reduce), (prefers-contrast: more), (forced-colors: active)').matches);
  const [interactive, setInteractive] = useState(() => matchMedia('(hover: hover) and (pointer: fine)').matches);

  useEffect(() => {
    const quiet = matchMedia('(prefers-reduced-motion: reduce), (prefers-contrast: more), (forced-colors: active)');
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    const controller = new AbortController();
    const sync = () => {
      setAnimated(!quiet.matches);
      setInteractive(finePointer.matches);
    };
    quiet.addEventListener('change', sync, { signal: controller.signal });
    finePointer.addEventListener('change', sync, { signal: controller.signal });
    const syncBackground = () => {
      setBackground(document.body.dataset.background || 'shape-waves');
      setLight(document.body.classList.contains('light'));
    };
    const observer = new MutationObserver(syncBackground);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-background', 'class'] });
    document.addEventListener('visibilitychange', () => setVisible(!document.hidden), { signal: controller.signal });
    syncBackground();
    return () => { controller.abort(); observer.disconnect(); };
  }, []);

  // Mount only the selected renderer; switching releases its timers and GPU resources.
  const motionKey = animated ? 'animated' : 'still';
  if (background === 'none') return null;
  if (background === 'antigravity') return <AntigravityBackground key={motionKey} light={light} animated={animated} interactive={interactive} />;
  if (background === 'shape-waves') return <ShapeWavesBackground key={motionKey} animated={animated} interactive={interactive} />;
  return <div className="site-background__layers" data-background-state={animated ? 'active' : 'static'}>
    <AuroraBackground animated={animated} visible={visible} />
    {background === 'fractal' && <FractalBackground animated={animated} light={light} />}
  </div>;
}
