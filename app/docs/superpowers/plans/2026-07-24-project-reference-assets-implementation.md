# 项目参考资产母版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让角色与场景参考图成为可跨场引用的本地项目母版，并自动进入每条视频提示词。

**Architecture:** 复用 `project-reference-store.js` 保存图片 Blob，扩展 `project-asset-locks.js` 保存图片元数据与镜头连续性文本。场次仍只保存资产 ID；`project-scenes.js` 负责上传、选择、预览和解除引用，视频适配器只接收已解析的资产说明。

**Tech Stack:** Vanilla JavaScript、IndexedDB、现有 `aigcProjectReferenceStore`、现有项目 JSON store、Node assert 测试。

## Global Constraints

- 图片二进制只保存在浏览器 IndexedDB，不写入项目 JSON，也不发送到外部服务。
- 项目资产只允许 `character` 与 `location` 绑定图片；`prop` 保持文字资产。
- 场次只保存资产 ID；解除一场引用不能删除其他场仍在引用的资产。
- 旧项目和没有图片的文字资产必须保持可编辑、可复制。

---

### Task 1: 扩展参考资产数据契约

**Files:**
- Modify: `project-asset-locks.js`
- Modify: `project-store.js`
- Modify: `scene-video-adapters.js`
- Test: `prompt-generator.test.js`

**Interfaces:**
- Produces: `normalizeAssetLocks(value)`, `assetsForScene(project, scene)`，其中图片资产包含 `referenceAssetIds` 与 `referenceRule`。
- Consumes: `scene.assetIds` 与既有 `project.assetLocks`。

- [ ] **Step 1: 写失败测试**

```js
runTest("reference-bearing character and location assets enter a scene prompt", () => {
  const locks = normalizeAssetLocks([
    { id: "CHAR-001", kind: "character", name: "林岚", referenceAssetIds: ["project-ref-char"], referenceRule: "脸部、发型和体型保持一致" },
    { id: "LOC-001", kind: "location", name: "港口码头", referenceAssetIds: ["project-ref-loc"], referenceRule: "保持码头结构和侧逆光方向" }
  ]);
  const result = assetsForScene({ assetLocks: locks }, { assetIds: ["CHAR-001", "LOC-001"] });
  assert(result.prompt.includes("角色参考资产"));
  assert(result.prompt.includes("project-ref-char"));
  assert(result.prompt.includes("场景参考资产"));
  assert(result.prompt.includes("project-ref-loc"));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Expected: `FAIL reference-bearing character and location assets enter a scene prompt`。

- [ ] **Step 3: 实现规范化与提示词输出**

```js
// project-asset-locks.js
referenceAssetIds: normalizeReferenceIds(source.referenceAssetIds),
referenceRule: text(source.referenceRule, 280)

const referenceLines = assets.flatMap((asset) => {
  if (!asset.referenceAssetIds.length || !asset.referenceRule) return [];
  const label = asset.kind === "character" ? "角色参考资产" : "场景参考资产";
  return [`${label}：${asset.id} ${asset.name}，参考图 ${asset.referenceAssetIds.join("、")}；${asset.referenceRule}`];
});
```

在 `project-store.js` 与 `scene-video-adapters.js` 保留已有 `assetLocks` 字段，不复制图片 Blob。

- [ ] **Step 4: 运行测试确认通过**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Expected: 全部 `PASS`。

### Task 2: 参考图片上传、选择与删除保护

**Files:**
- Modify: `project-reference-store.js`
- Modify: `workspace-core.js`
- Modify: `project-scenes.js`
- Modify: `project-scenes.css`
- Modify: `index.html`
- Test: `prompt-generator.test.js`

**Interfaces:**
- Consumes: `aigcProjectReferenceStore.putFile(file, projectId)` 返回的无 Blob 元数据。
- Produces: `upsertReferenceAsset(kind, payload)`、`attachReferenceToScene(assetId)`、`removeReferenceAsset(assetId)`。

- [ ] **Step 1: 写失败测试**

```js
runTest("reference assets stay outside project JSON and remain protected while scenes use them", () => {
  const asset = normalizeAssetLocks([{ id: "CHAR-001", kind: "character", name: "林岚", referenceAssetIds: ["project-ref-char"] }])[0];
  const result = unlockSceneAsset(
    { assetLocks: [asset], scenes: [{ id: "scene-2", assetIds: ["CHAR-001"] }] },
    { id: "scene-1", assetIds: ["CHAR-001"] },
    "CHAR-001"
  );
  assert.strictEqual(result.removedFromProject, false);
  assert.deepStrictEqual(result.project.assetLocks[0].referenceAssetIds, ["project-ref-char"]);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Expected: `FAIL reference assets stay outside project JSON...`。

- [ ] **Step 3: 实现上传与资产母版面板**

```html
<section class="project-reference-masters">
  <input type="file" accept="image/jpeg,image/png,image/webp" data-reference-kind="character">
  <input type="file" accept="image/jpeg,image/png,image/webp" data-reference-kind="location">
</section>
```

`project-scenes.js` 将上传成功的图片 ID 写入对应 `assetLocks` 的 `referenceAssetIds`，并为角色自动建议“脸部、发型、服装、体型一致”，为场景自动建议“空间结构、光线方向、关键物件一致”。删除按钮先检查 `assetLedger`，若仍被任一场引用，仅允许解除当前场引用。

- [ ] **Step 4: 运行测试确认通过**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Expected: 全部 `PASS`。

### Task 3: 场次预览、镜头导出与回归验收

**Files:**
- Modify: `project-scenes.js`
- Modify: `project-scenes.css`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: `assetsForScene(project, scene).assets`。
- Produces: 场次简报中的角色/场景缩略图与 `buildSceneVideoPrompt` 的连续性文本。

- [ ] **Step 1: 写失败测试**

```js
runTest("scene desk renders visual reference assets and keeps prompt references", () => {
  const source = fs.readFileSync("project-scenes.js", "utf8");
  assert(source.includes("项目参考资产母版"));
  assert(source.includes("角色参考图"));
  assert(source.includes("场景参考图"));
  assert(source.includes("referenceAssetIds"));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Expected: `FAIL scene desk renders visual reference assets...`。

- [ ] **Step 3: 实现预览与提示词联动**

```js
const referencedAssets = lockedAssetsForScene(scene).assets
  .filter((asset) => asset.referenceAssetIds?.length);
// 为每个 asset 异步读取 project-reference-store 图片，并在本场简报渲染缩略图。
// 预览读取失败时显示“图片不可用”，不删除元数据或场次引用。
```

镜头导出继续使用当前模型适配器；不在模型提示词里伪造图片已上传，而是明确输出需随请求附带的参考图片资产编号。

- [ ] **Step 4: 全量验证与视觉检查**

Run: `/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js`

Expected: 全部 `PASS`。

打开：`http://127.0.0.1:8766/index.html?workspace=project&fresh=project-reference-assets-v1`

人工检查：上传角色与场景图片、在两场中引用同一角色、解除其中一场引用、刷新页面并确认另一场和提示词仍保留同一资产编号。
