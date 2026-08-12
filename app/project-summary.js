(function initProjectSummary(root) {
  const WORKSPACE_ORDER = ["tone", "casting", "camera", "poster", "reverse", "music"];
  const LABELS = {
    tone: "影调生成",
    camera: "运镜",
    casting: "角色定妆",
    poster: "海报生图",
    reverse: "画面反推",
    music: "音乐配乐"
  };

  function summary(workspace, status, title, detail, actionLabel = "打开") {
    return {
      workspace,
      status,
      title: title || LABELS[workspace],
      detail: detail || "尚未设置",
      actionLabel
    };
  }

  function validObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function summarizeTone(state) {
    if (state === undefined) return summary("tone", "empty");
    if (!validObject(state)) return summary("tone", "unreadable", "影调数据无法读取", "打开检查");
    const selected = Array.isArray(state.selected) ? state.selected.filter(validObject) : [];
    if (!selected.length || state.selectedExplicit === false) return summary("tone", "empty");
    return summary(
      "tone",
      "configured",
      selected[0].title || "已选影调",
      [selected[0].palette, selected[0].lighting].filter(Boolean).join(" · "),
      "继续调整"
    );
  }

  function summarizeCamera(state) {
    if (state === undefined) return summary("camera", "empty");
    if (!validObject(state)) return summary("camera", "unreadable", "运镜数据无法读取", "打开检查");
    const hasChosenCase = validObject(state.selected) && state.selectedExplicit !== false;
    if (!hasChosenCase && !state.scene && !state.action) return summary("camera", "empty");
    return summary(
      "camera",
      "configured",
      state.selected?.title || "已设置运镜",
      [state.aspect === "wide" ? "21:9" : "16:9", state.scene || state.action].filter(Boolean).join(" · "),
      "继续设计"
    );
  }

  function summarizeCasting(state) {
    if (state === undefined) return summary("casting", "empty");
    if (!validObject(state)) return summary("casting", "unreadable", "角色数据无法读取", "打开检查");
    const identityName = state.identity?.name || state.identityBoard?.character || state.characterName || "";
    const configured = Boolean(identityName || state.referenceAsset?.id || (Array.isArray(state.versions) && state.versions.length));
    return configured
      ? summary("casting", "configured", identityName || "已保存角色", `${Array.isArray(state.versions) ? state.versions.length : 0} 个角色版本`, "继续定妆")
      : summary("casting", "empty");
  }

  function summarizePoster(state) {
    if (state === undefined) return summary("poster", "empty");
    if (!validObject(state)) return summary("poster", "unreadable", "海报数据无法读取", "打开检查");
    const compositor = validObject(state.posterCompositor) ? state.posterCompositor : {};
    const configured = Boolean(
      state.templateId
      || String(state.title || "").trim()
      || String(state.subject || "").trim()
      || compositor.sourceAsset?.id
      || compositor.titleAsset?.id
      || (Array.isArray(compositor.dynamicLayerOrder) && compositor.dynamicLayerOrder.length)
    );
    return configured
      ? summary("poster", "configured", state.title || state.templateTitle || "已设置主视觉", [state.purpose, state.ratio].filter(Boolean).join(" · "), "继续设计")
      : summary("poster", "empty");
  }

  function summarizeReverse(state) {
    if (state === undefined) return summary("reverse", "empty");
    if (!validObject(state)) return summary("reverse", "unreadable", "反推数据无法读取", "打开检查");
    const calibrated = validObject(state.dimensions)
      && Object.values(state.dimensions).some((value) => String(value || "").trim());
    const configured = Boolean(state.sourceFileName || state.referenceFileName || calibrated || state.task);
    return configured
      ? summary("reverse", "configured", state.sourceFileName || state.referenceFileName || "已保存画面拆解", calibrated ? "八维校准已设置" : "任务设置已保存", "继续拆解")
      : summary("reverse", "empty");
  }

  function summarizeMusic(state) {
    if (state === undefined) return summary("music", "empty");
    if (!validObject(state)) return summary("music", "unreadable", "配乐数据无法读取", "打开检查");
    const configured = Boolean(
      state.templateId
      || String(state.sceneZh || "").trim()
      || String(state.subjectState || "").trim()
      || String(state.keyBeat || "").trim()
    );
    return configured
      ? summary("music", "configured", state.templateTitle || "已设置配乐", [state.coreEmotion, state.bpm ? `${state.bpm} BPM` : ""].filter(Boolean).join(" · "), "继续配乐")
      : summary("music", "empty");
  }

  function summarizeProject(project) {
    const workspaces = validObject(project?.workspaces) ? project.workspaces : {};
    const summaries = {
      tone: summarizeTone(workspaces.tone),
      camera: summarizeCamera(workspaces.camera),
      casting: summarizeCasting(workspaces.casting),
      poster: summarizePoster(workspaces.poster),
      reverse: summarizeReverse(workspaces.reverse),
      music: summarizeMusic(workspaces.music)
    };
    const values = Object.values(summaries);
    const unreadable = values.find((item) => item.status === "unreadable");
    const active = summaries[project?.activeWorkspace];
    const firstEmpty = WORKSPACE_ORDER.map((id) => summaries[id]).find((item) => item.status === "empty");
    // A completed active workspace must not mask unfinished production steps.
    // Surface unreadable data first, then the earliest incomplete workspace in the intended flow.
    let next = unreadable;
    if (!next) next = firstEmpty;
    if (!next && active) next = active;
    if (!next) {
      next = summary(project?.activeWorkspace || "tone", "configured", "项目检查与导出", "六项创作资料均已设置", "检查项目");
    }
    if (next.status === "unreadable") {
      next = { ...next, detail: `${next.detail}，请打开对应工作台检查数据` };
    }
    return {
      summaries,
      configuredCount: values.filter((item) => item.status === "configured").length,
      next
    };
  }

  function decideProjectContinuation(project) {
    if (project?.visualBible?.status !== "locked") {
      return { target: "foundation", reason: "visual-bible-draft" };
    }
    const route = project?.creativeBrief?.route;
    const projectSummary = summarizeProject(project);
    if (WORKSPACE_ORDER.includes(route) && projectSummary.summaries[route]?.status !== "configured") {
      return { target: route, reason: "route-incomplete" };
    }
    if (WORKSPACE_ORDER.includes(project?.activeWorkspace)) {
      return { target: project.activeWorkspace, reason: "active-workspace" };
    }
    return { target: "tone", reason: "fallback-tone" };
  }

  const api = { summarizeProject, decideProjectContinuation };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.aigcProjectSummary = api;
})(typeof window !== "undefined" ? window : globalThis);
