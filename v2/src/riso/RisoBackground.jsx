import { ColorBar, RegistrationTarget } from "./RisoArt.jsx";

// Risograph page backgrounds. All are static CSS/SVG on the paper ground; the
// paper's own grain is on the page itself, so "None" is plain paper.
export default function RisoBackground({ variant }) {
  if (variant === "shapes")
    return (
      <div className="riso-background riso-shapes">
        <span className="rs-sun" />
        <span className="rs-tri" />
        <span className="rs-half" />
        <span className="rs-bar" />
      </div>
    );
  if (variant === "halftone")
    return (
      <div className="riso-background riso-halftone">
        <span className="rh-pink" />
        <span className="rh-blue" />
        <span className="rh-yellow" />
      </div>
    );
  if (variant === "press-sheet")
    return (
      <div className="riso-background riso-press-sheet">
        <span className="crop crop-tl" />
        <span className="crop crop-tr" />
        <span className="crop crop-bl" />
        <span className="crop crop-br" />
        <RegistrationTarget className="rp-target rp-target-top" />
        <RegistrationTarget className="rp-target rp-target-side" />
        <ColorBar className="rp-colorbar" />
        <span className="rp-slug">Justin Rogowski · three-colour risograph · pink / cobalt / yellow</span>
      </div>
    );
  return null;
}
