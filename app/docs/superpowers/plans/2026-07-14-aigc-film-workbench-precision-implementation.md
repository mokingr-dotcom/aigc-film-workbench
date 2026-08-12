# AIGC Film Workbench Precision Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the existing local AIGC film prompt workspace in the approved "电影精密仪器" direction while preserving all prompt data, generation logic, project storage, transfers, and copy workflows.

**Architecture:** Keep the current static HTML, native CSS, and vanilla JavaScript application. Introduce one final `precision-theme.css` layer as the single visual contract, stop loading `archive.css`, and make only narrowly scoped markup changes where a workspace needs a real three-panel structure. Preserve all existing element IDs and data attributes so current JavaScript contracts remain stable.

**Tech Stack:** HTML5, CSS Grid/Flexbox, vanilla JavaScript, local Lucide bundle, Node.js built-in test runner, Python static server, in-app Browser visual QA.

## Global Constraints

- Product remains a professional prompt reference and production workbench, not a marketing page or Agent system.
- Desktop tone layout is 30% / 42% / 28%; center may not exceed 44% of the content width.
- Palette is fixed to `#EEF0F2`, `#F8F8F6`, `#FFFFFF`, `#20252A`, `#687078`, `#CBD0D4`, `#245F9C`, `#E6EDF5`, `#181C20`, and `#9B6636`.
- Use PingFang SC first and existing local Lucide icons; do not add network dependencies or handcrafted SVG icons.
- Default tone selection remains one item; blend mode is explicit and capped at two items.
- Keep all existing prompt data files and data field contracts unchanged.
- Do not add login, billing, cloud storage, nodes, or Agent features.
- All content must stay readable at 1440×1024, 1180×820, and 390×844 without horizontal overflow or text overlap.

## File Map

- Create `precision-theme.css`: approved tokens, shared shell, five workspace layouts, responsive rules, and reduced-motion rules.
- Modify `index.html`: load the new theme, update product copy, add semantic wrappers for camera/poster output structure, preserve IDs.
- Modify `app.js`: add stable reference preview markup while preserving search, selection, and prompt APIs.
- Modify `ui-motion.js`: consistent copy confirmation and workspace transition states.
- Modify `prompt-generator.test.js`: structural and regression coverage for the approved design contract.
- Keep `style.css` and `look-studio.css`: functional base only during this pass; do not expand their visual responsibilities.
- Stop loading `archive.css`: retain the file temporarily for rollback, then remove it after final visual verification.

---

### Task 1: Lock The New Theme Contract With Failing Tests

**Files:**
- Modify: `prompt-generator.test.js`
- Modify: `index.html`
- Create: `precision-theme.css`

**Interfaces:**
- Consumes: existing `index.html` stylesheet chain.
- Produces: `precision-theme.css` loaded last; `archive.css` absent from the active stylesheet chain.

- [ ] **Step 1: Add a failing theme-contract test**

Append this test to `prompt-generator.test.js`:

```js
runTest("precision theme is the only active visual override", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const theme = fs.readFileSync("precision-theme.css", "utf8");
  assert(html.includes('href="precision-theme.css?v=20260714-precision-v1"'));
  assert(!html.includes('href="archive.css'));
  [
    "--precision-canvas: #eef0f2",
    "--precision-panel: #f8f8f6",
    "--precision-ink: #20252a",
    "--precision-blue: #245f9c",
    "--precision-monitor: #181c20",
  ].forEach((token) => assert(theme.toLowerCase().includes(token)));
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test prompt-generator.test.js
```

Expected: FAIL because `precision-theme.css` does not exist or is not loaded.

- [ ] **Step 3: Create the minimal theme and switch the stylesheet link**

Create `precision-theme.css` with this initial contract:

```css
:root {
  color-scheme: light;
  --precision-canvas: #eef0f2;
  --precision-panel: #f8f8f6;
  --precision-input: #ffffff;
  --precision-ink: #20252a;
  --precision-muted: #687078;
  --precision-line: #cbd0d4;
  --precision-blue: #245f9c;
  --precision-blue-soft: #e6edf5;
  --precision-monitor: #181c20;
  --precision-copper: #9b6636;
  --command-height: 64px;
}

html, body {
  min-width: 320px;
  background: var(--precision-canvas);
  color: var(--precision-ink);
}
```

Replace the final stylesheet in `index.html`:

```html
<link rel="stylesheet" href="precision-theme.css?v=20260714-precision-v1">
```

