# Cross-Model Film Music Workbench Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Replace the current single-format music form with a platform-neutral film-scoring master brief, lightweight orchestration workflow, and deterministic output adapters for Generic, Suno, Udio, Stable Audio, and Lyria.

**Architecture:** music-data.js owns the versioned master schema, controlled vocabulary, presets, templates, migration, and validation. A new pure music-adapters.js converts normalized state into one output contract without DOM or storage access. music-app.js renders and edits the master brief while the existing workspace core continues to persist workspaces.music.

**Tech Stack:** Static HTML, scoped CSS, browser JavaScript IIFEs, CommonJS-compatible pure modules, localStorage projects, custom Node assertions, Playwright CLI.

## Global Constraints

- Supported target IDs are exactly generic, suno, udio, stable_audio, and lyria; default is generic.
- Supported densities are exactly concise and detailed; default is concise.
- Model and density changes alter output only and never clear the master brief.
- Default output is instrumental: no lyrics, lead vocals, backing vocals, humming, spoken word, or narration.
- Presets are starting points; users may add or remove instruments without a hard total limit.
- Advanced controls are optional and collapsed by default.
- Do not fake translation of arbitrary Chinese. Controlled values use curated English; template English summaries and optional user English notes may enter English output.
- Preserve window.aigcMusicWorkbench and the workspaces.music project key.
- Import legacy music state and schema v2 without losing existing production content.
- Desktop uses three unframed columns. Templates may be cards, but cards may not contain cards.
- At <=1180px stack library, director controls, output. At <=820px use one full-width column.
- Controls are at least 11px; output is at least 12px; no page-level horizontal scroll at 390px.
- Do not add audio generation, player, upload, waveform, spectrum, DAW, lyrics, voice cloning, or artist imitation.
- Preserve unrelated dirty work; stage only files declared by the current task.

## File Responsibilities

- music-data.js: schema v2, vocabularies, presets, template normalization, migration, validation.
- music-adapters.js: pure director analysis and five target adapters.
- music-app.js: controller, filters, orchestration editing, disclosure, output, copy, public API.
- index.html: redesigned music markup and script order.
- music-workspace.css: layout and responsive visual system.
- ui-motion.js: copy feedback for new static and dynamic output buttons.
- workspace-core.js: inspect only; modify only if a failing integration test proves its generic contract insufficient.
- prompt-generator.test.js: all regression coverage.
- .audit-20260718-cross-model-music/: final visual and browser evidence.

---

### Task 1: Versioned Music Master, Presets, and Legacy Migration

**Files:**
- Modify: music-data.js
- Test: prompt-generator.test.js

**Interfaces:**
- Produces MUSIC_SCHEMA_VERSION, MUSIC_TARGETS, PROMPT_DENSITIES, MUSIC_DICTIONARY, INSTRUMENT_PRESETS, DEFAULT_MUSIC_STATE, normalizeMusicState, migrateLegacyMusicState, validateMusicState, analyzeMusicConflicts, applyInstrumentPreset, toggleInstrument.
- Preserves MUSIC_PURPOSES, MUSIC_GENRES, MUSIC_TEMPLATES, scaleMusicTimeline, and browser/CommonJS exports.

- [ ] **Step 1: Write failing schema and migration tests**

~~~js
runTest("music v2 exposes exact targets, densities, and orchestration layers", () => {
  const data = require("./music-data.js");
  assert.strictEqual(data.MUSIC_SCHEMA_VERSION, 2);
  assert.deepStrictEqual(Object.keys(data.MUSIC_TARGETS), ["generic", "suno", "udio", "stable_audio", "lyria"]);
  assert.deepStrictEqual(Object.keys(data.PROMPT_DENSITIES), ["concise", "detailed"]);
  assert.deepStrictEqual(Object.keys(data.DEFAULT_MUSIC_STATE.orchestration), ["lead", "support", "rhythmBass", "textureSpace", "exclude"]);
  assert.strictEqual(data.DEFAULT_MUSIC_STATE.targetModel, "generic");
  assert.strictEqual(data.DEFAULT_MUSIC_STATE.promptDensity, "concise");
});

runTest("music presets merge without duplicate instruments", () => {
  const data = require("./music-data.js");
  const once = data.applyInstrumentPreset(data.DEFAULT_MUSIC_STATE, "piano-strings");
  const twice = data.applyInstrumentPreset(once, "piano-strings");
  assert.deepStrictEqual(twice.orchestration.lead, ["piano", "string_ensemble"]);
  assert.strictEqual(new Set(twice.orchestration.support).size, twice.orchestration.support.length);
});

