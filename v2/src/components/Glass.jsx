import "../../../src/homepage/vendor/GlassSurface.css";
import { useMedia } from "../hooks.js";
import { useBotanical } from "../botanical/siteStyle.js";

// The frosted glass behind V2's panels, kept behind the controls and never
// around their content. This is Glass Surface's own frosted mode, rendered as
// static markup with its stylesheet. Its SVG refraction mode re-filtered every
// surface on every frame the backdrop moved (the animated background, any
// scroll): about 10 fps with 13 panels on Home. Safari, Firefox and touch
// devices already used this frosted mode.
const frost = {
  width: "100%",
  height: "100%",
  borderRadius: 6,
  "--glass-frost": 0.2,
  "--glass-saturation": 1,
};

export function GlassLayer({ className = "" }) {
  const transparency = useMedia("(prefers-reduced-transparency: reduce)");
  const contrast = useMedia("(prefers-contrast: more)");
  const forced = useMedia("(forced-colors: active)");
  const botanical = useBotanical();
  const opaque = transparency || contrast || forced;
  return (
    <div
      className={`glass-layer ${opaque ? "glass-layer-opaque" : ""} ${className}`}
      aria-hidden="true"
      inert
    >
      {/* Botanical surfaces are matte paper, so they skip the glass. */}
      {!opaque && !botanical && (
        <div className="glass-surface glass-surface--fallback" style={frost}>
          {/* V2 draws its own rim (--glass-rim), so the surface's is omitted. */}
          <span className="glass-surface__sheen" />
        </div>
      )}
    </div>
  );
}

export function Atmosphere({ moving }) {
  return (
    <div
      className={`atmosphere ${moving ? "is-moving" : ""}`}
      aria-hidden="true"
    >
      <div className="ambient ambient-blue" />
      <div className="ambient ambient-orange" />
      <svg
        className="orbital-lines"
        viewBox="0 0 1400 1000"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="v2-orbit">
            <stop stopColor="#2b74ff" stopOpacity="0" />
            <stop offset=".4" stopColor="#4996ff" />
            <stop offset=".75" stopColor="#ff862f" />
            <stop offset="1" stopColor="#ff862f" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#v2-orbit)">
          <ellipse
            cx="1000"
            cy="430"
            rx="630"
            ry="280"
            transform="rotate(-32 1000 430)"
          />
          <ellipse
            cx="1000"
            cy="430"
            rx="650"
            ry="300"
            transform="rotate(-32 1000 430)"
          />
          <ellipse
            cx="1000"
            cy="430"
            rx="690"
            ry="340"
            transform="rotate(-32 1000 430)"
          />
        </g>
      </svg>
    </div>
  );
}
