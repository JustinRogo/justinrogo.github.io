// Risograph artwork: flat shapes printed in pink, cobalt and yellow. Inks
// overprint (multiply on cream paper, screen on black paper), and every piece
// is decorative, so it stays out of the accessibility tree.

const hidden = { "aria-hidden": "true", focusable: "false" };

// The wordmark's mark: a pink disc printed over a cobalt triangle.
export function RisoMark() {
  return (
    <svg className="riso-mark" viewBox="0 0 30 28" width="30" height="28" {...hidden}>
      <path className="ink-blue" d="M1 27 L12.5 7 L24 27 Z" />
      <circle className="ink-pink overprint" cx="20" cy="10" r="8" />
    </svg>
  );
}

// A press registration target: concentric ring with a crosshair.
export function RegistrationTarget({ className = "" }) {
  return (
    <svg className={`riso-target ${className}`.trimEnd()} viewBox="0 0 40 40" {...hidden}>
      <circle cx="20" cy="20" r="10" />
      <circle cx="20" cy="20" r="4.5" />
      <path d="M20 0V40M0 20H40" />
    </svg>
  );
}

// A press colour bar: solid inks, their overprints, then tint steps.
export function ColorBar({ className = "" }) {
  return (
    <span className={`riso-colorbar ${className}`.trimEnd()} aria-hidden="true">
      <i className="cb-pink" />
      <i className="cb-blue" />
      <i className="cb-yellow" />
      <i className="cb-pink-blue" />
      <i className="cb-pink-yellow" />
      <i className="cb-blue-yellow" />
      <i className="cb-tint-70" />
      <i className="cb-tint-40" />
      <i className="cb-tint-15" />
    </span>
  );
}

// The Home hero's print: a cut pink block running under the name, a cobalt
// half-disc in the corner, a halftone patch and the press marks.
export function HeroPrint() {
  return (
    <div className="hero-print" aria-hidden="true">
      <span className="hp-block" />
      <span className="hp-half" />
      <span className="hp-dots" />
      <RegistrationTarget className="hp-target" />
      <ColorBar className="hp-colorbar" />
    </div>
  );
}

// Behind the portrait: a yellow disc with a pink quarter cut over it.
export function PortraitInks() {
  return (
    <span className="portrait-inks" aria-hidden="true">
      <i className="pi-sun" />
      <i className="pi-quarter" />
      <i className="pi-tri" />
    </span>
  );
}

// The settings sheet's corner: a small three-ink composition.
export function SheetPrint() {
  return (
    <svg className="sheet-print" viewBox="0 0 120 92" {...hidden}>
      <circle className="ink-yellow" cx="78" cy="38" r="32" />
      <path className="ink-pink overprint" d="M40 88 L64 22 L104 88 Z" />
      <rect className="ink-blue overprint" x="8" y="58" width="44" height="30" />
    </svg>
  );
}

// The CT General Statutes card's mark: a shelf of three statute volumes
// printed in cobalt, pink and yellow, with a disc overprinting them.
export function StatutesPrint() {
  return (
    <svg className="statutes-print" viewBox="0 0 96 72" {...hidden}>
      <rect className="ink-blue" x="6" y="10" width="18" height="58" />
      <rect className="ink-pink overprint" x="20" y="16" width="18" height="52" />
      <rect className="ink-yellow overprint" x="34" y="6" width="18" height="62" />
      <circle className="ink-pink overprint" cx="70" cy="30" r="20" />
      <path className="ink-blue overprint" d="M56 68 L74 40 L92 68 Z" />
    </svg>
  );
}
