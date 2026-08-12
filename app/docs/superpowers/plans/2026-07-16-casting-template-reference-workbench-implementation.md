# 角色视觉参考与提示词模板工作台实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将角色定妆改为不接生图 API 的角色视觉参考与提示词模板工作台，提供两种角色建立方式、四种本地图片样板和完整身份资料板提示词。

**Architecture:** 保留现有静态 HTML/CSS/JavaScript、IndexedDB 参考图资产和 localStorage 项目状态。新增四张本地样板图与一层模板配置，中央画布始终展示版式样板，有参考图模式另外展示用户上传的身份参考；旧版本数据继续读写但不在主界面强调。

**Tech Stack:** Static HTML, CSS, JavaScript, IndexedDB, localStorage, ImageGen local assets, Node assertion suite, Playwright CLI.

## Global Constraints

- 不调用图像生成模型，不建设生成结果画布。
- 不提供模型参数、生成队列、额度、计费或 API 密钥设置。
- 保留现有角色档案、角色字段、参考图本地上传和项目持久化能力。
- 不删除旧项目中的参考图、版本元数据或角色资料。
- 每种版式提供一张本地图片样板，使用 `object-fit: contain` 完整显示。
- 有参考图和文字新建角色两种模式分别生成正确的提示词。
- 保留现有 IDs、`data-workspace="casting"` 和其他四个工作台的功能。
- 不重构影调、运镜、海报和画面反推工作台。

---

## File Map

- Create `assets/casting-template-single.png`: 单视图真人写实白棚样板。
- Create `assets/casting-template-three.png`: 三视图真人写实白棚样板。
- Create `assets/casting-template-four.png`: 四视图真人写实白棚样板。
- Create `assets/casting-template-identity-board.png`: 人物、服装、道具、表情、动作组合身份资料板样板。
- Modify `index.html`: 新定位文案、第四种版式、样板画布、模板说明和身份资料字段。
- Modify `casting-option-3.css`: 样板画布、参考图浮层、四项版式选择、模板说明与响应式。
- Modify `casting-app.js`: 模板配置、样板切换、身份资料板提示词、新字段状态和旧项目兼容。
- Modify `prompt-generator.test.js`: 样板、DOM、提示词、持久化和文案回归测试。
- Modify `.superpowers/sdd/progress.md`: 记录任务执行与审查状态。

---

### Task 1: Four Local Casting Template Samples

**Files:**
- Create: `assets/casting-template-single.png`
- Create: `assets/casting-template-three.png`
- Create: `assets/casting-template-four.png`
- Create: `assets/casting-template-identity-board.png`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Produces: four local 16:9 PNG paths consumed by `casting-app.js` template profiles.
- Preserves: the same adult Chinese female sample character, black shoulder-length hair, charcoal coat, white seamless studio background, dry low-reflectance skin, neutral softbox lighting.

- [ ] **Step 1: Add a failing local-asset test**

```js
runTest("casting template workbench ships four local visual samples", () => {
  [
    "assets/casting-template-single.png",
    "assets/casting-template-three.png",
    "assets/casting-template-four.png",
    "assets/casting-template-identity-board.png"
  ].forEach((file) => assert(fs.existsSync(file), `missing ${file}`));
});
```

- [ ] **Step 2: Run the suite and verify the test fails**

Run: `PATH="$HOME/.local/bin:$PATH" node prompt-generator.test.js`

Expected: FAIL with `missing assets/casting-template-single.png`.

- [ ] **Step 3: Generate the single-view master sample**

Use `image_gen__imagegen` with no reference image:

```text
Create a polished 16:9 casting template sample image for a professional film prompt reference workbench. White seamless studio background. One adult Chinese woman, around 38, shoulder-length black hair with a right side part, charcoal matte trench coat, neutral restrained expression. Large head-and-shoulders identity portrait centered with breathing room. Dry low-reflectance real human skin, visible pores and fine facial hair, no retouching, no waxy or digital-human appearance. Large softbox and white bounce fill, very low contrast, accurate skin tone, subtle natural floorless studio shadow. Real full-frame RAW portrait photography. No text, no labels, no borders, no watermark, no logo, no collage.
```

Save the returned PNG as `assets/casting-template-single.png`.

- [ ] **Step 4: Generate the three-view sample from the same character**

Use `image_gen__imagegen` with `assets/casting-template-single.png` as the reference:

