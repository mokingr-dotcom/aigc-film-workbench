# Poster Title Typography Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 16-template bilingual movie-poster title design library that updates the local poster monitor, prompt output, and persisted project state.

**Architecture:** Add a standalone UMD data module for title-system content and normalization, then let the existing `poster-app.js` own UI state and composition. Extend the existing left library with a construction/title view switch, reuse the monitor canvas, and preserve all existing poster field IDs and storage contracts.

**Tech Stack:** Static HTML, CSS, browser JavaScript, CommonJS-compatible UMD data modules, Node `assert` regression tests, local Playwright/browser QA.

## Global Constraints

- Keep all data and preview styling local; no remote fonts or network runtime dependency.
- Do not copy protected film logos or package unlicensed commercial fonts.
- Reference films appear only as research metadata; generated prompts use abstracted design rules.
- Preserve the existing poster purpose, composition, ratio, source, copy, transfer, and project-state contracts.
- User-entered title text must never be injected as executable HTML.
- Do not modify the other five creative workspaces.

---

### Task 1: Title Template Data Contract

**Files:**
- Create: `poster-title-template-data.js`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Produces: `TITLE_CATEGORIES`, `TITLE_LANGUAGE_MODES`, `TITLE_MATERIALS`, `TITLE_TEMPLATES`, `DEFAULT_TITLE_TEMPLATE_ID`, `getTitleTemplate(id)`, `filterTitleTemplates(options)`, `normalizePosterTitleState(saved)`.
- Exposes the API as `window.aigcPosterTitleTemplateData` and `module.exports`.

- [ ] **Step 1: Write failing data tests**

Add tests that require the missing module and assert exactly 16 unique templates, 2-3 year-bearing references per template, complete Chinese/English/layout/hierarchy/prompt/negative rules, category and language filtering, and invalid-state normalization.

- [ ] **Step 2: Verify the tests fail for the missing module**

Run: `/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node prompt-generator.test.js`

Expected: FAIL with `Cannot find module './poster-title-template-data.js'`.

- [ ] **Step 3: Implement the data module**

Use the stable shape:

```js
{
  id: "cn-modern-song",
  label: "新宋体作者电影",
  category: "literary",
  languageModes: ["cn", "en", "bilingual"],
  genreHints: ["文艺", "现实", "爱情"],
  references: ["《好东西》(2024)", "《走走停停》(2024)", "《爱情神话》(2021)"],
  fontKey: "song",
  cnRule: "高对比新宋体，横细竖粗，标题字距舒展，转角保持清楚",
  enRule: "现代高反差衬线，小型大写，英文字符间距宽于中文",
  hierarchyRule: "中文主标题为一级，英文伴随标题为中文高度的18%至24%，宣传语为三级",
  layoutRule: "标题放入稳定留白区，基线严格对齐，不遮挡人物眼睛和关键物件",
  materialOptions: ["flat", "ink"],
  promptRule: "采用编辑式作者电影标题系统，中文与英文共享同一基线和留白逻辑",
  negativeRule: "不要廉价宋体默认排版，不要随机花体，不要中英文字重冲突",
  previewClass: "title-preview-modern-song"
}
```

`normalizePosterTitleState(saved)` must whitelist IDs and return defaults for malformed values.

- [ ] **Step 4: Run the suite and verify the data tests pass**

Run the same Node command. Expected: all tests PASS.

- [ ] **Step 5: Commit the data contract**

```bash
git add poster-title-template-data.js prompt-generator.test.js
git commit -m "feat: add bilingual poster title template catalog"
```

### Task 2: Accessible Title Library UI

**Files:**
- Modify: `index.html`
- Modify: `poster-three-column.css`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: the Task 1 global data API.
- Produces DOM contracts: `#poster-library-view`, `[data-poster-library-view]`, `#poster-title-filters`, `[data-poster-title-category]`, `[data-poster-title-language]`, and `#poster-title-template-list`.

- [ ] **Step 1: Write failing static contract tests**

Assert the new script loads before `poster-app.js`, both library tabs exist, title filters and list are labelled, the existing `#poster-template-list` remains, and CSS includes selected/focus/mobile states.

- [ ] **Step 2: Run tests and verify failure is caused by missing markup**

Run the full Node suite. Expected: FAIL on `#poster-library-view` or the title data script tag.

- [ ] **Step 3: Add the library view and title-template panel**

Keep `构图模板` active by default. Add full-surface buttons and semantic `aria-pressed`/`aria-selected` contracts. Do not add cards inside cards.

- [ ] **Step 4: Style the library with the existing poster visual system**

Use restrained paper/ink surfaces, 6px or smaller radii, stable card dimensions, two-line reference metadata, and horizontally scrollable compact filters on narrow screens.

- [ ] **Step 5: Run tests and commit**

```bash
git add index.html poster-three-column.css prompt-generator.test.js
git commit -m "feat: add poster title template browser"
```

