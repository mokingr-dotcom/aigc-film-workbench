# Reverse Three-Column Analysis Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the画面反推 workspace as a three-column reference, eight-dimension calibration, and prompt-output workbench while preserving existing project and copy behavior.

**Architecture:** Keep the static HTML/CSS/JavaScript application and the public `window.aigcReverseWorkbench` API. Extract normalized eight-dimension definitions and pure state helpers into `reverse-analysis.js`, reorganize only `#reverse-workspace`, add a focused stylesheet, and let `reverse-app.js` coordinate local-session image preview, editable calibration fields, prompt composition, validation, and persistent column widths.

**Tech Stack:** Static HTML5, CSS Grid/custom properties, vanilla JavaScript, Object URL image preview, existing Node assertion suite, local Playwright Chromium.

## Global Constraints

- Change only `#reverse-workspace` and reverse-specific scripts, styles, and tests.
- Preserve all existing reverse field IDs and the `window.aigcReverseWorkbench` public API.
- Preserve existing purpose, fidelity, emphasis, ratio, quality, text policy, replacement, extra, example, clear, copy, filename, project import, and project export behavior.
- Do not add a multimodal API, automatic image analysis, cloud image storage, IndexedDB image storage, login, payment, subscription, or cross-workspace transfer.
- Reference images remain current-session Object URLs; projects save only the image filename and text state.
- Eight-dimension fields are optional. Non-empty values are human-confirmed constraints; empty values remain target-model analysis tasks.
- Desktop defaults are 300px left, minimum 500px center, and 500px right, with two accessible resizers.
- Use the confirmed cool gray-green, warm white, fine-line visual system; avoid large pure-black surfaces, neon gradients, glass cards, and radii above 5px.
- At 1440, 1280, 1024, and 390 widths, no content may overlap, crop, become unreachable, or cause horizontal page scrolling.
- Do not stage or revert unrelated dirty worktree changes.
- After implementation, provide a fresh local URL using `?workspace=reverse&fresh=<version>`.

---

## File Map

- Create `reverse-analysis.js`: dimension definitions, normalization, calibrated-count, and human-constraint formatting.
- Create `reverse-three-column.css`: reverse-only three-column layout, visual system, resizers, and responsive rules.
- Modify `index.html`: three-column reverse markup, eight editable fields, stable hooks, and asset loading order.
- Modify `reverse-app.js`: new state, rendering, prompt integration, local image lifecycle, and layout persistence.
- Modify `prompt-generator.test.js`: static contracts and pure-function regression coverage.
- Create `output/playwright/reverse-three-column/`: local QA screenshots only; do not commit them unless requested.

---

### Task 1: Eight-Dimension Data and Pure State Helpers

**Files:**
- Create: `reverse-analysis.js`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Produces: `window.aigcReverseAnalysis.DIMENSION_DEFINITIONS`
- Produces: `normalizeDimensions(value) -> Record<DimensionKey, string>`
- Produces: `countCalibratedDimensions(value) -> number`
- Produces: `buildHumanConstraints(value) -> string`
- `DimensionKey`: `subject | composition | camera | lighting | color | material | style | background`

- [ ] **Step 1: Write a failing pure-helper test**

Add the module import near the existing test imports:

```js
const {
  DIMENSION_DEFINITIONS,
  normalizeDimensions,
  countCalibratedDimensions,
  buildHumanConstraints
} = require("./reverse-analysis.js");
```

Add this test:

```js
runTest("reverse analysis normalizes and counts eight human calibration fields", () => {
  assert.deepStrictEqual(DIMENSION_DEFINITIONS.map((item) => item.key), [
    "subject", "composition", "camera", "lighting",
    "color", "material", "style", "background"
  ]);
  const normalized = normalizeDimensions({
    subject: "  单人，38岁女刑警  ",
    lighting: "冷白逆光",
    unknown: "ignored"
  });
  assert.strictEqual(normalized.subject, "单人，38岁女刑警");
  assert.strictEqual(normalized.lighting, "冷白逆光");
  assert.strictEqual(normalized.background, "");
  assert.strictEqual(normalized.unknown, undefined);
  assert.strictEqual(countCalibratedDimensions(normalized), 2);
  assert(buildHumanConstraints(normalized).includes("主体特征：单人，38岁女刑警"));
  assert(buildHumanConstraints(normalized).includes("光线方向：冷白逆光"));
  assert(!buildHumanConstraints(normalized).includes("背景元素："));
});
```

- [ ] **Step 2: Run the suite and verify the new test fails**

