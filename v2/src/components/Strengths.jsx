import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import {
  themes,
  reflections,
  domainNames,
  domainOverview,
  domains,
} from "../strengths.js";
import { SectionTitle } from "./UI.jsx";
import { GlassLayer } from "./Glass.jsx";
import Icon from "./Icon.jsx";
import FlipCard from "../vendor/FlipCard.jsx";
import "./Strengths.css";

const describe = (theme) => theme.description.split(": ").slice(1).join(": ") || theme.description;
const LIST_LIMITS = [5, 10, 34];
const DOMAIN_VIEW = "domain";
const BOARD_ORDER = ["executing", "influencing", "relationship", "thinking"];

export function StrengthDomainBar() {
  const label = `Rank-weighted CliftonStrengths domain balance: ${domainOverview.map(({ name, percentage }) => `${name} ${percentage}%`).join(", ")}`;
  return (
    <div className="strength-domain-bar" role="img" aria-label={label}>
      {domainOverview.map(({ id, name, weight, percentage }) => (
        <span
          key={id}
          data-domain={id}
          style={{ flexGrow: weight }}
          aria-hidden="true"
          title={`${name}: ${percentage}%`}
        />
      ))}
    </div>
  );
}

export function StrengthsPreview() {
  return (
    <a
      className="strengths-preview"
      href="#/about?section=strengths"
      aria-label="View my CliftonStrengths"
    >
      <MiniStrengthHelix />
      <span>
        My CliftonStrengths <Icon name="arrow" size={15} />
      </span>
    </a>
  );
}

function DomainOverview() {
  return (
    <figure className="strength-overview">
      <figcaption>
        Rank-weighted overview<span>All 34 themes</span>
      </figcaption>
      <StrengthDomainBar />
      <ul className="strength-domain-legend" aria-label="Strength domains">
        {domainOverview.map(({ id, name, percentage }) => (
          <li key={id} data-domain={id}>
            <span className="strength-swatch" aria-hidden="true" />
            <span>{name}</span>
            <strong>{percentage}%</strong>
          </li>
        ))}
      </ul>
    </figure>
  );
}

function Reflections({ effects }) {
  const [flipped, setFlipped] = useState(false);
  const title = flipped ? "When I’m overextended" : "When I’m at my best";
  return (
    <section className="strength-reflection" aria-label="Personal reflections">
      <FlipCard className="strength-reflection-card" width="100%" height="auto"
        radius={12} shadow={false} glare={false} tilt={false} hoverScale={1}
        draggable={false} disableAnimations={!effects}
        background="var(--surface)" color="var(--ink)"
        flipped={flipped} onFlipChange={setFlipped}
        ariaLabel={`${title}. Flip personal reflection`}
        aria-description={reflections[flipped ? "overextended" : "best"]}
        front={
          <div className="strength-reflection-content">
            <strong>When I’m at my best</strong>
            <p>{reflections.best}</p>
            <span className="strength-card-hint" aria-hidden="true"><Icon name="refresh" size={17} /> When I’m overextended</span>
          </div>
        }
        back={
          <div className="strength-reflection-content">
            <strong>When I’m overextended</strong>
            <p>{reflections.overextended}</p>
            <span className="strength-card-hint" aria-hidden="true"><Icon name="refresh" size={17} /> When I’m at my best</span>
          </div>
        }
      />
    </section>
  );
}

