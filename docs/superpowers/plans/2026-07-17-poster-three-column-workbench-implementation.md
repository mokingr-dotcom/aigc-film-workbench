# Poster Three-Column Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild only the poster workspace as a balanced three-column production reference tool with a purpose-aware template library, cinematic visual monitor, grouped parameters, persistent resizable columns, and unchanged prompt/project behavior.

**Architecture:** Keep the current static HTML/CSS/JavaScript application and the existing `aigcPosterWorkbench` API. Add a focused poster template data module and a focused poster stylesheet, reorganize the existing poster DOM without changing business field IDs, and let `poster-app.js` coordinate template selection, monitor rendering, validation, prompt generation, and layout persistence. Use local bitmap template images as visual references; do not add image generation or upload APIs.

**Tech Stack:** Static HTML5, CSS custom properties/container queries, vanilla JavaScript, local bitmap assets, existing Node assertion suite, local Playwright CLI, in-app browser screenshots.

## Global Constraints

- Change only `#poster-workspace` and poster-specific assets, styles, tests, and scripts.
- Preserve every existing poster field ID, `data-workspace="poster"`, and the public `window.aigcPosterWorkbench` interface.
- Preserve project import/export, cross-workspace tone/casting transfer, example loading, clearing, validation, filename generation, and clipboard behavior.
- Keep the product as a prompt and reference tool; do not add image APIs, authentication, payment, cloud storage, or a generative canvas.
- Use real local bitmap samples for template imagery. Do not use CSS silhouettes, fake image placeholders, handmade SVG illustrations, or remote hotlinks.
- New tone, lighting, and color choices remain single-select and replace the previous choice.
- At 1440px the starting column widths are approximately 320px / flexible minimum 420px / 500px, with two accessible separators.
- Avoid large pure-black surfaces. Continue the established warm-white, cool gray-green, and restrained dark command-bar system used by the confirmed camera and casting workspaces.
- Cards use a radius of 5px or less; prompt text is at least 12px with line-height at least 1.6.
- Do not revert or format unrelated dirty worktree files. Stage only files listed by the current task.
- After every implementation checkpoint, provide a fresh local review URL using a new `fresh=` query value.

---

## File Map

- Create `poster-template-data.js`: normalized purpose groups and the 13 visual template records.
- Create `poster-three-column.css`: poster-only layout, components, monitor, separators, and responsive rules.
- Create `assets/poster-templates/*.jpg`: 13 original local visual-reference bitmaps plus an optional contact sheet used only for QA.
- Modify `index.html`: three-column poster markup, stable hooks, stylesheet/script order, and cache version.
- Modify `poster-app.js`: consume template records, synchronize purpose/template/ratio/monitor, preserve prompts, and persist column widths.
- Modify `prompt-generator.test.js`: static contracts and regression coverage for the new poster system.
- Create `output/playwright/poster-three-column/`: browser QA screenshots; do not commit generated screenshots unless explicitly requested.

---

### Task 1: Lock the Poster Data and DOM Contracts

**Files:**
- Modify: `prompt-generator.test.js`
- Reference: `index.html`
- Reference: `poster-app.js`

**Interfaces:**
- Preserves: `window.aigcPosterWorkbench.exportState() -> object`
- Preserves: `window.aigcPosterWorkbench.importState(saved) -> void`
- Preserves IDs: `poster-purpose`, `poster-ratio`, `poster-genre`, `poster-tone`, `poster-lighting`, `poster-color-grade`, `poster-composition`, `poster-subject`, `poster-environment`, `poster-look`, `poster-reference`, `poster-focus`, `poster-text-mode`, `poster-font`, `poster-title-position`, `poster-text-color`, `poster-title`, `poster-tagline`, `poster-credits`, `poster-output`, `poster-copy`

- [ ] **Step 1: Add a failing three-column contract test**

Add a test requiring the future DOM hooks and focused assets:

