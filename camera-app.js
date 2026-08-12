(function initCameraWorkspace(root) {
  const data = root.cameraPromptData;
  const timelineApi = root.aigcCameraTimeline;
  if (!root.document || !data || !timelineApi) return;
  const { buildCameraTimelineModel, requiresBlockingMap, buildBlockingMapModel } = timelineApi;

  function defaultCameraSelection(source = "cases") {
    const list = source === "genres" ? data.genres : data.cases;
    return list?.[0] ? { ...list[0], source } : null;
  }

  const state = {
    source: "cases",
    mode: "quick",
    group: "all",
    query: "",
    selected: defaultCameraSelection(),
    selectedExplicit: false,
    aspect: "cinema",
    copied: false,
    last15Mode: "quick",
    last30Mode: "quick",
    blockingOpen: false,
    versions: [],
    panelWidths: { library: null, composer: null }
  };

  const elements = {
    cameraWorkspace: document.querySelector("#camera-workspace"),
    sourceTabs: document.querySelector("#camera-source-tabs"),
    search: document.querySelector("#camera-search"),
    group: document.querySelector("#camera-group-filter"),
    count: document.querySelector("#camera-count"),
    results: document.querySelector("#camera-results"),
    library: document.querySelector(".camera-library"),
    composer: document.querySelector(".camera-composer"),
    resizers: [...document.querySelectorAll("[data-camera-resizer]")],
    stage: document.querySelector("#camera-stage"),
    selection: document.querySelector("#camera-selection"),
    monitor: document.querySelector("#camera-monitor"),
    monitorImage: document.querySelector("#camera-monitor-image"),
    monitorId: document.querySelector("#camera-monitor-id"),
    monitorAspectLabel: document.querySelector("#camera-monitor-aspect-label"),
    timeline: document.querySelector("#camera-timeline"),
    durationKicker: document.querySelector("#camera-duration-kicker"),
    timelineTitle: document.querySelector("#camera-timeline-title"),
    blockingToggle: document.querySelector("#camera-blocking-toggle"),
    blockingMap: document.querySelector("#camera-blocking-map"),
    aspectButtons: [...document.querySelectorAll("[data-camera-aspect]")],
    saveVersion: document.querySelector("#camera-save-version"),
    structureModes: [...document.querySelectorAll("[data-camera-structure]")],
    durationModes: [...document.querySelectorAll("[data-camera-duration]")],
    shortStructure: document.querySelector("#camera-15s-structure"),
    character: document.querySelector("#camera-character"),
    scene: document.querySelector("#camera-scene"),
    look: document.querySelector("#camera-look"),
    performance: document.querySelector("#camera-performance"),
    action: document.querySelector("#camera-action"),
    sound: document.querySelector("#camera-sound"),
    ending: document.querySelector("#camera-ending"),
    seedance30Beats: document.querySelector("#camera-seedance30-beats"),
    beatStart: document.querySelector("#camera-beat-start"),
    beatMiddle: document.querySelector("#camera-beat-middle"),
    beatEnd: document.querySelector("#camera-beat-end"),
    referenceLocks: document.querySelector("#camera-reference-locks"),
    output: document.querySelector("#camera-output"),
    copy: document.querySelector("#camera-copy"),
    clear: document.querySelector("#camera-clear"),
    validation: document.querySelector("#camera-validation")
  };

  const cameraImages = [
    "assets/tone-option2-reference-1.png",
    "assets/tone-option2-reference-2.png",
    "assets/tone-option2-reference-3.png"
  ];
  const panelLimits = {
    library: { min: 280, max: 600 },
    composer: { min: 360, max: 700 }
  };
  const minimumStageWidth = 360;
  let activeResizer = null;

  function numericWidth(value) {
    const width = Number(value);
    return Number.isFinite(width) && width > 0 ? Math.round(width) : null;
  }

  function panelElement(side) {
    return side === "library" ? elements.library : elements.composer;
  }

  function currentPanelWidth(side) {
    return Math.round(panelElement(side)?.getBoundingClientRect().width || panelLimits[side].min);
  }

  function availablePanelWidth(side) {
    const shellStyle = getComputedStyle(elements.cameraWorkspace);
    const horizontalPadding = parseFloat(shellStyle.paddingLeft) + parseFloat(shellStyle.paddingRight);
    const dividerWidth = elements.resizers.reduce((total, resizer) => total + resizer.getBoundingClientRect().width, 0);
    const otherSide = side === "library" ? "composer" : "library";
    const available = elements.cameraWorkspace.clientWidth - horizontalPadding - dividerWidth - currentPanelWidth(otherSide) - minimumStageWidth;
    return Math.max(panelLimits[side].min, Math.min(panelLimits[side].max, available));
  }

  function updateResizerValues() {
    elements.resizers.forEach((resizer) => {
      const side = resizer.dataset.cameraResizer;
      resizer.setAttribute("aria-valuenow", String(currentPanelWidth(side)));
    });
  }

  function applyPanelWidths() {
    const properties = {
      library: "--camera-library-width",
      composer: "--camera-composer-width"
    };
    Object.entries(properties).forEach(([side, property]) => {
      const width = numericWidth(state.panelWidths[side]);
      if (width) elements.cameraWorkspace.style.setProperty(property, `${width}px`);
      else elements.cameraWorkspace.style.removeProperty(property);
    });
    requestAnimationFrame(updateResizerValues);
  }

  function setPanelWidth(side, requestedWidth) {
    const limits = panelLimits[side];
    const upperBound = availablePanelWidth(side);
    state.panelWidths[side] = Math.round(Math.max(limits.min, Math.min(upperBound, requestedWidth)));
    applyPanelWidths();
  }

  function persistPanelWidths() {
    root.aigcWorkspaceCore?.persistNow?.().catch(() => {});
  }

  function resetPanelWidth(side) {
    state.panelWidths[side] = null;
    applyPanelWidths();
    persistPanelWidths();
  }

  function pointerWidth(side, clientX) {
    const shellRect = elements.cameraWorkspace.getBoundingClientRect();
    const shellStyle = getComputedStyle(elements.cameraWorkspace);
    const leftEdge = shellRect.left + parseFloat(shellStyle.paddingLeft);
    const rightEdge = shellRect.right - parseFloat(shellStyle.paddingRight);
    return side === "library" ? clientX - leftEdge : rightEdge - clientX;
  }

  function endPanelResize() {
    if (!activeResizer) return;
    activeResizer.element.classList.remove("dragging");
    document.body.classList.remove("camera-column-resizing");
    activeResizer = null;
    persistPanelWidths();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalize(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, "");
  }

  function currentItems() {
    return state.source === "cases" ? data.cases : data.genres;
  }

  function searchableText(item) {
    return normalize(Object.values(item).flat().join(" "));
  }

  function groups() {
    if (state.source === "cases") {
      return [...new Set(data.cases.map((item) => item.group))];
    }
    return ["全部类型模板"];
  }

  function filteredItems() {
    const terms = state.query.trim().split(/\s+/).filter(Boolean).map(normalize);
    return currentItems()
      .filter((item) => state.source !== "cases" || state.group === "all" || item.group === state.group)
      .filter((item) => terms.every((term) => searchableText(item).includes(term)));
  }

  function itemTitle(item) {
    const source = item?.source || state.source;
    return source === "cases"
      ? `《${item.film}》（${item.year}）${item.name}`
      : item.name;
  }

  function cameraImage(item) {
    const index = Math.max(0, Number(String(item?.number || "1").replace(/\D/g, "")) - 1);
    return cameraImages[index % cameraImages.length];
  }

  function renderSourceTabs() {
    elements.sourceTabs.querySelectorAll("[data-source]").forEach((button) => {
      button.classList.toggle("active", button.dataset.source === state.source);
    });
  }

  function renderGroupFilter() {
    const previous = state.group;
    elements.group.innerHTML = "";
    const all = document.createElement("option");
    all.value = "all";
    all.textContent = state.source === "cases" ? "全部调度分类" : "全部类型模板";
    elements.group.appendChild(all);
    groups().filter((group) => group !== "全部类型模板").forEach((group) => {
      const option = document.createElement("option");
      option.value = group;
      option.textContent = group;
      elements.group.appendChild(option);
    });
    state.group = [...elements.group.options].some((option) => option.value === previous) ? previous : "all";
    elements.group.value = state.group;
    elements.group.disabled = state.source !== "cases";
  }

  function renderResults() {
    const items = filteredItems();
    elements.count.textContent = `${items.length} 条`;
    elements.results.innerHTML = "";

    items.forEach((item) => {
      const card = document.createElement("article");
      const selected = state.selected && state.selected.id === item.id && state.selected.source === state.source;
      card.className = `camera-card ${selected ? "picked" : ""}`;
      card.dataset.cameraItemId = item.id;
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      const meta = state.source === "cases" ? item.group : (item.references || []).join(" / ");
      const method = state.source === "cases" ? item.analysis : `${item.camera} ${item.blocking}`;
      card.innerHTML = `
        <img class="camera-card-image" src="${cameraImage(item)}" alt="">
        <div class="camera-card-copy">
          <div class="camera-card-top">
            <span class="result-id">${escapeHtml(item.id)}</span>
            <span class="camera-card-action">载入</span>
          </div>
          <h2>${escapeHtml(itemTitle(item))}</h2>
          <p class="camera-card-meta">${escapeHtml(meta)}</p>
          <p class="camera-card-method">${escapeHtml(method)}</p>
        </div>
      `;
      const choose = () => {
        state.selected = { ...item, source: state.source };
        state.selectedExplicit = true;
        state.blockingOpen = true;
        state.copied = false;
        renderResults();
        renderComposer();
      };
      card.addEventListener("click", choose);
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          choose();
        }
      });
      elements.results.appendChild(card);
    });

    if (!items.length) {
      elements.results.innerHTML = '<div class="camera-no-results">没有匹配结果，试试影片名、类型或运镜动作。</div>';
    }
  }

  function fieldValue(element, fallback) {
    return element.value.trim() || fallback;
  }

  function lockedProjectVisualBaseline() {
    const helper = root.aigcProjectContext?.getAutoPrompt;
    if (typeof helper === "function") return String(helper() || "").trim();
    const project = root.aigcWorkspaceCore?.getActiveProject?.();
    const bible = project?.visualBible;
    if (bible?.status !== "locked") return "";
    return [bible.mood, bible.colorDirection, bible.lightingDirection, bible.cameraDirection, bible.materialDirection, ...(bible.negativeConstraints || [])].filter(Boolean).join("；");
  }

  function visualLook(element, fallback) {
    const manual = element.value.trim();
    const baseline = lockedProjectVisualBaseline();
    if (!baseline) return manual || fallback;
    if (manual.includes(baseline)) return manual;
    return [manual, baseline].filter(Boolean).join("\n") || fallback;
  }

  function selectedMechanism(item) {
    if (!item) return "[先从左侧选择一个大师案例或类型模板]";
    if (item.source === "cases") {
      return `参考《${item.film}》（${item.year}）的“${item.name}”调度机制。核心调度：${item.core} AI执行拆解：${item.analysis}`;
    }
    return `${item.name}类型运镜。影调光影：${item.tone} 运镜：${item.camera} 调度：${item.blocking}`;
  }

  function sourcePrompt(item) {
    if (!item || !item.prompt) return "";
    return `\n\n【案例调度参考】\n以下案例只复用摄影机路径、空间关系和调度逻辑；原人物、场景、年代、道具和既有节拍全部替换为本提示词上方设定：\n${item.prompt}`;
  }

  function composeSeedance30Formal() {
    const item = state.selected;
    const character = fieldValue(elements.character, "附角色三视图或定妆参考图；以参考图作为角色身份最高优先级");
    const scene = fieldValue(elements.scene, "[填写年代、地点、时间、天气、空间结构、关键道具与人物行动路线]");
    const look = visualLook(elements.look, "[填写本场继承的影调、色彩关系与主光方向]");
    const performance = fieldValue(elements.performance, "[填写人物起始情绪、内在变化、眼神、呼吸、重心与细微表演]");
    const action = fieldValue(elements.action, "[填写本场唯一核心事件、关键动作与触发物]");
    const start = fieldValue(elements.beatStart, "先用稳定构图建立人物、空间和压力；摄影机在人物动作触发后自然进入");
    const middle = fieldValue(elements.beatMiddle, "触发事件出现，人物动作推动镜头推进或横移；空间、光向和人物朝向保持连续");
    const end = fieldValue(elements.beatEnd, "在新的情绪或信息状态落点；明确人物位置、视线、手势和摄影机最后构图，为下一镜留下连续接口");
    const locks = fieldValue(elements.referenceLocks, "附角色三视图、场景主参考图与关键道具参考图；角色与场景均以所附参考为最高优先级");
    const ending = fieldValue(elements.ending, "30秒结尾停在可接下一镜的新状态，保留人物动作方向、视线方向和空间轴线");
    return `【Seedance 2.5｜30秒导演长镜头】\n30秒连续真人电影长镜头，一镜到底，无剪切、无跳切；16:9宽银幕。镜头运动必须由人物动作、视线变化或叙事信息揭示触发，不做无动机绕行。\n\n【角色与参考锁定】\n${character}。${locks}。严格保持同一人物的脸宽、脸颊饱满度、下巴、发际线、眼距、眉形、鼻子长度与宽度、嘴唇、耳朵、肤色、年龄、身材比例、发型与服装轮廓；不得出现相似但不同的人脸。\n\n【场景与叙事任务】\n${scene}。本场核心事件：${action}。人物表演弧线：${performance}。\n\n【影调与真实摄影质感】\n${look}。可见真实人类皮肤肌理、毛孔、细纹、轻微肤色不均和自然绒毛；真实布料、金属、木材、墙面、雨雾或空气颗粒；大画幅65mm电影摄影质感，宽广动态范围，高光柔和滚降，暗部保留层次，克制胶片颗粒。\n\n【0–10秒｜建立】\n${start}。明确起始景别、机位高度、焦段感、人物与空间的距离、主光方向和前中后景关系。\n\n【10–20秒｜推进】\n${middle}。摄影机跟随人物的真实动作推进、横移或轻微绕行；人物运动路线、道具位置和轴线关系始终可读。\n\n【20–30秒｜落点】\n${end}。${ending}。\n\n【调度机制参考】\n${selectedMechanism(item)}。只复用空间组织、摄影机触发和构图逻辑，不复制原片角色、造型、年代和具体画面。\n\n【声音】\n${elements.sound.value.trim()}。保留环境声、动作同期声、呼吸和多层空间氛围；不要用音乐掩盖表演。\n\n【连续性与限定负面】\n不要切镜、跳剪、时间跳变、空间跳变、突然改变人物身份、脸部五官、年龄、发型、服装、场景结构、光线方向或道具位置；不要塑料皮肤、蜡像脸、过度磨皮、游戏CG人物、人物复制、手指错误、穿模、漂浮、背景闪烁、动作瞬移、无动机变焦、无关角色、字幕、片头片尾文字、Logo、水印、背景音乐。${sourcePrompt(item)}`;
  }

  function composeQuick() {
    const item = state.selected;
    const character = fieldValue(elements.character, "引用已上传角色参考图，锁定同一张脸、年龄、发型、体型、服装轮廓和固定配饰，不换脸");
    const scene = fieldValue(elements.scene, "[填写具体年代、地点、时间、天气、空间结构和可见材质]");
    const performance = fieldValue(elements.performance, "[填写起始情绪、情绪变化、视线、呼吸和身体反应]");
    const action = fieldValue(elements.action, "[填写一个主要动作、关键物件和触发事件]");
    const ending = fieldValue(elements.ending, "15秒结尾停在一个可延续的新状态，为下一镜保留动作方向和视线方向");
    const look = visualLook(elements.look, "未指定；以当前运镜案例的光影逻辑为准");
    return `15秒连续真人电影长镜头，单镜头完成，无剪切、无跳切，16:9宽银幕。\n\n【角色参考】${character}。\n【场景】${scene}。\n【项目继承影调】${look}。该影调是本项目统一视觉基线，不得被案例中的其他色彩体系覆盖。\n【人物表演与剧情动作】${performance}；${action}。\n【复刻调度核心】${selectedMechanism(item)}。\n【真人电影质感】可见真实人类皮肤肌理、毛孔、细纹、绒毛、胡茬或轻微瑕疵，自然肤色起伏与湿润反光；真实布料、皮革、金属、木材、墙面和空气颗粒；大画幅IMAX 65mm电影摄影感，宽广动态范围，高光柔和滚降，暗部保留细节，克制胶片颗粒。\n【声音】${elements.sound.value.trim()}。\n【结尾】${ending}。\n【限定负面】不要塑料皮肤、蜡像脸、过度磨皮、游戏CG人物、身份漂移、换脸、五官变形、手指错误、人物复制、穿模、漂浮、背景闪烁、空间跳变、文字水印、Logo、字幕、快速剪辑、无动机环绕、无动机变焦、无关角色。${sourcePrompt(item)}`;
  }

  function composeSeedance30Quick() {
    const item = state.selected;
    const character = fieldValue(elements.character, "引用角色三视图或定妆参考图，锁定同一人物身份、脸部与服装轮廓");
    const scene = fieldValue(elements.scene, "[填写年代、地点、时间、天气、空间结构、关键道具与人物路线]");
    const look = visualLook(elements.look, "未指定；继承项目影调，并以当前运镜案例的空间与光影逻辑为准");
    const performance = fieldValue(elements.performance, "[填写人物起始情绪、变化、眼神、呼吸与动作反应]");
    const action = fieldValue(elements.action, "[填写本场唯一核心事件、关键动作与触发物]");
    const start = fieldValue(elements.beatStart, "建立人物、空间、起始构图和情绪压力");
    const middle = fieldValue(elements.beatMiddle, "触发事件出现，人物动作推动摄影机自然推进或横移");
    const end = fieldValue(elements.beatEnd, "落在新的信息或情绪状态，明确人物位置、视线和最终构图");
    const locks = fieldValue(elements.referenceLocks, "附角色三视图、场景主参考图与关键道具参考图；均以参考图为最高优先级");
    return `30秒连续真人电影长镜头，一镜到底，无剪切、无跳切，16:9宽银幕。\n\n【角色与参考锁定】${character}。${locks}。保持同一张脸、年龄、发型、体型、服装和固定配饰，不换脸。\n【场景与项目影调】${scene}。${look}。\n【人物表演与剧情动作】${performance}。${action}。\n【0–10秒 建立】${start}。\n【10–20秒 推进】${middle}。\n【20–30秒 落点】${end}。\n【复刻调度核心】${selectedMechanism(item)}。只复用空间组织、摄影机触发和构图逻辑，不复制原片具体人物与画面。\n【真人摄影质感】真实皮肤毛孔、细纹与自然肤色起伏；真实布料、金属、木材、空气颗粒；大画幅65mm电影摄影感，宽广动态范围，高光柔和，暗部有层次。\n【声音】${elements.sound.value.trim()}。保留环境声、动作同期声、呼吸与空间氛围；不要背景音乐。\n【限定负面】不要切镜、跳剪、时间或空间跳变、身份漂移、换脸、五官变形、塑料皮肤、游戏CG人物、人物复制、穿模、背景闪烁、无动机运镜、字幕、Logo、水印、背景音乐。${sourcePrompt(item)}`;
  }

  function composeFormal() {
    const item = state.selected;
    const character = fieldValue(elements.character, "引用已上传角色参考图作为最高优先级，锁定身份和外形");
    const scene = fieldValue(elements.scene, "[年代、地点、时间、天气、空间结构、前中后景、材质和环境运动]");
    const performance = fieldValue(elements.performance, "[起始状态 -> 触发反应 -> 情绪变化 -> 结束状态，并写清眼神、呼吸和身体重心]");
    const action = fieldValue(elements.action, "[0-3秒建立；3-6秒触发；6-10秒升级；10-13秒决定；13-15秒新状态]");
    const ending = fieldValue(elements.ending, "[15秒末人物位置、朝向、视线、手中物和摄影机状态，用于接下一镜]");
    const look = visualLook(elements.look, "未指定；以当前运镜案例的光影逻辑为准");
    return `【01 镜头任务】\n15秒连续真人电影长镜头，单镜头完成，无剪切、无跳切，16:9宽银幕，镜头运动必须由人物动作、视线变化或信息揭示触发。\n\n【02 角色参考与一致性】\n${character}；保持同一张脸、年龄、肤色、脸型、五官比例、发型、发际线、体型、服装轮廓和固定配饰；参考图只锁角色身份，不照搬静态表情与僵硬姿势。\n\n【03 场景与空间】\n${scene}。写清人物与门窗、桌椅、道路、掩体或关键物件的距离，路线连续，前中后景关系稳定。\n\n【04 项目继承影调】\n${look}。该影调是本项目统一视觉基线，不得被案例中的其他色彩体系覆盖。\n\n【05 人物初始状态与表演弧线】\n${performance}。表演通过眼神焦点、眨眼频率、吞咽、下颌张力、呼吸、手指微动作、肩颈压力、重心转移和短暂停顿体现；不做夸张舞台表演。\n\n【06 剧情动作与15秒节拍】\n${action}。15秒只完成一个核心动作和一次明确的信息升级。\n\n【07 大师调度机制】\n${selectedMechanism(item)}。只复刻空间组织、表演节拍、摄影机触发、构图遮挡与光影逻辑，不复制原片角色、造型和具体画面。\n\n【08 摄影机与构图】\n明确起始景别、机位高度、焦段感、移动方向、速度、主体距离、前景遮挡、轴线和最终落点；运动平滑克制，主体始终可读，不无故绕圈。\n\n【09 光影影调】\n所有光源方向明确，主光、环境光、实景光和轮廓光服务剧情；暗部有细节，高光不过曝，色彩主次清楚，不混合互相冲突的影片影调。\n\n【10 真人材质与摄影质感】\n可见真实人类皮肤肌理、毛孔、细纹、绒毛、胡茬或轻微瑕疵，眼球自然湿润，嘴唇纹理真实；真实布料、皮革、金属、木材、墙面、灰尘、雨水或雾气；大画幅IMAX 65mm电影摄影感，宽广动态范围，高光柔和滚降，暗部层次完整，克制细腻胶片颗粒。\n\n【11 声音设计】\n${elements.sound.value.trim()}。保留多轨环境氛围、空间远近层次和动作同期声，不使用情绪配乐代替表演。\n\n【12 结尾连续性】\n${ending}。\n\n【13 限定负面】\n不要塑料皮肤、蜡像脸、过度磨皮、美颜滤镜、游戏CG人物、卡通感、身份漂移、换脸、五官变形、手指错误、人物复制、穿模、漂浮、背景闪烁、空间跳变、轴线混乱、动作瞬移、无动机环绕、无动机变焦、过度慢动作、文字水印、Logo、字幕、背景音乐、快速剪辑和无关角色。${sourcePrompt(item)}`;
  }

  function currentPrompt() {
    if (state.mode === "seedance30") return state.last30Mode === "formal" ? composeSeedance30Formal() : composeSeedance30Quick();
    return state.mode === "formal" ? composeFormal() : composeQuick();
  }

  function validationState() {
    const missing = [];
    if (!state.selected) missing.push("运镜案例");
    if (!elements.character.value.trim()) missing.push("角色");
    if (!elements.scene.value.trim()) missing.push("场景");
    if (!elements.performance.value.trim()) missing.push("表演");
    if (!elements.action.value.trim()) missing.push("动作");
    if (state.mode === "seedance30") {
      if (!elements.beatStart.value.trim()) missing.push("0–10秒建立");
      if (!elements.beatMiddle.value.trim()) missing.push("10–20秒推进");
      if (!elements.beatEnd.value.trim()) missing.push("20–30秒落点");
    }
    return missing;
  }

  function renderCameraTimeline(model) {
    const markers = model.markers.map((marker) => `<span>${String(marker).padStart(2, "0")}</span>`).join("");
    const tracks = model.tracks.map((track) => `
      <div class="camera-track" data-track="${track.id}">
        <strong>${escapeHtml(track.label)}</strong>
        <div class="camera-track-lane">
          ${track.beats.map((beat) => `
            <span class="camera-beat" style="--beat-start:${beat.start};--beat-end:${beat.end}" title="${escapeHtml(beat.label)}">
              ${escapeHtml(beat.label)}
            </span>
          `).join("")}
        </div>
      </div>
    `).join("");
    elements.timeline.innerHTML = `<div class="camera-ruler"><i></i>${markers}</div>${tracks}`;
  }

  function cameraDescription(item) {
    if (!item) return [];
    if (item.source === "cases") {
      return [
        { label: "镜头意图", text: item.core || item.name },
        { label: "调度方法", text: item.analysis || item.prompt }
      ];
    }
    return [
      { label: "影调氛围", text: item.tone || item.name },
      { label: "运镜调度", text: [item.camera, item.blocking].filter(Boolean).join(" ") }
    ];
  }

  function renderBlockingMap(model, item) {
    const map = buildBlockingMapModel(model);
    const descriptions = cameraDescription(item);
    elements.blockingMap.innerHTML = `
      <header><strong>空间调度路径</strong><small>起点 → 转折 → 落点</small></header>
      <div class="camera-map-points">
        ${map.points.map((point) => `
          <article><b>${point.id}</b><span>${point.time}s</span><p>${escapeHtml(point.label)}</p></article>
        `).join("")}
      </div>
      <div class="camera-shot-description" aria-label="当前案例镜头描述">
        ${descriptions.map((description) => `
          <article><strong>${escapeHtml(description.label)}</strong><p>${escapeHtml(description.text)}</p></article>
        `).join("")}
      </div>
    `;
  }

  function renderAspect() {
    elements.stage.dataset.cameraAspect = state.aspect;
    elements.monitorAspectLabel.textContent = state.aspect === "wide" ? "16:9" : "21:9";
    elements.aspectButtons.forEach((button) => {
      const active = button.dataset.cameraAspect === state.aspect;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function renderCameraStage() {
    const item = state.selected;
    elements.selection.classList.toggle("empty-selection", !item);
    elements.selection.innerHTML = item
      ? `<span>当前运镜</span><strong>${escapeHtml(itemTitle(item))}</strong><small>${escapeHtml(item.source === "cases" ? item.group : (item.references || []).join(" / "))}</small>`
      : "尚未选择运镜案例";
    elements.monitorId.textContent = item ? `${item.id} · PRIMARY CAMERA` : "SHOT -- · PRIMARY CAMERA";
    elements.monitorImage.src = "assets/tone-option2-hero.png";
    elements.monitorImage.alt = item ? `${itemTitle(item)}运镜参考画面` : "当前镜头运镜电影监看画面";
    renderAspect();

    const duration = state.mode === "seedance30" ? 30 : 15;
    const timelineItem = state.mode === "seedance30" ? {
      ...item,
      prompt: `0-10秒 ${fieldValue(elements.beatStart, "建立人物、空间与压力")}；10-20秒 ${fieldValue(elements.beatMiddle, "触发事件并推进人物动作")}；20-30秒 ${fieldValue(elements.beatEnd, "信息与情绪落点")}`
    } : item;
    const model = buildCameraTimelineModel(timelineItem, duration);
    elements.cameraWorkspace.dataset.cameraMode = state.mode;
    elements.durationKicker.textContent = `${duration} SECOND SHOT`;
    elements.timelineTitle.textContent = `0–${duration}秒镜头节奏`;
    renderCameraTimeline(model);
    const supportsMap = Boolean(item);
    elements.blockingToggle.hidden = !supportsMap;
    if (!supportsMap) state.blockingOpen = false;
    elements.blockingToggle.setAttribute("aria-expanded", String(state.blockingOpen));
    elements.blockingMap.hidden = !supportsMap || !state.blockingOpen;
    if (supportsMap) renderBlockingMap(model, item);
    elements.saveVersion.textContent = state.versions.length ? `保存版本 V${state.versions.length + 1}` : "保存版本";
    elements.saveVersion.disabled = !item;
  }

  function renderComposer() {
    const structure = state.mode === "seedance30" ? state.last30Mode : state.mode;
    elements.structureModes.forEach((button) => {
      const active = button.dataset.cameraStructure === structure;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const duration = state.mode === "seedance30" ? "30" : "15";
    elements.durationModes.forEach((button) => {
      const active = button.dataset.cameraDuration === duration;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    elements.shortStructure.hidden = false;
    elements.seedance30Beats.hidden = state.mode !== "seedance30";
    elements.output.value = currentPrompt();
    elements.copy.textContent = state.copied ? "已复制" : "复制提示词";
    const missing = validationState();
    elements.copy.disabled = missing.length > 0;
    elements.validation.textContent = missing.length ? `还需完成：${missing.join("、")}` : "内容完整，可以复制生成。";
    elements.validation.classList.toggle("ready", missing.length === 0);
    renderCameraStage();
  }

  function renderLibrary() {
    renderSourceTabs();
    renderGroupFilter();
    renderResults();
  }

  function resetComposer() {
    state.selected = defaultCameraSelection(state.source);
    state.selectedExplicit = false;
    state.copied = false;
    [elements.character, elements.scene, elements.look, elements.performance, elements.action, elements.ending, elements.beatStart, elements.beatMiddle, elements.beatEnd, elements.referenceLocks].forEach((element) => {
      element.value = "";
    });
    renderResults();
    renderComposer();
  }

  elements.sourceTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-source]");
    if (!button) return;
    state.source = button.dataset.source;
    state.group = "all";
    state.selected = defaultCameraSelection(state.source);
    state.selectedExplicit = false;
    renderLibrary();
  });

  elements.search.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderResults();
  });

  elements.group.addEventListener("change", (event) => {
    state.group = event.target.value;
    renderResults();
  });

  elements.structureModes.forEach((button) => {
    button.addEventListener("click", () => {
      const structure = button.dataset.cameraStructure === "formal" ? "formal" : "quick";
      if (state.mode === "seedance30") state.last30Mode = structure;
      else {
        state.mode = structure;
        state.last15Mode = structure;
      }
      state.copied = false;
      renderComposer();
    });
  });

  elements.durationModes.forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.cameraDuration === "30" ? "seedance30" : state.last15Mode;
      state.copied = false;
      renderComposer();
    });
  });

  elements.aspectButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.aspect = button.dataset.cameraAspect === "wide" ? "wide" : "cinema";
      renderAspect();
    });
  });

  elements.resizers.forEach((resizer) => {
    const side = resizer.dataset.cameraResizer;
    resizer.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || !root.matchMedia("(min-width: 1181px)").matches) return;
      activeResizer = { side, element: resizer };
      resizer.classList.add("dragging");
      document.body.classList.add("camera-column-resizing");
      resizer.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    resizer.addEventListener("dblclick", () => resetPanelWidth(side));
    resizer.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const physicalDirection = event.key === "ArrowLeft" ? -1 : 1;
      const panelDirection = side === "library" ? physicalDirection : -physicalDirection;
      setPanelWidth(side, currentPanelWidth(side) + panelDirection * 24);
      persistPanelWidths();
      event.preventDefault();
    });
  });

  root.addEventListener("pointermove", (event) => {
    if (!activeResizer) return;
    setPanelWidth(activeResizer.side, pointerWidth(activeResizer.side, event.clientX));
  });
  root.addEventListener("pointerup", endPanelResize);
  root.addEventListener("pointercancel", endPanelResize);
  root.addEventListener("resize", updateResizerValues);

  [elements.character, elements.scene, elements.look, elements.performance, elements.action, elements.sound, elements.ending, elements.beatStart, elements.beatMiddle, elements.beatEnd, elements.referenceLocks].forEach((element) => {
    element.addEventListener("input", () => {
      state.copied = false;
      renderComposer();
    });
  });

  elements.copy.addEventListener("click", async () => {
    elements.output.focus();
    elements.output.select();
    try {
      await navigator.clipboard.writeText(currentPrompt());
    } catch (error) {
      document.execCommand("copy");
    }
    state.copied = true;
    renderComposer();
    setTimeout(() => {
      state.copied = false;
      renderComposer();
    }, 1200);
  });

  elements.clear.addEventListener("click", resetComposer);

  elements.blockingToggle.addEventListener("click", () => {
    state.blockingOpen = !state.blockingOpen;
    renderCameraStage();
  });

  elements.saveVersion.addEventListener("click", () => {
    if (!state.selected) return;
    state.versions.push({
      number: state.versions.length + 1,
      createdAt: new Date().toISOString(),
      selected: { source: state.selected.source, id: state.selected.id },
      prompt: currentPrompt()
    });
    state.versions = state.versions.slice(-20);
    renderCameraStage();
  });

  root.aigcCameraWorkbench = {
    exportState() {
      return {
        source: state.source,
        mode: state.mode,
        last15Mode: state.last15Mode,
        last30Mode: state.last30Mode,
        group: state.group,
        query: state.query,
        selected: state.selected ? { source: state.selected.source, id: state.selected.id } : null,
        selectedDetail: state.selected ? {
          source: state.selected.source,
          id: state.selected.id,
          name: state.selected.name || "",
          core: state.selected.core || "",
          analysis: state.selected.analysis || ""
        } : null,
        selectedExplicit: state.selectedExplicit,
        aspect: state.aspect,
        character: elements.character.value,
        scene: elements.scene.value,
        look: elements.look.value,
        performance: elements.performance.value,
        action: elements.action.value,
        sound: elements.sound.value,
        ending: elements.ending.value,
        beatStart: elements.beatStart.value,
        beatMiddle: elements.beatMiddle.value,
        beatEnd: elements.beatEnd.value,
        referenceLocks: elements.referenceLocks.value,
        blockingOpen: state.blockingOpen,
        versions: state.versions,
        panelWidths: state.panelWidths
      };
    },
    importState(saved = {}) {
      state.source = saved.source === "genres" ? "genres" : "cases";
      state.mode = ["quick", "formal", "seedance30"].includes(saved.mode) ? saved.mode : "quick";
      state.last15Mode = saved.last15Mode === "formal" || state.mode === "formal" ? "formal" : "quick";
      state.last30Mode = saved.last30Mode === "formal" ? "formal" : "quick";
      state.group = saved.group || "all";
      state.query = saved.query || "";
      const list = state.source === "cases" ? data.cases : data.genres;
      const restored = saved.selected ? list.find((item) => item.id === saved.selected.id) || null : null;
      state.selected = restored ? { ...restored, source: state.source } : defaultCameraSelection(state.source);
      state.selectedExplicit = restored ? saved.selectedExplicit !== false : false;
      state.aspect = saved.aspect === "wide" ? "wide" : "cinema";
      state.blockingOpen = Boolean(saved.blockingOpen);
      state.versions = Array.isArray(saved.versions) ? saved.versions.slice(-20) : [];
      state.panelWidths = {
        library: numericWidth(saved.panelWidths?.library),
        composer: numericWidth(saved.panelWidths?.composer)
      };
      applyPanelWidths();
      elements.search.value = state.query;
      elements.character.value = saved.character || "";
      elements.scene.value = saved.scene || "";
      elements.look.value = saved.look || "";
      elements.performance.value = saved.performance || "";
      elements.action.value = saved.action || "";
      elements.sound.value = saved.sound || elements.sound.defaultValue;
      elements.ending.value = saved.ending || "";
      elements.beatStart.value = saved.beatStart || "";
      elements.beatMiddle.value = saved.beatMiddle || "";
      elements.beatEnd.value = saved.beatEnd || "";
      elements.referenceLocks.value = saved.referenceLocks || "";
      renderLibrary();
      renderComposer();
    },
    selectItem(source, id) {
      const nextSource = source === "genres" ? "genres" : "cases";
      const list = nextSource === "cases" ? data.cases : data.genres;
      const selected = list.find((item) => item.id === id);
      if (!selected) return false;
      state.source = nextSource;
      state.group = "all";
      state.selected = { ...selected, source: nextSource };
      state.selectedExplicit = true;
      state.blockingOpen = true;
      state.copied = false;
      renderLibrary();
      renderComposer();
      return true;
    },
    receiveTone(prompt) {
      elements.look.value = prompt || "";
      state.copied = false;
      renderComposer();
    },
    receiveCharacter(summary) {
      elements.character.value = summary || "";
      state.copied = false;
      renderComposer();
    },
    receiveSceneShot(payload) {
      const scene = payload?.scene || {};
      const shot = payload?.shot || {};
      const shotCard = shot.promptCard || {};
      elements.character.value = Array.isArray(scene.characters) ? scene.characters.join("、") : "";
      elements.scene.value = [scene.setting, scene.time, shotCard.narrative || scene.storyBeat].filter(Boolean).join("；");
      elements.look.value = String(payload?.visual || "").trim();
      elements.performance.value = shotCard.performance || shot.performance || scene.emotion || "";
      elements.action.value = shotCard.action || scene.action || "";
      elements.sound.value = shotCard.sound || shot.sound || "不要背景音乐，只保留环境声与多层空间氛围。";
      elements.ending.value = `${shot.durationSeconds || 15} 秒内完成动作与情绪落点，保持连续长镜头。`;
      state.copied = false;
      renderComposer();
      document.dispatchEvent(new Event("aigc:workspace-dirty"));
      return true;
    },
    receiveProjectContext(context) {
      const prompt = String(context?.prompt || "").trim();
      if (!prompt) return false;
      if (!elements.look.value.includes(prompt)) {
        elements.look.value = [elements.look.value.trim(), prompt].filter(Boolean).join("\n");
      }
      state.copied = false;
      renderComposer();
      document.dispatchEvent(new Event("aigc:workspace-dirty"));
      return true;
    }
  };

  renderLibrary();
  renderComposer();
  document.addEventListener("aigc:project-context", () => renderComposer());
})(typeof window !== "undefined" ? window : globalThis);
