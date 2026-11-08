// Pip, the site's resident pothos. Its vines lengthen as you scroll down the
// page, and it can be watered for a few extra leaves. Growth is written to a
// CSS custom property, so scrolling never re-renders React.
import { useEffect, useRef, useState } from "react";
import { Pothos } from "./Flora.jsx";

const KEY = "jr-v2-pip";
const MAX_WATER = 5;
const moods = [
  "Pip is content.",
  "Pip perks up.",
  "Pip stretches toward the light.",
  "Pip looks positively lush.",
  "Pip is thriving.",
  "Pip is fully watered. Thank you!",
];

function readWater() {
  try {
    const n = Number(localStorage.getItem(KEY));
    return Number.isInteger(n) && n >= 0 ? Math.min(n, MAX_WATER) : 0;
  } catch {
    return 0;
  }
}

export default function LivingPothos({ placement, moving }) {
  const ref = useRef(null);
  const [water, setWater] = useState(readWater);
  const [watering, setWatering] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const room = document.documentElement.scrollHeight - innerHeight;
      const progress = room > 40 ? Math.min(1, scrollY / room) : 1;
      node.style.setProperty("--grow", (0.3 + progress * 0.7).toFixed(3));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    // Views change height without scrolling; recheck when the layout settles.
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, []);
  useEffect(() => {
    if (!watering) return;
    const id = setTimeout(() => setWatering(false), moving ? 1500 : 10);
    return () => clearTimeout(id);
  }, [watering, moving]);
  const poured = useRef(false);
  useEffect(() => {
    if (!poured.current) return;
    setMessage(moods[water]);
    try {
      localStorage.setItem(KEY, String(water));
    } catch {}
  }, [water]);
  const giveWater = () => {
    poured.current = true;
    setWater((current) => Math.min(MAX_WATER, current + 1));
    setWatering(true);
  };
  return (
    <div
      ref={ref}
      className={`living-pothos living-pothos-${placement}`}
      style={{ "--water": water, "--water-max": MAX_WATER }}
      data-watering={watering || undefined}
    >
      <button
        type="button"
        className="living-pothos-button"
        onClick={giveWater}
        aria-label="Water Pip, the resident pothos"
        title={water >= MAX_WATER ? "Pip is fully watered" : "Water Pip"}
      >
        <svg viewBox="0 0 220 96" aria-hidden="true" focusable="false">
          <g className="pip-droplets">
            <path d="M30 6q4 6 0 9q-4-3 0-9Z" />
            <path d="M40 0q4 6 0 9q-4-3 0-9Z" />
            <path d="M22 2q4 6 0 9q-4-3 0-9Z" />
          </g>
          <g className="pip-foliage">
            {/* Trailing vine along the shelf and over its edge. */}
            <Pothos
              className="pip-vine pip-vine-long"
              curve={[[38, 52], [92, 40], [168, 56], [214, 92]]}
              leaves={9}
              size={17}
              droop={0.22}
              seed={11}
            />
            {/* An upright shoot. */}
            <Pothos
              className="pip-vine pip-vine-up"
              curve={[[30, 52], [24, 36], [44, 26], [58, 12]]}
              leaves={4}
              size={15}
              droop={0}
              seed={3}
              start={0.2}
            />
            {/* Watering rewards: a short shoot that fills in leaf by leaf. */}
            <Pothos
              className="pip-vine pip-vine-bonus"
              curve={[[26, 54], [8, 52], [2, 66], [6, 84]]}
              leaves={MAX_WATER}
              size={14}
              droop={0.5}
              seed={5}
              start={0.1}
            />
          </g>
          <g className="pip-pot">
            <path className="pip-pot-body" d="M14 60h38l-5 34H19Z" />
            <path className="pip-pot-rim" d="M11 53h44v8H11Z" />
            <path className="pip-pot-shine" d="M18 64l3 26" />
            <ellipse className="pip-soil" cx="33" cy="53.5" rx="19" ry="2.4" />
          </g>
        </svg>
      </button>
      <span className="sr-only" role="status">
        {message}
      </span>
    </div>
  );
}