Run:

```bash
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js
```

Expected: FAIL because `reverse-analysis.js` does not exist.

- [ ] **Step 3: Create the analysis module**

Use an IIFE that supports both browser globals and CommonJS:

```js
(function initReverseAnalysis(root) {
  const DIMENSION_DEFINITIONS = [
    { key: "subject", label: "主体特征", short: "数量、身份、比例、动作与表情" },
    { key: "composition", label: "构图方式", short: "布局、留白、动线与空间层级" },
    { key: "camera", label: "镜头角度", short: "景别、机位、焦段感与景深" },
    { key: "lighting", label: "光线方向", short: "主光、光比、软硬与投影" },
    { key: "color", label: "色彩搭配", short: "主辅色、冷暖、面积与饱和度" },
    { key: "material", label: "材质细节", short: "皮肤、布料、金属与真实瑕疵" },
    { key: "style", label: "画面风格", short: "媒介、年代、类型与成像质感" },
    { key: "background", label: "背景元素", short: "地点、天气、道具与叙事层级" }
  ];

  function normalizeDimensions(value = {}) {
    return Object.fromEntries(DIMENSION_DEFINITIONS.map(({ key }) => [key, String(value[key] || "").trim()]));
  }

  function countCalibratedDimensions(value) {
    return Object.values(normalizeDimensions(value)).filter(Boolean).length;
  }

  function buildHumanConstraints(value) {
    const normalized = normalizeDimensions(value);
    const lines = DIMENSION_DEFINITIONS
      .filter(({ key }) => normalized[key])
      .map(({ key, label }) => `${label}：${normalized[key]}`);
    return lines.length
      ? lines.join("\n")
      : "暂无人工确认约束；请根据参考图完成全部八维分析。";
  }

  const api = { DIMENSION_DEFINITIONS, normalizeDimensions, countCalibratedDimensions, buildHumanConstraints };
  root.aigcReverseAnalysis = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
```

- [ ] **Step 4: Run the suite and verify the helper test passes**

Expected: the new helper test passes and the previous baseline remains green.

- [ ] **Step 5: Commit the module and its test**

```bash
git add reverse-analysis.js prompt-generator.test.js
git commit -m "feat: add reverse calibration model"
```

---

### Task 2: Three-Column DOM and Preserved Field Contract

**Files:**
- Modify: `index.html`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: `reverse-analysis.js` before `reverse-app.js`
- Preserves IDs: `reverse-source-mode`, `reverse-image-input`, `reverse-image-preview`, `reverse-image-placeholder`, `reverse-privacy-note`, `reverse-purpose`, `reverse-fidelity`, `reverse-emphasis`, `reverse-ratio`, `reverse-quality`, `reverse-text-policy`, `reverse-replacement`, `reverse-extra`, `reverse-output`, `reverse-filename`, `reverse-validation`, `reverse-copy`, `reverse-example`, `reverse-clear`
- Adds IDs: `reverse-dimension-grid`, `reverse-calibration-count`, `reverse-clear-dimensions`, `reverse-reference-status`

- [ ] **Step 1: Write a failing three-column DOM contract test**

```js
runTest("reverse workspace exposes the three-column editable analysis contract", () => {
  const html = fs.readFileSync("index.html", "utf8");
  [
    'class="reverse-reference-panel"',
    'class="reverse-analysis-panel"',
    'class="reverse-result-panel"',
    'id="reverse-dimension-grid"',
    'id="reverse-calibration-count"',
    'id="reverse-clear-dimensions"',
    'data-reverse-resizer="left"',
    'data-reverse-resizer="right"',
    'src="reverse-analysis.js',
    'href="reverse-three-column.css'
  ].forEach((contract) => assert(html.includes(contract), `missing ${contract}`));
  ["subject", "composition", "camera", "lighting", "color", "material", "style", "background"]
    .forEach((key) => assert(html.includes(`data-reverse-dimension="${key}"`), `missing ${key}`));
});
```

- [ ] **Step 2: Add a preservation test for existing IDs**

For every preserved ID listed above, assert it occurs exactly once in `index.html`. Assert `reverse-app.js` still contains `aigcReverseWorkbench`, `exportState`, `importState`, `loadExample`, `clearFields`, `composePrompt`, and `URL.revokeObjectURL`.

- [ ] **Step 3: Run the suite and verify the DOM test fails**

Expected: FAIL for missing three-column hooks; existing ID preservation passes.

- [ ] **Step 4: Reorganize only `#reverse-workspace`**

Create this DOM order:

