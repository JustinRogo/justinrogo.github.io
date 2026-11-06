import { useMemo } from "react";
import { useFitsViewport } from "../hooks.js";
import TechText from "../vendor/TechText.jsx";
import MagicBento from "../vendor/MagicBento.jsx";
import {
  profile,
  featuredPaths,
  projectHref,
} from "../content.js";
import Icon from "../components/Icon.jsx";
import { GlassLayer } from "../components/Glass.jsx";
import { ExternalLink, LoadState, SectionTitle, newTabLink } from "../components/UI.jsx";
import { AssembleReveal } from "../assembly/HomepageAssembly.jsx";
import { StrengthsPreview } from "../components/Strengths.jsx";
import { MyDay } from "../components/AvailabilityCalendar.jsx";
import LawEvents from "../components/LawEvents.jsx";
import PocketPart from "../components/PocketPart.jsx";
import { ProjectPreview } from "../components/Project.jsx";
import "./Home.css";

const helpLinks = [
  ["Book a meeting", "Find a time that works for both of us.", "#/tools?panel=booking", "calendar"],
  ["Start a request", "Send something to my task board.", "#/tools?panel=request", "mail"],
  ["Search the library", "Books, journals, databases, and guides.", "#/tools?panel=catalog", "search"],
];

function Name({ effects }) {
  return (
    <AssembleReveal id="hero-title">
      <h1 tabIndex={-1} className="tech-heading">
        {effects ? (
          <>
            <span className="sr-only">Justin Rogowski</span>
            <span className="tech-name" aria-hidden="true">
              {["Justin", "Rogowski"].map((word, index) => (
                <span className={`tech-line tech-line-${index}`} key={word}>
                  <TechText
                    text={word}
                    fontFamily="Geist"
                    fontWeight={550}
                    fontSize={120}
                    letterSpacing={-0.03}
                    color="currentColor"
                    accentColor="#5d9fff"
                    style={{ color: index ? "var(--orange)" : "var(--ink)" }}
                    align="left"
                    reach={165}
                    strokeWidth={1.5}
                    specks={8}
                    labels={false}
                    guides={false}
                    selection={false}
                    draggable={false}
                    sweep={false}
                    bounce={0.2}
                    clickKick={true}
                    intro="none"
                  />
                </span>
              ))}
            </span>
          </>
        ) : (
          <>
            <span>Justin</span>
            <span>Rogowski</span>
          </>
        )}
      </h1>
    </AssembleReveal>
  );
}

function FeaturedBento({ projects, effects, theme, fine }) {
  const items = useMemo(() => {
    const pages = projects.data?.pages || [];
    const featured = featuredPaths
      .map((path) => pages.find((p) => p.path === path))
      .filter(Boolean);
    return featured
      .map((project, index) => ({
        id: project.path,
        href: projectHref(project),
        ...newTabLink,
        colSpan: index < 2 ? 2 : 1,
        rowSpan: index === 0 ? 2 : 1,
        content: (
          <>
            <GlassLayer />
            <AssembleReveal
              id={`featured-${index}`}
              closest=".magic-bento__cell"
            >
              <div className={`bento-project bento-project-${index}`}>
                {index === 0 ? (
                  <div className="bento-statutes-art" aria-hidden="true">
                    <span>§§</span>
                  </div>
                ) : null}
                <ProjectPreview project={project} className="featured-project-preview" decorative sizes="270px" />
                <div className="bento-copy">
                  <h3>{project.title}</h3>
                  <span className="project-category">{project.category}</span>
                  <p>{project.description}</p>
                </div>
                <span className="bento-open">
                  <span>Open project</span>
                  <Icon name="external" size={18} />
                </span>
              </div>
            </AssembleReveal>
          </>
        ),
      }));
  }, [projects.data]);
  return (
    <MagicBento
      items={items}
      columns={4}
      rowHeight={170}
      style={{ gridAutoRows: "minmax(170px, auto)" }}
      gap={16}
      radius={6}
      theme={theme}
      glowColor="#ff8a36"
      textAutoHide={false}
      enableBorderGlow={effects}
      enableSpotlight={effects && fine}
      enableTilt={effects && fine}
      enableMagnetism={false}
      clickEffect={effects}
      enableStars={false}
      intro={false}
      disableAnimations={!effects}
      className="selected-bento"
    />
  );
}

