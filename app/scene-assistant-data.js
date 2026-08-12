(function initSceneAssistantData(root) {
  const DIMENSIONS = Object.freeze(["color", "lighting", "camera", "framing", "performance", "movement"]);
  const SCENE_REFERENCE_LIBRARY = Object.freeze({
    color: [{ id: "cold-warm", label: "冷暖对比", prompt: "低饱和冷色环境与克制暖色人物光形成冷暖对比" }],
    lighting: [{ id: "window-soft", label: "柔和窗光", prompt: "大面积柔和窗光，白色反光板补光，保留自然暗部层次" }],
    camera: [{ id: "imax-65", label: "IMAX 65mm", prompt: "IMAX 65mm大画幅实拍电影质感，宽广动态范围，克制胶片颗粒" }],
    framing: [{ id: "close-up", label: "人物近景", prompt: "中近景，保留人物眼神、呼吸和关键动作的可读性" }],
    performance: [{ id: "held-breath", label: "克制停顿", prompt: "情绪克制，先停顿和呼吸变化，再以目光与微小动作推进" }],
    movement: [{ id: "slow-push", label: "缓慢推进", prompt: "摄影机以有动机的缓慢推进靠近人物，不做无意义变焦" }]
  });
  const ACTION_WORDS = ["握紧", "抬头", "转身", "停下", "走近", "后退", "奔跑", "推开", "放下", "拿起", "听见", "望向", "抱着", "穿过", "看向", "说", "问", "喊", "打开", "关上", "靠近", "离开"];
  const SUBJECT_MARKERS = ["把", "将", ...ACTION_WORDS];
  const PROP_WORDS = ["信封", "手机", "照片", "钥匙", "证物", "手枪", "箱子", "雨伞", "杯子", "门", "车", "信"];
  const EMOTION_WORDS = ["恐惧", "不安", "愤怒", "犹豫", "警觉", "悲伤", "紧张", "平静"];
  const DIRECTOR_ANALYSIS_FIELDS = Object.freeze([
    ["dramaticFunction", "本场戏剧任务", 140],
    ["characterObjective", "人物目标", 220],
    ["obstacle", "阻力 / 冲突", 220],
    ["turn", "本场转折", 220],
    ["audienceInformation", "观众获得的信息", 220],
    ["emotionalArc", "情绪走向", 180],
    ["directorialIntent", "导演意图", 280],
    ["visualStrategy", "影像策略", 280],
    ["shotStrategy", "镜头策略", 280]
  ]);
  const LOOK_SUGGESTIONS = Object.freeze([
    {
      id: "suspense-press",
      label: "悬疑逼近",
      color: "低饱和冷灰环境，局部暖光锁住人物与线索物件",
      lighting: "侧逆光与局部实景光，暗部保留线索层次",
      cameraTexture: "真实电影摄影，克制胶片颗粒，线索物件局部清晰",
      cues: ["不安", "警觉", "紧张", "恐惧", "听见", "照片", "门", "信封", "证物", "钥匙"]
    },
    {
      id: "observational-realism",
      label: "观察现实",
      color: "自然低饱和色彩，保留真实肤色、街景与材质关系",
      lighting: "符合空间动机的自然光影，反差克制",
      cameraTexture: "真实摄影机观察感，清楚保留人物与环境层次",
      cues: ["穿过", "走近", "奔跑", "街", "天桥", "便利店", "码头", "车", "离开"]
    },
    {
      id: "intimate-emotion",
      label: "情绪近观",
      color: "克制冷暖对比，人物肤色保留轻微暖意",
      lighting: "近距离柔和侧光，保留眼神、呼吸和面部细节",
      cameraTexture: "中近景电影质感，真实皮肤微纹理与细腻景深",
      cues: ["悲伤", "犹豫", "平静", "抬头", "望向", "看向", "停下", "回头"]
    }
  ]);
  const CAMERA_SUGGESTIONS = Object.freeze([
    {
      id: "clue-push",
      label: "线索缓推",
      framing: "中近景，人物与关键物件同框，留出线索所在的负空间",
      movement: "摄影机有动机地缓慢推进，停在线索物件或人物眼神的落点",
      cues: ["不安", "警觉", "紧张", "听见", "照片", "门", "信封", "证物", "钥匙"]
    },
    {
      id: "observational-follow",
      label: "观察跟随",
      framing: "中景，保留人物与完整空间关系，明确人物行进方向",
      movement: "稳定跟随人物穿过空间，动作结束时自然减速，不做无意义变焦",
      cues: ["穿过", "走近", "奔跑", "离开", "靠近", "抱着", "走", "街", "天桥"]
    },
    {
      id: "still-tension",
      label: "固定等待",
      framing: "中近景，人物置于画面一侧并保留可感知的负空间",
      movement: "固定构图，让人物动作、停顿或视线改变画面关系",
      cues: ["悲伤", "犹豫", "平静", "抬头", "望向", "看向", "说", "问", "停下"]
    }
  ]);
  function unique(values) { return Array.from(new Set(values.filter(Boolean))); }
  function cleanText(value, limit) { return String(value || "").replace(/\r\n?/g, "\n").trim().slice(0, limit); }
  function normalizeDirectorAnalysis(value) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const normalized = {
      source: source.source === "imported" ? "imported" : "manual",
      updatedAt: typeof source.updatedAt === "string" ? source.updatedAt.slice(0, 40) : ""
    };
    DIRECTOR_ANALYSIS_FIELDS.forEach(([key, , limit]) => { normalized[key] = cleanText(source[key], limit); });
    return normalized;
  }
  function normalizeSceneAssistant(value) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const selected = source.selectedReferences && typeof source.selectedReferences === "object" ? source.selectedReferences : {};
    const selectedReferences = {};
    DIMENSIONS.forEach((dimension) => { if (typeof selected[dimension] === "string" && selected[dimension].trim()) selectedReferences[dimension] = selected[dimension].trim().slice(0, 80); });
    return { dialogueLines: Array.isArray(source.dialogueLines) ? source.dialogueLines.filter((item) => item && typeof item.speaker === "string" && typeof item.text === "string").slice(0, 20).map((item) => ({ speaker: item.speaker.trim().slice(0, 40), text: item.text.trim().slice(0, 180) })) : [], voiceOverLines: Array.isArray(source.voiceOverLines) ? source.voiceOverLines.filter((item) => typeof item === "string" && item.trim()).slice(0, 20).map((item) => item.trim().slice(0, 180)) : [], lipSyncEnabled: source.lipSyncEnabled === true, selectedReferences, directorAnalysis: normalizeDirectorAnalysis(source.directorAnalysis) };
  }
  function sceneText(scene) {
    return [scene?.title, scene?.setting, scene?.storyBeat].filter(Boolean).join("\n");
  }
  function firstActionSentence(text) {
    return String(text).split(/[。！？\n]+/).map((item) => item.trim()).find((line) => ACTION_WORDS.some((word) => line.includes(word)))?.slice(0, 180) || "";
  }
  function extractSceneCandidates(scene) {
    const text = [scene?.title, scene?.setting, scene?.storyBeat].filter(Boolean).join("\n");
    const dialogueLines = [], voiceOverLines = [], characters = [];
    String(text).split("\n").forEach((line) => { const voice = line.match(/^(?:旁白|画外音)\s*[：:] *(.+)$/); const dialogue = line.match(/^([\u4e00-\u9fa5A-Za-z]{1,12})\s*[：:]\s*(.+)$/); if (voice) voiceOverLines.push(voice[1].trim()); else if (dialogue) { dialogueLines.push({ speaker: dialogue[1].trim(), text: dialogue[2].trim() }); characters.push(dialogue[1].trim()); } });
    const embeddedDialogue = new RegExp(`(?:^|[。！？\\n])\\s*([\\u4e00-\\u9fa5]{2,4}?)(?:${[...SUBJECT_MARKERS, "对"].join("|")})[^。！？\\n]{0,34}?(?:说|问|喊|低声道|回答|道)[：:]\\s*([^。！？\\n]+)`, "g");
    for (const match of String(text).matchAll(embeddedDialogue)) {
      dialogueLines.push({ speaker: match[1].trim(), text: match[2].trim().slice(0, 180) });
      characters.push(match[1].trim());
    }
    const subjectPattern = new RegExp(`(?:^|[。！？\\n])\\s*([\\u4e00-\\u9fa5]{2,4}?)(?=(?:${SUBJECT_MARKERS.join("|")}))`, "g");
    const nameMatches = [...String(text).matchAll(subjectPattern)].map((match) => match[1]);
    return {
      dialogueLines: unique(dialogueLines.map((item) => `${item.speaker}\u0000${item.text}`)).map((item) => { const [speaker, textValue] = item.split("\u0000"); return { speaker, text: textValue }; }),
      voiceOverLines: unique(voiceOverLines),
      characterCandidates: unique([...characters, ...nameMatches]),
      emotionCandidates: EMOTION_WORDS.filter((word) => text.includes(word)),
      actionCandidates: ACTION_WORDS.filter((word) => text.includes(word)).map((word) => `人物${word}`),
      actionSummary: firstActionSentence(sceneText(scene)),
      propCandidates: PROP_WORDS.filter((word) => text.includes(word))
    };
  }
  function buildSceneAssistantDraft(scene) {
    const candidates = extractSceneCandidates(scene);
    const dialogue = candidates.dialogueLines[0];
    const references = {
      performance: SCENE_REFERENCE_LIBRARY.performance[0],
      framing: SCENE_REFERENCE_LIBRARY.framing[0],
      movement: SCENE_REFERENCE_LIBRARY.movement[0]
    };
    const summary = [
      candidates.characterCandidates.length ? `人物：${candidates.characterCandidates.join("、")}` : "",
      candidates.emotionCandidates[0] ? `情绪：${candidates.emotionCandidates[0]}` : "",
      candidates.actionSummary ? `动作：${candidates.actionSummary}` : ""
    ].filter(Boolean).join("；");
    return {
      characters: candidates.characterCandidates.slice(0, 4),
      emotion: candidates.emotionCandidates[0] || "",
      action: candidates.actionSummary,
      dialogue: dialogue ? `${dialogue.speaker}：${dialogue.text}`.slice(0, 220) : "",
      props: candidates.propCandidates.slice(0, 5),
      references,
      summary
    };
  }
  function sourceCueText(scene, draft) {
    return [sceneText(scene), draft?.emotion, draft?.action, draft?.dialogue, ...(draft?.props || [])].filter(Boolean).join("\n");
  }
  function rankCreativeSuggestions(catalog, text) {
    const ranked = catalog.map((item, index) => {
      const hits = item.cues.filter((cue) => text.includes(cue));
      return { ...item, hits, score: hits.length, index };
    }).sort((left, right) => right.score - left.score || left.index - right.index);
    return ranked.map(({ cues, score, index, hits, ...item }) => ({
      ...item,
      reason: hits.length ? `根据原文中的“${hits.slice(0, 3).join("、")}”` : "作为本场可替换的通用起点"
    }));
  }
  function buildSceneCreativeSuggestions(scene, draft = buildSceneAssistantDraft(scene)) {
    const text = sourceCueText(scene, draft);
    return {
      looks: rankCreativeSuggestions(LOOK_SUGGESTIONS, text).slice(0, 3),
      cameras: rankCreativeSuggestions(CAMERA_SUGGESTIONS, text).slice(0, 3)
    };
  }
  function directorAnalysisSource(scene) {
    return [
      scene?.title ? `场次标题：${scene.title}` : "",
      scene?.setting ? `空间与时间：${scene.setting}${scene.time ? `，${scene.time}` : ""}` : "",
      scene?.characters?.length ? `已知人物：${scene.characters.join("、")}` : "",
      scene?.storyBeat ? `本场原文：${scene.storyBeat}` : ""
    ].filter(Boolean).join("\n");
  }
  function buildDirectorAnalysisPrompt(project, scene) {
    const projectName = cleanText(project?.name, 60) || "未命名影视项目";
    return [
      "你是一位兼具编剧、导演与摄影指导经验的影视创作顾问。请只根据提供的本场剧本，做可执行的导演分析；不要杜撰原文没有的剧情、人物关系或道具。",
      `【项目】${projectName}`,
      "【任务】先判断【本场戏剧任务】（这场戏为什么存在），再判断人物想要什么、受什么阻碍、如何发生转折，以及观众在这一场得到什么信息。最后给出能落实到分镜的影像与镜头策略。",
      directorAnalysisSource(scene) || "【本场原文】待补充",
      "【输出规则】只返回 JSON，不要 markdown，不要解释。所有值为简洁中文句子；没有根据时填写“待导演确认”。",
      '{"dramaticFunction":"","characterObjective":"","obstacle":"","turn":"","audienceInformation":"","emotionalArc":"","directorialIntent":"","visualStrategy":"","shotStrategy":""}',
      "【镜头策略要求】说明先建立什么、如何推进、最后停在什么信息或情绪上；不要机械地规定时长或硬塞运镜。"
    ].filter(Boolean).join("\n\n");
  }
  function objectFromDirectorLabels(text) {
    const labels = {
      "本场戏剧任务": "dramaticFunction", "戏剧任务": "dramaticFunction", "dramaticFunction": "dramaticFunction",
      "人物目标": "characterObjective", "characterObjective": "characterObjective",
      "阻力 / 冲突": "obstacle", "阻力": "obstacle", "冲突": "obstacle", "obstacle": "obstacle",
      "本场转折": "turn", "转折": "turn", "turn": "turn",
      "观众获得的信息": "audienceInformation", "观众信息": "audienceInformation", "audienceInformation": "audienceInformation",
      "情绪走向": "emotionalArc", "emotionalArc": "emotionalArc",
      "导演意图": "directorialIntent", "directorialIntent": "directorialIntent",
      "影像策略": "visualStrategy", "visualStrategy": "visualStrategy",
      "镜头策略": "shotStrategy", "shotStrategy": "shotStrategy"
    };
    const result = {};
    String(text || "").split(/\n+/).forEach((line) => {
      const match = line.trim().match(/^(?:[-*]\s*)?([^：:]{2,30})[：:]\s*(.+)$/);
      if (match && labels[match[1].trim()]) result[labels[match[1].trim()]] = match[2].trim();
    });
    return result;
  }
  function parseDirectorAnalysisResult(value) {
    const raw = cleanText(value, 12000);
    if (!raw) return { ok: false, error: "请先粘贴导演分析结果。", analysis: normalizeDirectorAnalysis() };
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const jsonCandidate = (fenced ? fenced[1] : raw).trim();
    let source = null;
    try { source = JSON.parse(jsonCandidate); } catch (error) {
      const objectMatch = raw.match(/\{[\s\S]*\}/);
      if (objectMatch) { try { source = JSON.parse(objectMatch[0]); } catch (ignored) { source = null; } }
    }
    if (!source || typeof source !== "object" || Array.isArray(source)) source = objectFromDirectorLabels(raw);
    const analysis = normalizeDirectorAnalysis({ ...source, source: "imported" });
    const completed = DIRECTOR_ANALYSIS_FIELDS.filter(([key]) => analysis[key]).length;
    return completed
      ? { ok: true, analysis }
      : { ok: false, error: "没有识别到导演分析字段。请粘贴 JSON，或使用“字段：内容”的格式。", analysis };
  }
  const api = { DIMENSIONS, SCENE_REFERENCE_LIBRARY, LOOK_SUGGESTIONS, CAMERA_SUGGESTIONS, DIRECTOR_ANALYSIS_FIELDS, normalizeDirectorAnalysis, normalizeSceneAssistant, extractSceneCandidates, buildSceneAssistantDraft, buildSceneCreativeSuggestions, buildDirectorAnalysisPrompt, parseDirectorAnalysisResult };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.aigcSceneAssistantData = api;
})(typeof window !== "undefined" ? window : globalThis);
