const httpsUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
};

const entities = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " };
const decode = (value) => value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, code) => {
  if (code[0] !== "#") return entities[code.toLowerCase()] ?? match;
  const point = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
  return Number.isFinite(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : match;
});

// The feed's description is the post's opening paragraph, truncated with "[…]".
// Keep plain text only; the card shows it as a short excerpt.
const excerpt = (value) => typeof value === "string"
  ? decode(value.replace(/<[^>]*>/g, " ")).replace(/\s*\[(?:…|\.\.\.)\]\s*$/, "").replace(/\s+/g, " ").trim()
  : "";

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
    return [{ title: post.title.trim(), link, pubDate: date.toISOString(), thumbnail: httpsUrl(post.thumbnail), excerpt: excerpt(post.description) }];
  }).slice(0, 4);
  return { generatedAt: feed.generatedAt, items };
}
