// Hand-tuned, procedurally drawn botanical illustrations. Everything is inline SVG:
// no images, no dependencies, and every plant is deterministic so it never
// "reshuffles" between renders.
import { useEffect, useId, useRef, useState } from "react";

const r1 = (n) => Math.round(n * 10) / 10;
const rad = (deg) => (deg * Math.PI) / 180;
const deg = (radians) => (radians * 180) / Math.PI;
export function seeded(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const safeId = (id) => id.replace(/[^a-zA-Z0-9_-]/g, "");

/* ---------- geometry ---------- */
// A lanceolate leaf with its base at 0,0 and its tip at (bend, -len).
export function leafPath(len, w, bend = 0) {
  return `M0 0C${r1(w)} ${r1(-len * 0.22)} ${r1(w * 0.85 + bend * 0.5)} ${r1(-len * 0.72)} ${r1(bend)} ${r1(-len)}C${r1(-w * 0.85 + bend * 0.5)} ${r1(-len * 0.72)} ${r1(-w)} ${r1(-len * 0.22)} 0 0Z`;
}
// A pothos leaf: heart-shaped with the petiole in the notch at 0,0.
export function heartPath(len) {
  const w = len * 0.46;
  return `M0 0C${r1(-w * 0.3)} ${r1(len * 0.07)} ${r1(-w)} ${r1(len * 0.06)} ${r1(-w * 1.02)} ${r1(-len * 0.22)}C${r1(-w * 1.02)} ${r1(-len * 0.52)} ${r1(-w * 0.42)} ${r1(-len * 0.8)} 0 ${r1(-len)}C${r1(w * 0.42)} ${r1(-len * 0.8)} ${r1(w * 1.02)} ${r1(-len * 0.52)} ${r1(w * 1.02)} ${r1(-len * 0.22)}C${r1(w)} ${r1(len * 0.06)} ${r1(w * 0.3)} ${r1(len * 0.07)} 0 0Z`;
}
const quad = (p0, p1, p2, t) => [
  (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
  (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1],
];
const quadTangent = (p0, p1, p2, t) =>
  Math.atan2(
    2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]),
    2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]),
  );
const cubic = (p, t) => {
  const u = 1 - t;
  return [0, 1].map(
    (k) =>
      u ** 3 * p[0][k] +
      3 * u * u * t * p[1][k] +
      3 * u * t * t * p[2][k] +
      t ** 3 * p[3][k],
  );
};
const cubicTangent = (p, t) => {
  const u = 1 - t;
  const d = [0, 1].map(
    (k) =>
      3 * u * u * (p[1][k] - p[0][k]) +
      6 * u * t * (p[2][k] - p[1][k]) +
      3 * t * t * (p[3][k] - p[2][k]),
  );
  return Math.atan2(d[1], d[0]);
};
const cubicD = (p) =>
  `M${p[0].map(r1)}C${p[1].map(r1)} ${p[2].map(r1)} ${p[3].map(r1)}`;
// A transform that points a leaf drawn toward -y in `direction` (radians).
const place = ([x, y], direction) =>
  `translate(${r1(x)} ${r1(y)}) rotate(${r1(deg(direction) + 90)})`;

/* ---------- plants (return <g> content for an existing <svg>) ---------- */

// Sword fern: a curving rachis with simple, tapering pinnae. `--i` orders the
// pinnae from base to tip so CSS can unfurl them in sequence.
export function Fern({
  length = 220,
  curve = 50,
  pinnae = 16,
  reach = 46,
  sweep = 60,
  className = "",
  line = false,
  ...props
}) {
  const p0 = [0, 0];
  const p1 = [curve * 0.15, -length * 0.6];
  const p2 = [curve, -length];
  const leaves = [];
  for (let i = 0; i < pinnae; i++) {
    const t = 0.07 + 0.9 * (i / (pinnae - 1));
    const size =
      reach * Math.pow(1 - t, 0.7) * Math.min(1, (t + 0.06) * 4.2) + 3;
    for (const side of [-1, 1]) {
      const tt = Math.min(0.99, t + (side < 0 ? 0.018 : 0));
      const point = quad(p0, p1, p2, tt);
      const dir = quadTangent(p0, p1, p2, tt) + side * rad(sweep);
      leaves.push(
        <g key={`${i}${side}`} transform={place(point, dir)}>
          <path
            className={`fern-pinna${i % 4 === 1 ? " is-light" : ""}`}
            style={{ "--i": i }}
            d={leafPath(size, Math.max(2, size * 0.17), side * size * 0.1)}
          />
        </g>,
      );
    }
  }
  return (
    <g className={`fern ${line ? "is-line" : ""} ${className}`} {...props}>
      <path
        className="fern-rachis"
        pathLength="1"
        d={`M0 0Q${p1.map(r1)} ${p2.map(r1)}`}
      />
      {leaves}
    </g>
  );
}

