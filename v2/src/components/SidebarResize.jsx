import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useMedia, useStored } from "../hooks.js";

export const DEFAULT_SIDEBAR_WIDTH = 240;
const MIN_WIDTH = 200;
export function useSidebarWidth() {
  const [savedCollapsed, setCollapsed] = useStored(
    "jr-v2-sidebar-collapsed", false, (value) => typeof value === "boolean",
  );
  const [saved, setSaved] = useStored(
    "jr-v2-sidebar-width",
    DEFAULT_SIDEBAR_WIDTH,
    (value) => Number.isFinite(value) && value >= MIN_WIDTH && value <= 360,
  );
  const [viewport, setViewport] = useState(() => innerWidth);
  const desktop = useMedia("(min-width: 801px)");
  useEffect(() => {
    const update = () => setViewport(innerWidth);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const max = Math.min(
    360,
    Math.max(DEFAULT_SIDEBAR_WIDTH, Math.floor(viewport * 0.32)),
  );
  const width = Math.min(saved, max);
  const collapsed = desktop && savedCollapsed;
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previous = root.style.getPropertyValue("--sidebar-width");
    root.style.setProperty("--sidebar-width", `${collapsed ? 72 : width}px`);
    root.dataset.sidebar = collapsed ? "compact" : "expanded";
    return () => {
      if (previous) root.style.setProperty("--sidebar-width", previous);
      else root.style.removeProperty("--sidebar-width");
    };
  }, [width, collapsed]);
  return { width, min: MIN_WIDTH, max, desktop, onChange: setSaved,
    collapsed, toggle: () => setCollapsed((value) => !value) };
}

export default function SidebarResize({ width, min, max, desktop, onChange }) {
  const instructions = useId();
  const drag = useRef(null);
  const frame = useRef(null);
  const pending = useRef(width);
  const [dragging, setDragging] = useState(false);
  const clamp = (value) => Math.round(Math.min(max, Math.max(min, value)));
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const commit = () => {
    frame.current = null;
    onChange(pending.current);
  };
  const end = (event) => {
    if (!drag.current) return;
    cancelAnimationFrame(frame.current);
    frame.current = null;
    onChange(pending.current);
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  if (!desktop) return null;
  return (
    <>
      <div
        className="sidebar-resize"
        role="separator"
        tabIndex={0}
        aria-label="Resize sidebar"
        aria-orientation="vertical"
        aria-controls="workspace"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={width}
        aria-valuetext={`${width} pixels`}
        aria-describedby={instructions}
        data-dragging={dragging ? "" : undefined}
        title="Drag to resize. Double-click or press Enter to reset."
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { x: event.clientX, width };
          pending.current = width;
          setDragging(true);
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          pending.current = clamp(
            drag.current.width + event.clientX - drag.current.x,
          );
          if (frame.current === null)
            frame.current = requestAnimationFrame(commit);
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        onDoubleClick={() => onChange(clamp(DEFAULT_SIDEBAR_WIDTH))}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 24 : 8;
          const value = {
            ArrowLeft: width - step,
            ArrowRight: width + step,
            Home: min,
            End: max,
            Enter: DEFAULT_SIDEBAR_WIDTH,
          }[event.key];
          if (value !== undefined) {
            event.preventDefault();
            onChange(clamp(value));
          }
        }}
      >
        <span aria-hidden="true" />
      </div>
      <span id={instructions} className="sr-only">
        Use Left and Right arrows to resize, Home and End for the limits, and
        Enter to reset.
      </span>
    </>
  );
}
