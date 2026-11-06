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
  glass-edge: "rgba(65, 88, 120, 0.48)"
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
  dark-glass-edge: "rgba(32, 51, 78, 0.85)"
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
  strength-thinking: "#10b981"
  strength-relationship: "#0066ff"
  strength-executing: "#7c3aed"
  strength-influencing: "#ff7e5f"
  strength-light-ink: "#ffffff"
  background-blue: "#0066ff"
  background-cyan: "#00f2fe"
  background-violet: "#7c3aed"
typography:
  background-option:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 550
  background-description:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.77rem"
    fontWeight: 400
    lineHeight: 1.5
  strength-overview:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 550
    lineHeight: 1.4
  strength-method:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.74rem"
    lineHeight: 1.65
  strength-reflection:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.88rem"
    lineHeight: 1.85
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
  tag: "3px"
  field: "3.5px"
  icon: "4px"
  tool-tab: "4.5px"
  button: "5.5px"
  navigation: "6px"
  search: "6px"
  tool-navigation: "7px"
  orbit-action: "8.5px"
  topbar-phone: "6px"
  topbar: "6px"
  panel: "11px"
  glass-host: "6px"
  phone-sheet: "12px 12px 0 0"
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
- **Glass fill / edge** (`glass-fill`, `glass-edge`, dark counterparts): translucent material and dark inset rims shared by refractive and frosted panels. `nav` supplies hover and segmented surfaces.

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

The desktop has a floating rail (240px wide by default, inset 18px), a workspace offset equal to its width plus 36px, an inset Hartford strip, and centered content. A keyboard-accessible right-edge separator resizes the rail from 200px to 360px, capped at 32% of the viewport with a 240px maximum floor. Width persists under a V2-only key; Enter or double-click restores the default. Main gutters are (32px), with the inherited main cap (1300px). Home places a two-column glass hero above selected-work bento, a full-width notes panel, and contact. Branches live below primary navigation in the desktop rail; its middle region scrolls while contact/settings remain reachable. At 800px and below, the same branches are available in More.

- At or above (801px): the topbar docks flush to the top when scrolled, above page content and below the rail. Past 12px of scroll its surface eases out over 450ms to fill the workspace from the rail to the scrollbar and squares its corners, while its controls stay aligned with the page content. Reduced motion and Calm skip the easing. Scroll targets and the Home events column clear it through `--topbar-clearance` (77px). Below 801px it scrolls with the page.
- At or below (1150px): the desktop rail still resizes within viewport limits; gutters become (22px).
- At or below (800px): rail (68px), workspace offset (90px), gutters (18px). Navigation labels stay visible; portrait geometry simplifies.
- At or below (600px): the same navigation tree becomes a floating labeled glass dock; bottom workspace clearance is (108px) plus safe area. Main gutters become (14px), Home becomes one column, and lower panels stack. A 76px portrait sits beside four 44px contact targets, with the strengths preview beneath; at 360px those contact targets form two columns.
- At or above (1600px): the hero gains padding and the name reaches its larger display size.
- With a desktop sidebar, Home switches its hero and notes to one column when the actual content container is 600px or narrower, so resizing cannot crowd the portrait into the heading. At 360px and below, the fallback name uses a smaller fluid size to fit the smallest phones.
- Magic Bento requests four columns, rows (170px), and gap (16px). Container measurement chooses four/two/one columns from minimum cell widths (150px) and pair widths (200px). Phone CSS gives every card one span, a taller first card, and gap (13px).
- Projects keep title-first ruled rows inside one glass list container. Forms, About, and feeds retain their established responsive structures.

Spacing is contextual; frontmatter lists reused steps without imposing a new mathematical scale. The supported body minimum remains (320px).

## Elevation & Depth

Glass is structural throughout V2. Floating rails, headers, hero, and lower panels use theme-specific panel shadows. Project lists and task surfaces use translucent fills, blur, and larger curves; bento adds reflected rims and pointer illumination. Dialogs remain solid and retain their inherited modal shadow.

