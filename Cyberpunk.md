## Cyberpunk Theme (Edgerunners HUD) — Refinement Plan

### Summary
Unify the Cyberpunk theme into a cohesive Edgerunners-like HUD: cleaner high-contrast surfaces, bold yellow/cyan accents, slanted “ID chip” cards, and subtle scan/glitch only on interaction. Primary goal: improve readability (especially Lobby) and redesign the Cyberpunk profile cards to feel more anime/HUD and less “generic tile”.

---

### Key Changes (Design + Implementation)

#### 1) Establish Cyberpunk design tokens (CSS variables)
- In `body.theme-cyberpunk`, define theme tokens (CSS vars) for:
  - **Background:** `--cp-bg`, `--cp-bg-overlay`, `--cp-noise-opacity`, `--cp-bg-dim` (brightness multiplier)
  - **Surfaces:** `--cp-surface-0/1`, `--cp-surface-border`, `--cp-surface-shadow`
  - **Text:** `--cp-text`, `--cp-muted`, `--cp-microtext`
  - **Accents:** `--cp-cyan`, `--cp-magenta`, `--cp-yellow`, plus danger/success
  - **Geometry:** `--cp-cut` (corner cut size), `--cp-stroke` (border thickness)
- Replace “random one-off hex values” inside the Cyberpunk section with these vars so the look stays consistent.

#### 2) Fix lobby brightness + player readability (Darken + Overlay)
- Keep the current `Cyberpunk.jpg` as the global theme background, but add a **darkening overlay layer**:
  - Implement `body.theme-cyberpunk::before` as a fixed full-screen gradient overlay (dark violet/black with slight cyan tint).
  - Optionally add `body.theme-cyberpunk::after` as subtle noise (very low opacity) to reduce banding and make flat areas feel more “animated HUD”.
- Reduce “busy image on surfaces”:
  - For `.panel`, `.panel-glow`, `.panel-danger` in cyberpunk, stop using the Room/Lucy/David images as the *main* fill.
  - Instead: use a dark glass gradient + low-opacity image layer via `::before` (so the vibe stays, but text/players stay readable).
- Lobby waiting room “Crew Manifest” rows:
  - Add explicit classnames (e.g. `lobby-player-row`, `lobby-player-meta`) and style them in cyberpunk with:
    - darker backplate behind each row
    - stronger separation (thin yellow/cyan edge line)
    - dead/simple states readable on top of the background

#### 3) Make in-game PlayerCard match the Edgerunners HUD (reduce skew, improve hierarchy)
- Current cyberpunk `.player-card-frame` skew + repeating gradient reads “noisy” and can fight legibility.
- Update Cyberpunk override for `.player-card-frame` to:
  - remove or greatly reduce skew (keep angled corners instead)
  - add a clear hierarchy: name area, status/badges area, avatar frame with strong stroke
  - keep aura visuals working (don’t break existing aura classes), but ensure the base card is readable without aura
- Add micro-HUD details (subtle): corner ticks, small “SIGNAL” label, thin top stripe.

#### 4) Chat bubbles + chat panel cohesion
- `ChatPanel` currently uses inline styles for bubbles, so the Cyberpunk theme only affects the container.
- Add minimal class hooks in `MsgBubble` (e.g. `chat-bubble`, `chat-bubble--me`, `chat-bubble--dead`, `chat-bubble--gnosia`) and move the bubble look to CSS for Cyberpunk:
  - angled bubble shape (clip-path)
  - left/right accent stripe
  - crew = cyan, gnosia = magenta, system = muted yellow microtext
  - keep layout and logic unchanged

#### 5) Remove brittle modal targeting
- Replace `body.theme-cyberpunk [style*="z-index: 999990"] > div` with a real classname hook on the settings modal content (e.g. `modal modal--settings`).
- Style cyberpunk modal using the same surface tokens (glass + stroke + offset shadow).

---

### Visual Targets (what “finished” looks like)
- In-game:
  - Player cards feel like the same design system as the lobby profile cards.
  - Chat bubbles look “HUD”, not generic rectangles.

---

### Test Plan (manual + build checks)
- Run `npm run build` in `client/` to confirm no CSS/JS errors.
- Manual UI checks (Cyberpunk theme selected):
  - Lobby setup: profile grid scroll, hover/selected/taken states, readability on background.
  - Lobby waiting: Crew Manifest readability; emote popups; host controls panels.
  - Game: player cards (normal/hover/selected/dead), aura compatibility, chat (crew/gnosia/system), settings modal styling.
- Regression sanity: switch theme back to `standard` and confirm nothing breaks visually (since most changes are Cyberpunk-scoped).

---

### Assumptions / Defaults
- Keep the existing 4 Cyberpunk images in `client/public/themes/cyberpunk/` and solve brightness via overlays + surface treatment (no new assets required).
- Favor readability + cohesion over constant heavy glitch; glitch/scan effects appear only on hover/active/selected.
- Redesign focuses first on: Lobby profile picker + Lobby waiting list + PlayerCard + Chat bubbles; other components get token-based cleanup only if they noticeably clash.



Note: The playerCard ensure that it has all contents inside and fit everything. the background image of cyberpunk folder should be dim but still visible and is able to see clearly.

Summary: I want to add a new theme called "Cyberpunk" inspired by cyberpunk edgerunner and cyberpunk 2077. I want every design to change, but keep game logic the same. Im going to create a Cyberpunk folder and put all my assets there, so within the prompt, mention where the asset should be as well. Think to design where you think will fit like chatpanel or lobby or setting (the button) background or anything at all.