```js
runTest("poster workspace exposes the three-column production contract", () => {
  const html = fs.readFileSync("index.html", "utf8");
  [
    'class="poster-template-panel"',
    'class="poster-monitor-panel"',
    'class="poster-parameter-panel"',
    'id="poster-template-list"',
    'id="poster-monitor-canvas"',
    'id="poster-ratio-switch"',
    'data-poster-resizer="left"',
    'data-poster-resizer="right"',
    'src="poster-template-data.js',
    'href="poster-three-column.css'
  ].forEach((contract) => assert(html.includes(contract), `missing ${contract}`));
});
```

- [ ] **Step 2: Add a preservation test for all existing business IDs**

Iterate through the IDs listed above and assert each occurs exactly once in `index.html`. Assert that `poster-app.js` still contains `aigcPosterWorkbench`, `exportState`, `importState`, `loadExample`, `clearFields`, and the existing prompt section labels `【电影布光】` and `【电影色彩关系】`.

- [ ] **Step 3: Run the suite and confirm the new contract fails for the intended missing hooks**

Run:

```bash
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js
```

Expected: existing tests pass; the new three-column contract fails because the new markup and files do not yet exist.

- [ ] **Step 4: Commit the red contract test**

```bash
git add prompt-generator.test.js
git commit -m "test: define poster workbench contracts"
```

---

### Task 2: Build the Purpose-Aware Template Data Module

**Files:**
- Create: `poster-template-data.js`
- Modify: `prompt-generator.test.js`
- Modify later: `poster-app.js`

**Interfaces:**
- Produces: `window.aigcPosterTemplateData.purposes`
- Produces: `window.aigcPosterTemplateData.templates`
- Produces: `getTemplatesForPurpose(purpose) -> TemplateRecord[]`
- `TemplateRecord`: `{id, label, purposeGroups, compositionKey, image, genreHint, ratioDefaults, visualIntent, subjectRatio, typographyRisk, promptRule}`

- [ ] **Step 1: Add a failing normalized-data test**

Require the module to contain exactly 13 unique `id` values, the purpose groups `film`, `social`, and `product`, all six supported ratios, local `assets/poster-templates/` image paths, and a non-empty `promptRule` for every record.

- [ ] **Step 2: Run the suite and confirm failure because the module is absent**

Use the standard Node command. Expected: the new data-module test fails; no unrelated failures.

- [ ] **Step 3: Create the module as an IIFE browser global**

Include these 13 records, mapped to the existing composition semantics:

1. `film-portrait-close` — 人物大脸主视觉
2. `film-character-world` — 小人物与宏大环境
3. `film-dual-conflict` — 双人对峙
4. `film-ensemble` — 群像金字塔
5. `film-double-exposure` — 双重曝光 / 记忆叠化
6. `film-object-symbol` — 关键物件与符号
7. `film-diagonal-action` — 斜线动作
8. `film-negative-space` — 文艺留白
9. `film-split-world` — 双世界
10. `social-thumbnail-focus` — 高识别封面主体
11. `product-hero` — 商品英雄主视觉
12. `product-macro` — 材质微距主视觉
13. `product-exploded` — 悬浮部件 / 功能拆解

Keep labels and prompt rules in Chinese. Make `purposeGroups` explicit so changing purpose filters templates without losing shared film/series/event compatibility.

- [ ] **Step 4: Run syntax and contract tests**

Run the standard Node command. Expected: only the Task 1 DOM contract remains failing.

- [ ] **Step 5: Commit the data module**

```bash
git add poster-template-data.js prompt-generator.test.js
git commit -m "feat: add poster template catalog"
```

---

### Task 3: Produce the Local Bitmap Template Set

**Files:**
- Create: `assets/poster-templates/film-portrait-close.jpg`
- Create: `assets/poster-templates/film-character-world.jpg`
- Create: `assets/poster-templates/film-dual-conflict.jpg`
- Create: `assets/poster-templates/film-ensemble.jpg`
- Create: `assets/poster-templates/film-double-exposure.jpg`
- Create: `assets/poster-templates/film-object-symbol.jpg`
- Create: `assets/poster-templates/film-diagonal-action.jpg`
- Create: `assets/poster-templates/film-negative-space.jpg`
- Create: `assets/poster-templates/film-split-world.jpg`
- Create: `assets/poster-templates/social-thumbnail-focus.jpg`
- Create: `assets/poster-templates/product-hero.jpg`
- Create: `assets/poster-templates/product-macro.jpg`
- Create: `assets/poster-templates/product-exploded.jpg`
- Modify: `prompt-generator.test.js`

