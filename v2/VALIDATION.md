# V2 validation · November 1, 2026

## Results

| Check | Result |
| --- | --- |
| `npm run build:v2` | Passed; isolated React/esbuild bundle |
| `npm run build -- --skip-feed` | Passed; full artifact with additive `/v2/` output |
| `npm run test:v2` | **30 cases verified** on Microsoft Edge/Playwright; 28 passed in the full run, then all six assembly tests passed after updating two obsolete background fixtures |
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
- The V1 share control and companion remain in V1. V2 now reuses the background gallery under its own settings/lifecycle, alongside actual glass refraction, Tech Text, Magic Bento and Branched Menu.
- Shape Waves needs WebGPU and Antigravity needs WebGL for motion; their existing static canvases remain visible while initializing or when a GPU renderer is unavailable. Aurora is the default on compact screens and needs no canvas. Calm/reduced-motion settings use still alternatives.
- No new service worker or offline app-install flow is provided. No continuous GPU background is required.

Final minified output with the assembly sequence, expanded strengths content, resizable sidebar, and background gallery is approximately **636 KB JS / 93 KB CSS**, or **214 KB / 19 KB gzipped**, plus the unchanged 199 KB profile photo and reused local font. GSAP and VGPU were already dependencies; no package was added. These gzip sizes are informational measurements; the static preview does not enable gzip.

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

## CliftonStrengths and UCPEA hierarchy · November 3, 2026

About now includes all four original domain colors, a rank-weighted all-34 bar/percentage legend, and the original best/overextended reflection passages. The V2 build extracts the passages as text from V1; no V1 initializer runs and no reflection text is duplicated by hand. Weights are 35 − rank: Thinking 206/595 (34.6%), Relationship Building 170/595 (28.6%), Executing 114/595 (19.2%), and Influencing 105/595 (17.6%). Top 5/10/34 filters leave this overview unchanged.

The UCPEA branch keeps all four original destinations, with Member Dashboard first and native nested child links named Current Contract, Contract History, and Contract Comparison. The vendor adaptation supports semantic nested lists and corresponding branch geometry; outer expansion/inert behavior remains intact. Tests verify hierarchy, renamed destinations, label fit, and Dashboard-to-contract Tab order on desktop and phone.

The full suite passes 23 tests. New coverage verifies exact reflection text, keyboard switching, domain percentages/weights/colors, filter-independent overview, badge colors, and responsive overflow in both themes. The existing contrast check passes with purple Executing badges. Screenshot review covered strengths content at 375px and 1024px in both themes and nested UCPEA at 1243px and 375px. The full responsive suite still covers all five widths/themes. The mechanical check noted only contextual caption type levels (now documented) and unchanged upstream 1px branch-marker corners. Full build and all 22 production URL checks pass; V1 core hashes and shared project data remain unchanged.

## Portrait, sidebar, and shape refinement · November 3, 2026

Halved V2-owned box corner radii and matched the Glass Surface, Magic Bento, Glare Hover, and assembly-guide corners to their final hosts. Circular portraits and orbital geometry remain unchanged. The portrait now has native calendar, email, Teams chat, and telephone links, with a shared rank-weighted strengths bar beneath it. Its route (`#/about?section=strengths`) scrolls to and focuses the existing strengths section through click, direct refresh, and browser history. Calendar/booking keep opt-in embeds and direct links without the former cookie/sign-in paragraph.

The desktop rail defaults to 240px and resizes via pointer capture or a labeled keyboard separator. Width saves under a V2-specific key, respects viewport limits, and resets with Enter or double-click. Compact navigation retains its own dimensions. Narrow desktop content uses a container query to stack the hero and notes when the rail leaves insufficient horizontal room. The 320px fallback heading was reduced to prevent text clipping.

The 26-test suite covers contact destinations and 44px touch targets, shared strengths weights, anchored focus/history, pointer and keyboard resizing, persistence and reset, compact breakpoints, exact corner values, and opt-in embeds without external writes. Existing real-node assembly, accessibility, routing, and content coverage remains intact. The responsive capture matrix covers 375/430/768/1024/1440px in both themes; additional captures inspect 320px and maximum rail widths at 801px/1024px. Full build and production smoke pass, including 22 public URLs and unchanged V1 hashes.

The source design detector retained two warnings about the existing Geist font and 144 contextual type/color/radius advisories across the broad existing stylesheets. The font and glass visual system are intentionally preserved for this scoped refinement. The new separator's 1px grip corners are decorative line geometry. No fonts or palette were replaced in response to these generic findings. Captures and detector output remain ignored development artifacts.

## Background selection and About links · November 3, 2026

About now includes secondary LinkedIn/GitHub buttons using the existing contact URLs. The sidebar's “Let’s connect” opens and focuses “Say hello”; repeated activation, direct refresh and history work. The sidebar's original-site link and prototype label are removed; footer access to V1 remains.

Settings adds native radio choices for Device default, Shape Waves, Antigravity, Fractal, Aurora, Orbits, and None. Automatic defaults are Shape Waves above 800px and Aurora on compact screens. Explicit choices persist across visits and resizing, V1's separate preference is untouched, and blocked storage does not prevent selection for the current visit. Existing disabled-atmosphere preferences stay disabled. The V2 build adapter exposes existing background components read-only without V1's body observer, settings owner or host CSS; the build fails clearly if that extraction boundary changes. VGPU's MIT license ships with the other notices.

Four new browser cases cover device defaults, persistence, exclusive renderer mounting, still motion treatments, contrast suppression, blocked storage, V1 preference isolation, assembly pause/resume, social destinations, anchored contact focus/history, and settings keyboard containment. Captures cover four selected backgrounds and Settings at 375px/1440px in both themes. Existing responsive coverage still checks all five widths and all views. Two older assembly fixtures expected the old background to remain mounted while disabled; they now explicitly select Orbits and test its real pause/resume. The full run passed 28 other cases; the corrected six-test assembly suite passed, verifying all 30 unique V2 cases.

Additional live Edge inspection verified the actual Shape Waves WebGPU renderer reaches active state with correct 1440×1000 dimensions, hides its fallback only once ready, and shows the expected moving shapes behind glass. The still fallback was inspected separately, and mobile Aurora mounts without a canvas. Initial GPU startup can take a few seconds in headless Edge; the fallback keeps content available. These checks do not establish physical-device frame-rate guarantees.

The scoped source design detector reports no findings. Full build and production smoke pass, including all 22 public URLs, five private-source exclusions, byte-identical public copies, and unchanged V1 core hashes. All edits in this follow-up remain within v2; no merge, deployment, commit, or push was performed.
