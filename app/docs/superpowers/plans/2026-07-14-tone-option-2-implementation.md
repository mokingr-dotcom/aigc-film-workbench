# Tone Workspace Option 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recreate the selected second 1440x1024 visual direction for only the tone workspace while preserving all existing IDs, prompt data, project persistence, transfers, and the other four workspaces.

**Architecture:** Keep the current static HTML and JavaScript application. Replace the rejected final override with one selected-design stylesheet scoped to the shared header and `#tone-workspace`; preserve the legacy styles as the fallback for inactive workspaces. Reuse the selected Image 2 result as the visual source and extract its real film imagery into local assets.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, local Lucide bundle, Node.js assertion tests, local HTTP server.

## Global Constraints

- Visual truth: `design-references/tone-option-2.png`.
- Target viewport: `1440x1024`.
- Implement only the shared header and `#tone-workspace` body.
- Preserve all existing element IDs, `data-workspace` values, prompt data, workspace switching, project save/import/export, copy, favorites, versions, and transfer actions.
- Do not redesign camera, casting, poster, or reverse workspace bodies.
- Do not add a fourth competing production stylesheet.

---

### Task 1: Lock the selected visual contract

**Files:**
- Create: `design-references/tone-option-2.png`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: existing `index.html` and generated Option 2 image.
- Produces: assertions for the selected stylesheet, two-row tone layout, preserved workspace IDs, and local visual assets.

- [ ] **Step 1: Copy the selected Image 2 result into `design-references/`.**
- [ ] **Step 2: Replace rejected precision-theme assertions with selected Option 2 assertions.**
- [ ] **Step 3: Run the Node test suite and verify the new assertions fail before implementation.**

### Task 2: Create exact local film-image assets

**Files:**
- Create: `assets/tone-option2-hero.png`
- Create: `assets/tone-option2-reference-1.png`
- Create: `assets/tone-option2-reference-2.png`
- Create: `assets/tone-option2-reference-3.png`

**Interfaces:**
- Consumes: `design-references/tone-option-2.png`.
- Produces: source-faithful raster imagery for the monitor and reference cards.

- [ ] **Step 1: Crop the selected design's rainy-neon monitor image.**
- [ ] **Step 2: Crop three reference-film strips from the selected design.**
- [ ] **Step 3: Verify dimensions and visually inspect every asset.**

### Task 3: Implement the selected tone workspace

**Files:**
- Modify: `index.html`
- Create: `tone-option2.css`
- Modify: `look-studio.js`

**Interfaces:**
- Consumes: current DOM IDs, existing application events, and Task 2 assets.
- Produces: selected-design header, top-left monitor, bottom-left library, full-height right composer, real thumbnails, and responsive fallbacks.

- [ ] **Step 1: Replace the rejected production override link with `tone-option2.css`.**
- [ ] **Step 2: Set the monitor image source to the selected rainy-neon asset without changing its ID.**
- [ ] **Step 3: Implement design tokens, the 64px shared header, and the scoped two-row tone grid.**
- [ ] **Step 4: Recompose monitor metadata, library results, reference films, and the prompt inspector through CSS while keeping controls functional.**
- [ ] **Step 5: Add the three local reference-film images to `look-studio.js` rendering.**
- [ ] **Step 6: Add explicit 1280px, 1024px, and mobile fallbacks.**
- [ ] **Step 7: Run all Node tests and fix regressions.**

### Task 4: Render and compare against the selected visual

**Files:**
- Modify: `design-qa.md`
- Create: `.audit-20260714-tone-option2/implementation-1440x1024.png`
- Create: `.audit-20260714-tone-option2/comparison.png`

**Interfaces:**
- Consumes: selected visual and rendered local page.
- Produces: same-viewport comparison evidence and a blocking QA decision.

- [ ] **Step 1: Start the existing local server and open the tone workspace at 1440x1024.**
- [ ] **Step 2: Test workspace switching, search, selection, copy, project actions, and transfer buttons.**
- [ ] **Step 3: Capture the implementation and place it side by side with the selected visual.**
- [ ] **Step 4: Record P0/P1/P2 findings in `design-qa.md`, fix them, and repeat the comparison.**
- [ ] **Step 5: Mark `final result: passed` only when no P0/P1/P2 mismatch remains; otherwise mark it blocked.**

