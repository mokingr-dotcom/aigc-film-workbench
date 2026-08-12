# Poster Free Text Layers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add stable, editable Chinese/English and arbitrary poster text layers to the local compositor.

**Architecture:** Extend the existing normalized `layers` map with bounded dynamic text-layer records and let Fabric render every normalized text layer. Keep the background and transparent title image flows unchanged. The workspace controller renders the layer list and edits the selected layer through explicit form controls.

**Tech Stack:** Vanilla JavaScript, Fabric.js 7.4, HTML/CSS, Node assertion tests, Playwright CLI.

## Global Constraints

- Preserve existing IDs for the default Chinese, English, and transparent-title layers.
- Position locking must not disable text editing or layer selection.
- Poster assets remain local to the browser.
- Export must retain the selected crop ratio and source-pixel output size.

---

### Task 1: Dynamic text state model

**Files:**
- Modify: `poster-compositor.js`
- Test: `prompt-generator.test.js`

- [ ] Write failing tests for dynamic text normalization and bounded IDs.
- [ ] Run `node prompt-generator.test.js` and confirm the new test fails.
- [ ] Add normalized role, label, text, color and dynamic layer preservation.
- [ ] Re-run tests and confirm green.

### Task 2: Canvas layer operations

**Files:**
- Modify: `poster-compositor.js`
- Test: `prompt-generator.test.js`

- [ ] Write failing source-contract tests for add, duplicate, remove and editable position locks.
- [ ] Run tests and confirm red.
- [ ] Implement dynamic Fabric objects, history text persistence and layer operations.
- [ ] Re-run tests and confirm green.

### Task 3: Workspace controls

**Files:**
- Modify: `index.html`
- Modify: `poster-app.js`
- Modify: `poster-compositor.css`
- Test: `prompt-generator.test.js`

- [ ] Write failing UI-contract tests for add-text presets, layer text, color, duplicate and delete controls.
- [ ] Run tests and confirm red.
- [ ] Implement dynamic list rendering, selected-layer editing and clear lock language.
- [ ] Re-run the complete suite and confirm green.

### Task 4: Browser verification

**Files:**
- Update cache tokens in: `index.html`
- Create screenshots under: `output/playwright/poster-free-text-layers/`

- [ ] Verify Chinese editing, spaces and Enter line breaks.
- [ ] Verify font changes while position is locked.
- [ ] Verify add, duplicate, delete, undo and redo.
- [ ] Verify ratio change and PNG export.
- [ ] Capture desktop screenshot and check console errors.

