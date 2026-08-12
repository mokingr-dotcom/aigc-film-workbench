# AI Poster Title Mark Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 24-template AI movie title-mark prompt library to the existing poster workspace without replacing composition templates or the 16 basic typography templates.

**Architecture:** A new UMD data module owns the title-mark catalog, option dictionaries, filtering, and saved-state normalization. `poster-app.js` consumes that module and keeps the current three-column workbench, adding a third library view, a safe illustrative title-mark preview, a dedicated prompt composer, and backwards-compatible project persistence. Existing poster composition and basic-title behavior remain unchanged.

**Tech Stack:** Static HTML, vanilla JavaScript UMD modules, CSS, Node.js assertion tests in `prompt-generator.test.js`, local in-app browser QA.

## Global Constraints

- Keep the existing `composition` and `title` library modes and add `title-mark` as a third mode.
- Ship exactly 24 title-mark templates in six categories with four templates per category.
- Do not add remote fonts, remote images, build tools, frameworks, or image-generation APIs.
- Do not copy the Douyin authors' prompt collections verbatim or imitate a protected movie logo.
- Generated title-mark prompts must not contain reference-film names.
- Render all user-entered title text as escaped text; never inject it as executable HTML.
- Preserve all existing poster IDs, project import/export fields, composition templates, and basic typography behavior.
- At desktop widths, keep the left rail at least 280 pixels and the right rail at least 420 pixels.
- Verify 1440×1024, 1280×900, 1024×900, and 390×844 before delivery.

---

### Task 1: Title-Mark Catalog and State Normalization

**Files:**
- Create: `poster-title-mark-data.js`
- Modify: `prompt-generator.test.js:80-100`
- Modify: `prompt-generator.test.js:1737-1775`

**Interfaces:**
- Produces: `window.aigcPosterTitleMarkData` and CommonJS exports.
- Produces: `TITLE_MARK_CATEGORIES`, `TITLE_MARK_SKELETONS`, `TITLE_MARK_METHODS`, `TITLE_MARK_MATERIALS`, `TITLE_MARK_LIGHTING`, `TITLE_MARK_BACKGROUNDS`, `TITLE_MARK_OUTPUT_MODES`, `TITLE_MARK_TEMPLATES`, `DEFAULT_TITLE_MARK_TEMPLATE_ID`.
- Produces: `getTitleMarkTemplate(id)`, `filterTitleMarkTemplates({category})`, and `normalizePosterTitleMarkState(saved)`.
- Consumes: no existing runtime module.

- [ ] **Step 1: Write failing catalog tests**

Add the CommonJS import and tests:

```js
const {
  TITLE_MARK_CATEGORIES,
  TITLE_MARK_TEMPLATES,
  DEFAULT_TITLE_MARK_TEMPLATE_ID,
  filterTitleMarkTemplates,
  normalizePosterTitleMarkState
} = require("./poster-title-mark-data.js");

runTest("poster title-mark catalog defines twenty-four complete film systems", () => {
  assert.equal(TITLE_MARK_TEMPLATES.length, 24);
  assert.equal(Object.keys(TITLE_MARK_CATEGORIES).length, 6);
  Object.keys(TITLE_MARK_CATEGORIES).forEach((category) => {
    assert.equal(TITLE_MARK_TEMPLATES.filter((item) => item.category === category).length, 4);
  });
  TITLE_MARK_TEMPLATES.forEach((item) => {
    ["id", "label", "sampleTitle", "skeleton", "metaphorRule", "material", "lighting", "hierarchyRule", "background", "promptRule", "negativeRule", "previewClass"].forEach((key) => assert(item[key]));
    assert(Array.isArray(item.methods) && item.methods.length >= 1 && item.methods.length <= 3);
  });
});

runTest("poster title-mark filters and saved state stay bounded", () => {
  const before = JSON.stringify(TITLE_MARK_TEMPLATES);
  assert.equal(filterTitleMarkTemplates({ category: "eastern" }).length, 4);
  assert.equal(JSON.stringify(TITLE_MARK_TEMPLATES), before);
  const normalized = normalizePosterTitleMarkState({
    titleMarkTemplate: "missing",
    titleMarkMethods: ["shared-stroke", "long-stroke", "cut", "negative-space"],
    titleMarkBackground: "missing"
  });
  assert.equal(normalized.titleMarkTemplate, DEFAULT_TITLE_MARK_TEMPLATE_ID);
  assert.equal(normalized.titleMarkMethods.length, 3);
  assert.equal(normalized.titleMarkBackground, "black");
});
```

