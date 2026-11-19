import { profile } from "../content.js";
import { PortraitWreath } from "../botanical/Flora.jsx";
import { PortraitInks } from "../riso/RisoArt.jsx";
import { useSiteStyle } from "../botanical/siteStyle.js";

export default function ProfilePortrait({ className = "", orbits = false, wreath = true }) {
  const style = useSiteStyle();
  const photo = (alt) => (
    <img src="/v2/assets/justin.webp" alt={alt} width="240" height="240" />
  );
  return (
    <div className={`portrait-stage ${className}`.trimEnd()}>
      {orbits && (
        <>
          <div className="portrait-orbit orbit-one" />
          <div className="portrait-orbit orbit-two" />
        </>
      )}
      {style === "botanical" && wreath && <PortraitWreath />}
      {style === "riso" && wreath && <PortraitInks />}
      {style === "riso" ? (
        // A two-colour print: a cobalt plate for the shadows and a pink plate,
        // slightly off register, for the midtones.
        <div className="portrait-photo riso-photo">
          <span className="riso-plate riso-plate-blue">{photo(profile.name)}</span>
          <span className="riso-plate riso-plate-pink" aria-hidden="true">{photo("")}</span>
        </div>
      ) : (
        <div className="portrait-photo">{photo(profile.name)}</div>
      )}
    </div>
  );
}
