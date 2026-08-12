# AIGC 影视项目引导与视觉圣经 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为现有 AIGC 电影视觉工作台增加导演启动台、项目视觉圣经、引导/专业双模式和工作台继承摘要，让新用户可以从故事简报进入完整影视制作流程。

**Architecture:** 在现有 `project-store.js` 之上升级项目 schema，新增纯函数管理 `creativeBrief` 与 `visualBible`。`project-foundation.js` 只负责三步启动台与视觉圣经编辑，`project-context.js` 只负责把锁定的项目基准显示并插入到各工作台；`workspace-core.js` 保持唯一持久化和项目切换边界。现有六个工作台继续拥有自身提示词和状态，不重写内部布局。

**Tech Stack:** 原生 HTML/CSS/JavaScript、IIFE/CommonJS 兼容模块、localStorage、现有 IndexedDB 资产存储、Node `assert` 回归测试、Playwright 本地浏览器验收。

## Global Constraints

- 影视 / AIGC 短片是本阶段唯一完整引导流程；商品图与商业视觉不进入本轮工作台。
- 保留项目、影调、15 秒运镜、角色定妆、海报、画面反推、音乐配乐七个顶部入口和全部现有 ID。
- 项目桌面不是创作工作台，不能写入 `project.workspaces` 或把 `project.activeWorkspace` 改为 `projects`。
- 所有默认预览、默认影调、默认运镜、默认海报和默认音乐都不得记为项目已完成。
- 继续本地优先存储；不接账号、订阅、云同步、模型 API 或聊天式 Agent。
- 图像只保存资产引用与 Blob，不把 Base64 图像写入项目 JSON。
- 引导模式可以跳过，专业模式必须能直接进入任意工作台。
- 在 1440、1280、1024、820、390 宽度下无横向溢出、文字遮挡或不可达操作。

---

## File Map

- Modify `project-store.js`: schema 3 迁移、项目简报、视觉圣经和纯状态变换。
- Modify `project-summary.js`: 新增项目视觉阶段摘要与确定性“继续当前制作”规则。
- Modify `workspace-core.js`: 暴露项目基础窄 API、保持项目切换期间上下文同步。
- Create `project-reference-store.js`: 项目参考图的本地 Blob 存储、元数据和安全删除。
- Create `project-foundation.js`: 三步导演启动台、视觉圣经编辑、草案/锁定操作。
- Create `project-context.js`: 六个工作台共享的项目基准条、复制与插入操作。
- Modify `project-dashboard.js`: 启动台入口、视觉圣经摘要、继续当前制作和专业模式入口。
- Modify `project-dashboard.css`: 启动台与视觉圣经在项目桌面的布局和响应式。
- Modify `index.html`: 追加启动台/视觉圣经语义结构、工作台上下文挂点和脚本顺序。
- Modify `app.js`, `camera-app.js`, `casting-app.js`, `poster-app.js`, `reverse-app.js`, `music-app.js`: 暴露 `receiveProjectContext(context)`，将项目基准插入各自已有的自由文本字段。
- Modify `prompt-generator.test.js`: 数据迁移、启动台、锁定、继承、上下文插入和页面合同测试。

## Shared Interfaces

`project-store.js` 新增并导出以下纯函数：

```js
normalizeCreativeBrief(value) => CreativeBrief
normalizeVisualBible(value) => VisualBible
patchProjectFoundation(store, projectId, patch, now) => ProjectStore
lockVisualBible(store, projectId, now) => ProjectStore
unlockVisualBible(store, projectId, now) => ProjectStore
```

`workspace-core.js` 新增以下浏览器 API：

```js
getActiveProject() => Project
patchProjectFoundation(patch) => Promise<Project>
lockActiveVisualBible() => Promise<Project>
unlockActiveVisualBible() => Promise<Project>
getProjectContext() => { project, brief, bible, prompt }
continueActiveProject() => { target: "foundation" | WorkspaceId, reason: string }
```

