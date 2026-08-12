# 镜头生成结果回填 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Let an AIGC creator record, select, and export the actual external generation result for every project shot.

**Architecture:** Extend the normalized shot record with a bounded \`productionResults\` array that stores only metadata, a project-reference image ID, and an external HTTPS URL. Keep image Blobs in the existing \`project-reference-store.js\`; render and mutate production-result state from a focused \`project-shot-results.js\` module, while \`project-scenes.js\` owns the existing DOM event delegation and project persistence.

**Tech Stack:** Vanilla JavaScript, existing project localStorage store, IndexedDB project reference store, CSS, Node assertion test runner, local browser QA.

## Global Constraints

- No external image/video/music generation API calls.
- Never store video Blobs; external video is an HTTPS result URL only.
- Reuse \`project-reference-store.js\` for keyframe images and keep only IDs in project JSON.
- At most 12 result records per shot and exactly zero or one selected result.
- Do not change screenplay analysis, scene splitting, or video prompt composition behavior.
- Preserve current project IDs, asset IDs, existing statuses, and old-project migration behavior.

---

### Task 1: Normalize and mutate shot production-result data

**Files:**
- Create: \`project-shot-results.js\`
- Modify: \`project-store.js:1-110, normalizeSceneShot\`
- Modify: \`prompt-generator.test.js\`

**Interfaces:**
- Consumes: existing shot fields \`id\`, \`status\`, \`productionResults\`.
- Produces: \`normalizeProductionResults(value)\`, \`createProductionResult(value, now)\`, \`selectProductionResult(shot, resultId)\`, \`deleteProductionResult(shot, resultId)\`, and \`resultStatusFor(record)\`.
- Produces: normalized \`shot.productionResults\` for project persistence and downstream rendering.

- [ ] **Step 1: Write the failing tests**

\`\`\`js
const resultsApi = require("./project-shot-results.js");

runTest("shot production results normalize selected versions and safe metadata", () => {
  const records = resultsApi.normalizeProductionResults([
    { id: "result-old", selected: true, resultUrl: "javascript:alert(1)", platform: "seedance" },
    { id: "result-new", selected: true, resultUrl: "https://example.test/video", seed: "42", createdAt: "2026-07-26T10:00:00.000Z" }
  ]);
  assert.strictEqual(records.length, 2);
  assert.strictEqual(records.filter((item) => item.selected).length, 1);
  assert.strictEqual(records[1].resultUrl, "https://example.test/video");
  assert.strictEqual(records[0].resultUrl, "");
});

runTest("selecting and deleting production results preserve a valid selected version", () => {
  const shot = { status: "generated", productionResults: [
    { id: "result-a", versionLabel: "V1", selected: true },
    { id: "result-b", versionLabel: "V2", selected: false }
  ] };
  const selected = resultsApi.selectProductionResult(shot, "result-b");
  assert.strictEqual(selected.status, "locked");
  assert.deepStrictEqual(selected.productionResults.map((item) => item.selected), [false, true]);
  assert.throws(() => resultsApi.deleteProductionResult(selected, "result-b"), /选定/);
});
\`\`\`

- [ ] **Step 2: Run the focused test to verify it fails**

Run: \`node prompt-generator.test.js\`

Expected: FAIL because \`project-shot-results.js\` does not exist.

- [ ] **Step 3: Implement the pure result module and store migration**

\`\`\`js
function normalizeProductionResults(value) {
  const records = Array.isArray(value) ? value.slice(-12).map(normalizeRecord) : [];
  const selectedIndex = records.map((record, index) => record.selected ? index : -1).filter((index) => index >= 0).pop();
  return records.map((record, index) => ({ ...record, selected: index === selectedIndex }));
}

function selectProductionResult(shot, resultId) {
  const records = normalizeProductionResults(shot.productionResults);
  if (!records.some((record) => record.id === resultId)) throw new Error("未找到该生成版本。");
  return { ...shot, status: "locked", productionResults: records.map((record) => ({ ...record, selected: record.id === resultId })) };
}
\`\`\`

In \`normalizeSceneShot\`, add \`productionResults: resultsApi.normalizeProductionResults(source.productionResults)\` after \`negativeConstraints\`. Browser fallback must return \`[]\` when the module is not loaded.

- [ ] **Step 4: Run the focused tests and full suite**

Run: \`node prompt-generator.test.js\`

Expected: PASS, including both new result-data tests and existing project-store tests.

- [ ] **Step 5: Commit the isolated data change**

\`\`\`bash
git add project-shot-results.js project-store.js prompt-generator.test.js
git commit -m "feat: track shot production result metadata"
\`\`\`

### Task 2: Add production-result UI and safe keyframe persistence

**Files:**
- Modify: \`index.html\`
- Modify: \`project-scenes.js:1-80, renderEditor, renderAll, delegated actions\`
- Modify: \`project-scenes.css\`
- Modify: \`prompt-generator.test.js\`

**Interfaces:**
- Consumes: \`aigcProjectShotResults\` from Task 1 and \`aigcProjectReferenceStore.putFile(file, projectId)\`.
- Produces: \`renderShotProductionResults(scene, shot)\`, result form actions, and image reference cleanup only after the project save succeeds.
- Produces: a \`data-scene-action\` event contract: \`open-result-form\`, \`save-result\`, \`select-result\`, \`delete-result\`, \`open-result-url\`.

- [ ] **Step 1: Write the failing UI contract tests**

\`\`\`js
runTest("project scene desk exposes the shot production result panel and actions", () => {
  const source = fs.readFileSync("project-scenes.js", "utf8");
  ["renderShotProductionResults", "open-result-form", "save-result", "select-result", "delete-result"]
    .forEach((needle) => assert(source.includes(needle), \`missing \${needle}\`));
  assert(source.includes("project-result-keyframe-upload"));
});

runTest("project result UI keeps a compact production history at narrow widths", () => {
  const css = fs.readFileSync("project-scenes.css", "utf8");
  assert(css.includes(".project-shot-results"));
  assert(css.includes("@media (max-width: 720px)"));
});
\`\`\`

- [ ] **Step 2: Run the focused test to verify it fails**

Run: \`node prompt-generator.test.js\`

Expected: FAIL because the result panel and actions do not exist.

- [ ] **Step 3: Implement the result panel and image lifecycle**

Add a hidden file input in \`index.html\`:

\`\`\`html
<input id="project-result-keyframe-upload" type="file" accept="image/*" hidden>
\`\`\`

Render a panel directly after \`project-scene-shot-board\`. The new-form save path must:

1. Require at least one of keyframe file or HTTPS URL.
2. Call \`projectReferenceStore.putFile(file, activeProject().id)\` when a keyframe is selected.
3. Build a record with \`createProductionResult\`.
4. Patch the current scene only through existing \`core.patchProjectScenes\`.
5. Remove a just-uploaded keyframe when persistence fails.
6. Delete a keyframe only after a version deletion succeeds and no other result or asset lock references it.

Use \`img[data-project-result-preview]\` and existing reference preview cache patterns to render local thumbnails. Never embed the external result URL in an iframe.

CSS must make the form and history readable inside the existing project center column: one compact header, a responsive field grid, thumbnail cards, and a low-saturation selected state.

- [ ] **Step 4: Run tests and perform local browser interaction QA**

Run: \`node prompt-generator.test.js\`

Expected: PASS.

Browser scenario:

1. Open a project with one shot.
2. Open “登记生成结果”.
3. Upload a small image and enter \`https://example.com/result\`.
4. Save as “视频已生成”.
5. Select the saved version as the current result.
6. Confirm thumbnail, model, status and selected state remain visible after switching to another shot and back.

- [ ] **Step 5: Commit the UI change**

\`\`\`bash
git add index.html project-scenes.js project-scenes.css prompt-generator.test.js
git commit -m "feat: add shot result return panel"
\`\`\`

### Task 3: Surface selected results in progress and delivery output

**Files:**
- Modify: \`project-delivery.js\`
- Modify: \`project-scenes.js:sceneProductionSummary, renderProductionStrip, renderSceneProductionPlan\`
- Modify: \`prompt-generator.test.js\`

**Interfaces:**
- Consumes: \`shot.productionResults\` and selected result metadata from Task 1.
- Produces: \`selectedResult\` on delivery shot records, selected-result Markdown, and generated/revision/locked project counters.

- [ ] **Step 1: Write failing delivery and summary tests**

\`\`\`js
runTest("project delivery exports only the selected shot production result", () => {
  const delivery = buildProjectShotDelivery({
    name: "测试项目",
    scenes: [{ number: 1, title: "码头", shots: [{ id: "shot-1", durationSeconds: 15, productionResults: [
      { id: "result-a", versionLabel: "V1", selected: false, resultUrl: "https://example.test/old" },
      { id: "result-b", versionLabel: "V2", selected: true, platform: "seedance", seed: "99", resultUrl: "https://example.test/final" }
    ] }] }]
  });
  assert(delivery.markdown.includes("V2"));
  assert(delivery.markdown.includes("https://example.test/final"));
  assert(!delivery.markdown.includes("https://example.test/old"));
});
\`\`\`

- [ ] **Step 2: Run the focused test to verify it fails**

Run: \`node prompt-generator.test.js\`

Expected: FAIL because delivery does not contain selected-result metadata.

- [ ] **Step 3: Implement result-aware delivery and production counters**

In \`project-delivery.js\`, expose the selected result per shot and append a \`### 选定生成结果\` block only when it exists:

\`\`\`md
- 版本：V2
- 平台 / 模型：Seedance / Seedance 1.5 Pro
- Seed：99
- 外部结果：https://example.test/final
- 备注：已通过角色与场景一致性人工检查
\`\`\`

In the production strip, calculate and display four counters: \`已就绪\`, \`已生成\`, \`待返工\`, \`已锁定\`. Existing \`生成进度\` should continue to count \`generated\` and \`locked\` shots as complete production outputs.

- [ ] **Step 4: Run tests and browser QA**

Run: \`node prompt-generator.test.js\`

Expected: PASS.

Browser scenario:

1. Ensure one shot has an unselected result and one selected result.
2. Copy the whole project shot delivery.
3. Verify clipboard text includes only the selected result.
4. Verify production strip counters match current shot statuses.

- [ ] **Step 5: Commit delivery integration**

\`\`\`bash
git add project-delivery.js project-scenes.js prompt-generator.test.js
git commit -m "feat: export selected shot production results"
\`\`\`

### Task 4: End-to-end regression, visual review, and handoff

**Files:**
- Modify: \`prompt-generator.test.js\` only if a real regression requires a missing coverage test.
- Modify: \`docs/superpowers/plans/2026-07-26-shot-production-results-implementation.md\` to mark completed tasks.

**Interfaces:**
- Consumes: all interfaces from Tasks 1-3.
- Produces: verified local project workflow and a delivery URL for the user.

- [ ] **Step 1: Run static and full test validation**

Run:

\`\`\`bash
git diff --check
node prompt-generator.test.js
\`\`\`

Expected: no whitespace errors and all tests pass.

- [ ] **Step 2: Run end-to-end browser scenario**

Use the local project workspace and perform:

1. Select a scene and shot with complete base prompt conditions.
2. Lock or verify its character/location assets.
3. Create a keyframe-only V1, then a linked V2.
4. Mark V2 selected and set it locked.
5. Copy the single-shot prompt and whole-project delivery; verify prompt is unchanged and whole-project delivery includes V2 only.
6. Reload the page; verify result metadata, thumbnail, selection and counters persist.
7. Check a narrow viewport for clipping or unreadable controls.

- [ ] **Step 3: Review against the design spec**

Check every acceptance item in \`docs/superpowers/specs/2026-07-26-shot-production-results-design.md\` and record any intentionally deferred requirement. Do not call the result panel a visual-consistency AI audit.

- [ ] **Step 4: Commit final test/documentation updates**

\`\`\`bash
git add prompt-generator.test.js docs/superpowers/plans/2026-07-26-shot-production-results-implementation.md
git commit -m "test: verify shot production result workflow"
\`\`\`

