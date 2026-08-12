# 剧本入口与场次确认台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 让项目中心支持新建、粘贴、导入剧本，并将用户确认过的剧本结构转成可制作的场次草稿。

**Architecture:** 保持现有原生 HTML/CSS/JavaScript 架构和浏览器本地项目库。project-store.js 管理剧本版本、解析结果和安全重分析预览；project-scenes.js 负责剧本入口和场次确认交互；DOCX 正文只在浏览器读取成文本，不向服务器上传文件。

**Tech Stack:** 原生 JavaScript、HTML、CSS、Node 内建测试、浏览器 File API、Mammoth browser build。

## Global Constraints

- 剧本文本、版本和元数据只保存在当前浏览器项目库。
- 支持 TXT 和 DOCX；不支持或读取失败不得覆盖已保存的剧本。
- 单个剧本文本最多 60000 字符；版本最多保留 12 个。
- 解析只识别确定性结构；无法判断的人物、道具和情绪必须标为待确认。
- 场次默认至少包含一个 15 秒镜头卡；重分析前必须显示变化摘要并得到用户确认。
- 不接入外部 AI 模型，不发起网络请求。
- 使用 apply_patch 编辑文件；不改动与本任务无关的既有工作区变更。

---

### Task 1: 剧本版本、分析与安全重分析

**Files:**
- Modify: project-store.js:1-370
- Modify: workspace-core.js:380-510
- Modify: prompt-generator.test.js:280-350

**Interfaces:**
- Produces: analyzeScreenplay(rawText), previewScreenplayReanalysis(project, rawText), applyScreenplayAnalysis(store, projectId, analysis, now)。
- analysis shape: { rawText, scenes, summary: { added, updated, removed, total } }。
- Core exposes: previewProjectScreenplay(rawText) and applyProjectScreenplay(analysis, source)。

- [ ] **Step 1: Write the failing test**

Add after the existing screenplay parser tests in prompt-generator.test.js:

~~~js
run("screenplay analysis returns a confirmable change summary", () => {
  const project = {
    screenplay: { title: "旧稿", sourceType: "paste", sourceFileName: "", rawText: "第 01 场 内景 房间 夜\n旧内容", versions: [] },
    scenes: [{ id: "scene-a", number: 1, title: "房间", setting: "内景 · 房间", time: "夜", storyBeat: "旧内容", shots: [] }]
  };
  const analysis = previewScreenplayReanalysis(project, "第 01 场 内景 房间 夜\n新内容\n\n第 02 场 外景 天台 清晨\n人物离开。");
  assert.deepEqual(analysis.summary, { added: 1, updated: 1, removed: 0, total: 2 });
  assert.equal(analysis.scenes[0].storyBeat, "新内容");
});

run("applying analysis saves the prior screenplay as a bounded version", () => {
  const store = normalizeProjectStore({ projects: [{ id: "p1", name: "项目", screenplay: { title: "旧稿", rawText: "旧剧本", versions: [] }, scenes: [] }], activeProjectId: "p1" });
  const analysis = analyzeScreenplay("第 01 场 内景 房间 夜\n新剧本");
  const next = applyScreenplayAnalysis(store, "p1", { ...analysis, source: { title: "新稿", sourceType: "file", sourceFileName: "new.txt" } }, "2026-07-21T12:00:00.000Z");
  assert.equal(next.projects[0].screenplay.title, "新稿");
  assert.equal(next.projects[0].screenplay.versions[0].rawText, "旧剧本");
});
~~~

- [ ] **Step 2: Run the test and verify it fails**

~~~bash
PATH=/tmp/node-v22.15.0-darwin-arm64/bin:$PATH node --test prompt-generator.test.js
~~~

Expected: the new functions are not exported.

- [ ] **Step 3: Implement the model and core bridges**

In project-store.js, extend normalizeScreenplay with title, sourceType, sourceFileName, and a bounded versions array. Implement:

~~~js
function analyzeScreenplay(rawText) {
  const normalized = String(rawText || "").replace(/\r\n?/g, "\n").trim().slice(0, 60000);
  return { rawText: normalized, scenes: parseScreenplayIntoScenes(normalized) };
}
~~~

Match existing and proposed scenes by normalized title + setting + time first, then fall back to scene number for remaining unmatched scenes. This preserves locked work when a user inserts a prologue or reorders otherwise identical scenes; a same-number scene with revised title, setting, time or story beat still counts as updated. Unmatched proposed scenes count as added; unmatched existing scenes count as removed. applyScreenplayAnalysis stores the old non-empty screenplay in versions, bounds the list to 12, then replaces screenplay metadata and scenes.

