# Music Instrument Browser And Card Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each music case card selectable across its full surface and add a persistent region-and-family-filtered world instrument browser whose selections enter Chinese and English model prompts.

**Architecture:** Extend the controlled music dictionary with instrument metadata and pure query helpers in `music-data.js`. Keep UI-only filter state in `music-app.js`, while selected instruments remain in the existing persisted orchestration layers. Render two compact filter controls above the existing layer chips and reuse the current adapter dictionary path so every selected instrument automatically reaches all model outputs.

**Tech Stack:** Static HTML, CSS, browser JavaScript IIFEs, Node `assert` regression tests, Playwright CLI.

## Global Constraints

- The complete visible area of a case card selects that case; the favorite button never selects it.
- Case cards support mouse, Enter, and Space with visible hover, focus, and selected states.
- Regions are exactly: all, universal, western-orchestra, China, East Asia, South Asia, Middle East, Africa, Latin America.
- Families are exactly: all, keyboard, bowed strings, plucked strings, woodwinds, brass, percussion, electronic and sound texture.
- Filtering changes visibility only and never removes selected instruments.
- Selected instruments continue to use the five existing orchestration layers: lead, support, rhythm and bass, texture and space, exclude.
- English model prompts only use curated English dictionary values; free Chinese is never presented as translated English.
- Old projects without filter state import without data loss.
- Do not add audio generation, upload, player, DAW, or external model APIs.

---

### Task 1: Controlled World Instrument Catalog

**Files:**
- Modify: `music-data.js`
- Test: `prompt-generator.test.js`

**Interfaces:**
- Produces: `INSTRUMENT_REGIONS`, `INSTRUMENT_FAMILIES`, `MUSIC_INSTRUMENTS`, `filterMusicInstruments({ region, family, query? })`; each instrument record has `{ id, zh, en, region, family, layers }`.
- Preserves: every existing `MUSIC_DICTIONARY` ID and orchestration layer array.

- [ ] **Step 1: Write failing catalog tests**

Add assertions that every instrument has `{ zh, en, region, family }`, IDs are unique, and these queries return the required examples:

```js
assert(filterMusicInstruments({ region: "china", family: "bowed" }).some((item) => item.id === "erhu"));
assert(filterMusicInstruments({ region: "china", family: "woodwind" }).some((item) => item.id === "dizi"));
assert(filterMusicInstruments({ region: "universal", family: "plucked" }).some((item) => item.id === "acoustic_guitar"));
```

- [ ] **Step 2: Run the suite and verify the new tests fail**

Run:

```bash
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node prompt-generator.test.js
```

Expected: the new catalog test fails because `filterMusicInstruments` is not exported.

- [ ] **Step 3: Add exact catalog metadata and query helper**

Add region keys `all`, `universal`, `western_orchestra`, `china`, `east_asia`, `south_asia`, `middle_east`, `africa`, `latin_america` and family keys `all`, `keyboard`, `bowed`, `plucked`, `woodwind`, `brass`, `percussion`, `electronic_texture`.

Add at least these new controlled IDs with Chinese and English names, matching metadata, and explicit allowed layer IDs from `lead`, `support`, `rhythmBass`, `textureSpace`, `exclude`:

```js
erhu, dizi, xiao, pipa, guzheng, guqin, suona, sheng,
classical_guitar, acoustic_guitar, electric_guitar,
violin, viola, cello, double_bass, harp,
flute, clarinet, oboe, bassoon, trumpet, trombone, tuba,
shakuhachi, koto, shamisen, taiko,
sitar, sarangi, tabla, bansuri,
oud, ney, darbuka,
kora, mbira, djembe,
charango, bandoneon, congas
```

Implement:

```js
function filterMusicInstruments({ region = "all", family = "all", query = "" } = {}) {
  const needle = String(query).trim().toLowerCase();
  return MUSIC_INSTRUMENTS.filter((item) => (
    (region === "all" || item.region === region) &&
    (family === "all" || item.family === family) &&
    (!needle || `${item.zh} ${item.en}`.toLowerCase().includes(needle))
  ));
}
```

- [ ] **Step 4: Run tests and verify catalog coverage passes**

Run the full Node suite. Expected: zero failures.

- [ ] **Step 5: Commit only Task 1 files when safely separable**

```bash
git add music-data.js prompt-generator.test.js
git commit -m "feat: add controlled world instrument catalog"
```

If those files contain unrelated pre-existing changes, record the scoped diff and defer the commit instead of staging unrelated work.

---

### Task 2: Full-Surface Case Card Selection

**Files:**
- Modify: `music-app.js`
- Modify: `music-workspace.css`
- Test: `prompt-generator.test.js`

**Interfaces:**
- Consumes: existing `applyTemplate(id)` and favorite mutation logic.
- Produces: case card DOM with `data-music-template-card`, `role="button"`, `tabindex="0"` and keyboard activation.

- [ ] **Step 1: Write failing source and browser-contract tests**

Assert the rendered card carries the card-level dataset and the controller distinguishes favorite clicks:

```js
assert(source.includes("data-music-template-card"));
assert(source.includes('event.target.closest("[data-music-favorite]")'));
assert(source.includes('event.key === "Enter" || event.key === " "'));
```

- [ ] **Step 2: Run tests and verify the contract fails**

Run the full Node suite. Expected: card-level dataset or keyboard assertion fails.

