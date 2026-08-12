# 影视项目桌面融合 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保留现有六个工作台及项目数据的前提下，增加以“制片项目台效率 + 克制电影影像感”为视觉基准的默认项目桌面。

**Architecture:** 用 `project-store.js` 承担项目库迁移和纯状态变换，用 `project-summary.js` 读取六个工作台摘要，用 `project-cover.js` 管理异步封面与 Object URL 生命周期。将当前误放在 `camera-app.js` 的全局视图切换拆到 `workspace-navigation.js`，`workspace-core.js` 继续独占持久化并向 `project-dashboard.js` 暴露窄接口；项目桌面本身不进入 `workspaces`，也不覆盖项目 `activeWorkspace`。

**Tech Stack:** 原生 HTML/CSS/JavaScript、CommonJS 兼容 IIFE、localStorage、IndexedDB、现有 Lucide 图标、本地位图、Node `assert` 测试、Playwright 浏览器验收。

## Global Constraints

- 根地址默认进入项目桌面；`?workspace=tone|camera|casting|poster|reverse|music` 深链接必须保持有效。
- 项目桌面不是第七个创作工作台，不进入 `project.workspaces`，不得把 `project.activeWorkspace` 写成 `projects`。
- 项目库始终至少保留一个项目；全新项目库用 `onboardingComplete: false`，旧库缺失该字段时迁移为 `true`。
- 继续使用浏览器本地存储，不接账号、云同步、订阅、支付或模型 API。
- 不向 localStorage 写入 Base64 图片，不依赖远程图片，不新增封面上传。
- 当前项目横幅约 16:5；项目封面与项目卡片影像槽严格 16:9。
- 浅冷灰画布、暖白内容面、深炭色导航、灰绿主操作、琥珀当前状态、暗酒红错误；无霓虹、光球、装饰性渐变和营销式大标题。
- 项目卡片圆角不超过 4px，不使用卡片内嵌套卡片，字间距固定为 0。
- 1440、1280、1024、820、390 宽度不得出现横向溢出、文字遮挡、操作不可达或影像比例失真。
- 必须保留现有项目导入导出、项目切换、六个工作台状态和角色资产清理行为。

---

## File Map

- Create `project-store.js`: 项目库 schema v2、迁移、初始草稿、新建元数据、筛选上下文和收藏的纯函数。
- Create `project-summary.js`: 六个工作台只读摘要和确定性下一步建议。
- Create `project-cover.js`: 静态封面候选、IndexedDB 角色资产恢复、竞态保护和 URL 释放。
- Create `workspace-navigation.js`: 七个产品视图的唯一显示与导航控制器。
- Create `project-dashboard.js`: 项目桌面渲染、筛选、选择、首次新建和核心 API 调用。
- Create `project-dashboard.css`: 融合终稿视觉、状态、抽屉和响应式。
- Modify `camera-app.js`: 删除全局视图状态与切换职责，只保留运镜工作台业务。
- Modify `workspace-core.js`: 接入 schema v2、公开项目桌面窄接口、深链接和安全持久化。
- Modify `ui-motion.js`: 增加项目桌面元数据，不再自行推断不存在的工作台。
- Modify `index.html`: 增加项目入口、项目桌面语义结构、轻量新建对话框和脚本顺序。
- Modify `prompt-generator.test.js`: 增加项目库、摘要、封面、导航、结构和视觉合同测试。
- Create/replace `design-qa.md`: 记录融合终稿与真实页面的最终并排验收。

---

### Task 1: Project Store Schema And Pure State Transitions

**Files:**
- Create: `project-store.js`
- Modify: `prompt-generator.test.js:1-70,1538-1588`

**Interfaces:**
- Produces: `PROJECT_STORE_SCHEMA_VERSION`, `WORKSPACE_IDS`, `DEFAULT_DASHBOARD_VIEW`, `normalizeProjectStore(raw, options)`, `completeOnboarding(store, fields, now)`, `createProjectInStore(store, fields, options)`, `patchDashboardView(store, patch)`, `toggleProjectFavorite(store, projectId, now)`.
- Consumes: caller-supplied `createBlankProject(name)` so tests and `workspace-core.js` retain the existing project ID strategy.

- [ ] **Step 1: Write failing project-store tests**

Add the import near the top of `prompt-generator.test.js`:

```js
const {
  PROJECT_STORE_SCHEMA_VERSION,
  WORKSPACE_IDS,
  normalizeProjectStore,
  completeOnboarding,
  createProjectInStore,
  patchDashboardView,
  toggleProjectFavorite
} = require("./project-store.js");
```

Add focused tests:

```js
runTest("project store migrates old libraries without reopening onboarding", () => {
  const old = {
    schemaVersion: 1,
    activeProjectId: "p1",
    projects: [{ id: "p1", name: "未命名电影项目", activeWorkspace: "camera", workspaces: { camera: { scene: "码头" } } }]
  };
  const normalized = normalizeProjectStore(old, {
    createBlankProject: () => ({ id: "new", name: "未命名电影项目", activeWorkspace: "tone", workspaces: {} })
  });
  assert.strictEqual(normalized.schemaVersion, PROJECT_STORE_SCHEMA_VERSION);
  assert.strictEqual(normalized.onboardingComplete, true);
  assert.strictEqual(normalized.projects[0].activeWorkspace, "camera");
  assert.strictEqual(normalized.projects[0].workspaces.camera.scene, "码头");
});

runTest("fresh project store keeps one starter and completes it in place", () => {
  const fresh = normalizeProjectStore(null, {
    createBlankProject: () => ({ id: "starter", name: "未命名电影项目", activeWorkspace: "tone", workspaces: {} })
  });
  assert.strictEqual(fresh.projects.length, 1);
  assert.strictEqual(fresh.onboardingComplete, false);
  const completed = completeOnboarding(fresh, {
    name: "雾港来信", type: "drama", aspectRatio: "2.39:1", estimatedDurationSeconds: 720
  }, "2026-07-19T10:00:00.000Z");
  assert.strictEqual(completed.projects.length, 1);
  assert.strictEqual(completed.projects[0].id, "starter");
  assert.strictEqual(completed.onboardingComplete, true);
});

runTest("dashboard view and favorite transitions reject malformed input", () => {
  const store = normalizeProjectStore({
    schemaVersion: 2,
    onboardingComplete: true,
    activeProjectId: "p1",
    projects: [{ id: "p1", name: "A", activeWorkspace: "tone", workspaces: {} }]
  }, { createBlankProject: () => ({ id: "fallback", name: "未命名电影项目", workspaces: {} }) });
  const patched = patchDashboardView(store, { category: "unknown", sort: "name-asc", selectedProjectId: "missing", scrollTop: -10 });
  assert.deepStrictEqual(patched.dashboardView, { category: "all", sort: "name-asc", search: "", selectedProjectId: "p1", scrollTop: 0 });
  const favorited = toggleProjectFavorite(patched, "p1", "2026-07-19T10:00:00.000Z");
  assert.strictEqual(favorited.projects[0].favorite, true);
});

runTest("project store only accepts six creative workspace ids", () => {
  assert.deepStrictEqual(WORKSPACE_IDS, ["tone", "camera", "casting", "poster", "reverse", "music"]);
});

runTest("regular project creation appends and selects one project", () => {
  const store = normalizeProjectStore({
    onboardingComplete: true,
    activeProjectId: "p1",
    projects: [{ id: "p1", name: "A", activeWorkspace: "tone", workspaces: {} }]
  }, { createBlankProject: () => ({ id: "fallback", name: "未命名电影项目", workspaces: {} }) });
  const next = createProjectInStore(store, { name: "风从海上来", type: "documentary", aspectRatio: "16:9" }, {
    createBlankProject: (name) => ({ id: "p2", name, activeWorkspace: "tone", workspaces: {} }),
    now: "2026-07-19T11:00:00.000Z"
  });
  assert.strictEqual(next.projects.length, 2);
  assert.strictEqual(next.activeProjectId, "p2");
  assert.strictEqual(next.dashboardView.selectedProjectId, "p2");
});
```

