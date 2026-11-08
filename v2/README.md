# Justin Rogowski · Website V2

V2 is the React homepage at `https://justinrogo.github.io/`. Existing `/v2/` bookmarks open the same app. The original homepage is available at `/original.html`.

## Direction

The current direction follows Justin’s explicit revision: **blue/orange glass**, expressive motion, and substantial use of the linked React Bits implementations. Deep navy and ice-blue themes use translucent refractive surfaces, orange primary actions, orbital geometry, a pointer-reactive Tech Text name, and a Magic Bento selection of actual projects. The earlier warm-gray notebook treatment has been replaced.

Featured work leads with CT General Statutes Explorer, followed by Law Library Heatmap and AI Corner Updates, using the existing manifest destinations. Each shows its existing project screenshot through the shared ProjectPreview component. The statutes card uses a small section-sign emblem in place of its former oversized book/CT artwork.

Desktop and tablet navigation docks flush to the left edge at full viewport height, with square outer corners and centered Settings. The workspace begins at its right edge; phones retain five labeled destinations in a glass bottom dock. A real Branched Menu sits below the main desktop sidebar navigation and exposes project filters, the original Work (5 pages), UCPEA (4 pages), and For Fun (6 pages) collections, tool shortcuts, and all 11 Quick Links as normal links. Page titles and destinations come from the shared manifest. Its scroll area keeps contact/settings reachable when branches expand. On phones and compact tablets, the same branches are available in More. The directory remains an efficient searchable list, while Home gets the more expressive composition.

The UCPEA branch puts Member Dashboard first, with Current Contract, Contract History, and Contract Comparison nested underneath. These shortened sidebar labels preserve the original destinations and leave the project directory's manifest titles unchanged.

The desktop rail now defaults to 240px. Drag its right edge or focus the separator and use Left/Right arrows to resize; Shift makes larger steps, Home/End select the limits, and Enter or double-click resets it. Width persists across visits. Compact navigation still takes over below 801px. V2 box corners are half their original radius, while the photo remains circular.

A button beside the desktop wordmark collapses the rail to a 72px icon-only navigation. The choice persists separately from the expanded width, which is restored on expansion. Navigation links retain accessible names and hover titles; contact and settings stay reachable. Tablet and phone navigation retain their existing responsive layouts.

Home’s former “Around here lately” panel is replaced by the live UConn Law events feed in the official React Bits Carousel. The requested preset uses autoplay, arrows, pause on hover, 16px corners, square cards, and no outer frame. The component is centered at a maximum width of 340px, advances every eight seconds, and includes native dot indicators (a compact slide count on phones), swipe gestures, and keyboard navigation. Every card remains a native event link with a centered title, optional uncropped poster beneath it, and Eastern date/time below the square. There is no added UConn Law card label or duplicate selected-event footer. A pause/play button sits directly beside the carousel navigation and provides persistent playback control; keyboard focus also pauses autoplay. Calm mode, reduced motion, high contrast, and hidden views stop autoplay, while manual navigation remains available without animation when motion is disabled. This DOM carousel replaces the previous WebGL Circular Gallery and its generated card textures. Missing/failed images leave the title and date visible. Empty/error states retain the full calendar link and errors offer a retry. More shares the same feed parser and cache.

The events section opens with a visible “UConn Law Events” heading and has no surrounding surface, border, or shadow. Cards sit directly over the page background, with the centered View Event Calendar link underneath. At viewport widths of 1200px and above, events sit beside The Pocket Part; the event column stays in view while the blog stacks when the viewport is tall enough. Smaller screens show the feeds vertically. Other glass surfaces retain their existing appearance and accessibility preferences.

The former “Have a good problem?” contact block is replaced by The Pocket Part blog feed using React Bits Scroll Stack. Four saved posts become native links with a 50/50 featured-image and date/title split: side by side on desktop, alternating image left/right with each post, and image above text on phones. Without a working image, text uses the full card. The feed refresh now reads each article’s featured-image metadata, preferring it to inline RSS images, and preserves saved images if article retrieval fails. The browser loads the same local snapshot used by More, without cross-origin article requests. Calm/reduced-motion/high-contrast modes show an ordinary list of cards. Empty/error states keep the full-blog link and errors offer retry.

