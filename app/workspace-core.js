(function initWorkspaceCore(root) {
  function inspectCastingAssetReference(castingState, assetId) {
    if (castingState === undefined) return { referenced: false, version: false, uncertain: false };
    if (!castingState || typeof castingState !== "object" || Array.isArray(castingState)) {
      return { referenced: false, version: false, uncertain: true };
    }

    let uncertain = false;
    const referenceAsset = castingState.referenceAsset;
    if (referenceAsset !== undefined && referenceAsset !== null) {
      if (!referenceAsset || typeof referenceAsset !== "object" || Array.isArray(referenceAsset)) {
        uncertain = true;
      } else if (referenceAsset.id === assetId) {
        return { referenced: true, version: false, uncertain: false };
      } else if (referenceAsset.id !== undefined && typeof referenceAsset.id !== "string") {
        uncertain = true;
      }
    }

    const versions = castingState.versions;
    if (versions !== undefined && !Array.isArray(versions)) {
      uncertain = true;
    } else if (Array.isArray(versions)) {
      for (const version of versions) {
        if (!version || typeof version !== "object" || Array.isArray(version)) {
          uncertain = true;
          continue;
        }
        if (version.referenceAssetId === assetId) {
          return { referenced: true, version: true, uncertain: false };
        }
        if (version.referenceAssetId !== undefined && typeof version.referenceAssetId !== "string") {
          uncertain = true;
        }
      }
    }

    return { referenced: false, version: false, uncertain };
  }

  function decideCastingAssetRetention({ projects, activeProjectId, liveCastingState, assetId } = {}) {
    if (!assetId || !Array.isArray(projects) || !activeProjectId) {
      return { retain: true, reason: "uncertain" };
    }
    if (liveCastingState === undefined) {
      return { retain: true, reason: "uncertain" };
    }

    let activeProjectFound = false;
    let uncertain = false;
    for (const project of projects) {
      if (!project || typeof project !== "object" || Array.isArray(project)) {
        uncertain = true;
        continue;
      }

      let castingState;
      if (project.id === activeProjectId) {
        activeProjectFound = true;
        castingState = liveCastingState;
      } else if (!project.workspaces || typeof project.workspaces !== "object" || Array.isArray(project.workspaces)) {
        uncertain = true;
        continue;
      } else {
        castingState = project.workspaces.casting;
      }

      const inspection = inspectCastingAssetReference(castingState, assetId);
      if (inspection.referenced) {
        return { retain: true, reason: inspection.version ? "saved-version" : "project-reference" };
      }
      uncertain = uncertain || inspection.uncertain;
    }

    if (!activeProjectFound || uncertain) return { retain: true, reason: "uncertain" };
    return { retain: false, reason: "unreferenced" };
  }

  function collectProjectCastingAssetIds(project) {
    const castingState = project?.workspaces?.casting;
    if (!castingState || typeof castingState !== "object" || Array.isArray(castingState)) return [];

    const assetIds = [];
    if (typeof castingState.referenceAsset?.id === "string" && castingState.referenceAsset.id) {
      assetIds.push(castingState.referenceAsset.id);
    }
    if (Array.isArray(castingState.versions)) {
      castingState.versions.forEach((version) => {
        if (typeof version?.referenceAssetId === "string" && version.referenceAssetId) {
          assetIds.push(version.referenceAssetId);
        }
      });
    }
    return [...new Set(assetIds)];
  }

  function collectProjectPosterAssetIds(project) {
    const compositor = project?.workspaces?.poster?.posterCompositor;
    if (!compositor || typeof compositor !== "object" || Array.isArray(compositor)) return [];
    return [...new Set([compositor.sourceAsset?.id, compositor.titleAsset?.id]
      .filter((assetId) => typeof assetId === "string" && assetId))];
  }

  function collectProjectReferenceAssetIds(project) {
    const assetIds = [];
    const append = (value) => {
      if (typeof value === "string" && value.trim() && !assetIds.includes(value.trim())) assetIds.push(value.trim());
    };
    const values = (value) => Array.isArray(value) ? value : [];

    values(project?.creativeBrief?.referenceAssetIds).forEach(append);
    values(project?.assetLocks).forEach((asset) => {
      values(asset?.referenceAssetIds).forEach(append);
      values(asset?.masterVersions).forEach((version) => values(version?.referenceAssetIds).forEach(append));
    });
    values(project?.scenes).forEach((scene) => values(scene?.shots).forEach((shot) => {
      values(shot?.productionResults).forEach((result) => append(result?.keyframeReferenceId));
    }));
    return assetIds;
  }

  function isProjectReferenceUsed(projects, assetId) {
    if (!Array.isArray(projects) || typeof assetId !== "string" || !assetId.trim()) return true;
    const id = assetId.trim();
    const references = (value) => {
      if (value === undefined) return { ids: [], uncertain: false };
      if (!Array.isArray(value)) return { ids: [], uncertain: true };
      if (value.some((item) => typeof item !== "string")) return { ids: [], uncertain: true };
      return { ids: value, uncertain: false };
    };

    for (const project of projects) {
      if (!project || typeof project !== "object" || Array.isArray(project)) return true;
      const brief = project.creativeBrief;
      if (brief !== undefined && (!brief || typeof brief !== "object" || Array.isArray(brief))) return true;
      const briefReferences = references(brief?.referenceAssetIds);
      if (briefReferences.uncertain || briefReferences.ids.includes(id)) return true;

      if (project.assetLocks !== undefined && !Array.isArray(project.assetLocks)) return true;
      for (const asset of project.assetLocks || []) {
        if (!asset || typeof asset !== "object" || Array.isArray(asset)) return true;
        const lockReferences = references(asset.referenceAssetIds);
        if (lockReferences.uncertain || lockReferences.ids.includes(id)) return true;
        const versions = asset.masterVersions;
        if (versions !== undefined && !Array.isArray(versions)) return true;
        for (const version of versions || []) {
          if (!version || typeof version !== "object" || Array.isArray(version)) return true;
          const versionReferences = references(version.referenceAssetIds);
          if (versionReferences.uncertain || versionReferences.ids.includes(id)) return true;
        }
      }

      if (project.scenes !== undefined && !Array.isArray(project.scenes)) return true;
      for (const scene of project.scenes || []) {
        if (!scene || typeof scene !== "object" || Array.isArray(scene)) return true;
        if (scene.shots !== undefined && !Array.isArray(scene.shots)) return true;
        for (const shot of scene.shots || []) {
          if (!shot || typeof shot !== "object" || Array.isArray(shot)) return true;
          if (shot.productionResults !== undefined && !Array.isArray(shot.productionResults)) return true;
          for (const result of shot.productionResults || []) {
            if (!result || typeof result !== "object" || Array.isArray(result)) return true;
            if (result.keyframeReferenceId !== undefined && typeof result.keyframeReferenceId !== "string") return true;
            if (result.keyframeReferenceId === id) return true;
          }
        }
      }
    }
    return false;
  }

  function withoutProjectReferenceAssetIds(project) {
    const copy = JSON.parse(JSON.stringify(project || {}));
    if (copy.creativeBrief && typeof copy.creativeBrief === "object" && !Array.isArray(copy.creativeBrief)) {
      copy.creativeBrief.referenceAssetIds = [];
    }
    if (Array.isArray(copy.assetLocks)) {
      copy.assetLocks.forEach((asset) => {
        if (asset && typeof asset === "object" && !Array.isArray(asset)) {
          asset.referenceAssetIds = [];
          if (Array.isArray(asset.masterVersions)) asset.masterVersions.forEach((version) => {
            if (version && typeof version === "object" && !Array.isArray(version)) version.referenceAssetIds = [];
          });
        }
      });
    }
    if (Array.isArray(copy.scenes)) {
      copy.scenes.forEach((scene) => {
        if (!Array.isArray(scene?.shots)) return;
        scene.shots.forEach((shot) => {
          if (!Array.isArray(shot?.productionResults)) return;
          shot.productionResults.forEach((result) => {
            if (result && typeof result === "object" && !Array.isArray(result)) result.keyframeReferenceId = "";
          });
        });
      });
    }
    return copy;
  }

  async function persistThenCleanup({ assetIds = [], persistMetadata, cleanupAsset } = {}) {
    if (typeof persistMetadata !== "function" || typeof cleanupAsset !== "function") {
      throw new TypeError("缺少持久化或素材清理方法。");
    }
    await persistMetadata();
    const results = [];
    for (const assetId of [...new Set(assetIds.filter(Boolean))]) {
      results.push(await cleanupAsset(assetId));
    }
    return results;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      decideCastingAssetRetention,
      collectProjectCastingAssetIds,
      collectProjectPosterAssetIds,
      collectProjectReferenceAssetIds,
      isProjectReferenceUsed,
      withoutProjectReferenceAssetIds,
      persistThenCleanup
    };
  }

  if (!root.document) return;

  const STORAGE_KEY = "aigc-film-workbench-projects-v1";
  const storeModel = root.aigcProjectStore;
  const summaryModel = root.aigcProjectSummary;
  const navigation = root.aigcWorkspaceNavigation;
  const api = {
    tone: root.aigcToneWorkbench,
    camera: root.aigcCameraWorkbench,
    casting: root.aigcCastingWorkbench,
    poster: root.aigcPosterWorkbench,
    reverse: root.aigcReverseWorkbench,
    music: root.aigcMusicWorkbench
  };
  const requestedWorkspace = new URLSearchParams(root.location.search).get("workspace");
  const preferredWorkspace = requestedWorkspace === "project" ? "projects"
    : requestedWorkspace && api[requestedWorkspace] ? requestedWorkspace : "";

  const elements = {
    projectName: document.querySelector("#project-name"),
    saveStatus: document.querySelector("#project-save-status"),
    dialog: document.querySelector("#project-dialog"),
    open: document.querySelector("#project-center-open"),
    close: document.querySelector("#project-center-close"),
    list: document.querySelector("#project-list"),
    create: document.querySelector("#project-new"),
    duplicate: document.querySelector("#project-duplicate"),
    exportPackageButton: document.querySelector("#project-export-package"),
    exportButton: document.querySelector("#project-export"),
    importInput: document.querySelector("#project-import"),
    toast: document.querySelector("#workspace-toast"),
    toneSendCamera: document.querySelector("#tone-send-camera"),
    toneSendPoster: document.querySelector("#tone-send-poster"),
    castingSendCamera: document.querySelector("#casting-send-camera"),
    castingSendPoster: document.querySelector("#casting-send-poster")
  };

  let saveTimer = null;
  let toastTimer = null;
  let applyingProject = false;

  function projectId() {
    return `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function nowText() {
    return new Date().toISOString();
  }

  function blankProject(name = "未命名电影项目") {
    return {
      id: projectId(),
      name,
      createdAt: nowText(),
      updatedAt: nowText(),
      activeWorkspace: "tone",
      workspaces: {}
    };
  }

  function readRawStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (parsed && Array.isArray(parsed.projects) && parsed.projects.length) return parsed;
    } catch (error) {
      // A damaged local backup should not prevent the workbench from opening.
    }
    return null;
  }

  let store = storeModel.normalizeProjectStore(readRawStore(), { createBlankProject: blankProject });
  const projectListeners = new Set();

  function activeProject() {
    return store.projects.find((project) => project.id === store.activeProjectId) || store.projects[0];
  }

  function getActiveProject() {
    return JSON.parse(JSON.stringify(activeProject()));
  }

  function getProjectContext() {
    const project = getActiveProject();
    const brief = storeModel.normalizeCreativeBrief(project.creativeBrief);
    const bible = storeModel.normalizeVisualBible(project.visualBible);
    const prompt = bible.status === "locked"
      ? `项目视觉基准：${[bible.colorDirection, bible.lightingDirection, bible.cameraDirection, bible.materialDirection, ...bible.negativeConstraints].filter(Boolean).join("；")}`
      : "";
    return { project, brief, bible, prompt };
  }

  function dispatchProjectContext() {
    document.dispatchEvent(new CustomEvent("aigc:project-context", { detail: getProjectContext() }));
  }

  function queryCastingAssetReferences(assetId) {
    let liveCastingState;
    try {
      if (!api.casting || typeof api.casting.exportState !== "function") {
        return { retain: true, reason: "uncertain" };
      }
      liveCastingState = api.casting.exportState();
    } catch (error) {
      return { retain: true, reason: "uncertain" };
    }
    return decideCastingAssetRetention({
      projects: store.projects,
      activeProjectId: store.activeProjectId,
      liveCastingState,
      assetId
    });
  }

  function posterAssetIsReferenced(assetId) {
    return store.projects.some((project) => collectProjectPosterAssetIds(project).includes(assetId));
  }

  async function cleanupPosterAssetIfUnreferenced(assetId) {
    if (!assetId || posterAssetIsReferenced(assetId)) return { retained: true };
    const assetStore = root.aigcPosterAssetStore;
    if (!assetStore?.remove) return { retained: true, reason: "unavailable" };
    await assetStore.remove(assetId);
    return { retained: false };
  }

  function projectReferenceIsUsed(assetId) {
    return isProjectReferenceUsed(store.projects, assetId);
  }

  async function cleanupProjectReferenceAssetIfUnreferenced(assetId) {
    if (!assetId || projectReferenceIsUsed(assetId)) return { retained: true };
    const referenceStore = root.aigcProjectReferenceStore;
    if (!referenceStore?.remove) return { retained: true, reason: "unavailable" };
    await referenceStore.remove(assetId);
    return { retained: false };
  }

  function currentCreativeWorkspace() {
    const view = navigation.current();
    return storeModel.WORKSPACE_IDS.includes(view) ? view : activeProject()?.activeWorkspace || "tone";
  }

  function captureWorkspaces() {
    return Object.fromEntries(Object.entries(api).map(([key, workbench]) => [key, workbench?.exportState ? workbench.exportState() : {}]));
  }

  function writeStore(nextStore = store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStore));
  }

  function projectSnapshot() {
    return JSON.parse(JSON.stringify(store));
  }

  function notifyProjects() {
    const snapshot = projectSnapshot();
    projectListeners.forEach((listener) => listener(snapshot));
  }

  function commitStore(nextStore) {
    writeStore(nextStore);
    store = nextStore;
    notifyProjects();
    return projectSnapshot();
  }

  function setSaveStatus(text, saving = false) {
    elements.saveStatus.textContent = text;
    elements.saveStatus.classList.toggle("saving", saving);
  }

  function persistNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (applyingProject) {
      return Promise.reject(new Error("项目切换期间无法保存。"));
    }

    try {
      const nextStore = JSON.parse(JSON.stringify(store));
      const project = nextStore.projects.find((item) => item.id === nextStore.activeProjectId) || nextStore.projects[0];
      if (!project) throw new Error("没有可保存的项目。");
      project.name = elements.projectName.value.trim() || "未命名电影项目";
      project.updatedAt = nowText();
      const view = navigation.current();
      if (view !== "projects") project.activeWorkspace = currentCreativeWorkspace();
      project.workspaces = captureWorkspaces();
      writeStore(nextStore);
      store = nextStore;
      notifyProjects();
      setSaveStatus("已自动保存");
      renderProjectList();
      return Promise.resolve({ ok: true });
    } catch (error) {
      setSaveStatus("保存失败");
      return Promise.reject(error);
    }
  }

  function saveNow() {
    return persistNow().catch(() => ({ ok: false }));
  }

  function scheduleSave() {
    if (applyingProject) return;
    setSaveStatus("正在保存…", true);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { void saveNow(); }, 260);
  }

  async function cleanupCastingAssetIfUnreferenced(assetId) {
    const decision = queryCastingAssetReferences(assetId);
    if (!assetId || !decision || decision.retain !== false) {
      return { removed: false, retained: true, reason: decision?.reason || "uncertain" };
    }

    const assetStore = root.aigcCastingAssetStore;
    if (!assetStore || typeof assetStore.remove !== "function") {
      return { removed: false, retained: true, reason: "uncertain" };
    }
    try {
      await assetStore.remove(assetId);
      return { removed: true, retained: false, reason: "unreferenced" };
    } catch (error) {
      return { removed: false, retained: true, reason: "cleanup-failed" };
    }
  }

  async function selectProject(projectId) {
    await persistNow();
    const nextStore = projectSnapshot();
    if (!nextStore.projects.some((project) => project.id === projectId)) throw new Error("项目不存在。");
    nextStore.activeProjectId = projectId;
    nextStore.dashboardView.selectedProjectId = projectId;
    const result = commitStore(nextStore);
    dispatchProjectContext();
    return result;
  }

  function setDashboardView(patch) {
    return commitStore(storeModel.patchDashboardView(store, patch));
  }

  function completeProjectOnboarding(fields) {
    const result = commitStore(storeModel.completeOnboarding(store, fields, nowText()));
    elements.projectName.value = activeProject().name;
    dispatchProjectContext();
    return result;
  }

  function renameActiveProject(name) {
    const nextName = String(name || "").trim().slice(0, 60);
    if (!nextName) throw new Error("请填写项目名称。");
    const nextStore = projectSnapshot();
    const project = nextStore.projects.find((item) => item.id === nextStore.activeProjectId) || nextStore.projects[0];
    if (!project) throw new Error("当前项目不可用。");
    project.name = nextName;
    project.updatedAt = nowText();
    commitStore(nextStore);
    elements.projectName.value = nextName;
    dispatchProjectContext();
    return getActiveProject();
  }

  function patchActiveFoundation(patch) {
    const result = commitStore(storeModel.patchProjectFoundation(store, activeProject().id, patch, nowText()));
    elements.projectName.value = activeProject().name;
    dispatchProjectContext();
    return getActiveProject();
  }

  function patchActiveScenes(scenes) {
    commitStore(storeModel.patchProjectScenes(store, activeProject().id, scenes, nowText()));
    dispatchProjectContext();
    return getActiveProject();
  }

  function replanActiveProjectSceneDuration(estimatedDurationSeconds) {
    commitStore(storeModel.replanProjectSceneDuration(store, activeProject().id, estimatedDurationSeconds, nowText()));
    dispatchProjectContext();
    return getActiveProject();
  }

  function patchActiveAssetLocks(assetLocks, scenes) {
    commitStore(storeModel.patchProjectAssetLocks(store, activeProject().id, assetLocks, scenes, nowText()));
    dispatchProjectContext();
    return getActiveProject();
  }

  function patchActiveScreenplay(rawText) {
    commitStore(storeModel.patchProjectScreenplay(store, activeProject().id, rawText, nowText()));
    dispatchProjectContext();
    return getActiveProject();
  }

  function previewActiveProjectScreenplay(rawText) {
    return storeModel.previewScreenplayReanalysis(activeProject(), rawText);
  }

  function applyActiveProjectScreenplay(analysis, source) {
    commitStore(storeModel.applyScreenplayAnalysis(store, activeProject().id, { ...analysis, source }, nowText()));
    dispatchProjectContext();
    return getActiveProject();
  }

  function clearActiveProjectScreenplay() {
    commitStore(storeModel.clearProjectScreenplay(store, activeProject().id, nowText()));
    dispatchProjectContext();
    return getActiveProject();
  }

  function sendSceneShotToCamera(sceneId, shotId) {
    const project = activeProject();
    const scene = (project.scenes || []).find((item) => item.id === sceneId);
    const shot = scene?.shots?.find((item) => item.id === shotId) || scene?.shots?.[0];
    if (!scene || !shot) throw new Error("请先建立场次和镜头卡。");
    if (!api.camera?.receiveSceneShot) throw new Error("运镜工作台暂不可用。");
    const visual = project.visualBible || {};
    const prompt = storeModel.buildSceneShotPrompt(project, scene, shot);
    api.camera.receiveSceneShot({
      projectName: project.name,
      scene,
      shot,
      prompt,
      visual: [visual.mood, visual.colorDirection, visual.lightingDirection, visual.cameraDirection, visual.materialDirection].filter(Boolean).join("；")
    });
    navigation.show("camera");
    return { project, scene, shot, prompt };
  }

  function lockActiveVisualBible() {
    commitStore(storeModel.lockVisualBible(store, activeProject().id, nowText()));
    dispatchProjectContext();
    return getActiveProject();
  }

  function unlockActiveVisualBible() {
    commitStore(storeModel.unlockVisualBible(store, activeProject().id, nowText()));
    dispatchProjectContext();
    return getActiveProject();
  }

  async function addProjectReference(file) {
    const project = activeProject();
    const referenceStore = root.aigcProjectReferenceStore;
    if (!referenceStore?.putFile || !referenceStore?.remove) throw new Error("当前浏览器无法保存项目参考图片。");
    const referenceIds = project.creativeBrief?.referenceAssetIds || [];
    if (referenceIds.length >= 12) throw new Error("一个项目最多保存 12 张参考图。");
    const metadata = await referenceStore.putFile(file, project.id);
    try {
      if (activeProject().id !== project.id) throw new Error("项目已切换，请重新添加参考图。");
      const result = commitStore(storeModel.patchProjectFoundation(store, project.id, {
        creativeBrief: { referenceAssetIds: [...referenceIds, metadata.id] }
      }, nowText()));
      dispatchProjectContext();
      return { ...metadata, project: result.projects.find((item) => item.id === project.id) };
    } catch (error) {
      await referenceStore.remove(metadata.id).catch(() => {});
      throw error;
    }
  }

  async function removeProjectReference(assetId) {
    const project = activeProject();
    const referenceStore = root.aigcProjectReferenceStore;
    if (!referenceStore?.remove) throw new Error("当前浏览器无法删除项目参考图片。");
    const referenceIds = project.creativeBrief?.referenceAssetIds || [];
    if (!referenceIds.includes(assetId)) return false;
    commitStore(storeModel.patchProjectFoundation(store, project.id, {
      creativeBrief: { referenceAssetIds: referenceIds.filter((id) => id !== assetId) }
    }, nowText()));
    await cleanupProjectReferenceAssetIfUnreferenced(assetId);
    dispatchProjectContext();
    return true;
  }

  function continueActiveProject() {
    if (typeof summaryModel?.decideProjectContinuation === "function") {
      return summaryModel.decideProjectContinuation(activeProject());
    }
    return { target: "foundation", reason: "visual-bible-draft" };
  }

  async function createDashboardProject(fields) {
    await persistNow();
    const result = commitStore(storeModel.createProjectInStore(store, fields, {
      createBlankProject: blankProject,
      now: nowText()
    }));
    applyProjectState(activeProject());
    return result;
  }

  function toggleFavorite(projectId) {
    return commitStore(storeModel.toggleProjectFavorite(store, projectId, nowText()));
  }

  async function openProjectWorkspace(projectId, requested) {
    await selectProject(projectId);
    const project = activeProject();
    applyProjectState(project);
    const workspace = storeModel.WORKSPACE_IDS.includes(requested) ? requested : project.activeWorkspace;
    const nextStore = projectSnapshot();
    const nextProject = nextStore.projects.find((item) => item.id === project.id);
    nextProject.activeWorkspace = workspace;
    nextProject.lastOpenedAt = nowText();
    commitStore(nextStore);
    navigation.show(workspace);
  }

  root.aigcWorkspaceCore = {
    persistNow,
    queryCastingAssetReferences,
    cleanupCastingAssetIfUnreferenced,
    cleanupPosterAssetIfUnreferenced,
    projectReferenceIsUsed,
    cleanupProjectReferenceAssetIfUnreferenced,
    getProjectSnapshot: projectSnapshot,
    getActiveProject,
    renameActiveProject,
    patchProjectFoundation: patchActiveFoundation,
    patchProjectScenes: patchActiveScenes,
    replanProjectSceneDuration: replanActiveProjectSceneDuration,
    patchProjectAssetLocks: patchActiveAssetLocks,
    patchProjectScreenplay: patchActiveScreenplay,
    previewProjectScreenplay: previewActiveProjectScreenplay,
    applyProjectScreenplay: applyActiveProjectScreenplay,
    clearProjectScreenplay: clearActiveProjectScreenplay,
    sendSceneShotToCamera,
    lockActiveVisualBible,
    unlockActiveVisualBible,
    getProjectContext,
    continueActiveProject,
    addProjectReference,
    removeProjectReference,
    subscribeProjects(listener) {
      if (typeof listener !== "function") return () => {};
      projectListeners.add(listener);
      return () => projectListeners.delete(listener);
    },
    setDashboardView,
    selectProject,
    completeOnboarding: completeProjectOnboarding,
    createProject: createDashboardProject,
    toggleFavorite,
    openProjectWorkspace
  };

  function applyProjectState(project) {
    applyingProject = true;
    elements.projectName.value = project.name || "未命名电影项目";
    Object.entries(api).forEach(([key, workbench]) => {
      if (workbench?.importState) workbench.importState(project.workspaces?.[key] || {});
    });
    applyingProject = false;
    setSaveStatus("已自动保存");
    updateTransferButtons();
    dispatchProjectContext();
  }

  function formatTime(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "刚刚更新";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function escapeHtml(value) {
    return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function renderProjectList() {
    elements.list.innerHTML = store.projects.map((project) => `
      <div class="project-list-item ${project.id === store.activeProjectId ? "active" : ""}" data-project-id="${project.id}">
        <div class="project-list-copy">
          <strong>${escapeHtml(project.name)}</strong>
          <small>${project.id === store.activeProjectId ? "当前项目" : "本地项目"} · ${formatTime(project.updatedAt)}</small>
        </div>
        <button type="button" class="button secondary project-open">${project.id === store.activeProjectId ? "已打开" : "打开"}</button>
        <button type="button" class="button secondary project-delete">删除</button>
      </div>`).join("");
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    toastTimer = setTimeout(() => { elements.toast.hidden = true; }, 2200);
  }

  function openDialog() {
    saveNow();
    renderProjectList();
    elements.dialog.hidden = false;
    elements.close.focus();
  }

  function closeDialog() {
    elements.dialog.hidden = true;
    elements.open.focus();
  }

  async function createProject() {
    await saveNow();
    await createDashboardProject({ name: `电影项目 ${store.projects.length + 1}`, type: "drama", aspectRatio: "16:9" });
    const project = activeProject();
    applyProjectState(project);
    navigation.show("tone");
    renderProjectList();
    showToast("新项目已建立");
  }

  async function duplicateProject() {
    await saveNow();
    const source = activeProject();
    const copy = withoutProjectReferenceAssetIds(source);
    copy.id = projectId();
    copy.name = `${source.name} 副本`;
    copy.createdAt = nowText();
    copy.updatedAt = nowText();
    const nextStore = projectSnapshot();
    nextStore.projects.unshift(copy);
    nextStore.activeProjectId = copy.id;
    nextStore.dashboardView.selectedProjectId = copy.id;
    commitStore(nextStore);
    applyProjectState(copy);
    navigation.show(copy.activeWorkspace || "tone");
    renderProjectList();
    showToast("当前项目已复制");
  }

  async function switchProject(id) {
    if (id === store.activeProjectId) return;
    await selectProject(id);
    const project = activeProject();
    applyProjectState(project);
    navigation.show(project.activeWorkspace || "tone");
    renderProjectList();
    showToast(`已打开“${project.name}”`);
  }

  async function deleteProject(id) {
    if (store.projects.length === 1) {
      showToast("至少保留一个项目");
      return;
    }
    const project = store.projects.find((item) => item.id === id);
    if (!root.confirm(`确定删除“${project?.name || "这个项目"}”吗？此操作只删除当前浏览器中的本地项目。`)) return;

    try {
      await persistNow();
    } catch (error) {
      showToast("项目保存失败，未执行删除");
      return;
    }

    const persistedProject = store.projects.find((item) => item.id === id);
    if (!persistedProject) return;
    const candidateAssets = [
      ...collectProjectCastingAssetIds(persistedProject).map((assetId) => ({ kind: "casting", assetId })),
      ...collectProjectPosterAssetIds(persistedProject).map((assetId) => ({ kind: "poster", assetId })),
      ...collectProjectReferenceAssetIds(persistedProject).map((assetId) => ({ kind: "project-reference", assetId }))
    ];
    const deletingActive = id === store.activeProjectId;
    const nextStore = JSON.parse(JSON.stringify(store));
    nextStore.projects = nextStore.projects.filter((item) => item.id !== id);
    if (deletingActive) nextStore.activeProjectId = nextStore.projects[0].id;

    try {
      await persistThenCleanup({
        assetIds: candidateAssets,
        persistMetadata: async () => {
          writeStore(nextStore);
          store = nextStore;
          if (deletingActive) {
            applyProjectState(activeProject());
            navigation.show(activeProject().activeWorkspace || "tone");
          }
          setSaveStatus("已自动保存");
          renderProjectList();
          notifyProjects();
        },
        cleanupAsset: (candidate) => candidate.kind === "poster"
          ? cleanupPosterAssetIfUnreferenced(candidate.assetId)
          : candidate.kind === "project-reference"
            ? cleanupProjectReferenceAssetIfUnreferenced(candidate.assetId)
            : cleanupCastingAssetIfUnreferenced(candidate.assetId)
      });
      showToast("项目已从本地删除");
    } catch (error) {
      setSaveStatus("保存失败");
      showToast("项目删除失败，项目仍保留");
    }
  }

  function exportProjects() {
    saveNow();
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `AIGC电影工作台_项目备份_${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("项目 JSON 已导出；本地图片素材未包含。");
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function exportProjectPackage() {
    const archiveService = root.aigcProjectArchiveService;
    if (!archiveService?.exportActiveProject) throw new Error("完整项目包功能暂不可用。");
    await persistNow();
    setSaveStatus("正在打包…", true);
    try {
      const result = await archiveService.exportActiveProject(getActiveProject());
      downloadBlob(result.blob, result.fileName);
      showToast(`完整项目包已导出：${result.summary.assetCount} 张本地参考图已包含。`);
    } finally {
      setSaveStatus("已自动保存");
    }
  }

  function appendImportedPackageProject(project, importToken) {
    const nextStore = projectSnapshot();
    const candidate = { ...project, importToken, updatedAt: nowText() };
    nextStore.projects.unshift(candidate);
    nextStore.activeProjectId = candidate.id;
    nextStore.dashboardView.selectedProjectId = candidate.id;
    nextStore.onboardingComplete = true;
    const normalized = storeModel.normalizeProjectStore(nextStore, { createBlankProject: blankProject });
    commitStore(normalized);
  }

  function committedImportToken(projectId) {
    return store.projects.find((project) => project.id === projectId)?.importToken || "";
  }

  async function importProjectPackage(file) {
    const archiveService = root.aigcProjectArchiveService;
    if (!archiveService?.preflightPackage || !archiveService?.importPackage) throw new Error("完整项目包功能暂不可用。");
    setSaveStatus("正在校验项目包…", true);
    const preflight = await archiveService.preflightPackage(file);
    const result = await archiveService.importPackage(preflight.packageData, undefined, {
      commitProject: async (project, importToken) => appendImportedPackageProject(project, importToken),
      getCommittedProjectToken: committedImportToken
    });
    applyProjectState(activeProject());
    navigation.show(activeProject().activeWorkspace || "tone");
    renderProjectList();
    showToast(`完整项目包已导入：${result.summary.sceneCount} 场、${result.summary.shotCount} 镜、${result.summary.assetCount} 张参考图。`);
    setSaveStatus("已自动保存");
  }

  async function importProjects(file) {
    try {
      if (/\.zip$/i.test(file.name) || file.type === "application/zip") {
        await importProjectPackage(file);
        return;
      }
      const parsed = JSON.parse(await file.text());
      if (!parsed || !Array.isArray(parsed.projects) || !parsed.projects.length) throw new Error("invalid");
      const importedProjects = parsed.projects.map((project) => {
        const copy = withoutProjectReferenceAssetIds(project);
        copy.id = projectId();
        copy.name = `${copy.name || "导入项目"}（导入）`;
        copy.updatedAt = nowText();
        return copy;
      });
      const importedStore = storeModel.normalizeProjectStore({
        ...store,
        onboardingComplete: true,
        projects: [...importedProjects, ...store.projects],
        activeProjectId: importedProjects[0].id,
        dashboardView: { ...store.dashboardView, selectedProjectId: importedProjects[0].id }
      }, { createBlankProject: blankProject });
      commitStore(importedStore);
      applyProjectState(activeProject());
      navigation.show(activeProject().activeWorkspace || "tone");
      renderProjectList();
      showToast(`已导入 ${importedProjects.length} 个项目`);
    } catch (error) {
      showToast(error?.message || "无法导入：备份文件格式不正确");
      setSaveStatus("已自动保存");
    } finally {
      elements.importInput.value = "";
    }
  }

  function switchWorkspace(name) {
    navigation.show(name);
  }

  function updateTransferButtons() {
    const toneIncomplete = document.querySelector("#copy")?.disabled;
    const castingIncomplete = document.querySelector("#casting-copy")?.disabled;
    const toneMessage = document.querySelector("#tone-validation")?.textContent || "请先填写主体并选择至少一种影调素材";
    const castingMessage = document.querySelector("#casting-validation")?.textContent || "请先完成角色身份信息";
    [elements.toneSendCamera, elements.toneSendPoster].forEach((button) => {
      button.disabled = false;
      button.classList.toggle("requires-input", Boolean(toneIncomplete));
      button.title = toneIncomplete ? toneMessage : "";
    });
    [elements.castingSendCamera, elements.castingSendPoster].forEach((button) => {
      button.disabled = false;
      button.classList.toggle("requires-input", Boolean(castingIncomplete));
      button.title = castingIncomplete ? castingMessage : "";
    });
  }

  function transferTone(target) {
    if (document.querySelector("#copy")?.disabled) {
      const message = document.querySelector("#tone-validation")?.textContent || "请先填写主体并选择至少一种影调素材";
      showToast(message);
      const subject = document.querySelector("#subject");
      if (!subject?.value.trim()) subject?.focus();
      else document.querySelector("#search")?.focus();
      return;
    }
    const prompt = api.tone.getTransferPrompt();
    api[target].receiveTone(prompt);
    switchWorkspace(target);
    scheduleSave();
    showToast(`影调方案已发送到${target === "camera" ? "运镜" : "海报生图"}`);
  }

  function transferCharacter(target) {
    if (document.querySelector("#casting-copy")?.disabled) {
      const message = document.querySelector("#casting-validation")?.textContent || "请先完成角色身份信息";
      showToast(message);
      document.querySelector("#casting-role")?.focus();
      return;
    }
    const summary = api.casting.getCharacterSummary();
    api[target].receiveCharacter(summary);
    switchWorkspace(target);
    scheduleSave();
    showToast(`角色母版已发送到${target === "camera" ? "运镜" : "海报生图"}`);
  }

  elements.open.addEventListener("click", openDialog);
  elements.close.addEventListener("click", closeDialog);
  elements.dialog.addEventListener("click", (event) => { if (event.target === elements.dialog) closeDialog(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !elements.dialog.hidden) closeDialog(); });
  elements.create.addEventListener("click", () => { void createProject(); });
  elements.duplicate.addEventListener("click", () => { void duplicateProject(); });
  elements.exportPackageButton.addEventListener("click", () => { void exportProjectPackage().catch((error) => showToast(error?.message || "完整项目包导出失败。")); });
  elements.exportButton.addEventListener("click", exportProjects);
  elements.importInput.addEventListener("change", () => { if (elements.importInput.files[0]) importProjects(elements.importInput.files[0]); });
  elements.list.addEventListener("click", (event) => {
    const item = event.target.closest("[data-project-id]");
    if (!item) return;
    if (event.target.closest(".project-open")) void switchProject(item.dataset.projectId);
    if (event.target.closest(".project-delete")) void deleteProject(item.dataset.projectId);
  });
  elements.projectName.addEventListener("input", scheduleSave);
  function isCreativeWorkspaceEdit(target) {
    const workspace = target?.closest?.(".workspace-view");
    return Boolean(workspace && workspace.dataset.workspaceView !== "projects");
  }
  document.addEventListener("input", (event) => {
    if (isCreativeWorkspaceEdit(event.target)) scheduleSave();
    updateTransferButtons();
  });
  document.addEventListener("change", (event) => {
    if (isCreativeWorkspaceEdit(event.target)) scheduleSave();
    updateTransferButtons();
  });
  document.addEventListener("aigc:workspace-dirty", scheduleSave);
  document.addEventListener("click", (event) => {
    if (event.target.closest(".mode-button, .tab, .chip, .pill, .segment, .camera-card, .result")) scheduleSave();
    setTimeout(updateTransferButtons, 0);
  });
  elements.toneSendCamera.addEventListener("click", () => transferTone("camera"));
  elements.toneSendPoster.addEventListener("click", () => transferTone("poster"));
  elements.castingSendCamera.addEventListener("click", () => transferCharacter("camera"));
  elements.castingSendPoster.addEventListener("click", () => transferCharacter("poster"));
  root.addEventListener("beforeunload", saveNow);

  const initial = activeProject();
  if (Object.keys(initial.workspaces || {}).length) {
    applyProjectState(initial);
  } else {
    initial.activeWorkspace = preferredWorkspace && preferredWorkspace !== "projects"
      ? preferredWorkspace
      : currentCreativeWorkspace();
    elements.projectName.value = initial.name;
    writeStore();
  }
  const initialView = preferredWorkspace ? preferredWorkspace : "projects";
  navigation.show(initialView);
  renderProjectList();
  updateTransferButtons();
  root.aigcProjectArchiveService?.recoverInterruptedImport?.({ getCommittedProjectToken: committedImportToken }).catch(() => {});
})(typeof window !== "undefined" ? window : globalThis);
