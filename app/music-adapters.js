(function initMusicAdapters(root) {
  const data = root.aigcMusicData || (typeof require === "function" ? require("./music-data.js") : null);
  if (!data) return;

  const {
    MUSIC_PURPOSES,
    MUSIC_GENRES,
    MUSIC_TARGETS,
    MUSIC_DICTIONARY,
    MUSIC_TEMPLATES,
    normalizeMusicState,
    analyzeMusicConflicts
  } = data;

  const RESTRICTIONS = "no lyrics, no lead vocals, no backing vocals, no humming, no spoken word, no narration";
  const labels = {
    meter: { "4/4": "4/4 meter", "3/4": "3/4 meter", "6/8": "6/8 meter", "5/4": "5/4 meter" },
    tonality: { minor: "minor tonality", major: "major tonality", modal: "modal tonality", atonal: "weakly tonal" },
    dynamics: { wide: "wide cinematic dynamics", restrained: "restrained dynamics", compressed: "controlled dynamics" },
    mixDensity: { sparse: "sparse arrangement", balanced: "balanced arrangement", dense: "dense arrangement" },
    spaceWidth: { intimate: "intimate stereo field", balanced: "balanced stereo field", wide: "wide cinematic stereo field" },
    reverb: { dry: "dry close sound", natural: "natural room reverb", spacious: "spacious reverb", long: "long reverb tail" },
    recording: { cinematic: "cinematic recording", warm_natural: "warm natural recording", modern_clean: "modern clean production", raw: "raw organic recording" },
    dialogueMode: { none: "no dialogue to accommodate", light: "leave space for light dialogue", dense: "leave clear midrange space for dense dialogue", narration: "leave clear midrange space for narration" },
    editRhythm: { not_forced: "do not force sync to every cut", gentle_sync: "gently support edit rhythm", hard_sync: "precise rhythmic sync points" }
  };

  function compact(values) {
    return values.filter(Boolean).join(", ");
  }

  function englishOnly(value) {
    const text = String(value || "").trim();
    return text && !/[\u3400-\u9fff]/.test(text) ? text : "";
  }

  function dict(id, language) {
    return MUSIC_DICTIONARY[id]?.[language] || "";
  }

  function dictList(ids, language) {
    return (Array.isArray(ids) ? ids : []).map((id) => dict(id, language)).filter(Boolean).join(", ");
  }

  function currentTemplate(state) {
    return MUSIC_TEMPLATES.find((item) => item.id === state.templateId);
  }

  function buildParts(input, density) {
    const state = normalizeMusicState(input);
    const template = currentTemplate(state);
    const sceneEn = state.sceneEn.trim() || template?.sceneEn || "";
    const duration = state.durationMode === "natural"
      ? "natural full-length ending after completing the musical arc, no hard duration target"
      : `${state.duration} seconds`;
    const tempo = compact([dict(state.tempoFeel, "en"), state.bpm === "" ? "" : `${state.bpm} BPM`, labels.meter[state.meter]]);
    const style = compact([
      dict(state.primaryGenre, "en"),
      dict(state.secondaryGenre, "en"),
      MUSIC_GENRES[state.genre] ? `${state.genre} storytelling` : "",
      dict(state.era, "en"),
      dict(state.culturalLanguage, "en")
    ]);
    const emotion = compact([dict(state.coreEmotion, "en"), dict(state.intensity, "en")]);
    const instruments = compact([
      dictList(state.orchestration.lead, "en"),
      dictList(state.orchestration.support, "en"),
      dictList(state.orchestration.rhythmBass, "en"),
      dictList(state.orchestration.textureSpace, "en")
    ]);
    const structure = compact([
      `opening: ${englishOnly(state.structure.opening) || "establish atmosphere and motif"}`,
      `development: ${englishOnly(state.structure.development) || "gradually develop emotion and orchestration"}`,
      state.structure.climax ? `climax: ${englishOnly(state.structure.climax) || "controlled emotional peak"}` : "",
      `ending: ${englishOnly(state.structure.ending) || "clear landing with a lingering natural tail"}`
    ]);
    const production = compact([
      labels.dynamics[state.production.dynamics],
      labels.mixDensity[state.production.mixDensity],
      labels.spaceWidth[state.production.spaceWidth],
      labels.reverb[state.production.reverb],
      labels.recording[state.production.recording]
    ]);
    const picture = compact([sceneEn, englishOnly(state.keyBeat) ? `key sync point: ${englishOnly(state.keyBeat)}` : ""]);
    const relation = compact([
      labels.dialogueMode[state.soundRelationship.dialogueMode],
      labels.editRhythm[state.soundRelationship.editRhythm],
      englishOnly(state.soundRelationship.keySyncPoint) ? `sync point: ${englishOnly(state.soundRelationship.keySyncPoint)}` : ""
    ]);
    const concise = compact(["instrumental cinematic score", style, emotion, instruments, tempo, duration, sceneEn, production, RESTRICTIONS]);
    const detailed = compact(["instrumental cinematic score", style, emotion, instruments, tempo, duration, picture, structure, production, relation, RESTRICTIONS]);
    return { state, template, style, emotion, instruments, tempo, duration, picture, structure, production, relation, prompt: density === "detailed" ? detailed : concise };
  }

  function directorAnalysis(parts) {
    const { state, template } = parts;
    const scene = state.sceneZh.trim() || template?.scene || "尚未填写具体画面";
    const subject = state.subjectState.trim() || "未指定主体状态";
    const goal = state.narrativeGoal.trim() || "以音乐服务画面叙事，不喧宾夺主";
    return [
      `画面：${scene}`,
      `人物/主体：${subject}`,
      `叙事任务：${goal}`,
      `情绪：${dict(state.coreEmotion, "zh")}，${dict(state.intensity, "zh")}`,
      `配器：主奏 ${dictList(state.orchestration.lead, "zh") || "未选择"}；辅助 ${dictList(state.orchestration.support, "zh") || "保持简洁"}。`,
      `结构：${state.structure.opening} → ${state.structure.development}${state.structure.climax ? ` → ${state.structure.climax}` : ""} → ${state.structure.ending}。`,
      `声音关系：${({ none: "无对白", light: "少量对白", dense: "密集对白", narration: "旁白" })[state.soundRelationship.dialogueMode] || "无对白"}；${state.extraRestrictions || "无额外限制"}。`
    ].join("\n");
  }

  function chinesePrompt(parts) {
    const { state, template } = parts;
    return compact([
      "纯音乐影视配乐",
      `${MUSIC_PURPOSES[state.purpose]} / ${MUSIC_GENRES[state.genre]}`,
      state.sceneZh.trim() || template?.scene,
      `${dict(state.coreEmotion, "zh")}，${dict(state.intensity, "zh")}`,
      `主奏：${dictList(state.orchestration.lead, "zh")}`,
      `辅助：${dictList(state.orchestration.support, "zh")}`,
      `节奏低频：${dictList(state.orchestration.rhythmBass, "zh")}`,
      `纹理空间：${dictList(state.orchestration.textureSpace, "zh")}`,
      state.durationMode === "natural" ? "时长不做硬性限制，完成四段结构后自然结束并保留尾音" : `${state.duration}秒`,
      "无歌词、无主唱、无和声、无哼唱、无口播、无旁白"
    ]);
  }

  function makeOutput(input, targetModel, density) {
    const parts = buildParts(input, density);
    const { state } = parts;
    const excluded = compact([RESTRICTIONS, dictList(state.orchestration.exclude, "en"), englishOnly(state.extraRestrictions)]);
    let fields;
    if (targetModel === "suno") {
      fields = [
        { id: "style", label: "Style of Music", value: parts.prompt },
        { id: "exclude", label: "Exclude", value: excluded },
        { id: "title", label: "Title", value: currentTemplate(state)?.name || "Cinematic Instrumental Cue" },
        { id: "instrumental", label: "Instrumental", value: "ON" }
      ];
    } else if (targetModel === "udio") {
      fields = [
        { id: "prompt", label: "Prompt", value: parts.prompt },
        { id: "reduction", label: "Style Reduction", value: excluded },
        { id: "instrumental", label: "Instrumental Mode", value: "ON" }
      ];
    } else if (targetModel === "stable_audio") {
      fields = [
        { id: "prompt", label: "Prompt", value: compact([`Format: instrumental film score`, `Genre: ${parts.style}`, `Instruments: ${parts.instruments}`, `Mood: ${parts.emotion}`, `Tempo: ${parts.tempo}`, `Structure: ${parts.structure}`, `Production: ${parts.production}`, `Duration: ${parts.duration}`, parts.picture, RESTRICTIONS]) },
        { id: "exclude", label: "Exclude", value: excluded }
      ];
    } else if (targetModel === "lyria") {
      fields = [
        { id: "prompt", label: "Prompt", value: parts.prompt },
        { id: "negative", label: "Negative Guidance", value: excluded }
      ];
    } else {
      fields = [
        { id: "prompt", label: "Prompt", value: parts.prompt },
        { id: "prompt_zh", label: "中文完整提示词", value: chinesePrompt(parts) },
        { id: "exclude", label: "Exclude", value: excluded },
        { id: "title", label: "Title", value: currentTemplate(state)?.name || "影视纯音乐配乐" }
      ];
    }
    const warnings = analyzeMusicConflicts(state);
    if (!state.sceneEn.trim() && !currentTemplate(state)?.sceneEn) warnings.push("英文场景补充未填写，模型提示词仅使用受控音乐字段。");
    return {
      targetModel,
      density,
      directorAnalysis: directorAnalysis(parts),
      fields,
      combined: fields.map((field) => `${field.label}:\n${field.value}`).join("\n\n"),
      title: `${MUSIC_TARGETS[targetModel] || MUSIC_TARGETS.generic} · ${density === "detailed" ? "详细" : "简洁"}`,
      instrumental: true,
      warnings
    };
  }

  function buildMusicOutput(input, targetModel, density) {
    const state = normalizeMusicState(input);
    const target = MUSIC_TARGETS[targetModel] ? targetModel : state.targetModel;
    const level = density === "detailed" || density === "concise" ? density : state.promptDensity;
    return makeOutput(state, target, level);
  }

  const api = {
    RESTRICTIONS,
    buildMusicOutput,
    buildGenericOutput: (state, density) => makeOutput(state, "generic", density),
    buildSunoOutput: (state, density) => makeOutput(state, "suno", density),
    buildUdioOutput: (state, density) => makeOutput(state, "udio", density),
    buildStableAudioOutput: (state, density) => makeOutput(state, "stable_audio", density),
    buildLyriaOutput: (state, density) => makeOutput(state, "lyria", density)
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.aigcMusicAdapters = api;
})(typeof window !== "undefined" ? window : globalThis);
