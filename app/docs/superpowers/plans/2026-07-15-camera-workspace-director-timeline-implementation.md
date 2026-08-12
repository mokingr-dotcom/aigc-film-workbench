# 15-Second Camera Workspace Director Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild only the 15-second camera workspace as the selected Director Timeline Command Center, with a compact master-shot library, cinematic monitor, three-track 0–15 second timeline, optional blocking map, and complete Seedance prompt inspector.

**Architecture:** Keep the current static HTML, CSS, vanilla JavaScript, local data, shared header, workspace switching, and project persistence. Add one pure CommonJS/browser timeline-model module and one camera-only stylesheet; integrate them through the existing `camera-app.js` state instead of creating a second camera store or changing the other four workspace bodies.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, local Lucide bundle, Node.js assertion tests, Playwright CLI, persistent Python local server on `127.0.0.1:8766`.

## Global Constraints

- Visual truth: scheme A in `design-references/camera-workspace-options.html`.
- Target desktop viewport: `1440 x 1024`.
- Implement only `#camera-workspace`; preserve the shared header and the other four workspace bodies.
- Preserve all existing camera field IDs, `data-workspace="camera"`, `camera-data.js`, workspace switching, project save/import/export, tone transfer, casting transfer, validation, clearing, and copying.
- Keep case selection single-choice. Selecting a new case replaces the previous case.
- Preserve the existing `大师案例 / 类型模板` sources and their current 24-case and 22-template data.
- Preserve the generator fields and copy meaning for `角色与参考图 / 场景与年代 / 人物情绪与表演 / 剧情动作与关键物件 / 声音 / 结尾衔接`.
- The timeline is explanatory in this release; do not build a draggable video editor.
- Use existing local raster assets and the local Lucide bundle. Do not add network dependencies, handcrafted SVGs, decorative gradients, or a competing global theme.
- The advanced blocking map is collapsed by default and does not replace the 0–15 second timeline.
- Keep the existing Seedance constraints for `不切镜 / 不越轴 / 不换脸 / 无字幕 / 无水印 / 无背景音乐`.
- Do not redesign (`不重做`) the tone, casting, poster, or reverse workspace bodies.
- Browser console must finish with `0` errors and `0` warnings.

## File Structure

- `camera-timeline.js`: pure extraction and view-model functions for timed prompt beats and blocking-map eligibility; browser and CommonJS compatible.
- `camera-app.js`: owns camera workspace state, DOM events, prompt generation, timeline rendering, version snapshots, and transfer/persistence adapters.
- `camera-option-a.css`: the only new production stylesheet; all selectors scoped to `#camera-workspace` or the shared header's camera-active state.
- `index.html`: preserves existing IDs while adding the monitor, timeline, blocking map, and version action containers.
- `prompt-generator.test.js`: Node contract tests for the timeline model, selected DOM structure, stylesheet scope, preserved fields, and workbench API.
- `design-references/camera-option-a.png`: fixed screenshot of the selected visual target used by visual QA.
- `design-qa-camera.md`: same-viewport comparison evidence and final pass/block decision.

---

### Task 1: Lock The Selected Camera Contract

**Files:**
- Create: `design-references/camera-option-a.png`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: scheme A in `design-references/camera-workspace-options.html`, existing `index.html`, and existing camera IDs.
- Produces: a fixed visual target and failing assertions for the new module, stylesheet, stage, timeline, blocking map, and preserved camera fields.

- [ ] **Step 1: Capture scheme A as the fixed visual target.**

Use the already authorized local Playwright CLI. Open the persistent design page, set `1440 x 1024`, screenshot the first `.frame`, and save it as `design-references/camera-option-a.png`.

```bash
NODE="/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
CLI="/Users/xiaoweixiaogang/.npm/_npx/31e32ef8478fbf80/node_modules/@playwright/cli/playwright-cli.js"
URL="http://127.0.0.1:8766/design-references/camera-workspace-options.html?fresh=camera-plan-source"

"$NODE" "$CLI" --session camera-source open "$URL"
"$NODE" "$CLI" --session camera-source resize 1440 1024
"$NODE" "$CLI" --session camera-source snapshot
"$NODE" "$CLI" --session camera-source run-code 'async page => { await page.locator(".frame").first().screenshot({ path: "design-references/camera-option-a.png" }); return await page.locator(".frame").first().boundingBox(); }'
"$NODE" "$CLI" --session camera-source close
sips -z 1024 1440 design-references/camera-option-a.png >/dev/null
sips -g pixelWidth -g pixelHeight design-references/camera-option-a.png
```

Expected dimensions: `pixelWidth: 1440` and `pixelHeight: 1024`. Inspect the saved image with `view_image` before continuing.

