---
name: Justin Rogowski V2
description: An interactive blue-and-orange glass workspace for practical tools and creative experiments.
colors:
  bg: "#e6efff"
  surface: "#f1f6ff"
  ink: "#112847"
  muted: "#425875"
  line: "#a9bfdf"
  blue: "#125cd4"
  blue-hover: "#0749b5"
  orange: "#a83c04"
  tint: "#d7e6ff"
  nav: "#c8d9f2"
  branch-line: "#86a4ce"
  glass-fill: "rgba(235, 244, 255, 0.72)"
  glass-edge: "rgba(255, 255, 255, 0.8)"
  dark-bg: "#060f23"
  dark-surface: "#0e203b"
  dark-ink: "#eef5ff"
  dark-muted: "#b4c9e5"
  dark-line: "#334f75"
  dark-blue: "#75b4ff"
  dark-blue-hover: "#a8d0ff"
  dark-orange: "#ffab6e"
  dark-tint: "#17385f"
  dark-nav: "#173456"
  dark-branch-line: "#49749b"
  dark-glass-fill: "rgba(11, 30, 58, 0.68)"
  dark-glass-edge: "rgba(168, 204, 255, 0.23)"
  contrast-muted: "#304965"
  contrast-line: "#637e9f"
  contrast-dark-muted: "#d0e2f8"
  contrast-dark-line: "#9ab2ce"
  action-orange: "#f88436"
  action-orange-hover: "#ffa25f"
  action-ink: "#071528"
  filter-orange: "#ed7e34"
  filter-ink: "#06152b"
  bento-glow: "#ff8a36"
  tech-accent: "#5d9fff"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "88px"
    fontWeight: 550
    lineHeight: "100px"
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 4vw, 4rem)"
    fontWeight: 550
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.55rem"
    fontWeight: 550
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  subtitle:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.15rem"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    lineHeight: 1.55
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 550
  button:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 550
  wordmark:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 650
    lineHeight: 1
    letterSpacing: "-0.04em"
rounded:
  tag: "6px"
  field: "7px"
  icon: "8px"
  tool-tab: "9px"
  button: "11px"
  navigation: "12px"
  search: "12px"
  tool-navigation: "14px"
  orbit-action: "17px"
  topbar-phone: "18px"
  topbar: "20px"
  panel: "22px"
  glass-host: "24px"
  phone-sheet: "24px 24px 0 0"
  circle: "50%"
spacing:
  tight: "6px"
  small: "8px"
  action-gap: "10px"
  control-gap: "12px"
  phone-page-inline: "14px"
  medium: "16px"
  compact-page-inline: "18px"
  section: "20px"
  narrow-page-inline: "22px"
  panel-small: "24px"
  panel: "28px"
  page-inline: "32px"
components:
  button-primary:
    backgroundColor: "{colors.action-orange}"
    textColor: "{colors.action-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "11px 18px"
  button-primary-hover:
    backgroundColor: "{colors.action-orange-hover}"
    textColor: "{colors.action-ink}"
  button-secondary:
    backgroundColor: "color-mix(in srgb, var(--surface) 40%, transparent)"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "11px 18px"
  button-secondary-hover:
    backgroundColor: "{colors.nav}"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.icon}"
  field:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "12px 13px"
  search-field:
    backgroundColor: "{colors.glass-fill}"
    textColor: "{colors.muted}"
    rounded: "{rounded.search}"
    padding: "0 15px"
  navigation-active:
    backgroundColor: "linear-gradient(120deg, color-mix(in srgb, var(--blue) 18%, transparent), color-mix(in srgb, var(--orange) 10%, transparent))"
    textColor: "{colors.orange}"
    rounded: "{rounded.navigation}"
    padding: "12px 14px"
  filter:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.field}"
    padding: "8px 15px"
  filter-active:
    backgroundColor: "{colors.filter-orange}"
    textColor: "{colors.filter-ink}"
  technology-tag:
    backgroundColor: "{colors.glass-fill}"
    rounded: "{rounded.tag}"
    padding: "8px 13px"
  glass-host:
    backgroundColor: "transparent"
    rounded: "{rounded.glass-host}"
  bento-card:
    backgroundColor: "{colors.glass-fill}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
  tool-panel:
    backgroundColor: "{colors.glass-fill}"
    rounded: "{rounded.panel}"
    padding: "32px"
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "30px"
---

# Design System: Justin Rogowski V2

## Overview

**Creative North Star: "Personal glass workspace"**

Ice-blue or deep navy ground, refractive glass, blue light, orange actions, and orbital geometry give practical information work a vivid interactive setting. Geist and consistent line icons keep the material system legible. This user-pinned world applies only to `v2/` and supersedes its earlier notebook direction.

