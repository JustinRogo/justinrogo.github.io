import { createContext, useContext } from "react";

// Where the site shell lives. Inside the homepage app, hash routes ("#/about")
// and project paths ("../Pages/…") resolve as written. When the shell is
// mounted on another page (e.g. Daily Activity), they must point back to the
// homepage, so the shell provides "/" and links are rewritten from the root.
export const LinkBaseContext = createContext("");
export function resolveHref(href, base) {
  if (!base || typeof href !== "string") return href;
  if (href.startsWith("#/")) return `${base}${href}`;
  if (href.startsWith("../")) return `${base}${href.slice(3)}`;
  return href;
}
export function useHref() {
  const base = useContext(LinkBaseContext);
  return (href) => resolveHref(href, base);
}
