# Additional React Bits for the homepage

Investigated October 31, 2026. This records the initial proposal. Glare Hover and Split Text were subsequently implemented; their behavior and integration are documented in the root README.

## Existing integration

The homepage already has several React Bits effects:

| Component or influence | Current placement |
| --- | --- |
| Glass Surface | Six main card shells, rendered behind content by `GlassMaterial.jsx` |
| Shape Waves | Default background in `SiteBackground.jsx` |
| Antigravity | Optional background in the same picker |
| Spotlight Card adaptation | Work, UCPEA, and For Fun collection rows, managed by `useCollectionSpotlight` in `effects.js` |
| Gooey Nav influence | Sliding widget-tab indicator, managed by `useTabIndicator` in `effects.js` |

The current visual language is Fraunces headings, Space Grotesk body text, glass panels, blue/orange accents, and light/dark themes. The project directory is a practical navigation surface with native disclosures and a nested link tree. These are useful constraints for new effects.

## Shortlist

| Candidate | Proposed placement and behavior | Fit and implementation cost |
| --- | --- | --- |
| [Glare Hover](https://reactbits.dev/animations/glare-hover) | A short, subtle sheen on the Teams/contact links when hovered or focused | Best small first experiment. Complements the existing glass material. Current upstream JSX imports React and its own CSS; no additional package import. Existing HTML contact links need a carefully scoped integration because React currently owns only their decorative glass slots. |
| [Split Text](https://reactbits.dev/text-animations/split-text) or [Blur Text](https://reactbits.dev/text-animations/blur-text) | One brief entrance for “Justin Rogowski” | Best option for a more noticeable first impression without rearranging the page. Choose one, preserve the heading semantics and two-line mobile wrapping, and keep the name immediately readable under reduced motion. Split Text currently imports GSAP and `@gsap/react`; Blur Text imports `motion/react`. Neither animation library is currently installed. |
| [Animated List](https://reactbits.dev/components/animated-list) | Upcoming events, or a compact recent-activity list | Useful when the list has enough entries to benefit from selection and scrolling. Adapt real links and keyboard behavior to the content. Current upstream JSX imports Hugeicons packages, which are not installed. These regions are currently owned by `main.js`, so this involves a new React island or an explicitly adapted effect. Avoid introducing a second scroll area for a short list. |
| [Click Spark](https://reactbits.dev/animations/click-spark) | Small bursts on a few local actions such as opening a collection or changing the theme | Optional personality with no additional package import in the inspected JSX. Scope it to chosen controls, keep the drawing layer noninteractive, and account for keyboard activation. External links can navigate away before an effect is visible. |
| [Profile Card](https://reactbits.dev/components/profile-card) | A redesigned portrait/contact portion of the hero | Largest visual change on this shortlist. Would need a separate layout proposal to preserve the current contact links, biography, strengths control, and mobile reading order. Current upstream JSX imports Hugeicons. The existing portrait already has a small hover rotation. |
| [Star Border](https://reactbits.dev/animations/star-border) | At most one primary call to action, such as Book a Meeting | Possible focal accent, but a lower priority alongside the existing bright glass edges and animated background. Current JSX imports React and local CSS. Prefer interaction-triggered emphasis to a continuous effect. |

## Recommended first experiment

Try Glare Hover on the Teams contact link first, using a low-opacity sheen that follows the existing blue/orange palette. Keep the native anchor and its accessible name, add equivalent keyboard feedback, and use a static highlight on touch and under reduced motion. This offers a bounded, easy-to-compare change without changing the page layout.

If the desired result is more visibly animated on arrival, evaluate Split Text or Blur Text on the name instead. First measure the production bundle impact of the additional animation library. Avoid stacking the heading reveal, sparks, border animation, and new card effects in the same experiment.

The existing collection lighting and tab indicator already cover navigation feedback. Adding another full-screen background or cursor effect would have less clear value than improving one of these specific interactions.

## Integration and verification

- Use JavaScript/plain-CSS variants to match the existing esbuild setup. Pin any vendored source to an exact upstream revision and retain attribution and license notices, as the existing integrations do.
- Keep React ownership explicit: the hero, events, blog, and activity content currently include markup or handlers managed outside React. Do not mount over those descendants without migrating their behavior.
- Preserve the existing live reduced-motion, theme, touch, contrast, and background preferences. Pause any nonessential loop when hidden or offscreen.
- For an implementation, compare both themes at desktop and mobile sizes; verify focus, tab order, native disclosures, form input retention, and overflow. Rebuild with `npm run build:homepage` and run the homepage regression suite against the production artifact.
- Measure incremental compressed bundle size and rendering cost; no candidate bundle sizes were measured during this investigation.

## Evidence and limits

Reviewed `index.html`, `style.css`, `main.js`, the homepage React components and effects, build configuration, package dependencies, existing validation notes, and the official component documentation and upstream JavaScript sources linked below.

Saved desktop and mobile browser captures from October 30 were inspected. Their timestamps follow the current homepage HTML/CSS and compiled bundle. They show matching layout and theme treatments, but contain test fixtures and do not demonstrate live external content. A fresh headless Edge launch failed, and the in-app browser reported local browser use disabled. No new live visual verification or regression test run is claimed.

### Upstream source checks

- [Glare Hover source](https://github.com/DavidHDev/react-bits/blob/main/src/content/Animations/GlareHover/GlareHover.jsx)
- [Split Text source](https://github.com/DavidHDev/react-bits/blob/main/src/content/TextAnimations/SplitText/SplitText.jsx)
- [Blur Text source](https://github.com/DavidHDev/react-bits/blob/main/src/content/TextAnimations/BlurText/BlurText.jsx)
- [Animated List source](https://github.com/DavidHDev/react-bits/blob/main/src/content/Components/AnimatedList/AnimatedList.jsx)
- [Click Spark source](https://github.com/DavidHDev/react-bits/blob/main/src/content/Animations/ClickSpark/ClickSpark.jsx)
- [Profile Card source](https://github.com/DavidHDev/react-bits/blob/main/src/content/Components/ProfileCard/ProfileCard.jsx)
- [Star Border source](https://github.com/DavidHDev/react-bits/blob/main/src/content/Animations/StarBorder/StarBorder.jsx)

Upstream `main` is mutable; confirm the selected revision's source and dependencies before implementation.
