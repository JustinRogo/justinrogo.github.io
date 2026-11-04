import {
  ShapeWavesBackground,
  AuroraBackground,
  AntigravityBackground,
  FractalBackground,
} from "v2:backgrounds";
import { useMedia } from "../hooks.js";
import { useAssemblyBusy } from "../assembly/HomepageAssembly.jsx";
import { Atmosphere } from "./Glass.jsx";
import "./PageBackground.css";

export const backgroundOptions = [
  {
    id: "auto",
    name: "Device default",
    description: "Shape Waves on desktop, Aurora on compact screens.",
  },
  {
    id: "shape-waves",
    name: "Shape Waves",
    description: "Blue and orange shapes flowing in waves.",
  },
  {
    id: "antigravity",
    name: "Antigravity",
    description: "Floating blue and orange particles.",
  },
  {
    id: "fractal",
    name: "Fractal",
    description: "Colorful branches that grow and fade.",
  },
  {
    id: "aurora",
    name: "Aurora",
    description: "Soft, slowly drifting color glows.",
  },
  {
    id: "orbits",
    name: "Orbits",
    description: "V2’s blue and orange light with orbital lines.",
  },
  {
    id: "none",
    name: "None",
    description: "A solid background matching your theme.",
  },
];

export default function PageBackground({
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
