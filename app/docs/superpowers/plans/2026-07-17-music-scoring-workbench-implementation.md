# Music Scoring Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sixth “音乐配乐” workspace that converts project purpose, narrative emotion, music structure, instrumentation, timeline, picture relationship, and restrictions into a reusable Chinese instrumental-scoring prompt.

**Architecture:** Keep music content and pure prompt logic in a UMD-style `music-data.js`, with CommonJS exports for Node tests and `window.aigcMusicData` for the browser. Keep DOM state, rendering, template replacement, copying, and project import/export in `music-app.js`; isolate the three-column visual system in `music-workspace.css`. Register `window.aigcMusicWorkbench` with the existing `workspace-core.js` project API without changing the project storage schema or implementing the future project-center redesign.

**Tech Stack:** Static HTML5, CSS Grid, vanilla JavaScript, existing Lucide icon bundle, browser `localStorage`, Node.js `assert`/`vm` test harness in `prompt-generator.test.js`, local HTTP server on port 8766, Playwright CLI for browser QA.

## Global Constraints

- The workspace name is exactly `音乐配乐`; do not call it `音乐生成`.
- Phase one generates prompts only: no audio generation API, audio player, waveform editor, file upload, lyrics, singing, humming, narration, voice cloning, or song-writing workflow.
- Every generated prompt defaults to instrumental music with `无演唱，无歌词，无人声哼唱，无旁白`.
- Do not prompt for imitation of a living artist, composer, or a specific protected recording.
- Preserve all existing element IDs, workspace APIs, project data, transfer buttons, and tests for the five existing workspaces.
- The new project state key is exactly `workspaces.music`; old projects without it load a safe empty music state.
- Use the established cool gray-green, warm-white, dark command-bar, and fine-border design language; avoid large pure-black surfaces, neon glows, fake waveforms, nested cards, and radii above 6px.
- At widths above 1180px use three columns; at 820–1180px stack the three work areas; below 820px use one column with no horizontal page scrolling.
- Run visual QA at 1440×1024, 1280×960, 1024×768, and 390×844.
- Do not modify the project-center UI in this plan; its implementation starts only after this workspace is visually and functionally accepted.

---

### Task 1: Pure Music Domain Model and Template Catalog

**Files:**
- Create: `music-data.js`
- Modify: `prompt-generator.test.js`
- Reference: `docs/superpowers/specs/2026-07-17-music-scoring-workbench-design.md`

**Interfaces:**
- Produces: `MUSIC_PURPOSES`, `MUSIC_GENRES`, `MUSIC_VOCABULARIES`, `MUSIC_TEMPLATES`, `DEFAULT_MUSIC_STATE`
- Produces: `normalizeMusicState(input): MusicState`
- Produces: `validateMusicState(state): { valid: boolean, errors: string[] }`
- Produces: `scaleMusicTimeline(timeline, previousDuration, nextDuration): MusicTimelineSegment[]`
- Produces: `composeMusicPrompt(state): string`
- Browser export: `window.aigcMusicData`
- CommonJS export: the same object via `module.exports`

- [ ] **Step 1: Write failing catalog and normalization tests**

Add the import beside the other module imports in `prompt-generator.test.js`:

```js
const {
  MUSIC_PURPOSES,
  MUSIC_TEMPLATES,
  DEFAULT_MUSIC_STATE,
  normalizeMusicState,
  validateMusicState,
  scaleMusicTimeline,
  composeMusicPrompt
} = require("./music-data.js");
```

Add tests that require all ten purposes and verify a malformed imported state becomes safe:

```js
runTest("music catalog covers every approved production purpose", () => {
  const requiredPurposes = ["film", "series", "short", "documentary", "advertising", "promo", "trailer", "animation", "game", "social"];
  assert.deepStrictEqual(Object.keys(MUSIC_PURPOSES), requiredPurposes);
  requiredPurposes.forEach((purpose) => {
    assert(MUSIC_TEMPLATES.some((template) => template.purpose === purpose), `missing ${purpose} template`);
  });
  assert.strictEqual(MUSIC_TEMPLATES.length, 44);
  MUSIC_TEMPLATES.forEach((template) => {
    ["id", "purpose", "genre", "vocabulary", "name", "scene", "emotion", "instruments", "duration", "bpm"].forEach((key) => {
      assert(template[key] !== undefined, `${template.id || "unknown"} missing ${key}`);
    });
  });
});

runTest("music state normalization rejects malformed imported values", () => {
  const normalized = normalizeMusicState({
    duration: -8,
    bpm: 999,
    timeline: "bad",
    layout: { leftWidth: "wide", rightWidth: 9000 },
    purpose: "unknown"
  });
  assert.strictEqual(normalized.duration, DEFAULT_MUSIC_STATE.duration);
  assert.strictEqual(normalized.bpm, DEFAULT_MUSIC_STATE.bpm);
  assert.deepStrictEqual(normalized.timeline, DEFAULT_MUSIC_STATE.timeline);
  assert.deepStrictEqual(normalized.layout, DEFAULT_MUSIC_STATE.layout);
  assert.strictEqual(normalized.purpose, DEFAULT_MUSIC_STATE.purpose);
});
```

- [ ] **Step 2: Run the tests and verify the missing-module failure**

Run:

```bash
node prompt-generator.test.js
```

Expected: FAIL with `Cannot find module './music-data.js'`.

- [ ] **Step 3: Create the catalog constants and safe state normalizer**

Create `music-data.js` as an IIFE using this public shape:

