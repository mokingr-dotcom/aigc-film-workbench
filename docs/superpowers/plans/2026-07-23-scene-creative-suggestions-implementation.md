# 场次影调与运镜建议 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide three safe, source-aware look and camera choices for every screenplay scene.

**Architecture:** Keep catalog and ranking logic in `scene-assistant-data.js`; render compact cards and apply them with blank-only merge rules in `project-scenes.js`. Existing prompt adapters consume the resulting scene and shot values unchanged.

**Tech Stack:** Vanilla JavaScript, local scene assistant data, Node assert regression suite, local browser QA.

## Global Constraints

- Local-only; no API or network call.
- Never overwrite existing scene visual overrides or user-authored shot framing/movement.
- Do not inject film titles or director names into prompts.
- Keep three visible choices per group.

---

### Task 1: Add ranked local creative suggestions

**Files:**
- Modify: `scene-assistant-data.js`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Produces `buildSceneCreativeSuggestions(scene, draft)` with exactly three `looks` and three `cameras`.

- [ ] Write failing tests for suspense and movement cues.
- [ ] Verify the test fails because the function is missing.
- [ ] Implement catalogs, cue ranking, bounded fallback selection, and export.
- [ ] Run the full regression suite.

### Task 2: Render cards and apply blank-only scene values

**Files:**
- Modify: `project-scenes.js`
- Modify: `project-scenes.css`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes `buildSceneCreativeSuggestions`.
- Produces `apply-scene-look` and `apply-scene-camera` actions.

- [ ] Write a failing source contract test for both actions and blank-only merge marker.
- [ ] Implement concise two-group cards beneath the analysis panel.
- [ ] Apply visual fields only when blank and camera fields only when blank or untouched defaults.
- [ ] Run the full regression suite.

### Task 3: Validate and clean the browser flow

**Files:**
- Modify: `index.html` only for local script cache versions.

- [ ] Confirm a suspense scene ranks the relevant look first.
- [ ] Apply one look and one camera card; verify prompt updates.
- [ ] Verify a prefilled custom field survives a second card click.
- [ ] Delete QA scenes and saved screenplay; run final regression and `git diff --check`.