```text
Keep exactly the same woman's face, age, skin tone, hairline, hairstyle, body proportions and charcoal coat. Recompose as a clean 16:9 white-studio three-view casting board: left large front facial close-up about 45 percent, center 45-degree waist-up portrait about 30 percent, right front full body about 25 percent. Complete hair, hands, legs and shoes; consistent exposure and scale logic. Real human skin and fabric, neutral softbox lighting. No text, numbers, labels, dividers, watermark or logo.
```

Save as `assets/casting-template-three.png`.

- [ ] **Step 5: Generate the four-view sample from the same character**

Use `image_gen__imagegen` with `assets/casting-template-single.png` as the reference:

```text
Keep exactly the same woman and wardrobe. Create a 16:9 white-studio four-view identity master: one clear front facial identity anchor plus four consistent full-body views showing front, strict 90-degree side, strict back and 45-degree angle. Match height, foot baseline, camera height, body proportions, face geometry, coat construction and lighting. Complete uncropped figures. No text, labels, numbers, borders, watermark or logo.
```

Save as `assets/casting-template-four.png`.

- [ ] **Step 6: Generate the identity-board sample from the same character**

Use `image_gen__imagegen` with `assets/casting-template-single.png` as the reference:

```text
Keep exactly the same woman, face, age, body and wardrobe. Create a sophisticated 16:9 character identity reference board on a pure white seamless studio background. Visual composition only, no text. Left 40 percent: large neutral identity portrait and one smaller full-body figure. Center 20 percent: organized wardrobe breakdown showing the charcoal coat, ivory shirt, black straight trousers and black low heels as coherent worn or neatly isolated clothing studies. Right 40 percent: fixed props including a silver wristwatch and forensic credential, a row of four facial expressions using the same face (neutral, alert, restrained concern, controlled determination), and three small action poses (observing evidence, walking with purpose, standing in professional readiness). Every face must be the same person. Real full-frame RAW photography, dry low-reflectance skin, true fabric and metal texture, neutral double softbox light. No infographic UI, no labels, no typography, no numbers, no border, no watermark, no logo.
```

Save as `assets/casting-template-identity-board.png`.

- [ ] **Step 7: Inspect all four assets**

Use `view_image` on each PNG. Reject and regenerate any asset that contains text, crops a figure, changes identity, omits a required identity-board category, or uses a non-white background.

- [ ] **Step 8: Run the asset test**

Run: `PATH="$HOME/.local/bin:$PATH" node prompt-generator.test.js`

Expected: the new sample asset test PASS and the existing suite remains green.

- [ ] **Step 9: Commit the isolated sample assets**

```bash
git add assets/casting-template-single.png assets/casting-template-three.png assets/casting-template-four.png assets/casting-template-identity-board.png prompt-generator.test.js
git commit -m "feat: add casting template sample boards"
```

---

### Task 2: Template-First Casting Page Structure

**Files:**
- Modify: `index.html:270-410`
- Modify: `casting-option-3.css:200-520,899-1040`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Produces DOM hooks: `#casting-template-sample`, `#casting-template-title`, `#casting-template-purpose`, `#casting-template-composition`, `#casting-template-stage`, and `[data-casting-layout="identity"]`.
- Retains upload hooks: `#casting-reference-file`, `#casting-identity-board-image`, `#casting-select-image`, `#casting-replace-image`, `#casting-remove-image`.
- Keeps legacy version hooks in an `aria-hidden="true"` compatibility container so existing project state is not deleted.

- [ ] **Step 1: Add failing DOM and positioning tests**

```js
runTest("casting page presents a reference and template workbench", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const css = fs.readFileSync("casting-option-3.css", "utf8");
  assert(html.includes("角色视觉参考与提示词模板"));
  assert(html.includes('data-casting-source="reference">有参考图'));
  assert(html.includes('data-casting-layout="identity">身份资料板'));
  ["casting-template-sample", "casting-template-title", "casting-template-purpose", "casting-template-composition", "casting-template-stage"]
    .forEach((id) => assert(html.includes(`id="${id}"`), `missing #${id}`));
  assert(css.includes("#casting-template-sample"));
  assert(css.includes("object-fit: contain"));
  assert(!html.includes("固定角色生图提示词"));
});
```

- [ ] **Step 2: Run the suite and verify the DOM test fails**

Run: `PATH="$HOME/.local/bin:$PATH" node prompt-generator.test.js`

Expected: FAIL because `data-casting-layout="identity"` and template hooks are missing.

- [ ] **Step 3: Update the left rail copy and fourth layout control**

Replace the current source and layout labels with:

```html
<span class="section-label">角色建立方式</span>
<div class="segmented casting-source-switch" aria-label="角色建立方式">
  <button type="button" class="segment active" data-casting-source="reference">有参考图</button>
  <button type="button" class="segment" data-casting-source="text">文字新建角色</button>