The four requested React components define the experience: Tech Text makes the name respond to pointers and taps; Magic Bento presents actual selected projects with light and tilt; Branched Menu unfolds native-link shortcuts; Glass Surface renders refraction behind content. The atmosphere drifts when effects are enabled. Calm mode, system accessibility preferences, touch capabilities, active-view state, and page visibility govern the effects.

**Key Characteristics:**

- Ice-blue and navy themes with legible orange actions and blue illumination.
- Floating glass panels, rounded geometry, soft depth, and orbital lines.
- Interactive identity, content-backed bento, and folding branch shortcuts.
- Native navigation and task controls with deliberate motion and transparency fallbacks.

## Colors

The palette uses a cool luminous ground with blue illumination and orange interaction accents; frontmatter records the final CSS cascade.

### Primary

- **Action orange** (`action-orange`, `action-orange-hover`, `action-ink`): filled primary buttons retain this fixed palette across themes. Active filters use the observed `filter-orange` and `filter-ink` pair.
- **Semantic orange** (`orange`, `dark-orange`): current navigation, branch traces, wordmark arrow, saved hearts, and quiet action emphasis. It adapts for readable text in each theme.
- **Bento glow** (`bento-glow`): selected-work spotlight and border response.

### Secondary

- **Blue illumination** (`blue`, `blue-hover`, `tint`, dark counterparts): role text, ordinary focus rings, supporting surfaces, and secondary accents.
- **Tech blue** (`tech-accent`): Tech Text's pointer-responsive accent. The two name lines use semantic ink and orange.

### Neutral

- **Ice / navy page** (`bg`, `dark-bg`) and **solid surface** (`surface`, `dark-surface`): theme ground and opaque control/dialog/fallback material.
- **Ink / supporting ink** (`ink`, `muted`, dark counterparts): primary and secondary text; `contrast-*` values are high-contrast overrides.
- **Rules / branches** (`line`, `branch-line`, dark counterparts): field outlines, ruled rows, and branch geometry.
- **Glass fill / edge** (`glass-fill`, `glass-edge`, dark counterparts): translucent material and reflected rims; `nav` supplies hover and segmented surfaces.

**The Semantic Glass Rule.** Use live theme variables for glass, text, and supporting UI; retain the implemented fixed orange primary-action palette.

## Typography

**Display, body, and labels:** locally hosted variable Geist with system-ui and sans-serif fallbacks. V2 reuses and preloads the existing font file.

- **Display:** frontmatter records the DOM name-heading fallback. Tech Text draws the same name in Canvas 2D with Geist (550), configured size (120), and tracking (-0.03), fitted into responsive line containers. Screen readers retain a text heading.
- **Responsive display:** the fallback size is (96px) on wide desktops, (74px) at the narrow-desktop rule, (66px) beside the compact rail, and (61px) on phones. Phone lines use (75px) leading.
- **Headline / title / subtitle:** route and section headings retain the inherited tight-tracked hierarchy. Contextual Home, bento, and tool overrides remain in source.
- **Body:** pretty wrapping and balanced headings retain readability. Global paragraphs cap at (72ch), project descriptions at (66ch), and hero copy at (54ch). The hero uses smaller copy with more leading.
- **Label / button:** compact mixed-case controls; branch labels use (12px). Time and rank figures retain tabular numerals.
- **Wordmark:** lowercase “jr” with tight tracking and an orange inline SVG northeast arrow.

**The Text Above Refraction Rule.** Keep rendered text and controls outside the distortion layer; the glass filter belongs behind their content.

## Layout

The desktop has a floating rail (208px wide, inset 18px), a workspace offset (244px), an inset Hartford strip, and centered content. Main gutters are (32px), with the inherited main cap (1300px). Home places a two-column glass hero above selected-work bento, a full-width notes panel, and contact. Branches live below primary navigation in the desktop rail; its middle region scrolls while contact/settings remain reachable. At 800px and below, the same branches are available in More.

- At or below (1150px): rail (183px), workspace offset (216px), gutters (22px).
- At or below (800px): rail (68px), workspace offset (90px), gutters (18px). Navigation labels stay visible; portrait geometry simplifies.
- At or below (600px): the same navigation tree becomes a floating labeled glass dock; bottom workspace clearance is (108px) plus safe area. Main gutters become (14px), Home becomes one column with a small positioned portrait, and lower panels stack.
- At or above (1600px): the hero gains padding and the name reaches its larger display size.
- Magic Bento requests four columns, rows (170px), and gap (16px). Container measurement chooses four/two/one columns from minimum cell widths (150px) and pair widths (200px). Phone CSS gives every card one span, a taller first card, and gap (13px).
- Projects keep title-first ruled rows inside one glass list container. Forms, About, and feeds retain their established responsive structures.

Spacing is contextual; frontmatter lists reused steps without imposing a new mathematical scale. The supported body minimum remains (320px).