- [ ] **Step 2: Run the tests and verify red**

Run:

```bash
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node prompt-generator.test.js
```

Expected: FAIL because `poster-title-mark-data.js` does not exist.

- [ ] **Step 3: Implement the data module**

Use the established UMD shape:

```js
(function initPosterTitleMarkData(root) {
  const TITLE_MARK_CATEGORIES = {
    eastern: "东方叙事", crime: "悬疑犯罪", scifi: "科幻未来",
    period: "史诗年代", literary: "文艺作者", fantasy: "奇幻动画"
  };
  const TITLE_MARK_SKELETONS = {
    serif: { label: "创意衬线", rule: "以可读中文衬线骨架重新设计字面，横竖粗细关系明确" },
    sans: { label: "粗黑", rule: "使用稳定粗黑骨架，字腔完整，缩小后仍清楚" },
    handwritten: { label: "手写", rule: "保留真实书写方向、笔压、连笔和停顿" },
    stone: { label: "碑刻", rule: "使用低重心碑刻骨架和清楚刀刻转折" },
    geometric: { label: "几何", rule: "使用精确几何结构和受控切角，不做随机断笔" }
  };
  const TITLE_MARK_METHODS = {
    "shared-stroke": { label: "笔画共用", rule: "只让相邻汉字共用一处非关键笔画" },
    "long-stroke": { label: "长线穿插", rule: "延展一处横画或收笔形成统一视觉动线" },
    cut: { label: "局部断笔", rule: "仅在不影响识别的位置加入逻辑断笔" },
    "negative-space": { label: "负形嵌图", rule: "把一个剧情意象嵌入字腔或留白" },
    ligature: { label: "连笔拖尾", rule: "用一处自然连笔或拖尾连接文字节奏" },
    offset: { label: "错位切割", rule: "局部错位必须服从统一轴线并保持完整字形" }
  };
```

Define the 24 stable IDs in this exact category order:

```js
const templateManifest = {
  eastern: ["eastern-cold-serif", "eastern-cursive", "eastern-stone-epic", "eastern-seal-symbol"],
  crime: ["crime-cut-sans", "crime-archive-type", "crime-psychological-rift", "crime-neon-night"],
  scifi: ["scifi-geometric-metal", "scifi-horizon-wide", "scifi-broken-future", "scifi-deep-glow"],
  period: ["period-dark-gold", "period-war-stamp", "period-cinema-sign", "period-newspaper-print"],
  literary: ["literary-life-hand", "literary-auteur-serif", "literary-poetic-line", "literary-negative-minimal"],
  fantasy: ["fantasy-starlight-serif", "fantasy-eastern-myth", "fantasy-handdrawn-rhythm", "fantasy-organic-texture"]
};
```

Each concrete record must contain the fields asserted above plus `genreHints` and an `englishRule`. Implement bounded helpers:

```js
function getTitleMarkTemplate(id) {
  return TITLE_MARK_TEMPLATES.find((item) => item.id === id) || null;
}

function filterTitleMarkTemplates({ category = "all" } = {}) {
  return TITLE_MARK_TEMPLATES.filter((item) => category === "all" || item.category === category);
}

function normalizePosterTitleMarkState(saved = {}) {
  const template = getTitleMarkTemplate(saved.titleMarkTemplate) || getTitleMarkTemplate(DEFAULT_TITLE_MARK_TEMPLATE_ID);
  const methods = [...new Set(Array.isArray(saved.titleMarkMethods) ? saved.titleMarkMethods : template.methods)]
    .filter((id) => TITLE_MARK_METHODS[id])
    .slice(-3);
  return {
    titleMarkCategory: TITLE_MARK_CATEGORIES[saved.titleMarkCategory] ? saved.titleMarkCategory : "all",
    titleMarkTemplate: template.id,
    titleMarkMethods: methods.length ? methods : template.methods.slice(0, 3),
    titleMarkSkeleton: TITLE_MARK_SKELETONS[saved.titleMarkSkeleton] ? saved.titleMarkSkeleton : template.skeleton,
    titleMarkMaterial: TITLE_MARK_MATERIALS[saved.titleMarkMaterial] ? saved.titleMarkMaterial : template.material,
    titleMarkLighting: TITLE_MARK_LIGHTING[saved.titleMarkLighting] ? saved.titleMarkLighting : template.lighting,
    titleMarkBackground: TITLE_MARK_BACKGROUNDS[saved.titleMarkBackground] ? saved.titleMarkBackground : template.background,
    titleMarkOutputMode: TITLE_MARK_OUTPUT_MODES[saved.titleMarkOutputMode] ? saved.titleMarkOutputMode : "asset",
    titleMarkMetaphor: typeof saved.titleMarkMetaphor === "string" ? saved.titleMarkMetaphor : ""
  };
}
```

