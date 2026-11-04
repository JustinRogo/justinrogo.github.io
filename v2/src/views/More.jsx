import { useResource } from "../hooks.js";
import { integrations } from "../content.js";
import {
  ExternalLink,
  LinkRow,
  LoadState,
  SectionTitle,
} from "../components/UI.jsx";
import Icon from "../components/Icon.jsx";
import ExploreMenu from "../components/ExploreMenu.jsx";
import { GlassLayer } from "../components/Glass.jsx";
import { parseEvents } from "../events.js";

export function parseManifest(text) {
  const value = JSON.parse(text);
  if (
    !Array.isArray(value.pages) ||
    !value.pages.length ||
    !value.pages.every(
      (p) =>
        typeof p.title === "string" &&
        typeof p.path === "string" &&
        p.path.startsWith("Pages/") &&
        !p.path.includes("..") &&
        (!p.href || /^https:\/\//.test(p.href)),
    )
  )
    throw new Error("Invalid project index");
  return value;
}
const safeUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
};
function GithubFeed() {
  const site = useResource(
    "https://api.github.com/repos/JustinRogo/justinrogo.github.io/commits?per_page=3",
  );
  const library = useResource(
    "https://api.github.com/repos/UConn-Law-Library/uconn-law-library.github.io/commits?per_page=3",
  );
  const cgs = useResource(
    "https://api.github.com/repos/UConn-Law-Library/CGS/commits?per_page=3",
  );
  const sources = [
    [site, "This site"],
    [library, "Law Library"],
    [cgs, "CGS Explorer"],
  ];
  const commits = sources
    .flatMap(([resource, label]) =>
      Array.isArray(resource.data)
        ? resource.data.map((c) => ({ ...c, label }))
        : [],
    )
    .sort(
      (a, b) =>
        new Date(b.commit?.author?.date) - new Date(a.commit?.author?.date),
    )
    .slice(0, 6);
  return (
    <section>
      <SectionTitle>From the workbench</SectionTitle>
      <p className="muted">Recent public commits across three repositories.</p>
      {sources.some(([s]) => s.loading) && (
        <p role="status">Checking GitHub…</p>
      )}
      {commits.map(
        (c) =>
          safeUrl(c.html_url) && (
            <LinkRow
              key={c.sha}
              title={c.commit?.message?.split("\n")[0] || "View commit"}
              description={`${c.label} · ${formatDate(c.commit?.author?.date)}`}
              href={c.html_url}
            />
          ),
      )}
      {sources.some(([s]) => s.error) && (
        <p className="load-state">
          Some GitHub activity is unavailable, possibly due to rate limits.{" "}
          <ExternalLink href="https://github.com/JustinRogo">
            View GitHub
          </ExternalLink>
          .
        </p>
      )}
      {!commits.length && sources.every(([s]) => !s.loading && !s.error) && (
        <p>No public commits returned.</p>
      )}
    </section>
  );
}
function formatDate(date) {
  const d = new Date(date);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}
export default function More({
  onSettings,
  weather,
  route,
  effects,
  projectPages,
}) {
  const blog = useResource("../data/pocket-part.json");
  const counts = useResource("../data/cards_count.json");
  const events = useResource(integrations.events, parseEvents);
  return (
    <>
      <div className="page-heading">
        <h1 tabIndex={-1}>
          A little more to explore<span className="title-dot">.</span>
        </h1>
        <p>From the library, from the workbench, and around here.</p>
      </div>
      <section className="mobile-branches glass-host">
        <GlassLayer />
        <h2>Explore</h2>
        <ExploreMenu route={route} effects={effects} pages={projectPages} />
      </section>
      <div className="more-top">
        <section className="activity-note">
          <h2>In the mix</h2>
          <p>Tending plants · Power BI · Other duties as assigned</p>
          <LoadState resource={counts}>
            {(data) => (
              <p className="task-count">
                <strong>{data.completed_count}</strong> completed{" "}
                <span>of {data.total_count} requests</span>
              </p>
            )}
          </LoadState>
          <ExternalLink href={integrations.board} className="text-link">
            Open the request board <Icon name="external" size={16} />
          </ExternalLink>
          <p className="muted small">
            Counts from the site’s saved Trello snapshot; not a live task
            editor.
          </p>
        </section>
        <section className="weather-note">
          <h2>Hartford, Connecticut</h2>
          <LoadState
            resource={weather}
            message="Weather is unavailable right now."
          >
            {(data) => (
              <>
                <p className="temperature">
                  {Math.round(data.current.temperature_2m)}°<span>F</span>
                </p>
                <p>
                  Feels like {Math.round(data.current.apparent_temperature)}°F
                </p>
                <p className="small muted">
                  Observed {data.current.time?.split("T")[1]} ET · Open-Meteo
                </p>
              </>
            )}
          </LoadState>
        </section>
      </div>
      <section className="blog-feed">
        <SectionTitle
          action={
            <ExternalLink
              href="https://library.law.uconn.edu/the-pocket-part/"
              className="text-link"
            >
              All posts <Icon name="external" size={16} />
            </ExternalLink>
          }
        >
          The Pocket Part
        </SectionTitle>
        <p className="muted">From the UConn Law Library blog.</p>
        <LoadState resource={blog}>
          {(data) => (
            <>
              <div className="post-list">
                {data.items
                  ?.filter((post) => safeUrl(post.link))
                  .map((post) => (
                    <ExternalLink
                      key={post.link}
                      href={post.link}
                      className="post"
                    >
                      <time dateTime={post.pubDate}>
                        {formatDate(post.pubDate)}
                      </time>
                      <h3>{post.title}</h3>
                      <Icon name="external" />
                    </ExternalLink>
                  ))}
              </div>
              <p className="small muted">
                Saved feed · Updated {formatDate(data.generatedAt)}
              </p>
            </>
          )}
        </LoadState>
      </section>
      <div className="more-columns">
        <GithubFeed />
        <section>
          <SectionTitle>At UConn Law</SectionTitle>
          <LoadState
            resource={events}
            message="The events feed isn’t available in this browser."
          >
            {(data) =>
              data.length ? (
                data.slice(0, 5).map((e) => (
                  <LinkRow
                    key={e.href}
                    title={e.title}
                    description={formatDate(e.date)}
                    href={e.href}
                  />
                ))
              ) : (
                <p>No upcoming events returned.</p>
              )
            }
          </LoadState>
          <ExternalLink href={integrations.events} className="text-link">
            Open the events feed <Icon name="external" size={16} />
          </ExternalLink>
        </section>
      </div>
      <section className="more-settings">
        <h2>Make yourself at home.</h2>
        <p>Choose a theme, turn down the motion, or keep things simple.</p>
        <button className="button" onClick={onSettings}>
          <Icon name="settings" size={18} />
          Appearance & motion
        </button>
      </section>
    </>
  );
}