```js
(function initMusicData(root) {
  const MUSIC_PURPOSES = {
    film: "电影", series: "剧集", short: "短片", documentary: "纪录片",
    advertising: "广告", promo: "宣传片", trailer: "预告片", animation: "动画",
    game: "游戏", social: "自媒体"
  };

  const MUSIC_GENRES = {
    drama: "剧情", suspense: "悬疑", crime: "犯罪", scifi: "科幻", war: "战争",
    action: "动作", romance: "爱情", comedy: "喜剧", horror: "恐怖", history: "历史",
    nature: "自然", humanities: "人文", corporate: "企业", public_service: "公益"
  };

  const MUSIC_VOCABULARIES = {
    orchestral: "管弦", strings: "弦乐", piano: "钢琴", electronic: "电子",
    ambient: "氛围", ethnic: "民族器乐", jazz: "爵士", rock: "摇滚",
    minimal: "极简", texture: "声响纹理", hybrid: "混合配器"
  };

  const DEFAULT_MUSIC_STATE = Object.freeze({
    templateId: "",
    purpose: "film",
    genre: "drama",
    vocabulary: "orchestral",
    duration: 15,
    bpm: 72,
    meter: "4/4",
    tonality: "minor",
    emotionStart: "克制、留白",
    emotionEnd: "情绪轻微抬升后留有余韵",
    leadInstrument: "低音弦乐",
    supportInstruments: "钢琴单音、柔和环境纹理",
    excludedInstruments: "",
    dynamics: "pp 起步，缓慢渐强至 mp",
    picture: "",
    editRhythm: "克制的镜头节奏，不强制卡点",
    dialogueMode: "none",
    ending: "保留自然尾音",
    extraRestrictions: "",
    timeline: [
      { start: 0, end: 5, task: "建立氛围", texture: "低频持续音与稀疏钢琴", dynamic: "pp" },
      { start: 5, end: 12, task: "发展情绪", texture: "弦乐缓慢进入", dynamic: "p 至 mp" },
      { start: 12, end: 15, task: "形成落点", texture: "保留主动机并减少声部", dynamic: "mp 回落至 p" }
    ],
    layout: { leftWidth: 320, rightWidth: 500 }
  });
```

Define the catalog from these 44 exact seed records, then map each tuple to the named object schema. This fixes the initial content scope and prevents ad hoc genre invention during implementation:

