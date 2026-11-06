import { Component, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  useClock,
  useMedia,
  useResource,
  useRoute,
  useStored,
} from "./hooks.js";
import { donationUrl, integrations, profile } from "./content.js";
import Home from "./views/Home.jsx";
import Projects from "./views/Projects.jsx";
import Tools from "./views/Tools.jsx";
import About from "./views/About.jsx";
import More, { parseManifest } from "./views/More.jsx";
import Settings from "./components/Settings.jsx";
import Icon from "./components/Icon.jsx";
import { GlassLayer } from "./components/Glass.jsx";
import PageBackground, {
  backgroundOptions,
} from "./components/PageBackground.jsx";
import ExploreMenu from "./components/ExploreMenu.jsx";
import SidebarResize, { useSidebarWidth } from "./components/SidebarResize.jsx";
import HomepageAssembly, {
  AssembleReveal,
  ReplayAssembly,
} from "./assembly/HomepageAssembly.jsx";
import "./styles.css";
import "./glass-theme.css";
import "./layout.css";

const destinations = [
  ["home", "Home"],
  ["projects", "Projects"],
  ["tools", "Tools"],
  ["about", "About"],
  ["more", "More"],
];
function App() {
  const sidebar = useSidebarWidth();
  const route = useRoute();
  const valid = destinations.some(([id]) => id === route.view);
  const active = valid ? route.view : "missing";
  const [visited, setVisited] = useState(new Set([active]));
  if (!visited.has(active)) setVisited(new Set([...visited, active]));
  const [preferences, setPreferences] = useStored(
    "jr-v2-preferences",
    {
      theme: "system",
      calm: false,
      atmosphere: true,
      intro: true,
      background: "auto",
    },
    (p) =>
      p &&
      ["system", "light", "dark"].includes(p.theme) &&
      typeof p.calm === "boolean" &&
      typeof p.atmosphere === "boolean" &&
      (p.intro === undefined || typeof p.intro === "boolean") &&
      (p.background === undefined ||
        backgroundOptions.some(({ id }) => id === p.background)),
  );
  const [saved, setSaved] = useStored(
    "jr-v2-saved",
    [],
    (p) => Array.isArray(p) && p.every((v) => typeof v === "string"),
  );
  const [settings, setSettings] = useState(false);
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    update();
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  const systemDark = useMedia("(prefers-color-scheme: dark)");
  const reduced = useMedia("(prefers-reduced-motion: reduce)");
  const fine = useMedia("(hover: hover) and (pointer: fine)");
  const highContrast = useMedia("(prefers-contrast: more)");
  const forcedColors = useMedia("(forced-colors: active)");
  const theme =
    preferences.theme === "system"
      ? systemDark
        ? "dark"
        : "light"
      : preferences.theme;
  const nextTheme = theme === "dark" ? "light" : "dark";
  const themeAction = `Switch to ${nextTheme} mode`;
  const effects =
    !reduced && !preferences.calm && !highContrast && !forcedColors && visible;
  const projects = useResource("../data/pages.json", parseManifest);
  const weather = useResource(integrations.weather);
  const time = useClock();
  const main = useRef(null);
  const currentView = useRef(active);
  const initialView = useRef(true);
  const scrolls = useRef({});
  const aboutSection = active === "about" ? route.params.get("section") : null;
  useEffect(() => {
    document.title = `${destinations.find(([id]) => id === active)?.[1] || "Page not found"} · Justin Rogowski`;
  }, [active]);
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.theme = theme;
    el.dataset.calm = String(!effects);
    el.dataset.atmosphere = String(preferences.atmosphere);
    document.querySelector('meta[name="theme-color"]').content =
      theme === "dark" ? "#060f23" : "#e6efff";
  }, [theme, effects, preferences.atmosphere]);
  useEffect(() => {
    if (!Array.isArray(saved)) setSaved([]);
  }, [saved]);
  useLayoutEffect(() => {
    if (initialView.current) {
      initialView.current = false;
      return;
    }
    if (currentView.current === active) return;
    scrolls.current[currentView.current] = window.scrollY;
    currentView.current = active;
    main.current
      .querySelector("[data-view]:not([hidden]) h1")
      ?.focus({ preventScroll: true });
    window.scrollTo({ top: scrolls.current[active] || 0, behavior: "instant" });
    document.title = `${destinations.find(([id]) => id === active)?.[1] || "Page not found"} · Justin Rogowski`;
  }, [active]);
  useLayoutEffect(() => {
    const id = { strengths: "cliftonstrengths", contact: "say-hello" }[
      aboutSection
    ];
    if (!id) return;
    const section = main.current?.querySelector(`#${id}`);
    section?.scrollIntoView({ block: "start", behavior: "instant" });
    section?.querySelector("h2")?.focus({ preventScroll: true });
  }, [aboutSection]);
  useEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = "manual";
    return () => {
      history.scrollRestoration = previous;
    };
  }, []);
  const toggleSave = (path) =>
    setSaved((items) =>
      (Array.isArray(items) ? items : []).includes(path)
        ? items.filter((p) => p !== path)
        : [...(Array.isArray(items) ? items : []), path],
    );
  const safeSaved = Array.isArray(saved) ? saved : [];
  const render = (view) =>
    ({
      home: (
        <Home
          projects={projects}
          effects={effects && active === "home"}
          theme={theme}
          fine={fine}
          route={route}
        />
      ),
      projects: (
        <Projects
          projects={projects}
          params={active === "projects" ? route.params : new URLSearchParams()}
          saved={safeSaved}
          onSave={toggleSave}
          effects={effects && fine && active === "projects"}
          theme={theme}
        />
      ),
      tools: (
        <Tools
          params={active === "tools" ? route.params : new URLSearchParams()}
        />
      ),
      about: <About effects={effects && active === "about"} fine={fine} />,
      more: (
        <More
          weather={weather}
          onSettings={() => setSettings(true)}
          route={route}
          effects={effects}
          projectPages={projects.data?.pages}
        />
      ),
      missing: (
        <div className="page-heading">
          <h1 tabIndex={-1}>A little off the map.</h1>
          <p>
            This view doesn’t exist. <a href="#/home">Head home</a> or{" "}
            <a href="#/projects">browse the projects</a>.
          </p>
        </div>
      ),
    })[view];
  return (
    <HomepageAssembly
      active={active === "home"}
      enabled={effects && preferences.intro !== false && !settings}
    >
      <PageBackground
        preferences={preferences}
        moving={effects}
        theme={theme}
        fine={fine}
        suppressed={highContrast || forcedColors}
      />
      <a
        href="#main"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          main.current.focus();
        }}
      >
        Skip to content
      </a>
      <AssembleReveal id="shell">
        <aside className="sidebar">
          <GlassLayer />
          <a
            href="#/home"
            className="wordmark"
            aria-label="Justin Rogowski home"
          >
            jr
            <Icon name="external" size={28} />
          </a>
          <button
            className="icon-button sidebar-toggle"
            aria-label={sidebar.collapsed ? "Expand navigation" : "Collapse navigation"}
            aria-expanded={!sidebar.collapsed}
            aria-controls="sidebar-navigation"
            title={sidebar.collapsed ? "Expand navigation" : "Collapse navigation"}
            onClick={sidebar.toggle}
          >
            <Icon name={sidebar.collapsed ? "expand" : "collapse"} />
          </button>
          <div className="sidebar-identity">
            Justin Rogowski
            <span>{profile.role}</span>
          </div>
          <div className="sidebar-scroll" id="sidebar-navigation">
            <AssembleReveal id="navigation">
              <nav className="primary-nav" aria-label="Primary navigation">
                <GlassLayer className="dock-glass" />
                {destinations.map(([id, label]) => (
                  <a
                    key={id}
                    href={`#/${id}`}
                    aria-label={label}
                    title={label}
                    aria-current={id === active ? "page" : undefined}
                  >
                    <Icon name={id} size={21} />
                    <span>{label}</span>
                    <span className="nav-active-dot" />
                  </a>
                ))}
              </nav>
            </AssembleReveal>
            <AssembleReveal id="branches">
              <div className="sidebar-branches">
                <ExploreMenu
                  route={route}
                  effects={effects}
                  pages={projects.data?.pages}
                />
              </div>
            </AssembleReveal>
          </div>
          <div className="sidebar-bottom">
            <a
              href="#/about?section=contact"
              className="sidebar-contact"
              aria-label="Contact"
              title="Contact"
              onClick={(event) => {
                if (
                  aboutSection !== "contact" ||
                  event.ctrlKey ||
                  event.metaKey ||
                  event.shiftKey ||
                  event.altKey
                )
                  return;
                event.preventDefault();
                const section = main.current?.querySelector("#say-hello");
                section?.scrollIntoView({
                  block: "start",
                  behavior: "instant",
                });
                section?.querySelector("h2")?.focus({ preventScroll: true });
              }}
            >
              <span>Contact</span> <Icon name="arrow" size={17} />
            </a>
            <div className="sidebar-settings">
              <button
                className="text-button sidebar-settings-button"
                onClick={() => setSettings(true)}
                aria-label="Appearance and motion settings"
              >
                <Icon name="settings" /> <span>Settings</span>
              </button>
            </div>
          </div>
          {!sidebar.collapsed && <SidebarResize {...sidebar} />}
        </aside>
      </AssembleReveal>
      <div className="workspace" id="workspace">
        <AssembleReveal id="topbar">
          <header className="topbar">
            <GlassLayer />
            <a className="mobile-wordmark" href="#/home">
              jr
              <Icon name="external" size={28} />
            </a>
            <a className="topbar-donate" href={donationUrl} target="_blank"
              rel="noopener noreferrer" aria-label="Donate to the Law Library"
              title="Donate to the Law Library">
              <Icon name="heart" size={16} />
              <span>Donate to the Law Library</span>
            </a>
            <div className="local-time">
              <span className="live-dot" />
              <span className="topbar-location">Hartford, CT</span>
              <time dateTime={time.toISOString()}>
                {time.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: "America/New_York",
                })}
              </time>
              {weather.data?.current && (
                <span className="topbar-weather">
                  {Math.round(weather.data.current.temperature_2m)}°F
                </span>
              )}
            </div>
            <ReplayAssembly />
            <button
              type="button"
              className="icon-button"
              aria-label={themeAction}
              title={themeAction}
              onClick={() =>
                setPreferences((current) => ({ ...current, theme: nextTheme }))
              }
            >
              <Icon name={nextTheme === "light" ? "sun" : "moon"} size={19} />
            </button>
          </header>
        </AssembleReveal>
        <main id="main" tabIndex={-1} ref={main}>
          {[...visited].map((view) => (
            <div
              key={view}
              data-view={view}
              hidden={active !== view}
              className={`view view-${view}`}
            >
              {render(view)}
            </div>
          ))}
        </main>
        <AssembleReveal id="footer">
          <footer className="app-footer">
            <span>Built with ✨ by Justin</span>
            <a href="/original.html">
              Original site <Icon name="external" size={14} />
            </a>
          </footer>
        </AssembleReveal>
      </div>
      {settings && (
        <Settings
          preferences={preferences}
          setPreferences={setPreferences}
          reduced={reduced}
          onClose={() => setSettings(false)}
        />
      )}
    </HomepageAssembly>
  );
}
class Boundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="fatal-error">
        <h1>Something didn’t load.</h1>
        <p>Please reload the page or visit the original site.</p>
        <button className="button" onClick={() => location.reload()}>
          Reload
        </button>
        <a href="/original.html">Original website</a>
      </div>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")).render(
  <Boundary>
    <App />
  </Boundary>,
);
