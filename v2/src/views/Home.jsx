import { useMemo } from "react";
import TechText from "../vendor/TechText.jsx";
import MagicBento from "../vendor/MagicBento.jsx";
import GlareHover from "../../../src/homepage/vendor/GlareHover.jsx";
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
            <GlassLayer radius={22} />
            <AssembleReveal
              id={`featured-${index}`}
              closest=".magic-bento__cell"
            >
              <div className={`bento-project bento-project-${index}`}>
                {index === 0 ? (
                  <div className="bento-statutes-art" aria-hidden="true">
                    <Icon name="book" size={100} />
                    <span>CT</span>
                  </div>
                ) : (
                  <Icon name={index === 1 ? "projects" : "mail"} size={35} />
                )}
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
      }))
      .concat([
        {
          id: "all-projects",
          href: "#/projects",
          colSpan: 1,
          rowSpan: 1,
          content: (
            <>
              <GlassLayer radius={22} />
              <AssembleReveal id="featured-3" closest=".magic-bento__cell">
                <div className="bento-index">
                  <Icon name="projects" size={30} />
                  <h3>Project index</h3>
                  <p>
                    Work, library tools,
                    <br />
                    and experiments.
                  </p>
                  <span className="bento-open" aria-hidden="true">
                    <Icon name="arrow" size={18} />
                  </span>
                </div>
              </AssembleReveal>
            </>
          ),
        },
      ]);
  }, [projects.data]);
  return (
    <MagicBento
      items={items}
      columns={4}
      rowHeight={170}
      gap={16}
      radius={22}
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
          <GlassLayer radius={28} />
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
              <div className="portrait-orbit orbit-one" />
              <div className="portrait-orbit orbit-two" />
              <div className="portrait-photo">
                <img
                  src="./assets/justin.png"
                  alt="Justin Rogowski"
                  width="240"
                  height="240"
                />
              </div>
              <a
                href="#/tools?panel=booking"
                className="orbit-action orbit-calendar"
                aria-label="Book a meeting"
              >
                <Icon name="calendar" size={23} />
              </a>
              <a
                href="#/projects?group=For+Fun"
                className="orbit-action orbit-code"
                aria-label="Explore creative experiments"
              >
                <Icon name="code" size={23} />
              </a>
            </div>
          </AssembleReveal>
        </section>
      </AssembleReveal>
      <AssembleReveal id="featured-heading">
        <SectionTitle
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
      <div className="home-lower">
        <AssembleReveal id="notes">
          <aside className="glass-host now-panel">
            <GlassLayer />
            <h2>Around here lately</h2>
            <p>
              Tending plants.
              <br />
              Working in Power BI.
              <br />
              Other duties as assigned.
            </p>
            <a href="#/more" className="text-link">
              Notes & activity <Icon name="arrow" size={17} />
            </a>
            <svg
              className="now-geometry"
              viewBox="0 0 280 100"
              aria-hidden="true"
            >
              <g fill="none" stroke="currentColor" strokeWidth="1">
                <ellipse cx="140" cy="55" rx="100" ry="32" />
                <ellipse
                  cx="140"
                  cy="55"
                  rx="100"
                  ry="32"
                  transform="rotate(-22 140 55)"
                />
                <ellipse
                  cx="140"
                  cy="55"
                  rx="100"
                  ry="32"
                  transform="rotate(22 140 55)"
                />
              </g>
            </svg>
          </aside>
        </AssembleReveal>
      </div>
      <AssembleReveal id="contact">
        <section className="home-connect glass-host">
          <GlassLayer />
          <h2>Have a good problem?</h2>
          <p>
            I’m drawn to complicated, repetitive, or mildly annoying problems
            that could use a better process.
          </p>
          <div className="button-row">
            <a className="button primary" href="#/tools?panel=booking">
              Let’s find a time <Icon name="calendar" size={18} />
            </a>
            <ExternalLink
              href="https://teams.microsoft.com/l/chat/0/0?users=justin.rogowski@uconn.edu"
              className="text-link"
            >
              {effects ? (
                <GlareHover
                  width="100%"
                  glareOpacity={0.25}
                  borderRadius="8px"
                  rimGlint={false}
                >
                  <span className="contact-glare">
                    Start a Teams chat <Icon name="external" size={17} />
                  </span>
                </GlareHover>
              ) : (
                <span className="contact-glare">
                  Start a Teams chat <Icon name="external" size={17} />
                </span>
              )}
            </ExternalLink>
          </div>
        </section>
      </AssembleReveal>
    </>
  );
}