</div>

<span class="section-label">图片样板</span>
<div class="segmented casting-layout-switch" aria-label="角色图片样板">
  <button type="button" class="segment" data-casting-layout="single">单视图</button>
  <button type="button" class="segment active" data-casting-layout="three">三视图</button>
  <button type="button" class="segment" data-casting-layout="four">四视图</button>
  <button type="button" class="segment" data-casting-layout="identity">身份资料板</button>
</div>
```

Change the archive subtitle to `角色资料 / 图片样板 / 提示词模板` and the current role status text to `角色资料已建立`.

- [ ] **Step 4: Convert the center board to a sample-first stage**

Inside `.casting-identity-board`, add the persistent sample image before the uploaded reference:

```html
<img id="casting-template-sample" src="assets/casting-template-three.png" alt="三视图角色图片样板">
<div id="casting-reference-layer" class="casting-reference-layer">
  <span>当前人物参考图</span>
  <img id="casting-identity-board-image" alt="" hidden>
  <div id="casting-upload-empty" class="casting-upload-empty">
    <i data-lucide="image-up" aria-hidden="true"></i>
    <strong>添加人物参考图</strong>
    <span>JPG、PNG、WebP，单张不超过 15MB</span>
    <button id="casting-select-image" type="button" class="button primary">选择参考图</button>
  </div>
  <p id="casting-upload-error" class="casting-upload-error" role="alert" hidden></p>
  <div id="casting-asset-meta" class="casting-asset-meta" hidden>
    <span id="casting-asset-summary"></span>
    <button id="casting-replace-image" type="button" class="icon-button" title="替换参考图" aria-label="替换参考图"><i data-lucide="replace" aria-hidden="true"></i></button>
    <button id="casting-remove-image" type="button" class="icon-button" title="删除参考图" aria-label="删除参考图"><i data-lucide="trash-2" aria-hidden="true"></i></button>
  </div>
</div>
```

Keep the hidden file input and all existing upload button IDs. The uploaded image becomes a clear reference layer, not the generated output or full canvas.

- [ ] **Step 5: Replace the visible version panel with template guidance**

```html
<section id="casting-template-stage" class="casting-template-guide" aria-labelledby="casting-template-title">
  <header>
    <div><span>VISUAL TEMPLATE</span><h2 id="casting-template-title">三视图样板</h2></div>
    <small id="casting-template-stage-label">适合确认脸部与全身比例</small>
  </header>
  <div class="casting-template-guide-grid">
    <article><span>用途</span><p id="casting-template-purpose"></p></article>
    <article><span>构图组成</span><p id="casting-template-composition"></p></article>
    <article><span>使用阶段</span><p id="casting-template-stage"></p></article>
  </div>
</section>
<div class="casting-version-compat" aria-hidden="true" hidden>
  <span id="casting-version-count"></span>
  <button id="casting-save-version" type="button"></button>
  <div id="casting-version-strip"></div>
</div>
```

The compatibility container is not user-facing and does not delete `state.versions`.

- [ ] **Step 6: Add scoped CSS for the new visual hierarchy**

Implement these exact structural rules, adapting only sizes at responsive breakpoints:

```css
#casting-workspace .casting-layout-switch {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

#casting-workspace .casting-identity-board {
  position: relative;
  display: grid;
  grid-template-rows: minmax(0, 1fr) 30px;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #fff;
}

#casting-workspace #casting-template-sample {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  background: #fff;
}

#casting-workspace .casting-reference-layer {
  position: absolute;
  top: 12px;
  right: 12px;
  width: clamp(150px, 23%, 220px);
  aspect-ratio: 4 / 5;
  border: 1px solid var(--cast-line);
  background: rgba(255,255,255,.96);
  box-shadow: 0 8px 24px rgba(20,32,27,.12);
}

