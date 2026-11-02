import { useEffect, useRef, useState } from "react";
import { catalogUrl, integrations, resources } from "../content.js";
import Icon from "../components/Icon.jsx";
import { Dialog, ExternalLink, LinkRow } from "../components/UI.jsx";

export function Catalog() {
  const [type, setType] = useState("Books & more");
  const [query, setQuery] = useState("");
  return (
    <section className="catalog-panel">
      <Icon name="book" size={36} />
      <h2 tabIndex={-1}>A good place to start looking.</h2>
      <p>Search the UConn Law Library’s collections and research resources.</p>
      <form
        action={
          type === "Research guides"
            ? "https://libguides.law.uconn.edu/srch.php"
            : "https://uconn-law.primo.exlibrisgroup.com/discovery/search"
        }
        method="get"
        target="_blank"
        rel="noopener noreferrer"
        onSubmit={(e) => {
          e.preventDefault();
          window.open(
            catalogUrl(type, query.trim()),
            "_blank",
            "noopener,noreferrer",
          );
        }}
      >
        <label>
          Search in
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {[
              "Books & more",
              "Journals",
              "Databases",
              "Course reserves",
              "Research guides",
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Your search
          <div className="catalog-query">
            <input
              required
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="A title, topic, author, or idea…"
              aria-label="Library search query"
            />
            <button className="button primary" type="submit">
              Search <Icon name="external" size={18} />
            </button>
          </div>
        </label>
      </form>
      <div className="button-row">
        <ExternalLink
          href="https://uconn-law.primo.exlibrisgroup.com/discovery/search?mode=advanced&vid=01UCT_LAW:01UCT_LAW"
          className="text-link"
        >
          Advanced search <Icon name="external" size={15} />
        </ExternalLink>
        <ExternalLink
          href="https://uconn-law.primo.exlibrisgroup.com/discovery/account?vid=01UCT_LAW:01UCT_LAW"
          className="text-link"
        >
          My library account <Icon name="external" size={15} />
        </ExternalLink>
      </div>
    </section>
  );
}
function EmbedPanel({ type }) {
  const [loaded, setLoaded] = useState(false);
  const booking = type === "booking";
  const title = booking ? "Book a meeting" : "My calendar";
  const url = integrations[type];
  return (
    <section className="embed-panel">
      <Icon name="calendar" size={36} />
      <h2 tabIndex={-1}>
        {booking ? "Let’s find a time." : "See what’s on my calendar."}
      </h2>
      <p>
        {booking
          ? "Use Microsoft Bookings to find an available time to meet."
          : "My published Outlook calendar, in Eastern Time."}
      </p>
      <div className="button-row">
        <ExternalLink className="button primary" href={url}>
          {title} <Icon name="external" size={18} />
        </ExternalLink>
        <button
          className="button"
          onClick={() => setLoaded((value) => !value)}
          aria-expanded={loaded}
        >
          {loaded ? "Close embedded view" : "Load embedded view"}
        </button>
      </div>
      <p className="muted small">
        Microsoft may require cookies or a sign-in. Opening in a new tab works
        best on mobile.
      </p>
      {loaded && (
        <iframe
          src={url}
          title={title}
          className="service-frame"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
    </section>
  );
}
function RequestPanel({ active }) {
  const [draft, setDraft] = useState({
    name: "",
    email: "",
    subject: "",
    details: "",
  });
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    if (!active) setPreview(false);
  }, [active]);
  return (
    <section className="request-panel">
      <h2 tabIndex={-1}>Something I can help with?</h2>
      <p>
        Sketch out a request here. This prototype previews your draft locally;
        nothing is sent.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPreview(true);
        }}
      >
        <div className="form-grid">
          {[
            ["name", "Your name"],
            ["email", "Email"],
            ["subject", "Subject"],
          ].map(([key, label]) => (
            <label key={key} className={key === "subject" ? "full" : ""}>
              {label}
              <input
                required
                type={key === "email" ? "email" : "text"}
                autoComplete={key === "subject" ? "off" : key}
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              />
            </label>
          ))}
          <label className="full">
            What are you thinking?
            <textarea
              required
              rows={5}
              value={draft.details}
              onChange={(e) => setDraft({ ...draft, details: e.target.value })}
            />
          </label>
        </div>
        <button className="button primary" type="submit">
          Preview request <Icon name="arrow" size={18} />
        </button>
      </form>
      <div className="request-live">
        <p>
          Ready to send a real request? Open the original site and choose
          “Submit a Request.” Your draft stays here for reference.
        </p>
        <ExternalLink href="../#widget-tabs-root" className="text-link">
          Open the live site’s request tools <Icon name="external" size={16} />
        </ExternalLink>
        <ExternalLink href={integrations.board} className="text-link">
          View the public request board <Icon name="external" size={16} />
        </ExternalLink>
      </div>
      {active && preview && (
        <Dialog title="Your request preview" onClose={() => setPreview(false)}>
          <p className="preview-notice">
            <Icon name="check" />
            Local preview · Nothing has been sent
          </p>
          <dl className="draft-preview">
            {Object.entries(draft).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <button className="button" onClick={() => setPreview(false)}>
            Keep editing
          </button>
        </Dialog>
      )}
    </section>
  );
}
export default function Tools({ params, isActive = true }) {
  const requested = params.get("panel") || "catalog";
  const panels = [
    ["catalog", "Library search"],
    ["calendar", "Calendar"],
    ["booking", "Book a meeting"],
    ["request", "Request"],
    ["resources", "Quick links"],
  ];
  const active = panels.some((p) => p[0] === requested) ? requested : "catalog";
  // Remember visited panels, preserving form drafts and deliberately loaded frames.
  const [visited, setVisited] = useState(new Set([active]));
  if (!visited.has(active)) setVisited(new Set([...visited, active]));
  const [linkQuery, setLinkQuery] = useState("");
  const content = useRef(null);
  const previousPanel = useRef(active);
  useEffect(() => {
    if (previousPanel.current === active) return;
    previousPanel.current = active;
    content.current
      ?.querySelector(":scope > div:not([hidden]) h2")
      ?.focus({ preventScroll: true });
  }, [active]);
  return (
    <>
      <div className="page-heading">
        <h1 tabIndex={-1}>
          A few useful tools<span className="title-dot">.</span>
        </h1>
        <p>Find a resource, make a plan, or get something moving.</p>
      </div>
      <nav className="tool-nav" aria-label="Tools">
        {panels.map(([id, label]) => (
          <a
            key={id}
            href={`#/tools?panel=${id}`}
            aria-current={active === id ? "page" : undefined}
          >
            {label}
          </a>
        ))}
      </nav>
      <div className="tool-content" ref={content}>
        {[...visited].map((id) => (
          <div key={id} hidden={active !== id}>
            {id === "catalog" ? (
              <Catalog />
            ) : ["calendar", "booking"].includes(id) ? (
              <EmbedPanel type={id} />
            ) : id === "request" ? (
              <RequestPanel active={isActive && active === id} />
            ) : (
              <section>
                <h2 tabIndex={-1}>Good things to have handy.</h2>
                <label className="search-field resource-search">
                  <Icon name="search" />
                  <span className="sr-only">Filter quick links</span>
                  <input
                    type="search"
                    placeholder="Find a resource…"
                    value={linkQuery}
                    onChange={(e) => setLinkQuery(e.target.value)}
                  />
                </label>
                {resources
                  .filter(([title]) =>
                    title.toLowerCase().includes(linkQuery.toLowerCase()),
                  )
                  .map(([title, href]) => (
                    <LinkRow key={title} title={title} href={href} />
                  ))}
                {!resources.some(([title]) =>
                  title.toLowerCase().includes(linkQuery.toLowerCase()),
                ) && (
                  <p role="status">No matching links. Try a broader search.</p>
                )}
              </section>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
