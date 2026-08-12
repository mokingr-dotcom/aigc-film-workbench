(function initCastingWorkspace(root) {
  const CASTING_TEMPLATE_PROFILES = Object.freeze({
    single: {
      label: "单视图样板",
      image: "assets/casting-template-single.png?v=20260811-young-woman-v1",
      captions: ["身份主图"],
      purpose: "优先确认人物脸部、年龄、皮肤和角色气质。",
      composition: "单人正脸或轻微45度近景，只出现一张脸。",
      stage: "角色探索与首次身份确认"
    },
    three: {
      label: "三视图样板",
      image: "assets/casting-template-three.png?v=20260811-young-woman-v1",
      captions: ["正脸特写", "45° 半身", "正面全身"],
      purpose: "同时确认脸部、半身状态和全身比例。",
      composition: "正脸身份特写、45度半身、正面全身。",
      stage: "角色定妆与比例确认"
    },
    four: {
      label: "四视图样板",
      image: "assets/casting-template-four.png?v=20260811-clear-face-master-v1",
      captions: ["正脸特写", "90° 侧脸特写", "正面全身", "45° 全身", "背面全身"],
      purpose: "用两张清晰脸部特写锁定身份，再用正、45度与背面全身图确认比例、服装与姿态。",
      composition: "左35%上下两张清晰脸部特写；右65%为正面、45度、背面全身。",
      stage: "视频角色锁定与全身资产确认"
    },
    identity: {
      label: "身份资料板样板",
      image: "assets/casting-template-identity-board.png?v=20260811-young-woman-v1",
      captions: ["人物主肖像", "服装拆解", "固定道具", "表情组", "动作姿态"],
      purpose: "集中管理角色人物、服装、道具、表情和动作信息。",
      composition: "人物主肖像约40%，服装约20%，道具、表情和动作共约40%。",
      stage: "项目角色资产归档与跨工作台传递"
    }
  });

  const CASTING_LAYOUTS = Object.freeze(["single", "three", "four", "identity"]);
  const CASTING_IDENTITY_FIELDS = Object.freeze([
    "wardrobe",
    "props",
    "neutralExpression",
    "expressionSet",
    "signatureAction",
    "stance"
  ]);

  function normalizedCastingLayout(layout) {
    return CASTING_LAYOUTS.includes(layout) ? layout : "three";
  }

  function castingStatusLabel(layout) {
    return {
      single: "单视图参考",
      three: "三视图参考",
      four: "四视图参考",
      identity: "身份资料板参考"
    }[normalizedCastingLayout(layout)];
  }

  function castingTemplateCaptions(layout) {
    const profile = CASTING_TEMPLATE_PROFILES[normalizedCastingLayout(layout)];
    return profile.captions.slice();
  }

  function castingLayoutSelection(current = {}, nextLayout) {
    const layout = normalizedCastingLayout(nextLayout);
    const leavingSingle = current.layout === "single" && layout !== "single";
    return {
      source: current.source === "text" ? "text" : "reference",
      layout,
      ratio: layout === "single" ? "4:5" : (leavingSingle ? "16:9" : (current.ratio || "16:9"))
    };
  }

  function retainMissingReferenceMetadata(targetState, request, revokeObjectURL) {
    if (!targetState || request !== targetState.assetRequest) return false;
    if (targetState.previewUrl && typeof revokeObjectURL === "function") {
      revokeObjectURL(targetState.previewUrl);
    }
    targetState.previewUrl = "";
    targetState.assetError = "本地参考图已不存在，请重新上传；原项目元数据已保留。";
    return true;
  }

  function getIdentityValidation(layout, values = {}) {
    if (normalizedCastingLayout(layout) !== "identity") return [];
    return CASTING_IDENTITY_FIELDS.filter((key) => {
      const fieldValue = typeof values[key] === "string" ? values[key] : "";
      return !fieldValue.trim();
    });
  }

  function getCastingSourceValidation(source, referenceAsset, previewUrl) {
    return source === "reference" && (!referenceAsset?.id || !previewUrl) ? ["referenceAsset"] : [];
  }

  function normalizeCastingState(saved = {}) {
    const normalized = {
      ...saved,
      source: saved.source === "text" ? "text" : "reference",
      layout: normalizedCastingLayout(saved.layout),
      versions: Array.isArray(saved.versions) ? saved.versions.slice(-20) : [],
      referenceAsset: saved.referenceAsset && typeof saved.referenceAsset === "object"
        ? { ...saved.referenceAsset }
        : null
    };
    CASTING_IDENTITY_FIELDS.forEach((key) => {
      normalized[key] = typeof saved[key] === "string" ? saved[key] : "";
    });
    return normalized;
  }

  function buildCharacterSummary(values = {}) {
    const summaryValue = (key, fallback = "未填写") => {
      const fieldValue = typeof values[key] === "string" ? values[key].trim() : "";
      return fieldValue || fallback;
    };
    return `引用项目角色母版 ${summaryValue("id", "CHAR-001")} 作为最高身份优先级。角色：${summaryValue("role", "未命名角色")}；年龄与性别：${summaryValue("age")}；体型：${summaryValue("body")}；脸部身份锚点：${summaryValue("face")}；发型：${summaryValue("hair")}；服装：${summaryValue("costume")}；固定特征：${summaryValue("traits", "无")}；服装层级：${summaryValue("wardrobe")}；固定道具：${summaryValue("props")}；常态与情绪表情：${summaryValue("neutralExpression")} / ${summaryValue("expressionSet")}；标志性动作与站姿：${summaryValue("signatureAction")} / ${summaryValue("stance")}。严格锁定同一张脸、真实年龄、肤色、发际线、体型、服装轮廓和固定配饰，不换脸，不生成相似人物替代`;
  }

  function buildCharacterSummaryFromElements(elements = {}) {
    const read = (key) => elements[key]?.value ?? "";
    return buildCharacterSummary({
      id: read("id"),
      role: read("role"),
      age: read("age"),
      body: read("body"),
      face: read("face"),
      hair: read("hair"),
      costume: read("costume"),
      traits: read("traits"),
      wardrobe: read("wardrobe"),
      props: read("props"),
      neutralExpression: read("neutralExpression"),
      expressionSet: read("expressionSet"),
      signatureAction: read("signatureAction"),
      stance: read("stance")
    });
  }

  function syncToProject() {
    const core = root.aigcWorkspaceCore;
    if (!core || typeof core.patchProjectAssetLocks !== "function") {
      alert("当前工作台未关联有效项目。");
      return;
    }
    const project = core.getActiveProject();
    if (!project) return;
    const role = elements.role.value.trim();
    if (!role) {
      alert("请先填写角色姓名。");
      return;
    }

    const asset = {
      kind: "character",
      id: elements.id.value.trim() || `CHAR-${Date.now().toString(36).toUpperCase()}`,
      name: role,
      detail: [elements.costume.value, elements.traits.value].filter(Boolean).join("；"),
      referenceRule: "严格保持角色定妆母版的一致性",
      masterStatus: "locked",
      source: "角色定妆工作台同步",
      referenceAssetIds: state.referenceAsset?.id ? [state.referenceAsset.id] : []
    };

    const nextLocks = [...(project.assetLocks || [])];
    const existingIndex = nextLocks.findIndex((item) => item.kind === "character" && item.name === role);
    if (existingIndex >= 0) {
      nextLocks[existingIndex] = { ...nextLocks[existingIndex], ...asset };
    } else {
      nextLocks.push(asset);
    }

    core.patchProjectAssetLocks(nextLocks);
    alert(`角色 “${role}” 已成功同步至项目资产库并锁定。`);
  }

  function castingLayoutRules(layout, source, identityValues = {}, ratio = "16:9") {
    const normalizedLayout = normalizedCastingLayout(layout);
    const identityValue = (key, fallback) => {
      const fieldValue = typeof identityValues[key] === "string" ? identityValues[key].trim() : "";
      return fieldValue || fallback;
    };
    const compositions = {
      single: "单视图高精度角色建角肖像，只出现一个人物。4:5或3:4竖向画幅，眼平近景，从头顶到胸口下方，完整保留头发、耳朵、颈部和双肩；脸部占画面高度约55%至65%，双眼位于画面上半部，正脸或极轻微5度自然转角，不做明显侧脸。白色背景四周保留适度呼吸空间，不拼图、不分栏、不出现第二张脸。该单图以面部身份、真实年龄、皮肤质感和角色气质为最高优先级，作为后续三视图与四视图的唯一参考候选。",
      three: "三视图横向白底角色板，三个面板清楚分区但不加边框和文字。左侧正脸五官大头特写是身份主图，占整张画面约45%；中间45度半身大头特写占约30%，从头顶到腰部，身体与脸同时转向45度；右侧正面全身占约25%，人物从头到鞋完整可见。三个人像头顶基准、肤色、服装和光线完全统一，不裁切头发、手、脚和鞋。",
      four: "四视图角色母版，16:9横向构图：左侧约35%上下两张等高脸部特写，上方正脸五官大头特写，下方严格90度侧脸大头特写，作为身份锚点。右侧约65%并列三张等宽全身视图：正面全身、45度全身、严格背面全身，人物从头到鞋完整可见。全部视图保持同一张脸、发型、体型、服装、鞋履、光线与比例；背面不得回头或露出正脸。画面不加文字、编号、边框或额外视图。",
      identity: "16:9角色身份资料板，人物主肖像约占40%，服装拆解约占20%，固定道具、表情组和动作姿态组共约占40%。所有区域必须是同一个人物、同一年龄、同一肤色、同一发型和同一身体比例。信息依靠构图分区，不生成文字、编号、边框、水印或Logo。"
    };
    const multiViewCompletion = source !== "reference"
      ? "依据文字身份锚点建立统一的头部三维结构和身体比例，再从同一角色模型生成所有视角。"
      : "从参考图可见正面或45度信息推导同一个人的侧面与背面：保持颅骨宽度、前额坡度、眉骨、鼻梁起点、鼻尖突出度、鼻翼宽度、嘴唇前突度、下巴长度、下颌角、耳朵高度、发际线和头发体积连续一致。保留真人自然的左右不对称，不把左右脸强行镜像，不把正脸简单贴到侧脸上。参考图未展示的侧面、后脑、服装背面和全身比例只能做保守补全；不添加无法从参考图或文字设定确认的疤痕、纹身、首饰、图案和身体特征。";
    const completions = {
      single: "本次只生成身份候选近景，不生成侧面、背面或全身，不拼接多视图。",
      three: multiViewCompletion,
      four: source !== "reference"
        ? "先以左侧正脸与严格90度侧脸特写锁定身份，再延伸同一人的正面、45度与背面全身比例、服装、鞋履和姿态；背面不得回头。"
        : "从参考图保守补全严格90度侧脸、正面全身、45度全身与背面全身。保持颅骨、五官、耳朵、发际线、头发体积、体型和服装结构一致，保留自然左右不对称；未展示的背面服装与全身比例只做保守补全，背面不得回头或露出正脸。",
      identity: source === "reference"
        ? "只补全身份资料板中参考图未展示的信息：服装层级与材质、固定道具结构和位置、表情变化、动作状态均依据参考图和已填写设定做保守补全。不得新增无法确认的服装设计、道具、表情特征或动作习惯。"
        : "依据文字身份锚点统一人物、服装、道具、表情和动作信息；未填写的服装细节、道具结构、表情变化与动作状态只做保守补全，不擅自增加新的身份特征。"
    };
    const poses = {
      single: "人物采用眼平近景，肩线自然放松，头部端正，正视镜头，嘴唇自然闭合；表情中性但有角色意识，通过眼神、下颌张力和轻微呼吸体现身份。不得歪头、低头、仰头、遮脸、耸肩或做时尚杂志式表情。",
      three: "正脸主图：眼平机位，头部无倾斜，直视镜头，嘴唇自然闭合，表情中性克制；45度半身：肩线和面部同时转45度，双手自然可见，不用手遮脸；正面全身：自然站姿，双脚稳定，双臂自然下垂，服装轮廓和身材比例完整。",
      four: "正脸特写眼平直视，侧脸特写严格90度；正面、45度和背面全身保持同一自然站姿、重心和服装状态，双臂自然下垂。45度身体与头部同步转向，背面不回头。",
      identity: `人物主肖像采用常态表情：${identityValue("neutralExpression", "克制、自然的中性表情")}。表情组展示：${identityValue("expressionSet", "三至四种轻微且可复用的情绪变化")}。动作组展示：${identityValue("signatureAction", "符合角色身份的克制动作")}。站姿与身体状态保持：${identityValue("stance", "重心稳定、肩颈自然、身体比例一致")}。各组只改变已指定的表情、手势和身体状态，不改变脸部几何、真实年龄、服装结构或固定道具位置。`
    };

    const requestedRatio = typeof ratio === "string" && ratio.trim() ? ratio.trim() : "16:9";
    const outputFormat = normalizedLayout === "identity"
      ? "16:9 横向角色身份资料板构图"
      : `${requestedRatio} ${normalizedLayout === "single" ? "竖向肖像构图" : "横向构图"}`;
    const compositionLock = normalizedLayout === "identity"
      ? "最终成图必须保持16:9横向身份资料板，以及人物主肖像40%、服装20%、道具与表情动作40%的信息占比；任何材质、光影、姿态或负面要求都不得改成单幅肖像、三视图、四视图或其他画幅。"
      : "";

    return {
      composition: compositions[normalizedLayout],
      completion: completions[normalizedLayout],
      pose: poses[normalizedLayout],
      outputFormat,
      compositionLock
    };
  }

  function castingReferenceRule(layout, source, policy = "preserve-all", notes = "") {
    const normalizedLayout = normalizedCastingLayout(layout);
    const referenceNotes = String(notes || "").trim()
      || (normalizedLayout === "identity"
        ? "未特别说明；以参考图中可见信息为准，未展示信息只做保守补全"
        : "未特别说明；以参考图中可见信息为准，未展示区域只做保守补全");

    if (source !== "reference") {
      if (normalizedLayout === "single") {
        return "这是该角色第一次建立身份候选。严格依据下方脸部身份锚点生成唯一真人身份，只输出一张单视图肖像，不生成其他面板。";
      }
      if (normalizedLayout === "identity") {
        return "这是该角色第一次建立身份资料板。严格依据下方脸部身份锚点生成唯一人物身份，并让主肖像、服装、道具、表情和动作分区复用同一面部几何、年龄、肤色和身体比例。";
      }
      return "这是该角色第一次建立身份母版。严格依据下方脸部身份锚点生成唯一真人身份；先确定一张稳定正脸，再让所有其他面板复用同一面部几何、年龄、肤色和身体比例，不得在不同视图中重新设计人物。";
    }

    const identityPolicies = {
      "preserve-all": "完整保留参考图人物的脸、真实年龄、肤色、体型、发型、发色、服装、鞋履、配饰和可见身份特征；服装拆解与道具分区只整理已有信息，不重新造型。",
      "preserve-identity": "严格保留参考图人物的脸、真实年龄、肤色、发际线、发型和体型；服装、鞋履与身份道具按照文字设定整理。换装只改变服装，不得改变人物身份和身体比例。",
      "face-only": "把参考图人物的脸作为唯一身份锚点，严格保留面部骨相、五官几何、真实年龄、肤色、发际线和头发特征；体型、服装与道具按照文字设定建立，但不得反向改变脸。"
    };
    const singlePolicies = {
      "preserve-all": "完整保留参考图人物的脸、真实年龄、肤色、体型、发型、发色、服装、配饰和可见身份特征，只转换为规范白底单视图肖像。",
      "preserve-identity": "严格保留参考图人物的脸、真实年龄、肤色、发际线、发型和体型；服装按照文字设定替换，但不得改变人物身份。",
      "face-only": "把参考图人物的脸作为唯一身份锚点，严格保留面部骨相、五官几何、真实年龄、肤色、发际线和头发特征；服装与身体状态按照文字设定建立。"
    };
    const multiViewPolicies = {
      "preserve-all": "完整保留参考图人物的脸、真实年龄、肤色、体型、发型、发色、服装、鞋履、配饰和可见身份特征；只把原图人物转换为规范白底多视图，不重新造型。原图没有展示的服装背面和下装只能依据现有材质、颜色和剪裁做保守延伸，不添加新设计元素。",
      "preserve-identity": "严格保留参考图人物的脸、真实年龄、肤色、发际线、发型和体型；服装、鞋履与身份道具按照文字设定替换。换装只改变服装，不得改变人物身份和身体比例。",
      "face-only": "把参考图人物的脸作为唯一身份锚点，严格保留面部骨相、五官几何、真实年龄、肤色、发际线和头发特征；体型、服装与道具按照文字设定建立，但任何新身体视图都不得反向改变脸。"
    };

    if (normalizedLayout === "identity") {
      const policyText = identityPolicies[policy] || identityPolicies["preserve-all"];
      return `引用当前上传的单人角色参考图作为唯一身份母版和最高优先级。把其中的人物原样整理为16:9身份资料板；不复制原图背景、光线和景别，所有信息分区必须属于参考图中的同一个人物。${policyText} 参考图补充：${referenceNotes}。`;
    }
    if (normalizedLayout === "single") {
      const policyText = singlePolicies[policy] || singlePolicies["preserve-all"];
      return `引用当前上传的单人角色参考图作为唯一身份母版和最高优先级，生成一张白底单视图身份肖像。画面只出现一个人物和一张脸，不生成侧面、背面、全身或拼接多视图；不复制原图背景、光线、景别、表情和动作。${policyText} 参考图补充：${referenceNotes}。`;
    }
    const policyText = multiViewPolicies[policy] || multiViewPolicies["preserve-all"];
    const fourViewPriority = normalizedLayout === "four"
      ? "左侧正脸与90度侧脸特写作为最高优先级身份锚点；右侧正面、45度与背面全身图延伸同一人的体型、服装、鞋履、姿态与背面结构，背面不得露出正脸。"
      : "";
    return `引用当前上传的单人角色参考图作为唯一身份母版和最高优先级。该图片虽然不是三视图或四视图，但必须把其中的人物原样转换为多视图；只更换为白底影棚版式，不复制原图背景、光线、景别、表情和动作。所有面板必须是参考图中的同一个真人，不得平均脸、不得美化换脸、不得生成相似但不同的人。${policyText} ${fourViewPriority} 参考图补充：${referenceNotes}。`;
  }

  function castingNegativeRule(layout, mediumNegative = "") {
    const normalizedLayout = normalizedCastingLayout(layout);
    const identityBoard = normalizedLayout === "identity";
    const fourViewSafety = normalizedLayout === "four"
      ? ["不要背面回头或露出正脸", "不要额外视图"]
      : [];
    const identitySafety = identityBoard
      ? ["不要多余身份人物", "不要把表情组或动作姿态组误判为身份重复"]
      : ["不要多余人物", "不要重复人脸", "不要拼贴多视图", "不要重复肢体"];
    return [
      "不要不同人脸", "不要相似脸替代", "不要身份漂移", "不要换脸", "不要左右脸型变化",
      "不要侧脸重新设计", "不要背面人物变体", "不要正脸贴图式侧脸", "不要镜像复制脸",
      "不要年龄变化", "不要肤色变化", "不要发际线变化", "不要眼距变化", "不要眉形变化",
      "不要鼻形变化", "不要嘴唇变化", "不要耳朵变化", "不要体型变化", "不要身高比例变化",
      "不要年代混搭", "不要现代物件误入历史角色", "不要未经允许换装", "不要服装背面凭空增加图案",
      "不要配饰丢失", ...identitySafety, ...fourViewSafety, "不要多手多脚", "不要手指错误", "不要关节扭曲", "不要穿模",
      "不要裁切头顶和鞋", "不要大汗", "不要油光", "不要磨皮", "不要蜡像感", "不要塑料皮肤",
      "不要网红脸", "不要美颜", "不要过度妆容", "不要不同视图混合不同画风", mediumNegative,
      "不要戏剧化彩色背景光", "不要硬阴影", "不要灰底", "不要环境场景", "不要文字", "不要编号",
      "不要水印", "不要Logo"
    ].filter(Boolean).join("，") + "。";
  }

  function appendRoleVersion(targetState, version, limit = 20) {
    const versions = Array.isArray(targetState?.versions) ? targetState.versions : [];
    const combined = [...versions, version];
    const evicted = combined.slice(0, Math.max(0, combined.length - limit));
    targetState.versions = combined.slice(-limit);
    return {
      versions: targetState.versions,
      evictedAssetIds: [...new Set(evicted.map((item) => item?.referenceAssetId).filter(Boolean))]
    };
  }

  async function persistReferenceAssetMutation({
    targetState,
    request,
    nextAsset,
    nextPreviewUrl = "",
    persistNow,
    revokeObjectURL,
    removeOwnedAsset,
    onStateChange
  } = {}) {
    if (!targetState || request !== targetState.assetRequest) {
      if (nextPreviewUrl && typeof revokeObjectURL === "function") revokeObjectURL(nextPreviewUrl);
      if (nextAsset?.id && typeof removeOwnedAsset === "function") {
        try {
          await removeOwnedAsset(nextAsset.id);
        } catch (error) {
          return { committed: false, rolledBack: false, cleanupError: error, cleanupAssetId: "" };
        }
      }
      return { committed: false, rolledBack: false, cleanupAssetId: "" };
    }

    const previousAsset = targetState.referenceAsset;
    const previousPreviewUrl = targetState.previewUrl || "";
    targetState.referenceAsset = nextAsset;
    targetState.previewUrl = nextPreviewUrl;
    if (typeof onStateChange === "function") onStateChange();

    try {
      if (typeof persistNow !== "function") throw new Error("项目元数据保存不可用。");
      await persistNow();
    } catch (error) {
      const canRollback = request === targetState.assetRequest
        && targetState.referenceAsset === nextAsset
        && targetState.previewUrl === nextPreviewUrl;
      if (canRollback) {
        targetState.referenceAsset = previousAsset;
        targetState.previewUrl = previousPreviewUrl;
        if (typeof onStateChange === "function") onStateChange();
      }
      if (nextPreviewUrl && nextPreviewUrl !== previousPreviewUrl && typeof revokeObjectURL === "function") {
        revokeObjectURL(nextPreviewUrl);
      }
      if (!canRollback && previousPreviewUrl && previousPreviewUrl !== nextPreviewUrl && typeof revokeObjectURL === "function") {
        revokeObjectURL(previousPreviewUrl);
      }

      let cleanupError = null;
      if (nextAsset?.id && nextAsset.id !== previousAsset?.id && typeof removeOwnedAsset === "function") {
        try {
          await removeOwnedAsset(nextAsset.id);
        } catch (removeError) {
          cleanupError = removeError;
        }
      }
      return { committed: false, rolledBack: canRollback, error, cleanupError, cleanupAssetId: "" };
    }

    if (previousPreviewUrl && previousPreviewUrl !== nextPreviewUrl && typeof revokeObjectURL === "function") {
      revokeObjectURL(previousPreviewUrl);
    }
    return {
      committed: true,
      rolledBack: false,
      cleanupAssetId: previousAsset?.id && previousAsset.id !== nextAsset?.id ? previousAsset.id : ""
    };
  }

  function createVersionPreviewCache({ loadAsset, createObjectURL, revokeObjectURL } = {}) {
    const urls = new Map();
    let generation = 0;

    async function sync(assetIds = []) {
      const currentGeneration = ++generation;
      const desired = new Set(assetIds.filter(Boolean));
      for (const [assetId, url] of urls) {
        if (!desired.has(assetId)) {
          if (typeof revokeObjectURL === "function") revokeObjectURL(url);
          urls.delete(assetId);
        }
      }

      await Promise.all([...desired].map(async (assetId) => {
        if (urls.has(assetId) || typeof loadAsset !== "function") return;
        let stored;
        try {
          stored = await loadAsset(assetId);
        } catch (error) {
          return;
        }
        if (currentGeneration !== generation || !desired.has(assetId) || !stored?.blob) return;

        let url;
        try {
          url = createObjectURL(stored.blob);
        } catch (error) {
          return;
        }
        if (currentGeneration !== generation || !desired.has(assetId) || urls.has(assetId)) {
          if (url && typeof revokeObjectURL === "function") revokeObjectURL(url);
          return;
        }
        urls.set(assetId, url);
      }));
      return currentGeneration === generation;
    }

    function clear() {
      generation += 1;
      urls.forEach((url) => {
        if (typeof revokeObjectURL === "function") revokeObjectURL(url);
      });
      urls.clear();
    }

    return {
      clear,
      get(assetId) {
        return urls.get(assetId) || "";
      },
      sync
    };
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      CASTING_TEMPLATE_PROFILES,
      appendRoleVersion,
      castingLayoutSelection,
      buildCharacterSummary,
      buildCharacterSummaryFromElements,
      castingLayoutRules,
      castingNegativeRule,
      castingReferenceRule,
      castingStatusLabel,
      castingTemplateCaptions,
      createVersionPreviewCache,
      getCastingSourceValidation,
      getIdentityValidation,
      normalizeCastingState,
      retainMissingReferenceMetadata,
      persistReferenceAssetMutation
    };
  }

  if (!root.document) return;

  const skinProfiles = {
    dry: "干燥、低反光的真实真人皮肤，可见细微毛孔、轻微肤色不均、细小绒毛、自然眉毛和睫毛；嘴唇保留真实唇纹，眼球只有自然湿润感；不要大汗，不要油光",
    neutral: "中性、自然低反光的真实真人皮肤，可见毛孔、细小绒毛、轻微肤色起伏、自然眉毛和睫毛；T区只有极轻微真实反光，不过度哑光也不过度油亮",
    weathered: "风吹日晒后的真实粗粝皮肤，可见毛孔、晒斑、轻微色差、干燥纹理、自然细纹和绒毛；质感真实克制，不刻意做脏，不夸张老化",
    mature: "符合真实年龄的成熟皮肤，保留眼周细纹、法令纹、额头纹、毛孔、轻微色斑和自然松弛度；不年轻化，不磨皮，不把年龄纹理做成夸张特效妆"
  };

  const lightingProfiles = {
    soft: "专业影棚双层柔光：大面积柔光箱作为主光，白色反光板补光，背景独立均匀照明；极低反差、肤色准确、眼神光自然，脚下只有轻柔自然地面阴影",
    neutral: "中性日光白棚布光：5600K大面积柔光箱，正侧前方柔和主光，白色反光板均匀补光，背景独立照明；低反差、高色彩还原、无明显冷暖偏色",
    warm: "轻暖白棚定妆布光：大面积柔光箱保持自然肤色，白色反光板补光，肤色只带极轻微暖意，纯白背景不染黄；低反差，暗部柔和，服装颜色准确",
    cool: "轻冷克制白棚布光：中性偏冷的大面积柔光箱，白色反光板补光，肤色保留血色而不过蓝，纯白背景不染色；低反差、清晰克制、无青灰病态肤色",
    sculpted: "柔和轮廓塑形白棚布光：大型八角柔光箱做主光，白色反光板补足暗侧，极弱柔和轮廓光分离头发与白背景；保持低反差，不使用戏剧化硬阴影"
  };

  const mediumProfiles = {
    live: {
      label: "真人写实电影",
      material: "真实真人皮肤、真实头发与真实服装材质，拒绝数字人和游戏角色质感",
      capture: "真实全画幅专业影棚摄影，RAW照片质感，高分辨率，正脸和半身使用85mm至105mm人像焦段感，眼平机位，无广角面部畸变；全身使用70mm左右自然透视",
      negative: "不要游戏CG，不要3D数字人，不要卡通，不要插画"
    },
    "animation-2d": {
      label: "电影级二维手绘动画",
      material: "高质量电影二维手绘角色设计，稳定干净的轮廓线，克制且有层次的赛璐璐与柔和综合色块，面部结构准确，服装褶皱和材质通过线条与色块表达，不做真人照片",
      capture: "电影动画角色设定稿级完成度，线条粗细稳定，色块边界清晰，局部柔和阴影，五官与头身比例在全部视图严格统一",
      negative: "不要真人照片，不要3D渲染，不要廉价电视动画，不要线条抖动，不要不同画风混合"
    },
    "animation-3d": {
      label: "电影级三维动画",
      material: "高端电影三维动画角色，造型适度风格化但面部结构可信，皮肤与材质具有细腻次表面层次，头发、布料和配饰结构清楚，不做廉价游戏模型",
      capture: "电影动画资产展示级渲染，正交感人物展示，柔和影棚光，边缘抗锯齿干净，材质参数稳定，所有视图使用同一角色模型和同一拓扑比例",
      negative: "不要真人照片，不要手游角色，不要塑料玩具感，不要低模，不要不同拓扑脸，不要过度光滑"
    },
    "disney-2d": {
      label: "迪士尼经典二维动画",
      material: "参考迪士尼经典二维长片的角色设计传统：清晰流畅的轮廓线、强可读剪影、优雅弧线、富有生命力但不过度夸张的眼睛与眉毛、柔和综合色块和精致赛璐璐阴影。强调角色性格与表情可读性，但必须创建原创人物，不复制任何现有公主、王子、动物或其他具体角色",
      capture: "高规格二维动画长片角色设定稿，线条有稳定笔压与圆润节奏，正脸、侧脸和全身保持同一造型比例，色彩明快但不荧光，白底母版中不加入电影场景",
      negative: "不要真人照片，不要3D渲染，不要低幼简笔画，不要电视动画低帧质感，不要复制迪士尼现有角色、服装、发型或标志性造型"
    },
    "pixar-3d": {
      label: "皮克斯式三维动画",
      material: "参考皮克斯式高端三维动画的造型方法：简洁有吸引力的几何体块、强轮廓、略夸张但可信的头身比例、富有情感的眼睛和眉形、细腻皮肤次表面层次、真实布料与头发材质。角色必须原创，不复制任何现有皮克斯人物",
      capture: "电影级三维动画角色资产展示，柔和白棚灯光，干净边缘与高质量材质，所有视图使用同一角色模型、同一拓扑和完全一致的脸部比例，表情克制便于锁定身份",
      negative: "不要真人照片，不要手游建模，不要塑料玩具感，不要低模，不要过度大眼，不要婴儿化所有角色，不要复制皮克斯现有角色或服装设计"
    },
    ghibli: {
      label: "吉卜力 / 宫崎骏手绘动画",
      material: "参考吉卜力与宫崎骏电影的手绘动画传统：自然可信的人体比例、简洁温和的五官、稳定细线、柔和赛璐璐阴影、手绘色彩和朴素生活质感。强调人物真诚、自然和可亲近感，但必须创建原创角色，不复制任何现有影片人物",
      capture: "高质量手绘动画电影角色母版，线条轻盈稳定，色彩柔和自然，服装结构具有生活感，面部角度转换符合统一头部结构，白底干净，不加入风景背景",
      negative: "不要真人照片，不要3D渲染，不要Q版，不要过度萌化，不要复杂光效，不要复制吉卜力或宫崎骏现有角色、服装与发型"
    },
    dreamworks: {
      label: "梦工厂式三维动画",
      material: "参考梦工厂式商业三维动画的造型方法：更鲜明的轮廓、更有力度的眉眼和下颌设计、富有喜剧与冒险感的体态、清楚的形状语言、高质量毛发与服装材质。人物必须原创，不复制任何现有动画角色",
      capture: "电影级三维角色资产渲染，同一拓扑模型生成全部视图，面部结构和头身比例稳定，白棚光线清楚展示轮廓与材质，表情中性但保留角色个性",
      negative: "不要真人照片，不要低模，不要廉价游戏CG，不要塑料表面，不要每个角色都使用同一夸张笑脸，不要复制梦工厂现有角色"
    },
    "comic-hybrid": {
      label: "漫画混合动画",
      material: "电影级漫画混合动画角色，将三维体积、手绘轮廓、速度线质感、局部网点和印刷色错位结合；轮廓清晰、姿态有图形力量、色彩分层明确。母版阶段保持中性姿态和白底，只在人物材质中保留漫画语言，不复制任何现有超级英雄或具体动画角色",
      capture: "高质量混合媒介动画角色设定，所有视图保持同一三维体块、线稿逻辑、网点尺度和色彩分层，不在白底加入分镜框、拟声词或漫画文字",
      negative: "不要真人照片，不要纯普通3D渲染，不要线条随机变化，不要网点遮挡五官，不要文字拟声词，不要复制现有漫画英雄、制服或标志"
    },
    "anime-realistic": {
      label: "写实系日式动画",
      material: "写实比例的日式电影动画角色，克制线稿，真实人体比例，五官适度概括但身份特征明确，细腻赛璐璐阴影与少量柔和渐变，服装结构符合现实裁剪",
      capture: "高质量动画电影角色母版，线条稳定，面部角度转换符合统一三维结构，色彩克制，背景纯白，所有视图保持同一作画监督标准",
      negative: "不要真人照片，不要夸张萌系大眼，不要Q版，不要低幼动画，不要线条和五官漂移"
    },
    "animation-chinese": {
      label: "中国东方动画",
      material: "中国东方电影动画角色，写实人物比例结合中国传统审美，线条含书写感但边缘清楚，青绿、朱红、墨黑或矿物色克制使用，服装纹样依据时代与身份，不堆砌符号",
      capture: "东方动画角色母版级完成度，人物结构清晰，线条与色块稳定，可带极轻微宣纸或矿物颜料肌理，但白色背景保持干净，所有视图画风统一",
      negative: "不要真人照片，不要廉价国潮贴图，不要过度水墨晕染遮挡五官，不要仙侠手游建模，不要符号堆砌"
    },
    "stop-motion": {
      label: "定格动画",
      material: "高端定格动画角色实体模型，硅胶、树脂、布料、毛毡或微型服装材质真实可见，手工制作痕迹克制，面部替换件接缝不可见，造型独特但身份稳定",
      capture: "专业微缩影棚角色资产摄影，长焦微距感，柔和均匀布光，模型各视图比例完全一致，真实材料与细小手工纹理清楚",
      negative: "不要真人照片，不要普通3D渲染，不要廉价塑料玩具，不要可见替换脸接缝，不要模型比例漂移"
    }
  };

  const eraProfiles = {
    contemporary: "当代现实。发型、服装、鞋履、材质和身份道具符合当前生活与职业，不使用复古或未来元素。",
    future: "近未来。造型建立在现实服装结构上，只加入少量可信功能性材料和技术细节，不使用无意义霓虹管线或夸张机甲。",
    "1990s": "1990年代。服装版型、面料、发型、妆面、眼镜、腕表和鞋履符合1990年代，不混入智能设备与当代网红审美。",
    "1980s": "1980年代。肩线、裤型、针织物、皮革、发型和生活用品符合1980年代，色彩可以有年代感但不过度复古滤镜。",
    "1960s": "1960年代。服装剪裁、发型、妆面和配饰符合1960年代社会身份，避免现代弹力面料和现代鞋型。",
    "1940s": "1940年代。战争与战后时期的服装结构、羊毛棉布、发型、鞋履和身份用品准确，避免现代拉链、运动鞋和塑料配件。",
    republican: "中国民国时期。长衫、西装、旗袍、学生装或职业服装必须符合具体身份与社会阶层，发型、布料、纽扣和鞋履具有时代依据。",
    qing: "中国清代。发式、冠帽、袍服、领口、盘扣、纹样、鞋履和等级制度准确，不混入明代、唐代或现代古偶元素。",
    ming: "中国明代。衣领、袍服结构、腰带、冠帽、发式、纹样和鞋履符合明代身份等级，不使用清代马褂或现代影楼古装。",
    song: "中国宋代。服装剪裁简洁克制，交领、圆领、褙子、幞头、发式与材质符合宋代身份，不堆砌华丽金饰。",
    tang: "中国唐代。圆领袍、襦裙、披帛、发髻、妆面与鞋履根据人物身份准确使用，色彩可饱满但避免现代仙侠塑料感。",
    victorian: "欧洲维多利亚时代。束身结构、外套、马甲、裙撑、领口、帽饰、发型、鞋履和阶层细节准确，避免现代面料与拉链。",
    medieval: "欧洲中世纪。羊毛、亚麻、皮革、锁甲或礼服层次符合身份，剪裁和工艺保持历史可信，不使用现代奇幻游戏式塑料盔甲。",
    ancient: "架空古代。先建立统一文化来源、服装结构和工艺逻辑，避免同时混合多个历史朝代与地区符号。"
  };

  const genreProfiles = {
    realism: { label: "现实主义", tones: { neutral: ["自然纪实", "中性日光、低饱和生活色、低反差、肤色准确"], warm: ["温暖生活", "轻暖窗光感、柔和肤色、低饱和木色与布料色"], austere: ["克制冷灰", "冷灰低饱和、柔和阴影、安静疏离但面部清楚"] } },
    crime: { label: "黑色犯罪", tones: { noir: ["经典黑色", "低饱和黑白或蓝灰倾向、柔化后的侧光塑形、半明半暗但眼睛清楚"], urban: ["都市蓝黑", "蓝黑冷调、极轻微钠灯暖色点缀、克制反差"], amber: ["权力暖棕", "琥珀暖棕、低照度感、木质与深色服装厚重"] } },
    suspense: { label: "悬疑心理", tones: { green: ["心理绿灰", "绿灰低饱和、冷白柔光、细微压迫感"], cold: ["理性冷蓝", "冷蓝灰、干净高还原、眼神与面部结构清楚"], warmcold: ["冷暖疑云", "中性肤色、冷背景边缘感与轻暖面部主光对比"] } },
    romance: { label: "爱情文艺", tones: { golden: ["暖金柔光", "轻暖金肤色、柔和逆光感、低反差"], muted: ["低饱和怀旧", "低饱和暖灰、旧照片般克制色彩但保持RAW细节"], cool: ["清冷错过", "轻冷蓝灰、柔软肤色、安静疏离"] } },
    comedy: { label: "喜剧", tones: { clean: ["明亮自然", "明亮中性、干净白光、真实鲜明服装色"], pastel: ["柔和彩色", "低饱和粉彩服装倾向、光线均匀、肤色自然"], graphic: ["秩序色块", "清晰色块、轻度对称感、明快但不荧光"] } },
    horror: { label: "恐怖惊悚", tones: { moon: ["冷月灰蓝", "冷灰蓝倾向、柔和下压亮度、眼窝与骨相清楚"], sickly: ["病态灰绿", "极克制灰绿、低饱和、轻微不安感但不把皮肤做尸体色"], candle: ["烛光暗暖", "暗暖琥珀倾向、柔和侧光、阴影保留细节"] } },
    scifi: { label: "硬核科幻", tones: { clinical: ["实验室冷白", "冷白高还原、蓝灰阴影、干净功能性材质"], steel: ["钢铁蓝灰", "低饱和钢蓝、金属灰、克制轮廓光"], desert: ["沙金未来", "低饱和沙金与雾灰、硬朗材质、肤色自然"] } },
    cyberpunk: { label: "赛博朋克", tones: { cyan: ["青蓝霓虹", "白棚中只给人物边缘极轻青蓝色偏移，背景仍纯白"], magenta: ["品红蓝紫", "服装与边缘光轻度品红蓝紫倾向，不污染肤色"], sodium: ["钠灯蓝黑", "深色服装、轻橙边缘与冷蓝阴影的克制对比"] } },
    war: { label: "战争军事", tones: { dust: ["灰褐尘土", "低饱和灰褐、军绿与真实旧化材质"], winter: ["冬季冷灰", "冷灰低饱和、苍白天光感、肤色保持生命感"], fire: ["烟火压迫", "灰黑服装倾向、极轻暖色反射、克制高反差"] } },
    wuxia: { label: "武侠江湖", tones: { ink: ["水墨青灰", "青灰、墨黑与米白克制组合，柔和层次"], bamboo: ["竹林青绿", "低饱和青绿、冷白肤色主光、自然布料色"], grandmaster: ["暖暗宗师", "深棕、暗金与黑色服装倾向，柔和侧光塑形"] } },
    court: { label: "历史宫廷", tones: { candle: ["烛光油画", "暖金、深红与暗棕倾向，柔和低照度塑形"], imperial: ["朱红暗金", "朱红与暗金服饰重点、肤色中性、光线庄重"], austere: ["冷峻权谋", "冷灰青与深色服装、克制反差、面部半明半暗"] } },
    western: { label: "西部荒漠", tones: { sun: ["烈日沙黄", "沙黄、晒白布料与皮革棕，硬朗但白棚光保持柔和"], dusk: ["黄昏铜棕", "铜棕与暗红倾向、轻暖轮廓感"], modern: ["现代冷西部", "低饱和灰褐、牛仔蓝与冷静肤色"] } },
    fantasy: { label: "史诗奇幻", tones: { dawn: ["晨雾金蓝", "轻金主光倾向与冷蓝阴影，材质古老"], dark: ["冷铁黑暗", "铁灰、冷蓝与极轻火光暖色，暗部清楚"], mythic: ["神话大色块", "明确主色、金色细节和庄严轮廓，不使用廉价高饱和特效"] } },
    youth: { label: "青春成长", tones: { summer: ["夏日暖光", "暖阳肤色、浅绿色与低对比清亮感"], campus: ["校园清透", "中性日光、干净浅色、真实年轻皮肤"], nostalgic: ["胶片怀旧", "低饱和暖灰、轻微胶片色偏与克制颗粒感"] } }
  };

  const state = {
    source: "reference",
    layout: "three",
    copied: false,
    versions: [],
    referenceAsset: null,
    previewUrl: "",
    assetBusy: false,
    assetError: "",
    assetRequest: 0,
    versionBusy: false,
    versionRequest: 0
  };

  const elements = {
    sourceButtons: [...document.querySelectorAll("[data-casting-source]")],
    layoutButtons: [...document.querySelectorAll("[data-casting-layout]")],
    preview: document.querySelector("#casting-layout-preview"),
    id: document.querySelector("#casting-id"),
    role: document.querySelector("#casting-role"),
    age: document.querySelector("#casting-age"),
    body: document.querySelector("#casting-body"),
    face: document.querySelector("#casting-face"),
    hair: document.querySelector("#casting-hair"),
    costume: document.querySelector("#casting-costume"),
    traits: document.querySelector("#casting-traits"),
    wardrobe: document.querySelector("#casting-wardrobe"),
    props: document.querySelector("#casting-props"),
    neutralExpression: document.querySelector("#casting-neutral-expression"),
    expressionSet: document.querySelector("#casting-expression-set"),
    signatureAction: document.querySelector("#casting-signature-action"),
    stance: document.querySelector("#casting-stance"),
    identityDetails: document.querySelector("#casting-identity-details"),
    referenceNotes: document.querySelector("#casting-reference-notes"),
    referenceNotesField: document.querySelector("#casting-reference-notes-field"),
    reference: document.querySelector("#casting-reference"),
    medium: document.querySelector("#casting-medium"),
    era: document.querySelector("#casting-era"),
    genre: document.querySelector("#casting-genre"),
    tone: document.querySelector("#casting-tone"),
    skin: document.querySelector("#casting-skin"),
    lighting: document.querySelector("#casting-lighting"),
    ratio: document.querySelector("#casting-ratio"),
    output: document.querySelector("#casting-output"),
    filename: document.querySelector("#casting-filename"),
    status: document.querySelector("#casting-status-value"),
    copy: document.querySelector("#casting-copy"),
    clear: document.querySelector("#casting-clear"),
    example: document.querySelector("#casting-example"),
    validation: document.querySelector("#casting-validation"),
    checks: [...document.querySelectorAll("[data-casting-check]")],
    stageId: document.querySelector("#casting-stage-id"),
    stageTitle: document.querySelector("#casting-stage-title"),
    stageStatus: document.querySelector("#casting-stage-status"),
    rosterId: document.querySelector("#casting-roster-current-id"),
    rosterRole: document.querySelector("#casting-roster-current-role"),
    rosterStatus: document.querySelector("#casting-roster-current-status"),
    rosterImage: document.querySelector("#casting-roster-current-image"),
    identityBoard: document.querySelector(".casting-identity-board"),
    templateSample: document.querySelector("#casting-template-sample"),
    templateCaption: document.querySelector("#casting-template-caption"),
    templateTitle: document.querySelector("#casting-template-title"),
    templatePurpose: document.querySelector("#casting-template-purpose"),
    templateComposition: document.querySelector("#casting-template-composition"),
    templateStage: document.querySelector("#casting-template-stage"),
    syncProject: document.querySelector("#casting-sync-project"),
    templateStageLabel: document.querySelector("#casting-template-stage-label"),
    referenceLayer: document.querySelector("#casting-reference-layer"),
    identityImage: document.querySelector("#casting-identity-board-image"),
    referenceFile: document.querySelector("#casting-reference-file"),
    uploadEmpty: document.querySelector("#casting-upload-empty"),
    uploadEmptyTitle: document.querySelector("#casting-upload-empty strong"),
    uploadEmptyHint: document.querySelector("#casting-upload-empty span"),
    selectImage: document.querySelector("#casting-select-image"),
    uploadError: document.querySelector("#casting-upload-error"),
    assetMeta: document.querySelector("#casting-asset-meta"),
    assetSummary: document.querySelector("#casting-asset-summary"),
    replaceImage: document.querySelector("#casting-replace-image"),
    removeImage: document.querySelector("#casting-remove-image"),
    versionStrip: document.querySelector("#casting-version-strip"),
    versionCount: document.querySelector("#casting-version-count"),
    saveVersion: document.querySelector("#casting-save-version")
  };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function value(element, fallback) {
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

  function currentIdentityValues() {
    return {
      wardrobe: elements.wardrobe.value,
      props: elements.props.value,
      neutralExpression: elements.neutralExpression.value,
      expressionSet: elements.expressionSet.value,
      signatureAction: elements.signatureAction.value,
      stance: elements.stance.value
    };
  }

  function renderToneOptions() {
    const profile = genreProfiles[elements.genre.value] || genreProfiles.realism;
    const previous = elements.tone.value;
    elements.tone.innerHTML = "";
    Object.entries(profile.tones).forEach(([key, [label]]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = label;
      elements.tone.appendChild(option);
    });
    elements.tone.value = profile.tones[previous] ? previous : Object.keys(profile.tones)[0];
  }

  function currentToneProfile() {
    const genre = genreProfiles[elements.genre.value] || genreProfiles.realism;
    const tone = genre.tones[elements.tone.value] || Object.values(genre.tones)[0];
    return { genre: genre.label, tone: tone[0], description: tone[1] };
  }

  function materialSection() {
    const medium = mediumProfiles[elements.medium.value] || mediumProfiles.live;
    if (elements.medium.value === "live") {
      return `【真人皮肤与头发】\n${skinProfiles[elements.skin.value]}。皮肤不能像塑料、硅胶、蜡像或3D模型；不要磨皮，不要美容滤镜，不要过度锐化。头发根根可辨但不过度数字锐利，发际线自然，碎发真实，不使用假发套般整齐边缘。\n\n【摄影与材质】\n${medium.capture}。真实布料纤维、缝线、褶皱、皮革、金属和鞋履纹理，颜色准确，边缘自然，不出现AI涂抹感。`;
    }
    const consistencyScope = state.layout === "identity" ? "身份资料板全部区域" : "全部视图";
    const renderingScope = state.layout === "identity" ? "不同信息分区" : "不同视图";
    return `【动画造型与材质】\n${medium.material}。角色的脸型、年龄感、发际线、眼距、眉形、鼻形、嘴唇、耳朵、头身比和服装结构在${consistencyScope}中必须一致。\n\n【动画资产呈现】\n${medium.capture}。不要用随机纹理掩盖五官，不要让${renderingScope}出现不同线稿、不同渲染器或不同造型设计。`;
  }

  function referenceRule() {
    return castingReferenceRule(
      state.layout,
      state.source,
      elements.reference.value,
      elements.referenceNotes.value
    );
  }

  function viewCompletionRule() {
    return castingLayoutRules(state.layout, state.source, currentIdentityValues()).completion;
  }

  function layoutRule() {
    return castingLayoutRules(state.layout, state.source, currentIdentityValues()).composition;
  }

  function poseRule() {
    return castingLayoutRules(state.layout, state.source, currentIdentityValues()).pose;
  }

  function composePrompt() {
    const role = value(elements.role, "[填写角色姓名与身份]");
    const age = value(elements.age, "[填写准确年龄、性别和地区身份]");
    const body = value(elements.body, "[填写身高、体型、肩宽、四肢和身材比例]");
    const face = value(elements.face, "[填写脸宽、脸颊饱满度、下巴、发际线、眼距、眉形、鼻子长度与宽度、嘴唇、耳朵、肤色和年龄特征]");
    const hair = value(elements.hair, "[填写发型、分缝、长度、发色和发际线状态]");
    const costume = value(elements.costume, "[填写服装层次、材质、颜色、鞋履和穿着状态]");
    const traits = value(elements.traits, "[填写疤痕、痣、眼镜、首饰、身份道具及固定位置]");
    const assetId = value(elements.id, "CHAR-001");
    const medium = mediumProfiles[elements.medium.value] || mediumProfiles.live;
    const tone = currentToneProfile();
    const era = eraProfiles[elements.era.value] || eraProfiles.contemporary;
    const projectBaseline = lockedProjectVisualBaseline();
    const projectBibleRule = projectBaseline
      ? `已锁定项目视觉基线：${projectBaseline}。只将其用于服装配色、材质选择、发型与配饰的统一、以及人物的轻微塑形光；不得把角色资料板改造成电影场景，不得改变肤色、真实年龄、身份特征或白色背景。`
      : "尚未锁定项目视觉圣经；先遵循角色设定、时代纪律和纯白影棚规范。";
    const identityBoardSections = state.layout === "identity" ? `

【服装层级】
${value(elements.wardrobe, "[填写内外层服装、鞋履、材质、颜色和穿着状态]")}。

【固定道具】
${value(elements.props, "[填写道具、材质、尺寸、使用痕迹和固定位置]")}。

【表情组】
常态表情：${value(elements.neutralExpression, "[填写常态表情]")}。情绪表情：${value(elements.expressionSet, "[填写3至4种可复用情绪表情]")}。所有表情保持同一脸部几何和真实年龄。

【动作姿态组】
标志性动作：${value(elements.signatureAction, "[填写标志性动作]")}。常用站姿与身体状态：${value(elements.stance, "[填写站姿、重心、肩颈和动作状态]")}。动作不改变体型、服装结构和固定道具位置。` : "";

    const singleView = state.layout === "single";
    const identityBoard = state.layout === "identity";
    const promptLayoutRules = castingLayoutRules(state.layout, state.source, currentIdentityValues(), elements.ratio.value);
    const taskName = identityBoard
      ? (state.source === "reference" ? "依据现有参考图建立角色身份资料板" : "从文字设定首次建立角色身份资料板")
      : (singleView
        ? (state.source === "reference" ? "依据现有参考图生成一张高精度单视图身份肖像" : "在没有人物参考图的情况下，从文字设定生成一张高精度单视图身份候选肖像")
        : (state.source === "reference" ? "把现有单张角色参考图转换为规范多视图身份母版" : "从文字设定首次建立角色多视图身份母版"));
    const targetStatus = castingStatusLabel(state.layout);
    const identityRule = identityBoard
      ? "人物主肖像、服装、道具、表情和动作分区必须严格保持相同的脸部几何、真实年龄、肤色、发际线、发型、颈部粗细、肩宽和身体比例。固定特征、配饰、服装结构和道具位置不得漂移，不得美化、年轻化、网红化或改变种族特征。"
      : (singleView
        ? "画面中只能出现一个人物和一张脸。必须严格落实文字设定中的脸宽、脸颊饱满度、下巴形状、发际线高度与轮廓、眼距、眼睛形状、眉形、鼻子长度与宽度、鼻翼、嘴唇厚度与唇峰、耳朵大小与位置、肤色和真实年龄。人物必须具有自然、可辨认、可复用的独特身份，不能生成缺乏特征的平均脸、网红脸或过度完美的模板脸。"
        : (state.layout === "four"
          ? "全部视图必须是同一个人，严格保持脸宽、五官、真实年龄、肤色、发际线、发型、身高、体型与服装细节一致。左侧两张脸部特写作为最高优先级身份锚点；右侧全身图不得重新设计人物，背面不得回头或露出正脸。不得生成相似但不同的人脸、换脸、美化、年轻化或网红化。"
          : "所有面板必须严格保持相同的脸宽、脸颊饱满度、下巴形状、发际线高度与轮廓、眼距、眼睛形状、眉形、鼻子长度与宽度、鼻翼、嘴唇厚度与唇峰、耳朵大小与位置、肤色、真实年龄、颈部粗细、肩宽、身高和身材比例。疤痕、痣、皱纹、发缝、配饰和服装细节的位置必须一致。不得出现“看起来相似”但实际不同的人脸，不得左右面板各自重新生成身份，不得美化、年轻化、网红化或改变种族特征。"));
    const identityCompositionLock = promptLayoutRules.compositionLock
      ? `\n\n【身份资料板构图硬约束】\n${promptLayoutRules.compositionLock}`
      : "";
    return `【生成任务】\n为电影AIGC制作${taskName}，资产编号 ${assetId}，${promptLayoutRules.outputFormat}，高分辨率。目标是建立${targetStatus}，不是时尚海报，不是随意概念草图。\n\n【视觉媒介】\n${medium.label}。${medium.material}。\n\n【故事年代与服化道纪律】\n${era}\n\n【影片类型与角色影调】\n影片类型：${tone.genre}。影调方案：${tone.tone}。${tone.description}。类型影调只作用于角色的服装配色、材质倾向和轻微塑形光，白色背景必须保持中性纯白，不能把母版变成电影场景或彩色环境剧照。\n\n【项目视觉圣经继承】\n${projectBibleRule}\n\n【参考图与身份优先级】\n${referenceRule()}\n\n【角色设定】\n角色：${role}。\n年龄与性别：${age}。\n体型与身材比例：${body}。\n脸部身份锚点：${face}。\n发型：${hair}。\n服装：${costume}。\n固定身份特征与道具：${traits}。${identityBoardSections}\n\n【版式与画面占比】\n${layoutRule()}\n\n【缺失视角补全规则】\n${viewCompletionRule()}\n\n【身份一致性硬锁定】\n${identityRule}\n\n【表情与姿态】\n${poseRule()} 不使用夸张表情、戏剧动作、战斗姿势、T字姿势或模特摆拍。\n\n【白底影棚与光影】\n背景为纯白色无缝影棚背景，地面与背景连续，无地平线断层、无灰色渐变墙、无场景道具。${lightingProfiles[elements.lighting.value]}。各面板白平衡、曝光、光向、眼神光、地面阴影强度完全一致。\n\n${materialSection()}${identityCompositionLock}\n\n【限定负面】\n${castingNegativeRule(state.layout, medium.negative)}`;
  }

  function renderPreview() {
    if (state.layout === "single") {
      elements.preview.className = "casting-board-preview preview-single";
      elements.preview.innerHTML = '<div class="preview-panel preview-face"><span>单人近景身份候选</span><b>脸部 55%-65%</b></div>';
      return;
    }
    if (state.layout === "three") {
      elements.preview.className = "casting-board-preview preview-three";
      elements.preview.innerHTML = '<div class="preview-panel preview-face"><span>正脸特写</span><b>45%</b></div><div class="preview-panel preview-half"><span>45度半身</span><b>30%</b></div><div class="preview-panel preview-full"><span>正面全身</span><b>25%</b></div>';
      return;
    }
    if (state.layout === "identity") {
      elements.preview.className = "casting-board-preview preview-three";
      elements.preview.innerHTML = '<div class="preview-panel preview-face"><span>人物主肖像</span><b>40%</b></div><div class="preview-panel preview-half"><span>服装拆解</span><b>20%</b></div><div class="preview-panel preview-full"><span>道具 / 表情 / 动作</span><b>40%</b></div>';
      return;
    }
    elements.preview.className = "casting-board-preview preview-four";
    elements.preview.innerHTML = '<div class="preview-face-stack"><div class="preview-panel preview-face"><span>正脸特写</span><b>身份锚点</b></div><div class="preview-panel preview-face"><span>90° 侧脸特写</span><b>身份锚点</b></div></div><div class="preview-views"><div class="preview-panel">正面全身</div><div class="preview-panel">45° 全身</div><div class="preview-panel">背面全身<br><small>不露正脸</small></div></div>';
  }

  function safeFilenamePart(value, fallback) {
    return String(value || "")
      .trim()
      .replace(/[\\/:*?"<>|\s]+/g, "_")
      .replace(/^_+|_+$/g, "") || fallback;
  }

  function requiredState() {
    return {
      role: elements.role.value.trim(),
      age: elements.age.value.trim(),
      body: elements.body.value.trim(),
      face: elements.face.value.trim(),
      hair: elements.hair.value.trim(),
      costume: elements.costume.value.trim()
    };
  }

  function displayRole() {
    return value(elements.role, "未命名角色").replace(/[，,]\s*/, " / ");
  }

  function versionLabel(number) {
    return castingStatusLabel(state.layout);
  }

  function releasePreviewUrl() {
    if (state.previewUrl) root.URL.revokeObjectURL(state.previewUrl);
    state.previewUrl = "";
  }

  function assetMetadata(asset) {
    if (!asset || !asset.id) return null;
    const { blob, ...metadata } = asset;
    return metadata;
  }

  function assetStore() {
    return root.aigcCastingAssetStore;
  }

  const versionPreviewCache = createVersionPreviewCache({
    loadAsset: async (assetId) => {
      const store = assetStore();
      return store && typeof store.get === "function" ? store.get(assetId) : null;
    },
    createObjectURL: (blob) => root.URL.createObjectURL(blob),
    revokeObjectURL: (url) => root.URL.revokeObjectURL(url)
  });

  function versionAssetIds() {
    return [...new Set(state.versions.map((version) => version?.referenceAssetId).filter(Boolean))];
  }

  async function restoreVersionPreviews() {
    const current = await versionPreviewCache.sync(versionAssetIds());
    if (current) renderVersions();
  }

  async function persistWorkspaceNow() {
    const persist = root.aigcWorkspaceCore?.persistNow;
    if (typeof persist !== "function") throw new Error("项目元数据保存不可用。");
    return persist();
  }

  async function removeOwnedAsset(assetId, store = assetStore()) {
    if (!assetId || !store || typeof store.remove !== "function") {
      throw new Error("临时图片无法清理。");
    }
    await store.remove(assetId);
  }

  async function cleanupAssetIfUnreferenced(assetId) {
    if (!assetId) return { removed: false, retained: true, reason: "empty" };
    const cleanup = root.aigcWorkspaceCore?.cleanupCastingAssetIfUnreferenced;
    if (typeof cleanup !== "function") return { removed: false, retained: true, reason: "uncertain" };
    try {
      return await cleanup(assetId);
    } catch (error) {
      return { removed: false, retained: true, reason: "uncertain" };
    }
  }

  function assetErrorMessage(error, fallback) {
    return error && error.message ? error.message : fallback;
  }

  function assetSummary(asset) {
    if (!asset) return "";
    const dimensions = asset.width && asset.height ? `${asset.width} x ${asset.height}` : "尺寸未知";
    const size = asset.size ? `${(asset.size / (1024 * 1024)).toFixed(1)}MB` : "大小未知";
    return `${asset.name || "人物参考图"} · ${dimensions} · ${size}`;
  }

  async function saveReferenceAsset(createAsset) {
    if (state.assetBusy) return false;
    const store = assetStore();
    if (!store) {
      state.assetError = "当前浏览器不支持本地图片存储。";
      render();
      return false;
    }

    const request = ++state.assetRequest;
    let nextAsset = null;
    let mutationHandled = false;
    state.assetBusy = true;
    state.assetError = "";
    render();

    try {
      const next = await createAsset(store);
      nextAsset = next.asset;
      const nextMetadata = assetMetadata(next.asset);
      const nextPreviewUrl = root.URL.createObjectURL(next.blob);
      mutationHandled = true;
      const mutation = await persistReferenceAssetMutation({
        targetState: state,
        request,
        nextAsset: nextMetadata,
        nextPreviewUrl,
        persistNow: persistWorkspaceNow,
        revokeObjectURL: (url) => root.URL.revokeObjectURL(url),
        removeOwnedAsset: (assetId) => removeOwnedAsset(assetId, store),
        onStateChange: render
      });
      if (!mutation.committed) {
        if (request === state.assetRequest) {
          state.assetError = mutation.cleanupError
            ? "项目保存失败，且临时图片清理失败。"
            : assetErrorMessage(mutation.error, "项目保存失败，已恢复原参考图。");
        }
        return false;
      }
      await cleanupAssetIfUnreferenced(mutation.cleanupAssetId);
      return true;
    } catch (error) {
      if (request === state.assetRequest) state.assetError = assetErrorMessage(error, "图片保存失败。");
      if (nextAsset?.id && !mutationHandled) {
        try {
          await removeOwnedAsset(nextAsset.id, store);
        } catch (cleanupError) {
          if (request === state.assetRequest) state.assetError = "图片保存失败，且临时图片清理失败。";
        }
      }
      return false;
    } finally {
      if (request === state.assetRequest) {
        state.assetBusy = false;
        render();
      }
    }
  }

  async function handleReferenceFile(file) {
    const store = assetStore();
    const validation = store?.validateFile(file);
    if (!validation?.ok) {
      state.assetError = validation?.error || "当前浏览器不支持本地图片存储。";
      render();
      return false;
    }

    const saved = await saveReferenceAsset(async (currentStore) => {
      const prepared = await currentStore.prepareImage(file);
      return {
        asset: await currentStore.put(prepared.blob, prepared.meta),
        blob: prepared.blob
      };
    });
    elements.referenceFile.value = "";
    return saved;
  }

  async function restoreReferenceAsset(meta) {
    const metadata = assetMetadata(meta);
    if (!metadata) {
      releasePreviewUrl();
      state.referenceAsset = null;
      render();
      return;
    }

    const store = assetStore();
    if (!store) {
      state.assetError = "当前浏览器不支持本地图片存储。";
      render();
      return;
    }

    const request = ++state.assetRequest;
    state.assetBusy = true;
    state.assetError = "";
    render();

    try {
      const stored = await store.get(metadata.id);
      if (request !== state.assetRequest) return;
      if (!stored?.blob) {
        retainMissingReferenceMetadata(
          state,
          request,
          (url) => root.URL.revokeObjectURL(url)
        );
        return;
      }
      const nextPreviewUrl = root.URL.createObjectURL(stored.blob);
      if (request !== state.assetRequest) {
        root.URL.revokeObjectURL(nextPreviewUrl);
        return;
      }
      releasePreviewUrl();
      state.referenceAsset = assetMetadata(stored.meta) || metadata;
      state.previewUrl = nextPreviewUrl;
    } catch (error) {
      if (request === state.assetRequest) state.assetError = assetErrorMessage(error, "图片读取失败。");
    } finally {
      if (request === state.assetRequest) {
        state.assetBusy = false;
        render();
      }
    }
  }

  async function clearReferenceAsset() {
    if (state.assetBusy) return false;
    const request = ++state.assetRequest;
    state.assetBusy = true;
    state.assetError = "";
    render();

    try {
      const mutation = await persistReferenceAssetMutation({
        targetState: state,
        request,
        nextAsset: null,
        nextPreviewUrl: "",
        persistNow: persistWorkspaceNow,
        revokeObjectURL: (url) => root.URL.revokeObjectURL(url),
        onStateChange: render
      });
      if (!mutation.committed) {
        if (request === state.assetRequest) {
          state.assetError = assetErrorMessage(mutation.error, "项目保存失败，已恢复原参考图。");
        }
        return false;
      }
      await cleanupAssetIfUnreferenced(mutation.cleanupAssetId);
      return true;
    } catch (error) {
      if (request === state.assetRequest) state.assetError = assetErrorMessage(error, "图片删除失败。");
      return false;
    } finally {
      if (request === state.assetRequest) {
        state.assetBusy = false;
        render();
      }
    }
  }

  function renderVersions() {
    const saved = state.versions.map((version) => ({ ...version, pending: false }));
    const visible = saved.slice(-3);
    const nextVersionNumber = Math.max(0, ...saved.map((version) => Number(version.number) || 0)) + 1;
    for (let number = nextVersionNumber; visible.length < 3; number += 1) {
      visible.push({ number, label: versionLabel(number), pending: true });
    }
    elements.versionStrip.innerHTML = visible.map((version) => {
      const previewUrl = version.pending
        ? state.previewUrl
        : versionPreviewCache.get(version.referenceAssetId);
      const image = previewUrl
        ? `<img src="${escapeHtml(previewUrl)}" alt="${escapeHtml(version.pending ? "待确认角色版本" : `已保存角色版本 V${version.number}`)}">`
        : `<div class="casting-version-empty">${version.pending ? "待保存参考图" : "未关联参考图"}</div>`;
      return `
      <article class="casting-version-card ${version.pending ? "pending" : "saved"}">
        <header><strong>V${String(version.number).padStart(3, "0")}</strong><span>${escapeHtml(version.label || versionLabel(version.number))}</span></header>
        ${image}
        <small>${version.pending ? "待保存" : escapeHtml(version.layoutLabel || "角色身份母版")}</small>
      </article>`;
    }).join("");
    elements.versionCount.textContent = `${state.versions.length} 个已保存版本`;
    elements.saveVersion.textContent = state.versions.length ? `保存版本 V${nextVersionNumber}` : "保存版本";
  }

  function renderIdentityStage() {
    const id = value(elements.id, "CHAR-001");
    const role = displayRole();
    const layoutStatus = castingStatusLabel(state.layout);
    elements.stageId.textContent = id;
    elements.stageTitle.textContent = role;
    elements.stageStatus.textContent = layoutStatus;
    elements.rosterId.textContent = id;
    elements.rosterRole.textContent = role;
    elements.rosterStatus.textContent = layoutStatus;
    elements.identityImage.dataset.layout = state.layout;
    elements.identityImage.alt = `${role}${CASTING_TEMPLATE_PROFILES[state.layout]?.label || CASTING_TEMPLATE_PROFILES.three.label}`;
    const hasPreview = Boolean(state.previewUrl);
    elements.identityImage.hidden = !hasPreview;
    elements.rosterImage.hidden = !hasPreview;
    if (hasPreview) {
      elements.identityImage.src = state.previewUrl;
      elements.rosterImage.src = state.previewUrl;
      elements.rosterImage.alt = `${role}角色身份缩略图`;
    } else {
      elements.identityImage.removeAttribute("src");
      elements.rosterImage.removeAttribute("src");
    }
    elements.uploadEmpty.hidden = hasPreview;
    elements.uploadEmptyTitle.textContent = state.source === "reference" ? "拖入人物参考图" : "文字新建角色";
    elements.uploadEmptyHint.textContent = state.source === "reference" ? "JPG、PNG、WebP，单张不超过 15MB" : "不使用人物参考图，直接依据文字设定建立身份母版";
    elements.selectImage.hidden = state.source !== "reference";
    elements.selectImage.disabled = state.assetBusy;
    elements.replaceImage.disabled = state.assetBusy;
    elements.removeImage.disabled = state.assetBusy || !state.referenceAsset;
    elements.example.disabled = state.assetBusy;
    elements.assetMeta.hidden = !hasPreview;
    elements.assetSummary.textContent = assetSummary(state.referenceAsset);
    elements.uploadError.hidden = !state.assetError;
    elements.uploadError.textContent = state.assetError;
    renderVersions();
  }

  function characterSummary() {
    return buildCharacterSummaryFromElements(elements);
  }

  function render() {
    renderToneOptions();
    elements.sourceButtons.forEach((button) => {
      const selected = button.dataset.castingSource === state.source;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    const referenceMode = state.source === "reference";
    const profile = CASTING_TEMPLATE_PROFILES[state.layout] || CASTING_TEMPLATE_PROFILES.three;
    elements.reference.disabled = !referenceMode;
    elements.referenceNotesField.hidden = !referenceMode;
    elements.referenceLayer.hidden = !referenceMode;
    elements.templateSample.src = profile.image;
    elements.templateSample.alt = `${profile.label}，仅作为构图参考`;
    elements.templateTitle.textContent = profile.label;
    elements.templatePurpose.textContent = profile.purpose;
    elements.templateComposition.textContent = profile.composition;
    elements.templateStage.textContent = profile.stage;
    elements.templateStageLabel.textContent = profile.stage;
    const captions = castingTemplateCaptions(state.layout);
    elements.templateCaption.style.gridTemplateColumns = `repeat(${captions.length}, minmax(0, 1fr))`;
    elements.templateCaption.replaceChildren(...captions.map((caption) => {
      const span = document.createElement("span");
      span.textContent = caption;
      return span;
    }));
    elements.identityDetails.open = state.layout === "identity";
    elements.skin.disabled = elements.medium.value !== "live";
    elements.layoutButtons.forEach((button) => {
      const selected = button.dataset.castingLayout === state.layout;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    renderPreview();
    elements.output.value = composePrompt();
    elements.copy.textContent = state.copied ? "已复制" : "复制提示词";
    const required = requiredState();
    const missing = Object.entries(required).filter(([, fieldValue]) => !fieldValue).map(([key]) => key);
    missing.push(...getIdentityValidation(state.layout, currentIdentityValues()));
    missing.push(...getCastingSourceValidation(state.source, state.referenceAsset, state.previewUrl));
    elements.checks.forEach((check) => {
      const ready = Boolean(required[check.dataset.castingCheck]);
      check.classList.toggle("ready", ready);
      check.classList.toggle("missing", !ready);
    });
    // 导演级优化：解除强制禁用，允许导出草稿
    elements.copy.disabled = false;
    elements.validation.textContent = missing.length ? `提示：建议补全 ${missing.length} 项角色身份信息以锁定一致性。` : "角色身份信息完整，可以复制或发送到其他工作台。";
    elements.validation.classList.toggle("ready", missing.length === 0);
    elements.validation.classList.toggle("warning", missing.length > 0);
    elements.saveVersion.disabled = missing.length > 0 || state.assetBusy || state.versionBusy;
    if (state.layout === "identity") {
      elements.filename.textContent = `${safeFilenamePart(elements.id.value, "CHAR-001")}_${safeFilenamePart(elements.role.value, "角色名")}_身份资料板_v001.png`;
    } else {
      const layoutName = state.layout === "single" ? "白底单视图身份候选" : (state.layout === "three" ? "白底三视图" : "白底四视图母版");
      const statusSuffix = state.layout === "single" ? "CANDIDATE" : "LOCKED";
      elements.filename.textContent = `${safeFilenamePart(elements.id.value, "CHAR-001")}_${safeFilenamePart(elements.role.value, "角色名")}_${layoutName}_v001_${statusSuffix}.png`;
    }
    elements.status.textContent = castingStatusLabel(state.layout);
    renderIdentityStage();
  }

  function clearFields() {
    elements.id.value = "CHAR-001";
    [elements.role, elements.age, elements.body, elements.face, elements.hair, elements.costume, elements.traits, elements.wardrobe, elements.props, elements.neutralExpression, elements.expressionSet, elements.signatureAction, elements.stance].forEach((element) => {
      element.value = "";
    });
    elements.reference.value = "preserve-all";
    elements.referenceNotes.value = "";
    elements.skin.value = "dry";
    elements.medium.value = "live";
    elements.era.value = "contemporary";
    elements.genre.value = "realism";
    elements.lighting.value = "soft";
    elements.ratio.value = "16:9";
    state.layout = "three";
    state.source = "reference";
    state.copied = false;
    render();
  }

  async function saveRoleVersion() {
    if (elements.saveVersion.disabled || state.versionBusy) return false;
    const previousVersions = state.versions;
    const request = ++state.versionRequest;
    const number = Math.max(0, ...previousVersions.map((version) => Number(version.number) || 0)) + 1;
    state.versionBusy = true;
    state.assetError = "";
    const update = appendRoleVersion(state, {
      number,
      label: versionLabel(number),
      createdAt: new Date().toISOString(),
      layout: state.layout,
      layoutLabel: state.layout === "identity" ? "身份资料板" : (state.layout === "single" ? "单视图身份候选" : `${state.layout === "three" ? "三" : "四"}视图身份母版`),
      id: value(elements.id, "CHAR-001"),
      role: displayRole(),
      referenceAssetId: state.referenceAsset?.id || "",
      prompt: composePrompt()
    });
    render();

    try {
      try {
        await persistWorkspaceNow();
      } catch (error) {
        if (request === state.versionRequest) {
          state.versions = previousVersions;
          state.assetError = assetErrorMessage(error, "版本保存失败，未清理任何图片。");
        }
        return false;
      }

      if (request === state.versionRequest) await restoreVersionPreviews();
      for (const assetId of update.evictedAssetIds) {
        await cleanupAssetIfUnreferenced(assetId);
      }
      return true;
    } finally {
      if (request === state.versionRequest) {
        state.versionBusy = false;
        render();
      }
    }
  }

  async function loadExample() {
    if (state.assetBusy) return false;
    elements.id.value = "CHAR-001";
    elements.role.value = "林岚，刑警队法医";
    elements.age.value = "38岁，中国女性";
    elements.body.value = "168cm，肩背挺直，匀称偏瘦，四肢比例自然";
    elements.face.value = "偏宽鹅蛋脸，脸颊轻微饱满，圆钝下巴，中等高度自然发际线，眼距略宽，平直眉，鼻梁自然、鼻翼中等，薄上唇与饱满下唇，耳朵贴近头部，左眉尾有一条浅疤";
    elements.hair.value = "黑色齐肩直发，右侧分缝，少量自然碎发";
    elements.costume.value = "深灰色哑光风衣、米白衬衫、黑色直筒裤、黑色低跟皮鞋，真实旧化程度轻微";
    elements.traits.value = "左眉尾浅疤、银色腕表、法医证件，所有视图位置与尺寸一致";
    elements.wardrobe.value = "米白棉质衬衫内层、深灰哑光防水风衣外层、黑色直筒裤与低跟皮鞋，袖口和鞋面有轻微使用痕迹";
    elements.props.value = "银色腕表固定佩戴左腕，法医证件夹在风衣左胸内侧，黑色记录笔放在右侧口袋";
    elements.neutralExpression.value = "克制中性，眼神专注，下颌轻微收紧";
    elements.expressionSet.value = "职业警觉、轻微担忧、压抑愤怒、确认线索后的坚定";
    elements.signatureAction.value = "俯身观察证物、整理手套、快速记录";
    elements.stance.value = "肩背挺直、重心稳定、动作克制，保持职业警觉";
    elements.referenceNotes.value = "原图为单人半身剧照；严格保留脸、真实年龄、发型、深灰风衣、左眉尾浅疤和银色腕表，补全原图未展示的下装、鞋履与服装背面";
    elements.medium.value = "live";
    elements.era.value = "1990s";
    elements.genre.value = "suspense";
    state.source = "reference";
    state.copied = false;
    render();
    const saved = await saveReferenceAsset(async (store) => {
      let asset = null;
      try {
        asset = await store.storeExample("assets/casting-char-001-board.png", "casting-char-001-board.png");
        const stored = await store.get(asset.id);
        if (!stored?.blob) throw new Error("示例图片读取失败。");
        return { asset, blob: stored.blob };
      } catch (error) {
        if (asset?.id) {
          await removeOwnedAsset(asset.id, store);
        }
        throw error;
      }
    });
    return saved;
  }

  elements.layoutButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selection = castingLayoutSelection({
        source: state.source,
        layout: state.layout,
        ratio: elements.ratio.value
      }, button.dataset.castingLayout);
      state.source = selection.source;
      state.layout = selection.layout;
      elements.ratio.value = selection.ratio;
      state.copied = false;
      render();
    });
  });

  elements.sourceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.source = button.dataset.castingSource;
      state.copied = false;
      render();
    });
  });

  [elements.id, elements.role, elements.age, elements.body, elements.face, elements.hair, elements.costume, elements.traits, elements.wardrobe, elements.props, elements.neutralExpression, elements.expressionSet, elements.signatureAction, elements.stance, elements.referenceNotes, elements.reference, elements.medium, elements.era, elements.genre, elements.tone, elements.skin, elements.lighting, elements.ratio].forEach((element) => {
    element.addEventListener("input", () => {
      state.copied = false;
      render();
    });
    element.addEventListener("change", () => {
      state.copied = false;
      render();
    });
  });

  elements.copy.addEventListener("click", () => {
    const text = composePrompt();
    elements.output.value = text;
    elements.output.focus();
    elements.output.select();
    
    const performCopy = async () => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          throw new Error("Clipboard API unavailable");
        }
      } catch (error) {
        document.execCommand("copy");
      }
      state.copied = true;
      render();
      setTimeout(() => {
        state.copied = false;
        render();
      }, 1500);
    };
    
    void performCopy();
  });

  elements.clear.addEventListener("click", clearFields);
  elements.syncProject.addEventListener("click", syncToProject);
  elements.example.addEventListener("click", () => { void loadExample(); });

  // 导演级表演预设快捷填充
  const presetButtons = document.querySelectorAll("[data-casting-preset]");
  const performancePresets = {
    anger: {
      neutralExpression: "下颌紧绷，双唇微抿，眼神克制而锐利",
      expressionSet: "压抑的愤怒、隐忍、眼神死死锁定目标",
      signatureAction: "手指微微收紧握拳、手臂肌肉瞬间绷紧",
      stance: "身体前倾半步、重心压在前脚掌"
    },
    sorrow: {
      neutralExpression: "眼眶微红，目光下垂，呼吸极其缓慢",
      expressionSet: "隐忍的悲伤、疲惫、无声的叹息",
      signatureAction: "抬手轻揉太阳穴或喉结微动吞咽",
      stance: "双肩微塌、身体重心后撤、略显孤立"
    },
    tension: {
      neutralExpression: "高度警觉，频繁且克制的眨眼，耳廓微动",
      expressionSet: "警惕、突发危机前的凝固、高度专注",
      signatureAction: "手掌贴近关键道具、头部微转观察四周",
      stance: "随时准备启动的半蹲或戒备站姿"
    },
    resolve: {
      neutralExpression: "冷静决绝，面部肌肉完全放松，眼神毫无波澜",
      expressionSet: "坚定、视死如归的平静、冷酷清醒",
      signatureAction: "扣上风衣纽扣或拉紧袖口、眼神冷峻直视前方",
      stance: "脊背挺直、双脚稳稳扎根地面"
    }
  };

  presetButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.castingPreset;
      const preset = performancePresets[type];
      if (!preset) return;
      if (elements.neutralExpression) elements.neutralExpression.value = preset.neutralExpression;
      if (elements.expressionSet) elements.expressionSet.value = preset.expressionSet;
      if (elements.signatureAction) elements.signatureAction.value = preset.signatureAction;
      if (elements.stance) elements.stance.value = preset.stance;
      state.copied = false;
      render();
    });
  });
  elements.selectImage.addEventListener("click", () => { if (!state.assetBusy) elements.referenceFile.click(); });
  elements.replaceImage.addEventListener("click", () => { if (!state.assetBusy) elements.referenceFile.click(); });
  elements.removeImage.addEventListener("click", () => { void clearReferenceAsset(); });
  elements.referenceFile.addEventListener("change", () => {
    const [file] = elements.referenceFile.files;
    if (file) void handleReferenceFile(file);
  });
  elements.identityBoard.addEventListener("dragenter", (event) => {
    event.preventDefault();
    if (!state.assetBusy) elements.identityBoard.classList.add("is-dragging");
  });
  elements.identityBoard.addEventListener("dragover", (event) => {
    event.preventDefault();
    if (!state.assetBusy) elements.identityBoard.classList.add("is-dragging");
  });
  elements.identityBoard.addEventListener("dragleave", (event) => {
    event.preventDefault();
    elements.identityBoard.classList.remove("is-dragging");
  });
  elements.identityBoard.addEventListener("drop", (event) => {
    event.preventDefault();
    elements.identityBoard.classList.remove("is-dragging");
    const [file] = event.dataTransfer?.files || [];
    if (file) void handleReferenceFile(file);
  });
  elements.saveVersion.addEventListener("click", () => { void saveRoleVersion(); });

  root.aigcCastingWorkbench = {
    exportState() {
      return {
        source: state.source,
        layout: state.layout,
        id: elements.id.value,
        role: elements.role.value,
        age: elements.age.value,
        body: elements.body.value,
        face: elements.face.value,
        hair: elements.hair.value,
        costume: elements.costume.value,
        traits: elements.traits.value,
        wardrobe: elements.wardrobe.value,
        props: elements.props.value,
        neutralExpression: elements.neutralExpression.value,
        expressionSet: elements.expressionSet.value,
        signatureAction: elements.signatureAction.value,
        stance: elements.stance.value,
        referenceNotes: elements.referenceNotes.value,
        reference: elements.reference.value,
        medium: elements.medium.value,
        era: elements.era.value,
        genre: elements.genre.value,
        tone: elements.tone.value,
        skin: elements.skin.value,
        lighting: elements.lighting.value,
        ratio: elements.ratio.value,
        versions: state.versions,
        referenceAsset: state.referenceAsset ? { ...state.referenceAsset } : null
      };
    },
    importState(saved = {}) {
      const normalized = normalizeCastingState(saved);
      ++state.assetRequest;
      ++state.versionRequest;
      releasePreviewUrl();
      versionPreviewCache.clear();
      state.referenceAsset = assetMetadata(normalized.referenceAsset);
      state.assetBusy = false;
      state.assetError = "";
      state.versionBusy = false;
      state.source = normalized.source;
      state.layout = normalized.layout;
      ["id", "role", "age", "body", "face", "hair", "costume", "traits"].forEach((key) => {
        if (normalized[key] !== undefined) elements[key].value = normalized[key];
      });
      ["wardrobe", "props", "neutralExpression", "expressionSet", "signatureAction", "stance"].forEach((key) => {
        elements[key].value = normalized[key];
      });
      elements.referenceNotes.value = normalized.referenceNotes || "";
      elements.reference.value = normalized.reference || "preserve-all";
      elements.medium.value = normalized.medium || "live";
      elements.era.value = normalized.era || "contemporary";
      elements.genre.value = normalized.genre || "realism";
      elements.skin.value = normalized.skin || "dry";
      elements.lighting.value = normalized.lighting || "soft";
      elements.ratio.value = normalized.ratio || "16:9";
      state.versions = normalized.versions;
      render();
      if (normalized.tone) elements.tone.value = normalized.tone;
      render();
      if (state.referenceAsset) void restoreReferenceAsset(state.referenceAsset);
      void restoreVersionPreviews();
    },
    getCharacterSummary: characterSummary,
    receiveProjectContext(context) {
      const prompt = String(context?.prompt || "").trim();
      if (!prompt) return false;
      if (!elements.referenceNotes.value.includes(prompt)) {
        elements.referenceNotes.value = [elements.referenceNotes.value.trim(), prompt].filter(Boolean).join("\n");
      }
      render();
      document.dispatchEvent(new Event("aigc:workspace-dirty"));
      return true;
    }
  };

  root.addEventListener("pagehide", () => {
    ++state.assetRequest;
    ++state.versionRequest;
    releasePreviewUrl();
    versionPreviewCache.clear();
  });
  root.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    if (state.referenceAsset) void restoreReferenceAsset(state.referenceAsset);
    void restoreVersionPreviews();
  });

  render();
  document.addEventListener("aigc:project-context", () => render());
})(typeof window !== "undefined" ? window : globalThis);
