# 本地场次智能分析 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn confirmed screenplay scenes into user-approved, editable production-field drafts without API dependencies.

**Architecture:** Keep deterministic extraction and draft construction in `scene-assistant-data.js`; let `project-scenes.js` render and merge that draft only after an explicit action. Existing project store scene normalization, prompt building, and camera handoff remain the source of truth after merge.

**Tech Stack:** Vanilla JavaScript, local project store, Node assert regression suite, in-app browser QA.

## Global Constraints

- Do not call a network service or model API.
- Never overwrite any non-empty scene, video-card, shot-card, visual-override, or asset-lock value.
- Do not write color or lighting suggestions into the project or scene visual fields.
- Keep all output in Chinese and bounded in length.
- Verify with `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js` and local browser flow.

---

### Task 1: Build deterministic scene-analysis drafts

**Files:**
- Modify: `scene-assistant-data.js`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: `{ title, setting, storyBeat }` scene object.
- Produces: `buildSceneAssistantDraft(scene)` with characters, emotion, action, dialogue, props, references, and summary.

- [ ] **Step 1: Write the failing extraction tests**

```js
const draft = buildSceneAssistantDraft({
  storyBeat: "阿岚把照片放在柜台上，对店员说：这张照片不是我拍的。她强忍不安，慢慢抬头。"
});
assert.deepStrictEqual(draft.characters, ["阿岚"]);
assert.strictEqual(draft.emotion, "不安");
assert(draft.action.includes("阿岚把照片放在柜台上"));
assert.strictEqual(draft.dialogue, "阿岚：这张照片不是我拍的");
assert(draft.props.includes("照片"));
```

- [ ] **Step 2: Run the focused suite and verify failure**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Expected: the new test fails because `buildSceneAssistantDraft` is not exported.

- [ ] **Step 3: Implement bounded local extraction**

```js
function buildSceneAssistantDraft(scene) {
  const candidates = extractSceneCandidates(scene);
  return {
    characters: candidates.characterCandidates.slice(0, 4),
    emotion: candidates.emotionCandidates[0] || "",
    action: candidates.actionSummary || "",
    dialogue: candidates.dialogueLines[0]
      ? `${candidates.dialogueLines[0].speaker}：${candidates.dialogueLines[0].text}`
      : "",
    props: candidates.propCandidates.slice(0, 5),
    references: { performance: SCENE_REFERENCE_LIBRARY.performance[0], framing: SCENE_REFERENCE_LIBRARY.framing[0], movement: SCENE_REFERENCE_LIBRARY.movement[0] },
    summary: ""
  };
}
```

- [ ] **Step 4: Run the full suite and verify pass**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Expected: all tests pass.

### Task 2: Render and apply a safe scene-analysis draft

**Files:**
- Modify: `project-scenes.js`
- Modify: `project-scenes.css`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: `root.aigcSceneAssistantData.buildSceneAssistantDraft(scene)`.
- Produces: a visible `剧本分析草稿` panel and `apply-scene-analysis` click action.

- [ ] **Step 1: Write the failing UI-contract tests**

```js
const source = fs.readFileSync("project-scenes.js", "utf8");
assert(source.includes("buildSceneAssistantDraft"));
assert(source.includes('data-scene-action="apply-scene-analysis"'));
assert(source.includes("write only blank fields"));
```

- [ ] **Step 2: Run the focused suite and verify failure**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Expected: the new source contract fails before the panel exists.

- [ ] **Step 3: Implement explicit blank-only merge**

```js
if (!scene.characters.length && draft.characters.length) scene.characters = draft.characters;
if (!scene.emotion && draft.emotion) scene.emotion = draft.emotion;
if (!scene.action && draft.action) scene.action = draft.action;
if (!scene.videoCard.dialogue && draft.dialogue) scene.videoCard.dialogue = draft.dialogue;
if (!shot.framing && draft.references.framing) shot.framing = draft.references.framing.prompt;
```

Render source-derived chips and a single `写入空白字段` button. Add compact, high-contrast styling consistent with the current project workbench.

- [ ] **Step 4: Run the full suite and verify pass**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Expected: all tests pass.

### Task 3: Verify the complete local production flow

**Files:**
- Modify: `index.html` only if script cache versions must change.
- Test: local page `http://127.0.0.1:8766/index.html?workspace=project&fresh=scene-analysis-qa-v1`

**Interfaces:**
- Consumes: a two-scene Chinese screenplay and the visible scene-analysis panel.
- Produces: a populated prompt and camera handoff that retain the screenplay-derived values.

- [ ] **Step 1: Enter and confirm the two-scene QA screenplay**

Use the local page to enter scenes containing 阿岚、旧相机、手机、照片、店员、明确台词和不安情绪. Confirm that two scenes are created.

- [ ] **Step 2: Apply the scene analysis only to scene 01**

Confirm that the panel detects 阿岚, relevant props, action and the available emotion; click `写入空白字段`.

- [ ] **Step 3: Verify prompt and handoff**

Confirm the project prompt includes the named character, action and original setting. Send the scene to 15-second camera and confirm scene, performance/action and sound fields retain the selected scene data.

- [ ] **Step 4: Clean test content**

Delete the temporary scenes and use `移除已保存剧本`; verify the empty project state returns.

- [ ] **Step 5: Run final regression**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js && git diff --check`

Expected: exit code `0`.