- [ ] **Step 2: Run the tests and verify red**

Run:

```bash
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node prompt-generator.test.js
```

Expected: `Cannot find module './project-store.js'` or the five new project-store tests print `FAIL`.

- [ ] **Step 3: Implement the schema and transitions**

Create `project-store.js` as an IIFE with CommonJS exports. The core normalization must use these exact invariants:

```js
(function initProjectStore(root) {
  const PROJECT_STORE_SCHEMA_VERSION = 2;
  const WORKSPACE_IDS = Object.freeze(["tone", "camera", "casting", "poster", "reverse", "music"]);
  const CATEGORIES = new Set(["all", "recent", "favorite", "backup"]);
  const SORTS = new Set(["updated-desc", "created-desc", "name-asc"]);
  const DEFAULT_DASHBOARD_VIEW = Object.freeze({
    category: "all", sort: "updated-desc", search: "", selectedProjectId: "", scrollTop: 0
  });

  function normalizeDuration(value) {
    if (value === null || value === "" || value === undefined) return null;
    const number = Number(value);
    return Number.isInteger(number) && number >= 1 && number <= 86400 ? number : null;
  }

  function normalizeWorkspace(value) {
    return WORKSPACE_IDS.includes(value) ? value : "tone";
  }

  function normalizeProject(project, fallbackId) {
    const source = project && typeof project === "object" && !Array.isArray(project) ? project : {};
    return {
      ...source,
      id: typeof source.id === "string" && source.id ? source.id : fallbackId,
      name: typeof source.name === "string" && source.name.trim() ? source.name.trim().slice(0, 60) : "未命名电影项目",
      favorite: source.favorite === true,
      activeWorkspace: normalizeWorkspace(source.activeWorkspace),
      workspaces: source.workspaces && typeof source.workspaces === "object" && !Array.isArray(source.workspaces) ? source.workspaces : {},
      productionMeta: {
        type: typeof source.productionMeta?.type === "string" ? source.productionMeta.type : "drama",
        aspectRatio: typeof source.productionMeta?.aspectRatio === "string" ? source.productionMeta.aspectRatio : "16:9",
        estimatedDurationSeconds: normalizeDuration(source.productionMeta?.estimatedDurationSeconds)
      }
    };
  }

  function normalizeProjectStore(raw, { createBlankProject } = {}) {
    if (typeof createBlankProject !== "function") throw new TypeError("缺少空项目创建方法。");
    const validLibrary = raw && typeof raw === "object" && Array.isArray(raw.projects) && raw.projects.length > 0;
    const sourceProjects = validLibrary ? raw.projects : [createBlankProject("未命名电影项目")];
    const projects = sourceProjects.map((project, index) => normalizeProject(project, `project-${index + 1}`));
    const projectIds = new Set(projects.map((project) => project.id));
    const activeProjectId = projectIds.has(raw?.activeProjectId) ? raw.activeProjectId : projects[0].id;
    const view = raw?.dashboardView && typeof raw.dashboardView === "object" ? raw.dashboardView : {};
    return {
      ...raw,
      schemaVersion: PROJECT_STORE_SCHEMA_VERSION,
      onboardingComplete: validLibrary ? raw.onboardingComplete !== false : false,
      activeProjectId,
      projects,
      dashboardView: {
        category: CATEGORIES.has(view.category) ? view.category : "all",
        sort: SORTS.has(view.sort) ? view.sort : "updated-desc",
        search: typeof view.search === "string" ? view.search.slice(0, 80) : "",
        selectedProjectId: projectIds.has(view.selectedProjectId) ? view.selectedProjectId : activeProjectId,
        scrollTop: Number.isFinite(view.scrollTop) && view.scrollTop >= 0 ? Math.round(view.scrollTop) : 0
      }
    };
  }

  function clone(store) { return JSON.parse(JSON.stringify(store)); }

  function completeOnboarding(store, fields, now) {
    const next = clone(store);
    const project = next.projects.find((item) => item.id === next.activeProjectId) || next.projects[0];
    project.name = String(fields.name || "").trim().slice(0, 60);
    if (!project.name) throw new Error("请输入项目名称。");
    project.productionMeta = {
      type: fields.type || "drama",
      aspectRatio: fields.aspectRatio || "16:9",
      estimatedDurationSeconds: normalizeDuration(fields.estimatedDurationSeconds)
    };
    project.updatedAt = now;
    next.onboardingComplete = true;
    return next;
  }

  function patchDashboardView(store, patch) {
    const next = clone(store);
    next.dashboardView = { ...next.dashboardView, ...patch };
    return normalizeProjectStore(next, { createBlankProject: () => next.projects[0] });
  }

  function toggleProjectFavorite(store, projectId, now) {
    const next = clone(store);
    const project = next.projects.find((item) => item.id === projectId);
    if (!project) return next;
    project.favorite = !project.favorite;
    project.updatedAt = now;
    return next;
  }

  function createProjectInStore(store, fields, { createBlankProject, now }) {
    const next = clone(store);
    const project = normalizeProject(createBlankProject(fields.name), `project-${Date.now()}`);
    project.name = String(fields.name || "").trim().slice(0, 60);
    if (!project.name) throw new Error("请输入项目名称。");
    project.productionMeta = {
      type: fields.type || "drama",
      aspectRatio: fields.aspectRatio || "16:9",
      estimatedDurationSeconds: normalizeDuration(fields.estimatedDurationSeconds)
    };
    project.createdAt = now;
    project.updatedAt = now;
    next.projects.push(project);
    next.activeProjectId = project.id;
    next.dashboardView.selectedProjectId = project.id;
    next.onboardingComplete = true;
    return next;
  }

  const api = {
    PROJECT_STORE_SCHEMA_VERSION, WORKSPACE_IDS, DEFAULT_DASHBOARD_VIEW,
    normalizeProjectStore, completeOnboarding, createProjectInStore,
    patchDashboardView, toggleProjectFavorite
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.aigcProjectStore = api;
})(typeof window !== "undefined" ? window : globalThis);
```

The implementation above is the public contract; do not export internal normalization helpers.

- [ ] **Step 4: Run the full test file and verify green**

Run the Node command from Step 2.

Expected: all existing tests plus the five new project-store tests print `PASS`; there are no `FAIL` lines.

- [ ] **Step 5: Commit Task 1**

```bash
git add project-store.js prompt-generator.test.js
git commit -m "feat: add project library state model"
```

---

### Task 2: Six Workspace Summary Adapters

**Files:**
- Create: `project-summary.js`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: normalized project `{ activeWorkspace, workspaces }` from Task 1.
- Produces: `summarizeProject(project) -> { summaries, configuredCount, next }`, where every summary is `{ status, title, detail, workspace, actionLabel }`.

