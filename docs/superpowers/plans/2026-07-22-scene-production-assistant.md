# 场次制作助手 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 让每个剧本场次从原文出发，生成可编辑的制作候选、影视参考选择和结构明确的整场提示词。

**Architecture:** 在现有 project-scenes.js 中新增本地剧本候选提取和四步场次编辑器状态；project-store.js 仅扩展安全的场次字段；scene-assistant-data.js 提供不依赖网络的影视参考库。右侧提示词继续由项目、场次和镜头数据组合，不引入外部 AI。

**Tech Stack:** 原生 JavaScript、HTML、CSS、Node 内建测试、浏览器本地项目库。

## Global Constraints

- 所有剧本文本、候选和选择只保存在当前浏览器项目。
- 本地规则只标记候选，绝不覆盖用户已经填写的字段。
- 台词与旁白不生成字幕；只有用户开启口型要求时才进入提示词。
- 色彩、光影、摄影、景别构图、表演、运镜各自只能保留一个选项。
- 保持现有场次、镜头卡、复制提示词和发送 15 秒运镜功能。
- 不接入外部 AI，不发起网络请求。
- 使用 apply_patch 编辑文件；不回退无关的既有变更。

---

### Task 1: 场次候选提取与数据持久化

**Files:**
- Create: scene-assistant-data.js
- Modify: project-store.js
- Modify: prompt-generator.test.js

**Interfaces:**
- Produces: extractSceneCandidates(scene), normalizeSceneAssistant(value), and SCENE_REFERENCE_LIBRARY.
- Candidate shape: { dialogueLines, voiceOverLines, characterCandidates, emotionCandidates, actionCandidates, propCandidates }.
- Scene assistant state: { dialogueLines, voiceOverLines, lipSyncEnabled, selectedReferences }.

- [ ] **Step 1: Write failing tests**

~~~js
run("scene assistant extracts dialogue narration and local production candidates", () => {
  const result = extractSceneCandidates({
    storyBeat: "林岚：别回头。\n旁白：雨没有停。\n林岚握紧泛黄信封，听见身后脚步。",
    title: "雨夜码头",
    setting: "外景 港口码头 冬夜"
  });
  assert.deepStrictEqual(result.dialogueLines, [{ speaker: "林岚", text: "别回头。" }]);
  assert.deepStrictEqual(result.voiceOverLines, ["雨没有停。"]);
  assert(result.characterCandidates.includes("林岚"));
  assert(result.actionCandidates.some((item) => item.includes("握紧")));
  assert(result.propCandidates.includes("信封"));
});

run("scene assistant normalizes one reference per production dimension", () => {
  const state = normalizeSceneAssistant({ selectedReferences: { color: "cold-warm", lighting: "window-soft", camera: "imax-65", framing: "close-up", performance: "held-breath", movement: "slow-push" } });
  assert.equal(Object.keys(state.selectedReferences).length, 6);
  assert.equal(state.lipSyncEnabled, false);
});
~~~

- [ ] **Step 2: Run test and verify RED**

~~~bash
NODE=/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
"$NODE" --test prompt-generator.test.js
~~~

Expected: candidate functions and data library are missing.

- [ ] **Step 3: Implement local candidate extraction**

Create scene-assistant-data.js with six reference dimensions: color, lighting, camera, framing, performance, movement. Each item has id, label, and prompt text. Implement deterministic dialogue matching for “人物名：台词” and narration matching for “旁白：” or “画外音：”. Extract candidate names, action verbs, and visible props from a bounded keyword list. Do not write candidates into scene fields automatically.

In project-store.js, add normalizeSceneAssistant and include assistant state in normalizeProjectScenes. Export extractSceneCandidates only from scene-assistant-data.js.

- [ ] **Step 4: Run suite and commit**

~~~bash
NODE=/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
"$NODE" --test prompt-generator.test.js
git add scene-assistant-data.js project-store.js prompt-generator.test.js
git commit -m "feat: add scene assistant candidates"
~~~

Expected: full suite passes.

### Task 2: 四步场次编辑器与参考选择

**Files:**
- Modify: index.html
- Modify: project-scenes.js
- Modify: project-scenes.css
- Modify: prompt-generator.test.js

