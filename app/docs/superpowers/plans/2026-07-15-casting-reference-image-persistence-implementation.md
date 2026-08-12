# Casting Reference Image Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real, persistent reference-image workflow to the casting workspace with upload, drag-and-drop, complete 16:9 preview, replace, delete, example loading, and project restoration.

**Architecture:** Keep project metadata in the existing `localStorage` workspace state and store processed image Blobs in a dedicated IndexedDB database. A focused asset-store module owns validation, image processing, and Blob persistence; `casting-app.js` owns UI state and references assets by ID. A custom `aigc:workspace-dirty` event tells the existing project core to save after asynchronous asset operations.

**Tech Stack:** Static HTML/CSS/JavaScript, IndexedDB, Canvas/Blob APIs, existing Node assertion suite, local Playwright CLI.

## Global Constraints

- Accept JPEG, PNG, and WebP only; reject source files larger than 15MB.
- Preserve images across refresh, browser restart, and project reopening.
- Display uploaded images with complete composition inside a 16:9 board; do not crop or stretch.
- Do not change existing workspace IDs, `data-workspace` values, prompt data, or confirmed three-column casting layout.
- Do not add cloud storage, authentication, subscriptions, AI generation, or full role CRUD in this phase.
- Keep project JSON lightweight; do not put Base64 image data in `localStorage`.
- Existing project export remains metadata-only and must explicitly say local image assets are not included.

---

## File Map

- Create `casting-asset-store.js`: image validation, decoding, resize/encoding, and IndexedDB CRUD.
- Modify `index.html`: upload drop zone, file input, asset controls, roster thumbnail hooks, cache versions, and script order.
- Modify `casting-option-3.css`: empty/uploaded/error/dragging states while preserving the approved casting layout.
- Modify `casting-app.js`: asset state, upload lifecycle, preview restoration, version references, and metadata export/import.
- Modify `workspace-core.js`: listen for asynchronous workbench dirty events and clarify metadata-only export.
- Modify `prompt-generator.test.js`: static contract tests for asset storage, UI hooks, persistence metadata, and safe rendering.
- Create `output/playwright/casting-reference-upload/`: browser QA screenshots only; do not commit generated screenshots unless requested.

---

### Task 1: Persistent Asset Store

**Files:**
- Create: `casting-asset-store.js`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Produces: `window.aigcCastingAssetStore.validateFile(file) -> {ok, error?}`
- Produces: `window.aigcCastingAssetStore.prepareImage(file) -> Promise<{blob, meta}>`
- Produces: `put(blob, meta) -> Promise<AssetMeta>`
- Produces: `get(id) -> Promise<{blob, meta} | null>`
- Produces: `remove(id) -> Promise<void>`
- Produces: `storeExample(url, name) -> Promise<AssetMeta>`

- [ ] **Step 1: Add a failing asset-store contract test**

Append a test that requires the new file and checks the exact limits and API names:

```js
runTest("casting asset store defines persistent image limits and CRUD", () => {
  const source = fs.readFileSync("casting-asset-store.js", "utf8");
  ["image/jpeg", "image/png", "image/webp", "15 * 1024 * 1024", "indexedDB", "prepareImage", "storeExample", "put", "get", "remove"]
    .forEach((contract) => assert(source.includes(contract), `missing ${contract}`));
  assert(!source.includes("localStorage.setItem"));
});
```

- [ ] **Step 2: Run the suite and verify the new test fails**

Run: `node prompt-generator.test.js`

Expected: FAIL because `casting-asset-store.js` does not exist.

- [ ] **Step 3: Implement the asset store**

Create an IIFE exposing a browser global. Use these constants and public shape:

```js
(function initCastingAssetStore(root) {
  const DB_NAME = "aigc-film-workbench-assets-v1";
  const STORE_NAME = "casting-images";
  const MAX_BYTES = 15 * 1024 * 1024;
  const MAX_EDGE = 2560;
  const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

  function validateFile(file) {
    if (!file || !ACCEPTED_TYPES.has(file.type)) return { ok: false, error: "仅支持 JPG、PNG 或 WebP 图片。" };
    if (file.size > MAX_BYTES) return { ok: false, error: "图片不能超过 15MB。" };
    return { ok: true };
  }

  root.aigcCastingAssetStore = {
    validateFile,
    prepareImage,
    put,
    get,
    remove,
    storeExample
  };
})(typeof window !== "undefined" ? window : globalThis);
```

Implement `openDatabase()` with schema version 1 and a `casting-images` object store keyed by `id`. `prepareImage()` must decode the file, preserve PNG when transparency is present, resize only when the longest edge exceeds 2560px, and return processed Blob metadata. `put()` generates `asset-${crypto.randomUUID()}` when the metadata has no ID and stores `{id, blob, ...meta}` in one transaction. `storeExample()` fetches the local example URL, converts it to a File, then uses the same validation and processing path.

- [ ] **Step 4: Run syntax and contract tests**

Run: `node --check casting-asset-store.js && node prompt-generator.test.js`