runTest("legacy migration preserves content without inventing a climax", () => {
  const state = require("./music-data.js").normalizeMusicState({
    purpose: "film", genre: "suspense", duration: 30, bpm: 64,
    emotionStart: "压低的怀疑", emotionEnd: "冷峻留白",
    leadInstrument: "低音弦乐", supportInstruments: "钢琴单音",
    picture: "冬夜站台确认背叛", dialogueMode: "dense",
    timeline: [
      { start: 0, end: 8, task: "建立压力", texture: "低频持续音", dynamic: "pp" },
      { start: 8, end: 24, task: "线索显现", texture: "弦乐进入", dynamic: "mp" },
      { start: 24, end: 30, task: "确认落点", texture: "抽离高频", dynamic: "p" }
    ]
  });
  assert.strictEqual(state.schemaVersion, 2);
  assert.strictEqual(state.sceneZh, "冬夜站台确认背叛");
  assert.strictEqual(state.structure.opening, "建立压力");
  assert.strictEqual(state.structure.development, "线索显现");
  assert.strictEqual(state.structure.climax, "");
  assert.strictEqual(state.structure.ending, "确认落点");
  assert.strictEqual(state.soundRelationship.dialogueMode, "dense");
});

runTest("music conflict analysis advises without blocking validation", () => {
  const data = require("./music-data.js");
  const state = data.normalizeMusicState({
    coreEmotion: "intimate",
    rhythmFeel: "no_pulse",
    orchestration: {
      lead: ["felt_piano"], support: [],
      rhythmBass: ["cinematic_percussion"], textureSpace: [], exclude: []
    },
    soundRelationship: { dialogueMode: "dense", editRhythm: "hard_sync", keySyncPoint: "" }
  });
  const warnings = data.analyzeMusicConflicts(state);
  assert(warnings.some((line) => line.includes("极简")));
  assert(warnings.some((line) => line.includes("节拍")));
  assert.strictEqual(data.validateMusicState(state).valid, true);
});
~~~

- [ ] **Step 2: Run the suite and verify the tests fail**

~~~bash
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node prompt-generator.test.js
~~~

Expected: failures name missing MUSIC_SCHEMA_VERSION, applyInstrumentPreset, and schema v2 fields.

- [ ] **Step 3: Add the exact v2 public constants and state shape**

~~~js
const MUSIC_SCHEMA_VERSION = 2;
const MUSIC_TARGETS = {
  generic: "通用影视音乐模型",
  suno: "Suno",
  udio: "Udio",
  stable_audio: "Stable Audio",
  lyria: "Lyria"
};
const PROMPT_DENSITIES = { concise: "简洁", detailed: "详细" };
const ORCHESTRATION_LAYERS = ["lead", "support", "rhythmBass", "textureSpace", "exclude"];

const DEFAULT_MUSIC_STATE = {
  schemaVersion: 2,
  targetModel: "generic",
  promptDensity: "concise",
  templateId: "",
  purpose: "film",
  genre: "drama",
  favoriteTemplateIds: [],
  sceneZh: "",
  sceneEn: "",
  subjectState: "",
  narrativeGoal: "",
  keyBeat: "",
  primaryGenre: "cinematic_score",
  secondaryGenre: "",
  era: "contemporary",
  culturalLanguage: "neutral",
  coreEmotion: "restrained",
  intensity: "low",
  emotionArc: { opening: "restrained", development: "gradual_rise", climax: "", ending: "lingering" },
  orchestrationPreset: "piano-strings",
  orchestration: {
    lead: ["piano", "string_ensemble"],
    support: [],
    rhythmBass: [],
    textureSpace: ["spacious_reverb"],
    exclude: []
  },
  duration: 30,
  tempoFeel: "slow",
  rhythmFeel: "flowing",
  structure: {
    opening: "建立克制的情绪空间",
    development: "逐步增加和声与音色层次",
    climax: "",
    ending: "收束并保留自然余韵"
  },
  advancedOpen: false,
  bpm: "",
  meter: "4/4",
  tonality: "model_choice",
  production: { dynamics: "wide", mixDensity: "sparse", spaceWidth: "wide", reverb: "natural", recording: "cinematic" },
  soundRelationship: { dialogueMode: "none", editRhythm: "not_forced", keySyncPoint: "" },
  extraRestrictions: [],
  layout: { leftWidth: 320, rightWidth: 500 }
};
~~~

- [ ] **Step 4: Add the eight exact orchestration presets**

