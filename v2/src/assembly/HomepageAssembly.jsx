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
const seenKey = "jr-v2-assembly-seen";

// Storage can be blocked. Those visitors fall back to once per document load.
function introSeen() {
  try {
    return localStorage.getItem(seenKey) === "1";
  } catch {
    return false;
  }
}
function rememberIntro() {
  try {
    localStorage.setItem(seenKey, "1");
  } catch {}
}

function viewportDimensions() {
  const viewport = window.visualViewport;
  return [innerWidth, innerHeight, viewport?.width, viewport?.height, viewport?.scale];
}

// `document.fonts.ready` only covers faces already requested. Right after React
// commits, the injected display-font stylesheet may still be loading and the new
// DOM has not been laid out, so `ready` resolves before any face is queued and the
// intro would start just before the fonts swap in. Wait for the stylesheet, lay
// out the page, and ask for the faces the hero uses before trusting `ready`.
async function fontsSettled(registry) {
  if (!document.fonts) return;
  const sheet = document.getElementById("botanical-fonts");
  if (sheet && !sheet.sheet)
    await new Promise((resolve) => {
      sheet.addEventListener("load", resolve, { once: true });
      sheet.addEventListener("error", resolve, { once: true });
    });
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const fonts = new Set(
    ["hero-title", "hero-role", "hero-description", "navigation"]
      .map((id) => registry.get(id))
      .filter(Boolean)
      .map((element) => getComputedStyle(element).font),
  );
  await Promise.all(
    [...fonts].map((font) => document.fonts.load(font).catch(() => {})),
  );
  await document.fonts.ready;
}

export function useAssemblyBusy() {
  return useContext(AssemblyContext)?.busy || false;
}

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
    // Autoplay is for a browser's first visit. Returning visitors get the ready
    // page immediately; the Replay control and ?replayIntro=1 still play it.
    const alreadyPlayed =
      (config.oncePerLoad && attempted.current) ||
      (config.oncePerBrowser && introSeen());
    if (alreadyPlayed && !force) {
      setPhase("complete");
      return;
    }
    let finished = false;
    let started = false;
    let startTimer;
    let watchdog;
    let observer;
    let viewport = viewportDimensions();
    let scrollPosition;
    const cleanups = [];
    let timeline;
    const rememberAttempt = () => {
      attempted.current = true;
      rememberIntro();
      handledReplay.current = replayCount;
      queryReplay.current = false;
    };
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
    const interrupt = () => {
      rememberAttempt();
      finish();
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
      running.current = { timeline, finish: interrupt };
      setPhase("preparing");
      for (const name of ["pointerdown", "keydown", "wheel"])
        listen(window, name, interrupt, { capture: true, passive: true });
      listen(
        window,
        "focusin",
        (event) => {
          if (
            started &&
            !event.target.matches?.('#main, [data-view="home"] h1')
          ) {
            finish();
          }
        },
        { capture: true, passive: true },
      );
      listen(
        window,
        "scroll",
        () => {
          if (
            started &&
            (scrollX !== scrollPosition.x || scrollY !== scrollPosition.y)
          ) {
            finish();
          }
        },
        { capture: true, passive: true },
      );
      const onResize = () => {
        const dimensions = viewportDimensions();
        if (
          (started || force) &&
          dimensions.some((value, index) => value !== viewport[index])
        ) {
          interrupt();
        }
      };
      listen(window, "resize", onResize, { passive: true });
      listen(window.visualViewport, "resize", onResize, { passive: true });
      listen(document, "visibilitychange", () => {
        if (document.hidden) finish();
      });
      const start = () => {
        if (finished || started) return;
        if (document.hidden) {
          finish();
          return;
        }
        rememberAttempt();
        viewport = viewportDimensions();
        scrollPosition = { x: scrollX, y: scrollY };
        started = true;
        clearTimeout(startTimer);
        try {
          timeline.start();
        } catch {
          finish();
          return;
        }
        setPhase("assembling");
        watchdog = setTimeout(() => finish(), timeline.duration + 1900);
        // Responsive/font geometry changes hand off immediately rather than chase moving targets.
        // A late font that reflows the page shows up here; one that changes nothing does not end the intro.
        const measured = ["hero-frame", "hero-title", "navigation"]
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
      // Cold-load fonts can change geometry and cancel an already running intro.
      // Give them time to settle without delaying playback on a warm load.
      startTimer = setTimeout(start, 4000);
      fontsSettled(registry.current).then(() => {
        if (!finished && !started) {
          clearTimeout(startTimer);
          startTimer = setTimeout(start, 160);
        }
      });
    } catch {
      // Failure is always an ordinary, visible homepage.
      finish();
    }
    return () => finish(false);
  }, [active, allowed, replayCount, config]);

  const busy = phase === "preparing" || phase === "assembling";
  const value = useMemo(
    () => ({ register, replay, active, enabled: allowed, busy }),
    [register, replay, active, allowed, busy],
  );
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
            <rect x="0" y="0" width="0" height="0" rx="0" pathLength="1" />
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
            <rect x="0" y="0" width="0" height="0" rx="0" pathLength="1" />
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