`project-context.js` 调用以下统一工作台方法；各工作台没有对应自由文本字段时返回 `false`，不得抛错：

```js
receiveProjectContext(context) => boolean
```

### Task 1: Project Schema 3 And Foundation State

**Files:**
- Modify: `project-store.js`
- Modify: `prompt-generator.test.js`

**Consumes:** 现有 schema 2 项目、`normalizeProjectStore`、`createBlankProject`。

**Produces:** schema 3 项目迁移与项目基础状态纯函数，供后续 UI 和持久化使用。

- [ ] **Step 1: Write failing data-contract tests**

Add tests that normalize a schema 2 project and assert exact safe defaults:

```js
runTest("project store migrates a film brief and visual bible without changing workspaces", () => {
  const store = normalizeProjectStore({
    schemaVersion: 2, onboardingComplete: true, activeProjectId: "p1",
    projects: [{ id: "p1", name: "雾港", activeWorkspace: "camera", workspaces: { camera: { scene: "码头" } } }]
  }, { createBlankProject: () => ({ id: "starter", name: "未命名电影项目", workspaces: {} }) });
  const project = store.projects[0];
  assert.strictEqual(store.schemaVersion, 3);
  assert.deepStrictEqual(project.workspaces.camera, { scene: "码头" });
  assert.strictEqual(project.creativeBrief.story, "");
  assert.strictEqual(project.visualBible.status, "draft");
  assert.deepStrictEqual(project.visualBible.toneItems, []);
});

runTest("locking a visual bible preserves local overrides and timestamps", () => {
  const next = lockVisualBible(baseStore, "p1", "2026-07-21T10:00:00.000Z");
  assert.strictEqual(next.projects[0].visualBible.status, "locked");
  assert.strictEqual(next.projects[0].visualBible.updatedAt, "2026-07-21T10:00:00.000Z");
  assert.deepStrictEqual(next.projects[0].workspaces.camera, baseStore.projects[0].workspaces.camera);
});
```

- [ ] **Step 2: Run the focused test and verify red**

Run:

```bash
PATH=/tmp/node-v22.23.1-darwin-arm64/bin:$PATH node --test prompt-generator.test.js
```

Expected: the two new tests fail because schema version is still 2 or foundation helpers are undefined.

- [ ] **Step 3: Implement normalization and immutable transitions**

Change `PROJECT_STORE_SCHEMA_VERSION` to `3`. Add these normalized shapes and attach them inside `normalizeProject`:

```js
function normalizeCreativeBrief(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    story: String(source.story || "").trim().slice(0, 280),
    platform: ["film", "short-video", "social", "pitch"].includes(source.platform) ? source.platform : "film",
    era: String(source.era || "").trim().slice(0, 60),
    region: String(source.region || "").trim().slice(0, 60),
    targetModels: Array.isArray(source.targetModels) ? source.targetModels.filter((item) => typeof item === "string").slice(0, 6) : [],
    route: ["casting", "camera", "poster", "music", "library"].includes(source.route) ? source.route : "library",
    referenceAssetIds: Array.isArray(source.referenceAssetIds) ? source.referenceAssetIds.filter((item) => typeof item === "string").slice(0, 12) : []
  };
}

function normalizeVisualBible(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    status: source.status === "locked" ? "locked" : "draft",
    toneItems: Array.isArray(source.toneItems) ? source.toneItems.filter((item) => item && typeof item.category === "string" && typeof item.id === "string").slice(0, 2) : [],
    mood: String(source.mood || "").trim().slice(0, 80),
    palette: Array.isArray(source.palette) ? source.palette.filter((item) => /^#[0-9a-f]{6}$/i.test(item)).slice(0, 5) : [],
    colorDirection: String(source.colorDirection || "").trim().slice(0, 220),
    lightingDirection: String(source.lightingDirection || "").trim().slice(0, 220),
    cameraDirection: String(source.cameraDirection || "").trim().slice(0, 220),
    materialDirection: String(source.materialDirection || "").trim().slice(0, 220),
    negativeConstraints: Array.isArray(source.negativeConstraints) ? source.negativeConstraints.filter((item) => typeof item === "string").slice(0, 12) : [],
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : ""
  };
}
```