function StrengthCard({ theme, effects, fine, tile = false }) {
  const [flipped, setFlipped] = useState(false);
  const cell = useRef(null);
  useLayoutEffect(() => {
    if (flipped) cell.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [flipped]);
  const description = describe(theme);
  const domain = domainNames[theme.domain];
  return (
    <div
      ref={cell}
      className={`strength-cell${tile ? " strength-tile" : ""}${flipped ? " is-expanded" : ""}`}
      data-rank={theme.rank}
      data-tier={tile ? (theme.rank <= 5 ? "top" : theme.rank <= 10 ? "high" : "rest") : undefined}
    >
    <FlipCard className={`strength strength-${theme.domain}`} data-domain={theme.domain}
      data-expanded={flipped}
      width="100%" height="auto" radius={12} shadow={false} glare={false}
      background="var(--strength-color)" color="var(--strength-badge-ink)"
      flipped={flipped} onFlipChange={setFlipped} disableAnimations={!effects}
      tilt={effects && fine} tiltMax={4} hoverScale={1.01}
      ariaLabel={`Rank ${theme.rank}: ${theme.name}, ${domain}. ${flipped ? "Show ranking" : "Show description"}`}
      aria-description={flipped ? description : undefined}
      front={tile ? (
        <div className="strength-tile-front">
          <span className="strength-tile-rank">{theme.rank}</span>
          <span className="strength-tile-name">{theme.name}</span>
        </div>
      ) : (
        <div className="strength-card-front">
          <span className="strength-rank">{theme.rank}</span>
          <strong className="strength-name">{theme.name}</strong>
          <span className="strength-card-domain">{domain}</span>
          <span className="strength-card-hint" aria-hidden="true"><Icon name="refresh" size={14} /> Flip</span>
        </div>
      )}
      back={
        <div className="strength-card-back">
          <strong className="strength-name">{theme.name}</strong>
          <p>{description}</p>
          <span className="strength-card-hint" aria-hidden="true"><Icon name="refresh" size={17} /> Flip back</span>
        </div>
      }
    />
    </div>
  );
}

const HELIX_HEIGHT = 80;
const HELIX_COMPACT = 640;
const HELIX_STROKE = 4;

// Bars share one pitch and sit only in each hexagon's flat run, so all 34 are full height.
function helixLayout(width, { height = HELIX_HEIGHT, stroke = HELIX_STROKE, gap = 3, compactBelow = HELIX_COMPACT } = {}) {
  const compact = width < compactBelow;
  const centre = height / 2;
  const estimate = width / 34;
  const barWidth = Math.min(10, estimate * (compact ? 0.62 : 0.36));
  if (compact) {
    const pitch = width / 34;
    return {
      compact,
      pitch,
      barWidth,
      outline: [],
      bars: themes.map((_, index) => ({ x: pitch * (index + 0.5), half: centre })),
    };
  }
  const edge = stroke / 2;
  const chamfer = Math.max(height * 0.175, estimate * 0.6);
  const clearance = stroke / 2 + gap;
  const pinchInset = chamfer + barWidth / 2 + clearance;
  const first = edge + pinchInset;
  const pitch = (width - first * 2 - pinchInset * 2) / 32;
  const fifth = first + pitch * 4;
  const pinch = fifth + pinchInset;
  const half = centre - edge - clearance;
  const hexagon = (from, to) =>
    [[from, centre], [from + chamfer, edge], [to - chamfer, edge], [to, centre], [to - chamfer, height - edge], [from + chamfer, height - edge]]
      .map((point) => point.map((value) => value.toFixed(2)).join(","))
      .join(" ");
  const bars = themes.map((_, index) => ({
    x: index < 5 ? first + pitch * index : pinch + pinchInset + pitch * (index - 5),
    half,
  }));
  return { compact, pitch, barWidth, outline: [hexagon(edge, pinch), hexagon(pinch, width - edge)], bars };
}

// Home's preview: the same strand at a fixed drawing size that scales with its link.
const MINI_HELIX_WIDTH = 230;
const MINI_HELIX_HEIGHT = 24;
const miniHelix = helixLayout(MINI_HELIX_WIDTH, { height: MINI_HELIX_HEIGHT, stroke: 1.5, gap: 1.25, compactBelow: 0 });

function MiniStrengthHelix() {
  return (
    <svg
      className="strength-helix-mini"
      viewBox={`0 0 ${MINI_HELIX_WIDTH} ${MINI_HELIX_HEIGHT}`}
      role="img"
      aria-label="Strengths strand: all 34 themes in rank order, colored by domain."
    >
      {miniHelix.outline.map((points) => (
        <polygon key={points} className="strength-helix-outline" points={points} />
      ))}
      {themes.map((theme, index) => {
        const { x, half } = miniHelix.bars[index];
        return (
          <rect
            key={theme.rank}
            className="strength-helix-mark"
            data-domain={theme.domain}
            x={x - miniHelix.barWidth / 2}
            y={MINI_HELIX_HEIGHT / 2 - half}
            width={miniHelix.barWidth}
            height={half * 2}
            rx={miniHelix.barWidth / 2}
          />
        );
      })}
    </svg>
  );
}

function StrengthHelix({ effects, onSelect }) {
  const wrap = useRef(null);
  const tip = useRef(null);
  const svg = useRef(null);
  const titleId = useId();
  const [width, setWidth] = useState(0);
  const [hovered, setHovered] = useState(null);
  const [focused, setFocused] = useState(null);
  const [current, setCurrent] = useState(1);
  const [tipLeft, setTipLeft] = useState(0);
  // Below the fold on load, so the grow-in waits until the strip is actually seen.
  const [reveal, setReveal] = useState(effects ? "waiting" : "done");

  useLayoutEffect(() => {
    const node = wrap.current;
    const update = () => setWidth(node.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!effects) {
      setReveal("done");
      return undefined;
    }
    if (reveal !== "waiting") return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setReveal("running");
      },
      { threshold: 0.4 },
    );
    observer.observe(wrap.current);
    return () => observer.disconnect();
  }, [effects, reveal]);

  const layout = width ? helixLayout(width) : null;
  const activeRank = hovered ?? focused;
  const active = activeRank ? themes[activeRank - 1] : null;
  useLayoutEffect(() => {
    if (!active || !layout || !tip.current) return;
    const half = tip.current.offsetWidth / 2;
    const x = layout.bars[active.rank - 1].x;
    setTipLeft(Math.max(half, Math.min(width - half, x)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRank, width]);

  const moveTo = (rank) => {
    setCurrent(rank);
    svg.current?.querySelector(`[data-rank="${rank}"]`)?.focus();
  };
  const onKeyDown = (event, rank) => {
    const next = { ArrowRight: rank + 1, ArrowLeft: rank - 1, Home: 1, End: themes.length }[event.key];
    if (next !== undefined) {
      event.preventDefault();
      moveTo(Math.max(1, Math.min(themes.length, next)));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(rank);
    }
  };
  return (
    <div className="strength-helix" ref={wrap} data-reveal={reveal} data-compact={layout?.compact || undefined}>
      {layout ? (
        <svg
          ref={svg}
          width="100%"
          height={HELIX_HEIGHT}
          viewBox={`0 0 ${width} ${HELIX_HEIGHT}`}
          role="toolbar"
          aria-labelledby={titleId}
          onAnimationEnd={(event) => {
            if (event.target.closest("[data-rank]")?.dataset.rank === String(themes.length)) setReveal("done");
          }}
        >
          {/* Held in defs: a direct <title> child would also raise the browser's own hover tooltip. */}
          <defs>
            <title id={titleId}>Strengths strand: all 34 themes in rank order, colored by domain.</title>
          </defs>
          {layout.outline.map((points) => (
            <polygon key={points} className="strength-helix-outline" points={points} />
          ))}
          {themes.map((theme, index) => {
            const { x, half } = layout.bars[index];
            return (
              <g
                key={theme.rank}
                className="strength-helix-bar"
                role="button"
                tabIndex={theme.rank === current ? 0 : -1}
                aria-label={`#${theme.rank} ${theme.name} · ${domainNames[theme.domain]}`}
                data-rank={theme.rank}
                data-domain={theme.domain}
                style={{ "--bar-delay": `${index * 16}ms` }}
                onPointerEnter={() => setHovered(theme.rank)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => {
                  setFocused(theme.rank);
                  setCurrent(theme.rank);
                }}
                onBlur={() => setFocused(null)}
                onClick={() => onSelect(theme.rank)}
                onKeyDown={(event) => onKeyDown(event, theme.rank)}
              >
                <rect className="strength-helix-hit" x={x - layout.pitch / 2} y="0" width={layout.pitch} height={HELIX_HEIGHT} />
                <rect
                  className="strength-helix-mark"
                  x={x - layout.barWidth / 2}
                  y={HELIX_HEIGHT / 2 - half}
                  width={layout.barWidth}
                  height={half * 2}
                  rx={Math.min(2, layout.barWidth / 2)}
                />
              </g>
            );
          })}
        </svg>
      ) : null}
      {active ? (
        <div className="strength-helix-tip" ref={tip} style={{ left: tipLeft }} aria-hidden="true">
          #{active.rank} {active.name} · {domainNames[active.domain]}
        </div>
      ) : null}
    </div>
  );
}

function StrengthBoard({ id, effects, fine }) {
  const columns = BOARD_ORDER.map((domainId) => ({
    id: domainId,
    name: domainNames[domainId],
    themes: themes
      .filter((theme) => theme.domain === domainId)
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));
  return (
    <div className="strength-board-frame" id={id}>
      <div className="strength-board">
        {columns.map((column) => (
          <section key={column.id} className="strength-board-column" data-domain={column.id} aria-labelledby={`${id}-${column.id}`}>
            <h3 id={`${id}-${column.id}`}>{column.name}</h3>
            <div className="strength-board-tiles">
              {column.themes.map((theme) => (
                <StrengthCard key={theme.rank} theme={theme} effects={effects} fine={fine} tile />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

// A hovered or keyboard-focused bar or card marks its partner. This writes to the DOM
// directly so moving the pointer doesn't re-render all 34 flip cards.
function useRankLink(root) {
  const hover = useRef(null);
  const focus = useRef(null);
  const sync = () => {
    const rank = hover.current ?? focus.current;
    root.current.querySelectorAll("[data-linked]").forEach((node) => {
      if (node.dataset.rank !== rank) delete node.dataset.linked;
    });
    if (!rank) return;
    root.current.querySelectorAll(`[data-rank="${rank}"]`).forEach((node) => {
      node.dataset.linked = "";
    });
  };
  const rankOf = (event) => event.target.closest("[data-rank]")?.dataset.rank ?? null;
  return {
    onPointerOver(event) {
      if (event.pointerType === "touch") return;
      hover.current = rankOf(event);
      sync();
    },
    onPointerLeave() {
      hover.current = null;
      sync();
    },
    onFocus(event) {
      focus.current = event.target.matches(":focus-visible") ? rankOf(event) : null;
      sync();
    },
    onBlur() {
      focus.current = null;
      sync();
    },
  };
}

export default function Strengths({ effects = true, fine = false }) {
  const [view, setView] = useState(DOMAIN_VIEW);
  const [located, setLocated] = useState(null);
  const listId = useId();
  const board = useRef(null);
  const rankLink = useRankLink(board);
  const byDomain = view === DOMAIN_VIEW;
  const visible = byDomain ? [] : themes.slice(0, view);
  const groups = domains.map(domain => ({ ...domain, themes: visible.filter(theme => theme.domain === domain.id) }))
    .filter(domain => domain.themes.length);
  // A bar can point past the current filter, so widen it first and scroll once it has rendered.
  const locate = (rank) => {
    if (!byDomain && rank > view) setView(LIST_LIMITS.find((limit) => limit >= rank));
    setLocated({ rank });
  };
  useLayoutEffect(() => {
    if (!located) return undefined;
    const cell = board.current?.querySelector(`.strength-cell[data-rank="${located.rank}"]`);
    if (!cell) return undefined;
    cell.scrollIntoView({ block: "center", behavior: effects ? "smooth" : "instant" });
    cell.querySelector(".flip-card")?.focus({ preventScroll: true });
    cell.dataset.located = "";
    const timer = setTimeout(() => delete cell.dataset.located, 1600);
    return () => {
      clearTimeout(timer);
      delete cell.dataset.located;
    };
  }, [located, effects]);
  return (
    <section
      className="strengths"
      ref={board}
      {...rankLink}
      id="cliftonstrengths"
      aria-labelledby="cliftonstrengths-heading"
    >
      <div className="strengths-heading glass-host">
        <GlassLayer />
        <SectionTitle
          headingProps={{ id: "cliftonstrengths-heading", tabIndex: -1 }}
        >
          How I’m wired
        </SectionTitle>
        <p>My CliftonStrengths themes, and how they show up in my work.</p>
      </div>
      <div className="strengths-introduction">
        <DomainOverview />
        <Reflections effects={effects} />
      </div>
      <div className="strength-controls glass-host">
        <GlassLayer />
        <div className="filter-row" role="group" aria-label="Strengths to show">
          {[DOMAIN_VIEW, ...LIST_LIMITS].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={view === n}
              aria-controls={listId}
              onClick={() => setView(n)}
            >
              {n === DOMAIN_VIEW ? "By domain" : n === 34 ? "All 34" : `Top ${n}`}
            </button>
          ))}
        </div>
        <p className="strength-instruction">
          Flip a card to expand its description.
        </p>
      </div>
      <p className="sr-only" role="status">
        {byDomain ? "Showing all 34 themes by domain." : `Showing ${view} of 34 themes.`}
      </p>
      <StrengthHelix effects={effects} onSelect={locate} />
      {byDomain ? (
        <StrengthBoard id={listId} effects={effects} fine={fine} />
      ) : (
        <div className="strength-list strength-flip-list" id={listId}>
          {groups.map(domain => (
            <section className="strength-domain-group" key={domain.id} aria-labelledby={`${listId}-${domain.id}`} data-domain={domain.id}>
              <h3 className="sr-only" id={`${listId}-${domain.id}`}>{domain.name}</h3>
              <div className="strength-domain-grid">
                {domain.themes.map(theme => <StrengthCard key={theme.rank} theme={theme} effects={effects} fine={fine} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