#casting-workspace .casting-template-guide {
  min-height: 0;
  padding: 12px;
  border-top: 1px solid var(--cast-line);
  background: #f7f7f3;
}
```

At 390px, stack the reference layer below the sample instead of covering it. Keep every sample and reference image `object-fit: contain`.

- [ ] **Step 7: Run static tests**

Run: `PATH="$HOME/.local/bin:$PATH" node prompt-generator.test.js && git diff --check`

Expected: all tests PASS; no whitespace errors.

- [ ] **Step 8: Commit the template-first page structure**

```bash
git add index.html casting-option-3.css prompt-generator.test.js
git commit -m "feat: reshape casting as a template workbench"
```

---

### Task 3: Identity Board Fields and Prompt Profiles

**Files:**
- Modify: `index.html:346-404`
- Modify: `casting-app.js:260-470,720-1070`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Produces `CASTING_TEMPLATE_PROFILES` entries for `single`, `three`, `four`, and `identity`.
- Produces new field IDs: `#casting-wardrobe`, `#casting-props`, `#casting-neutral-expression`, `#casting-expression-set`, `#casting-signature-action`, `#casting-stance`.
- Extends `aigcCastingWorkbench.exportState()` and `.importState()` with `wardrobe`, `props`, `neutralExpression`, `expressionSet`, `signatureAction`, and `stance` strings.

- [ ] **Step 1: Add failing behavior and persistence tests**

```js
runTest("casting template profiles cover all four image boards", () => {
  const { CASTING_TEMPLATE_PROFILES } = require("./casting-app.js");
  assert.deepStrictEqual(Object.keys(CASTING_TEMPLATE_PROFILES), ["single", "three", "four", "identity"]);
  assert.strictEqual(CASTING_TEMPLATE_PROFILES.identity.image, "assets/casting-template-identity-board.png");
  ["人物主肖像", "服装", "道具", "表情", "动作"].forEach((term) => {
    assert(CASTING_TEMPLATE_PROFILES.identity.composition.includes(term));
  });
});

runTest("casting identity board fields persist and enter the prompt", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const source = fs.readFileSync("casting-app.js", "utf8");
  ["casting-wardrobe", "casting-props", "casting-neutral-expression", "casting-expression-set", "casting-signature-action", "casting-stance"]
    .forEach((id) => assert(html.includes(`id="${id}"`), `missing #${id}`));
  ["wardrobe", "props", "neutralExpression", "expressionSet", "signatureAction", "stance"]
    .forEach((key) => assert(source.includes(`${key}: elements.${key}.value`), `missing export ${key}`));
  ["【服装层级】", "【固定道具】", "【表情组】", "【动作姿态组】"]
    .forEach((heading) => assert(source.includes(heading), `missing ${heading}`));
});
```

- [ ] **Step 2: Run tests and verify the new tests fail**

Run: `PATH="$HOME/.local/bin:$PATH" node prompt-generator.test.js`

Expected: FAIL because `CASTING_TEMPLATE_PROFILES` and identity field IDs do not exist.

- [ ] **Step 3: Add the identity-board form group**

Insert a new openable details group after “角色信息”:

```html
<details class="casting-inspector-group" id="casting-identity-details">
  <summary>身份资料板内容</summary>
  <div class="casting-fields">
    <label class="field field-span-2"><span>服装层级与材质</span><textarea id="casting-wardrobe" rows="2" placeholder="内层、外套、下装、鞋履、面料、颜色、磨损与穿着状态"></textarea></label>
    <label class="field field-span-2"><span>固定道具与佩戴位置</span><textarea id="casting-props" rows="2" placeholder="道具名称、材质、尺寸、使用痕迹、佩戴或携带位置"></textarea></label>
    <label class="field"><span>常态表情</span><input id="casting-neutral-expression" type="text" placeholder="克制中性，眼神专注，下颌轻微收紧"></label>
    <label class="field"><span>情绪表情组</span><input id="casting-expression-set" type="text" placeholder="警觉、轻微担忧、压抑愤怒、坚定"></label>
    <label class="field"><span>标志性动作</span><input id="casting-signature-action" type="text" placeholder="俯身观察证物、整理手套、快速记录"></label>
    <label class="field"><span>常用站姿与身体状态</span><input id="casting-stance" type="text" placeholder="肩背挺直、重心稳定、动作克制、职业警觉"></label>
  </div>