- [ ] **Step 4: Run syntax and catalog tests**

Run:

```bash
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --check poster-title-mark-data.js
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node prompt-generator.test.js
```

Expected: syntax exit 0 and every test reports `PASS`.

- [ ] **Step 5: Commit the catalog**

```bash
git add poster-title-mark-data.js prompt-generator.test.js
git commit -m "feat: add movie title-mark template catalog"
```

---

### Task 2: Three-Mode Library UI and Responsive Cards

**Files:**
- Modify: `index.html:510-575`
- Modify: `index.html:700-746`
- Modify: `index.html:1110-1116`
- Modify: `poster-three-column.css:60-220`
- Modify: `poster-three-column.css:897-947`
- Modify: `poster-three-column.css:1033-1211`
- Modify: `prompt-generator.test.js:1648-1710`

**Interfaces:**
- Consumes: the global `aigcPosterTitleMarkData` module from Task 1.
- Produces DOM IDs: `poster-title-mark-library`, `poster-title-mark-filters`, `poster-title-mark-template-list`, `poster-title-mark-category`, `poster-title-mark-skeleton`, `poster-title-mark-methods`, `poster-title-mark-metaphor`, `poster-title-mark-material`, `poster-title-mark-lighting`, `poster-title-mark-background`, `poster-title-mark-output-mode`, `poster-title-mark-summary`, `poster-title-mark-warning`.
- Preserves every pre-existing poster DOM ID.

- [ ] **Step 1: Write failing markup and stylesheet contract tests**

```js
runTest("poster workspace exposes a dedicated AI title-mark mode", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const css = fs.readFileSync("poster-three-column.css", "utf8");
  [
    'data-poster-library-view="title-mark"', 'id="poster-title-mark-library"',
    'id="poster-title-mark-template-list"', 'id="poster-title-mark-methods"',
    'id="poster-title-mark-metaphor"', 'id="poster-title-mark-output-mode"',
    'src="poster-title-mark-data.js'
  ].forEach((token) => assert(html.includes(token), token));
  [
    ".poster-title-mark-template-card", ".poster-title-mark-sample",
    ".poster-title-mark-template-card:focus-visible", ".poster-title-mark-methods",
    "grid-template-columns: repeat(3, minmax(0, 1fr))"
  ].forEach((token) => assert(css.includes(token), token));
});
```

- [ ] **Step 2: Run the test and verify red**

Expected: FAIL for missing title-mark DOM and CSS tokens.

- [ ] **Step 3: Add the third library tab and pane**

Change the switch to three equal columns and append:

```html
<button type="button" data-poster-library-view="title-mark" role="tab" aria-selected="false" aria-controls="poster-title-mark-library">AI片名字标</button>
```

Add a hidden pane with category buttons and an accessible listbox:

```html
<div id="poster-title-mark-library" class="poster-library-pane poster-title-mark-library" role="tabpanel" hidden>
  <div id="poster-title-mark-filters" class="poster-title-mark-filters" role="group" aria-label="片名字标类型">
    <button type="button" data-poster-title-mark-category="all" aria-pressed="true">全部</button>
    <button type="button" data-poster-title-mark-category="eastern" aria-pressed="false">东方</button>
    <button type="button" data-poster-title-mark-category="crime" aria-pressed="false">悬疑</button>
    <button type="button" data-poster-title-mark-category="scifi" aria-pressed="false">科幻</button>
    <button type="button" data-poster-title-mark-category="period" aria-pressed="false">年代</button>
    <button type="button" data-poster-title-mark-category="literary" aria-pressed="false">文艺</button>
    <button type="button" data-poster-title-mark-category="fantasy" aria-pressed="false">奇幻动画</button>
  </div>
  <div id="poster-title-mark-template-list" class="poster-title-mark-template-list" role="listbox" aria-label="AI片名字标模板"></div>
</div>
```

