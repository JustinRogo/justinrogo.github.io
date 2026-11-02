import GlassSurface from "../../../src/homepage/vendor/GlassSurface.jsx";
import { useMedia } from "../hooks.js";

// Refraction belongs behind the controls, never around their rendered content.
export function GlassLayer({ radius = 24, className = "" }) {
  const fine = useMedia("(hover: hover) and (pointer: fine)");
  const reduced = useMedia("(prefers-reduced-motion: reduce)");
  const transparency = useMedia("(prefers-reduced-transparency: reduce)");
  const contrast = useMedia("(prefers-contrast: more)");
  const forced = useMedia("(forced-colors: active)");
  const opaque = transparency || contrast || forced;
  return (
    <div
      className={`glass-layer ${opaque ? "glass-layer-opaque" : ""} ${className}`}
      aria-hidden="true"
      inert
    >
      {!opaque && (
        <GlassSurface
          width="100%"
          height="100%"
          borderRadius={radius}
          borderWidth={0.09}
          brightness={55}
          opacity={0.94}
          blur={16}
          displace={0.15}
          distortionScale={-55}
          redOffset={0}
          greenOffset={2}
          blueOffset={4}
          backgroundOpacity={0.08}
          saturation={1.35}
          renderer="svg"
          refraction={fine && !reduced}
        />
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
