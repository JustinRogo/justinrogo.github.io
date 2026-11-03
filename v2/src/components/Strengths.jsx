import { useId, useState } from "react";
import {
  themes,
  reflections,
  domainNames,
  domainOverview,
} from "../strengths.js";
import { SectionTitle } from "./UI.jsx";
import Icon from "./Icon.jsx";
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
      <p>Weights run from 34 points at rank 1 to one point at rank 34.</p>
    </figure>
  );
}

function Reflections() {
  const [selected, setSelected] = useState("best");
  const id = useId();
  return (
    <section className="strength-reflection" aria-label="Personal reflections">
      <div
        className="filter-row"
        role="group"
        aria-label="Strengths reflections"
      >
        {[
          ["best", "When I’m at my best"],
          ["overextended", "When I’m overextended"],
        ].map(([value, label]) => (
          <button
            key={value}
            id={`${id}-${value}`}
            type="button"
            aria-pressed={selected === value}
            aria-controls={`${id}-reflection`}
            onClick={() => setSelected(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        id={`${id}-reflection`}
        className="strength-reflection-content"
        role="region"
        aria-labelledby={`${id}-${selected}`}
      >
        <p>{reflections[selected]}</p>
      </div>
    </section>
  );
}

export default function Strengths() {
  const [limit, setLimit] = useState(5);
  const listId = useId();
  return (
    <section
      className="strengths"
      id="cliftonstrengths"
      aria-labelledby="cliftonstrengths-heading"
    >
      <SectionTitle
        headingProps={{ id: "cliftonstrengths-heading", tabIndex: -1 }}
      >
        How I’m wired
      </SectionTitle>
      <p>My CliftonStrengths themes, and how they show up in my work.</p>
      <div className="strengths-introduction">
        <DomainOverview />
        <Reflections />
      </div>
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
        Select a theme to read its description.
      </p>
      <p className="sr-only" role="status">
        Showing {limit} of 34 themes.
      </p>
      <div className="strength-list" id={listId}>
        {themes.slice(0, limit).map((theme) => (
          <details
            key={theme.rank}
            className={`strength strength-${theme.domain}`}
            data-domain={theme.domain}
          >
            <summary>
              <span className="strength-rank">
                {String(theme.rank).padStart(2, "0")}
              </span>
              <strong>{theme.name}</strong>
              <span className="strength-domain">
                {domainNames[theme.domain]}
              </span>
              <span className="expand-icon" aria-hidden="true">
                +
              </span>
            </summary>
            <p>{theme.description.split(": ").slice(1).join(": ")}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
