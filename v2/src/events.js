const httpsUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch { return null; }
};
const namespacedText = (item, name) =>
  item.getElementsByTagNameNS("*", name)[0]?.textContent?.trim() || "";

export function parseEvents(xml) {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.querySelector("parsererror")) throw new Error("Unreadable events feed");
  const seen = new Set();
  return [...doc.querySelectorAll("item")].map((item) => {
    const description = new DOMParser().parseFromString(item.querySelector("description")?.textContent || "", "text/html");
    description.querySelectorAll("script,style,iframe").forEach((node) => node.remove());
    return {
      title: item.querySelector("title")?.textContent?.trim(),
      href: httpsUrl(item.querySelector("link")?.textContent),
      date: item.querySelector("pubDate")?.textContent || "",
      location: namespacedText(item, "featurename"),
      image: httpsUrl(namespacedText(item, "image_full")) ||
        httpsUrl(namespacedText(item, "image")) ||
        httpsUrl(description.querySelector("img")?.getAttribute("src")),
      description: description.body.textContent.trim().replace(/\s+/g, " ").slice(0, 240),
    };
  }).filter((event) => {
    if (!event.title || !event.href || seen.has(event.href)) return false;
    seen.add(event.href);
    return true;
  }).slice(0, 8);
}

export function eventDate(date) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    timeZone: "America/New_York", timeZoneName: "short",
  });
}

// A missing poster still presents real event information inside the gallery.
export function eventPoster(event, theme = "dark") {
  const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]);
  const lines = [];
  for (const word of event.title.split(/\s+/)) {
    if (!lines.length || lines.at(-1).length + word.length > 29) lines.push(word);
    else lines[lines.length - 1] += ` ${word}`;
  }
  const title = lines.slice(0, 8).map((line, index) => `<tspan x="360" y="${84 + index * 52}">${escape(line)}</tspan>`).join("");
  const dark = theme === "dark";
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="720" viewBox="0 0 720 720"><rect width="720" height="720" fill="${dark ? "#102b50" : "#f1f6ff"}"/><text text-anchor="middle" fill="${dark ? "#eef5ff" : "#112847"}" font-family="Arial,sans-serif" font-weight="600" font-size="40">${title}</text></svg>`)}`;
}