- [ ] **Step 4: Run the full test suite**

Run the Node test command from Step 2.

Expected: all tests PASS, including `precision theme is the only active visual override`.

- [ ] **Step 5: Commit the theme contract**

```bash
git add index.html precision-theme.css prompt-generator.test.js
git commit -m "refactor: establish precision theme contract"
```

---

### Task 2: Rebuild The Global Command Bar And Shared Controls

**Files:**
- Modify: `index.html`
- Modify: `precision-theme.css`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: existing `.workspace-header`, `.mode-switch`, `.mode-button`, `.project-strip`, `.button`, `.field`, `.segmented` markup.
- Produces: a 64px command bar and shared visual primitives used by all five workspaces.

- [ ] **Step 1: Add a failing shell test**

```js
runTest("precision shell exposes one compact professional command bar", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const theme = fs.readFileSync("precision-theme.css", "utf8");
  assert(html.includes("AIGC电影视觉工作台"));
  ["影调", "15秒运镜", "角色定妆", "海报", "画面反推"].forEach((label) => assert(html.includes(`>${label}<`) || html.includes(`>${label}`)));
  assert(theme.includes("--command-height: 64px"));
  assert(theme.includes("grid-template-columns: minmax(220px, 260px) minmax(520px, 1fr) minmax(250px, 320px)"));
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run the full Node test command.

Expected: FAIL because the exact product copy and grid contract are absent.

- [ ] **Step 3: Update header copy without changing behavior hooks**

In `index.html`, use:

```html
<div class="workspace-brand">
  <strong>AIGC电影视觉工作台</strong>
  <span>影调 · 镜头 · 角色 · 视觉物料</span>
