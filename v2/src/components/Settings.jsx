import { Dialog, newTabNote } from "./UI.jsx";
import { backgroundOptions } from "./PageBackground.jsx";
import {
  botanicalBackgrounds,
  loadBotanicalFonts,
  siteStyles,
} from "../botanical/siteStyle.js";
import { Fern } from "../botanical/Flora.jsx";

const themeNames = {
  original: { system: "System", light: "Light", dark: "Dark" },
  botanical: { system: "System", light: "Sunlit", dark: "Moonlit" },
};

export default function Settings({
  preferences,
  setPreferences,
  onStyle,
  reduced,
  onClose,
}) {
  const set = (changes) => setPreferences((p) => ({ ...p, ...changes }));
  const style = preferences.style === "original" ? "original" : "botanical";
  const botanical = style === "botanical";
  return (
    <Dialog title="Make yourself at home" onClose={onClose}>
      {botanical && (
        <svg className="sheet-fern" viewBox="-30 -250 140 260" aria-hidden="true" focusable="false">
          <Fern length={230} curve={60} pinnae={15} reach={40} />
        </svg>
      )}
      <fieldset>
        <legend>Site style</legend>
        <div className="style-options">
          {siteStyles.map(({ id, name, description }) => (
            <label
              key={id}
              onPointerEnter={id === "botanical" ? loadBotanicalFonts : undefined}
            >
              <input
                type="radio"
                name="site-style"
                value={id}
                checked={style === id}
                onFocus={id === "botanical" ? loadBotanicalFonts : undefined}
                onChange={(event) => {
                  const box = event.currentTarget
                    .closest("label")
                    .getBoundingClientRect();
                  onStyle(id, {
                    x: box.left + box.width / 2,
                    y: box.top + box.height / 2,
                  });
                }}
              />
              <span className={`style-preview style-preview-${id}`} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="style-copy">
                <strong>{name}</strong>
                <small>{description}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>{botanical ? "Light" : "Appearance"}</legend>
        <div className="theme-options">
          {["system", "light", "dark"].map((theme) => (
            <label key={theme}>
              <input
                type="radio"
                name="theme"
                value={theme}
                checked={preferences.theme === theme}
                onChange={() => set({ theme })}
              />
              <span className={`theme-preview preview-${theme}`} />
              <span>{themeNames[style][theme]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="switch-row">
        <span>
          <strong>Calm mode</strong>
          <small>
            Turn off animated text, view transitions, and pointer effects.
          </small>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={preferences.calm}
          onChange={(e) => set({ calm: e.target.checked })}
        />
      </label>
      {reduced && (
        <p className="small muted">
          Your device’s reduced-motion setting is active. Animations stay off.
        </p>
      )}
      <label className="switch-row">
        <span>
          <strong>Homepage assembly</strong>
          <small>Let a team of cursors assemble Home when the page loads.</small>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={preferences.intro !== false}
          onChange={(e) => set({ intro: e.target.checked })}
        />
      </label>
      <fieldset>
        <legend>Page background</legend>
        {botanical ? (
          <div className="background-options">
            {botanicalBackgrounds.map(({ id, name, description }) => (
              <label key={id}>
                <input
                  type="radio"
                  name="botanical-background"
                  value={id}
                  aria-label={name}
                  checked={(preferences.botanicalBackground || "conservatory") === id}
                  onChange={() => set({ botanicalBackground: id })}
                />
                <span>
                  <strong>{name}</strong>
                  <small>{description}</small>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <div className="background-options">
            {backgroundOptions.map(({ id, name, description }) => (
              <label key={id}>
                <input
                  type="radio"
                  name="background"
                  value={id}
                  aria-label={name}
                  checked={
                    (preferences.atmosphere === false
                      ? "none"
                      : preferences.background || "auto") === id
                  }
                  onChange={() =>
                    set({ background: id, atmosphere: id !== "none" })
                  }
                />
                <span>
                  <strong>{name}</strong>
                  <small>{description}</small>
                </span>
              </label>
            ))}
          </div>
        )}
        <p className="small muted background-note">
          {botanical
            ? "Your Original background choice is kept for when you switch back."
            : "Botanical has its own backgrounds; this choice is kept for Original."}
        </p>
      </fieldset>
      <p className="small muted">
        Preferences and saved projects stay in this browser. V1 has separate
        settings.
      </p>
      <a
        href="/v2/assets/react-bits-LICENSE.txt"
        target="_blank"
        aria-describedby={newTabNote}
        rel="noopener noreferrer"
        className="text-link"
      >
        React Bits license & attribution
      </a>
    </Dialog>
  );
}
