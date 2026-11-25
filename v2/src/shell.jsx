// The site shell for standalone pages (Daily Activity): the homepage's rail,
// top bar and Settings sheet around the page's own content. Links point back
// to the homepage. The shell owns the saved preferences while it runs: it sets
// data-style / data-theme on <html> and fires `site-style-change` so the page
// can redraw anything it paints itself, such as canvas charts.
//
// Markup it expects on the page:
//   <div id="site-shell"></div>                  rail + Settings render here
//   <div class="workspace">
//     <div id="site-topbar" style="display: contents"></div>
//     <main id="main" tabindex="-1">…</main>
//   </div>
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import { useClock, useMedia, useResource, useScrolledFlag, useStored } from "./hooks.js";
import { integrations } from "./content.js";
import { parseManifest } from "./manifest.js";
import Settings from "./components/Settings.jsx";
import PlaygroundSpotlights from "./components/PlaygroundSpotlights.jsx";
import { newTabNote } from "./components/UI.jsx";
import { useSidebarWidth } from "./components/SidebarResize.jsx";
import { Sidebar, Topbar, themeReveal } from "./components/Shell.jsx";
import {
  SiteStyleContext,
  loadStyleFonts,
  resolveStyle,
  themeColors,
} from "./botanical/siteStyle.js";
import { transitionStyle } from "./botanical/styleTransition.js";
import { centerOf, reveal } from "./botanical/reveal.js";
import { LinkBaseContext } from "./links.js";
import {
  PREFERENCES_KEY,
  defaultPreferences,
  validPreferences,
} from "./preferences.js";
import "./styles.css";
import "./glass-theme.css";
import "./layout.css";
import "./botanical/botanical.css";
import "./riso/riso.css";

const TOPBAR_DOCK_SCROLL = 12;

function SiteShell({ topbarSlot, playgroundsSlot }) {
  const sidebar = useSidebarWidth();
  const [preferences, setPreferences] = useStored(
    PREFERENCES_KEY,
    defaultPreferences,
    validPreferences,
  );
  const [settings, setSettings] = useState(false);
  const systemDark = useMedia("(prefers-color-scheme: dark)");
  const reduced = useMedia("(prefers-reduced-motion: reduce)");
  const highContrast = useMedia("(prefers-contrast: more)");
  const forcedColors = useMedia("(forced-colors: active)");
  const compact = useMedia("(max-width: 800px)");
  const projects = useResource("/data/pages.json", parseManifest);
  const weather = useResource(integrations.weather);
  const time = useClock();
  useScrolledFlag(TOPBAR_DOCK_SCROLL);
  const siteStyle = resolveStyle(preferences.style);
  const theme =
    preferences.theme === "system" ? (systemDark ? "dark" : "light") : preferences.theme;
  const effects = !reduced && !preferences.calm && !highContrast && !forcedColors;

  // A change made on the homepage in another tab arrives here.
  useEffect(() => {
    const sync = (event) => {
      if (event.key !== PREFERENCES_KEY) return;
      try {
        const value = JSON.parse(event.newValue);
        if (validPreferences(value)) setPreferences(value);
      } catch {}
    };
    addEventListener("storage", sync);
    return () => removeEventListener("storage", sync);
  }, [setPreferences]);

  const painted = useRef(null);
  useLayoutEffect(() => {
    const el = document.documentElement;
    el.dataset.theme = theme;
    el.dataset.style = siteStyle;
    el.dataset.calm = String(!effects);
    el.dataset.flourish = effects ? "on" : "off";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = themeColors[siteStyle][theme];
    const key = `${siteStyle}/${theme}`;
    // The page painted the saved style before the shell loaded; only later
    // changes need a redraw.
    if (painted.current && painted.current !== key) {
      const redraw = () => dispatchEvent(new Event("site-style-change"));
      document.fonts?.ready.then(redraw) ?? redraw();
    }
    painted.current = key;
  }, [theme, siteStyle, effects]);
  useEffect(() => {
    loadStyleFonts(siteStyle);
  }, [siteStyle]);

  return (
    <SiteStyleContext.Provider value={siteStyle}>
      <LinkBaseContext.Provider value="/">
        <span id={newTabNote} hidden>
          Opens in a new tab
        </span>
        <a
          href="#main"
          className="skip-link"
          onClick={(event) => {
            event.preventDefault();
            document.getElementById("main")?.focus();
          }}
        >
          Skip to content
        </a>
        <Sidebar
          sidebar={sidebar}
          active={null}
          route={null}
          effects={effects}
          pages={projects.data?.pages}
          compact={compact}
          onSettings={() => setSettings(true)}
        />
        {createPortal(
          <Topbar
            weather={weather}
            time={time}
            theme={theme}
            onToggleTheme={(next, button) =>
              reveal(() => setPreferences((current) => ({ ...current, theme: next })), {
                animate: effects,
                origin: centerOf(button),
                ...themeReveal(siteStyle),
              })
            }
          />,
          topbarSlot,
        )}
        {playgroundsSlot && createPortal(<PlaygroundSpotlights headingTag="h3" />, playgroundsSlot)}
        {settings && (
          <Settings
            preferences={preferences}
            setPreferences={setPreferences}
            onStyle={(style, origin) =>
              transitionStyle(
                style,
                () => setPreferences((current) => ({ ...current, style })),
                { animate: effects, origin },
              )
            }
            reduced={reduced}
            onClose={() => setSettings(false)}
          />
        )}
      </LinkBaseContext.Provider>
    </SiteStyleContext.Provider>
  );
}

const host = document.getElementById("site-shell");
const topbarSlot = document.getElementById("site-topbar");
const playgroundsSlot = document.getElementById("playground-spotlights");
if (host && topbarSlot) {
  createRoot(host).render(<SiteShell topbarSlot={topbarSlot} playgroundsSlot={playgroundsSlot} />);
}
