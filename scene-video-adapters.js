(function initSceneVideoAdapters(root) {
  const TARGETS = Object.freeze(["general", "seedance", "jimeng-kling", "runway-pika"]);
  function text(value, limit = 280) { return String(value || "").trim().slice(0, limit); }
  function normalizeSceneVideoCard(value) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      narrative: text(source.narrative), sourceExcerpt: text(source.sourceExcerpt, 600), characters: text(source.characters, 160), emotion: text(source.emotion, 180), performance: text(source.performance), action: text(source.action), setting: text(source.setting), time: text(source.time, 80), props: text(source.props, 160), assetLocks: text(source.assetLocks, 320), shotNumber: text(source.shotNumber, 40), dramaticFunction: text(source.dramaticFunction, 160), directorialIntent: text(source.directorialIntent), visualStrategy: text(source.visualStrategy), shotStrategy: text(source.shotStrategy), color: text(source.color), lighting: text(source.lighting), cameraTexture: text(source.cameraTexture), framing: text(source.framing, 160), movement: text(source.movement), beatPlan: text(source.beatPlan), dialogue: text(source.dialogue, 280), lipSync: source.lipSync === true, sound: text(source.sound, 280) || "不要背景音乐，只保留环境声与多层空间氛围。", musicCue: text(source.musicCue, 280), negatives: text(source.negatives, 280) || "不要字幕，不要水印，不要身份漂移，不要塑料皮肤，不要空间跳变。"
    };
  }
  function sections(card) {
    const dialogue = card.dialogue ? card.lipSync ? `【台词与口型】角色以自然中文口型说出：“${card.dialogue}”；不要字幕。` : `【台词】“${card.dialogue}”仅作表演、视线与情绪参考，不要字幕。` : "【台词】无明确台词，以动作和环境声叙事。";
    return [...(card.shotNumber ? [`【镜头编号】${card.shotNumber}`] : []), ...(card.sourceExcerpt ? [`【剧本原文依据】${card.sourceExcerpt}`] : []), `【叙事】${card.narrative}`, ...(card.dramaticFunction ? [`【戏剧任务】${card.dramaticFunction}`] : []), `【人物】${card.characters}；${card.emotion}；${card.performance}`, `【动作】${card.action || "补充一个清楚、可执行的可见动作。"}`, `【场景】${card.setting}${card.time ? `；${card.time}` : ""}${card.props ? `；关键物件：${card.props}` : ""}`, ...(card.assetLocks ? [`【锁定资产】${card.assetLocks}`] : []), ...(card.directorialIntent ? [`【导演意图】${card.directorialIntent}`] : []), dialogue, `【影调】${[card.color, card.lighting, card.cameraTexture, card.visualStrategy].filter(Boolean).join("；")}`, `【镜头】${[card.framing, card.movement, card.beatPlan, card.shotStrategy].filter(Boolean).join("；")}`, `【声音】${card.sound}`, ...(card.musicCue ? [`【配乐流程】${card.musicCue}`] : []), `【限制】${card.negatives}`];
  }
  function buildSeedancePrompt(card, durationMode) {
    const isThirty = durationMode === "seedance30";
    const title = isThirty ? "30秒真人电影连续镜头，一镜到底，无剪切、无跳切。" : "15秒真人电影连续镜头，无剪切、无跳切。";
    const timing = isThirty
      ? [
        `【起始画面】${card.setting}，${card.framing}。`,
        `【0-10秒｜建立】${card.narrative}，建立人物状态、空间关系和光线方向。`,
        `【10-20秒｜推进】${card.action || "人物以细微动作推进情绪"}，摄影机${card.movement}，人物和道具位置连续。`,
        `【20-30秒｜落点】${card.beatPlan || card.emotion}，停在可接下一镜的明确动作或情绪状态。`
      ]
      : [
        `【起始画面】${card.setting}，${card.framing}。`,
        `【0-5秒｜建立】${card.narrative}，建立人物状态与空间关系。`,
        `【5-10秒｜推进】${card.action || "人物以细微动作推进情绪"}，摄影机${card.movement}。`,
        `【10-15秒｜落点】${card.beatPlan || card.emotion}，停在明确的情绪或动作落点。`
      ];
    return [title, ...timing, ...sections(card)].join("\n");
  }
  function buildSceneVideoPrompt(value, target = "general", deliveryMode = "seedance15") {
    const card = normalizeSceneVideoCard(value);
    const base = sections(card);
    if (target === "seedance") return buildSeedancePrompt(card, deliveryMode);
    if (target === "jimeng-kling") return ["真人电影视频，角色身份稳定，脸部、发型、服装和体型连续一致；场景空间连续，动作单一清楚，不跳变。", ...base].join("\n");
    if (target === "runway-pika") return ["【主体】" + card.characters, "【环境】" + card.setting, "【镜头运动】" + card.movement, "【视觉风格】" + [card.color, card.lighting, card.cameraTexture].filter(Boolean).join("；"), ...base.slice(0, card.assetLocks ? 5 : 4), ...base.slice(card.assetLocks ? 7 : 6)].join("\n");
    return ["真人电影视频提示词", ...base].join("\n");
  }
  const api = { TARGETS, normalizeSceneVideoCard, buildSceneVideoPrompt, buildSeedancePrompt };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.aigcSceneVideoAdapters = api;
})(typeof window !== "undefined" ? window : globalThis);
