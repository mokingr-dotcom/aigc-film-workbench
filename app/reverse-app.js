(function initReverseWorkbench(root) {
  if (!root.document) return;

  const { normalizeDimensions, countCalibratedDimensions, buildHumanConstraints } = root.aigcReverseAnalysis;

  const purposeProfiles = {
    film: "真人写实电影画面，重点识别人物表演、真实空间、摄影机位置、动机光源、电影调色和可见材质",
    poster: "电影海报主视觉，重点识别主体尺度、视觉动线、标题留白、前中后景、类型影调和缩略图识别度",
    portrait: "人物肖像或角色定妆，重点识别脸部结构、年龄、表情、服装、焦段、机位、皮肤质感和背景分离",
    scene: "环境场景与世界观画面，重点识别空间尺度、地平线、透视、天气、时间、建筑材质、空气层次和人物尺度参照",
    product: "商品与商业主视觉，重点识别产品外形、材质、品牌安全区、镜头高度、接触阴影、高光形状和背景色面",
    animation: "动画或插画画面，重点识别造型比例、轮廓线、色块、渲染方式、光影层级、背景笔触和媒介质感"
  };

  const fidelityProfiles = {
    balanced: "保留参考图的构图规律、机位关系、光线逻辑、色彩比例和材质层级，但替换具体人物、物件、地点、文字与品牌，生成原创画面",
    close: "尽量接近参考图的画幅、主体占比、视觉动线、机位高度、焦段感、主光方向、明暗比例和主辅色面积；不得照抄文字、Logo、具体人物身份或受保护角色",
    inspired: "只提取高层视觉规律与情绪，不追求相同物件和相同布局；允许重新设计主体位置、环境和色彩细节，但保留最关键的摄影与美术方法"
  };

  const emphasisProfiles = {
    all: "八个维度权重均衡，不允许用风格词替代摄影和构图分析",
    composition: "重点加强构图方式与镜头角度，写出主体占比、三分线位置、景别、机位高度、俯仰角、焦段感和透视压缩",
    lighting: "重点加强光线方向与色彩搭配，写出主光位置、软硬、光比、环境光、轮廓光、色温、主辅色面积和饱和度",
    subject: "重点加强主体特征与材质细节，写出身份、年龄、体态、动作、表情、服装结构、皮肤、布料、金属和表面反射",
    background: "重点加强画面风格与背景元素，写出时代、地点、天气、前中后景、空气介质、建筑或道具层级及其叙事作用"
  };

  const qualityProfiles = {
    cinematic: "真实全画幅电影摄影，真实可见皮肤肌理与环境材质，宽广动态范围，高光柔和滚降，暗部保留层次，克制胶片颗粒，去除AI塑料感",
    imax: "大画幅IMAX 65mm电影摄影质感，高解析空间层次，自然透视，细腻胶片颗粒，宽广动态范围，真实肤色与空气介质，宏大但不做游戏CG",
    commercial: "高端商业摄影完成度，产品或人物边缘干净，材质高还原，光源受控，高光形状精确，背景层级简洁，适合正式广告主视觉",
    documentary: "自然纪实摄影，真实环境光、生活色、非摆拍状态、适度颗粒与真实瑕疵，避免过度布光、磨皮和广告滤镜",
    animation: "电影级动画或插画完成度，造型、线条、色块、材质和背景渲染统一，空间光影清楚，不混合互相冲突的画风"
  };

  const textPolicyProfiles = {
    remove: "不复制参考图中的任何标题、字幕、Logo、水印、品牌名、演职员表和随机字符；最终生图提示词明确要求无文字、无水印",
    reserve: "分析参考图中文字区域的位置、面积、对齐和层级，但不识别、不照抄具体文字内容；在对应位置保留干净稳定的后期排版区",
    describe: "分析标题、宣传语和辅助信息的字号层级、字体类别、位置、对齐和颜色关系，但全部改写为抽象排版规则，不复制原文、Logo和品牌"
  };

  const dimensionRules = [
    "主体特征：主体数量、身份或品类、年龄感、脸部与体型、服装或产品结构、姿态动作、表情视线、主体占画面比例及最醒目的识别特征",
    "构图方式：横竖构图、对称或非对称、三分法或居中、留白位置、视觉动线、前景遮挡、前中后景层级、主体与标题区关系",
    "镜头角度：景别、机位高度、平视/俯拍/仰拍/倾斜、观察方向、焦段感、透视夸张或压缩、景深范围以及相机与主体的距离感",
    "光线方向：主光来自哪个方向和高度、硬光或柔光、主辅光比、环境光、轮廓光、实景光源、投影方向、高光与暗部保留情况",
    "色彩搭配：主色、辅助色、强调色、冷暖关系、互补或邻近关系、饱和度、明度、肤色或商品固有色以及各颜色的大致面积比例",
    "材质细节：皮肤、头发、布料、金属、玻璃、木材、石材、纸张、液体、雨雾、颗粒、反射、粗糙度和真实瑕疵的可见程度",
    "画面风格：写实或动画媒介、摄影/绘画/渲染方法、年代感、类型气质、胶片或数字质感、精致度；必须拆成可执行特征，不能只写某导演或某艺术家风格",
    "背景元素：地点、时代、时间、天气、建筑、家具、道具、植被、地面、天空、空气介质、远景层次及每个背景元素对叙事和构图的作用"
  ];

  const DEFAULT_LAYOUT = { leftWidth: 300, rightWidth: 500 };
  const LEFT_WIDTH_LIMITS = { min: 270, max: 420 };
  const RIGHT_WIDTH_LIMITS = { min: 420, max: 620 };
  const CENTER_MINIMUM_WIDTH = 500;
  const LAYOUT_FIXED_SPACE = 42;
  const MINIMUM_DESKTOP_LAYOUT_WIDTH = LEFT_WIDTH_LIMITS.min + RIGHT_WIDTH_LIMITS.min + CENTER_MINIMUM_WIDTH + LAYOUT_FIXED_SPACE;
  const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
  const state = {
    copied: false,
    imageName: "",
    imageUrl: "",
    imageError: "",
    importedImageName: "",
    dimensions: normalizeDimensions(),
    layout: { ...DEFAULT_LAYOUT }
  };

  const elements = {
    workspace: document.querySelector("#reverse-workspace"),
    sourceMode: document.querySelector("#reverse-source-mode"),
    imageInput: document.querySelector("#reverse-image-input"),
    imagePreview: document.querySelector("#reverse-image-preview"),
    imagePlaceholder: document.querySelector("#reverse-image-placeholder"),
    upload: document.querySelector(".reverse-upload"),
    referenceStatus: document.querySelector("#reverse-reference-status"),
    privacyNote: document.querySelector("#reverse-privacy-note"),
    purpose: document.querySelector("#reverse-purpose"),
    fidelity: document.querySelector("#reverse-fidelity"),
    emphasis: document.querySelector("#reverse-emphasis"),
    ratio: document.querySelector("#reverse-ratio"),
    quality: document.querySelector("#reverse-quality"),
    textPolicy: document.querySelector("#reverse-text-policy"),
    replacement: document.querySelector("#reverse-replacement"),
    extra: document.querySelector("#reverse-extra"),
    output: document.querySelector("#reverse-output"),
    filename: document.querySelector("#reverse-filename"),
    validation: document.querySelector("#reverse-validation"),
    copy: document.querySelector("#reverse-copy"),
    example: document.querySelector("#reverse-example"),
    clear: document.querySelector("#reverse-clear"),
    clearDimensions: document.querySelector("#reverse-clear-dimensions"),
    calibrationCount: document.querySelector("#reverse-calibration-count"),
    calibrationSummary: document.querySelector(".reverse-calibration-summary strong"),
    dimensionInputs: [...document.querySelectorAll("[data-reverse-dimension]")],
    resizers: [...document.querySelectorAll("[data-reverse-resizer]")]
  };

  function value(element, fallback) {
    return element.value.trim() || fallback;
  }

  function safeName(text, fallback) {
    return String(text || "").trim().replace(/[\\/:*?"<>|\s]+/g, "_").replace(/^_+|_+$/g, "") || fallback;
  }

  function ratioRule() {
    return elements.ratio.value === "source"
      ? "先识别参考图原始宽高关系并沿用相同比例，同时在结果中写出推测比例"
      : `最终画面固定为 ${elements.ratio.value} 比例，重新安排安全边距，主体和关键元素不得因改幅被裁切`;
  }

  function composePrompt() {
    const replacement = value(elements.replacement, "默认保留参考图中的主体类别，但把具体人物、品牌、文字和受保护形象改造成原创内容");
    const extra = value(elements.extra, "无额外要求；以参考图可见证据为准，不臆造画外信息");
    return `【任务】
请分析我随本指令上传的参考图片，并反推出一套可以生成相似视觉效果的完整中文生图提示词。反推用途：${purposeProfiles[elements.purpose.value]}。

【核心要求】
请不要只描述图片里有什么，也不要只给出“电影感、高级感、氛围感”等空泛词语。必须从主体特征、构图方式、镜头角度、光线方向、色彩搭配、材质细节、画面风格和背景元素八个方面逐项拆解；所有判断都要转译成生图模型可以执行的视觉参数。无法从画面确认的内容标记为“无法确认”，不要编造影片名、摄影师、导演、相机型号或镜头型号。

【八维拆解标准】
${dimensionRules.map((rule, index) => `${index + 1}. ${rule}`).join("\n")}

【人工确认约束】
以下非空内容由用户人工确认，优先级高于模型推测，不得覆盖或改写：
${buildHumanConstraints(state.dimensions)}
未填写的维度请继续根据参考图完成分析；无法确认时写“无法确认”。

【分析重点】
${emphasisProfiles[elements.emphasis.value]}。

【复刻边界】
${fidelityProfiles[elements.fidelity.value]}。不要复制参考图中的具体人物身份、明星脸、受保护角色、品牌标识和版权文字；只复用一般性的构图、摄影、光影、色彩、材质和空间方法。

【主体与内容替换】
${replacement}。替换主体后仍要严格保持合理的透视、光向、接触阴影、反射色和空间尺度，不能像后期抠图贴上去。

【画幅与完成度】
${ratioRule()}。${qualityProfiles[elements.quality.value]}。

【文字与标识】
${textPolicyProfiles[elements.textPolicy.value]}。

【补充要求】
${extra}。

【必须按以下格式输出】
A. 八维拆解：用1至8编号逐项输出，每项先写“观察到的证据”，再写“可执行的生成参数”。
B. 完整中文复刻提示词：整合为一段可以直接复制生图的自然语言，依次包含主体与动作、环境与时代、构图、景别与机位、焦段与景深、主光与环境光、色彩关系、材质、画面风格、背景层次、画幅和清晰度。不要在最终提示词中引用导演、艺术家或影片名称。
C. 限定负面词：根据参考图和目标用途生成一段针对性负面词，至少约束主体重复、身份漂移、五官与手部错误、透视错误、光源冲突、投影方向错误、材质塑料感、过曝、死黑、背景杂乱、随机文字、Logo和水印。
D. 技术参数摘要：单独列出建议画幅、景别、机位、焦段感、景深、主光方向、光比、主色、辅助色、强调色、饱和度、清晰度和质感。

最终目标不是复述原图，而是得到一段在替换具体内容后，仍能复现其构图逻辑、镜头感觉、光影关系、色彩秩序和材质层次的专业提示词。`;
  }

  function renderImageState() {
    const localMode = elements.sourceMode.value === "local";
    elements.upload.classList.toggle("active", localMode);
    elements.upload.classList.toggle("is-error", Boolean(state.imageError));
    elements.imageInput.disabled = !localMode;
    elements.privacyNote.textContent = localMode
      ? "本地选图只用于当前浏览器预览，不上传服务器，也不会写入项目备份；使用反推指令时仍需把同一张图上传到目标AI。"
      : "请把参考图上传到支持看图的目标AI，再粘贴右侧反推指令。本网站不会读取目标AI中的图片。";
    elements.imagePreview.hidden = !state.imageUrl;
    elements.imagePlaceholder.hidden = Boolean(state.imageUrl);
    if (state.imageUrl) elements.imagePreview.src = state.imageUrl;
    if (state.imageError) {
      elements.referenceStatus.textContent = state.imageError;
      elements.imagePlaceholder.textContent = state.imageError;
    } else if (state.imageName) {
      elements.referenceStatus.textContent = `已选择：${state.imageName}`;
      elements.imagePlaceholder.textContent = "选择本地参考图片";
    } else if (state.importedImageName) {
      elements.referenceStatus.textContent = `项目记录：${state.importedImageName}`;
      elements.imagePlaceholder.textContent = `项目记录：${state.importedImageName}，请重新选择本地图片`;
    } else {
      elements.referenceStatus.textContent = "等待参考图";
      elements.imagePlaceholder.textContent = "选择本地参考图片";
    }
  }

  function validationState() {
    if (elements.sourceMode.value === "local" && !state.imageName) return "请先选择本地参考图片，或改用“在目标AI中上传参考图”。";
    return "可以复制；请同时在目标AI中上传参考图片。";
  }

  function renderDimensionState() {
    const normalizedDimensions = normalizeDimensions(state.dimensions);
    state.dimensions = normalizedDimensions;
    const calibratedCount = countCalibratedDimensions(normalizedDimensions);
    elements.calibrationCount.textContent = `已校准 ${calibratedCount}/8`;
    elements.calibrationSummary.textContent = `${calibratedCount} / 8`;
    elements.dimensionInputs.forEach((input) => {
      const key = input.dataset.reverseDimension;
      const calibrated = Boolean(normalizedDimensions[key]);
      if (input.value !== normalizedDimensions[key]) input.value = normalizedDimensions[key];
      input.closest(".reverse-dimension-field").classList.toggle("calibrated", calibrated);
    });
  }

  function render() {
    renderImageState();
    renderDimensionState();
    elements.output.value = composePrompt();
    elements.copy.textContent = state.copied ? "已复制" : "复制反推指令";
    const incomplete = elements.sourceMode.value === "local" && !state.imageName;
    elements.copy.disabled = incomplete;
    elements.validation.textContent = validationState();
    elements.validation.classList.toggle("ready", !incomplete);
    const imageName = state.imageName || state.importedImageName;
    elements.filename.textContent = `REVERSE_${safeName(imageName.replace(/\.[^.]+$/, ""), "参考画面")}_八维反推_v001.txt`;
  }

  function clearDimensions() {
    state.dimensions = normalizeDimensions();
    state.copied = false;
    render();
    notifyWorkspaceDirty();
  }

  function clearFields() {
    clearImagePreview();
    state.imageName = "";
    state.imageError = "";
    state.importedImageName = "";
    elements.imageInput.value = "";
    elements.sourceMode.value = "target";
    elements.purpose.value = "film";
    elements.fidelity.value = "balanced";
    elements.emphasis.value = "all";
    elements.ratio.value = "source";
    elements.quality.value = "cinematic";
    elements.textPolicy.value = "remove";
    elements.replacement.value = "";
    elements.extra.value = "";
    state.dimensions = normalizeDimensions();
    state.copied = false;
    render();
    notifyWorkspaceDirty();
  }

  function loadExample() {
    elements.sourceMode.value = "target";
    elements.purpose.value = "film";
    elements.fidelity.value = "balanced";
    elements.emphasis.value = "lighting";
    elements.ratio.value = "2.39:1";
    elements.quality.value = "imax";
    elements.textPolicy.value = "remove";
    elements.replacement.value = "保留原画面的构图、机位、雨夜逆光和冷暖关系，把主体替换为38岁中国女刑警，深灰风衣，站在北方旧港口，克制回头，手持红色儿童救生圈";
    elements.extra.value = "可见真实皮肤毛孔、湿润风衣布料、铁锈和雨水反光，不要AI塑料感，不要背景音乐文字，不要字幕和水印";
    state.dimensions = normalizeDimensions({
      subject: "观察证据：单人位于画面中右部，38岁女性，克制回头，手持红色救生圈。\n可执行参数：38岁中国女刑警，深灰风衣，半身站姿，视线回望镜头外。",
      composition: "观察证据：宽画幅，主体靠右，左侧港口空间和雾气形成留白。\n可执行参数：2.39:1横构图，主体占右侧三分之一，左侧保留码头与雾景。",
      lighting: "观察证据：冷白逆光勾勒湿润风衣，局部暖色反射来自港口实景灯。\n可执行参数：右后方冷白硬逆光，低位暖色环境补光，保留雨水高光。",
      color: "观察证据：冷灰蓝环境为主，救生圈红色成为小面积强调色。\n可执行参数：低饱和蓝灰主色，铁锈棕辅助色，红色占画面5%以内。"
    });
    state.copied = false;
    render();
    notifyWorkspaceDirty();
  }

  function notifyWorkspaceDirty() {
    document.dispatchEvent(new CustomEvent("aigc:workspace-dirty", { detail: { workspace: "reverse" } }));
  }

  function clearImagePreview() {
    const imageUrl = state.imageUrl;
    state.imageUrl = "";
    elements.imagePreview.removeAttribute("src");
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  }

  function clamp(number, minimum, maximum) {
    return Math.min(Math.max(number, minimum), maximum);
  }

  function workspaceWidth() {
    return elements.workspace.clientWidth || root.innerWidth || 0;
  }

  function isLayoutAdjustmentDisabled() {
    return workspaceWidth() < MINIMUM_DESKTOP_LAYOUT_WIDTH;
  }

  function availableSideSpace() {
    return workspaceWidth() - LAYOUT_FIXED_SPACE - CENTER_MINIMUM_WIDTH;
  }

  function isPlainObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === null || (Object.prototype.toString.call(value) === "[object Object]" && prototype?.constructor?.name === "Object");
  }

  function normalizedLayout(layout) {
    const candidate = isPlainObject(layout) ? layout : {};
    const leftValue = Object.prototype.hasOwnProperty.call(candidate, "leftWidth") ? candidate.leftWidth : undefined;
    const rightValue = Object.prototype.hasOwnProperty.call(candidate, "rightWidth") ? candidate.rightWidth : undefined;
    const left = typeof leftValue === "number" && Number.isFinite(leftValue)
      ? leftValue
      : DEFAULT_LAYOUT.leftWidth;
    const right = typeof rightValue === "number" && Number.isFinite(rightValue)
      ? rightValue
      : DEFAULT_LAYOUT.rightWidth;
    return {
      leftWidth: clamp(left, LEFT_WIDTH_LIMITS.min, LEFT_WIDTH_LIMITS.max),
      rightWidth: clamp(right, RIGHT_WIDTH_LIMITS.min, RIGHT_WIDTH_LIMITS.max)
    };
  }

  function layoutBounds(layout = state.layout) {
    const available = availableSideSpace();
    return {
      leftMax: Math.max(LEFT_WIDTH_LIMITS.min, Math.min(LEFT_WIDTH_LIMITS.max, available - layout.rightWidth)),
      rightMax: Math.max(RIGHT_WIDTH_LIMITS.min, Math.min(RIGHT_WIDTH_LIMITS.max, available - layout.leftWidth))
    };
  }

  function updateResizerAria(bounds, disabled) {
    elements.resizers.forEach((resizer) => {
      const side = resizer.dataset.reverseResizer;
      const current = side === "left" ? state.layout.leftWidth : state.layout.rightWidth;
      const minimum = side === "left" ? LEFT_WIDTH_LIMITS.min : RIGHT_WIDTH_LIMITS.min;
      const maximum = side === "left" ? bounds.leftMax : bounds.rightMax;
      resizer.setAttribute("tabindex", disabled ? "-1" : "0");
      resizer.setAttribute("aria-label", side === "left" ? "调整参考面板宽度" : "调整输出面板宽度");
      resizer.setAttribute("aria-valuemin", String(minimum));
      resizer.setAttribute("aria-valuemax", String(Math.round(Math.max(current, maximum))));
      resizer.setAttribute("aria-valuenow", String(Math.round(current)));
      resizer.setAttribute("aria-disabled", String(disabled));
    });
  }

  function clearLayoutProperties() {
    elements.workspace.style.removeProperty("--reverse-left-width");
    elements.workspace.style.removeProperty("--reverse-right-width");
  }

  function applyLayout(nextLayout = state.layout, activeSide = "") {
    if (isLayoutAdjustmentDisabled()) {
      clearLayoutProperties();
      updateResizerAria(layoutBounds(), true);
      return;
    }

    const candidate = normalizedLayout(nextLayout);
    const available = availableSideSpace();
    let leftWidth;
    let rightWidth;
    if (activeSide === "left") {
      rightWidth = candidate.rightWidth;
      leftWidth = clamp(candidate.leftWidth, LEFT_WIDTH_LIMITS.min, Math.min(LEFT_WIDTH_LIMITS.max, available - rightWidth));
    } else if (activeSide === "right") {
      leftWidth = candidate.leftWidth;
      rightWidth = clamp(candidate.rightWidth, RIGHT_WIDTH_LIMITS.min, Math.min(RIGHT_WIDTH_LIMITS.max, available - leftWidth));
    } else {
      leftWidth = clamp(candidate.leftWidth, LEFT_WIDTH_LIMITS.min, Math.min(LEFT_WIDTH_LIMITS.max, available - RIGHT_WIDTH_LIMITS.min));
      rightWidth = clamp(candidate.rightWidth, RIGHT_WIDTH_LIMITS.min, Math.min(RIGHT_WIDTH_LIMITS.max, available - leftWidth));
    }

    state.layout = { leftWidth, rightWidth };
    const bounds = layoutBounds(state.layout);
    elements.workspace.style.setProperty("--reverse-left-width", `${Math.round(state.layout.leftWidth)}px`);
    elements.workspace.style.setProperty("--reverse-right-width", `${Math.round(state.layout.rightWidth)}px`);
    updateResizerAria(bounds, false);
  }

  function changeLayoutByKeyboard(side, key, largeStep) {
    const step = largeStep ? 24 : 8;
    const direction = key === "ArrowLeft" ? -1 : 1;
    const nextLayout = { ...state.layout };
    if (side === "left") nextLayout.leftWidth += direction * step;
    if (side === "right") nextLayout.rightWidth -= direction * step;
    applyLayout(nextLayout, side);
    notifyWorkspaceDirty();
  }

  function bindColumnResizers() {
    elements.resizers.forEach((resizer) => {
      const side = resizer.dataset.reverseResizer;
      resizer.addEventListener("pointerdown", (event) => {
        if (isLayoutAdjustmentDisabled() || typeof resizer.setPointerCapture !== "function" || typeof resizer.hasPointerCapture !== "function") return;
        event.preventDefault();
        try {
          resizer.setPointerCapture(event.pointerId);
        } catch (error) {
          return;
        }
        if (!resizer.hasPointerCapture(event.pointerId)) return;
        const startX = event.clientX;
        const startLayout = { ...state.layout };
        resizer.classList.toggle("dragging", true);
        let finished = false;

        const move = (moveEvent) => {
          const delta = moveEvent.clientX - startX;
          const nextLayout = { ...startLayout };
          if (side === "left") nextLayout.leftWidth += delta;
          if (side === "right") nextLayout.rightWidth -= delta;
          applyLayout(nextLayout, side);
        };

        const finish = (finishEvent) => {
          if (finished) return;
          finished = true;
          resizer.classList.toggle("dragging", false);
          resizer.removeEventListener("pointermove", move);
          resizer.removeEventListener("pointerup", finish);
          resizer.removeEventListener("pointercancel", finish);
          resizer.removeEventListener("lostpointercapture", finish);
          if (typeof resizer.releasePointerCapture === "function" && resizer.hasPointerCapture(finishEvent.pointerId)) resizer.releasePointerCapture(finishEvent.pointerId);
          notifyWorkspaceDirty();
        };

        resizer.addEventListener("pointermove", move);
        resizer.addEventListener("pointerup", finish);
        resizer.addEventListener("pointercancel", finish);
        resizer.addEventListener("lostpointercapture", finish);
      });

      resizer.addEventListener("keydown", (event) => {
        if (isLayoutAdjustmentDisabled() || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
        event.preventDefault();
        changeLayoutByKeyboard(side, event.key, event.shiftKey);
      });

      resizer.addEventListener("dblclick", () => {
        if (isLayoutAdjustmentDisabled()) return;
        state.layout = { ...DEFAULT_LAYOUT };
        applyLayout(state.layout);
        notifyWorkspaceDirty();
      });
    });
  }

  elements.imageInput.addEventListener("change", () => {
    const file = elements.imageInput.files[0];
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      clearImagePreview();
      state.imageName = "";
      state.importedImageName = "";
      state.imageError = "仅支持 JPG、PNG 或 WebP 图片。";
      elements.imageInput.value = "";
      render();
      notifyWorkspaceDirty();
      return;
    }
    clearImagePreview();
    state.imageName = file.name;
    state.importedImageName = "";
    state.imageError = "";
    state.imageUrl = URL.createObjectURL(file);
    render();
    notifyWorkspaceDirty();
  });

  elements.imagePreview.addEventListener("error", () => {
    if (!state.imageUrl) return;
    clearImagePreview();
    state.imageName = "";
    state.importedImageName = "";
    state.imageError = "图片无法预览，请重新选择。";
    elements.imageInput.value = "";
    render();
    notifyWorkspaceDirty();
  });

  [elements.sourceMode, elements.purpose, elements.fidelity, elements.emphasis, elements.ratio, elements.quality, elements.textPolicy, elements.replacement, elements.extra].forEach((element) => {
    element.addEventListener("input", render);
    element.addEventListener("change", render);
  });

  elements.dimensionInputs.forEach((input) => {
    input.addEventListener("input", () => {
      state.dimensions = normalizeDimensions({ ...state.dimensions, [input.dataset.reverseDimension]: input.value });
      state.copied = false;
      render();
    });
  });

  elements.example.addEventListener("click", loadExample);
  elements.clear.addEventListener("click", clearFields);
  elements.clearDimensions.addEventListener("click", clearDimensions);
  elements.copy.addEventListener("click", async () => {
    elements.output.focus();
    elements.output.select();
    try { await navigator.clipboard.writeText(composePrompt()); } catch (error) { document.execCommand("copy"); }
    state.copied = true;
    render();
    setTimeout(() => { state.copied = false; render(); }, 1200);
  });

  root.aigcReverseWorkbench = {
    exportState() {
      return {
        sourceMode: elements.sourceMode.value,
        imageName: state.imageName || state.importedImageName,
        purpose: elements.purpose.value,
        fidelity: elements.fidelity.value,
        emphasis: elements.emphasis.value,
        ratio: elements.ratio.value,
        quality: elements.quality.value,
        textPolicy: elements.textPolicy.value,
        replacement: elements.replacement.value,
        extra: elements.extra.value,
        dimensions: normalizeDimensions(state.dimensions),
        layout: { ...state.layout }
      };
    },
    importState(saved = {}) {
      clearImagePreview();
      state.imageName = "";
      state.imageError = "";
      state.importedImageName = saved.sourceMode === "local" && saved.imageName ? String(saved.imageName) : "";
      elements.imageInput.value = "";
      elements.sourceMode.value = saved.sourceMode || "target";
      elements.purpose.value = saved.purpose || "film";
      elements.fidelity.value = saved.fidelity || "balanced";
      elements.emphasis.value = saved.emphasis || "all";
      elements.ratio.value = saved.ratio || "source";
      elements.quality.value = saved.quality || "cinematic";
      elements.textPolicy.value = saved.textPolicy || "remove";
      elements.replacement.value = saved.replacement || "";
      elements.extra.value = saved.extra || "";
      state.dimensions = normalizeDimensions(saved.dimensions);
      state.layout = normalizedLayout(saved.layout);
      applyLayout();
      render();
    },
    receiveProjectContext(context) {
      const prompt = String(context?.prompt || "").trim();
      if (!prompt) return false;
      if (!elements.extra.value.includes(prompt)) {
        elements.extra.value = [elements.extra.value.trim(), prompt].filter(Boolean).join("\n");
      }
      state.copied = false;
      render();
      document.dispatchEvent(new Event("aigc:workspace-dirty"));
      return true;
    }
  };

  bindColumnResizers();
  root.addEventListener?.("resize", () => applyLayout());
  applyLayout();
  render();
})(typeof window !== "undefined" ? window : globalThis);
