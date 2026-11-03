import { forwardRef } from "react";

// The SVG tip is (0, 0), so its transform matches the measured target point.
const AgentCursor = forwardRef(function AgentCursor({ color, label }, ref) {
  return (
    <div className="agent-cursor" ref={ref} style={{ "--agent-color": color }}>
      <span className="agent-click" />
      <svg
        className="agent-pointer"
        width="25"
        height="31"
        viewBox="-2 -2 27 33"
      >
        <path d="M0 0 21 18l-10 1-5 9Z" />
      </svg>
      <span className="agent-label">{label}</span>
    </div>
  );
});
export default AgentCursor;