```text
#reverse-workspace.reverse-production-shell
  .reverse-reference-panel
    panel header and image status
    source mode
    16:9 upload/preview board
    task settings and replacement fields
  [left separator]
  .reverse-analysis-panel
    panel header and N/8 status
    clear-dimensions command
    #reverse-dimension-grid
      eight labelled textarea sections
  [right separator]
  .reverse-result-panel
    actions and output status
    validation and calibration summary
    #reverse-output
    filename
```

Each dimension textarea uses `data-reverse-dimension="<key>"`, a visible label, a concise standard, and this placeholder pattern:

```text
观察证据：……
可执行参数：……
```

Move existing controls rather than duplicating them. Keep every preserved ID exactly once.

- [ ] **Step 5: Load reverse assets in stable order**

Add `reverse-three-column.css` after `poster-three-column.css`. Load `reverse-analysis.js` immediately before `reverse-app.js`. Add fresh version strings to all changed reverse assets.

- [ ] **Step 6: Run the complete static suite**

Expected: DOM and ID contracts pass; behavior tests added later are not yet present.

- [ ] **Step 7: Commit the structural change**

```bash
git add index.html prompt-generator.test.js
git commit -m "feat: structure reverse analysis workbench"
```

---

### Task 3: Focused Visual System and Responsive Layout

**Files:**
- Create: `reverse-three-column.css`
- Modify: `prompt-generator.test.js`

- [ ] **Step 1: Write a failing CSS contract test**

```js
runTest("reverse three-column stylesheet defines balanced responsive analysis layout", () => {
  const css = fs.readFileSync("reverse-three-column.css", "utf8");
  [
    "--reverse-left-width", "--reverse-right-width",
    "minmax(500px, 1fr)", "object-fit: contain",
    ".reverse-column-resizer:focus-visible",
    "@media (max-width: 1180px)", "@media (max-width: 820px)"
  ].forEach((contract) => assert(css.includes(contract), `missing ${contract}`));
});
```

- [ ] **Step 2: Run the suite and verify the CSS test fails**

Expected: FAIL because `reverse-three-column.css` does not exist.

- [ ] **Step 3: Implement the desktop grid**

Use these reverse-local custom properties:

```css
#reverse-workspace.reverse-production-shell {
  --reverse-left-width: 300px;
  --reverse-right-width: 500px;
  --reverse-resizer-width: 9px;
  display: grid;
  grid-template-columns: var(--reverse-left-width) var(--reverse-resizer-width) minmax(500px, 1fr) var(--reverse-resizer-width) var(--reverse-right-width);
}
```

Make every panel own its scroll region. The outer workspace fills the space below the 66px command bar without clipping.

- [ ] **Step 4: Implement the reference panel**

Use a stable 16:9 image board. Apply `object-fit: contain`, visible empty/uploaded/error states, a readable filename status, and labels above controls. Avoid overlays on the image except a small non-obscuring file-status strip.

- [ ] **Step 5: Implement the analysis panel**

At desktop, render two columns of four dimension sections. Each section uses a number, visible label, concise standard, status text, and textarea. Use borders and spacing instead of nested decorative cards. Non-empty sections receive a restrained green status; empty sections show neutral “由目标模型补充”.

- [ ] **Step 6: Implement the output panel**

Keep toolbar labels on one line, prompt text at least 12px with line-height 1.6, and validation/filename outside the scrollable textarea. The result panel must remain readable at its 420px minimum width.

- [ ] **Step 7: Implement responsive rules**

- Above 1180px: three columns and visible resizers.
- 820–1180px: reference panel, analysis panel, result panel in vertical order; hide resizers; dimension grid remains two columns when space permits.
- Below 820px: one column; dimension grid becomes one column; all task fields become one column; toolbar commands remain text-labelled.

- [ ] **Step 8: Run tests and inspect scoped selectors**

Run the Node suite, then use `rg` to confirm selectors are scoped to `#reverse-workspace` or reverse-specific classes and do not override poster, casting, camera, or tone workspaces.

- [ ] **Step 9: Commit the visual layer**

```bash
git add reverse-three-column.css prompt-generator.test.js
git commit -m "feat: style reverse analysis workbench"
```

---

### Task 4: Editable Calibration State and Prompt Integration

**Files:**
- Modify: `reverse-app.js`
- Modify: `prompt-generator.test.js`

**State additions:**

```js
state.dimensions = normalizeDimensions();
state.layout = { leftWidth: 300, rightWidth: 500 };
```

- [ ] **Step 1: Write failing controller contracts**

