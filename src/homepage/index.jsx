import { createRoot } from 'react-dom/client';
import { ProjectDirectory } from './ProjectDirectory.jsx';
import { WidgetTabs } from './WidgetTabs.jsx';
import { GlassMaterial } from './GlassMaterial.jsx';
import { SiteBackground } from './SiteBackground.jsx';
import { ContactGlare, ProfileName } from './ProfileMotion.jsx';

const directory = document.getElementById('project-directory-root');
const widgets = document.getElementById('widget-tabs-root');
if (directory) createRoot(directory).render(<ProjectDirectory />);
if (widgets) createRoot(widgets).render(<WidgetTabs />);
const background = document.getElementById('site-background');
if (background) createRoot(background).render(<SiteBackground />);

const name = document.getElementById('profile-name-root');
if (name) createRoot(name).render(<ProfileName text={name.textContent} />);
document.querySelectorAll('[data-contact-glare]').forEach(slot => {
  createRoot(slot).render(<ContactGlare link={slot.closest('a')} />);
});

// Empty decorative slots keep the card material separate from the existing
// profile/sidebar/link content and handlers.
document.querySelectorAll('[data-glass-material]').forEach(slot => {
  createRoot(slot).render(<GlassMaterial />);
});
