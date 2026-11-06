import { useEffect, useRef, useState } from "react";
import { requestEndpoint } from "../../../src/request-form.js";
import { catalogUrl, integrations } from "../content.js";
import AvailabilityCalendar from "../components/AvailabilityCalendar.jsx";
import Icon from "../components/Icon.jsx";
import { ExternalLink } from "../components/UI.jsx";

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
function RequestPanel() {
  const [sent] = useState(() => new URLSearchParams(location.search).get("sent") === "1");
  useEffect(() => {
    if (!sent) return;
    const url = new URL(location.href);
    url.searchParams.delete("sent");
    history.replaceState(history.state, "", url);
  }, [sent]);
  return (
    <section className="request-panel">
      <h2 tabIndex={-1}>Something I can help with?</h2>
      <p>
        FormSubmit sends your request to my Trello board. The information you enter may appear on the public board.
      </p>
      {sent && <p className="request-confirmation" role="status">Thanks! Your request was submitted.</p>}
      <form
        action={requestEndpoint}
        method="POST"
        onSubmit={({ currentTarget: form }) => {
          form.elements._subject.value = form.elements.subject.value.trim() || "Website request";
        }}
      >
        <input type="hidden" name="_next" value="https://justinrogo.github.io/?sent=1#/tools?panel=request" />
        <input type="hidden" name="_subject" defaultValue="Website request" />
        <input type="text" name="_honey" hidden tabIndex={-1} autoComplete="off" />
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
                name={key}
                type={key === "email" ? "email" : "text"}
                autoComplete={key === "subject" ? "off" : key}
              />
            </label>
          ))}
          <label className="full">
            What are you thinking?
            <textarea name="details" required rows={5} />
          </label>
        </div>
        <button className="button primary" type="submit">
          Send request <Icon name="arrow" size={18} />
        </button>
      </form>
      <div className="request-live">
        <ExternalLink href={integrations.board} className="text-link">
          View the public request board <Icon name="external" size={16} />
        </ExternalLink>
      </div>
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
