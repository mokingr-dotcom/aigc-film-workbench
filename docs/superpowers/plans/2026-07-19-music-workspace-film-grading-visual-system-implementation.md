# Music Workspace Film-Grading Visual System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild only the music-scoring workspace to match the selected film-grading-room design while preserving all existing prompt, project, filter, instrument, adapter, copy, and resize behavior.

**Architecture:** Keep the static HTML and vanilla JavaScript application. Replace `music-workspace.css` in place, use the existing `html[data-active-workspace="music"]` hook for music-only command-bar styling, and add only the presentational markup and UI state required by the selected design. Do not create another theme layer or change the other five workspaces.

**Tech Stack:** HTML5, scoped CSS, vanilla JavaScript, Node.js assertions, Python static server, Playwright CLI, Product Design design-QA.

## Global Constraints

- The only visual target is `design-references/music-workspace-selected-film-grading-room.png` at a 1440 x 1024 comparison viewport.
- Scope is the music workspace and its active command-bar state only.
- Preserve all existing IDs, `data-workspace`, `window.aigcMusicWorkbench`, project persistence, and prompt output behavior.
- Desktop column intent is `28% / 38% / 34%`; valid user-resized widths remain persisted.
- Palette roles are fixed: canvas `#EEEDE8`, paper `#FBFAF6`, nav `#20231F`, primary `#4D6251`, amber `#B5813F`, danger `#7A3F42`, selected surface `#E7ECE6`, text `#252622`, muted text `#706F68`.
- Chinese body and control text remains in the system sans-serif stack; body text is at least 14px and auxiliary text at least 12px.
- Controls use 4px radii; case and output surfaces use no more than 5px.
- No audio API, generation, playback, upload, waveform, new dependency, global theme file, or unrelated workspace redesign.
- Unit tests do not replace screenshot comparison against the selected visual target.

---

### Task 1: Lock the Visual Contract in Tests

**Files:**
- Modify: `prompt-generator.test.js`
- Read: `docs/superpowers/specs/2026-07-19-music-workspace-film-grading-visual-system-design.md`

**Interfaces:**
- Consumes: `index.html`, `music-workspace.css`, and `music-app.js` as text fixtures.
- Produces: structural assertions that later tasks must satisfy.

- [ ] **Step 1: Add failing structural assertions**

Add this block near the existing music assertions:

```js
const musicMarkup = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const musicCss = fs.readFileSync(path.join(__dirname, "music-workspace.css"), "utf8");
const musicAppSource = fs.readFileSync(path.join(__dirname, "music-app.js"), "utf8");

assert(musicMarkup.includes('class="music-mobile-switch"'));
assert(musicMarkup.includes('class="music-status-bar"'));
assert(musicMarkup.includes('id="music-status-project"'));
assert(musicMarkup.includes('id="music-status-duration"'));
assert(musicMarkup.includes('id="music-status-tempo"'));
assert(musicMarkup.includes('id="music-status-meter"'));
assert(musicCss.includes("--music-canvas: #eeede8"));
assert(musicCss.includes("--music-paper: #fbfaf6"));
assert(musicCss.includes("--music-nav: #20231f"));
assert(musicCss.includes("--music-primary: #4d6251"));
assert(musicCss.includes("--music-amber: #b5813f"));
assert(musicCss.includes('html[data-active-workspace="music"]'));
assert(musicCss.includes("@media (prefers-reduced-motion: reduce)"));
assert(musicAppSource.includes("data-music-mobile-pane"));
assert(musicAppSource.includes("music-template-thumb"));
```

- [ ] **Step 2: Verify the new test fails**

Run:

```bash
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node prompt-generator.test.js
```

Expected: FAIL on the first missing music visual-contract assertion.

- [ ] **Step 3: Commit the failing contract**

```bash
git add prompt-generator.test.js
git commit -m "test: define music workspace visual contract"
```

---

### Task 2: Add Cue Cards, Pane Controls, and Real Status Markup

