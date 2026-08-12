# AI Poster Title-Mark Library Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the poster AI title-mark library from 24 templates in six categories to 48 templates in twelve categories, with combined local search, category filtering, favorites, persistence, and responsive browser QA.

**Architecture:** Keep structured title-mark content and state normalization in `poster-title-mark-data.js`; keep DOM rendering and events in the existing `poster-app.js` controller; add only the search/favorite surface to the existing title-mark library pane in `index.html`. Search and favorites affect browsing only and never enter the generated prompt.

**Tech Stack:** Static HTML, CSS, browser JavaScript, CommonJS-compatible data modules, Node assertion tests, in-app Browser Playwright.

## Global Constraints

- Preserve all existing 24 template IDs; add 24 new IDs without renaming old records.
- Ship exactly 48 templates in 12 categories, four templates per category.
- Do not load remote fonts, font CDNs, font files, external APIs, or image-generation APIs.
- Do not place film references, search terms, category labels, or commercial font names in generated prompts.
- Keep the current poster three-column layout and all existing public field IDs, project import/export behavior, and title-mark prompt structure.
- The text-layer drag editor is outside this implementation and receives a separate later plan.
- Use `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node` for Node commands.

---

### Task 1: Expand and Normalize the Structured Catalog

**Files:**
- Modify: `poster-title-mark-data.js`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: existing `TITLE_MARK_TEMPLATES`, `TITLE_MARK_METHODS`, and `normalizePosterTitleMarkState(saved)`.
- Produces: `buildTitleMarkSearchText(template)`, `filterTitleMarkTemplates({ category, query, favorites, favoritesOnly })`, plus normalized `titleMarkQuery`, `titleMarkFavorites`, and `titleMarkFavoritesOnly`.

- [ ] **Step 1: Write failing catalog tests**

Add tests requiring 48 unique records, 12 categories with four records each, all original IDs, combined search, favorite filtering, and bounded state:

```js
runTest("expanded title-mark catalog has twelve complete four-item categories", () => {
  assert.strictEqual(TITLE_MARK_TEMPLATES.length, 48);
  assert.strictEqual(Object.keys(TITLE_MARK_CATEGORIES).length, 12);
  assert.strictEqual(new Set(TITLE_MARK_TEMPLATES.map((item) => item.id)).size, 48);
  Object.keys(TITLE_MARK_CATEGORIES).forEach((category) => {
    assert.strictEqual(TITLE_MARK_TEMPLATES.filter((item) => item.category === category).length, 4, category);
  });
  ["eastern-cold-serif", "crime-cut-sans", "scifi-geometric-metal", "period-dark-gold", "literary-life-hand", "fantasy-starlight-serif"]
    .forEach((id) => assert(getTitleMarkTemplate(id), "missing legacy template " + id));
});

runTest("title-mark search and favorites combine without source mutation", () => {
  const before = TITLE_MARK_TEMPLATES.map((item) => item.id);
  assert(filterTitleMarkTemplates({ query: "手写" }).some((item) => item.id === "literary-life-hand"));
  assert(filterTitleMarkTemplates({ query: "金属" }).some((item) => item.material === "metal"));
  assert.deepStrictEqual(
    filterTitleMarkTemplates({ favorites: ["crime-cut-sans"], favoritesOnly: true }).map((item) => item.id),
    ["crime-cut-sans"]
  );
  assert.deepStrictEqual(TITLE_MARK_TEMPLATES.map((item) => item.id), before);
});
```

- [ ] **Step 2: Run tests and confirm RED**

Run:

```bash
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js
```

Expected: new tests fail because the catalog still has 24 templates and no browse-state helpers.

- [ ] **Step 3: Define the twelve-category dictionary**

Use these stable IDs:

```js
const TITLE_MARK_CATEGORIES = {
  eastern: "东方书法",
  commercial: "现代商业",
  crime: "悬疑犯罪",
  scifi: "科幻未来",
  retro: "年代复古",
  epic: "战争史诗",
  literary: "文艺手写",
  romance: "爱情青春",
  comedy: "喜剧活力",
  horror: "恐怖惊悚",
  fantasy: "奇幻动画",
  minimal: "极简概念"
};
```

Reassign old `period` records between `retro` and `epic`, and old `literary` records between `literary` and `minimal`, while retaining every old template ID. Add the 24 records listed in the approved spec, each with the existing complete field contract.

- [ ] **Step 4: Implement normalized search and favorites**

Add:

