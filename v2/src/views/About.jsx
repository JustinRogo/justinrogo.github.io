import { contacts, experience, profile, technologies } from "../content.js";
import { ExternalLink, LinkRow, SectionTitle } from "../components/UI.jsx";
import { GlassLayer } from "../components/Glass.jsx";
import Icon from "../components/Icon.jsx";
import Strengths from "../components/Strengths.jsx";

export default function About({ effects, fine }) {
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
          src="/v2/assets/justin.png"
          width="240"
          height="240"
          alt="Justin Rogowski"
        />
        <div>
          <h2>Hi, I’m Justin.</h2>
          <p className="large-copy">{profile.bio}</p>
          <p>{profile.approach}</p>
          <p>{profile.personal}</p>
          <div
            className="button-row about-social"
            role="group"
            aria-label="Social profiles"
          >
            {contacts
              .filter(([title]) => ["LinkedIn", "GitHub"].includes(title))
              .map(([title, href, icon]) => (
                <ExternalLink key={title} href={href} className="button">
                  {title} <Icon name={icon} size={18} />
                </ExternalLink>
              ))}
          </div>
        </div>
      </div>
      <section className="about-experience glass-host" aria-labelledby="experience-heading">
        <GlassLayer />
        <SectionTitle headingProps={{ id: "experience-heading" }}>
          Making complicated work easier
        </SectionTitle>
        <div className="experience-list">
          {experience.map(([title, text]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
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
      <Strengths effects={effects} fine={fine} />
      <section
        className="contact-section"
        id="say-hello"
        aria-labelledby="say-hello-heading"
      >
        <SectionTitle headingProps={{ id: "say-hello-heading", tabIndex: -1 }}>
          Say hello
        </SectionTitle>
        {contacts.map(([title, href, icon]) => (
          <LinkRow key={title} title={title} href={href} icon={icon} />
        ))}
      </section>
    </>
  );
}
