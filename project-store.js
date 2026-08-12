(function initProjectStore(root) {
  const PROJECT_STORE_SCHEMA_VERSION = 8;
  const WORKSPACE_IDS = Object.freeze(["tone", "camera", "casting", "poster", "reverse", "music"]);
  const SCENE_LIMIT = 60;
  const SHOT_LIMIT = 12;
  const SCREENPLAY_RAW_TEXT_LIMIT = 60000;
  const SCREENPLAY_VERSION_LIMIT = 12;
  const SCREENPLAY_SOURCE_TYPES = new Set(["new", "paste", "file"]);
  const SHOT_STATUSES = new Set(["planned", "keyframe", "generated", "revision", "locked"]);
  const SHOT_TARGET_MODELS = new Set(["general", "seedance", "jimeng-kling", "runway-pika"]);
  const SHOT_DELIVERY_MODES = new Set(["still", "seedance15", "seedance30"]);
  const BRIEF_PLATFORMS = new Set(["film", "short-video", "social", "pitch"]);
  const BRIEF_ROUTES = new Set(["casting", "camera", "poster", "music", "library"]);
  const CATEGORIES = new Set(["all", "recent", "favorite", "backup"]);
  const SORTS = new Set(["updated-desc", "created-desc", "name-asc"]);
  const sceneAssistantApi = typeof require === "function" ? require("./scene-assistant-data.js") : root.aigcSceneAssistantData;
  const sceneVideoApi = typeof require === "function" ? require("./scene-video-adapters.js") : root.aigcSceneVideoAdapters;
  const assetLocksApi = typeof require === "function" ? require("./project-asset-locks.js") : root.aigcProjectAssetLocks;
  const resultsApi = typeof require === "function" ? require("./project-shot-results.js") : root.aigcProjectShotResults;
  const DEFAULT_DASHBOARD_VIEW = Object.freeze({
    category: "all",
    sort: "updated-desc",
    search: "",
    selectedProjectId: "",
    scrollTop: 0
  });

  function normalizeDuration(value) {
    if (value === null || value === "" || value === undefined) return null;
    const number = Number(value);
    return Number.isInteger(number) && number >= 1 && number <= 86400 ? number : null;
  }

  function normalizeWorkspace(value) {
    return WORKSPACE_IDS.includes(value) ? value : "tone";
  }

  function normalizeStringList(value, limit) {
    return Array.isArray(value)
      ? value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()).slice(0, limit)
      : [];
  }

  function normalizeCreativeBrief(value) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      story: String(source.story || "").trim().slice(0, 280),
      platform: BRIEF_PLATFORMS.has(source.platform) ? source.platform : "film",
      era: String(source.era || "").trim().slice(0, 60),
      region: String(source.region || "").trim().slice(0, 60),
      targetModels: normalizeStringList(source.targetModels, 6),
      route: BRIEF_ROUTES.has(source.route) ? source.route : "library",
      referenceAssetIds: normalizeStringList(source.referenceAssetIds, 12)
    };
  }

  function normalizeVisualBible(value) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const toneItems = Array.isArray(source.toneItems)
      ? source.toneItems.filter((item) => item && typeof item === "object" && !Array.isArray(item)
        && typeof item.category === "string" && typeof item.id === "string").slice(0, 2)
      : [];
    const palette = Array.isArray(source.palette)
      ? source.palette.filter((item) => typeof item === "string" && /^#[0-9a-f]{6}$/i.test(item)).slice(0, 5)
      : [];
    return {
      status: source.status === "locked" ? "locked" : "draft",
      toneItems,
      mood: String(source.mood || "").trim().slice(0, 80),
      palette,
      colorDirection: String(source.colorDirection || "").trim().slice(0, 220),
      lightingDirection: String(source.lightingDirection || "").trim().slice(0, 220),
      cameraDirection: String(source.cameraDirection || "").trim().slice(0, 220),
      materialDirection: String(source.materialDirection || "").trim().slice(0, 220),
      negativeConstraints: normalizeStringList(source.negativeConstraints, 12),
      updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : ""
    };
  }

  function normalizeSceneShot(value, index) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const duration = Number(source.durationSeconds);
    const deliveryMode = SHOT_DELIVERY_MODES.has(source.deliveryMode)
      ? source.deliveryMode
      : duration > 15 ? "seedance30" : "seedance15";
    return {
      id: typeof source.id === "string" && source.id.trim() ? source.id.trim().slice(0, 80) : `shot-${index + 1}`,
      durationSeconds: Number.isInteger(duration) && duration >= 5 && duration <= 30 ? duration : 15,
      deliveryMode,
      framing: String(source.framing || "").trim().slice(0, 60),
      movement: String(source.movement || "").trim().slice(0, 120),
      performance: String(source.performance || "").trim().slice(0, 220),
      sound: String(source.sound || "").trim().slice(0, 220),
      targetModel: SHOT_TARGET_MODELS.has(source.targetModel) ? source.targetModel : "general",
      status: SHOT_STATUSES.has(source.status) ? source.status : "planned",
      promptCard: normalizeShotPromptCard(source.promptCard),
      negativeConstraints: normalizeStringList(source.negativeConstraints, 8),
      promptVersions: normalizeShotPromptVersions(source.promptVersions),
      activePromptVersionId: typeof source.activePromptVersionId === "string" ? source.activePromptVersionId.slice(0, 80) : "",
      productionResults: resultsApi?.normalizeProductionResults ? resultsApi.normalizeProductionResults(source.productionResults) : []
    };
  }

  function normalizeShotPromptVersions(value) {
    const seen = new Set();
    return (Array.isArray(value) ? value : []).map((item, index) => {
      const source = item && typeof item === "object" ? item : {};
      const id = typeof source.id === "string" && source.id.trim() ? source.id.trim().slice(0, 80) : `prompt-v${index + 1}`;
      return {
        id,
        label: String(source.label || `V${index + 1}`).trim().slice(0, 40),
        prompt: String(source.prompt || "").trim().slice(0, 16000),
        deliveryMode: SHOT_DELIVERY_MODES.has(source.deliveryMode) ? source.deliveryMode : "seedance15",
        targetModel: SHOT_TARGET_MODELS.has(source.targetModel) ? source.targetModel : "general",
        assetIds: normalizeStringList(source.assetIds, 12),
        note: String(source.note || "").trim().slice(0, 180),
        createdAt: typeof source.createdAt === "string" ? source.createdAt : ""
      };
    }).filter((item) => item.prompt && !seen.has(item.id) && seen.add(item.id)).slice(0, 20);
  }

  function shotDeliveryLabel(value) {
    return value === "still" ? "静帧生图" : value === "seedance30" ? "30 秒运镜" : "15 秒运镜";
  }

  function createShotPromptVersion(project, scene, shot, now = new Date()) {
    const normalizedShot = normalizeSceneShot(shot, 0);
    const versions = normalizeShotPromptVersions(normalizedShot.promptVersions);
    const sequence = versions.length + 1;
    const id = `prompt-v${sequence}-${now instanceof Date ? now.getTime() : Date.now()}`;
    const assets = assetLocksApi?.assetsForScene ? assetLocksApi.assetsForScene(project, scene).assets : [];
    const version = {
      id,
      label: `V${sequence}`,
      prompt: buildSceneShotPrompt(project, scene, normalizedShot),
      deliveryMode: normalizedShot.deliveryMode,
      targetModel: normalizedShot.targetModel,
      assetIds: assets.map((asset) => asset.id),
      note: "正式镜头提示词快照",
      createdAt: now instanceof Date ? now.toISOString() : ""
    };
    return { ...normalizedShot, promptVersions: [...versions, version], activePromptVersionId: version.id };
  }

  function normalizeShotPromptCard(value) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      narrative: String(source.narrative || "").trim().slice(0, 280),
      action: String(source.action || "").trim().slice(0, 280),
      performance: String(source.performance || "").trim().slice(0, 220),
      framing: String(source.framing || "").trim().slice(0, 160),
      movement: String(source.movement || "").trim().slice(0, 180),
      beatPlan: String(source.beatPlan || "").trim().slice(0, 280),
      sound: String(source.sound || "").trim().slice(0, 280)
    };
  }

  function normalizeSceneAssistant(value) {
    return sceneAssistantApi?.normalizeSceneAssistant ? sceneAssistantApi.normalizeSceneAssistant(value) : { dialogueLines: [], voiceOverLines: [], lipSyncEnabled: false, selectedReferences: {} };
  }

  function normalizeSceneVideoCard(value) {
    return sceneVideoApi?.normalizeSceneVideoCard
      ? sceneVideoApi.normalizeSceneVideoCard(value)
      : { narrative: "", characters: "", emotion: "", performance: "", action: "", setting: "", time: "", props: "", color: "", lighting: "", cameraTexture: "", framing: "", movement: "", beatPlan: "", dialogue: "", lipSync: false, sound: "不要背景音乐，只保留环境声与多层空间氛围。", negatives: "不要字幕，不要水印，不要身份漂移，不要塑料皮肤，不要空间跳变。" };
  }

  function normalizeScreenplay(value) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      title: String(source.title || "").trim().slice(0, 120),
      sourceType: normalizeScreenplaySourceType(source.sourceType),
      sourceFileName: String(source.sourceFileName || "").trim().slice(0, 240),
      rawText: String(source.rawText || "").replace(/\r\n?/g, "\n").trim().slice(0, SCREENPLAY_RAW_TEXT_LIMIT),
      updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : "",
      versions: Array.isArray(source.versions)
        ? source.versions.slice(0, SCREENPLAY_VERSION_LIMIT).map(normalizeScreenplayVersion)
        : []
    };
  }

  function normalizeScreenplayVersion(value) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      title: String(source.title || "").trim().slice(0, 120),
      sourceType: normalizeScreenplaySourceType(source.sourceType),
      sourceFileName: String(source.sourceFileName || "").trim().slice(0, 240),
      rawText: String(source.rawText || "").replace(/\r\n?/g, "\n").trim().slice(0, SCREENPLAY_RAW_TEXT_LIMIT),
      updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : ""
    };
  }

  function normalizeScreenplaySourceType(value) {
    return SCREENPLAY_SOURCE_TYPES.has(value) ? value : "paste";
  }

  function sceneHeadingParts(line, fallbackNumber) {
    const text = String(line || "").trim();
    const chineseMatch = text.match(/^(?:第\s*([0-9一二三四五六七八九十百]+)\s*场|场次?\s*([0-9]+))\s*(.*)$/i);
    const latinMatch = chineseMatch ? null : text.match(/^(?:(INT|EXT)\.?)\s*(.*)$/i);
    if (!chineseMatch && !latinMatch) return null;
    const number = Number(chineseMatch?.[1] || chineseMatch?.[2]);
    const remainder = String(chineseMatch?.[3] || latinMatch?.[2] || "").trim();
    const timeMatch = remainder.match(/(清晨|早晨|上午|中午|午后|傍晚|黄昏|夜晚|冬夜|雨夜|凌晨|白天|深夜|夜|日)\s*$/);
    const time = timeMatch ? timeMatch[1] : "";
    const withoutTime = timeMatch ? remainder.slice(0, timeMatch.index).trim() : remainder;
    const setting = withoutTime.replace(/^(内景|外景|INT\.?|EXT\.?)\s*/i, "").trim();
    return {
      number: Number.isInteger(number) && number >= 1 && number <= 999 ? number : null,
      title: setting || `待确认场次 ${String(fallbackNumber).padStart(2, "0")}`,
      setting: [/(内景|INT)/i.test(remainder) ? "内景" : /(外景|EXT)/i.test(remainder) ? "外景" : "", setting].filter(Boolean).join(" · "),
      time
    };
  }

  function assignParsedSceneNumbers(blocks) {
    let lastNumber = 0;
    return blocks.map((block, index) => {
      const candidate = Number(block.number);
      const remaining = blocks.length - index - 1;
      const canPreserve = Number.isInteger(candidate)
        && candidate > lastNumber
        && candidate <= 999 - remaining;
      const number = canPreserve ? candidate : lastNumber + 1;
      lastNumber = number;
      return { ...block, number };
    });
  }

  function screenplayShotLines(body) {
    const sentences = String(body || "")
      .replace(/\r\n?/g, "\n")
      .split(/[。！？!?；;\n]+/)
      .map((line) => line.trim())
      .filter(Boolean);
    const clauses = sentences.flatMap((sentence) => sentence.length > 34
      ? sentence.split(/[，、]/).map((part) => part.trim()).filter((part) => part.length >= 4)
      : [sentence]);
    return (clauses.length ? clauses : ["补充本场第一条可见动作与情绪落点。"]).slice(0, SHOT_LIMIT);
  }

  function screenplayShotDuration(line) {
    const characters = Array.from(String(line || "").replace(/\s/g, "")).length;
    return Math.max(5, Math.min(15, 5 + Math.ceil(characters / 5)));
  }

  function screenplayShotDrafts(body, sceneIndex) {
    const lines = screenplayShotLines(body);
    return lines.map((line, index) => {
      const isEstablishing = index === 0;
      const isFinal = index === lines.length - 1;

      // 导演级关键词识别
      const isCloseUp = /看|望|眼|脸|表情|泪|笑|惊|怒|意识到/.test(line);
      const isAction = /走|跑|跳|打|推|拉|夺|拿|放|离开|进入/.test(line);
      const isTense = /急|快|危险|逼近|屏息|颤抖/.test(line);

      let framing = isEstablishing ? "中景，先建立人物与空间关系" : "中近景，清楚捕捉关键动作与情绪";
      if (isCloseUp) framing = "特写或近景，聚焦人物眼神与面部微表情";
      if (isAction && !isEstablishing) framing = "中景或全景，完整捕捉肢体动作与空间关系";

      let movement = isEstablishing ? "稳定观察，动作开始后再有动机地推进" : isFinal ? "克制推进，停在信息或情绪落点" : "跟随人物动作，保持空间方向连续";
      if (isTense) movement = "手持感晃动或快速推进，增加临场压力";
      if (isAction && !isTense) movement = "横移跟随或环绕，保持动感与主体完整";

      let performance = "自然呼吸、视线和微小身体反应，避免夸张表演。";
      if (isTense) performance = "呼吸急促，眼神不时游移，身体紧绷，通过微动作传达压力。";
      if (isCloseUp) performance = "控制面部肌肉，先有心理反应，再有视线流转，停在明确情绪点。";

      return {
        id: `script-shot-${sceneIndex + 1}-${index + 1}`,
        durationSeconds: screenplayShotDuration(line),
        framing,
        movement,
        performance,
        sound: isTense ? "低频氛围压迫感，保留呼吸与关键动作音效。" : "不要背景音乐，只保留环境声与多层空间氛围。",
        status: "planned",
        promptCard: { narrative: line, action: line },
        negativeConstraints: []
      };
    });
  }

  function parseScreenplayIntoScenes(rawText) {
    const text = String(rawText || "").replace(/\r\n?/g, "\n").trim().slice(0, SCREENPLAY_RAW_TEXT_LIMIT);
    if (!text) return [];
    const lines = text.split("\n");
    const blocks = [];
    const preamble = [];
    let current = null;
    lines.forEach((line) => {
      const heading = sceneHeadingParts(line, blocks.length + 1);
      if (heading) {
        if (!current && preamble.length) {
          blocks.push({
            number: null,
            title: `原始段落 ${String(blocks.length + 1).padStart(2, "0")}`,
            setting: "",
            time: "",
            body: preamble
          });
        }
        if (current) blocks.push(current);
        current = { ...heading, body: [] };
      } else if (line.trim()) {
        if (current) current.body.push(line.trim());
        else preamble.push(line.trim());
      }
    });
    if (current) blocks.push(current);
    const sourceBlocks = blocks.length ? blocks : text.split(/\n\s*\n+/).map((body, index) => ({
      number: null,
      title: `原始段落 ${String(index + 1).padStart(2, "0")}`,
      setting: "",
      time: "",
      body: [body.trim()]
    })).filter((block) => block.body[0]);
    return normalizeProjectScenes(assignParsedSceneNumbers(sourceBlocks.slice(0, SCENE_LIMIT)).map((block, index) => {
      const storyBeat = block.body.join("\n").slice(0, 280);
      const shots = screenplayShotDrafts(storyBeat, index);
      return {
        id: `script-scene-${index + 1}`,
        number: block.number,
        title: block.title,
        setting: block.setting,
        time: block.time,
        storyBeat,
        sourceExcerpt: storyBeat,
        characters: [],
        emotion: "",
        action: "",
        visualOverride: {},
        estimatedDurationSeconds: shots.reduce((total, shot) => total + shot.durationSeconds, 0),
        shots,
        status: "draft"
      };
    }));
  }

  function sceneDurationWeight(scene) {
    const textLength = Array.from(String(scene?.storyBeat || "").replace(/\s/g, "")).length;
    const dialogueWeight = (sceneAssistantApi?.extractSceneCandidates?.(scene)?.dialogueLines?.length || 0) * 18;
    return Math.max(1, textLength + dialogueWeight);
  }

  function allocateSceneDurations(scenes, totalSeconds) {
    const target = normalizeDuration(totalSeconds);
    if (!target || !scenes.length) return scenes.map((scene) => Number(scene.estimatedDurationSeconds || 0));
    const maximumPerScene = SHOT_LIMIT * 30;
    const usableTarget = Math.max(scenes.length * 5, Math.min(target, scenes.length * maximumPerScene));
    const weights = scenes.map(sceneDurationWeight);
    const weightTotal = weights.reduce((total, weight) => total + weight, 0);
    const drafts = weights.map((weight, index) => {
      const exact = usableTarget * weight / weightTotal;
      return { index, fraction: exact - Math.floor(exact), value: Math.max(5, Math.min(maximumPerScene, Math.floor(exact))) };
    });
    let difference = usableTarget - drafts.reduce((total, item) => total + item.value, 0);
    const order = [...drafts].sort((left, right) => difference >= 0
      ? right.fraction - left.fraction || left.index - right.index
      : left.fraction - right.fraction || right.index - left.index);
    let cursor = 0;
    while (difference !== 0 && order.length) {
      const item = order[cursor % order.length];
      if (difference > 0 && item.value < maximumPerScene) { item.value += 1; difference -= 1; }
      if (difference < 0 && item.value > 5) { item.value -= 1; difference += 1; }
      cursor += 1;
      if (cursor > usableTarget * 3) break;
    }
    return drafts.sort((left, right) => left.index - right.index).map((item) => item.value);
  }

  function allocateShotDurations(totalSeconds, shotCount) {
    const count = Math.max(1, Math.min(SHOT_LIMIT, Number(shotCount || 1)));
    const total = Math.max(count * 5, Math.min(count * 30, Math.round(Number(totalSeconds || count * 15))));
    const base = Math.floor(total / count);
    let remainder = total - base * count;
    return Array.from({ length: count }, () => base + (remainder-- > 0 ? 1 : 0));
  }

  function extraShotNarrative(scene, index, count) {
    const story = String(scene?.storyBeat || "本场行动").replace(/\s+/g, " ").trim();
    if (index === 0) return `建立${scene?.setting || "本场空间"}，交代人物与行动起点。`;
    if (index === count - 1) return `停在本场的信息或情绪落点：${story.slice(-100)}`;
    return `推进本场行动与空间关系：${story.slice(0, 160)}`;
  }

  function expandSceneShotDrafts(scene, plannedSeconds, sceneIndex) {
    const baseShots = Array.isArray(scene?.shots) && scene.shots.length ? scene.shots : screenplayShotDrafts(scene?.storyBeat, sceneIndex);
    const targetCount = Math.max(baseShots.length, Math.ceil(plannedSeconds / 15), Math.ceil(plannedSeconds / 30));
    const shotCount = Math.min(SHOT_LIMIT, targetCount);
    const durations = allocateShotDurations(plannedSeconds, shotCount);
    return durations.map((durationSeconds, index) => {
      const source = baseShots[index] || {};
      const narrative = source.promptCard?.narrative || extraShotNarrative(scene, index, shotCount);
      const isFirst = index === 0;
      const isLast = index === shotCount - 1;
      return {
        ...source,
        id: source.id || `planned-shot-${sceneIndex + 1}-${index + 1}`,
        durationSeconds,
        framing: source.framing || (isFirst ? "中景，建立人物与空间关系" : "中近景，清楚交代动作与情绪"),
        movement: source.movement || (isFirst ? "稳定观察，动作开始后再有动机地推进" : isLast ? "克制推进，停在情绪或信息落点" : "跟随人物动作，保持空间方向连续"),
        performance: source.performance || "自然呼吸、视线与微小身体反应，避免夸张表演。",
        sound: source.sound || "不要背景音乐，只保留环境声与多层空间氛围。",
        status: SHOT_STATUSES.has(source.status) ? source.status : "planned",
        promptCard: { ...(source.promptCard || {}), narrative, action: source.promptCard?.action || narrative }
      };
    });
  }

  function applyProjectDurationToScenes(scenes, project) {
    const target = normalizeDuration(project?.productionMeta?.estimatedDurationSeconds);
    if (!target) return scenes;
    const durations = allocateSceneDurations(scenes, target);
    return scenes.map((scene, index) => {
      const estimatedDurationSeconds = durations[index];
      return { ...scene, estimatedDurationSeconds, shots: expandSceneShotDrafts(scene, estimatedDurationSeconds, index) };
    });
  }

  function normalizeProjectScenes(value) {
    const source = Array.isArray(value) ? value : [];
    const ids = new Set();
    return source.slice(0, SCENE_LIMIT).map((item, index) => {
      const scene = item && typeof item === "object" && !Array.isArray(item) ? item : {};
      const baseId = typeof scene.id === "string" && scene.id.trim() ? scene.id.trim().slice(0, 80) : `scene-${index + 1}`;
      const id = ids.has(baseId) ? `${baseId}-${index + 1}` : baseId;
      ids.add(id);
      const number = Number(scene.number);
      return {
        id,
        number: Number.isInteger(number) && number >= 1 && number <= 999 ? number : index + 1,
        title: String(scene.title || "").trim().slice(0, 100),
        setting: String(scene.setting || "").trim().slice(0, 220),
        time: String(scene.time || "").trim().slice(0, 60),
        storyBeat: String(scene.storyBeat || "").trim().slice(0, 280),
        sourceExcerpt: String(scene.sourceExcerpt || scene.storyBeat || "").trim().slice(0, 600),
        characters: normalizeStringList(scene.characters, 12),
        emotion: String(scene.emotion || "").trim().slice(0, 160),
        action: String(scene.action || "").trim().slice(0, 280),
        assetIds: assetLocksApi?.normalizeSceneAssetIds ? assetLocksApi.normalizeSceneAssetIds(scene.assetIds) : normalizeStringList(scene.assetIds, 12),
        assistant: normalizeSceneAssistant(scene.assistant),
        videoCard: normalizeSceneVideoCard(scene.videoCard),
        visualOverride: {
          colorDirection: String(scene.visualOverride?.colorDirection || "").trim().slice(0, 220),
          lightingDirection: String(scene.visualOverride?.lightingDirection || "").trim().slice(0, 220),
          cameraDirection: String(scene.visualOverride?.cameraDirection || "").trim().slice(0, 220)
        },
        estimatedDurationSeconds: Number.isFinite(Number(scene.estimatedDurationSeconds))
          ? Math.max(0, Math.min(3600, Math.round(Number(scene.estimatedDurationSeconds))))
          : 0,
        shots: (Array.isArray(scene.shots) ? scene.shots : []).slice(0, SHOT_LIMIT).map(normalizeSceneShot),
        status: scene.status === "approved" ? "approved" : "draft"
      };
    });
  }

  function buildSceneShotPrompt(project, scene, shot) {
    const projectName = String(project?.name || "未命名电影项目").trim();
    const brief = normalizeCreativeBrief(project?.creativeBrief);
    const bible = normalizeVisualBible(project?.visualBible);
    const sceneData = normalizeProjectScenes([scene])[0] || normalizeProjectScenes([{}])[0];
    const shotData = normalizeSceneShot(shot, 0);
    const shotCard = shotData.promptCard || {};
    const visual = sceneData.visualOverride || {};
    const director = sceneData.assistant?.directorAnalysis || {};
    const negatives = [...bible.negativeConstraints, ...shotData.negativeConstraints];
    const sceneNumber = String(sceneData.number || 1).padStart(2, "0");
    const shotIndex = Math.max(0, sceneData.shots.findIndex((item) => item.id === shotData.id));
    const shotNumber = String(shotIndex + 1).padStart(2, "0");
    const lockedAssets = assetLocksApi?.assetsForScene ? assetLocksApi.assetsForScene(project, sceneData).prompt : "";
    const timing = shotData.deliveryMode === "seedance30"
      ? [`【0-10秒｜建立】${shotCard.narrative || sceneData.storyBeat || "建立人物与空间关系"}`, `【10-20秒｜推进】${shotCard.action || sceneData.action || "以可见动作推进叙事"}`, `【20-30秒｜落点】${shotCard.performance || sceneData.emotion || "停在明确情绪或动作落点"}`]
      : shotData.deliveryMode === "seedance15"
        ? [`【0-5秒｜建立】${shotCard.narrative || sceneData.storyBeat || "建立人物与空间关系"}`, `【5-10秒｜推进】${shotCard.action || sceneData.action || "以可见动作推进叙事"}`, `【10-15秒｜落点】${shotCard.performance || sceneData.emotion || "停在明确情绪或动作落点"}`]
        : [`【静帧画面】${shotCard.narrative || sceneData.storyBeat || "建立单张可生成的关键画面"}`];
    return [
      `【项目】${projectName}｜第 ${sceneNumber} 场${sceneData.title ? `：${sceneData.title}` : ""}`,
      `【镜头编号】场 ${sceneNumber} · 镜 ${shotNumber}`,
      sceneData.sourceExcerpt ? `【剧本原文依据】${sceneData.sourceExcerpt}` : "",
      `【叙事】${[sceneData.setting, sceneData.time, shotCard.narrative || sceneData.storyBeat].filter(Boolean).join("；") || "补充本场地点、时间与剧情目的。"}`,
      director.dramaticFunction ? `【戏剧任务】${director.dramaticFunction}` : "",
      `【人物】${[sceneData.characters.join("、"), sceneData.emotion, shotCard.action || sceneData.action].filter(Boolean).join("；") || "补充出场人物、情绪和动作表演。"}`,
      lockedAssets ? `【锁定资产】${lockedAssets}` : "",
      director.directorialIntent ? `【导演意图】${director.directorialIntent}` : "",
      `【交付模式】${shotDeliveryLabel(shotData.deliveryMode)}｜${shotData.durationSeconds} 秒`,
      `【镜头】${[shotCard.framing || shotData.framing, shotCard.movement || shotData.movement, shotCard.performance || shotData.performance].filter(Boolean).join("；") || "补充景别、运镜与表演节奏。"}`,
      ...timing,
      `【影调与材质】${[bible.mood, visual.colorDirection || bible.colorDirection, visual.lightingDirection || bible.lightingDirection, visual.cameraDirection || bible.cameraDirection, bible.materialDirection, director.visualStrategy].filter(Boolean).join("；") || "继承项目视觉圣经。"}`,
      director.shotStrategy ? `【镜头策略】${director.shotStrategy}` : "",
      `【世界设定】${[brief.era, brief.region].filter(Boolean).join("；") || ""}`,
      `【声音】${shotCard.sound || shotData.sound || "不要背景音乐，只保留环境声与多层空间氛围。"}`,
      `【限制】${[...new Set(["不要字幕", "不要水印", ...negatives])].join("；")}`
    ].filter((line) => !line.endsWith("】")).join("\n");
  }

  function normalizeProject(project, fallbackId) {
    const source = project && typeof project === "object" && !Array.isArray(project) ? project : {};
    return {
      ...source,
      id: typeof source.id === "string" && source.id ? source.id : fallbackId,
      name: typeof source.name === "string" && source.name.trim()
        ? source.name.trim().slice(0, 60)
        : "未命名电影项目",
      favorite: source.favorite === true,
      activeWorkspace: normalizeWorkspace(source.activeWorkspace),
      workspaces: source.workspaces && typeof source.workspaces === "object" && !Array.isArray(source.workspaces)
        ? source.workspaces
        : {},
      creativeBrief: normalizeCreativeBrief(source.creativeBrief),
      visualBible: normalizeVisualBible(source.visualBible),
      assetLocks: assetLocksApi?.normalizeAssetLocks ? assetLocksApi.normalizeAssetLocks(source.assetLocks) : [],
      scenes: normalizeProjectScenes(source.scenes),
      screenplay: normalizeScreenplay(source.screenplay),
      productionMeta: {
        type: typeof source.productionMeta?.type === "string" ? source.productionMeta.type : "drama",
        aspectRatio: typeof source.productionMeta?.aspectRatio === "string" ? source.productionMeta.aspectRatio : "16:9",
        estimatedDurationSeconds: normalizeDuration(source.productionMeta?.estimatedDurationSeconds)
      }
    };
  }

  function normalizeProjectStore(raw, { createBlankProject } = {}) {
    if (typeof createBlankProject !== "function") throw new TypeError("缺少空项目创建方法。");
    const validLibrary = Boolean(raw && typeof raw === "object" && Array.isArray(raw.projects) && raw.projects.length > 0);
    const sourceProjects = validLibrary ? raw.projects : [createBlankProject("未命名电影项目")];
    const projects = sourceProjects.map((project, index) => normalizeProject(project, `project-${index + 1}`));
    const projectIds = new Set(projects.map((project) => project.id));
    const activeProjectId = projectIds.has(raw?.activeProjectId) ? raw.activeProjectId : projects[0].id;
    const view = raw?.dashboardView && typeof raw.dashboardView === "object" ? raw.dashboardView : {};

    return {
      ...(validLibrary ? raw : {}),
      schemaVersion: PROJECT_STORE_SCHEMA_VERSION,
      onboardingComplete: validLibrary ? raw.onboardingComplete !== false : false,
      activeProjectId,
      projects,
      dashboardView: {
        category: CATEGORIES.has(view.category) ? view.category : DEFAULT_DASHBOARD_VIEW.category,
        sort: SORTS.has(view.sort) ? view.sort : DEFAULT_DASHBOARD_VIEW.sort,
        search: typeof view.search === "string" ? view.search.slice(0, 80) : DEFAULT_DASHBOARD_VIEW.search,
        selectedProjectId: projectIds.has(view.selectedProjectId) ? view.selectedProjectId : activeProjectId,
        scrollTop: Number.isFinite(view.scrollTop) && view.scrollTop >= 0 ? Math.round(view.scrollTop) : 0
      }
    };
  }

  function clone(store) {
    return JSON.parse(JSON.stringify(store));
  }

  function normalizeProjectFields(fields) {
    const name = String(fields?.name || "").trim().slice(0, 60);
    if (!name) throw new Error("请输入项目名称。");
    return {
      name,
      productionMeta: {
        type: typeof fields?.type === "string" && fields.type ? fields.type : "drama",
        aspectRatio: typeof fields?.aspectRatio === "string" && fields.aspectRatio ? fields.aspectRatio : "16:9",
        estimatedDurationSeconds: normalizeDuration(fields?.estimatedDurationSeconds)
      }
    };
  }

  function completeOnboarding(store, fields, now) {
    const next = clone(store);
    const project = next.projects.find((item) => item.id === next.activeProjectId) || next.projects[0];
    const normalized = normalizeProjectFields(fields);
    project.name = normalized.name;
    project.productionMeta = normalized.productionMeta;
    project.updatedAt = now;
    next.onboardingComplete = true;
    return next;
  }

  function patchDashboardView(store, patch) {
    const next = clone(store);
    next.dashboardView = { ...next.dashboardView, ...(patch && typeof patch === "object" ? patch : {}) };
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

  function createProjectInStore(store, fields, { createBlankProject, now } = {}) {
    if (typeof createBlankProject !== "function") throw new TypeError("缺少空项目创建方法。");
    const next = clone(store);
    const normalized = normalizeProjectFields(fields);
    const project = normalizeProject(createBlankProject(normalized.name), `project-${Date.now()}`);
    project.name = normalized.name;
    project.productionMeta = normalized.productionMeta;
    project.createdAt = now;
    project.updatedAt = now;
    next.projects.push(project);
    next.activeProjectId = project.id;
    next.dashboardView.selectedProjectId = project.id;
    next.onboardingComplete = true;
    return next;
  }

  function patchProjectFoundation(store, projectId, patch, now) {
    const next = clone(store);
    const project = next.projects.find((item) => item.id === projectId);
    if (!project) return next;
    const sourcePatch = patch && typeof patch === "object" && !Array.isArray(patch) ? patch : {};
    if (sourcePatch.creativeBrief && typeof sourcePatch.creativeBrief === "object") {
      project.creativeBrief = normalizeCreativeBrief({ ...project.creativeBrief, ...sourcePatch.creativeBrief });
    }
    if (sourcePatch.visualBible && typeof sourcePatch.visualBible === "object") {
      project.visualBible = normalizeVisualBible({ ...project.visualBible, ...sourcePatch.visualBible });
    }
    project.updatedAt = now;
    return next;
  }

  function patchProjectScenes(store, projectId, scenes, now) {
    const next = clone(store);
    const project = next.projects.find((item) => item.id === projectId);
    if (!project) return next;
    project.scenes = normalizeProjectScenes(scenes);
    project.updatedAt = now;
    return next;
  }

  function replanProjectSceneDuration(store, projectId, estimatedDurationSeconds, now) {
    const next = clone(store);
    const project = next.projects.find((item) => item.id === projectId);
    if (!project) return next;
    const duration = normalizeDuration(estimatedDurationSeconds);
    if (!duration) return next;
    project.productionMeta = { ...project.productionMeta, estimatedDurationSeconds: duration };
    project.scenes = normalizeProjectScenes(applyProjectDurationToScenes(project.scenes, project));
    project.updatedAt = now;
    return next;
  }

  function patchProjectAssetLocks(store, projectId, assetLocks, scenes, now) {
    const next = clone(store);
    const project = next.projects.find((item) => item.id === projectId);
    if (!project) return next;
    project.assetLocks = assetLocksApi?.normalizeAssetLocks ? assetLocksApi.normalizeAssetLocks(assetLocks) : [];
    project.scenes = normalizeProjectScenes(scenes);
    project.updatedAt = now;
    return next;
  }

  function patchProjectScreenplay(store, projectId, rawText, now) {
    const next = clone(store);
    const project = next.projects.find((item) => item.id === projectId);
    if (!project) return next;
    const screenplay = normalizeScreenplay({ rawText, updatedAt: now });
    project.screenplay = screenplay;
    project.scenes = analyzeScreenplay(screenplay.rawText, project).scenes;
    project.updatedAt = now;
    return next;
  }

  function analyzeScreenplay(rawText, project) {
    const normalized = String(rawText || "").replace(/\r\n?/g, "\n").trim().slice(0, SCREENPLAY_RAW_TEXT_LIMIT);
    return { rawText: normalized, scenes: applyProjectDurationToScenes(parseScreenplayIntoScenes(normalized), project) };
  }

  function normalizedSceneValue(value) {
    return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
  }

  function sceneIdentity(scene) {
    return [scene?.title, scene?.setting, scene?.time].map(normalizedSceneValue).join("\u0000");
  }

  function scenesDiffer(existing, proposed) {
    return ["title", "setting", "time", "storyBeat"].some((field) => normalizedSceneValue(existing?.[field]) !== normalizedSceneValue(proposed?.[field]));
  }

  function sceneProtectionReasons(scene) {
    const reasons = [];
    if (Array.isArray(scene?.assetIds) && scene.assetIds.length) reasons.push("已绑定角色、场景或道具资产");
    if (scene?.status === "approved") reasons.push("场次已经锁定");
    if (Array.isArray(scene?.shots) && scene.shots.some((shot) => shot?.status && shot.status !== "planned")) reasons.push("已有镜头制作状态");
    if (Array.isArray(scene?.shots) && scene.shots.some((shot) => {
      const card = shot?.promptCard || {};
      return Boolean(card.framing || card.movement || card.performance || card.beatPlan || card.sound)
        || Boolean(card.action && card.action !== card.narrative);
    })) reasons.push("已有镜头提示词");
    if (["narrative", "characters", "emotion", "performance", "action", "setting", "color", "lighting", "cameraTexture", "framing", "movement", "beatPlan", "dialogue"].some((field) => String(scene?.videoCard?.[field] || "").trim())) reasons.push("已有场次提示词");
    if (scene?.assistant?.directorAnalysis?.source === "imported") reasons.push("已有导演分析");
    return reasons;
  }

  function buildScreenplayReanalysis(project, proposedScenes) {
    const existing = normalizeProjectScenes(project?.scenes);
    const proposed = normalizeProjectScenes(proposedScenes);
    const unmatchedExisting = new Set(existing.map((_, index) => index));
    const matches = new Map();

    proposed.forEach((scene, proposedIndex) => {
      const identity = sceneIdentity(scene);
      const existingIndex = existing.findIndex((candidate, index) => unmatchedExisting.has(index)
        && sceneIdentity(candidate) === identity);
      if (existingIndex >= 0) {
        unmatchedExisting.delete(existingIndex);
        matches.set(proposedIndex, existingIndex);
      }
    });

    proposed.forEach((scene, proposedIndex) => {
      if (matches.has(proposedIndex)) return;
      const existingIndex = existing.findIndex((candidate, index) => unmatchedExisting.has(index) && candidate.number === scene.number);
      if (existingIndex >= 0) {
        unmatchedExisting.delete(existingIndex);
        matches.set(proposedIndex, existingIndex);
      }
    });

    const decisions = [];
    proposed.forEach((scene, proposedIndex) => {
      const existingIndex = matches.get(proposedIndex);
      if (existingIndex === undefined) {
        decisions.push({ proposedSceneId: scene.id, existingSceneId: "", kind: "add", action: "add", protected: false, reasons: [] });
        return;
      }
      const current = existing[existingIndex];
      const changed = scenesDiffer(current, scene);
      const reasons = sceneProtectionReasons(current);
      decisions.push({
        proposedSceneId: scene.id,
        existingSceneId: current.id,
        kind: changed ? "update" : "retained",
        action: changed ? "update-story" : "keep-existing",
        protected: reasons.length > 0,
        reasons: changed ? reasons : ["剧本内容未变化", ...reasons]
      });
    });
    unmatchedExisting.forEach((existingIndex) => {
      const current = existing[existingIndex];
      const reasons = sceneProtectionReasons(current);
      decisions.push({
        proposedSceneId: "",
        existingSceneId: current.id,
        kind: "retained",
        action: "keep-existing",
        protected: reasons.length > 0,
        reasons: ["新剧本未出现本场", ...reasons]
      });
    });

    const summary = {
      added: decisions.filter((decision) => decision.kind === "add").length,
      updated: decisions.filter((decision) => decision.kind === "update").length,
      retained: decisions.filter((decision) => decision.kind === "retained").length,
      protected: decisions.filter((decision) => decision.protected).length,
      total: proposed.length
    };
    return { existing, scenes: proposed, decisions, summary };
  }

  function normalizeScreenplayDecisions(value, defaultDecisions) {
    const candidates = Array.isArray(value) ? value : [];
    const selected = new Map();
    candidates.forEach((candidate) => {
      if (!candidate || typeof candidate !== "object") return;
      const key = `${String(candidate.proposedSceneId || "")}\u0000${String(candidate.existingSceneId || "")}`;
      selected.set(key, candidate.action);
    });
    return defaultDecisions.map((decision) => {
      const key = `${decision.proposedSceneId}\u0000${decision.existingSceneId}`;
      const action = selected.get(key);
      const allowed = decision.kind === "add"
        ? new Set(["add", "skip-proposed"])
        : decision.kind === "update"
          ? new Set(["update-story", "keep-existing"])
          : new Set(["keep-existing"]);
      return { ...decision, action: allowed.has(action) ? action : decision.action };
    });
  }

  function mergeStoryFields(existingScene, proposedScene) {
    return {
      ...existingScene,
      number: proposedScene.number,
      title: proposedScene.title,
      setting: proposedScene.setting,
      time: proposedScene.time,
      storyBeat: proposedScene.storyBeat,
      sourceExcerpt: proposedScene.sourceExcerpt,
      emotion: proposedScene.emotion,
      action: proposedScene.action
    };
  }

  function previewScreenplayReanalysis(project, rawText, proposedScenes) {
    const analysis = Array.isArray(proposedScenes)
      ? { rawText: String(rawText || "").replace(/\r\n?/g, "\n").trim().slice(0, SCREENPLAY_RAW_TEXT_LIMIT), scenes: applyProjectDurationToScenes(proposedScenes, project) }
      : analyzeScreenplay(rawText, project);
    const reanalysis = buildScreenplayReanalysis(project, analysis.scenes);
    return {
      ...analysis,
      scenes: reanalysis.scenes,
      decisions: reanalysis.decisions,
      summary: reanalysis.summary
    };
  }

  function applyScreenplayAnalysis(store, projectId, analysis, now) {
    const next = clone(store);
    const project = next.projects.find((item) => item.id === projectId);
    if (!project) return next;
    const current = normalizeScreenplay(project.screenplay);
    const source = analysis?.source && typeof analysis.source === "object" && !Array.isArray(analysis.source) ? analysis.source : current;
    const rawText = String(analysis?.rawText || "").replace(/\r\n?/g, "\n").trim().slice(0, SCREENPLAY_RAW_TEXT_LIMIT);
    const versions = current.rawText
      ? [normalizeScreenplayVersion(current), ...current.versions].slice(0, SCREENPLAY_VERSION_LIMIT)
      : current.versions;
    project.screenplay = normalizeScreenplay({ ...source, rawText, updatedAt: now, versions });
    const proposedScenes = Array.isArray(analysis?.scenes)
      ? normalizeProjectScenes(analysis.scenes)
      : parseScreenplayIntoScenes(rawText);
    const reanalysis = buildScreenplayReanalysis(project, proposedScenes);
    const decisions = normalizeScreenplayDecisions(analysis?.decisions, reanalysis.decisions);
    const proposedById = new Map(reanalysis.scenes.map((scene) => [scene.id, scene]));
    const decisionByExistingId = new Map(decisions.filter((decision) => decision.existingSceneId).map((decision) => [decision.existingSceneId, decision]));
    const nextScenes = reanalysis.existing.map((scene) => {
      const decision = decisionByExistingId.get(scene.id);
      if (decision?.action !== "update-story") return scene;
      const proposed = proposedById.get(decision.proposedSceneId);
      return proposed ? mergeStoryFields(scene, proposed) : scene;
    });
    decisions.filter((decision) => decision.kind === "add" && decision.action === "add").forEach((decision) => {
      const proposed = proposedById.get(decision.proposedSceneId);
      if (proposed) nextScenes.push(proposed);
    });
    project.scenes = normalizeProjectScenes(nextScenes);
    project.updatedAt = now;
    return next;
  }

  function clearProjectScreenplay(store, projectId, now) {
    const next = clone(store);
    const project = next.projects.find((item) => item.id === projectId);
    if (!project) return next;
    project.screenplay = normalizeScreenplay({ updatedAt: now });
    project.updatedAt = now;
    return next;
  }

  function setVisualBibleStatus(store, projectId, status, now) {
    return patchProjectFoundation(store, projectId, {
      visualBible: { status, updatedAt: now }
    }, now);
  }

  function lockVisualBible(store, projectId, now) {
    return setVisualBibleStatus(store, projectId, "locked", now);
  }

  function unlockVisualBible(store, projectId, now) {
    return setVisualBibleStatus(store, projectId, "draft", now);
  }

  const api = {
    PROJECT_STORE_SCHEMA_VERSION,
    WORKSPACE_IDS,
    DEFAULT_DASHBOARD_VIEW,
    normalizeCreativeBrief,
    normalizeVisualBible,
    normalizeScreenplay,
    normalizeProjectScenes,
    normalizeSceneShot,
    normalizeShotPromptVersions,
    shotDeliveryLabel,
    createShotPromptVersion,
    parseScreenplayIntoScenes,
    analyzeScreenplay,
    previewScreenplayReanalysis,
    sceneProtectionReasons,
    normalizeScreenplayDecisions,
    mergeStoryFields,
    applyScreenplayAnalysis,
    clearProjectScreenplay,
    patchProjectScenes,
    replanProjectSceneDuration,
    patchProjectAssetLocks,
    patchProjectScreenplay,
    buildSceneShotPrompt,
    normalizeProjectStore,
    completeOnboarding,
    createProjectInStore,
    patchDashboardView,
    toggleProjectFavorite,
    patchProjectFoundation,
    lockVisualBible,
    unlockVisualBible
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.aigcProjectStore = api;
})(typeof window !== "undefined" ? window : globalThis);
