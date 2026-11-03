import { groupOf, projectHref } from "../content.js";
import Icon from "../components/Icon.jsx";
import { ProjectRow } from "../components/Project.jsx";
import { LoadState } from "../components/UI.jsx";

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
export default function Projects({ projects, params, saved, onSave, effects }) {
  const group = params.get("group") || "All";
  const query = params.get("q") || "";
  const onlySaved = params.get("saved") === "1";
  const pages = projects.data?.pages || [];
  const matches = pages.filter(
    (p) =>
      (group === "All" || groupOf(p) === group) &&
      (!onlySaved || saved.includes(p.path)) &&
      `${p.title} ${p.description} ${p.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <h1 tabIndex={-1}>
          The project index<span className="title-dot">.</span>
        </h1>
        <p>
          Useful tools, library work, and things built just to see what happens.
        </p>
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
        {["All", "Work", "Library", "For Fun"].map((value) => (
          <button
            key={value}
            aria-pressed={group === value}
            onClick={() =>
              setProjectParams(params, { group: value === "All" ? "" : value })
            }
          >
            {value}
            <span>
              {
                pages.filter((p) => value === "All" || groupOf(p) === value)
                  .length
              }
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
            <div className="project-list">
              {matches.map((p) => (
                <ProjectRow
                  key={p.path}
                  project={p}
                  saved={saved.includes(p.path)}
                  onSave={onSave}
                  effects={effects}
                />
              ))}
            </div>
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
      <p className="end-note">
        A small collection, always evolving. Each project opens in its original
        home.
      </p>
    </>
  );
}
