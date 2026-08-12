# 安全剧本重分析与逐场确认 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让本地或 AI 剧本重分析以逐场差异确认方式更新剧本叙事层，同时默认保护既有制作资产、镜头和状态。

**Architecture:** `project-store.js` 生成匹配结果、保护标志和可序列化逐场决策，并只依据决策合并正式场次。`project-scenes.js` 让本地分析与 AI 分析走同一个差异预览、逐场切换和确认入口。CSS 只在剧本入口增加紧凑的差异卡，不改变场次工作台三栏结构。

**Tech Stack:** Vanilla JavaScript、HTML、CSS、Node `assert` 测试；现有本地项目存储。

## Global Constraints

- 只改剧本重分析链路，不改影调、运镜、角色、海报、音乐与反推工作台。
- 不接外部生成 API，不保存 API 密钥，不在 JSON 内保存图片 Blob。
- 重分析不能静默删除场次、资产、参考图、镜头、提示词或生成状态。
- 匹配优先级固定：场景身份（标题/地点/时间）优先，场号兜底。
- 合并优先级固定：用户的逐场决策优先；`update-story` 仅改叙事层。
- 使用 `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js` 跑全量回归。
- 禁止 `git reset`、`git clean`、覆盖无关用户改动。

---

### Task 1: 安全差异模型与叙事层合并

**Files:**
- Modify: `project-store.js:590-670`
- Modify: `prompt-generator.test.js:713-790`

**Interfaces:**
- Consumes: `normalizeProjectScenes`, `analyzeScreenplay`, `normalizeScreenplay`。
- Produces: `previewScreenplayReanalysis(project, rawText, proposedScenes?)` 返回 `decisions[]`；`applyScreenplayAnalysis(store, projectId, analysis, now)` 读取决策并安全合并。

- [ ] **Step 1: 写出会失败的领域测试**

在 `prompt-generator.test.js` 增加以下覆盖：

```js
runTest("screenplay reanalysis protects production scenes and only updates story fields", () => {
  const project = {
    scenes: [{ id: "scene-a", number: 1, title: "房间", setting: "内景 · 房间", time: "夜", storyBeat: "旧内容",
      sourceExcerpt: "旧原文", emotion: "旧情绪", action: "旧动作", assetIds: ["CHAR-001"],
      videoCard: { color: "青灰", action: "握紧信封" },
      shots: [{ id: "shot-a", status: "generated", targetModel: "seedance", promptCard: { action: "回头" } }], status: "approved" }]
  };
  const preview = previewScreenplayReanalysis(project, "第 01 场 内景 卧室 夜\\n新内容");
  assert.strictEqual(preview.decisions[0].protected, true);
  assert.strictEqual(preview.decisions[0].action, "update-story");
  const next = applyScreenplayAnalysis(normalizeProjectStore({ projects: [{ id: "p1", ...project }], activeProjectId: "p1" }), "p1", preview, "2026-07-26T10:00:00.000Z");
  const scene = next.projects[0].scenes[0];
  assert.strictEqual(scene.setting, "内景 · 卧室");
  assert.deepStrictEqual(scene.assetIds, ["CHAR-001"]);
  assert.strictEqual(scene.shots[0].status, "generated");
  assert.strictEqual(scene.shots[0].targetModel, "seedance");
});
```

