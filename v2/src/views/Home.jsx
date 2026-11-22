import { useId, useMemo, useState } from "react";
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
import AiCorner from "../components/AiCorner.jsx";
import LawEvents from "../components/LawEvents.jsx";
import PocketPart from "../components/PocketPart.jsx";
import { ProjectPreview } from "../components/Project.jsx";
import ProfilePortrait from "../components/ProfilePortrait.jsx";
import { useSiteStyle } from "../botanical/siteStyle.js";
import { HeroFlora } from "../botanical/Flora.jsx";
import { HeroPrint, StatutesPrint } from "../riso/RisoArt.jsx";
import "./Home.css";

const helpLinks = [
  ["Book a meeting", "Find a time that works for both of us.", "#/tools?panel=booking", "calendar"],
  ["Start a request", "Send me a question or project idea.", "#/tools?panel=request", "mail"],
  ["Search the library", "Books, journals, databases, and guides.", "#/tools?panel=catalog", "search"],
];

function Name({ effects }) {
  // Botanical and Risograph set the name in their own display faces, so the
  // canvas text effect stays off.
  const canvasName = useSiteStyle() === "original";
  return (
    <AssembleReveal id="hero-title">
      <h1 tabIndex={-1} className="tech-heading">
        {effects && canvasName ? (
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
  const style = useSiteStyle();
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
                    {style === "riso" ? <StatutesPrint /> : <span>§§</span>}
                  </div>
                ) : null}
                <ProjectPreview project={project} className="featured-project-preview" decorative sizes="270px" />
                <div className="bento-copy" data-specimen={String(index + 1).padStart(2, "0")}>
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
  }, [projects.data, style]);
  return (
    <MagicBento
      items={items}
      columns={4}
      rowHeight={170}
      style={{ gridAutoRows: "minmax(170px, auto)" }}
      gap={16}
      radius={6}
      theme={theme}
      glowColor={{ botanical: "#c5a46d", riso: "#ff4fa3" }[style] || "#ff8a36"}
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

const extent = {
  path: "Pages/For Fun/Fables-Extent.html",
  title: "Fable's Extent",
  href: "https://justinrogo.github.io/Fableous/",
};
const extentFigures = [
  ["24", "orders of four bells"],
  ["10,792", "ways to ring them all"],
  ["162", "essentially different"],
  ["11", "with names ringers use"],
];

function ExtentSpotlight() {
  const [open, setOpen] = useState(false);
  const storyId = useId();
  return (
    <section
      className="project-spotlight extent-spotlight glass-host"
      aria-labelledby="extent-title"
      data-open={open || undefined}
    >
      <GlassLayer />
      <div className="extent-copy">
        <p className="extent-eyebrow">Spotlight · Made by Claude Fable 5.2</p>
        <h2 id="extent-title">Fable&rsquo;s Playground</h2>
        <p className="extent-subtitle">All the changes on four bells</p>
        <p className="extent-lede">
          Four church bells can stand in 24 orders. Step around a solid one change
          at a time, ring every order exactly once, and come home. The page
          rings each row as you go, and tells you if the path you found has a name.
        </p>
        <div className="extent-story" id={storyId} hidden={!open}>
          <h3>How it came to be</h3>
          <p>
            I gave Claude Fable 5.2 an open brief: build what you find interesting.
            It weighed an astrolabe and a weaving-draft tool, then chose English
            change ringing, a seventeenth-century art of ringing every possible
            order of a set of bells without repeating one.
          </p>
          <p>
            Its reason was that ringing looks like its own work: sequences under
            constraint, one step at a time. On four bells, the whole space is only
            24 rows, small enough to hold in view. It built the page in one evening,
            on November 16, and kept a journal as it went, dead ends included.
          </p>
          <p>
            It couldn&rsquo;t hear the bells it made, so it wrote tests that measure
            them instead. Those tests caught a click on every strike. Whether the
            bells sound good is still open: the journal ends by asking someone with
            ears to listen.
          </p>
        </div>
        <div className="button-row extent-actions">
          <ExternalLink href={extent.href} className="button primary">
            Ring the bells <Icon name="external" size={18} />
          </ExternalLink>
          {open && (
            <ExternalLink href={`${extent.href}journal.html`} className="button">
              Read its journal <Icon name="external" size={18} />
            </ExternalLink>
          )}
          <button
            type="button"
            className="button extent-toggle"
            aria-expanded={open}
            aria-controls={storyId}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Show less" : "How it came to be"}
            <Icon name="chevron" size={18} />
          </button>
        </div>
      </div>
      <div className="extent-side">
        <ExternalLink href={extent.href} className="extent-preview-link" aria-label="Open Fable's Extent">
          <ProjectPreview project={extent} className="extent-preview" decorative sizes="(max-width: 800px) 90vw, 38vw" />
        </ExternalLink>
        <dl className="extent-figures" hidden={!open}>
          {extentFigures.map(([value, label]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function AstraSpotlight() {
  const collection = "https://justinrogo.github.io/Astra/";
  return (
    <section className="project-spotlight glass-host" aria-labelledby="astra-title">
      <GlassLayer />
      <div>
        <p className="extent-eyebrow">Spotlight · Made by Astra</p>
        <h2 id="astra-title">Astra’s Playground</h2>
        <p className="extent-subtitle">Astra Fieldworks</p>
        <p className="extent-lede">
          Send a pulse into an imaginary seafloor and listen for the echo in
          <em> Soundings</em>. In <em>Counterproof</em>, fold a sheet of scattered
          ink into a two-colour woodcut you can save.
        </p>
        <div className="button-row extent-actions">
          <ExternalLink href={collection} className="button primary">
            Explore Fieldworks <Icon name="external" size={18} />
          </ExternalLink>
          <ExternalLink href={`${collection}JOURNAL.html`} className="button">
            Read the journal <Icon name="external" size={18} />
          </ExternalLink>
        </div>
      </div>
      <ExternalLink href={collection} className="extent-preview-link" aria-label="Open Astra Fieldworks">
        <div className="project-preview extent-preview">
          <img src="/v2/assets/project-previews/astra-fieldworks.webp" alt="" width="874" height="310" loading="lazy" decoding="async" />
        </div>
      </ExternalLink>
    </section>
  );
}

const TOPBAR_CLEARANCE = 77; // Matches --topbar-clearance in layout.css.
const BELOW_EVENTS = 24;

export default function Home({ projects, effects, theme, fine }) {
  const [eventsColumn, eventsFit] = useFitsViewport(TOPBAR_CLEARANCE + BELOW_EVENTS);
  const style = useSiteStyle();
  return (
    <>
      <AssembleReveal id="hero-frame">
        <section className="glass-hero glass-host">
          <GlassLayer />
          {style === "botanical" && <HeroFlora />}
          {style === "riso" && <HeroPrint />}
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
              <ProfilePortrait orbits />
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
      <div className="home-help-row">
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
        <AssembleReveal id="my-day">
          <div className="home-my-day"><MyDay /></div>
        </AssembleReveal>
        <AssembleReveal id="ai-corner">
          <div className="home-ai-corner"><AiCorner /></div>
        </AssembleReveal>
      </div>
      <AssembleReveal id="spotlight">
        <div className="home-spotlight">
          <ExtentSpotlight />
          <AstraSpotlight />
        </div>
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