### Task 3: Live Preview and Safe Rendering

**Files:**
- Modify: `poster-app.js`
- Modify: `poster-three-column.css`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: `getTitleTemplate`, `filterTitleTemplates`, and normalized title state.
- Produces: `selectTitleTemplate(id)`, title-card rendering, monitor classes, and safe user-text nodes.

- [ ] **Step 1: Write failing behavior/static tests**

Assert the controller renders title cards from data, full-card click and keyboard selection work, `previewClass` reaches the monitor, bilingual title markup exists, and user title values are passed through `escapeHtml` or assigned via `textContent` rather than raw HTML.

- [ ] **Step 2: Run tests and verify expected failures**

Expected: FAIL because the controller lacks title-library elements and title state.

- [ ] **Step 3: Implement title-library state and rendering**

Extend state with:

```js
titleLibraryView: "composition",
titleCategory: "all",
titleLanguage: "bilingual",
titleTemplate: DEFAULT_TITLE_TEMPLATE_ID
```

Render only the active library; preserve composition state while browsing titles. Map each title system to the legacy `poster-font` field.

- [ ] **Step 4: Implement monitor preview styles**

Render separate Chinese and English title elements, toggle them by language mode, apply the template preview class, current position and text color, and hide all title text in `visual-only` mode.

- [ ] **Step 5: Verify tests and commit**

```bash
git add poster-app.js poster-three-column.css prompt-generator.test.js
git commit -m "feat: preview poster title systems safely"
```

### Task 4: Prompt, Parameters, and Persistence

**Files:**
- Modify: `index.html`
- Modify: `poster-app.js`
- Modify: `poster-three-column.css`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Produces DOM contracts: `#poster-title-language`, `#poster-english-title`, `#poster-title-material`, `#poster-title-template-summary`, `#poster-title-references`.
- Extends `aigcPosterWorkbench.exportState()` and `importState(saved)` with six title fields.

- [ ] **Step 1: Write failing prompt and persistence tests**

Assert new fields exist once, prompt composition mentions the selected system but does not include reference film titles, export/import includes all six fields, malformed saved values are normalized, clear resets defaults, and the example loads a bilingual title.

- [ ] **Step 2: Verify tests fail on missing fields**

Run the full Node suite. Expected: FAIL on `#poster-english-title` or title-state exports.

- [ ] **Step 3: Add right-side title design controls**

Rename the group to `标题字设计`; keep the legacy font selector as `自定义字体方向`, then add language, English title, material, summary, and references.

- [ ] **Step 4: Compose the structured title prompt**

Generate in this order: text mode, exact titles, template rules, hierarchy/layout, material/color, template negative rule. Never inject the reference film list into the final prompt.

- [ ] **Step 5: Implement migration and state round-trip**

Use title-data normalization on import. Map old `font` values to the nearest title template while preserving old inputs. Notify workspace persistence on every title selection/filter change.

- [ ] **Step 6: Run tests and commit**

```bash
git add index.html poster-app.js poster-three-column.css prompt-generator.test.js
git commit -m "feat: integrate title systems with poster prompts"
```

### Task 5: Browser QA and Final Regression

**Files:**
- Modify: `design-qa.md`
- Create: `.audit-20260719-poster-title-library/` screenshots and snapshots
- Modify only if QA finds defects: `poster-app.js`, `poster-three-column.css`, `index.html`, `prompt-generator.test.js`

**Interfaces:**
- Verifies the complete feature; creates no new public runtime API.

- [ ] **Step 1: Run syntax and full regression tests**

```bash
NODE=/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node
$NODE --check poster-title-template-data.js
$NODE --check poster-app.js
$NODE prompt-generator.test.js
git diff --check
```

Expected: exit 0 and no `FAIL` lines.

- [ ] **Step 2: Test the full user flow in the real browser**

Open the poster workspace, switch to title templates, filter categories/languages, select at least one Chinese, one English and one bilingual template, edit both titles, switch all three text modes, copy the prompt, reload, and verify restored state.

- [ ] **Step 3: Capture visual QA at four widths**

Capture 1440x1024, 1280x900, 1024x900 and 390x844. Check that title cards, monitor typography, filters and right-side text remain reachable with no clipping, overlap, tiny copy or horizontal page overflow.

- [ ] **Step 4: Run an injection safety check**

Enter `<img src=x onerror=window.__posterXss=1>` as the title and assert `window.__posterXss` remains unset while the literal text is visible.

- [ ] **Step 5: Fix any QA defects and repeat verification**

Repeat the full commands and affected screenshots after every correction. Record final observations and fresh local URL in `design-qa.md`.

- [ ] **Step 6: Commit the verified feature**

```bash
git add poster-title-template-data.js index.html poster-app.js poster-three-column.css prompt-generator.test.js design-qa.md .audit-20260719-poster-title-library
git commit -m "feat: deliver poster title typography library"
```