- [ ] **Step 1: Add a failing asset-integrity test**

Read every image path from `poster-template-data.js`, assert the file exists, has a `.jpg` extension, and is larger than 20KB. Keep pixel and aspect checks for the browser QA task.

- [ ] **Step 2: Generate a coherent original image family with ImageGen**

Use one shared art direction: premium cinematic key-art reference, realistic light/material behavior, no readable titles, no watermarks, and distinct compositions matching each template record. Generate purpose-appropriate imagery rather than recoloring one image 13 times.

- [ ] **Step 3: Normalize assets**

Use an image-processing command only for resizing/encoding. Standardize source samples to a practical high-resolution master, preserve complete composition, and keep each file reasonably small for local loading. Do not crop important subjects to force one ratio; the monitor will use `object-fit: contain` and purpose-aware framing.

- [ ] **Step 4: Inspect a contact sheet visually**

Create a temporary contact sheet under `output/playwright/poster-three-column/` and inspect it. Confirm each image communicates its named composition at thumbnail size, contains no accidental text, and differs materially from the others.

- [ ] **Step 5: Run the suite**

Expected: asset-integrity and data tests pass; the Task 1 DOM contract remains failing.

- [ ] **Step 6: Commit only production assets and their test**

```bash
git add assets/poster-templates prompt-generator.test.js
git commit -m "feat: add cinematic poster reference imagery"
```

---

### Task 4: Rebuild the Poster DOM as Three Functional Columns

**Files:**
- Modify: `index.html`
- Modify: `prompt-generator.test.js`

- [ ] **Step 1: Extend the failing DOM test with accessibility hooks**

Require:

- purpose buttons with `data-poster-purpose-group`
- ratio buttons with `data-poster-ratio`
- a live template summary region
- two separators with `role="separator"`, `tabindex="0"`, `aria-orientation="vertical"`, and labels
- grouped parameter sections identified as `subject`, `scene`, `look`, and `typography`

- [ ] **Step 2: Reorganize only `#poster-workspace`**

Create this DOM order:

```text
#poster-workspace
  .poster-template-panel
    purpose toolbar
    #poster-template-list
  [left separator]
  .poster-monitor-panel
    monitor header
    #poster-ratio-switch
    #poster-monitor-canvas
    intent / subject ratio / typography risk
  [right separator]
  .poster-parameter-panel
    source mode and actions
    grouped existing fields
    checklist / validation / output / filename
```

Move, do not duplicate, the existing controls. Keep every existing ID exactly once. Retain the hidden/select form controls where necessary as the canonical project-state values; visible purpose/template/ratio controls must synchronize to them in JavaScript.

- [ ] **Step 3: Load focused assets in stable order**

Load `poster-three-column.css` after the current shared styles and load `poster-template-data.js` immediately before `poster-app.js`. Add a fresh version query to both new files.

- [ ] **Step 4: Run the complete static suite**

Expected: all DOM, ID-preservation, data, and image contracts pass. Existing baseline remains intact.

- [ ] **Step 5: Commit the structural change**

```bash
git add index.html prompt-generator.test.js
git commit -m "feat: structure poster three-column workbench"
```

---

### Task 5: Implement the Visual System and Responsive Layout

**Files:**
- Create: `poster-three-column.css`
- Modify: `prompt-generator.test.js`

- [ ] **Step 1: Add a failing CSS contract test**

Assert the stylesheet defines poster-local custom properties for left/right widths, a three-column grid, 16:9-capable monitor framing, visible focus states, separator hit areas, `object-fit: contain`, and breakpoints at 1180px and 820px.

- [ ] **Step 2: Implement the desktop production layout**

Use CSS variables such as `--poster-left-width` and `--poster-right-width`. Keep the center at `minmax(420px, 1fr)`. The three panels fill the available workspace height without clipping; each owns its own scroll region. Make the center monitor the first visual focus without letting it dominate the right prompt area.

