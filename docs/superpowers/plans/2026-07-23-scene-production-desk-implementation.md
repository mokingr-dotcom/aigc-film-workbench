# Scene Production Desk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the project workspace into a screenplay-driven scene production desk that makes full scene durations, shot counts, shot plans, and editable video prompts immediately legible.

**Architecture:** Preserve the local project store and its screenplay parser. Extend normalized scene data with an optional `estimatedDurationSeconds`, derive scene production summaries from the shots, and render a compact scene table before the selected scene editor. The editor remains a single-scene detail view: scene brief and continuity first, shot plan second, current-shot prompt last.

**Tech Stack:** Vanilla JavaScript, localStorage project store, HTML templates, CSS Grid, Node `assert` test runner.

## Global Constraints

- A scene is a narrative unit; a shot is the independently generated video unit.
- Seedance's 15 seconds is only the default shot duration; all shot durations stay editable.
- Screenplay analysis is local and advisory. It must not claim to have rendered, generated, or understood media through an external model.
- Existing project scenes, asset locks, prompt copying, and camera handoff must remain compatible.
- Do not introduce API keys, cloud uploads, or model execution in this phase.

---

### Task 1: Store explicit scene duration planning data

**Files:**
- Modify: `project-store.js:228-258`
- Modify: `prompt-generator.test.js:435-460`

**Interfaces:**
- Produces `scene.estimatedDurationSeconds: number`, normalized to `0..3600`; `0` means use summed shot duration.
- Produces `sceneDurationSeconds(scene): number` in `project-scenes.js`, returning `estimatedDurationSeconds || sum(shots.durationSeconds)`.

- [ ] **Step 1: Write the failing store test**

```js
runTest("scene normalization preserves planned scene duration while shots remain independent", () => {
  const [scene] = normalizeProjectScenes([{
    estimatedDurationSeconds: 52,
    shots: [{ durationSeconds: 12 }, { durationSeconds: 15 }]
  }]);
  assert.strictEqual(scene.estimatedDurationSeconds, 52);
  assert.strictEqual(scene.shots.length, 2);
  assert.strictEqual(scene.shots[0].durationSeconds, 12);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Expected: the new assertion fails because the normalized scene has no `estimatedDurationSeconds` field.

- [ ] **Step 3: Normalize the field without changing existing projects**

In `normalizeProjectScenes`, add this exact normalized property before `shots`:

```js
estimatedDurationSeconds: Number.isFinite(Number(scene.estimatedDurationSeconds))
  ? Math.max(0, Math.min(3600, Math.round(Number(scene.estimatedDurationSeconds))))
  : 0,
