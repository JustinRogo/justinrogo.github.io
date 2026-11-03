# Homepage assembly experiment

Run `npm run dev:v2` from the repository root. Open:

- Normal visit: `http://127.0.0.1:4392/v2/`
- Force a replay on document load: `http://127.0.0.1:4392/v2/?replayIntro=1#/home`
- Disable the intro for a visit: `http://127.0.0.1:4392/v2/?intro=0#/home`

Home's header has a **Replay intro** control (a refresh icon on phones). Settings includes **Homepage assembly**, alongside Calm mode. Reduced motion, increased contrast, forced colors, hidden-document state, and Calm mode override autoplay and replay. The replay parameter bypasses the session flag, not accessibility preferences.

## Architecture

`src/assembly/HomepageAssembly.jsx` provides the target registry, session policy, replay/skip controls, cancellation, and decorative overlay. `AssembleReveal` is a React slot: it composes a ref onto its existing child without adding a DOM wrapper. `SectionTitle` passes normal DOM props through to its existing root. Featured project content registers its existing Magic Bento cell through `closest`, without modifying the vendor engine.

`AssemblyTimeline.js` uses the existing GSAP dependency. It measures visible target bounds at preparation and timeline start, assigns concurrent jobs, and moves pointer tips to their measured anchors. Text/navigation use clipping, glass uses opacity and traced outlines, and placed details/cards use small transforms. Each agent reuses a target-sized SVG guide and a click pulse. Frame tracing uses edge-length proportions to keep cursor travel and outline drawing coordinated.

There is one homepage DOM tree throughout. The heading, portrait, links, cards, navigation, and shell are the normal React components. The overlay contains only decorative pointers, guides, and alignment dots. It has no pointer events, accessible content, or keyboard stops. Nothing submits a form or activates an external integration.

The V2 HTML entry starts with an empty React root instead of boot-time loading copy; the existing no-JavaScript link to V1 remains available.

The initial layout is reserved by the actual components. GSAP temporarily owns presentation styles inside a lifecycle context; it never replaces text, inserts interface copies, or changes layout-driving dimensions. At completion or interruption, the context restores the original inline styles. No homepage remount, overlay-to-page crossfade, or final component swap occurs.

## Configuration and choreography

Edit `src/assembly/assemblyConfig.js`:

| Setting | Default |
| --- | --- |
| `enabled` | `true`; build-time master switch |
| `cursorCount` / `mobileCursorCount` | 5 / 4; supported range 3–6 |
| `duration` / `mobileDuration` | 3200 / 2600 ms, plus 160 ms bounded preparation |
| `colors` / `labels` | Six presets; the first five accents/job labels are used by default |
| `intensity` | 0.7; guide/pulse strength and placement distance/scale, range 0–1 |
| `oncePerSession` | `true`; set false to repeat on Home activation |
| `sessionKey` | `jr-v2-assembly-seen-v1` in sessionStorage, with an in-memory fallback |

The same file defines every task's target ID, cursor, effect, start fraction, and duration fraction. Anchors derive from the effect and the target's visible bounding box. A cursor's travel is scheduled around its previous job. Phones use their actual dock/layout measurements and four agents; offscreen targets stay ordinarily rendered.

To include another existing element, attach a slot and add a corresponding task:

```jsx
<AssembleReveal id="example">
  <section className="existing-component">...</section>
</AssembleReveal>
```

The child must be a DOM element or pass its `ref` and DOM props to its existing root. Keep target IDs unique.

## Interruption, data, and performance

Pointer down, focus, keyboard input, scrolling, route changes, viewport changes, document visibility, and late font/hero/navigation geometry changes immediately reveal the ordinary page. There is no input lock or artificial wait for remote data. Content ready during preparation joins the timeline; content arriving later uses its normal loading/retry path and stays visible. A watchdog and cleanup path prevent stranded hidden elements.

The sequence is finite. It has no per-frame React state updates or layout-measurement loop. Ambient drift pauses during construction and resumes afterward. Guide paint areas are bounded to their targets. The existing refractive glass remains visually unchanged after handoff. Automated Edge measurements on the glass-heavy 1024px light layout did not consistently sustain 60 FPS, including with the intro disabled; physical-device performance and Safari remain unverified.

## Verification

`npm run test:v2` includes `tests/assembly.spec.mjs`. It checks real-node identity, layout invariance, measured cursor arrivals, style restoration, session and forced replay, repeated replay, resizing, keyboard and route interruption, motion preferences, settings, slow data, scrolling, and external-write prevention. Initial/construction/completed screenshots are saved at 375px and 1440px under the ignored `.impeccable/review/` directory. Additional read-only review covered 430px, 768px, and 1024px, both themes, and touch emulation.

All implementation changes are V2-owned. Production V1, project destinations, shared integrations, deployment configuration, and npm dependencies are unchanged.
