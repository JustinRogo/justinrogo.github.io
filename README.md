# justinrogo.github.io

Personal GitHub Pages site for Justin Rogowski. The site functions as a polished link hub, project showcase, utility dashboard, and sandbox for library, technology, data, and web experiments.

Live site: https://justinrogo.github.io/

## Overview

This repository powers a static website built with HTML, CSS, vanilla JavaScript, and two React islands on the homepage. The homepage brings together professional quick links, scheduling tools, UConn Law Library resources, project pages, personal productivity widgets, and experimental web apps.

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

The site builds its page tree from `data/pages.json`, which defines each page's title, category, short description, source path, and optional external destination. This keeps navigation content, ordering, and external links independent of the repository API.

Folder index pages are automatically treated as parents of the other pages in the same folder. For example, the UCPEA member dashboard is the parent of the UCPEA contract and salary tools.

### UConn Law Library search widget

The homepage includes a custom search widget for:

- Books & More
- Journals
- Databases
- Course Reserves
- Research Guides

The widget builds search queries for UConn Law’s Primo discovery interface and LibGuides.

### The Pocket Part blog

The homepage reads the four newest blog posts from `data/pocket-part.json` on this site. Run `node scripts/update-pocket-part.mjs` to refresh that file directly from UConn's RSS feed; no third-party conversion service is needed.

The GitHub Pages workflow refreshes the feed on deployment and on its existing twice-hourly schedule. It caches the latest successful snapshot between builds and keeps the saved posts when UConn is unavailable. The checked-in snapshot provides a fallback if the cache expires. The Vercel build also refreshes the feed, falling back to the checked-in snapshot on failure.

### Theme and visual design

The site uses a custom CSS system with:

- Dark and light modes
- UConn-inspired color tokens
- Glassmorphism cards
- Aurora background glows
- Responsive grid layout
- Accessible tab interactions
- Mobile-friendly quick contact buttons