```js
function buildTitleMarkSearchText(template) {
  return [
    template.label,
    template.sampleTitle,
    template.sampleEnglish,
    TITLE_MARK_CATEGORIES[template.category],
    ...(template.genreHints || []),
    TITLE_MARK_SKELETONS[template.skeleton]?.label,
    TITLE_MARK_MATERIALS[template.material]?.label,
    ...(template.methods || []).flatMap((id) => [id, TITLE_MARK_METHODS[id]?.label])
  ].filter(Boolean).join(" ").toLocaleLowerCase("zh-CN");
}

function filterTitleMarkTemplates({ category = "all", query = "", favorites = [], favoritesOnly = false } = {}) {
  const normalizedQuery = String(query || "").trim().toLocaleLowerCase("zh-CN");
  const favoriteSet = new Set(Array.isArray(favorites) ? favorites : []);
  return TITLE_MARK_TEMPLATES.filter((item) => {
    if (category !== "all" && item.category !== category) return false;
    if (favoritesOnly && !favoriteSet.has(item.id)) return false;
    return !normalizedQuery || buildTitleMarkSearchText(item).includes(normalizedQuery);
  });
}
```

Extend normalization with an 80-character query, unique valid favorites, and `saved.titleMarkFavoritesOnly === true`. Export `buildTitleMarkSearchText`.

- [ ] **Step 5: Verify GREEN and commit**

Run syntax, full tests, and `git diff --check`. Commit only the data module and the exact test hunks for this task:

```bash
git add poster-title-mark-data.js prompt-generator.test.js
git commit -m "feat: expand AI title-mark catalog"
```

---

### Task 2: Add Search, Category, Favorite, and Empty-State UI

**Files:**
- Modify: `index.html`
- Modify: `poster-three-column.css`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: 12 category IDs from Task 1.
- Produces: `#poster-title-mark-query`, `#poster-title-mark-clear-query`, `#poster-title-mark-favorites-only`, `#poster-title-mark-empty`, 12 category buttons, and card-level favorite controls.

- [ ] **Step 1: Write a failing DOM contract test**

```js
runTest("expanded title-mark library exposes search favorites and twelve categories", () => {
  const html = fs.readFileSync("index.html", "utf8");
  ["poster-title-mark-query", "poster-title-mark-clear-query", "poster-title-mark-favorites-only", "poster-title-mark-empty"]
    .forEach((id) => assert.strictEqual((html.match(new RegExp('id=["\\\']' + id + '["\\\']', "g")) || []).length, 1, id));
  assert.strictEqual((html.match(/data-poster-title-mark-category=/g) || []).length, 13);
  const css = fs.readFileSync("poster-three-column.css", "utf8");
  [".poster-title-mark-toolbar", ".poster-title-mark-favorite", ".poster-title-mark-empty"]
    .forEach((token) => assert(css.includes(token), token));
});
```

- [ ] **Step 2: Run the suite and confirm only the new UI test fails**

Use the full Node command from Task 1.

- [ ] **Step 3: Add the compact browsing toolbar**

Inside `#poster-title-mark-library`, add a labeled local search field, clear icon button, “只看收藏” toggle, the 12 category buttons from the spec, and a hidden empty state. Keep “全部” as the thirteenth button.

- [ ] **Step 4: Add responsive styles**

Use a compact two-column toolbar, full-width search, square star button, and centered empty state:

```css
.poster-title-mark-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px;
  padding: 8px;
  border-bottom: 1px solid var(--poster-line);
  background: #f5f6f3;
}
.poster-title-mark-search { grid-column: 1 / -1; }
.poster-title-mark-search input { width: 100%; min-height: 34px; }
.poster-title-mark-template-card { position: relative; }
.poster-title-mark-favorite {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  width: 30px;
  height: 30px;
}
.poster-title-mark-empty { padding: 28px 16px; text-align: center; }
```

Add local CSS preview families for all new `previewClass` values. Do not load fonts or remote assets. Preserve the 272-pixel mobile card rail.

- [ ] **Step 5: Verify and commit**

Run full tests and `git diff --check`, then commit the exact UI files for this task:

```bash
git add index.html poster-three-column.css prompt-generator.test.js
git commit -m "feat: add title-mark library browsing controls"
```

---

### Task 3: Wire Combined Browsing, Favorites, and Persistence

**Files:**
- Modify: `poster-app.js`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: filter helpers from Task 1 and DOM IDs from Task 2.
- Produces: `visibleTitleMarkTemplates()`, `toggleTitleMarkFavorite(id)`, synchronized UI state, and import/export fields.

- [ ] **Step 1: Write a failing controller test**

```js
runTest("poster controller combines title-mark search categories and favorites", () => {
  const source = fs.readFileSync("poster-app.js", "utf8");
  ["visibleTitleMarkTemplates", "toggleTitleMarkFavorite", "titleMarkQuery", "titleMarkFavorites", "titleMarkFavoritesOnly", "data-poster-title-mark-favorite"]
    .forEach((token) => assert(source.includes(token), token));
  assert(source.includes('event.target.closest("[data-poster-title-mark-favorite]")'));
  assert(source.includes("event.stopPropagation()"));
});
```

