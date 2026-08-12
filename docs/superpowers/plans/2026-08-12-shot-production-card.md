# Shot Production Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every selected project shot read as one clear, actionable AIGC production card from script intent to locked delivery.

**Architecture:** Add a pure production-card summary in `project-shot-readiness.js`, then render it at the top of the selected-shot editor in `project-scenes.js`. It reuses current scenes, asset locks, prompt versions and result records; no new project schema or API calls are introduced.

**Tech Stack:** Vanilla JavaScript, browser local storage/IndexedDB reference store, Node assertion test file, local Playwright verification.

## Global Constraints

- Preserve project, scene, shot and reference IDs.
- Do not call external APIs or upload project data.
- Keep user-facing copy in Chinese.
- Use `apply_patch` for source edits.
- Do not remove existing prompt versions, result history or delivery exports.

---

### Task 1: Add a pure shot production-card assessment

**Files:**
- Modify: `project-shot-readiness.js`
- Test: `prompt-generator.test.js`

**Interfaces:**
- Produces `buildShotProductionCard(project, scene, shot)` returning `{ ready, lockable, identity, checks, actions, formalVersionCount, selectedResult }`.
- Consumes `buildShotReadinessGate(project, scene, shot)` and existing shot fields.

- [ ] Add an assertion for a 30-second shot with unlocked assets, no formal prompt and no selected result; it must return missing checks and `lockable: false`.
- [ ] Add an assertion for a complete shot with locked asset references, a formal prompt version and selected result; it must return `ready: true` and `lockable: true`.
- [ ] Implement the minimal pure summary: six checks in the order role reference, scene/prop reference, look, performance/action, camera timing, prompt version; add result as the delivery condition.
- [ ] Run `node prompt-generator.test.js` and confirm the new assertions pass.

### Task 2: Render the selected-shot production card

**Files:**
- Modify: `project-scenes.js`
- Modify: `project-scenes.css`
- Test: `prompt-generator.test.js`

**Interfaces:**
- Consumes `buildShotProductionCard(project, scene, shot)`.
- Produces `.project-shot-production-card` with a scene/shot identity, six compact checks, progress count, one next action and delivery status.

- [ ] Add source assertions for `renderShotProductionCard`, `project-shot-production-card`, 15/30 delivery labels and the six check labels.
- [ ] Render the card before the existing detailed readiness gate so the existing controls remain usable as the detailed view.
- [ ] Add `data-scene-action="open-shot-production-next"`; dispatch it to the first missing existing action, or open the result form when only result registration remains.
- [ ] Add responsive CSS using a compact header, fixed-size status cells and no clipped check labels at desktop and narrow widths.
- [ ] Run `node prompt-generator.test.js` and confirm the UI-source assertions pass.

### Task 3: Verify real interaction and preserve delivery

**Files:**
- Modify: `index.html`
- Test: `prompt-generator.test.js`

- [ ] Bump the changed script and stylesheet cache query values.
- [ ] Load a fresh project page, select a shot and confirm the new production card is visible.
- [ ] Confirm the card shows `30 秒` when a shot uses `seedance30`, and that the next-action button reaches an existing workflow target.
- [ ] Run the full Node assertion suite, `git diff --check`, and a local browser verification against a fresh URL.
