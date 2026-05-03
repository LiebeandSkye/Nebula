## Plan: Cyberpunk Theme Overhaul

TL;DR - Create a full visual and CSS token overhaul for the Cyberpunk theme only, preserving the existing "standard" theme. Replace/extend `cyberpunk.css`, introduce a single source of truth token set, update key components to consume tokens, and integrate theme switching via `themeStore.js`. Deliverables: token file, updated CSS, component style updates, motion/asset specs, accessibility checks, and a designer-friendly prompt for producing assets.

**Steps**
1. Discovery (completed): scan theme files, components, and assets to map touchpoints. *done*
2. Alignment: confirm fidelity (Cyberpunk 2077, Edgerunners, or hybrid), font licensing, performance limits, and accessibility targets.
3. Design tokens: author `--cp-` CSS variables (colors, gradients, shadows, motion durations, sizes, z-indexes) and store them in `client/src/cyberpunk.css` and optionally `client/src/lib/themeTokens.js` for JS consumption. (*depends on step 2*)
4. Global effects & utilities: create utility classes for glows, glass, scanlines, and glitch overlays; implement `prefers-reduced-motion` fallbacks. (*parallel with step 3*)
5. Component updates: refactor styles for each component to use tokens instead of inline styles.
   - `client/src/components/PlayerCard.jsx`: tokens for card background, border glow, avatar frames, and animations.
   - `ChatPanel.jsx`: bubble gradients, timestamp style, and message-entry glow.
   - `PhaseTimer.jsx`, `VoteProgressBar.jsx`: HUD style counters and animated progress with neon gradient fill.
   - `SettingsActionButton.jsx`, other buttons: neon borders, hover glows, pressed states.
6. Theme switch integration: ensure `client/src/lib/themeStore.js` toggles CSS variables on `document.documentElement` and persists choice (localStorage). Add a smooth crossfade when switching themes.
7. Assets & icons: centralize cyberpunk assets under `client/public/themes/cyberpunk/`, provide 2x retina variants and SVG icons; add an `assets-manifest.json` for reference.
8. Testing & verification: visual snapshot tests (if available), manual UX pass, contrast checks, performance profiling (avoid excessive filters), and keyboard navigation checks.
9. Handoff: produce a final design spec + the prompt for designers/AI (below). Provide code review notes for each changed file.

**Relevant files**
- [client/src/cyberpunk.css](client/src/cyberpunk.css) — Primary theme CSS to be replaced/extended.
- [client/src/index.css](client/src/index.css) — Global styles; ensure tokens don't conflict.
- [client/src/lib/themeStore.js](client/src/lib/themeStore.js) — Theme toggle and persistence.
- [client/public/themes/cyberpunk/](client/public/themes/cyberpunk/) — Backgrounds and character art.
- [client/src/components/PlayerCard.jsx](client/src/components/PlayerCard.jsx) — High-priority component to refactor.
- [client/src/components/ChatPanel.jsx](client/src/components/ChatPanel.jsx) — High usage surface for readibility.
- [client/src/components/PhaseTimer.jsx](client/src/components/PhaseTimer.jsx) — HUD-style element.
- [client/src/components/VoteProgressBar.jsx](client/src/components/VoteProgressBar.jsx) — Animated progress element.

**Verification**
1. Run the app locally, toggle theme, and verify no layout shifts or style regressions.
2. Use contrast checkers to confirm text/background >= 4.5:1 where required.
3. Visual diff snapshots for critical screens (Lobby, Game, Player view).
4. Measure FPS/paint when animations run; remove heavy filters if CPU/GPU spikes.
5. Keyboard-only navigation and visible focus outlines.

**Decisions & Assumptions**
- Only the Cyberpunk theme will change; the standard theme must be left intact.
- Use CSS variables for runtime switching; JS will only toggle variables, not swap entire stylesheets.
- Preserve performance by minimizing heavy CSS filters and using GPU-accelerated transforms.

**Further Considerations**
1. Font licensing: prefer Google fonts (`Orbitron`, `Roboto Mono`) but confirm license for commercial use.
2. Provide a user preference to reduce motion/disable glows.
3. Prepare a small icon set (SVG) that matches the neon stroke style.


---

**Designer / AI Prompt (Detailed, actionable)**

Design and produce a complete Cyberpunk 2077 / Edgerunners-inspired UI theme for a multiplayer web app. Deliver a precise style token set, component style guidelines, motion specs, and asset exports suitable for direct implementation in CSS variables and component styles.

- Visual Identity: high-contrast, neon-heavy, high-tech HUD. Mood: rainy-night city, holographic HUD, digital grain.