Implement `patchProjectFoundation`, `lockVisualBible`, and `unlockVisualBible` by cloning the store, locating the exact project ID, normalizing only the supplied `creativeBrief` / `visualBible` fields, preserving `workspaces`, setting `updatedAt`, and returning the new store. Unknown project IDs must return the cloned unchanged store.

- [ ] **Step 4: Run data regression tests**

Run the full test command from Step 2.

Expected: all existing project-store tests and the new schema 3 tests pass.

- [ ] **Step 5: Commit the isolated data layer**

```bash
git add project-store.js prompt-generator.test.js
git commit -m "feat: add project brief and visual bible state"
```

### Task 2: Workspace Core Foundation API And Deterministic Continue Rule

**Files:**
- Modify: `workspace-core.js`
- Modify: `project-summary.js`
- Modify: `prompt-generator.test.js`

**Consumes:** Task 1 store transitions; existing `captureWorkspaces`, `applyProjectState`, `persistNow`.

**Produces:** narrow project foundation API and deterministic target selection without changing six workbench storage contracts.

- [ ] **Step 1: Write failing core tests**

```js
runTest("project continuation sends an unlocked project to foundation", () => {
  const result = decideProjectContinuation({ activeWorkspace: "camera", visualBible: { status: "draft" }, creativeBrief: { route: "camera" }, workspaces: {} });
  assert.deepStrictEqual(result, { target: "foundation", reason: "visual-bible-draft" });
});

runTest("project continuation honors the selected unfinished route after locking", () => {
  const result = decideProjectContinuation({
    activeWorkspace: "tone", visualBible: { status: "locked" }, creativeBrief: { route: "camera" },
    workspaces: { camera: { selectedExplicit: false } }
  });
  assert.deepStrictEqual(result, { target: "camera", reason: "route-incomplete" });
});
```

- [ ] **Step 2: Run the tests and verify red**

Run the command from Task 1 Step 2.

Expected: `decideProjectContinuation is not a function`.

- [ ] **Step 3: Implement core methods and project-context event**

Export `decideProjectContinuation(project)` from `project-summary.js`. It must return `foundation` when `visualBible.status !== "locked"`; otherwise check `creativeBrief.route` with the existing summary API; then fall back to a valid `activeWorkspace`; then `tone`.

In `workspace-core.js`, add a single internal `patchActiveFoundation(patch)` that calls `storeModel.patchProjectFoundation`, commits the result, and dispatches:

```js
document.dispatchEvent(new CustomEvent("aigc:project-context", {
  detail: getProjectContext()
}));
```

Expose `getActiveProject`, `patchProjectFoundation`, `lockActiveVisualBible`, `unlockActiveVisualBible`, `getProjectContext`, and `continueActiveProject`. `getProjectContext` must return a short prompt string assembled only from locked visual-bible fields:

```js
项目视觉基准：${[bible.colorDirection, bible.lightingDirection, bible.cameraDirection, bible.materialDirection, ...bible.negativeConstraints].filter(Boolean).join("；")}
```

Dispatch the same event after `applyProjectState`, after active-project switching, and after import completion. Do not call `captureWorkspaces` solely to construct this event.

- [ ] **Step 4: Run tests and browser smoke check**

Run the command from Task 1 Step 2, then open a fresh local page at `?workspace=project` and assert no console errors.

Expected: continuation returns `foundation` for a draft Bible; project switching updates the context event without modifying `activeWorkspace` to `projects`.

- [ ] **Step 5: Commit the core boundary**

```bash
git add workspace-core.js project-summary.js prompt-generator.test.js
git commit -m "feat: expose project visual foundation context"
```

