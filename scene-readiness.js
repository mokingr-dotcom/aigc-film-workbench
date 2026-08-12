(function initSceneReadiness(root) {
  function text(value) {
    return String(value || "").trim();
  }

  function firstShot(scene) {
    return Array.isArray(scene?.shots) ? scene.shots.find((shot) => shot && typeof shot === "object") || {} : {};
  }

  function joinCharacters(value) {
    return Array.isArray(value) ? value.map(text).filter(Boolean).join("、") : text(value);
  }

  function characterKey(value) {
    return text(value, 120).split(/[、,，；;（(]/)[0].trim().toLocaleLowerCase();
  }

  function locationKey(value) {
    return text(value, 160).toLocaleLowerCase();
  }

  function sceneAssetIds(scene) {
    return new Set((Array.isArray(scene?.assetIds) ? scene.assetIds : [])
      .filter((id) => typeof id === "string")
      .map((id) => id.trim()));
  }

  function hasPureEnvironmentIntent(scene, shot) {
    const card = shot?.promptCard && typeof shot.promptCard === "object" ? shot.promptCard : {};
    const sceneCard = scene?.videoCard && typeof scene.videoCard === "object" ? scene.videoCard : {};
    const source = [card.narrative, card.action, sceneCard.narrative, scene?.storyBeat, scene?.action].map(text).join(" ");
    return /空镜|无人|无人物|环境镜头|建立(?:空间|环境|场景)|风景|城市全景/.test(source);
  }

  function continuityItems(project, scene, characters, setting) {
    const assetIds = sceneAssetIds(scene);
    const masters = Array.isArray(project?.assetLocks) ? project.assetLocks : [];
    const characterKeys = (Array.isArray(characters) ? characters : String(characters || "").split(/[、,，\n]/))
      .map(characterKey).filter(Boolean);
    const location = locationKey(setting);
    const items = [];
    masters.forEach((master) => {
      if (!master || typeof master !== "object" || !text(master.id)) return;
      const kind = master.kind;
      const name = kind === "character" ? characterKey(master.name) : locationKey(master.name);
      const sameCharacter = kind === "character" && name && characterKeys.includes(name);
      const sameLocation = kind === "location" && name && location === name;
      if (!sameCharacter && !sameLocation) return;
      const label = kind === "character" ? `角色参考资产 ${text(master.id)}` : `场景参考资产 ${text(master.id)}`;
      items.push({
        id: `continuity-${kind}-${text(master.id)}`,
        label,
        ready: assetIds.has(text(master.id)),
        source: assetIds.has(text(master.id)) ? "已绑定本场" : `同名母版“${text(master.name)}”未引用`
      });
    });
    return items;
  }

  function assessShotReadiness(project = {}, scene = {}, shot = {}) {
    const sceneCard = scene.videoCard && typeof scene.videoCard === "object" ? scene.videoCard : {};
    const shotCard = shot.promptCard && typeof shot.promptCard === "object" ? shot.promptCard : {};
    const bible = project.visualBible && typeof project.visualBible === "object" ? project.visualBible : {};
    const workspaces = project.workspaces && typeof project.workspaces === "object" ? project.workspaces : {};
    const casting = workspaces.casting && typeof workspaces.casting === "object" ? workspaces.casting : {};
    const camera = workspaces.camera && typeof workspaces.camera === "object" ? workspaces.camera : {};
    const narrative = text(shotCard.narrative || sceneCard.narrative || scene.storyBeat);
    const characters = joinCharacters(sceneCard.characters || scene.characters);
    const masterCharacter = text(casting.role || casting.identity?.name || casting.identityBoard?.character);
    const setting = text(sceneCard.setting || scene.setting);
    const action = text(shotCard.action || shot.action || sceneCard.action || scene.action);
    const color = text(sceneCard.color || scene.visualOverride?.colorDirection || bible.colorDirection);
    const lighting = text(sceneCard.lighting || scene.visualOverride?.lightingDirection || bible.lightingDirection);
    const framing = text(shotCard.framing || shot.framing || sceneCard.framing || camera.selectedDetail?.name || camera.selected?.id);
    const movement = text(shotCard.movement || shot.movement || sceneCard.movement || camera.action || camera.movement);
    const sound = text(shotCard.sound || shot.sound || sceneCard.sound);
    const negatives = [
      ...(Array.isArray(shot.negativeConstraints) ? shot.negativeConstraints : []),
      sceneCard.negatives,
      ...(Array.isArray(bible.negativeConstraints) ? bible.negativeConstraints : [])
    ].map(text).filter(Boolean).join("；");
    const environmentOnly = !characters && !masterCharacter && hasPureEnvironmentIntent(scene, shot);
    const items = [
      { id: "narrative", label: "叙事", ready: Boolean(narrative), source: narrative ? (shotCard.narrative ? "当前镜头" : "本场内容") : "待补充" },
      { id: "subject", label: "主体/人物", ready: Boolean(characters || masterCharacter || environmentOnly), source: characters ? "本场出场人物" : masterCharacter ? "项目母版" : environmentOnly ? "空镜豁免" : "待补充" },
      { id: "setting", label: "地点", ready: Boolean(setting), source: setting ? "本场内容" : "待补充" },
      { id: "action", label: "可见动作", ready: Boolean(action || environmentOnly), source: action ? (shotCard.action ? "当前镜头" : "本场默认") : environmentOnly ? "空镜豁免" : "待补充" },
      { id: "tone", label: "影调", ready: Boolean(color && lighting), source: color && lighting ? (sceneCard.color || sceneCard.lighting || scene.visualOverride?.colorDirection || scene.visualOverride?.lightingDirection ? "本场设定" : "项目母版") : "待补充" },
      { id: "camera", label: "景别与运镜", ready: Boolean(framing && movement), source: framing && movement ? (shotCard.framing || shotCard.movement || shot.framing || shot.movement ? "当前镜头" : sceneCard.framing || sceneCard.movement ? "本场默认" : "项目母版") : "待补充" },
      { id: "sound", label: "声音与限制", ready: Boolean(sound && negatives), source: sound && negatives ? "当前镜头 / 本场限制" : "待补充" },
      ...continuityItems(project, scene, characters, setting)
    ];
    const missing = items.filter((item) => !item.ready).map((item) => item.label);
    return { ready: missing.length === 0, complete: items.length - missing.length, total: items.length, missing, items };
  }

  function assessSceneReadiness(scene = {}, project = {}) {
    const card = scene.videoCard && typeof scene.videoCard === "object" ? scene.videoCard : {};
    const shot = firstShot(scene);
    const bible = project.visualBible && typeof project.visualBible === "object" ? project.visualBible : {};
    const workspaces = project.workspaces && typeof project.workspaces === "object" ? project.workspaces : {};
    const casting = workspaces.casting && typeof workspaces.casting === "object" ? workspaces.casting : {};
    const camera = workspaces.camera && typeof workspaces.camera === "object" ? workspaces.camera : {};

    const narrative = text(card.narrative || scene.storyBeat);
    const sceneCharacters = joinCharacters(card.characters || scene.characters);
    const masterCharacter = text(casting.role);
    const setting = text(card.setting || scene.setting);
    const sceneTone = text(card.color || scene.visualOverride?.colorDirection) && text(card.lighting || scene.visualOverride?.lightingDirection);
    const masterTone = text(bible.colorDirection) && text(bible.lightingDirection);
    const sceneCamera = text(card.framing || shot.framing) && text(card.movement || shot.movement);
    const masterCamera = text(camera.selectedDetail?.name || camera.selected?.id) && text(camera.action || camera.movement);

    const items = [
      { id: "narrative", label: "叙事", ready: Boolean(narrative), source: narrative ? "本场内容" : "待补充" },
      { id: "character", label: "人物", ready: Boolean(sceneCharacters || masterCharacter), source: sceneCharacters ? "本场内容" : masterCharacter ? "项目母版" : "待补充" },
      { id: "setting", label: "地点", ready: Boolean(setting), source: setting ? "本场内容" : "待补充" },
      { id: "tone", label: "影调", ready: Boolean(sceneTone || masterTone), source: sceneTone ? "本场内容" : masterTone ? "项目母版" : "待补充" },
      { id: "camera", label: "镜头", ready: Boolean(sceneCamera || masterCamera), source: sceneCamera ? "本场镜头" : masterCamera ? "项目母版" : "待补充" }
    ];
    const missing = items.filter((item) => !item.ready).map((item) => item.label);
    return {
      ready: missing.length === 0,
      complete: items.length - missing.length,
      total: items.length,
      missing,
      items
    };
  }

  const api = { assessSceneReadiness, assessShotReadiness };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.aigcSceneReadiness = api;
})(typeof window !== "undefined" ? window : globalThis);