## Elevation & Depth

Glass is structural throughout V2. Floating rails, headers, hero, and lower panels use theme-specific panel shadows. Project lists and task surfaces use translucent fills, blur, and larger curves; bento adds reflected rims and pointer illumination. Dialogs remain solid and retain their inherited modal shadow.

GlassLayer imports the actual shared Glass Surface renderer. Its inert decorative SVG layer sits behind controls, using blur (16), opacity (0.94), distortion scale (-55), and channel offsets (0 / 2 / 4). Fine-pointer devices may refract; touch and reduced motion use frosted glass. Reduced transparency, high contrast, and forced colors make layers opaque. The dock uses a near-opaque surface mix (94%) for labels.

The atmosphere combines broad blue/orange blurred light with SVG orbit lines. The light fields drift when enabled; Calm and hidden-page state stop optional motion. The Atmosphere preference hides the whole layer.

**The Opaque Escape Rule.** Preserve the implemented fallbacks so readability and operation remain available when refraction, transparency, or motion is suppressed.

## Shapes

Generous rounded panels and floating controls define the revision. The frontmatter records actual corners: buttons and fields are tighter than glass hosts; header, dock, tool panels, and phone sheet retain their context-specific radii. Portraits and orbital geometry use circles and ellipses.

Line icons remain inline SVG with rounded caps/joins and the existing stroke (1.65). Branched Menu uses real trunk, arc, and trace geometry. The leading statutes tile uses the shared book icon with CT lettering; the featured destinations are CT General Statutes Explorer, Law Library Heatmap, and AI Corner Updates.

## Components

- **Buttons:** orange primary actions with dark text and a soft orange shadow; translucent ruled secondary controls. Hover brightens orange or changes the neutral fill. Inherited target heights remain; ordinary focus is blue, bento and branch focus orange.
- **Fields / filters / tags:** native labeled fields retain page-colored interiors; search becomes blurred glass. Pressed category filters use the fixed orange pair. Technology tags gain glass fill and a rule. Keep visible labels and native control behavior.
- **Navigation:** one five-destination tree adapts from floating rail to dock. Current text is orange, with a blue/orange gradient on desktop and orange tint on phones. Desktop hover shifts slightly right; dock hover does not move. Tool tabs use inset segmented surfaces.
- **Tech Text:** actual Canvas 2D pointer-responsive name strokes and click/tap kick. Sweep, dragging, labels, guides, and selection decoration are off. Resolution is capped and offscreen rendering pauses. A DOM name replaces canvas when effects are disabled.
- **Magic Bento:** actual grid/light/tilt/click engine populated from the project manifest. Cards open original projects directly; the last card opens the index. Stars, magnetism, and intro are off. Fine hover pointers enable tilt/spotlight; disabling effects resets the engine. Cards coexist with the denser ruled index.
- **Branched Menu:** actual folds and selection traces, three groups (Projects, Useful shortcuts, Quick links), native anchors, URL-controlled active value, SVG chevron, and existing icons. Rows (44px), indent (28px), trunk (8px), arc radius (8px), labels (12px). Collapsed content is aria-hidden and inert; effects-off durations are zero.
- **Glass hosts:** separate decorative renderer layers sit behind normal content; task/feed surfaces use their observed frosted variants. Do not apply distortion to the controls themselves.
- **Dialogs / settings:** centered native dialogs become phone bottom sheets, retaining focus containment, Escape/outside dismissal, focus return, and scroll restoration. Preview closes on destination/panel changes. Settings offer System/Light/Dark, Calm, and Atmosphere with V2 persistence.
- **Motion:** light fields drift alternately over (18s) and (21s); branches, orbit actions, navigation, glare, and inherited view entrances give shorter feedback. Tech Text and bento react to interaction. Reduced motion, Calm, high contrast, forced colors, active-view state, and document visibility gate optional engines. Exact observed timings and renderer settings live in the sidecar.

## Do's and Don'ts

### Do:

- **Do** use ice-blue/navy glass with readable orange actions and blue illumination.
- **Do** keep actual Glass Surface refraction behind text and controls.
- **Do** use actual Tech Text, Magic Bento, and Branched Menu implementations for signature interactions.
- **Do** retain native direct project links, visible navigation labels, and title-first index rows.
- **Do** honor Calm, reduced motion, reduced transparency, high contrast, forced colors, and hidden-page behavior.

### Don't:

- **Don't** propagate the scoped V2 system into V1 or root design context.
- **Don't** reintroduce the superseded notebook palette or its static-only atmosphere restriction.
- **Don't** distort text or controls inside the refraction layer.
- **Don't** replace real portfolio content with vendor demo tiles or decorative metrics.
- **Don't** rely on optional effects to expose content, state, or navigation.
