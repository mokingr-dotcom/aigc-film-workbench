(function initProjectShotResults(root) {
  const RESULT_LIMIT = 12;

  function text(value, limit) {
    return String(value == null ? "" : value).trim().slice(0, limit);
  }

  function safeResultUrl(value) {
    const url = text(value, 2000);
    if (!url) return "";
    try {
      return new URL(url).protocol === "https:" ? url : "";
    } catch (error) {
      return "";
    }
  }

  function normalizeCreatedAt(value) {
    if (typeof value !== "string") return "";
    const source = value.trim();
    if (!source || source.length > 80) return "";
    const timestamp = Date.parse(source);
    if (!Number.isFinite(timestamp)) return "";
    try {
      return new Date(timestamp).toISOString();
    } catch (error) {
      return "";
    }
  }

  function normalizeRecord(value, index, id) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      id: id || text(source.id, 100) || `result-${index + 1}`,
      versionLabel: text(source.versionLabel, 40),
      platform: text(source.platform, 60),
      modelVersion: text(source.modelVersion, 100),
      seed: text(source.seed, 120),
      resultUrl: safeResultUrl(source.resultUrl),
      keyframeReferenceId: text(source.keyframeReferenceId, 120),
      notes: text(source.notes, 500),
      revisionReason: text(source.revisionReason, 500),
      selected: source.selected === true,
      createdAt: normalizeCreatedAt(source.createdAt)
    };
  }

  function normalizeProductionResults(value) {
    const source = Array.isArray(value) ? value.slice(-RESULT_LIMIT) : [];
    const usedIds = new Set();
    const records = source.map((item, index) => {
      const baseId = text(item?.id, 100) || `result-${index + 1}`;
      let id = baseId;
      let suffix = 2;
      while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
      usedIds.add(id);
      return normalizeRecord(item, index, id);
    });
    // Newest valid createdAt wins; input order is the deterministic tie-breaker.
    const selectedIndex = records.reduce((winner, record, index) => {
      if (!record.selected) return winner;
      if (winner < 0) return index;
      const currentTime = Date.parse(record.createdAt);
      const winnerTime = Date.parse(records[winner].createdAt);
      if (Number.isFinite(currentTime) && (!Number.isFinite(winnerTime) || currentTime > winnerTime)) return index;
      if (currentTime === winnerTime || (!Number.isFinite(currentTime) && !Number.isFinite(winnerTime))) return index;
      return winner;
    }, -1);
    return records.map((record, index) => ({ ...record, selected: index === selectedIndex }));
  }

  function createProductionResult(value, now) {
    const record = normalizeRecord(value, 0);
    const timestamp = normalizeCreatedAt(now instanceof Date ? now.toISOString() : now);
    return {
      ...record,
      id: text(value?.id, 100) || `result-${Date.now()}`,
      selected: false,
      createdAt: timestamp
    };
  }

  function selectProductionResult(shot, resultId) {
    const records = normalizeProductionResults(shot?.productionResults);
    if (!records.some((record) => record.id === resultId)) throw new Error("未找到该生成版本。");
    return {
      ...shot,
      status: "locked",
      productionResults: records.map((record) => ({ ...record, selected: record.id === resultId }))
    };
  }

  function deleteProductionResult(shot, resultId) {
    const records = normalizeProductionResults(shot?.productionResults);
    const record = records.find((item) => item.id === resultId);
    if (!record) return { ...shot, productionResults: records };
    if (record.selected) throw new Error("不能删除选定的生成版本。");
    return { ...shot, productionResults: records.filter((item) => item.id !== resultId) };
  }

  function resultStatusFor(record) {
    if (record?.selected === true) return "locked";
    if (text(record?.revisionReason, 500)) return "revision";
    if (safeResultUrl(record?.resultUrl)) return "generated";
    if (text(record?.keyframeReferenceId, 120)) return "keyframe";
    return "planned";
  }

  const api = {
    normalizeProductionResults,
    createProductionResult,
    selectProductionResult,
    deleteProductionResult,
    resultStatusFor
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.aigcProjectShotResults = api;
})(typeof window !== "undefined" ? window : globalThis);