- [ ] **Step 1: Write failing summary tests**

Import `summarizeProject` and add:

```js
runTest("project summaries expose all six stable workspace contracts", () => {
  const result = summarizeProject({
    activeWorkspace: "camera",
    workspaces: {
      tone: { selected: [{ title: "冷暖都市", palette: "青橙对比", lighting: "低照度" }] },
      camera: { selected: { id: "case-01", title: "码头跟随长镜头" }, aspect: "wide" },
      casting: { identity: { name: "林岚" }, versions: [{ number: 1 }] },
      poster: {},
      reverse: { sourceFileName: "dock.jpg", dimensions: { subject: "人物" } },
      music: { templateId: "film-intimate-drama", coreEmotion: "restrained", bpm: 72 }
    }
  });
  assert.deepStrictEqual(Object.keys(result.summaries), ["tone", "camera", "casting", "poster", "reverse", "music"]);
  assert.strictEqual(result.summaries.camera.status, "configured");
  assert.strictEqual(result.summaries.poster.status, "empty");
  assert.strictEqual(result.configuredCount, 5);
  assert.strictEqual(result.next.workspace, "camera");
});

runTest("project summaries fail soft for malformed workspace data", () => {
  const result = summarizeProject({ activeWorkspace: "tone", workspaces: { casting: "broken" } });
  assert.strictEqual(result.summaries.casting.status, "unreadable");
  assert.strictEqual(result.next.workspace, "casting");
  assert(result.next.detail.includes("检查数据"));
});

runTest("completed project suggests review without fake percentage", () => {
  const configured = {
    tone: { selected: [{ title: "A" }] }, camera: { selected: { id: "A" } }, casting: { identity: { name: "A" } },
    poster: { title: "A" }, reverse: { sourceFileName: "A.jpg" }, music: { templateId: "A" }
  };
  const result = summarizeProject({ activeWorkspace: "music", workspaces: configured });
  assert.strictEqual(result.configuredCount, 6);
  assert.strictEqual(result.next.workspace, "music");
  assert(!result.next.detail.includes("100%"));
});
```

- [ ] **Step 2: Run tests and verify red**

Run the full Node test command.

Expected: module missing or the three summary tests print `FAIL`.

- [ ] **Step 3: Implement pure summary functions**

Create an IIFE/CommonJS module. Use a shared shape helper and never mutate the project:

```js
const WORKSPACE_ORDER = ["tone", "casting", "camera", "poster", "reverse", "music"];
const LABELS = { tone: "影调生成", camera: "15 秒运镜", casting: "角色定妆", poster: "海报生图", reverse: "画面反推", music: "音乐配乐" };

function summary(workspace, status, title, detail, actionLabel = "打开") {
  return { workspace, status, title: title || LABELS[workspace], detail: detail || "尚未设置", actionLabel };
}

function validObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function summarizeTone(state) {
  if (state === undefined) return summary("tone", "empty");
  if (!validObject(state)) return summary("tone", "unreadable", "影调数据无法读取", "打开检查");
  const selected = Array.isArray(state.selected) ? state.selected.filter(validObject) : [];
  if (!selected.length) return summary("tone", "empty");
  return summary("tone", "configured", selected[0].title || "已选影调", [selected[0].palette, selected[0].lighting].filter(Boolean).join(" · "), "继续调整");
}

function summarizeCamera(state) {
  if (state === undefined) return summary("camera", "empty");
  if (!validObject(state)) return summary("camera", "unreadable", "运镜数据无法读取", "打开检查");
  if (!validObject(state.selected) && !state.scene && !state.action) return summary("camera", "empty");
  return summary("camera", "configured", state.selected?.title || "已设置运镜", [state.aspect === "wide" ? "21:9" : "16:9", state.scene || state.action].filter(Boolean).join(" · "), "继续设计");
}

function summarizeCasting(state) {
  if (state === undefined) return summary("casting", "empty");
  if (!validObject(state)) return summary("casting", "unreadable", "角色数据无法读取", "打开检查");
  const identityName = state.identity?.name || state.identityBoard?.character || state.characterName || "";
  const configured = Boolean(identityName || state.referenceAsset?.id || (Array.isArray(state.versions) && state.versions.length));
  return configured
    ? summary("casting", "configured", identityName || "已保存角色", `${Array.isArray(state.versions) ? state.versions.length : 0} 个角色版本`, "继续定妆")
    : summary("casting", "empty");
}

function summarizePoster(state) {
  if (state === undefined) return summary("poster", "empty");
  if (!validObject(state)) return summary("poster", "unreadable", "海报数据无法读取", "打开检查");
  const configured = Boolean(state.templateId || state.title || state.subject || state.purpose);
  return configured
    ? summary("poster", "configured", state.title || state.templateTitle || "已设置主视觉", [state.purpose, state.ratio].filter(Boolean).join(" · "), "继续设计")
    : summary("poster", "empty");
}

function summarizeReverse(state) {
  if (state === undefined) return summary("reverse", "empty");
  if (!validObject(state)) return summary("reverse", "unreadable", "反推数据无法读取", "打开检查");
  const calibrated = validObject(state.dimensions) && Object.values(state.dimensions).some((value) => String(value || "").trim());
  const configured = Boolean(state.sourceFileName || state.referenceFileName || calibrated || state.task);
  return configured
    ? summary("reverse", "configured", state.sourceFileName || state.referenceFileName || "已保存画面拆解", calibrated ? "八维校准已设置" : "任务设置已保存", "继续拆解")
    : summary("reverse", "empty");
}

function summarizeMusic(state) {
  if (state === undefined) return summary("music", "empty");
  if (!validObject(state)) return summary("music", "unreadable", "配乐数据无法读取", "打开检查");
  const configured = Boolean(state.templateId || state.sceneZh || state.coreEmotion || Object.values(state.orchestration || {}).some((items) => Array.isArray(items) && items.length));
  return configured
    ? summary("music", "configured", state.templateTitle || "已设置配乐", [state.coreEmotion, state.bpm ? `${state.bpm} BPM` : ""].filter(Boolean).join(" · "), "继续配乐")
    : summary("music", "empty");
}

function summarizeProject(project) {
  const workspaces = validObject(project?.workspaces) ? project.workspaces : {};
  const summaries = {
    tone: summarizeTone(workspaces.tone),
    camera: summarizeCamera(workspaces.camera),
    casting: summarizeCasting(workspaces.casting),
    poster: summarizePoster(workspaces.poster),
    reverse: summarizeReverse(workspaces.reverse),
    music: summarizeMusic(workspaces.music)
  };
  const values = Object.values(summaries);
  const unreadable = values.find((item) => item.status === "unreadable");
  const active = summaries[project?.activeWorkspace];
  const firstEmpty = WORKSPACE_ORDER.map((id) => summaries[id]).find((item) => item.status === "empty");
  let next = unreadable;
  if (!next && active?.status !== "empty") next = active;
  if (!next) next = firstEmpty;
  if (!next) next = summary(project?.activeWorkspace || "tone", "configured", "项目检查与导出", "六项创作资料均已设置", "检查项目");
  if (next.status === "unreadable") next = { ...next, detail: `${next.detail}，请打开对应工作台检查数据` };
  return { summaries, configuredCount: values.filter((item) => item.status === "configured").length, next };
}
```

