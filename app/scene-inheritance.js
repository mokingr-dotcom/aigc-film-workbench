(function initSceneInheritance(root) {
  function text(value, limit = 220) { return String(value || "").trim().slice(0, limit); }
  function join(values, limit = 220) { return text(values.filter(Boolean).join("；"), limit); }
  function first(value) { return Array.isArray(value) ? value.find((item) => item && typeof item === "object") || {} : {}; }

  function deriveProjectSceneInheritance(project) {
    const workspaces = project?.workspaces && typeof project.workspaces === "object" ? project.workspaces : {};
    const bible = project?.visualBible && typeof project.visualBible === "object" ? project.visualBible : {};
    const toneState = workspaces.tone && typeof workspaces.tone === "object" ? workspaces.tone : {};
    const tone = first(toneState.selectedDetails);
    const casting = workspaces.casting && typeof workspaces.casting === "object" ? workspaces.casting : {};
    const cameraState = workspaces.camera && typeof workspaces.camera === "object" ? workspaces.camera : {};
    const camera = cameraState.selectedDetail && typeof cameraState.selectedDetail === "object" ? cameraState.selectedDetail : {};
    const music = workspaces.music && typeof workspaces.music === "object" ? workspaces.music : {};

    const characterValue = join([casting.role, casting.age, casting.body, casting.costume, casting.traits], 260);
    const toneColor = text(bible.colorDirection || tone.color || tone.palette || tone.mood || toneState.mood);
    const toneLighting = text(bible.lightingDirection || tone.lighting);
    const toneTexture = text(bible.cameraDirection || tone.camera || tone.texture);
    const cameraValue = join([camera.name, cameraState.scene, cameraState.look, cameraState.action], 260);
    const cameraFraming = text(cameraState.framing || "");
    const cameraMovement = text(cameraState.movement || cameraState.action || "");
    const musicValue = join([music.sceneZh, music.coreEmotion, music.intensity, music.structure?.opening], 220);

    return {
      character: { label: "角色母版", value: characterValue, detail: text(casting.role || "尚未选择角色定妆") },
      tone: { label: "影调母版", color: toneColor, lighting: toneLighting, texture: toneTexture, detail: join([toneColor, toneLighting], 120) || "尚未选择影调" },
      camera: { label: "镜头母版", value: cameraValue, framing: cameraFraming, movement: cameraMovement, detail: text(camera.name || cameraState.selected?.id || "尚未选择运镜") },
      music: {
        label: "配乐母版",
        value: musicValue,
        detail: text(musicValue || "尚未选择配乐"),
        prompt: musicValue ? `配乐后期单独生成：${musicValue}。当前视频生成不要背景音乐，只保留环境声。` : ""
      }
    };
  }

  const api = { deriveProjectSceneInheritance };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.aigcSceneInheritance = api;
})(typeof window !== "undefined" ? window : globalThis);
