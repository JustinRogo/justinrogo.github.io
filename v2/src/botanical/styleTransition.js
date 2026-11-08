import { loadBotanicalFonts } from "./siteStyle.js";
import { reveal } from "./reveal.js";

// Switches the site style. With motion allowed, the new style grows out of a
// leaf-shaped window opened at `origin`.
export async function transitionStyle(next, apply, { animate, origin }) {
  if (next === "botanical") {
    loadBotanicalFonts();
    // Give the display face a brief chance to arrive before the snapshot.
    try {
      await Promise.race([
        document.fonts.load('500 1em "Fraunces"'),
        new Promise((resolve) => setTimeout(resolve, 450)),
      ]);
    } catch {}
  }
  await reveal(
    () => {
      apply();
      document.documentElement.dataset.style = next;
    },
    { animate, origin, shape: "leaf" },
  );
}