Export `WORKSPACE_ORDER`, all six adapters, and `summarizeProject` for CommonJS; assign the same API to `root.aigcProjectSummary` in the browser.

- [ ] **Step 4: Run all Node tests and verify green**

Expected: all tests print `PASS` and no `FAIL` appears.

- [ ] **Step 5: Commit Task 2**

```bash
git add project-summary.js prompt-generator.test.js
git commit -m "feat: summarize project workspaces"
```

---

### Task 3: Safe Project Cover Resolver

**Files:**
- Create: `project-cover.js`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: project state, `aigcCastingAssetStore.get(id)`, local poster/tone lookup functions, and `URL.createObjectURL/revokeObjectURL`.
- Produces: `createProjectCoverResolver(options)` returning `resolve(project)`, `releaseProject(projectId)`, `releaseAll()`.

- [ ] **Step 1: Write failing resolver lifecycle tests**

```js
runTest("project cover resolver ignores stale assets and revokes every object URL", async () => {
  const pending = new Map();
  const revoked = [];
  let nextUrl = 0;
  const resolver = createProjectCoverResolver({
    getCastingAsset: (id) => new Promise((resolve) => pending.set(id, resolve)),
    createObjectURL: () => `blob:cover-${++nextUrl}`,
    revokeObjectURL: (url) => revoked.push(url),
    staticCoverFor: () => "assets/poster-templates/film-negative-space.jpg"
  });
  const first = resolver.resolve({ id: "p1", workspaces: { casting: { referenceAsset: { id: "a1" } } } });
  const second = resolver.resolve({ id: "p1", workspaces: { casting: { referenceAsset: { id: "a2" } } } });
  pending.get("a1")({ blob: { id: "old" } });
  pending.get("a2")({ blob: { id: "new" } });
  assert.strictEqual((await first).stale, true);
  assert.strictEqual((await second).src, "blob:cover-2");
  resolver.releaseProject("p1");
  assert.deepStrictEqual(revoked, ["blob:cover-1", "blob:cover-2"]);
});

runTest("project cover resolver falls back without broken images", async () => {
  const resolver = createProjectCoverResolver({
    getCastingAsset: async () => null,
    createObjectURL: () => "blob:unused",
    revokeObjectURL: () => {},
    staticCoverFor: () => "assets/poster-templates/film-character-world.jpg"
  });
  const result = await resolver.resolve({ id: "p1", workspaces: {} });
  assert.strictEqual(result.kind, "static");
  assert.strictEqual(result.src, "assets/poster-templates/film-character-world.jpg");
});
```

- [ ] **Step 2: Run tests and verify red**

Expected: the resolver module is missing or both lifecycle tests fail.

- [ ] **Step 3: Implement token-based async resolution**

Use per-project generation numbers and owned URL sets:

```js
function createProjectCoverResolver({ getCastingAsset, createObjectURL, revokeObjectURL, staticCoverFor }) {
  const generations = new Map();
  const urls = new Map();

  function own(projectId, url) {
    const owned = urls.get(projectId) || new Set();
    owned.add(url);
    urls.set(projectId, owned);
  }

  async function resolve(project) {
    const projectId = project?.id;
    const generation = (generations.get(projectId) || 0) + 1;
    generations.set(projectId, generation);
    const assetId = project?.workspaces?.casting?.referenceAsset?.id || "";
    if (assetId) {
      try {
        const record = await getCastingAsset(assetId);
        if (record?.blob) {
          const src = createObjectURL(record.blob);
          own(projectId, src);
          const stale = generations.get(projectId) !== generation;
          return { projectId, src, kind: "blob", stale };
        }
      } catch (error) {
        // Static local cover is the recoverable path.
      }
    }
    return { projectId, src: staticCoverFor(project), kind: "static", stale: generations.get(projectId) !== generation };
  }

  function releaseProject(projectId) {
    generations.set(projectId, (generations.get(projectId) || 0) + 1);
    for (const url of urls.get(projectId) || []) revokeObjectURL(url);
    urls.delete(projectId);
  }

  function releaseAll() {
    for (const projectId of [...urls.keys()]) releaseProject(projectId);
  }

  return { resolve, releaseProject, releaseAll };
}
```

Export for CommonJS and assign `root.aigcProjectCover` in browsers.

- [ ] **Step 4: Run full tests and verify green**

Expected: no `FAIL` lines.

- [ ] **Step 5: Commit Task 3**

```bash
git add project-cover.js prompt-generator.test.js
git commit -m "feat: resolve project covers safely"
```

---

### Task 4: Global Workspace Navigation And Project-Core API

**Files:**
- Create: `workspace-navigation.js`
- Modify: `camera-app.js:7-28,195-215,452-460`
- Modify: `workspace-core.js:109-180,207-248,279-296,532-543`
- Modify: `ui-motion.js:4-18,73-107`
- Modify: `index.html:28-47,998-1017`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- `aigcWorkspaceNavigation.show(name)`, `.current()`, `.subscribe(listener)`; valid views are `projects` plus the six creative workspace IDs.
- `aigcWorkspaceCore.getProjectSnapshot()`, `.subscribeProjects(listener)`, `.setDashboardView(patch)`, `.selectProject(id)`, `.completeOnboarding(fields)`, `.toggleFavorite(id)`, `.openProjectWorkspace(projectId, workspace)`.
- Consumes Task 1 state functions and existing workbench `exportState/importState` APIs.

- [ ] **Step 1: Add failing navigation and persistence contract tests**

```js
runTest("project dashboard is a view and never a persisted creative workspace", () => {
  const navigation = fs.readFileSync("workspace-navigation.js", "utf8");
  const camera = fs.readFileSync("camera-app.js", "utf8");
  const core = fs.readFileSync("workspace-core.js", "utf8");
  assert(navigation.includes('"projects"'));
  assert(navigation.includes("workspace-view"));
  assert(!camera.includes('modeButtons: [...document.querySelectorAll("[data-workspace]")]'));
  assert(core.includes('if (view !== "projects")'));
  assert(core.includes("getProjectSnapshot"));
  assert(core.includes("completeOnboarding"));
});

runTest("project dashboard preserves six deep links", () => {
  const core = fs.readFileSync("workspace-core.js", "utf8");
  assert(core.includes("preferredWorkspace ? preferredWorkspace : \"projects\""));
  ["tone", "camera", "casting", "poster", "reverse", "music"].forEach((id) => assert(core.includes(id)));
});
```

- [ ] **Step 2: Run tests and verify red**

Expected: `workspace-navigation.js` is missing and both tests fail.

- [ ] **Step 3: Create the single navigation owner**

Implement `workspace-navigation.js`:

```js
(function initWorkspaceNavigation(root) {
  if (!root.document) return;
  const VALID = new Set(["projects", "tone", "camera", "casting", "poster", "reverse", "music"]);
  const buttons = [...document.querySelectorAll(".mode-button[data-workspace]")];
  const views = [...document.querySelectorAll(".workspace-view")];
  const listeners = new Set();
  let active = "";

  function show(name) {
    const next = VALID.has(name) ? name : "projects";
    views.forEach((view) => {
      const selected = view.dataset.workspaceView === next;
      view.hidden = !selected;
      view.classList.toggle("active", selected);
    });
    buttons.forEach((button) => {
      const selected = button.dataset.workspace === next;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", String(selected));
    });
    if (active !== next) {
      active = next;
      document.documentElement.dataset.activeWorkspace = next;
      listeners.forEach((listener) => listener(next));
    }
    return next;
  }

  buttons.forEach((button) => button.addEventListener("click", () => show(button.dataset.workspace)));
  root.aigcWorkspaceNavigation = {
    show,
    current: () => active,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
  };
})(typeof window !== "undefined" ? window : globalThis);
```