The portrait has calendar, email, Teams chat, and telephone links. Its small rank-ordered strengths strand opens and focuses the full CliftonStrengths section at `#/about?section=strengths`. On phones, contact buttons sit beside the photo and the strengths bar sits beneath it. The Calendar panel shows Outlook availability and links to Outlook. Booking keeps its opt-in embed.

About’s introduction includes LinkedIn and GitHub buttons using the existing profile URLs. The sidebar’s “Let’s connect” opens and focuses “Say hello” at `#/about?section=contact`; the sidebar no longer includes the original-site link or prototype label. The original site remains accessible from the page footer.

Settings offers Shape Waves, Antigravity, Fractal, Aurora, Orbits, and None. Device default selects Shape Waves above 800px and Aurora at 800px or below. Explicit choices persist across resizing and visits. Existing disabled-atmosphere preferences remain disabled. Only the selected renderer mounts; Calm/reduced motion use still alternatives. Contrast preferences suppress the background. Reduced transparency makes glass surfaces opaque while preserving the selected background. Motion pauses during assembly and when the page is hidden.

Projects uses wide, tall, and compact Magic Bento cards. Container queries respond to the actual available width, including sidebar resizing: three columns above 1000px, two above 560px, and one below. Tablet cards use a separate full-width/pair arrangement, and phone cards grow naturally with their content. Search, filters, and saved projects retain their original behavior.

All 15 project cards and the four featured Home project cards share the same committed screenshots of their destinations, loaded lazily without live embeds or a screenshot service. Each 1200px JPEG has 480px and 800px WebP copies, and browsers pick the smallest that fits. The Front Desk Planner preview shows its public sign-in page. To refresh previews, start the local V2 server and run `node v2/capture-project-previews.mjs`, which also regenerates the WebP copies; this permits only GET/HEAD requests. After replacing `assets/justin.png`, run `node v2/resize-images.mjs`. `v2/assets/project-previews/sources.json` records the captured destinations and dates. Build/deployment copies these assets normally; it does not recapture pages.

## Navigation

| Destination | Contents |
| --- | --- |
| Home | Profile, introduction, How can I help, My Day, AI Corner, featured projects, UConn Law events, Pocket Part blog stack |
| Projects | All 15 manifest projects, search, category filters, saved projects |
| Tools | Five catalog searches, Outlook availability, booking, and live requests |
| About | Biography, experience, leadership, education, skills, interests, all 34 strengths, contacts |
| More | Trello snapshot, Hartford weather, Pocket Part posts, three GitHub repositories, UConn events, settings |

Hash routes support direct links, refreshes, Back and Forward under GitHub Pages. Search replaces the current URL; filter changes create history entries. Visited panels preserve drafts and loaded embeds. Theme, Calm mode, atmosphere, and saved projects use separate V2 storage keys. Request drafts remain in memory only.

## Run and preview

From the repository root, using Node 22+:

```sh
npm ci
npm run dev:v2
```

Open **http://127.0.0.1:4392/**. This read-only source-tree server watches V2 and shared imports. Refresh the browser after edits. It rejects POST requests. Use `npm run build:v2` for a one-time independent build.

To inspect the complete static artifact:

```sh
npm run build -- --skip-feed
npm run preview
```

Open **http://127.0.0.1:4391/**. The preview also serves the original homepage at `/original.html` and existing project pages. The normal build refreshes the blog and Outlook snapshots. Run `node scripts/update-outlook-availability.mjs` to refresh the calendar for a source-tree preview. GitHub Pages refreshes it during its scheduled builds.

## Homepage assembly

