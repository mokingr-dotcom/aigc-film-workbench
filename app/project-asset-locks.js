(function initProjectAssetLocks(root) {
  const LIMIT = 80;
  const SCENE_LIMIT = 12;
  const MASTER_VERSION_LIMIT = 12;
  const KINDS = Object.freeze({ character: "CHAR", location: "LOC", prop: "PROP" });
  const MASTER_STATUSES = Object.freeze({
    draft: "待确认",
    needs_master: "待生成母版",
    has_reference: "已有参考图",
    review: "待验收",
    locked: "已锁定",
    revision: "需返工"
  });

  function text(value, limit = 180) {
    return String(value || "").trim().replace(/\s+/g, " ").slice(0, limit);
  }

  function normalized(value) {
    return text(value).toLocaleLowerCase();
  }

  function assetKind(value) {
    return Object.prototype.hasOwnProperty.call(KINDS, value) ? value : "";
  }

  function normalizeReferenceIds(value) {
    return [...new Set((Array.isArray(value) ? value : [])
      .filter((id) => typeof id === "string" && /^project-ref-[a-z0-9-]+$/i.test(id.trim()))
      .map((id) => id.trim().slice(0, 120)))].slice(0, 6);
  }

  function normalizeMasterVersions(value) {
    const seen = new Set();
    return (Array.isArray(value) ? value : []).map((item, index) => {
      const source = item && typeof item === "object" && !Array.isArray(item) ? item : {};
      const id = text(source.id || `master-v${index + 1}`, 80);
      if (!id || seen.has(id)) return null;
      seen.add(id);
      return {
        id,
        label: text(source.label || `V${index + 1}`, 30),
        referenceAssetIds: normalizeReferenceIds(source.referenceAssetIds),
        detail: text(source.detail, 220),
        referenceRule: text(source.referenceRule, 280),
        masterStatus: Object.prototype.hasOwnProperty.call(MASTER_STATUSES, source.masterStatus) ? source.masterStatus : "has_reference",
        note: text(source.note, 160),
        createdAt: text(source.createdAt, 40)
      };
    }).filter(Boolean).slice(-MASTER_VERSION_LIMIT);
  }

  function normalizeAsset(asset, index = 0) {
    const source = asset && typeof asset === "object" && !Array.isArray(asset) ? asset : {};
    const kind = assetKind(source.kind);
    const prefix = KINDS[kind] || "ASSET";
    const fallbackId = `${prefix}-${String(index + 1).padStart(3, "0")}`;
    const referenceAssetIds = normalizeReferenceIds(source.referenceAssetIds);
    const requestedStatus = Object.prototype.hasOwnProperty.call(MASTER_STATUSES, source.masterStatus)
      ? source.masterStatus
      : referenceAssetIds.length ? "has_reference" : "needs_master";
    const masterVersions = normalizeMasterVersions(source.masterVersions);
    const activeMasterVersionId = masterVersions.some((version) => version.id === source.activeMasterVersionId)
      ? source.activeMasterVersionId
      : "";
    return {
      id: text(source.id || fallbackId, 40),
      kind,
      name: text(source.name, 120),
      detail: text(source.detail, 220),
      referenceAssetIds,
      referenceRule: text(source.referenceRule, 280),
      masterStatus: requestedStatus,
      source: text(source.source || "项目场次", 60),
      masterVersions,
      activeMasterVersionId
    };
  }

  function normalizeAssetLocks(value) {
    const ids = new Set();
    return (Array.isArray(value) ? value : []).map(normalizeAsset).filter((asset) => asset.kind && asset.name && !ids.has(asset.id) && ids.add(asset.id)).slice(0, LIMIT);
  }

  function normalizeSceneAssetIds(value) {
    return [...new Set((Array.isArray(value) ? value : []).filter((id) => typeof id === "string" && text(id, 40)).map((id) => text(id, 40)))].slice(0, SCENE_LIMIT);
  }

  function nextId(assetLocks, kind) {
    const prefix = KINDS[kind];
    const greatest = assetLocks.reduce((max, asset) => {
      if (asset.kind !== kind) return max;
      const match = asset.id.match(new RegExp(`^${prefix}-(\\d+)$`));
      return Math.max(max, Number(match?.[1] || 0));
    }, 0);
    return `${prefix}-${String(greatest + 1).padStart(3, "0")}`;
  }

  function propNames(value) {
    return text(value, 260).split(/[、,，\n；;]/).map((name) => text(name, 100)).filter(Boolean).slice(0, 4);
  }

  function characterNames(value) {
    const values = Array.isArray(value) ? value : text(value, 260).split(/[、,，\n；;]/);
    return values.map((name) => text(name, 100)).filter(Boolean).slice(0, 12);
  }

  function inferredCharacterNames(scene) {
    const source = text([scene?.sourceExcerpt, scene?.storyBeat, scene?.action].filter(Boolean).join(" "), 900);
    const names = [];
    const expression = /(?:^|[。！？；，、\s]|清晨|早晨|夜晚|深夜|雨夜|凌晨|白天|傍晚)([\u4e00-\u9fff]{2,3})(?=(?:握|望|把|转|走|说|看|听|停|进|出|跑|坐|站|抬|低|靠|拿|放|回头|离开|进入))/g;
    let match;
    while ((match = expression.exec(source))) names.push(match[1]);
    return characterNames(names).filter((name) => !/^(人物|镜头|场景|空间|本场|动作|情绪)$/.test(name));
  }

  function inferredPropNames(scene) {
    const source = text([scene?.sourceExcerpt, scene?.storyBeat, scene?.action].filter(Boolean).join(" "), 900);
    const names = [];
    const expression = /(?:^|[，。；、\s]|握住|拿起|塞进|放下|看见|掏出|递出)((?:红色|黑色|白色|银色|旧|破旧|染血|金属|皮质|木质)?(?:信封|手枪|钥匙|照片|手机|文件|箱子|皮包|证物|杯子|手表|匕首|汽车|日记|录音笔|项链))/g;
    let match;
    while ((match = expression.exec(source))) names.push(match[1]);
    return propNames(names);
  }

  function characterKey(value) {
    return normalized(text(value, 120).split(/[、,，；;（(]/)[0]);
  }

  function candidateKey(candidate) {
    const name = candidate.kind === "character" ? characterKey(candidate.name) : normalized(candidate.name);
    return `${candidate.kind}:${name}`;
  }

  function isProductionPlaceholder(value) {
    const name = text(value, 120);
    return !name
      || /^(补充|待补|未填写|暂无)/.test(name)
      || name === "出场人物"
      || name === "内外景、地点与空间关系";
  }

  function uniqueCandidates(candidates) {
    const seen = new Set();
    return candidates.filter((candidate) => {
      const key = candidateKey(candidate);
      return candidate.kind && !isProductionPlaceholder(candidate.name) && !seen.has(key) && seen.add(key);
    });
  }

  function candidateAssets(project, scene, { includeCasting = true } = {}) {
    const workspaces = project?.workspaces && typeof project.workspaces === "object" ? project.workspaces : {};
    const casting = workspaces.casting && typeof workspaces.casting === "object" ? workspaces.casting : {};
    const card = scene?.videoCard && typeof scene.videoCard === "object" ? scene.videoCard : {};
    const candidates = [];
    const role = text(casting.role || casting.identity?.name || casting.identityBoard?.character, 120);
    if (includeCasting && role) candidates.push({ kind: "character", id: text(casting.id, 40), name: role, detail: text([casting.costume, casting.traits].filter(Boolean).join("；"), 220), source: "角色定妆" });
    characterNames(card.characters || scene?.characters).forEach((name) => {
      candidates.push({ kind: "character", name, detail: text(card.emotion || scene?.emotion, 120), source: "本场出场人物" });
    });
    if (!characterNames(card.characters || scene?.characters).length) {
      inferredCharacterNames(scene).forEach((name) => candidates.push({ kind: "character", name, detail: "从剧本原文识别，待确认外形与身份", source: "剧本原文线索" }));
    }
    const location = text(card.setting || scene?.setting, 120);
    if (location) candidates.push({ kind: "location", name: location, detail: text(card.time || scene?.time, 120), source: "本场空间" });
    propNames(card.props).forEach((name) => candidates.push({ kind: "prop", name, detail: "本场关键物件", source: "本场道具" }));
    if (!propNames(card.props).length) {
      inferredPropNames(scene).forEach((name) => candidates.push({ kind: "prop", name, detail: "从剧本原文识别，待确认是否为连续性道具", source: "剧本原文线索" }));
    }
    return uniqueCandidates(candidates);
  }

  function projectCandidateAssets(project = {}) {
    const scenes = Array.isArray(project.scenes) ? project.scenes : [];
    const candidates = scenes.flatMap((scene) => candidateAssets(project, scene, { includeCasting: false }));
    return uniqueCandidates(candidates);
  }

  function matches(asset, candidate) {
    const sameName = asset.kind === "character"
      ? characterKey(asset.name) === characterKey(candidate.name)
      : normalized(asset.name) === normalized(candidate.name);
    return asset.kind === candidate.kind && sameName;
  }

  function assetLockPreview(project = {}, scene = {}) {
    const assetLocks = normalizeAssetLocks(project.assetLocks);
    const sceneAssetIds = normalizeSceneAssetIds(scene.assetIds);
    const candidates = candidateAssets(project, scene);
    const pending = candidates.filter((candidate) => {
      const locked = assetLocks.find((asset) => matches(asset, candidate));
      return !locked || !sceneAssetIds.includes(locked.id);
    });
    return { candidates, pending };
  }

  function lockSceneAssets(project = {}, scene = {}, requestedKinds = Object.keys(KINDS)) {
    const kinds = [...new Set((Array.isArray(requestedKinds) ? requestedKinds : []).map(assetKind).filter(Boolean))];
    const assetLocks = normalizeAssetLocks(project.assetLocks);
    const sceneAssetIds = normalizeSceneAssetIds(scene.assetIds);
    const added = [];
    candidateAssets(project, scene).filter((candidate) => kinds.includes(candidate.kind)).forEach((candidate) => {
      let asset = assetLocks.find((item) => matches(item, candidate));
      if (!asset) {
        asset = normalizeAsset({ ...candidate, id: candidate.id || nextId(assetLocks, candidate.kind) }, assetLocks.length);
        assetLocks.push(asset);
        added.push(asset);
      }
      if (!sceneAssetIds.includes(asset.id) && sceneAssetIds.length < SCENE_LIMIT) sceneAssetIds.push(asset.id);
    });
    return {
      project: { ...project, assetLocks },
      scene: { ...scene, assetIds: sceneAssetIds },
      added
    };
  }

  function assetsForScene(project = {}, scene = {}) {
    const assetLocks = normalizeAssetLocks(project.assetLocks);
    const assetIds = normalizeSceneAssetIds(scene.assetIds);
    const assets = assetIds.map((id) => assetLocks.find((asset) => asset.id === id)).filter(Boolean);
    const textAssets = assets.filter((asset) => !asset.referenceAssetIds.length);
    const referenceLines = assets.flatMap((asset) => {
      if (!asset.referenceAssetIds.length) return [];
      const label = asset.kind === "character" ? "角色参考资产" : asset.kind === "location" ? "场景参考资产" : "道具参考资产";
      const fallbackRule = asset.kind === "character"
        ? "严格保持脸部、发型、服装、体型与身份一致"
        : asset.kind === "location" ? "严格保持空间结构、主光方向、关键物件与环境关系一致" : "严格保持道具外形、材质、尺寸、颜色、磨损状态与位置连续一致";
      return [`${label}：${asset.id} ${asset.name}，需随生成请求附带参考图 ${asset.referenceAssetIds.join("、")}；${asset.referenceRule || fallbackRule}。`];
    });
    const prompt = [
      textAssets.length ? `引用锁定资产：${textAssets.map((asset) => `${asset.id} ${asset.name}`).join("；")}。不得更换人物身份、空间结构或关键物件。` : "",
      ...referenceLines
    ].filter(Boolean).join("\n");
    return { assets, prompt };
  }

  function assetLedger(project = {}) {
    const assetLocks = normalizeAssetLocks(project.assetLocks);
    const scenes = Array.isArray(project.scenes) ? project.scenes : [];
    const records = assetLocks.map((asset) => {
      const references = scenes
        .filter((scene) => normalizeSceneAssetIds(scene?.assetIds).includes(asset.id))
        .map((scene) => ({ id: text(scene.id, 60), number: Number(scene.number) || 0, title: text(scene.title, 100) || `第 ${String(Number(scene.number) || 1).padStart(2, "0")} 场` }));
      const attention = !references.length
        ? "未被任何场次引用"
        : asset.masterStatus === "needs_master" ? "需要建立母版或上传参考图"
          : asset.masterStatus === "has_reference" ? "已有参考图，待人工验收后锁定"
            : asset.masterStatus === "revision" ? "母版需返工后重新验收"
        : asset.kind === "character" && !asset.detail ? "建议补充外形或服装细节"
          : asset.kind === "location" && !asset.detail ? "建议补充时间或空间细节"
            : "";
      return { ...asset, references, referenceCount: references.length, attention };
    });
    const byKind = Object.keys(KINDS).reduce((groups, kind) => ({ ...groups, [kind]: records.filter((asset) => asset.kind === kind) }), {});
    return {
      assets: records,
      byKind,
      referencedCount: records.filter((asset) => asset.referenceCount > 0).length,
      unreferencedCount: records.filter((asset) => !asset.referenceCount).length,
      attentionCount: records.filter((asset) => asset.attention).length
    };
  }

  function syncProjectAssetLedger(project = {}) {
    const sourceProject = project && typeof project === "object" ? project : {};
    const assetLocks = normalizeAssetLocks(sourceProject.assetLocks);
    const scenes = Array.isArray(sourceProject.scenes) ? sourceProject.scenes.map((scene) => ({ ...scene, assetIds: normalizeSceneAssetIds(scene?.assetIds) })) : [];
    const added = [];
    scenes.forEach((scene) => {
      candidateAssets(sourceProject, scene, { includeCasting: false }).forEach((candidate) => {
        let asset = assetLocks.find((item) => matches(item, candidate));
        if (!asset) {
          asset = normalizeAsset({ ...candidate, id: nextId(assetLocks, candidate.kind), masterStatus: "needs_master", source: "全片剧本扫描" }, assetLocks.length);
          assetLocks.push(asset);
          added.push(asset);
        }
        if (!scene.assetIds.includes(asset.id) && scene.assetIds.length < SCENE_LIMIT) scene.assetIds.push(asset.id);
      });
    });
    return { project: { ...sourceProject, assetLocks }, scenes, added };
  }

  function continuityReport(project = {}) {
    const assetLocks = normalizeAssetLocks(project.assetLocks);
    const scenes = Array.isArray(project.scenes) ? project.scenes : [];
    const issues = [];
    scenes.forEach((scene) => {
      const sceneAssetIds = normalizeSceneAssetIds(scene?.assetIds);
      candidateAssets(project, scene, { includeCasting: false }).forEach((candidate) => {
        const master = assetLocks.find((asset) => matches(asset, candidate));
        if (!master || sceneAssetIds.includes(master.id)) return;
        const kindLabel = master.kind === "character" ? "角色" : master.kind === "location" ? "场景" : "道具";
        issues.push({
          id: `${text(scene.id, 60)}:${master.id}`,
          sceneId: text(scene.id, 60),
          sceneNumber: Number(scene.number) || 0,
          sceneTitle: text(scene.title, 100) || `第 ${String(Number(scene.number) || 1).padStart(2, "0")} 场`,
          asset: master,
          candidate,
          label: `${kindLabel}“${master.name}”未引用项目母版`,
          detail: `本场已出现同名${kindLabel}，但没有引用 ${master.id}；生成时可能发生${master.kind === "character" ? "人物身份" : master.kind === "location" ? "空间" : "关键物件"}漂移。`
        });
      });
    });
    return { issues, checkedSceneCount: scenes.length, checkedAssetCount: assetLocks.length };
  }

  function pruneUnreferencedAssets(assetLocks, scenes) {
    const referencedIds = new Set((Array.isArray(scenes) ? scenes : []).flatMap((scene) => normalizeSceneAssetIds(scene?.assetIds)));
    const normalizedLocks = normalizeAssetLocks(assetLocks);
    const removed = normalizedLocks.filter((asset) => !referencedIds.has(asset.id));
    return { assetLocks: normalizedLocks.filter((asset) => referencedIds.has(asset.id)), removed };
  }

  function saveAssetMasterVersion(asset, now = new Date()) {
    const normalizedAsset = normalizeAsset(asset);
    if (!normalizedAsset.id || !normalizedAsset.referenceAssetIds.length) return normalizedAsset;
    const sequence = normalizedAsset.masterVersions.length + 1;
    const createdAt = now instanceof Date ? now.toISOString() : new Date().toISOString();
    const version = {
      id: `master-v${sequence}-${Date.parse(createdAt) || Date.now()}`,
      label: `V${sequence}`,
      referenceAssetIds: normalizedAsset.referenceAssetIds,
      detail: normalizedAsset.detail,
      referenceRule: normalizedAsset.referenceRule,
      masterStatus: normalizedAsset.masterStatus === "needs_master" ? "has_reference" : normalizedAsset.masterStatus,
      note: "正式母版快照",
      createdAt
    };
    const masterVersions = [...normalizedAsset.masterVersions, version].slice(-MASTER_VERSION_LIMIT);
    return { ...normalizedAsset, masterVersions, activeMasterVersionId: version.id };
  }

  function applyAssetMasterVersion(asset, versionId) {
    const normalizedAsset = normalizeAsset(asset);
    const version = normalizedAsset.masterVersions.find((item) => item.id === text(versionId, 80));
    if (!version) return normalizedAsset;
    return {
      ...normalizedAsset,
      referenceAssetIds: version.referenceAssetIds,
      detail: version.detail,
      referenceRule: version.referenceRule,
      masterStatus: version.masterStatus,
      activeMasterVersionId: version.id
    };
  }

  function unlockSceneAsset(project = {}, scene = {}, assetId = "") {
    const id = text(assetId, 40);
    const nextScene = { ...scene, assetIds: normalizeSceneAssetIds(scene.assetIds).filter((item) => item !== id) };
    const otherScenes = Array.isArray(project.scenes) ? project.scenes.filter((item) => item?.id !== scene?.id) : [];
    const stillReferenced = nextScene.assetIds.includes(id) || otherScenes.some((item) => normalizeSceneAssetIds(item?.assetIds).includes(id));
    const assetLocks = normalizeAssetLocks(project.assetLocks).filter((asset) => asset.id !== id || stillReferenced);
    return { project: { ...project, assetLocks }, scene: nextScene, removedFromProject: !stillReferenced };
  }

  const api = { MASTER_STATUSES, normalizeAssetLocks, normalizeSceneAssetIds, lockSceneAssets, unlockSceneAsset, assetsForScene, assetLockPreview, assetLedger, continuityReport, pruneUnreferencedAssets, projectCandidateAssets, syncProjectAssetLedger, saveAssetMasterVersion, applyAssetMasterVersion };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.aigcProjectAssetLocks = api;
})(typeof window !== "undefined" ? window : globalThis);
