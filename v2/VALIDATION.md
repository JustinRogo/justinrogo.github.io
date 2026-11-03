# V2 validation · November 1, 2026

## Results

| Check | Result |
| --- | --- |
| `npm run build:v2` | Passed; isolated React/esbuild bundle |
| `npm run build -- --skip-feed` | Passed; full artifact with additive `/v2/` output |
| `npm run test:v2` | **21 passed** on Microsoft Edge/Playwright (November 3 staged assembly follow-up) |
| `npm run test:homepage` | **51 passed**; existing V1 suite, including widgets, backgrounds, themes and URLs |
| `npm run test:updates` | **22 passed**; existing API, rich text, permissions and link-preview tests |
| Production HTTP smoke | **22 public URLs returned 200**, including all 15 manifest project paths |
| Source exclusion | Five representative V2 source/test/document/provenance URLs returned 404 from `dist` |
| V1 preservation | Starting SHA-256 hashes of root HTML, JS and CSS unchanged; canonical Git comparison also verifies manifest and WidgetTabs source |
| Public output | V1 core files, V2 entry point and V2 bundles copied byte-for-byte to `dist` |
| Real source loading | All eight source requests returned HTTP 200 in the browser, with no app runtime errors |
| Design detector | Ran for the revision; old-system color/radius/type advisories are expected from the explicitly requested glass redesign, plus upstream vendor defaults and the reused Geist font. The design documentation is updated to the final source. |
| Independent design review | Fresh glass-revision verdict: **ship**. All 36 route/live/interaction/dialog captures were valid, with no material findings in the reviewed scope. |

The real-source check covered the shared project manifest, Pocket Part snapshot, Trello count snapshot, Open-Meteo, three GitHub commit endpoints and UConn Law events XML. It used only GET requests, with actual browser CORS behavior. No production requests, bookings, forms, comments or database records were created or altered.

## Responsive and interaction coverage

Reviewed **375, 430, 768, 1024 and 1440px** widths in both light and dark themes. The capture matrix has 26 full-page images: Home at all five widths/themes and all five destinations at 375/1440. Four further viewport captures verify settings and local request-preview dialogs. Four live Home captures verify actual canvas lettering in both themes on phone/desktop; two closeups verify Bento hover and expanded branches. Screenshots are development-only artifacts under the repository’s ignored `.impeccable/review/` directory.

Tests cover:

- Manifest content and destinations; category filters; search; empty results; persistent saves; direct title anchors.
- Browser Back/Forward, direct hash routes, refreshes, missing routes, destination-heading focus.
- All five original Primo/LibGuides search builders and URL encoding.
- Request validation and local preview, draft retention, zero writes, dialog dismissal during browser history/panel/view changes, restored focus and body scrolling.
- Theme preference, Calm mode, reduced motion, increased contrast, forced colors, focus return and repeated keyboard Tab containment.
- All 34 strengths and native keyboard disclosures.
- Failed manifest loading and retry recovery.
- Touch navigation, 44px+ primary touch targets, content clearance above the safe-area-aware dock, and horizontal overflow checks.
- Actual small-text contrast on light tool navigation and executing-strength rank backgrounds (≥4.5:1).
- Real Tech Text canvas pixels and pointer reaction, shared Glass Surface filter-ID uniqueness, Magic Bento pointer lighting, and Calm mode removing canvas/motion.
- Branched Menu expansion through keyboard, collapsed branch exclusion from accessibility/keyboard order, native shortcut links, and history.

The six independent review fixes were scoped V2 product documentation, request-preview history lifecycle, metadata hierarchy, direct project navigation, small-text contrast, and consistent SVG wordmark icons/tracking. The later glass revision follows the user’s explicit visual direction and received a fresh ship verdict across the inspected views, interactions and source. Neither review is exhaustive accessibility certification.

## Known limits and deliberate deferrals

- This is a branch prototype. Committing and pushing `feature/website-v2` does not merge it into production. The public GitHub Pages `/v2/` URL is not available until a later approved publication.
- Browser automation used desktop Edge with responsive/touch emulation. Physical iOS/Android devices and native Safari were not tested. Safe-area handling is implemented with `env(safe-area-inset-bottom)`.
- Microsoft calendar/Bookings embeds are opt-in. Third-party cookies, sign-in or frame restrictions may prevent embedding; the original direct links remain available. No real booking was submitted.
- Request drafts preview locally. Sending uses the original site after deliberate navigation and selection of “Submit a Request.” V2 has no POST integration.
- GitHub, weather and events depend on external availability, CORS and rate limits. Loaded API data caches for the app session and refreshes on page reload. Task counts and blog posts reuse existing snapshots with freshness labels.
- Strengths are extracted from the existing V1 source at build time. The build checks for all 34 and fails clearly if that source format changes.
- The V1 share control, companion and background gallery are retained only in V1. V2 offers blue/orange orbital atmosphere, actual glass refraction, Tech Text, Magic Bento and Branched Menu interactions instead.
- No new service worker or offline app-install flow is provided. No continuous GPU background is required.