- [ ] **Step 2: Add failing production-contract tests.**

Add these assertions near the existing camera tests in `prompt-generator.test.js`:

```js
runTest("selected camera option A exposes the director timeline contract", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const theme = fs.readFileSync("camera-option-a.css", "utf8");
  assert(html.includes('href="camera-option-a.css'));
  assert(html.includes('src="camera-timeline.js'));
  [
    'id="camera-stage"',
    'id="camera-monitor"',
    'id="camera-timeline"',
    'id="camera-blocking-toggle"',
    'id="camera-blocking-map"',
    'id="camera-save-version"'
  ].forEach((contract) => assert(html.includes(contract), `missing ${contract}`));
  assert(theme.includes("#camera-workspace.camera-shell"));
  assert(theme.includes("grid-template-columns: 270px minmax(0, 1fr) 360px"));
  assert(theme.includes('grid-template-areas: "library stage composer"'));
});

runTest("camera redesign preserves all business-critical field IDs", () => {
  const html = fs.readFileSync("index.html", "utf8");
  [
    "camera-search", "camera-source-tabs", "camera-group-filter", "camera-results",
    "camera-character", "camera-scene", "camera-look", "camera-performance",
    "camera-action", "camera-sound", "camera-ending", "camera-validation",
    "camera-output", "camera-copy", "camera-clear"
  ].forEach((id) => assert(html.includes(`id="${id}"`), `missing #${id}`));
});
```

- [ ] **Step 3: Run the test and verify RED.**

Run:

```bash
NODE="/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
"$NODE" prompt-generator.test.js
```

Expected: FAIL because `camera-option-a.css`, `camera-timeline.js`, and the new camera-stage IDs do not exist.

- [ ] **Step 4: Commit the contract and source visual.**

```bash
git add prompt-generator.test.js design-references/camera-option-a.png
git commit -m "test: lock director timeline camera contract"
```

---

### Task 2: Build The Pure 0–15 Second Timeline Model

**Files:**
- Create: `camera-timeline.js`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: a selected case or genre object from `camera-data.js` with `prompt`, `core`, `analysis`, `camera`, and `blocking` fields.
- Produces: `extractTimelineSegments(prompt)`, `buildCameraTimelineModel(item)`, `requiresBlockingMap(item)`, and `buildBlockingMapModel(model)` on both `module.exports` and `window.aigcCameraTimeline`.

- [ ] **Step 1: Write failing timeline-model tests.**

Add the import at the top of `prompt-generator.test.js`:

```js
const {
  extractTimelineSegments,
  buildCameraTimelineModel,
  requiresBlockingMap,
  buildBlockingMapModel
} = require("./camera-timeline.js");
```

Add these tests:

```js
runTest("camera timeline converts a 15-second case into three readable tracks", () => {
  const item = cameraPromptData.cases.find((entry) => entry.id === "C05");
  const segments = extractTimelineSegments(item.prompt);
  const model = buildCameraTimelineModel(item);
  assert(segments.length >= 4);
  assert.strictEqual(segments[0].start, 0);
  assert.strictEqual(segments.at(-1).end, 15);
  assert.deepStrictEqual(model.markers, [0, 3, 6, 9, 12, 15]);
  assert.deepStrictEqual(model.tracks.map((track) => track.id), ["performance", "camera", "scene"]);
  assert(model.tracks.every((track) => track.beats.length > 0));
  assert(model.tracks.flatMap((track) => track.beats).every((beat) => beat.start >= 0 && beat.end <= 15 && beat.end > beat.start));
});