- [ ] **Step 3: Render and activate the whole card**

Set these card properties during render:

```js
card.dataset.musicTemplateCard = item.id;
card.tabIndex = 0;
card.setAttribute("role", "button");
card.setAttribute("aria-pressed", String(state.templateId === item.id));
```

Change delegated click handling so favorite is returned first; otherwise resolve `event.target.closest("[data-music-template-card]")` and call `applyTemplate`. Add delegated keydown for Enter and Space, call `preventDefault()`, then select the card.

- [ ] **Step 4: Add complete interaction states**

Add `cursor: pointer` to the card and visible `:hover`, `:focus-visible`, `.active` states. Keep `.music-favorite` independently clickable with a larger stable hit target.

- [ ] **Step 5: Run tests and verify zero regressions**

Run the full Node suite. Expected: zero failures.

- [ ] **Step 6: Commit only Task 2 files when safely separable**

Use a scoped commit only if it does not stage unrelated user changes.

---

### Task 3: Region And Family Instrument Browser

**Files:**
- Modify: `index.html`
- Modify: `music-app.js`
- Modify: `music-workspace.css`
- Test: `prompt-generator.test.js`

**Interfaces:**
- Consumes: `INSTRUMENT_REGIONS`, `INSTRUMENT_FAMILIES`, `filterMusicInstruments` from Task 1.
- Produces: `#music-instrument-region`, `#music-instrument-family`, `#music-instrument-selection-count`, and filtered layer chips.
- Persists: selected orchestration arrays only; filter controls are non-project UI state and default to `all` on import.

- [ ] **Step 1: Write failing DOM and controller tests**

Add the three required IDs to the workspace contract and assert `renderInstruments` calls `filterMusicInstruments` without mutating orchestration arrays.

- [ ] **Step 2: Run tests and confirm missing controls fail**

Run the full Node suite. Expected: missing `music-instrument-region` or `music-instrument-family`.

- [ ] **Step 3: Add compact controls above the layer chips**

Add two labeled selects and one live count:

```html
<div class="music-instrument-browser-controls">
  <label class="music-field"><span>国家 / 地域</span><select id="music-instrument-region"></select></label>
  <label class="music-field"><span>乐器类型</span><select id="music-instrument-family"></select></label>
  <span id="music-instrument-selection-count" aria-live="polite"></span>
</div>
```

- [ ] **Step 4: Populate controls and filter chips**

Add UI state:

```js
let instrumentFilters = { region: "all", family: "all" };
```

Populate selects from the exported catalogs. In `renderInstruments`, query matching IDs, intersect each existing orchestration layer catalog with the visible IDs, and append any newly cataloged instrument IDs allowed for that layer. Preserve `state.orchestration` unchanged when filters change.

- [ ] **Step 5: Show hidden selected count and empty state**

The count must read `已选 N 件乐器` and an empty query must render `当前地域和类型下暂无乐器，请调整筛选。` without deleting selections.

- [ ] **Step 6: Style the browser and responsive layout**

Use two compact fields plus the count on desktop, one column on mobile. Chips must remain readable and wrap without changing the three-column workspace width.

- [ ] **Step 7: Run the full test suite**

Expected: zero failures.

- [ ] **Step 8: Commit only Task 3 files when safely separable**

Use a scoped commit only if no unrelated user edits would be included.

---

### Task 4: Output, Persistence, And Visual Verification

**Files:**
- Modify: `prompt-generator.test.js`
- Verify without changing: `music-adapters.js`
- Verify without changing: `music-app.js`
- Verify without changing: `music-workspace.css`

**Interfaces:**
- Consumes: existing `buildMusicOutput`, `exportState`, `importState`, project autosave event.
- Verifies: selected instruments flow through the existing dictionary-based Chinese and English output paths.

- [ ] **Step 1: Add output and round-trip assertions**

Build state containing `erhu`, `dizi`, and `acoustic_guitar`; assert generic Chinese output contains `二胡`, `笛子`, `原声吉他`, while Udio or Stable Audio output contains `erhu`, `dizi`, `acoustic guitar`. Normalize the exported state and assert all IDs remain selected.

- [ ] **Step 2: Run Node verification**

Run syntax checks for `music-data.js`, `music-adapters.js`, `music-app.js`, then the full `prompt-generator.test.js`. Expected: zero failures.

- [ ] **Step 3: Verify the exact interaction in Playwright at 1440×1024**

Open:

```text
http://127.0.0.1:8766/index.html?workspace=music&fresh=instrument-browser-final-v1
```

Click a case card on its body text and verify it becomes active. Click its favorite button and verify active case does not change. Select `中国` plus `拉弦`, choose `二胡`, and verify both director analysis and model output update.

- [ ] **Step 4: Verify responsive sizes and console**

Check 1280×900, 1024×900, and 390×844. Assert `document.body.scrollWidth <= document.body.clientWidth`, no overlapping controls, and Playwright console reports zero errors and warnings.

- [ ] **Step 5: Run final diff checks**

```bash
git diff --check -- music-data.js music-app.js music-adapters.js music-workspace.css index.html prompt-generator.test.js
git status --short
```

Do not reset or stage unrelated existing changes.

- [ ] **Step 6: Provide the user acceptance link**

Return:

```text
http://127.0.0.1:8766/index.html?workspace=music&fresh=instrument-browser-final-v1
```

Report the exact test and browser evidence, then wait for user acceptance.