Final minified output with the GSAP assembly sequence is approximately **431 KB JS / 83 KB CSS**, or **146 KB / 17 KB gzipped**, plus the unchanged 199 KB profile photo and the reused local font. GSAP was already a dependency; its orchestration code is now included in the V2 bundle. These gzip sizes are informational measurements; the static preview does not enable gzip.

## Change boundary

Only two pre-existing files changed: `package.json` adds three V2 commands, and `scripts/build-site.mjs` adds the V2 build and public asset copy. All new implementation, test, product, design and validation files belong to `v2/`. No V1 visual/behavior sources, project data, existing project pages, deployment workflow or Vercel rewrites changed. The pre-existing untracked `Pages/.claude/` directory was left untouched.

## Annotated feedback follow-up

Moved the branch menu into the desktop sidebar and added all 11 existing Quick Links. Compact tablet/phone access lives in More. Removed the selected hero hint and portrait caption. Featured slots now lead with CT General Statutes Explorer, then Law Library Heatmap and AI Corner Updates; original destinations and shared manifest remain unchanged. The full 14-test suite passes. Additional read-only checks at 1343×1244, 1024×768 and 375×900 verify all link destinations, sidebar scrolling, pinned contact/settings, phone More access, removal of the selected captions and horizontal overflow.

## Original directory branches · November 3, 2026

Added expandable Work (5 pages), UCPEA (4 pages), and For Fun (6 pages) sections to the shared branch menu. They use the already-loaded manifest, preserve every original destination, and provide taller rows for long titles. A new browser test checks all 15 links, keyboard expansion/collapse, collapsed accessibility, title fit, and horizontal overflow at 1024px and 375px. Screenshot inspection at 1024×768, 1343×1244 (light), and 375×900 confirms expanded layouts, sidebar scrolling, pinned desktop contact/settings, and mobile More access. The full V2 suite passes 15 tests; the full build and production smoke checks pass. V1 sources and shared project data are unchanged.

## Homepage assembly · November 3, 2026

The full suite passed 20 tests, including five assembly tests. These assert that the original hero, heading, navigation, and card DOM nodes survive the sequence, their layout offsets/sizes stay unchanged, all temporary opacity/transform/clip styles are restored, and pointer arrivals lie within their measured target regions. Tests cover session/replay policy, repeated replay, the first Home activation from a deep link and its router focus, viewport changes, keyboard and route interruption, reduced motion and settings, slow project data, scroll interruption, and zero external writes.

Initial, construction, and completed captures at 375px and 1440px were inspected; additional motion-enabled captures at 430px light, 768px dark, and 1024px light verified touch/tablet layouts, completion, no overflow, and no runtime errors. The existing responsive suite still covers all five widths in both themes. The full build and production smoke pass: all 22 public URLs respond, excluded source paths stay private, and V1 core hashes remain unchanged.

The mechanical design check reported only small label/type and decorative mask-color advisories; the new cursor treatment is documented in DESIGN.md. Frame sampling was exploratory, not a device benchmark. The glass-heavy 1024px light layout did not consistently sustain 60 FPS in automated Edge, including with the intro disabled. Native Safari and physical phones remain untested. The normal glass materials and the final homepage design remain unchanged.

## Slower, staged assembly · November 3, 2026

The sequence now uses 5800ms on desktop and 4800ms on phones, plus the existing bounded preparation. Layout enters alone, drawing persistent measured header/hero/navigation-shell outlines; the other agents join at 35% to fill the real surfaces and content. Layout continues outlining project tiles before handing off. No mock component tree is introduced.

The full suite passes 21 tests, including six assembly tests. New assertions verify that only Layout appears during the opening, structural outlines are visible while the real hero remains hidden, all guides clear at completion, and navigation works during preparation, wireframing, and crew assembly. Navigation now fades with stable hit regions to avoid clipping a link while a click arrives. Existing identity, layout, interruption, reduced-motion, history, and request-safety coverage remains green. Desktop/phone captures include a separate wireframe stage; the mechanical design check reports no findings for the changed animation sources. Build and production smoke pass; V1 remains unchanged.

The staged sequence was also reviewed at 430px, 768px, and 1024px in light theme (touch emulation at the first two). Each completed with the expected solo Layout opening, later crew entry, no horizontal overflow, and no runtime errors. These captures supplement the 375px/1440px dark-theme wireframe, construction, and completion captures.
