import { useId, useLayoutEffect, useRef, useState } from "react";
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
      <StrengthDomainBar />
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

function StrengthCard({ theme, effects, fine }) {
  const [flipped, setFlipped] = useState(false);
  const cell = useRef(null);
  useLayoutEffect(() => {
    if (flipped) cell.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [flipped]);
  const description = theme.description.split(": ").slice(1).join(": ") || theme.description;
  const domain = domainNames[theme.domain];
  return (
    <div ref={cell} className={`strength-cell${flipped ? " is-expanded" : ""}`} data-rank={theme.rank}>
    <FlipCard className={`strength strength-${theme.domain}`} data-domain={theme.domain}
      data-expanded={flipped}
      width="100%" height="auto" radius={12} shadow={false} glare={false}
      background="var(--strength-color)" color="var(--strength-badge-ink)"
      flipped={flipped} onFlipChange={setFlipped} disableAnimations={!effects}
      tilt={effects && fine} tiltMax={4} hoverScale={1.01}
      ariaLabel={`Rank ${theme.rank}: ${theme.name}, ${domain}. ${flipped ? "Show ranking" : "Show description"}`}
      aria-description={flipped ? description : undefined}
      front={
        <div className="strength-card-front">
          <span className="strength-rank">{theme.rank}</span>
          <strong className="strength-name">{theme.name}</strong>
          <span className="strength-card-domain">{domain}</span>
          <span className="strength-card-hint" aria-hidden="true"><Icon name="refresh" size={14} /> Flip</span>
        </div>
      }
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

export default function Strengths({ effects = true, fine = false }) {
  const [limit, setLimit] = useState(5);
  const listId = useId();
  const visible = themes.slice(0, limit);
  const groups = domains.map(domain => ({ ...domain, themes: visible.filter(theme => theme.domain === domain.id) }))
    .filter(domain => domain.themes.length);
  return (
    <section
      className="strengths"
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
          {[5, 10, 34].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={limit === n}
              aria-controls={listId}
              onClick={() => setLimit(n)}
            >
              {n === 34 ? "All 34" : `Top ${n}`}
            </button>
          ))}
        </div>
        <p className="strength-instruction">
          Flip a card to expand its description.
        </p>
      </div>
      <p className="sr-only" role="status">
        Showing {limit} of 34 themes.
      </p>
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
    </section>
  );
}