~~~js
const INSTRUMENT_PRESETS = {
  "piano-strings": { name: "钢琴与弦乐", lead: ["piano", "string_ensemble"], support: ["soft_cello"], rhythmBass: [], textureSpace: ["natural_room"] },
  "orchestra-electronic": { name: "管弦与电子纹理", lead: ["string_ensemble", "french_horn"], support: ["soft_synth_pad"], rhythmBass: ["subtle_low_pulse"], textureSpace: ["granular_texture"] },
  "ethnic-ambient": { name: "民族器乐与环境氛围", lead: ["regional_plucked_strings"], support: ["bamboo_flute"], rhythmBass: [], textureSpace: ["environmental_ambience"] },
  "low-strings-texture": { name: "低频弦乐与声音纹理", lead: ["low_strings"], support: [], rhythmBass: ["sub_bass_drone"], textureSpace: ["breathing_texture"] },
  "minimal-piano-space": { name: "极简钢琴与空间混响", lead: ["felt_piano"], support: [], rhythmBass: [], textureSpace: ["long_reverb_tail"] },
  "brass-percussion-hybrid": { name: "铜管、打击乐与混合管弦", lead: ["french_horn", "low_brass"], support: ["string_ensemble"], rhythmBass: ["cinematic_percussion"], textureSpace: [] },
  "synth-pulse-granular": { name: "合成器、低频脉冲与颗粒音色", lead: ["analog_synth"], support: [], rhythmBass: ["low_pulse"], textureSpace: ["granular_texture"] },
  "woodwind-plucked-light": { name: "木管、拨弦与轻打击乐", lead: ["woodwinds", "plucked_strings"], support: [], rhythmBass: ["light_percussion"], textureSpace: ["natural_room"] }
};
~~~

Every instrument ID above must have a curated { zh, en } MUSIC_DICTIONARY entry.

- [ ] **Step 5: Implement immutable preset and instrument operations**

~~~js
function unique(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
}

function applyInstrumentPreset(input, presetId) {
  const state = normalizeMusicState(input);
  const preset = INSTRUMENT_PRESETS[presetId];
  if (!preset) return state;
  const orchestration = { ...state.orchestration };
  ORCHESTRATION_LAYERS.forEach((layer) => {
    orchestration[layer] = unique([...(orchestration[layer] || []), ...(preset[layer] || [])]);
  });
  return { ...state, orchestrationPreset: presetId, orchestration };
}

function toggleInstrument(input, layer, instrumentId) {
  const state = normalizeMusicState(input);
  if (!ORCHESTRATION_LAYERS.includes(layer) || !MUSIC_DICTIONARY[instrumentId]) return state;
  const current = state.orchestration[layer];
  const next = current.includes(instrumentId)
    ? current.filter((id) => id !== instrumentId)
    : [...current, instrumentId];
  return { ...state, orchestration: { ...state.orchestration, [layer]: unique(next) } };
}
~~~

migrateLegacyMusicState must map picture to sceneZh, three legacy timeline tasks to opening/development/ending, preserve legacy orchestration text in Chinese notes, and map dialogue/edit/ending/restrictions. It must leave climax blank. validateMusicState requires a purpose or scene, a core emotion, and at least one lead instrument; BPM blocks only when nonblank and outside 30-240.

analyzeMusicConflicts returns advisory Chinese strings for the four spec conflicts: intimate/minimal with epic percussion, no pulse with hard sync, dense dialogue with dense midrange orchestration, and warm natural recording with digital distortion. Warnings never change validateMusicState().valid.

- [ ] **Step 6: Export the Task 1 API and run all tests**

Run syntax check and full Node suite. Expected: all existing and new tests pass.

- [ ] **Step 7: Commit Task 1 only**

~~~bash
git add music-data.js prompt-generator.test.js
git commit -m "feat: add cross-model music master brief"
~~~

---

### Task 2: Pure Cross-Model Output Adapters

**Files:**
- Create: music-adapters.js
- Modify: index.html
- Test: prompt-generator.test.js

**Interfaces:**
- Consumes normalizeMusicState, validateMusicState, MUSIC_DICTIONARY, MUSIC_TARGETS.
- Produces buildMusicOutput(input, targetModel, density) returning { targetModel, density, directorAnalysis, fields, combined, title, instrumental, warnings } and five named adapter functions.

- [ ] **Step 1: Write failing adapter tests**

~~~js
runTest("music adapters expose five deterministic contracts", () => {
  const adapters = require("./music-adapters.js");
  const state = require("./music-data.js").normalizeMusicState({
    sceneEn: "A detective recognizes betrayal on an empty winter platform"
  });
  ["generic", "suno", "udio", "stable_audio", "lyria"].forEach((target) => {
    const output = adapters.buildMusicOutput(state, target, "detailed");
    assert.strictEqual(output.targetModel, target);
    assert.strictEqual(output.instrumental, true);
    assert(output.directorAnalysis.includes("导演分析"));
    assert(output.combined.length > 80);
    assert(output.fields.every((field) => field.id && field.label && typeof field.value === "string"));
    ["no lyrics", "no lead vocals", "no backing vocals", "no humming", "no spoken word or narration"].forEach((term) => {
      assert(output.combined.toLowerCase().includes(term));
    });
  });
});