Expected: both commands exit 0 and the new asset-store test prints PASS.

- [ ] **Step 5: Commit the isolated asset module**

```bash
git add casting-asset-store.js prompt-generator.test.js
git commit -m "feat: add persistent casting image store"
```

---

### Task 2: Upload Surface and Visual States

**Files:**
- Modify: `index.html`
- Modify: `casting-option-3.css`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: `casting-asset-store.js` browser global from Task 1.
- Produces DOM hooks: `#casting-reference-file`, `#casting-upload-empty`, `#casting-asset-meta`, `#casting-replace-image`, `#casting-remove-image`, `#casting-upload-error`, `#casting-roster-current-image`.

- [ ] **Step 1: Add failing DOM and CSS contract tests**

```js
runTest("casting workspace exposes a persistent reference upload surface", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const theme = fs.readFileSync("casting-option-3.css", "utf8");
  ["casting-reference-file", "casting-upload-empty", "casting-asset-meta", "casting-replace-image", "casting-remove-image", "casting-upload-error", "casting-roster-current-image"]
    .forEach((id) => assert(html.includes(`id="${id}"`), `missing #${id}`));
  assert(html.includes('accept="image/jpeg,image/png,image/webp"'));
  assert(html.includes('src="casting-asset-store.js'));
  assert(theme.includes(".is-dragging"));
  assert(theme.includes("object-fit: contain"));
});
```

- [ ] **Step 2: Run the suite and verify the DOM test fails**

Run: `node prompt-generator.test.js`

Expected: FAIL on the first missing upload-surface ID.

- [ ] **Step 3: Replace the fixed board with an upload-aware figure**

Keep `#casting-identity-board-image`, but remove its fixed `src`. Add a hidden file input and these states inside `.casting-identity-board`:

```html
<input id="casting-reference-file" class="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp">
<img id="casting-identity-board-image" alt="" hidden>
<div id="casting-upload-empty" class="casting-upload-empty">
  <i data-lucide="image-up" aria-hidden="true"></i>
  <strong>拖入人物参考图</strong>
  <span>JPG、PNG、WebP，单张不超过 15MB</span>
  <button id="casting-select-image" type="button" class="button primary">选择参考图</button>
</div>
<p id="casting-upload-error" class="casting-upload-error" role="alert" hidden></p>
<div id="casting-asset-meta" class="casting-asset-meta" hidden>
  <span id="casting-asset-summary"></span>
  <button id="casting-replace-image" type="button" class="icon-button" title="替换参考图" aria-label="替换参考图"><i data-lucide="replace" aria-hidden="true"></i></button>
  <button id="casting-remove-image" type="button" class="icon-button" title="删除参考图" aria-label="删除参考图"><i data-lucide="trash-2" aria-hidden="true"></i></button>
</div>
```

Give the active roster image `id="casting-roster-current-image"`, remove its fixed `src`, and show its numbered placeholder when no image exists. Load `casting-asset-store.js` immediately before `casting-app.js` with a new cache version.

- [ ] **Step 4: Add visual state rules without changing the grid**

Add scoped CSS for absolute 16:9 board layers, `object-fit: contain`, a high-contrast empty state, `.is-dragging` border/background feedback, bottom asset metadata, visible focus states, and a compact error banner. Use existing color tokens; do not introduce a new palette or change casting column widths.

- [ ] **Step 5: Run static checks**

Run: `node prompt-generator.test.js && git diff --check`

Expected: all tests pass and no whitespace errors are reported.

- [ ] **Step 6: Commit the upload surface**

```bash
git add index.html casting-option-3.css prompt-generator.test.js
git commit -m "feat: add casting reference upload surface"
```

---

### Task 3: Upload, Restore, Replace, Delete, and Version Integration

**Files:**
- Modify: `casting-app.js`
- Modify: `workspace-core.js`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: `aigcCastingAssetStore.prepareImage`, `put`, `get`, `remove`, and `storeExample`.
- Produces: `aigcCastingWorkbench.exportState().referenceAsset` metadata.
- Produces: version entries with `referenceAssetId`.
- Produces: document event `aigc:workspace-dirty` after successful asynchronous asset mutations.

- [ ] **Step 1: Add failing persistence and safety contract tests**

```js
runTest("casting controller persists and restores reference asset metadata", () => {
  const source = fs.readFileSync("casting-app.js", "utf8");
  ["referenceAsset", "handleReferenceFile", "restoreReferenceAsset", "clearReferenceAsset", "aigc:workspace-dirty", "referenceAssetId"]
    .forEach((contract) => assert(source.includes(contract), `missing ${contract}`));
  assert(source.includes("URL.revokeObjectURL"));
  assert(!/identityImage\.src\s*=\s*["']assets\/casting-char-001-board\.png/.test(source));
});

runTest("workspace core saves asynchronous workbench asset changes", () => {
  const source = fs.readFileSync("workspace-core.js", "utf8");
  assert(source.includes('addEventListener("aigc:workspace-dirty"'));
  assert(source.includes("本地图片素材未包含"));
});
```

