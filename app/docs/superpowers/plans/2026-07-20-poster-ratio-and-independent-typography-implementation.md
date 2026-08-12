# Poster Ratio And Independent Typography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make uploaded poster ratio choices change the actual monitor and export crop, while allowing Chinese and English title layers to choose typography independently.

**Architecture:** Extend the existing Fabric compositor with separate immutable source dimensions and mutable output dimensions. Keep ratio orchestration and per-layer font presets in `poster-app.js`, while `poster-compositor.js` remains responsible for crop geometry, layer rendering, serialization, and export.

**Tech Stack:** Vanilla JavaScript, Fabric.js 7.4.0, HTML/CSS, Node assertion tests, local in-app browser QA.

## Global Constraints

- Original image assets remain unchanged in IndexedDB.
- Ratio changes use center crop without stretching or upscaling.
- Monitor dimensions and exported PNG/JPG dimensions must match.
- Chinese and English text layers persist typography independently.
- Existing element IDs, project persistence, drag, multiline editing, lock state, and local-only asset behavior remain compatible.

---

### Task 1: Output ratio crop geometry

**Files:**
- Modify: `poster-compositor.js`
- Modify: `poster-app.js`
- Test: `prompt-generator.test.js`

**Interfaces:**
- Consumes: `createPosterCompositor(options)`, `setSource({ url, width, height })`, existing ratio strings such as `"16:9"`.
- Produces: `calculateCenterCrop(width, height, ratio): { width, height, offsetX, offsetY }` and compositor method `setOutputRatio(ratio): object`.

- [ ] **Step 1: Write the failing crop geometry test**

```js
const { calculateCenterCrop } = require("./poster-compositor.js");
assert.deepStrictEqual(calculateCenterCrop(1200, 800, "1:1"), {
  width: 800, height: 800, offsetX: -200, offsetY: 0
});
assert.deepStrictEqual(calculateCenterCrop(800, 1200, "16:9"), {
  width: 800, height: 450, offsetX: 0, offsetY: -375
});
```

- [ ] **Step 2: Run the test and verify red state**

Run: `node prompt-generator.test.js`

Expected: FAIL because `calculateCenterCrop` is not exported.

- [ ] **Step 3: Implement ratio parsing and center crop**

```js
function calculateCenterCrop(width, height, ratio = "") {
  const [rw, rh] = String(ratio).split(":").map(Number);
  if (!(width > 0 && height > 0 && rw > 0 && rh > 0)) {
    return { width, height, offsetX: 0, offsetY: 0 };
  }
  const target = rw / rh;
  const cropWidth = width / height > target ? Math.round(height * target) : width;
  const cropHeight = width / height > target ? height : Math.round(width / target);
  return {
    width: cropWidth,
    height: cropHeight,
    offsetX: Math.round((cropWidth - width) / 2),
    offsetY: Math.round((cropHeight - height) / 2)
  };
}
```

Track `originalSize` separately from `sourceSize`. `setOutputRatio()` updates real canvas dimensions, positions the original image at the returned offsets, reapplies text/image layers using normalized output coordinates, clamps their centers to a 4% safe inset, refreshes fit/100% preview, and emits the serialized state.

- [ ] **Step 4: Connect all ratio changes**

In `poster-app.js`, call:

```js
if (compositor) {
  compositor.setOutputRatio(elements.ratio.value);
  lastExportSummary = "";
}
```

from ratio buttons, ratio `<select>`, purpose changes, and compositor activation after `setSource()`.

- [ ] **Step 5: Verify crop tests and syntax**

Run: `node --check poster-compositor.js && node --check poster-app.js && node prompt-generator.test.js`

Expected: all checks PASS.

- [ ] **Step 6: Commit crop behavior**

```bash
git add poster-compositor.js poster-app.js prompt-generator.test.js
git commit -m "feat: crop poster output to selected ratio"
```

### Task 2: Independent typography per title layer

**Files:**
- Modify: `index.html`
- Modify: `poster-app.js`
- Modify: `poster-compositor.css`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: `COMPOSITOR_FONT_PRESETS`, `currentCompositorState()`, `compositor.updateLayer(id, patch)`.
- Produces: `#poster-layer-font-style` and `applyTypographyToLayer(layerId, fontKey)`.