GlassLayer uses the shared Glass Surface SVG renderer behind controls, including on featured tiles. The React Bits preset sets a border width factor of 0.05, map brightness of 42%, map opacity of 0.51, frost opacity of 0.2, displacement scale of −110, and red offset of 5. Fine-pointer devices may refract. Touch and reduced motion use frosted glass. Reduced transparency, high contrast, and forced colors make layers opaque. The dock uses a near-opaque surface mix (94%) for labels.

Settings offers the original Shape Waves, Antigravity, Fractal, and Aurora backgrounds, V2's Orbits, and None. Device default selects Shape Waves above 800px and Aurora on compact screens. An explicit choice persists in V2 preferences. The old disabled-atmosphere setting maps to None. Only the selected renderer mounts. The existing Shape Waves/Antigravity engines keep their pixel budgets, fallback canvases and disposal; Aurora uses three drifting CSS light fields, and Fractal uses the original bounded canvas. Orbits keeps V2's blue/orange light and SVG ellipses. Motion pauses during assembly and while hidden. Calm/reduced motion use still versions; contrast and reduced transparency suppress the layer. The background-specific blue/cyan/violet tokens preserve the original background palette alongside the existing semantic orange.

**The Opaque Escape Rule.** Preserve the implemented fallbacks so readability and operation remain available when refraction, transparency, or motion is suppressed.

## Shapes

The glass hero, topbar, mobile dock, and featured bento use 6px corners. The desktop rail is square. Other panels use 11px, buttons use 5.5px, and fields use 3.5px. Construction guides follow the host corners. Portraits and orbital geometry retain circles and ellipses.

Line icons remain inline SVG with rounded caps/joins and the existing stroke (1.65). Branched Menu uses real trunk, arc, and trace geometry. The leading statutes tile uses the shared book icon with CT lettering; the featured destinations are CT General Statutes Explorer, Law Library Heatmap, and AI Corner Updates.

## Components