The homepage adapts [React Bits Spotlight Card](https://reactbits.dev/components/spotlight-card) into pointer lighting on the Pages & Projects collection rows. Its moving widget-tab selection is inspired by [Gooey Nav](https://reactbits.dev/components/gooey-nav), with a simple sliding highlight in place of particles. React hooks now manage both effects using the existing CSS. Pointer lighting is limited to mouse input and stops under reduced motion; keyboard users receive a static highlight and focus outline. The tab indicator follows the mobile grid and disables movement under reduced motion. Attribution and the upstream license remain in [`assets/react-bits-LICENSE.txt`](assets/react-bits-LICENSE.txt).

The profile, two sidebar cards, Pages & Projects, widget deck and Quick Links use the actual [React Bits Glass Surface](https://reactbits.dev/components/glass-surface) component, vendored in `src/homepage/vendor/` at revision `e12c22192ac7b4b452c5e2feb9b586d74765d696`. Its only source modification namespaces the displacement primitive IDs so several instances can coexist. The upstream license is retained in `assets/react-bits-LICENSE.txt` and attribution is included in the generated bundle notices.

`GlassMaterial.jsx` places the component in a decorative, inert layer behind each card's content. This keeps text, iframes, forms, native disclosures and existing event handlers separate from the refraction effect. Existing HTML cards expose empty `data-glass-material` slots; React owns only these slots. Theme integration is in `glass-material.css`, separate from the upstream stylesheet. SVG refraction is enabled on desktop with a fine pointer; mobile, reduced motion and upstream browser compatibility checks select the frosted fallback. Higher contrast, reduced transparency and forced colors use an opaque material. The glass material adds no WebGL loop, dependency or external runtime.

### Shape Waves background

`SiteBackground.jsx` owns the fixed `#site-background` island. It uses the official React Bits [Shape Waves](https://reactbits.dev/backgrounds/shape-waves) component, vendored at revision `e12c22192ac7b4b452c5e2feb9b586d74765d696`. The exported `SHAPE_WAVES_SETTINGS` constant preserves the shared URL: empty text, text size 0.24, mixed shapes, background `#00173a`, shape color `#913d00`, hover `#f97316`, direction 175, glow 1.75, flow 2.3, fade 0.3, brightness 0.48, splash strength 0.75, splash radius 28, dot size 0.58, cell size 8, scale 1.6, contrast 3 and speed 0.7.

Shape Waves uses WebGPU through the pinned `vgpu@0.3.1` dependency, bundled locally with the homepage. Local source changes report readiness/failure, cap device pixel ratio at 1.5 with a 2.4-million-pixel budget, and suspend rendering in hidden tabs or offscreen. Fine pointers trigger the upstream ripple interaction through the page without intercepting links, forms or scrolling. Touch retains the autonomous wave motion. The dark theme displays the supplied colors directly; the light theme softens the backdrop through CSS opacity.

Reduced motion uses a deterministic, still 2D approximation of the shape bands with the same palette, grid and edge fade, without a GPU context or animation loop. This pattern also appears if WebGPU is unavailable, initialization fails or the GPU device is lost. A reload retries WebGPU after device loss. Higher contrast and forced colors hide the decorative background. Upstream attribution remains in `assets/react-bits-LICENSE.txt`; the build copies the bundled GPU dependencies' MIT licenses alongside the static assets.

`site-background.css` controls layering and light-theme opacity. No client-side route or server is required.

### Homepage React components and ownership

The homepage has two independent roots, `#project-directory-root` and `#widget-tabs-root`, mounted by [`src/homepage/index.jsx`](src/homepage/index.jsx). No router is used; all existing page paths and external links remain normal links.

- `ProjectDirectory.jsx` renders the three native `<details>` collections and recursive page links. `page-tree.js` loads and validates `data/pages.json`, preserves folder/index grouping and carries the curated fallback formerly in `main.js`. File previews, failed/invalid manifests and requests stalled for ten seconds use that fallback.
- `WidgetTabs.jsx` owns the five main tabs, roving keyboard focus, panel visibility, request form, success redirect and lazy iframe URLs. Visited panels stay mounted, preserving iframe sessions, form values and nested widget state. The profile's existing `#viewStrengthsBtn` is connected through one effect with cleanup.
- `effects.js` owns spotlight listeners and moving-indicator geometry. Its observers, animation frames and media-query listeners are cleaned up. Indicator motion is cancelled and measured again during rapid switching, font loading and resizing.
- `legacy-widgets.js` exports the existing CliftonStrengths and library catalog initializers. `LegacyWidget` gives each initializer an empty host; React never reconciles that host's descendants. Initializers run once per mount and return cleanup, including the strengths resize observer and delegated listeners. The strengths initializer also updates the existing profile domain bar.

`main.js` continues to own theme/share controls, clock/weather, feeds, profile disclosures, contact menu and companion. It contains no directory, main-tab, request-form, nested-widget or background initializer. `style.css` remains the shared layout and base-material source; Glass Surface and Shape Waves styles are bundled separately.

### Development and builds

Use Node.js 22 or newer:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:4388/`. The existing Updates development server also compiles and watches React sources and imported CSS with esbuild; refresh the browser after editing. `/updates?preview=1` remains available without database credentials. Plain HTML/CSS/legacy JS edits are served directly. Build before opening `index.html` via `file://` so `assets/homepage.js` and `assets/homepage.css` exist.

```sh
npm run build:homepage          # Compile just the production homepage bundle
npm run build                  # Full dist/ build; refreshes Pocket Part
npm run build -- --skip-feed    # Reproducible build using the existing feed
npm run preview                # Serve dist/ statically on port 4391
npm run test:homepage          # Build with --skip-feed and run browser checks
npm run test:updates           # Backend, sanitization and database-policy tests
```

The browser suite uses installed Microsoft Edge on Windows; elsewhere run `npx playwright install chromium` first. `HOMEPAGE_BROWSER_CHANNEL` can select another installed Chromium channel. It checks the production artifact across desktop/tablet/mobile widths and both themes, keyboard/touch, native disclosures, lazy frames, form state, manifest failure/loading, reduced motion, rapid switching, resizing, preserved page URLs and Updates assets. Screenshots and failure traces go to ignored `test-results/`. Third-party responses are stubbed and form submissions intercepted; external service availability and real submissions require separate live checks.

The existing esbuild dependency compiles JSX and bundles React/React DOM into a local IIFE, with no CDN or client router. Generated `assets/homepage.js`, `assets/homepage.css`, their license notices and dependency license files are ignored in Git and rebuilt by development and production commands. GitHub Pages installs dependencies with `npm ci`, keeps its scheduled feed refreshes, and runs the same static build as Vercel. Set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**, so GitHub publishes the built artifact rather than the raw branch. All public assets are copied into `dist/`; source, environment files and backend code are excluded. GitHub Pages needs only those static files. Vercel continues to use `api/updates.mjs` and the existing `/updates` rewrites in `vercel.json`.

## Notable project pages

### Updates channel

The Vercel-hosted `/updates` section adds rich text posts, author-only publishing, drafts, reader comments that publish immediately, image uploads, and RSS. `/updates/embed` is a compact read-only iframe for `https://uconn.atlassian.net`. This feature requires a **separate Supabase project** and Vercel environment variables; setup and the existing-project comment migration are documented in [`docs/updates-setup.md`](docs/updates-setup.md).

Run `npm ci` and `npm run dev`, then visit `/updates?preview=1` for a labeled local author preview without database credentials. Both deployment hosts run the shared build, which bundles homepage React and Updates dependencies and preserves the public site roots.

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

### UCPEA Member Dashboard

Path: `Pages/Work/UCPEA/index.html`

A member-focused dashboard with current UCPEA updates, a task-based help launcher, benefits deadline planning, an eligibility-aware salary and pay-band tool, quick access to the searchable contract, and links to official benefits and support resources. A dependency-free feed adapter refreshes the latest public Union Wire posts during each deployment and scheduled site update.

### UCPEA Contract Page

Path: `Pages/Work/UCPEA/UCPEAContract.html`

A web version or reference page for UCPEA contract information.

### Evolutionary Flocking Ecosystem

Path: `Pages/For Fun/Birds.html`

A browser-based canvas experiment simulating flocking behavior and ecosystem-style movement.

### Game of Life - Ultimate Cosmos

Path: `Pages/For Fun/Game-of-Life.html`

A stylized interactive version of Conway’s Game of Life with a cosmic visual theme.

### WFC Studio

Path: `Pages/For Fun/Wave-Function-Collapse.html`

A dependency-free, tile-based Wave Function Collapse playground inspired by [Maxim Gumin’s original project](https://github.com/mxgmn/WaveFunctionCollapse). Generate circuits, islands, or ribbon loops; pause, step, guide a cell by clicking or with the keyboard, replay deterministic seeds, and download the canvas as a PNG. The URL records the world, grid detail, and seed for sharing. Reduced-motion preferences start the playground paused.

The original JavaScript engine uses weighted Shannon entropy and adjacency propagation with closed boundaries for the built-in worlds. “Paint your own” adds a 24 × 24 pixel editor with eight starting color swatches, a picker for any drawing color, pencil, fill, erase, and undo. Picking a custom color keeps existing swatches and pixels intact; used custom colors also become swatches. Earlier 12 × 12 drawings load as 2 × 2 blocks per pixel, preserving their colors and shape while making room for finer edits. The overlapping model learns weighted 2 × 2 or 3 × 3 patches from that sample; optional rotations expand the learned patterns. Sample edges wrap when learning, and custom output has open boundaries. Every fully generated patch comes from the learned patterns.

Paintings and learning settings are saved in local storage when available, and the custom world URL includes the drawing and palette for sharing. Generation and retries use a snapshot; repainting while a world runs leaves that world intact, and Replay repeats the original snapshot. Contradictions trigger deterministic retries, capped at 24. Tile selection and painting set up the next generation; speed and display overlays apply immediately. No source code or artwork from the reference repository is bundled. Supporting files live in `Pages/For Fun/Wave-Function-Collapse/`.

Run the engine checks with `node --test tests/wfc.test.cjs`.

The page's typography, control spacing, and interactions were refreshed using [Taste Skill's existing-project redesign guide](https://github.com/Leonxlnx/taste-skill/blob/main/skills/redesign-skill/SKILL.md). Fonts and icons are served locally with their licenses. See `Pages/For Fun/Wave-Function-Collapse/DESIGN.md` for the design audit and asset sources.

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