### Task 3: Local Project Reference Assets

**Files:**
- Create: `project-reference-store.js`
- Modify: `project-store.js`
- Modify: `workspace-core.js`
- Modify: `index.html`
- Modify: `prompt-generator.test.js`

**Consumes:** Task 1 `creativeBrief.referenceAssetIds` and existing `aigcCastingAssetStore.prepareImage(file)` image normalization.

**Produces:** `root.aigcProjectReferenceStore` with Blob-only local references, and project metadata that stores only asset IDs.

- [ ] **Step 1: Write failing reference-asset tests**

```js
runTest("project reference assets remain outside project JSON", () => {
  const source = fs.readFileSync("project-reference-store.js", "utf8");
  const core = fs.readFileSync("workspace-core.js", "utf8");
  assert(source.includes('STORE_NAME = "project-references"'));
  assert(source.includes("aigcCastingAssetStore?.prepareImage"));
  assert(core.includes("aigcProjectReferenceStore"));
  const next = patchProjectFoundation(baseStore, "p1", { creativeBrief: { referenceAssetIds: ["ref-1"] } }, "2026-07-21T10:00:00.000Z");
  assert.deepStrictEqual(next.projects[0].creativeBrief.referenceAssetIds, ["ref-1"]);
  assert.strictEqual(JSON.stringify(next).includes("data:image"), false);
});
```

- [ ] **Step 2: Run tests and verify red**

Run the command from Task 1 Step 2.

Expected: missing `project-reference-store.js` and missing reference-store integration.

- [ ] **Step 3: Implement the separate IndexedDB reference store**

Create `project-reference-store.js` as an IIFE using `DB_NAME = "aigc-film-workbench-project-references-v1"` and `STORE_NAME = "project-references"`. Export browser methods `putFile(file, projectId)`, `get(id)`, `listForProject(projectId)`, and `remove(id)`.

`putFile` must call `root.aigcCastingAssetStore?.prepareImage(file)` and reject with “当前浏览器无法处理参考图片。” when unavailable. Store exactly `{ id, projectId, blob, name, type, width, height, size, updatedAt }`; return the same metadata without `blob`. Accept JPG, PNG and WebP only through the existing image validator. Use `asset-${crypto.randomUUID()}` style IDs prefixed as `project-ref-`.

In `workspace-core.js`, expose `addProjectReference(file)` and `removeProjectReference(assetId)`. `addProjectReference` must first persist the Blob, then patch the active project's `creativeBrief.referenceAssetIds`; if project persistence fails, remove the new Blob. `removeProjectReference` must first remove the asset ID from project metadata, persist it, then delete the Blob. Dispatch `aigc:project-context` after both successful operations.

Add `<input id="foundation-reference-upload" type="file" accept="image/jpeg,image/png,image/webp" multiple>` inside the brief step. Limit the selected project to 12 reference IDs. Render image previews through Object URLs and revoke them when the dialog closes or the list is replaced.

- [ ] **Step 4: Run tests and a real upload transaction**

Run the command from Task 1 Step 2. In Playwright upload one JPG, reload, confirm its thumbnail and metadata remain, remove it, reload again, and confirm the image is absent.

Expected: project JSON contains only `project-ref-*` IDs; no data URL appears in localStorage; a failed metadata write leaves no new Blob.

- [ ] **Step 5: Commit local reference assets**

```bash
git add project-reference-store.js project-store.js workspace-core.js index.html prompt-generator.test.js
git commit -m "feat: store project reference assets locally"
```

### Task 4: Director Start Workspace And Visual Bible Editor

**Files:**
- Create: `project-foundation.js`
- Modify: `index.html`
- Modify: `project-dashboard.css`
- Modify: `prompt-generator.test.js`

**Consumes:** Task 2 core API, Task 3 local reference assets, and `aigc:project-context` event.

**Produces:** the three-step dialog and the editable visual-Bible panel, accessible through `root.aigcProjectFoundation.open()`.

