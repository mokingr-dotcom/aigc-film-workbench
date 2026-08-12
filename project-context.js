(function initProjectContext(root) {
  if (!root.document) return;
  const core = root.aigcWorkspaceCore;
  if (!core) return;
  const strips = [...document.querySelectorAll("[data-project-context]")];
  const workbenches = {
    tone: () => root.aigcToneWorkbench,
    camera: () => root.aigcCameraWorkbench,
    casting: () => root.aigcCastingWorkbench,
    poster: () => root.aigcPosterWorkbench,
    reverse: () => root.aigcReverseWorkbench,
    music: () => root.aigcMusicWorkbench
  };

  function contextPrompt(detail) {
    const bible = detail?.bible || {};
    const parts = [bible.mood, bible.colorDirection, bible.lightingDirection, bible.cameraDirection, bible.materialDirection, ...(bible.negativeConstraints || [])].filter(Boolean);
    if (!parts.length) return "";
    return `${bible.status === "locked" ? "项目视觉基准" : "项目视觉草案"}：${parts.join("；")}`;
  }

  // Draft visual decisions remain visible for review, but only a locked bible is
  // allowed to alter outbound generation prompts automatically.
  function autoPrompt(detail = core.getProjectContext()) {
    return detail?.bible?.status === "locked" ? contextPrompt(detail) : "";
  }

  async function copyText(text) {
    try {
      await root.navigator.clipboard.writeText(text);
    } catch (error) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.append(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
  }

  function render(detail = core.getProjectContext()) {
    const prompt = contextPrompt(detail);
    strips.forEach((strip) => {
      const workspace = strip.dataset.projectContext;
      strip.hidden = !detail?.project;
      strip.dataset.status = detail?.bible?.status || "draft";
      strip.innerHTML = `<div class="project-context-copy"><span>${detail?.bible?.status === "locked" ? "VISUAL BIBLE · LOCKED" : "VISUAL BIBLE · DRAFT"}</span><strong>${detail?.project?.name || "未命名电影项目"}</strong><small>${prompt || "尚未填写可继承的视觉字段"}</small></div><div class="project-context-actions"><button type="button" data-context-action="copy" ${prompt ? "" : "disabled"}>复制基准</button><button type="button" data-context-action="insert" ${prompt ? "" : "disabled"}>插入当前提示词</button><button type="button" data-context-action="local" aria-pressed="false">仅本次覆盖</button></div>`;
      strip.dataset.workspace = workspace;
      strip.dataset.prompt = prompt;
    });
  }

  strips.forEach((strip) => {
    strip.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-context-action]");
      if (!button || button.disabled) return;
      const action = button.dataset.contextAction;
      if (action === "local") {
        const active = button.getAttribute("aria-pressed") === "true";
        button.setAttribute("aria-pressed", String(!active));
        button.textContent = active ? "仅本次覆盖" : "本次覆盖中";
        return;
      }
      const prompt = strip.dataset.prompt;
      if (action === "copy") {
        await copyText(prompt);
        button.textContent = "已复制";
        root.setTimeout(() => { button.textContent = "复制基准"; }, 1200);
        return;
      }
      const workbench = workbenches[strip.dataset.workspace]?.();
      const accepted = workbench?.receiveProjectContext?.({ ...core.getProjectContext(), prompt });
      if (accepted !== false) {
        button.textContent = "已插入";
        root.setTimeout(() => { button.textContent = "插入当前提示词"; }, 1200);
      }
    });
  });

  document.addEventListener("aigc:project-context", (event) => render(event.detail));
  render();
  root.aigcProjectContext = { render, contextPrompt, getAutoPrompt: autoPrompt };
})(typeof window !== "undefined" ? window : globalThis);