</details>
```

- [ ] **Step 4: Define and export four template profiles**

At the top of `casting-app.js`, define:

```js
const CASTING_TEMPLATE_PROFILES = Object.freeze({
  single: {
    label: "单视图样板",
    image: "assets/casting-template-single.png",
    purpose: "优先确认人物脸部、年龄、皮肤和角色气质。",
    composition: "单人正脸或轻微45度近景，只出现一张脸。",
    stage: "角色探索与首次身份确认"
  },
  three: {
    label: "三视图样板",
    image: "assets/casting-template-three.png",
    purpose: "同时确认脸部、半身状态和全身比例。",
    composition: "正脸身份特写、45度半身、正面全身。",
    stage: "角色定妆与比例确认"
  },
  four: {
    label: "四视图样板",
    image: "assets/casting-template-four.png",
    purpose: "建立可反复引用的完整角色视觉母版。",
    composition: "正脸身份锚点、正面、90度侧面、背面、45度全身。",
    stage: "分镜与视频制作前的身份锁定"
  },
  identity: {
    label: "身份资料板样板",
    image: "assets/casting-template-identity-board.png",
    purpose: "集中管理角色人物、服装、道具、表情和动作信息。",
    composition: "人物主肖像约40%，服装约20%，道具、表情和动作共约40%。",
    stage: "项目角色资产归档与跨工作台传递"
  }
});
```

Expose it through the existing CommonJS test export without removing `appendRoleVersion`, `createVersionPreviewCache`, or `persistReferenceAssetMutation`.

- [ ] **Step 5: Wire the sample and template guide**

Add element references for the six new fields and five template display hooks. In `render()`:

```js
const profile = CASTING_TEMPLATE_PROFILES[state.layout] || CASTING_TEMPLATE_PROFILES.three;
elements.templateSample.src = profile.image;
elements.templateSample.alt = `${profile.label}，仅作为构图参考`;
elements.templateTitle.textContent = profile.label;
elements.templatePurpose.textContent = profile.purpose;
elements.templateComposition.textContent = profile.composition;
elements.templateStage.textContent = profile.stage;
elements.identityDetails.open = state.layout === "identity";
```

Update source-mode rendering so the reference upload layer is visible only in `reference` mode. The sample image remains visible in both modes.

- [ ] **Step 6: Add the identity-board layout prompt**

Extend `layoutRule()` with an explicit identity branch:

```js
if (state.layout === "identity") {
  return "16:9角色身份资料板，人物主肖像约占40%，服装拆解约占20%，固定道具、表情组和动作姿态组共约占40%。所有区域必须是同一个人物、同一年龄、同一肤色、同一发型和同一身体比例。信息依靠构图分区，不生成文字、编号、边框、水印或Logo。";
}
```

In `composePrompt()`, add these sections only when `state.layout === "identity"`:

```js
const identityBoardSections = state.layout === "identity" ? `

【服装层级】
${value(elements.wardrobe, "[填写内外层服装、鞋履、材质、颜色和穿着状态]")}。

【固定道具】
${value(elements.props, "[填写道具、材质、尺寸、使用痕迹和固定位置]")}。

【表情组】
常态表情：${value(elements.neutralExpression, "[填写常态表情]")}。情绪表情：${value(elements.expressionSet, "[填写3至4种可复用情绪表情]")}。所有表情保持同一脸部几何和真实年龄。

【动作姿态组】
标志性动作：${value(elements.signatureAction, "[填写标志性动作]")}。常用站姿与身体状态：${value(elements.stance, "[填写站姿、重心、肩颈和动作状态]")}。动作不改变体型、服装结构和固定道具位置。` : "";
```

Insert `identityBoardSections` after the normal role setting and before lighting/material sections.

- [ ] **Step 7: Update labels, validation and filename**

- Output label: `角色视觉提示词模板`.
- Inspector aria-label: `角色视觉资料与提示词模板`.
- Status values: `单视图参考`, `三视图参考`, `四视图参考`, `身份资料板参考`.
- Identity layout filename: `CHAR-001_角色名_身份资料板_v001.png`.
- For `identity`, require all six new fields before enabling copy; for other layouts they remain optional.
- Text mode never requires `referenceAsset`; reference mode still requires both `referenceAsset.id` and a restored `previewUrl`.

- [ ] **Step 8: Extend example, clear, input listeners, export and import**

Add the six elements to the shared input/change listener list. Populate concrete example values in `loadExample()`, clear them in `clearFields()`, export them as strings, and import with empty-string fallbacks:

```js
["wardrobe", "props", "neutralExpression", "expressionSet", "signatureAction", "stance"].forEach((key) => {
  elements[key].value = saved[key] || "";
});
```

Allow `saved.layout === "identity"`:

```js
state.layout = ["single", "three", "four", "identity"].includes(saved.layout) ? saved.layout : "three";
```

Do not remove or rewrite `saved.versions` and `saved.referenceAsset`.

- [ ] **Step 9: Run tests and syntax checks**

Run:

```bash
PATH="$HOME/.local/bin:$PATH" node prompt-generator.test.js
PATH="$HOME/.local/bin:$PATH" node --check casting-app.js
git diff --check
```

Expected: all tests PASS; syntax and whitespace checks exit 0.

- [ ] **Step 10: Commit the identity-board templates**

```bash
git add index.html casting-app.js prompt-generator.test.js
git commit -m "feat: add casting identity board templates"
```

---

### Task 4: Compatibility, Transfers, and Visual Polish

**Files:**
- Modify: `casting-app.js`
- Modify: `casting-option-3.css`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: `CASTING_TEMPLATE_PROFILES` and the six new identity fields.
- Preserves: existing `aigcCastingWorkbench.getCharacterSummary()`, workspace dirty events, reference asset lifecycle and transfer buttons.

- [ ] **Step 1: Add failing compatibility and transfer tests**

```js
runTest("casting template redesign preserves local assets and transfer contracts", () => {
  const source = fs.readFileSync("casting-app.js", "utf8");
  ["referenceAsset", "versions", "restoreReferenceAsset", "clearReferenceAsset", "getCharacterSummary"]
    .forEach((term) => assert(source.includes(term), `missing ${term}`));
  assert(source.includes("服装层级"));
  assert(source.includes("固定道具"));
  assert(source.includes("表情组"));
  assert(source.includes("动作姿态组"));
});

