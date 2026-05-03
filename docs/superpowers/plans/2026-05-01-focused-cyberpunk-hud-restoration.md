# Focused Cyberpunk HUD Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the Edgerunners HUD look for chat, settings, and in-game HUD controls without changing PlayerCard, profile cards, lobby panels, or background overlays.

**Architecture:** Add semantic class hooks to affected components, then implement cyberpunk-only visual rules in `client/src/cyberpunk.css`. Existing inline styles remain the standard-theme fallback; `.theme-cyberpunk` overrides provide the restored HUD style.

**Tech Stack:** React, Vite, CSS variables, existing `cyberpunk.css`, no new dependencies.

---

### Task 1: Add Semantic Hooks

**Files:**
- Modify: `client/src/components/ChatPanel.jsx`
- Modify: `client/src/components/SkipBar.jsx`
- Modify: `client/src/pages/Game.jsx`

- [ ] Add class hooks for chat tabs, channel bar, message list, input tray, identity switcher, and impersonation modal.
- [ ] Add class hooks for skip controls.
- [ ] Add class hooks for game top bar, phase chip, round chip, vote trays/buttons, mobile vote tray, mobile skip tray, and mobile chat overlay/header.
- [ ] Verify no PlayerCard, profile picker, lobby panel, or background image assignment is changed.

### Task 2: Restore HUD Styling In Cyberpunk CSS

**Files:**
- Modify: `client/src/cyberpunk.css`

- [ ] Add focused HUD variables for glass surfaces, yellow labels, cyan/magenta channels, clipped corners, and focus rings.
- [ ] Style chat panel internals and bubbles under `.theme-cyberpunk`.
- [ ] Style settings modal, theme select, and `SettingsActionButton` under `.theme-cyberpunk`.
- [ ] Style top bar controls, skip controls, vote controls, phase timer, and vote progress under `.theme-cyberpunk`.
- [ ] Add `prefers-reduced-motion` fallback for new sheen/glitch animations.

### Task 3: Verify

**Commands:**
- Run: `npm run test:theme` from `client/`; expected exit code 0.
- Run: `npm run build` from `client/`; expected exit code 0.
- Run: `npm run lint` from `client/`; record current result. Existing repo lint failures may remain outside this HUD pass.

**Manual checks:**
- Cyberpunk chat tabs, bubbles, input tray, and impersonation UI look like HUD surfaces.
- Settings modal and action buttons use yellow/cyan HUD hierarchy over the existing Lucy background.
- Skip, vote, phase timer, top bar, and mobile chat header use the restored HUD treatment.
- PlayerCard, profile cards/profile picker, lobby panels, and image overlays remain unchanged.
