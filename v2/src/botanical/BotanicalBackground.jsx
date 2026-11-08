// The Botanical page backgrounds. Each foliage layer is its own small SVG, so
// the browser can sway it as a composited layer without repainting artwork.
import { useEffect, useRef } from "react";
import { Fern, Monstera, Pothos, Sprig } from "./Flora.jsx";

const motes = Array.from({ length: 14 }, (_, i) => i);

function Light() {
  return (
    <div className="bb-light">
      <div className="bb-sunbeam" />
      {motes.slice(0, 7).map((i) => (
        <span key={`d${i}`} className={`bb-dapple bb-dapple-${i}`} />
      ))}
      {motes.map((i) => (
        <span key={`f${i}`} className={`bb-firefly bb-firefly-${i}`} />
      ))}
    </div>
  );
}

function Foliage() {
  return (
    <div className="bb-foliage">
      {/* Back: soft, distant shapes. */}
      <svg className="bb-leaf bb-back bb-tl" viewBox="-160 -230 320 330">
        <Monstera veins={false} transform="rotate(150) scale(1.1)" />
      </svg>
      <svg className="bb-leaf bb-back bb-br" viewBox="-200 -340 320 360">
        <Fern length={330} curve={-80} pinnae={20} reach={60} transform="rotate(-20)" />
      </svg>
      {/* Middle. */}
      <svg className="bb-leaf bb-mid bb-tr" viewBox="-150 -230 300 320">
        <Monstera veins={false} transform="rotate(-140) scale(1.05)" />
      </svg>
      <svg className="bb-leaf bb-mid bb-bl" viewBox="-60 -320 300 330">
        <Fern length={300} curve={70} pinnae={18} reach={56} transform="rotate(16)" />
        <Fern length={220} curve={90} pinnae={14} reach={44} transform="translate(40 0) rotate(46)" />
      </svg>
      {/* Front: a trailing pothos from the top edge. */}
      <svg className="bb-leaf bb-front bb-top" viewBox="0 0 420 300">
        <Pothos
          curve={[[0, -4], [120, 30], [180, 160], [260, 290]]}
          leaves={10}
          size={34}
          droop={0.55}
          seed={21}
        />
      </svg>
    </div>
  );
}

function Herbarium() {
  return (
    <div className="bb-herbarium">
      <span className="bb-rule" />
      <svg className="bb-specimen bb-specimen-fern" viewBox="-60 -330 200 340">
        <Fern line length={300} curve={40} pinnae={18} reach={46} />
        <rect className="bb-tape" x="-14" y="-40" width="34" height="12" transform="rotate(-8)" />
      </svg>
      <svg className="bb-specimen bb-specimen-monstera" viewBox="-130 -230 260 330">
        <Monstera line veins transform="rotate(12)" />
        <rect className="bb-tape" x="-30" y="40" width="40" height="13" transform="rotate(14)" />
      </svg>
      <svg className="bb-specimen bb-specimen-sprig" viewBox="-14 -10 150 44">
        <Sprig length={120} leaves={9} />
      </svg>
    </div>
  );
}

export default function BotanicalBackground({ variant }) {
  const ref = useRef(null);
  // Very gentle parallax: distant layers drift less than near ones.
  useEffect(() => {
    const node = ref.current;
    if (!node || variant === "none") return;
    let frame = 0;
    const update = () => {
      frame = 0;
      node.style.setProperty("--scroll", Math.min(scrollY, 4000).toFixed(0));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", schedule);
    };
  }, [variant]);
  return (
    <div ref={ref} className={`botanical-background bb-${variant}`}>
      <div className="bb-wash" />
      {variant === "conservatory" && <Foliage />}
      {variant === "herbarium" && <Herbarium />}
      {(variant === "conservatory" || variant === "canopy") && <Light />}
      <div className="bb-grain" />
    </div>
  );
}
