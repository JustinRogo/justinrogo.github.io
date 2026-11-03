import { groupOf, projectHref } from "../content.js";
import SpotlightCard from "../vendor/SpotlightCard.jsx";
import Icon from "./Icon.jsx";
import { ExternalLink } from "./UI.jsx";
export function ProjectRow({ project, saved, onSave, effects }) {
  const content = (
    <>
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
    </>
  );
  return effects ? (
    <SpotlightCard
      className="project-row"
      intensity={0.11}
      spotlightColor="#7595ff"
      proximity={0}
      borderGlow={0}
      style={{
        "--spotlight-card-surface": "transparent",
        "--spotlight-card-shadow": "none",
      }}
    >
      {content}
    </SpotlightCard>
  ) : (
    <div className="project-row">{content}</div>
  );
}