</div>
```

Change only visible module labels to `影调`, `15秒运镜`, `角色定妆`, `海报`, and `画面反推`; preserve every `data-workspace`, `role`, `aria-selected`, and element ID.

- [ ] **Step 4: Add the shared shell and control rules**

Add to `precision-theme.css`:

```css
body { padding: var(--command-height) 0 0; font-family: "PingFang SC", "Noto Sans SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }

.workspace-header.workspace-commandbar {
  position: fixed;
  inset: 0 0 auto;
  z-index: 100;
  display: grid;
  grid-template-columns: minmax(220px, 260px) minmax(520px, 1fr) minmax(250px, 320px);
  height: var(--command-height);
  border: 0;
  border-bottom: 1px solid var(--precision-line);
  border-radius: 0;
  background: rgba(248, 248, 246, .96);
  box-shadow: none;
  backdrop-filter: saturate(1.1) blur(14px);
}

.button, .icon-button, input, select, textarea, .segment, .tab {
  border-radius: 5px;
  box-shadow: none;
}

.button.primary, .segment.active, .tab.active {
  border-color: var(--precision-blue);
  background: var(--precision-blue);
  color: #fff;
}
```

Complete header spacing, nav selected underline, focus-visible outlines, disabled states, and project-strip truncation using the same tokens.

- [ ] **Step 5: Run tests and commit**

Run the full Node test command; expect PASS.

```bash
git add index.html precision-theme.css prompt-generator.test.js
git commit -m "feat: rebuild precision command bar"
```

---

### Task 3: Rebuild The Tone Library, Monitor, And Composer

**Files:**
- Modify: `app.js`
- Modify: `precision-theme.css`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: `upgradeItem(item)`, `renderReferenceFilms(item)`, `renderPromptDetails(item)`, `state.selected`, `state.blendMode`.
- Produces: `renderResultPreview(item): string`; stable `.result-preview`, `.result-copy`, `.look-preview-pane`, and `.composer-pane` surfaces.

- [ ] **Step 1: Add failing layout and preview tests**

```js
runTest("tone workspace uses the approved readable three-panel contract", () => {
  const theme = fs.readFileSync("precision-theme.css", "utf8");
  const app = fs.readFileSync("app.js", "utf8");
  assert(theme.includes("grid-template-columns: minmax(340px, .95fr) minmax(500px, 1.2fr) minmax(400px, 1fr)"));
  assert(theme.includes(".result-preview"));
  assert(theme.includes("overflow: visible"));
  assert(app.includes("function renderResultPreview"));
  assert(app.includes('class="result-preview"'));
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run the full Node test command.

Expected: FAIL because `renderResultPreview` and the approved grid are absent.

- [ ] **Step 3: Add deterministic preview markup**

Add near the other render helpers in `app.js`:

```js
function renderResultPreview(item) {
  const text = `${item.name || ""} ${item.color || ""} ${item.lighting || ""}`;
  const grade = /暖|金|琥珀|夕阳/.test(text) ? "warm"
    : /黑白|单色/.test(text) ? "mono"
      : /红|朱砂/.test(text) ? "red"
        : /绿|青/.test(text) ? "green" : "cool";
  return `<span class="result-preview" data-grade="${grade}" aria-hidden="true"><img src="assets/cinematic-control-room.jpg" alt=""></span>`;
}
```

Insert `renderResultPreview(upgraded)` before the textual result body in `renderResults()`. Do not change click, keyboard, favorite, or selection handlers.

- [ ] **Step 4: Implement the approved three-panel CSS**

Add the exact desktop grid:

```css
#tone-workspace.app-shell {
  display: grid;
  grid-template-columns: minmax(340px, .95fr) minmax(500px, 1.2fr) minmax(400px, 1fr);
  width: min(1680px, 100%);
  height: calc(100vh - var(--command-height));
  margin: 0 auto;
  overflow: hidden;
}
```

Then style the result list as continuous rows, the selected row with a 3px blue left indicator, the monitor at `aspect-ratio: 2.1 / 1`, and the composer with a sticky three-command toolbar. Set result summary, references, audit, and detail values to `max-height: none`, `overflow: visible`, and normal wrapping.

- [ ] **Step 5: Verify single-selection behavior remains intact**

Run:

```bash
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test prompt-generator.test.js
```

Expected: PASS for both `tone selection defaults to one look and bounds deliberate blending` and the new tone-layout test.

- [ ] **Step 6: Commit the tone workspace**

```bash
git add app.js precision-theme.css prompt-generator.test.js
git commit -m "feat: rebuild precision tone workspace"
```

---

### Task 4: Convert The 15-Second Camera Workspace To Three Panels

**Files:**
- Modify: `index.html`
- Modify: `precision-theme.css`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: all existing camera element IDs queried by `camera-app.js`.
- Produces: `.camera-library`, `.camera-stage`, and `.camera-composer` as 32% / 40% / 28% panels.

- [ ] **Step 1: Add a failing camera-layout test**

```js
runTest("camera workspace separates library timeline and prompt output", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const theme = fs.readFileSync("precision-theme.css", "utf8");
  assert(html.includes('class="camera-stage"'));
  assert(html.includes('class="camera-beat-strip"'));
  ["0-4秒", "4-8秒", "8-12秒", "12-15秒"].forEach((beat) => assert(html.includes(beat)));
  assert(theme.includes("grid-template-columns: minmax(300px, 32fr) minmax(420px, 40fr) minmax(340px, 28fr)"));
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run the full Node test command.

Expected: FAIL because `.camera-stage` and the beat strip do not exist.

- [ ] **Step 3: Reorganize existing camera markup without changing IDs**

Inside `#camera-workspace`, keep `.camera-library` first. Add a `.camera-stage` section containing `#camera-selection`, `.camera-form-grid`, validation, and this non-editing orientation strip:

```html
<div class="camera-beat-strip" aria-label="15秒镜头节奏">
  <span><b>0-4秒</b>建立</span>
  <span><b>4-8秒</b>推进</span>
  <span><b>8-12秒</b>转折</span>
  <span><b>12-15秒</b>落点</span>
</div>
```

Keep `.camera-composer` as the third section with `.camera-toolbar` and `#camera-output`. Preserve every queried camera ID.

- [ ] **Step 4: Add the camera grid and panel rules**

```css
.camera-shell {
  display: grid;
  grid-template-columns: minmax(300px, 32fr) minmax(420px, 40fr) minmax(340px, 28fr);
  height: calc(100vh - var(--command-height));
  overflow: hidden;
}

.camera-library, .camera-stage, .camera-composer {
  min-width: 0;
  overflow: auto;
  border-right: 1px solid var(--precision-line);
  background: var(--precision-panel);
}
```

Style `.camera-beat-strip` as four fixed tracks using separators, not four floating cards.

- [ ] **Step 5: Run tests and commit**

Run the full Node test command; expect PASS.

```bash
git add index.html precision-theme.css prompt-generator.test.js
git commit -m "feat: add precision camera staging layout"
```

---

### Task 5: Unify Casting, Poster, And Reverse Workspaces

**Files:**
- Modify: `index.html`
- Modify: `precision-theme.css`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: existing `.casting-shell`, `.poster-shell`, `.reverse-shell` and all form/output IDs.
- Produces: consistent control, preview, and output surfaces without changing generation logic.

- [ ] **Step 1: Add failing workspace-ratio tests**

```js
runTest("supporting workspaces share precision layout ratios", () => {
  const theme = fs.readFileSync("precision-theme.css", "utf8");
  assert(theme.includes(".casting-shell"));
  assert(theme.includes("grid-template-columns: minmax(430px, 42fr) minmax(560px, 58fr)"));
  assert(theme.includes(".poster-shell"));
  assert(theme.includes("grid-template-columns: minmax(400px, 40fr) minmax(340px, 34fr) minmax(320px, 26fr)"));
  assert(theme.includes(".reverse-shell"));
  assert(theme.includes("grid-template-columns: minmax(420px, 40fr) minmax(560px, 60fr)"));
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run the full Node test command.

Expected: FAIL because exact ratios are absent.

- [ ] **Step 3: Add a real poster preview/output split**

In `index.html`, keep `.poster-controls` first. Split the existing poster output content into:

```html
<section class="poster-preview-panel" aria-label="海报视觉预览">...</section>
<section class="poster-output-panel" aria-label="海报提示词输出">...</section>
```

Move existing nodes only; preserve `#poster-preview`, `#poster-output`, `#poster-copy`, and every current ID.

- [ ] **Step 4: Add exact layout rules**

```css
.casting-shell { grid-template-columns: minmax(430px, 42fr) minmax(560px, 58fr); }
.poster-shell { grid-template-columns: minmax(400px, 40fr) minmax(340px, 34fr) minmax(320px, 26fr); }
.reverse-shell { grid-template-columns: minmax(420px, 40fr) minmax(560px, 60fr); }
```

Make each shell a full-height grid. Use the shared panel, section-heading, field, segmented-control, status, checklist, and output styles. Keep deep color only inside `.casting-board-preview`, `.poster-preview-canvas`, and `.reverse-upload-preview` when an image is present.

- [ ] **Step 5: Run tests and commit**

Run the full Node test command; expect PASS for existing casting, poster, reverse, and new ratio tests.

```bash
git add index.html precision-theme.css prompt-generator.test.js
git commit -m "feat: unify supporting precision workspaces"
```

---

### Task 6: Standardize Copy Feedback, Focus, And Motion

**Files:**
- Modify: `ui-motion.js`
- Modify: `precision-theme.css`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: copy button IDs in `ui-motion.js`, `#workspace-toast`, `.workspace-view`, `.result`.
- Produces: `showCopyState(button, label)` and consistent reduced-motion-safe state changes.

- [ ] **Step 1: Add failing interaction tests**

```js
runTest("precision interactions expose copy and reduced-motion feedback", () => {
  const motion = fs.readFileSync("ui-motion.js", "utf8");
  const theme = fs.readFileSync("precision-theme.css", "utf8");
  assert(motion.includes("function showCopyState"));
  assert(motion.includes("已复制"));
  assert(theme.includes("@media (prefers-reduced-motion: reduce)"));
  assert(theme.includes(":focus-visible"));
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run the full Node test command.

Expected: FAIL because `showCopyState` is not defined.

- [ ] **Step 3: Add one shared copy-state helper**

Add to `ui-motion.js`:

```js
function showCopyState(button, label = "已复制") {
  if (!button || button.disabled) return;
  const previous = button.dataset.defaultLabel || button.textContent.trim();
  button.dataset.defaultLabel = previous;
  button.textContent = label;
  button.classList.add("is-confirmed");
  window.clearTimeout(button._copyTimer);
  button._copyTimer = window.setTimeout(() => {
    button.textContent = previous;
    button.classList.remove("is-confirmed");
  }, 1200);
}
```

Call it from the existing copy-button listeners after a successful copy event. Do not duplicate clipboard writes already owned by workspace scripts.

- [ ] **Step 4: Add motion and focus rules**

Use 140ms selection transitions, 180ms monitor crossfades, and 160-220ms workspace entry. Add a visible 2px blue focus outline. Under reduced motion, set transition and animation duration to `0.01ms` while preserving selected, copied, and focused colors.

- [ ] **Step 5: Run tests and commit**

Run the full Node test command; expect PASS.

```bash
git add ui-motion.js precision-theme.css prompt-generator.test.js
git commit -m "feat: standardize precision interaction feedback"
```

---

### Task 7: Implement Responsive Layouts Without Hidden Information

**Files:**
- Modify: `precision-theme.css`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: all precision workspace grids.
- Produces: explicit 1320px, 1180px, and 760px breakpoints.

- [ ] **Step 1: Add failing responsive-contract tests**

```js
runTest("precision theme keeps core information visible at every breakpoint", () => {
  const theme = fs.readFileSync("precision-theme.css", "utf8");
  ["@media (max-width: 1320px)", "@media (max-width: 1180px)", "@media (max-width: 760px)"].forEach((query) => assert(theme.includes(query)));
  assert(theme.includes('grid-template-areas:\n      "library preview"\n      "composer composer"'));
  assert(!theme.includes(".library-pane { display: none"));
  assert(!theme.includes(".composer-pane { display: none"));
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run the full Node test command.

Expected: FAIL until all three exact breakpoint contracts exist.

- [ ] **Step 3: Implement the 1181-1320px desktop contraction**

Keep three tone columns at `340px minmax(440px, 1fr) 400px`. Hide only English module subtitles and nonessential project status copy; keep Chinese labels and actions visible.

- [ ] **Step 4: Implement the 761-1180px two-row contract**

Use:

```css
#tone-workspace.app-shell {
  grid-template-columns: 350px minmax(0, 1fr);
  grid-template-areas:
    "library preview"
    "composer composer";
  height: auto;
  overflow: visible;
}
```

Apply equivalent stacked output behavior to camera, casting, poster, and reverse workspaces. Do not hide a core panel.

- [ ] **Step 5: Implement the 760px mobile contract**

Move the five module buttons to a fixed 66px bottom navigation, show the brand and project button at the top, and stack every workspace section. Set `min-width: 0`, `max-width: 100%`, and normal wrapping on inputs, buttons, selected chips, reference lines, and output text.

- [ ] **Step 6: Run tests and commit**

Run the full Node test command; expect PASS.

```bash
git add precision-theme.css prompt-generator.test.js
git commit -m "feat: add readable precision breakpoints"
```

---

### Task 8: Remove Active Legacy Overrides And Complete QA

**Files:**
- Modify: `index.html`
- Delete after verification: `archive.css`
- Modify: `design-qa.md`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: complete precision theme and all existing workspace functionality.
- Produces: one active visual override, verified local delivery, and a durable QA record.

- [ ] **Step 1: Add the final legacy-removal test**

```js
runTest("legacy archive theme is retired", () => {
  const html = fs.readFileSync("index.html", "utf8");
  assert(!html.includes("archive.css"));
  assert(fs.existsSync("precision-theme.css"));
});
```

- [ ] **Step 2: Run JavaScript and full regression checks**

```bash
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --check app.js
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --check look-studio.js
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --check camera-app.js
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --check casting-app.js
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --check poster-app.js
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --check reverse-app.js
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test prompt-generator.test.js
git diff --check
```

Expected: every command exits 0 and all tests PASS.

- [ ] **Step 3: Verify local delivery**

Start or reuse the static server:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Verify:

```bash
curl -I http://127.0.0.1:8765/index.html
curl -I http://127.0.0.1:8765/precision-theme.css
```

Expected: both responses are `200 OK`.

- [ ] **Step 4: Complete in-app Browser visual QA**

Open `http://127.0.0.1:8765/index.html` in the in-app Browser. At 1440×1024, 1180×820, and 390×844 verify:

- Header labels fit and active module is obvious.
- Left and right tone rails are complete; center is at most 44% on desktop.
- Reference copy, representative films, and prompt output do not clip.
- Five workspaces switch correctly.
- Search, tone replacement, blend cap, transfer buttons, copy feedback, and project dialog work.
- No horizontal overflow, overlap, inaccessible focus state, or layout shift.

Record pass/fail and exact viewport observations in `design-qa.md`. If the in-app Browser connection is unavailable, record the connection error and do not claim visual verification.

- [ ] **Step 5: Remove the retired archive file after visual pass**

Delete `archive.css` with `apply_patch` only after Step 4 passes. Re-run the complete checks from Step 2 and verify `test ! -e archive.css` exits 0.

- [ ] **Step 6: Commit final cleanup and QA**

```bash
git add index.html precision-theme.css prompt-generator.test.js design-qa.md
git commit -m "chore: complete precision redesign verification"
```

Expected: clean diff check, all tests PASS, and `design-qa.md` records all three viewport results.
