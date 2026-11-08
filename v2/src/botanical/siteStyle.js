import { createContext, useContext } from "react";

// The site's overall visual identity. Botanical is the default; Original is the
// blue/orange glass design, kept intact for anyone who chooses it. Botanical's
// layer is scoped under :root[data-style="botanical"].
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
];

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

// Browser chrome colors, per style and theme.
export const themeColors = {
  original: { light: "#e6efff", dark: "#060f23" },
  botanical: { light: "#efe8d8", dark: "#0c1b14" },
};

// Fraunces is requested only while Botanical is in use.
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,300..700,0..100;1,9..144,300..700,0..100&display=swap";
export function loadBotanicalFonts() {
  if (document.getElementById("botanical-fonts")) return;
  const link = document.createElement("link");
  link.id = "botanical-fonts";
  link.rel = "stylesheet";
  link.href = FONT_HREF;
  document.head.append(link);
}

export const SiteStyleContext = createContext(defaultStyle);
export const useSiteStyle = () => useContext(SiteStyleContext);
export const useBotanical = () => useContext(SiteStyleContext) === "botanical";
