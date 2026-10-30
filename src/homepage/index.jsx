import { createRoot } from 'react-dom/client';
import { ProjectDirectory } from './ProjectDirectory.jsx';
import { WidgetTabs } from './WidgetTabs.jsx';
import { GlassMaterial } from './GlassMaterial.jsx';
import { SiteBackground } from './SiteBackground.jsx';

const directory = document.getElementById('project-directory-root');
const widgets = document.getElementById('widget-tabs-root');
if (directory) createRoot(directory).render(<ProjectDirectory />);
if (widgets) createRoot(widgets).render(<WidgetTabs />);
const background = document.getElementById('site-background');
if (background) createRoot(background).render(<SiteBackground />);

// These empty, decorative slots are the only React-owned children of the
// legacy cards. Existing profile/sidebar/link markup and handlers stay put.
document.querySelectorAll('[data-glass-material]').forEach(slot => {
  createRoot(slot).render(<GlassMaterial />);
});