```js
const templateSeeds = [
  ["film-intimate-drama", "film", "drama", "strings", "内敛剧情·人物余韵", "人物做出克制决定后的静默时刻", "平静中有未说出的遗憾", "大提琴、中低音弦乐、稀疏钢琴", 30, 66],
  ["film-psychological-suspense", "film", "suspense", "texture", "心理悬疑·潜伏压力", "人物意识到危险却无法立即离开", "低水平不安持续累积，高潮仍保持压抑", "低频弦乐、呼吸感纹理、少量钢琴单音", 15, 58],
  ["film-crime-investigation", "film", "crime", "hybrid", "犯罪调查·冷静推进", "夜间搜证、监视与线索拼合", "理性、冷峻、危险逐步逼近", "脉冲合成器、低音弦乐、克制打击乐", 30, 82],
  ["film-epic-war", "film", "war", "orchestral", "史诗战争·沉重前行", "大规模行军与战场前夜", "悲壮、肃穆，不粉饰战争", "圆号、低弦、定音鼓、男声乐团音色但无哼唱", 60, 72],
  ["film-scifi-future", "film", "scifi", "electronic", "科幻未来·未知尺度", "人类首次面对巨大未知结构", "敬畏、疏离、缓慢扩张", "颗粒合成器、低频无人声谐振、金属纹理", 45, 54],
  ["film-romantic-emotion", "film", "romance", "piano", "爱情情绪·克制靠近", "两人重逢却没有立即表白", "温暖与犹疑并存，最后轻微释然", "柔和钢琴、室内乐弦组、轻微空间氛围", 30, 68],
  ["film-horror-lurking", "film", "horror", "texture", "恐怖潜伏·空间威胁", "空屋中的人物感知到不可见威胁", "极低强度恐惧逐渐收紧", "弓擦金属、低频房间声、不规则木质脉冲", 15, 46],
  ["film-light-comedy", "film", "comedy", "jazz", "轻喜剧·错位节奏", "人物连续遭遇日常尴尬与误会", "轻快、机敏，不夸张滑稽", "拨弦低音、刷奏鼓、单簧管短句", 30, 112],
  ["series-family-drama", "series", "drama", "piano", "家庭剧·生活温度", "餐桌、归家与亲情矛盾的日常场面", "真实、温暖，带少量心酸", "钢琴、木吉他、柔和弦乐", 45, 74],
  ["series-period-intrigue", "series", "history", "ethnic", "历史权谋·暗流", "宫廷或府邸中的试探、对话与利益交换", "克制、威严、暗含杀机", "筝低音、箫、大提琴、少量堂鼓", 45, 64],
  ["series-urban-emotion", "series", "romance", "minimal", "都市情感·夜归", "城市夜晚的独处、通话与情感决定", "现代、疏离，最后保留希望", "电钢琴、柔和合成器、简约电子节拍", 30, 86],
  ["short-poetic-minimal", "short", "drama", "minimal", "诗意短片·呼吸留白", "自然空间中的人物记忆与微小动作", "安静、透明、略带怀念", "单音钢琴、空气纹理、微弱弦乐泛音", 30, 52],
  ["short-social-reality", "short", "drama", "strings", "现实短片·沉默观察", "劳动、通勤、家庭压力与社会现实", "客观、克制，不煞情", "大提琴长音、低频环境底噪、极少钢琴", 45, 60],
  ["short-experimental-texture", "short", "scifi", "texture", "实验影像·材质异变", "抽象物件、身体局部与空间变形", "不稳定、陌生、不预测", "颗粒噪声、弹性金属、反向钢琴纹理", 20, 70],
  ["documentary-nature", "documentary", "nature", "orchestral", "自然纪录·广阔生命", "山川、海洋、迁徙与季节变化", "敬畏、开阔，不过度英雄化", "弦乐、木管、圆号、轻柔打击乐", 60, 76],
  ["documentary-humanities", "documentary", "humanities", "ethnic", "人文纪录·时间纹理", "手艺、乡土、日常仪式与文化记忆", "温厚、尊重、有时间感", "地域弹拨乐器、尺八或箫类气息、低弦", 60, 68],
  ["documentary-social-reality", "documentary", "drama", "minimal", "社会现实·冷静记录", "社会问题、调查、访谈与现场观察", "理性、不评判、保持张力", "低频持续音、稀疏钢琴、微弱电子脉冲", 60, 58],
  ["documentary-biography", "documentary", "history", "piano", "人物传记·回望与转折", "人生阶段、历史照片与关键决定", "怀念、尊重，在转折处增加力量", "钢琴、大提琴、室内乐弦组", 60, 70],
  ["documentary-technology", "documentary", "scifi", "electronic", "科技探索·理性奇观", "实验室、工程结构、数据可视化与未来应用", "清晰、好奇、逐步展开", "模块合成器、马林巴、简洁电子节拍", 45, 92],
  ["advertising-luxury", "advertising", "corporate", "minimal", "高端品牌·克制质感", "奢侈品、香水、珠宝与高端服务主视觉", "冷静、精准、有稀缺感", "现代钢琴、低频弦乐、极简金属点音", 30, 72],
  ["advertising-technology", "advertising", "scifi", "electronic", "科技广告·精准驱动", "手机、智能设备、软件与创新功能演示", "利落、智能、持续向前", "清洁合成器、数字打击乐、短促马林巴", 30, 108],
  ["advertising-automotive", "advertising", "action", "hybrid", "汽车广告·动力与路感", "车身细节、道路驾驶、加速与制动", "稳定、有控制的力量递进", "混合打击乐、低音合成器、弦乐脉冲", 45, 116],
  ["advertising-fashion", "advertising", "drama", "electronic", "时尚美妆·态度节拍", "秀场、妆容、服饰细节与人物步伐", "冷艳、自信、节奏鲜明", "干净电子鼓、合成低音、精简弦乐短句", 30, 124],
  ["advertising-food", "advertising", "comedy", "jazz", "食品生活·温暖鲜活", "食材、烹饪、分享与家庭生活", "轻松、可口、亲近", "木吉他、轻打击乐、马林巴、拨弦低音", 30, 104],
  ["advertising-charity", "advertising", "public_service", "piano", "公益广告·真诚关怀", "真实人物、社会关怀与行动号召", "克制的共情逐步转为希望", "钢琴、温暖弦乐、很轻的木质打击乐", 45, 70],
  ["promo-city", "promo", "corporate", "orchestral", "城市形象·秩序生长", "城市航拍、交通、产业、市民与夜景", "现代、开放、稳步抬升", "弦乐、圆号、电子脉冲、稳定打击乐", 60, 96],
  ["promo-tourism", "promo", "nature", "ethnic", "文旅宣传·山水人文", "风景、非遗、市井、节庆与旅行体验", "清新、广阔、具地域温度", "地域乐器、弦乐、柔和打击乐、自然纹理", 60, 88],
  ["promo-corporate", "promo", "corporate", "hybrid", "企业品牌·可信进取", "团队、制造、服务、创新与成果展示", "稳健、专业、逐步增强", "钢琴动机、弦乐、电子节拍、轻铜管", 60, 102],
  ["promo-launch", "promo", "scifi", "electronic", "科技发布·倒计揭示", "产品发布、功能展开、数据与舞台揭示", "精确、克制蓄力、揭示时明亮", "模块合成器、数字打击乐、弦乐升势", 45, 120],
  ["promo-sports", "promo", "action", "hybrid", "体育激励·节奏爆发", "训练、竞技、团队合作与决胜瞬间", "坚韧、专注、最后释放", "混合鼓组、低音合成器、铜管短句、弦乐脉冲", 45, 132],
  ["promo-public-service", "promo", "public_service", "orchestral", "公益宣传·共同行动", "公共服务、志愿者、社区与集体行动", "真诚、可信、由个人扩展至群体", "钢琴、弦乐、木管、克制打击乐", 60, 84],
  ["trailer-suspense", "trailer", "suspense", "texture", "悬念预告·逐层收紧", "线索闪回、问题提出与黑场悬停", "由安静不安推向突然中断", "低频脉冲、弦乐滑音、金属冲击、时钟纹理", 60, 72],
  ["trailer-action-rise", "trailer", "action", "hybrid", "动作预告·三段递进", "任务建立、危机扩大、动作蒙太奇与片名落点", "节奏逐段加密，高潮后硬停", "混合鼓组、铜管、弦乐跑动、电子低音", 60, 126],
  ["trailer-emotional", "trailer", "drama", "orchestral", "情绪预告·记忆抬升", "关系片段、人生转折与情感高潮", "从私密回忆抬升至克制希望", "钢琴、独奏大提琴、弦乐群、轻铜管", 60, 76],
  ["trailer-epic-countdown", "trailer", "war", "orchestral", "史诗预告·倒计落点", "宏大世界揭示、冲突升级与上映信息", "庄严、压迫、分段释放", "低弦、圆号、定音鼓、金属冲击、无人声乐团音色", 90, 80],
  ["animation-fantasy", "animation", "scifi", "orchestral", "奇幻动画·世界初见", "角色首次进入魔法森林、天空城或奇幻国度", "好奇、轻盈、逐步开阔", "木管、竖琴、弦乐、钟琴、柔和圆号", 45, 96],
  ["animation-child-comedy", "animation", "comedy", "jazz", "童趣动画·轻快冒险", "可爱角色追逐、误会和小型冒险", "明快、灵动，保持叙事节奏", "单簧管、长笛、拨弦、木琴、轻打击乐", 30, 124],
  ["animation-eastern", "animation", "history", "ethnic", "东方动画·山水叙事", "东方山水、传说、修行与家国情感", "雅致、悠远，转折处具有力量", "箫、琵琶、古琴、低弦、堂鼓", 60, 72],
  ["game-exploration", "game", "scifi", "ambient", "世界探索·可循环氛围", "玩家进入新区域并持续自由探索", "好奇、沉浸，无强制高潮", "氛围合成器、柔和弦乐、地域音色点缀", 90, 64],
  ["game-combat", "game", "action", "hybrid", "战斗关卡·循环压力", "中高强度战斗、阶段转换与胜利落点", "持续紧张，保留动态空间", "混合鼓组、低音合成器、铜管、弦乐节奏组", 90, 136],
  ["game-future-electronic", "game", "scifi", "electronic", "未来游戏·机械脉冲", "赛博城市、机械设施、高速穿行与系统潜入", "冷峻、精密、稳定驱动", "序列合成器、工业打击乐、低频脉冲、金属噪声", 60, 128],
  ["social-hook", "social", "comedy", "electronic", "自媒体开场·快速吸引", "前三秒提出问题或展示强视觉信息", "立即、清晰、不喧宾夺主", "短促合成器、简洁鼓点、亮色马林巴", 15, 118],
  ["social-dialogue-bed", "social", "humanities", "minimal", "口播垫乐·人声避让", "解说、访谈、知识分享与密集口播", "稳定、亲和、不抢语义", "低密度电钢琴、轻打击乐、柔和低频", 60, 88],
  ["social-product-demo", "social", "corporate", "electronic", "产品演示·清晰节点", "商品功能、开箱、前后对比与使用步骤", "轻快、清晰、具有信息组织感", "清洁电子节拍、拨弦合成器、轻巧打击乐", 30, 110]
];

const MUSIC_TEMPLATES = templateSeeds.map(([id, purpose, genre, vocabulary, name, scene, emotion, instruments, duration, bpm]) => ({
  id, purpose, genre, vocabulary, name, scene, emotion, instruments, duration, bpm
}));
```