- **Buttons:** orange primary actions with dark text and a soft orange shadow; translucent ruled secondary controls. Hover brightens orange or changes the neutral fill. Inherited target heights remain; ordinary focus is blue, bento and branch focus orange.
- **Fields / filters / tags:** native labeled fields retain page-colored interiors; search becomes blurred glass. Pressed category filters use the fixed orange pair. Technology tags gain glass fill and a rule. Keep visible labels and native control behavior.
- **Navigation:** one five-destination tree adapts from floating rail to dock. Current text is orange, with a blue/orange gradient on desktop and orange tint on phones. Desktop hover shifts slightly right; dock hover does not move. Tool tabs use inset segmented surfaces.
- **Tech Text:** actual Canvas 2D pointer-responsive name strokes and click/tap kick. Sweep, dragging, labels, guides, and selection decoration are off. Resolution is capped and offscreen rendering pauses. A DOM name replaces canvas when effects are disabled.
- **Magic Bento:** actual grid/light/tilt/click engine populated from the project manifest. Cards open original projects directly; the last card opens the index. Stars, magnetism, and intro are off. Fine hover pointers enable tilt/spotlight; disabling effects resets the engine. Cards coexist with the denser ruled index.
- **Branched Menu:** actual folds and selection traces, six groups (Projects, Work, UCPEA, For Fun, Useful shortcuts, Quick links), native anchors, URL-controlled active value, SVG chevron, and existing icons. Work/UCPEA/For Fun expose all 15 original directory pages from the shared manifest. UCPEA puts Member Dashboard first, with nested Current Contract, Contract History, and Contract Comparison links. These three labels are V2 aliases; destinations and manifest titles are unchanged. Nested semantic lists and 32px deeper branch geometry express the hierarchy; the Dashboard remains a direct link. Directory rows (64px) accommodate long titles; shortcut rows remain (44px), indent (28px), trunk (8px), arc radius (8px), labels (12px). Collapsed content is aria-hidden and inert; effects-off durations are zero.
- **CliftonStrengths:** the original green Thinking, blue Relationship Building, purple Executing, and orange Influencing colors are a scoped semantic exception to the site's blue/orange palette. The weighted overview derives all domain shares from all 34 ranks using 35 − rank points (595 total), independent of Top 5/10/34 filtering. A four-segment bar has a complete text alternative and a labeled percentage legend. Colored rank badges use dark action ink on green/orange and white on blue/purple, with text domain labels alongside them. The two original best/overextended reflection passages are extracted at build time and switched with native pressed-state buttons. On wide screens, the compact overview sits beside a 70ch reflection column; at 1000px they stack, and at 600px the legend becomes a single column. Ranked theme details remain native disclosures.
- **Strengths strand and By domain board:** an 80px inline SVG between the view controls and the cards draws all 34 themes in rank order, inside two muted hexagon outlines that meet at a pinch between ranks 5 and 6. All bars are full height and share one pitch, sitting only in each hexagon's flat run, which leaves a wider gap at the pinch. Layout follows the container's measured width, not the viewport; below 640px the outlines drop and one row of bars remains. Bars are one tab stop with arrow-key roving. A click widens the filter if needed, scrolls to the theme, and focuses it. The By domain view lists domains alphabetically with alphabetical square flip cards: ranks 1–5 and 6–10 are solid domain color with badge ink, and ranks 11–34 are 15% domain color mixed into the opaque surface with muted text so contrast does not depend on the page background. Columns are 4 at 900px of container width, 2 at 480px, otherwise 1. A flipped card shows the same back face as the other views, spans its column's width, and grows to fit its description. By domain is the first and default view. Hovering or keyboard-focusing a bar or card highlights its partner: the bar keeps its domain color while the others turn the outline gray, and the card rises with its full domain color. While a bar is the source, every other card also turns one uniform gray; a bar whose card is filtered out grays nothing. Touch does not trigger this.
- **Portrait contacts:** calendar, email, Teams chat, and telephone are native labeled links. Four floating controls surround the portrait on larger screens and form a compact row beside it on phones. A small strand of all 34 themes, drawn by the same layout as About's, links directly to `#/about?section=strengths`, scrolling to and focusing its heading; direct refresh and history retain normal routing.
- **About contacts:** the introduction adds secondary LinkedIn/GitHub buttons using existing contact destinations. Sidebar “Let’s connect” opens `#/about?section=contact`, scrolling to and focusing “Say hello.” The sidebar keeps a labeled Settings control; the original-site link and prototype label are removed there. Original-site access remains in the footer.
- **Glass hosts:** separate decorative renderer layers sit behind normal content; task/feed surfaces use their observed frosted variants. Do not apply distortion to the controls themselves.
- **Dialogs / settings:** centered native dialogs become phone bottom sheets, retaining focus containment, Escape/outside dismissal, focus return, and scroll restoration. Preview closes on destination/panel changes. The topbar switches directly between Light and Dark. The full Settings dialog opens from the sidebar or from More on phones and offers System/Light/Dark, Calm, Homepage assembly, and Page background with V2 persistence. Backgrounds use a labeled native radio group: two columns on desktop, one on phones, with short descriptions and 12px insets.
- **Homepage assembly:** a finite, session-only GSAP sequence manipulates existing nodes through ref slots, without layout wrappers or interface copies. Layout enters alone to trace persistent, measured outlines of the header, hero, navigation shell, and project tiles; the crew joins at 35% of the timeline to add Theme, Content, Details, and Projects. Each outline fades as its real component fills in. Five cursors (four at phone widths) use short job labels, click pulses, selection handles, target-sized tracing guides, text masks, opacity reveals, and small placement transforms. Navigation hit regions stay stable during the reveal. Default duration is 5800ms / 4800ms plus 160ms preparation. Input, navigation, resizing, visibility, and late geometry changes immediately restore normal presentation. Ambient drift pauses during construction. Replay is in the header; motion/contrast preferences override it. Decorative agent labels use 10px/650 Geist on the configured pastel colors, 3px corners, and the existing #071528 action ink. The grid's black alpha is a mask coefficient, not a new product color. See ASSEMBLY.md.
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