- [ ] **Step 2: Run the suite and confirm RED**

Expected: the new controller test fails.

- [ ] **Step 3: Render one filtered source of truth**

Bind the four new controls and implement:

```js
function visibleTitleMarkTemplates() {
  return filterTitleMarkTemplates({
    category: state.titleMarkCategory,
    query: state.titleMarkQuery,
    favorites: state.titleMarkFavorites,
    favoritesOnly: state.titleMarkFavoritesOnly
  });
}

function toggleTitleMarkFavorite(id) {
  if (!getTitleMarkTemplate(id)) return;
  state.titleMarkFavorites = state.titleMarkFavorites.includes(id)
    ? state.titleMarkFavorites.filter((item) => item !== id)
    : [...state.titleMarkFavorites, id];
  state.copied = false;
  render();
  notifyWorkspaceDirty();
}
```

Because nested buttons are invalid, change each card outer element from `button` to `div role="option" tabindex="0"`. Keep full-card click and Enter/Space selection. Add an independent square star button with `aria-label` and `aria-pressed`.

- [ ] **Step 4: Add safe events and empty-state rendering**

Handle the favorite target before the card target, call `event.stopPropagation()`, and never change the selected template when starring. Search input updates the query; clear resets only the query; favorites-only toggles a strict boolean. Render count, clear-button visibility, pressed state, and empty state from `visibleTitleMarkTemplates()`.

- [ ] **Step 5: Persist browse state**

Add to `exportState()`:

```js
titleMarkQuery: state.titleMarkQuery,
titleMarkFavorites: [...state.titleMarkFavorites],
titleMarkFavoritesOnly: state.titleMarkFavoritesOnly,
```

Verify `importState()` restores the normalized values and `clearFields()` resets them through `normalizePosterTitleMarkState({})`.

- [ ] **Step 6: Verify prompt isolation and commit**

Run the full suite. Assert that prompts generated while searching contain no search text, favorite labels, or category metadata. Run `git diff --check`, then commit the exact controller hunks.

---

### Task 4: Real-Browser Interaction, Security, and Responsive QA

**Files:**
- Modify: `design-qa.md`
- Create: `.audit-20260719-poster-title-mark-expansion/responsive-qa.json`
- Create: `.audit-20260719-poster-title-mark-expansion/desktop-1440x1024.png`
- Create: `.audit-20260719-poster-title-mark-expansion/compact-820x1180.png`

**Interfaces:**
- Consumes: completed 48-template library and the running local site at port 8766.
- Produces: browser-verified release evidence and a cache-busted deliverable URL.

- [ ] **Step 1: Verify the server**

```bash
curl -I --max-time 3 "http://127.0.0.1:8766/index.html?workspace=poster&fresh=poster-title-mark-expansion-v1"
```

Expected: HTTP 200.

- [ ] **Step 2: Verify catalog and combined filters in the in-app Browser**

At 1440×1024 verify: “全部” shows 48 cards; every category shows four; search matches sample title, genre, skeleton, material, and method; search plus category narrows; no-result and clear search work; whole-card and keyboard selection work; starring does not select; “只看收藏” shows only favorites.

- [ ] **Step 3: Verify persistence and injection safety**

Favorite two templates, set a query and category, reload, and verify all values restore. Enter `<img src=x onerror=window.__titleMarkXss=1>` as the title and verify literal text, zero injected images, and no script execution. Confirm generated prompts contain no query or favorite metadata.

- [ ] **Step 4: Verify responsive layouts**

Check 1440×1024, 1280×900, 1024×900, 820×1180, and 390×844. Record client/scroll widths, card width, visible controls, and console errors. The 390-pixel page must have no document overflow and must retain the 272-pixel card rail.

- [ ] **Step 5: Save evidence and update QA**

Save desktop and compact screenshots, write exact results to `responsive-qa.json`, and append an “AI Poster Title-Mark Expansion Design QA” section to `design-qa.md`.

- [ ] **Step 6: Run final checks**

```bash
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --check poster-title-mark-data.js
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --check poster-app.js
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js
git diff --check
curl -sS -o /dev/null -w "%{http_code}\\n" "http://127.0.0.1:8766/index.html?workspace=poster&fresh=poster-title-mark-expansion-final-v1"
```

Expected: syntax checks exit 0, all tests pass, diff check exits 0, and curl prints `200`.

- [ ] **Step 7: Preserve the working branch**

Keep `codex/precision-workbench` and unrelated historical changes intact. Do not reset, delete, merge, or push unless the user explicitly requests it.