// Monstera deliciosa: an ovate-cordate blade, with slits and windows cut out
// through a mask rather than drawn, so it reads clearly at any size.
export function Monstera({
  className = "",
  veins = true,
  line = false,
  fill,
  ...props
}) {
  const id = safeId(useId());
  const outline =
    "M0 -22C-14 -6 -50 -2 -72 -27C-97 -57 -101 -113 -81 -151C-60 -187 -24 -203 6 -201C45 -197 86 -170 97 -126C107 -84 93 -40 66 -20C44 -4 14 -8 0 -22Z";
  const slits = [];
  const ribs = [];
  const windows = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const y = -40 - i * 27;
      const lift = 34 + i * 7;
      const start = [side * (15 + i * 1.5), y];
      const end = [side * 140, y - lift];
      const spread = 5 + i * 0.6;
      slits.push(
        `M${start.map(r1)}L${end[0]} ${r1(end[1] - spread)}L${end[0]} ${r1(end[1] + spread)}Z`,
      );
      // Vein through the middle of each segment, between two slits.
      const vy = y + 13;
      ribs.push(
        `M${side * 3} ${vy}Q${side * 40} ${r1(vy - 10 - i * 2)} ${side * 92} ${r1(vy - lift + 8)}`,
      );
      if (i > 0 && i < 5)
        windows.push([side * (30 + i * 2), y + 12, 3.2 + i * 0.3, 7]);
    }
  }
  return (
    <g className={`monstera ${line ? "is-line" : ""} ${className}`} {...props}>
      <defs>
        <mask id={`m${id}`} maskUnits="userSpaceOnUse" x="-120" y="-220" width="240" height="240">
          <path d={outline} fill="#fff" />
          <path d={slits.join("")} fill="#000" />
          {windows.map(([x, y, rx, ry], i) => (
            <ellipse
              key={i}
              cx={r1(x)}
              cy={r1(y)}
              rx={r1(rx)}
              ry={ry}
              transform={`rotate(${x > 0 ? 28 : -28} ${r1(x)} ${r1(y)})`}
              fill="#000"
            />
          ))}
        </mask>
      </defs>
      <path className="monstera-petiole" d="M0 -18Q-6 30 -26 90" />
      <g mask={`url(#m${id})`}>
        <path className="monstera-blade" d={outline} style={fill ? { fill } : undefined} />
        {veins && <path className="monstera-ribs" d={ribs.join("")} />}
        <path className="monstera-midrib" d="M0 -22Q3 -110 5 -198" />
      </g>
    </g>
  );
}

