import { useState } from "react";
import themes from "v2:strengths";
import { contacts, experience, profile, technologies } from "../content.js";
import { LinkRow, SectionTitle } from "../components/UI.jsx";

function Strengths() {
  const [limit, setLimit] = useState(5);
  return (
    <section className="strengths">
      <SectionTitle>How I’m wired</SectionTitle>
      <p>My CliftonStrengths themes. Select one to explore it.</p>
      <div className="filter-row" role="group" aria-label="Strengths to show">
        {[5, 10, 34].map((n) => (
          <button
            key={n}
            aria-pressed={limit === n}
            onClick={() => setLimit(n)}
          >
            {n === 34 ? "All 34" : `Top ${n}`}
          </button>
        ))}
      </div>
      <div className="strength-list">
        {themes.slice(0, limit).map((theme) => (
          <details
            key={theme.rank}
            className={`strength strength-${theme.domain}`}
          >
            <summary>
              <span className="strength-rank">
                {String(theme.rank).padStart(2, "0")}
              </span>
              <strong>{theme.name}</strong>
              <span className="strength-domain">
                {
                  {
                    thinking: "Strategic thinking",
                    executing: "Executing",
                    relationship: "Relationship building",
                    influencing: "Influencing",
                  }[theme.domain]
                }
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
export default function About() {
  return (
    <>
      <div className="page-heading">
        <h1 tabIndex={-1}>
          A little about me<span className="title-dot">.</span>
        </h1>
        <p>
          Libraries, systems, people. And an alarming number of browser tabs.
        </p>
      </div>
      <div className="about-intro">
        <img
          src="./assets/justin.png"
          width="240"
          height="240"
          alt="Justin Rogowski"
        />
        <div>
          <h2>Hi, I’m Justin.</h2>
          <p className="large-copy">{profile.bio}</p>
          <p>{profile.approach}</p>
          <p>{profile.personal}</p>
        </div>
      </div>
      <SectionTitle>Making complicated work easier</SectionTitle>
      <div className="experience-list">
        {experience.map(([title, text]) => (
          <article key={title}>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
      <div className="about-columns">
        <section>
          <h2>Leadership & service</h2>
          <ul className="plain-list">
            <li>
              <strong>University Senate Staff Senator</strong>
              <span>2023–2026</span>
            </li>
            <li>
              <strong>UCPEA Executive Board Secretary</strong>
              <span>2024–2025</span>
            </li>
            <li>
              <strong>UCPEA Union Steward</strong>
              <span>2020–present</span>
            </li>
          </ul>
          <p>
            Organizations work better when people can find the information they
            need and have a meaningful voice in decisions.
          </p>
        </section>
        <section>
          <h2>Education & community</h2>
          <p>
            B.A. in Political Science and Anthropology from UConn, with graduate
            coursework in Library and Information Science through San José State
            University.
          </p>
          <p>
            Member of the American Association of Law Libraries (AALL) and Law
            Libraries of New England (LLNE).
          </p>
        </section>
      </div>
      <section className="technology">
        <SectionTitle>Tools I reach for</SectionTitle>
        <div className="technology-list">
          {technologies.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </section>
      <Strengths />
      <section className="contact-section">
        <SectionTitle>Say hello</SectionTitle>
        {contacts.map(([title, href, icon]) => (
          <LinkRow key={title} title={title} href={href} icon={icon} />
        ))}
      </section>
    </>
  );
}