```

In screenplay parsing, leave this field absent or set it to `0`, so parsed scenes use shot totals until the user supplies a production estimate.

- [ ] **Step 4: Run the test to verify it passes**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Expected: all tests pass.

### Task 2: Make the scene list a production plan instead of a navigation list

**Files:**
- Modify: `project-scenes.js:270-410`
- Modify: `project-scenes.css:project production strip rules`
- Modify: `prompt-generator.test.js:718-740`

**Interfaces:**
- Consumes normalized `scene.estimatedDurationSeconds`, `scene.shots`, `scene.characters`, and `sceneReadiness(scene)`.
- Produces `sceneProductionSummary(scene)` with `plannedSeconds`, `shotSeconds`, `shotCount`, `generatedCount`, and `ready`.
- Renders a `scene-production-plan` table with one selectable row per scene.

- [ ] **Step 1: Write the failing UI contract test**

```js
runTest("project scene sheet exposes a scene production plan before individual shot editing", () => {
  const scenes = fs.readFileSync("project-scenes.js", "utf8");
  assert(scenes.includes("sceneProductionSummary"));
  assert(scenes.includes("scene-production-plan"));
  assert(scenes.includes("预计时长"));
  assert(scenes.includes("镜头数"));
  assert(scenes.includes("生成进度"));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Expected: it fails because the production-plan helper and markup do not yet exist.

- [ ] **Step 3: Add the summary helper and plan markup**

Add a helper in `project-scenes.js`:

```js
function sceneProductionSummary(scene) {
  const shots = Array.isArray(scene?.shots) ? scene.shots : [];
  const shotSeconds = shots.reduce((total, shot) => total + Number(shot?.durationSeconds || 0), 0);
  const plannedSeconds = Number(scene?.estimatedDurationSeconds || 0) || shotSeconds;
  return {
    plannedSeconds,
    shotSeconds,
    shotCount: shots.length,
    generatedCount: shots.filter((shot) => shot?.status === "generated" || shot?.status === "locked").length,
    ready: sceneReadiness(scene).ready
  };
}
```

Render one compact table before the existing editor. Columns are `场次`, `剧情目标`, `预计时长`, `镜头数`, `出场人物`, `生成进度`. Rows use the existing `data-scene-action="select-scene"` and `data-scene-id` attributes. Retain the existing image strip as a secondary visual navigator, not the only scene overview.

Style the table as dense production information: fixed numeric columns, no clipped primary text, horizontal scrolling only below 900 px, and selected-row state aligned with the existing production-strip selection.

- [ ] **Step 4: Run UI contract test and visual test**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Then open `http://127.0.0.1:8766/index.html?workspace=project` and create two temporary scenes with different shot counts. Confirm the table shows `2 场`, separate planned durations, separate shot counts, and distinct generated counts. Delete temporary scenes after the check.

### Task 3: Center the selected scene on a production brief and shot plan

**Files:**
- Modify: `project-scenes.js:590-770`
- Modify: `project-scenes.css:project-scene-shot-board rules`
- Modify: `prompt-generator.test.js:718-740`

**Interfaces:**
- Consumes `sceneProductionSummary(scene)`, editable scene fields, and independent shots.
- Produces an `estimatedDurationSeconds` scene field and a labelled shot-plan header.
- Keeps `scenePromptPackage()` export format compatible and extends its first line with planned scene duration.

- [ ] **Step 1: Write the failing UI contract test**

```js
runTest("selected scene shows a production brief and separates scene duration from shot duration", () => {
  const scenes = fs.readFileSync("project-scenes.js", "utf8");
  assert(scenes.includes('field("本场预计时长（秒）", "estimatedDurationSeconds"'));
  assert(scenes.includes("本场镜头计划"));
  assert(scenes.includes("单镜头生成提示词"));
  assert(scenes.includes("场次预计"));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Expected: it fails before the new scene-duration field and hierarchy labels exist.

- [ ] **Step 3: Update selected scene hierarchy**

Place `field("本场预计时长（秒）", "estimatedDurationSeconds", scene.estimatedDurationSeconds || sceneDuration(scene))` in the scene-brief fields. Rename the shot-board heading to `本场镜头计划` and state both `场次预计 ${plannedSeconds} 秒` and `镜头合计 ${shotSeconds} 秒`; when different, show `计划与镜头合计相差 ${Math.abs(plannedSeconds - shotSeconds)} 秒` as an advisory notice.

Rename the right-panel visible title to `单镜头生成提示词`. Keep model tabs, copy-current-prompt, copy-scene-package, and camera handoff. Change the package header to:

```js
`【整场镜头包】${sceneLabel(scene)}｜场次预计 ${sceneProductionSummary(scene).plannedSeconds} 秒｜${scene.shots.length} 个镜头`
```

Do not prevent copying when the estimate and shot total differ; the difference helps the creator find a missing or overlong shot.

- [ ] **Step 4: Run tests and perform interaction verification**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

In the local project workspace, create one scene with 50 seconds planned duration, add shots at 12, 15, 11, and 12 seconds, select the third shot, and verify: the selected panel says `单镜头生成提示词`, the current prompt remains limited to the third shot, and the full package begins with `场次预计 50 秒｜4 个镜头`.

### Task 4: Version, regression check, and delivery

**Files:**
- Modify: `index.html:project-scenes CSS and JS query versions`
- Modify: `docs/audits/2026-07-23-asset-lock-audit/findings.md` only if a related prior assertion needs correction

**Interfaces:**
- Delivers a cache-busted local project workspace URL.

- [ ] **Step 1: Bump browser resource query versions**

Use one shared query suffix for the changed scene stylesheet and script, for example `scene-production-desk-v1`, so the local browser cannot retain the previous scene hierarchy.

- [ ] **Step 2: Run full regression suite**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Expected: exit code `0` and all `PASS` lines.

- [ ] **Step 3: Verify served page and inspect visual layout**

Run:

```sh
curl -fsS 'http://127.0.0.1:8766/index.html?workspace=project&fresh=scene-production-desk-v1' \
  | rg 'scene-production-desk-v1'
git diff --check
```

Expected: both changed resource URLs are served and `git diff --check` is silent.

- [ ] **Step 4: Deliver the local URL**

Deliver `http://127.0.0.1:8766/index.html?workspace=project&fresh=scene-production-desk-v1` with a concise explanation that a scene is now a complete production unit and a shot is only an independently generated piece.