runTest("camera blocking map is reserved for spatially complex cases", () => {
  const layered = cameraPromptData.cases.find((entry) => entry.id === "C07");
  const intimate = cameraPromptData.cases.find((entry) => entry.id === "C05");
  assert.strictEqual(requiresBlockingMap(layered), true);
  assert.strictEqual(requiresBlockingMap(intimate), false);
  const map = buildBlockingMapModel(buildCameraTimelineModel(layered));
  assert.deepStrictEqual(map.points.map((point) => point.id), ["A", "B", "C"]);
  assert(map.points.every((point) => point.time >= 0 && point.time <= 15 && point.label));
});
```

- [ ] **Step 2: Run the tests and verify RED.**

Run:

```bash
NODE="/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
"$NODE" prompt-generator.test.js
```

Expected: FAIL with `Cannot find module './camera-timeline.js'`.

- [ ] **Step 3: Implement the browser/CommonJS timeline module.**

Create `camera-timeline.js` with this implementation:

```js
(function initCameraTimeline(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.aigcCameraTimeline = api;
})(typeof window !== "undefined" ? window : globalThis, function createCameraTimeline() {
  const TRACKS = [
    { id: "performance", label: "人物表演", keywords: ["人物", "主角", "角色", "眼", "呼吸", "停", "抬", "转", "走", "起身", "手", "肩", "重心"] },
    { id: "camera", label: "摄影机运动", keywords: ["摄影机", "镜头", "机位", "跟随", "横移", "推进", "后退", "升高", "降低", "固定", "环绕", "摇摄", "构图"] },
    { id: "scene", label: "场景事件", keywords: ["背景", "前景", "中景", "门", "窗", "光", "雨", "雾", "声音", "物件", "车辆", "人群", "环境"] }
  ];

  function clean(value) {
    return String(value || "").replace(/\s+/g, " ").replace(/^[，；。\s]+|[，；。\s]+$/g, "").trim();
  }

  function extractTimelineSegments(prompt) {
    const segments = [];
    const expression = /(\d+)\s*-\s*(\d+)\s*秒([^；。]*[；。]?)/g;
    let match;
    while ((match = expression.exec(String(prompt || "")))) {
      const start = Math.max(0, Math.min(15, Number(match[1])));
      const end = Math.max(start, Math.min(15, Number(match[2])));
      if (end > start) segments.push({ start, end, text: clean(match[3]) });
    }
    return segments;
  }

  function fallbackSegments(item) {
    const text = clean(item?.analysis || item?.blocking || item?.core || item?.camera || item?.name);
    return [
      { start: 0, end: 5, text: `建立：${text}` },
      { start: 5, end: 10, text: `发展：${text}` },
      { start: 10, end: 15, text: `落点：${text}` }
    ];
  }

  function phraseForTrack(text, track) {
    const phrases = clean(text).split(/[，；。]/).map(clean).filter(Boolean);
    return phrases.find((phrase) => track.keywords.some((keyword) => phrase.includes(keyword))) || phrases[0] || "保持连续";
  }

  function buildCameraTimelineModel(item) {
    const segments = extractTimelineSegments(item?.prompt);
    const usable = segments.length ? segments : fallbackSegments(item);
    return {
      duration: 15,
      markers: [0, 3, 6, 9, 12, 15],
      segments: usable,
      tracks: TRACKS.map((track) => ({
        id: track.id,
        label: track.label,
        beats: usable.map((segment) => ({
          start: segment.start,
          end: segment.end,
          label: phraseForTrack(segment.text, track)
        }))
      }))
    };
  }

  function requiresBlockingMap(item) {
    const text = [item?.name, item?.core, item?.analysis, item?.camera, item?.blocking].filter(Boolean).join(" ");
    const signals = ["三层", "多人", "地标", "轴线", "队列", "环绕", "升高", "降低", "横移", "路线", "前景", "中景", "背景"];
    return signals.filter((signal) => text.includes(signal)).length >= 2;
  }

  function buildBlockingMapModel(model) {
    const segments = model?.segments || [];
    const chosen = segments.length >= 3
      ? [segments[0], segments[Math.floor((segments.length - 1) / 2)], segments[segments.length - 1]]
      : fallbackSegments({ name: "连续空间调度" });
    return {
      points: chosen.map((segment, index) => ({
        id: ["A", "B", "C"][index],
        time: index === 2 ? segment.end : segment.start,
        label: clean(segment.text)
      }))
    };
  }

  return { extractTimelineSegments, buildCameraTimelineModel, requiresBlockingMap, buildBlockingMapModel };
});
```

- [ ] **Step 4: Run the tests and verify GREEN.**

Run:

```bash
NODE="/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
"$NODE" prompt-generator.test.js
"$NODE" --check camera-timeline.js
```

Expected: all tests PASS and syntax check exits `0`.

- [ ] **Step 5: Commit the pure model.**

```bash
git add camera-timeline.js prompt-generator.test.js
git commit -m "feat: add camera timeline model"
```

---

### Task 3: Recompose The Camera DOM Around The Monitor And Timeline

**Files:**
- Modify: `index.html:8-11`
- Modify: `index.html:840-933`
- Test: `prompt-generator.test.js`

**Interfaces:**
- Consumes: existing camera field IDs and Task 2's `window.aigcCameraTimeline` API.
- Produces: three named regions (`library`, `stage`, `composer`) and DOM targets consumed by `camera-app.js`.

- [ ] **Step 1: Link the camera-only stylesheet after the selected tone stylesheet.**

The head order must become:

```html
<link rel="stylesheet" href="style.css?v=20260714-cinematic-console">
<link rel="stylesheet" href="look-studio.css?v=20260714-dense-workbench">
<link rel="stylesheet" href="tone-option2.css?v=20260714-tone-library-fit">
<link rel="stylesheet" href="camera-option-a.css?v=20260715-director-timeline">
```

- [ ] **Step 2: Insert the stage between the existing library and composer.**

Keep the current library controls and all current composer fields, but use this exact stage structure:

```html
<section id="camera-stage" class="camera-stage" aria-label="15秒镜头监看与时间轴">
  <header class="camera-stage-toolbar">
    <div id="camera-selection" class="camera-selection empty-selection">尚未选择运镜案例</div>
    <div class="camera-stage-actions">
      <button id="camera-blocking-toggle" type="button" class="button secondary" aria-expanded="false" aria-controls="camera-blocking-map" hidden>
        <i data-lucide="route" aria-hidden="true"></i>调度地图
      </button>
      <button id="camera-save-version" type="button" class="button secondary">
        <i data-lucide="bookmark-plus" aria-hidden="true"></i>保存版本
      </button>
    </div>
  </header>

  <figure id="camera-monitor" class="camera-monitor">
    <img id="camera-monitor-image" src="assets/tone-option2-hero.png" alt="当前15秒运镜电影监看画面">
    <figcaption>
      <span id="camera-monitor-id">SHOT -- · PRIMARY CAMERA</span>
      <span>65MM · 2.39:1</span>
    </figcaption>
  </figure>

  <section class="camera-timeline-panel" aria-labelledby="camera-timeline-title">
    <header>
      <div><span>15 SECOND SHOT</span><h2 id="camera-timeline-title">0–15秒镜头节奏</h2></div>
      <small>连续长镜头 · 无剪切</small>
    </header>
    <div id="camera-timeline" class="camera-timeline" aria-live="polite"></div>
  </section>

  <section id="camera-blocking-map" class="camera-blocking-map" aria-label="高级调度地图" hidden></section>
