import { useEffect, useMemo, useState } from "react";
import { integrations } from "../content.js";
import { eventDate, eventPoster, parseEvents } from "../events.js";
import { composeEventCard } from "../eventCards.js";
import { useResource } from "../hooks.js";
import { useAssemblyBusy } from "../assembly/HomepageAssembly.jsx";
import CircularGallery from "../vendor/CircularGallery.jsx";
import { ExternalLink, LoadState } from "./UI.jsx";
import Icon from "./Icon.jsx";
import "./LawEvents.css";

function EventGallery({ events, effects, theme }) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [renderer, setRenderer] = useState("loading");
  const [cards, setCards] = useState({});
  const busy = useAssemblyBusy();
  useEffect(() => {
    if (!effects || busy) return;
    const controller = new AbortController();
    events.forEach((event) => {
      composeEventCard(event, theme, controller.signal).then((image) => {
        if (image && !controller.signal.aborted)
          setCards((current) => ({ ...current, [`${theme}:${event.href}`]: image }));
      });
    });
    return () => controller.abort();
  }, [events, theme, effects, busy]);
  const items = useMemo(() => events.map((event) => {
    const fallback = eventPoster(event, theme);
    return { ...event, label: `${event.title}, ${eventDate(event.date) || "Time to be announced"}`,
      target: "_blank", rel: "noopener noreferrer",
      text: eventDate(event.date) || "Time to be announced",
      image: cards[`${theme}:${event.href}`] || fallback, fallback };
  }), [events, cards, theme]);
  const animated = effects && !busy && renderer !== "fallback" && items.length > 1;
  const index = active % items.length;
  return animated ? (
    <>
      <div className="law-events-stage">
        <CircularGallery
          items={items}
          aria-label="Upcoming UConn Law events"
          bend={1.5}
          fadeEdges={0.12}
          autoScroll={playing ? 0.35 : 0}
          scrollEase={0.1}
          borderRadius={0.07}
          itemAspect={1.06}
          itemSize={1.18}
          wave={0.6}
          shadow={0}
          showTitles
          font="500 24px Geist"
          textColor={theme === "dark" ? "#eef5ff" : "#112847"}
          openOnClick={false}
          intro={false}
          activeIndex={index}
          onActiveChange={setActive}
          onStatus={setRenderer}
          dpr={1.5}
        />
      </div>
        <div className="event-gallery-controls" role="group" aria-label="Event gallery controls">
          <button className="icon-button" aria-label="Previous event" onClick={() => { setPlaying(false); setActive((index - 1 + items.length) % items.length); }}><Icon name="previous" /></button>
          <span className="event-count">{index + 1} / {items.length}</span>
          <button className="icon-button" aria-label="Next event" onClick={() => { setPlaying(false); setActive((index + 1) % items.length); }}><Icon name="next" /></button>
          <button className="icon-button" aria-label={playing ? "Pause event gallery" : "Play event gallery"} onClick={() => setPlaying(!playing)}><Icon name={playing ? "pause" : "play"} /></button>
        </div>
    </>
  ) : (
    <ul className="law-events-list">
      {events.map((event) => (
        <li key={event.href}>
          <ExternalLink href={event.href} className="event-static-card">
            <div className="event-card-body">
              <h3>{event.title}</h3>
              {event.image && <img src={event.image} alt="" width="600" height="600" loading="lazy" onError={(e) => { e.currentTarget.hidden = true; }} />}
            </div>
            <p className="event-date">{eventDate(event.date) || "Time to be announced"}</p>
            {event.location && <p>{event.location}</p>}
          </ExternalLink>
        </li>
      ))}
    </ul>
  );
}

export default function LawEvents({ effects, theme }) {
  const events = useResource(integrations.events, parseEvents);
  return (
    <section className="law-events" aria-labelledby="law-events-title">
      <h2 className="sr-only" id="law-events-title">UConn Law events</h2>
      <LoadState resource={events} message="The events feed is unavailable right now.">
        {(data) => data.length ? <EventGallery events={data} effects={effects} theme={theme} /> : <p className="muted">No upcoming events returned. Check the UConn Law calendar for updates.</p>}
      </LoadState>
      <ExternalLink href="https://events.uconn.edu/law-school/" className="text-link event-calendar-link">All events <Icon name="external" size={16} /></ExternalLink>
    </section>
  );
}
