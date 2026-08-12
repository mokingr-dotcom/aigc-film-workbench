(function initMusicWorkbench(root) {
  if (!root.document || !root.aigcMusicData || !root.aigcMusicAdapters) return;
  const document = root.document;
  const D = root.aigcMusicData;
  const { buildMusicOutput } = root.aigcMusicAdapters;
  let state = D.normalizeMusicState(D.DEFAULT_MUSIC_STATE);
  let filters = { search: "", genre: "all", vocabulary: "all" };
  let instrumentFilters = { region: "all", family: "all" };
  let output = buildMusicOutput(state);
  let copyTimer;

  const $ = (id) => document.querySelector(`#${id}`);
  const elements = {
    workspace: $("music-workspace"), search: $("music-search"), purposeTabs: $("music-purpose-tabs"),
    purposeButtons: [...document.querySelectorAll("[data-music-purpose]")], genre: $("music-genre"), vocabulary: $("music-vocabulary"),
    templateList: $("music-template-list"), templateCount: $("music-template-count"), sceneZh: $("music-scene-zh"), sceneEn: $("music-scene-en"),
    subjectState: $("music-subject-state"), narrativeGoal: $("music-narrative-goal"), keyBeat: $("music-key-beat"), primaryGenre: $("music-primary-genre"),
    secondaryGenre: $("music-secondary-genre"), era: $("music-era"), culturalLanguage: $("music-cultural-language"), coreEmotion: $("music-core-emotion"),
    intensity: $("music-intensity"), instrumentPresets: $("music-instrument-presets"), instrumentRegion: $("music-instrument-region"), instrumentFamily: $("music-instrument-family"), instrumentSelectionCount: $("music-instrument-selection-count"), instrumentLayers: $("music-instrument-layers"), durationMode: $("music-duration-mode"), durationPreset: $("music-duration-preset"), duration: $("music-duration"), customDuration: $("music-custom-duration"), durationMinutes: $("music-duration-minutes"), durationSeconds: $("music-duration-seconds"), durationSummary: $("music-duration-summary"), durationNaturalNote: $("music-duration-natural-note"),
    tempoFeel: $("music-tempo-feel"), rhythmFeel: $("music-rhythm-feel"), structureOpening: $("music-structure-opening"), structureDevelopment: $("music-structure-development"),
    structureClimax: $("music-structure-climax"), structureEnding: $("music-structure-ending"), advancedToggle: $("music-advanced-toggle"), advancedControls: $("music-advanced-controls"),
    bpm: $("music-bpm"), meter: $("music-meter"), tonality: $("music-tonality"), dynamics: $("music-dynamics"), mixDensity: $("music-mix-density"),
    spaceWidth: $("music-space-width"), reverb: $("music-reverb"), recording: $("music-recording"), dialogueMode: $("music-dialogue-mode"), editRhythm: $("music-edit-rhythm"),
    keySyncPoint: $("music-key-sync-point"), extraRestrictions: $("music-extra-restrictions"), targetModel: $("music-target-model"), promptDensity: $("music-prompt-density"),
    validation: $("music-validation"), directorAnalysis: $("music-director-analysis"), outputFields: $("music-output-fields"), copyAll: $("music-copy-all"), filename: $("music-filename"),
    example: $("music-example"), clear: $("music-clear"), resizers: [...document.querySelectorAll("[data-music-resizer]")],
    mobilePaneButtons: [...document.querySelectorAll("[data-music-mobile-pane]")], projectName: $("project-name"),
    statusProject: $("music-status-project"), statusDuration: $("music-status-duration"), statusTempo: $("music-status-tempo"), statusMeter: $("music-status-meter"), draftStatus: $("music-status-draft")
  };
  if (Object.values(elements).some((value) => value === null)) return;

  const fieldMap = {
    sceneZh: "sceneZh", sceneEn: "sceneEn", subjectState: "subjectState", narrativeGoal: "narrativeGoal", keyBeat: "keyBeat",
    primaryGenre: "primaryGenre", secondaryGenre: "secondaryGenre", era: "era", culturalLanguage: "culturalLanguage", coreEmotion: "coreEmotion",
    intensity: "intensity", duration: "duration", tempoFeel: "tempoFeel", rhythmFeel: "rhythmFeel", bpm: "bpm", meter: "meter", tonality: "tonality",
    targetModel: "targetModel", promptDensity: "promptDensity", extraRestrictions: "extraRestrictions"
  };
  const structureMap = { structureOpening: "opening", structureDevelopment: "development", structureClimax: "climax", structureEnding: "ending" };
  const productionMap = { dynamics: "dynamics", mixDensity: "mixDensity", spaceWidth: "spaceWidth", reverb: "reverb", recording: "recording" };
  const relationMap = { dialogueMode: "dialogueMode", editRhythm: "editRhythm", keySyncPoint: "keySyncPoint" };
  const layerNames = { lead: "主奏", support: "辅助声部", rhythmBass: "节奏与低频", textureSpace: "纹理与空间", exclude: "排除" };
  const MUSIC_CASE_ART = [
    "assets/poster-templates/film-negative-space.jpg",
    "assets/poster-templates/product-hero.jpg",
    "assets/poster-templates/film-diagonal-action.jpg",
    "assets/poster-templates/film-character-world.jpg",
    "assets/poster-templates/film-object-symbol.jpg",
    "assets/poster-templates/film-portrait-close.jpg"
  ];

  function setValue(element, value) { element.value = value ?? ""; }
  // Workspace Core listens on document. Keep every music mutation on the same event bus so
  // clearing a draft persists the cleared state instead of leaving an old cue in the project.
  function notifyDirty() { document.dispatchEvent(new root.CustomEvent("aigc:workspace-dirty", { detail: { workspace: "music" } })); }
  function safeName(value) { return String(value || "影视纯音乐").replace(/[\\/:*?"<>|\s]+/g, "_"); }
  function syncDurationControls() {
    const natural = state.durationMode === "natural";
    setValue(elements.durationMode, state.durationMode);
    setValue(elements.duration, state.duration);
    setValue(elements.durationMinutes, state.customDurationMinutes);
    setValue(elements.durationSeconds, state.customDurationSeconds);
    elements.durationPreset.hidden = state.durationMode !== "preset";
    elements.customDuration.hidden = state.durationMode !== "custom";
    elements.durationNaturalNote.hidden = !natural;
    elements.durationSummary.textContent = `合计 ${state.duration} 秒`;
  }
  function durationStatusText() {
    if (state.durationMode === "natural") return "自然结束";
    if (state.duration >= 60 && state.duration % 60 === 0) return `${state.duration / 60} 分钟`;
    return `${state.duration} 秒`;
  }
  function hasProjectMusicDraft() {
    return Boolean(state.templateId || state.sceneZh.trim() || state.subjectState.trim() || state.keyBeat.trim());
  }
  function syncStatusBar() {
    elements.statusProject.textContent = elements.projectName.value.trim() || "未命名电影项目";
    elements.statusDuration.textContent = durationStatusText();
    elements.statusTempo.textContent = D.MUSIC_DICTIONARY[state.tempoFeel]?.zh || "";
    elements.statusMeter.textContent = state.meter || "";
    const configured = hasProjectMusicDraft();
    elements.draftStatus.dataset.state = configured ? "configured" : "empty";
    elements.draftStatus.textContent = configured ? "草稿：已同步到项目" : "草稿：待建立";
  }
  function syncControls() {
    Object.entries(fieldMap).forEach(([elementKey, stateKey]) => setValue(elements[elementKey], state[stateKey]));
    Object.entries(structureMap).forEach(([elementKey, stateKey]) => setValue(elements[elementKey], state.structure[stateKey]));
    Object.entries(productionMap).forEach(([elementKey, stateKey]) => setValue(elements[elementKey], state.production[stateKey]));
    Object.entries(relationMap).forEach(([elementKey, stateKey]) => setValue(elements[elementKey], state.soundRelationship[stateKey]));
    elements.advancedToggle.setAttribute("aria-expanded", String(state.advancedOpen));
    elements.advancedToggle.textContent = state.advancedOpen ? "收起高级控制" : "展开高级控制";
    elements.advancedControls.hidden = !state.advancedOpen;
    syncDurationControls();
  }

  function visibleTemplates() {
    const q = filters.search.trim().toLowerCase();
    return D.MUSIC_TEMPLATES.filter((item) => item.purpose === state.purpose)
      .filter((item) => filters.genre === "all" || item.genre === filters.genre)
      .filter((item) => filters.vocabulary === "all" || item.vocabulary === filters.vocabulary)
      .filter((item) => !q || [item.name, item.scene, item.emotion, item.instruments, item.rhythm, item.production].join(" ").toLowerCase().includes(q));
  }

  function renderTemplates() {
    const templates = visibleTemplates();
    elements.templateCount.textContent = `${templates.length} 条`;
    elements.templateList.replaceChildren(...templates.map((item, index) => {
      const card = document.createElement("article"); card.className = `music-template-card${state.templateId === item.id ? " active" : ""}`;
      card.dataset.musicTemplateCard = item.id;
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-pressed", String(state.templateId === item.id));
      const cue = String(index + 1).padStart(2, "0");
      const image = MUSIC_CASE_ART[index % MUSIC_CASE_ART.length];
      card.innerHTML = `<div class="music-template-thumb"><img src="${image}" alt="" loading="lazy"><span class="music-cue-number">CUE ${cue}</span></div><div class="music-template-copy"><header><div class="music-template-select-label"><strong>${item.name}</strong><span>${item.duration}s · ${item.bpm} BPM</span></div><button type="button" class="music-favorite" data-music-favorite="${item.id}" aria-label="收藏">${state.favoriteTemplateIds.includes(item.id) ? "★" : "☆"}</button></header><p>${item.scene}</p><dl><div><dt>情绪</dt><dd>${item.emotion}</dd></div><div><dt>配器</dt><dd>${item.instruments}</dd></div><div><dt>节奏</dt><dd>${item.rhythm}</dd></div><div><dt>制作</dt><dd>${item.production}</dd></div></dl></div>`;
      return card;
    }));
    elements.purposeButtons.forEach((button) => { const active = button.dataset.musicPurpose === state.purpose; button.classList.toggle("active", active); button.setAttribute("aria-selected", String(active)); });
  }

  function renderInstruments() {
    elements.instrumentPresets.replaceChildren(...Object.entries(D.INSTRUMENT_PRESETS).map(([id, preset]) => {
      const button = document.createElement("button"); button.type = "button"; button.dataset.musicPreset = id; button.className = state.orchestrationPreset === id ? "active" : ""; button.textContent = preset.name; return button;
    }));
    const visibleInstruments = D.filterMusicInstruments(instrumentFilters);
    const selectedCount = new Set(D.ORCHESTRATION_LAYERS.flatMap((layer) => state.orchestration[layer])).size;
    elements.instrumentSelectionCount.textContent = `已选 ${selectedCount} 件乐器`;
    if (!visibleInstruments.length) {
      const empty = document.createElement("p");
      empty.className = "music-instrument-empty";
      empty.textContent = "当前地域和类型下暂无乐器，请调整筛选。";
      elements.instrumentLayers.replaceChildren(empty);
      return;
    }
    elements.instrumentLayers.replaceChildren(...D.ORCHESTRATION_LAYERS.map((layer) => {
      const instruments = visibleInstruments.filter((item) => item.layers.includes(layer));
      const group = document.createElement("section"); group.className = "music-instrument-group";
      group.hidden = instruments.length === 0;
      group.innerHTML = `<h4>${layerNames[layer]}</h4><div>${instruments.map((item) => `<button type="button" data-music-instrument="${item.id}" data-music-layer="${layer}" class="${state.orchestration[layer].includes(item.id) ? "active" : ""}">${item.zh}</button>`).join("")}</div>`;
      return group;
    }));
  }

  function initializeInstrumentFilters() {
    const buildOptions = (catalog) => Object.entries(catalog).map(([value, label]) => {
      const option = document.createElement("option"); option.value = value; option.textContent = label; return option;
    });
    elements.instrumentRegion.replaceChildren(...buildOptions(D.INSTRUMENT_REGIONS));
    elements.instrumentFamily.replaceChildren(...buildOptions(D.INSTRUMENT_FAMILIES));
    elements.instrumentRegion.value = instrumentFilters.region;
    elements.instrumentFamily.value = instrumentFilters.family;
  }

  function renderOutput() {
    const validation = D.validateMusicState(state);
    output = buildMusicOutput(state, state.targetModel, state.promptDensity);
    const messages = [...validation.errors, ...output.warnings];
    elements.validation.className = `music-validation ${validation.valid ? (messages.length ? "warning" : "valid") : "invalid"}`;
    elements.validation.textContent = messages.length ? messages.join(" ") : "提示词结构完整，可以直接复制使用。";
    elements.copyAll.disabled = !validation.valid;
    elements.directorAnalysis.textContent = output.directorAnalysis;
    elements.outputFields.replaceChildren(...output.fields.map((field) => {
      const section = document.createElement("section"); section.className = "music-output-field";
      section.innerHTML = `<header><strong>${field.label}</strong><button type="button" data-music-copy-field="${field.id}" title="复制此字段">复制</button></header><textarea readonly spellcheck="false"></textarea>`;
      section.querySelector("textarea").value = field.value; return section;
    }));
    const durationLabel = state.durationMode === "natural" ? "NATURAL" : `${state.duration}s`;
    elements.filename.textContent = `MUSIC_${safeName(D.MUSIC_PURPOSES[state.purpose])}_${safeName(D.MUSIC_TARGETS[state.targetModel])}_${durationLabel}_v001.txt`;
  }

  function renderAll() { syncControls(); renderTemplates(); renderInstruments(); renderOutput(); syncStatusBar(); applyLayout(); }
  function mutate(next, dirty = true) { state = D.normalizeMusicState(next); renderAll(); if (dirty) notifyDirty(); }

  function applyTemplate(id) {
    const item = D.MUSIC_TEMPLATES.find((template) => template.id === id); if (!item) return;
    const presetId = item.vocabulary === "electronic" ? "synth-pulse-granular" : item.vocabulary === "ethnic" ? "ethnic-ambient" : item.vocabulary === "hybrid" ? "orchestra-electronic" : item.vocabulary === "orchestral" ? "brass-percussion-hybrid" : item.vocabulary === "minimal" ? "minimal-piano-space" : "piano-strings";
    const durationParts = D.durationPartsFromSeconds(item.duration);
    let next = { ...state, templateId: item.id, purpose: item.purpose, genre: item.genre, vocabulary: item.vocabulary, sceneZh: item.scene, sceneEn: item.sceneEn, durationMode: "preset", duration: item.duration, customDurationMinutes: durationParts.minutes, customDurationSeconds: durationParts.seconds, bpm: item.bpm, narrativeGoal: item.emotion, coreEmotion: item.genre === "suspense" || item.genre === "horror" ? "tense" : item.genre === "romance" ? "intimate" : item.genre === "war" ? "majestic" : "restrained", rhythmFeel: item.bpm >= 108 ? "driving" : item.bpm < 65 ? "no_pulse" : "flowing" };
    next = D.applyInstrumentPreset(next, presetId); mutate(next);
  }

  function bindField(elementKey, eventName = "change") {
    elements[elementKey].addEventListener(eventName, () => {
      let value = elements[elementKey].value;
      if (elementKey === "duration") value = Number(value);
      if (elementKey === "bpm") value = value.trim() === "" ? "" : Number(value);
      mutate({ ...state, [fieldMap[elementKey]]: value });
    });
  }
  Object.keys(fieldMap).forEach((key) => bindField(key, ["sceneZh", "sceneEn", "subjectState", "narrativeGoal", "keyBeat", "extraRestrictions"].includes(key) ? "input" : "change"));
  Object.entries(structureMap).forEach(([key, nested]) => elements[key].addEventListener("input", () => mutate({ ...state, structure: { ...state.structure, [nested]: elements[key].value } })));
  Object.entries(productionMap).forEach(([key, nested]) => elements[key].addEventListener("change", () => mutate({ ...state, production: { ...state.production, [nested]: elements[key].value } })));
  Object.entries(relationMap).forEach(([key, nested]) => elements[key].addEventListener(key === "keySyncPoint" ? "input" : "change", () => mutate({ ...state, soundRelationship: { ...state.soundRelationship, [nested]: elements[key].value } })));

  elements.search.addEventListener("input", () => { filters.search = elements.search.value; renderTemplates(); });
  elements.genre.addEventListener("change", () => { filters.genre = elements.genre.value; renderTemplates(); });
  elements.vocabulary.addEventListener("change", () => { filters.vocabulary = elements.vocabulary.value; renderTemplates(); });
  elements.purposeTabs.addEventListener("click", (event) => { const button = event.target.closest("[data-music-purpose]"); if (button) mutate({ ...state, purpose: button.dataset.musicPurpose }); });
  elements.templateList.addEventListener("click", (event) => { const favorite = event.target.closest("[data-music-favorite]"); if (favorite) { const id = favorite.dataset.musicFavorite; const next = state.favoriteTemplateIds.includes(id) ? state.favoriteTemplateIds.filter((item) => item !== id) : [...state.favoriteTemplateIds, id]; mutate({ ...state, favoriteTemplateIds: next }); return; } const card = event.target.closest("[data-music-template-card]"); if (card) applyTemplate(card.dataset.musicTemplateCard); });
  elements.templateList.addEventListener("keydown", (event) => {
    if (event.target.closest("[data-music-favorite]")) return;
    if (event.key === "Enter" || event.key === " ") {
      const card = event.target.closest("[data-music-template-card]");
      if (!card) return;
      event.preventDefault();
      applyTemplate(card.dataset.musicTemplateCard);
    }
  });
  elements.instrumentPresets.addEventListener("click", (event) => { const button = event.target.closest("[data-music-preset]"); if (button) mutate(D.applyInstrumentPreset(state, button.dataset.musicPreset)); });
  elements.instrumentLayers.addEventListener("click", (event) => { const button = event.target.closest("[data-music-instrument]"); if (button) mutate(D.toggleInstrument(state, button.dataset.musicLayer, button.dataset.musicInstrument)); });
  elements.instrumentRegion.addEventListener("change", () => { instrumentFilters.region = elements.instrumentRegion.value; renderInstruments(); });
  elements.instrumentFamily.addEventListener("change", () => { instrumentFilters.family = elements.instrumentFamily.value; renderInstruments(); });
  elements.durationMode.addEventListener("change", () => mutate({ ...state, durationMode: elements.durationMode.value }));
  const updateCustomDuration = () => {
    const customDurationMinutes = Number(elements.durationMinutes.value || 0);
    const customDurationSeconds = Number(elements.durationSeconds.value || 0);
    const duration = D.durationSecondsFromParts(customDurationMinutes, customDurationSeconds);
    mutate({ ...state, durationMode: "custom", customDurationMinutes, customDurationSeconds, duration });
  };
  elements.durationMinutes.addEventListener("change", updateCustomDuration);
  elements.durationSeconds.addEventListener("change", updateCustomDuration);
  elements.advancedToggle.addEventListener("click", () => mutate({ ...state, advancedOpen: !state.advancedOpen }));
  elements.example.addEventListener("click", () => applyTemplate("film-psychological-suspense"));
  elements.clear.addEventListener("click", () => mutate({ ...D.DEFAULT_MUSIC_STATE, sceneZh: "", sceneEn: "", templateId: "", narrativeGoal: "", subjectState: "", keyBeat: "" }));
  elements.projectName.addEventListener("input", () => {
    elements.statusProject.textContent = elements.projectName.value.trim() || "未命名电影项目";
  });
  elements.mobilePaneButtons.forEach((button) => button.addEventListener("click", () => {
    const pane = button.dataset.musicMobilePane;
    elements.workspace.dataset.mobilePane = pane;
    elements.mobilePaneButtons.forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
  }));
  elements.workspace.dataset.mobilePane = "library";

  async function copyText(text, button) { try { await root.navigator.clipboard.writeText(text); const original = button.textContent; button.textContent = "已复制"; clearTimeout(copyTimer); copyTimer = setTimeout(() => { button.textContent = original; }, 1500); } catch (_) { button.textContent = "复制失败"; } }
  elements.outputFields.addEventListener("click", (event) => { const button = event.target.closest("[data-music-copy-field]"); if (!button) return; const field = output.fields.find((item) => item.id === button.dataset.musicCopyField); if (field) copyText(field.value, button); });
  elements.copyAll.addEventListener("click", () => copyText(output.combined, elements.copyAll));

  const limits = { left: [240, 520], right: [320, 620] };
  const clampRail = (side, value) => Math.max(limits[side][0], Math.min(limits[side][1], value));
  function applyLayout() {
    elements.workspace.style.setProperty("--music-left-width", `${state.layout.leftWidth}px`);
    elements.workspace.style.setProperty("--music-right-width", `${state.layout.rightWidth}px`);
    elements.resizers.forEach((resizer) => {
      const side = resizer.dataset.musicResizer;
      resizer.setAttribute("aria-valuemin", String(limits[side][0]));
      resizer.setAttribute("aria-valuemax", String(limits[side][1]));
      resizer.setAttribute("aria-valuenow", String(state.layout[`${side}Width`]));
    });
  }
  elements.resizers.forEach((resizer) => {
    resizer.addEventListener("pointerdown", (event) => {
      const side = resizer.dataset.musicResizer;
      const startX = event.clientX;
      const start = state.layout[`${side}Width`];
      resizer.setPointerCapture?.(event.pointerId);
      const move = (moveEvent) => {
        const delta = moveEvent.clientX - startX;
        state.layout[`${side}Width`] = clampRail(side, start + (side === "left" ? delta : -delta));
        applyLayout();
      };
      const up = () => {
        root.removeEventListener("pointermove", move);
        root.removeEventListener("pointerup", up);
        notifyDirty();
      };
      root.addEventListener("pointermove", move);
      root.addEventListener("pointerup", up, { once: true });
    });
    resizer.addEventListener("keydown", (event) => {
      const movesLeft = event.key === "ArrowLeft";
      const movesRight = event.key === "ArrowRight";
      if (!movesLeft && !movesRight) return;
      event.preventDefault();
      const side = resizer.dataset.musicResizer;
      const screenDirection = movesRight ? 1 : -1;
      const widthDirection = side === "left" ? screenDirection : -screenDirection;
      state.layout[`${side}Width`] = clampRail(side, state.layout[`${side}Width`] + widthDirection * 16);
      applyLayout();
      notifyDirty();
    });
  });

  const api = {
    exportState: () => D.normalizeMusicState(state),
    importState: (next) => { state = D.normalizeMusicState(next || D.DEFAULT_MUSIC_STATE); filters = { search: "", genre: "all", vocabulary: "all" }; instrumentFilters = { region: "all", family: "all" }; elements.search.value = ""; elements.genre.value = "all"; elements.vocabulary.value = "all"; initializeInstrumentFilters(); renderAll(); },
    clear: () => elements.clear.click(),
    selectTemplate: (id) => applyTemplate(id),
    getOutput: () => ({ ...output, fields: output.fields.map((field) => ({ ...field })) }),
    receiveProjectContext(context) {
      const prompt = String(context?.prompt || "").trim();
      if (!prompt) return false;
      if (String(state.extraRestrictions || "").includes(prompt)) return true;
      mutate({ ...state, extraRestrictions: [state.extraRestrictions, prompt].filter(Boolean).join("\n") });
      return true;
    }
  };
  root.aigcMusicWorkbench = api;
  initializeInstrumentFilters();
  renderAll();
})(typeof window !== "undefined" ? window : globalThis);
