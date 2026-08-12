(function initProjectScenes(root) {
  function summarizeSceneProduction(scene, isShotReady = () => false) {
    const shots = Array.isArray(scene?.shots) ? scene.shots : [];
    const shotSeconds = shots.reduce((total, shot) => total + Number(shot?.durationSeconds || 0), 0);
    const plannedSeconds = Number(scene?.estimatedDurationSeconds || 0) || shotSeconds;
    const generationReadyCount = shots.filter((shot) => isShotReady(shot) === true).length;
    const generatedCount = shots.filter((shot) => shot?.status === "generated").length;
    const lockedCount = shots.filter((shot) => shot?.status === "locked").length;
    return {
      plannedSeconds,
      shotSeconds,
      shotCount: shots.length,
      generationReadyCount,
      generatedCount,
      revisionCount: shots.filter((shot) => shot?.status === "revision").length,
      lockedCount,
      completedProductionCount: generatedCount + lockedCount,
      generatableCount: generationReadyCount,
      ready: shots.length > 0 && generationReadyCount === shots.length
    };
  }

  function collectShotProjectReferenceIds(shot) {
    const assetIds = [];
    (Array.isArray(shot?.productionResults) ? shot.productionResults : []).forEach((result) => {
      const id = typeof result?.keyframeReferenceId === "string" ? result.keyframeReferenceId.trim() : "";
      if (id && !assetIds.includes(id)) assetIds.push(id);
    });
    return assetIds;
  }

  function collectSceneProjectReferenceIds(scene) {
    return [...new Set((Array.isArray(scene?.shots) ? scene.shots : []).flatMap(collectShotProjectReferenceIds))];
  }

  function referenceUploadStillCurrent(project, scene, projectId, sceneId) {
    return project?.id === projectId && scene?.id === sceneId;
  }

  function referenceUploadCanProceed(asset) {
    return (Array.isArray(asset?.referenceAssetIds) ? asset.referenceAssetIds : []).length < 6;
  }

  const api = { summarizeSceneProduction, collectShotProjectReferenceIds, collectSceneProjectReferenceIds, referenceUploadStillCurrent, referenceUploadCanProceed };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.aigcProjectScenes = api;
  if (!root.document) return;
  const core = root.aigcWorkspaceCore;
  const storeApi = root.aigcProjectStore;
  const videoApi = root.aigcSceneVideoAdapters;
  const assistantApi = root.aigcSceneAssistantData;
  const inheritanceApi = root.aigcSceneInheritance;
  const readinessApi = root.aigcSceneReadiness;
  const assetLocksApi = root.aigcProjectAssetLocks;
  const productionQueueApi = root.aigcProjectProductionQueue;
  const screenplayQualityApi = root.aigcScreenplayAnalysisQuality;
  const productionAuditApi = root.aigcProjectProductionAudit;
  const deliveryApi = root.aigcProjectDelivery;
  const continuityApi = root.aigcProjectShotContinuity;
  const shotReadinessGateApi = root.aigcProjectShotReadiness;
  const resultsApi = root.aigcProjectShotResults;
  const resultsUiApi = root.aigcProjectShotResultsUi;
  if (!core || !storeApi) return;

  const elements = {
    screenplayStart: document.querySelector("#project-screenplay-start"),
    screenplayInput: document.querySelector("#project-screenplay-input"),
    screenplayNew: document.querySelector("#project-screenplay-new"),
    screenplayPaste: document.querySelector("#project-screenplay-paste"),
    screenplayFile: document.querySelector("#project-screenplay-file"),
    screenplayTitle: document.querySelector("#project-screenplay-title"),
    screenplayAnalyze: document.querySelector("#project-screenplay-analyze"),
    screenplayAiAnalyze: document.querySelector("#project-screenplay-ai-analyze"),
    screenplayAiEndpoint: document.querySelector("#project-ai-endpoint"),
    screenplayAiModel: document.querySelector("#project-ai-model"),
    screenplayAiKey: document.querySelector("#project-ai-key"),
    screenplayCopyTemplate: document.querySelector("#project-screenplay-copy-template"),
    screenplayExternalResult: document.querySelector("#project-screenplay-external-result"),
    screenplayImportResult: document.querySelector("#project-screenplay-import-result"),
    screenplayConfirm: document.querySelector("#project-screenplay-confirm"),
    screenplayClear: document.querySelector("#project-screenplay-clear"),
    screenplayMeta: document.querySelector("#project-screenplay-meta"),
    screenplayVersion: document.querySelector("#project-screenplay-version"),
    screenplayPreview: document.querySelector("#project-screenplay-preview"),
    screenplayDiff: document.querySelector("#project-screenplay-diff"),
    screenplayError: document.querySelector("#project-screenplay-error"),
    productionStrip: document.querySelector("#project-production-strip"),
    workbench: document.querySelector("#project-scene-workbench"),
    list: document.querySelector("#project-scene-list"),
    editor: document.querySelector("#project-scene-editor"),
    prompt: document.querySelector("#project-scene-prompt"),
    add: document.querySelector("#project-scene-add"),
    buildEight: document.querySelector("#project-scene-build-eight"),
    characterReferenceUpload: document.querySelector("#project-character-reference-upload"),
    locationReferenceUpload: document.querySelector("#project-location-reference-upload"),
    resultKeyframeUpload: document.querySelector("#project-result-keyframe-upload")
  };
  if (!elements.workbench || !elements.list || !elements.editor || !elements.prompt) return;

  let snapshot = core.getProjectSnapshot();
  let selectedSceneId = "";
  let selectedShotId = "";
  let saveTimer = null;
  let ignoreOwnSnapshot = false;
  let draftProjectId = "";
  let screenplayDraft = null;
  let screenplayAnalysis = null;
  let screenplayExternalResult = "";
  let selectedVideoTarget = "general";
  let editorExpanded = false;
  let assetLockNotice = "";
  let selectedAssetId = "";
  let directorAnalysisDraft = "";
  let directorAnalysisError = "";
  let directorAnalysisExpanded = false;
  let referencePreviewUrls = [];
  let resultFormShotId = "";
  let resultFormExpanded = false;
  let resultFormError = "";
  let resultFormNotice = "";
  let resultKeyframeFile = null;
  let resultFormDraft = null;
  let productionStep = "";
  let storyboardFilter = "all";
  const referencePreviewGuard = resultsUiApi?.createPreviewUrlGuard && root.URL?.createObjectURL && root.URL?.revokeObjectURL
    ? resultsUiApi.createPreviewUrlGuard({
      createObjectURL: (blob) => root.URL.createObjectURL(blob),
      revokeObjectURL: (url) => root.URL.revokeObjectURL(url)
    })
    : null;
  const VIDEO_TARGETS = Object.freeze({
    general: "通用视频模型",
    seedance: "Seedance 15 秒",
    "jimeng-kling": "即梦 / 可灵",
    "runway-pika": "Runway / Pika"
  });
  const PRODUCTION_STEPS = Object.freeze({
    script: { number: "01", label: "剧本", detail: "导入并确认场次" },
    scenes: { number: "02", label: "场次", detail: "拆镜头与定时长" },
    assets: { number: "03", label: "资产", detail: "锁定角色与场景参考" },
    delivery: { number: "04", label: "交付", detail: "复制单镜头提示词" },
    review: { number: "05", label: "审片", detail: "全片监视墙与自检" }
  });

  function clearReferencePreviewUrls() {
    if (referencePreviewGuard) {
      referencePreviewGuard.invalidate();
      return;
    }
    referencePreviewUrls.forEach((url) => root.URL.revokeObjectURL(url));
    referencePreviewUrls = [];
  }

  async function refreshReferencePreviews() {
    const request = referencePreviewGuard ? referencePreviewGuard.beginRequest() : 0;
    if (!referencePreviewGuard) clearReferencePreviewUrls();
    const referenceStore = root.aigcProjectReferenceStore;
    if (!referenceStore?.get) return;
    const previews = [...document.querySelectorAll("#project-scene-editor [data-project-reference-preview], #project-scene-editor [data-project-result-preview], #project-production-strip [data-project-reference-preview], #project-production-strip [data-project-result-preview]")];
    await Promise.all(previews.map(async (preview) => {
      const id = preview.dataset.projectReferencePreview || preview.dataset.projectResultPreview;
      const record = await referenceStore.get(id).catch(() => null);
      if (!record?.blob) { preview.closest("[data-project-reference-container], .project-scene-asset-reference")?.setAttribute("data-missing", "true"); return; }
      const url = referencePreviewGuard
        ? referencePreviewGuard.createUrlForCurrentRequest(request, record.blob)
        : root.URL.createObjectURL(record.blob);
      if (!url) return;
      if (!referencePreviewGuard) referencePreviewUrls.push(url);
      preview.src = url;
      preview.hidden = false;
    }));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function activeProject() {
    return snapshot.projects.find((item) => item.id === snapshot.activeProjectId) || snapshot.projects[0];
  }

  function scenes() {
    const project = activeProject();
    if (!project) return [];
    if (!Array.isArray(project.scenes)) project.scenes = [];
    return project.scenes;
  }

  function currentProductionStep() {
    if (Object.prototype.hasOwnProperty.call(PRODUCTION_STEPS, productionStep)) return productionStep;
    return activeProject()?.screenplay?.rawText ? "scenes" : "script";
  }

  function newScreenplayDraft() {
    return { title: "未命名剧本", sourceType: "new", sourceFileName: "", rawText: "" };
  }

  function screenplayDraftFrom(project) {
    const screenplay = project?.screenplay || {};
    return {
      title: String(screenplay.title || "未命名剧本").slice(0, 100),
      sourceType: ["new", "paste", "file"].includes(screenplay.sourceType) ? screenplay.sourceType : "paste",
      sourceFileName: String(screenplay.sourceFileName || "").slice(0, 180),
      rawText: String(screenplay.rawText || "").slice(0, 60000)
    };
  }

  function ensureScreenplayDraft() {
    const project = activeProject();
    if (!screenplayDraft || draftProjectId !== project?.id) {
      draftProjectId = project?.id || "";
      screenplayDraft = screenplayDraftFrom(project);
      screenplayAnalysis = null;
    }
    return screenplayDraft;
  }

  function screenplayWordCount(rawText) {
    return String(rawText || "").replace(/\s/g, "").length;
  }

  function screenplayUpdatedAt(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "尚未保存";
    return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  function screenplayDecisionLabel(scene) {
    if (!scene) return "未命名场次";
    return `场 ${String(scene.number || 0).padStart(2, "0")} · ${scene.title || scene.setting || "未命名场次"}`;
  }

  function screenplayActiveDecisionCount(analysis = screenplayAnalysis) {
    return Array.isArray(analysis?.decisions)
      ? analysis.decisions.filter((decision) => decision.action === "add" || decision.action === "update-story").length
      : 0;
  }

  function formatScreenplayDuration(seconds) {
    const value = Math.max(0, Number(seconds) || 0);
    if (!value) return "模型未估算";
    const minutes = Math.floor(value / 60);
    const remainder = Math.round(value % 60);
    return minutes ? `${minutes} 分${remainder ? ` ${remainder} 秒` : ""}` : `${remainder} 秒`;
  }

  function screenplayStructureAssessment(analysis) {
    const estimate = analysis?.directorEstimate;
    if (!estimate) return "";
    const quality = screenplayQualityApi?.assess
      ? screenplayQualityApi.assess(activeProject(), screenplayDraft?.rawText || "", analysis)
      : { sceneCount: analysis.scenes?.length || 0, shotCount: (analysis.scenes || []).reduce((total, scene) => total + (scene.shots?.length || 0), 0), reasons: [], passed: true };
    const warning = estimate.densityWarning || quality.reasons.join(" ") || "场镜密度与当前剧本长度基本匹配，可逐场审核。";
    const retry = quality.passed ? "" : `<button type="button" data-scene-action="copy-screenplay-reanalysis">复制返工指令</button>`;
    return `<section class="project-screenplay-structure-assessment" data-density-low="${!quality.passed}" aria-label="导演结构评估"><header><span>DIRECTOR STRUCTURE REVIEW</span><strong>${quality.passed ? "导演结构评估通过" : "建议先返工，再写入正式分镜"}</strong><small>${escapeHtml(estimate.structureRationale || "先核对预计片长与场镜密度，再决定是否写入正式分镜。")}</small></header><div><article><b>预计片长</b><strong>${escapeHtml(formatScreenplayDuration(estimate.estimatedDurationSeconds))}</strong></article><article><b>建议场次</b><strong>${estimate.recommendedSceneCount || "未提供"}</strong></article><article><b>建议镜头</b><strong>${estimate.recommendedShotCount || "未提供"}</strong></article><article><b>本次草稿</b><strong>${quality.sceneCount} 场 / ${quality.shotCount} 镜</strong></article></div><p>${escapeHtml(warning)}</p>${retry}</section>`;
  }

  function renderScreenplayDiff() {
    const container = elements.screenplayDiff;
    if (!container) return;
    const analysis = screenplayAnalysis;
    if (!analysis || !Array.isArray(analysis.decisions)) {
      container.hidden = true;
      container.innerHTML = "";
      return;
    }
    const proposedById = new Map((analysis.scenes || []).map((scene) => [scene.id, scene]));
    const existingById = new Map(scenes().map((scene) => [scene.id, scene]));
    const groups = [
      ["update", "待确认更新", "只更新剧本内容，锁定资产、镜头、提示词与制作状态均不会被覆盖。"],
      ["add", "拟新增场次", "只会新增你选择保留的场次，不会删除任何现有场次。"],
      ["retained", "保留当前制作场", "这些场次未变化，或新剧本中没有出现；默认完整保留。"]
    ];
    const rowsFor = (kind) => analysis.decisions.filter((decision) => decision.kind === kind).map((decision) => {
      const proposed = proposedById.get(decision.proposedSceneId);
      const existing = existingById.get(decision.existingSceneId);
      const label = screenplayDecisionLabel(proposed || existing);
      const detail = decision.kind === "update"
        ? `当前：${screenplayDecisionLabel(existing)}${decision.protected ? ` · 已保护：${decision.reasons.join("、")}` : " · 可仅更新故事字段"}`
        : decision.kind === "add"
          ? "当前项目中尚无对应场次"
          : decision.reasons.join("、");
      const controls = decision.kind === "add"
        ? `<select data-screenplay-action="update-analysis-decision" data-proposed-scene-id="${escapeHtml(decision.proposedSceneId)}" data-existing-scene-id=""><option value="add"${decision.action === "add" ? " selected" : ""}>新增为制作场</option><option value="skip-proposed"${decision.action === "skip-proposed" ? " selected" : ""}>本次不新增</option></select>`
        : decision.kind === "update"
          ? `<select data-screenplay-action="update-analysis-decision" data-proposed-scene-id="${escapeHtml(decision.proposedSceneId)}" data-existing-scene-id="${escapeHtml(decision.existingSceneId)}"><option value="update-story"${decision.action === "update-story" ? " selected" : ""}>仅更新剧本字段</option><option value="keep-existing"${decision.action === "keep-existing" ? " selected" : ""}>保留当前制作场</option></select>`
          : `<span class="project-screenplay-diff-keep">保留当前制作场</span>`;
      return `<article class="project-screenplay-diff-row" data-kind="${escapeHtml(decision.kind)}"><div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(detail)}</small></div>${controls}</article>`;
    }).join("");
    const sections = groups.map(([kind, title, helper], index) => {
      const rows = rowsFor(kind);
      if (!rows) return "";
      return `<details${index === 0 ? " open" : ""}><summary><span>${escapeHtml(title)}</span><b>${analysis.decisions.filter((decision) => decision.kind === kind).length} 场</b></summary><p>${escapeHtml(helper)}</p><div>${rows}</div></details>`;
    }).join("");
    const summary = analysis.summary || {};
    container.hidden = false;
    container.innerHTML = `${screenplayStructureAssessment(analysis)}<header><div><span>SAFE REANALYSIS</span><strong>逐场确认后再写入正式分镜</strong><small>新增 ${summary.added || 0} · 待更新 ${summary.updated || 0} · 保留 ${summary.retained || 0}${summary.protected ? ` · 已保护 ${summary.protected}` : ""}</small></div><b>${screenplayActiveDecisionCount(analysis)} 项将应用</b></header>${sections}`;
  }

  function renderScreenplayStart() {
    const project = activeProject();
    const screenplay = project?.screenplay || {};
    const hasScenes = scenes().length > 0;
    const draft = ensureScreenplayDraft();
    elements.screenplayInput.value = draft.rawText;
    elements.screenplayTitle.value = draft.title;
    if (elements.screenplayExternalResult) elements.screenplayExternalResult.value = screenplayExternalResult;
    elements.screenplayMeta.textContent = screenplay.rawText
      ? `已保存：${screenplay.title || "未命名剧本"}${screenplay.sourceFileName ? ` · 文件名：${screenplay.sourceFileName}` : ""} · ${screenplayWordCount(screenplay.rawText)} 字 · 更新于 ${screenplayUpdatedAt(screenplay.updatedAt)}`
      : hasScenes ? `当前已有 ${scenes().length} 场手动场次；剧本草稿尚未保存。` : "未导入剧本。草稿不会影响已保存的场次。";
    elements.screenplayVersion.textContent = `${Array.isArray(screenplay.versions) ? screenplay.versions.length : 0} 个历史版本`;
    elements.screenplayClear.hidden = !screenplay.rawText;
    elements.screenplayPreview.textContent = screenplayAnalysis
      ? screenplayAnalysis.analysisMode === "ai" || screenplayAnalysis.analysisMode === "external"
        ? `AI 已提出 ${screenplayAnalysis.summary.total} 场、共 ${screenplayAnalysis.scenes.reduce((sum, scene) => sum + scene.shots.length, 0)} 镜的制作草稿；请逐场确认后再写入。`
        : `本地格式识别得到 ${screenplayAnalysis.summary.total} 段草稿，仅用于整理原文；它不等于导演分析。`
      : "";
    const activeDecisions = screenplayActiveDecisionCount();
    elements.screenplayConfirm.disabled = !screenplayAnalysis || !activeDecisions;
    elements.screenplayConfirm.textContent = screenplayAnalysis
      ? activeDecisions ? `确认应用 ${activeDecisions} 项剧本更新` : "没有待应用的剧本更新"
      : "确认写入正式分镜";
    renderScreenplayDiff();
    elements.workbench.hidden = !hasScenes;
  }

  function setScreenplayError(message = "") {
    elements.screenplayError.textContent = message;
  }

  function analyzeScreenplay() {
    const rawText = String(screenplayDraft?.rawText || "").trim();
    if (!rawText) {
      setScreenplayError("请先输入或导入剧本，再分析场次。");
      return;
    }
    setScreenplayError("");
    screenplayAnalysis = { ...core.previewProjectScreenplay(rawText), analysisMode: "local" };
    renderScreenplayStart();
  }

  async function analyzeScreenplayWithAi() {
    const rawText = String(screenplayDraft?.rawText || "").trim();
    if (!rawText) { setScreenplayError("请先输入或导入剧本，再进行 AI 导演分析。"); return; }
    const api = root.aigcScreenplayAiAnalysis;
    if (!api?.request) { setScreenplayError("AI 导演分析模块未加载。请刷新页面后重试。"); return; }
    const button = elements.screenplayAiAnalyze;
    const label = button?.textContent;
    if (button) { button.disabled = true; button.textContent = "正在分析剧本…"; }
    setScreenplayError("");
    try {
      const response = await api.request({ endpoint: elements.screenplayAiEndpoint?.value, model: elements.screenplayAiModel?.value, apiKey: elements.screenplayAiKey?.value }, activeProject(), rawText);
      const normalizedScenes = storeApi.normalizeProjectScenes(Array.isArray(response) ? response : response?.scenes);
      screenplayAnalysis = { ...storeApi.previewScreenplayReanalysis(activeProject(), rawText, normalizedScenes), source: { ...screenplayDraft, rawText }, analysisMode: "ai", directorEstimate: Array.isArray(response) ? null : response?.analysis || null };
      renderScreenplayStart();
    } catch (error) { setScreenplayError(error?.message || "AI 导演分析失败。"); }
    finally { if (button) { button.disabled = false; button.textContent = label || "AI 导演分析并拆分镜头"; } }
  }

  async function copyScreenplayAnalysisTemplate() {
    const rawText = String(screenplayDraft?.rawText || "").trim();
    if (!rawText) { setScreenplayError("请先输入或导入剧本，再复制导演拆解模板。"); return; }
    const api = root.aigcScreenplayAiAnalysis;
    if (!api?.buildPrompt) { setScreenplayError("剧本拆解模板未加载。请刷新页面后重试。"); return; }
    await copyText(api.buildPrompt(activeProject(), rawText));
    const button = elements.screenplayCopyTemplate;
    if (button) {
      button.textContent = "模板已复制";
      root.setTimeout(() => { button.textContent = "复制导演拆解模板"; }, 1400);
    }
  }

  async function copyScreenplayReanalysisInstruction() {
    const quality = screenplayQualityApi?.assess
      ? screenplayQualityApi.assess(activeProject(), screenplayDraft?.rawText || "", screenplayAnalysis || {})
      : null;
    if (!quality || quality.passed || !screenplayQualityApi?.reanalysisInstruction) return;
    await copyText(screenplayQualityApi.reanalysisInstruction(quality));
    const button = elements.screenplayDiff?.querySelector('[data-scene-action="copy-screenplay-reanalysis"]');
    if (button) { button.textContent = "返工指令已复制"; root.setTimeout(() => { button.textContent = "复制返工指令"; }, 1400); }
  }

  function importExternalScreenplayAnalysis() {
    const rawText = String(screenplayDraft?.rawText || "").trim();
    const result = String(screenplayExternalResult || "").trim();
    if (!rawText) { setScreenplayError("请先输入或导入剧本，再读取模型拆解结果。"); return; }
    if (!result) { setScreenplayError("请粘贴文本模型返回的 scenes JSON。"); return; }
    const api = root.aigcScreenplayAiAnalysis;
    if (!api?.parse) { setScreenplayError("剧本拆解解析器未加载。请刷新页面后重试。"); return; }
    try {
      const normalizedScenes = storeApi.normalizeProjectScenes(api.parse(result));
      screenplayAnalysis = {
        ...storeApi.previewScreenplayReanalysis(activeProject(), rawText, normalizedScenes),
        source: { ...screenplayDraft, rawText },
        analysisMode: "external"
      };
      setScreenplayError("");
      renderScreenplayStart();
    } catch (error) {
      setScreenplayError(error?.message || "无法读取这份模型拆解结果。请确认它含有 scenes JSON。");
    }
  }

  function confirmScreenplayAnalysis() {
    if (!screenplayAnalysis || !screenplayDraft) return;
    setScreenplayError("");
    ignoreOwnSnapshot = true;
    const project = core.applyProjectScreenplay(screenplayAnalysis, screenplayDraft);
    snapshot = core.getProjectSnapshot();
    draftProjectId = project?.id || "";
    screenplayDraft = screenplayDraftFrom(project);
    screenplayAnalysis = null;
    const firstScene = project.scenes?.[0];
    selectedSceneId = firstScene?.id || "";
    selectedShotId = firstScene?.shots?.[0]?.id || "";
    productionStep = "scenes";
    renderAll();
  }

  function updateScreenplayDraft(fields, { render = false } = {}) {
    const draft = ensureScreenplayDraft();
    Object.assign(draft, fields);
    screenplayAnalysis = null;
    elements.screenplayPreview.textContent = "";
    elements.screenplayConfirm.disabled = true;
    elements.screenplayConfirm.textContent = "确认写入正式分镜";
    renderScreenplayDiff();
    if (render) renderScreenplayStart();
  }

  function updateScreenplayAnalysisDecision(target) {
    if (!screenplayAnalysis || !target) return;
    const proposedSceneId = String(target.dataset.proposedSceneId || "");
    const existingSceneId = String(target.dataset.existingSceneId || "");
    const decision = screenplayAnalysis.decisions.find((item) => item.proposedSceneId === proposedSceneId && item.existingSceneId === existingSceneId);
    if (!decision) return;
    const requested = String(target.value || "");
    const allowed = decision.kind === "add"
      ? ["add", "skip-proposed"]
      : decision.kind === "update" ? ["update-story", "keep-existing"] : ["keep-existing"];
    if (!allowed.includes(requested)) return;
    decision.action = requested;
    renderScreenplayStart();
  }

  async function importScreenplayFile(file) {
    if (!file) return;
    const reader = root.aigcScreenplayImport?.readScreenplayFile;
    if (!reader) {
      setScreenplayError("本地剧本导入暂不可用。");
      return;
    }
    setScreenplayError("");
    try {
      const source = await reader(file);
      updateScreenplayDraft(source, { render: true });
      setScreenplayError(`已读取 ${source.sourceFileName}，等待分析。`);
    } catch (error) {
      setScreenplayError(error?.message || "剧本文件读取失败。");
    } finally {
      elements.screenplayFile.value = "";
    }
  }

  function selectedScene() {
    const list = scenes();
    if (!list.length) return null;
    if (!list.some((scene) => scene.id === selectedSceneId)) selectedSceneId = list[0].id;
    return list.find((scene) => scene.id === selectedSceneId) || list[0];
  }

  function selectedShot(scene = selectedScene()) {
    if (!scene?.shots?.length) return null;
    if (!scene.shots.some((shot) => shot.id === selectedShotId)) selectedShotId = scene.shots[0].id;
    return scene.shots.find((shot) => shot.id === selectedShotId) || scene.shots[0];
  }

  function targetModelFor(shot) {
    return Object.prototype.hasOwnProperty.call(VIDEO_TARGETS, shot?.targetModel) ? shot.targetModel : "general";
  }

  function newId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function newShot(index = 1) {
    return {
      id: newId("shot"),
      durationSeconds: 15,
      deliveryMode: "seedance15",
      framing: index === 1 ? "中近景" : "",
      movement: index === 1 ? "缓慢推进" : "",
      performance: "",
      sound: "不要背景音乐，只保留环境声与多层空间氛围。",
      status: "planned",
      promptCard: {},
      negativeConstraints: []
    };
  }

  function newScene(index = scenes().length + 1, title = "") {
    return {
      id: newId("scene"),
      number: index,
      title: title || `第 ${String(index).padStart(2, "0")} 场`,
      setting: "",
      time: "",
      storyBeat: "",
      sourceExcerpt: "",
      characters: [],
      emotion: "",
      action: "",
      visualOverride: { colorDirection: "", lightingDirection: "", cameraDirection: "" },
      estimatedDurationSeconds: 0,
      shots: [newShot()],
      status: "draft"
    };
  }

  function addScene(title = "") {
    const next = newScene(scenes().length + 1, title);
    scenes().push(next);
    selectedSceneId = next.id;
    selectedShotId = next.shots[0].id;
    persistScenes();
    renderAll();
  }

  function buildEightScenes() {
    const structure = ["开场建立", "日常裂缝", "触发事件", "进入未知", "第一次对抗", "真相逼近", "临界选择", "余波与收束"];
    const offset = scenes().length;
    const created = structure.map((title, index) => newScene(offset + index + 1, title));
    scenes().push(...created);
    selectedSceneId = created[0].id;
    selectedShotId = created[0].shots[0].id;
    persistScenes();
    renderAll();
  }

  function persistScenes() {
    root.clearTimeout(saveTimer);
    ignoreOwnSnapshot = true;
    core.patchProjectScenes(scenes());
    // The project subscription intentionally ignores this synchronous write; refresh our local snapshot here.
    snapshot = core.getProjectSnapshot();
  }

  function cleanupProjectReferenceAssets(assetIds) {
    if (typeof core.cleanupProjectReferenceAssetIfUnreferenced !== "function") return;
    [...new Set((Array.isArray(assetIds) ? assetIds : []).filter(Boolean))].forEach((assetId) => {
      void core.cleanupProjectReferenceAssetIfUnreferenced(assetId);
    });
  }

  function assetLockReferenceIds(assetLocks) {
    return (Array.isArray(assetLocks) ? assetLocks : []).flatMap((asset) =>
      Array.isArray(asset?.referenceAssetIds) ? asset.referenceAssetIds : []);
  }

  function schedulePersist() {
    root.clearTimeout(saveTimer);
    saveTimer = root.setTimeout(persistScenes, 520);
  }

  function sceneLabel(scene) {
    return scene.title || `第 ${String(scene.number).padStart(2, "0")} 场`;
  }

  function sceneShotLabel(scene, shotOrIndex) {
    const sceneNumber = String(scene?.number || 1).padStart(2, "0");
    const index = typeof shotOrIndex === "number"
      ? shotOrIndex
      : Math.max(0, (scene?.shots || []).findIndex((item) => item.id === shotOrIndex?.id));
    return `场 ${sceneNumber} · 镜 ${String(index + 1).padStart(2, "0")}`;
  }

  const SCENE_STILLS = [
    "assets/poster-templates/film-character-world.jpg",
    "assets/poster-templates/film-negative-space.jpg",
    "assets/poster-templates/film-dual-conflict.jpg",
    "assets/poster-templates/film-object-symbol.jpg",
    "assets/poster-templates/film-portrait-close.jpg",
    "assets/poster-templates/film-split-world.jpg",
    "assets/poster-templates/film-double-exposure.jpg",
    "assets/poster-templates/film-diagonal-action.jpg"
  ];
  const SHOT_STATUS_LABELS = Object.freeze({ planned: "待生图", keyframe: "关键帧完成", generated: "视频已生成", revision: "需返工", locked: "已锁定" });

  function shotStatusLabel(shot) {
    return SHOT_STATUS_LABELS[shot?.status] || SHOT_STATUS_LABELS.planned;
  }

  function newResultFormDraft() {
    return { versionLabel: "", resultUrl: "", platform: "", modelVersion: "", seed: "", notes: "", revisionReason: "", status: "generated" };
  }

  function productionResultsFor(shot) {
    const records = resultsApi?.normalizeProductionResults
      ? resultsApi.normalizeProductionResults(shot?.productionResults)
      : Array.isArray(shot?.productionResults) ? shot.productionResults : [];
    return records;
  }

  function resultCreatedLabel(value) {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime())
      ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date)
      : "未记录时间";
  }

  function renderShotProductionResults(scene, shot) {
    const records = productionResultsFor(shot);
    const expanded = resultFormExpanded && resultFormShotId === shot?.id;
    const draft = resultFormDraft || newResultFormDraft();
    const history = records.length
      ? records.map((record, index) => {
        const label = record.versionLabel || `V${index + 1}`;
        const resultState = resultsApi?.resultStatusFor ? resultsApi.resultStatusFor(record) : "planned";
        const metadata = [record.platform, record.modelVersion, record.seed ? `Seed ${record.seed}` : ""].filter(Boolean).join(" · ");
        return `<article class="project-shot-result-card" data-selected="${record.selected === true}" data-project-reference-container><div class="project-shot-result-thumb">${record.keyframeReferenceId ? `<img data-project-result-preview="${escapeHtml(record.keyframeReferenceId)}" alt="${escapeHtml(`${label} 关键帧`)}" hidden>` : "<span>无关键帧</span>"}</div><div class="project-shot-result-copy"><header><strong>${escapeHtml(label)}</strong><span>${escapeHtml(shotStatusLabel({ status: resultState }))}</span></header><small>${escapeHtml(metadata || "未填写平台或模型")}</small>${record.notes ? `<p>${escapeHtml(record.notes)}</p>` : ""}${record.revisionReason ? `<em>返工原因：${escapeHtml(record.revisionReason)}</em>` : ""}<time>${escapeHtml(resultCreatedLabel(record.createdAt))}</time></div><footer>${record.resultUrl ? `<button type="button" data-scene-action="open-result-url" data-result-url="${escapeHtml(record.resultUrl)}">打开结果</button>` : ""}${record.selected ? "<b>当前版本</b>" : `<button type="button" data-scene-action="select-result" data-result-id="${escapeHtml(record.id)}">设为当前</button><button type="button" data-scene-action="delete-result" data-result-id="${escapeHtml(record.id)}">删除</button>`}</footer></article>`;
      }).join("")
      : "<p class=\"project-shot-results-empty\">当前镜头尚未登记生成结果。</p>";
    const form = expanded ? `<form class="project-shot-result-form" novalidate><header><strong>登记生成结果</strong><button type="button" data-scene-action="cancel-result-form">收起</button></header><div class="project-shot-result-fields"><label><span>版本</span><input data-result-field="versionLabel" maxlength="40" value="${escapeHtml(draft.versionLabel)}" placeholder="例如：V2"></label><label><span>目标状态</span><select data-result-field="status">${Object.entries(SHOT_STATUS_LABELS).map(([value, label]) => `<option value="${value}"${draft.status === value ? " selected" : ""}>${label}</option>`).join("")}</select></label><label class="wide"><span>外部结果 URL</span><input data-result-field="resultUrl" type="url" inputmode="url" maxlength="2000" value="${escapeHtml(draft.resultUrl)}" placeholder="https://example.com/result"></label><label><span>平台</span><input data-result-field="platform" maxlength="60" value="${escapeHtml(draft.platform)}" placeholder="例如：Seedance"></label><label><span>模型版本</span><input data-result-field="modelVersion" maxlength="100" value="${escapeHtml(draft.modelVersion)}" placeholder="例如：Seedance 1.5 Pro"></label><label><span>Seed</span><input data-result-field="seed" maxlength="120" value="${escapeHtml(draft.seed)}" placeholder="例如：42"></label><label class="wide project-shot-result-keyframe"><span>关键帧</span><div><button type="button" data-scene-action="choose-result-keyframe">选择图片</button><small>${escapeHtml(resultKeyframeFile?.name || "未选择图片")}</small></div></label><label class="wide"><span>备注</span><textarea data-result-field="notes" rows="2" maxlength="500" placeholder="生成质量、人工检查结论等">${escapeHtml(draft.notes)}</textarea></label><label class="wide"><span>返工原因</span><textarea data-result-field="revisionReason" rows="2" maxlength="500" placeholder="需要继续调整时记录原因">${escapeHtml(draft.revisionReason)}</textarea></label></div>${resultFormError ? `<p class="project-shot-result-form-error" role="alert">${escapeHtml(resultFormError)}</p>` : ""}<footer><span>请至少提供关键帧图片或 HTTPS 外部结果地址。</span><button type="button" data-scene-action="save-result">保存结果</button></footer></form>` : "";
    return `<section class="project-shot-results" aria-label="镜头生成回填"><header><div><span>SHOT RESULTS</span><strong>镜头生成回填</strong><small>${records.length ? `已登记 ${records.length} 个版本 · 当前镜头：${shotStatusLabel(shot)}` : "登记关键帧和外部生成结果，保留可追溯版本。"}</small></div><button type="button" data-scene-action="open-result-form">${expanded ? "继续登记" : "登记生成结果"}</button></header>${resultFormNotice ? `<p class="project-shot-results-notice">${escapeHtml(resultFormNotice)}</p>` : ""}${form}<div class="project-shot-results-history">${history}</div></section>`;
  }

  function sceneDuration(scene) {
    return (scene?.shots || []).reduce((total, item) => total + Number(item?.durationSeconds || 0), 0);
  }

  function sceneProductionSummary(scene) {
    return summarizeSceneProduction(scene, (shot) => shotReadiness(scene, shot).ready);
  }

  function formatProductionSeconds(value) {
    const seconds = Math.max(0, Number(value || 0));
    if (!seconds) return "待定";
    if (seconds < 60) return `${seconds} 秒`;
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return remainder ? `${minutes} 分 ${remainder} 秒` : `${minutes} 分钟`;
  }

  function productionMeta(project) {
    const meta = project?.productionMeta || {};
    const seconds = Number(meta.estimatedDurationSeconds || 0);
    const duration = seconds > 0 ? (seconds >= 60 ? `${Math.round(seconds / 60)} 分钟` : `${seconds} 秒`) : "时长待定";
    return [
      ["项目", project?.name || "未命名电影项目"],
      ["画幅", meta.aspectRatio || "16:9"],
      ["片长", duration],
      ["目标", project?.creativeBrief?.targetModel || "通用视频模型"]
    ];
  }

  function sceneReadiness(scene) {
    return readinessApi?.assessSceneReadiness
      ? readinessApi.assessSceneReadiness(scene, activeProject())
      : { ready: false, complete: 0, total: 5, missing: ["叙事", "人物", "地点", "影调", "镜头"], items: [] };
  }

  function shotReadiness(scene, shot) {
    return readinessApi?.assessShotReadiness
      ? readinessApi.assessShotReadiness(activeProject(), scene, shot)
      : { ready: false, complete: 0, total: 7, missing: ["叙事", "主体/人物", "地点", "可见动作", "影调", "景别与运镜", "声音与限制"], items: [] };
  }

  function shotReadinessGate(scene, shot) {
    return shotReadinessGateApi?.buildShotReadinessGate
      ? shotReadinessGateApi.buildShotReadinessGate(activeProject(), scene, shot)
      : { ready: false, completion: { complete: 0, total: 0 }, groups: [], assets: [], actions: [] };
  }

  function shotProductionCard(scene, shot) {
    return shotReadinessGateApi?.buildShotProductionCard
      ? shotReadinessGateApi.buildShotProductionCard(activeProject(), scene, shot)
      : { ready: false, lockable: false, identity: { sceneNumber: 1, shotNumber: 1, durationSeconds: 0, deliveryMode: "seedance15" }, completion: { complete: 0, total: 6 }, checks: [], nextAction: null, formalVersionCount: 0, selectedResult: null };
  }

  function shotContinuity(scene, shot) {
    return continuityApi?.buildShotContinuity
      ? continuityApi.buildShotContinuity(activeProject(), scene, shot)
      : { status: "first", hasPredecessor: false, predecessor: null, blockers: [], warnings: [], issues: [] };
  }

  function renderShotContinuity(scene, shot) {
    const continuity = shotContinuity(scene, shot);
    const previous = continuity.predecessor;
    const status = continuity.status || "first";
    const title = status === "blocked"
      ? `连续性有 ${continuity.blockers.length} 项阻塞`
      : status === "warning"
        ? `连续性有 ${continuity.warnings.length} 项待确认`
        : status === "ready"
          ? "与上一镜连续"
          : "首镜，无上一镜需比对";
    const detail = previous
      ? `对比：场 ${String(previous.sceneNumber || 1).padStart(2, "0")} · 镜 ${String(previous.shotNumber || 1).padStart(2, "0")}｜${previous.sceneTitle || "未命名场次"}`
      : "从本镜开始建立角色、场景与道具连续性。";
    const issues = (continuity.issues || []).slice(0, 3);
    const issueList = issues.length
      ? `<div>${issues.map((issue) => `<article data-level="${escapeHtml(issue.level)}"><span>${issue.level === "blocker" ? "需修正" : "请确认"}</span><strong>${escapeHtml(issue.label)}</strong><small>${escapeHtml(issue.detail)}</small>${issue.field ? `<button type="button" data-scene-action="focus-continuity-field" data-continuity-field="${escapeHtml(issue.field)}">修正本镜</button>` : ""}</article>`).join("")}</div>`
      : "";
    const predecessorButton = previous
      ? `<button type="button" data-scene-action="select-continuity-predecessor" data-scene-id="${escapeHtml(predecessorSceneId(activeProject(), previous.sceneNumber))}" data-shot-number="${escapeHtml(String(previous.shotNumber || 1))}">查看上一镜</button>`
      : "";
    return `<section class="project-shot-continuity" data-status="${escapeHtml(status)}" aria-label="镜头连续性核对"><header><div><span>SHOT CONTINUITY</span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small></div>${predecessorButton}</header>${issueList}</section>`;
  }

  function predecessorSceneId(project, sceneNumber) {
    return (Array.isArray(project?.scenes) ? project.scenes : []).find((item) => Number(item?.number || 0) === Number(sceneNumber || 0))?.id || "";
  }

  function renderShotProductionCard(scene, shot) {
    const production = shotProductionCard(scene, shot);
    const continuity = shotContinuity(scene, shot);
    const identity = production.identity || {};
    const deliveryLabel = storeApi.shotDeliveryLabel?.(identity.deliveryMode) || "15 秒运镜";
    const stateLabel = continuity.status === "blocked" ? "需先处理连续性阻塞" : production.lockable ? "镜头可锁定交付" : production.ready ? "正式提示词已具备，可开始生成" : "当前镜头待补齐";
    const stateDetail = continuity.status === "blocked"
      ? "角色母版与上一镜不一致；请确认后再锁定交付。"
      : production.lockable
      ? "资产母版、正式提示词与当前生成结果已齐备。"
      : production.ready
        ? "生成完成后登记关键帧或结果链接，即可沉淀为锁定镜头。"
        : `已完成 ${production.completion?.complete || 0}/${production.completion?.total || 6} 项关键条件。`;
    const next = production.nextAction;
    const nextButton = next
      ? `<button type="button" data-scene-action="open-shot-production-next" data-next-action="${escapeHtml(next.id)}"${next.assetId ? ` data-asset-id="${escapeHtml(next.assetId)}"` : ""}>${escapeHtml(next.label || "补齐下一项")}</button>`
      : "";
    return `<section class="project-shot-production-card" data-ready="${production.ready}" data-lockable="${production.lockable}" data-continuity-status="${escapeHtml(continuity.status || "first")}" aria-label="当前镜头生产卡"><header><div><span>SHOT PRODUCTION CARD</span><strong>场 ${String(identity.sceneNumber || 1).padStart(2, "0")} · 镜 ${String(identity.shotNumber || 1).padStart(2, "0")}</strong><small>${escapeHtml(deliveryLabel)} · ${Number(identity.durationSeconds || 0)} 秒 · ${escapeHtml(shotStatusLabel(shot))}</small></div><aside><b>${escapeHtml(stateLabel)}</b><small>${escapeHtml(stateDetail)}</small></aside></header><div class="project-shot-production-checks">${(production.checks || []).map((check) => `<article data-ready="${check.ready}"><span>${check.ready ? "已就绪" : "待补齐"}</span><strong>${escapeHtml(check.label)}</strong><small>${escapeHtml(check.detail)}</small></article>`).join("")}</div>${renderShotContinuity(scene, shot)}<footer><small>${production.formalVersionCount ? `正式版本 ${production.formalVersionCount} 个` : "尚未保存正式提示词"}${production.selectedResult ? " · 已登记当前生成结果" : " · 尚未登记当前生成结果"}</small><div class="project-shot-model-actions"><button type="button" data-scene-action="copy-shot-model-package" data-package-target="seedance">复制 Seedance 交付包</button><button type="button" data-scene-action="download-shot-model-package" data-package-target="general">下载通用交付包</button>${nextButton}</div></footer></section>`;
  }

  function renderShotGenerationGate(scene, shot) {
    const gate = shotReadinessGate(scene, shot);
    const groups = gate.groups.map((group) => `<section data-gate-group="${escapeHtml(group.id)}"><header><span>${escapeHtml(group.id.toUpperCase())}</span><strong>${escapeHtml(group.label)}</strong></header><div>${group.items.length ? group.items.map((item) => `<span data-ready="${item.ready}"><b>${escapeHtml(item.label)}</b><small>${escapeHtml(item.source)}</small></span>`).join("") : "<small>本组暂无检查项</small>"}</div></section>`).join("");
    const assets = gate.assets.length
      ? gate.assets.map((asset) => `<article data-reference-ready="${asset.referenceCount > 0}" data-master-ready="${asset.masterStatus === "locked"}"><span><b>${escapeHtml(asset.id)}</b><strong>${escapeHtml(asset.name)}</strong><small>${escapeHtml(asset.kind === "character" ? "角色母版" : asset.kind === "location" ? "场景母版" : "道具母版")}</small></span>${asset.requiresReference ? `<em>${asset.referenceCount ? `参考图 ${asset.referenceCount} 张` : "建议补参考图"} · ${escapeHtml(assetLocksApi?.MASTER_STATUSES?.[asset.masterStatus] || "待生成母版")}</em>` : "<em>文字锁定</em>"}${asset.referenceRule ? `<small class="project-shot-generation-gate-rule">${escapeHtml(asset.referenceRule)}</small>` : ""}</article>`).join("")
      : "<p>当前镜头尚未锁定连续性资产；完成角色或场景母版后，会在这里显示参考状态。</p>";
    const actions = gate.actions.length
      ? gate.actions.map((action) => `<button type="button" data-scene-action="${escapeHtml(action.id)}"${action.assetId ? ` data-asset-id="${escapeHtml(action.assetId)}"` : ""}>${escapeHtml(action.label)}</button>`).join("")
      : `<span>${gate.ready ? "当前镜头的基础生成条件已齐备。" : "请先补齐本镜头的生成条件。"}</span>`;
    return `<section class="project-shot-generation-gate" data-ready="${gate.ready}" aria-label="镜头生成准备清单"><header><span>SHOT GENERATION GATE</span><strong>${gate.ready ? "当前镜头可以生成" : "当前镜头仍需补齐"}</strong><small>${gate.completion.complete}/${gate.completion.total} 项基础条件齐备；参考图状态用于保障跨镜头连续性。</small></header><div class="project-shot-generation-gate-groups">${groups}</div><div class="project-shot-generation-gate-assets"><strong>锁定资产与参考</strong><div>${assets}</div></div><footer class="project-shot-generation-gate-actions">${actions}</footer></section>`;
  }

  function readinessLabel(readiness) {
    return readiness.ready ? "可生成" : `待补 ${readiness.missing.length} 项`;
  }

  function lockedAssetsForScene(scene) {
    return assetLocksApi?.assetsForScene
      ? assetLocksApi.assetsForScene(activeProject(), scene)
      : { assets: [], prompt: "" };
  }

  function assetLockPreviewForScene(scene) {
    return assetLocksApi?.assetLockPreview
      ? assetLocksApi.assetLockPreview(activeProject(), scene)
      : { candidates: [], pending: [] };
  }

  function projectAssetLedger(project) {
    return assetLocksApi?.assetLedger
      ? assetLocksApi.assetLedger(project)
      : { assets: [], byKind: { character: [], location: [], prop: [] }, referencedCount: 0, unreferencedCount: 0, attentionCount: 0 };
  }

  function projectContinuityReport(project) {
    return assetLocksApi?.continuityReport
      ? assetLocksApi.continuityReport(project)
      : { issues: [], checkedSceneCount: 0, checkedAssetCount: 0 };
  }

  function renderProjectContinuityReview(project) {
    const report = projectContinuityReport(project);
    if (!report.checkedAssetCount) {
      return `<section class="project-continuity-review is-empty" aria-label="跨场连续性检查"><header><span>CONTINUITY REVIEW</span><strong>跨场连续性检查</strong><small>建立角色、场景或道具母版后，系统会检查本场是否遗漏引用。</small></header></section>`;
    }
    if (!report.issues.length) {
      return `<section class="project-continuity-review is-ready" aria-label="跨场连续性检查"><header><span>CONTINUITY REVIEW</span><strong>跨场连续性检查</strong><small>已检查 ${report.checkedSceneCount} 场与 ${report.checkedAssetCount} 项资产：现有母版引用完整。</small></header><b>通过</b></section>`;
    }
    return `<section class="project-continuity-review is-warning" aria-label="跨场连续性检查"><header><div><span>CONTINUITY REVIEW</span><strong>发现 ${report.issues.length} 项待补引用</strong><small>这些不是剧情错误，只是可能导致生成画面身份、空间或关键物件漂移的技术缺口。</small></div><b>${report.issues.length} 项</b></header><div>${report.issues.slice(0, 6).map((issue) => `<article><span>${escapeHtml(`第 ${String(issue.sceneNumber || 1).padStart(2, "0")} 场`)}</span><div><strong>${escapeHtml(issue.label)}</strong><small>${escapeHtml(issue.detail)}</small></div><button type="button" data-scene-action="select-scene" data-scene-id="${escapeHtml(issue.sceneId)}">去补齐</button></article>`).join("")}</div></section>`;
  }

  function renderProjectAssetLedger(project) {
    const ledger = projectAssetLedger(project);
    const groups = [
      ["character", "角色"],
      ["location", "场景"],
      ["prop", "道具"]
    ];
    if (!ledger.assets.length) {
      return `<section class="project-production-assets" aria-label="项目资产账本"><header><div><span>PROJECT ASSET LEDGER</span><strong>项目资产账本</strong><small>先扫描全片剧本，建立角色、场景、道具的连续性清单。</small></div><aside><b>0 项资产</b><button type="button" data-scene-action="scan-project-assets">扫描全片资产</button></aside></header><p>还没有资产账本。扫描后会从全部场次收录人物、地点与关键物件，后续再逐项建立参考母版。</p></section>`;
    }
    const activeAsset = ledger.assets.find((asset) => asset.id === selectedAssetId) || ledger.assets[0];
    return `<section class="project-production-assets" aria-label="项目资产账本"><header><div><span>PROJECT ASSET LEDGER</span><strong>项目资产账本</strong><small>${ledger.referencedCount} 项已进入场次提示词${ledger.attentionCount ? ` · ${ledger.attentionCount} 项需要建立或验收母版` : " · 项目连续性已建立"}</small></div><aside><b>${ledger.assets.length} 项资产</b><button type="button" data-scene-action="scan-project-assets">重新扫描全片</button>${ledger.unreferencedCount ? `<button type="button" data-scene-action="prune-assets">清理 ${ledger.unreferencedCount} 项未引用资产</button>` : ""}</aside></header><div class="project-production-asset-groups">${groups.map(([kind, label]) => {
      const assets = ledger.byKind[kind] || [];
      return `<section><h3>${label}<small>${assets.length}</small></h3>${assets.length ? `<div>${assets.map((asset) => `<article data-asset-kind="${kind}" data-active="${asset.id === activeAsset?.id}"><b>${escapeHtml(asset.id)}</b><strong>${escapeHtml(asset.name)}</strong><small>${escapeHtml(asset.detail || asset.source)}</small><span>${asset.references.length ? asset.references.map((reference) => `<button type="button" data-scene-action="select-scene" data-scene-id="${escapeHtml(reference.id)}">${escapeHtml(`第 ${String(reference.number || 1).padStart(2, "0")} 场`)}</button>`).join("") : "未引用"}</span><i data-master-status="${escapeHtml(asset.masterStatus || "needs_master")}">${escapeHtml(assetLocksApi?.MASTER_STATUSES?.[asset.masterStatus] || "待生成母版")}</i>${asset.attention ? `<em>${escapeHtml(asset.attention)}</em>` : ""}<button type="button" data-scene-action="open-asset-master" data-asset-id="${escapeHtml(asset.id)}">管理母版</button></article>`).join("")}</div>` : `<p>尚未锁定${label}</p>`}</section>`;
    }).join("")}</div>${renderAssetMasterWorkbench(activeAsset)}</section>`;
  }

  function renderAssetMasterWorkbench(asset) {
    if (!asset) return "";
    const kindLabel = asset.kind === "character" ? "角色" : asset.kind === "location" ? "场景" : "道具";
    const referenceLabel = `${kindLabel}参考图`;
    const statusOptions = Object.entries(assetLocksApi?.MASTER_STATUSES || {}).map(([id, label]) => `<option value="${escapeHtml(id)}"${asset.masterStatus === id ? " selected" : ""}>${escapeHtml(label)}</option>`).join("");
    const references = (asset.referenceAssetIds || []).map((id, index) => `<figure><img data-project-reference-preview="${escapeHtml(id)}" hidden alt="${escapeHtml(`${asset.name} ${referenceLabel}`)}"><figcaption>参考 ${String(index + 1).padStart(2, "0")}</figcaption></figure>`).join("");
    const versions = (asset.masterVersions || []).slice().reverse();
    return `<section class="project-asset-master-workbench" aria-label="${escapeHtml(`${asset.name} 资产母版`)}"><header><div><span>ASSET MASTER</span><strong>${escapeHtml(asset.name)}</strong><small>${escapeHtml(`${asset.id} · ${kindLabel} · 在 ${asset.referenceCount || 0} 场中引用`)}</small></div><aside><label>母版状态<select data-asset-master-status="${escapeHtml(asset.id)}">${statusOptions}</select></label><button type="button" data-scene-action="upload-asset-reference" data-asset-id="${escapeHtml(asset.id)}" data-asset-kind="${escapeHtml(asset.kind)}">${asset.referenceAssetIds?.length ? "追加参考图" : "上传参考图"}</button><button type="button" data-scene-action="save-asset-master-version" data-asset-id="${escapeHtml(asset.id)}"${asset.referenceAssetIds?.length ? "" : " disabled"}>保存母版版本</button></aside></header><div class="project-asset-master-grid"><section><label>固定描述<textarea data-asset-master-field="detail" data-asset-id="${escapeHtml(asset.id)}" placeholder="外观、材质、服装、空间结构或关键特征">${escapeHtml(asset.detail)}</textarea></label><label>一致性规则<textarea data-asset-master-field="referenceRule" data-asset-id="${escapeHtml(asset.id)}" placeholder="每一场生成都必须保持不变的特征">${escapeHtml(asset.referenceRule)}</textarea></label><div class="project-asset-master-scenes"><b>出现场次</b>${asset.references?.length ? asset.references.map((reference) => `<button type="button" data-scene-action="select-scene" data-scene-id="${escapeHtml(reference.id)}">${escapeHtml(`第 ${String(reference.number || 1).padStart(2, "0")} 场 · ${reference.title}`)}</button>`).join("") : "<small>尚未进入任何场次</small>"}</div></section><section class="project-asset-master-references"><b>${referenceLabel}</b><div>${references || `<p>上传至少一张${referenceLabel}后，再保存为正式母版版本。</p>`}</div></section><section class="project-asset-master-versions"><b>母版版本</b>${versions.length ? `<div>${versions.map((version) => `<button type="button" data-scene-action="apply-asset-master-version" data-asset-id="${escapeHtml(asset.id)}" data-master-version-id="${escapeHtml(version.id)}" aria-pressed="${asset.activeMasterVersionId === version.id}"><strong>${escapeHtml(version.label)}</strong><small>${escapeHtml(version.createdAt ? version.createdAt.slice(0, 10) : "已保存")}</small><span>${escapeHtml(assetLocksApi?.MASTER_STATUSES?.[version.masterStatus] || "已保存")}</span></button>`).join("")}</div>` : `<p>还没有正式版本。补齐参考图和规则后，保存当前母版。</p>`}</section></div></section>`;
  }

  function renderAssetLockPanel(scene) {
    const lockedAssets = lockedAssetsForScene(scene);
    const assetLockPreview = assetLockPreviewForScene(scene);
    const pendingAssetNames = assetLockPreview.pending.map((asset) => asset.name).join("、");
    const status = lockedAssets.assets.length && assetLockPreview.pending.length
      ? `已锁定 ${lockedAssets.assets.length} 项 · 待锁定 ${assetLockPreview.pending.length} 项`
      : lockedAssets.assets.length ? `已锁定 ${lockedAssets.assets.length} 项资产`
        : assetLockPreview.pending.length ? `待锁定 ${assetLockPreview.pending.length} 项资产`
          : "本场尚未识别资产";
    const helper = assetLockPreview.pending.length
      ? `待锁定：${pendingAssetNames}。锁定后会以编号写入本场视频提示词。`
      : assetLockNotice || "填写人物、地点或关键物件后，会自动识别为连续性资产。";
    const pending = assetLockPreview.pending.length ? `<p class="project-scene-assets-pending">待锁定：${escapeHtml(pendingAssetNames)}</p>` : "";
    const assetCards = lockedAssets.assets.map((asset) => {
      const canReference = true;
      const label = asset.kind === "character" ? "角色参考图" : asset.kind === "location" ? "场景参考图" : "道具参考图";
      const previews = (asset.referenceAssetIds || []).map((id) => `<img data-project-reference-preview="${escapeHtml(id)}" hidden alt="${escapeHtml(`${asset.name} ${label}`)}">`).join("");
      const reference = canReference ? `<span class="project-scene-asset-reference">${previews || `<i>${label}未绑定</i>`}<small>${previews ? `${label} ${asset.referenceAssetIds.length} 张` : label}</small><button type="button" data-scene-action="upload-asset-reference" data-asset-id="${escapeHtml(asset.id)}" data-asset-kind="${escapeHtml(asset.kind)}">${previews ? "追加" : "上传"}</button></span>` : "";
      const statuses = Object.entries(assetLocksApi?.MASTER_STATUSES || {}).map(([id, labelText]) => `<option value="${escapeHtml(id)}"${asset.masterStatus === id ? " selected" : ""}>${escapeHtml(labelText)}</option>`).join("");
      return `<span data-asset-kind="${escapeHtml(asset.kind)}"><b>${escapeHtml(asset.id)}</b><small>${escapeHtml(asset.name)}</small><label class="project-scene-asset-status"><span>母版状态</span><select data-asset-status="${escapeHtml(asset.id)}">${statuses}</select></label>${reference}<button type="button" data-scene-action="unlock-asset" data-asset-id="${escapeHtml(asset.id)}">解除</button></span>`;
    }).join("");
    return `<header><span>LOCKED ASSETS</span><strong>${status}</strong><small>${escapeHtml(helper)}</small></header><div class="project-scene-assets-list">${lockedAssets.assets.length ? assetCards + pending : `<p>${assetLockPreview.pending.length ? `识别到 ${assetLockPreview.pending.length} 项本场资产：${escapeHtml(pendingAssetNames)}。` : "先填写人物、地点或关键物件，再锁定为项目母版。"}</p>`}</div><footer><button type="button" class="project-scene-lock-all" data-scene-action="lock-all-assets"${assetLockPreview.pending.length ? "" : " disabled"}>一键锁定本场资产</button><button type="button" data-scene-action="lock-assets" data-lock-kind="character">锁定人物</button><button type="button" data-scene-action="lock-assets" data-lock-kind="location">锁定场景</button><button type="button" data-scene-action="lock-assets" data-lock-kind="prop">锁定道具</button></footer>`;
  }

  function renderSceneProductionPlan(list, selectedId) {
    const targetSeconds = Number(activeProject()?.productionMeta?.estimatedDurationSeconds || 0);
    const totalSeconds = list.reduce((total, scene) => total + sceneProductionSummary(scene).plannedSeconds, 0);
    const totalShots = list.reduce((total, scene) => total + sceneProductionSummary(scene).shotCount, 0);
    const production = list.reduce((total, scene) => {
      const summary = sceneProductionSummary(scene);
      total.generationReadyCount += summary.generationReadyCount;
      total.generatedCount += summary.generatedCount;
      total.revisionCount += summary.revisionCount;
      total.lockedCount += summary.lockedCount;
      total.completedProductionCount += summary.completedProductionCount;
      return total;
    }, { generationReadyCount: 0, generatedCount: 0, revisionCount: 0, lockedCount: 0, completedProductionCount: 0 });
    return `<section class="scene-production-plan" aria-label="场次生产计划">
      <header><div><span>SCENE MAP</span><strong>全片场次分镜表</strong><small>${targetSeconds ? `项目目标 ${formatProductionSeconds(targetSeconds)} · 当前场次计划 ${formatProductionSeconds(totalSeconds)}${targetSeconds === totalSeconds ? "，已对齐。" : "，请调整场次或镜头计划。"}` : "从上到下按场次阅读；每一行先看本场共几镜，再点击进入该场镜头明细。"}</small></div><dl>${targetSeconds ? `<div><dt>项目目标</dt><dd>${formatProductionSeconds(targetSeconds)}</dd></div>` : ""}<div><dt>场次</dt><dd>${list.length}</dd></div><div><dt>预计时长</dt><dd>${formatProductionSeconds(totalSeconds)}</dd></div><div><dt>镜头数</dt><dd>${totalShots}</dd></div><div><dt>已就绪</dt><dd>${production.generationReadyCount}</dd></div><div><dt>已生成</dt><dd>${production.generatedCount}</dd></div><div><dt>待返工</dt><dd>${production.revisionCount}</dd></div><div><dt>已锁定</dt><dd>${production.lockedCount}</dd></div><div><dt>生成进度</dt><dd>${production.completedProductionCount} / ${totalShots}</dd></div></dl></header>
      <div class="scene-production-map-columns" aria-hidden="true"><span>场次</span><span>场景 / 叙事段落</span><span>本场镜头</span><span>预计时长</span><span>生成状态</span></div>
      <nav class="scene-production-map" aria-label="按场次顺序排列的分镜表">
        ${list.map((scene) => {
          const summary = sceneProductionSummary(scene);
          const status = scene.status === "approved" ? "已锁定" : summary.ready ? "全部可生成" : `可生成 ${summary.generatableCount}/${summary.shotCount} 镜`;
          const shotRange = summary.shotCount ? `镜 01–${String(summary.shotCount).padStart(2, "0")}` : "待拆镜头";
          return `<button type="button" data-scene-action="select-scene" data-scene-id="${escapeHtml(scene.id)}" aria-current="${scene.id === selectedId ? "true" : "false"}"><span class="scene-production-map-number">场 ${String(scene.number).padStart(2, "0")}</span><span class="scene-production-map-title"><strong>${escapeHtml(sceneLabel(scene))}</strong><small>${escapeHtml([scene.setting, scene.time].filter(Boolean).join(" · ") || "待补场景与时间")}</small></span><span class="scene-production-map-shots"><b>本场共 ${String(summary.shotCount).padStart(2, "0")} 镜</b><small>${shotRange}</small></span><span class="scene-production-map-duration">${formatProductionSeconds(summary.plannedSeconds)}</span><span class="scene-production-map-state${summary.completedProductionCount === summary.shotCount && summary.shotCount ? " is-complete" : ""}"><b>${summary.completedProductionCount} / ${summary.shotCount}</b><small>${escapeHtml(status)}</small></span></button>`;
        }).join("")}
      </nav>
      <footer><span>阅读顺序固定：场 01 → 场 02 → 场 03。每场的镜头都从镜 01 开始；“本场共 09 镜”代表这一场需要生成镜 01–09。</span><button type="button" data-scene-action="add-scene-inline">新增场次</button></footer>
    </section>`;
  }

  function selectedResultForStoryboard(shot) {
    return productionResultsFor(shot).find((result) => result.selected === true) || null;
  }

  function renderProjectStoryboard(list, selectedId, selectedShot) {
    const filters = [["all", "全部"], ["planned", "待生成"], ["keyframe", "关键帧"], ["generated", "已生成"], ["revision", "需返工"], ["locked", "已锁定"]];
    const cards = list.flatMap((scene) => (scene.shots || []).map((shot, index) => ({ scene, shot, index })))
      .filter((item) => storyboardFilter === "all" || item.shot.status === storyboardFilter);
    return `<section class="project-storyboard" aria-label="镜头故事板"><header><div><span>SHOT STORYBOARD</span><strong>全片镜头故事板</strong><small>关键帧上传后自动显示在对应镜头；点击任意卡片进入该镜头的提示词和生成结果。</small></div><b>${cards.length} 镜</b></header><nav aria-label="镜头状态筛选">${filters.map(([id, label]) => `<button type="button" data-scene-action="select-storyboard-filter" data-storyboard-filter="${id}" aria-pressed="${storyboardFilter === id}">${label}</button>`).join("")}</nav><div class="project-storyboard-scenes">${cards.length ? list.map((scene) => {
      const sceneCards = cards.filter((item) => item.scene.id === scene.id);
      if (!sceneCards.length) return "";
      return `<section><header><b>场 ${String(scene.number).padStart(2, "0")}</b><span>${escapeHtml(sceneLabel(scene))}</span><small>${sceneCards.length} 镜</small></header><div>${sceneCards.map(({ shot, index }) => {
        const result = selectedResultForStoryboard(shot);
        const promptVersion = (shot.promptVersions || []).find((version) => version.id === shot.activePromptVersionId) || (shot.promptVersions || []).at(-1);
        const active = scene.id === selectedId && shot.id === selectedShot?.id;
        return `<button type="button" data-scene-action="select-storyboard-shot" data-scene-id="${escapeHtml(scene.id)}" data-shot-id="${escapeHtml(shot.id)}" aria-current="${active}"><div class="project-storyboard-frame" data-project-reference-container>${result?.keyframeReferenceId ? `<img data-project-result-preview="${escapeHtml(result.keyframeReferenceId)}" hidden alt="${escapeHtml(`${sceneShotLabel(scene, index)} 关键帧`)}">` : `<span>${escapeHtml(sceneShotLabel(scene, index))}</span>`}<i>${result?.keyframeReferenceId ? "关键帧" : "待关键帧"}</i></div><footer><span>${escapeHtml(sceneShotLabel(scene, index))}</span><b>${escapeHtml(storeApi?.shotDeliveryLabel?.(shot.deliveryMode) || (shot.deliveryMode === "seedance30" ? "30 秒运镜" : "15 秒运镜"))}</b><small>${escapeHtml(shotStatusLabel(shot))}${promptVersion ? ` · ${promptVersion.label || "正式提示词"}` : " · 未保存提示词"}</small></footer></button>`;
      }).join("")}</div></section>`;
    }).join("") : `<p>当前筛选下没有镜头。</p>`}</div></section>`;
  }

  function renderProjectMonitorWall(list) {
    const allShots = list.flatMap((scene) => (scene.shots || []).map((shot, index) => ({ scene, shot, index })));
    const producedShots = allShots.filter((item) => item.shot.status === "generated" || item.shot.status === "locked");
    const completionRate = allShots.length ? Math.round((producedShots.length / allShots.length) * 100) : 0;

    return `<section class="project-monitor-wall" aria-label="项目总监视墙">
      <header>
        <div>
          <span>PRODUCTION MONITOR WALL</span>
          <strong>项目总监视墙</strong>
          <small>汇总全片已生成的视觉资产，用于导演进行连续性自检和节奏把控。</small>
        </div>
        <div class="monitor-wall-stats" style="display:flex; align-items:center; gap:16px;">
          <div>
            <b>${producedShots.length} / ${allShots.length} 镜已产出</b>
            <div class="completion-bar"><span style="width: ${completionRate}%"></span></div>
            <small>${completionRate}% 完成度</small>
          </div>
          <button type="button" data-scene-action="play-sequence-preview" class="button primary" style="background:#0d645a; color:#fff; border:0; padding:8px 14px; border-radius:4px; font-weight:700; cursor:pointer;"${producedShots.length ? "" : " disabled"}>全片连播序列</button>
        </div>
      </header>
      <div class="monitor-wall-grid">
        ${allShots.length ? allShots.map(({ scene, shot, index }) => {
          const result = selectedResultForStoryboard(shot);
          const hasResult = result?.resultUrl || result?.keyframeReferenceId;
          return `
            <div class="monitor-shot-card ${hasResult ? "has-result" : "is-empty"}" data-scene-id="${escapeHtml(scene.id)}" data-shot-id="${escapeHtml(shot.id)}">
              <div class="monitor-shot-preview" data-project-reference-container>
                ${result?.resultUrl ? `<video src="${escapeHtml(result.resultUrl)}" loop muted playsinline></video>` : 
                  (result?.keyframeReferenceId ? `<img data-project-result-preview="${escapeHtml(result.keyframeReferenceId)}" hidden>` : `<span>场 ${scene.number} 镜 ${index + 1}</span>`)}
                <div class="monitor-shot-overlay">
                  <b>场 ${String(scene.number).padStart(2, "0")} · 镜 ${String(index + 1).padStart(2, "0")}</b>
                  <small>${escapeHtml(shotStatusLabel(shot))}</small>
                </div>
              </div>
              <footer>
                <strong>${escapeHtml(sceneLabel(scene))}</strong>
                <p>${escapeHtml(shot.promptCard?.narrative || scene.storyBeat || "未填写叙事")}</p>
              </footer>
            </div>
          `;
        }).join("") : `<p class="empty-text">项目中尚未建立任何镜头。</p>`}
      </div>
    </section>`;
  }

  function renderProductionStrip() {
    if (!elements.productionStrip) return;
    const project = activeProject();
    const list = scenes();
    const selectedId = selectedScene()?.id;
    const targetSeconds = Number(project?.productionMeta?.estimatedDurationSeconds || 0);
    const targetMinutes = targetSeconds ? Number((targetSeconds / 60).toFixed(1)) : "";
    const delivery = deliveryApi?.buildProjectShotDelivery ? deliveryApi.buildProjectShotDelivery(project) : null;
    const hasDeliveryShots = Boolean(delivery?.summary?.shotCount);
    const queue = productionQueueApi?.buildProjectProductionQueue ? productionQueueApi.buildProjectProductionQueue(project) : [];
    const step = currentProductionStep();
    elements.productionStrip.hidden = !list.length;
    elements.productionStrip.innerHTML = !list.length ? "" : `
      <header class="project-production-header">
        <div class="project-production-title"><span>SCENE PRODUCTION DESK</span><h1>${escapeHtml(project?.name || "未命名电影项目")}</h1><p>剧本已拆为 ${list.length} 场。先管理每场时长与镜头计划，再编辑单镜头生成提示词。</p></div>
        <nav class="project-production-flow" aria-label="项目制作流程">${Object.entries(PRODUCTION_STEPS).map(([id, item]) => `<button type="button" data-scene-action="select-production-step" data-production-step="${id}" aria-current="${step === id ? "step" : "false"}"><b>${item.number}</b><span>${item.label}<small>${item.detail}</small></span></button>`).join("")}</nav>
        <dl class="project-production-meta">${productionMeta(project).map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>
        <div class="project-production-actions"><label>目标片长（分钟）<input type="number" min="1" max="360" step="0.5" value="${targetMinutes}" placeholder="例如：70" data-project-duration-minutes></label><button type="button" data-scene-action="replan-project-duration">按目标重新拆分</button><button type="button" class="project-production-script" data-scene-action="open-screenplay">编辑剧本</button><div class="project-production-delivery"><span>交付就绪 ${delivery?.summary?.readyShotCount || 0} / ${delivery?.summary?.shotCount || 0} 镜</span><button type="button" data-scene-action="copy-project-shot-delivery"${hasDeliveryShots ? "" : " disabled"}>复制整片镜头包</button><button type="button" data-scene-action="download-project-shot-delivery"${hasDeliveryShots ? "" : " disabled"}>下载 Markdown</button><button type="button" data-scene-action="download-production-audit">下载制作验收报告</button></div></div>
      </header>
      <section class="project-production-queue" aria-label="当前制作队列"><header><div><span>PRODUCTION QUEUE</span><strong>现在优先处理什么</strong><small>按资产连续性和镜头交付顺序排列，先解决会影响整片一致性的工作。</small></div><b>${queue[0]?.kind === "delivery" ? "可交付" : `${queue.reduce((total, item) => total + (Number(item.count) || 0), 0)} 项待处理`}</b></header><div>${queue.map((task, index) => `<article data-queue-kind="${escapeHtml(task.kind)}"><b>${String(index + 1).padStart(2, "0")}</b><section><strong>${escapeHtml(task.label)}</strong><small>${escapeHtml(task.detail)}</small></section><button type="button" data-scene-action="open-production-task" data-task-kind="${escapeHtml(task.kind)}" data-task-asset-id="${escapeHtml(task.assetId || "")}" data-scene-id="${escapeHtml(task.sceneId || "")}" data-shot-id="${escapeHtml(task.shotId || "")}">${escapeHtml(task.action)}</button></article>`).join("")}</div></section>
      <div class="project-production-stage" data-production-stage="scenes">${renderSceneProductionPlan(list, selectedId)}${renderProjectStoryboard(list, selectedId, selectedShot())}</div>
      <div class="project-production-stage" data-production-stage="assets">${renderProjectAssetLedger(project)}${renderProjectContinuityReview(project)}</div>
      <div class="project-production-stage" data-production-stage="review">${renderProjectMonitorWall(list)}</div>`;
  }

  function renderList() {
    const list = scenes();
    if (!list.length) {
      elements.list.innerHTML = `<p class="project-scene-list-empty">从一场戏开始。先写下地点、人物动作与情绪，再把完整场次拆成可独立生成的镜头。</p>`;
      return;
    }
    elements.list.innerHTML = list.map((scene) => `
      <button type="button" data-scene-action="select-scene" data-scene-id="${escapeHtml(scene.id)}" aria-current="${scene.id === selectedSceneId ? "true" : "false"}">
        <b>场 ${String(scene.number).padStart(2, "0")}</b>
        <span><strong data-scene-title="${escapeHtml(scene.id)}">${escapeHtml(sceneLabel(scene))}</strong><small>${scene.shots.length} 个镜头 · ${scene.status === "approved" ? "已锁定" : `可生成 ${sceneProductionSummary(scene).generatableCount}/${sceneProductionSummary(scene).shotCount} 镜`}</small></span>
      </button>`).join("");
  }

  function field(label, field, value, { wide = false, textarea = false, placeholder = "", visual = false, shot = false, type = "text", min = "", max = "" } = {}) {
    const attribute = visual ? `data-scene-visual="${field}"` : shot ? `data-shot-field="${field}"` : `data-scene-field="${field}"`;
    const control = textarea
      ? `<textarea ${attribute} rows="3" maxlength="${wide ? 280 : 220}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea>`
      : `<input ${attribute} type="${escapeHtml(type)}"${min !== "" ? ` min="${escapeHtml(min)}"` : ""}${max !== "" ? ` max="${escapeHtml(max)}"` : ""} maxlength="${wide ? 280 : 160}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}">`;
    return `<label class="project-scene-field${wide ? " wide" : ""}"><span>${label}</span>${control}</label>`;
  }

  function videoCardFor(scene = selectedScene(), shot = selectedShot(scene)) {
    const saved = scene?.videoCard || {};
    const shotCard = shot?.promptCard || {};
    const project = activeProject();
    const bible = project?.visualBible || {};
    const inherited = inheritanceApi?.deriveProjectSceneInheritance
      ? inheritanceApi.deriveProjectSceneInheritance(project)
      : { character: {}, tone: {}, camera: {}, music: {} };
    const director = assistantApi?.normalizeDirectorAnalysis
      ? assistantApi.normalizeDirectorAnalysis(scene?.assistant?.directorAnalysis)
      : (scene?.assistant?.directorAnalysis || {});
    const isDefaultFraming = shot?.framing === "中近景";
    const isDefaultMovement = shot?.movement === "缓慢推进";
    const source = {
      ...saved,
      ...shotCard,
      sourceExcerpt: saved.sourceExcerpt || scene?.sourceExcerpt || "",
      narrative: shotCard.narrative || saved.narrative || scene?.storyBeat || "补充这一场发生的事件、冲突与信息落点。",
      characters: saved.characters || scene?.characters?.join("、") || inherited.character?.value || "补充出场人物。",
      emotion: saved.emotion || scene?.emotion || "补充人物情绪走向。",
      performance: shotCard.performance || saved.performance || shot?.performance || "以自然呼吸、视线与细微身体反应推进情绪。",
      action: shotCard.action || saved.action || scene?.action || "补充可见、可执行的角色动作。",
      setting: saved.setting || scene?.setting || "补充内外景、地点与空间关系。",
      time: saved.time || scene?.time || "",
      color: saved.color || scene?.visualOverride?.colorDirection || bible.colorDirection || inherited.tone?.color || "克制、真实的电影色彩关系。",
      lighting: saved.lighting || scene?.visualOverride?.lightingDirection || bible.lightingDirection || inherited.tone?.lighting || "符合场景动机的自然光影，保留暗部层次。",
      cameraTexture: saved.cameraTexture || scene?.visualOverride?.cameraDirection || bible.cameraDirection || inherited.tone?.texture || inherited.camera?.value || "真人电影摄影，真实皮肤肌理与细腻材质细节。",
      framing: shotCard.framing || saved.framing || (!isDefaultFraming && shot?.framing) || inherited.camera?.framing || shot?.framing || "中近景，清楚交代人物与空间关系。",
      movement: shotCard.movement || saved.movement || (!isDefaultMovement && shot?.movement) || inherited.camera?.movement || shot?.movement || "有明确动机的缓慢推进。",
      beatPlan: shotCard.beatPlan || saved.beatPlan || "起势建立，动作推进，情绪落点。",
      sound: shotCard.sound || saved.sound || shot?.sound || "不要背景音乐，只保留环境声与多层空间氛围。",
      musicCue: inherited.music?.prompt || "",
      assetLocks: lockedAssetsForScene(scene).prompt,
      shotNumber: sceneShotLabel(scene, shot),
      dramaticFunction: director.dramaticFunction || "",
      directorialIntent: director.directorialIntent || "",
      visualStrategy: director.visualStrategy || "",
      shotStrategy: director.shotStrategy || ""
    };
    return videoApi?.normalizeSceneVideoCard ? videoApi.normalizeSceneVideoCard(source) : source;
  }

  function editableVideoCardFor(scene = selectedScene(), shot = selectedShot(scene)) {
    const saved = scene?.videoCard || {};
    const shotCard = shot?.promptCard || {};
    const source = {
      ...saved,
      ...shotCard,
      narrative: shotCard.narrative || saved.narrative || scene?.storyBeat || "",
      characters: saved.characters || scene?.characters?.join("、") || "",
      emotion: saved.emotion || scene?.emotion || "",
      performance: shotCard.performance || saved.performance || shot?.performance || "",
      action: shotCard.action || saved.action || scene?.action || "",
      setting: saved.setting || scene?.setting || "",
      time: saved.time || scene?.time || "",
      color: saved.color || scene?.visualOverride?.colorDirection || "",
      lighting: saved.lighting || scene?.visualOverride?.lightingDirection || "",
      cameraTexture: saved.cameraTexture || scene?.visualOverride?.cameraDirection || "",
      framing: shotCard.framing || saved.framing || (shot?.framing === "中近景" ? "" : shot?.framing) || "",
      movement: shotCard.movement || saved.movement || (shot?.movement === "缓慢推进" ? "" : shot?.movement) || "",
      beatPlan: shotCard.beatPlan || saved.beatPlan || "",
      sound: shotCard.sound || saved.sound || shot?.sound || "",
      musicCue: "",
      assetLocks: lockedAssetsForScene(scene).prompt
    };
    return videoApi?.normalizeSceneVideoCard ? videoApi.normalizeSceneVideoCard(source) : source;
  }

  function sceneAnalysisDraft(scene) {
    return assistantApi?.buildSceneAssistantDraft ? assistantApi.buildSceneAssistantDraft(scene) : null;
  }

  function renderSceneAnalysisDraft(scene) {
    const draft = sceneAnalysisDraft(scene);
    if (!draft) return "";
    const facts = [
      draft.characters?.length ? ["人物", draft.characters.join("、")] : null,
      draft.emotion ? ["情绪", draft.emotion] : null,
      draft.action ? ["动作", draft.action] : null,
      draft.dialogue ? ["台词", draft.dialogue] : null,
      draft.props?.length ? ["关键物", draft.props.join("、")] : null
    ].filter(Boolean);
    const suggestions = [draft.references?.performance, draft.references?.framing, draft.references?.movement]
      .filter(Boolean)
      .map((item) => `<span>${escapeHtml(item.label)}</span>`)
      .join("");
    return `<section class="project-scene-analysis-draft" aria-label="剧本分析草稿"><header><div><span>LOCAL SCRIPT ANALYSIS</span><strong>剧本分析草稿</strong><small>${facts.length ? "只从本场原文提取；点击后仅补充空白字段。" : "原文中未识别到可直接写入的制作信息。"}</small></div><button type="button" data-scene-action="apply-scene-analysis"${facts.length ? "" : " disabled"}>写入空白字段</button></header>${facts.length ? `<div class="project-scene-analysis-facts">${facts.map(([label, value]) => `<article><b>${escapeHtml(label)}</b><small>${escapeHtml(value)}</small></article>`).join("")}</div><footer><b>导演建议</b>${suggestions}</footer>` : ""}</section>`;
  }

  function applySceneAnalysisDraft() {
    const scene = selectedScene();
    const shot = selectedShot(scene);
    const draft = sceneAnalysisDraft(scene);
    if (!scene || !shot || !draft) return;
    const saved = scene.videoCard && typeof scene.videoCard === "object" ? scene.videoCard : {};
    const nextCard = { ...saved };
    let changed = false;
    // write only blank fields; project masters, overrides, locks and chosen shot cards stay untouched.
    if (!scene.characters.length && draft.characters.length) { scene.characters = draft.characters; changed = true; }
    if (!scene.emotion && draft.emotion) { scene.emotion = draft.emotion; changed = true; }
    if (!scene.action && draft.action) { scene.action = draft.action; changed = true; }
    if (!String(nextCard.characters || "").trim() && scene.characters.length) { nextCard.characters = scene.characters.join("、"); changed = true; }
    if (!String(nextCard.emotion || "").trim() && scene.emotion) { nextCard.emotion = scene.emotion; changed = true; }
    if (!String(nextCard.action || "").trim() && scene.action) { nextCard.action = scene.action; changed = true; }
    if (!String(nextCard.dialogue || "").trim() && draft.dialogue) { nextCard.dialogue = draft.dialogue; changed = true; }
    if (!String(nextCard.props || "").trim() && draft.props.length) { nextCard.props = draft.props.join("、"); changed = true; }
    if (!String(nextCard.performance || "").trim() && !String(shot.performance || "").trim() && !String(shot.promptCard?.performance || "").trim() && draft.references?.performance?.prompt) {
      nextCard.performance = draft.references.performance.prompt;
      changed = true;
    }
    if (!String(shot.framing || "").trim() && draft.references?.framing?.prompt) { shot.framing = draft.references.framing.prompt; changed = true; }
    if (!String(shot.movement || "").trim() && draft.references?.movement?.prompt) { shot.movement = draft.references.movement.prompt; changed = true; }
    if (!changed) return;
    scene.videoCard = videoApi?.normalizeSceneVideoCard ? videoApi.normalizeSceneVideoCard(nextCard) : nextCard;
    const existingAssistant = assistantApi?.normalizeSceneAssistant ? assistantApi.normalizeSceneAssistant(scene.assistant) : { dialogueLines: [], selectedReferences: {} };
    const dialogueLines = draft.dialogue ? [{ speaker: draft.dialogue.split("：")[0], text: draft.dialogue.split("：").slice(1).join("：") }] : existingAssistant.dialogueLines;
    scene.assistant = assistantApi?.normalizeSceneAssistant
      ? assistantApi.normalizeSceneAssistant({ ...existingAssistant, dialogueLines, selectedReferences: { ...existingAssistant.selectedReferences, performance: draft.references?.performance?.id || "", framing: draft.references?.framing?.id || "", movement: draft.references?.movement?.id || "" } })
      : scene.assistant;
    persistScenes();
    renderAll();
  }

  function directorAnalysisForScene(scene) {
    return assistantApi?.normalizeDirectorAnalysis
      ? assistantApi.normalizeDirectorAnalysis(scene?.assistant?.directorAnalysis)
      : (scene?.assistant?.directorAnalysis || {});
  }

  function directorAnalysisEntries(analysis) {
    const fields = assistantApi?.DIRECTOR_ANALYSIS_FIELDS || [];
    return fields.map(([key, label]) => [key, label, analysis[key]]).filter(([, , value]) => String(value || "").trim());
  }

  function renderDirectorAnalysis(scene) {
    const analysis = directorAnalysisForScene(scene);
    const entries = directorAnalysisEntries(analysis);
    const canBuildPrompt = Boolean(assistantApi?.buildDirectorAnalysisPrompt && scene);
    const importPanel = directorAnalysisExpanded ? `<div class="project-director-analysis-import"><label><span>粘贴模型分析结果</span><textarea data-director-analysis-input rows="8" placeholder='支持 JSON，或“本场戏剧任务：……”这类逐行格式。'>${escapeHtml(directorAnalysisDraft)}</textarea></label>${directorAnalysisError ? `<p role="alert">${escapeHtml(directorAnalysisError)}</p>` : ""}<div><button type="button" data-scene-action="parse-director-analysis">解析并写入分析卡</button><button type="button" data-scene-action="cancel-director-analysis">取消</button></div></div>` : "";
    const cards = entries.length
      ? `<div class="project-director-analysis-facts">${entries.map(([key, label, value]) => `<label><span>${escapeHtml(label)}</span><textarea data-director-analysis-field="${escapeHtml(key)}" rows="2">${escapeHtml(value)}</textarea></label>`).join("")}</div>`
      : `<div class="project-director-analysis-empty">尚未形成导演判断。先把本场原文送到任意文本模型分析，再把结果粘贴回来；它不会自动改写你已经确定的镜头。</div>`;
    return `<section class="project-director-analysis" aria-label="导演叙事分析"><header><div><span>DIRECTOR STORY ANALYSIS</span><strong>导演叙事分析</strong><small>${entries.length ? "这张分析卡会作为本场镜头提示词的导演约束；可直接编辑。" : "结构草稿只提取原文；这一层负责判断这场戏为什么存在。"}</small></div><div class="project-director-analysis-actions"><button type="button" data-scene-action="copy-director-analysis"${canBuildPrompt ? "" : " disabled"}>复制导演分析模板</button><button type="button" data-scene-action="toggle-director-analysis">${directorAnalysisExpanded ? "收起粘贴区" : "粘贴分析结果"}</button></div></header>${cards}${entries.length ? `<footer><button type="button" data-scene-action="apply-director-analysis">仅补充本场空白字段</button><small>已保存为本场导演判断；人物、影调和镜头仍以你的手工决定为准。</small></footer>` : ""}${importPanel}</section>`;
  }

  async function copyDirectorAnalysisPrompt() {
    const scene = selectedScene();
    if (!scene || !assistantApi?.buildDirectorAnalysisPrompt) return;
    await copyText(assistantApi.buildDirectorAnalysisPrompt(activeProject(), scene));
    const button = elements.editor.querySelector('[data-scene-action="copy-director-analysis"]');
    if (button) { button.textContent = "模板已复制"; root.setTimeout(() => { button.textContent = "复制导演分析模板"; }, 1200); }
  }

  function parseDirectorAnalysis() {
    const scene = selectedScene();
    const parsed = assistantApi?.parseDirectorAnalysisResult?.(directorAnalysisDraft);
    if (!scene || !parsed) return;
    if (!parsed.ok) { directorAnalysisError = parsed.error || "暂时无法解析这份导演分析。"; renderEditor(); return; }
    const existingAssistant = assistantApi?.normalizeSceneAssistant ? assistantApi.normalizeSceneAssistant(scene.assistant) : { dialogueLines: [], selectedReferences: {} };
    scene.assistant = assistantApi?.normalizeSceneAssistant
      ? assistantApi.normalizeSceneAssistant({ ...existingAssistant, directorAnalysis: { ...parsed.analysis, source: "imported", updatedAt: new Date().toISOString() } })
      : { ...existingAssistant, directorAnalysis: parsed.analysis };
    directorAnalysisDraft = "";
    directorAnalysisError = "";
    directorAnalysisExpanded = false;
    persistScenes();
    renderAll();
  }

  function applyDirectorAnalysis() {
    const scene = selectedScene();
    const shot = selectedShot(scene);
    const analysis = directorAnalysisForScene(scene);
    if (!scene || !shot || !directorAnalysisEntries(analysis).length) return;
    const saved = scene.videoCard && typeof scene.videoCard === "object" ? scene.videoCard : {};
    let changed = false;
    if (!scene.emotion && analysis.emotionalArc) { scene.emotion = analysis.emotionalArc; changed = true; }
    if (!scene.storyBeat && analysis.dramaticFunction) { scene.storyBeat = analysis.dramaticFunction; changed = true; }
    if (!String(saved.performance || "").trim() && analysis.directorialIntent) { saved.performance = analysis.directorialIntent; changed = true; }
    if (!String(saved.beatPlan || "").trim() && analysis.shotStrategy) { saved.beatPlan = analysis.shotStrategy; changed = true; }
    if (!changed) return;
    scene.videoCard = videoApi?.normalizeSceneVideoCard ? videoApi.normalizeSceneVideoCard(saved) : saved;
    persistScenes();
    renderAll();
  }

  function updateDirectorAnalysisField(target) {
    const scene = selectedScene();
    const key = target.dataset.directorAnalysisField;
    if (!scene || !key || !assistantApi?.normalizeDirectorAnalysis) return;
    const existingAssistant = assistantApi.normalizeSceneAssistant(scene.assistant);
    scene.assistant = assistantApi.normalizeSceneAssistant({
      ...existingAssistant,
      directorAnalysis: { ...existingAssistant.directorAnalysis, [key]: String(target.value || ""), source: "manual", updatedAt: new Date().toISOString() }
    });
    renderPrompt();
    schedulePersist();
  }

  function sceneCreativeSuggestions(scene) {
    const draft = sceneAnalysisDraft(scene);
    return assistantApi?.buildSceneCreativeSuggestions ? assistantApi.buildSceneCreativeSuggestions(scene, draft) : null;
  }

  function renderSceneCreativeSuggestions(scene) {
    const suggestions = sceneCreativeSuggestions(scene);
    if (!suggestions) return "";
    const renderLook = (item) => `<article><div><b>${escapeHtml(item.label)}</b><small>${escapeHtml(item.reason)}</small></div><p>${escapeHtml(item.color)}</p><p>${escapeHtml(item.lighting)}</p><button type="button" data-scene-action="apply-scene-look" data-suggestion-id="${escapeHtml(item.id)}">采用影调</button></article>`;
    const renderCamera = (item) => `<article><div><b>${escapeHtml(item.label)}</b><small>${escapeHtml(item.reason)}</small></div><p>${escapeHtml(item.framing)}</p><p>${escapeHtml(item.movement)}</p><button type="button" data-scene-action="apply-scene-camera" data-suggestion-id="${escapeHtml(item.id)}">采用运镜</button></article>`;
    return `<section class="project-scene-creative-suggestions" aria-label="本场影调与运镜建议"><header><span>SCENE CREATIVE START</span><strong>本场快速视觉建议</strong><small>按原文线索排序；点击只补本场尚未确定的视觉字段。</small></header><div class="project-scene-suggestion-groups"><section><header><b>影调建议</b><small>色彩、光影、摄影质感</small></header><div>${suggestions.looks.map(renderLook).join("")}</div></section><section><header><b>运镜建议</b><small>景别、构图、镜头运动</small></header><div>${suggestions.cameras.map(renderCamera).join("")}</div></section></div></section>`;
  }

  function applySceneCreativeSuggestion(kind, suggestionId) {
    const scene = selectedScene();
    const shot = selectedShot(scene);
    const suggestions = sceneCreativeSuggestions(scene);
    if (!scene || !shot || !suggestions || !suggestionId) return;
    const list = kind === "look" ? suggestions.looks : suggestions.cameras;
    const item = list.find((entry) => entry.id === suggestionId);
    if (!item) return;
    let changed = false;
    // only apply empty scene visual fields and empty shot-card fields; existing decisions stay authoritative.
    if (kind === "look") {
      const override = scene.visualOverride && typeof scene.visualOverride === "object" ? scene.visualOverride : {};
      if (!String(override.colorDirection || "").trim()) { override.colorDirection = item.color; changed = true; }
      if (!String(override.lightingDirection || "").trim()) { override.lightingDirection = item.lighting; changed = true; }
      if (!String(override.cameraDirection || "").trim()) { override.cameraDirection = item.cameraTexture; changed = true; }
      scene.visualOverride = override;
    } else {
      const promptCard = shot.promptCard && typeof shot.promptCard === "object" ? { ...shot.promptCard } : {};
      if (!String(promptCard.framing || "").trim()) { promptCard.framing = item.framing; changed = true; }
      if (!String(promptCard.movement || "").trim()) { promptCard.movement = item.movement; changed = true; }
      shot.promptCard = promptCard;
    }
    if (!changed) return;
    persistScenes();
    renderAll();
  }

  function videoField(label, key, value, { wide = false, textarea = false, placeholder = "", shotCard = false } = {}) {
    const attribute = shotCard ? `data-shot-card-field="${key}"` : `data-video-card-field="${key}"`;
    const control = textarea
      ? `<textarea ${attribute} rows="3" maxlength="280" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea>`
      : `<input ${attribute} maxlength="220" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}">`;
    return `<label class="project-scene-field${wide ? " wide" : ""}"><span>${label}</span>${control}</label>`;
  }

  function quickFill(fieldName, value, label) {
    return `<button type="button" class="project-scene-quick-fill" data-scene-action="fill-video-field" data-video-field="${fieldName}" data-video-value="${escapeHtml(value)}">${escapeHtml(label)}</button>`;
  }

  function sectionHeader(index, title, note, fills = "") {
    return `<header class="project-scene-card-section-head"><div><span>0${index}</span><h4>${title}</h4><p>${note}</p></div>${fills ? `<div class="project-scene-quick-fills">${fills}</div>` : ""}</header>`;
  }

  function renderEditor() {
    const scene = selectedScene();
    if (!scene) {
      elements.editor.innerHTML = `<div class="project-scene-empty"><div><strong>还没有场次</strong><span>新增一场，或建立 8 场短片结构。每一场都可以独立生成镜头提示词。</span></div></div>`;
      return;
    }
    const shot = selectedShot(scene);
    const card = videoCardFor(scene, shot);
    const editorCard = editableVideoCardFor(scene, shot);
    const inherited = inheritanceApi?.deriveProjectSceneInheritance
      ? inheritanceApi.deriveProjectSceneInheritance(activeProject())
      : { character: {}, tone: {}, camera: {}, music: {} };
    const readiness = shotReadiness(scene, shot);
    const shotIndex = Math.max(0, scene.shots.findIndex((item) => item.id === shot?.id));
    const beats = String(card.beatPlan || "")
      .split(/(?:→|->|。|；|;|，)/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3);
    while (beats.length < 3) beats.push(["建立人物与空间", "动作推进", "停在情绪落点"][beats.length]);
    const sceneStill = (offset) => SCENE_STILLS[(Math.max(0, Number(scene.number || 1) - 1) + offset) % SCENE_STILLS.length];
    const visualCards = [
      ["人物定妆", card.characters || "待补充出场人物", sceneStill(0)],
      ["环境参考", card.setting || "待补充地点与空间", sceneStill(1)],
      ["影调光影", `${card.color} / ${card.lighting}`, sceneStill(2)],
      ["运镜调度", `${card.framing} / ${card.movement}`, sceneStill(3)]
    ];
    const inheritedCards = [inherited.character, inherited.tone, inherited.camera, inherited.music]
      .map((item) => `<article${item?.value || item?.detail ? " data-inherited=true" : ""}><b>${escapeHtml(item?.label || "项目母版")}</b><small>${escapeHtml(item?.detail || "尚未设置")}</small></article>`)
      .join("");
    elements.editor.innerHTML = `
      <header class="project-scene-editor-head">
        <div><span>SCENE ${String(scene.number).padStart(2, "0")}</span><h3>${escapeHtml(sceneLabel(scene))}</h3><p>完整场次：预计 ${formatProductionSeconds(sceneProductionSummary(scene).plannedSeconds)} · ${sceneProductionSummary(scene).shotCount} 个镜头 · 镜头合计 ${formatProductionSeconds(sceneProductionSummary(scene).shotSeconds)}。</p></div>
        <div class="project-scene-editor-tools"><button type="button" data-scene-action="toggle-status">${scene.status === "approved" ? "解除锁定" : "锁定场次"}</button><button type="button" data-scene-action="delete-scene">删除场次</button></div>
      </header>
      <section class="project-scene-production-brief" aria-label="本场制作简报"><header><span>SCENE BRIEF</span><strong>本场制作简报</strong><small>先定叙事任务与时长，再拆分可独立生成的镜头。</small></header><div><article><b>剧情目标</b><p>${escapeHtml(scene.storyBeat || "待补本场发生的事件与信息落点")}</p></article><article><b>人物与情绪</b><p>${escapeHtml([scene.characters.join("、"), scene.emotion].filter(Boolean).join(" · ") || "待补出场人物与情绪走向")}</p></article><article><b>空间与时间</b><p>${escapeHtml([scene.setting, scene.time].filter(Boolean).join(" · ") || "待补地点、内外景与时间")}</p></article><div class="project-scene-duration-field">${field("本场预计时长（秒）", "estimatedDurationSeconds", scene.estimatedDurationSeconds || sceneProductionSummary(scene).shotSeconds, { type: "number", min: "0", max: "3600", placeholder: "例如：48" })}<small>镜头合计 ${formatProductionSeconds(sceneProductionSummary(scene).shotSeconds)}${sceneProductionSummary(scene).plannedSeconds !== sceneProductionSummary(scene).shotSeconds ? ` · 相差 ${formatProductionSeconds(Math.abs(sceneProductionSummary(scene).plannedSeconds - sceneProductionSummary(scene).shotSeconds))}` : " · 已对齐"}</small></div></div></section>
      <section class="project-scene-source-excerpt" aria-label="本场剧本原文依据"><span>SOURCE EXCERPT</span><strong>本场剧本原文依据</strong><p>${escapeHtml(scene.sourceExcerpt || "尚未关联剧本原文。可在编辑结构中补充本场叙事，再用 AI 导演分析从原剧本建立依据。")}</p></section>
      <section class="project-scene-inheritance" aria-label="项目母版继承"><header><span>PROJECT INHERITANCE</span><strong>本场自动继承</strong><small>本场填写内容优先于项目母版；未填写处会自动补齐。</small></header><div>${inheritedCards}</div></section>
      ${renderShotProductionCard(scene, shot)}
      <section class="project-scene-readiness" data-ready="${readiness.ready}" aria-label="当前镜头可生成检查"><header><span>SHOT READY CHECK</span><strong>${readiness.ready ? "当前镜头可以生成" : `还差：${readiness.missing.join("、")}`}</strong><small>${readiness.complete}/${readiness.total} 项当前镜头条件齐备</small></header><div>${readiness.items.map((item) => `<span data-ready="${item.ready}"><b>${escapeHtml(item.label)}</b><small>${escapeHtml(item.source)}</small></span>`).join("")}</div></section>
      ${renderShotGenerationGate(scene, shot)}
      ${renderSceneAnalysisDraft(scene)}
      ${renderDirectorAnalysis(scene)}
      ${renderSceneCreativeSuggestions(scene)}
      <section class="project-scene-assets" aria-label="本场锁定资产">${renderAssetLockPanel(scene)}</section>
      <section class="project-scene-shot-board" aria-label="镜头拆分与制作状态"><header><div><span>SHOT PLAN</span><strong>本场镜头计划 · 场次预计 ${formatProductionSeconds(sceneProductionSummary(scene).plannedSeconds)}</strong><small>${scene.shots.length} 个镜头 · 镜头合计 ${formatProductionSeconds(sceneProductionSummary(scene).shotSeconds)}${sceneProductionSummary(scene).plannedSeconds !== sceneProductionSummary(scene).shotSeconds ? ` · 计划相差 ${formatProductionSeconds(Math.abs(sceneProductionSummary(scene).plannedSeconds - sceneProductionSummary(scene).shotSeconds))}` : " · 时长已对齐"}。本场镜头从镜 01 重新编号，每条镜头独立生成，并继承本场角色、影调与锁定资产。</small></div><button type="button" data-scene-action="add-shot">新增镜头</button></header><nav>${scene.shots.map((item, index) => `<button type="button" data-scene-action="select-shot" data-shot-id="${escapeHtml(item.id)}" aria-current="${item.id === shot?.id}"><b>${escapeHtml(sceneShotLabel(scene, index))}</b><small>${escapeHtml(storeApi.shotDeliveryLabel?.(item.deliveryMode) || "15 秒运镜")} · ${shotStatusLabel(item)}</small></button>`).join("")}</nav><div class="project-scene-shot-card"><label class="project-scene-field"><span>制作状态</span><select data-shot-field="status">${Object.entries(SHOT_STATUS_LABELS).map(([value, label]) => `<option value="${value}"${shot?.status === value ? " selected" : ""}>${label}</option>`).join("")}</select></label><label class="project-scene-field"><span>交付模式</span><select data-shot-field="deliveryMode"><option value="still"${shot?.deliveryMode === "still" ? " selected" : ""}>静帧生图</option><option value="seedance15"${shot?.deliveryMode === "seedance15" ? " selected" : ""}>15 秒运镜</option><option value="seedance30"${shot?.deliveryMode === "seedance30" ? " selected" : ""}>30 秒运镜</option></select></label>${field("镜头时长（秒）", "durationSeconds", shot?.durationSeconds || 15, { shot: true, type: "number", min: "5", max: "30" })}${videoField("镜头叙事", "narrative", shot?.promptCard?.narrative || "", { wide: true, textarea: true, placeholder: "例如：从空旷码头建立空间，再让人物进入画面。", shotCard: true })}${videoField("镜头动作", "action", shot?.promptCard?.action || "", { textarea: true, placeholder: "本镜头唯一可见动作", shotCard: true })}${videoField("表演落点", "performance", shot?.promptCard?.performance || "", { textarea: true, placeholder: "呼吸、视线、停顿或身体反应", shotCard: true })}${videoField("景别与构图", "framing", shot?.promptCard?.framing || shot?.framing || "", { textarea: true, placeholder: "本镜头单独构图", shotCard: true })}${videoField("运镜与调度", "movement", shot?.promptCard?.movement || shot?.movement || "", { textarea: true, placeholder: "本镜头单独运镜", shotCard: true })}</div><footer><span>当前：${escapeHtml(sceneShotLabel(scene, shot))} · ${escapeHtml(storeApi.shotDeliveryLabel?.(shot?.deliveryMode) || "15 秒运镜")} · ${shotStatusLabel(shot)}</span><button type="button" data-scene-action="save-prompt-version">保存正式 V${(shot?.promptVersions?.length || 0) + 1}</button>${scene.shots.length > 1 ? `<button type="button" data-scene-action="delete-shot">删除当前镜头</button>` : ""}</footer></section>
      ${renderShotProductionResults(scene, shot)}
      <section class="project-scene-director-board" aria-label="本场导演卡">
        <div class="project-scene-beat-plan"><header><span>15 SECOND SHOT BEATS</span><strong>当前镜头节奏</strong><small>当前镜头的 15 秒节奏；完整场次由上方多个镜头依次串接。</small></header><div>${beats.map((beat, index) => `<article><b>节奏点 ${index + 1}</b><small>${index === 0 ? "0–5 秒" : index === 1 ? "5–10 秒" : "10–15 秒"}</small><p>${escapeHtml(beat)}</p></article>`).join("")}</div></div>
        <div class="project-scene-visual-references"><header><span>DIRECTOR REFERENCES</span><strong>本场影像参考</strong><small>人物、环境、影调与运动统一到同一场戏。</small></header><div>${visualCards.map(([title, detail, image]) => `<article><img src="${image}" alt=""><span><b>${title}</b><small>${escapeHtml(detail)}</small></span></article>`).join("")}</div>
      </section>
      <div class="project-scene-editor-reveal"><button type="button" data-scene-action="toggle-editor">${editorExpanded ? "收起编辑结构" : "编辑本场结构"}</button><span>${editorExpanded ? "填写会实时更新右侧提示词" : "先确认本场导演意图，再展开填写细节"}</span></div>
      <div class="project-scene-fields project-scene-video-card"${editorExpanded ? "" : " hidden"}>
        <section class="project-scene-card-section">
          ${sectionHeader(1, "叙事", "这一场发生什么，人物为什么在这里，最后落在哪个信息或情绪上。")}
          <div class="project-scene-field-grid">${videoField("本场叙事", "narrative", editorCard.narrative, { wide: true, textarea: true, placeholder: "例如：她听见身后的脚步，握紧信封后慢慢回头。" })}</div>
        </section>
        <section class="project-scene-card-section">
          ${sectionHeader(2, "人物与表演", "把角色的状态写成镜头里看得见的呼吸、视线、动作和节奏。", quickFill("emotion", "克制不安，逐渐警觉", "克制不安") + quickFill("performance", "先停顿，呼吸变浅，再以目光和微小动作推进", "克制停顿"))}
          <div class="project-scene-field-grid">
            ${videoField("出场人物", "characters", editorCard.characters, { placeholder: "例如：林岚，刑警" })}
            ${videoField("情绪走向", "emotion", editorCard.emotion, { placeholder: "例如：平静转为警觉" })}
            ${videoField("表演细节", "performance", editorCard.performance, { textarea: true, placeholder: "眼神、呼吸、停顿、身体反应" })}
            ${videoField("可见动作", "action", editorCard.action, { textarea: true, placeholder: "单一、清楚、可执行的动作" })}
            ${videoField("台词", "dialogue", editorCard.dialogue, { wide: true, textarea: true, placeholder: "默认只作为表演依据，不生成字幕" })}
          </div>
          <label class="project-scene-lipsync"><input type="checkbox" data-video-card-toggle="lipSync"${card.lipSync ? " checked" : ""}> <span>需要中文口型同步</span><small>仍不生成字幕</small></label>
        </section>
        <section class="project-scene-card-section">
          ${sectionHeader(3, "场景与关键物", "用空间、时间、天气和物件把画面落到一个真实可拍的地方。", quickFill("setting", "旧旅馆走廊，狭长、陈旧、尽头有一盏忽明忽暗的壁灯", "旧旅馆走廊"))}
          <div class="project-scene-field-grid">
            ${videoField("地点与空间", "setting", editorCard.setting, { wide: true, textarea: true, placeholder: "内外景、地点、空间结构与可见环境" })}
            ${videoField("时间 / 天气", "time", editorCard.time, { placeholder: "例如：凌晨，小雨" })}
            ${videoField("关键物件", "props", editorCard.props, { placeholder: "例如：旧信封、半开的门" })}
          </div>
        </section>
        <section class="project-scene-card-section">
          ${sectionHeader(4, "影调与光影", "本场只保留一套明确的色彩、光线和摄影质感，避免关键词互相冲突。", quickFill("color", "低饱和青灰环境，人物保留微弱暖肤色", "低饱和青灰") + quickFill("lighting", "侧逆光勾出人物轮廓，保留自然暗部层次", "侧逆光"))}
          <div class="project-scene-field-grid">
            ${videoField("色彩关系", "color", editorCard.color, { textarea: true, placeholder: "主色、冷暖关系、饱和度" })}
            ${videoField("光线方向", "lighting", editorCard.lighting, { textarea: true, placeholder: "主光方向、反差、暗部处理" })}
            ${videoField("摄影与材质", "cameraTexture", editorCard.cameraTexture, { wide: true, textarea: true, placeholder: "真实皮肤、镜头、胶片或数字质感" })}
          </div>
        </section>
        <section class="project-scene-card-section">
          ${sectionHeader(5, shot?.deliveryMode === "seedance30" ? "镜头与30秒节奏" : "镜头与15秒节奏", shot?.deliveryMode === "seedance30" ? "30 秒长镜头必须写清：0–10 秒建立 → 10–20 秒推进 → 20–30 秒落点。" : "镜头运动服务于人物动作；一条视频只保留一个清楚的运动意图。", quickFill("framing", "中近景，人物置于右侧三分之一，前景保留门框", "中近景构图") + quickFill("movement", "摄影机有动机地缓慢推进，不做变焦", "缓慢推进"))}
          <div class="project-scene-field-grid">
            ${videoField("景别与构图", "framing", editorCard.framing, { textarea: true, placeholder: "景别、机位、构图重心与前景" })}
            ${videoField("运镜与调度", "movement", editorCard.movement, { textarea: true, placeholder: "一个明确的摄影机运动" })}
            ${videoField(shot?.deliveryMode === "seedance30" ? "30秒三段节拍" : "节奏落点", "beatPlan", editorCard.beatPlan, { wide: true, textarea: true, placeholder: shot?.deliveryMode === "seedance30" ? "0–10秒建立：人物、空间与起始构图 → 10–20秒推进：动作触发摄影机运动 → 20–30秒落点：信息或情绪的新状态" : "起始建立 -> 动作推进 -> 最后停在什么情绪或信息上" })}
          </div>
        </section>
        <section class="project-scene-card-section">
          ${sectionHeader(6, "声音与限制", "默认不要配乐、不要字幕；只在剧情确实需要时再增加声音设计。")}
          <div class="project-scene-field-grid">
            ${videoField("环境声", "sound", editorCard.sound, { wide: true, textarea: true, placeholder: "环境声、空间声、是否需要音乐" })}
            ${videoField("负面限制", "negatives", editorCard.negatives, { wide: true, textarea: true, placeholder: "字幕、水印、身份漂移、塑料皮肤、空间跳变等" })}
          </div>
        </section>
      </div>`;
  }

  function refreshSceneReadiness() {
    const scene = selectedScene();
    const readiness = scene ? shotReadiness(scene, selectedShot(scene)) : null;
    const panel = elements.editor.querySelector(".project-scene-readiness");
    if (!panel || !readiness) return;
    panel.dataset.ready = String(readiness.ready);
    const heading = panel.querySelector("header strong");
    const summary = panel.querySelector("header small");
    if (heading) heading.textContent = readiness.ready ? "当前镜头可以生成" : `还差：${readiness.missing.join("、")}`;
    if (summary) summary.textContent = `${readiness.complete}/${readiness.total} 项当前镜头条件齐备`;
    const items = panel.querySelectorAll("div > span");
    readiness.items.forEach((item, index) => {
      const target = items[index];
      if (!target) return;
      target.dataset.ready = String(item.ready);
      const label = target.querySelector("b");
      const source = target.querySelector("small");
      if (label) label.textContent = item.label;
      if (source) source.textContent = item.source;
    });
    const gate = elements.editor.querySelector(".project-shot-generation-gate");
    if (gate) gate.outerHTML = renderShotGenerationGate(scene, selectedShot(scene));
    const productionCard = elements.editor.querySelector(".project-shot-production-card");
    if (productionCard) productionCard.outerHTML = renderShotProductionCard(scene, selectedShot(scene));
  }

  function refreshAssetLockPanel() {
    const scene = selectedScene();
    const panel = elements.editor.querySelector(".project-scene-assets");
    if (panel && scene) panel.innerHTML = renderAssetLockPanel(scene);
  }

  function refreshProjectProductionStrip() {
    renderProductionStrip();
  }

  function currentPrompt() {
    const scene = selectedScene();
    const shot = selectedShot(scene);
    if (!scene || !shot) return "先建立一场戏，完整视频提示词会在这里生成。";
    const formal = (shot.promptVersions || []).find((item) => item.id === shot.activePromptVersionId);
    if (formal?.prompt) return formal.prompt;
    const card = videoCardFor(scene, shot);
    return videoApi?.buildSceneVideoPrompt
      ? videoApi.buildSceneVideoPrompt(card, targetModelFor(shot), shot.deliveryMode)
      : storeApi.buildSceneShotPrompt(activeProject(), scene, shot);
  }

  function scenePromptPackage() {
    const scene = selectedScene();
    if (!scene?.shots?.length) return "先建立一场戏，再生成整场镜头包。";
    const summary = sceneProductionSummary(scene);
    return [
      `【整场镜头包】${sceneLabel(scene)}｜场次预计 ${summary.plannedSeconds} 秒｜${scene.shots.length} 个镜头｜镜头合计 ${summary.shotSeconds} 秒`,
      "完整场次由以下镜头按顺序独立生成，再在剪辑中串接；保持角色、空间、影调和锁定资产连续一致。",
      ...scene.shots.map((shot, index) => {
        const card = videoCardFor(scene, shot);
        const prompt = videoApi?.buildSceneVideoPrompt
          ? videoApi.buildSceneVideoPrompt(card, targetModelFor(shot), shot.deliveryMode)
          : storeApi.buildSceneShotPrompt(activeProject(), scene, shot);
        return `\n===== ${sceneShotLabel(scene, index)} · ${shot.durationSeconds} 秒 =====\n${prompt}`;
      })
    ].join("\n");
  }

  function sceneDeliveryStatus(scene, shot) {
    if (!scene || !shot) {
      return { ready: false, label: "等待建立场次", detail: "先建立一场戏，再生成可交付的视频提示词。", copyLabel: "复制当前提示词", sendLabel: "发送到运镜" };
    }
    const readiness = shotReadiness(scene, shot);
    const gate = shotReadinessGate(scene, shot);
    if (gate.ready) {
      return { ready: true, label: "当前镜头可直接生成", detail: "当前镜头的叙事、主体、场景、动作、影调、镜头和声音限制已齐备，可以发送到视频制作。", copyLabel: "复制生成提示词", sendLabel: "发送到运镜" };
    }
    const assetWarning = gate.assets.filter((asset) => asset.requiresReference && (asset.referenceCount === 0 || asset.masterStatus !== "locked")).length;
    const missing = [...readiness.missing, ...(assetWarning ? ["资产母版"] : [])];
    return { ready: false, label: "当前镜头制作草稿", detail: `当前镜头尚未满足视频生成条件：仍需补齐 ${missing.join("、")}。草稿可复制用于讨论；补齐后才能发送到运镜。`, copyLabel: "复制制作草稿", sendLabel: "补齐后发送" };
  }

  function renderPrompt() {
    const scene = selectedScene();
    const shot = selectedShot(scene);
    const project = activeProject();
    const output = currentPrompt();
    const delivery = sceneDeliveryStatus(scene, shot);
    const summary = scene ? sceneProductionSummary(scene) : null;
    const targetModel = targetModelFor(shot);
    const versions = Array.isArray(shot?.promptVersions) ? shot.promptVersions : [];
    elements.prompt.innerHTML = `
      <header class="project-scene-prompt-head"><div><span>SHOT DELIVERY STATUS</span><h3>单镜头生成提示词</h3><p>${scene && shot ? `${escapeHtml(sceneShotLabel(scene, shot))} · ${escapeHtml(sceneLabel(scene))} · ${shotStatusLabel(shot)}` : "选择一场和一个镜头后，提示词会在这里生成"}</p></div><small>${summary ? `场次预计 ${formatProductionSeconds(summary.plannedSeconds)} · 当前镜头 ${shot?.durationSeconds || 0} 秒` : escapeHtml(project?.visualBible?.status === "locked" ? "继承已锁定视觉圣经" : "可直接编辑本场母版")}</small></header>
      <div class="project-scene-model-tabs" role="tablist" aria-label="目标视频模型">${Object.entries(VIDEO_TARGETS).map(([id, label]) => `<button type="button" role="tab" aria-selected="${targetModel === id}" data-scene-action="select-video-target" data-video-target="${id}">${label}</button>`).join("")}</div>
      <div class="project-scene-prompt-versions" aria-label="正式提示词版本">${versions.length ? versions.map((version) => `<button type="button" data-scene-action="select-prompt-version" data-prompt-version-id="${escapeHtml(version.id)}" aria-pressed="${version.id === shot?.activePromptVersionId}">${escapeHtml(version.label)} · ${escapeHtml(storeApi.shotDeliveryLabel?.(version.deliveryMode) || "镜头提示")}</button>`).join("") : "<small>尚未保存正式版本。确认当前提示词后，可在镜头计划中保存 V1。</small>"}</div>
      <section class="project-scene-prompt-status" data-ready="${delivery.ready}" aria-label="本场交付状态"><b>${escapeHtml(delivery.label)}</b><small>${escapeHtml(delivery.detail)}</small></section>
      <pre>${escapeHtml(output)}</pre>
      <footer class="project-scene-prompt-actions"><button type="button" data-scene-action="copy-prompt"${scene && shot ? "" : " disabled"}>${escapeHtml(delivery.copyLabel)}</button><button type="button" data-scene-action="copy-scene-package"${scene?.shots?.length ? "" : " disabled"}>复制整场镜头包</button><button type="button" data-scene-action="send-camera"${scene && shot && delivery.ready ? "" : " disabled"}>${escapeHtml(delivery.sendLabel)}</button><p class="project-scene-prompt-note">此处只导出当前镜头，便于直接送入视频模型。整场镜头包用于按序生成和剪辑串接；切换模型只改变提示词写法，不会改动本场内容。</p></footer>`;
  }

  function renderAll() {
    const projectWorkspace = elements.workbench.closest("#project-workspace");
    if (projectWorkspace) {
      projectWorkspace.dataset.sceneSheetOpen = scenes().length ? "true" : "false";
      projectWorkspace.dataset.productionStep = currentProductionStep();
    }
    renderScreenplayStart();
    selectedScene();
    selectedShot();
    renderProductionStrip();
    renderList();
    renderEditor();
    renderPrompt();
    void refreshReferencePreviews();
  }

  function updateListTitle(scene) {
    const title = elements.list.querySelector(`[data-scene-title="${CSS.escape(scene.id)}"]`);
    if (title) title.textContent = sceneLabel(scene);
  }

  function updateField(target) {
    const scene = selectedScene();
    const shot = selectedShot(scene);
    if (!scene) return;
    if (target.dataset.sceneField) {
      const fieldName = target.dataset.sceneField;
      scene[fieldName] = fieldName === "characters"
        ? String(target.value || "").split(/[、,，\n]/).map((item) => item.trim()).filter(Boolean).slice(0, 12)
        : fieldName === "estimatedDurationSeconds"
          ? Math.max(0, Math.min(3600, Math.round(Number(target.value || 0))))
        : String(target.value || "").slice(0, fieldName === "storyBeat" || fieldName === "action" ? 280 : 220);
      if (fieldName === "title") updateListTitle(scene);
      if (["characters", "setting"].includes(fieldName)) assetLockNotice = "";
    }
    if (target.dataset.sceneVisual) {
      scene.visualOverride[target.dataset.sceneVisual] = String(target.value || "").slice(0, 220);
    }
    if (target.dataset.shotField && shot) {
      const fieldName = target.dataset.shotField;
      if (fieldName === "durationSeconds") shot[fieldName] = Math.max(5, Math.min(30, Math.round(Number(target.value || 15))));
      else if (fieldName === "deliveryMode") {
        shot[fieldName] = ["still", "seedance15", "seedance30"].includes(target.value) ? target.value : "seedance15";
        if (shot.deliveryMode === "seedance15") shot.durationSeconds = 15;
        if (shot.deliveryMode === "seedance30") shot.durationSeconds = 30;
      } else shot[fieldName] = String(target.value || "").slice(0, 220);
      shot.activePromptVersionId = "";
    }
    refreshSceneReadiness();
    refreshAssetLockPanel();
    refreshProjectProductionStrip();
    renderPrompt();
    schedulePersist();
  }

  function updateVideoCardField(target) {
    const scene = selectedScene();
    const shot = selectedShot(scene);
    if (!scene || !shot) return;
    const fieldName = target.dataset.videoCardField;
    if (!fieldName) return;
    const current = editableVideoCardFor(scene, shot);
    current[fieldName] = String(target.value || "").slice(0, 280);
    scene.videoCard = videoApi?.normalizeSceneVideoCard ? videoApi.normalizeSceneVideoCard(current) : current;
    if (["characters", "setting", "props"].includes(fieldName)) assetLockNotice = "";

    // Keep the established scene and camera handoff data useful for older project tools.
    if (fieldName === "narrative") scene.storyBeat = current[fieldName];
    if (fieldName === "characters") scene.characters = current[fieldName].split(/[、,，\n]/).map((item) => item.trim()).filter(Boolean).slice(0, 12);
    if (fieldName === "emotion") scene.emotion = current[fieldName];
    if (fieldName === "action") scene.action = current[fieldName];
    if (fieldName === "setting") scene.setting = current[fieldName];
    if (fieldName === "time") scene.time = current[fieldName];
    if (fieldName === "color") scene.visualOverride.colorDirection = current[fieldName];
    if (fieldName === "lighting") scene.visualOverride.lightingDirection = current[fieldName];
    if (fieldName === "cameraTexture") scene.visualOverride.cameraDirection = current[fieldName];
    if (fieldName === "framing") shot.framing = current[fieldName];
    if (fieldName === "movement") shot.movement = current[fieldName];
    if (fieldName === "performance") shot.performance = current[fieldName];
    if (fieldName === "sound") shot.sound = current[fieldName];
    refreshSceneReadiness();
    refreshAssetLockPanel();
    refreshProjectProductionStrip();
    renderPrompt();
    schedulePersist();
  }

  function updateShotCardField(target) {
    const scene = selectedScene();
    const shot = selectedShot(scene);
    const fieldName = target.dataset.shotCardField;
    if (!scene || !shot || !fieldName) return;
    shot.promptCard = { ...(shot.promptCard || {}), [fieldName]: String(target.value || "").slice(0, 280) };
    shot.activePromptVersionId = "";
    refreshSceneReadiness();
    renderPrompt();
    schedulePersist();
  }

  function updateVideoCardToggle(target) {
    const scene = selectedScene();
    const shot = selectedShot(scene);
    if (!scene || !shot || target.dataset.videoCardToggle !== "lipSync") return;
    const current = editableVideoCardFor(scene, shot);
    current.lipSync = target.checked === true;
    scene.videoCard = videoApi?.normalizeSceneVideoCard ? videoApi.normalizeSceneVideoCard(current) : current;
    refreshSceneReadiness();
    renderPrompt();
    schedulePersist();
  }

  async function copyText(text) {
    const value = String(text || "");
    if (!value) return false;
    try {
      if (!root.navigator?.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await root.navigator.clipboard.writeText(value);
      return true;
    } catch (error) {
      try {
        const field = document.createElement("textarea");
        field.value = value;
        field.setAttribute("readonly", "");
        field.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none;";
        document.body.appendChild(field);
        field.focus();
        field.select();
        const copied = document.execCommand("copy");
        field.remove();
        return copied === true;
      } catch (fallbackError) {
        return false;
      }
    }
  }

  async function copyPrompt() {
    const delivery = sceneDeliveryStatus(selectedScene(), selectedShot());
    await copyText(currentPrompt());
    const button = elements.prompt.querySelector('[data-scene-action="copy-prompt"]');
    if (button) { button.textContent = "已复制"; root.setTimeout(() => { button.textContent = delivery.copyLabel; }, 1100); }
  }

  async function copyScenePackage() {
    await copyText(scenePromptPackage());
    const button = elements.prompt.querySelector('[data-scene-action="copy-scene-package"]');
    if (button) { button.textContent = "整场镜头包已复制"; root.setTimeout(() => { button.textContent = "复制整场镜头包"; }, 1100); }
  }

  function projectShotDelivery() {
    return deliveryApi?.buildProjectShotDelivery ? deliveryApi.buildProjectShotDelivery(activeProject()) : null;
  }

  async function copyProjectShotDelivery(button) {
    const delivery = projectShotDelivery();
    if (!delivery?.summary?.shotCount) return;
    const copied = await copyText(delivery.markdown);
    if (button) {
      button.textContent = copied ? "整片镜头包已复制" : "复制失败，请手动复制";
      root.setTimeout(() => { button.textContent = "复制整片镜头包"; }, copied ? 1200 : 2200);
    }
  }

  function shotModelPackage(target) {
    const project = activeProject();
    const scene = selectedScene();
    const shot = selectedShot(scene);
    return deliveryApi?.buildShotModelPackage && scene && shot
      ? deliveryApi.buildShotModelPackage(project, scene, shot, target)
      : null;
  }

  async function copyShotModelPackage(target, button) {
    const packageData = shotModelPackage(target);
    if (!packageData) return;
    const copied = await copyText(packageData.markdown);
    if (button) {
      const original = "复制 Seedance 交付包";
      button.textContent = copied ? "交付包已复制" : "复制失败，请重试";
      root.setTimeout(() => { button.textContent = original; }, copied ? 1200 : 2200);
    }
  }

  function downloadShotModelPackage(target, button) {
    const packageData = shotModelPackage(target);
    if (!packageData) return;
    const blob = new Blob([packageData.markdown], { type: "text/markdown;charset=utf-8" });
    const url = root.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = packageData.filename;
    anchor.click();
    root.URL.revokeObjectURL(url);
    if (button) {
      button.textContent = "交付包已下载";
      root.setTimeout(() => { button.textContent = "下载通用交付包"; }, 1200);
    }
  }

  function selectContinuityPredecessor(sceneId, shotNumber) {
    const scene = scenes().find((item) => item.id === sceneId);
    const index = Math.max(0, Number(shotNumber || 1) - 1);
    const shot = scene?.shots?.[index];
    if (!scene || !shot) return;
    clearResultForm();
    selectedSceneId = scene.id;
    selectedShotId = shot.id;
    editorExpanded = true;
    renderAll();
  }

  function focusSceneField(fieldName) {
    editorExpanded = true;
    renderEditor();
    const input = elements.editor.querySelector(`[data-video-card-field="${fieldName}"]`);
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
    input?.focus({ preventScroll: true });
  }

  function focusAssetReference(assetId) {
    const upload = [...elements.editor.querySelectorAll('[data-scene-action="upload-asset-reference"]')]
      .find((button) => button.dataset.assetId === assetId);
    if (!upload) { assetLockNotice = "请先在本场锁定对应人物或场景资产。"; renderEditor(); return; }
    upload.closest(".project-scene-assets-list > span")?.scrollIntoView({ behavior: "smooth", block: "center" });
    upload.focus({ preventScroll: true });
  }

  function downloadProjectShotDelivery(button) {
    const delivery = projectShotDelivery();
    if (!delivery?.summary?.shotCount) return;
    const blob = new Blob([delivery.markdown], { type: "text/markdown;charset=utf-8" });
    const url = root.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = delivery.filename;
    anchor.click();
    root.URL.revokeObjectURL(url);
    if (button) { button.textContent = "Markdown 已下载"; root.setTimeout(() => { button.textContent = "下载 Markdown"; }, 1200); }
  }

  function downloadProductionAudit(button) {
    const project = activeProject();
    const markdown = productionAuditApi?.buildProjectProductionAuditMarkdown?.(project);
    if (!markdown) return;
    const safeName = String(project?.name || "未命名电影项目").replace(/[\\/:*?"<>|]/g, "_").slice(0, 72);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = root.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeName}_制作验收报告.md`;
    anchor.click();
    root.URL.revokeObjectURL(url);
    if (button) { button.textContent = "验收报告已下载"; root.setTimeout(() => { button.textContent = "下载制作验收报告"; }, 1200); }
  }

  function deleteScene() {
    const scene = selectedScene();
    if (!scene) return;
    const candidateReferenceIds = collectSceneProjectReferenceIds(scene);
    const list = scenes();
    const index = list.findIndex((item) => item.id === scene.id);
    list.splice(index, 1);
    list.forEach((item, itemIndex) => { item.number = itemIndex + 1; });
    selectedSceneId = list[Math.max(0, index - 1)]?.id || "";
    selectedShotId = "";
    const cleanup = assetLocksApi?.pruneUnreferencedAssets
      ? assetLocksApi.pruneUnreferencedAssets(activeProject().assetLocks, list)
      : null;
    if (cleanup && core.patchProjectAssetLocks) {
      ignoreOwnSnapshot = true;
      core.patchProjectAssetLocks(cleanup.assetLocks, list);
      snapshot = core.getProjectSnapshot();
      cleanupProjectReferenceAssets([...candidateReferenceIds, ...assetLockReferenceIds(cleanup.removed)]);
    } else {
      persistScenes();
      cleanupProjectReferenceAssets(candidateReferenceIds);
    }
    renderAll();
  }

  function pruneUnreferencedAssets() {
    const project = activeProject();
    if (!assetLocksApi?.pruneUnreferencedAssets || !core.patchProjectAssetLocks) return;
    const cleanup = assetLocksApi.pruneUnreferencedAssets(project.assetLocks, scenes());
    if (!cleanup.removed.length) return;
    assetLockNotice = `已回收 ${cleanup.removed.length} 项未被场次引用的资产。`;
    ignoreOwnSnapshot = true;
    core.patchProjectAssetLocks(cleanup.assetLocks, scenes());
    snapshot = core.getProjectSnapshot();
    cleanupProjectReferenceAssets(assetLockReferenceIds(cleanup.removed));
    renderAll();
  }

  function deleteShot() {
    const scene = selectedScene();
    const shot = selectedShot(scene);
    if (!scene || !shot || scene.shots.length <= 1) return;
    const candidateReferenceIds = collectShotProjectReferenceIds(shot);
    const index = scene.shots.findIndex((item) => item.id === shot.id);
    scene.shots.splice(index, 1);
    selectedShotId = scene.shots[Math.max(0, index - 1)].id;
    persistScenes();
    cleanupProjectReferenceAssets(candidateReferenceIds);
    renderAll();
  }

  function lockSceneAssets(kinds) {
    const scene = selectedScene();
    if (!scene || !assetLocksApi?.lockSceneAssets || !core.patchProjectAssetLocks) return;
    const before = lockedAssetsForScene(scene).assets.length;
    const result = assetLocksApi.lockSceneAssets(activeProject(), scene, kinds);
    const list = scenes();
    const index = list.findIndex((item) => item.id === scene.id);
    if (index < 0) return;
    list[index] = result.scene;
    const after = result.scene.assetIds?.length || 0;
    assetLockNotice = result.added.length
      ? `已新增 ${result.added.map((asset) => asset.id).join("、")}。`
      : after > before ? "已关联已有项目资产。" : "没有可锁定的新资产，请先补充对应信息。";
    ignoreOwnSnapshot = true;
    core.patchProjectAssetLocks(result.project.assetLocks, list);
    snapshot = core.getProjectSnapshot();
    renderAll();
  }

  function scanProjectAssets() {
    const project = activeProject();
    if (!project || !assetLocksApi?.syncProjectAssetLedger || !core.patchProjectAssetLocks) return;
    const result = assetLocksApi.syncProjectAssetLedger(project);
    ignoreOwnSnapshot = true;
    core.patchProjectAssetLocks(result.project.assetLocks, result.scenes);
    snapshot = core.getProjectSnapshot();
    assetLockNotice = result.added.length ? `已从全片场次收录 ${result.added.length} 项资产，请逐项补参考图并验收。` : "全片资产已同步，未发现新的角色、场景或道具。";
    renderAll();
  }

  function setAssetMasterStatus(assetId, masterStatus) {
    const statuses = assetLocksApi?.MASTER_STATUSES || {};
    if (!Object.prototype.hasOwnProperty.call(statuses, masterStatus)) return;
    const project = activeProject();
    const asset = project?.assetLocks?.find((item) => item.id === assetId);
    if (!asset || !core.patchProjectAssetLocks) return;
    if (masterStatus === "locked" && !(asset.referenceAssetIds || []).length) {
      assetLockNotice = "请先为该资产上传参考图，再锁定为母版。";
      renderEditor();
      return;
    }
    const assetLocks = project.assetLocks.map((item) => item.id === assetId ? { ...item, masterStatus, activeMasterVersionId: "" } : item);
    ignoreOwnSnapshot = true;
    core.patchProjectAssetLocks(assetLocks, scenes());
    snapshot = core.getProjectSnapshot();
    assetLockNotice = `${asset.id} 已标记为“${statuses[masterStatus]}”。`;
    renderAll();
  }

  function updateAssetMasterField(assetId, field, value) {
    if (!["detail", "referenceRule"].includes(field)) return;
    const project = activeProject();
    if (!project?.assetLocks?.some((item) => item.id === assetId) || !core.patchProjectAssetLocks) return;
    const limit = field === "detail" ? 220 : 280;
    const assetLocks = project.assetLocks.map((item) => item.id === assetId
      ? { ...item, [field]: String(value || "").trim().slice(0, limit), activeMasterVersionId: "" }
      : item);
    ignoreOwnSnapshot = true;
    core.patchProjectAssetLocks(assetLocks, scenes());
    snapshot = core.getProjectSnapshot();
  }

  function saveAssetMasterVersion(assetId) {
    const project = activeProject();
    const asset = project?.assetLocks?.find((item) => item.id === assetId);
    if (!asset || !assetLocksApi?.saveAssetMasterVersion || !core.patchProjectAssetLocks) return;
    if (!(asset.referenceAssetIds || []).length) { assetLockNotice = "请先上传至少一张参考图，再保存正式母版。"; renderAll(); return; }
    const saved = assetLocksApi.saveAssetMasterVersion(asset, new Date());
    const assetLocks = project.assetLocks.map((item) => item.id === assetId ? saved : item);
    ignoreOwnSnapshot = true;
    core.patchProjectAssetLocks(assetLocks, scenes());
    snapshot = core.getProjectSnapshot();
    selectedAssetId = assetId;
    assetLockNotice = `${asset.id} 已保存 ${saved.masterVersions?.at(-1)?.label || "母版版本"}。`;
    renderAll();
  }

  function applyAssetMasterVersion(assetId, versionId) {
    const project = activeProject();
    const asset = project?.assetLocks?.find((item) => item.id === assetId);
    if (!asset || !assetLocksApi?.applyAssetMasterVersion || !core.patchProjectAssetLocks) return;
    const applied = assetLocksApi.applyAssetMasterVersion(asset, versionId);
    const assetLocks = project.assetLocks.map((item) => item.id === assetId ? applied : item);
    ignoreOwnSnapshot = true;
    core.patchProjectAssetLocks(assetLocks, scenes());
    snapshot = core.getProjectSnapshot();
    selectedAssetId = assetId;
    assetLockNotice = `${asset.id} 已切换至 ${applied.masterVersions?.find((item) => item.id === applied.activeMasterVersionId)?.label || "所选版本"}。`;
    renderAll();
  }

  function savePromptVersion() {
    const scene = selectedScene();
    const shot = selectedShot(scene);
    if (!scene || !shot || !storeApi.createShotPromptVersion) return;
    const index = scene.shots.findIndex((item) => item.id === shot.id);
    if (index < 0) return;
    scene.shots[index] = storeApi.createShotPromptVersion(activeProject(), scene, shot, new Date());
    const version = scene.shots[index].promptVersions.at(-1);
    if (version) version.prompt = currentPrompt();
    persistScenes();
    resultFormNotice = `已保存 ${scene.shots[index].promptVersions.at(-1)?.label || "正式版本"}。`;
    renderAll();
  }

  function unlockSceneAsset(assetId) {
    const scene = selectedScene();
    if (!scene || !assetLocksApi?.unlockSceneAsset || !core.patchProjectAssetLocks) return;
    const removedAsset = activeProject().assetLocks?.find((item) => item.id === assetId);
    const result = assetLocksApi.unlockSceneAsset(activeProject(), scene, assetId);
    const list = scenes();
    const index = list.findIndex((item) => item.id === scene.id);
    if (index < 0) return;
    list[index] = result.scene;
    assetLockNotice = result.removedFromProject ? `${assetId} 已解除并从项目资产账本回收。` : `${assetId} 已从本场解除，仍保留给其他场次。`;
    ignoreOwnSnapshot = true;
    core.patchProjectAssetLocks(result.project.assetLocks, list);
    snapshot = core.getProjectSnapshot();
    if (result.removedFromProject) {
      cleanupProjectReferenceAssets(removedAsset?.referenceAssetIds);
    }
    renderAll();
  }

  async function addAssetReference(assetId, kind, file) {
    if (!file || !["character", "location", "prop"].includes(kind)) return;
    const project = activeProject();
    const scene = selectedScene();
    const referenceStore = root.aigcProjectReferenceStore;
    const asset = project?.assetLocks?.find((item) => item.id === assetId && item.kind === kind);
    if (!asset || !scene || !referenceStore?.putFile || !core.patchProjectAssetLocks) { assetLockNotice = "请先锁定本场人物、场景或道具资产。"; renderAll(); return; }
    if (!referenceUploadCanProceed(asset)) { assetLockNotice = `${asset.id} 已绑定 6 张参考图，请先删除一张再上传。`; renderAll(); return; }
    const projectId = project.id;
    const sceneId = scene.id;
    const metadata = await referenceStore.putFile(file, project.id);
    try {
      if (!referenceUploadStillCurrent(activeProject(), selectedScene(), projectId, sceneId)) {
        await referenceStore.remove(metadata.id).catch(() => {});
        assetLockNotice = "项目或场次已切换，参考图未绑定，请重新上传。";
        renderAll();
        return;
      }
      const fallbackRule = kind === "character" ? "严格保持脸部、发型、服装、体型与身份一致" : kind === "location" ? "严格保持空间结构、主光方向、关键物件与环境关系一致" : "严格保持道具外形、材质、尺寸、颜色、磨损状态与位置连续一致";
      const assetLocks = project.assetLocks.map((item) => item.id !== assetId ? item : {
        ...item,
        referenceAssetIds: [...new Set([...(item.referenceAssetIds || []), metadata.id])].slice(0, 6),
        referenceRule: item.referenceRule || fallbackRule,
        masterStatus: item.masterStatus === "locked" ? "locked" : "has_reference",
        activeMasterVersionId: ""
      });
      ignoreOwnSnapshot = true;
      core.patchProjectAssetLocks(assetLocks, scenes());
      snapshot = core.getProjectSnapshot();
      assetLockNotice = `${asset.id} 已绑定 1 张${kind === "character" ? "角色" : kind === "location" ? "场景" : "道具"}参考图，待验收后可锁定。`;
      renderAll();
    } catch (error) {
      await referenceStore.remove(metadata.id).catch(() => {});
      throw error;
    }
  }

  function clearResultForm() {
    resultFormShotId = "";
    resultFormExpanded = false;
    resultFormError = "";
    resultKeyframeFile = null;
    resultFormDraft = null;
  }

  function safeResultUrl(value) {
    return resultsUiApi?.safeHttpsResultUrl ? resultsUiApi.safeHttpsResultUrl(value) : "";
  }

  function updateResultFormDraft(target) {
    const field = target.dataset.resultField;
    if (!field || !resultFormDraft || !Object.prototype.hasOwnProperty.call(resultFormDraft, field)) return;
    resultFormDraft[field] = String(target.value || "").slice(0, field === "resultUrl" ? 2000 : field === "notes" || field === "revisionReason" ? 500 : field === "modelVersion" ? 100 : field === "seed" ? 120 : field === "platform" ? 60 : 40);
  }

  function resultReferenceStillUsed(referenceId) {
    if (typeof core.projectReferenceIsUsed === "function") return core.projectReferenceIsUsed(referenceId);
    return resultsUiApi?.keyframeReferenceStillUsed
      ? resultsUiApi.keyframeReferenceStillUsed(activeProject(), referenceId)
      : true;
  }

  function openResultForm() {
    const shot = selectedShot(selectedScene());
    if (!shot) return;
    if (resultFormShotId !== shot.id) {
      resultFormShotId = shot.id;
      resultFormDraft = newResultFormDraft();
      resultKeyframeFile = null;
    }
    resultFormExpanded = true;
    resultFormError = "";
    renderEditor();
  }

  async function saveShotProductionResult() {
    const scene = selectedScene();
    const shot = selectedShot(scene);
    const project = activeProject();
    const draft = resultFormDraft || newResultFormDraft();
    const resultUrl = safeResultUrl(draft.resultUrl);
    if (!scene || !shot || !project || resultFormShotId !== shot.id) return;
    if (!resultKeyframeFile && !resultUrl) {
      resultFormError = "请上传关键帧图片，或填写以 https:// 开头的外部结果地址。";
      renderEditor();
      return;
    }
    if (!resultsApi?.createProductionResult || !resultsApi?.normalizeProductionResults || !resultsUiApi?.saveShotResultTransaction) {
      resultFormError = "生成结果模块尚未加载。";
      renderEditor();
      return;
    }
    const requestedStatus = Object.prototype.hasOwnProperty.call(SHOT_STATUS_LABELS, draft.status) ? draft.status : "generated";
    const sceneId = scene.id;
    const shotId = shot.id;
    const referenceStore = root.aigcProjectReferenceStore;
    if (resultKeyframeFile && (!referenceStore?.putFile || !referenceStore?.remove)) {
      resultFormError = "当前浏览器无法保存关键帧图片。";
      renderEditor();
      return;
    }
    const replaceShot = (nextShot) => {
      const index = scene.shots.findIndex((item) => item.id === shotId);
      if (index < 0) throw new Error("当前镜头不可用。");
      scene.shots[index] = nextShot;
    };
    try {
      await resultsUiApi.saveShotResultTransaction({
        shot,
        file: resultKeyframeFile,
        projectId: project.id,
        uploadKeyframe: (file, projectId) => referenceStore.putFile(file, projectId),
        removeKeyframe: (referenceId) => referenceStore.remove(referenceId),
        beforeApply: () => {
          const currentProject = activeProject();
          const currentScene = selectedScene();
          const currentShot = selectedShot(currentScene);
          if (currentProject?.id !== project.id || currentScene?.id !== sceneId || currentShot?.id !== shotId) throw new Error("项目或镜头已切换，请重新登记结果。");
        },
        createResult: (value) => resultsApi.createProductionResult(value, new Date()),
        normalizeResults: resultsApi.normalizeProductionResults,
        requestedStatus,
        resultFields: { versionLabel: draft.versionLabel, platform: draft.platform, modelVersion: draft.modelVersion, seed: draft.seed, resultUrl, notes: draft.notes, revisionReason: draft.revisionReason },
        applyShot: replaceShot,
        persist: () => persistScenes()
      });
      resultFormNotice = "生成结果已登记。";
      clearResultForm();
      renderAll();
    } catch (error) {
      resultFormError = error?.message || "生成结果保存失败。";
      renderEditor();
      void refreshReferencePreviews();
    }
  }

  function selectShotProductionResult(resultId) {
    const scene = selectedScene();
    const shot = selectedShot(scene);
    if (!scene || !shot || !resultsApi?.selectProductionResult) return;
    let previousShot = null;
    let persisted = false;
    try {
      const index = scene.shots.findIndex((item) => item.id === shot.id);
      if (index < 0) return;
      previousShot = scene.shots[index];
      scene.shots[index] = resultsApi.selectProductionResult(shot, resultId);
      persistScenes();
      persisted = true;
      resultFormNotice = "已设为当前生成版本。";
      renderAll();
    } catch (error) {
      if (previousShot && !persisted) {
        const rollbackIndex = scene.shots.findIndex((item) => item.id === shot.id);
        if (rollbackIndex >= 0) scene.shots[rollbackIndex] = previousShot;
      }
      resultFormNotice = error?.message || "无法选择该生成版本。";
      renderEditor();
    }
  }

  async function deleteShotProductionResult(resultId) {
    const scene = selectedScene();
    const shot = selectedShot(scene);
    if (!scene || !shot || !resultsApi?.deleteProductionResult || !resultsUiApi?.deleteShotResultTransaction) return;
    const shotId = shot.id;
    const replaceShot = (nextShot) => {
      const index = scene.shots.findIndex((item) => item.id === shotId);
      if (index < 0) throw new Error("当前镜头不可用。");
      scene.shots[index] = nextShot;
    };
    try {
      const result = await resultsUiApi.deleteShotResultTransaction({
        shot,
        resultId,
        deleteResult: resultsApi.deleteProductionResult,
        applyShot: replaceShot,
        persist: () => persistScenes(),
        keyframeStillUsed: resultReferenceStillUsed,
        removeKeyframe: (referenceId) => core.cleanupProjectReferenceAssetIfUnreferenced?.(referenceId)
      });
      resultFormNotice = result.cleanupError ? "生成结果已删除，但关键帧图片清理失败。" : "生成结果已删除。";
      renderAll();
    } catch (error) {
      resultFormNotice = error?.message || "生成结果删除失败。";
      renderEditor();
    }
  }

  function onAction(event) {
    const button = event.target.closest("[data-scene-action]");
    if (!button || button.disabled) return;
    const action = button.dataset.sceneAction;
    if (action === "copy-shot-model-package") { void copyShotModelPackage(button.dataset.packageTarget || "seedance", button); return; }
    if (action === "download-shot-model-package") { downloadShotModelPackage(button.dataset.packageTarget || "general", button); return; }
    if (action === "select-continuity-predecessor") { selectContinuityPredecessor(button.dataset.sceneId || "", button.dataset.shotNumber || ""); return; }
    if (action === "focus-continuity-field") { focusSceneField(button.dataset.continuityField || "setting"); return; }
    if (action === "open-shot-production-next") {
      const next = button.dataset.nextAction || "";
      if (next === "save-prompt-version") { savePromptVersion(); return; }
      if (next === "open-result-form") { openResultForm(); return; }
      if (next === "go-casting") { root.aigcWorkspaceNavigation?.show("casting"); return; }
      if (next === "go-tone") { root.aigcWorkspaceNavigation?.show("tone"); return; }
      if (next === "go-camera") { root.aigcWorkspaceNavigation?.show("camera"); return; }
      if (next === "focus-setting") { focusSceneField("setting"); return; }
      if (next === "focus-beat-plan") { focusSceneField("beatPlan"); return; }
      if (next === "focus-asset-reference") { focusAssetReference(button.dataset.assetId || ""); return; }
      return;
    }
    if (action === "open-result-form") { openResultForm(); return; }
    if (action === "cancel-result-form") { clearResultForm(); renderEditor(); return; }
    if (action === "choose-result-keyframe") { elements.resultKeyframeUpload?.click(); return; }
    if (action === "save-result") { void saveShotProductionResult(); return; }
    if (action === "select-result") { selectShotProductionResult(button.dataset.resultId || ""); return; }
    if (action === "delete-result") { void deleteShotProductionResult(button.dataset.resultId || ""); return; }
    if (action === "open-result-url") {
      const url = safeResultUrl(button.dataset.resultUrl);
      if (url) root.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    if (action === "select-video-target") {
      const shot = selectedShot();
      const target = Object.prototype.hasOwnProperty.call(VIDEO_TARGETS, button.dataset.videoTarget) ? button.dataset.videoTarget : "general";
      if (!shot) return;
      shot.targetModel = target;
      shot.activePromptVersionId = "";
      selectedVideoTarget = target;
      persistScenes();
      renderPrompt();
      return;
    }
    if (action === "select-prompt-version") {
      const scene = selectedScene();
      const shot = selectedShot(scene);
      if (!shot || !(shot.promptVersions || []).some((item) => item.id === button.dataset.promptVersionId)) return;
      shot.activePromptVersionId = button.dataset.promptVersionId || "";
      persistScenes();
      renderPrompt();
      return;
    }
    if (action === "open-screenplay") {
      const projectWorkspace = elements.workbench.closest("#project-workspace");
      if (projectWorkspace) projectWorkspace.dataset.screenplayExpanded = "true";
      productionStep = "script";
      renderAll();
      elements.screenplayStart?.scrollIntoView({ behavior: "smooth", block: "start" });
      elements.screenplayInput?.focus({ preventScroll: true });
      return;
    }
    if (action === "copy-screenplay-reanalysis") { void copyScreenplayReanalysisInstruction(); return; }
    if (action === "select-production-step") {
      const step = button.dataset.productionStep;
      if (!Object.prototype.hasOwnProperty.call(PRODUCTION_STEPS, step)) return;
      productionStep = step;
      renderAll();
      const target = step === "script"
        ? elements.screenplayStart
        : step === "delivery"
          ? elements.prompt
          : elements.productionStrip?.querySelector(`[data-production-stage="${step}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (action === "replan-project-duration") {
      const input = elements.productionStrip?.querySelector("[data-project-duration-minutes]");
      const minutes = Number(input?.value || 0);
      if (!Number.isFinite(minutes) || minutes < 1) {
        if (input) input.focus();
        return;
      }
      if (!core.replanProjectSceneDuration) return;
      ignoreOwnSnapshot = true;
      core.replanProjectSceneDuration(Math.round(minutes * 60));
      snapshot = core.getProjectSnapshot();
      renderAll();
      return;
    }
    if (action === "add-scene-inline") { addScene(); return; }
    if (action === "scan-project-assets") { scanProjectAssets(); return; }
    if (action === "open-production-task") {
      const kind = button.dataset.taskKind;
      if (kind === "screenplay") { productionStep = "script"; renderAll(); elements.screenplayStart?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
      if (kind === "assets") { selectedAssetId = button.dataset.taskAssetId || ""; productionStep = "assets"; renderAll(); elements.productionStrip?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
      if (kind === "delivery") { void copyProjectShotDelivery(button); return; }
      if (button.dataset.sceneId) selectedSceneId = button.dataset.sceneId;
      if (button.dataset.shotId) selectedShotId = button.dataset.shotId;
      if (kind === "results" && selectedShotId) { resultFormShotId = selectedShotId; resultFormExpanded = true; }
      productionStep = "scenes";
      editorExpanded = true;
      renderAll();
      return;
    }
    if (action === "select-storyboard-filter") { storyboardFilter = button.dataset.storyboardFilter || "all"; renderProductionStrip(); void refreshReferencePreviews(); return; }
    if (action === "select-storyboard-shot" || action === "select-monitor-shot") {
      clearResultForm();
      selectedSceneId = button.dataset.sceneId || "";
      selectedShotId = button.dataset.shotId || "";
      productionStep = "scenes";
      editorExpanded = true;
      renderAll();
      return;
    }
    if (action === "open-asset-master") { selectedAssetId = button.dataset.assetId || ""; renderAll(); return; }
    if (action === "save-asset-master-version") { saveAssetMasterVersion(button.dataset.assetId || ""); return; }
    if (action === "apply-asset-master-version") { applyAssetMasterVersion(button.dataset.assetId || "", button.dataset.masterVersionId || ""); return; }
    if (action === "play-sequence-preview") {
      const list = scenes();
      const allShots = list.flatMap((scene) => (scene.shots || []).map((shot, index) => ({ scene, shot, index })));
      const produced = allShots.filter((item) => selectedResultForStoryboard(item.shot));
      if (!produced.length) {
        alert("当前没有已产出结果的镜头可供连播。请先为镜头上传关键帧或生成结果。");
        return;
      }
      alert(`【导演连播序列准备就绪】\n\n全片共 ${allShots.length} 镜，其中已产出 ${produced.length} 镜。\n按剧本场次顺序（场 01 → 场 02...）组接连播序列校验完成，可进行节奏与连贯性自检。`);
      return;
    }
    if (action === "copy-project-shot-delivery") { void copyProjectShotDelivery(button); return; }
    if (action === "download-project-shot-delivery") { downloadProjectShotDelivery(button); return; }
    if (action === "download-production-audit") { downloadProductionAudit(button); return; }
    if (action === "go-casting") { root.aigcWorkspaceNavigation?.show("casting"); return; }
    if (action === "go-tone") { root.aigcWorkspaceNavigation?.show("tone"); return; }
    if (action === "go-camera") { root.aigcWorkspaceNavigation?.show("camera"); return; }
    if (action === "focus-setting") { focusSceneField("setting"); return; }
    if (action === "focus-beat-plan") { focusSceneField("beatPlan"); return; }
    if (action === "focus-asset-reference") { focusAssetReference(button.dataset.assetId || ""); return; }
    if (action === "apply-scene-analysis") { applySceneAnalysisDraft(); return; }
    if (action === "copy-director-analysis") { void copyDirectorAnalysisPrompt(); return; }
    if (action === "toggle-director-analysis") { directorAnalysisExpanded = !directorAnalysisExpanded; directorAnalysisError = ""; renderEditor(); if (directorAnalysisExpanded) root.setTimeout(() => elements.editor.querySelector("[data-director-analysis-input]")?.focus(), 0); return; }
    if (action === "cancel-director-analysis") { directorAnalysisExpanded = false; directorAnalysisError = ""; renderEditor(); return; }
    if (action === "parse-director-analysis") { parseDirectorAnalysis(); return; }
    if (action === "apply-director-analysis") { applyDirectorAnalysis(); return; }
    if (action === "apply-scene-look") { applySceneCreativeSuggestion("look", button.dataset.suggestionId); return; }
    if (action === "apply-scene-camera") { applySceneCreativeSuggestion("camera", button.dataset.suggestionId); return; }
    if (action === "lock-all-assets") { lockSceneAssets(["character", "location", "prop"]); return; }
    if (action === "save-prompt-version") { savePromptVersion(); return; }
    if (action === "upload-asset-reference") {
      const input = button.dataset.assetKind === "character" ? elements.characterReferenceUpload : elements.locationReferenceUpload;
      if (input) { input.dataset.assetId = button.dataset.assetId || ""; input.dataset.assetKind = button.dataset.assetKind || ""; input.click(); }
      return;
    }
    if (action === "fill-video-field") {
      const input = elements.editor.querySelector(`[data-video-card-field="${CSS.escape(button.dataset.videoField || "")}"]`);
      if (input) {
        input.value = button.dataset.videoValue || "";
        updateVideoCardField(input);
        input.focus();
      }
      return;
    }
    if (action === "select-scene") { clearResultForm(); selectedSceneId = button.dataset.sceneId; selectedShotId = ""; editorExpanded = false; assetLockNotice = ""; renderAll(); return; }
    if (action === "toggle-editor") { editorExpanded = !editorExpanded; renderEditor(); return; }
    if (action === "select-shot") { clearResultForm(); selectedShotId = button.dataset.shotId; renderAll(); return; }
    if (action === "add-shot") {
      const scene = selectedScene();
      const shot = newShot(scene.shots.length + 1);
      scene.shots.push(shot);
      selectedShotId = shot.id;
      persistScenes();
      renderAll();
      return;
    }
    if (action === "delete-shot") { deleteShot(); return; }
    if (action === "delete-scene") { deleteScene(); return; }
    if (action === "prune-assets") { pruneUnreferencedAssets(); return; }
    if (action === "lock-assets") { lockSceneAssets([button.dataset.lockKind]); return; }
    if (action === "unlock-asset") { unlockSceneAsset(button.dataset.assetId); return; }
    if (action === "toggle-status") {
      const scene = selectedScene();
      scene.status = scene.status === "approved" ? "draft" : "approved";
      persistScenes();
      renderAll();
      return;
    }
    if (action === "copy-prompt") { void copyPrompt(); return; }
    if (action === "copy-scene-package") { void copyScenePackage(); return; }
    if (action === "send-camera") {
      const scene = selectedScene();
      const shot = selectedShot(scene);
      const delivery = sceneDeliveryStatus(scene, shot);
      if (!delivery.ready) { button.textContent = "请先补齐"; root.setTimeout(() => { button.textContent = delivery.sendLabel; }, 1200); return; }
      try { core.sendSceneShotToCamera(scene.id, shot.id); } catch (error) { button.textContent = error.message || "发送失败"; }
    }
  }

  elements.add.addEventListener("click", () => addScene());
  elements.buildEight.addEventListener("click", buildEightScenes);
  elements.screenplayNew.addEventListener("click", () => {
    updateScreenplayDraft(newScreenplayDraft(), { render: true });
    setScreenplayError("");
    elements.screenplayTitle.focus();
  });
  elements.screenplayPaste.addEventListener("click", () => {
    updateScreenplayDraft({ sourceType: "paste", sourceFileName: "" });
    setScreenplayError("");
    elements.screenplayInput.focus();
  });
  elements.screenplayFile.addEventListener("change", (event) => { void importScreenplayFile(event.target.files?.[0]); });
  elements.screenplayTitle.addEventListener("input", (event) => {
    updateScreenplayDraft({ title: String(event.target.value || "").slice(0, 100) });
  });
  elements.screenplayInput.addEventListener("input", (event) => {
    updateScreenplayDraft({ rawText: String(event.target.value || "").slice(0, 60000) });
  });
  elements.screenplayAnalyze.addEventListener("click", analyzeScreenplay);
  elements.screenplayAiAnalyze?.addEventListener("click", () => { void analyzeScreenplayWithAi(); });
  elements.screenplayCopyTemplate?.addEventListener("click", () => { void copyScreenplayAnalysisTemplate(); });
  elements.screenplayImportResult?.addEventListener("click", importExternalScreenplayAnalysis);
  elements.screenplayExternalResult?.addEventListener("input", (event) => { screenplayExternalResult = String(event.target.value || "").slice(0, 120000); });
  elements.screenplayConfirm.addEventListener("click", confirmScreenplayAnalysis);
  elements.screenplayDiff?.addEventListener("change", (event) => {
    if (event.target.matches('[data-screenplay-action="update-analysis-decision"]')) updateScreenplayAnalysisDecision(event.target);
  });
  elements.screenplayClear.addEventListener("click", () => {
    core.clearProjectScreenplay();
    updateScreenplayDraft(newScreenplayDraft(), { render: true });
    screenplayAnalysis = null;
    setScreenplayError("");
  });
  elements.workbench.addEventListener("click", onAction);
  elements.productionStrip?.addEventListener("click", onAction);
  elements.productionStrip?.addEventListener("change", (event) => {
    if (event.target.matches("[data-asset-master-status]")) { setAssetMasterStatus(event.target.dataset.assetMasterStatus || "", event.target.value); return; }
    if (event.target.matches("[data-asset-master-field]")) {
      updateAssetMasterField(event.target.dataset.assetId || "", event.target.dataset.assetMasterField || "", event.target.value);
      assetLockNotice = "母版草稿已更新，保存版本后可作为正式基准复用。";
      renderAll();
    }
  });
  [elements.characterReferenceUpload, elements.locationReferenceUpload].forEach((input) => input?.addEventListener("change", () => {
    const file = input.files?.[0];
    const assetId = input.dataset.assetId || "";
    const kind = input.dataset.assetKind || "";
    input.value = "";
    if (!file) return;
    void addAssetReference(assetId, kind, file).catch((error) => { assetLockNotice = error?.message || "参考图上传失败。"; renderAll(); });
  }));
  elements.resultKeyframeUpload?.addEventListener("change", () => {
    const file = elements.resultKeyframeUpload.files?.[0] || null;
    elements.resultKeyframeUpload.value = "";
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) {
      resultFormError = "请选择图片文件作为关键帧。";
      renderEditor();
      return;
    }
    resultKeyframeFile = file;
    resultFormError = "";
    renderEditor();
  });
  elements.editor.addEventListener("input", (event) => {
    if (event.target.matches("[data-scene-field], [data-scene-visual], [data-shot-field]")) updateField(event.target);
    if (event.target.matches("[data-video-card-field]")) updateVideoCardField(event.target);
    if (event.target.matches("[data-shot-card-field]")) updateShotCardField(event.target);
    if (event.target.matches("[data-director-analysis-input]")) directorAnalysisDraft = String(event.target.value || "").slice(0, 12000);
    if (event.target.matches("[data-director-analysis-field]")) updateDirectorAnalysisField(event.target);
    if (event.target.matches("[data-result-field]")) updateResultFormDraft(event.target);
  });
  elements.editor.addEventListener("change", (event) => {
    let shouldRefresh = false;
    if (event.target.matches("[data-scene-field], [data-scene-visual], [data-shot-field]")) { updateField(event.target); shouldRefresh = true; }
    if (event.target.matches("[data-video-card-field]")) { updateVideoCardField(event.target); shouldRefresh = true; }
    if (event.target.matches("[data-shot-card-field]")) { updateShotCardField(event.target); shouldRefresh = true; }
    if (event.target.matches("[data-director-analysis-field]")) { updateDirectorAnalysisField(event.target); shouldRefresh = true; }
    if (event.target.matches("[data-video-card-toggle]")) { updateVideoCardToggle(event.target); shouldRefresh = true; }
    if (event.target.matches("[data-result-field]")) updateResultFormDraft(event.target);
    if (event.target.matches("[data-asset-status]")) { setAssetMasterStatus(event.target.dataset.assetStatus || "", event.target.value); return; }
    if (shouldRefresh) renderAll();
  });

  core.subscribeProjects((next) => {
    snapshot = next;
    if (ignoreOwnSnapshot) { ignoreOwnSnapshot = false; return; }
    renderAll();
  });
  renderAll();
})(typeof window !== "undefined" ? window : globalThis);