- [ ] **Step 1: Write failing DOM-contract tests**

```js
runTest("project foundation exposes the three guided film steps", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const source = fs.readFileSync("project-foundation.js", "utf8");
  assert(html.includes('id="project-foundation-dialog"'));
  assert(html.includes('data-foundation-step="brief"'));
  assert(html.includes('data-foundation-step="visual"'));
  assert(html.includes('data-foundation-step="route"'));
  assert(source.includes("aigcProjectFoundation"));
  assert(source.includes("lockActiveVisualBible"));
});
```

- [ ] **Step 2: Run tests and verify red**

Run the command from Task 1 Step 2.

Expected: the new DOM-contract test fails because the dialog and controller do not exist.

- [ ] **Step 3: Add accessible semantic markup and controller**

Add one `dialog#project-foundation-dialog` to `index.html`. It must contain exactly three `section[data-foundation-step]` panels and a named progress list. Use these field IDs:

```text
foundation-story, foundation-platform, foundation-era, foundation-region,
foundation-models, foundation-route, foundation-mood, foundation-color,
foundation-lighting, foundation-camera, foundation-material, foundation-negatives
```

Add visible buttons for “上一步”, “下一步”, “保存草案”, “锁定视觉基准”, “跳过引导”, and “进入专业模式”. Add a compact `#project-visual-bible` panel inside the existing project dashboard for later editing.

Create `project-foundation.js` as an IIFE. It must:

- render existing brief / Bible values without mutating them;
- persist only on explicit action through `core.patchProjectFoundation`;
- require project name and one-sentence story before moving from `brief` to `visual`;
- keep visual fields optional, but save a `draft` Bible;
- call `core.lockActiveVisualBible()` only after an explicit lock click;
- call `navigation.show("projects")` after a normal finish;
- use `navigation.show(target)` for a selected route or professional mode;
- never store file blobs or data URLs in the project object;
- close on Escape only after preserving already explicitly saved values.

Add CSS to keep the dialog under `min(1040px, calc(100vw - 32px))`, provide a single-column order under 820px, and use stable field heights.

- [ ] **Step 4: Run tests and manual interaction check**

Run the command from Task 1 Step 2. In Playwright, create a fresh project, fill the brief, save a visual Bible draft, reload, lock it, and verify the lock state remains visible.

Expected: keyboard focus remains inside the open dialog; reload shows the saved draft; no default selection increments the six-workspace count.

- [ ] **Step 5: Commit the guided entry flow**

```bash
git add index.html project-foundation.js project-dashboard.css prompt-generator.test.js
git commit -m "feat: add guided film project foundation"
```

### Task 5: Project Dashboard Integration And Mode Switching

**Files:**
- Modify: `project-dashboard.js`
- Modify: `project-dashboard.css`
- Modify: `index.html`
- Modify: `prompt-generator.test.js`

**Consumes:** Task 2 continuation decision and Task 4 `aigcProjectFoundation.open()`.

**Produces:** a dashboard that describes the visual Bible and sends users to the correct next task.

- [ ] **Step 1: Write failing dashboard tests**

```js
runTest("dashboard prioritizes the visual bible before generic workspace progress", () => {
  const source = fs.readFileSync("project-dashboard.js", "utf8");
  assert(source.includes("project-visual-bible"));
  assert(source.includes("continueActiveProject"));
  assert(source.includes("aigcProjectFoundation.open"));
});

runTest("dashboard keeps professional mode separate from persisted workspaces", () => {
  const source = fs.readFileSync("project-dashboard.js", "utf8");
  assert(source.includes('data-project-action="professional-mode"'));
  assert(!source.includes('activeWorkspace = "projects"'));
});
```

- [ ] **Step 2: Run tests and verify red**

Run the command from Task 1 Step 2.

Expected: dashboard contract tests fail before the new controls exist.

- [ ] **Step 3: Render Bible status and controlled next actions**