Add one parameter group named `AI片名字标设计` containing the IDs in the interface section. Use native `select`, `input`, and button controls; make `poster-title-mark-methods` a `role="group"` container populated by JavaScript.

Load `poster-title-mark-data.js` after `poster-title-template-data.js` and before `poster-app.js`.

- [ ] **Step 4: Add visual and responsive rules**

Use the confirmed visual hierarchy:

```css
.poster-library-view-switch { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.poster-title-mark-library { grid-template-rows: auto minmax(0, 1fr); }
.poster-title-mark-template-list { display:grid;align-content:start;gap:8px;min-height:0;padding:10px;overflow-y:auto; }
.poster-title-mark-template-card { display:grid;gap:7px;width:100%;min-height:146px;padding:8px;border:1px solid var(--poster-line);background:var(--poster-surface-raised);text-align:left;cursor:pointer; }
.poster-title-mark-template-card[aria-selected="true"] { border-color:var(--poster-warm);box-shadow:inset 3px 0 0 var(--poster-warm); }
.poster-title-mark-sample { display:flex;align-items:center;justify-content:center;min-height:68px;overflow:hidden;background:#1c211e;color:#f4efe3;font-size:20px;font-weight:800; }
.poster-title-mark-methods { display:flex;flex-wrap:wrap;gap:5px; }
```

At `max-width:1180px`, make title-mark cards a three-column grid. At `max-width:820px`, convert them to a horizontal rail with `flex: 0 0 272px` and `scroll-snap-align:start`.

- [ ] **Step 5: Run tests and commit**

Run the complete test suite and `git diff --check`, then:

```bash
git add index.html poster-three-column.css prompt-generator.test.js
git commit -m "feat: add title-mark workbench interface"
```

---

### Task 3: Controller, Safe Preview, and Bounded Selection

**Files:**
- Modify: `poster-app.js:1-18`
- Modify: `poster-app.js:142-211`
- Modify: `poster-app.js:309-365`
- Modify: `poster-app.js:441-500`
- Modify: `poster-app.js:700-815`
- Modify: `prompt-generator.test.js:1806-1875`

**Interfaces:**
- Consumes all dictionaries and helpers from `aigcPosterTitleMarkData`.
- Produces controller helpers: `currentTitleMarkTemplate()`, `renderTitleMarkFilters()`, `renderTitleMarkLibrary()`, `renderTitleMarkControls()`, `toggleTitleMarkMethod(id)`, `renderTitleMarkPreview()`.
- Mutates only the bounded internal poster state and existing DOM.

- [ ] **Step 1: Write failing controller tests**

```js
runTest("poster controller renders and selects safe title-mark systems", () => {
  const source = fs.readFileSync("poster-app.js", "utf8");
  [
    "aigcPosterTitleMarkData", "currentTitleMarkTemplate", "renderTitleMarkLibrary",
    "renderTitleMarkControls", "toggleTitleMarkMethod", "data-poster-title-mark-template-id",
    "data-poster-title-mark-method", "poster-title-mark-preview"
  ].forEach((token) => assert(source.includes(token), token));
  assert(source.includes("escapeHtml(titleText)"));
  assert(source.includes("slice(-3)"));
});
```

- [ ] **Step 2: Run and verify red**

Expected: FAIL for missing title-mark controller symbols.

- [ ] **Step 3: Extend state and element bindings**

Require all three data modules before initialization:

```js
const titleMarkData = root.aigcPosterTitleMarkData;
if (!templateData || !titleData || !titleMarkData) return;
```

Initialize title-mark state by calling `normalizePosterTitleMarkState({})`. Add element bindings only for the IDs created in Task 2.

- [ ] **Step 4: Render the third mode and whole-card selection**

Update `renderLibraryView()` so exactly one of the three panes is visible. Render cards with escaped sample text:

```js
function renderTitleMarkLibrary() {
  const templates = filterTitleMarkTemplates({ category: state.titleMarkCategory });
  if (state.titleLibraryView === "title-mark") elements.templateCount.textContent = String(templates.length).padStart(2, "0");
  elements.titleMarkTemplateList.innerHTML = templates.map((template) => `
    <button type="button" class="poster-title-mark-template-card ${template.previewClass}"
      data-poster-title-mark-template-id="${template.id}" role="option"
      aria-selected="${template.id === state.titleMarkTemplate}">
      <span class="poster-title-mark-sample">${escapeHtml(template.sampleTitle)}</span>
      <strong>${escapeHtml(template.label)}</strong>
      <small>${escapeHtml(template.genreHints.join(" / "))}</small>
    </button>`).join("");
}
```