- [ ] **Step 3: Style the template library and monitor**

Template cards show a stable 16:9 thumbnail, title, suitable type, and concise composition note. The selected state uses border, tint, and icon/check treatment rather than color alone. The monitor uses the selected bitmap as a contained visual reference with safe-area and title-position overlays that do not cover the image explanation.

- [ ] **Step 4: Style the right parameter groups**

Use compact disclosure groups or native `details` elements. Keep labels readable, fields full width, and the output area at least 12px/1.6. Make validation, filename, and copy action reachable without overlaying the prompt.

- [ ] **Step 5: Implement responsive rules**

- Above 1180px: three columns and visible separators.
- 820–1180px: order monitor, templates, parameters vertically; hide separators.
- Below 820px: one column, horizontally scrollable template cards, single-column fields, full-width prompt area.

- [ ] **Step 6: Run static tests and inspect CSS color usage**

Run the standard Node command, then inspect poster-specific colors with `rg`. Confirm there is no new all-black background, purple gradient, oversized rounding, or unrelated global selector.

- [ ] **Step 7: Commit the visual layer**

```bash
git add poster-three-column.css prompt-generator.test.js
git commit -m "feat: style poster production workbench"
```

---

### Task 6: Wire Purpose, Template, Ratio, and Monitor Synchronization

**Files:**
- Modify: `poster-app.js`
- Modify: `prompt-generator.test.js`

**State additions:**

```js
state.purposeGroup       // "film" | "social" | "product"
state.selectedTemplate  // template record id
state.ratio              // existing canonical ratio value
```

- [ ] **Step 1: Add failing behavior-source contracts**

Assert `poster-app.js` consumes `aigcPosterTemplateData`, renders template buttons, updates `aria-pressed`, supports Enter/Space selection, updates monitor metadata, and continues to set the existing `poster-composition` and `poster-ratio` controls.

- [ ] **Step 2: Render purpose-aware templates**

Map existing purpose values into the three visible groups without deleting the six canonical purpose options:

- film group: film, series, event
- social group: streaming, social
- product group: product

When the visible group changes, choose the matching canonical purpose, filter templates, select a valid default, and apply the purpose default ratio. Preserve subject, environment, inherited look, title, tagline, and credits.

- [ ] **Step 3: Synchronize template selection**

On selection, update left-card state, `poster-composition`, center bitmap, composition intent, subject ratio, typography risk, ratio suggestions, and prompt output. Only the selected template's `promptRule` enters the final prompt.

- [ ] **Step 4: Synchronize ratio controls**

Visible ratio buttons write to `poster-ratio`, update `poster-format-badge`, set monitor aspect ratio, update `aria-pressed`, filename, and prompt. The underlying select remains import/export compatible.

- [ ] **Step 5: Keep reference and text modes exact**

Reference mode includes the chosen character/product/style lock. Text mode outputs the existing sentence `纯文字新建模式，不使用任何人物、商品或风格参考图` and must not retain hidden reference rules.

- [ ] **Step 6: Run the complete suite**

Expected: all tests pass with the previous poster prompt phrases and cross-workspace contracts unchanged.

- [ ] **Step 7: Commit the synchronized experience**

```bash
git add poster-app.js prompt-generator.test.js
git commit -m "feat: synchronize poster templates and monitor"
```

---

### Task 7: Add Accessible Resizable Columns and Project Persistence

**Files:**
- Modify: `poster-app.js`
- Modify: `prompt-generator.test.js`

**State additions:**

```js
state.layout = {
  leftWidth: 320,
  rightWidth: 500
};
```

- [ ] **Step 1: Add failing separator and persistence tests**

Require pointer handling, keyboard ArrowLeft/ArrowRight handling, double-click reset, min/max clamping, CSS variable updates, and `layout.leftWidth` / `layout.rightWidth` in both `exportState()` and `importState()`.

- [ ] **Step 2: Implement separator behavior**