// Golden pothos trailing along a cubic Bézier. Leaves alternate sides and may
// droop with gravity; `--at` is each leaf's position along the vine (0–1).
export function Pothos({
  curve,
  leaves = 9,
  size = 26,
  droop = 0.35,
  seed = 7,
  start = 0.08,
  className = "",
  ...props
}) {
  const rand = seeded(seed);
  const items = [];
  for (let i = 0; i < leaves; i++) {
    const at = start + (1 - start) * ((i + 0.5) / leaves);
    const side = i % 2 ? 1 : -1;
    const point = cubic(curve, at);
    const tangent = cubicTangent(curve, at);
    const out = tangent + side * rad(72);
    // Blend the outward direction toward "down" for a hanging habit.
    const dir = Math.atan2(
      Math.sin(out) * (1 - droop) + droop,
      Math.cos(out) * (1 - droop),
    );
    const len = size * (0.78 + rand() * 0.34) * (0.7 + 0.3 * (1 - at * 0.6));
    const tip = [point[0] + Math.cos(dir) * 5, point[1] + Math.sin(dir) * 5];
    items.push(
      <g key={i} className="pothos-leaf" style={{ "--at": r1(at * 100) / 100, "--i": i }}>
        <path className="pothos-petiole" d={`M${point.map(r1)}L${tip.map(r1)}`} />
        <g transform={place(tip, dir)}>
          <g className="pothos-grow">
            <path className={`pothos-blade tone-${i % 3}`} d={heartPath(len)} />
            <path
              className="pothos-variegation"
              d={`M0 -2C${r1(len * 0.12)} ${r1(-len * 0.3)} ${r1(-len * 0.08)} ${r1(-len * 0.55)} ${r1(len * 0.05)} ${r1(-len * 0.82)}`}
            />
          </g>
        </g>
      </g>,
    );
  }
  return (
    <g className={`pothos ${className}`} {...props}>
      <path className="pothos-stem" pathLength="1" d={cubicD(curve)} />
      {items}
    </g>
  );
}

// A small leafy sprig, drawn left to right, for flourishes and dividers.
export function Sprig({ length = 120, leaves = 7, className = "", ...props }) {
  const curve = [
    [0, 14],
    [length * 0.35, 4],
    [length * 0.65, 22],
    [length, 11],
  ];
  const items = [];
  for (let i = 0; i < leaves; i++) {
    const at = 0.12 + 0.8 * (i / (leaves - 1));
    const side = i % 2 ? 1 : -1;
    const point = cubic(curve, at);
    const dir = cubicTangent(curve, at) + side * rad(48);
    const len = 13 - i * 0.9;
    items.push(
      <g key={i} transform={place(point, dir)}>
        <path className="sprig-leaf" style={{ "--i": i }} d={leafPath(len, len * 0.36)} />
      </g>,
    );
  }
  const tip = curve[3];
  return (
    <g className={`sprig ${className}`} {...props}>
      <path
        className="sprig-stem"
        pathLength="1"
        d={`M-6 20Q-9 12 -2 13${cubicD(curve).replace(/^M[^C]+/, " L0 14")}`}
      />
      {items}
      <circle className="sprig-berry" cx={tip[0] + 3} cy={tip[1] - 1} r="2.6" />
    </g>
  );
}

// A laurel-like ring of leaves, growing up both sides from the bottom.
export function Wreath({ r = 100, step = 11, className = "", ...props }) {
  const branches = [
    { from: 98, to: 238, dir: 1 },
    { from: 82, to: -58, dir: -1 },
  ];
  const items = [];
  const berries = [];
  let n = 0;
  for (const { from, to, dir } of branches) {
    const count = Math.floor(Math.abs(to - from) / step);
    for (let i = 0; i <= count; i++) {
      const a = rad(from + dir * i * step);
      const point = [Math.cos(a) * r, Math.sin(a) * r];
      const tangent = Math.atan2(Math.cos(a) * dir, -Math.sin(a) * dir);
      for (const side of [-1, 1]) {
        const len = 17 - (i / count) * 7;
        items.push(
          <g key={`${dir}${i}${side}`} transform={place(point, tangent + side * rad(38))}>
            <path
              className={`wreath-leaf tone-${(i + (side > 0 ? 1 : 0)) % 3}`}
              style={{ "--i": i }}
              d={leafPath(len, len * 0.34)}
            />
          </g>,
        );
      }
      if (i % 4 === 2) {
        const b = [Math.cos(a) * (r + 9), Math.sin(a) * (r + 9)];
        berries.push(
          <circle key={`${dir}b${i}`} className="wreath-berry" style={{ "--i": i }} cx={r1(b[0])} cy={r1(b[1])} r="2.6" />,
        );
      }
      n++;
    }
  }
  const arc = (from, to, sweep) => {
    const a = rad(from);
    const b = rad(to);
    return `M${r1(Math.cos(a) * r)} ${r1(Math.sin(a) * r)}A${r} ${r} 0 0 ${sweep} ${r1(Math.cos(b) * r)} ${r1(Math.sin(b) * r)}`;
  };
  return (
    <g className={`wreath ${className}`} {...props}>
      <path className="wreath-stem" pathLength="1" d={arc(98, 238, 1)} />
      <path className="wreath-stem" pathLength="1" d={arc(82, -58, 0)} />
      {items}
      {berries}
    </g>
  );
}

