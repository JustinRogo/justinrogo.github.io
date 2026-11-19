import { donationUrl, profile } from "../content.js";
import Icon from "./Icon.jsx";
import { GlassLayer } from "./Glass.jsx";
import { newTabNote } from "./UI.jsx";
import ExploreMenu from "./ExploreMenu.jsx";
import SidebarResize from "./SidebarResize.jsx";
import { AssembleReveal } from "../assembly/context.js";
import LivingPothos from "../botanical/LivingPothos.jsx";
import { WordmarkSprig } from "../botanical/Flora.jsx";
import { RisoMark } from "../riso/RisoArt.jsx";
import { useSiteStyle } from "../botanical/siteStyle.js";
import { useHref } from "../links.js";

// The site's navigation: the left rail (a bottom dock on phones) and the top
// bar. Shared by the homepage app and the shell on other pages.
export const destinations = [
  ["home", "Home"],
  ["projects", "Projects"],
  ["tools", "Tools"],
  ["about", "About"],
  ["more", "More"],
];

// The light/dark switch grows out of the toggle: a leaf in Botanical, a
// press wipe in Risograph, a circle in Original.
export const themeReveal = (style) =>
  ({
    botanical: { shape: "leaf", duration: "0.9s" },
    riso: { shape: "press", duration: "0.65s" },
  })[style] || { shape: "circle", duration: "0.7s" };

function WordmarkMark() {
  const style = useSiteStyle();
  if (style === "botanical") return <WordmarkSprig />;
  if (style === "riso") return <RisoMark />;
  return <Icon name="external" size={28} />;
}

export function Sidebar({
  sidebar,
  active,
  route,
  effects,
  pages,
  compact,
  onContact,
  onSettings,
}) {
  const href = useHref();
  const botanical = useSiteStyle() === "botanical";
  return (
    <AssembleReveal id="shell">
      <aside className="sidebar">
        <GlassLayer />
        <a href={href("#/home")} className="wordmark" aria-label="Justin Rogowski home">
          jr
          <WordmarkMark />
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
        {/* Home's hero already shows this. Hiding it keeps the navigation from jumping between views. */}
        <div className="sidebar-identity" data-concealed={active === "home" || undefined}>
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
                  href={href(`#/${id}`)}
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
              <ExploreMenu collapseOnShortScreens route={route} effects={effects} pages={pages} />
            </div>
          </AssembleReveal>
        </div>
        {botanical && !compact && <LivingPothos placement="sidebar" moving={effects} />}
        <div className="sidebar-bottom">
          <a
            href={href("#/about?section=contact")}
            className="sidebar-contact"
            aria-label="Contact"
            title="Contact"
            onClick={onContact}
          >
            <span>Contact</span> <Icon name="arrow" size={17} />
          </a>
          <div className="sidebar-settings">
            <button
              className="text-button sidebar-settings-button"
              onClick={onSettings}
              aria-label="Appearance and motion settings"
            >
              <Icon name="settings" /> <span>Settings</span>
            </button>
          </div>
        </div>
        {!sidebar.collapsed && <SidebarResize {...sidebar} />}
      </aside>
    </AssembleReveal>
  );
}

export function Topbar({ weather, time, theme, onToggleTheme, children }) {
  const href = useHref();
  const nextTheme = theme === "dark" ? "light" : "dark";
  const themeAction = `Switch to ${nextTheme} mode`;
  return (
    <AssembleReveal id="topbar">
      <header className="topbar">
        <GlassLayer />
        <a className="mobile-wordmark" href={href("#/home")}>
          jr
          <WordmarkMark />
        </a>
        <a
          className="topbar-donate"
          href={donationUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Donate to the Law Library"
          aria-describedby={newTabNote}
          title="Donate to the Law Library"
        >
          <Icon name="heart" size={16} />
          <span>
            Donate<span className="topbar-donate-more"> to the Law Library</span>
          </span>
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
        {children}
        <button
          type="button"
          className="icon-button"
          aria-label={themeAction}
          title={themeAction}
          onClick={(event) => onToggleTheme(nextTheme, event.currentTarget)}
        >
          <Icon name={nextTheme === "light" ? "sun" : "moon"} size={19} />
        </button>
      </header>
    </AssembleReveal>
  );
}
