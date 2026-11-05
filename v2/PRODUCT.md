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

V2 is the root homepage, with `/v2/` retained for existing links. V1’s original HTML lives at `/original.html` alongside its existing CSS and JavaScript, so its relative URLs and integrations continue to resolve. V2 rendering, state and styles belong to `v2/`. Shared vendored React Bits sources and font files are read-only imports.

`data/pages.json` remains the project source of truth. Professional copy and strengths come from the existing homepage and source; no credentials or accomplishments are invented. The build extracts all 34 strengths and both best/overextended reflection passages from V1’s source without invoking its DOM initializer. About includes the four original domain colors and a rank-weighted overview of all 34 themes, using 35 − rank points; Top 5/10/34 controls do not change that overview. The existing portrait is downloaded unchanged with provenance recorded alongside it.

`data/pocket-part.json` and `data/cards_count.json` are existing snapshots. The blog displays its generation date; task counts are explicitly labeled as a saved snapshot. Weather, GitHub commits and events make read-only browser requests with timeouts, failure messages and direct source access. API results cache for the current app session and refresh on reload. External services may fail, require cookies, restrict embedding, or rate-limit requests.

## State and safety

URL hashes own destinations and project search/filter state so static hosting refreshes and browser history work. Saved projects and theme/motion/background preferences persist under V2-specific localStorage keys. Visited views and tool panels preserve in-memory drafts and loaded embeds. Request previews dismiss on route or panel changes; drafts persist until reload, without being written to localStorage.

V2 request forms have no external submission endpoint. “Preview request” validates and displays a local draft. Sending a real request requires deliberately opening V1 and selecting its request form. Booking and calendar embeds load only after explicit interaction. Automated tests intercept third-party traffic and block writes; the optional live smoke check uses GET only.

## Accessibility and performance

One semantic navigation tree becomes a fixed labeled bottom dock on phones, respecting safe areas and reserving content space. Larger screens use a side rail. Native links retain browser behavior. View changes focus the destination heading and restore view scroll positions. Dialogs support focus containment, Escape, focus return, and scroll restoration.

Respect system reduced motion, high contrast, forced colors, touch input and the optional Calm mode. Effects are optional; core content remains available without them. Featured cards present CT General Statutes Explorer, Law Library Heatmap, and AI Corner Updates using existing manifest descriptions and destinations. Tech Text and Magic Bento run while interacting and stop when hidden or Calm mode is active. Glass Surface uses its SVG renderer with an inert backdrop layer. Shape Waves and Antigravity reuse the existing WebGPU/WebGL background engines with static fallbacks and bounded rendering. Reuse React 19, esbuild and GSAP with no new dependencies, backend, accounts or paid services.

## Annotated navigation refinement

Desktop branches live in the sidebar below the main destinations, with Projects, Work, UCPEA, For Fun, Useful shortcuts, and all 11 Quick Links. The three original directory collections expose all 15 pages using shared manifest titles and destinations; they start collapsed and open through native buttons. Only the middle rail region scrolls; contact/settings stay outside it. At 800px and below, branches move to More and the labeled main navigation stays accessible. The hero interaction hint and portrait caption were removed at the user’s request. The Updates featured-title alias is V2-only; the shared manifest is unchanged.

UCPEA Member Dashboard is first in its branch, with Current Contract, Contract History, and Contract Comparison nested beneath its direct link. The shortened contract names are V2-only labels over the same manifest destinations. The hierarchy uses semantic nested lists and preserves normal link and keyboard behavior on desktop and mobile.

The desktop sidebar defaults to 240px and supports saved pointer/keyboard resizing between 200px and a viewport-limited 360px. Compact navigation remains fixed in size. Box corner radii are halved throughout V2; circular portraits and orbit geometry remain circular. Four portrait controls open calendar, email, Teams chat, and telephone destinations. The four-color strengths bar below the photo opens `#/about?section=strengths` and focuses the destination heading. Calendar/booking embeds remain opt-in; the former cookie/sign-in UI disclaimer is removed.

About’s introduction adds LinkedIn/GitHub buttons using existing contact URLs. “Let’s connect” in the sidebar opens and focuses “Say hello” at `#/about?section=contact`; the sidebar original-site link and prototype label are removed. The footer retains original-site access.

Page background settings reuse the original Shape Waves, Antigravity, Fractal, and Aurora implementations, retain V2 Orbits, and offer None. Device default uses Shape Waves on desktop (>800px), Aurora on compact screens. Explicit choices persist in V2 preferences; legacy disabled-atmosphere settings remain disabled. One selected renderer mounts, motion pauses during assembly/hidden-page states, Calm/reduced motion use still fallbacks, and contrast/reduced-transparency preferences hide decorative backgrounds. V2 owns the settings, theme, lifecycle and host styles; V1’s body observer and controller never run in V2.

## Homepage assembly experiment

Home optionally opens with a finite team-of-cursors construction sequence on its actual components. Layout works alone first, drawing persistent structural outlines; Theme, Content, Details, and Projects then join to fill them with the real interface. The slower sequence lasts about six seconds on desktop and five on phones, with five/four agents respectively. No mock interface or remount is used. Autoplay runs once per page load, including reloads, with a header replay control and persistent Homepage assembly switch. Returning to Home through navigation does not replay it. User interaction and layout changes immediately hand off to the ordinary page. Reduced motion, Calm, increased contrast, and forced colors bypass it. Ambient motion pauses during construction. The system uses the existing GSAP dependency and leaves V1 and deployment unchanged. See ASSEMBLY.md for configuration and verification.