Implement `normalizeMusicState()` by deep-cloning defaults, accepting only known enum keys, and accepting layout values only when finite and within `leftWidth: 280–420` and `rightWidth: 420–620`. Accept a timeline array when every segment has finite `start/end` values and plain-text `task`, `texture`, and `dynamic` values; preserve in-range overlaps so `validateMusicState()` can show the user the error instead of silently replacing their edits. Replace non-array timelines, non-finite times, negative starts, `end <= start`, and segments ending beyond duration with the deep-cloned default timeline.

- [ ] **Step 4: Run tests and verify catalog/normalization pass**

Run `node prompt-generator.test.js`.

Expected: the two new music tests PASS and all existing tests remain PASS.

- [ ] **Step 5: Write failing timeline, validation, and prompt-composition tests**

Add:

```js
runTest("music timeline rescales deterministically and validates its full duration", () => {
  const scaled = scaleMusicTimeline(DEFAULT_MUSIC_STATE.timeline, 15, 30);
  assert.deepStrictEqual(scaled.map(({ start, end }) => [start, end]), [[0, 10], [10, 24], [24, 30]]);
  assert.strictEqual(validateMusicState({ ...DEFAULT_MUSIC_STATE, duration: 30, timeline: scaled }).valid, true);
  const invalid = validateMusicState({
    ...DEFAULT_MUSIC_STATE,
    timeline: [{ start: 0, end: 8 }, { start: 7, end: 15 }]
  });
  assert.strictEqual(invalid.valid, false);
  assert(invalid.errors.some((message) => message.includes("交叉")));
});

runTest("music prompt follows the approved instrumental scoring structure", () => {
  const prompt = composeMusicPrompt({
    ...DEFAULT_MUSIC_STATE,
    picture: "冬夜火车站，女调查员终于确认同伴背叛",
    dialogueMode: "dense"
  });
  [
    "【用途与叙事任务】", "【音乐参数】", "【情绪与动态】", "【配器设计】",
    "【分段时间轴】", "【画面与声音关系】", "【结尾】", "【限定词】",
    "0–5秒", "密集对白", "避让人声主要频段", "无演唱", "无歌词", "无人声哼唱", "无旁白"
  ].forEach((text) => assert(prompt.includes(text), `missing ${text}`));
  assert(!prompt.includes("undefined"));
});
```

- [ ] **Step 6: Implement timeline scaling, validation, and prompt composition**

Use these rules in `music-data.js`:

```js
function scaleMusicTimeline(timeline, previousDuration, nextDuration) {
  const ratio = nextDuration / previousDuration;
  return timeline.map((segment, index) => ({
    ...segment,
    start: index === 0 ? 0 : Math.round(segment.start * ratio * 10) / 10,
    end: index === timeline.length - 1 ? nextDuration : Math.round(segment.end * ratio * 10) / 10
  }));
}

function validateMusicState(input) {
  const state = normalizeMusicState(input);
  const errors = [];
  if (!MUSIC_PURPOSES[state.purpose]) errors.push("请选择配乐用途。");
  if (!(state.duration > 0)) errors.push("时长必须大于 0 秒。");
  if (state.bpm < 30 || state.bpm > 240) errors.push("BPM 必须在 30–240 之间。");
  if (!state.emotionStart.trim() && !state.emotionEnd.trim()) errors.push("请填写情绪走向。");
  if (!state.leadInstrument.trim()) errors.push("请至少填写一个主要配器。");
  state.timeline.forEach((segment, index) => {
    if (index > 0 && segment.start < state.timeline[index - 1].end) errors.push(`第 ${index + 1} 段时间与上一段交叉。`);
  });
  if (state.timeline[0]?.start !== 0 || state.timeline.at(-1)?.end !== state.duration) errors.push("时间轴必须完整覆盖总时长。");
  return { valid: errors.length === 0, errors };
}
```

`composeMusicPrompt()` must produce the eight titled sections asserted by the test. Its restriction section always includes the five defaults from the specification, then adds dialogue-frequency avoidance for `dialogueMode === "dense"` and appends non-empty `excludedInstruments` and `extraRestrictions` without duplicating lines.

At the end of the IIFE expose the same API to browser and Node:

```js
const api = { MUSIC_PURPOSES, MUSIC_GENRES, MUSIC_VOCABULARIES, MUSIC_TEMPLATES, DEFAULT_MUSIC_STATE, normalizeMusicState, validateMusicState, scaleMusicTimeline, composeMusicPrompt };
if (typeof module !== "undefined" && module.exports) module.exports = api;
root.aigcMusicData = api;
})(typeof window !== "undefined" ? window : globalThis);
```

- [ ] **Step 7: Run the complete Node suite**

Run `node prompt-generator.test.js`.

Expected: all tests PASS; no output line begins with `FAIL`.

- [ ] **Step 8: Commit the domain model**

```bash
git add music-data.js prompt-generator.test.js
git commit -m "feat: add music scoring prompt model"
```

---

### Task 2: Accessible Three-Column Music Workspace Shell

**Files:**
- Modify: `index.html`
- Modify: `tone-option2.css`
- Create: `music-workspace.css`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: `window.aigcMusicData` from Task 1
- Produces: one `button[data-workspace="music"]`
- Produces: one `main#music-workspace.workspace-view`
- Produces DOM IDs consumed by Task 3: `music-purpose-tabs`, `music-genre`, `music-vocabulary`, `music-template-list`, `music-template-count`, `music-duration`, `music-bpm`, `music-meter`, `music-tonality`, `music-emotion-start`, `music-emotion-end`, `music-lead-instrument`, `music-support-instruments`, `music-excluded-instruments`, `music-dynamics`, `music-timeline`, `music-picture`, `music-edit-rhythm`, `music-dialogue-mode`, `music-ending`, `music-extra-restrictions`, `music-validation`, `music-output`, `music-filename`, `music-example`, `music-clear`, `music-copy`

- [ ] **Step 1: Write failing static shell tests**

Add:

```js
runTest("music workspace exposes one complete accessible shell", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const ids = [
    "music-workspace", "music-purpose-tabs", "music-genre", "music-vocabulary", "music-template-list", "music-template-count",
    "music-duration", "music-bpm", "music-meter", "music-tonality", "music-emotion-start", "music-emotion-end",
    "music-lead-instrument", "music-support-instruments", "music-excluded-instruments", "music-dynamics", "music-timeline",
    "music-picture", "music-edit-rhythm", "music-dialogue-mode", "music-ending", "music-extra-restrictions",
    "music-validation", "music-output", "music-filename", "music-example", "music-clear", "music-copy"
  ];
  ids.forEach((id) => assert.strictEqual(html.split(`id="${id}"`).length - 1, 1, `expected #${id} once`));
  assert(html.includes('data-workspace="music"'));
  assert(html.includes('href="music-workspace.css?v=20260717-music-workspace-v1"'));
  assert(html.indexOf('src="music-data.js?v=20260717-music-data-v1"') < html.indexOf('src="music-app.js?v=20260717-music-app-v1"'));
  assert(html.indexOf('src="music-app.js?v=20260717-music-app-v1"') < html.indexOf('src="workspace-core.js'));
  const toneCss = fs.readFileSync("tone-option2.css", "utf8");
  assert(cssRuleBody(toneCss, ".workspace-header .mode-switch").includes("grid-template-columns: repeat(6, minmax(82px, 1fr));"));
});

runTest("music workspace CSS defines balanced responsive columns", () => {
  const css = fs.readFileSync("music-workspace.css", "utf8");
  assert(css.includes("grid-template-columns: var(--music-left-width) 9px minmax(440px, 1fr) 9px var(--music-right-width);"));
  assert(css.includes("@media (max-width: 1180px)"));
  assert(css.includes("@media (max-width: 820px)"));
  assert(css.includes("overflow-x: hidden"));
  assert(!css.includes("border-radius: 20px"));
});
```

- [ ] **Step 2: Run tests and verify the missing-shell failure**

Run `node prompt-generator.test.js`.

Expected: FAIL because `#music-workspace` and `music-workspace.css` do not exist.

- [ ] **Step 3: Add the navigation item, workspace markup, stylesheet, and scripts**

In `index.html`:

1. Add `<link rel="stylesheet" href="music-workspace.css?v=20260717-music-workspace-v1">` after `reverse-three-column.css`.
2. Add a sixth mode button after `画面反推` using Lucide `audio-lines`, visible text `音乐配乐`, and small label `SCORE`.
3. Add `<main id="music-workspace" class="music-production-shell workspace-view" hidden>` before the script block.
4. Add `<script src="music-data.js?v=20260717-music-data-v1"></script>` and `<script src="music-app.js?v=20260717-music-app-v1"></script>` immediately before `workspace-core.js`.

In `tone-option2.css`, change the command-bar navigation track from five to six equal columns:

```css
.workspace-header .mode-switch {
  grid-template-columns: repeat(6, minmax(82px, 1fr));
}
```

The desktop shell contains exactly five direct children in this order: `section.music-library-panel[aria-label="配乐模板库"]`; `div.music-column-resizer[data-music-resizer="left"][role="separator"][tabindex="0"]`; `section.music-structure-panel[aria-label="音乐结构设计"]`; `div.music-column-resizer[data-music-resizer="right"][role="separator"][tabindex="0"]`; `section.music-output-panel[aria-label="画面关系与配乐提示词"]`. The two separators use `aria-orientation="vertical"` and visible labels `调整配乐模板库宽度` and `调整提示词区宽度`.

Use actual `<label>` elements for every input. Use buttons for purpose tabs, `<select>` for genre/vocabulary/duration/meter/tonality/dialogue mode, numeric input for BPM, textareas for narrative fields, and a readonly `#music-output` textarea. The timeline container is initially empty and receives editable segment rows from Task 3.

- [ ] **Step 4: Create the scoped visual system**

Create `music-workspace.css` with these layout tokens and boundaries:

```css
#music-workspace.music-production-shell {
  --music-left-width: 320px;
  --music-right-width: 500px;
  --music-canvas: #dfe5e2;
  --music-surface: #f7f7f4;
  --music-paper: #fffefb;
  --music-ink: #18201e;
  --music-muted: #65706c;
  --music-line: #cbd3cf;
  --music-accent: #17685e;
  --music-accent-soft: #e4f0ec;
  --music-cue: #aa6a30;
  display: grid;
  grid-template-columns: var(--music-left-width) 9px minmax(440px, 1fr) 9px var(--music-right-width);
  width: 100%;
  height: calc(100vh - var(--studio-header-height, 66px));
  min-height: 620px;
  padding: 12px 14px 14px;
  overflow: hidden;
  color: var(--music-ink);
  background: var(--music-canvas);
  letter-spacing: 0;
}

#music-workspace[hidden] { display: none; }
```

Panels use one level of framing with `border: 1px solid var(--music-line)`, `border-radius: 4px`, `background: var(--music-surface)`, and independent vertical scrolling. Template cards use a stable minimum height and show name, scene, emotion, instruments, duration, and BPM without line overlap. Timeline rows use labeled inputs and a left time-code rail; do not draw a waveform.

At `max-width: 1180px`, change the shell to one column, hide both resizers, set `height: auto`, and preserve each section's vertical scroll content. At `max-width: 820px`, use single-column fields and full-width toolbars. Every media block must explicitly include `overflow-x: hidden`.

- [ ] **Step 5: Run the Node suite**

Run `node prompt-generator.test.js`.

Expected: all shell and existing tests PASS.

- [ ] **Step 6: Commit the shell**

```bash
git add index.html tone-option2.css music-workspace.css prompt-generator.test.js
git commit -m "feat: add music scoring workspace shell"
```

---

### Task 3: Music Workspace Controller, Templates, Timeline, and Copy Flow

**Files:**
- Create: `music-app.js`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: `window.aigcMusicData`
- Produces: `window.aigcMusicWorkbench.exportState(): MusicState`
- Produces: `window.aigcMusicWorkbench.importState(saved): void`
- Produces dirty event: `new CustomEvent("aigc:workspace-dirty", { detail: { workspace: "music" } })`

- [ ] **Step 1: Write failing controller contract tests**

Add:

```js
runTest("music controller exposes persistence and production interactions", () => {
  const source = fs.readFileSync("music-app.js", "utf8");
  [
    "aigcMusicData", "aigcMusicWorkbench", "exportState", "importState", "composeMusicPrompt",
    "validateMusicState", "scaleMusicTimeline", "renderPurposeTabs", "renderTemplateList",
    "renderTimeline", "applyTemplate", "loadExample", "clearFields", "aigc:workspace-dirty",
    "pointerdown", "ArrowLeft", "ArrowRight", "dblclick", "aria-valuenow"
  ].forEach((contract) => assert(source.includes(contract), `missing ${contract}`));
});

runTest("music controller never enables copy for an invalid timeline", () => {
  const source = fs.readFileSync("music-app.js", "utf8");
  assert(source.includes("elements.copy.disabled = !validation.valid"));
  assert(source.includes("elements.validation.textContent = validation.errors.join"));
  assert(source.includes('detail: { workspace: "music" }'));
});
```

- [ ] **Step 2: Run tests and verify the missing-controller failure**

Run `node prompt-generator.test.js`.

Expected: FAIL because `music-app.js` does not exist.

- [ ] **Step 3: Implement controller initialization and deterministic rendering**

Create `music-app.js` as a browser IIFE. Exit early when `document` or `root.aigcMusicData` is unavailable. Cache every Task 2 element once, initialize state with `normalizeMusicState(DEFAULT_MUSIC_STATE)`, and use one `render()` function that:

```js
function render() {
  renderPurposeTabs();
  renderFilters();
  renderTemplateList();
  renderTimeline();
  const snapshot = readStateFromElements();
  const validation = validateMusicState(snapshot);
  elements.validation.textContent = validation.errors.join(" ");
  elements.validation.classList.toggle("ready", validation.valid);
  elements.output.value = validation.valid ? composeMusicPrompt(snapshot) : "";
  elements.copy.disabled = !validation.valid;
  elements.filename.textContent = buildFilename(snapshot);
  applyLayout();
}
```

Purpose buttons update only `state.purpose`; genre and vocabulary filters narrow the visible templates but do not mutate composition fields until a card is selected. Template cards are `<button>` elements with `data-music-template-id` and `aria-pressed`.

`applyTemplate(templateId)` copies the selected template's purpose, genre, vocabulary, duration, BPM, emotion, and instruments into state. If the current state differs from defaults and from the currently selected template, call:

```js
const replace = root.confirm("替换当前配乐设置？选择“取消”将保留当前参数。");
if (!replace) return;
```

After applying a template, scale the default three-segment timeline to its duration, render once, and dispatch one dirty event.

- [ ] **Step 4: Implement editable timeline behavior**

`renderTimeline()` creates one row per segment with inputs carrying `data-music-segment-index` and `data-music-segment-field` for `start`, `end`, `task`, `texture`, and `dynamic`. Use event delegation on `#music-timeline` so edits update only the addressed segment, normalize numeric values, render validation/output, and dispatch one dirty event.

When duration changes:

```js
const previousDuration = state.duration;
state.duration = Number(elements.duration.value);
state.timeline = scaleMusicTimeline(state.timeline, previousDuration, state.duration);
syncElementsFromState();
markDirty();
render();
```

Do not silently repair overlapping segments typed by the user; leave the values visible, show the validation message, and disable copy.

- [ ] **Step 5: Implement clear, example, copy, layout resizing, and project API**

Use a fixed example based on a 15-second winter-night station betrayal scene. `clearFields()` restores a deep clone of `DEFAULT_MUSIC_STATE` while clearing picture and extra restrictions. Copy selects `#music-output`, uses `navigator.clipboard.writeText()`, falls back to `document.execCommand("copy")`, and temporarily changes the button label to `已复制` for 1200ms.

Bind both resizers with the established poster/reverse behavior:

- left width 280–420px, default 320px;
- right width 420–620px, default 500px;
- drag with Pointer Events;
- arrow keys change 8px, Shift+arrow changes 24px;
- double click restores the corresponding default;
- below 1181px remove inline track variables and set `aria-disabled="true"` without destroying saved widths.

Expose:

```js
root.aigcMusicWorkbench = {
  exportState() {
    return normalizeMusicState(readStateFromElements());
  },
  importState(saved = {}) {
    state = normalizeMusicState(saved);
    syncElementsFromState();
    render();
  },
  loadExample,
  clearFields,
  composePrompt() {
    return composeMusicPrompt(readStateFromElements());
  }
};
```

- [ ] **Step 6: Run the Node suite and syntax checks**

Run:

```bash
node --check music-data.js
node --check music-app.js
node prompt-generator.test.js
```

Expected: both syntax checks exit 0; all tests PASS.

- [ ] **Step 7: Commit the controller**

```bash
git add music-app.js prompt-generator.test.js
git commit -m "feat: build music scoring prompt workflow"
```

---

### Task 4: Global Navigation, Project Persistence, and Motion Integration

**Files:**
- Modify: `workspace-core.js`
- Modify: `ui-motion.js`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Consumes: `window.aigcMusicWorkbench`
- Updates existing project capture/apply flow through `api.music`
- Updates UI metadata for `data-workspace="music"`

- [ ] **Step 1: Write failing integration tests**

Add:

```js
runTest("music workspace participates in navigation, projects, and motion metadata", () => {
  const core = fs.readFileSync("workspace-core.js", "utf8");
  const motion = fs.readFileSync("ui-motion.js", "utf8");
  assert(core.includes("music: root.aigcMusicWorkbench"));
  assert(motion.includes('music: { code: "MUSIC SCORING", title: "音乐配乐" }'));
  assert(motion.includes('music: "#music-workspace .music-output-panel"'));
  assert(motion.includes('"music-copy"'));
});

runTest("music project state remains backwards compatible", () => {
  const core = fs.readFileSync("workspace-core.js", "utf8");
  assert(core.includes("project.workspaces?.[key] || {}"));
  assert(core.includes("captureWorkspaces()"));
  assert(core.includes("Object.entries(api)"));
});
```

- [ ] **Step 2: Run tests and verify integration is missing**

Run `node prompt-generator.test.js`.

Expected: FAIL on missing `api.music` and music motion metadata.

- [ ] **Step 3: Register music with workspace persistence**

In the `api` object in `workspace-core.js`, add:

```js
music: root.aigcMusicWorkbench
```

Do not change `STORAGE_KEY`, `schemaVersion`, `blankProject()`, `captureWorkspaces()`, or `applyProject()`. Their existing generic iteration will save `workspaces.music` and will pass `{}` to old projects that lack it.

- [ ] **Step 4: Register music with command-bar metadata and copy feedback**

In `ui-motion.js` add:

```js
music: { code: "MUSIC SCORING", title: "音乐配乐" }
```

Add `"music-copy"` to `copyButtons`, map `"music-copy": "copy"` in `iconMap`, and add:

```js
music: "#music-workspace .music-output-panel"
```

to `outputSelectors`.

- [ ] **Step 5: Run regression tests**

Run:

```bash
node --check workspace-core.js
node --check ui-motion.js
node prompt-generator.test.js
```

