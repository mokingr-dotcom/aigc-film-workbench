# 15 秒运镜均衡制作台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 缩小 15 秒运镜监视器，扩大左右资料区域并提高文字可读性，同时保持现有业务功能和响应式工作流。

**Architecture:** 以 `camera-option-a.css` 作为运镜工作台唯一局部视觉覆盖层，通过 `#camera-workspace` 作用域重设三栏轨道、舞台行高与字号。使用现有 `prompt-generator.test.js` 增加 CSS 合同测试，并用本地 Playwright 在 1440、1280、1024、600 和 390 宽度验证真实布局。

**Tech Stack:** 原生 HTML/CSS/JavaScript、Node.js 回归脚本、Playwright CLI、本地静态服务器。

## Global Constraints

- 只修改运镜工作台相关 CSS 和必要的布局回归测试。
- 保留现有 HTML IDs、`camera-*` 数据结构、版本保存、案例筛选、提示词复制与工作台传递。
- 不引入新的依赖、网络资源或折叠交互。
- 不修改影调、角色定妆、海报和画面反推页面。
- 不覆盖或回退工作区中已有的用户改动。

---

### Task 1: Desktop Three-Column Balance and Typography

**Files:**
- Modify: `camera-option-a.css`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: existing `#camera-workspace.camera-shell`, `.camera-library`, `.camera-stage`, `.camera-monitor`, `.camera-composer` DOM contracts.
- Produces: stable desktop column contract and readable typography contract used by responsive QA.

- [ ] **Step 1: Write the failing desktop layout test**

Add to `prompt-generator.test.js`:

```js
runTest("camera balanced workbench gives both information rails readable desktop space", () => {
  const css = fs.readFileSync("camera-option-a.css", "utf8");
  const shellRule = css.match(/#camera-workspace\.camera-shell\s*\{([\s\S]*?)\}/)?.[1] || "";
  const monitorRule = css.match(/#camera-workspace \.camera-monitor\s*\{([\s\S]*?)\}/)?.[1] || "";
  const cardTitleRule = css.match(/#camera-workspace \.camera-card h2\s*\{([\s\S]*?)\}/)?.[1] || "";
  const cardCopyRule = css.match(/#camera-workspace \.camera-card p\s*\{([\s\S]*?)\}/)?.[1] || "";
  const fieldLabelRule = css.match(/#camera-workspace \.camera-composer \.field > span\s*\{([\s\S]*?)\}/)?.[1] || "";
  const fieldRule = css.match(/#camera-workspace \.camera-composer input,\s*#camera-workspace \.camera-composer textarea\s*\{([\s\S]*?)\}/)?.[1] || "";
  const outputRule = css.match(/#camera-workspace #camera-output\s*\{([\s\S]*?)\}/)?.[1] || "";

  assert(shellRule.includes("grid-template-columns: 300px minmax(500px, 1fr) 420px"));
  assert(monitorRule.includes("max-height: 380px"));
  assert(cardTitleRule.includes("font-size: 12px"));
  assert(cardCopyRule.includes("font-size: 10px"));
  assert(fieldLabelRule.includes("font-size: 11px"));
  assert(fieldRule.includes("font-size: 12px"));
  assert(outputRule.includes("font-size: 12px"));
});
```

- [ ] **Step 2: Run the suite and verify RED**

Run:

```bash
PATH="$HOME/.local/bin:$PATH" node prompt-generator.test.js
```

Expected: the new camera balanced workbench test fails because the current columns are `270px / flexible / 360px`, the monitor has no desktop cap, and side typography remains 9–11px.

- [ ] **Step 3: Implement the desktop balance**

Update the scoped rules in `camera-option-a.css`:

```css
#camera-workspace.camera-shell {
  grid-template-columns: 300px minmax(500px, 1fr) 420px;
}

#camera-workspace .camera-stage {
  grid-template-rows: 56px minmax(300px, 380px) minmax(250px, 1fr) auto;
}

#camera-workspace .camera-monitor {
  width: 100%;
  max-height: 380px;
  aspect-ratio: 16 / 9;
}

#camera-workspace .camera-monitor img {
  object-fit: contain;
}

#camera-workspace .camera-card h2 { font-size: 12px; }
#camera-workspace .camera-card p { font-size: 10px; }
#camera-workspace .camera-composer .field > span { font-size: 11px; }
#camera-workspace .camera-composer input,
#camera-workspace .camera-composer textarea { font-size: 12px; }
#camera-workspace #camera-output { font-size: 12px; line-height: 1.6; }
```

Keep monitor captions, images, timeline data, form IDs, and button behavior unchanged.

- [ ] **Step 4: Add the 1025–1280 desktop contract**

Replace the existing tablet-desktop columns with:

```css
@media (max-width: 1280px) and (min-width: 1025px) {
  #camera-workspace.camera-shell {
    grid-template-columns: 280px minmax(0, 1fr) 390px;
  }
}
```

Do not reduce the scoped typography inside this breakpoint.

- [ ] **Step 5: Run tests and syntax checks**

Run:

```bash
PATH="$HOME/.local/bin:$PATH" node prompt-generator.test.js
PATH="$HOME/.local/bin:$PATH" node --check camera-app.js
PATH="$HOME/.local/bin:$PATH" node --check camera-timeline.js
git diff --check -- camera-option-a.css prompt-generator.test.js
```

Expected: all commands exit 0 and the full regression suite has zero `FAIL` lines.

- [ ] **Step 6: Review Task 1**

Inspect the task-specific diff for only `camera-option-a.css` and `prompt-generator.test.js`. Reject any change that touches camera data, HTML IDs, non-camera workspaces, or introduces horizontal page overflow.

---

### Task 2: Responsive Monitor Geometry and Browser QA

**Files:**
- Modify: `camera-option-a.css`
- Modify: `prompt-generator.test.js`
- Create: `.superpowers/sdd/camera-balanced-workbench-qa.md`

**Interfaces:**
- Consumes: desktop typography and column contracts from Task 1.
- Produces: stable stacked monitor geometry for 1024px and below plus visual QA evidence.

- [ ] **Step 1: Write the failing responsive CSS test**

Add to `prompt-generator.test.js`:

```js
runTest("camera stacked workbench keeps a bounded 16:9 monitor", () => {
  const css = fs.readFileSync("camera-option-a.css", "utf8");
  const tabletBlock = extractBalancedCssBlock(css, "@media (max-width: 1024px)");
  const shellRule = cssRuleBody(tabletBlock, "#camera-workspace.camera-shell");
  const stageRule = cssRuleBody(tabletBlock, "#camera-workspace .camera-stage");
  const monitorRule = cssRuleBody(tabletBlock, "#camera-workspace .camera-monitor");

  assert(shellRule.includes('grid-template-areas: "stage" "library" "composer"'));
  assert(stageRule.includes("grid-template-rows: auto auto auto auto"));
  assert(stageRule.includes("min-height: 0"));
  assert(monitorRule.includes("aspect-ratio: 16 / 9"));
  assert(monitorRule.includes("max-height: 420px"));
});
```

- [ ] **Step 2: Run the suite and verify RED**

Run:

```bash
PATH="$HOME/.local/bin:$PATH" node prompt-generator.test.js
```

Expected: the responsive test fails because the stacked stage still has `min-height: 720px` and an unbounded flexible monitor row.

- [ ] **Step 3: Implement bounded stacked geometry**

Within `@media (max-width: 1024px)` add:

```css
#camera-workspace .camera-stage {
  grid-template-rows: auto auto auto auto;
  min-height: 0;
}

#camera-workspace .camera-monitor {
  width: 100%;
  max-height: 420px;
  aspect-ratio: 16 / 9;
}
```

Within `@media (max-width: 560px)` retain the same four-row structure and set the monitor to `max-height: none`; its width-driven 16:9 ratio determines height.

- [ ] **Step 4: Run full regression**

Run:

```bash
PATH="$HOME/.local/bin:$PATH" node prompt-generator.test.js
PATH="$HOME/.local/bin:$PATH" node --check camera-app.js
PATH="$HOME/.local/bin:$PATH" node --check camera-timeline.js
git diff --check
```

Expected: all commands exit 0 with zero test failures.

- [ ] **Step 5: Perform real-browser layout QA**

Open:

```text
http://127.0.0.1:8766/index.html?workspace=camera&fresh=camera-balanced-workbench-v1
```

At 1440x1024 and 1280x800 verify:

```text
left rail >= 280px
right rail >= 390px
monitor height <= 380px
monitor image not cropped
left title 12px and copy 10px
right label 11px and inputs/output 12px
no horizontal overflow
```

At 1024x900, 600x900, and 390x844 verify:

```text
stage, library, composer stack in that order
monitor ratio is approximately 1.78
monitor does not cover timeline
all fields and buttons remain reachable
```

Exercise one master-camera card, one type-template switch, one prompt copy-ready flow, and confirm browser console has zero errors and warnings.

- [ ] **Step 6: Record QA evidence**

Write `.superpowers/sdd/camera-balanced-workbench-qa.md` with measured column widths, monitor height/ratio, typography values, screenshot paths, console result, regression count, and the final local URL.

- [ ] **Step 7: Final review**

Review the combined feature diff and QA report. Fix all Critical and Important findings, rerun regression and browser QA, and only then provide the user with the cache-busted local URL.
