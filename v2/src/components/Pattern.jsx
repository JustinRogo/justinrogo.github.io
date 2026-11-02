import { useState } from "react";
import Icon from "./Icon.jsx";
// An original Truchet-tile sketch: exact geometry, no continuous renderer.
export default function Pattern({ compact = false }) {
  const [seed, setSeed] = useState(7);
  return (
    <div className={`pattern ${compact ? "pattern-compact" : ""}`}>
      <svg viewBox="0 0 480 360" aria-hidden="true" className="pattern-art">
        {Array.from({ length: 48 }, (_, i) => {
          const x = (i % 8) * 60,
            y = Math.floor(i / 8) * 60;
          const rotation =
            ((Math.imul(i + 3, seed * 71 + 97) >>> i % 5) % 4) * 90;
          return (
            <g
              key={i}
              transform={`translate(${x + 30} ${y + 30}) rotate(${rotation})`}
            >
              <path
                d="M-30 0A30 30 0 0 1 0 30 M0-30A30 30 0 0 0 30 0"
                fill="none"
                stroke={
                  i % 7 === 0 ? "#ffb477" : i % 3 === 0 ? "#a4bcff" : "#627fe9"
                }
                strokeWidth="12"
              />
            </g>
          );
        })}
      </svg>
      {!compact && (
        <button
          className="pattern-button"
          onClick={() => setSeed((n) => n + 2)}
        >
          <Icon name="refresh" size={16} />
          Rearrange<span className="sr-only"> the pattern</span>
        </button>
      )}
      <span className="sr-only" role="status">
        Pattern seed {seed}
      </span>
    </div>
  );
}