再覆盖：原稿未出现默认 `keep-existing`；新增草稿可切换成 `skip-proposed`；同场号标题变化为 `update` 而非删除加新增；无旧场次仍可一键加入全部草稿。

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js
```

Expected: 新测试因 `decisions`、保护字段或安全合并尚未实现而失败。

- [ ] **Step 3: 实现纯函数决策与合并**

在 `project-store.js` 新增并导出：

```js
function sceneProtectionReasons(scene) {
  return [
    scene.assetIds?.length && "已绑定角色、场景或道具资产",
    scene.status === "approved" && "场次已经锁定",
    scene.shots?.some((shot) => shot.status !== "planned") && "已有镜头制作状态",
    scene.shots?.some((shot) => Object.values(shot.promptCard || {}).some(Boolean)) && "已有镜头提示词"
  ].filter(Boolean);
}
function normalizeScreenplayDecisions(value, proposedScenes, existingScenes) {
  const actions = new Set(["add", "update-story", "keep-existing", "skip-proposed"]);
  const proposedIds = new Set(proposedScenes.map((scene) => scene.id));
  const existingIds = new Set(existingScenes.map((scene) => scene.id));
  return Array.isArray(value) ? value.filter((item) => actions.has(item.action)
    && proposedIds.has(item.proposedSceneId)
    && (!item.existingSceneId || existingIds.has(item.existingSceneId))) : [];
}
function mergeStoryFields(existingScene, proposedScene) {
  return { ...existingScene, number: proposedScene.number, title: proposedScene.title,
    setting: proposedScene.setting, time: proposedScene.time, storyBeat: proposedScene.storyBeat,
    sourceExcerpt: proposedScene.sourceExcerpt, emotion: proposedScene.emotion, action: proposedScene.action };
}
```

`previewScreenplayReanalysis` 必须返回：

```js
{
  rawText,
  scenes,
  decisions: [{ proposedSceneId, existingSceneId, kind, action, protected, reasons }],
  summary: { added, updated, retained, protected, total }
}
```

`applyScreenplayAnalysis` 必须：

- 将当前剧本存入历史版本；
- 只新增 `action === "add"` 的草稿；
- 对 `action === "update-story"` 使用 `mergeStoryFields`；
- 对 `keep-existing`、`skip-proposed` 不改正式场次；
- 对所有未匹配正式场次保留原顺序；
- 继续规范化项目场次，且不触及 `assetLocks`。

- [ ] **Step 4: 运行全量回归**

Run:

```bash
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js
```

Expected: 全部 PASS。

### Task 2: 剧本入口差异确认面板

**Files:**
- Modify: `index.html:151`
- Modify: `project-scenes.js:140-210`
- Modify: `project-scenes.css:1-35`
- Modify: `prompt-generator.test.js:900-970`

**Interfaces:**
- Consumes: Task 1 的 `analysis.decisions`、`summary`、`applyScreenplayAnalysis`。
- Produces: 差异卡、逐场动作切换、更新后的确认按钮状态。

- [ ] **Step 1: 写出会失败的界面契约测试**

在 `prompt-generator.test.js` 断言：

```js
const html = fs.readFileSync("index.html", "utf8");
const scenes = fs.readFileSync("project-scenes.js", "utf8");
const css = fs.readFileSync("project-scenes.css", "utf8");
assert(html.includes('id="project-screenplay-diff"'));
assert(scenes.includes("renderScreenplayDiff"));
assert(scenes.includes("update-analysis-decision"));
assert(css.includes(".project-screenplay-diff"));
```

并断言预览文字含“新增”、“剧本更新”、“保留当前制作场”、“受保护”。

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js
```

Expected: 新界面契约失败。

- [ ] **Step 3: 实现紧凑差异面板与决策切换**

在剧本入口增加 `#project-screenplay-diff`，由 `renderScreenplayDiff()` 输出：

- 总览：新增、剧本更新、保留原场、受保护数；
- 每条差异：场号、标题、种类、保护理由；
- 新增条：`加入新场` / `不加入`；
- 更新条：`采用剧本更新` / `保留当前制作场`；
- 原稿未出现条：只显示“保留当前制作场”，不提供删除；
- 无旧场次时不显示逐项选择，保留一键确认。

更新动作只修改内存中的 `screenplayAnalysis.decisions`；编辑剧本文本、切换项目或重新分析时销毁旧草稿。确认按钮显示“确认应用 N 项剧本更新”。

- [ ] **Step 4: 增加响应式样式**

差异卡放在剧本输入区下方，桌面端不挤压正文编辑区；1024px 以下改为单列；每行文字可换行且没有绝对定位或 hover 浮层。

- [ ] **Step 5: 运行全量回归**

Run:

```bash
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js
```

Expected: 全部 PASS。

### Task 3: 跨层验证与独立验收

**Files:**
- Test: `prompt-generator.test.js`
- Verify: `project-store.js`, `project-scenes.js`, `project-scenes.css`, `index.html`

**Interfaces:**
- Consumes: Task 1 与 Task 2 的最终实现。
- Produces: 本地回归、浏览器验收记录和修复清单。

- [ ] **Step 1: 运行完整回归**

Run:

```bash
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js
```

Expected: 全部 PASS。

- [ ] **Step 2: 浏览器验收**

打开：

```text
http://127.0.0.1:8766/index.html?workspace=project&fresh=safe-reanalysis-v1
```

验证：

- 导入或粘贴已有场次的改稿后能看到逐场差异；
- 受保护场明确显示保护理由；
- 切换“保留当前制作场”后，确认按钮的应用数量更新；
- 页面在 1440px、1024px、390px 不裁切、不遮挡；
- 浏览器控制台无 error。

- [ ] **Step 3: 独立代码审查**

独立审查不得修改文件。重点找：静默删除、资产丢失、镜头数组覆盖、旧项目迁移失败、AI 与本地分析路径不一致、响应式信息遮挡。

- [ ] **Step 4: 处理验收发现后复跑**

若有阻断或高优先级问题，先修复，再重新执行 Step 1 到 Step 3；无问题才交付。
