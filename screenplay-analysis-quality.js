(function initScreenplayAnalysisQuality(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.aigcScreenplayAnalysisQuality = api;
})(typeof window !== "undefined" ? window : globalThis, function createScreenplayAnalysisQuality() {
  function countWords(value) { return String(value || "").replace(/\s+/g, "").length; }
  function sceneStats(scenes) {
    const list = Array.isArray(scenes) ? scenes : [];
    return { sceneCount: list.length, shotCount: list.reduce((total, scene) => total + (Array.isArray(scene?.shots) ? scene.shots.length : 0), 0), incompleteCount: list.filter((scene) => !scene?.setting || !scene?.storyBeat || !Array.isArray(scene?.characters) || !scene.characters.length || !(Array.isArray(scene?.shots) ? scene.shots.length : 0)).length };
  }
  function assess(project = {}, rawText = "", analysis = {}) {
    const stats = sceneStats(analysis.scenes);
    const director = analysis.directorEstimate || analysis.analysis || {};
    const rawLength = countWords(rawText);
    const targetSeconds = Number(project?.productionMeta?.estimatedDurationSeconds || 0);
    const recommendedScenes = Number(director.recommendedSceneCount || 0);
    const recommendedShots = Number(director.recommendedShotCount || 0);
    const estimatedSeconds = Number(director.estimatedDurationSeconds || 0);
    const lowSceneCoverage = (rawLength >= 1200 && stats.sceneCount < 5) || (recommendedScenes >= 5 && stats.sceneCount < Math.ceil(recommendedScenes * 0.55));
    const lowShotCoverage = stats.sceneCount > 0 && stats.shotCount < stats.sceneCount * 2 || (recommendedShots >= 10 && stats.shotCount < Math.ceil(recommendedShots * 0.5));
    const durationMismatch = targetSeconds >= 300 && estimatedSeconds > 0 && Math.abs(targetSeconds - estimatedSeconds) / targetSeconds > 0.35;
    const incomplete = stats.incompleteCount > 0;
    const reasons = [
      lowSceneCoverage ? `场次覆盖偏低：当前 ${stats.sceneCount} 场，建议至少复核是否遗漏叙事段落、时空转换与冲突转折。` : "",
      lowShotCoverage ? `镜头覆盖偏低：当前 ${stats.shotCount} 镜，应确保每场至少有建立、推进、落点等可独立生成镜头。` : "",
      durationMismatch ? `片长不匹配：项目目标约 ${Math.round(targetSeconds / 60)} 分钟，模型估计约 ${Math.round(estimatedSeconds / 60)} 分钟。` : "",
      incomplete ? `${stats.incompleteCount} 场缺少场景、人物、叙事目标或镜头，不能直接作为生成交付。` : ""
    ].filter(Boolean);
    return { ...stats, rawLength, targetSeconds, recommendedScenes, recommendedShots, estimatedSeconds, lowSceneCoverage, lowShotCoverage, durationMismatch, incomplete, reasons, passed: !reasons.length };
  }
  function reanalysisInstruction(quality) {
    const range = quality.recommendedScenes ? `建议场次数至少接近 ${quality.recommendedScenes} 场` : "请根据原文完整拆分所有叙事段落";
    return `请重新以电影导演和 AIGC 分镜导演的标准拆解这份剧本。上次输出不足以覆盖原文：${quality.reasons.join("；")}。${range}；每一场必须保留可回溯的原文依据，并包含地点/时间、出场人物、叙事目标、情绪与动作。每场至少拆为建立、推进、落点等可独立生成镜头；每镜写清可见动作、表演、景别构图和有动机的运镜。只输出符合既定 JSON 结构的完整结果，不要解释。`;
  }
  return { assess, reanalysisInstruction, sceneStats };
});
