(function initProjectProductionQueue(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.aigcProjectProductionQueue = api;
})(typeof window !== "undefined" ? window : globalThis, function createProjectProductionQueue() {
  function values(value) { return Array.isArray(value) ? value : []; }
  function shotNeedsPrompt(shot) { return !values(shot?.promptVersions).length; }
  function shotNeedsResult(shot) { return values(shot?.promptVersions).length > 0 && !values(shot?.productionResults).some((result) => result?.selected === true); }

  function buildProjectProductionQueue(project = {}) {
    const scenes = values(project.scenes);
    if (!scenes.length) return [{ id: "screenplay", kind: "screenplay", label: "先导入剧本", detail: "粘贴或上传剧本，确认后再拆成可生成场次与镜头。", action: "去剧本", count: 1 }];
    const usedAssetIds = new Set(scenes.flatMap((scene) => values(scene.assetIds)));
    const missingAssets = values(project.assetLocks).filter((asset) => usedAssetIds.has(asset?.id) && asset?.masterStatus !== "locked");
    const shots = scenes.flatMap((scene) => values(scene.shots).map((shot) => ({ scene, shot })));
    const promptTargets = shots.filter(({ shot }) => shotNeedsPrompt(shot));
    const resultTargets = shots.filter(({ shot }) => shotNeedsResult(shot));
    const tasks = [];
    if (missingAssets.length) tasks.push({ id: "assets", kind: "assets", label: `锁定 ${missingAssets.length} 项资产母版`, detail: "角色、场景或关键道具尚未完成参考图验收；先锁定它们，避免后续镜头发生连续性漂移。", action: "去资产", count: missingAssets.length, assetId: missingAssets[0].id });
    if (!shots.length) tasks.push({ id: "shots", kind: "prompts", label: "为场次拆分镜头", detail: "当前场次还没有可独立生成的镜头。先确定每场镜头数、时长与叙事动作。", action: "处理场次", count: scenes.length, sceneId: scenes[0].id });
    if (promptTargets.length) { const target = promptTargets[0]; tasks.push({ id: "prompts", kind: "prompts", label: `确认 ${promptTargets.length} 镜正式提示词`, detail: "每一镜都应在资产、影调、表演与运镜确认后保存一个正式提示词版本。", action: "处理镜头", count: promptTargets.length, sceneId: target.scene.id, shotId: target.shot.id }); }
    if (resultTargets.length) { const target = resultTargets[0]; tasks.push({ id: "results", kind: "results", label: `登记 ${resultTargets.length} 镜生成结果`, detail: "提示词已确定。生成后登记关键帧或结果链接，并标注通过、返工或锁定。", action: "登记结果", count: resultTargets.length, sceneId: target.scene.id, shotId: target.shot.id }); }
    return tasks.length ? tasks : [{ id: "delivery", kind: "delivery", label: "整片镜头包可交付", detail: "所有镜头已拥有正式提示词和当前生成结果，可复制镜头包继续生成或进入剪辑交接。", action: "复制镜头包", count: shots.length }];
  }
  return { buildProjectProductionQueue, shotNeedsPrompt, shotNeedsResult };
});