- Color Palette (exact tokens):
  - `--cp-bg-900`: #07080d (deep black-blue)
  - `--cp-bg-800`: #0f1220
  - `--cp-surface`: #11121a
  - `--cp-text-primary`: #e8eaf0
  - `--cp-text-muted`: #7a8094
  - `--cp-accent-cyan`: #00E5FF
  - `--cp-accent-magenta`: #FF2D78
  - `--cp-accent-yellow`: #FFDA44
  - `--cp-neon-1` (gradient start): linear-gradient(90deg, #00E5FF 0%, #FF2D78 50%, #FFDA44 100%)
  - `--cp-noise-overlay`: rgba(255,255,255,0.02)

- Gradients & Glows:
  - Use layered gradients for borders: `border-image: linear-gradient(90deg, #00E5FF, #FF2D78) 1;`
  - Glow shadow: `drop-shadow(0 6px 28px rgba(0,229,255,0.12))` and `box-shadow: 0 8px 40px rgba(255,45,120,0.08)`.
  - Outer halo: `0 0 28px rgba(0,229,255,0.18), 0 0 64px rgba(255,45,120,0.06)`.

- Glass & Surface Treatment:
  - Panels: semi-transparent `background: rgba(20,22,32,0.56); backdrop-filter: blur(6px) saturate(120%); border: 1px solid rgba(255,255,255,0.04)`.
  - Add subtle vertical scanlines using repeating-linear-gradient and a very low opacity noise image overlay.

- Typography:
  - Headings: `Orbitron, sans-serif` (weights 400,700). Sizes: H1=24–28px, H2=18–20px.
  - Body: `Roboto Mono, monospace` or `Inter` fallback for UI numbers. Use letter-spacing +0.02em for headings to emulate HUD.

- Motion & Interaction:
  - Easing: `cubic-bezier(0.22, 1, 0.36, 1)` for entrance; `ease-in-out` for simple fades.
  - Durations: short=120ms, normal=280ms, long=520ms.
  - Pulse keyframe for neon: `0% { filter: drop-shadow(0 0 6px rgba(...)) } 50% { filter: drop-shadow(0 0 18px rgba(...)) } 100% {...}`.
  - Glitch effect: quick x/y transform jitter (5–30ms segments) with clip-path jitter for accidental artifact.
  - Respect `prefers-reduced-motion` by disabling non-essential animation and reducing parallax.

- UI Element Treatments (exact guidance):
  - Buttons: `background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; color: var(--cp-text-primary);` Hover: add `box-shadow` neon glow and a subtle translateY(-2px). Active: inset darker border.
  - Primary CTA: add animated neon border using `background-origin: border-box` + moving gradient mask for a continuous sheen.
  - Panels/Cards: slanted accent edge (pseudo-element) with accent gradient, slight 3D tilt on hover (transform: perspective(600px) rotateX(2deg) translateY(-6px)).
  - Avatars: circular with neon ring (2–4px) using `box-shadow` and small status dot using accent-yellow/cyan.
  - Progress Bars / Timers: use filled gradient with animated diagonal sheen; show numeric HUD overlay with subtle snapshot border.
  - Chat Bubbles: dark translucent bubble, left/right tinted accents (cyan for system, magenta for player), subtle float-in animation and micro-glitch on new messages.
  - HUD Overlays (top-right/left): semi-transparent panels with thin neon separators, compact numeric fonts, small animated dots for live status.

- Accessibility & Contrast:
  - Ensure text on primary surfaces meets WCAG AA (4.5:1). For small text, aim for 7:1 where possible.
  - Provide high-contrast toggle to increase text brightness and reduce background opacity.
  - Keyboard focus: thick visible outline using `box-shadow: 0 0 0 3px rgba(0,229,255,0.12), 0 0 8px rgba(0,229,255,0.18)`.

- Asset & Export Specs:
  - Background hero images: provide JPG/WEBP at 1920×1080 and 3840×2160 (2x). Optimize to <400KB for web where possible.
  - Character art: export PNG with transparent background at 400×400 and 800×800 for retina.
  - Icons: deliver as SVG with 24/32/48px viewBox and stroke-based neon-friendly paths. Also export PNG 2x.
  - Noise/scanline overlays: PNG or SVG pattern at 2x resolution.

- Implementation Notes for Developers:
  - Use CSS variables mounted on `:root` for base tokens; toggle values via `document.documentElement.dataset.theme = 'cyberpunk'` and a single CSS rule set for `[data-theme='cyberpunk']`.
  - Keep expensive filters (heavy blur, large drop-shadow) to a few top-layer containers; prefer `will-change: transform` for animated elements.
  - Prefer SVG filters for glow where possible to reduce repaints.

- Deliverables expected from designer/AI:
  1. Token JSON and CSS variable file (names matching tokens above).
  2. Sample CSS for: primary button, panel, card, progress bar, avatar component, chat bubble, and HUD timer (each with hover/focus/disabled states).
  3. 3–5 hero background images and a small icon set (SVG + PNG 2x).
  4. Motion spec sheet (keyframes, durations, easing) and `prefers-reduced-motion` fallbacks.

Implement the above directly as `client/src/cyberpunk.css` tokens and component style guidance. Keep the normal/standard theme unchanged; cyberpunk replaces only the styles under the `cyberpunk` theme selector.

---

NOTE: USE THE CYBERPUNK THEME FOLDER WITHIN PUBLIC FOLDER AS A BACKGROUND IMAGE.
For the chatpanel use Room.jpg as a background image and add a dark overlay on top of it but not too dark.
Within the setting panel, use Lucy.jpg as background image with also dark overlay but not too dark.

Currently when you try to create/join room, theres a panel there with lucy.jpg as a background, change that to Cyberpunk.jpg

Within lobby, 2 of them are lucy.jpg   make that into DavidxLucy.jpg

The title Project Nebula, Gnosia win, human win, Room code (NEB-xxxx): Make sure they are flickering effect with great cyberpunk font design, and shaking a little infinitely.