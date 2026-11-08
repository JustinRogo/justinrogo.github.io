import { flushSync } from "react-dom";
import { loadBotanicalFonts } from "./siteStyle.js";

// Switches the site style. With motion allowed and View Transitions supported,
// the new style grows out of a leaf-shaped window opened at `origin`.
export async function transitionStyle(next, apply, { animate, origin }) {
  const root = document.documentElement;
  const commit = () => {
    flushSync(apply);
    root.dataset.style = next;
  };
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
  if (!animate || typeof document.startViewTransition !== "function") {
    commit();
    return;
  }
  root.style.setProperty("--vt-x", `${Math.round(origin?.x ?? innerWidth / 2)}px`);
  root.style.setProperty("--vt-y", `${Math.round(origin?.y ?? innerHeight / 2)}px`);
  root.dataset.styleTransition = next;
  try {
    const transition = document.startViewTransition(commit);
    await transition.finished;
  } catch {
    commit();
  } finally {
    delete root.dataset.styleTransition;
  }
}