Add an unframed visual-Bible section between the current project spotlight and six-stage progress. It must show one status badge (`草案` or `已锁定`) plus four concise rows: 色彩、光影、摄影、材质. Empty values display “待确定”, not placeholder prose.

Replace the primary continuation handler with:

```js
const next = core.continueActiveProject();
if (next.target === "foundation") root.aigcProjectFoundation.open("visual");
else root.aigcWorkspaceNavigation.show(next.target);
```

Add separate actions: “编辑视觉圣经” opens the visual step; “专业模式” opens the current creative workspace or `tone`; “重新引导” opens `brief`. None of these write workspace defaults.

Use `project-summary.summarizeProject` unchanged for the existing six-workspace state grid, except show visual-Bible status before it. Preserve card selection, search, sort, favorites, detail drawer and onboarding import.

- [ ] **Step 4: Run regression and responsive checks**

Run the command from Task 1 Step 2. In Playwright capture 1440, 1024 and 390 screenshots of a draft project and a locked project.

Expected: visual Bible has a visible primary position; existing project cards remain readable; professional mode does not change project progress merely by opening a workspace.

- [ ] **Step 5: Commit dashboard integration**

```bash
git add project-dashboard.js project-dashboard.css index.html prompt-generator.test.js
git commit -m "feat: guide projects through visual bible"
```

### Task 6: Shared Project Context In Six Workbenches

**Files:**
- Create: `project-context.js`
- Modify: `index.html`
- Modify: `look-studio.js`
- Modify: `camera-app.js`
- Modify: `casting-app.js`
- Modify: `poster-app.js`
- Modify: `reverse-app.js`
- Modify: `music-app.js`
- Modify: `prompt-generator.test.js`

**Consumes:** Task 2 `getProjectContext()` and dispatch event.

**Produces:** a visually consistent inherited-context strip and explicit insertion into each workbench's existing free-text field.

- [ ] **Step 1: Write failing context tests**

```js
runTest("every creative workspace exposes a project context target", () => {
  const html = fs.readFileSync("index.html", "utf8");
  ["tone", "camera", "casting", "poster", "reverse", "music"].forEach((workspace) => {
    assert(html.includes(`data-project-context="${workspace}"`));
  });
});

runTest("every workbench accepts an explicit project context insertion", () => {
  ["app.js", "camera-app.js", "casting-app.js", "poster-app.js", "reverse-app.js", "music-app.js"].forEach((file) => {
    assert(fs.readFileSync(file, "utf8").includes("receiveProjectContext"));
  });
});
```

- [ ] **Step 2: Run tests and verify red**

Run the command from Task 1 Step 2.

Expected: missing `data-project-context` markers and `receiveProjectContext` methods.

- [ ] **Step 3: Implement context strip and field adapters**

Add one `section.project-context-strip[data-project-context]` as the first child of each existing creative workspace. It shows: project name, visual status, short locked summary, “复制基准”, “插入当前提示词”, and “仅本次覆盖” controls. Hide it only when no active project exists; do not hide it when Bible is draft.

Create `project-context.js`. On `aigc:project-context`, render all six strips. “复制基准” copies `detail.prompt`; “插入当前提示词” calls the matching workbench `receiveProjectContext(detail)`.

Implement adapters with exact existing targets:

```text
tone: append normalized context to #extra
camera: append normalized context to #camera-look
casting: append normalized context to the existing visual-tone free-text field
poster: append normalized context to #poster-look
reverse: append normalized context to #reverse-extra
music: append normalized context to extraRestrictions via the normalized music state
```

Each adapter must de-duplicate an identical context block, dispatch its normal dirty event, re-render its own output, and return `true`. If the Bible is draft, insert only the nonempty fields and prefix with “项目视觉草案”; if locked, prefix with “项目视觉基准”. Do not change the project Bible from any adapter.

- [ ] **Step 4: Run full tests and one real insertion per workspace**