</section>
```

Remove the old duplicate `#camera-selection` from `.camera-composer` so every ID remains unique.

- [ ] **Step 3: Reorder the composer without renaming business IDs.**

Use this wrapper order inside `.camera-composer`:

```html
<header class="camera-composer-head">
  <div><h1>镜头生成器</h1><p>角色、场景、表演与镜头规则</p></div>
  <div class="segmented" aria-label="生成方式">
    <button type="button" class="segment active" data-camera-mode="quick">快速复刻</button>
    <button type="button" class="segment" data-camera-mode="formal">正式结构</button>
  </div>
</header>

<div class="camera-composer-scroll">
  <p id="camera-validation" class="validation-message"></p>
  <label class="field camera-output-field">
    <span>完整提示词</span>
    <textarea id="camera-output" rows="16" spellcheck="false"></textarea>
  </label>
</div>

<footer class="camera-toolbar">
  <button id="camera-clear" type="button" class="button secondary">清空</button>
  <button id="camera-copy" type="button" class="button primary">复制完整提示词</button>
</footer>
```

Before `#camera-validation`, move the current `index.html:880-909` `.camera-form-grid` block verbatim. This retains the complete `#camera-character` through `#camera-ending` markup, labels, placeholders, values, and `field-span-2` class without introducing duplicate IDs.

- [ ] **Step 4: Load the timeline module before the camera controller.**

The bottom script order must include:

```html
<script src="camera-data.js"></script>
<script src="camera-timeline.js?v=20260715-director-timeline"></script>
<script src="app.js?v=20260714-reference-images"></script>
<script src="look-studio.js?v=20260714-selected-option2"></script>
<script src="camera-app.js?v=20260715-director-timeline"></script>
```

- [ ] **Step 5: Run the contract tests.**

Run:

```bash
NODE="/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
"$NODE" prompt-generator.test.js
```

Expected: timeline-module tests PASS; the selected-camera CSS assertions still FAIL because Task 5 has not created the stylesheet.

- [ ] **Step 6: Commit the DOM composition.**

```bash
git add index.html prompt-generator.test.js
git commit -m "feat: add camera monitor and timeline stage"
```

---

### Task 4: Wire Timeline, Monitor, Blocking Map, And Versions

**Files:**
- Modify: `camera-app.js`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: `window.aigcCameraTimeline`, new Task 3 DOM IDs, current `cameraPromptData`, and current workspace transfer API.
- Produces: synchronized stage rendering, optional blocking map, version snapshots in camera export/import state, and unchanged prompt/copy validation behavior.

- [ ] **Step 1: Add failing controller-contract tests.**

Add:

```js
runTest("camera controller synchronizes monitor timeline map and versions", () => {
  const source = fs.readFileSync("camera-app.js", "utf8");
  [
    "buildCameraTimelineModel",
    "buildBlockingMapModel",
    "requiresBlockingMap",
    "renderCameraStage",
    "renderCameraTimeline",
    "renderBlockingMap",
    "camera-save-version",
    "versions"
  ].forEach((contract) => assert(source.includes(contract), `missing ${contract}`));
  assert(source.includes("aigcCameraWorkbench"));
  assert(source.includes("receiveTone(prompt)"));
  assert(source.includes("receiveCharacter(summary)"));
});
```