Assert `reverse-app.js` contains `aigcReverseAnalysis`, `dimensionInputs`, `state.dimensions`, `countCalibratedDimensions`, `buildHumanConstraints`, `renderDimensionState`, and `人工确认约束`.

- [ ] **Step 2: Write a failing export/import contract**

Assert `exportState()` includes `dimensions: normalizeDimensions(state.dimensions)` and `layout: { ...state.layout }`. Assert `importState()` consumes `saved.dimensions` and `saved.layout`, with defaults for older projects.

- [ ] **Step 3: Run the suite and verify both behavior contracts fail**

Expected: FAIL for missing calibration state and persistence code.

- [ ] **Step 4: Bind the eight inputs**

Collect the textareas with:

```js
dimensionInputs: [...document.querySelectorAll("[data-reverse-dimension]")]
```

On input, write the value to `state.dimensions[input.dataset.reverseDimension]`, clear copied state, render status and prompt, and allow project autosave through the same input event path used by existing fields.

- [ ] **Step 5: Render calibration status**

`renderDimensionState()` must:

- compute `countCalibratedDimensions(state.dimensions)`
- set `#reverse-calibration-count` to `已校准 N/8`
- mark each non-empty dimension `calibrated`
- set visible status text to `人工校准` or `由目标模型补充`

- [ ] **Step 6: Integrate human constraints into `composePrompt()`**

Insert this dedicated section after the fixed eight-dimension standards:

```text
【人工确认约束】
以下非空内容由用户人工确认，优先级高于模型推测，不得覆盖或改写：
<buildHumanConstraints(state.dimensions)>
未填写的维度请继续根据参考图完成分析；无法确认时写“无法确认”。
```

Do not remove the existing task, core requirement, fixed standards, emphasis, fidelity, replacement, ratio, quality, text policy, output-format, negative, or technical-summary instructions.

- [ ] **Step 7: Implement “clear dimensions”**

Set `state.dimensions = normalizeDimensions()`, clear only the eight dimension textareas, retain the image, task settings, replacement, and extra fields, then render.

- [ ] **Step 8: Update example, clear, export, and import**

- `loadExample()` fills at least `subject`, `composition`, `lighting`, and `color` with concise evidence/parameter examples.
- `clearFields()` clears all eight dimensions in addition to existing fields.
- `exportState()` saves normalized dimensions.
- `importState()` restores normalized dimensions and ignores unknown keys.

- [ ] **Step 9: Run the complete suite**

Expected: all pure-helper, DOM, CSS, calibration, prompt, and legacy reverse tests pass.

- [ ] **Step 10: Commit calibration behavior**

```bash
git add reverse-app.js prompt-generator.test.js
git commit -m "feat: add editable reverse calibrations"
```

---

### Task 5: Accessible Resizers, Image Error State, and Layout Persistence

**Files:**
- Modify: `reverse-app.js`
- Modify: `prompt-generator.test.js`

- [ ] **Step 1: Write failing layout interaction contracts**

Require `pointerdown`, `setPointerCapture`, `ArrowLeft`, `ArrowRight`, `dblclick`, `--reverse-left-width`, `--reverse-right-width`, `aria-valuenow`, `leftWidth`, and `rightWidth` in `reverse-app.js`.

- [ ] **Step 2: Write a failing image lifecycle contract**

Require accepted MIME validation for `image/jpeg`, `image/png`, and `image/webp`, a visible error message hook, `URL.createObjectURL`, and revocation on replacement, clear, and project import.

- [ ] **Step 3: Run the suite and verify intended failures**

Expected: FAIL for missing resizer and explicit image-error behavior.

- [ ] **Step 4: Implement pointer resizers**

Use Pointer Events and pointer capture. Clamp left to 270–420px, right to 420–620px, and preserve a center minimum of 500px. Apply widths through CSS custom properties on `#reverse-workspace`.

- [ ] **Step 5: Implement keyboard and reset behavior**

Arrow keys move by 8px, Shift+Arrow by 24px, and double-click restores 300px/500px. Update separator min, max, and current ARIA values after every layout change. Disable adjustment at widths up to 1180px.

- [ ] **Step 6: Persist layout in existing project state**

Add `layout` to `exportState()`. During `importState()`, validate numeric widths, clamp them for the current viewport, and fall back to defaults for old projects. Dispatch `aigc:workspace-dirty` after pointer, keyboard, or reset completion so the current project saves the new widths.

- [ ] **Step 7: Add explicit image validation and error rendering**