runTest("casting layout samples remain complete on desktop and mobile", () => {
  const css = fs.readFileSync("casting-option-3.css", "utf8");
  const sampleRule = css.match(/#casting-workspace #casting-template-sample\s*\{([\s\S]*?)\}/)?.[1] || "";
  assert(sampleRule.includes("object-fit: contain"));
  assert(css.includes("@media (max-width: 720px)"));
  assert(css.includes(".casting-reference-layer"));
});
```

- [ ] **Step 2: Run the suite and verify any missing contract fails**

Run: `PATH="$HOME/.local/bin:$PATH" node prompt-generator.test.js`

Expected: FAIL if identity details are absent from the transfer summary or mobile CSS is incomplete.

- [ ] **Step 3: Extend the character summary without changing its API**

Return one string from `getCharacterSummary()` that appends:

```text
服装层级：[wardrobe]；固定道具：[props]；常态与情绪表情：[neutralExpression / expressionSet]；标志性动作与站姿：[signatureAction / stance]。
```

Empty values use `未填写`. Keep the existing role, face, age, body, hair, costume and identity lock statements.

- [ ] **Step 4: Preserve old version data without a visible version workflow**

Keep `state.versions`, export/import, retention query and Object URL cleanup unchanged. Remove no IndexedDB records as part of this redesign. Do not call `saveRoleVersion()` from any visible control; the hidden compatibility button exists only to keep DOM assumptions safe until a later migration.

- [ ] **Step 5: Polish responsive behavior**

At 1440 and 1280 widths, keep the existing three-column proportions. At `max-width: 720px`:

```css
#casting-workspace .casting-identity-board {
  aspect-ratio: auto;
  grid-template-rows: auto auto 30px;
}

#casting-workspace #casting-template-sample {
  aspect-ratio: 16 / 9;
}

#casting-workspace .casting-reference-layer {
  position: relative;
  inset: auto;
  width: 100%;
  aspect-ratio: 16 / 9;
  box-shadow: none;
}

