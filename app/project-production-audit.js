(function initProjectProductionAudit(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.aigcProjectProductionAudit = api;
})(typeof window !== "undefined" ? window : globalThis, function createProjectProductionAudit() {
  function values(value) { return Array.isArray(value) ? value : []; }
  function label(scene, index) { return `场 ${String(scene?.number || 0).padStart(2, "0")} · 镜 ${String(index + 1).padStart(2, "0")}`; }
  function hasSelectedResult(shot) { return values(shot?.productionResults).some((result) => result?.selected === true); }
  function buildProjectProductionAudit(project = {}) {
    const scenes = values(project.scenes).slice().sort((a, b) => Number(a?.number || 0) - Number(b?.number || 0));
    const assetLocks = values(project.assetLocks);
    const issues = [];
    scenes.forEach((scene) => {
      const assets = values(scene.assetIds).map((id) => assetLocks.find((asset) => asset?.id === id)).filter(Boolean);
      assets.filter((asset) => asset.masterStatus !== "locked").forEach((asset) => issues.push({ kind: "asset", severity: "blocker", sceneId: scene.id, assetId: asset.id, label: `场 ${String(scene.number).padStart(2, "0")}：${asset.name} 未锁定母版`, detail: "上传并验收参考图后锁定，才应进入视频生成。" }));
      values(scene.shots).forEach((shot, index) => {
        const shotLabel = label(scene, index);
        if (!values(shot?.promptVersions).length) issues.push({ kind: "prompt", severity: "blocker", sceneId: scene.id, shotId: shot.id, label: `${shotLabel} 未保存正式提示词`, detail: "确认影调、人物、动作、运镜与限制后保存一个正式版本。" });
        if (values(shot?.promptVersions).length && !hasSelectedResult(shot)) issues.push({ kind: "result", severity: "review", sceneId: scene.id, shotId: shot.id, label: `${shotLabel} 尚未登记当前生成结果`, detail: "生成后登记关键帧或结果链接，并标注是否通过或返工。" });
        if (shot?.status === "revision") issues.push({ kind: "revision", severity: "review", sceneId: scene.id, shotId: shot.id, label: `${shotLabel} 标记为需返工`, detail: "查看返工原因，修改提示词后保存新的正式版本。" });
      });
    });
    const shotCount = scenes.reduce((total, scene) => total + values(scene.shots).length, 0);
    const blockers = issues.filter((issue) => issue.severity === "blocker");
    const review = issues.filter((issue) => issue.severity === "review");
    return { sceneCount: scenes.length, shotCount, blockers, review, issues, readyForDelivery: shotCount > 0 && blockers.length === 0 };
  }
  function buildProjectProductionAuditMarkdown(project = {}) {
    const audit = buildProjectProductionAudit(project);
    const title = String(project?.name || "未命名电影项目").trim();
    const rows = (heading, issues) => issues.length ? [heading, ...issues.map((issue) => `- ${issue.label}：${issue.detail}`), ""] : [];
    return [
      `# ${title}｜AIGC 制作验收报告`,
      "",
      `- 场次：${audit.sceneCount}`,
      `- 镜头：${audit.shotCount}`,
      `- 生成前阻塞项：${audit.blockers.length}`,
      `- 待审阅项：${audit.review.length}`,
      `- 交付状态：${audit.readyForDelivery ? "可进入批量生成与交付" : "先处理生成前阻塞项"}`,
      "",
      ...rows("## 生成前阻塞项", audit.blockers),
      ...rows("## 结果与返工审阅", audit.review),
      audit.issues.length ? "" : "## 验收结论\n- 当前没有发现阻塞项，可复制整片镜头包进入生成或剪辑交接。"
    ].join("\n");
  }
  return { buildProjectProductionAudit, buildProjectProductionAuditMarkdown };
});
