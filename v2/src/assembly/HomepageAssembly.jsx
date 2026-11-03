import {
  Children,
  cloneElement,
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AgentCursor from "./AgentCursor.jsx";
import { assemblyConfig, layoutTasks } from "./assemblyConfig.js";
import { createAssemblyTimeline } from "./AssemblyTimeline.js";
import Icon from "../components/Icon.jsx";
import "./assembly.css";

const AssemblyContext = createContext(null);

// A slot: attach a ref to the existing node without adding layout wrappers.
export function AssembleReveal({ id, closest, children }) {
  const context = useContext(AssemblyContext);
  const child = Children.only(children);
  const originalRef = child.props.ref;
  const register = context?.register;
  const ref = useCallback(
    (node) => {
      if (typeof originalRef === "function") originalRef(node);
      else if (originalRef) originalRef.current = node;
      register?.(id, closest && node ? node.closest(closest) : node);
    },
    [register, id, closest, originalRef],
  );
  return cloneElement(child, { ref, "data-assembly-id": id });
}

export function ReplayAssembly() {
  const assembly = useContext(AssemblyContext);
  if (!assembly?.active) return null;
  return (
    <button
      type="button"
      className="assembly-replay"
      onClick={assembly.replay}
      disabled={!assembly.enabled}
      aria-label="Replay animation"
      title={
        assembly.enabled
          ? "Replay homepage assembly"
          : "Unavailable with the current intro or motion settings"
      }
    >
      <Icon name="refresh" size={16} />
      <span>Replay intro</span>
    </button>
  );
}

export default function HomepageAssembly({
  active,
  enabled,
  config = assemblyConfig,
  children,
}) {
  const registry = useRef(new Map());
  const cursors = useRef([]);
  const guides = useRef([]);
  const wireframes = useRef(new Map());
  const layer = useRef(null);
  const grid = useRef(null);
  const running = useRef(null);
  const attempted = useRef(false);
  const [replayCount, setReplayCount] = useState(0);
  const [phase, setPhase] = useState("idle");
  const query = new URLSearchParams(location.search);
  const hashQuery = new URLSearchParams(location.hash.split("?")[1]);
  const queryReplay = useRef(
    query.get("replayIntro") === "1" || hashQuery.get("replayIntro") === "1",
  );
  const handledReplay = useRef(0);
  const allowed =
    enabled &&
    config.enabled &&
    query.get("intro") !== "0" &&
    hashQuery.get("intro") !== "0";
  const register = useCallback((id, node) => {
    if (node) {
      registry.current.set(id, node);
      running.current?.timeline.stage(id, node);
    } else registry.current.delete(id);
  }, []);
  const replay = useCallback(() => {
    running.current?.finish();
    setReplayCount((n) => n + 1);
  }, []);

  useLayoutEffect(() => {
    if (!active || !allowed) {
      setPhase("skipped");
      return;
    }
    const force = replayCount > handledReplay.current || queryReplay.current;
    let seen = attempted.current;
    try {
      seen ||=
        config.oncePerSession &&
        sessionStorage.getItem(config.sessionKey) === "1";
    } catch {}
    if (seen && !force && config.oncePerSession) {
      setPhase("complete");
      return;
    }
    attempted.current = true;
    handledReplay.current = replayCount;
    queryReplay.current = false;
    try {
      sessionStorage.setItem(config.sessionKey, "1");
    } catch {}
    let finished = false;
    let started = false;
    let startTimer;
    let watchdog;
    let observer;
    const cleanups = [];
    let timeline;
    const finish = (update = true) => {
      if (finished) return;
      finished = true;
      clearTimeout(startTimer);
      clearTimeout(watchdog);
      observer?.disconnect();
      cleanups.forEach((cleanup) => cleanup());
      timeline?.destroy();
      running.current = null;
      if (update) setPhase("complete");
    };
    const listen = (target, name, listener, options) => {
      target?.addEventListener(name, listener, options);
      cleanups.push(() => target?.removeEventListener(name, listener, options));
    };
    try {
      timeline = createAssemblyTimeline({
        registry: registry.current,
        cursors: cursors.current,
        guides: guides.current,
        wireframes: wireframes.current,
        layer: layer.current,
        grid: grid.current,
        config,
        onComplete: () => finish(),
      });
      running.current = { timeline, finish };
      setPhase("preparing");
      const interrupt = () => finish();
      for (const name of ["pointerdown", "keydown", "wheel"])
        listen(window, name, interrupt, { capture: true, passive: true });
      listen(
        window,
        "focusin",
        (event) => {
          // The router focuses Home's heading in its layout effect, before preparation ends.
          if (!started && event.target.matches?.('[data-view="home"] h1'))
            return;
          finish();
        },
        { capture: true, passive: true },
      );
      listen(
        window,
        "scroll",
        () => {
          if (started) finish();
        },
        { capture: true, passive: true },
      );
      listen(window, "resize", interrupt, { passive: true });
      listen(window.visualViewport, "resize", interrupt, { passive: true });
      listen(document, "visibilitychange", interrupt);
      listen(document.fonts, "loadingdone", () => {
        if (started) finish();
      });
      const start = () => {
        if (finished || started) return;
        started = true;
        clearTimeout(startTimer);
        try {
          timeline.start();
        } catch {
          finish();
          return;
        }
        setPhase("assembling");
        // Responsive/font geometry changes hand off immediately rather than chase moving targets.
        const measured = ["hero-frame", "navigation"]
          .map((id) => registry.current.get(id))
          .filter(Boolean);
        const sizes = new Map(
          measured.map((el) => [el, [el.offsetWidth, el.offsetHeight]]),
        );
        observer = new ResizeObserver((entries) => {
          if (
            entries.some(({ target }) => {
              const [width, height] = sizes.get(target);
              return (
                Math.abs(target.offsetWidth - width) > 2 ||
                Math.abs(target.offsetHeight - height) > 2
              );
            })
          )
            finish();
        });
        measured.forEach((element) => observer.observe(element));
      };
      // Brief bounded preparation; data and font failures can never hold up the site.
      startTimer = setTimeout(start, 160);
      watchdog = setTimeout(() => finish(), timeline.duration + 700);
    } catch {
      // Failure is always an ordinary, visible homepage.
      finish();
    }
    return () => finish(false);
  }, [active, allowed, replayCount, config]);

  const value = useMemo(
    () => ({ register, replay, active, enabled: allowed }),
    [register, replay, active, allowed],
  );
  const busy = phase === "preparing" || phase === "assembling";
  const count = Math.min(
    6,
    Math.max(3, config.cursorCount, config.mobileCursorCount),
  );
  return (
    <AssemblyContext.Provider value={value}>
      {children}
      <div
        className="assembly-layer"
        ref={layer}
        aria-hidden="true"
        data-assembly-state={phase}
      >
        <div className="assembly-grid" ref={grid} />
        {layoutTasks.map(({ id }) => (
          <svg
            key={`wire-${id}`}
            className="assembly-guide assembly-wireframe"
            data-wireframe-id={id}
            ref={(node) => {
              if (node) wireframes.current.set(id, node);
              else wireframes.current.delete(id);
            }}
            style={{ color: config.colors[0] }}
          >
            <rect pathLength="1" />
            <path />
          </svg>
        ))}
        {Array.from({ length: count }, (_, i) => (
          <svg
            key={`guide-${i}`}
            className="assembly-guide"
            ref={(node) => {
              guides.current[i] = node;
            }}
            style={{ color: config.colors[i % config.colors.length] }}
          >
            <rect pathLength="1" />
            <path />
          </svg>
        ))}
        {Array.from({ length: count }, (_, i) => (
          <AgentCursor
            key={i}
            color={config.colors[i % config.colors.length]}
            label={config.labels[i % config.labels.length]}
            ref={(node) => {
              cursors.current[i] = node;
            }}
          />
        ))}
      </div>
      {busy && (
        <button
          type="button"
          className="assembly-skip"
          onClick={() => running.current?.finish()}
        >
          Skip intro
        </button>
      )}
    </AssemblyContext.Provider>
  );
}
