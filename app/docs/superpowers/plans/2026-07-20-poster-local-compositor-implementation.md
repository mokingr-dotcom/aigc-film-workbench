# Local Poster Compositor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users upload a poster, independently edit Chinese and English title layers, upload a transparent PNG title mark, persist the local assets and transforms per project, and export a full-resolution PNG or high-quality JPG.

**Architecture:** Vendor Fabric.js 7.4.0 locally for proven canvas transforms and text editing. Keep Blob persistence in `poster-asset-store.js`, pure state normalization plus Fabric orchestration in `poster-compositor.js`, and connect the compositor to the existing poster workspace and project lifecycle through `poster-app.js` and `workspace-core.js`.

**Tech Stack:** Static HTML/CSS/JavaScript, Fabric.js 7.4.0, IndexedDB, Canvas export, Node assertion tests, in-app Browser Playwright.

## Global Constraints

- Complete and verify the approved 48-title-mark expansion plan before beginning this compositor plan.
- Do not call image-generation APIs or upload user images to any network destination.
- Accept poster JPG/PNG/WebP up to 20 MB, 12,000 pixels per edge, and 50 megapixels.
- Accept title-mark PNG only up to 20 MB, 8,000 pixels per edge, and 32 megapixels.
- Reject SVG, PDF, PSD, AI, GIF, video, remote URLs, decoding failures, and forged image extensions.
- Preserve original poster pixel dimensions for export; PNG is lossless and JPG quality is 0.92.
- Save Blob data only in IndexedDB, never in localStorage or project JSON.
- Preserve existing poster IDs, prompt generation, template browsing, project import/export, and unrelated worktree changes.
- Use the bundled Node executable at `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`.

---

### Task 1: Vendor Fabric and Define Pure Compositor State

**Files:**
- Create: `vendor/fabric-7.4.0.min.js`
- Create: `vendor/fabric-LICENSE.txt`
- Create: `poster-compositor.js`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Produces: `DEFAULT_POSTER_COMPOSITOR_STATE`, `normalizePosterCompositorState(saved)`, `normalizePosterLayer(layer, defaults)`, `safePosterExportName(parts)`, and browser factory `createPosterCompositor(options)`.
- The pure exports must load under CommonJS without `document` or Fabric.

- [ ] **Step 1: Write failing state tests**

```js
const {
  DEFAULT_POSTER_COMPOSITOR_STATE,
  normalizePosterCompositorState,
  safePosterExportName
} = require("./poster-compositor.js");

runTest("poster compositor state clamps three stable layers", () => {
  const state = normalizePosterCompositorState({
    selectedLayer: "unknown",
    guidesVisible: "yes",
    snapEnabled: false,
    exportFormat: "gif",
    layers: {
      "title-cn": { x: 2, y: -1, widthRatio: 4, rotation: 999, opacity: -2 },
      "title-image": { x: 0.2, y: 0.3, widthRatio: 0.7, rotation: 15, opacity: 0.8 },
      unknown: { x: 0.5 }
    }
  });
  assert.strictEqual(state.selectedLayer, "title-cn");
  assert.strictEqual(state.guidesVisible, true);
  assert.strictEqual(state.snapEnabled, false);
  assert.strictEqual(state.exportFormat, "png");
  assert.strictEqual(state.layers["title-cn"].x, 1);
  assert.strictEqual(state.layers["title-cn"].y, 0);
  assert.strictEqual(state.layers["title-cn"].rotation, 180);
  assert.strictEqual(state.layers["title-cn"].opacity, 0);
  assert(!state.layers.unknown);
});

runTest("poster export filename removes path characters", () => {
  assert.strictEqual(
    safePosterExportName(["A/B", "迷雾:码头", "3000x4500", "v001"], "png"),
    "POSTER_A_B_迷雾_码头_3000x4500_v001.png"
  );
});
```

- [ ] **Step 2: Run tests and verify RED**

Expected: require fails because `poster-compositor.js` does not exist.

- [ ] **Step 3: Vendor the pinned dependency and license**

Download the exact 7.4.0 browser build from the official package path into `vendor/fabric-7.4.0.min.js`; copy the official MIT license into `vendor/fabric-LICENSE.txt`. Record the downloaded SHA-256 in a comment at the top of the implementation plan completion notes. Runtime HTML must reference only the local file.

