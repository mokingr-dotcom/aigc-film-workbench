# Model Delivery And Continuity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export a locked shot as a model-ready delivery package and surface actionable continuity checks between adjacent shots.

**Architecture:** Keep model package formatting in a pure extension of `project-delivery.js`; add a new pure `project-shot-continuity.js` module for adjacent-shot comparisons. Render both in the existing single-shot production card, preserving the current project data and local-only workflow.

**Tech Stack:** Vanilla JavaScript, Node assertions, browser local storage/IndexedDB reference store, local browser verification.

## Global Constraints

- No external model calls, API keys or project uploads.
- Preserve existing project, scene, shot, asset and result IDs.
- Copy and download are the only delivery actions in this phase.
- Keep user-facing copy in Chinese.

---

### Task 1: Model-ready shot delivery package

**Files:**
- Modify: `project-delivery.js`
- Test: `prompt-generator.test.js`

- [ ] Add `buildShotModelPackage(project, scene, shot, target)` that returns the complete prompt, duration, reference upload checklist, negative constraints and Markdown filename.
- [ ] Provide `seedance` and `general` targets; Seedance keeps 15/30 timing from the existing formal prompt, while general uses the same locked prompt plus explicit duration and reference order.
- [ ] Add assertions for a 30-second shot: package includes all locked character/location/prop references, 30-second mode and the active formal prompt.

### Task 2: Adjacent-shot continuity assessment

**Files:**
- Create: `project-shot-continuity.js`
- Test: `prompt-generator.test.js`

- [ ] Add `buildShotContinuity(project, scene, shot)` returning predecessor identity and issues.
- [ ] Block missing/changed character master assets; warn for changed setting, time, key props, clothing/appearance wording and contradictory direction keywords.
- [ ] Ensure the first shot has no false warnings and a deliberately new scene remains a warning rather than a blocker.

### Task 3: Production-card actions and visual integration

**Files:**
- Modify: `project-scenes.js`
- Modify: `project-scenes.css`
- Modify: `index.html`
- Test: `prompt-generator.test.js`

- [ ] Add copy/download model-package controls and a compact continuity panel inside the production card.
- [ ] Add direct actions to select the predecessor and focus the editable field associated with a warning.
- [ ] Cache-bust changed files, run the full assertion suite, whitespace check and local browser verification.