**Files:**
- Modify: `index.html:955-985`
- Modify: `music-app.js:12-27, 74-87, 122-140, 194-216`
- Test: `prompt-generator.test.js`

**Interfaces:**
- Consumes: `MUSIC_TEMPLATES`, normalized music state, `#project-name`, and existing case-selection events.
- Produces: `.music-template-thumb`, `.music-cue-number`, `[data-music-mobile-pane]`, four status IDs, and `workspace.dataset.mobilePane`.

- [ ] **Step 1: Add the pane switch as the first music-workspace child**

```html
<nav class="music-mobile-switch" aria-label="音乐工作区分区">
  <button type="button" class="active" data-music-mobile-pane="library" aria-pressed="true">案例</button>
  <button type="button" data-music-mobile-pane="design" aria-pressed="false">设计</button>
  <button type="button" data-music-mobile-pane="output" aria-pressed="false">输出</button>
</nav>
```

- [ ] **Step 2: Add the bottom status bar after the output panel**

```html
<footer class="music-status-bar" aria-label="当前配乐状态">
  <span>项目：<strong id="music-status-project">未命名电影项目</strong></span>
  <span>时长：<strong id="music-status-duration">15 秒</strong></span>
  <span>速度：<strong id="music-status-tempo">慢速</strong></span>
  <span>拍号：<strong id="music-status-meter">4/4</strong></span>
</footer>
```

- [ ] **Step 3: Cache the new elements**

Add to `elements` in `music-app.js`:

```js
mobilePaneButtons: [...document.querySelectorAll("[data-music-mobile-pane]")],
projectName: $("project-name"),
statusProject: $("music-status-project"),
statusDuration: $("music-status-duration"),
statusTempo: $("music-status-tempo"),
statusMeter: $("music-status-meter")
```

- [ ] **Step 4: Render stable cue-sheet imagery without changing music data**

Add a visual-only image list:

```js
const MUSIC_CASE_ART = [
  "assets/poster-templates/film-negative-space.jpg",
  "assets/poster-templates/product-hero.jpg",
  "assets/poster-templates/film-diagonal-action.jpg",
  "assets/poster-templates/film-character-world.jpg",
  "assets/poster-templates/film-object-symbol.jpg",
  "assets/poster-templates/film-portrait-close.jpg"
];
```

Change `templates.map((item) => {` to `templates.map((item, index) => {` and wrap the existing header, paragraph, and definition list beside:

```js
const cue = String(index + 1).padStart(2, "0");
const image = MUSIC_CASE_ART[index % MUSIC_CASE_ART.length];
const thumbnail = `<div class="music-template-thumb"><img src="${image}" alt="" loading="lazy"><span class="music-cue-number">CUE ${cue}</span></div>`;
```

The empty image alt avoids repeating the adjacent card label. Preserve the favorite button and whole-card click behavior exactly.

- [ ] **Step 5: Synchronize status values from real state**

```js
function durationStatusText() {
  if (state.durationMode === "natural") return "自然结束";
  if (state.duration >= 60 && state.duration % 60 === 0) return `${state.duration / 60} 分钟`;
  return `${state.duration} 秒`;
}

function syncStatusBar() {
  elements.statusProject.textContent = elements.projectName.value.trim() || "未命名电影项目";
  elements.statusDuration.textContent = durationStatusText();
  elements.statusTempo.textContent = D.MUSIC_DICTIONARY[state.tempoFeel]?.zh || "";
  elements.statusMeter.textContent = state.meter || "";
}
```

Call `syncStatusBar()` inside `renderAll()`. Add an `input` listener on `projectName` that updates only `statusProject`.

- [ ] **Step 6: Add UI-only mobile pane switching**

```js
elements.mobilePaneButtons.forEach((button) => button.addEventListener("click", () => {
  const pane = button.dataset.musicMobilePane;
  elements.workspace.dataset.mobilePane = pane;
  elements.mobilePaneButtons.forEach((item) => {
    const active = item === button;
    item.classList.toggle("active", active);
    item.setAttribute("aria-pressed", String(active));
  });
}));
elements.workspace.dataset.mobilePane = "library";
```