- [ ] **Step 4: Implement pure normalized state**

Use stable layer IDs `title-cn`, `title-en`, and `title-image`. Clamp normalized coordinates to 0–1, width ratios to 0.02–1.5, rotation to -180–180, opacity to 0–1, font-size ratios to 0.005–0.25, letter spacing to -200–1000, and line height to 0.7–3. Unknown fonts, alignments, layers, selected layers, and export formats fall back to defaults.

Expose the API through the existing UMD/CommonJS pattern. Only initialize Fabric when `createPosterCompositor` is called in a browser.

- [ ] **Step 5: Run syntax, tests, and diff checks**

Expected: CommonJS tests and browser syntax checks pass; no remote URL appears in `index.html`.

- [ ] **Step 6: Commit the isolated foundation**

```bash
git add vendor/fabric-7.4.0.min.js vendor/fabric-LICENSE.txt poster-compositor.js prompt-generator.test.js
git commit -m "feat: add local poster compositor foundation"
```

---

### Task 2: Build the Poster Asset Store

**Files:**
- Create: `poster-asset-store.js`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Produces:
  - `validatePosterFile(file, kind)`
  - `inspectPosterImage(file, kind)`
  - `detectPngTransparency(image, width, height)`
  - `put(blob, meta)`
  - `get(id)`
  - `remove(id)`
  - `list()`
- Browser global: `window.aigcPosterAssetStore`.
- Uses a separate IndexedDB database `aigc-poster-compositor-assets-v1` and store `poster-images` so it cannot conflict with casting database versions.

- [ ] **Step 1: Write failing validation tests**

Test poster and title-asset MIME allowlists, 20 MB limit, pixel limits, and metadata stripping:

```js
const {
  validatePosterFile,
  validatePosterDimensions,
  metadataWithoutBlob
} = require("./poster-asset-store.js");

runTest("poster asset validation separates background and PNG title limits", () => {
  assert(validatePosterFile({ type: "image/jpeg", size: 1024 }, "source").ok);
  assert(validatePosterFile({ type: "image/webp", size: 1024 }, "source").ok);
  assert(!validatePosterFile({ type: "image/svg+xml", size: 1024 }, "source").ok);
  assert(validatePosterFile({ type: "image/png", size: 1024 }, "title").ok);
  assert(!validatePosterFile({ type: "image/jpeg", size: 1024 }, "title").ok);
  assert(!validatePosterDimensions({ width: 13000, height: 1000 }, "source").ok);
  assert(!validatePosterDimensions({ width: 10000, height: 6000 }, "source").ok);
});
```

- [ ] **Step 2: Verify RED, then implement format and dimension validation**

Read dimensions only after successful browser decode. Never trust the extension. Preserve original Blob bytes; do not resize or re-encode source posters or title PNGs.

- [ ] **Step 3: Implement IndexedDB CRUD**

Store records as `{ id, blob, kind, name, type, size, width, height, transparent, updatedAt }`. Resolve `get` only after the readonly transaction completes. Return metadata copies without Blob from `put`.

- [ ] **Step 4: Implement sampled transparency detection**

For PNG title assets, draw a bounded sample no larger than 512×512 to a temporary canvas and check alpha values. This is advisory only; an opaque PNG remains accepted.

- [ ] **Step 5: Test transaction completion and error paths**

Use the same fake transaction patterns already used for `casting-asset-store.js`. Verify decode failure, quota failure, and removal failure reject with clear Chinese errors.

- [ ] **Step 6: Run full tests and commit**

```bash
git add poster-asset-store.js prompt-generator.test.js
git commit -m "feat: persist local poster compositor assets"
```

---

### Task 3: Add the Compositor User Interface

**Files:**
- Modify: `index.html`
- Create: `poster-compositor.css`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Produces unique IDs:
  - `poster-source-upload`, `poster-source-replace`, `poster-source-status`
  - `poster-compositor-canvas`, `poster-compositor-empty`
  - `poster-view-fit`, `poster-view-100`, `poster-guides-toggle`
  - `poster-title-asset-upload`, `poster-title-asset-remove`
  - `poster-layer-title-cn`, `poster-layer-title-en`, `poster-layer-title-image`
  - `poster-layer-visible`, `poster-layer-locked`, `poster-layer-reset`
  - `poster-layer-size`, `poster-layer-letter-spacing`, `poster-layer-line-height`
  - `poster-layer-align`, `poster-layer-rotation`, `poster-layer-opacity`
  - `poster-position-top`, `poster-position-center`, `poster-position-bottom`, `poster-position-left-bottom`, `poster-position-right-bottom`
  - `poster-undo`, `poster-redo`, `poster-export-format`, `poster-export-summary`, `poster-download`.

