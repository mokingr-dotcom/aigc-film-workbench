# 项目镜头交付包 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为一个影视项目输出按场次和镜头排序、可复制和下载的标准化视频生成交付包。

**Architecture:** 新增纯数据模块负责把已有项目状态转换为 Markdown 交付包，避免在 UI 中重复构建提示词。项目场次工作台只调用该模块，负责按钮、下载和短暂反馈；提示词继续复用 `project-store.js` 的 `buildSceneShotPrompt`。

**Tech Stack:** 原生 JavaScript、浏览器 Blob 下载、现有 Node 断言测试。

## Global Constraints

- 不调用外部视频模型或上传用户数据。
- 不修改现有单镜头、整场镜头包与项目 JSON 备份行为。
- 镜头和场次一律按数字升序导出。
- 未就绪镜头必须保留，并显式写出待补条件。

---

### Task 1: 纯交付包构建器

**Files:**
- Create: `project-delivery.js`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: `project-store.js` 的 `buildSceneShotPrompt(project, scene, shot)` 和 `scene-readiness.js` 的 `assessShotReadiness(project, scene, shot)`。
- Produces: `aigcProjectDelivery.buildProjectShotDelivery(project)`，返回 `{ title, filename, summary, scenes, markdown }`。

- [ ] **Step 1: Write the failing test**

```js
const delivery = require("./project-delivery.js");
const output = delivery.buildProjectShotDelivery(project);
assert.deepStrictEqual(output.scenes.map((scene) => scene.number), [1, 2]);
assert(output.markdown.includes("场 01 · 镜 01"));
assert(output.markdown.includes("待补条件"));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Expected: FAIL because `project-delivery.js` does not exist or `buildProjectShotDelivery` is unavailable.

- [ ] **Step 3: Write minimal implementation**

```js
function buildProjectShotDelivery(project) {
  const scenes = [...(project.scenes || [])]
    .sort((left, right) => left.number - right.number)
    .map(buildSceneDelivery);
  return { title: project.name, filename: safeFilename(project.name), summary, scenes, markdown };
}
```

For each sorted shot, call existing prompt/readiness APIs and preserve `targetModel`, `durationSeconds`, `status`, asset names and stable IDs. Do not mutate `project`.

- [ ] **Step 4: Run test to verify it passes**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Expected: PASS, including new ordering, readiness and safe filename assertions.

### Task 2: 项目生产台接入复制和下载

**Files:**
- Modify: `index.html`
- Modify: `project-scenes.js`
- Modify: `project-scenes.css`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: `root.aigcProjectDelivery.buildProjectShotDelivery(activeProject())`。
- Produces: 项目生产头部的 `复制整片镜头包` 与 `下载 Markdown` 动作。

- [ ] **Step 1: Write the failing test**

```js
assert(html.includes("project-delivery.js"));
assert(scenes.includes("copy-project-shot-delivery"));
assert(scenes.includes("download-project-shot-delivery"));
assert(scenes.includes("复制整片镜头包"));
assert(scenes.includes("下载 Markdown"));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Expected: FAIL because no project delivery UI exists.

- [ ] **Step 3: Write minimal implementation**

```js
function copyProjectShotDelivery() {
  const output = deliveryApi.buildProjectShotDelivery(activeProject());
  return navigator.clipboard.writeText(output.markdown);
}

function downloadProjectShotDelivery() {
  const output = deliveryApi.buildProjectShotDelivery(activeProject());
  downloadText(output.markdown, output.filename, "text/markdown;charset=utf-8");
}
```

Render `已就绪 X / Y 镜` inside the existing `project-production-actions`; disable both actions only when no shots exist. Use action handlers already delegated from `#project-production-strip`. Button feedback must reset after a short timeout.

- [ ] **Step 4: Run test to verify it passes**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Expected: PASS, including UI contract checks.

### Task 3: 交付验收

**Files:**
- Test: `prompt-generator.test.js`

- [ ] **Step 1: Run the full regression suite**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Expected: all tests PASS.

- [ ] **Step 2: Verify browser flow**

Open the project page, confirm the two actions appear in `SCENE PRODUCTION DESK`, verify no-scenario buttons disable correctly, then use a project with shots to verify the ready count and copy feedback.

- [ ] **Step 3: Commit**

```bash
git add project-delivery.js project-scenes.js project-scenes.css index.html prompt-generator.test.js
git commit -m "feat: add project shot delivery package"
```