Before creating an Object URL, reject non-JPEG/PNG/WebP files and show `仅支持 JPG、PNG 或 WebP 图片。`. Add an image `error` listener that revokes the failed URL, clears preview state, preserves all text fields, and displays `图片无法预览，请重新选择。`.

- [ ] **Step 8: Run the complete suite**

Expected: all tests pass, including old projects without `dimensions` or `layout`.

- [ ] **Step 9: Commit interaction behavior**

```bash
git add reverse-app.js prompt-generator.test.js
git commit -m "feat: persist reverse analysis layout"
```

---

### Task 6: Browser Functional and Visual QA

**Files:**
- Modify only when QA identifies a verified defect: `index.html`, `reverse-three-column.css`, `reverse-app.js`, `reverse-analysis.js`, `prompt-generator.test.js`
- Create locally: `output/playwright/reverse-three-column/*.png`

- [ ] **Step 1: Open the fresh local page**

Use:

```text
http://127.0.0.1:8766/index.html?workspace=reverse&fresh=reverse-three-column-qa-v1
```

If port 8766 is unavailable, start the existing static site on the next free port and use that port consistently.

- [ ] **Step 2: Verify the local image lifecycle**

Test target-AI mode, local mode without an image, a valid JPEG/PNG/WebP, replacement, clear, invalid file rejection, and project restoration showing the saved filename but requiring re-selection. Confirm the preview uses complete composition and does not crop.

- [ ] **Step 3: Verify all eight calibration fields**

Fill dimensions one by one and assert the progress changes from 0/8 through 8/8. Clear only dimensions and confirm task settings and image state remain. Load the example and confirm at least four dimensions are filled.

- [ ] **Step 4: Verify prompt behavior**

For non-empty dimensions, confirm the output contains one `【人工确认约束】` section and each populated dimension exactly once. Confirm blank dimensions are not emitted as empty constraints and the instruction still asks the target model to analyze them.

- [ ] **Step 5: Verify resizers and persistence**

Drag both separators, use keyboard adjustment, double-click reset, refresh, and reopen the current project. Confirm widths restore and the center never drops below 500px.

- [ ] **Step 6: Capture responsive screenshots**

Capture and inspect the same meaningful state at:

- 1440×1024
- 1280×900
- 1024×900
- 390×844

Reject screenshots with blank panels, loading states, cropped images, overlapping text, unreachable fields, or horizontal page scrolling.

- [ ] **Step 7: Perform visual comparison**

Compare the 1440 screenshot with the approved design specification and the confirmed poster workbench visual language. Check column proportions, reference-image prominence, field density, type hierarchy, prompt readability, gray/green balance, border treatment, and empty space. Correct visual mismatches before accepting functional success.

- [ ] **Step 8: Check runtime health**

Confirm no console errors or warnings, all focus states are visible, every textarea has a visible label, calibration status uses text plus color, and separators expose correct ARIA values.

- [ ] **Step 9: Run final automated verification**

```bash
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --check reverse-app.js
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --check reverse-analysis.js
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js
git diff --check
```

Expected: syntax checks exit 0, the test suite reports zero failures with a pass count above the current baseline of 107, and `git diff --check` produces no output.

- [ ] **Step 10: Review intended files and commit QA fixes**

```bash
git status --short -- index.html reverse-analysis.js reverse-three-column.css reverse-app.js prompt-generator.test.js
git diff -- index.html reverse-analysis.js reverse-three-column.css reverse-app.js prompt-generator.test.js
git add index.html reverse-analysis.js reverse-three-column.css reverse-app.js prompt-generator.test.js
git commit -m "feat: complete reverse analysis workbench"
```

Do not stage `output/playwright/` screenshots or unrelated dirty files.

---

## Final Delivery Checklist

- [ ] Only the reverse workspace is formally redesigned.
- [ ] Every existing reverse field ID and public API remains compatible.
- [ ] Reference images stay local to the current session and display without cropping.
- [ ] Eight calibration fields edit, count, clear, save, import, and restore correctly.
- [ ] Non-empty dimensions become human-confirmed prompt constraints.
- [ ] Empty dimensions remain target-model analysis requirements.
- [ ] Existing prompt structure and copyright/identity boundaries remain present.
- [ ] Both resizers support pointer, keyboard, reset, and project persistence.
- [ ] 1440, 1280, 1024, and 390 screenshots pass visual QA.
- [ ] Browser console is clean and keyboard focus is visible.
- [ ] Automated tests report zero failures.
- [ ] A fresh local browser link is delivered to the user.
