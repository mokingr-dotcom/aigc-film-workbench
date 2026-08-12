# 15秒运镜双画幅与空间调度布局 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 15 秒运镜工作台增加可持久化的 21:9 / 16:9 监视器切换，并消除时间轴空白、扩大空间调度路径和左右信息栏。

**Architecture:** 在现有相机工作台 DOM 中增加一个独立画幅分段控件，由 `camera-app.js` 维护 `aspect` 状态并通过 `data-camera-aspect` 驱动 CSS。状态继续通过 `aigcCameraWorkbench.exportState()` / `importState()` 进入现有项目持久化，不新增存储系统。布局仅由 `camera-option-a.css` 调整，运镜数据和提示词合成逻辑保持不变。

**Tech Stack:** 原生 HTML、CSS Grid、原生 JavaScript、现有 Node 断言测试、Codex in-app Browser。

## Global Constraints

- 默认画幅必须是 `21:9`，可互斥切换到 `16:9`。
- 图片必须保持 `object-fit: contain`，不得拉伸或裁切。
- 桌面左右栏为 320px 和 440px；1025–1280px 为 290px 和 400px。
- 空间调度路径桌面最小高度 210px，展开后紧接时间轴。
- 保留现有 IDs、案例数据、提示词生成和复制行为。
- 1024px 以下继续纵向堆叠且不得横向溢出。

---

### Task 1: 双画幅状态与控件

**Files:**
- Modify: `index.html:833-865`
- Modify: `camera-app.js:5-47, 330-470`
- Test: `prompt-generator.test.js`

**Interfaces:**
- Produces: `state.aspect: "cinema" | "wide"`
- Produces: buttons `[data-camera-aspect="cinema"]` and `[data-camera-aspect="wide"]`
- Produces: `#camera-stage[data-camera-aspect]`
- Produces: exported project state property `aspect`

- [ ] **Step 1: Write the failing DOM and state contract tests**

Add tests asserting that `index.html` contains both aspect buttons, `camera-app.js` defaults to `cinema`, applies `data-camera-aspect`, updates `aria-pressed`, listens for aspect button clicks, and exports/imports `aspect`.

- [ ] **Step 2: Run the suite and verify RED**

Run: `PATH="$HOME/.local/bin:$PATH" node prompt-generator.test.js`

Expected: the new aspect-control test fails because the control and state do not exist.

- [ ] **Step 3: Add the compact aspect control**

Insert this control inside `.camera-stage-actions`, before the existing map and save buttons:

```html
<div id="camera-aspect-switch" class="camera-aspect-switch" aria-label="监视器画幅">
  <button type="button" class="active" data-camera-aspect="cinema" aria-pressed="true">21:9</button>
  <button type="button" data-camera-aspect="wide" aria-pressed="false">16:9</button>
</div>
```

- [ ] **Step 4: Implement aspect rendering and persistence**

Add `aspect: "cinema"` to state, cache the two buttons, and implement `renderAspect()` so the stage dataset and both button states always match. Normalize imported values with `saved.aspect === "wide" ? "wide" : "cinema"`; export `aspect: state.aspect`. Clicking a button changes only `state.aspect` and calls `renderAspect()`; the click bubbles to the existing `workspace-core.js` document click listener, which schedules project persistence and captures the new value through `exportState()`.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `PATH="$HOME/.local/bin:$PATH" node prompt-generator.test.js`

Expected: all tests pass.

---

### Task 2: Monitor, timeline, and blocking-map layout

**Files:**
- Modify: `camera-option-a.css:1-920`
- Test: `prompt-generator.test.js`

**Interfaces:**
- Consumes: `#camera-stage[data-camera-aspect="cinema"|"wide"]`
- Consumes: `.camera-aspect-switch`
- Produces: deterministic desktop grid and monitor ratios

- [ ] **Step 1: Write failing CSS contract tests**

Add tests asserting:

```text
desktop columns = 320px minmax(460px, 1fr) 440px
mid-width columns = 290px minmax(0, 1fr) 400px
stage rows = auto auto auto auto
cinema aspect-ratio = 21 / 9 and max-height = 300px
wide aspect-ratio = 16 / 9 and max-height = 360px
timeline overflow is visible and does not use a flexible 1fr track
blocking map min-height = 210px
blocking map max-height = none
```

- [ ] **Step 2: Run the suite and verify RED**

Run: `PATH="$HOME/.local/bin:$PATH" node prompt-generator.test.js`

Expected: the new layout test fails against the current 300/420 columns, fixed monitor row, and 190px map cap.

- [ ] **Step 3: Implement the desktop layout**

Change the shell columns, make `.camera-stage` rows content-sized, style the aspect switch, and drive monitor sizing through the stage dataset:

```css
#camera-workspace .camera-stage {
  grid-template-rows: auto auto auto auto;
  align-content: start;
}

#camera-workspace .camera-stage[data-camera-aspect="cinema"] .camera-monitor {
  width: min(100%, 700px);
  max-height: 300px;
  aspect-ratio: 21 / 9;
}

#camera-workspace .camera-stage[data-camera-aspect="wide"] .camera-monitor {
  width: min(100%, 640px);
  max-height: 360px;
  aspect-ratio: 16 / 9;
}
```

Keep the monitor centered. Remove the flexible timeline track and the `max-height: 190px` map cap. Give `.camera-blocking-map` `min-height: 210px`, visible overflow, larger card typography, and enough card height to show three complete descriptions.

- [ ] **Step 4: Preserve responsive behavior**

At 1025–1280px set 290px / flexible / 400px columns and keep both monitor ratios width-driven. At 1024px and below retain stage/library/composer order; at 560px and below allow the map cards to become one column and remove desktop minimum height where necessary so content expands naturally.

- [ ] **Step 5: Run tests and syntax checks**

Run:

```bash
PATH="$HOME/.local/bin:$PATH" node prompt-generator.test.js
PATH="$HOME/.local/bin:$PATH" node --check camera-app.js
PATH="$HOME/.local/bin:$PATH" node --check camera-timeline.js
git diff --check -- index.html camera-app.js camera-option-a.css prompt-generator.test.js
```

Expected: all checks pass.

---

### Task 3: Browser design QA and regression

**Files:**
- Create: `.superpowers/sdd/camera-aspect-blocking-qa.md`

**Interfaces:**
- Consumes: final local page at `http://127.0.0.1:8766/index.html?workspace=camera`
- Produces: measured QA evidence for both ratios and blocking-map layout

- [ ] **Step 1: Verify desktop visual states**

At 1440×1024 load C07, expand “调度地图”, and capture both aspect states. Measure left, center, right, monitor, timeline, and map rectangles. Assert 21:9 ratio is approximately 2.333 and 16:9 is approximately 1.778; map height is at least 210px and follows the timeline without an oversized blank gap.

- [ ] **Step 2: Verify responsive states**

Check 1280×800, 1024×900, 600×900, and 390×844. Confirm no horizontal overflow, correct stack order below 1024px, complete controls, and natural single-column path cards on narrow screens.

- [ ] **Step 3: Verify persistence and feature behavior**

Switch to 16:9, export camera state, re-import it, and confirm 16:9 remains selected. Verify C07 selection, map toggle, prompt generation, and copy readiness remain operational. Confirm browser console has no errors or warnings.

- [ ] **Step 4: Record QA and run final suite**

Write measured results to `.superpowers/sdd/camera-aspect-blocking-qa.md`, then run:

```bash
PATH="$HOME/.local/bin:$PATH" node prompt-generator.test.js
PATH="$HOME/.local/bin:$PATH" node --check camera-app.js
PATH="$HOME/.local/bin:$PATH" node --check camera-timeline.js
curl -I http://127.0.0.1:8766/index.html
```

Expected: all tests pass, scripts parse, server returns HTTP 200, and the refreshed local URL is ready for delivery.
