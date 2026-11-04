import { Dialog } from "./UI.jsx";
import { backgroundOptions } from "./PageBackground.jsx";
export default function Settings({
  preferences,
  setPreferences,
  reduced,
  onClose,
}) {
  const set = (changes) => setPreferences((p) => ({ ...p, ...changes }));
  return (
    <Dialog title="Make yourself at home" onClose={onClose}>
      <fieldset>
        <legend>Appearance</legend>
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
              <span>{theme[0].toUpperCase() + theme.slice(1)}</span>
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
      </fieldset>
      <p className="small muted">
        Preferences and saved projects stay in this browser. V1 has separate
        settings.
      </p>
      <a
        href="./assets/react-bits-LICENSE.txt"
        target="_blank"
        rel="noopener noreferrer"
        className="text-link"
      >
        React Bits license & attribution
      </a>
    </Dialog>
  );
}