Run the command from Task 1 Step 2. In Playwright, lock a Bible, visit each workspace, click “插入当前提示词”, and verify the appropriate target field contains one context block after a reload.

Expected: each workspace keeps its own local prompt content; repeated insertion does not duplicate the block; no context insertion changes another workspace or project lock state.

- [ ] **Step 5: Commit inherited context adapters**

```bash
git add project-context.js index.html look-studio.js camera-app.js casting-app.js poster-app.js reverse-app.js music-app.js prompt-generator.test.js
git commit -m "feat: inherit visual bible across workbenches"
```

### Task 7: Full Regression, Visual QA And Legacy Project Audit

**Files:**
- Modify: `prompt-generator.test.js`
- Create: `output/playwright/guided-project-foundation/verification.md`

**Consumes:** Tasks 1–6.

**Produces:** repeatable evidence that guided and professional flows preserve existing functionality.

- [ ] **Step 1: Add end-to-end static regression cases**

Add tests for these exact behaviors:

```js
runTest("guided film project foundation preserves deep links and professional tools", () => {
  const html = fs.readFileSync("index.html", "utf8");
  ["tone", "camera", "casting", "poster", "reverse", "music"].forEach((id) => assert(html.includes(`data-workspace="${id}"`)));
  assert(html.includes("project-foundation.js"));
  assert(html.includes("project-context.js"));
});

runTest("visual bible defaults cannot create false configured workspaces", () => {
  const summary = summarizeProject({
    activeWorkspace: "tone",
    visualBible: { status: "draft" },
    workspaces: { tone: { selected: [{ id: "D004" }], selectedExplicit: false }, camera: { selected: { id: "C01" }, selectedExplicit: false } }
  });
  assert.strictEqual(summary.configuredCount, 0);
});
```

- [ ] **Step 2: Run the full test suite and verify green**

Run:

```bash
PATH=/tmp/node-v22.23.1-darwin-arm64/bin:$PATH node --test prompt-generator.test.js
```

Expected: all pre-existing checks and every Task 1–6 check pass.

- [ ] **Step 3: Run browser acceptance scenarios**

Use a fresh local Playwright session against the active local server. Verify:

```text
1. First visit -> starter project -> director start dialog -> brief -> draft Bible -> dashboard.
2. Lock Bible -> open every creative workspace -> inherited strip is visible.
3. Insert Bible twice in each workspace -> exactly one context block remains.
4. Open professional mode -> URL has the selected creative workspace and refresh restores it.
5. Load a schema 2 backup -> it migrates to draft Bible without erasing existing prompt states.
6. Test 1440, 1280, 1024, 820 and 390 widths; inspect all dialogs and context strips.
```

Capture screenshots to `output/playwright/guided-project-foundation/` and write each result, console error count and any resolved issue in `verification.md`.

- [ ] **Step 4: Run final change audit**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only intended files from this plan are staged for the final commit.

- [ ] **Step 5: Commit the verified feature**

```bash
git add project-store.js project-summary.js workspace-core.js project-foundation.js project-context.js project-dashboard.js project-dashboard.css index.html app.js camera-app.js casting-app.js poster-app.js reverse-app.js music-app.js prompt-generator.test.js output/playwright/guided-project-foundation/verification.md
git commit -m "feat: guide film projects with visual bible"
```

## Plan Self-Review

- Spec coverage: Task 1 covers project brief and Bible schema; Task 2 covers safe persistence and routing rules; Task 3 covers local reference assets; Task 4 covers three-step entry; Task 5 covers dashboard and dual mode; Task 6 covers six-workspace inheritance; Task 7 covers migrations, visuals and regressions.
- Scope: commercial visual, model generation, full export center, shot list, payments, accounts and teams remain excluded.
- Type consistency: `creativeBrief`, `visualBible`, `getProjectContext`, `receiveProjectContext`, `foundation`, `draft`, and `locked` use identical names across every task.
- Safety: no task serializes image contents into localStorage or changes workbench defaults into configured user choices.
