import { useMemo, useState } from "react";
import { integrations } from "../content.js";
import { eventDate, eventParts, parseEvents } from "../events.js";
import { useMedia, useResource } from "../hooks.js";
import { useAssemblyBusy } from "../assembly/HomepageAssembly.jsx";
import Carousel from "../vendor/Carousel.jsx";
import { ExternalLink, LoadState, SectionTitle } from "./UI.jsx";
import Icon from "./Icon.jsx";
import "./LawEvents.css";

// The date leads as a tear-off calendar leaf; the time and place sit below the card.
function EventCard({ event }) {
  const when = eventParts(event.date);
  const label = [event.title, eventDate(event.date) || "Time to be announced", event.location].filter(Boolean).join(", ");
  return (
    <ExternalLink
      href={event.href}
      className="event-carousel-link"
      aria-label={label}
      draggable={false}
    >
      <div className={`event-card-body${when ? " has-leaf" : ""}`}>
        {when && (
          <span className="event-leaf" aria-hidden="true">
            <span className="event-leaf-month">{when.month}</span>
            <span className="event-leaf-day">{when.day}</span>
            <span className="event-leaf-weekday">{when.weekday}</span>
          </span>
        )}
        <h3>{event.title}</h3>
        {event.image && (
          <img src={event.image} alt="" width="600" height="600" loading="lazy"
            draggable={false} onError={(event) => { event.currentTarget.hidden = true; }} />
        )}
      </div>
      <p className="event-date">
        <span className="event-time">{when?.time || "Time to be announced"}</span>
        {event.location && <span className="event-place">{event.location}</span>}
      </p>
    </ExternalLink>
  );
}

function EventCarousel({ events, effects, theme }) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const busy = useAssemblyBusy();
  const moving = effects && !busy;
  const compact = useMedia("(max-width: 600px)");
  const items = useMemo(() => events.map((event) => (
    <EventCard key={event.href} event={event} />
  )), [events]);
  return (
    <>
      <Carousel
        key={moving ? "moving" : "still"}
        items={items}
        baseWidth={340}
        aspectRatio={1}
        radius={16}
        frame={false}
        autoplay={moving && playing}
        autoplayDelay={8000}
        arrows
        indicator={compact ? "counter" : "dots"}
        pauseOnHover
        loop
        theme={theme}
        initialIndex={active}
        onChange={setActive}
        label="Upcoming UConn Law events"
        disableAnimations={!moving}
        className="event-carousel"
        extraControls={events.length > 1 && moving ? (
          <button className="text-button event-playback" onClick={() => setPlaying(!playing)}
            aria-label={playing ? "Pause events" : "Play events"}
            title={playing ? "Pause events" : "Play events"}>
            {playing && (
              <svg className="event-countdown" viewBox="0 0 44 44" aria-hidden="true" focusable="false">
                <circle cx="22" cy="22" r="20.5" pathLength="1" />
              </svg>
            )}
            <Icon name={playing ? "pause" : "play"} size={17} />
          </button>
        ) : null}
      />
    </>
  );
}

export default function LawEvents({ effects, theme }) {
  const events = useResource(integrations.events, parseEvents);
  return (
    <section className="law-events" aria-labelledby="law-events-title">
      <SectionTitle glass headingProps={{ id: "law-events-title" }}>
        UConn Law Events
      </SectionTitle>
      <LoadState resource={events} message="The events feed is unavailable right now.">
        {(data) => data.length
          ? <EventCarousel events={data} effects={effects} theme={theme} />
          : <p className="muted">No upcoming events returned. Check the UConn Law calendar for updates.</p>}
      </LoadState>
      <ExternalLink href="https://events.uconn.edu/law-school/" className="text-link event-calendar-link">
        View Event Calendar <Icon name="external" size={16} />
      </ExternalLink>
    </section>
  );
}