runTest("adapters do not fabricate English translation for free Chinese text", () => {
  const data = require("./music-data.js");
  const adapters = require("./music-adapters.js");
  const state = data.normalizeMusicState({ sceneZh: "无法预设翻译的中文自由场景", sceneEn: "" });
  const output = adapters.buildMusicOutput(state, "suno", "detailed");
  assert(output.directorAnalysis.includes("无法预设翻译的中文自由场景"));
  assert(!output.combined.includes("无法预设翻译的中文自由场景"));
  assert(output.warnings.includes("英文场景补充未填写，模型提示词仅使用受控音乐字段。"));
});

runTest("concise output is shorter than detailed output", () => {
  const data = require("./music-data.js");
  const adapters = require("./music-adapters.js");
  const state = data.normalizeMusicState({ sceneEn: "A quiet coastal hotel at dawn" });
  const concise = adapters.buildMusicOutput(state, "generic", "concise");
  const detailed = adapters.buildMusicOutput(state, "generic", "detailed");
  assert(concise.combined.length < detailed.combined.length);
  assert.strictEqual(concise.title, detailed.title);
});
~~~

- [ ] **Step 2: Run tests and verify module-not-found failure**

Expected: Cannot find module ./music-adapters.js.

- [ ] **Step 3: Implement the shared adapter boundary**