Expected: syntax checks exit 0 and all tests PASS.

- [ ] **Step 6: Commit integration**

```bash
git add workspace-core.js ui-motion.js prompt-generator.test.js
git commit -m "feat: persist music workspace in projects"
```

---

### Task 5: Browser Functional QA and Responsive Design QA

**Files:**
- Inspect and correct: `music-workspace.css`
- Inspect and correct: `music-app.js`
- Inspect and correct: `index.html`
- Add regression coverage: `prompt-generator.test.js`
- Create: `.audit-20260717-music-workspace/music-1440.png`
- Create: `.audit-20260717-music-workspace/music-1280.png`
- Create: `.audit-20260717-music-workspace/music-1024.png`
- Create: `.audit-20260717-music-workspace/music-390.png`
- Create: `.audit-20260717-music-workspace/qa-notes.md`

**Interfaces:**
- Consumes complete Tasks 1–4
- Produces visual and behavioral evidence for user review

- [ ] **Step 1: Start or confirm the local server**

Run:

```bash
curl -I http://127.0.0.1:8766/index.html
```

Expected: HTTP 200. If unavailable, run the existing local server in a persistent terminal session:

```bash
python3 serve-local.py 8766
```

Then verify the HTTP 200 response again.

- [ ] **Step 2: Open the music workspace and test the primary flow**

Open:

```text
http://127.0.0.1:8766/index.html?workspace=music&fresh=music-workspace-v1
```

Verify in a real browser:

1. Navigation shows six workspaces and `音乐配乐` is active.
2. Purpose, genre, and vocabulary filters show only cards matching the selected purpose and the active genre/vocabulary filters.
3. Selecting a template replaces, rather than stacks, the previous template values.
4. Changing 15 seconds to 30 seconds scales segments to `0–10`, `10–24`, `24–30`.
5. Creating an overlap shows a clear error and disables copy.
6. Dense dialogue adds frequency-avoidance language.
7. Copy includes all eight prompt sections and all five default no-vocal restrictions.
8. Clear and example each trigger one save cycle.
9. Refresh restores state; switching to another project and back restores the correct music state.
10. An older project with no music data opens with defaults and preserves the other five workspace states.

- [ ] **Step 3: Capture and inspect four viewport screenshots**

Using Playwright CLI, capture the music URL at 1440×1024, 1280×960, 1024×768, and 390×844 into the four specified PNG paths. Inspect every image, not only the DOM snapshot.

The screenshots must prove:

- 1440: three balanced panels; middle structure area remains at least 440px; both side panels are readable.
- 1280: no clipped template descriptions or output text; panel proportions remain coordinated.
- 1024: stacked layout presents library, structure, and output in that order; all controls remain reachable.
- 390: one column, full-width controls, no horizontal scroll, no overlapping labels or buttons.
- all sizes: no large pure-black field, no fake waveform, no nested cards, no text below 11px for controls or below 12px for generated output.

- [ ] **Step 4: Record QA evidence and fix every observed defect**

Create `.audit-20260717-music-workspace/qa-notes.md` with this exact checklist and a PASS/FAIL plus one evidence sentence for each item:

```markdown
# Music Workspace QA

- [ ] 1440 desktop composition
- [ ] 1280 compact desktop composition
- [ ] 1024 stacked composition
- [ ] 390 mobile composition
- [ ] Template replacement behavior
- [ ] Timeline scaling and invalid-overlap blocking
- [ ] Prompt structure and no-vocal restrictions
- [ ] Project save, refresh, switch, import compatibility
- [ ] Keyboard focus and resizer operation
- [ ] Console free of errors and warnings
```

For each logic defect, first add a focused regression assertion. For each visual-only defect, record the failing viewport and selector in `qa-notes.md`. Then make the smallest scoped CSS/JS/HTML correction, rerun the Node suite, and recapture the affected viewport.

- [ ] **Step 5: Run final automated verification**

Run:

```bash
node --check music-data.js
node --check music-app.js
node --check workspace-core.js
node --check ui-motion.js
node prompt-generator.test.js
```

Expected: every command exits 0 and no test prints `FAIL`.

- [ ] **Step 6: Inspect the final diff for scope control**

Run:

```bash
git diff --check
git status --short
git diff -- index.html music-data.js music-app.js music-workspace.css workspace-core.js ui-motion.js prompt-generator.test.js
```

Expected: no whitespace errors; implementation changes are limited to the declared music integration files; pre-existing unrelated dirty files remain untouched.

- [ ] **Step 7: Commit the verified workspace**

```bash
git add index.html music-data.js music-app.js music-workspace.css workspace-core.js ui-motion.js prompt-generator.test.js .audit-20260717-music-workspace
git commit -m "test: verify music scoring workspace"
```

---

### Task 6: User Visual Acceptance Gate

**Files:**
- No code changes unless the user reports a specific defect

**Interfaces:**
- Produces: stable browser review URL
- Blocks: project-center implementation planning

- [ ] **Step 1: Give the user a cache-busted local review URL**

Provide:

```text
http://127.0.0.1:8766/index.html?workspace=music&fresh=music-workspace-final-v1
```

- [ ] **Step 2: Ask for visual and workflow acceptance**

Ask the user to check template readability, three-column proportions, timeline editing, generated prompt readability, and whether the categories match real film-production use.

- [ ] **Step 3: Hold the project-center gate**

Do not write or execute the project-center implementation plan until the user explicitly accepts the music workspace. If the user requests changes, convert each report into a reproducible browser check, add regression coverage where possible, fix it, provide a new cache-busted URL, and ask for acceptance again.
