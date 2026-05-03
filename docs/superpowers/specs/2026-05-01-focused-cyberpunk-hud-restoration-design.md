# Focused Cyberpunk HUD Restoration Design

## Summary
Restore the older Edgerunners-inspired HUD feel only for active cyberpunk gameplay surfaces. The current PlayerCard, profile picker/profile cards, lobby panels, background images, and current dark image overlays stay unchanged.

## Goals
- Make chat, settings, and game HUD controls feel cohesive with a Cyberpunk 2077 / Edgerunners interface.
- Improve active gameplay readability with darker glass backplates, yellow/cyan hierarchy, slanted chip geometry, and thin neon separators.
- Keep the effect restrained: micro-glitch and glow should appear on hover, focus, active, urgent, or selected states rather than running everywhere.
- Keep all game logic and data flow unchanged.

## Explicit Non-Goals
- Do not redesign `PlayerCard.jsx` or its current cyberpunk visual treatment.
- Do not redesign profile cards, the profile picker grid, or profile selection states.
- Do not redesign lobby setup/waiting panels, lobby player rows, or host lobby panels.
- Do not change current cyberpunk background image assignments or dark overlays.
- Do not alter standard theme styling except where an existing shared component needs a harmless class hook; all visual changes must be cyberpunk-scoped.

## Components In Scope
- `ChatPanel.jsx`: panel shell, tab bar, channel indicator, message bubbles, message input area, impersonation switcher/modal.
- Game settings UI in `Game.jsx`: settings modal shell, modal header/divider, theme select, aura/emote controls, close button.
- `SettingsActionButton.jsx`: cyberpunk setting action button surface, active/off badge, hover/focus/disabled states.
- `PhaseTimer.jsx`: timer container, label, urgent state.
- `VoteProgressBar.jsx`: vote progress track/fill, count badge, animated sheen.
- In-game controls in `Game.jsx`: top bar chips, role/settings/show-chat buttons, vote button, lawyer dismiss button, skip bar container surfaces, mobile chat modal header.
- Existing button/input/select classes when used by the in-game HUD, scoped under `body.theme-cyberpunk`.

## Visual Direction
Use a focused Edgerunners HUD language:
- Surfaces: near-black glass, subtle blur, fine borders, and dark violet/cyan shadows.
- Accents: cyan for crew/live states, magenta for Gnosia/encrypted states, yellow for command/action/status labels, red for danger.
- Geometry: clipped or angled corners on controls and bubbles, but keep layout dimensions stable.
- Typography: compact uppercase labels with small letter spacing; avoid oversized text inside controls.
- Motion: short hover lift, diagonal progress sheen, subtle focus glow, urgent timer flicker. Respect `prefers-reduced-motion`.

## Styling Architecture
- Add or reuse semantic class hooks in components where inline styles currently block theme refinement.
- Put the visual implementation in `client/src/cyberpunk.css` using selectors under `.theme-cyberpunk`.
- Keep existing inline styles as the standard-theme fallback wherever practical.
- Avoid targeting arbitrary inline styles or z-index values.
- Do not add new dependencies.

## Component Details

### Chat
The chat panel keeps `Room.jpg` and its current overlay. Cyberpunk-specific CSS should make the shell read as a HUD console: darker inner backplates, channel-colored tab states, and clear input affordances.

Message bubbles get class-based cyberpunk styling:
- Crew bubbles: cyan left/right accent stripe.
- Gnosia bubbles: magenta accent stripe.
- System messages: muted yellow microtext with thin separators.
- Own messages may align as they do now, but should have stronger neon edge contrast.

### Settings
The settings modal keeps `Lucy.jpg` and its current overlay. The content layer should feel like a cyberdeck panel: glass surface, yellow header, thin cyan/magenta separators, and compact controls.

`SettingsActionButton` should receive class-based cyberpunk states:
- Off: dark glass, muted yellow text.
- Active: stronger yellow border, small cyan/magenta glow depending on context if available.
- Disabled: low opacity, no hover lift.
- Focus: visible keyboard outline.

### In-Game HUD Controls
Top bar chips, phase timer, vote controls, skip controls, and mobile chat header should share the same HUD treatment:
- Dark backplate.
- Thin yellow/cyan border.
- Stable clipped corners.
- Command labels in yellow.
- Live/phase values in cyan or the existing phase color.
- Urgent states use red with restrained flicker.

Vote progress gets a darker track, neon gradient fill, and diagonal sheen when motion is allowed.

## Accessibility And Performance
- Text on dark surfaces should remain readable at normal gameplay sizes.
- Focus states must be visible for keyboard navigation.
- Animations must disable or collapse under `prefers-reduced-motion`.
- Avoid heavy global filters; use transforms and opacity for motion.
- Do not introduce layout shifts on hover.

## Verification
- Run `npm run build` in `client/`.
- Run the existing theme-store test if present: `npm run test:theme`.
- Manual cyberpunk checks:
  - Chat tabs, chat bubbles, chat input, empty chat state.
  - Gnosia chat if available.
  - Settings modal, settings buttons, theme select, close button.
  - Phase timer normal and urgent states.
  - Vote progress and vote controls.
  - Skip phase controls.
  - Mobile chat header/control surfaces.
- Regression sanity:
  - Standard theme still uses existing baseline styling.
  - PlayerCard, profile cards, profile picker, lobby panels, and current image overlays remain visually unchanged.
