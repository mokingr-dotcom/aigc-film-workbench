(function initCinematicInterface(root) {
  if (!root.document) return;

  const workspaceMeta = {
    projects: { code: "项目管理", title: "项目桌面" },
    tone: { code: "LOOK DEVELOPMENT", title: "影调生成" },
    camera: { code: "CAMERA DESIGN", title: "运镜" },
    casting: { code: "CHARACTER CASTING", title: "角色定妆" },
    poster: { code: "KEY ART STUDIO", title: "海报生图" },
    reverse: { code: "VISUAL ANALYSIS", title: "画面反推" },
    music: { code: "MUSIC SCORING", title: "音乐配乐" }
  };

  const iconMap = {
    "project-new": "file-plus-2",
    "project-duplicate": "copy-plus",
    "project-export": "download",
    random: "dices",
    clear: "rotate-ccw",
    copy: "copy",
    "tone-send-camera": "arrow-right",
    "tone-send-poster": "arrow-right",
    "casting-example": "wand-sparkles",
    "casting-clear": "rotate-ccw",
    "casting-copy": "copy",
    "casting-send-camera": "arrow-right",
    "casting-send-poster": "arrow-right",
    "poster-example": "wand-sparkles",
    "poster-clear": "rotate-ccw",
    "poster-copy": "copy",
    "reverse-example": "scan-search",
    "reverse-clear": "rotate-ccw",
    "reverse-copy": "copy",
    "camera-clear": "rotate-ccw",
    "camera-copy": "copy",
    "music-copy-all": "copy"
  };

  const code = document.querySelector("#workspace-section-code");
  const title = document.querySelector("#workspace-section-title");
  const modeButtons = [...document.querySelectorAll("[data-workspace]")];
  const copyButtons = ["copy", "camera-copy", "casting-copy", "poster-copy", "reverse-copy", "music-copy-all"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  let currentWorkspace = "";

  function ensureButtonIcon(button, icon) {
    if (!button || !icon || button.querySelector("svg, [data-lucide]")) return;
    const marker = document.createElement("i");
    marker.dataset.lucide = icon;
    marker.setAttribute("aria-hidden", "true");
    button.prepend(marker);
    if (root.lucide) root.lucide.createIcons({ attrs: { "stroke-width": 1.8 } });
  }

  function addStaticIcons() {
    Object.entries(iconMap).forEach(([id, icon]) => {
      const button = document.getElementById(id);
      ensureButtonIcon(button, icon);
    });
    const importLabel = document.querySelector(".project-import-label");
    if (importLabel && !importLabel.querySelector("[data-lucide]")) {
      const marker = document.createElement("i");
      marker.dataset.lucide = "upload";
      marker.setAttribute("aria-hidden", "true");
      importLabel.prepend(marker);
    }
    if (root.lucide) root.lucide.createIcons({ attrs: { "stroke-width": 1.8 } });
  }

  function updateContext(workspace) {
    const meta = workspaceMeta[workspace] || workspaceMeta.tone;
    code.textContent = meta.code;
    title.textContent = meta.title;
    document.title = `${meta.title} · AIGC电影提示词工作台`;
    document.documentElement.dataset.activeWorkspace = workspace;
    if (currentWorkspace !== workspace) {
      currentWorkspace = workspace;
      root.setTimeout(() => triggerOutputScan(workspace), 40);
    }
  }

  function triggerOutputScan(workspace) {
    const outputSelectors = {
      tone: "#tone-workspace .composer-pane",
      camera: "#camera-workspace .camera-composer",
      casting: "#casting-workspace .casting-output-panel",
      poster: "#poster-workspace .poster-output-panel",
      reverse: "#reverse-workspace .reverse-output-panel",
      music: "#music-workspace .music-output-panel"
    };
    const outputPanel = document.querySelector(outputSelectors[workspace]);
    if (!outputPanel) return;
    outputPanel.classList.remove("output-scanning");
    void outputPanel.offsetWidth;
    outputPanel.classList.add("output-scanning");
    root.setTimeout(() => outputPanel.classList.remove("output-scanning"), 760);
  }

  root.aigcWorkspaceNavigation?.subscribe(updateContext);

  const navigationObserver = new MutationObserver(() => {
    const active = document.querySelector(".mode-button.active");
    if (active) updateContext(active.dataset.workspace);
  });
  const navigation = document.querySelector(".mode-switch");
  if (navigation) navigationObserver.observe(navigation, { attributes: true, subtree: true, attributeFilter: ["class", "aria-selected"] });

  copyButtons.forEach((button) => {
    const observer = new MutationObserver(() => {
      if (!button.querySelector("svg, [data-lucide]")) {
        requestAnimationFrame(() => ensureButtonIcon(button, iconMap[button.id]));
      }
      if (button.textContent.includes("已复制")) {
        button.classList.remove("is-confirmed");
        requestAnimationFrame(() => button.classList.add("is-confirmed"));
      }
    });
    observer.observe(button, { childList: true, characterData: true, subtree: true });
    button.addEventListener("animationend", () => button.classList.remove("is-confirmed"));
  });

  if (root.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.addEventListener("pointermove", (event) => {
      const surface = event.target.closest?.(".result, .camera-card");
      if (!surface) return;
      const bounds = surface.getBoundingClientRect();
      surface.style.setProperty("--glow-x", `${event.clientX - bounds.left}px`);
      surface.style.setProperty("--glow-y", `${event.clientY - bounds.top}px`);
    });
  }

  const activeButton = document.querySelector(".mode-button.active");
  updateContext(activeButton?.dataset.workspace || "tone");
  root.setTimeout(() => {
    const restoredButton = document.querySelector(".mode-button.active");
    if (restoredButton) updateContext(restoredButton.dataset.workspace);
  }, 80);
  addStaticIcons();
  document.documentElement.classList.add("cinematic-ui-ready");
})(typeof window !== "undefined" ? window : globalThis);