In workspace-core.js, add:

~~~js
function previewActiveProjectScreenplay(rawText) {
  return storeModel.previewScreenplayReanalysis(activeProject(), rawText);
}
function applyActiveProjectScreenplay(analysis, source) {
  commitStore(storeModel.applyScreenplayAnalysis(store, activeProject().id, { ...analysis, source }, nowText()));
  dispatchProjectContext();
  return getActiveProject();
}
~~~

- [ ] **Step 4: Run the suite and commit**

~~~bash
PATH=/tmp/node-v22.15.0-darwin-arm64/bin:$PATH node --test prompt-generator.test.js
git add project-store.js workspace-core.js prompt-generator.test.js
git commit -m "feat: add screenplay analysis versions"
~~~

Expected: all tests pass.

### Task 2: 本地 TXT/DOCX 导入

**Files:**
- Create: screenplay-import.js
- Create: vendor/mammoth.browser.min.js
- Modify: index.html:136-145,1360-1375
- Modify: prompt-generator.test.js

**Interfaces:**
- Produces: window.aigcScreenplayImport.readScreenplayFile(file) resolving { title, sourceType: "file", sourceFileName, rawText }.
- Rejects: 请选择 .txt 或 .docx 剧本文件。, 剧本文件为空。, 无法读取该 DOCX 正文，请转换为 TXT 后重试。, 剧本超过 60000 字符，请拆分后导入。.

- [ ] **Step 1: Write the failing test**

~~~js
run("screenplay import exposes local txt and docx reader", () => {
  const source = fs.readFileSync("screenplay-import.js", "utf8");
  assert(source.includes("readScreenplayFile"));
  assert(source.includes(".txt"));
  assert(source.includes(".docx"));
  assert(source.includes("60000"));
  assert(indexHtml.includes("project-screenplay-file"));
  assert(indexHtml.includes("mammoth.browser.min.js"));
});
~~~

- [ ] **Step 2: Run the test and verify it fails**

~~~bash
PATH=/tmp/node-v22.15.0-darwin-arm64/bin:$PATH node --test prompt-generator.test.js
~~~

Expected: the importer/file input is missing.

- [ ] **Step 3: Add the browser-only importer**

Copy Mammoth browser build into vendor/mammoth.browser.min.js. Add screenplay-import.js:

