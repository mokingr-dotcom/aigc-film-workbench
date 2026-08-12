# 镜头生成准备清单 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在项目当前镜头中提供一张可操作的生成准备清单，让创作者知道哪些条件已就绪、哪些资产参考仍需补齐，并能进入对应工作台处理。

**Architecture:** 新建 `project-shot-readiness.js` 作为纯数据模块，复用 `scene-readiness.js` 的基础可生成判断，并只读取现有项目资产母版。项目场次台只负责渲染、聚焦和工作台跳转；不会改变既有提示词、场次或资产数据。CSS 只为新增检查卡补充项目页的桌面与窄屏布局。

**Tech Stack:** 原生 JavaScript、现有项目状态模块、Node `assert` 回归测试、本地浏览器验收。

## Global Constraints

- 不调用外部模型 API，不上传任何用户素材。
- 继续以 `scene-readiness.js` 作为基础可生成的唯一判定来源。
- 角色与场景参考图是连续性建议，不得把完整文字场景错误阻塞为不可生成。
- 跳转只能打开既有工作台或聚焦既有项目输入，不能覆盖项目数据。
- 保持现有单镜提示词、整场镜头包、整片镜头交付包行为不变。

---

### Task 1: 纯镜头准备状态模块

**Files:**
- Create: `project-shot-readiness.js`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: `scene-readiness.js` 的 `assessShotReadiness(project, scene, shot)` 和项目的 `assetLocks`、`scene.assetIds`。
- Produces: `aigcProjectShotReadiness.buildShotReadinessGate(project, scene, shot)`，返回 `{ ready, completion, groups, assets, actions }`。

- [ ] **Step 1: 写入会失败的状态模块测试**

```js
const { buildShotReadinessGate } = require("./project-shot-readiness.js");
const gate = buildShotReadinessGate(project, scene, shot);
assert.strictEqual(gate.ready, false);
assert.deepStrictEqual(gate.groups.map((group) => group.id), ["story", "visual", "delivery"]);
assert(gate.actions.some((action) => action.id === "go-tone"));
assert.strictEqual(gate.assets[0].referenceCount, 1);
assert.strictEqual(gate.assets[0].referenceRule, "脸部与服装保持一致");
```

- [ ] **Step 2: 运行测试确认失败**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Expected: FAIL，错误原因是 `project-shot-readiness.js` 或 `buildShotReadinessGate` 尚不存在。

- [ ] **Step 3: 实现最小纯数据模块**

```js
function buildShotReadinessGate(project = {}, scene = {}, shot = {}) {
  const readiness = readinessApi.assessShotReadiness(project, scene, shot);
  const assets = assetsForScene(project, scene);
  return { ready: readiness.ready, completion: { complete: readiness.complete, total: readiness.total }, groups: groupItems(readiness.items), assets, actions: suggestedActions(readiness.items, assets) };
}
```

`groupItems` 固定将 `narrative/subject/action` 归入 `story`，`setting/tone/camera` 归入 `visual`，`sound` 与连续性条目归入 `delivery`。`assetsForScene` 只输出稳定 ID、类型、名称、参考图数量与锁定规则。`suggestedActions` 去重，并仅针对缺失的 `subject`、`setting`、`tone`、`camera` 与未绑定参考图的角色/场景资产生成行动。

- [ ] **Step 4: 运行全量测试确认通过**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Expected: PASS，且覆盖纯环境空镜和“文字场景但无参考图”不被错误阻塞。

- [ ] **Step 5: 提交本任务**

```bash
git add project-shot-readiness.js prompt-generator.test.js
git commit -m "feat: add shot readiness gate data"
```

### Task 2: 项目场次台接入准备清单与行动

**Files:**
- Modify: `index.html`
- Modify: `project-scenes.js`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: `root.aigcProjectShotReadiness.buildShotReadinessGate(activeProject(), selectedScene(), selectedShot())`。
- Produces: `.project-shot-generation-gate` 的渲染，以及 `go-casting`、`go-tone`、`go-camera`、`focus-setting`、`focus-asset-reference` 五类项目动作。

- [ ] **Step 1: 写入会失败的 UI 合同测试**

