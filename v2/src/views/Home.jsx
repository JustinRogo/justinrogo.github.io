import { useMemo } from "react";
import TechText from "../vendor/TechText.jsx";
import MagicBento from "../vendor/MagicBento.jsx";
import {
  profile,
  featuredPaths,
  featuredTitles,
  projectHref,
} from "../content.js";
import Icon from "../components/Icon.jsx";
import { GlassLayer } from "../components/Glass.jsx";
import { ExternalLink, LoadState, SectionTitle } from "../components/UI.jsx";
import { AssembleReveal } from "../assembly/HomepageAssembly.jsx";
import { StrengthsPreview } from "../components/Strengths.jsx";
import { MyDay } from "../components/AvailabilityCalendar.jsx";
import LawEvents from "../components/LawEvents.jsx";
import PocketPart from "../components/PocketPart.jsx";
import { ProjectPreview } from "../components/Project.jsx";
import "./Home.css";

function Name({ effects }) {
  return (
    <AssembleReveal id="hero-title">
      <h1 tabIndex={-1} className="tech-heading">
        {effects ? (
          <>
            <span className="sr-only">Justin Rogowski</span>
            <div className="tech-name" aria-hidden="true">
              {["Justin", "Rogowski"].map((word, index) => (
                <div className={`tech-line tech-line-${index}`} key={word}>
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
                </div>
              ))}
            </div>
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
        target: "_blank",
        rel: "noopener noreferrer",
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
                <ProjectPreview project={project} className="featured-project-preview" />
                <div className="bento-copy">
                  <h3>{featuredTitles[project.path] || project.title}</h3>
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
                    src="/v2/assets/justin.png"
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
                </a>
                <a
                  href="mailto:justin.rogowski@uconn.edu"
                  className="orbit-action orbit-mail"
                  aria-label="Email Justin"
                  title="Email Justin"
                >
                  <Icon name="mail" size={23} />
                </a>
                <ExternalLink
                  href="https://teams.microsoft.com/l/chat/0/0?users=justin.rogowski@uconn.edu"
                  className="orbit-action orbit-teams"
                  aria-label="Start a Teams chat"
                  title="Start a Teams chat"
                >
                  <Icon name="chat" size={23} />
                </ExternalLink>
                <a
                  href="tel:+18605705109"
                  className="orbit-action orbit-phone"
                  aria-label="Call Justin"
                  title="Call Justin"
                >
                  <Icon name="phone" size={23} />
                </a>
              </div>
              <StrengthsPreview />
            </div>
          </AssembleReveal>
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
          <div className="home-events-column">
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
