import { flushSync } from "react-dom";
import "./reveal.css";

// Applies a change through a view transition that grows out of `origin`
// (a leaf or a circle). Without motion or View Transitions it applies at once.
export async function reveal(apply, { animate, origin, shape = "circle", duration }) {
  const root = document.documentElement;
  const commit = () => flushSync(apply);
  if (!animate || typeof document.startViewTransition !== "function") {
    commit();
    return;
  }
  const x = Math.round(origin?.x ?? innerWidth / 2);
  const y = Math.round(origin?.y ?? innerHeight / 2);
  root.style.setProperty("--vt-x", `${x}px`);
  root.style.setProperty("--vt-y", `${y}px`);
  // The circle must reach the farthest corner.
  root.style.setProperty(
    "--vt-r",
    `${Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)))}px`,
  );
  if (duration) root.style.setProperty("--vt-duration", duration);
  else root.style.removeProperty("--vt-duration");
  root.dataset.reveal = shape;
  try {
    await document.startViewTransition(commit).finished;
  } catch {
    commit();
  } finally {
    delete root.dataset.reveal;
  }
}

// The center of the element that triggered a change, for keyboard and pointer alike.
export const centerOf = (element) => {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
};
