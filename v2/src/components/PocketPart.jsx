import { useId, useState } from "react";
import { useMedia, useResource } from "../hooks.js";
import { parsePocketPart } from "../pocketPart.js";
import { useAssemblyBusy } from "../assembly/HomepageAssembly.jsx";
import ScrollStack, { ScrollStackItem } from "../vendor/ScrollStack.jsx";
import { ExternalLink, LoadState, SectionTitle } from "./UI.jsx";
import Icon from "./Icon.jsx";
import "./PocketPart.css";

const blogUrl = "https://library.law.uconn.edu/the-pocket-part/";
// Each post is a mounted specimen: the featured image pinned to the sheet at a
// slight, varied angle, and a collector's label beside it.
const tilts = [-1.6, 1.2, -0.8, 1.5];

function PostCard({ post, index }) {
  const [failed, setFailed] = useState(false);
  const id = useId();
  const image = post.thumbnail && !failed;
  return (
    <ExternalLink href={post.link} aria-labelledby={`${id}-title ${id}-date`}
      className={`pocket-post-link${image ? " has-image" : ""}`}
      style={{ "--pocket-tilt": `${tilts[index % tilts.length]}deg` }}>
      {image && (
        <div className="pocket-plate">
          <span className="pocket-mount">
            <img src={post.thumbnail} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
          </span>
        </div>
      )}
      <div className="pocket-post-copy">
        <h3 id={`${id}-title`}>{post.title}</h3>
        {post.excerpt && <p className="pocket-excerpt">{post.excerpt}</p>}
        <div className="pocket-label">
          <span className="pocket-accession" aria-hidden="true">No.<b>{String(index + 1).padStart(2, "0")}</b></span>
          <time id={`${id}-date`} dateTime={post.pubDate}>{new Date(post.pubDate).toLocaleDateString("en-US", {
            month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York",
          })}</time>
          <span className="pocket-read">Read the post <Icon name="external" size={16} /></span>
        </div>
      </div>
    </ExternalLink>
  );
}

function PostStack({ posts, effects }) {
  const busy = useAssemblyBusy();
  const moving = effects && !busy && posts.length > 1;
  // Phone cards are taller, so a smaller lean keeps their corners inside the page gutter.
  const compact = useMedia("(max-width: 600px)");
  return (
    <ScrollStack key={moving ? "moving" : "still"} className="pocket-stack"
      useWindowScroll smoothScroll={false} disableAnimations={!moving}
      itemDistance={72} itemStackDistance={0} itemScale={0.015} baseScale={0.9}
      dimAmount={0.12} rotationAmount={compact ? 1.5 : 3} holdDistance={100} stackPosition="12%">
      {posts.map((post, index) => (
        <ScrollStackItem key={post.link} itemClassName={`pocket-post${index % 2 ? " is-reversed" : ""}`}>
          <PostCard post={post} index={index} />
        </ScrollStackItem>
      ))}
    </ScrollStack>
  );
}

export default function PocketPart({ effects }) {
  const posts = useResource("../data/pocket-part.json", parsePocketPart);
  return (
    <section className="home-pocket-part" aria-labelledby="pocket-part-title">
      <SectionTitle
        glass
        headingProps={{ id: "pocket-part-title" }}
        description={<p className="muted pocket-intro">From the UConn Law Library blog.</p>}
        action={
          <ExternalLink href={blogUrl} className="text-link">
            All posts <Icon name="external" size={16} />
          </ExternalLink>
        }
      >
        The Pocket Part
      </SectionTitle>
      <LoadState resource={posts} message="The Pocket Part feed is unavailable right now.">
        {(data) => data.items.length ? <PostStack posts={data.items} effects={effects} />
          : <p className="muted">No posts returned. Visit The Pocket Part for the latest stories.</p>}
      </LoadState>
    </section>
  );
}
