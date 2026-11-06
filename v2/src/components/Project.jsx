import { useState } from "react";
import { groupOf, projectHref } from "../content.js";
import Icon from "./Icon.jsx";
import { ExternalLink } from "./UI.jsx";
const previewBase = "/v2/assets/project-previews/";
// `decorative` is for cards that show the project's title beside the image.
// `sizes` is the widest the image displays; v2/resize-images.mjs writes the smaller copies.
export function ProjectPreview({
  project,
  tall = false,
  className = "",
  decorative = false,
  sizes = "(max-width: 400px) 100vw, 400px",
}) {
  const [previewFailed, setPreviewFailed] = useState(false);
  const previewName = project.path
    .replace(/^Pages\//, "")
    .replace(/\.html$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  return (
    <div className={`project-preview ${className}`.trim()}>
      {previewFailed ? (
        <span className="project-preview-fallback">{project.title}</span>
      ) : (
        <img
          className="project-preview-landscape"
          src={`${previewBase}${previewName}.jpg`}
          srcSet={`${previewBase}${previewName}-480.webp 480w, ${previewBase}${previewName}-800.webp 800w, ${previewBase}${previewName}.jpg 1200w`}
          sizes={sizes}
          alt={decorative ? "" : `Screenshot of ${project.title}`}
          loading="lazy"
          decoding="async"
          width="1200"
          height="750"
          onError={() => setPreviewFailed(true)}
        />
      )}
      {tall && !previewFailed && (
        <img
          className="project-preview-portrait"
          src={`${previewBase}${previewName}-portrait.jpg`}
          alt={`Screenshot of ${project.title}`}
          loading="lazy"
          decoding="async"
          width="600"
          height="1200"
          onError={() => setPreviewFailed(true)}
        />
      )}
    </div>
  );
}
export function ProjectCard({ project, saved, onSave, tall = false, wide = false }) {
  return (
    <article className="project-card">
      <ExternalLink href={projectHref(project)} className="project-description">
        <ProjectPreview
          project={project}
          tall={tall}
          sizes={wide ? "(max-width: 800px) 100vw, 800px" : undefined}
        />
        <div className="project-copy">
          <h2>{project.title}</h2>
          <span className="project-category">
            {groupOf(project)} <span> / </span> {project.category}
          </span>
          <p>{project.description}</p>
        </div>
      </ExternalLink>
      <div className="project-actions">
        <button
          className="icon-button save-button"
          aria-label={`${saved ? "Unsave" : "Save"} ${project.title}`}
          aria-pressed={saved}
          onClick={() => onSave(project.path)}
        >
          <Icon name="bookmark" />
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
