(function initProjectShotContinuity(root) {
  function text(value) {
    return String(value || "").trim();
  }

  function orderedScenes(project) {
    return [...(Array.isArray(project?.scenes) ? project.scenes : [])]
      .sort((left, right) => Number(left?.number || 0) - Number(right?.number || 0));
  }

  function shotIndex(scene, shot) {
    return (Array.isArray(scene?.shots) ? scene.shots : []).findIndex((item) => item?.id === shot?.id);
  }

  function predecessorOf(project, scene, shot) {
    const index = shotIndex(scene, shot);
    if (index > 0) return { scene, shot: scene.shots[index - 1], shotIndex: index - 1 };
    const scenes = orderedScenes(project);
    const sceneIndex = scenes.findIndex((item) => item?.id === scene?.id);
    for (let indexBefore = sceneIndex - 1; indexBefore >= 0; indexBefore -= 1) {
      const candidate = scenes[indexBefore];
      const shots = Array.isArray(candidate?.shots) ? candidate.shots : [];
      if (shots.length) return { scene: candidate, shot: shots[shots.length - 1], shotIndex: shots.length - 1 };
    }
    return null;
  }

  function sceneAssets(project, scene) {
    const ids = new Set((Array.isArray(scene?.assetIds) ? scene.assetIds : []).map(text).filter(Boolean));
    return (Array.isArray(project?.assetLocks) ? project.assetLocks : [])
      .filter((asset) => ids.has(text(asset?.id)))
      .map((asset) => ({ id: text(asset.id), kind: text(asset.kind), name: text(asset.name), detail: text(asset.detail) }))
      .filter((asset) => asset.id && asset.name);
  }

  function cardValue(scene, shot, field) {
    const card = shot?.promptCard && typeof shot.promptCard === "object" ? shot.promptCard : {};
    const sceneCard = scene?.videoCard && typeof scene.videoCard === "object" ? scene.videoCard : {};
    return text(card[field] || sceneCard[field] || scene?.[field]);
  }

  function listValue(value) {
    return text(value).split(/[、,，；;\n]/).map(text).filter(Boolean);
  }

  function directionCue(value) {
    const source = text(value);
    const cues = ["由左向右", "由右向左", "向左", "向右", "背对", "面向", "左侧", "右侧"];
    return cues.find((cue) => source.includes(cue)) || "";
  }

  function shotIdentity(scene, shot, shotPosition) {
    return {
      sceneNumber: Number(scene?.number || 1),
      shotNumber: Math.max(1, Number(shotPosition || 0) + 1),
      sceneTitle: text(scene?.title) || text(scene?.setting) || "未命名场次"
    };
  }

  function buildShotContinuity(project = {}, scene = {}, shot = {}) {
    const predecessor = predecessorOf(project, scene, shot);
    const currentIdentity = shotIdentity(scene, shot, shotIndex(scene, shot));
    if (!predecessor) return {
      status: "first",
      hasPredecessor: false,
      predecessor: null,
      current: currentIdentity,
      blockers: [],
      warnings: [],
      issues: []
    };

    const previousAssets = sceneAssets(project, predecessor.scene);
    const currentAssets = sceneAssets(project, scene);
    const previousCharacters = previousAssets.filter((asset) => asset.kind === "character");
    const currentCharacters = currentAssets.filter((asset) => asset.kind === "character");
    const blockers = [];
    previousCharacters.forEach((asset) => {
      const sameName = currentCharacters.find((candidate) => candidate.name === asset.name);
      if (sameName && sameName.id !== asset.id) {
        blockers.push({
          level: "blocker",
          field: "characters",
          label: "角色母版不一致",
          detail: `${asset.name} 上一镜引用 ${asset.id}，本镜引用 ${sameName.id}。请确认同一角色只使用同一母版。`
        });
      }
    });
    const warnings = [];
    const previousSetting = cardValue(predecessor.scene, predecessor.shot, "setting");
    const currentSetting = cardValue(scene, shot, "setting");
    if (previousSetting && currentSetting && previousSetting !== currentSetting) {
      warnings.push({ level: "warning", field: "setting", label: "场景发生切换", detail: `上一镜为“${previousSetting}”，本镜为“${currentSetting}”。请确认转场与空间衔接。` });
    }
    const previousTime = cardValue(predecessor.scene, predecessor.shot, "time");
    const currentTime = cardValue(scene, shot, "time");
    if (previousTime && currentTime && previousTime !== currentTime) {
      warnings.push({ level: "warning", field: "time", label: "时间发生变化", detail: `上一镜为“${previousTime}”，本镜为“${currentTime}”。请确认是否需要明确时间跳切。` });
    }
    const previousProps = listValue(cardValue(predecessor.scene, predecessor.shot, "props"));
    const currentProps = listValue(cardValue(scene, shot, "props"));
    const missingProps = previousProps.filter((prop) => !currentProps.includes(prop));
    if (previousProps.length && currentProps.length && missingProps.length) {
      warnings.push({ level: "warning", field: "props", label: "关键道具需核对", detail: `上一镜出现“${missingProps.slice(0, 3).join("、")}”，本镜未写入。若仍在画面中，请补入本镜道具。` });
    }
    const previousDirection = directionCue(`${cardValue(predecessor.scene, predecessor.shot, "movement")} ${cardValue(predecessor.scene, predecessor.shot, "beatPlan")}`);
    const currentDirection = directionCue(`${cardValue(scene, shot, "movement")} ${cardValue(scene, shot, "beatPlan")}`);
    if (previousDirection && currentDirection && previousDirection !== currentDirection) {
      warnings.push({ level: "warning", field: "beatPlan", label: "运动方向需核对", detail: `上一镜为“${previousDirection}”，本镜为“${currentDirection}”。请确认轴线与人物移动方向。` });
    }
    const issues = [...blockers, ...warnings];
    return {
      status: blockers.length ? "blocked" : warnings.length ? "warning" : "ready",
      hasPredecessor: true,
      predecessor: shotIdentity(predecessor.scene, predecessor.shot, predecessor.shotIndex),
      current: currentIdentity,
      blockers,
      warnings,
      issues
    };
  }

  const api = { buildShotContinuity };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.aigcProjectShotContinuity = api;
})(typeof window !== "undefined" ? window : globalThis);
