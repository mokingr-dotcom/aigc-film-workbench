(function initProjectDelivery(root) {
  const storeApi = typeof require === "function" ? require("./project-store.js") : root.aigcProjectStore;
  const readinessApi = typeof require === "function" ? require("./scene-readiness.js") : root.aigcSceneReadiness;

  const SHOT_STATUS_LABELS = Object.freeze({
    planned: "待生图",
    keyframe: "关键帧完成",
    generated: "视频已生成",
    revision: "需返工",
    locked: "已锁定"
  });

  function text(value) {
    return String(value || "").trim();
  }

  function byNumber(left, right) {
    return Number(left?.number || 0) - Number(right?.number || 0);
  }

  function safeFilename(value) {
    const name = text(value).replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").slice(0, 72) || "未命名电影项目";
    return `${name}_镜头交付包.md`;
  }

  function shotLabel(scene, shotIndex) {
    return `场 ${String(scene?.number || 0).padStart(2, "0")} · 镜 ${String(shotIndex + 1).padStart(2, "0")}`;
  }

  function sceneAssets(project, scene) {
    const ids = new Set(Array.isArray(scene?.assetIds) ? scene.assetIds : []);
    return (Array.isArray(project?.assetLocks) ? project.assetLocks : [])
      .filter((asset) => ids.has(asset?.id))
      .map((asset) => ({
        id: text(asset.id),
        kind: text(asset.kind),
        name: text(asset.name),
        detail: text(asset.detail),
        referenceIds: Array.isArray(asset.referenceAssetIds) ? asset.referenceAssetIds.map(text).filter(Boolean) : [],
        referenceRule: text(asset.referenceRule)
      }))
      .filter((asset) => asset.id && asset.name);
  }

  function projectShotReadiness(project, scene, shot) {
    if (typeof readinessApi?.assessShotReadiness === "function") return readinessApi.assessShotReadiness(project, scene, shot);
    return { ready: false, missing: ["生成条件"], complete: 0, total: 0 };
  }

  function projectShotPrompt(project, scene, shot) {
    if (typeof storeApi?.buildSceneShotPrompt === "function") return storeApi.buildSceneShotPrompt(project, scene, shot);
    return "提示词构建器未加载。";
  }

  function safeHttpsUrl(value) {
    const url = text(value);
    if (!url) return "";
    try {
      return new URL(url).protocol === "https:" ? url : "";
    } catch (_) {
      return "";
    }
  }

  function selectedProductionResult(shot) {
    const selected = Array.isArray(shot?.productionResults)
      ? shot.productionResults.find((result) => result?.selected === true)
      : null;
    if (!selected) return null;
    return {
      id: text(selected.id),
      versionLabel: text(selected.versionLabel),
      platform: text(selected.platform),
      modelVersion: text(selected.modelVersion),
      seed: text(selected.seed),
      resultUrl: safeHttpsUrl(selected.resultUrl),
      notes: text(selected.notes)
    };
  }

  function deliveryModeLabel(mode) {
    return mode === "still" ? "静帧生图" : mode === "seedance30" ? "30 秒运镜" : "15 秒运镜";
  }

  function deliveryPrompt(project, scene, shot) {
    const activeVersion = (Array.isArray(shot?.promptVersions) ? shot.promptVersions : []).find((item) => item?.id === shot?.activePromptVersionId);
    if (activeVersion?.prompt) return activeVersion.prompt;
    return projectShotPrompt(project, scene, shot);
  }

  function shotIndex(scene, shot) {
    const index = (Array.isArray(scene?.shots) ? scene.shots : []).findIndex((item) => item?.id === shot?.id);
    return index >= 0 ? index : 0;
  }

  function modelPackageFilename(project, scene, shot, target) {
    const projectName = text(project?.name) || "未命名电影项目";
    const sceneNumber = String(scene?.number || 1).padStart(2, "0");
    const index = String(shotIndex(scene, shot) + 1).padStart(2, "0");
    const targetName = target === "seedance" ? "Seedance" : "通用视频模型";
    return `${text(projectName).replace(/[\\/:*?\"<>|]/g, "_").slice(0, 48)}_场${sceneNumber}_镜${index}_${targetName}交付包.md`;
  }

  function referenceUploadChecklist(assets) {
    const labels = { character: "角色", location: "场景", prop: "道具" };
    return assets.map((asset, index) => ({
      order: index + 1,
      id: asset.id,
      kind: asset.kind,
      kindLabel: labels[asset.kind] || "资产",
      name: asset.name,
      referenceIds: asset.referenceIds,
      referenceRule: asset.referenceRule || "保持该资产的身份、外观、材质与空间关系一致。"
    }));
  }

  function buildShotModelPackage(project = {}, scene = {}, shot = {}, target = "seedance") {
    const normalizedTarget = target === "seedance" ? "seedance" : "general";
    const assets = sceneAssets(project, scene);
    const references = referenceUploadChecklist(assets);
    const durationSeconds = Math.max(0, Number(shot?.durationSeconds || 0));
    const deliveryMode = text(shot?.deliveryMode) || "seedance15";
    const prompt = deliveryPrompt(project, scene, shot);
    const label = shotLabel(scene, shotIndex(scene, shot));
    const targetLabel = normalizedTarget === "seedance" ? "Seedance" : "通用视频模型";
    const referenceLines = references.length
      ? references.map((item) => [
        `${item.order}. 【${item.kindLabel}】${item.name}（${item.id}）`,
        item.referenceIds.length ? `   - 上传参考：${item.referenceIds.join("、")}` : "   - 上传参考：本资产尚无已登记参考图，请先补齐。",
        `   - 锁定要求：${item.referenceRule}`
      ].join("\n")).join("\n")
      : "- 本镜未绑定资产参考图；请在生成平台手动上传角色、场景或道具参考。";
    const modeLine = deliveryMode === "seedance30"
      ? "30 秒镜头：按提示词中的 0–10 秒、10–20 秒、20–30 秒节拍连续生成。"
      : deliveryMode === "seedance15"
        ? "15 秒镜头：保持一个清晰的动作主线，不要无故切镜或跳时。"
        : "静帧生图：以本镜头的画面、人物与影调为唯一依据。";
    const markdown = [
      `# ${targetLabel}｜${label}交付包`,
      "",
      `- 项目：${text(project?.name) || "未命名电影项目"}`,
      `- 镜头：${label}`,
      `- 时长：${durationSeconds || "待定"}${durationSeconds ? " 秒" : ""}`,
      `- 交付模式：${deliveryModeLabel(deliveryMode)}`,
      `- 目标平台：${targetLabel}`,
      "",
      "## 参考图上传顺序",
      "请按以下顺序上传已锁定的参考图；参考图优先用于保持人物、场景与关键道具连续。",
      referenceLines,
      "",
      "## 生成执行要求",
      `- ${modeLine}`,
      "- 以参考图中的角色身份、服装、发型、体态、场景结构和关键道具为准，不得替换为相似但不同的对象。",
      "- 无字幕、无水印、无画面内文字；除非提示词明确要求，不添加背景音乐。",
      "",
      "## 完整提示词",
      "```text",
      prompt,
      "```"
    ].join("\n");
    return {
      target: normalizedTarget,
      targetLabel,
      title: `${targetLabel}｜${label}交付包`,
      filename: modelPackageFilename(project, scene, shot, normalizedTarget),
      label,
      durationSeconds,
      deliveryMode,
      prompt,
      references,
      markdown
    };
  }

  function markdownFence(value) {
    const longest = [...String(value || "").matchAll(/`+/g)].reduce((max, match) => Math.max(max, match[0].length), 0);
    return "`".repeat(Math.max(3, longest + 1));
  }

  function buildSceneDelivery(project, scene) {
    // Scene shot order is authored sequencing; IDs are not a reliable timeline key after edits.
    const shots = (Array.isArray(scene?.shots) ? scene.shots : [])
      .map((shot, index) => {
        const readiness = projectShotReadiness(project, scene, shot);
        return {
          index: index + 1,
          label: shotLabel(scene, index),
          durationSeconds: Number(shot?.durationSeconds || 0),
          deliveryMode: text(shot?.deliveryMode) || "seedance15",
          targetModel: text(shot?.targetModel) || "general",
          status: text(shot?.status) || "planned",
          statusLabel: SHOT_STATUS_LABELS[shot?.status] || SHOT_STATUS_LABELS.planned,
          ready: readiness.ready === true,
          missing: Array.isArray(readiness.missing) ? readiness.missing : [],
          prompt: deliveryPrompt(project, scene, shot),
          selectedResult: selectedProductionResult(shot)
        };
      });
    return {
      number: Number(scene?.number || 0),
      title: text(scene?.title) || text(scene?.setting) || "未命名场次",
      setting: text(scene?.setting),
      time: text(scene?.time),
      storyBeat: text(scene?.storyBeat),
      status: scene?.status === "approved" ? "已锁定" : "草案",
      estimatedDurationSeconds: Number(scene?.estimatedDurationSeconds || 0),
      assets: sceneAssets(project, scene),
      shots
    };
  }

  function markdownForScene(scene) {
    const assets = scene.assets.length
      ? scene.assets.map((asset) => [
        `- ${asset.id}｜${asset.name}${asset.detail ? `：${asset.detail}` : ""}`,
        asset.referenceIds.length ? `  - 参考图：${asset.referenceIds.join("、")}` : "",
        asset.referenceRule ? `  - 锁定规则：${asset.referenceRule}` : ""
      ].filter(Boolean).join("\n")).join("\n")
      : "- 未锁定本场资产";
    const shots = scene.shots.map((shot) => {
      const fence = markdownFence(shot.prompt);
      const result = shot.selectedResult;
      const selectedResult = result ? [
        "",
        "### 选定生成结果",
        result.versionLabel ? `- 版本：${result.versionLabel}` : "",
        result.platform || result.modelVersion ? `- 平台 / 模型：${[result.platform, result.modelVersion].filter(Boolean).join(" / ")}` : "",
        result.seed ? `- Seed：${result.seed}` : "",
        result.resultUrl ? `- 外部结果：${result.resultUrl}` : "",
        result.notes ? `- 备注：${result.notes}` : ""
      ].filter(Boolean) : [];
      return [
        `### ${shot.label}`,
        `- 时长：${shot.durationSeconds} 秒`,
        `- 交付模式：${deliveryModeLabel(shot.deliveryMode)}`,
        `- 目标模型：${shot.targetModel}`,
        `- 制作状态：${shot.statusLabel}`,
        `- 生成就绪：${shot.ready ? "是" : "否"}`,
        shot.ready ? "" : `- 待补条件：${shot.missing.join("、") || "请检查镜头信息"}`,
        "",
        `${fence}text`,
        shot.prompt,
        fence,
        ...selectedResult
      ].filter(Boolean).join("\n");
    }).join("\n\n");
    return [
      `## 场 ${String(scene.number).padStart(2, "0")}｜${scene.title}`,
      `- 场次状态：${scene.status}`,
      `- 场次预计：${scene.estimatedDurationSeconds || scene.shots.reduce((total, shot) => total + shot.durationSeconds, 0)} 秒`,
      scene.setting ? `- 地点 / 时间：${[scene.setting, scene.time].filter(Boolean).join(" · ")}` : "",
      scene.storyBeat ? `- 叙事任务：${scene.storyBeat}` : "",
      "",
      "### 锁定资产与参考",
      assets,
      "",
      shots || "本场尚未拆分镜头。"
    ].filter(Boolean).join("\n");
  }

  function buildProjectShotDelivery(project = {}) {
    const scenes = [...(Array.isArray(project.scenes) ? project.scenes : [])]
      .sort(byNumber)
      .map((scene) => buildSceneDelivery(project, scene));
    const shots = scenes.flatMap((scene) => scene.shots);
    const summary = {
      sceneCount: scenes.length,
      shotCount: shots.length,
      readyShotCount: shots.filter((shot) => shot.ready).length,
      pendingShotCount: shots.filter((shot) => !shot.ready).length
    };
    const title = text(project.name) || "未命名电影项目";
    const bible = project.visualBible && typeof project.visualBible === "object" ? project.visualBible : {};
    const markdown = [
      `# ${title}｜镜头交付包`,
      "",
      `- 场次：${summary.sceneCount}`,
      `- 镜头：${summary.shotCount}`,
      `- 已就绪：${summary.readyShotCount} / ${summary.shotCount}`,
      `- 待补：${summary.pendingShotCount}`,
      "",
      "## 项目视觉母版",
      `- 情绪：${text(bible.mood) || "待确定"}`,
      `- 色彩：${text(bible.colorDirection) || "待确定"}`,
      `- 光影：${text(bible.lightingDirection) || "待确定"}`,
      `- 摄影与材质：${[text(bible.cameraDirection), text(bible.materialDirection)].filter(Boolean).join("；") || "待确定"}`,
      "",
      "---",
      "",
      ...scenes.map(markdownForScene)
    ].join("\n");
    return { title, filename: safeFilename(title), summary, scenes, markdown };
  }

  const api = { buildProjectShotDelivery, buildShotModelPackage, safeFilename };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.aigcProjectDelivery = api;
})(typeof window !== "undefined" ? window : globalThis);