Give every `<main>` an explicit `data-workspace-view`. Remove `state.workspace`, global workspace element references, `renderWorkspace`, and the mode-button listener from `camera-app.js`.

- [ ] **Step 4: Integrate normalized store and narrow core API**

Load `project-store.js`, `project-summary.js`, `project-cover.js`, and `workspace-navigation.js` before `workspace-core.js`. In `workspace-core.js`:

```js
const storeModel = root.aigcProjectStore;
const navigation = root.aigcWorkspaceNavigation;
let store = storeModel.normalizeProjectStore(readRawStore(), { createBlankProject: blankProject });
const projectListeners = new Set();

function notifyProjects() {
  const snapshot = JSON.parse(JSON.stringify(store));
  projectListeners.forEach((listener) => listener(snapshot));
}

function currentCreativeWorkspace() {
  const view = navigation.current();
  return storeModel.WORKSPACE_IDS.includes(view) ? view : activeProject()?.activeWorkspace || "tone";
}
```

Change `persistNow()` so it captures workbench state but only updates `project.activeWorkspace` when `navigation.current() !== "projects"`. Add explicit API methods from the Interfaces block; every mutating method must call `writeStore()` before assigning the new in-memory store, then call `notifyProjects()`.

Use one transactional helper so a failed localStorage write cannot publish false in-memory state:

```js
function commitStore(nextStore) {
  writeStore(nextStore);
  store = nextStore;
  notifyProjects();
  return JSON.parse(JSON.stringify(store));
}

async function selectProject(projectId) {
  await saveNow();
  const next = JSON.parse(JSON.stringify(store));
  if (!next.projects.some((project) => project.id === projectId)) throw new Error("项目不存在。");
  next.activeProjectId = projectId;
  next.dashboardView.selectedProjectId = projectId;
  return commitStore(next);
}

function setDashboardView(patch) {
  return commitStore(storeModel.patchDashboardView(store, patch));
}

function completeProjectOnboarding(fields) {
  return commitStore(storeModel.completeOnboarding(store, fields, nowText()));
}

function createProject(fields) {
  return commitStore(storeModel.createProjectInStore(store, fields, {
    createBlankProject: blankProject,
    now: nowText()
  }));
}

function toggleFavorite(projectId) {
  return commitStore(storeModel.toggleProjectFavorite(store, projectId, nowText()));
}

async function openProjectWorkspace(projectId, requested) {
  await selectProject(projectId);
  const project = activeProject();
  applyProjectState(project);
  const workspace = storeModel.WORKSPACE_IDS.includes(requested) ? requested : project.activeWorkspace;
  project.activeWorkspace = workspace;
  project.lastOpenedAt = nowText();
  commitStore(JSON.parse(JSON.stringify(store)));
  navigation.show(workspace);
}

root.aigcWorkspaceCore = {
  persistNow,
  queryCastingAssetReferences,
  cleanupCastingAssetIfUnreferenced,
  getProjectSnapshot: () => JSON.parse(JSON.stringify(store)),
  subscribeProjects(listener) { projectListeners.add(listener); return () => projectListeners.delete(listener); },
  setDashboardView,
  selectProject,
  completeOnboarding: completeProjectOnboarding,
  createProject,
  toggleFavorite,
  openProjectWorkspace
};
```

Rename the existing `applyProject` body that imports workbench states to `applyProjectState`; it must not choose or click a view. Navigation happens only through `workspace-navigation.js`.

Initial route rule:

```js
const initialView = preferredWorkspace ? preferredWorkspace : "projects";
navigation.show(initialView);
```

Switching projects from the dashboard must keep `projects` visible; `openProjectWorkspace` imports the target project, records a valid creative workspace, persists, then calls `navigation.show(workspace)`.

- [ ] **Step 5: Update UI motion metadata**

Add:

```js
projects: { code: "PROJECT COMMAND", title: "项目桌面" }
```

Use `aigcWorkspaceNavigation.subscribe(updateContext)` as the authoritative update signal. Keep the MutationObserver only as a compatibility fallback during this task.

- [ ] **Step 6: Run tests and verify green**

Run the full Node test file. Expected: all tests print `PASS`.

- [ ] **Step 7: Commit Task 4**

```bash
git add workspace-navigation.js camera-app.js workspace-core.js ui-motion.js index.html prompt-generator.test.js
git commit -m "feat: separate project and workspace navigation"
```

---

### Task 5: Project Dashboard Structure And Controller

**Files:**
- Create: `project-dashboard.js`
- Modify: `index.html:23-105, before tone-workspace, scripts footer`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes `aigcWorkspaceCore` API from Task 4, `summarizeProject`, and `aigcProjectCover.createProjectCoverResolver`.
- Produces no project persistence of its own; it renders `#project-workspace` and dispatches only through core methods.

- [ ] **Step 1: Add failing markup/controller contract tests**

```js
runTest("project dashboard exposes the confirmed three-column production contract", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const source = fs.readFileSync("project-dashboard.js", "utf8");
  [
    "project-workspace", "project-mode-button", "project-center-column", "project-category-nav", "project-spotlight", "project-stage-list",
    "project-card-list", "project-active-detail", "project-dashboard-new", "project-dashboard-sort", "project-category-select",
    "project-detail-open", "project-detail-close", "project-onboarding-dialog", "project-onboarding-import"
  ].forEach((id) => assert.strictEqual((html.match(new RegExp(`id=["']${id}["']`, "g")) || []).length, 1));
  ["getProjectSnapshot", "subscribeProjects", "setDashboardView", "selectProject", "completeOnboarding", "createProject", "toggleFavorite", "openProjectWorkspace"].forEach((token) => assert(source.includes(token)));
  assert(source.includes("releaseProject"));
  assert(source.includes("releaseAll"));
});

runTest("project cards separate selection from commands", () => {
  const source = fs.readFileSync("project-dashboard.js", "utf8");
  assert(source.includes('role="option"'));
  assert(source.includes('data-project-action="continue"'));
  assert(source.includes('data-project-action="favorite"'));
  assert(!source.includes("dblclick"));
});
```

- [ ] **Step 2: Run tests and verify red**

Expected: missing `project-dashboard.js` or missing IDs.

- [ ] **Step 3: Add semantic dashboard markup**

Add `<button id="project-mode-button" class="mode-button" data-workspace="projects">项目桌面</button>` as the first product-view entry in the existing global navigation. Insert a hidden `<main id="project-workspace" class="project-dashboard workspace-view" data-workspace-view="projects">` before the tone workspace. It must contain:

```html
<aside class="project-rail" aria-label="项目分类">
  <div class="project-library-status"><span>LOCAL STUDIO</span><strong>本地项目库</strong><small id="project-library-count">0 个项目</small></div>
  <button id="project-dashboard-new" type="button">新建影视项目</button>
  <nav id="project-category-nav" aria-label="项目筛选"></nav>
