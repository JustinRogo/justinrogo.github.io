import { useEffect, useRef, useState } from "react";
import { requestLimits, submitRequest } from "../../../src/request-form.js";
import { catalogUrl, integrations } from "../content.js";
import AvailabilityCalendar from "../components/AvailabilityCalendar.jsx";
import Icon from "../components/Icon.jsx";
import { ExternalLink } from "../components/UI.jsx";

// Matches the original site's library search: one scope tab per destination.
const catalogTabs = [
  ["Books & more", "Books & More", "Search Library Catalog"],
  ["Journals", "Journals", "Search the Library’s E-Journals"],
  ["Databases", "Databases", "Search the Library’s Databases"],
  ["Course reserves", "Reserves", "Search Course Reserves"],
  ["Research guides", "Research", "Search LibGuides"],
];

export function Catalog() {
  const [type, setType] = useState(catalogTabs[0][0]);
  const [query, setQuery] = useState("");
  const tabs = useRef([]);
  const current = catalogTabs.findIndex(([value]) => value === type);
  function moveTab(event, index) {
    const last = catalogTabs.length - 1;
    const next = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index ? index - 1 : last, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setType(catalogTabs[next][0]);
    tabs.current[next]?.focus();
  }
  return (
    <section className="catalog-panel">
      <Icon name="book" size={36} />
      <h2 tabIndex={-1}>A good place to start looking.</h2>
      <p>Search the UConn Law Library’s collections and research resources.</p>
      <div className="catalog-search">
        <div className="catalog-tabs" role="tablist" aria-label="Search types">
          {catalogTabs.map(([value, label], index) => (
            <button
              key={value}
              ref={(el) => { tabs.current[index] = el; }}
              type="button"
              role="tab"
              id={`catalog-tab-${index}`}
              aria-controls="catalog-tabpanel"
              aria-selected={value === type}
              tabIndex={value === type ? 0 : -1}
              onClick={() => setType(value)}
              onKeyDown={(e) => moveTab(e, index)}
            >
              {label}
            </button>
          ))}
        </div>
        <form
          id="catalog-tabpanel"
          role="tabpanel"
          aria-labelledby={`catalog-tab-${current}`}
          className="catalog-query"
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
            window.open(catalogUrl(type, query.trim()), "_blank", "noopener,noreferrer");
          }}
        >
          <input
            required
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={catalogTabs[current][2]}
            aria-label="Library search query"
          />
          <button className="button primary" type="submit">
            Search <Icon name="external" size={18} />
          </button>
        </form>
        <p className="catalog-links">
          <ExternalLink href="https://uconn-law.primo.exlibrisgroup.com/discovery/search?mode=advanced&vid=01UCT_LAW:01UCT_LAW">
            Advanced Keyword Search
          </ExternalLink>
          <span aria-hidden="true"> · </span>
          <ExternalLink href="https://uconn-law.primo.exlibrisgroup.com/discovery/account?vid=01UCT_LAW:01UCT_LAW">
            My Library Account
          </ExternalLink>
        </p>
      </div>
    </section>
  );
}
function BookingPanel() {
  const [loaded, setLoaded] = useState(false);
  return (
    <section className="embed-panel">
      <Icon name="calendar" size={36} />
      <h2 tabIndex={-1}>Let’s find a time.</h2>
      <p>Use Microsoft Bookings to find an available time to meet.</p>
      <div className="button-row">
        <ExternalLink className="button primary" href={integrations.booking}>
          Book a meeting <Icon name="external" size={18} />
        </ExternalLink>
        <button
          className="button"
          onClick={() => setLoaded((value) => !value)}
          aria-expanded={loaded}
        >
          {loaded ? "Close embedded view" : "Load embedded view"}
        </button>
      </div>
      {loaded && (
        <iframe
          src={integrations.booking}
          title="Book a meeting"
          className="service-frame"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
    </section>
  );
}
const requestFields = [
  ["name", "Your name", "name"],
  ["email", "Email", "email"],
  ["subject", "Subject", "off"],
];
function RequestPanel() {
  // idle | sending | sent | error
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const startedAt = useRef(performance.now());
  const status = useRef(null);
  useEffect(() => {
    if (state === "sent" || state === "error") status.current?.focus();
  }, [state]);
  async function send(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setState("sending");
    try {
      await submitRequest(form, startedAt.current);
      form.reset();
      startedAt.current = performance.now();
      setState("sent");
    } catch (failure) {
      setError(failure.message);
      setState("error");
    }
  }
  return (
    <section className="request-panel">
      <h2 tabIndex={-1}>Something I can help with?</h2>
      <p>Send me a question, idea, request, or just a note!</p>
      {state === "sent" && (
        <p className="request-confirmation" role="status" tabIndex={-1} ref={status}>
          Thanks! Your request was sent. I’ll reply by email.
        </p>
      )}
      {state === "error" && (
        <p className="request-confirmation request-error" role="alert" tabIndex={-1} ref={status}>
          {error}
        </p>
      )}
      <form onSubmit={send} aria-busy={state === "sending"}>
        {/* Honeypot: hidden from people and assistive technology; bots tend to fill it. */}
        <div className="request-honeypot" aria-hidden="true">
          <label>
            Website
            <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <div className="form-grid">
          {requestFields.map(([key, label, autoComplete]) => (
            <label key={key} className={key === "subject" ? "full" : ""}>
              {label}
              <input
                required
                name={key}
                type={key === "email" ? "email" : "text"}
                autoComplete={autoComplete}
                maxLength={requestLimits[key]}
              />
            </label>
          ))}
          <label className="full">
            What are you thinking?
            <textarea name="details" required rows={5} maxLength={requestLimits.details} />
          </label>
        </div>
        <button className="button primary" type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Send request"} <Icon name="arrow" size={18} />
        </button>
      </form>
    </section>
  );
}
export default function Tools({ params }) {
  const requested = params.get("panel") || "catalog";
  const panels = [
    ["catalog", "Library search"],
    ["calendar", "Calendar"],
    ["booking", "Book a meeting"],
    ["request", "Request"],
  ];
  const active = panels.some((p) => p[0] === requested) ? requested : "catalog";
  // Remember visited panels, preserving form drafts and deliberately loaded frames.
  const [visited, setVisited] = useState(new Set([active]));
  if (!visited.has(active)) setVisited(new Set([...visited, active]));
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
            ) : id === "calendar" ? (
              <AvailabilityCalendar />
            ) : id === "booking" ? (
              <BookingPanel />
            ) : (
              <RequestPanel />
            )}
          </div>
        ))}
      </div>
    </>
  );
}
