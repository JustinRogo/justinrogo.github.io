// V2 only. Times below are fractions of the configured duration.
export const assemblyConfig = Object.freeze({
  enabled: true,
  cursorCount: 5,
  mobileCursorCount: 4,
  duration: 5800,
  mobileDuration: 4800,
  crewEntry: 0.35,
  intensity: 0.7,
  oncePerLoad: true,
  oncePerBrowser: true,
  colors: ["#ff9d5c", "#6bafff", "#5de1c5", "#bf9aff", "#ff90bc", "#ead777"],
  labels: ["Layout", "Theme", "Content", "Details", "Projects", "Connect"],
});

// Layout's measured outlines persist until the real surface is filled in.
export const layoutTasks = [
  { id: "topbar", at: 0.04, duration: 0.045 },
  { id: "hero-frame", at: 0.12, duration: 0.12 },
  { id: "shell", at: 0.27, duration: 0.065 },
  { id: "featured-0", at: 0.39, duration: 0.045 },
  { id: "featured-1", at: 0.46, duration: 0.035 },
  { id: "featured-2", at: 0.52, duration: 0.03 },
  { id: "featured-3", at: 0.57, duration: 0.03 },
].map((task) => ({ ...task, cursor: 0, effect: "trace", wireframe: true }));

export const assemblyTasks = [
  { id: "shell", cursor: 1, at: 0.38, duration: 0.055, effect: "surface" },
  { id: "navigation", cursor: 3, at: 0.42, duration: 0.08, effect: "links" },
  { id: "hero-frame", cursor: 1, at: 0.47, duration: 0.08, effect: "surface" },
  { id: "hero-title", cursor: 2, at: 0.49, duration: 0.1, effect: "text" },
  { id: "portrait", cursor: 3, at: 0.56, duration: 0.06, effect: "place" },
  { id: "topbar", cursor: 1, at: 0.6, duration: 0.04, effect: "surface" },
  { id: "hero-role", cursor: 2, at: 0.63, duration: 0.05, effect: "text" },
  { id: "help", cursor: 2, at: 0.61, duration: 0.02, effect: "place" },
  { id: "my-day", cursor: 3, at: 0.63, duration: 0.02, effect: "place" },
  {
    id: "featured-heading",
    cursor: 4,
    at: 0.64,
    duration: 0.045,
    effect: "text",
  },
  { id: "hero-actions", cursor: 3, at: 0.66, duration: 0.06, effect: "place" },
  {
    id: "hero-description",
    cursor: 2,
    at: 0.72,
    duration: 0.07,
    effect: "text",
  },
  { id: "featured-0", cursor: 4, at: 0.7, duration: 0.07, effect: "place" },
  { id: "featured-1", cursor: 1, at: 0.72, duration: 0.06, effect: "place" },
  { id: "branches", cursor: 3, at: 0.76, duration: 0.06, effect: "links" },
  { id: "featured-2", cursor: 4, at: 0.82, duration: 0.05, effect: "place" },
  { id: "notes", cursor: 1, at: 0.83, duration: 0.06, effect: "place" },
  { id: "featured-3", cursor: 3, at: 0.88, duration: 0.04, effect: "place" },
  { id: "footer", cursor: 1, at: 0.93, duration: 0.025, effect: "surface" },
  { id: "pocket-part", cursor: 5, at: 0.94, duration: 0.025, effect: "place" },
];
