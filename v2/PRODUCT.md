# Personal website V2

An independent, functional React prototype of Justin Rogowski’s personal site, combining professional identity, portfolio, useful library tools, and creative experiments. Visitors include colleagues, collaborators, library users, and people exploring his code.

The user delegates design selection and requests an intentional app experience on phones and an editorial desktop experience. The user’s revision explicitly pins the React glass aesthetic, blue/orange palette, and a flashy interactive experience using Tech Text, Branched Menu, Glass Surface and Magic Bento. That direction replaces the earlier warm-gray working notebook. This context applies only to `v2/`.

## Routes and tasks

- `#/home`: identity, introduction, selected projects, interactive Tech Text name and Magic Bento featured work, contact actions.
- `#/projects`: searchable index, All/Work/Library/For Fun filters, direct project links, saved projects.
- `#/tools?panel=catalog|calendar|booking|request|resources`: library search, scheduling, request draft preview, quick links.
- `#/about`: professional practice, selected experience, leadership, education, tools, interests, all 34 CliftonStrengths themes, contact links.
- `#/more`: task snapshot, weather, library blog, GitHub commits, UConn Law events, appearance settings.

## Preservation and source truth

V1’s root HTML, CSS, JavaScript, React sources, project pages, URLs, integrations and deployment rewrites stay unchanged. All V2 rendering, state and styles belong to `v2/`; shared vendored React Bits sources and font files are read-only imports. The only existing files changed are additive npm commands and the main build’s additional V2 step/public output copy. Work remains on `feature/website-v2`; no merge or deployment is authorized.

`data/pages.json` remains the project source of truth. Professional copy and strengths come from the existing homepage and source; no credentials or accomplishments are invented. The build extracts all 34 strengths from V1’s source without invoking its DOM initializer. The existing portrait is downloaded unchanged with provenance recorded alongside it.

`data/pocket-part.json` and `data/cards_count.json` are existing snapshots. The blog displays its generation date; task counts are explicitly labeled as a saved snapshot. Weather, GitHub commits and events make read-only browser requests with timeouts, failure messages and direct source access. API results cache for the current app session and refresh on reload. External services may fail, require cookies, restrict embedding, or rate-limit requests.

## State and safety

URL hashes own destinations and project search/filter state so static hosting refreshes and browser history work. Saved projects and theme/motion/background preferences persist under V2-specific localStorage keys. Visited views and tool panels preserve in-memory drafts and loaded embeds. Request previews dismiss on route or panel changes; drafts persist until reload, without being written to localStorage.

V2 request forms have no external submission endpoint. “Preview request” validates and displays a local draft. Sending a real request requires deliberately opening V1 and selecting its request form. Booking and calendar embeds load only after explicit interaction. Automated tests intercept third-party traffic and block writes; the optional live smoke check uses GET only.

## Accessibility and performance

One semantic navigation tree becomes a fixed labeled bottom dock on phones, respecting safe areas and reserving content space. Larger screens use a side rail. Native links retain browser behavior. View changes focus the destination heading and restore view scroll positions. Dialogs support focus containment, Escape, focus return, and scroll restoration.

Respect system reduced motion, high contrast, forced colors, touch input and the optional Calm mode. Effects are optional; core content remains available without them. Featured cards present CT General Statutes Explorer, Law Library Heatmap, and AI Corner Updates using existing manifest descriptions and destinations. Tech Text and Magic Bento run while interacting and stop when hidden or Calm mode is active. CSS atmospheric drift pauses with visibility and motion settings. Glass Surface uses the SVG renderer with an inert backdrop layer; no WebGL renderer is used. Reuse React 19, esbuild and GSAP with no new dependencies, backend, accounts or paid services.

## Annotated navigation refinement

Desktop branches live in the sidebar below the main destinations, with Projects, Work, UCPEA, For Fun, Useful shortcuts, and all 11 Quick Links. The three original directory collections expose all 15 pages using shared manifest titles and destinations; they start collapsed and open through native buttons. Only the middle rail region scrolls; contact/settings stay outside it. At 800px and below, branches move to More and the labeled main navigation stays accessible. The hero interaction hint and portrait caption were removed at the user’s request. The Updates featured-title alias is V2-only; the shared manifest is unchanged.

## Homepage assembly experiment

Home optionally opens with a finite team-of-cursors construction sequence on its actual components. Layout works alone first, drawing persistent structural outlines; Theme, Content, Details, and Projects then join to fill them with the real interface. The slower sequence lasts about six seconds on desktop and five on phones, with five/four agents respectively. No mock interface or remount is used. Autoplay runs once per session, with a header replay control and persistent Homepage assembly switch. User interaction and layout changes immediately hand off to the ordinary page. Reduced motion, Calm, increased contrast, and forced colors bypass it. Ambient motion pauses during construction. The system uses the existing GSAP dependency and leaves V1 and deployment unchanged. See ASSEMBLY.md for configuration and verification.