~~~js
async function readScreenplayFile(file) {
  const name = String(file && file.name || "");
  const extension = name.split(".").pop().toLowerCase();
  if (!file || !["txt", "docx"].includes(extension)) throw new Error("请选择 .txt 或 .docx 剧本文件。");
  const rawText = extension === "txt"
    ? await file.text()
    : (await root.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
  const normalized = String(rawText || "").replace(/\r\n?/g, "\n").trim();
  if (!normalized) throw new Error("剧本文件为空。");
  if (normalized.length > 60000) throw new Error("剧本超过 60000 字符，请拆分后导入。");
  return { title: name.replace(/\.[^.]+$/, "") || "未命名剧本", sourceType: "file", sourceFileName: name, rawText: normalized };
}
~~~

Add input id project-screenplay-file with type file and accept values for TXT/DOCX inside the screenplay source controls. Load Mammoth before screenplay-import.js, then importer before project-scenes.js.

- [ ] **Step 4: Run the suite and commit**

~~~bash
PATH=/tmp/node-v22.15.0-darwin-arm64/bin:$PATH node --test prompt-generator.test.js
git add screenplay-import.js vendor/mammoth.browser.min.js index.html prompt-generator.test.js
git commit -m "feat: import local screenplay files"
~~~

Expected: all tests pass.

### Task 3: 剧本入口与场次确认交互

**Files:**
- Modify: index.html:137-143
- Modify: project-scenes.js:1-110
- Modify: project-scenes.css:1-13,105-112
- Modify: prompt-generator.test.js

**Interfaces:**
- Consumes: readScreenplayFile(file), previewProjectScreenplay(rawText), applyProjectScreenplay(analysis, source)。
- Produces controls: project-screenplay-new, project-screenplay-paste, project-screenplay-file, project-screenplay-title, project-screenplay-version, project-screenplay-analyze, project-screenplay-confirm.

- [ ] **Step 1: Write the failing UI contract test**

~~~js
run("project screenplay entry exposes three sources and safe confirmation", () => {
  ["project-screenplay-new", "project-screenplay-paste", "project-screenplay-file", "project-screenplay-title", "project-screenplay-version", "project-screenplay-analyze", "project-screenplay-confirm"].forEach((id) => assert(indexHtml.includes('id="' + id + '"')));
  const source = fs.readFileSync("project-scenes.js", "utf8");
  assert(source.includes("readScreenplayFile"));
  assert(source.includes("previewProjectScreenplay"));
  assert(source.includes("applyProjectScreenplay"));
});
~~~

- [ ] **Step 2: Run the test and verify it fails**

~~~bash
PATH=/tmp/node-v22.15.0-darwin-arm64/bin:$PATH node --test prompt-generator.test.js
~~~

Expected: required IDs and workflow calls are missing.

- [ ] **Step 3: Implement the confirmation flow**

Render a compact source toolbar with 新建剧本, 粘贴文本, and labelled upload button. 新建剧本 clears only the draft; 粘贴文本 focuses the textarea; choosing a file fills title/text and reports its filename. 分析并生成场次草稿 invokes preview and renders: 将新增 2 场、更新 1 场、可能移除 0 场。. Only 确认生成场次 invokes apply. The existing saved scene workbench remains visible until confirmation. Show script title, source filename, word count, version count and last update.

At desktop keep the source toolbar compact above the text editor. At widths below 720px stack controls and preserve the primary analysis button without clipping.

- [ ] **Step 4: Run the suite and commit**

~~~bash
PATH=/tmp/node-v22.15.0-darwin-arm64/bin:$PATH node --test prompt-generator.test.js
git add index.html project-scenes.js project-scenes.css prompt-generator.test.js
git commit -m "feat: add screenplay project entry"
~~~

Expected: all tests pass.

### Task 4: 把场次编辑收进四步制作单

**Files:**
- Modify: project-scenes.js:160-430
- Modify: project-scenes.css:14-112
- Modify: prompt-generator.test.js

**Interfaces:**
- Produces keyboard-accessible tabs: 故事, 资产, 画面, 镜头; active step lives in controller state data-scene-step, not project progress.

- [ ] **Step 1: Write the failing test**

~~~js
run("scene editor is organized into story assets look and shots", () => {
  const source = fs.readFileSync("project-scenes.js", "utf8");
  ["故事", "资产", "画面", "镜头", "data-scene-step"].forEach((token) => assert(source.includes(token)));
  const css = fs.readFileSync("project-scenes.css", "utf8");
  assert(css.includes("[data-scene-step]"));
});
~~~

- [ ] **Step 2: Run the test and verify it fails**

~~~bash
PATH=/tmp/node-v22.15.0-darwin-arm64/bin:$PATH node --test prompt-generator.test.js
~~~

Expected: scene steps are absent.

- [ ] **Step 3: Implement the progressive editor**

Replace the current large editor body with an accessible tablist:

~~~html
<div class="project-scene-steps" role="tablist" aria-label="场次制作步骤">
  <button role="tab" data-scene-step="story">故事</button>
  <button role="tab" data-scene-step="assets">资产</button>
  <button role="tab" data-scene-step="look">画面</button>
  <button role="tab" data-scene-step="shots">镜头</button>
</div>
~~~

故事 holds name, time, location, source excerpt, characters, emotion and action. 资产 lists derived role/location/prop placeholders with status 待建立, without yet adding shared asset records. 画面 holds color/light/camera overrides and inherited visual bible. 镜头 contains existing shot cards and 15-second camera handoff. Preserve current data attributes and field names so prompt composition keeps working. Make 故事 default, apply aria-selected, hide inactive panels, and support left/right arrow tab navigation.

- [ ] **Step 4: Run tests, browser QA and commit**

~~~bash
PATH=/tmp/node-v22.15.0-darwin-arm64/bin:$PATH node --test prompt-generator.test.js
git diff --check
git add project-scenes.js project-scenes.css prompt-generator.test.js
git commit -m "feat: organize scene production steps"
~~~

Use Playwright to create a project, upload output/fixtures/雾港来信-两场.txt, preview, confirm, select scene 02, and verify 旧旅馆房间 plus 凌晨 appear in the prompt. Check console has zero errors/warnings at 1440, 1280, 1024 and 390 widths. Save output/playwright/screenplay-import-and-confirmation.png.

Report this link after QA:

~~~text
http://127.0.0.1:8767/index.html?workspace=project&fresh=screenplay-entry-v1
~~~
