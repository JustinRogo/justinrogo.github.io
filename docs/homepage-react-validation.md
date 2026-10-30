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