- [ ] **Step 1: Write a failing DOM and CSS contract test**

Assert every ID occurs exactly once, local Fabric and compositor scripts are loaded in dependency order, and CSS includes the stage, layer rows, control states, guides, loading, error, and compact breakpoints.

- [ ] **Step 2: Verify RED**

Expected: new contract test fails.

- [ ] **Step 3: Replace the static monitor body with a production stage**

Keep existing monitor header and ratio context, but make the image preview a fallback behind the Fabric canvas. Add upload/replace, fit/100%, guides, source metadata, selected-layer metadata, and a clear empty/upload state. Do not put a decorative card around the canvas.

- [ ] **Step 4: Add one compact “标题合成” parameter group**

Use three layer rows with icon buttons for visibility, lock, and reset. Show only controls relevant to the selected layer: font fields for text layers, width for PNG, and shared rotation/opacity/position actions.

- [ ] **Step 5: Add download controls**

Show PNG/JPG, original dimensions, and a download button. The button is disabled for the example image, a missing Blob, a decode error, or an active export.

- [ ] **Step 6: Implement responsive CSS**

At desktop the canvas must occupy the monitor’s useful area rather than leave a large empty surround. At 1024/820 use monitor → library → parameters. At 390 keep the full canvas visible, stack controls, use 44-pixel touch targets, and prevent page horizontal overflow.

- [ ] **Step 7: Run tests and commit**

```bash
git add index.html poster-compositor.css prompt-generator.test.js
git commit -m "feat: add poster compositor workspace"
```

---

### Task 4: Implement Fabric Layers, Editing, Snapping, and History

**Files:**
- Modify: `poster-compositor.js`
- Modify: `poster-app.js`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- `createPosterCompositor(options)` returns:
  - `setSource({ url, width, height })`
  - `setTitleAsset({ url, width, height })`
  - `removeTitleAsset()`
  - `setTexts({ chinese, english })`
  - `selectLayer(id)`
  - `updateLayer(id, patch)`
  - `setLayerVisible(id, visible)`
  - `setLayerLocked(id, locked)`
  - `resetLayer(id)`
  - `moveLayerToPreset(id, preset)`
  - `undo()`, `redo()`
  - `resizePreview()`
  - `exportBlob({ format, quality })`
  - `serialize()`
  - `destroy()`.

- [ ] **Step 1: Write failing controller contract tests**

Check factory methods, stable layer IDs, 30-step history bound, event names `change`, `textchange`, `selectionchange`, and prompt position wording.

- [ ] **Step 2: Initialize Fabric with a locked background**

The source image is non-selectable and excluded from serialization. Set the logical canvas to source dimensions; scale only the CSS display. Dispose the prior Fabric canvas and image resources before rebuilding.

- [ ] **Step 3: Add two Fabric IText objects and one image object**

Chinese and English use separate stable IDs. Double-click enters editing; input updates existing poster fields live; Escape exits editing; Enter remains a newline. PNG title image uses uniform scaling and no skew controls.

- [ ] **Step 4: Synchronize transforms**

On `object:modified`, convert Fabric pixels to normalized state, clamp values, append one history entry, update controls and trigger project dirty once. Do not persist on every pointer move.

- [ ] **Step 5: Add snapping and keyboard movement**

Snap centers to vertical/horizontal center and 5% safe lines within a 1% short-edge threshold. Draw guides on Fabric’s upper context so export excludes them. Arrow keys move one logical pixel; Shift+arrow moves ten. Shift rotation snaps to 15 degrees.

- [ ] **Step 6: Implement bounded undo/redo**

Store only normalized layer state snapshots, maximum 30. Asset upload/removal is not undoable; layer transforms, text edits, visibility, lock, reset, and presets are undoable.

- [ ] **Step 7: Add prompt synchronization**

For composite/full-poster prompts include normalized center percentages, width ratio, alignment, rotation, and safety relationship. Asset-only title-mark prompts remain unchanged. When PNG title exists, add the exact preservation rule from the spec.

