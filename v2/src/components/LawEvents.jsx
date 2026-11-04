import { useMemo, useState } from "react";
import { integrations } from "../content.js";
import { eventDate, parseEvents } from "../events.js";
import { useMedia, useResource } from "../hooks.js";
import { useAssemblyBusy } from "../assembly/HomepageAssembly.jsx";
import Carousel from "../vendor/Carousel.jsx";
import { ExternalLink, LoadState } from "./UI.jsx";
import Icon from "./Icon.jsx";
import "./LawEvents.css";

function EventCard({ event }) {
  return (
    <ExternalLink
      href={event.href}
      className="event-carousel-link"
      aria-label={`${event.title}, ${eventDate(event.date) || "Time to be announced"}`}
      draggable={false}
    >
      <div className="event-card-body">
        <h3>{event.title}</h3>
        {event.image && (
          <img src={event.image} alt="" width="600" height="600" loading="lazy"
            draggable={false} onError={(event) => { event.currentTarget.hidden = true; }} />
        )}
      </div>
      <p className="event-date">{eventDate(event.date) || "Time to be announced"}</p>
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
      <h2 id="law-events-title">UConn Law Events</h2>
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