#casting-workspace .casting-template-guide-grid {
  grid-template-columns: 1fr;
}
```

Long Chinese template descriptions must wrap and never use viewport-scaled font sizes.

- [ ] **Step 6: Run the full regression suite**

Run:

```bash
PATH="$HOME/.local/bin:$PATH" node prompt-generator.test.js
PATH="$HOME/.local/bin:$PATH" node --check casting-app.js
PATH="$HOME/.local/bin:$PATH" node --check workspace-core.js
PATH="$HOME/.local/bin:$PATH" node --check casting-asset-store.js
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit compatibility and responsive polish**

```bash
git add casting-app.js casting-option-3.css prompt-generator.test.js
git commit -m "fix: preserve casting assets in template mode"
```

---

### Task 5: Real Browser QA and Delivery

**Files:**
- Create: `output/playwright/casting-template-reference/` screenshots only.
- Modify: `.superpowers/sdd/progress.md`
- Modify: `.superpowers/sdd/casting-template-reference-task-5-report.md`

**Interfaces:**
- Consumes: final local page at `http://127.0.0.1:8766/index.html?workspace=casting`.
- Produces: browser QA evidence and final cache-busted delivery URL.

- [ ] **Step 1: Verify the local server**

Run:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8766/index.html
```

Expected: `200`. If unavailable, start `serve-local.py` on port 8766 and keep the session alive.

- [ ] **Step 2: Open the casting deep link in Playwright**

```bash
PATH="$HOME/.local/bin:$PATH" playwright-cli -s=casting-template open "http://127.0.0.1:8766/index.html?workspace=casting&fresh=casting-template-reference-v1" --headed
PATH="$HOME/.local/bin:$PATH" playwright-cli -s=casting-template resize 1440 1024
PATH="$HOME/.local/bin:$PATH" playwright-cli -s=casting-template snapshot
```

Expected: title identifies the casting workspace; the center shows a sample image and the right output label says `角色视觉提示词模板`.

- [ ] **Step 3: Verify all four template samples**

For single, three, four and identity buttons:

1. Click the layout.
2. Snapshot.
3. Confirm the sample `src` matches its profile.
4. Confirm computed `objectFit` is `contain`.
5. Confirm title, purpose, composition and stage copy change.
6. Confirm the prompt contains the matching layout rule.

For identity, confirm the sample visibly contains person, wardrobe, props, expressions and action poses, and the prompt contains `【服装层级】`, `【固定道具】`, `【表情组】`, and `【动作姿态组】`.

- [ ] **Step 4: Verify both source modes**

- In `有参考图`, upload `assets/casting-char-001-board.png`, reload, and confirm the uploaded reference restores without replacing the layout sample.
- Replace with another valid local image, then restore the original.
- In `文字新建角色`, confirm the upload layer is hidden and a completed form can copy without a reference image.
- Return to `有参考图` and confirm the persisted reference reappears.

- [ ] **Step 5: Verify old-state compatibility**

Reload an existing project containing `versions` and `referenceAsset`. Confirm there is no visible version workflow, no console error, reference restoration works, and export state still includes the untouched `versions` array.

- [ ] **Step 6: Capture and inspect responsive screenshots**

Capture 1440x1024, 1280x800 and 390x844. Use `view_image` on all three. Verify:

- no clipping or overlap;
- complete sample and reference images;
- readable right-side fields and prompt;
- the mobile reference layer sits below the sample;
- all four layout controls fit and remain tappable.

- [ ] **Step 7: Check console and full regression suite**

Run:

```bash
PATH="$HOME/.local/bin:$PATH" playwright-cli -s=casting-template console warning
PATH="$HOME/.local/bin:$PATH" node prompt-generator.test.js
PATH="$HOME/.local/bin:$PATH" node --check casting-app.js
PATH="$HOME/.local/bin:$PATH" node --check workspace-core.js
PATH="$HOME/.local/bin:$PATH" node --check casting-asset-store.js
git diff --check
```

Expected: 0 browser errors and warnings; all tests and checks exit 0.

- [ ] **Step 8: Record completion**

Update `.superpowers/sdd/progress.md` to mark Tasks 1-5 complete and create `.superpowers/sdd/casting-template-reference-task-5-report.md` with URLs, interactions, screenshot paths, console result, test counts and residual risks.

- [ ] **Step 9: Deliver the local URL**

Provide:

```text
http://127.0.0.1:8766/index.html?workspace=casting&fresh=casting-template-reference-v1
```

Keep the local server running. Do not commit Playwright screenshots unless the user explicitly asks.