- [ ] **Step 2: Run the suite and verify persistence tests fail**

Run: `node prompt-generator.test.js`

Expected: FAIL because the asset lifecycle functions are missing.

- [ ] **Step 3: Extend casting state and element bindings**

Add `referenceAsset: null`, `previewUrl: ""`, `assetBusy: false`, and `assetError: ""` to state. Bind every upload DOM hook. Add helpers:

```js
function markWorkspaceDirty() {
  document.dispatchEvent(new CustomEvent("aigc:workspace-dirty"));
}

function releasePreviewUrl() {
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  state.previewUrl = "";
}
```

`renderIdentityStage()` must show the image only when a valid preview URL exists, otherwise show the correct reference-mode or text-mode empty state. Update roster thumbnail and version cards from the same URL and never fall back silently to the sample image.

- [ ] **Step 4: Implement the asset lifecycle**

`handleReferenceFile(file)` validates and prepares the new image, stores it first, updates state only after storage succeeds, deletes the old asset after successful replacement, renders, and dispatches `aigc:workspace-dirty`. On failure it preserves the previous asset and displays the returned Chinese error.

`restoreReferenceAsset(meta)` reads the Blob by ID, creates a fresh Object URL, and clears stale metadata if the Blob is missing. `clearReferenceAsset()` clears UI metadata, saves the state, then removes the unreferenced Blob. Register click, change, dragenter, dragover, dragleave, drop, replace, and delete handlers; all drag handlers call `preventDefault()`.

- [ ] **Step 5: Integrate example loading, versions, and project state**

Make `loadExample()` retain its text example and call `storeExample("assets/casting-char-001-board.png", "casting-char-001-board.png")`. Store `referenceAssetId: state.referenceAsset?.id || ""` in every saved version. Export a plain `referenceAsset` metadata object and import it before calling asynchronous restoration. In text mode, absence of a reference image must not block prompt copy; in reference mode, add the missing image to validation.

- [ ] **Step 6: Wire asynchronous project saving**

Add:

```js
document.addEventListener("aigc:workspace-dirty", scheduleSave);
```

to `workspace-core.js`. In project export copy, add the visible note `项目 JSON 已导出；本地图片素材未包含。` so metadata-only export cannot be mistaken for a portable asset package.

- [ ] **Step 7: Run static and syntax tests**

Run: `node --check casting-app.js && node --check workspace-core.js && node prompt-generator.test.js && git diff --check`

Expected: all commands exit 0.

- [ ] **Step 8: Commit the integrated workflow**

```bash
git add casting-app.js workspace-core.js prompt-generator.test.js
git commit -m "feat: persist casting reference images"
```

---

### Task 4: Browser QA and Regression Verification

**Files:**
- Modify only if QA exposes defects: `index.html`, `casting-option-3.css`, `casting-app.js`, `casting-asset-store.js`, `workspace-core.js`, `prompt-generator.test.js`
- Create locally: `output/playwright/casting-reference-upload/*.png`

**Interfaces:**
- Consumes the completed local casting workspace at `http://127.0.0.1:8766/index.html?workspace=casting&fresh=casting-reference-upload-v1`.
- Produces verified screenshots and a working local preview URL.

- [ ] **Step 1: Confirm or restart the local server**

Run: `curl -I http://127.0.0.1:8766/index.html`

Expected: HTTP 200. If unavailable, start `python3 serve-local.py 8766` in a persistent terminal session and repeat the check.

- [ ] **Step 2: Verify the full reference-image path in Playwright**

At 1440×1024: open the casting deep link, confirm the empty state, upload `assets/casting-char-001-board.png`, verify complete image display and metadata, reload, verify restoration, replace the image, remove it, then use “载入示例” and save a version.

Expected: the same complete image appears in the active roster, identity board, and version card; no stage is cropped, stretched, blank, or backed by the old hard-coded `src`.

- [ ] **Step 3: Verify persistence and error behavior**

Reload the page and reopen the same project. Try an unsupported text file and an image above 15MB. Switch between reference and text creation modes.

Expected: valid assets persist; invalid uploads show Chinese errors without replacing the current image; text mode remains usable without an image; reference mode reports the missing image.

- [ ] **Step 4: Capture responsive evidence**

Capture screenshots at 2048×1152, 1440×1024, 1280×800, and 390×844 into `output/playwright/casting-reference-upload/`.

Expected: the 16:9 board remains complete, controls do not overlap, inspector text remains readable, and horizontal page overflow is absent.

- [ ] **Step 5: Run final regression checks**

Run: `node prompt-generator.test.js && node --check casting-asset-store.js && node --check casting-app.js && node --check workspace-core.js && git diff --check`

Expected: all tests and syntax checks pass.

- [ ] **Step 6: Commit QA fixes if any**

```bash
git add index.html casting-option-3.css casting-app.js casting-asset-store.js workspace-core.js prompt-generator.test.js
git commit -m "fix: polish casting reference image workflow"
```

Do not create an empty commit when no QA fixes were necessary.