Home can be assembled by five colored cursors (four on phones), using the actual components and the existing GSAP dependency. Layout first draws a persistent wireframe; the other agents then add glass, content, and details over roughly six seconds (five on phones). It autoplays on a browser’s first visit only, supports replay from the header, and has a persistent Homepage assembly setting. Reloads, later visits, and returning to Home through navigation do not replay it. Reduced motion and Calm mode bypass it. Try `http://127.0.0.1:4392/v2/?replayIntro=1#/home`, or disable it with `?intro=0`. Configuration, component API, cancellation behavior, screenshots, and performance limits are documented in [ASSEMBLY.md](ASSEMBLY.md).

## React Bits and attribution

About uses [Flip Card](https://reactbits.dev/micro/flip-card), pinned to `1eeb6f105c68b964289d85dabbe84a1d551f3797`. All 34 original strength descriptions and rankings remain unchanged. Top 5, Top 10, and All 34 select themes by rank before arranging them by domain in overview order: Strategic Thinking, Relationship Building, Executing, Influencing. Filters retain card state for themes that remain in view. Closed cards are 180px tall; flipped cards span two columns and two rows in a dense bento grid, with neighboring cards filling available space. Phones use two compact columns and full-width expanded cards. Domain colors fill both faces, with contrasting ink. The front shows rank, name, and domain; the back shows the full description. Click/tap, keyboard Enter/Space, and the original drag/spring interaction work without leaving About. Calm/reduced-motion/contrast settings use an instant face change. Local changes support fluid card dimensions, accessible descriptions, and the existing motion preference. Personal reflections use the same Flip Card, with the complete best passage on the front and overextended passage on the back. Both faces determine its stable height; dragging is disabled so long passages remain easy to scroll on phones.

The original implementations are pinned to revision `e12c22192ac7b4b452c5e2feb9b586d74765d696` of [React Bits](https://github.com/DavidHDev/react-bits). Carousel is pinned separately to `ff5121ef4e11d7988025fad7c1e23ac40d251bce`; Scroll Stack to `3e619ca31732d5d6849ecd5130ddd7b266aa7bd7`.

- [Carousel](https://reactbits.dev/components/carousel): the official DOM/spring implementation, without demo content or icon dependencies. Local changes provide a site-specific accessible label, Calm mode, and focus/inert handling so only the current event link is keyboard reachable. Existing site icons replace upstream demo icons; an extra-controls slot holds the playback button. The React Bits license applies; no new runtime dependency is needed.

- [Tech Text](https://reactbits.dev/text-animations/tech-text): the actual canvas implementation turns letters in the name into dashed paths under a pointer; tapping can kick letters. Automatic sweep and dragging are off. Calm/reduced-motion modes render normal DOM text.
- [Glass Surface](https://reactbits.dev/components/glass-surface): V2's panels use the vendored component's frosted mode (its stylesheet, rendered as static markup by `GlassLayer`) in every browser. Its SVG refraction mode recomputed every panel on every frame the backdrop moved, so the animated background and any scroll held Home near 10 fps; frosted glass, which Safari, Firefox and touch devices already got, runs at the display's refresh rate. Text and controls stay outside the glass layer.
- [Magic Bento](https://reactbits.dev/components/magic-bento): the upstream interaction/grid engine presents real manifest projects, with edge lighting, a pointer spotlight, mild tilt and click response. Stars and magnetism are off. Upstream sample dashboards/artwork and their icon dependencies were removed; site-owned content fills the cards. For scrolling performance, cards out of the light's reach aren't updated, and pointer effects rest while the page scrolls, resuming when it stops.
- [Branched Menu](https://reactbits.dev/micro/branched-menu): upstream trunk/branch geometry, folding and selection tracing. Local changes add native child links, controlled URL selection, accessible collapsed groups, SVG expanders and the existing icon system, avoiding extra icon dependencies.
- [Scroll Stack](https://reactbits.dev/components/scroll-stack): official sticky-slot and depth/scale engine, using the pile preset values (zero stack distance, item scale 0.015, base scale 0.9, dim 0.12, rotation 3). It follows native page scrolling without intercepting the wheel. Local changes provide static Calm/contrast behavior and reveal a covered card when its link receives keyboard focus. No new dependency.
- [Spotlight Card](https://reactbits.dev/components/spotlight-card): upstream source added under `src/vendor/`; a subtle pointer light on project rows. Fine-pointer use only, no ambient loop, grain or edge glare.
- Shape Waves and Antigravity reuse the existing V1 React Bits renderers, presets, static fallbacks, pixel budgets, and cleanup. Shape Waves uses the existing VGPU dependency/WebGPU; Antigravity uses WebGL. Aurora and Fractal reuse the existing site components. A V2 build adapter exposes these without V1’s settings/body observer or host CSS. V2 owns selection and styles; V1 sources stay unchanged. `vgpu-LICENSE.txt` accompanies the existing notices.
- [Dock](https://reactbits.dev/components/dock) informed the compact persistent navigation, but the navigation is custom React and CSS, with fixed touch targets. It is not represented as the upstream Dock implementation.

React Bits is copyright David Haz, under MIT + Commons Clause. The build includes the full existing license, upstream notices, React/React DOM/scheduler licenses, GSAP and Motion-family notices, and the Geist OFL. The Settings panel links to the React Bits license. Shared source files are never modified. The portrait is Justin’s existing public UConn photo; `assets/justin.png.json` records its origin. Bad URLs get the standalone `/404.html`, which uses root-relative links because hosts serve it at any depth.

## Existing functionality inventory

| Existing feature | V2 treatment |
| --- | --- |
| Name, photo, role, biography, experience, leadership, education, skills, interests | Reorganized into Home and About, grounded in V1 copy |
| Project directory | Same `data/pages.json`, same destinations, added search/filter/save |
| Calendar / Book a Meeting | React month and agenda views from published Outlook availability, plus the existing Bookings link and optional embed |
| Submit a Request | Native form submission through FormSubmit to the existing Trello board |
| CliftonStrengths | All 34 ranks/descriptions and both best/overextended passages extracted from V1 at build time; original four domain colors, rank-weighted color bar/percentage legend, reflection Flip Card, rank filters and compact expanding domain cards |
| Library catalog | Same Primo and LibGuides destinations, all five query builders rebuilt in React |
| Professional resources and contact links | Sidebar and More quick links, About contacts, and the top-bar donation link |
| Clock / Hartford weather | Eastern Time clock and the existing Open-Meteo endpoint |
| To-do / current activity | Existing Trello snapshot and original current-activity text in Home/More |
| UConn Law events | Same live RSS feed, explicit unavailable/empty states and source link |
| GitHub activity | Same three repository sources, merged and sorted by date; no invented commits |
| The Pocket Part | Existing local feed and freshness date; original blog links |
| V1 background gallery | Reused in V2 Settings with device defaults, saved selection, still fallbacks, and an additional Orbits choice |
| Share and companion | Remain available in V1 |
| Individual projects and Updates backend | Preserved as existing destinations; not rebuilt or modified |

## Botanical style

**Botanical**, a conservatory/field-journal identity, is the default site style. Settings → **Site style** also offers **Original**, the blue/orange glass design, unchanged. Saved preferences without a `style` (including those from before Botanical existed) open in Botanical; only an explicit `style: "original"` keeps Original. Switching needs no reload; with motion allowed, the new style grows out of a leaf-shaped window opened at the chosen option (View Transitions API; browsers without it switch instantly). The pre-paint script in `index.html` applies the style before first render.

- **Architecture.** `:root[data-style="botanical"]` scopes everything. `src/botanical/botanical.css` remaps the shared tokens (`--bg`, `--surface`, `--ink`, `--blue`, `--orange`, `--glass-*`…) for Sunlit (light) and Moonlit (dark), then restyles components: matte grained paper instead of glass, Fraunces serif headings over Geist body text, pill controls, leaf-cornered cards, and a deep-green rail that re-scopes its own tokens. Glass refraction is not mounted in Botanical.
- **Illustrations.** `src/botanical/Flora.jsx` draws a monstera (slits cut through an SVG mask), sword fern, golden pothos, laurel wreath, sprigs, and a loading seedling procedurally, so they're small and crisp. They're placed deliberately: a plant corner in the hero, a wreath around the portrait, a flourish beside full-width section headings, a fern that unfurls after each page title, and a seedling in loading states.
- **Pip.** `src/botanical/LivingPothos.jsx` is a pothos in the desktop rail (in the footer on compact screens). Its vine lengthens with scroll progress through a CSS custom property, without React re-renders. Clicking the pot waters it, adding up to five leaves that persist in `jr-v2-pip`.
- **Backgrounds.** Botanical has its own choices: Conservatory (layered foliage swaying in a breeze, dappled sun by day, fireflies by night), Herbarium (pressed specimens on parchment), Canopy light, and None. They're stored separately as `botanicalBackground`, so the Original background choice is kept. Each foliage layer is its own small SVG, swayed as a composited layer with light scroll parallax.
- **Motion and access.** One-time flourishes run only when `data-flourish="on"` (not Calm mode, reduced motion, or contrast modes), so they don't replay when the tab is hidden and shown. Ambient background motion follows the existing moving/still policy. High contrast and forced colors drop the decoration and use plain surfaces.
- **Fonts.** Fraunces loads from Google Fonts (with preconnect hints) while Botanical is in use. Visitors who choose Original make no font requests to Google. Fallbacks are Iowan Old Style, Palatino, and Georgia.
- **Tests.** `tests/botanical.spec.mjs` covers the default, switching, Pip, reduced motion, and overflow at three widths in both themes. The other specs import `tests/original-style.mjs`, which pins preferences without a style to Original, so they keep guarding the Original design.

## Architecture

- `src/index.jsx`: application shell, routes, view ownership, focus/scroll, preferences.
- `src/hooks.js`: routing, persisted state, media preferences, resource fetches with timeouts and cancellation.
- `src/assembly/`: real-element ref registration, GSAP choreography, decorative cursors, configuration, and replay/session policy.
- `src/content.js`: grounded profile copy, source URLs, category rules and catalog URL builder.
- `src/strengths.js` / `src/components/Strengths.jsx`: source-derived themes/reflections, all-34 domain weighting, overview, reflection Flip Card, and compact domain-colored Flip Cards with expanding descriptions.
- `src/views/`: five destinations; `src/components/`: shared controls, dialogs, icons, project rows and sketch.
- `src/styles.css`: V2 layout and controls; `src/glass-theme.css`: the requested glass materials, blue/orange tokens, responsive hero and atmospheric motion.
- `src/botanical/`: the Botanical site style: tokens and component styles, illustrations, Pip, backgrounds, and the style transition.
- `src/components/PageBackground.jsx` / `.css`: selected background host, device defaults, motion policy, and scoped host/settings styles.
- `build.mjs`: independent esbuild pipeline, read-only strength extraction, and exposure of existing background components without V1’s application controller.
- `serve.mjs`: local static preview with watch support.
- `tests/`: browser interactions, responsive captures and optional GET-only live-source smoke check.

Motion 14.9.1 supports the official Flip Card implementation. The build publishes the root `index.html` at `/` and `/v2/`, serves the shared V2 bundle from `/v2/assets/`, and copies the original HTML to `/original.html` alongside its existing assets.

## Verification and limits

Run `npm run test:v2`, `npm run test:homepage`, and `npm run test:updates`. The optional `node v2/tests/live-smoke.mjs` checks real browser CORS and source availability while the V2 server runs. Test fixtures exist only in the test code; the application uses real sources.

The responsive suite captures 375, 430, 768, 1024 and 1440 pixels in both themes, including all views at phone and desktop widths. It also checks touch targets, dock clearance, history, refreshes, direct links, keyboard/focus behavior, saved projects, request safety, all search destinations and all 34 strengths. See [VALIDATION.md](VALIDATION.md) for recorded results and known limits.

V2 owns the root entry point and the application source under `v2/`. V1 retains its HTML in `original.html` and continues to use `main.js`, `style.css`, and the `src/homepage` build.