</aside>
<section id="project-center-column" class="project-center-column" aria-label="项目内容">
  <label class="project-mobile-filter">项目分类<select id="project-category-select"><option value="all">全部</option><option value="recent">最近</option><option value="favorite">收藏</option><option value="backup">备份</option></select></label>
  <section id="project-spotlight" class="project-spotlight" aria-label="当前影视项目"></section><button id="project-detail-open" type="button" aria-controls="project-active-detail">项目详情</button>
  <section aria-labelledby="project-stage-title"><header><h2 id="project-stage-title">当前制作进度</h2><span id="project-stage-meta"></span></header><div id="project-stage-list" class="project-stage-list"></div></section>
  <section aria-labelledby="project-recent-title"><header><h2 id="project-recent-title">最近项目</h2><label>搜索项目<input id="project-dashboard-search" type="search"></label><label>排序<select id="project-dashboard-sort"><option value="updated-desc">最近更新</option><option value="created-desc">最近创建</option><option value="name-asc">名称</option></select></label></header><div id="project-card-list" class="project-card-list" role="listbox" aria-label="影视项目"></div></section>
</section>
<aside id="project-active-detail" class="project-active-detail" role="dialog" aria-label="当前项目详情"><button id="project-detail-close" type="button" aria-label="关闭项目详情">关闭</button><div id="project-active-detail-content"></div></aside>
```

Add a native `<dialog id="project-onboarding-dialog">` with labeled fields `project-onboarding-name`, `project-onboarding-type`, `project-onboarding-aspect`, `project-onboarding-duration`, and `project-onboarding-duration-unit`. Reuse this dialog for first-use starter completion and later project creation; the controller owns a `formMode` value of `"starter"` or `"new"`. The submit button must be `project-onboarding-submit`. Add `project-onboarding-import` as a secondary button that closes this dialog and opens the existing `project-center-open` dialog; it must reuse the existing `project-import` input instead of creating another import implementation.

- [ ] **Step 4: Implement deterministic rendering and events**

In `project-dashboard.js`, cache all elements, initialize a cover resolver, and render from snapshots:

```js
const core = root.aigcWorkspaceCore;
const summaryApi = root.aigcProjectSummary;
const coverApi = root.aigcProjectCover;
const elements = {
  workspace: document.querySelector("#project-workspace"),
  center: document.querySelector("#project-center-column"),
  categories: document.querySelector("#project-category-nav"),
  libraryCount: document.querySelector("#project-library-count"),
  spotlight: document.querySelector("#project-spotlight"),
  stages: document.querySelector("#project-stage-list"),
  stageMeta: document.querySelector("#project-stage-meta"),
  cards: document.querySelector("#project-card-list"),
  detail: document.querySelector("#project-active-detail"),
  detailContent: document.querySelector("#project-active-detail-content"),
  detailOpen: document.querySelector("#project-detail-open"),
  detailClose: document.querySelector("#project-detail-close"),
  search: document.querySelector("#project-dashboard-search"),
  sort: document.querySelector("#project-dashboard-sort"),
  categorySelect: document.querySelector("#project-category-select"),
  newProject: document.querySelector("#project-dashboard-new"),
  onboardingDialog: document.querySelector("#project-onboarding-dialog"),
  onboardingForm: document.querySelector("#project-onboarding-form"),
  name: document.querySelector("#project-onboarding-name"),
  type: document.querySelector("#project-onboarding-type"),
  aspect: document.querySelector("#project-onboarding-aspect"),
  duration: document.querySelector("#project-onboarding-duration"),
  durationUnit: document.querySelector("#project-onboarding-duration-unit"),
  onboardingError: document.querySelector("#project-onboarding-error"),
  onboardingImport: document.querySelector("#project-onboarding-import")
};
const coverResolver = coverApi.createProjectCoverResolver({
  getCastingAsset: (id) => root.aigcCastingAssetStore.get(id),
  createObjectURL: (blob) => root.URL.createObjectURL(blob),
  revokeObjectURL: (url) => root.URL.revokeObjectURL(url),
  staticCoverFor: staticCoverForProject
});
let snapshot = core.getProjectSnapshot();
let renderGeneration = 0;
let formMode = "starter";

function selectedProject() {
  const id = snapshot.dashboardView.selectedProjectId || snapshot.activeProjectId;
  return snapshot.projects.find((project) => project.id === id) || snapshot.projects[0];
}

function render() {
  renderGeneration += 1;
  renderNavigation();
  renderProjects();
  renderSelectedProject(selectedProject(), renderGeneration);
  elements.search.value = snapshot.dashboardView.search;
  elements.sort.value = snapshot.dashboardView.sort;
  elements.categorySelect.value = snapshot.dashboardView.category;
  if (snapshot.onboardingComplete === false && !elements.onboardingDialog.open) {
    formMode = "starter";
    elements.onboardingDialog.showModal();
  }
  requestAnimationFrame(() => {
    if (Math.abs(elements.center.scrollTop - snapshot.dashboardView.scrollTop) > 2) {
      elements.center.scrollTop = snapshot.dashboardView.scrollTop;
    }
  });
}
```

Filter and sort project cards with one deterministic function. `backup` means projects whose name contains “备份” or whose `backupOf`/`importedAt` metadata exists; `recent` means the eight most recently updated projects. Search is case-insensitive and matches project name plus production type:

```js
function visibleProjects() {
  const view = snapshot.dashboardView;
  const query = view.search.trim().toLocaleLowerCase("zh-CN");
  let projects = snapshot.projects.filter((project) => {
    if (view.category === "favorite" && !project.favorite) return false;
    if (view.category === "backup" && !(project.backupOf || project.importedAt || project.name.includes("备份"))) return false;
    const haystack = `${project.name} ${project.productionMeta?.type || ""}`.toLocaleLowerCase("zh-CN");
    return !query || haystack.includes(query);
  });
  projects.sort((a, b) => {
    if (view.sort === "name-asc") return a.name.localeCompare(b.name, "zh-CN");
    const field = view.sort === "created-desc" ? "createdAt" : "updatedAt";
    return String(b[field] || "").localeCompare(String(a[field] || ""));
  });
  return view.category === "recent" ? projects.slice(0, 8) : projects;
}
```

`renderProjects()` must render an explicit empty state when `visibleProjects()` is empty: show the active search/category label and a `data-project-action="clear-filters"` button. That action resets `{ category: "all", search: "", sort: "updated-desc", scrollTop: 0 }`. When projects are visible, call `coverResolver.releaseProject(id)` for IDs removed from the previous rendered set before resolving the new cards.

Use `textContent` for user data. If templates are used, pass every dynamic string through a local `escapeHtml`. After each async cover resolves, compare both `renderGeneration` and `project.id`; stale results must not update the DOM.

The card container uses `role="option"` and `aria-selected`. Its click handler first checks `[data-project-action]`: favorite calls `toggleFavorite`, continue calls `openProjectWorkspace`, otherwise it calls `selectProject`. On unsubscribe/page unload, call `coverResolver.releaseAll()`.

Wire events without nested buttons inside a button element:

```js
elements.cards.addEventListener("click", async (event) => {
  if (event.target.closest('[data-project-action="clear-filters"]')) {
    core.setDashboardView({ category: "all", search: "", sort: "updated-desc", scrollTop: 0 });
    return;
  }
  const card = event.target.closest("[data-project-id]");
  if (!card) return;
  const projectId = card.dataset.projectId;
  const action = event.target.closest("[data-project-action]")?.dataset.projectAction || "select";
  if (action === "favorite") core.toggleFavorite(projectId);
  else if (action === "continue") await core.openProjectWorkspace(projectId);
  else await core.selectProject(projectId);
});

