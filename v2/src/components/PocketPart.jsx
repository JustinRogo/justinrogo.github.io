import { useState } from "react";
import { useResource } from "../hooks.js";
import { parsePocketPart } from "../pocketPart.js";
import { useAssemblyBusy } from "../assembly/HomepageAssembly.jsx";
import ScrollStack, { ScrollStackItem } from "../vendor/ScrollStack.jsx";
import { ExternalLink, LoadState, SectionTitle } from "./UI.jsx";
import Icon from "./Icon.jsx";
import "./PocketPart.css";

const blogUrl = "https://library.law.uconn.edu/the-pocket-part/";
function PostCard({ post }) {
  const [failed, setFailed] = useState(false);
  const image = post.thumbnail && !failed;
  return (
    <ExternalLink href={post.link} className={`pocket-post-link${image ? " has-image" : ""}`}>
      {image && <img src={post.thumbnail} alt="" width="600" height="600" loading="lazy" onError={() => setFailed(true)} />}
      <div className="pocket-post-copy">
        <time dateTime={post.pubDate}>{new Date(post.pubDate).toLocaleDateString("en-US", {
          month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York",
        })}</time>
        <h3>{post.title}</h3>
        <Icon name="external" size={22} />
      </div>
    </ExternalLink>
  );
}

function PostStack({ posts, effects }) {
  const busy = useAssemblyBusy();
  const moving = effects && !busy && posts.length > 1;
  return (
    <ScrollStack key={moving ? "moving" : "still"} className="pocket-stack"
      useWindowScroll smoothScroll={false} disableAnimations={!moving}
      itemDistance={72} itemStackDistance={0} itemScale={0.015} baseScale={0.9}
      dimAmount={0.12} rotationAmount={3} holdDistance={100} stackPosition="12%">
      {posts.map((post, index) => (
        <ScrollStackItem key={post.link} itemClassName={`pocket-post${index % 2 ? " is-reversed" : ""}`}>
          <PostCard post={post} />
        </ScrollStackItem>
      ))}
    </ScrollStack>
  );
}

export default function PocketPart({ effects }) {
  const posts = useResource("../data/pocket-part.json", parsePocketPart);
  return (
    <section className="home-pocket-part" aria-labelledby="pocket-part-title">
      <SectionTitle headingProps={{ id: "pocket-part-title" }} action={
        <ExternalLink href={blogUrl} className="text-link">All posts <Icon name="external" size={16} /></ExternalLink>
      }>The Pocket Part</SectionTitle>
      <p className="muted pocket-intro">From the UConn Law Library blog.</p>
      <LoadState resource={posts} message="The Pocket Part feed is unavailable right now.">
        {(data) => data.items.length ? <PostStack posts={data.items} effects={effects} />
          : <p className="muted">No posts returned. Visit The Pocket Part for the latest stories.</p>}
      </LoadState>
    </section>
  );
}
