# 完整项目生产包 V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export one active AIGC film project with every referenced local image into a safe offline ZIP, then import it as an isolated new project on another computer.

**Architecture:** Keep archive inspection and project transformation pure in `project-archive.js`; it collects an exact, deduplicated asset manifest and projects away unselected keyframes. A browser archive service coordinates validated IndexedDB reads/writes, an import journal, and ID remapping. `workspace-core.js` owns controls, progress and persistence, while the existing stores remain the only writers of validated image blobs.

**Tech Stack:** Vanilla JavaScript, browser IndexedDB, localStorage, vendored `fflate@0.8.2` UMD, existing Node assertion suite, Playwright local browser QA.

## Global Constraints

- Package only the active project; never export unrelated library assets.
- Package only local images actually referenced by the project; never package external result media.
- Treat every package import as a new project: generate fresh project and asset IDs, rewrite all pointers, and never overwrite existing storage records.
- Reject malformed, untrusted, incomplete, over-limit or hash-mismatched archives before project metadata is committed.
- Enforce V1 limits: archive `250 MB`, `160` images, one image `20 MB`, project JSON `2 MB`.
- Existing JSON backup becomes “轻量备份”; Markdown delivery output remains separate.
- No server, cloud synchronization, external model API or build system.

---

### Task 1: Define and test pure project package contracts

**Files:**
- Create: `project-archive.js`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Produces `collectReferencedAssetIds(project)`, `projectForArchive(project)`, `createArchiveManifest(project, assets, now)`, `createImportIdMap(project, assets, createId)`, `rewriteProjectReferences(project, idMap)`, and `validateArchiveManifest(manifest, entries)`.
- `collectReferencedAssetIds` returns `{ castingIds, posterIds, projectReferenceIds }`, deduplicated and sorted.
- `createArchiveManifest` returns `{ format: "aigc-project-package", version: 1, project, assets }` where every asset has `store`, `sourceId`, `path`, `mime`, `size`, `sha256`, `meta`, and `usages`.

- [ ] **Step 1: Write failing archive unit tests**

Add a fixture with one casting reference, poster source/title asset, creative-brief reference, two asset-lock references, one selected result keyframe and one unselected result keyframe. Assert:

```js
const api = require("./project-archive.js");
const refs = api.collectReferencedAssetIds(project);
assert.deepStrictEqual(refs.projectReferenceIds.sort(), ["brief-1", "lock-1", "lock-2", "selected-keyframe"].sort());
assert(!refs.projectReferenceIds.includes("unselected-keyframe"));
assert.strictEqual(api.projectForArchive(project).scenes[0].shots[0].productionResults[1].keyframeReferenceId, "");
```

Also reject unknown manifest versions, `../escape.bin`, duplicate paths, mismatched project ID, missing asset path, too many assets, and image metadata above the V1 limits.

- [ ] **Step 2: Run the test to verify it fails**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Expected: FAIL because `project-archive.js` does not exist.

- [ ] **Step 3: Implement pure package contracts**

Create `project-archive.js` as a browser IIFE plus CommonJS export. Use JSON cloning for archive projection. Give assets deterministic archive paths `assets/<store>/<zero-padded-index>.bin`; reject every input path outside `manifest.json`, `project.json`, `assets/casting/`, `assets/poster/`, or `assets/project-reference/`.

`createImportIdMap` allocates fresh IDs for project, casting, poster and project-reference records. `rewriteProjectReferences` rewrites every known pointer: casting current/history IDs, poster source/title IDs, `creativeBrief.referenceAssetIds`, `assetLocks[].referenceAssetIds`, and all `productionResults[].keyframeReferenceId`.

- [ ] **Step 4: Verify unit suite passes**

Run the Node command above.

Expected: PASS including existing project-store and production-result tests.

- [ ] **Step 5: Commit**

```bash
git add project-archive.js prompt-generator.test.js
git commit -m "feat: define project production package contract"
```

### Task 2: Add validated asset APIs and reference-safe cleanup

**Files:**
- Modify: `project-reference-store.js`
- Modify: `workspace-core.js`
- Modify: `project-scenes.js`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Produces `projectReferenceStore.putPreparedRecord(record)` and `projectReferenceStore.getRecord(id)`.
- Produces `collectProjectReferenceAssetIds(project)` and `isProjectReferenceUsed(projects, assetId)`.
- Archive record writes accept only image records with a Blob, bounded size, positive bounded dimensions and a fresh ID.

- [ ] **Step 1: Write failing safety tests**

Assert cleanup includes creative-brief IDs, asset-lock IDs and selected-result keyframes; a reference used by another project is retained; and imported copies have no shared project-reference IDs.

- [ ] **Step 2: Run test to verify it fails**

Run the Node command above.

Expected: FAIL because project-reference collection and validated record APIs are absent.

- [ ] **Step 3: Implement cleanup and exact record APIs**

In `workspace-core.js`, collect reference IDs from every project usage. Before removing a reference, inspect all persisted projects and retain the Blob when another project uses it. In `project-scenes.js`, remove only references made unreachable by deleted scenes/shots using the same check.

In `project-reference-store.js`, add record-level read/write. `putPreparedRecord` accepts only safe image records and never bypasses validation with a raw IndexedDB write.

- [ ] **Step 4: Run regression tests**

