---
name: Justin Rogowski — Updates
description: Scoped record of the Updates feed, editor, discussion, and embedded reading view.
colors:
  background: "#070d1e"
  surface: "#101a30"
  ink: "#f8fafc"
  text: "#ced8e7"
  muted: "#a0aec3"
  line: "#2c3851"
  accent: "#ff987f"
  accent-ink: "#24120e"
  link: "#a6cfff"
  focus: "#9bdcf5"
  danger: "#ffb5b8"
  field: "#0b1427"
  light-background: "#f5f7fa"
  light-surface: "#fff"
  light-ink: "#10203d"
  light-text: "#33435b"
  light-muted: "#52637b"
  light-line: "#d6dee9"
  light-accent: "#99402c"
  light-accent-ink: "#fff"
  light-link: "#165cb1"
  light-focus: "#1d67c2"
  light-danger: "#a72e3b"
  light-field: "#fff"
typography:
  page-title:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "clamp(2.4rem, 5vw, 3.4rem)"
    fontWeight: 720
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  post-title:
    fontSize: "clamp(1.4rem, 3vw, 1.8rem)"
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "16px"
    lineHeight: 1.65
  post-body:
    fontSize: "1rem"
    lineHeight: 1.8
  button:
    fontSize: "0.88rem"
    fontWeight: 650
    lineHeight: 1.4
  metadata:
    fontSize: "0.78rem"
rounded:
  field: "8px"
  control: "10px"
  panel: "14px"
spacing:
  small: "12px"
  medium: "16px"
  section: "24px"
  large: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.background}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
  composer:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "24px"
---

# Design System: Updates surface

## Overview

This document describes only `Pages/Updates`. It records the completed extension, not a replacement identity for the repository. The homepage remains the visual authority: navy backgrounds, slate text, warm orange emphasis, and rounded controls. The unrelated WFC design system has no authority over this surface.

The feed prioritizes readable writing and quiet dividers. Author operations use the same palette and hierarchy as reading; the embed compresses the reading surface onto a light background. This scope intentionally omits the homepage's decorative background animation.

**Key Characteristics:**

- A wide reading column with a narrower supporting rail.
- Flat post rows; tonal panels for editing, notices, and dialogs.
- Warm accent for primary actions and status emphasis; blue for reading links.
- A compact widget that directs readers to the full post.

Evidence: `updates.css`, `index.html`, `embed.html`, `updates.js`, and `embed.js`; inherited context in `/style.css`; direction in `/docs/updates-surface.md`. Desktop, mobile, and widget preview screenshots were inspected in `.impeccable/review/updates/`. These show labeled example content, not a live deployment. Live Supabase operation and the Confluence tenant embed remain unverified.

## Colors

### Primary

Warm orange carries the main publishing action, author mark, selected tab underline, pinned/draft labels, quote rule, text selection, and caret. Its darker light-theme counterpart maintains the same role.

Blue is the functional link color. Focus uses a separate, clearly visible color. Danger is reserved for error text and destructive confirmation controls.

### Neutral

The background is deep navy; surface and field colors distinguish operating areas. Ink identifies headings and field contents, text carries reading copy, and muted text carries metadata and supporting guidance. Line color separates posts, discussion, rail sections, and navigation.

Light mode replaces the same semantic roles through `body.light`. The widget defaults to light mode and places its body on the surface color rather than the page-background color. Its query parameters also support dark and automatic themes.

**The Semantic Theme Rule.** Apply a role through the existing CSS custom property so dark and light treatments remain paired; this scoped palette does not redefine the homepage's tokens.

## Typography

The extension uses the platform UI stack recorded above. The homepage separately uses Space Grotesk. This is a documented local implementation difference, not a new global display-font decision.

The page title uses the responsive title token. Post titles use the responsive post-title token, becoming a fixed mobile size (1.5rem) below the narrow breakpoint. Section headings are compact (1.35rem); post subheadings have their own reading sizes (1.35rem and 1.1rem).

Post copy uses the more open post-body leading and a maximum line length (72ch). Metadata is smaller and muted. Buttons have their own compact weight and leading. Widget body text starts smaller (14px); widget headings and excerpts are deliberately condensed (1rem and .86rem), while dates use tabular numerals.

## Layout

The main wrapper is centered with a maximum width (1200px) and horizontal padding (48px). The header is a compact flex row with a minimum height (100px). The heading introduces the channel with vertical spacing (56px above, 40px below).

