const httpsUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
};

// Home and More use the same parser because useResource shares its feed cache.
export function parsePocketPart(text) {
  const feed = JSON.parse(text);
  if (!Array.isArray(feed.items)) throw new Error("Invalid Pocket Part feed");
  const seen = new Set();
  const items = feed.items.flatMap((post) => {
    const link = httpsUrl(post?.link);
    const date = new Date(post?.pubDate);
    if (!link || seen.has(link) || typeof post.title !== "string" || !post.title.trim() || Number.isNaN(date.getTime())) return [];
    seen.add(link);
    return [{ title: post.title.trim(), link, pubDate: date.toISOString(), thumbnail: httpsUrl(post.thumbnail) }];
  }).slice(0, 4);
  return { generatedAt: feed.generatedAt, items };
}