**Interfaces:**
- Consumes: window.aigcSceneAssistantData.extractSceneCandidates(scene), SCENE_REFERENCE_LIBRARY.
- Produces: tab controls with data-scene-step values story, assets, look, shots; reference controls with data-scene-reference-dimension and data-scene-reference-id.

- [ ] **Step 1: Write failing UI tests**

~~~js
run("scene editor exposes story assets look and shots with reference controls", () => {
  const source = fs.readFileSync("project-scenes.js", "utf8");
  ["故事", "资产", "画面", "镜头", "data-scene-step", "data-scene-reference-dimension", "lipSyncEnabled"].forEach((token) => assert(source.includes(token)));
  assert(fs.readFileSync("project-scenes.css", "utf8").includes("project-scene-reference"));
});
~~~

- [ ] **Step 2: Run test and verify RED**

~~~bash
NODE=/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
"$NODE" --test prompt-generator.test.js
~~~

Expected: four-step tabs and reference controls are absent.

- [ ] **Step 3: Implement progressive editor**

Replace the monolithic scene field layout with accessible tabs:
- 故事: original scene text, dialogue/narration candidates, characters, emotion, action, props, and lip-sync toggle.
- 资产: derived role/location/prop rows labelled 待建立; no shared asset database in this task.
- 画面: reference buttons for color, lighting, camera; clicking replaces only the same dimension and writes the reference prompt into scene visual override.
- 镜头: reference buttons for framing, performance, movement plus existing editable shot cards.

Default to story. Keep manual inputs available in every relevant panel. Keyboard left/right moves tab focus. Inactive panels are hidden but not destroyed. All user changes call existing scene persistence and refresh the prompt.

- [ ] **Step 4: Run suite and commit**

~~~bash
NODE=/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
"$NODE" --test prompt-generator.test.js
git add index.html project-scenes.js project-scenes.css prompt-generator.test.js
git commit -m "feat: add scene production assistant"
~~~

Expected: full suite passes.

### Task 3: 整场提示词与浏览器验收

**Files:**
- Modify: project-store.js
- Modify: project-scenes.js
- Modify: prompt-generator.test.js
- Output: output/playwright/scene-production-assistant.png

**Interfaces:**
- Consumes: scene.assistant, scene.visualOverride, shot fields.
- Produces: buildSceneShotPrompt output ordered as character consistency, setting, dialogue/lip-sync, performance/action, look, framing/movement, sound, negatives.

- [ ] **Step 1: Write failing prompt test**

~~~js
run("scene production prompt keeps dialogue out of subtitles unless lip sync is enabled", () => {
  const prompt = buildSceneShotPrompt(project, {
    number: 1, title: "雨夜码头", setting: "港口", assistant: {
      dialogueLines: [{ speaker: "林岚", text: "别回头。" }],
      voiceOverLines: ["雨没有停。"],
      lipSyncEnabled: false,
      selectedReferences: { color: "cold-warm", lighting: "window-soft", camera: "imax-65", framing: "close-up", performance: "held-breath", movement: "slow-push" }
    }, shots: []
  }, shot);
  assert(prompt.includes("不要字幕"));
  assert(prompt.includes("台词仅作表演参考"));
  assert(!prompt.includes("口型同步"));
});
~~~

- [ ] **Step 2: Run test and verify RED**

~~~bash
NODE=/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
"$NODE" --test prompt-generator.test.js
~~~

Expected: prompt does not include assistant structure.

- [ ] **Step 3: Implement structured prompt composition**

Update buildSceneShotPrompt with eight labelled sections in fixed order. Add dialogue only as performance reference by default. When lipSyncEnabled is true, include speaker, exact spoken text, and “需要自然中文口型同步；不要字幕”. Always preserve existing sound and negative constraints.

- [ ] **Step 4: Run browser QA and commit**

~~~bash
NODE=/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
"$NODE" --test prompt-generator.test.js
git diff --check
~~~

Use local Playwright at 1440 and 1024 widths: open a scene containing dialogue and narration, verify four tabs, select one color/light/camera/framing/performance/movement reference, enable then disable lip-sync, and confirm prompt changes without console errors. Save output/playwright/scene-production-assistant.png.

~~~text
http://127.0.0.1:8767/index.html?workspace=project&fresh=scene-production-assistant-v1
~~~

