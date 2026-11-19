import { styleFontsReady } from "./siteStyle.js";
import { reveal } from "./reveal.js";

// Switches the site style. With motion allowed, the new style grows out of a
// leaf-shaped window opened at `origin`; Risograph feeds in like a printed
// sheet, top to bottom.
export async function transitionStyle(next, apply, { animate, origin }) {
  // Give the display face a brief chance to arrive before the snapshot.
  await styleFontsReady(next);
  await reveal(
    () => {
      apply();
      document.documentElement.dataset.style = next;
    },
    {
      animate,
      origin,
      shape: next === "riso" ? "press" : "leaf",
      duration: next === "riso" ? "0.75s" : undefined,
    },
  );
}