Use delegated click and key-safe native buttons. Selecting a template copies its skeleton, methods, material, lighting, and background into state but leaves the user's title and poster composition unchanged.

- [ ] **Step 5: Implement bounded multi-select and preview**

```js
function toggleTitleMarkMethod(id) {
  if (!TITLE_MARK_METHODS[id]) return;
  const next = state.titleMarkMethods.includes(id)
    ? state.titleMarkMethods.filter((item) => item !== id)
    : [...state.titleMarkMethods, id].slice(-3);
  state.titleMarkMethods = next.length ? next : [id];
}
```

When `titleLibraryView === "title-mark"`, render an escaped title-mark layer with `textContent`-equivalent escaped markup, the selected preview class, material class, and a visible `合成示意` label. Keep the layer inside the existing poster canvas at every ratio. Do not claim the CSS preview is model output.

- [ ] **Step 6: Run tests and commit**

Run syntax checks and the full suite, then:

```bash
git add poster-app.js prompt-generator.test.js
git commit -m "feat: add interactive movie title-mark preview"
```

---

### Task 4: Prompt Composition, Validation, and Persistence

**Files:**
- Modify: `poster-app.js:402-435`
- Modify: `poster-app.js:464-500`
- Modify: `poster-app.js:614-675`
- Modify: `poster-app.js:803-913`
- Modify: `prompt-generator.test.js:1847-1880`

**Interfaces:**
- Produces: `composeTitleMarkPrompt()` returning a complete Chinese prompt string.
- Extends: `aigcPosterWorkbench.exportState()` and `importState(saved)` with title-mark fields.
- Preserves: `composePrompt()` for the full poster and `typographyRule()` for the basic-title mode.

- [ ] **Step 1: Write failing prompt and persistence tests**

```js
runTest("poster title-mark controls persist and compose isolated asset prompts", () => {
  const source = fs.readFileSync("poster-app.js", "utf8");
  [
    "composeTitleMarkPrompt", "titleMarkCategory", "titleMarkTemplate",
    "titleMarkMethods", "titleMarkSkeleton", "titleMarkMaterial",
    "titleMarkLighting", "titleMarkBackground", "titleMarkOutputMode",
    "titleMarkMetaphor"
  ].forEach((token) => assert(source.includes(token), token));
  assert(source.includes("无人物、无场景、无海报排版"));
  assert(source.includes("错字、乱码、随机英文"));
  assert(source.includes("normalizePosterTitleMarkState"));
});
```

- [ ] **Step 2: Run and verify red**

Expected: FAIL for the missing prompt composer and persistence fields.

- [ ] **Step 3: Compose the fixed prompt structure**

Implement in the exact order from the spec:

```js
function composeTitleMarkPrompt() {
  const template = currentTitleMarkTemplate();
  const titleText = value(elements.title, "[填写中文电影片名]");
  const englishText = state.englishTitle.trim();
  const methodRules = state.titleMarkMethods.map((id) => TITLE_MARK_METHODS[id].rule).join("；");
  const metaphor = elements.titleMarkMetaphor.value.trim()
    ? `只融入一个核心图形隐喻“${elements.titleMarkMetaphor.value.trim()}”，图形必须服从字形可读性。`
    : template.metaphorRule;
  const hierarchy = state.titleLanguage === "cn"
    ? `仅生成中文主标“${titleText}”，不添加英文。`
    : state.titleLanguage === "en"
      ? `英文主标“${englishText || "[填写准确英文片名]"}”，中文不出现。`
      : `中文主标“${titleText}”，英文副标“${englishText || "[填写准确英文片名]"}”。${template.hierarchyRule}`;
  const isolation = state.titleMarkOutputMode === "asset"
    ? `${TITLE_MARK_BACKGROUNDS[state.titleMarkBackground].rule}，仅显示完整字标，无人物、无场景、无海报排版。`
    : "说明字标在海报中的尺寸、位置和安全区，但仍将字标作为独立设计主体。";
  return `为电影《${titleText}》设计独立片名字标。文字必须逐字正确、完整、清晰可辨。${TITLE_MARK_SKELETONS[state.titleMarkSkeleton].rule}。${methodRules}。${metaphor}${template.promptRule}。材质：${TITLE_MARK_MATERIALS[state.titleMarkMaterial].rule}。光影：${TITLE_MARK_LIGHTING[state.titleMarkLighting].rule}。${hierarchy}${isolation}专业电影片名字标，高分辨率，边缘清楚，适合后期抠图与海报合成。禁止错字、乱码、随机英文、默认办公字体、综艺描边、廉价3D挤压、过曝反光、过度装饰、笔画粘连。${template.negativeRule}`;
}
```