```js
assert(html.includes("project-shot-readiness.js"));
["SHOT GENERATION GATE", "project-shot-generation-gate", "go-casting", "go-tone", "go-camera", "focus-setting", "focus-asset-reference"].forEach((token) => assert(scenes.includes(token), token));
```

- [ ] **Step 2: 运行测试确认失败**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Expected: FAIL，缺少准备清单脚本和项目页行动合同。

- [ ] **Step 3: 接入脚本与渲染函数**

在 `index.html` 中于 `project-scenes.js` 前加载：

```html
<script src="project-shot-readiness.js?v=20260726-shot-readiness-v1"></script>
```

在 `project-scenes.js` 增加 `shotReadinessGate(scene, shot)` 与 `renderShotGenerationGate(scene, shot)`；在既有 `SHOT READY CHECK` 后插入输出。检查卡逐组渲染条目、资产参考状态和动作按钮。没有资产时只渲染空的连续性说明，不显示伪错误。

在委托 `onAction` 中实现：

```js
if (action === "go-casting") { root.aigcWorkspaceNavigation?.show("casting"); return; }
if (action === "go-tone") { root.aigcWorkspaceNavigation?.show("tone"); return; }
if (action === "go-camera") { root.aigcWorkspaceNavigation?.show("camera"); return; }
if (action === "focus-setting") { focusSceneField("setting"); return; }
if (action === "focus-asset-reference") { focusAssetReference(button.dataset.assetId); return; }
```

`focusSceneField` 先展开结构编辑区，再将焦点放到已存在的地点输入。`focusAssetReference` 滚动至对应锁定资产，并聚焦其上传按钮；若不存在则只显示当前资产说明，不创建数据。

- [ ] **Step 4: 运行全量测试确认通过**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Expected: PASS，现有项目场次、资产锁定、单镜复制和交付包测试继续通过。

- [ ] **Step 5: 提交本任务**

```bash
git add index.html project-scenes.js prompt-generator.test.js
git commit -m "feat: surface shot generation gate"
```

### Task 3: 响应式检查卡与交付验收

**Files:**
- Modify: `project-scenes.css`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: `.project-shot-generation-gate` 的稳定 DOM 合同。
- Produces: 项目页桌面与窄屏可读的生成准备清单。

- [ ] **Step 1: 写入会失败的响应式样式测试**

```js
const css = fs.readFileSync("project-scenes.css", "utf8");
assert(css.includes(".project-shot-generation-gate"));
assert(css.includes("@media (max-width: 720px)"));
assert(css.includes(".project-shot-generation-gate-actions"));
```

- [ ] **Step 2: 运行测试确认失败**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Expected: FAIL，因为准备清单样式尚不存在。

- [ ] **Step 3: 添加紧凑响应式样式**

桌面：准备清单采用左侧状态说明、右侧三组条件与底部资产行动区，保持与 `project-scene-readiness` 同样的浅色、低饱和绿色和琥珀色体系。窄屏：改为单列组块，行动按钮两列排列，资产名称与锁定规则换行而不裁切。不得使用固定高度或悬浮层。

- [ ] **Step 4: 运行全量测试确认通过**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Expected: PASS。

- [ ] **Step 5: 本地浏览器验收**

1. 打开 `http://127.0.0.1:8766/index.html?workspace=project&fresh=shot-readiness-gate-v1`。
2. 确认待补镜头显示影调、人物或地点对应的行动按钮。
3. 填写或选择可用母版后，确认清单更新为可生成且既有 `SHOT READY CHECK` 仍一致。
4. 在窄屏检查准备清单、镜头编辑区和整片镜头交付按钮都完整可见。
5. 检查浏览器控制台没有错误。

- [ ] **Step 6: 提交本任务**

```bash
git add project-scenes.css prompt-generator.test.js
git commit -m "style: add responsive shot readiness gate"
```

## 自检

- 规格中的基础判定复用、连续性建议、五类行动入口、无资产降级、响应式与浏览器验收分别由 Task 1–3 覆盖。
- 计划未包含外部模型调用、自动填充或素材上传。
- `buildShotReadinessGate`、DOM 类名和动作名在所有任务中一致.

