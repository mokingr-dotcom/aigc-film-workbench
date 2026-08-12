# 单场视频提示词卡 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 将项目场次页收缩为一张清晰的单场视频提示词卡，并用同一场次母版输出通用、Seedance、即梦/可灵和 Runway/Pika 提示词。

**Architecture:** 新建 scene-video-adapters.js 只负责把模型无关的场次母版转换为目标模型文本。project-scenes.js 只负责采集六项制作信息和切换当前输出模型；现有影调/运镜库保持不变，以辅助插入内容的方式出现。

**Tech Stack:** 原生 JavaScript、HTML、CSS、Node 内建测试、浏览器本地项目库。

## Global Constraints

- 默认显示通用视频模型输出；模型切换不得改动场次母版。
- 仅保留六项：叙事、人物、场景、影调、镜头、声音与限制。
- Seedance 默认以 15 秒节拍输出；其他模型不强制带时间轴。
- 台词默认仅作表演参考，始终不要字幕；仅在开启口型后加入自然中文口型同步。
- 不调用外部 AI 或网络；保留现有发送 15 秒运镜功能。
- 使用 apply_patch 编辑，保留无关工作区改动。

### Task 1: 场次母版与多模型输出适配器

**Files:**
- Create: scene-video-adapters.js
- Modify: project-store.js
- Modify: prompt-generator.test.js

**Interfaces:**
- Produces: normalizeSceneVideoCard(value), buildSceneVideoPrompt(card, target).
- Targets: general, seedance, jimeng-kling, runway-pika.

- [ ] **Step 1: Write failing tests**

~~~js
run("scene video adapters keep one scene card and produce four model outputs", () => {
  const card = normalizeSceneVideoCard({ narrative: "她听见脚步声后回头", characters: "林岚", emotion: "警觉升级", action: "握紧信封并缓慢转身", setting: "旧旅馆走廊，凌晨", color: "低饱和青灰", lighting: "侧逆光", framing: "中近景", movement: "缓慢推进", dialogue: "别回头。", lipSync: false });
  assert(buildSceneVideoPrompt(card, "general").includes("不要字幕"));
  assert(buildSceneVideoPrompt(card, "seedance").includes("0-5秒"));
  assert(buildSceneVideoPrompt(card, "jimeng-kling").includes("身份稳定"));
  assert(buildSceneVideoPrompt(card, "runway-pika").includes("镜头运动"));
});
~~~

- [ ] **Step 2: Verify RED**

~~~bash
NODE=/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
"$NODE" --test prompt-generator.test.js
~~~

Expected: scene-video-adapters.js does not exist.

- [ ] **Step 3: Implement the adapter**

Create scene-video-adapters.js with bounded text normalization and four prompt builders. General uses eight labelled sections; Seedance adds start/0-5/5-10/10-15 beats; 即梦/可灵 prioritizes identity, spatial continuity and action stability; Runway/Pika prioritizes subject, environment, movement and style. All outputs include no subtitle/no watermark negative constraints. Store the card under scene.videoCard without deleting existing scene fields.

- [ ] **Step 4: Verify GREEN**

~~~bash
NODE=/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
"$NODE" --test prompt-generator.test.js
~~~

### Task 2: 单场提示词卡页面

**Files:**
- Modify: index.html
- Modify: project-scenes.js
- Modify: project-scenes.css
- Modify: prompt-generator.test.js

**Interfaces:**
- Produces controls: data-video-card-field, data-video-target, data-video-preset.
- The six editing groups map to narrative, people, setting, look, camera, sound.

- [ ] **Step 1: Write failing UI test**

~~~js
run("scene page exposes one video prompt card with six groups and model targets", () => {
  const source = fs.readFileSync("project-scenes.js", "utf8");
  ["叙事", "人物", "场景", "影调", "镜头", "声音与限制", "data-video-target", "seedance", "jimeng-kling", "runway-pika"].forEach((token) => assert(source.includes(token)));
});
~~~

- [ ] **Step 2: Verify RED**

~~~bash
NODE=/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
"$NODE" --test prompt-generator.test.js
~~~

- [ ] **Step 3: Implement the page**

Replace the large scene editor with a three-column prompt-card layout:
- Script rail: source excerpt, dialogue, narration and scene list.
- Production card: six collapsible groups with compact text fields and one-click presets.
- Output rail: tabs for 通用、Seedance 15 秒、即梦/可灵、Runway/Pika, generated prompt and copy action.

Use general as default. Preserve scene-level manual fields by mapping them into videoCard on first render. Add two small actions “从影调库填入” and “从运镜库填入” that only open the respective existing workspace with the current scene context; they are not required to complete the prompt.

- [ ] **Step 4: Verify GREEN**

~~~bash
NODE=/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
"$NODE" --test prompt-generator.test.js
git diff --check
~~~

### Task 3: Browser acceptance

**Files:**
- Output: output/playwright/scene-video-prompt-card.png

- [ ] **Step 1: Verify with Playwright**

At 1440 and 1024 widths: load a two-scene project, select scene 02, edit narrative and dialogue, switch all four targets, toggle lip sync, and confirm each generated prompt changes while source values stay the same. Confirm console has zero errors.

- [ ] **Step 2: Start local server and report**

~~~text
http://127.0.0.1:8767/index.html?workspace=project&fresh=scene-video-prompt-card-v1
~~~