Do not export this UI-only preference in project state.

- [ ] **Step 7: Verify JavaScript and structural progress**

```bash
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --check music-app.js
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node prompt-generator.test.js
```

Expected: syntax passes; only CSS contract assertions remain failing.

- [ ] **Step 8: Commit the semantic UI additions**

```bash
git add index.html music-app.js prompt-generator.test.js
git commit -m "feat: add music cue cards and workspace status"
```

---

### Task 3: Replace the Music Visual System In Place

**Files:**
- Modify: `music-workspace.css:1-131`
- Modify: `index.html:15`
- Test: `prompt-generator.test.js`

**Interfaces:**
- Consumes: current music class names, Task 2 cue/status classes, `html[data-active-workspace="music"]`, and the two existing layout CSS variables.
- Produces: selected palette, desktop shell, music-only command bar, readable form hierarchy, output ledger, focus rules, and reduced-motion rules.

- [ ] **Step 1: Replace the root tokens and desktop grid**

```css
html[data-active-workspace="music"] {
  --music-canvas: #eeede8;
  --music-paper: #fbfaf6;
  --music-nav: #20231f;
  --music-primary: #4d6251;
  --music-primary-soft: #e7ece6;
  --music-amber: #b5813f;
  --music-danger: #7a3f42;
  --music-ink: #252622;
  --music-muted: #706f68;
  --music-line: rgb(37 38 34 / 16%);
}

#music-workspace {
  --music-left-width: 400px;
  --music-right-width: 490px;
  display: grid;
  grid-template-columns: var(--music-left-width) 6px minmax(430px, 1fr) 6px var(--music-right-width);
  grid-template-rows: minmax(0, 1fr) 34px;
  height: calc(100vh - 66px);
  min-height: 640px;
  overflow: hidden;
  color: var(--music-ink);
  background: var(--music-canvas);
}
```

Put panels and resizers in row 1; put `.music-status-bar` in `grid-column: 1 / -1; grid-row: 2`.

- [ ] **Step 2: Scope the dark command bar to active music only**

```css
html[data-active-workspace="music"] .workspace-header.workspace-commandbar {
  border-bottom-color: rgb(255 255 255 / 12%);
  background: var(--music-nav);
}

html[data-active-workspace="music"] .workspace-header .mode-button.active {
  border-bottom-color: var(--music-amber);
  color: #fbfaf6;
}
```

Style the music-active brand, inactive modes, search, project field, save state, and icon buttons within the same HTML data scope. Do not edit `tone-option2.css`.

- [ ] **Step 3: Implement readable typography and controls**

```css
#music-workspace .music-panel-header h1,
#music-workspace .music-panel-header h2 {
  margin: 4px 0 6px;
  font-size: 23px;
  line-height: 1.25;
  font-weight: 700;
}

#music-workspace .music-field {
  gap: 7px;
  color: var(--music-muted);
  font-size: 12px;
  font-weight: 650;
}

#music-workspace :is(input, select, textarea) {
  min-height: 42px;
  border: 1px solid var(--music-line);
  border-radius: 4px;
  background: #fffefa;
  color: var(--music-ink);
  padding: 10px 12px;
  font: inherit;
  font-size: 14px;
  line-height: 1.5;
}
```

Use serif/editorial type only for large panel headings and English kickers, never for Chinese body or controls.

- [ ] **Step 4: Style cue cards and selected states**

```css
#music-workspace .music-template-card {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 12px;
  min-height: 154px;
  border: 1px solid var(--music-line);
  border-radius: 4px;
  background: rgb(251 250 246 / 72%);
}

#music-workspace .music-template-card.active {
  border-color: var(--music-amber);
  background: #fffaf0;
}

#music-workspace .music-template-thumb img {
  width: 100%;
  aspect-ratio: 4 / 5;
  object-fit: cover;
}
```

Hover may move at most `translateY(-1px)` and must not scale. Use olive for active controls, amber for the current cue, and burgundy only for warnings/errors.