- [ ] **Step 8: Run tests and commit**

Run syntax, full tests, and diff checks. Commit compositor/controller hunks only.

---

### Task 5: Integrate Transactional Uploads and Project Lifecycle

**Files:**
- Modify: `poster-app.js`
- Modify: `workspace-core.js`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Produces:
  - async `replacePosterAsset(kind, file)`
  - async `removePosterAsset(kind)`
  - async `restorePosterAssets(saved, loadToken)`
  - `collectPosterAssetIds(project)`
  - async `cleanupPosterAssetIfUnreferenced(id)`.

- [ ] **Step 1: Write failing transaction and cleanup tests**

Model the casting rollback tests: candidate write succeeds but metadata persistence fails; replacement must restore the prior state and delete only the candidate. Project deletion persists the reduced list before asset cleanup.

- [ ] **Step 2: Implement candidate replacement**

Validate/decode, put candidate Blob, create preview URL, update candidate state, await `workspaceCore.persistNow()`, then release/remove the old asset. On failure, revoke candidate URL, remove candidate Blob, restore old state and canvas.

- [ ] **Step 3: Implement safe removal**

Persist cleared metadata first. Only then remove the Blob and revoke URL. If persistence fails, keep the existing canvas and asset.

- [ ] **Step 4: Restore assets with load tokens**

Ignore stale async reads after project changes. Missing Blob preserves metadata, shows “本机图片已丢失”, and disables export. Every replaced/stale Object URL is revoked.

- [ ] **Step 5: Extend workspace project deletion**

Collect current source/title IDs from all poster project states, persist the remaining projects, then delete only IDs unreferenced by every remaining project. Fail closed if live project state cannot be exported.

- [ ] **Step 6: Verify and commit**

Run full tests and commit exact poster/workspace lifecycle changes.

---

### Task 6: Full-Resolution Export and Browser QA

**Files:**
- Modify: `poster-compositor.js`
- Modify: `poster-app.js`
- Modify: `design-qa.md`
- Create: `.audit-20260720-poster-compositor/responsive-qa.json`
- Create: `.audit-20260720-poster-compositor/desktop-1440x1024.png`
- Create: `.audit-20260720-poster-compositor/compact-820x1180.png`

- [ ] **Step 1: Write failing export tests**

Verify format normalization, 0.92 JPG quality, safe filenames, hidden-layer exclusion, and export-state cleanup in success and failure paths.

- [ ] **Step 2: Implement export from logical source dimensions**

Temporarily discard selection, upper-canvas controls, and guides; render visible objects at source width/height; produce PNG or JPG Blob; restore selection and UI in `finally`. Never silently lower resolution.

- [ ] **Step 3: Implement download state**

Show progress, prevent duplicate exports, calculate the safe filename, trigger a temporary object URL download, revoke it after the click, and restore the button on every exit path.

- [ ] **Step 4: Run real-browser workflows**

Using local test fixtures, verify:
- legal JPG/PNG/WebP poster uploads;
- PNG title upload and opaque-PNG advisory;
- rejected SVG/JPG title/oversized files;
- independent Chinese/English/PNG selection, drag, scale, rotate, hide, lock and reset;
- double-click text editing and right-panel sync;
- guide snapping, keyboard movement, 30-step history;
- project reload recovery and missing-Blob state;
- PNG and JPG pixel dimensions equal source dimensions;
- export excludes guides and controls;
- no console errors or Object URL leaks.

- [ ] **Step 5: Verify responsive layouts**

Check 1440×1024, 1280×900, 1024×900, 820×1180 and 390×844 with portrait, landscape, long Chinese and long English titles. Save screenshots and exact width/overflow measurements.

- [ ] **Step 6: Update QA and run final checks**

```bash
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --check poster-asset-store.js
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --check poster-compositor.js
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --check poster-app.js
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js
git diff --check
curl -sS -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:8766/index.html?workspace=poster&fresh=poster-compositor-final-v1"
```

Expected: all commands exit 0 and curl prints `200`.

- [ ] **Step 7: Preserve the current branch and working tree**

Keep `codex/precision-workbench`, all existing commits, and unrelated uncommitted files. Do not reset, delete, merge, or push unless the user explicitly requests it.

