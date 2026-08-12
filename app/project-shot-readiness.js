(function initProjectShotReadiness(root) {
  const readinessApi = typeof require === "function" ? require("./scene-readiness.js") : root.aigcSceneReadiness;

  const GROUPS = Object.freeze([
    { id: "story", label: "叙事与表演", itemIds: new Set(["narrative", "subject", "action"]) },
    { id: "visual", label: "画面与摄影", itemIds: new Set(["setting", "tone", "camera"]) },
    { id: "delivery", label: "交付与连续性", itemIds: new Set(["sound"]) }
  ]);

  function text(value) {
    return String(value || "").trim();
  }

  function sceneAssets(project, scene) {
    const ids = new Set((Array.isArray(scene?.assetIds) ? scene.assetIds : []).map(text).filter(Boolean));
    return (Array.isArray(project?.assetLocks) ? project.assetLocks : [])
      .filter((asset) => ids.has(text(asset?.id)))
      .map((asset) => ({
        id: text(asset.id),
        kind: text(asset.kind),
        name: text(asset.name),
        detail: text(asset.detail),
        referenceCount: Array.isArray(asset.referenceAssetIds) ? asset.referenceAssetIds.filter(Boolean).length : 0,
        referenceRule: text(asset.referenceRule),
        masterStatus: text(asset.masterStatus) || "needs_master",
        requiresReference: ["character", "location", "prop"].includes(asset.kind)
      }))
      .filter((asset) => asset.id && asset.name);
  }

  function groupItems(items) {
    const values = Array.isArray(items) ? items : [];
    return GROUPS.map((group) => ({
      id: group.id,
      label: group.label,
      items: values.filter((item) => group.itemIds.has(item?.id) || (group.id === "delivery" && String(item?.id || "").startsWith("continuity-")))
    }));
  }

  function suggestedActions(items, assets) {
    const actionByItem = {
      subject: { id: "go-casting", label: "去角色定妆", target: "casting" },
      setting: { id: "focus-setting", label: "补场景文字", target: "setting" },
      tone: { id: "go-tone", label: "选择影调", target: "tone" },
      camera: { id: "go-camera", label: "选择运镜", target: "camera" }
    };
    const actions = [];
    (Array.isArray(items) ? items : []).filter((item) => item && !item.ready).forEach((item) => {
      const action = actionByItem[item.id];
      if (action && !actions.some((current) => current.id === action.id)) actions.push(action);
    });
    assets.filter((asset) => asset.requiresReference && asset.referenceCount === 0).forEach((asset) => {
      const label = asset.kind === "character" ? "角色" : asset.kind === "location" ? "场景" : "道具";
      actions.push({ id: "focus-asset-reference", label: `补${label}参考图`, target: "asset-reference", assetId: asset.id });
    });
    return actions;
  }

  function buildShotReadinessGate(project = {}, scene = {}, shot = {}) {
    const readiness = typeof readinessApi?.assessShotReadiness === "function"
      ? readinessApi.assessShotReadiness(project, scene, shot)
      : { ready: false, complete: 0, total: 0, items: [] };
    const assets = sceneAssets(project, scene);
    const unresolvedAssets = assets.filter((asset) => asset.requiresReference && (asset.referenceCount === 0 || asset.masterStatus !== "locked"));
    return {
      ready: readiness.ready === true && unresolvedAssets.length === 0,
      completion: { complete: Number(readiness.complete || 0), total: Number(readiness.total || 0) },
      groups: groupItems(readiness.items),
      assets,
      actions: suggestedActions(readiness.items, assets)
    };
  }

  function shotHasPerformance(scene = {}, shot = {}) {
    const card = shot?.promptCard && typeof shot.promptCard === "object" ? shot.promptCard : {};
    const sceneCard = scene?.videoCard && typeof scene.videoCard === "object" ? scene.videoCard : {};
    return Boolean(text(card.performance || shot?.performance || sceneCard.performance || scene?.emotion));
  }

  function hasThirtySecondBeats(scene = {}, shot = {}) {
    if (text(shot?.deliveryMode) !== "seedance30") return true;
    const card = shot?.promptCard && typeof shot.promptCard === "object" ? shot.promptCard : {};
    const sceneCard = scene?.videoCard && typeof scene?.videoCard === "object" ? scene.videoCard : {};
    const beats = text(card.beatPlan || sceneCard.beatPlan)
      .split(/(?:→|->|。|；|;|\n)/)
      .map(text)
      .filter(Boolean);
    return beats.length >= 3;
  }

  function firstAction(actions = []) {
    return actions.find((action) => action?.id) || null;
  }

  function buildShotProductionCard(project = {}, scene = {}, shot = {}) {
    const gate = buildShotReadinessGate(project, scene, shot);
    const item = (id) => gate.groups.flatMap((group) => group.items).find((entry) => entry.id === id);
    const assetsByKind = (kind) => gate.assets.filter((asset) => asset.kind === kind);
    const assetsReady = (assets) => assets.every((asset) => !asset.requiresReference || (asset.referenceCount > 0 && asset.masterStatus === "locked"));
    const formalVersionCount = Array.isArray(shot?.promptVersions) ? shot.promptVersions.length : 0;
    const selectedResult = (Array.isArray(shot?.productionResults) ? shot.productionResults : []).find((result) => result?.selected === true) || null;
    const subject = item("subject");
    const setting = item("setting");
    const tone = item("tone");
    const narrative = item("narrative");
    const action = item("action");
    const camera = item("camera");
    const characterAssets = assetsByKind("character");
    const environmentAssets = [...assetsByKind("location"), ...assetsByKind("prop")];
    const checks = [
      { id: "identity", label: "角色参考", ready: Boolean(subject?.ready) && assetsReady(characterAssets), detail: characterAssets.length ? (assetsReady(characterAssets) ? "角色母版已锁定" : "角色母版或参考图待补") : (subject?.source || "待补人物") },
      { id: "environment", label: "场景 / 道具", ready: Boolean(setting?.ready) && assetsReady(environmentAssets), detail: environmentAssets.length ? (assetsReady(environmentAssets) ? "场景与道具母版已锁定" : "场景或道具母版待补") : (setting?.source || "待补场景") },
      { id: "look", label: "影调光影", ready: Boolean(tone?.ready), detail: tone?.source || "待补影调" },
      { id: "performance", label: "表演动作", ready: Boolean(narrative?.ready && action?.ready && shotHasPerformance(scene, shot)), detail: shotHasPerformance(scene, shot) ? (action?.source || "待补动作") : "待补人物表演" },
      { id: "camera", label: "运镜节奏", ready: Boolean(camera?.ready) && hasThirtySecondBeats(scene, shot), detail: hasThirtySecondBeats(scene, shot) ? (camera?.source || "待补运镜") : "30 秒需写满三段节拍" },
      { id: "prompt", label: "提示词版本", ready: formalVersionCount > 0, detail: formalVersionCount ? `已保存 ${formalVersionCount} 个正式版本` : "待保存正式版本" }
    ];
    const actions = [...gate.actions];
    if (!checks.find((check) => check.id === "camera")?.ready && text(shot?.deliveryMode) === "seedance30" && !actions.some((action) => action.id === "focus-beat-plan")) {
      actions.unshift({ id: "focus-beat-plan", label: "完善30秒三段节拍", target: "beat-plan" });
    }
    if (!checks.find((check) => check.id === "prompt")?.ready) actions.push({ id: "save-prompt-version", label: "保存正式提示词", target: "prompt-version" });
    if (checks.every((check) => check.ready) && !selectedResult) actions.push({ id: "open-result-form", label: "登记生成结果", target: "result" });
    const ready = checks.every((check) => check.ready);
    return {
      ready,
      lockable: ready && Boolean(selectedResult),
      identity: {
        sceneNumber: Number(scene?.number || 1),
        shotNumber: Math.max(1, (Array.isArray(scene?.shots) ? scene.shots : []).findIndex((item) => item?.id === shot?.id) + 1),
        durationSeconds: Math.max(0, Number(shot?.durationSeconds || 0)),
        deliveryMode: text(shot?.deliveryMode) || "seedance15"
      },
      completion: { complete: checks.filter((check) => check.ready).length, total: checks.length },
      checks,
      actions,
      nextAction: firstAction(actions),
      formalVersionCount,
      selectedResult
    };
  }

  const api = { buildShotReadinessGate, buildShotProductionCard };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.aigcProjectShotReadiness = api;
})(typeof window !== "undefined" ? window : globalThis);
