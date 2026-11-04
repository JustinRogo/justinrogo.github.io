import { groupOf } from "../content.js";
import Icon from "../components/Icon.jsx";
import { ProjectCard } from "../components/Project.jsx";
import { LoadState } from "../components/UI.jsx";
import MagicBento from "../vendor/MagicBento.jsx";

const inGroup = (project, group) =>
  group === "All" ||
  (group === "UCPEA" ? project.path.includes("/UCPEA/") : groupOf(project) === group);

export function setProjectParams(params, changes, replace = false) {
  const next = new URLSearchParams(params);
  Object.entries(changes).forEach(([key, value]) =>
    value ? next.set(key, value) : next.delete(key),
  );
  const hash = `#/projects${next.size ? `?${next}` : ""}`;
  if (replace) {
    history.replaceState(null, "", hash);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else location.hash = hash;
}
export default function Projects({
  projects,
  params,
  saved,
  onSave,
  effects,
  theme,
}) {
  const group = params.get("group") || "All";
  const query = params.get("q") || "";
  const onlySaved = params.get("saved") === "1";
  const pages = projects.data?.pages || [];
  const matches = pages.filter(
    (p) =>
      inGroup(p, group) &&
      (!onlySaved || saved.includes(p.path)) &&
      `${p.title} ${p.description} ${p.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <h1 tabIndex={-1}>Projects &amp; Pages</h1>
      </div>
      <div className="project-toolbar">
        <label className="search-field">
          <Icon name="search" />
          <span className="sr-only">Search projects</span>
          <input
            type="search"
            value={query}
            onChange={(e) =>
              setProjectParams(params, { q: e.target.value }, true)
            }
            placeholder="Find something interesting…"
          />
        </label>
        <button
          className="button saved-filter"
          aria-pressed={onlySaved}
          onClick={() =>
            setProjectParams(params, { saved: onlySaved ? "" : "1" })
          }
        >
          <Icon name="heart" size={17} />
          Saved <span>{saved.length}</span>
        </button>
      </div>
      <div className="filter-row" role="group" aria-label="Project categories">
        {["All", "Work", "Library", "UCPEA", "For Fun"].map((value) => (
          <button
            key={value}
            aria-pressed={group === value}
            onClick={() =>
              setProjectParams(params, { group: value === "All" ? "" : value })
            }
          >
            {value}
            <span>
              {pages.filter((p) => inGroup(p, value)).length}
            </span>
          </button>
        ))}
      </div>
      <div className="results-label" role="status">
        {projects.loading
          ? "Opening the index…"
          : `${matches.length} ${matches.length === 1 ? "project" : "projects"}${onlySaved ? " saved" : ""}`}
      </div>
      <LoadState
        resource={projects}
        message="The project index couldn’t load. Try again, or visit the original site."
      >
        {() =>
          matches.length ? (
            <MagicBento
              className="project-bento"
              items={matches.map((project) => ({
                id: project.path,
                content: (
                  <ProjectCard
                    project={project}
                    saved={saved.includes(project.path)}
                    onSave={onSave}
                  />
                ),
              }))}
              columns={3}
              rowHeight={195}
              radius={12}
              gap={14}
              theme={theme}
              glowColor="#f97316"
              textAutoHide={false}
              enableStars={effects}
              particleCount={38}
              spotlightRadius={320}
              enableSpotlight={effects}
              enableBorderGlow={effects}
              enableTilt={effects}
              enableMagnetism={effects}
              disableAnimations={!effects}
              intro={false}
              style={{ gridAutoRows: "minmax(195px, auto)" }}
            />
          ) : (
            <div className="empty-state">
              <Icon name="search" size={32} />
              <h2>
                {onlySaved
                  ? "Your collection starts here."
                  : "No projects found."}
              </h2>
              <p>
                {onlySaved
                  ? "Save a project with the heart button to come back to it."
                  : "Try a different word or browse the full index."}
              </p>
              <button
                className="button"
                onClick={() =>
                  setProjectParams(params, { q: "", group: "", saved: "" })
                }
              >
                Browse all projects
              </button>
            </div>
          )
        }
      </LoadState>
    </>
  );
}