Run the Node suite and verify it fails on `renderCameraStage`.

- [ ] **Step 2: Extend state and DOM references without creating a second store.**

At initialization, read the timeline API and add state:

```js
const timelineApi = root.aigcCameraTimeline;
if (!root.document || !data || !timelineApi) return;

const state = {
  workspace: "tone",
  source: "cases",
  mode: "quick",
  group: "all",
  query: "",
  selected: null,
  copied: false,
  blockingOpen: false,
  versions: []
};
```

Add these references to `elements`:

```js
stage: document.querySelector("#camera-stage"),
monitor: document.querySelector("#camera-monitor"),
monitorImage: document.querySelector("#camera-monitor-image"),
monitorId: document.querySelector("#camera-monitor-id"),
timeline: document.querySelector("#camera-timeline"),
blockingToggle: document.querySelector("#camera-blocking-toggle"),
blockingMap: document.querySelector("#camera-blocking-map"),
saveVersion: document.querySelector("#camera-save-version")
```

Destructure the pure functions once:

```js
const { buildCameraTimelineModel, requiresBlockingMap, buildBlockingMapModel } = timelineApi;
```

- [ ] **Step 3: Render compact result rows with existing local images.**

Add:

```js
const cameraImages = [
  "assets/tone-option2-reference-1.png",
  "assets/tone-option2-reference-2.png",
  "assets/tone-option2-reference-3.png"
];

function cameraImage(item) {
  const index = Math.max(0, Number(String(item?.number || "1").replace(/\D/g, "")) - 1);
  return cameraImages[index % cameraImages.length];
}
```

In `renderResults()`, keep the existing keyboard/click behavior and render each item as:

```js
card.innerHTML = `
  <img class="camera-card-image" src="${cameraImage(item)}" alt="">
  <div class="camera-card-copy">
    <div class="camera-card-top">
      <span class="result-id">${escapeHtml(item.id)}</span>
      <span class="camera-card-action">载入</span>
    </div>
    <h2>${escapeHtml(itemTitle(item))}</h2>
    <p class="camera-card-meta">${escapeHtml(meta)}</p>
    <p class="camera-card-method">${escapeHtml(method)}</p>
  </div>
`;
```

Do not render the old full `summary` paragraph; the selected row must stay compact and the detailed explanation remains available in the timeline and prompt.

- [ ] **Step 4: Implement stage rendering.**

Add these functions:

```js
function renderCameraTimeline(model) {
  const markers = model.markers.map((marker) => `<span>${String(marker).padStart(2, "0")}</span>`).join("");
  const tracks = model.tracks.map((track) => `
    <div class="camera-track" data-track="${track.id}">
      <strong>${escapeHtml(track.label)}</strong>
      <div class="camera-track-lane">
        ${track.beats.map((beat) => `
          <span class="camera-beat" style="--beat-start:${beat.start};--beat-end:${beat.end}">
            ${escapeHtml(beat.label)}
          </span>
        `).join("")}
      </div>
    </div>
  `).join("");
  elements.timeline.innerHTML = `<div class="camera-ruler"><i></i>${markers}</div>${tracks}`;
}

function renderBlockingMap(model) {
  const map = buildBlockingMapModel(model);
  elements.blockingMap.innerHTML = `
    <header><strong>空间调度路径</strong><small>起点 → 转折 → 落点</small></header>
    <div class="camera-map-points">
      ${map.points.map((point) => `
        <article><b>${point.id}</b><span>${point.time}s</span><p>${escapeHtml(point.label)}</p></article>
      `).join("")}
    </div>
  `;
}

function renderCameraStage() {
  const item = state.selected;
  elements.selection.classList.toggle("empty-selection", !item);
  elements.selection.innerHTML = item
    ? `<span>当前运镜</span><strong>${escapeHtml(itemTitle(item))}</strong><small>${escapeHtml(item.source === "cases" ? item.group : (item.references || []).join(" / "))}</small>`
    : "尚未选择运镜案例";
  elements.monitorId.textContent = item ? `${item.id} · PRIMARY CAMERA` : "SHOT -- · PRIMARY CAMERA";
  elements.monitorImage.src = item ? cameraImage(item) : "assets/tone-option2-hero.png";
  elements.monitorImage.alt = item ? `${itemTitle(item)}运镜参考画面` : "当前15秒运镜电影监看画面";

  const model = buildCameraTimelineModel(item);
  renderCameraTimeline(model);
  const supportsMap = Boolean(item && requiresBlockingMap(item));
  elements.blockingToggle.hidden = !supportsMap;
  if (!supportsMap) state.blockingOpen = false;
  elements.blockingToggle.setAttribute("aria-expanded", String(state.blockingOpen));
  elements.blockingMap.hidden = !supportsMap || !state.blockingOpen;
  if (supportsMap) renderBlockingMap(model);
  elements.saveVersion.textContent = state.versions.length ? `保存版本 V${state.versions.length + 1}` : "保存版本";
}
```