Use Pointer Events with pointer capture. Clamp widths so the center remains at least 420px and outer panels remain usable. Update separator `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` whenever the layout changes.

- [ ] **Step 3: Add keyboard and reset support**

Arrow keys adjust by 8px, Shift+Arrow adjusts by 24px, and double-click restores 320px/500px. Separators are inactive and hidden at or below 1180px.

- [ ] **Step 4: Persist through the existing project state**

Add layout values to `aigcPosterWorkbench.exportState()`. In `importState()`, validate numeric values, clamp them against the current viewport, and fall back to defaults for older projects. Do not add a second localStorage key.

- [ ] **Step 5: Run the full suite**

Expected: all tests pass, including older project-state fixtures with no poster layout object.

- [ ] **Step 6: Commit the layout interaction**

```bash
git add poster-app.js prompt-generator.test.js
git commit -m "feat: persist resizable poster columns"
```

---

### Task 8: Browser Function and Visual QA

**Files:**
- Modify only if QA exposes a verified defect: `index.html`, `poster-three-column.css`, `poster-app.js`, `prompt-generator.test.js`
- Create locally: `output/playwright/poster-three-column/*.png`

- [ ] **Step 1: Start or verify the persistent local server**

Open:

```text
http://127.0.0.1:8766/index.html?workspace=poster&fresh=poster-three-column-qa-v1
```

If port 8766 is unavailable, start a static server on the next free port and use that port consistently for the remainder of QA.

- [ ] **Step 2: Test the full poster workflow at 1440x1024**

Verify all three purpose groups, all 13 templates, all six ratios, both source modes, three text modes, all four parameter groups, example, clear, copy, filename, and prompt updates. Confirm every selected template contributes one and only one composition rule.

- [ ] **Step 3: Test separators and persistence**

Drag both separators, use keyboard adjustment, double-click reset, refresh, switch projects, and reopen the project. Verify saved widths restore without shrinking the center below 420px.

- [ ] **Step 4: Capture responsive screenshots**

Capture the same meaningful state at:

- 1440×1024
- 1280×900
- 1024×900
- 390×844

Use filenames that include viewport and state. Confirm no clipping, overlapping text, unreachable controls, broken image, or horizontal page scroll.

- [ ] **Step 5: Perform side-by-side design QA**

Compare the 1440 screenshot against the approved three-column design specification and the established camera/casting visual language. Inspect panel proportions, image prominence, font sizes, prompt readability, color balance, density, spacing, border treatment, and empty space. Fix visual mismatches before accepting functional success.

- [ ] **Step 6: Check runtime health**

Confirm the browser console has no errors or warnings, all 13 image requests return successfully, keyboard focus is visible, and template/purpose/ratio controls expose correct accessible state.

- [ ] **Step 7: Run final automated verification**

```bash
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js
```

Expected: `PASS=...`, `FAIL=0`, with the pass count higher than the current baseline of 100.

- [ ] **Step 8: Review the final diff and commit QA fixes**

```bash
git diff --check
git status --short
git diff -- index.html poster-three-column.css poster-template-data.js poster-app.js prompt-generator.test.js
git add index.html poster-three-column.css poster-template-data.js poster-app.js prompt-generator.test.js assets/poster-templates
git commit -m "feat: complete poster three-column workbench"
```

Stage only files changed for this poster task. Do not stage `output/playwright/` screenshots or unrelated dirty files.

---

## Final Delivery Checklist

- [ ] The poster workspace is the only formal workspace visually changed.
- [ ] Existing poster IDs and `aigcPosterWorkbench` import/export behavior remain compatible.
- [ ] Film, social, and product groups each show relevant real bitmap templates.
- [ ] The monitor shows complete imagery and updates for template and ratio changes.
- [ ] Tone, lighting, and color remain single-select.
- [ ] Both separators work with pointer, keyboard, reset, and project persistence.
- [ ] Prompt text is readable and all actions remain reachable.
- [ ] 1440, 1280, 1024, and 390 screenshots pass visual QA.
- [ ] Browser console is clean and all template assets load locally.
- [ ] Node suite reports zero failures.
- [ ] A fresh local browser link is delivered to the user.