- [ ] **Step 5: Style editor, output, resizers, and status bar**

Use continuous surfaces with hairline dividers. Form group headings are 15px; output headings 13px; output textareas 14px at 1.65 line height. Give the output blocks a common header treatment and place copy controls at their upper right.

Add visible keyboard focus and reduced motion:

```css
#music-workspace :is(button, input, select, textarea, [role="button"]):focus-visible {
  outline: 2px solid rgb(77 98 81 / 34%);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  #music-workspace *,
  #music-workspace *::before,
  #music-workspace *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 6: Refresh the cache key**

```html
<link rel="stylesheet" href="music-workspace.css?v=20260719-film-grading-v1">
```

- [ ] **Step 7: Run tests and whitespace validation**

```bash
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node prompt-generator.test.js
git diff --check -- music-workspace.css index.html music-app.js prompt-generator.test.js
```

Expected: all assertions pass; `git diff --check` prints nothing.

- [ ] **Step 8: Commit the selected visual system**

```bash
git add music-workspace.css index.html prompt-generator.test.js
git commit -m "style: apply film grading music workspace"
```

---

### Task 4: Refine Resizing and Responsive Pane Behavior

**Files:**
- Modify: `music-data.js:209-261, 480-497`
- Modify: `music-app.js:198-205`
- Modify: `music-workspace.css`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: persisted `state.layout`, Task 2 mobile-pane state, and current pointer events.
- Produces: new-project layout defaults, keyboard separators, readable three-column layouts through 1024px, and one-pane mode below 900px.

- [ ] **Step 1: Add failing layout and keyboard assertions**

```js
assert.deepStrictEqual(DEFAULT_MUSIC_STATE.layout, { leftWidth: 400, rightWidth: 490 });
assert(musicAppSource.includes('addEventListener("keydown"'));
assert(musicAppSource.includes('event.key === "ArrowLeft"'));
assert(musicAppSource.includes('event.key === "ArrowRight"'));
```

Run the Node suite and expect failure before implementation.

- [ ] **Step 2: Update only new-project defaults and accepted legacy ranges**

Set:

```js
layout: { leftWidth: 400, rightWidth: 490 }
```

Accept left widths from 240 to 520 and right widths from 320 to 620. Preserve valid older stored widths rather than rewriting user layouts.

- [ ] **Step 3: Share limits between pointer and keyboard resizing**

Use `const limits = { left: [240, 520], right: [320, 620] };`. Handle ArrowLeft and ArrowRight in 16px increments, clamp through the same limits, call `applyLayout()`, update separator `aria-valuenow`, and call `notifyDirty()`.

- [ ] **Step 4: Implement exact breakpoints**

- At 1440px, use persisted widths and all three columns.
- From 1024px through 1279px, retain all three columns with compact padding, visible separators, and `grid-template-columns: clamp(240px, var(--music-left-width), 26vw) 5px minmax(360px, 1fr) 5px clamp(320px, var(--music-right-width), 32vw)`.
- Below 900px, display `.music-mobile-switch`, hide both inactive panels according to `data-mobile-pane`, hide resizers, and let the active panel fill the page.
- At 620px and below, use one-column forms and two-column purpose buttons.

Use these pane visibility rules:

```css
@media (max-width: 899px) {
  #music-workspace[data-mobile-pane="library"] :is(.music-structure-panel, .music-output-panel),
  #music-workspace[data-mobile-pane="design"] :is(.music-library-panel, .music-output-panel),
  #music-workspace[data-mobile-pane="output"] :is(.music-library-panel, .music-structure-panel) {
    display: none;
  }
}
```

- [ ] **Step 5: Run state and regression tests**

```bash
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --check music-data.js
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --check music-app.js
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node prompt-generator.test.js
git diff --check -- music-data.js music-app.js music-workspace.css prompt-generator.test.js
```

Expected: all commands pass.

- [ ] **Step 6: Commit responsive behavior**

```bash
git add music-data.js music-app.js music-workspace.css prompt-generator.test.js
git commit -m "feat: refine music workspace responsive layout"
```

---

### Task 5: Browser Regression and Design-QA

**Files:**
- Create: `.audit-20260719-music-film-grading/01-1440.png`
- Create: `.audit-20260719-music-film-grading/02-1280.png`
- Create: `.audit-20260719-music-film-grading/03-1024.png`
- Create: `.audit-20260719-music-film-grading/04-390-library.png`
- Create: `.audit-20260719-music-film-grading/05-390-design.png`
- Create: `.audit-20260719-music-film-grading/06-390-output.png`
- Create: `design-qa-music-film-grading.md`
- Compare: `design-references/music-workspace-selected-film-grading-room.png`

**Interfaces:**
- Consumes: `http://127.0.0.1:8766/index.html?workspace=music&fresh=music-film-grading-v1`.
- Produces: visual evidence, interaction checks, console checks, and a design-QA report.

