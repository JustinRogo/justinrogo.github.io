# Homepage React migration validation

Validated locally on 2026-10-30 with Node.js 24 and headless Microsoft Edge (Chromium) on Windows.

- `npm run test:homepage`: **24 passed** against the static production artifact. Includes 320, 390, 768 and 1440 pixel widths in both themes; native collection disclosures and every manifest destination; keyboard focus and tab wrapping; lazy iframe URLs and retained panel state; request validation, subject mapping and success redirect; profile control; nested strengths/catalog interactions; mouse/touch; reduced motion; rapid switching and resize geometry; loading and failed/invalid/stalled manifests; standalone page paths; Updates assets/aliases; and `file://` fallback.
- `npm run test:updates`: **22 passed**, including the API, sanitization, previews, RSS and PostgreSQL permission/migration tests.
- `node scripts/build-site.mjs --skip-feed`: production build succeeded. GitHub Pages runs this command after its separate feed refresh. Vercel runs the same builder with its existing feed refresh enabled. The local validation used `--skip-feed` to preserve the pre-existing change to `data/pocket-part.json`.
- `npm run dev`: homepage, Updates preview, embed and configuration API responded successfully. A temporary source probe rebuilt automatically, then was removed and the original source rebuilt successfully.
- Visually compared the homepage before/after migration and inspected desktop/mobile captures in both themes, including captures with normal remote fonts/data. No application JavaScript errors appeared in those four live captures. The existing CSS is unchanged.
- Syntax checks and `git diff --check` passed. Production assets include the React bundle, dependency licenses, existing React Bits license and Updates vendor files. Source, backend code, environment files and dependency directories are excluded from the static artifact.

The existing design detector still reports baseline styling advisories, including a 4.3:1 muted-text contrast advisory also present in the earlier `.impeccable/review-b-detector.json`. This migration preserves those styles; it is not a complete accessibility audit.

Browser regression tests stub third-party responses and prevent real form submissions. Authenticated Outlook/booking flows, real Trello/FormSubmit delivery, hosted Supabase credentials, Safari and Firefox were not exercised. The live captures verify normal homepage rendering, not authenticated external workflows. No remote deployment was performed.

Component ownership and development/build commands are documented in the root README. Screenshots and failure traces are generated under ignored `test-results/`.

## Glass Surface follow-up

The homepage now uses the pinned React Bits Glass Surface component on six main card shells. `npm run test:homepage` passes **27 tests**, including the original migration cases plus checks for unique SVG IDs, resize-dependent displacement-map dimensions, separate decorative/content layers, mobile fallback, live reduced-motion and increased-contrast preferences, and the upstream browser-fallback branch. That branch is tested using a Firefox user-agent in Chromium; this does not constitute a real Firefox/Safari rendering test.

The production build includes the generated `assets/homepage.css`, its license notices, the updated JavaScript bundle and the exact upstream license. Both themes were visually inspected at desktop and mobile widths, with no overflow or application JavaScript errors in the live-data captures. The existing layout and base stylesheet are unchanged. The extra generated material adds roughly 8 KB of gzipped JavaScript and CSS, with no new dependency or WebGL loop.

## Antigravity background follow-up

`npm run test:homepage`: **31 passed** after replacing the legacy fractal and auroras with the pinned Antigravity component. Additional checks inspect real instanced WebGL draws for 1,050 particles, verify the tetrahedron/radial shader modes and configured ambient/depth/pulse settings, resize the canvas, confirm still rendering and live reduced-motion changes, exercise unavailable WebGL, and simulate context loss/restoration while preserving request-form input. The original homepage and Glass Surface tests continue passing in both themes at 320–1440 pixels.

The static production build succeeds with no added dependency. Live-data screenshots in both themes and on mobile show the new blue/orange field behind the glass panels without application errors. Renderer device pixel ratio is capped at 1.5 within the upstream pixel budget, and reduced-motion mode creates no WebGL renderer or animation loop. The upstream source and license are retained; the sole local Antigravity change is a renderer-status callback to support the static fallback. Existing uncommitted feed data and `Pages/.claude/` were left untouched. These checks were performed locally before publication.