Call `renderCameraStage()` from `renderComposer()`, after case selection, after source changes, after clearing, and after import.

- [ ] **Step 5: Add map and version actions.**

```js
elements.blockingToggle.addEventListener("click", () => {
  state.blockingOpen = !state.blockingOpen;
  renderCameraStage();
});

elements.saveVersion.addEventListener("click", () => {
  state.versions.push({
    number: state.versions.length + 1,
    createdAt: new Date().toISOString(),
    selected: state.selected ? { source: state.selected.source, id: state.selected.id } : null,
    prompt: currentPrompt()
  });
  renderCameraStage();
});
```

Add `versions: state.versions` and `blockingOpen: state.blockingOpen` to `exportState()`. In `importState(saved)`, restore with:

```js
state.versions = Array.isArray(saved.versions) ? saved.versions.slice(-20) : [];
state.blockingOpen = Boolean(saved.blockingOpen);
```

The 20-version bound prevents unbounded local project growth.

- [ ] **Step 6: Run controller and regression tests.**

Run:

```bash
NODE="/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
"$NODE" prompt-generator.test.js
"$NODE" --check camera-app.js
```

Expected: all tests PASS except the Task 1 stylesheet contract, which remains RED until Task 5.

- [ ] **Step 7: Commit controller integration.**

```bash
git add camera-app.js prompt-generator.test.js
git commit -m "feat: synchronize camera stage and prompt state"
```

---

### Task 5: Implement The Selected Camera-Only Visual System

**Files:**
- Create: `camera-option-a.css`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: Task 3 DOM, existing tone-option-2 tokens and assets, and Task 4 render classes.
- Produces: the selected three-column desktop layout, compact list, cinematic stage, three-track timeline, fixed inspector, advanced map, and responsive stacks.

- [ ] **Step 1: Create scoped tokens and the exact desktop grid.**

Start `camera-option-a.css` with:

```css
#camera-workspace.camera-shell {
  --camera-paper: #f3f2ed;
  --camera-panel: #ffffff;
  --camera-ink: #151916;
  --camera-muted: #6f7772;
  --camera-line: #d8d9d4;
  --camera-petrol: #0d645a;
  --camera-petrol-soft: #e7f0ed;
  --camera-amber: #c38a2b;
  --camera-cinema: #101513;
  --camera-cinema-line: #2b342f;
  display: grid;
  grid-template-columns: 270px minmax(0, 1fr) 360px;
  grid-template-areas: "library stage composer";
  gap: 0;
  width: 100%;
  height: calc(100vh - var(--studio-header-height, 66px));
  min-height: 0;
  padding: 12px;
  overflow: hidden;
  color: var(--camera-ink);
  background: var(--camera-paper);
}

#camera-workspace .camera-library { grid-area: library; }
#camera-workspace .camera-stage { grid-area: stage; }
#camera-workspace .camera-composer { grid-area: composer; }
```

All remaining selectors in the file must begin with `#camera-workspace` or `body[data-active-workspace="camera"]`.

- [ ] **Step 2: Style the compact library and selected row.**

Implement these layout contracts:

```css
#camera-workspace .camera-library {
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--camera-line);
  border-right: 0;
  background: var(--camera-panel);
}

#camera-workspace .camera-results {
  display: grid;
  align-content: start;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
}

#camera-workspace .camera-card {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 10px;
  min-height: 82px;
  padding: 10px 12px;
  border: 0;
  border-bottom: 1px solid #e6e7e3;
  border-radius: 0;
  background: #fff;
}

#camera-workspace .camera-card.picked {
  box-shadow: inset 3px 0 var(--camera-petrol);
  background: #f1f7f5;
}

#camera-workspace .camera-card-image {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 3px;
}
```

Clamp the title to two lines and the method to one line. Do not reveal full case paragraphs in the list.

```css
#camera-workspace .camera-card h2 {
  display: -webkit-box;
  overflow: hidden;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

#camera-workspace .camera-card-method {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- [ ] **Step 3: Style the monitor and timeline as the main hierarchy.**

```css
#camera-workspace .camera-stage {
  display: grid;
  grid-template-rows: 56px minmax(0, 1fr) 250px auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  color: #dce1de;
  background: var(--camera-cinema);
}