~~~js
(function initMusicAdapters(root) {
  const data = root.aigcMusicData || (typeof require === "function" ? require("./music-data.js") : null);
  if (!data) return;

  const INSTRUMENTAL_EXCLUDES = [
    "no lyrics", "no lead vocals", "no backing vocals",
    "no humming", "no spoken word or narration"
  ];

  function outputContract(targetModel, density, directorAnalysis, fields, title, warnings = []) {
    return {
      targetModel,
      density,
      directorAnalysis,
      fields,
      combined: fields.map((field) => field.label + ": " + field.value).join("\n"),
      title,
      instrumental: true,
      warnings
    };
  }

  function buildMusicOutput(input, requestedTarget, requestedDensity) {
    const state = data.normalizeMusicState(input);
    const target = data.MUSIC_TARGETS[requestedTarget] ? requestedTarget : "generic";
    const density = data.PROMPT_DENSITIES[requestedDensity] ? requestedDensity : "concise";
    return ADAPTERS[target](state, density);
  }

  const api = {
    buildMusicOutput, buildGenericOutput, buildSunoOutput,
    buildUdioOutput, buildStableAudioOutput, buildLyriaOutput
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.aigcMusicAdapters = api;
})(typeof window !== "undefined" ? window : globalThis);
~~~

Implement curated label lookup, de-duplicated excludes, deterministic title, Chinese director analysis, scene warning, concise clauses, and detailed structure/production clauses.

- [ ] **Step 4: Implement exact field sets**

~~~js
// Generic
[
  { id: "prompt", label: "Prompt", value: prompt },
  { id: "prompt_zh", label: "中文完整提示词", value: promptZh },
  { id: "exclude", label: "Exclude", value: excludes },
  { id: "title", label: "Title", value: title }
];

// Suno
[
  { id: "style", label: "Style of Music", value: style },
  { id: "exclude", label: "Exclude", value: excludes },
  { id: "title", label: "Title", value: title },
  { id: "instrumental", label: "Instrumental", value: "ON" }
];

// Udio
[
  { id: "prompt", label: "Prompt", value: prompt },
  { id: "style_reduction", label: "Style Reduction", value: excludes },
  { id: "instrumental", label: "Instrumental Mode", value: "ON" }
];

// Stable Audio
[
  { id: "prompt", label: "Prompt", value: stableSections },
  { id: "exclude", label: "Exclude", value: excludes }
];

// Lyria
[
  { id: "prompt", label: "Prompt", value: prompt },
  { id: "negative_guidance", label: "Negative Guidance", value: excludes }
];
~~~

Stable Audio section order is Format, Genre, Instruments, Mood, Tempo, Structure, Production. Suno uses conversational structure. Udio ends with composition_dynamic_score or another deterministic use-shape term. Lyria includes structure only when populated.

- [ ] **Step 5: Load adapters before the app**

~~~html
<script src="music-data.js?v=20260718-music-master-v2"></script>
<script src="music-adapters.js?v=20260718-cross-model-adapters-v1"></script>
<script src="music-app.js?v=20260718-cross-model-workbench-v1"></script>
~~~

Remove superseded music tags. Run both syntax checks and full tests.

- [ ] **Step 6: Commit Task 2 only**

~~~bash
git add music-adapters.js index.html prompt-generator.test.js
git commit -m "feat: add film music model adapters"
~~~

---

### Task 3: Redesign Markup and Controller

**Files:**
- Modify: index.html
- Modify: music-app.js
- Test: prompt-generator.test.js

**Interfaces:**
- Consumes Task 1 state helpers and Task 2 buildMusicOutput.
- Produces public workbench API plus all IDs in the test below.

- [ ] **Step 1: Add failing markup and state-preservation tests**

~~~js
runTest("cross-model music markup exposes required controls", () => {
  const html = fs.readFileSync("index.html", "utf8");
  [
    "music-search", "music-template-list", "music-scene-zh", "music-scene-en",
    "music-subject-state", "music-narrative-goal", "music-key-beat",
    "music-primary-genre", "music-secondary-genre", "music-era", "music-cultural-language",
    "music-core-emotion", "music-intensity", "music-instrument-presets",
    "music-instrument-layers", "music-duration", "music-tempo-feel",
    "music-rhythm-feel", "music-structure-opening", "music-structure-development",
    "music-structure-climax", "music-structure-ending", "music-advanced-toggle",
    "music-advanced-controls", "music-target-model", "music-prompt-density",
    "music-director-analysis", "music-output-fields", "music-copy-all",
    "music-validation"
  ].forEach((id) => assert.strictEqual(html.split('id="' + id + '"').length - 1, 1));
});

runTest("target and density changes preserve the master brief", () => {
  const harness = createCrossModelMusicHarness();
  harness.workbench.importState({
    sceneZh: "雨夜追踪", narrativeGoal: "逐步揭示危险",
    targetModel: "generic", promptDensity: "concise"
  });
  harness.elements.get("#music-target-model").value = "suno";
  harness.elements.get("#music-target-model").trigger("change");
  harness.densityButtons.detailed.trigger("click");
  const state = harness.workbench.exportState();
  assert.strictEqual(state.sceneZh, "雨夜追踪");
  assert.strictEqual(state.narrativeGoal, "逐步揭示危险");
  assert.strictEqual(state.targetModel, "suno");
  assert.strictEqual(state.promptDensity, "detailed");
});
~~~

- [ ] **Step 2: Run tests and verify missing IDs and harness failure**

- [ ] **Step 3: Replace only the music workspace contents**

Retain #music-workspace, the two resizers, and the three existing panel class names. The library contains header/count, #music-search, generated #music-purpose-tabs, #music-genre, and #music-template-list.

The director panel contains these exact labelled controls:

~~~html
<textarea id="music-scene-zh" rows="3"></textarea>
<textarea id="music-scene-en" rows="2"></textarea>
<input id="music-subject-state">
<input id="music-narrative-goal">
<input id="music-key-beat">
<select id="music-primary-genre"></select>
<select id="music-secondary-genre"></select>
<select id="music-era"></select>
<select id="music-cultural-language"></select>
<select id="music-core-emotion"></select>
<select id="music-intensity"></select>
<div id="music-instrument-presets"></div>
<div id="music-instrument-layers"></div>
<select id="music-duration"></select>
<select id="music-tempo-feel"></select>
<select id="music-rhythm-feel"></select>
<textarea id="music-structure-opening" rows="2"></textarea>
<textarea id="music-structure-development" rows="2"></textarea>
<textarea id="music-structure-climax" rows="2"></textarea>
<textarea id="music-structure-ending" rows="2"></textarea>
<button id="music-advanced-toggle" type="button" aria-expanded="false" aria-controls="music-advanced-controls">高级控制</button>
<section id="music-advanced-controls" hidden></section>
~~~

The advanced section contains music-bpm, music-meter, music-tonality, music-dynamics, music-mix-density, music-space-width, music-reverb, music-recording, music-dialogue-mode, music-edit-rhythm, music-key-sync-point, and music-extra-restrictions.

The output panel contains:

~~~html
<select id="music-target-model"></select>
<div id="music-prompt-density" role="group" aria-label="提示词密度">
  <button type="button" data-music-density="concise">简洁</button>
  <button type="button" data-music-density="detailed">详细</button>
</div>
<p id="music-validation" role="status" aria-live="polite"></p>
<textarea id="music-director-analysis" rows="8" readonly></textarea>
<div id="music-output-fields"></div>
<button id="music-copy-all" type="button" class="button primary">复制全部</button>
<button id="music-example" type="button" class="button secondary">载入示例</button>
<button id="music-clear" type="button" class="button secondary">清空</button>
<code id="music-filename"></code>
~~~

- [ ] **Step 4: Refactor music-app.js into bounded renderers**

~~~js
function readMasterFromElements() {
  return normalizeMusicState({
    ...state,
    sceneZh: elements.sceneZh.value,
    sceneEn: elements.sceneEn.value,
    subjectState: elements.subjectState.value,
    narrativeGoal: elements.narrativeGoal.value,
    keyBeat: elements.keyBeat.value,
    primaryGenre: elements.primaryGenre.value,
    secondaryGenre: elements.secondaryGenre.value,
    era: elements.era.value,
    culturalLanguage: elements.culturalLanguage.value,
    coreEmotion: elements.coreEmotion.value,
    intensity: elements.intensity.value,
    duration: Number(elements.duration.value),
    tempoFeel: elements.tempoFeel.value,
    rhythmFeel: elements.rhythmFeel.value,
    structure: {
      opening: elements.structureOpening.value,
      development: elements.structureDevelopment.value,
      climax: elements.structureClimax.value,
      ending: elements.structureEnding.value
    }
  });
}

function renderModelOutput() {
  const validation = validateMusicState(state);
  const conflictWarnings = analyzeMusicConflicts(state);
  const output = buildMusicOutput(state, state.targetModel, state.promptDensity);
  elements.directorAnalysis.value = output.directorAnalysis;
  elements.outputFields.replaceChildren(...output.fields.map(outputFieldElement));
  elements.validation.textContent = validation.errors.concat(conflictWarnings).join(" ");
  elements.copyAll.disabled = !validation.valid;
}

function render() {
  renderTemplateLibrary();
  renderInstrumentPresets();
  renderInstrumentLayers();
  renderAdvancedControls();
  renderModelOutput();
  applyLayout();
}
~~~

Keep the working resizer behavior. Remove obsolete editable timeline rendering.

- [ ] **Step 5: Implement exact interaction rules**

- Search/purpose/genre filters update library only. Every card displays scene, emotion, orchestration, rhythm, and production tags.
- Every template card has an icon-only favorite control with an accessible label. Favorite changes update favoriteTemplateIds and never apply the template accidentally.
- A new template replaces template-owned fields; edited fields require confirm; cancel preserves all values.
- Preset click calls applyInstrumentPreset and preserves already selected user instruments.
- Instrument click calls toggleInstrument for the named layer.
- Advanced toggle changes advancedOpen, hidden, and aria-expanded without clearing values.
- Every state mutation emits exactly one aigc:workspace-dirty event.
- Target and density changes call output rendering only.
- Each output field is a readonly textarea with a data-music-copy-field button.
- Copy-all uses output.combined; field copy uses the exact visible value.
- Copy failure falls back to document.execCommand("copy").

Expose:

~~~js
root.aigcMusicWorkbench = {
  exportState: () => readMasterFromElements(),
  importState(saved = {}) {
    state = normalizeMusicState(saved);
    syncMasterToElements();
    render();
  },
  loadExample,
  clearFields,
  composePrompt() {
    return getOutput().combined;
  },
  getOutput() {
    const current = readMasterFromElements();
    return buildMusicOutput(current, current.targetModel, current.promptDensity);
  }
};
~~~

- [ ] **Step 6: Build createCrossModelMusicHarness and pass controller tests**

The harness must execute music-app.js with real listener registration for all controls, preset buttons, instrument chips, dynamic output container, and both resizers. Test one dirty event per action, template cancel, copy blocking, advanced collapse persistence, and importState without dirtying.

- [ ] **Step 7: Commit Task 3 only**

~~~bash
git add index.html music-app.js prompt-generator.test.js
git commit -m "feat: redesign film music director workflow"
~~~

---

### Task 4: Visual System and Responsive Layout

**Files:**
- Modify: music-workspace.css
- Test: prompt-generator.test.js

**Interfaces:**
- Consumes Task 3 classes and IDs.
- Produces three-column desktop and stacked tablet/mobile layouts.

- [ ] **Step 1: Add failing CSS contract tests**

~~~js
runTest("cross-model music CSS keeps unframed responsive columns", () => {
  const css = fs.readFileSync("music-workspace.css", "utf8");
  const panels = cssRuleBody(css, "#music-workspace :is(.music-library-panel, .music-structure-panel, .music-output-panel)");
  assert(panels.includes("border: 0;"));
  assert(panels.includes("border-radius: 0;"));
  assert(css.includes("minmax(440px, 1fr)"));
  assert(css.includes("@media (max-width: 1180px)"));
  assert(css.includes("@media (max-width: 820px)"));
  assert(css.includes(".music-preset-list"));
  assert(css.includes(".music-instrument-chip"));
  assert(css.includes(".music-output-field textarea"));
  assert(!css.includes("waveform"));
  assert(!css.includes("spectrum"));
});
~~~

- [ ] **Step 2: Run tests and verify missing class rules**

- [ ] **Step 3: Replace obsolete timeline rules with production controls**

~~~css
#music-workspace .music-control-group {
  display: grid;
  gap: 10px;
  padding-block: 2px 14px;
  border-bottom: 1px solid var(--music-line);
}
#music-workspace .music-two-column {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
#music-workspace .music-three-column {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
#music-workspace .music-structure-grid,
#music-workspace .music-preset-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
#music-workspace .music-preset-button {
  min-height: 44px;
  padding: 8px 10px;
  border: 1px solid var(--music-line);
  border-radius: 3px;
  background: var(--music-paper);
  text-align: left;
}
#music-workspace .music-instrument-layer {
  display: grid;
  gap: 6px;
  padding-block: 8px;
  border-top: 1px solid var(--music-line);
}
#music-workspace .music-instrument-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
#music-workspace .music-instrument-chip {
  min-height: 30px;
  padding: 5px 8px;
  border: 1px solid var(--music-line);
  border-radius: 3px;
  background: transparent;
}
#music-workspace .music-instrument-chip.active {
  border-color: var(--music-accent);
  color: var(--music-accent);
  background: var(--music-accent-soft);
}
#music-workspace .music-output-field textarea {
  min-height: 92px;
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 12px;
  line-height: 1.55;
}
~~~