Run the Node command above.

Expected: PASS, including deletion and duplicate-project safety tests.

- [ ] **Step 5: Commit**

```bash
git add project-reference-store.js workspace-core.js project-scenes.js prompt-generator.test.js
git commit -m "fix: preserve project reference ownership"
```

### Task 3: Vendor offline ZIP support and archive service

**Files:**
- Create: `vendor/fflate-0.8.2.min.js`
- Create: `vendor/fflate-LICENSE.txt`
- Create: `project-archive-service.js`
- Modify: `index.html`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- `aigcProjectArchiveService.exportActiveProject(project)` resolves `{ blob, fileName, summary }`.
- `aigcProjectArchiveService.preflightPackage(file)` resolves `{ packageData, summary }` without writes.
- `aigcProjectArchiveService.importPackage(packageData, existingStore)` resolves `{ project, summary }` only after all asset writes succeed.
- `aigcProjectArchiveService.recoverInterruptedImport()` removes journaled uncommitted asset IDs on startup.

- [ ] **Step 1: Write failing service tests**

Use injected in-memory store adapters. Assert exact asset collection creates one ZIP entry per manifest item, SHA-256 mismatch fails before `put`, successful import creates different project and asset IDs, and a simulated failure after the second Blob write rolls back only newly written IDs.

- [ ] **Step 2: Run test to verify it fails**

Run the Node command above.

Expected: FAIL because the archive service and fflate vendor script are absent.

- [ ] **Step 3: Add fflate and archive service**

Vendor the unmodified `fflate@0.8.2` UMD distribution plus upstream license. Load it before `project-archive.js` and `project-archive-service.js`.

Read assets only through existing casting, poster and project-reference stores. Hash every binary with `crypto.subtle.digest("SHA-256", bytes)`; stop export when a referenced Blob is unavailable.

On import, validate all entries and hashes before writes, create the ID map, write resources while recording a localStorage journal, and return rewritten metadata only after success. Any failure deletes only journaled new resources and preserves existing projects.

- [ ] **Step 4: Run service tests**

Run the Node command above.

Expected: PASS for round trip, hash rejection, missing reference rejection, ID rewrite and rollback.

- [ ] **Step 5: Commit**

```bash
git add vendor/fflate-0.8.2.min.js vendor/fflate-LICENSE.txt project-archive-service.js project-archive.js index.html prompt-generator.test.js
git commit -m "feat: add offline project production package service"
```

### Task 4: Replace project-center transfer controls and connect persistence

**Files:**
- Modify: `index.html`
- Modify: `workspace-core.js`
- Modify: `project-dashboard.css`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- New DOM IDs: `#project-package-export`, `#project-package-import`, `#project-package-import-input`, `#project-package-status`.
- Existing `#project-export` and `#project-import` remain functional but are relabeled as light backups.

- [ ] **Step 1: Write failing UI contract tests**

Assert package controls, a package-status live region, `.project-package-summary`, and both light-backup labels exist. Assert workspace core preflights before it imports.

- [ ] **Step 2: Run test to verify it fails**

Run the Node command above.

Expected: FAIL because package controls and handlers are absent.

- [ ] **Step 3: Implement the project-center flow**

Add “完整项目迁移” above light backup controls. Export runs preflight then confirms package build. Import runs preflight, shows counts, then confirms “作为新项目导入”. Every phase updates the live region with specific count wording. Commit returned metadata through normalized store only after archive-service writes succeed; activate the imported project and show restored counts.

Relabel JSON controls “导出轻量备份 / 导入轻量备份” and state local images are excluded. Keep Markdown delivery unchanged.

- [ ] **Step 4: Run Node tests and browser QA**

Run Node tests, then use Playwright at `http://127.0.0.1:8766/index.html`:

1. Verify both transfer blocks.
2. Export a fixture project with a locked reference and selected result.
3. Clear project localStorage and IndexedDB through browser context.
4. Import the package.
5. Confirm scenes, shots, image previews and selected result status restore.
6. Confirm light JSON still says it omits local images.

- [ ] **Step 5: Commit**

```bash
git add index.html workspace-core.js project-dashboard.css prompt-generator.test.js
git commit -m "feat: add project production package controls"
```

### Task 5: Perform final safety and workflow review

**Files:**
- Modify: `prompt-generator.test.js` only if a demonstrated gap needs coverage.
- Create: `docs/audits/2026-07-27-project-production-package/verification.md`

**Interfaces:**
- Verifies Tasks 1-4 against all design acceptance criteria without changing product behavior unless a demonstrated defect needs a focused fix.

- [ ] **Step 1: Execute failure-injection checks**

Test malformed manifest, traversal, duplicate entry, unknown version, missing reference, hash mismatch, quota failure and rollback failure. Confirm existing projects remain intact.

- [ ] **Step 2: Run final browser regression**

Verify complete A-to-B flow in a clean browser context. Also verify deleting a project, scene or shot does not delete an image still used by another project.

- [ ] **Step 3: Record evidence**

Write `verification.md` with commands, results, browser scenarios, scope boundaries and the local URL used for testing.

- [ ] **Step 4: Commit**

```bash
git add prompt-generator.test.js docs/audits/2026-07-27-project-production-package/verification.md
git commit -m "test: verify project production package"
```