elements.cards.addEventListener("keydown", async (event) => {
  const card = event.target.closest('[role="option"][data-project-id]');
  if (!card || event.target.closest("button")) return;
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  await core.selectProject(card.dataset.projectId);
});

elements.search.addEventListener("input", () => core.setDashboardView({ search: elements.search.value }));
elements.sort.addEventListener("change", () => core.setDashboardView({ sort: elements.sort.value, scrollTop: 0 }));
elements.categorySelect.addEventListener("change", () => core.setDashboardView({ category: elements.categorySelect.value, scrollTop: 0 }));
let scrollTimer = 0;
elements.center.addEventListener("scroll", () => {
  root.clearTimeout(scrollTimer);
  scrollTimer = root.setTimeout(() => {
    core.setDashboardView({ scrollTop: Math.round(elements.center.scrollTop) });
  }, 180);
}, { passive: true });
elements.categories.addEventListener("click", (event) => {
  const button = event.target.closest("[data-project-category]");
  if (button) core.setDashboardView({ category: button.dataset.projectCategory, scrollTop: 0 });
});

elements.newProject.addEventListener("click", () => {
  formMode = "new";
  elements.onboardingForm.reset();
  elements.onboardingError.textContent = "";
  elements.onboardingDialog.showModal();
});
elements.onboardingImport.addEventListener("click", () => {
  elements.onboardingDialog.close();
  document.querySelector("#project-center-open")?.click();
});
document.querySelector("#project-center-close")?.addEventListener("click", () => {
  if (snapshot.onboardingComplete === false && !elements.onboardingDialog.open) {
    formMode = "starter";
    elements.onboardingDialog.showModal();
  }
});
let detailReturnFocus = null;
function openDetail() {
  detailReturnFocus = document.activeElement;
  elements.workspace.dataset.detailOpen = "true";
  elements.detail.setAttribute("aria-modal", "true");
  elements.detailClose.focus();
}
function closeDetail() {
  elements.workspace.dataset.detailOpen = "false";
  elements.detail.removeAttribute("aria-modal");
  if (detailReturnFocus?.focus) detailReturnFocus.focus();
}
elements.detailOpen.addEventListener("click", openDetail);
elements.detailClose.addEventListener("click", closeDetail);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && elements.workspace.dataset.detailOpen === "true") closeDetail();
  if (event.key !== "Tab" || elements.workspace.dataset.detailOpen !== "true") return;
  const focusable = [...elements.detail.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((node) => !node.disabled);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});

elements.onboardingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  elements.onboardingError.textContent = "";
  try {
    const fields = {
      name: elements.name.value,
      type: elements.type.value,
      aspectRatio: elements.aspect.value,
      estimatedDurationSeconds: onboardingDuration()
    };
    if (formMode === "starter") core.completeOnboarding(fields);
    else core.createProject(fields);
    elements.onboardingDialog.close();
  } catch (error) {
    elements.onboardingError.textContent = error.message || "项目创建失败。";
  }
});

const unsubscribe = core.subscribeProjects((next) => { snapshot = next; render(); });
root.addEventListener("beforeunload", () => { unsubscribe(); coverResolver.releaseAll(); }, { once: true });
```

Convert duration with:

```js
function onboardingDuration() {
  const value = Number(elements.duration.value);
  if (!Number.isFinite(value) || value <= 0) return null;
  const seconds = elements.durationUnit.value === "minutes" ? Math.round(value * 60) : Math.round(value);
  if (seconds < 1 || seconds > 86400) throw new Error("预计时长必须在 1 秒到 24 小时之间。");
  return seconds;
}
```

- [ ] **Step 5: Run all Node tests and verify green**

Expected: all dashboard structure and interaction contract tests pass.

- [ ] **Step 6: Commit Task 5**

```bash
git add project-dashboard.js index.html prompt-generator.test.js
git commit -m "feat: add cinematic project dashboard"
```

---

### Task 6: Fusion Visual System And Responsive States

**Files:**
- Create: `project-dashboard.css`
- Modify: `index.html:8-16`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes the semantic classes and IDs from Task 5.
- Produces desktop three-column layout, tablet rail/drawer modes, mobile single-column layout, focus states, reduced motion, fixed aspect ratios, and onboarding styles.

- [ ] **Step 1: Write failing visual contract tests**

```js
runTest("project dashboard stylesheet locks the confirmed fusion visual system", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const css = fs.readFileSync("project-dashboard.css", "utf8");
  assert(html.includes('href="project-dashboard.css'));
  ["--project-canvas: #e9e9e3", "--project-paper: #fbfaf5", "--project-nav: #1b1e1a", "--project-primary: #536557", "--project-amber: #b5823e", "--project-error: #7a4344"].forEach((token) => assert(css.includes(token)));
  assert(css.includes("grid-template-columns: clamp(180px, 13vw, 208px) minmax(0, 1fr) clamp(360px, 29vw, 420px)"));
  assert(css.includes("aspect-ratio: 16 / 5"));
  assert(css.includes("aspect-ratio: 16 / 9"));
  assert(css.includes("@media (max-width: 1279px)"));
  assert(css.includes("@media (max-width: 1023px)"));
  assert(css.includes("@media (max-width: 819px)"));
  assert(css.includes("@media (max-width: 390px)"));
  assert(css.includes("@media (prefers-reduced-motion: reduce)"));
});
```

- [ ] **Step 2: Run tests and verify red**

Expected: missing CSS file or token assertions fail.

- [ ] **Step 3: Implement desktop tokens and layout**

Start `project-dashboard.css` with exact scoped tokens and layout:

```css
#project-workspace {
  --project-canvas: #e9e9e3;
  --project-paper: #fbfaf5;
  --project-nav: #1b1e1a;
  --project-ink: #23251f;
  --project-muted: #73766f;
  --project-line: #cecdc5;
  --project-primary: #536557;
  --project-amber: #b5823e;
  --project-error: #7a4344;
  display: grid;
  grid-template-columns: clamp(180px, 13vw, 208px) minmax(0, 1fr) clamp(360px, 29vw, 420px);
  height: calc(100vh - 66px);
  min-height: 640px;
  overflow: hidden;
  background: var(--project-canvas);
  color: var(--project-ink);
  letter-spacing: 0;
}

