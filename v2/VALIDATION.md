# V2 validation · November 1, 2026

## Results

| Check | Result |
| --- | --- |
| `npm run build:v2` | Passed; isolated React/esbuild bundle |
| `npm run build -- --skip-feed` | Passed; full artifact with additive `/v2/` output |
| `npm run test:v2` | **14 passed** on Microsoft Edge/Playwright |
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

Final minified output is approximately **348 KB JS / 78 KB CSS**, or **113 KB / 16 KB gzipped**, plus the unchanged 199 KB profile photo and the reused local font. These gzip sizes are informational measurements; the static preview does not enable gzip.

## Change boundary

Only two pre-existing files changed: `package.json` adds three V2 commands, and `scripts/build-site.mjs` adds the V2 build and public asset copy. All new implementation, test, product, design and validation files belong to `v2/`. No V1 visual/behavior sources, project data, existing project pages, deployment workflow or Vercel rewrites changed. The pre-existing untracked `Pages/.claude/` directory was left untouched.

## Annotated feedback follow-up

Moved the branch menu into the desktop sidebar and added all 11 existing Quick Links. Compact tablet/phone access lives in More. Removed the selected hero hint and portrait caption. Featured slots now lead with CT General Statutes Explorer, then Law Library Heatmap and AI Corner Updates; original destinations and shared manifest remain unchanged. The full 14-test suite passes. Additional read-only checks at 1343×1244, 1024×768 and 375×900 verify all link destinations, sidebar scrolling, pinned contact/settings, phone More access, removal of the selected captions and horizontal overflow.