Do not add gradients, neon glow, fake visualization, or black content panels.

- [ ] **Step 4: Add responsive rules**

At <=1180px use one column, hide resizers, keep DOM order, and give each section reachable internal scrolling. At <=820px collapse all 2/3-column groups and preset grids to one column, make target/density controls full width, and wrap toolbars.

- [ ] **Step 5: Run tests and commit Task 4 only**

~~~bash
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node prompt-generator.test.js
git add music-workspace.css prompt-generator.test.js
git commit -m "style: refine cross-model music workbench"
~~~

---

### Task 5: Project Persistence, Copy Feedback, and Compatibility

**Files:**
- Modify if a failing test proves necessary: workspace-core.js
- Modify: ui-motion.js
- Modify: music-app.js
- Test: prompt-generator.test.js

**Interfaces:**
- Consumes workbench exportState/importState and generic workspace capture/apply.
- Produces project round trips and copy feedback for static/dynamic music buttons.

- [ ] **Step 1: Add failing round-trip assertions**

~~~js
runTest("music v2 round-trip preserves model, orchestration, and advanced values", () => {
  const first = createCrossModelMusicHarness();
  first.workbench.importState({
    targetModel: "lyria",
    promptDensity: "detailed",
    sceneZh: "清晨海岸线",
    orchestration: {
      lead: ["piano"],
      support: ["soft_cello"],
      rhythmBass: ["low_pulse"],
      textureSpace: ["natural_room"],
      exclude: ["cinematic_percussion"]
    },
    advancedOpen: true,
    bpm: 76,
    tonality: "minor"
  });
  const saved = first.workbench.exportState();
  const second = createCrossModelMusicHarness();
  second.workbench.importState(saved);
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(second.workbench.exportState())),
    JSON.parse(JSON.stringify(saved))
  );
});

