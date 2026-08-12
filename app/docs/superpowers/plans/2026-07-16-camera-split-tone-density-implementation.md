# 15秒运镜深浅分区高密度布局 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按选定方案 C 重排 15 秒运镜工作台，使左右信息区更宽、中部更紧凑、监视画面铺满，并让所有镜头默认显示可读的空间调度地图。

**Architecture:** 保留现有三栏 DOM 与提示词数据流，仅在 `camera-app.js` 中放宽调度地图适用范围并设置选择后的默认展开状态；所有视觉变化集中在 `camera-option-a.css`。通过 `index.html` 资源版本号确保浏览器加载新样式和脚本，使用现有 Node 测试与真实浏览器尺寸验收。

**Tech Stack:** 原生 HTML、CSS Grid、原生 JavaScript、现有 Node 断言测试、Codex in-app Browser。

## Global Constraints

- 选定视觉基准为方案 C“深浅分区电影台”。
- 监视器图片必须 `object-fit: cover`，不拉伸、不留黑边。
- 所有大师案例和类型模板选择后都有调度地图并默认展开。
- 1380px 以上三栏为 350px / `minmax(500px, 1fr)` / 520px。
- 1181–1379px 三栏为 320px / `minmax(440px, 1fr)` / 460px；1180px 以下纵向堆叠。
- 保留现有字段 ID、数据、项目状态、提示词生成和复制功能。

---

### Task 1: 全镜头调度地图

**Files:**
- Modify: `camera-app.js`
- Test: `prompt-generator.test.js`

**Interfaces:**
- Consumes: `buildCameraTimelineModel(item)` and `buildBlockingMapModel(model)`
- Produces: every selected case or genre template exposes `#camera-blocking-toggle`
- Produces: a new selection sets `state.blockingOpen = true`

- [ ] **Step 1: Write failing behavior-contract tests**

Add assertions that the selection callback sets `state.blockingOpen = true`, that `renderCameraStage()` uses `Boolean(item)` for map support, and that the old `requiresBlockingMap(item)` gate is absent from the controller path.

- [ ] **Step 2: Verify RED**

Run `PATH="$HOME/.local/bin:$PATH" node prompt-generator.test.js` and confirm the new test fails because only complex cases currently expose maps.

- [ ] **Step 3: Implement the minimum controller change**

In the card selection callback set `state.blockingOpen = true`. In `renderCameraStage()` replace the complexity gate with `const supportsMap = Boolean(item)`. Keep import behavior unchanged so saved projects restore their explicit open/closed state.

- [ ] **Step 4: Verify GREEN**

Run the complete Node suite and `node --check camera-app.js`.

---

### Task 2: 方案 C 三栏、铺满监视器和深浅信息层级

**Files:**
- Modify: `camera-option-a.css`
- Modify: `index.html`
- Test: `prompt-generator.test.js`

**Interfaces:**
- Consumes: existing camera shell, stage, monitor, timeline and map selectors
- Produces: selected C visual tokens and responsive column contracts

- [ ] **Step 1: Write failing CSS-contract tests**

Assert the exact desktop and mid-width columns, 1180px stack breakpoint, `object-fit: cover`, light stage background, charcoal timeline background, light map background, timeline font sizes, two-line beat wrapping, map typography, and updated cache-busting versions.

- [ ] **Step 2: Verify RED**

Run the suite and confirm failures against the current 320/656/440 layout, `contain` image and near-black middle panels.

- [ ] **Step 3: Implement three-column proportions and responsive thresholds**

Set desktop columns to 350 / flexible / 520. Replace the 1025–1280 media query with 1181–1379 using 320 / flexible / 460. Move the stacked layout breakpoint from 1024 to 1180 while preserving stage/library/composer order.

- [ ] **Step 4: Implement selected C visual language**

Set the monitor image to `cover`; use a light stage fallback background, charcoal-green timeline, light gray-green map and white path cards. Increase timeline and map typography to the specification, allow beat labels to wrap to two lines, and remove forced single-line truncation from library summaries where width permits.

- [ ] **Step 5: Update asset versions and verify GREEN**

Update `camera-option-a.css` and `camera-app.js` query versions in `index.html` to `20260716-camera-split-tone-v1`. Run the full suite, both script syntax checks and `git diff --check`.

---

### Task 3: Visual, responsive and functional QA

**Files:**
- Create: `.superpowers/sdd/camera-split-tone-density-qa.md`

**Interfaces:**
- Consumes: `http://127.0.0.1:8766/index.html?workspace=camera`
- Produces: measured visual and behavioral evidence

- [ ] **Step 1: Verify 1440×1024 selected-design match**

Load a case and a genre template. Confirm measured columns are approximately 350 / 546 / 520, the monitor is filled with no letterboxing, the timeline is charcoal rather than black, the map is light, and all text remains readable.

- [ ] **Step 2: Verify all-map behavior**

Select one previously simple case such as C05 and one genre template. Confirm each selection immediately shows an expanded three-point map, and the map can still be manually collapsed and reopened.

- [ ] **Step 3: Verify responsive layouts**

Check 1280×800, 1180×900, 1024×900, 600×900 and 390×844. Confirm no horizontal overflow and that 1180px and below use the intended vertical order.

- [ ] **Step 4: Verify regressions and record QA**

Confirm case selection, aspect switching, project persistence, prompt fields and copy readiness still work; check console warnings/errors. Write measured results to the QA file, run the complete test suite and confirm the local server returns HTTP 200.