#project-workspace .project-center-column,
#project-workspace .project-active-detail { min-width: 0; overflow-y: auto; }
#project-workspace .project-rail { padding: 20px 14px; border-right: 1px solid var(--project-line); background: #dedfd9; }
#project-workspace .project-center-column { padding: 20px 24px 28px; }
#project-workspace .project-active-detail { padding: 20px; border-left: 1px solid var(--project-line); background: var(--project-paper); }
#project-workspace .project-mobile-filter,
#project-workspace #project-detail-open,
#project-workspace #project-detail-close { display: none; }
#project-workspace .project-spotlight { position: relative; aspect-ratio: 16 / 5; max-height: 230px; overflow: hidden; background: var(--project-nav); }
#project-workspace .project-spotlight::after { content: ""; position: absolute; inset: 0; background: rgba(20, 23, 19, .46); pointer-events: none; }
#project-workspace .project-cover,
#project-workspace .project-card-image { width: 100%; aspect-ratio: 16 / 9; align-self: center; overflow: hidden; background: #d5d5ce; }
#project-workspace :is(.project-cover, .project-card-image) img { width: 100%; height: 100%; object-fit: cover; }
#project-workspace :is(h1, h2, .project-title) { font-family: Georgia, "Songti SC", "SimSun", serif; font-weight: 600; letter-spacing: 0; }
#project-workspace .project-stage-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
#project-workspace .project-stage-item { min-height: 76px; padding: 12px; border-top: 2px solid var(--project-line); background: rgba(251, 250, 245, .68); }
#project-workspace .project-card-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
#project-workspace .project-card { display: grid; grid-template-columns: minmax(120px, 34%) minmax(0, 1fr); gap: 12px; min-height: 132px; padding: 10px; border: 1px solid var(--project-line); border-radius: 4px; background: var(--project-paper); }
#project-workspace .project-card[aria-selected="true"] { border-color: var(--project-amber); box-shadow: inset 3px 0 0 var(--project-amber); }
#project-workspace .project-workspace-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
#project-workspace :is(button, input, select, [role="option"]):focus-visible { outline: 2px solid var(--project-amber); outline-offset: 2px; }
```

Status treatments are restrained and semantic: active/continue uses `--project-primary`, current selection uses `--project-amber`, errors use `--project-error`, and all inactive controls stay neutral gray. Do not add gradients, decorative glows, frosted glass, or extra floating cards.

- [ ] **Step 4: Implement responsive behavior**

Use exact breakpoints:

```css
@media (max-width: 1279px) {
  #project-workspace { grid-template-columns: 152px minmax(0, 1fr) minmax(320px, 34vw); }
  #project-workspace .project-card-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 1023px) {
  #project-workspace { grid-template-columns: minmax(0, 1fr); }
  #project-workspace .project-rail { display: none; }
  #project-workspace .project-mobile-filter, #project-workspace #project-detail-open, #project-workspace #project-detail-close { display: inline-flex; }
  #project-workspace .project-active-detail { position: fixed; z-index: 30; inset: 66px 0 0 auto; width: min(390px, 100vw); transform: translateX(100%); box-shadow: -18px 0 42px rgba(27, 30, 26, .18); }
  #project-workspace[data-detail-open="true"] .project-active-detail { transform: translateX(0); }
}
@media (max-width: 819px) {
  #project-workspace .project-card-list { grid-template-columns: 1fr; }
  #project-workspace .project-stage-list { display: flex; overflow-x: auto; scroll-snap-type: x proximity; }
  #project-workspace .project-stage-item { flex: 0 0 132px; scroll-snap-align: start; }
  #project-workspace .project-spotlight { aspect-ratio: 16 / 7; }
}
@media (max-width: 390px) {
  #project-workspace .project-center-column { padding: 12px; }
  #project-workspace .project-active-detail { width: 100vw; }
}
@media (prefers-reduced-motion: reduce) {
  #project-workspace *, #project-workspace *::before, #project-workspace *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; }
}
```

- [ ] **Step 5: Run tests and verify green**

Expected: no `FAIL` lines and `git diff --check` exits 0.

- [ ] **Step 6: Commit Task 6**

```bash
git add project-dashboard.css index.html prompt-generator.test.js
git commit -m "feat: style cinematic project dashboard"
```

---

### Task 7: Browser Interaction, Regression, And Design QA

**Files:**
- Modify: `prompt-generator.test.js` only if browser testing exposes a missing regression contract.
- Create/replace: `design-qa.md`
- Create: `.audit-20260719-project-dashboard/` screenshots and comparison images; do not commit audit captures unless the user requests them.

**Interfaces:**
- Consumes the completed dashboard, local server, confirmed visual at `.superpowers/brainstorm/4765-1784444857/content/project-dashboard-fusion-final.html`.
- Produces a clean full regression run and `design-qa.md` with result `passed` only after P0/P1/P2 findings are fixed.

- [ ] **Step 1: Run static and full regression checks**

```bash
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --check project-store.js
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --check project-summary.js
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --check project-cover.js
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --check workspace-navigation.js
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --check project-dashboard.js
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node prompt-generator.test.js
git diff --check
```

Expected: syntax checks exit 0, every test prints `PASS`, no `FAIL`, and diff check exits 0.

- [ ] **Step 2: Verify desktop workflow at 1440 × 1024**

Open:

```text
http://127.0.0.1:8766/index.html?fresh=project-dashboard-fusion-v1
```

Verify with browser automation:

1. Root opens `projects`; URL with `?workspace=music` opens music.
2. Existing project data and active creative workspace survive reload.
3. Clicking a card selects it without opening a workbench.
4. Favorite updates card state and count once.
5. “继续创作” opens the saved creative workspace.
6. Returning to projects restores category, search, selection, and scroll.
7. Initial onboarding edits the starter in place and does not create a duplicate.
8. “新建影视项目” creates exactly one additional project and selects it.
9. All/recent/favorite/backup filters, search, and all three sort modes produce deterministic card order.
10. The existing project-center dialog still imports, exports, switches, and deletes projects without duplicating the dashboard dialog.
11. Console has zero errors and document has no horizontal overflow.

- [ ] **Step 3: Verify cover lifecycle and failure states**

Test a project with a restored casting asset, a missing asset, a static tone/poster cover, and a damaged workspace object. Confirm old Blob URLs are revoked after selection/filter changes, missing images show the local fallback, and one unreadable summary does not block other project content.

- [ ] **Step 4: Capture responsive screenshots**

Capture exactly these viewports:

```text
1440 × 1024
1280 × 900
1024 × 768
820 × 900
390 × 844
```

At 1024 confirm “项目详情”, close button, focus trap/return, and Escape produce a reachable detail drawer; at 820 and 390 confirm one-column cards, horizontally reachable stages, full-width drawer, readable type, and no clipped controls.

- [ ] **Step 5: Perform side-by-side design QA**

Place the confirmed fusion mockup and 1440 implementation screenshot in the same comparison image. Review typography, three-column proportions, 16:5 and 16:9 crops, palette, spacing, icon alignment, focus, empty/error states, tablet/mobile behavior, and shortcut artifacts.

Write `design-qa.md` with this terminal state only after fixes:

```markdown
# Project Dashboard Design QA

## Result

passed

## Baseline

- Selected design: `.superpowers/brainstorm/4765-1784444857/content/project-dashboard-fusion-final.html`
- Implementation: `.audit-20260719-project-dashboard/implementation-1440x1024.png`
- Comparison: `.audit-20260719-project-dashboard/design-vs-implementation.png`

## Findings

No P0, P1, or P2 visual, responsive, accessibility, or interaction findings remain.
```

- [ ] **Step 6: Re-run regression after visual fixes**

Run all commands from Step 1 again. Expected: all green.

- [ ] **Step 7: Commit Task 7**

```bash
git add design-qa.md prompt-generator.test.js
git commit -m "test: verify project dashboard experience"
```

---

## Completion Gate

The project dashboard is complete only when:

1. Tasks 1–7 each have a green test cycle and focused commit.
2. Root and six deep links behave exactly as specified.
3. Project view never appears inside `project.workspaces` and never overwrites `activeWorkspace`.
4. Old project imports, role assets, deletes, copies, transfers, and all six workspaces pass regression.
5. `design-qa.md` says `passed` with no unresolved P0/P1/P2 finding.
6. The local server remains running and the user receives a fresh project-dashboard URL for visual confirmation.
