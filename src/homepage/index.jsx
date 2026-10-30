import { createRoot } from 'react-dom/client';
import { ProjectDirectory } from './ProjectDirectory.jsx';
import { WidgetTabs } from './WidgetTabs.jsx';

const directory = document.getElementById('project-directory-root');
const widgets = document.getElementById('widget-tabs-root');
if (directory) createRoot(directory).render(<ProjectDirectory />);
if (widgets) createRoot(widgets).render(<WidgetTabs />);
