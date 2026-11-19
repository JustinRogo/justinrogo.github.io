import { backgroundOptions } from "./components/backgroundOptions.js";
import {
  botanicalBackgrounds,
  risoBackgrounds,
  styleIds,
} from "./botanical/siteStyle.js";

// V2's saved appearance and motion preferences, shared by the homepage app
// and the site shell on standalone pages (e.g. Daily Activity).
export const PREFERENCES_KEY = "jr-v2-preferences";
export const defaultPreferences = {
  theme: "system",
  calm: false,
  atmosphere: true,
  intro: true,
  background: "auto",
  style: "botanical",
  botanicalBackground: "conservatory",
};
export const validPreferences = (p) =>
  p &&
  ["system", "light", "dark"].includes(p.theme) &&
  typeof p.calm === "boolean" &&
  typeof p.atmosphere === "boolean" &&
  (p.intro === undefined || typeof p.intro === "boolean") &&
  (p.background === undefined ||
    backgroundOptions.some(({ id }) => id === p.background)) &&
  (p.style === undefined || styleIds.includes(p.style)) &&
  (p.botanicalBackground === undefined ||
    botanicalBackgrounds.some(({ id }) => id === p.botanicalBackground)) &&
  (p.risoBackground === undefined ||
    risoBackgrounds.some(({ id }) => id === p.risoBackground));
