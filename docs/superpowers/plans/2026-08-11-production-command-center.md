# Production Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a project-level production queue that turns screenplay, asset, prompt, and result gaps into actionable next steps.

**Architecture:** A pure queue module derives tasks from project data. The existing project scene controller renders the queue and routes each task to current project controls without adding a new persisted workspace.

**Tech Stack:** Vanilla JavaScript, existing project store, Node assertion runner, Playwright local browser checks.

## Global Constraints

- Keep all project data local and backward compatible.
- Do not claim external AI generation or cloud sync without a configured service.
- Reuse current scene IDs, shot IDs, asset statuses, and production result records.

---

### Task 1: Derive production tasks

**Files:**
- Create: `project-production-queue.js`
- Test: `prompt-generator.test.js`

- [ ] Add queue categories for screenplay, assets, prompts, and results.
- [ ] Prioritize unresolved asset masters before prompt and result work.
- [ ] Test empty, blocked, ready-for-prompt, ready-for-result, and deliverable projects.

### Task 2: Render and route the queue

**Files:**
- Modify: `project-scenes.js`
- Modify: `project-scenes.css`
- Modify: `index.html`
- Test: `prompt-generator.test.js`

- [ ] Render the queue above the production steps.
- [ ] Route tasks to screenplay, assets, scenes, a specific shot, or result registration.
- [ ] Keep compact responsive layout and existing project interactions.

### Task 3: Verify delivery readiness

**Files:**
- Test: `prompt-generator.test.js`

- [ ] Run the full assertion suite and whitespace validation.
- [ ] Exercise the local project page with Playwright and capture a screenshot.
