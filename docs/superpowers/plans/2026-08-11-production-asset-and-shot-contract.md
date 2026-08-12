# Production Asset And Shot Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade project assets and per-shot delivery modes into a traceable AIGC pre-production flow.

**Architecture:** Extend existing project normalization rather than add a parallel store. Keep asset semantics in `project-asset-locks.js`, duration-specific prompt generation in `scene-video-adapters.js`, and project UI wiring in `project-scenes.js`.

**Tech Stack:** Vanilla JavaScript, browser local storage/IndexedDB reference store, Node assertion test file.

## Global Constraints

- Preserve existing project IDs, scene IDs, reference IDs and old data.
- Do not call external generation APIs.
- Use `apply_patch` for source edits.
- Keep user-facing copy in Chinese.

---

### Task 1: Asset lifecycle and full-project ledger

**Files:**
- Modify: `project-asset-locks.js`
- Modify: `project-scenes.js`
- Test: `prompt-generator.test.js`

- [ ] Add normalized lifecycle state and permit references for props.
- [ ] Build per-asset full-project reference records and lifecycle-based attention messages.
- [ ] Render lifecycle badges, reference counts and prop upload controls.
- [ ] Verify asset merging, lifecycle normalization and prop references with assertions.

### Task 2: Per-shot delivery contract

**Files:**
- Modify: `project-store.js`
- Modify: `scene-video-adapters.js`
- Modify: `project-scenes.js`
- Modify: `project-delivery.js`
- Test: `prompt-generator.test.js`

- [ ] Add `deliveryMode` and normalized prompt version snapshots to every shot.
- [ ] Render a 15 秒 / 30 秒 / 静帧 choice next to target model and duration.
- [ ] Generate mode-specific Seedance timing sections and include mode in project delivery.
- [ ] Verify 15-second and 30-second structures with assertions.

### Task 3: Formal prompt versions and production readiness

**Files:**
- Modify: `project-store.js`
- Modify: `project-shot-readiness.js`
- Modify: `project-scenes.js`
- Test: `prompt-generator.test.js`

- [ ] Save immutable prompt snapshots from the current shot and locked asset list.
- [ ] Present saved versions and permit choosing the formal version.
- [ ] Require non-draft master status for assets marked as reference-required before “ready”.
- [ ] Verify version snapshots and readiness behavior.

### Task 4: Regression and visual delivery

**Files:**
- Modify: `index.html`
- Test: `prompt-generator.test.js`

- [ ] Bump changed script/style query versions.
- [ ] Run full Node assertions and whitespace check.
- [ ] Open a fresh local URL at the project workspace and verify the new controls are visibly present.