/* ---------- placed compositions ---------- */

// Adds `data-grown` once an element scrolls into view, so CSS can grow it once.
export function useGrowInView() {
  const ref = useRef(null);
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || grown) return;
    if (!("IntersectionObserver" in window)) return setGrown(true);
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setGrown(true),
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [grown]);
  return [ref, grown];
}

// The hero's plant corner: a monstera leaning in over a rising sword fern.
export function HeroFlora() {
  return (
    <svg className="hero-flora" viewBox="0 0 420 520" aria-hidden="true" focusable="false">
      <g className="hero-flora-fern-back sway-slow" style={{ transformOrigin: "330px 540px" }}>
        <Fern transform="translate(330 540) rotate(-14)" length={330} curve={-70} pinnae={20} reach={52} />
      </g>
      <g className="hero-flora-monstera sway" style={{ transformOrigin: "440px 60px" }}>
        <Monstera transform="translate(440 50) rotate(-128) scale(1.18)" />
      </g>
      <g className="hero-flora-fern sway-late" style={{ transformOrigin: "400px 540px" }}>
        <Fern transform="translate(400 540) rotate(-32)" length={270} curve={-46} pinnae={17} reach={40} />
      </g>
    </svg>
  );
}

export function PortraitWreath() {
  return (
    <svg className="portrait-wreath" viewBox="-130 -130 260 260" aria-hidden="true" focusable="false">
      <Wreath r={112} />
    </svg>
  );
}

// A section flourish that draws itself the first time it scrolls into view.
export function Flourish({ className = "" }) {
  const [ref, grown] = useGrowInView();
  return (
    <svg
      ref={ref}
      className={`flourish ${className}`}
      data-grown={grown || undefined}
      viewBox="-10 -6 136 36"
      aria-hidden="true"
      focusable="false"
    >
      <Sprig length={116} leaves={8} />
    </svg>
  );
}

// A seedling that opens its first leaves, then rests; used while content loads.
export function Sprout({ className = "" }) {
  return (
    <svg className={`sprout ${className}`} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <path className="sprout-soil" d="M6 34Q20 30 34 34" />
      <path className="sprout-stem" pathLength="1" d="M20 34C20 28 19 24 20 18" />
      <g transform="translate(20 19) rotate(-62)">
        <path className="sprout-leaf" d={leafPath(11, 4.4, -1)} />
      </g>
      <g transform="translate(20 19) rotate(62)">
        <path className="sprout-leaf" d={leafPath(11, 4.4, 1)} />
      </g>
    </svg>
  );
}

// The wordmark's sprig: a curving stem with one leaf and a bud, in place of
// Original's arrow.
export function WordmarkSprig({ size = 28 }) {
  return (
    <svg className="wordmark-sprig" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5.6 19.6C8 16 10.4 13.2 13.6 10.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <g transform="translate(13.2 11) rotate(46)">
        <g className="wordmark-sprig-leaf">
          <path d={leafPath(12, 5, 1)} fill="currentColor" />
          <path d="M0 -1Q0.6 -5 0.9 -9.5" fill="none" stroke="var(--rail-bg, #18392b)" strokeWidth="0.8" strokeLinecap="round" opacity="0.55" />
        </g>
      </g>
      <g transform="translate(8.6 15.6) rotate(-28)">
        <path className="wordmark-sprig-bud" d={leafPath(6.4, 2.8)} fill="currentColor" opacity="0.75" />
      </g>
    </svg>
  );
}

// A small inline leaf glyph.
export function LeafGlyph({ size = 14, className = "" }) {
  return (
    <svg className={`leaf-glyph ${className}`} width={size} height={size} viewBox="-8 -18 16 20" aria-hidden="true" focusable="false">
      <path d={leafPath(16, 6.5, 1.5)} fill="currentColor" />
      <path d="M0 0Q1 -8 1.4 -14" fill="none" stroke="var(--glyph-vein, rgba(255,255,255,.55))" strokeWidth="0.9" />
    </svg>
  );
}
