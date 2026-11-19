import {
  ShapeWavesBackground,
  AuroraBackground,
  AntigravityBackground,
  FractalBackground,
} from "v2:backgrounds";
import { useMedia } from "../hooks.js";
import { useAssemblyBusy } from "../assembly/HomepageAssembly.jsx";
import { Atmosphere } from "./Glass.jsx";
import BotanicalBackground from "../botanical/BotanicalBackground.jsx";
import RisoBackground from "../riso/RisoBackground.jsx";
import { backgroundOptions } from "./backgroundOptions.js";
import "./PageBackground.css";

// The options live in their own module so Settings can list them without
// loading the background renderers.
export { backgroundOptions };

export default function PageBackground({
  siteStyle,
  preferences,
  moving,
  theme,
  fine,
  suppressed,
}) {
  const compact = useMedia("(max-width: 800px)");
  const busy = useAssemblyBusy();
  const choice = preferences.background || "auto";
  const selected =
    preferences.atmosphere === false
      ? "none"
      : choice === "auto"
        ? compact
          ? "aurora"
          : "shape-waves"
        : choice;
  // Reduced transparency controls glass surfaces, not the chosen page artwork.
  const animated = moving && !busy && !suppressed;
  const light = theme === "light";
  if (siteStyle === "riso") {
    // Risograph keeps its own choice too.
    const variant = preferences.risoBackground || "shapes";
    return (
      <div
        className="page-background page-background-riso"
        data-background={`riso-${variant}`}
        data-theme={theme}
        data-motion={animated ? "moving" : "still"}
        aria-hidden="true"
        inert
      >
        {!suppressed && variant !== "none" && <RisoBackground variant={variant} />}
      </div>
    );
  }
  if (siteStyle === "botanical") {
    // Botanical keeps its own choice, so the Original selection is untouched.
    const variant = preferences.botanicalBackground || "conservatory";
    return (
      <div
        className="page-background page-background-botanical"
        data-background={`botanical-${variant}`}
        data-theme={theme}
        data-motion={animated ? "moving" : "still"}
        aria-hidden="true"
        inert
      >
        {!suppressed && <BotanicalBackground variant={variant} />}
      </div>
    );
  }
  return (
    <div
      className="page-background"
      data-background={selected}
      data-theme={theme}
      data-motion={animated ? "moving" : "still"}
      aria-hidden="true"
      inert
    >
      {!suppressed && selected !== "none" && (
        <div
          className="page-background-renderer"
          key={`${selected}-${theme}-${animated}`}
        >
          {selected === "shape-waves" && (
            <ShapeWavesBackground animated={animated} interactive={fine} />
          )}
          {selected === "antigravity" && (
            <AntigravityBackground
              animated={animated}
              interactive={fine}
              light={light}
            />
          )}
          {selected === "fractal" && (
            <FractalBackground animated={animated} light={light} />
          )}
          {selected === "aurora" && (
            <AuroraBackground animated={animated} visible={animated} />
          )}
          {selected === "orbits" && <Atmosphere moving={animated} />}
        </div>
      )}
    </div>
  );
}
