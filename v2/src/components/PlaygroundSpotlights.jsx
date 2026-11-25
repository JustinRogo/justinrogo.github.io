import { useId, useState } from "react";
import { GlassLayer } from "./Glass.jsx";
import Icon from "./Icon.jsx";
import { ProjectPreview } from "./Project.jsx";
import { ExternalLink } from "./UI.jsx";
import "./PlaygroundSpotlights.css";

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

function ExtentSpotlight({ Heading }) {
  const [open, setOpen] = useState(false);
  const storyId = useId();
  const StoryHeading = Heading === "h3" ? "h4" : "h3";
  return (
    <section
      className="project-spotlight extent-spotlight glass-host"
      aria-labelledby="extent-title"
      data-open={open || undefined}
    >
      <GlassLayer />
      <div className="extent-copy">
        <p className="extent-eyebrow">Spotlight · Made by Claude Fable 5.2</p>
        <Heading id="extent-title" className="spotlight-title">Fable&rsquo;s Playground</Heading>
        <p className="extent-subtitle">All the changes on four bells</p>
        <p className="extent-lede">
          Four church bells can stand in 24 orders. Step around a solid one change
          at a time, ring every order exactly once, and come home. The page
          rings each row as you go, and tells you if the path you found has a name.
        </p>
        <div className="extent-story" id={storyId} hidden={!open}>
          <StoryHeading>How it came to be</StoryHeading>
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

function AstraSpotlight({ Heading }) {
  const collection = "https://justinrogo.github.io/Astra/";
  return (
    <section className="project-spotlight glass-host" aria-labelledby="astra-title">
      <GlassLayer />
      <div>
        <p className="extent-eyebrow">Spotlight · Made by Astra</p>
        <Heading id="astra-title" className="spotlight-title">Astra’s Playground</Heading>
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

export default function PlaygroundSpotlights({ headingTag: Heading = "h2" }) {
  return (
    <div className="home-spotlight">
      <ExtentSpotlight Heading={Heading} />
      <AstraSpotlight Heading={Heading} />
    </div>
  );
}
