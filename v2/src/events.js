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

// Calendar-leaf pieces in Eastern time: { month: "Nov", day: "16", weekday: "Mon", time: "12:30 PM EST" }.
export function eventParts(date) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  const part = (options) => parsed.toLocaleString("en-US", { timeZone: "America/New_York", ...options });
  return {
    month: part({ month: "short" }),
    day: part({ day: "numeric" }),
    weekday: part({ weekday: "short" }),
    time: part({ hour: "numeric", minute: "2-digit", timeZoneName: "short" }),
  };
}

export function eventDate(date) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    timeZone: "America/New_York", timeZoneName: "short",
  });
}