runTest("legacy projects without music still use the generic core fallback", () => {
  const source = fs.readFileSync("workspace-core.js", "utf8");
  assert(source.includes("project.workspaces?.[key] || {}"));
  assert(source.includes("music: root.aigcMusicWorkbench"));
  const state = require("./music-data.js").normalizeMusicState({});
  assert.strictEqual(state.schemaVersion, 2);
  assert.strictEqual(state.targetModel, "generic");
});
~~~

- [ ] **Step 2: Run tests and edit core only if proven necessary**

If the generic fallback passes, do not edit workspace-core.js. If it fails, add only the missing music API entry or empty-state fallback and rerun the focused test.

- [ ] **Step 3: Update copy feedback**

~~~js
const copyButtonIds = [
  "copy", "camera-copy", "casting-copy",
  "poster-copy", "reverse-copy", "music-copy-all"
];

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-music-copy-field]");
  if (!button) return;
  button.classList.add("copy-confirmed");
  setTimeout(() => button.classList.remove("copy-confirmed"), 1100);
});
~~~

Keep every existing non-music mapping unchanged.

- [ ] **Step 4: Verify one save signal per action**

Add assertions that loadExample, clearFields, target change, density change, one preset click, and one instrument toggle each dispatch exactly one dirty event. importState dispatches zero.

- [ ] **Step 5: Run final syntax and Node checks**

~~~bash
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --check music-data.js
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --check music-adapters.js
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --check music-app.js
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --check workspace-core.js
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --check ui-motion.js
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node prompt-generator.test.js
~~~

Expected: all exit 0 and no FAIL output.

- [ ] **Step 6: Commit scoped Task 5 files**