#camera-workspace .camera-monitor {
  position: relative;
  min-height: 0;
  margin: 0;
  overflow: hidden;
  background: #0b0e0c;
}

#camera-workspace .camera-monitor img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

#camera-workspace .camera-timeline-panel {
  min-height: 0;
  padding: 12px 14px 14px;
  border-top: 1px solid var(--camera-cinema-line);
  background: var(--camera-cinema);
}

#camera-workspace .camera-track {
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr);
  align-items: center;
  min-height: 40px;
  border-top: 1px solid var(--camera-cinema-line);
}

#camera-workspace .camera-track-lane {
  display: grid;
  grid-template-columns: repeat(15, minmax(0, 1fr));
  min-width: 0;
}

#camera-workspace .camera-beat {
  grid-column: calc(var(--beat-start) + 1) / calc(var(--beat-end) + 1);
  min-width: 0;
  margin: 3px 2px;
  padding: 6px 7px;
  overflow: hidden;
  border-radius: 3px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

Give the three tracks distinct restrained colors while retaining visible text labels: performance muted petrol, camera graphite blue-gray, scene amber-brown.

```css
#camera-workspace [data-track="performance"] .camera-beat { background: #2f675f; }
#camera-workspace [data-track="camera"] .camera-beat { background: #4b5d64; }
#camera-workspace [data-track="scene"] .camera-beat { background: #84612f; }
```

- [ ] **Step 4: Style the inspector and blocking map.**

The composer must use a fixed head, scrollable body, and fixed footer:

```css
#camera-workspace .camera-composer {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--camera-line);
  background: #fff;
}

#camera-workspace .camera-composer-scroll {
  min-height: 0;
  overflow: auto;
  padding: 12px;
}

#camera-workspace .camera-toolbar {
  display: grid;
  grid-template-columns: minmax(96px, .75fr) minmax(180px, 1.25fr);
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--camera-line);
}

#camera-workspace .camera-blocking-map {
  max-height: 190px;
  overflow: auto;
  padding: 12px 14px;
  border-top: 1px solid var(--camera-cinema-line);
  color: #dce1de;
  background: #151b18;
}

#camera-workspace .camera-map-points {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
```

- [ ] **Step 5: Add exact responsive behavior.**

```css
@media (max-width: 1280px) and (min-width: 1025px) {
  #camera-workspace.camera-shell {
    grid-template-columns: 240px minmax(0, 1fr) 330px;
  }
}

@media (max-width: 1024px) {
  #camera-workspace.camera-shell {
    grid-template-columns: 1fr;
    grid-template-areas: "stage" "library" "composer";
    height: auto;
    min-height: 100vh;
    overflow: visible;
  }
  #camera-workspace .camera-stage { min-height: 720px; }
  #camera-workspace .camera-library { min-height: 620px; }
  #camera-workspace .camera-composer { min-height: 820px; }
}

@media (max-width: 560px) {
  #camera-workspace.camera-shell { padding: 8px; }
  #camera-workspace .camera-stage { grid-template-rows: auto 230px auto auto; }
  #camera-workspace .camera-map-points { grid-template-columns: 1fr; }
  #camera-workspace .camera-toolbar { grid-template-columns: 1fr; }
  #camera-workspace .camera-card { grid-template-columns: 48px minmax(0, 1fr); }
  #camera-workspace .camera-card-image { width: 48px; height: 48px; }
}

@media (max-height: 800px) and (min-width: 1025px) {
  #camera-workspace .camera-stage { grid-template-rows: 50px minmax(0, 1fr) 220px auto; }
  #camera-workspace .camera-card { min-height: 72px; padding-block: 7px; }
}
```

- [ ] **Step 6: Run all static tests and inspect CSS scope.**

Run:

```bash
NODE="/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
"$NODE" prompt-generator.test.js
"$NODE" --check camera-app.js
"$NODE" --check camera-timeline.js
git diff --check
rg -n '^([^@#]|#[^c]|#c[^a]|#ca[^m]|#cam[^e]|#came[^r]|#camer[^a])' camera-option-a.css
```

Expected: all tests PASS, syntax checks exit `0`, `git diff --check` is clean, and the scope scan produces no unscoped production selector except `@media` lines.

- [ ] **Step 7: Commit the selected visual implementation.**

```bash
git add camera-option-a.css prompt-generator.test.js
git commit -m "feat: style director timeline camera workspace"
```

---

### Task 6: Browser Flow, Responsive, And Same-Viewport Design QA

