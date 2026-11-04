import { groupOf, projectHref } from "../content.js";
import Icon from "./Icon.jsx";
import { ExternalLink } from "./UI.jsx";
export function ProjectCard({ project, saved, onSave }) {
  return (
    <article className="project-card">
      <ExternalLink href={projectHref(project)} className="project-description">
        <h2>{project.title}</h2>
        <span className="project-category">
          {groupOf(project)} <span> / </span> {project.category}
        </span>
        <p>{project.description}</p>
      </ExternalLink>
      <div className="project-actions">
        <button
          className="icon-button save-button"
          aria-label={`${saved ? "Unsave" : "Save"} ${project.title}`}
          aria-pressed={saved}
          onClick={() => onSave(project.path)}
        >
          <Icon name="heart" />
        </button>
        <ExternalLink
          href={projectHref(project)}
          className="icon-button"
          aria-label={`Open ${project.title}`}
        >
          <Icon name="external" />
        </ExternalLink>
      </div>
    </article>
  );
}