~~~bash
git add music-app.js ui-motion.js prompt-generator.test.js
git diff --cached --check
git commit -m "feat: persist cross-model music projects"
~~~

Stage workspace-core.js only if Step 2 changed it.

---

### Task 6: Real-Browser Functional and Visual QA

**Files:**
- Inspect/correct: index.html, music-data.js, music-adapters.js, music-app.js, music-workspace.css, ui-motion.js
- Test: prompt-generator.test.js
- Create: .audit-20260718-cross-model-music/music-1440.png
- Create: .audit-20260718-cross-model-music/music-1280.png
- Create: .audit-20260718-cross-model-music/music-1024.png
- Create: .audit-20260718-cross-model-music/music-1024-output.png
- Create: .audit-20260718-cross-model-music/music-390.png
- Create: .audit-20260718-cross-model-music/qa-notes.md

**Interfaces:**
- Consumes Tasks 1-5.
- Produces evidence for user acceptance.

- [ ] **Step 1: Confirm local server**

~~~bash
curl -I http://127.0.0.1:8766/index.html
~~~

Expected: HTTP 200. If unavailable, start python3 serve-local.py 8766 in a persistent session.

- [ ] **Step 2: Test the complete browser workflow**

Open:

~~~text
http://127.0.0.1:8766/index.html?workspace=music&fresh=cross-model-music-v1
~~~

Verify:

1. Music is active and default library has at least one template.
2. Search and purpose/genre filters return matching cards.
3. Edited template replacement: cancel preserves, accept replaces.
4. Preset plus individual instrument toggles update correct layers without duplicates.
5. All five targets preserve the master and change only output fields.
6. Concise is shorter than detailed and density switching loses no state.
7. Advanced values survive collapse/reopen.
8. Missing English scene shows the exact warning and no fabricated translation.
9. All outputs contain instrumental restrictions.
10. Suno shows Style/Exclude/Title/Instrumental; Stable Audio uses ordered sections.
11. Per-field and copy-all values exactly match visible output.
12. Clear and example each cause one persisted write.
13. Refresh and two-project switching restore independent music states.
14. A legacy no-music project loads defaults and preserves the five old workspaces.
15. Console has 0 errors and 0 warnings.

- [ ] **Step 3: Capture and inspect exact viewports**

- 1440x1024 -> music-1440.png.
- 1280x960 -> music-1280.png.
- 1024x768 -> music-1024.png.
- Scroll 1024 to output -> music-1024-output.png.
- 390x844 -> music-390.png.

Inspect every PNG; DOM measurements do not replace visual inspection.

- [ ] **Step 4: Write QA evidence**

~~~markdown
# Cross-Model Music Workspace QA

- [ ] 1440 desktop composition
- [ ] 1280 compact desktop composition
- [ ] 1024 stacked order and output reachability
- [ ] 390 mobile composition and zero horizontal overflow
- [ ] Template search, filter, and replacement
- [ ] Orchestration preset and individual editing
- [ ] Five adapters and density switching
- [ ] Advanced-control persistence
- [ ] Local translation boundary
- [ ] Instrumental restrictions and copy accuracy
- [ ] Project refresh, switch, import, and legacy compatibility
- [ ] Keyboard focus and both resizers
- [ ] Console free of errors and warnings
~~~

Mark [x] only with a concrete evidence sentence. For logic defects add a failing assertion first. For visual defects record viewport and selector, fix, and recapture.

- [ ] **Step 5: Run final verification and scope checks**

Run all syntax checks, full Node suite, git diff --check, and a scoped diff of declared files plus audit evidence. Expected: all pass and unrelated dirty files remain untouched.

- [ ] **Step 6: Commit verified evidence**

~~~bash
git add index.html music-data.js music-adapters.js music-app.js music-workspace.css ui-motion.js prompt-generator.test.js .audit-20260718-cross-model-music
git diff --cached --check
git commit -m "test: verify cross-model music workbench"
~~~

Stage workspace-core.js only if Task 5 changed it.

---

### Task 7: User Acceptance Gate

**Files:**
- No changes unless the user reports a reproducible defect.

- [ ] **Step 1: Provide review URL**

~~~text
http://127.0.0.1:8766/index.html?workspace=music&fresh=cross-model-music-final-v1
~~~

- [ ] **Step 2: Ask the user to review**

Ask about template readability, orchestration selection, lightweight structure, advanced-control density, five target outputs, copy ergonomics, and whether it feels like a film-scoring director tool instead of a generic form.

- [ ] **Step 3: Hold next-feature gate**

Do not plan or implement project center, audio generation, or API integration until explicit acceptance. Convert defects into reproducible browser checks, add regression coverage, fix, recapture, and provide a new cache-busted URL.
