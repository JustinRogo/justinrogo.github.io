import { projectTitles } from "./content.js";

// Validates /data/pages.json, the site's project index.
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
  return {
    ...value,
    pages: value.pages.map((page) => ({
      ...page,
      title: projectTitles[page.path] || page.title,
    })),
  };
}