export default function Home({ projects, effects, theme, fine }) {
  const [eventsColumn, eventsFit] = useFitsViewport(24);
  return (
    <>
      <AssembleReveal id="hero-frame">
        <section className="glass-hero glass-host">
          <GlassLayer />
          <div className="hero-copy">
            <Name effects={effects} />
            <AssembleReveal id="hero-role">
              <p className="hero-role">
                {profile.role}
                <span>{profile.organization}</span>
              </p>
            </AssembleReveal>
            <AssembleReveal id="hero-description">
              <p className="hero-description">{profile.intro}</p>
            </AssembleReveal>
            <AssembleReveal id="hero-actions">
              <div className="button-row hero-actions">
                <a className="button primary" href="#/projects">
                  Explore my projects <Icon name="arrow" size={18} />
                </a>
                <a className="button" href="#/about">
                  A little about me <Icon name="about" size={18} />
                </a>
              </div>
            </AssembleReveal>
          </div>
          <AssembleReveal id="portrait">
            <div className="hero-portrait">
              <div className="portrait-stage">
                <div className="portrait-orbit orbit-one" />
                <div className="portrait-orbit orbit-two" />
                <div className="portrait-photo">
                  <img
                    src="/v2/assets/justin.webp"
                    alt="Justin Rogowski"
                    width="240"
                    height="240"
                  />
                </div>
              </div>
              <div className="portrait-contact-actions">
                <a
                  href="#/tools?panel=booking"
                  className="orbit-action orbit-calendar"
                  aria-label="Book a meeting"
                  title="Book a meeting"
                >
                  <Icon name="calendar" size={23} />
                  <span className="orbit-label">Book</span>
                </a>
                <a
                  href="mailto:justin.rogowski@uconn.edu"
                  className="orbit-action orbit-mail"
                  aria-label="Email Justin"
                  title="Email Justin"
                >
                  <Icon name="mail" size={23} />
                  <span className="orbit-label">Email</span>
                </a>
                <ExternalLink
                  href="https://teams.microsoft.com/l/chat/0/0?users=justin.rogowski@uconn.edu"
                  className="orbit-action orbit-teams"
                  aria-label="Start a Teams chat"
                  title="Start a Teams chat"
                >
                  <Icon name="chat" size={23} />
                  <span className="orbit-label">Teams</span>
                </ExternalLink>
                <a
                  href="tel:+18605705109"
                  className="orbit-action orbit-phone"
                  aria-label="Call Justin"
                  title="Call Justin"
                >
                  <Icon name="phone" size={23} />
                  <span className="orbit-label">Call</span>
                </a>
              </div>
              <StrengthsPreview />
            </div>
          </AssembleReveal>
        </section>
      </AssembleReveal>
      <AssembleReveal id="help">
        <section className="home-help glass-host" aria-labelledby="home-help-title">
          <GlassLayer />
          <h2 id="home-help-title">How can I help?</h2>
          <ul>
            {helpLinks.map(([label, note, href, icon]) => (
              <li key={href}>
                <a href={href}>
                  <Icon name={icon} size={22} />
                  <span>
                    <strong>{label}</strong>
                    <small>{note}</small>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </AssembleReveal>
      <AssembleReveal id="featured-heading">
        <SectionTitle
          glass
          action={
            <a href="#/projects" className="text-link">
              All projects <Icon name="arrow" size={17} />
            </a>
          }
        >
          Featured projects
        </SectionTitle>
      </AssembleReveal>
      <LoadState resource={projects}>
        {() => (
          <FeaturedBento
            projects={projects}
            effects={effects}
            theme={theme}
            fine={fine}
          />
        )}
      </LoadState>
      <div className="home-lower home-feeds">
        <AssembleReveal id="notes">
          <div
            ref={eventsColumn}
            className={`home-events-column${eventsFit ? " fits-viewport" : ""}`}
          >
            <MyDay />
            <LawEvents effects={effects} theme={theme} />
          </div>
        </AssembleReveal>
        <AssembleReveal id="pocket-part">
          <div className="home-blog-column"><PocketPart effects={effects} /></div>
        </AssembleReveal>
      </div>
    </>
  );
}