- [ ] **Step 1: Confirm or start the existing static server**

```bash
curl -I http://127.0.0.1:8766/index.html
```

Expected: HTTP 200. If unavailable:

```bash
python3 serve-local.py 8766
```

Keep the server session running through browser QA.

- [ ] **Step 2: Open a dedicated browser session**

```bash
PATH=/Applications/ChatGPT.app/Contents/Resources/cua_node/bin:$PATH /Users/xiaoweixiaogang/.local/bin/playwright-cli -s=music-film-grading open 'http://127.0.0.1:8766/index.html?workspace=music&fresh=music-film-grading-v1'
```

Clear local storage only in this dedicated test session so new defaults can be checked without changing the user's normal browser data.

- [ ] **Step 3: Capture and check every target viewport**

At 1440 x 1024, 1280 x 900, 1024 x 768, and 390 x 844, resize, reload, evaluate horizontal overflow, and save the named screenshots. The evaluation is:

```js
() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, overflow: document.documentElement.scrollWidth > innerWidth })
```

Expected: `overflow: false` at every size.

- [ ] **Step 4: Verify the core workflow**

Using snapshot-derived locators only:

1. Click a case card outside its title and verify it becomes selected.
2. Click its favorite icon and verify selection remains unchanged.
3. Select “氛围音乐” and verify eight cases.
4. Select an instrument and verify the selected count and outputs update.
5. Change target model and verify the master inputs remain unchanged.
6. Copy one output field and verify temporary “已复制” feedback.
7. Drag both separators and verify panel widths change.
8. At 390px, switch through 案例、设计、输出 and capture each pane.

- [ ] **Step 5: Check console and geometry**

Run `playwright-cli -s=music-film-grading console error`; expect zero application errors. Inspect panel rectangles at 1440, 1280, and 1024 to confirm they are visible, non-overlapping, and readable.

- [ ] **Step 6: Perform design-QA against the selected image**

Record in `design-qa-music-film-grading.md`:

- command-bar color and active underline;
- desktop column balance;
- continuous warm paper surfaces;
- cue-card proportions and image treatment;
- editor typography and field sizing;
- output hierarchy and warning colors;
- bottom status bar;
- any old teal/gray theme leakage;
- each correction and its exact selector.

Correct major mismatches, reload, and recapture the 1440 screenshot before approval.

- [ ] **Step 7: Run final verification**

```bash
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --check music-data.js
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --check music-adapters.js
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --check music-app.js
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node prompt-generator.test.js
git diff --check -- index.html music-data.js music-app.js music-workspace.css prompt-generator.test.js design-qa-music-film-grading.md
```

Expected: all commands pass, console errors are zero, and every viewport has zero horizontal overflow.

- [ ] **Step 8: Commit the verified implementation**

```bash
git add index.html music-data.js music-app.js music-workspace.css prompt-generator.test.js design-qa-music-film-grading.md
git commit -m "feat: complete film grading music workspace"
```

- [ ] **Step 9: Return the acceptance URL**

```text
http://127.0.0.1:8766/index.html?workspace=music&fresh=music-film-grading-v1
```

Do not migrate the other five workspaces until the user confirms this page.
