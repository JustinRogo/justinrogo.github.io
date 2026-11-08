import { useResource } from "../hooks.js";
import { GlassLayer } from "./Glass.jsx";
import Icon from "./Icon.jsx";
import { ExternalLink, LoadState, SectionTitle } from "./UI.jsx";
import "./AiCorner.css";

const updatesUrl = "https://justinrogo.vercel.app/updates";
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });

const httpsUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
};

function parseAiCorner(text) {
  const feed = JSON.parse(text);
  if (!Array.isArray(feed.items)) throw new Error("Invalid AI Corner feed");
  return feed.items.flatMap((post) => {
    const link = httpsUrl(post?.link);
    const date = new Date(post?.pubDate);
    if (!link || typeof post.title !== "string" || !post.title.trim() || Number.isNaN(date.getTime())) return [];
    return [{ title: post.title.trim(), link, pubDate: date.toISOString(), summary: typeof post.summary === "string" ? post.summary : "" }];
  }).slice(0, 3);
}

export default function AiCorner() {
  const posts = useResource("../data/ai-corner.json", parseAiCorner);
  return (
    <section className="ai-corner glass-host" aria-labelledby="ai-corner-title">
      <GlassLayer />
      <SectionTitle
        headingProps={{ id: "ai-corner-title" }}
        action={<ExternalLink className="text-link" href={updatesUrl}>All updates <Icon name="external" size={16} /></ExternalLink>}
      >
        AI Corner
      </SectionTitle>
      <LoadState resource={posts} message="AI Corner updates are unavailable right now.">
        {(items) => items.length ? (
          <ul className="ai-corner-posts">
            {items.map((post) => (
              <li key={post.link}>
                <ExternalLink href={post.link}>
                  <time dateTime={post.pubDate}>{dateFormat.format(new Date(post.pubDate))}</time>
                  <strong>{post.title}</strong>
                  {post.summary && <span className="ai-corner-summary">{post.summary}</span>}
                </ExternalLink>
              </li>
            ))}
          </ul>
        ) : <p className="muted">No updates yet. Visit AI Corner for the latest.</p>}
      </LoadState>
    </section>
  );
}