**Files:**
- Create: `design-qa-camera.md`
- Create: `.audit-20260715-camera-option-a/source-1440x1024.png`
- Create: `.audit-20260715-camera-option-a/implementation-1440x1024.png`
- Create: `.audit-20260715-camera-option-a/comparison-1440x1024.png`
- Create: `.audit-20260715-camera-option-a/implementation-1440x768.png`
- Create: `.audit-20260715-camera-option-a/implementation-390x844.png`
- Modify only to resolve a named P0/P1/P2 comparison finding: `camera-option-a.css`, `camera-app.js`, `index.html`

**Interfaces:**
- Consumes: the fixed Task 1 source visual and completed Tasks 2–5.
- Produces: browser-verified workflows, responsive evidence, same-viewport comparison, and a blocking visual QA decision.

- [ ] **Step 1: Verify the persistent server before browser work.**

```bash
curl -sS -o /dev/null -w 'HTTP %{http_code}\n' 'http://127.0.0.1:8766/index.html?fresh=camera-option-a'
```

Expected: `HTTP 200`. If not, inspect the existing LaunchAgent before starting another temporary server.

- [ ] **Step 2: Verify the complete camera workflow at `1440 x 1024`.**

Use the authorized Playwright CLI to:

1. Open the local page and activate `15秒运镜`.
2. Search `教父` and select C05.
3. Confirm three timeline tracks, markers `00/03/06/09/12/15`, and one selected library item.
4. Fill role, scene, performance, and action fields.
5. Confirm validation becomes ready and `复制完整提示词` becomes enabled.
6. Switch to `正式结构` and confirm the result contains `【13 限定负面】`.
7. Save a version and confirm the next label is `保存版本 V2`.
8. Select a spatially complex case such as C07, expand the blocking map, and confirm A/B/C points appear.
9. Search a missing term, confirm the no-results message, then clear search and confirm the selected case and user fields are still present.
10. Switch through all five workspaces and return to camera without losing state.

- [ ] **Step 3: Capture desktop, short desktop, and mobile evidence.**

At each viewport, assert `document.documentElement.scrollWidth <= innerWidth`, take a screenshot, and verify no text or action overlaps:

- `1440 x 1024`
- `1440 x 768`
- `1280 x 900`
- `1024 x 900`
- `390 x 844`

- [ ] **Step 4: Create the required side-by-side comparison.**

Place `design-references/camera-option-a.png` and the real `1440 x 1024` implementation screenshot in one comparison canvas. Review the combined image for:

- shared-header height and active tab;
- `270 / flexible / 360` column balance;
- monitor crop and inspectability;
- timeline hierarchy and track legibility;
- compact list density and selected state;
- inspector field density and fixed primary action;
- borders, radii, typography, spacing, and residual legacy styles.

Fix visible P0/P1/P2 mismatches, recapture, and compare again. Do not use unit-test success as a substitute for visual matching.

- [ ] **Step 5: Record `design-qa-camera.md`.**

Use this exact result structure:

```markdown
# Design QA: Camera Option A

- Visual truth: `design-references/camera-option-a.png`
- Implementation URL: `http://127.0.0.1:8766/index.html?fresh=camera-option-a`
- Compared viewport: `1440 x 1024`

## Evidence

- Source: `.audit-20260715-camera-option-a/source-1440x1024.png`
- Implementation: `.audit-20260715-camera-option-a/implementation-1440x1024.png`
- Side by side: `.audit-20260715-camera-option-a/comparison-1440x1024.png`
- Short desktop: `.audit-20260715-camera-option-a/implementation-1440x768.png`
- Mobile: `.audit-20260715-camera-option-a/implementation-390x844.png`

## Functional Verification

- Case search, filters, single selection, three-track timeline, formal prompt, validation, copying, versions, blocking map, transfers, persistence, and five-workspace switching: passed.
- Browser console: `0` errors and `0` warnings.

## Visual Findings

- No P0/P1/P2 mismatch remains.

final result: passed
```

If any P0/P1/P2 issue remains, replace the final line with `final result: blocked` and name the blocker.

- [ ] **Step 6: Run the final verification gate.**

```bash
set -e
NODE="/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
"$NODE" prompt-generator.test.js
"$NODE" --check camera-app.js
"$NODE" --check camera-timeline.js
git diff --check
curl -sS -o /dev/null -w 'HTTP %{http_code}\n' 'http://127.0.0.1:8766/index.html?fresh=camera-option-a'
rg -n 'final result: passed' design-qa-camera.md
```

Expected: test suite PASS, syntax checks exit `0`, diff check clean, deployed page `HTTP 200`, and QA result present.

- [ ] **Step 7: Commit verified QA evidence.**

```bash
git add index.html camera-app.js camera-timeline.js camera-option-a.css prompt-generator.test.js design-qa-camera.md design-references/camera-option-a.png .audit-20260715-camera-option-a
git commit -m "test: verify director timeline camera workspace"
```