When the third library mode is active, place this output in `#poster-output`; otherwise retain the existing full-poster prompt.

- [ ] **Step 4: Add validation and state round-trip**

- Block copy when the Chinese title is empty in Chinese or bilingual mode.
- Show a non-blocking warning over eight Chinese characters.
- Show a non-blocking warning for missing English in bilingual mode.
- Show a non-blocking warning when the metaphor contains list separators suggesting more than one concept.
- Export and import every title-mark field through `normalizePosterTitleMarkState(saved)`.
- `clearFields()` resets title-mark state to defaults; `loadExample()` loads `迷雾码头`, `MIST HARBOR`, and `eastern-cold-serif`.
- Dispatch the existing `aigc:workspace-dirty` event once per user mutation.

- [ ] **Step 5: Run tests and commit**

Run syntax checks, full tests, and `git diff --check`, then:

```bash
git add poster-app.js prompt-generator.test.js
git commit -m "feat: compose and persist title-mark prompts"
```

---

### Task 5: Browser QA, Security Regression, and Delivery Record

**Files:**
- Modify: `design-qa.md`
- Create: `.audit-20260719-poster-title-mark-library/responsive-qa.json`
- Create: `.audit-20260719-poster-title-mark-library/1440x1024.png`
- Create: `.audit-20260719-poster-title-mark-library/390x844.png`

**Interfaces:**
- Consumes the completed local site at `http://127.0.0.1:8766/index.html?workspace=poster`.
- Produces final visual, responsive, interaction, and security evidence.

- [ ] **Step 1: Run fresh automated verification**

```bash
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --check poster-title-mark-data.js
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --check poster-app.js
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node prompt-generator.test.js
git diff --check
curl -sS -I 'http://127.0.0.1:8766/index.html?workspace=poster&fresh=poster-title-mark-final-v1'
```

Expected: all commands exit 0 and HTTP status is 200.

- [ ] **Step 2: Verify functional flows in the in-app browser**

At the fresh URL:

1. Open `AI片名字标` and verify 24 cards.
2. Filter every category and verify four cards.
3. Select a whole card and confirm preview, controls, and prompt update.
4. Select four construction methods and verify only the newest three remain.
5. Test Chinese, English, and bilingual modes.
6. Test independent asset and poster-composite output modes.
7. Reload and verify title-mark state restoration.
8. Enter `<img src=x onerror=window.__titleMarkXss=1>` and verify no image node appears and `window.__titleMarkXss` remains unset.

- [ ] **Step 3: Verify responsive layout**

Capture DOM dimensions and screenshots at 1440×1024, 1280×900, 1024×900, and 390×844. Assert:

- `document.documentElement.scrollWidth <= document.documentElement.clientWidth`.
- The title-mark layer stays inside the poster canvas.
- Desktop rail widths respect 280 and 420 pixel minimums.
- At 1024 the order is monitor, library, parameters.
- At 390 template cards form a horizontal rail and controls use one column.

- [ ] **Step 4: Compare with the approved visual reference**

Use `.superpowers/brainstorm/47419-1784468882/content/ai-title-mark-workbench.html` as the sole visual baseline. Correct hierarchy, density, color, preview scale, or clipping differences before recording a pass.

- [ ] **Step 5: Record QA and leave the final URL open**

Append a `Poster AI Title-Mark Library Design QA` section to `design-qa.md` covering content, interaction, security, responsive results, fixed findings, and artifact paths. Leave this URL open as the deliverable:

`http://127.0.0.1:8766/index.html?workspace=poster&fresh=poster-title-mark-final-v1`

- [ ] **Step 6: Commit the QA record when feature files are cleanly isolated**

```bash
git add design-qa.md
git commit -m "docs: record title-mark workspace QA"
```

Do not stage unrelated historical changes or generated audit artifacts.
