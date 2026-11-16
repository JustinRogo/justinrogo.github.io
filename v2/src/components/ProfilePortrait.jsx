import { profile } from "../content.js";
import { PortraitWreath } from "../botanical/Flora.jsx";
import { useBotanical } from "../botanical/siteStyle.js";

export default function ProfilePortrait({ className = "", orbits = false, wreath }) {
  const botanical = useBotanical();
  return (
    <div className={`portrait-stage ${className}`.trimEnd()}>
      {orbits && (
        <>
          <div className="portrait-orbit orbit-one" />
          <div className="portrait-orbit orbit-two" />
        </>
      )}
      {botanical && <PortraitWreath variety={wreath} />}
      <div className="portrait-photo">
        <img
          src="/v2/assets/justin.webp"
          alt={profile.name}
          width="240"
          height="240"
        />
      </div>
    </div>
  );
}
