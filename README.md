# justinrogo.github.io

Personal GitHub Pages site for Justin Rogowski. The site functions as a polished link hub, project showcase, utility dashboard, and sandbox for library, technology, data, and web experiments.

Live site: https://justinrogo.github.io/

## Overview

This repository powers a static GitHub Pages website built with HTML, CSS, and vanilla JavaScript. The homepage brings together professional quick links, scheduling tools, UConn Law Library resources, project pages, personal productivity widgets, and experimental web apps.

The site includes:

- A profile and quick-contact landing page
- Calendar, booking, request, CliftonStrengths, and catalog-search tabs
- Searchable quick links
- A dynamically generated page tree for project pages
- UConn Law Library catalog, journals, databases, course reserves, and LibGuides search
- Hartford weather and local time widgets
- UConn Law events feed
- Work-related tools and prototypes
- Interactive “for fun” web experiments

## Repository structure

```text
.
├── index.html
├── style.css
├── main.js
├── data/
│   ├── cards_count.json
│   └── pages.json
└── Pages/
    ├── For Fun/
    │   ├── Birds.html
    │   ├── Game-of-Life.html
    │   └── StrategicFramework2.html
    └── Work/
        ├── Library/
        │   ├── heatmap.html
        │   └── Timeline_LawLib.html
        ├── UCPEA/
        │   ├── index.html
        │   ├── salary_calculator.html
        │   └── UCPEAContract.html
        └── cgs/
            ├── index.html
            ├── app.js
            ├── styles.css
            ├── sw.js
            ├── README.md
            └── data/
```

## Main site features

### Homepage

The homepage is the main landing page for the site. It includes Justin’s profile, UConn Law Library links, quick contact buttons, embedded scheduling tools, and a project/page directory.

Key homepage areas include:

- Profile card
- Share button
- Light/dark theme toggle
- Law Library donation link
- Trello/request status
- Hartford time and weather
- UConn Law events
- Calendar, booking, request, CliftonStrengths, and catalog tabs
- Quick links
- Dynamic page tree

### Dynamic page tree

The site builds its page tree from `data/pages.json`, which defines each page's title, source path, and optional external destination. This keeps navigation ordering and external links independent of the repository API.

Folder index pages are automatically treated as parents of the other pages in the same folder. For example, the UCPEA member dashboard is the parent of the UCPEA contract and salary tools.

### UConn Law Library search widget

The homepage includes a custom search widget for:

- Books & More
- Journals
- Databases
- Course Reserves
- Research Guides

The widget builds search queries for UConn Law’s Primo discovery interface and LibGuides.

### Theme and visual design

The site uses a custom CSS system with:

- Dark and light modes
- UConn-inspired color tokens
- Glassmorphism cards
- Aurora background glows
- Responsive grid layout
- Accessible tab interactions
- Mobile-friendly quick contact buttons

## Notable project pages

### CT General Statutes Explorer

Live site: `https://uconn-law-library.github.io/CGS/#/`

A static, installable web app for browsing and searching the Connecticut General Statutes, subject index, and infractions schedule. The former `Pages/Work/cgs/` entry point redirects to the project's new repository site.

Features include:

- Browse statutes by title, chapter, and section
- Search statute metadata and full text
- Browse the official subject index
- Browse infractions schedule data
- Bookmark sections locally
- Theme, text-size, and density controls
- Progressive Web App support
- Offline caching through a service worker

See the dedicated project documentation:

```text
Pages/Work/cgs/README.md
```

### Occupancy Heatmap Dashboard

Path: `Pages/Work/Library/heatmap.html`

A visual dashboard prototype for library occupancy or space-use data.

### UConn School of Law Library Centennial Timeline

Path: `Pages/Work/Library/Timeline_LawLib.html`

An interactive timeline page for the UConn School of Law Library’s centennial history.

### UCPEA Salary Increase Calculator

Path: `Pages/Work/UCPEA/salary_calculator.html`

A calculator for estimating salary changes based on scheduled wage increases, optional merit amount, and optional reclassification percentage.

### UCPEA Member Dashboard

Path: `Pages/Work/UCPEA/index.html`

A member-focused dashboard with current UCPEA updates, quick access to the searchable contract and salary calculator, and links to official benefits and support resources. A dependency-free feed adapter refreshes the latest public Union Wire posts during each deployment and scheduled site update.

### UCPEA Contract Page

Path: `Pages/Work/UCPEA/UCPEAContract.html`

A web version or reference page for UCPEA contract information.

### Evolutionary Flocking Ecosystem

Path: `Pages/For Fun/Birds.html`

A browser-based canvas experiment simulating flocking behavior and ecosystem-style movement.

### Game of Life - Ultimate Cosmos

Path: `Pages/For Fun/Game-of-Life.html`

A stylized interactive version of Conway’s Game of Life with a cosmic visual theme.

## Running locally

Because the site uses JavaScript `fetch()` calls, embedded resources, and dynamic page loading, it should be served over HTTP rather than opened directly from the file system.

From the repository root:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

To stop the local server, press:

```text
Ctrl + C
```

## Development notes

This is a static site. There is currently no build step, package manager, or framework requirement for the root site.

Typical edits:

- Update homepage structure in `index.html`
- Update visual styling in `style.css`
- Update widgets, page tree behavior, tabs, search, weather, and events logic in `main.js`
- Add new standalone pages under `Pages/` and list them in `data/pages.json`
- Add or update generated/static data under `data/`

When a folder contains an `index.html` entry in the manifest, the homepage automatically renders that page as the parent of the folder's other listed pages.

## Data and external services

The site references several external services and APIs, including:

- GitHub Pages
- GitHub repository tree API
- UConn Law Library Primo discovery
- UConn LibGuides
- UConn Law events RSS feed
- Open-Meteo weather API
- Microsoft Outlook calendar and Bookings embeds
- Trello board/request workflow

Some widgets may fail gracefully if a third-party service blocks embedding, changes its API, or is temporarily unavailable.

## Maintenance checklist

When updating the site:

1. Test the homepage locally.
2. Confirm all homepage tabs open correctly.
3. Check that the page tree loads.
4. Test dark/light theme toggling.
5. Test quick-link filtering.
6. Confirm major project links still resolve.
7. Review mobile layout.
8. Check console errors in browser developer tools.
9. If editing the CGS project, review its dedicated README first.
10. After deployment, test the live GitHub Pages site.

## Accessibility notes

The homepage uses semantic regions, ARIA labels, keyboard-accessible tabs, lazy-loaded iframes, descriptive link text, and visible focus behavior in several interactive components.

Future improvements could include:

- Adding a skip link
- Auditing color contrast in both themes
- Reducing inline styles where possible
- Adding more descriptive headings for embedded widgets
- Running Lighthouse or axe accessibility checks

## Known issues and cleanup ideas

- Confirm that internal links use the correct deployed path structure, especially links that point to `/Work/...` instead of `/Pages/Work/...`.
- Consider moving large inline scripts or styles in standalone pages into separate files as projects grow.
- Consider adding a short description comment at the top of each standalone page.
- Consider adding a project index page if the number of pages continues to expand.
- Consider adding a root-level license.

## License

No license is currently specified.

## Author

Justin Rogowski  
Library Information Coordinator  
University of Connecticut School of Law
