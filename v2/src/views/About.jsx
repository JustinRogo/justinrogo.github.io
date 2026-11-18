import { contacts, experience, profile, technologies } from "../content.js";
import { ExternalLink, LinkRow, SectionTitle } from "../components/UI.jsx";
import { GlassLayer } from "../components/Glass.jsx";
import Icon from "../components/Icon.jsx";
import ProfilePortrait from "../components/ProfilePortrait.jsx";
import { useRef } from "react";
import Strengths from "../components/Strengths.jsx";
import DailyActivity from "../components/DailyActivity.jsx";
import { AboutVine } from "../botanical/Flora.jsx";
import { useBotanical } from "../botanical/siteStyle.js";

export default function About({ effects, fine }) {
  const botanical = useBotanical();
  const intro = useRef(null);
  return (
    <>
      <header className="about-intro" ref={intro}>
        {botanical && <AboutVine hostRef={intro} />}
        <div className="about-greeting">
          <h1 tabIndex={-1}>
            Hi, I’m <em>Justin</em><span className="title-dot">.</span>
          </h1>
          <p>Libraries, systems, people. And an alarming number of browser tabs.</p>
        </div>
        <ProfilePortrait className="about-portrait" wreath={false} />
        <div className="about-intro-copy">
          <p className="large-copy">{profile.approach}</p>
          <div
            className="button-row about-social"
            role="group"
            aria-label="Contact and profiles"
          >
            {contacts
              .filter(([title]) => ["Email me", "LinkedIn", "GitHub"].includes(title))
              .map(([title, href, icon]) => (
                <ExternalLink
                  key={title}
                  href={href}
                  className={icon === "mail" ? "button" : "text-link"}
                >
                  {title} <Icon name={icon} size={16} />
                </ExternalLink>
              ))}
          </div>
        </div>
      </header>
      <section
        className="about-interests"
        aria-labelledby="about-interests-heading"
      >
        <h2 id="about-interests-heading">Away from my desk</h2>
        <div>
          <p>{profile.personal}</p>
          <a className="text-link" href="#/projects?group=For+Fun">
            See my side projects <Icon name="arrow" size={16} />
          </a>
        </div>
      </section>
      <section className="about-experience glass-host" aria-labelledby="experience-heading">
        <GlassLayer />
        <SectionTitle headingProps={{ id: "experience-heading" }}>
          Making complicated work easier
        </SectionTitle>
        <p className="about-work-intro">{profile.bio}</p>
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
        <p className="technology-list">{technologies.join(", ")}</p>
      </section>
      <Strengths effects={effects} fine={fine} />
      <DailyActivity />
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