Desktop uses a flexible feed plus a fixed rail (224px) with a generous gap (60px). At widths up to 850px, wrapper padding becomes narrower (28px), the rail becomes smaller (190px), and the gap tightens (32px). At widths up to 640px, wrapper padding tightens again (20px), the header becomes shorter (80px), and the rail follows the feed in a single column. Heading actions stack below the title. Author actions wrap, tabs can scroll horizontally, and composer actions share the available width.

Post rows use a top rule and generous vertical padding (28px above, 32px below); the mobile variant tightens both. Discussion has a separate top rule. The reading column can shrink without forcing horizontal overflow; long links and content wrap, while images retain their aspect ratio within the available width.

The widget has a centered maximum width (760px), compact padding (22px 26px), and narrower mobile padding (18px). It displays three posts by default, configurable from one through five, with excerpts clamped to three lines. Suggested iframe height (480px) is an embedding recommendation, not evidence of a configured Confluence macro.

## Elevation & Depth

The Updates surface is flat. It uses tonal fields, thin rules, and background changes rather than cast shadows. The outline button's inset shadow is a one-pixel border treatment, not elevation. Dialogs sit over a black translucent backdrop (`rgb(0 0 0 / .65)`). No decorative motion or ambient glow is implemented here.

Button colors transition briefly (.15s); pressing a button moves it downward (1px). Reduced-motion preferences disable transitions. Visible keyboard focus uses an outline (2px) with separation (4px).

## Shapes

Fields use the smaller radius; buttons, notices, code blocks, and post images use the control radius. The composer and dialogs use the panel radius. The author mark is circular (44px square). Feed rows retain open edges rather than rounded card shells. Borders are thin (1px); the selected tab has a stronger bottom rule (2px).

## Components

### Buttons

Primary buttons are warm filled controls. Outline buttons use transparent backgrounds and an inset border. Quiet buttons are compact text actions with muted text and reduced inline padding (8px). Destructive confirmation buttons use the danger role.

The shared action controls have a minimum height (42px). Primary hover brightens the fill; outline and quiet hover use the surface color. Disabled buttons reduce opacity (.6) and use a wait cursor. All use the visible keyboard focus treatment.

### Feed and discussion

Each post starts with author/date metadata, optional text status, a linked title, rich text, and a wrapping action row. Text status labels are unboxed, not chips. Opening a post updates the shareable URL and reveals its discussion in the reading column. Comments use separated rows, preserve entered line breaks, and show pending status in the accent color.

### Composer and fields

The composer is a tonal panel. Labels sit above full-width fields. Fields use a line-colored border, the field background, ink text, and muted placeholders. The Quill toolbar and editing area form one joined control with rounded outer corners. The editable body has a minimum height (250px) and a viewport-relative maximum (65vh). Toolbar hover and active formatting use the accent color.

Post options are collapsible. Save/publish actions align at the end of the desktop panel and stretch on mobile. Supporting save and upload messages occupy their own text space.

### Navigation and supporting rail

The site name links home; the breadcrumb is hidden at the middle breakpoint. Author tabs indicate the current view through ink text and an accent underline. The rail combines the author mark, explanatory text, RSS, and a collapsed Confluence embedding disclosure. It becomes ordinary document flow beneath the feed on mobile.

### Notices and dialogs

Notices are bordered tonal panels; errors use danger text. Preview notices explicitly label example content. Dialogs use the panel radius, a constrained width (480px or viewport minus 32px), padding (28px), and scroll within a viewport-relative maximum (90dvh). Authentication and confirmation actions remain visibly distinct.

### Embedded reading view

The widget removes site navigation and author controls. Its header pairs the widget title with a full-site link. Each ruled row contains a date, linked title, and short excerpt. Footer links provide RSS and explain where discussion takes place. Loading, empty, unavailable, retry, and preview states share the same compact visual language.

## Do's and Don'ts

### Do:

- **Do** keep these tokens scoped to Updates and preserve the homepage as the inherited identity source.
- **Do** retain the text-first post rows, semantic theme roles, visible focus, and mobile flow established here.
- **Do** keep preview examples visibly labeled and validate actual connected states separately.

### Don't:

- **Don't** promote this surface's layout or local token values into a repository-wide system.
- **Don't** add the homepage's animated background to this reading surface; the confirmed direction omits it.
- **Don't** treat the local system-font page heading or Unicode link arrows as a new shared display-font or icon system. They are existing implementation details, not additional global design rules.
