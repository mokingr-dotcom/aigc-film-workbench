(function initProjectShotResultsUi(root) {
  function safeHttpsResultUrl(value) {
    try {
      const source = String(value || "").trim();
      if (!/^https:\/\//i.test(source)) return "";
      const url = new URL(source);
      return url.protocol === "https:" ? url.href : "";
    } catch (error) {
      return "";
    }
  }

  function keyframeReferenceStillUsed(project, referenceId) {
    if (!referenceId) return true;
    const resultUsesReference = (project?.scenes || []).some((scene) => (scene?.shots || []).some((shot) => (shot?.productionResults || []).some((record) => record?.keyframeReferenceId === referenceId)));
    const assetUsesReference = (project?.assetLocks || []).some((asset) => Array.isArray(asset?.referenceAssetIds) && asset.referenceAssetIds.includes(referenceId));
    return resultUsesReference || assetUsesReference;
  }

  function createPreviewUrlGuard({ createObjectURL, revokeObjectURL } = {}) {
    if (typeof createObjectURL !== "function" || typeof revokeObjectURL !== "function") throw new TypeError("缺少预览 URL 创建或清理方法。");
    let requestVersion = 0;
    const activeUrls = new Set();

    function invalidate() {
      requestVersion += 1;
      activeUrls.forEach((url) => revokeObjectURL(url));
      activeUrls.clear();
      return requestVersion;
    }

    function beginRequest() {
      return invalidate();
    }

    function createUrlForCurrentRequest(request, blob) {
      const url = createObjectURL(blob);
      if (request !== requestVersion) {
        revokeObjectURL(url);
        return "";
      }
      activeUrls.add(url);
      return url;
    }

    return { beginRequest, invalidate, createUrlForCurrentRequest };
  }

  async function saveShotResultTransaction({
    shot,
    file,
    projectId,
    uploadKeyframe,
    removeKeyframe,
    beforeApply,
    createResult,
    normalizeResults,
    requestedStatus,
    resultFields,
    applyShot,
    persist
  } = {}) {
    if (!shot || typeof createResult !== "function" || typeof normalizeResults !== "function" || typeof applyShot !== "function" || typeof persist !== "function") {
      throw new TypeError("缺少生成结果保存事务所需方法。");
    }
    let uploaded = null;
    let applied = false;
    const previousShot = shot;
    try {
      if (file) {
        if (typeof uploadKeyframe !== "function" || typeof removeKeyframe !== "function") throw new TypeError("缺少关键帧上传或清理方法。");
        uploaded = await uploadKeyframe(file, projectId);
      }
      if (typeof beforeApply === "function") await beforeApply(uploaded);
      const record = createResult({ ...(resultFields || {}), keyframeReferenceId: uploaded?.id || "" });
      const nextShot = {
        ...shot,
        productionResults: normalizeResults([...(Array.isArray(shot.productionResults) ? shot.productionResults : []), record]),
        status: requestedStatus
      };
      applyShot(nextShot);
      applied = true;
      await persist(nextShot);
      return { shot: nextShot, uploaded };
    } catch (error) {
      if (applied) applyShot(previousShot);
      if (uploaded?.id && typeof removeKeyframe === "function") await removeKeyframe(uploaded.id).catch(() => {});
      throw error;
    }
  }

  async function deleteShotResultTransaction({
    shot,
    resultId,
    deleteResult,
    applyShot,
    persist,
    keyframeStillUsed,
    removeKeyframe
  } = {}) {
    if (!shot || typeof deleteResult !== "function" || typeof applyShot !== "function" || typeof persist !== "function") {
      throw new TypeError("缺少生成结果删除事务所需方法。");
    }
    const record = (Array.isArray(shot.productionResults) ? shot.productionResults : []).find((item) => item?.id === resultId);
    if (!record) return { shot, cleanupError: null };
    const previousShot = shot;
    let persisted = false;
    try {
      const nextShot = deleteResult(shot, resultId);
      applyShot(nextShot);
      await persist(nextShot);
      persisted = true;
      let cleanupError = null;
      if (record.keyframeReferenceId && typeof keyframeStillUsed === "function" && !keyframeStillUsed(record.keyframeReferenceId) && typeof removeKeyframe === "function") {
        try {
          await removeKeyframe(record.keyframeReferenceId);
        } catch (error) {
          cleanupError = error;
        }
      }
      return { shot: nextShot, cleanupError };
    } catch (error) {
      if (!persisted) applyShot(previousShot);
      throw error;
    }
  }

  const api = { safeHttpsResultUrl, keyframeReferenceStillUsed, createPreviewUrlGuard, saveShotResultTransaction, deleteShotResultTransaction };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.aigcProjectShotResultsUi = api;
})(typeof window !== "undefined" ? window : globalThis);
