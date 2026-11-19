import { createContext, useContext } from "react";

// The site's overall visual identity. Botanical is the default; Original is the
// blue/orange glass design, kept intact for anyone who chooses it; Risograph
// prints the site in fluorescent pink, cobalt and yellow ink. Botanical's layer
// is scoped under :root[data-style="botanical"], Risograph's under
// :root[data-style="riso"].
export const defaultStyle = "botanical";
export const siteStyles = [
  {
    id: "botanical",
    name: "Botanical",
    description: "A lush, earthy conservatory with living plants.",
  },
  {
    id: "original",
    name: "Original",
    description: "The futuristic blue and orange glass design.",
  },
  {
    id: "riso",
    name: "Risograph",
    description: "Pink, blue and yellow ink, printed on paper.",
  },
];
export const styleIds = siteStyles.map(({ id }) => id);
// Unknown or missing styles read as the default.
export const resolveStyle = (style) =>
  styleIds.includes(style) ? style : defaultStyle;

export const botanicalBackgrounds = [
  {
    id: "conservatory",
    name: "Conservatory",
    description: "Layered foliage in a slow breeze, with sun or fireflies.",
  },
  {
    id: "herbarium",
    name: "Herbarium",
    description: "Pressed specimens on quiet parchment.",
  },
  {
    id: "canopy",
    name: "Canopy light",
    description: "Only the light: dappled sun by day, fireflies by night.",
  },
  {
    id: "none",
    name: "None",
    description: "Plain paper matching your theme.",
  },
];

export const risoBackgrounds = [
  {
    id: "shapes",
    name: "Cut shapes",
    description: "Big flat circles and triangles, overprinted at the edges.",
  },
  {
    id: "halftone",
    name: "Halftone",
    description: "Dot screens in pink and blue, fading across the sheet.",
  },
  {
    id: "press-sheet",
    name: "Press sheet",
    description: "Crop marks, registration targets and ink bars in the margins.",
  },
  {
    id: "none",
    name: "None",
    description: "Just the paper.",
  },
];

// Browser chrome colors, per style and theme.
export const themeColors = {
  original: { light: "#e6efff", dark: "#060f23" },
  botanical: { light: "#efe8d8", dark: "#0c1b14" },
  riso: { light: "#f2e9d4", dark: "#1c1a18" },
};

// Display faces are requested only while their style is in use.
const FONTS = {
  botanical: {
    id: "botanical-fonts",
    href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,300..700,0..100;1,9..144,300..700,0..100&display=swap",
    probe: '500 1em "Fraunces"',
  },
  riso: {
    id: "riso-fonts",
    href: "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&display=swap",
    probe: '800 1em "Archivo"',
  },
};
export const fontSheetIds = Object.values(FONTS).map(({ id }) => id);
export function loadStyleFonts(style) {
  const font = FONTS[style];
  if (!font || document.getElementById(font.id)) return;
  const link = document.createElement("link");
  link.id = font.id;
  link.rel = "stylesheet";
  link.href = font.href;
  document.head.append(link);
}
export const loadBotanicalFonts = () => loadStyleFonts("botanical");
// Gives a style's display face a brief chance to arrive, e.g. before a snapshot.
export async function styleFontsReady(style, timeout = 450) {
  const font = FONTS[style];
  if (!font) return;
  loadStyleFonts(style);
  try {
    await Promise.race([
      document.fonts.load(font.probe),
      new Promise((resolve) => setTimeout(resolve, timeout)),
    ]);
  } catch {}
}

export const SiteStyleContext = createContext(defaultStyle);
export const useSiteStyle = () => useContext(SiteStyleContext);
export const useBotanical = () => useContext(SiteStyleContext) === "botanical";
export const useRiso = () => useContext(SiteStyleContext) === "riso";