- [ ] **Step 1: Write the failing independent typography contract test**

```js
assert(html.includes('id="poster-layer-font-style"'));
assert(app.includes("applyTypographyToLayer"));
assert(app.includes('currentCompositorState().selectedLayer'));
assert(app.includes('"title-cn"'));
assert(app.includes('"title-en"'));
```

- [ ] **Step 2: Run the test and verify red state**

Run: `node prompt-generator.test.js`

Expected: FAIL because the layer font control and layer-only applicator are missing.

- [ ] **Step 3: Add the current-layer font selector**

Add this text-only field beside existing text controls:

```html
<label class="field poster-text-layer-field">
  <span>当前图层字体样式</span>
  <select id="poster-layer-font-style">
    <option value="serif">电影衬线</option>
    <option value="condensed">高窄无衬线</option>
    <option value="bold">粗黑无衬线</option>
    <option value="song">中文宋体</option>
    <option value="calligraphy">东方书法</option>
    <option value="handwritten">手写文艺</option>
    <option value="geometric">科幻几何</option>
    <option value="horror">惊悚衬线</option>
    <option value="playful">活泼喜剧</option>
  </select>
</label>
```

- [ ] **Step 4: Persist a semantic font style per layer**

Add `fontStyleKey` to both text layer defaults and normalization. Implement:

```js
function applyTypographyToLayer(layerId, fontKey) {
  if (!['title-cn', 'title-en'].includes(layerId)) return;
  const language = layerId === 'title-cn' ? 'cn' : 'en';
  const preset = COMPOSITOR_FONT_PRESETS[fontKey] || COMPOSITOR_FONT_PRESETS.serif;
  const patch = { ...preset[language], fontStyleKey: fontKey };
  state.compositor.layers[layerId] = { ...state.compositor.layers[layerId], ...patch };
  compositor?.updateLayer(layerId, patch);
}
```

`renderCompositorControls()` reads the selected text layer's `fontStyleKey`. The selector change handler applies only to `currentCompositorState().selectedLayer`. The existing title-template handler continues to apply its paired preset to both text layers.

- [ ] **Step 5: Verify layer switching and persistence tests**

Run: `node --check poster-app.js && node --check poster-compositor.js && node prompt-generator.test.js`

Expected: all checks PASS; changing Chinese style does not change English serialized state.

- [ ] **Step 6: Commit independent typography**

```bash
git add index.html poster-app.js poster-compositor.js poster-compositor.css prompt-generator.test.js
git commit -m "feat: edit poster title fonts per layer"
```

### Task 3: Browser QA and cache-safe delivery

**Files:**
- Modify: `index.html`
- Test: `prompt-generator.test.js`

**Interfaces:**
- Consumes: local URL `http://127.0.0.1:8766/index.html?workspace=poster`.
- Produces: a cache-busted final local review URL.

- [ ] **Step 1: Bump poster CSS and JS resource query versions**

Use one shared version token such as:

```html
poster-compositor.js?v=20260720-poster-ratio-font-layer-v1
poster-app.js?v=20260720-poster-ratio-font-layer-v1
poster-compositor.css?v=20260720-poster-ratio-font-layer-v1
```

- [ ] **Step 2: Run complete automated verification**

Run:

```bash
node --check poster-compositor.js
node --check poster-app.js
node prompt-generator.test.js
git diff --check
```

Expected: all checks PASS and no whitespace errors.

- [ ] **Step 3: Verify real ratio behavior**

Upload one local poster, select `2:3`, `16:9`, and `1:1`, and inspect the monitor status after each selection. Expected: canvas shape and export dimensions change without stretching the image.

- [ ] **Step 4: Verify independent typography behavior**

Select Chinese layer and apply `calligraphy`; select English layer and apply `condensed`. Switch between layers. Expected: each selector restores its own value, both visual styles remain distinct, multiline editing and dragging still work.

- [ ] **Step 5: Verify export and cleanup**

Export PNG once and confirm downloaded dimensions match the selected ratio. Remove only the temporary QA asset, restore pre-test title/template values, and confirm browser console has no errors.

- [ ] **Step 6: Commit delivery metadata**

```bash
git add index.html prompt-generator.test.js
git commit -m "test: verify poster ratio and layer typography"
```
