(function initLookStudio(root) {
  if (!root.document) return;

  const tone = root.aigcToneWorkbench;
  if (!tone) return;

  const elements = {
    shell: document.querySelector("#tone-workspace"),
    monitor: document.querySelector("#look-monitor"),
    monitorId: document.querySelector("#look-monitor-id"),
    category: document.querySelector("#look-monitor-category"),
    name: document.querySelector("#look-monitor-name"),
    summary: document.querySelector("#look-monitor-summary"),
    palette: document.querySelector("#look-palette"),
    exposure: document.querySelector("#look-meter-exposure"),
    contrast: document.querySelector("#look-meter-contrast"),
    temperature: document.querySelector("#look-meter-temperature"),
    dnaLight: document.querySelector("#look-dna-light"),
    dnaCamera: document.querySelector("#look-dna-camera"),
    dnaTexture: document.querySelector("#look-dna-texture"),
    dnaUse: document.querySelector("#look-dna-use"),
    references: document.querySelector("#look-reference-films"),
    referenceCount: document.querySelector("#look-reference-count"),
    favorite: document.querySelector("#look-favorite"),
    saveVersion: document.querySelector("#look-save-version"),
    favoritesFilter: document.querySelector("#look-favorites-filter"),
    versionList: document.querySelector("#look-version-list"),
    referencePanel: document.querySelector("#tone-workspace .look-reference-panel"),
    versionPanel: document.querySelector("#tone-workspace .look-version-panel"),
    historyToggle: document.querySelector("#tone-history-toggle"),
    libraryCollapse: document.querySelector("#tone-library-collapse"),
    composerCollapse: document.querySelector("#tone-composer-collapse"),
    commandOpen: document.querySelector("#command-center-open"),
    command: document.querySelector("#command-center"),
    commandInput: document.querySelector("#command-center-input"),
    commandResults: document.querySelector("#command-center-results")
  };

  const palettes = {
    neutral: ["#15191d", "#48535b", "#9da7a8", "#d4a56a", "#e7e1d6"],
    cool: ["#07171d", "#153947", "#2c7184", "#8cb8c3", "#d8e4e3"],
    warm: ["#1a100b", "#663a1f", "#b5763c", "#d8b578", "#f1ddbb"],
    red: ["#140b0d", "#4c151b", "#9b2731", "#d26b5c", "#e7c1a2"],
    green: ["#09120f", "#18372d", "#3c6550", "#8fa58b", "#d6d4bc"],
    mono: ["#080909", "#292c2d", "#65696a", "#b2b4b1", "#ecebe5"]
  };

  const workspaceActions = [
    { id: "projects", name: "项目", meta: "PROJECT CENTER", icon: "folder-kanban" },
    { id: "tone", name: "影调生成", meta: "LOOK DEVELOPMENT", icon: "palette" },
    { id: "camera", name: "运镜", meta: "CAMERA DESIGN", icon: "video" },
    { id: "casting", name: "角色定妆", meta: "CHARACTER CASTING", icon: "scan-face" },
    { id: "poster", name: "海报生图", meta: "KEY ART STUDIO", icon: "panels-top-left" },
    { id: "reverse", name: "画面反推", meta: "VISUAL ANALYSIS", icon: "scan-search" },
    { id: "music", name: "音乐配乐", meta: "FILM SCORE", icon: "audio-lines" }
  ];

  let snapshot = tone.getSnapshot();
  let commandItems = [];
  let commandIndex = 0;
  let compareVersionId = "";

  const referenceImages = [
    "assets/tone-option2-reference-1.png",
    "assets/tone-option2-reference-2.png",
    "assets/tone-option2-reference-3.png"
  ];

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function styleText(item) {
    return [item?.name, item?.color, item?.lighting, item?.camera, item?.texture, ...(item?.tags || [])].join(" ");
  }

  function matchesQuery(item, normalized) {
    return !normalized || Object.values(item).join(" ").toLowerCase().includes(normalized);
  }

  function searchCatalogItems(normalized) {
    if (!normalized) return [];
    const cameraItems = (root.cameraPromptData?.cases || []).map((item) => ({
      type: "camera", id: item.id, name: item.name, meta: `${item.film} ${item.year} · 运镜案例`, icon: "video"
    }));
    const musicItems = (root.aigcMusicData?.MUSIC_TEMPLATES || []).map((item) => ({
      type: "music", id: item.id, name: item.name, meta: `${item.scene} · ${item.instruments}`, icon: "audio-lines"
    }));
    const posterItems = (root.aigcPosterTemplateData?.templates || []).map((item) => ({
      type: "poster", id: item.id, name: item.label, meta: `${item.genreHint} · 海报构图`, icon: "panels-top-left"
    }));
    const instrumentItems = (root.aigcMusicData?.MUSIC_INSTRUMENTS || []).map((item) => ({
      type: "music-workspace", id: item.id, name: item.zh || item.en || item.id,
      meta: `${item.region || ""} ${item.family || ""} · 乐器`, icon: "music-2"
    }));
    const projectItems = (root.aigcWorkspaceCore?.getProjectSnapshot?.().projects || []).map((item) => ({
      type: "project", id: item.id, projectId: item.id, name: item.name, meta: "本地项目", icon: "folder"
    }));
    return [...projectItems, ...cameraItems, ...musicItems, ...posterItems, ...instrumentItems]
      .filter((item) => matchesQuery(item, normalized))
      .slice(0, 18);
  }

  function analyzeLook(item) {
    const text = styleText(item);
    let grade = "neutral";
    if (/黑白|单色|银盐|灰阶/.test(text)) grade = "mono";
    else if (/红|洋红|霓虹|血色/.test(text)) grade = "red";
    else if (/绿|青苔|森林|潮湿/.test(text)) grade = "green";
    else if (/暖|金|琥珀|夕阳|烛光|橙/.test(text)) grade = "warm";
    else if (/冷|蓝|青|夜|月光|冰/.test(text)) grade = "cool";

    return {
      grade,
      exposure: /低调|暗部|深黑|夜|阴影|欠曝/.test(text) ? "低调" : (/高调|明亮|柔白|日光/.test(text) ? "高调" : "中间调"),
      contrast: /高反差|硬光|强对比|深黑/.test(text) ? "高反差" : (/低反差|柔光|雾|灰调/.test(text) ? "低反差" : "中等反差"),
      temperature: grade === "cool" ? "冷色倾向" : grade === "warm" ? "暖色倾向" : grade === "red" ? "红色强调" : grade === "green" ? "青绿倾向" : grade === "mono" ? "中性黑白" : "冷暖平衡"
    };
  }

  function renderPalette(grade) {
    elements.palette.innerHTML = palettes[grade].map((color) => `<span style="--swatch:${color}" title="${color}"></span>`).join("");
  }

  function renderReferences(item) {
    const references = (item?.references || []).slice(0, 3);
    elements.referenceCount.textContent = `${references.length} 部`;
    elements.references.innerHTML = references.length
      ? references.map((reference, index) => `<span class="look-reference-card"><img src="${referenceImages[index]}" alt=""><b>0${index + 1}</b><em>${escapeHtml(reference)}</em></span>`).join("")
      : '<span class="look-empty">选择影调后显示</span>';
  }

  function formatTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "刚刚";
    return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function renderVersions() {
    const versions = snapshot.versions || [];
    if (!versions.length) {
      elements.versionList.innerHTML = '<span class="look-empty">保存后可比较不同提示词方案</span>';
      return;
    }
    const compared = versions.find((version) => version.id === compareVersionId);
    const compare = compared ? `
      <div class="look-version-compare">
        <div><span>已保存 V${compared.number}</span><p>${escapeHtml(compared.prompt || "该版本尚未填写完整提示词")}</p></div>
        <div><span>当前方案</span><p>${escapeHtml(snapshot.prompt || "当前方案尚未填写完整提示词")}</p></div>
      </div>` : "";
    elements.versionList.innerHTML = compare + versions.map((version) => `
      <article class="look-version ${version.id === compareVersionId ? "active" : ""}" data-version-id="${version.id}">
        <span>V${version.number}</span>
        <div><strong>${escapeHtml(version.name)}</strong><small>${formatTime(version.createdAt)}</small></div>
        <button type="button" data-version-action="compare" title="与当前方案比较" aria-label="与当前方案比较"><i data-lucide="columns-2" aria-hidden="true"></i></button>
        <button type="button" data-version-action="copy" title="复制此版本" aria-label="复制此版本"><i data-lucide="copy" aria-hidden="true"></i></button>
        <button type="button" data-version-action="delete" title="删除版本" aria-label="删除版本"><i data-lucide="trash-2" aria-hidden="true"></i></button>
      </article>`).join("");
    if (root.lucide) root.lucide.createIcons({ attrs: { "stroke-width": 1.8 } });
  }

  function renderSnapshot(next) {
    snapshot = next;
    const item = snapshot.primary;
    const analysis = analyzeLook(item);
    elements.monitor.dataset.grade = item ? analysis.grade : "neutral";
    elements.monitorId.textContent = item ? `${item.id} · ${snapshot.selected.length > 1 ? "BLENDED LOOK" : "PRIMARY LOOK"}` : "NO LOOK SELECTED";
    elements.category.textContent = item ? snapshot.categoryLabel : "等待选择";
    elements.name.textContent = item?.name || "从左侧选择一种影调";
    elements.summary.textContent = item?.summary || item?.color || "这里会集中显示色彩倾向、光影关系、参考影片与提示词状态。";
    elements.exposure.textContent = analysis.exposure;
    elements.contrast.textContent = analysis.contrast;
    elements.temperature.textContent = analysis.temperature;
    elements.dnaLight.textContent = item?.lighting || "等待选择光影";
    elements.dnaCamera.textContent = item?.camera || "等待选择镜头";
    elements.dnaTexture.textContent = item?.texture || "等待选择材质";
    elements.dnaUse.textContent = item?.scenarios || "等待选择适用场景";
    elements.favorite.classList.toggle("active", snapshot.favorite);
    elements.favorite.disabled = !item;
    elements.favorite.title = snapshot.favorite ? "取消收藏" : "收藏当前影调";
    elements.saveVersion.disabled = !item;
    elements.favoritesFilter.classList.toggle("active", snapshot.favoritesOnly);
    elements.favoritesFilter.innerHTML = `<i data-lucide="star" aria-hidden="true"></i>${snapshot.favoritesOnly ? "显示全部" : `只看收藏 ${snapshot.favoriteCount || ""}`}`;
    renderPalette(analysis.grade);
    renderReferences(item);
    renderVersions();
    if (root.lucide) root.lucide.createIcons({ attrs: { "stroke-width": 1.8 } });
  }

  function signalProjectChange() {
    document.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function showToast(message) {
    const toast = document.querySelector("#workspace-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    root.clearTimeout(showToast.timer);
    showToast.timer = root.setTimeout(() => { toast.hidden = true; }, 1800);
  }

  function setPaneCollapsed(side, collapsed) {
    elements.shell.classList.toggle(`${side}-collapsed`, collapsed);
    const button = side === "library" ? elements.libraryCollapse : elements.composerCollapse;
    button.setAttribute("aria-pressed", String(collapsed));
    button.title = collapsed ? `展开${side === "library" ? "素材库" : "参数面板"}` : `折叠${side === "library" ? "素材库" : "参数面板"}`;
    localStorage.setItem(`aigc-look-${side}-collapsed`, collapsed ? "1" : "0");
  }

  function renderCommandResults(query = "") {
    const normalized = query.trim().toLowerCase();
    const workspaceMatches = workspaceActions.filter((item) => !normalized || `${item.name} ${item.meta}`.toLowerCase().includes(normalized));
    const catalogMatches = searchCatalogItems(normalized);
    const toneMatches = tone.getSearchItems(query).slice(0, normalized ? 12 : 6);
    commandItems = [
      ...workspaceMatches.map((item) => ({ type: "workspace", ...item })),
      ...catalogMatches,
      ...toneMatches.map((item) => ({ type: "tone", ...item }))
    ];
    commandIndex = Math.min(commandIndex, Math.max(0, commandItems.length - 1));
    elements.commandResults.innerHTML = commandItems.length ? commandItems.map((item, index) => `
      <button type="button" class="command-result ${index === commandIndex ? "active" : ""}" data-command-index="${index}" role="option" aria-selected="${index === commandIndex}">
        <i data-lucide="${item.icon || (item.favorite ? "star" : "clapperboard")}" aria-hidden="true"></i>
        <span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.type === "tone" ? `${item.categoryLabel} · ${item.country || item.id}` : item.meta)}</small></span>
        <kbd>↵</kbd>
      </button>`).join("") : '<div class="command-empty">没有找到匹配内容</div>';
    if (root.lucide) root.lucide.createIcons({ attrs: { "stroke-width": 1.8 } });
    elements.commandResults.querySelector(".command-result.active")?.scrollIntoView({ block: "nearest" });
  }

  function openCommand() {
    elements.command.hidden = false;
    elements.commandInput.value = "";
    commandIndex = 0;
    renderCommandResults();
    root.setTimeout(() => elements.commandInput.focus(), 30);
  }

  function closeCommand() {
    elements.command.hidden = true;
    elements.commandOpen.focus();
  }

  function runCommand(index) {
    const item = commandItems[index];
    if (!item) return;
    if (item.type === "workspace") {
      document.querySelector(`[data-workspace="${item.id}"]`)?.click();
    } else if (item.type === "tone") {
      document.querySelector('[data-workspace="tone"]')?.click();
      tone.selectItem(item.category, item.id);
    } else if (item.type === "camera") {
      document.querySelector('[data-workspace="camera"]')?.click();
      root.aigcCameraWorkbench?.selectItem?.("cases", item.id);
    } else if (item.type === "music") {
      document.querySelector('[data-workspace="music"]')?.click();
      root.aigcMusicWorkbench?.selectTemplate?.(item.id);
    } else if (item.type === "poster") {
      document.querySelector('[data-workspace="poster"]')?.click();
      root.aigcPosterWorkbench?.selectTemplate?.(item.id);
    } else if (item.type === "project") {
      void root.aigcWorkspaceCore?.openProjectWorkspace?.(item.projectId);
    } else if (item.type === "music-workspace") {
      document.querySelector('[data-workspace="music"]')?.click();
    }
    closeCommand();
  }

  document.addEventListener("aigc:tone-update", (event) => renderSnapshot(event.detail));
  elements.favorite.addEventListener("click", () => {
    const active = tone.toggleCurrentFavorite();
    signalProjectChange();
    showToast(active ? "已收藏当前影调" : "已取消收藏");
  });
  elements.saveVersion.addEventListener("click", () => {
    const version = tone.saveVersion();
    if (!version) return;
    signalProjectChange();
    showToast(`已保存影调版本 V${version.number}`);
  });
  elements.favoritesFilter.addEventListener("click", () => {
    tone.setFavoritesOnly(!snapshot.favoritesOnly);
    signalProjectChange();
  });
  elements.historyToggle?.addEventListener("click", () => {
    const open = !elements.shell.classList.contains("history-open");
    elements.shell.classList.toggle("history-open", open);
    elements.historyToggle.setAttribute("aria-expanded", String(open));
  });
  elements.versionList.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-version-action]");
    const card = event.target.closest("[data-version-id]");
    if (!action || !card) return;
    const version = snapshot.versions.find((item) => item.id === card.dataset.versionId);
    if (!version) return;
    if (action.dataset.versionAction === "compare") {
      compareVersionId = compareVersionId === version.id ? "" : version.id;
      renderVersions();
    } else if (action.dataset.versionAction === "copy") {
      try { await navigator.clipboard.writeText(version.prompt); } catch (error) { showToast("浏览器未允许自动复制"); return; }
      showToast(`已复制 V${version.number}`);
    } else if (action.dataset.versionAction === "delete") {
      if (compareVersionId === version.id) compareVersionId = "";
      tone.removeVersion(version.id);
      signalProjectChange();
      showToast("版本已删除");
    }
  });

  elements.libraryCollapse.addEventListener("click", () => setPaneCollapsed("library", !elements.shell.classList.contains("library-collapsed")));
  elements.composerCollapse.addEventListener("click", () => setPaneCollapsed("composer", !elements.shell.classList.contains("composer-collapsed")));
  elements.commandOpen.addEventListener("click", openCommand);
  elements.command.addEventListener("click", (event) => { if (event.target === elements.command) closeCommand(); });
  elements.commandInput.addEventListener("input", () => { commandIndex = 0; renderCommandResults(elements.commandInput.value); });
  elements.commandResults.addEventListener("mousemove", (event) => {
    const result = event.target.closest("[data-command-index]");
    if (!result) return;
    commandIndex = Number(result.dataset.commandIndex);
    [...elements.commandResults.querySelectorAll(".command-result")].forEach((button, index) => button.classList.toggle("active", index === commandIndex));
  });
  elements.commandResults.addEventListener("click", (event) => {
    const result = event.target.closest("[data-command-index]");
    if (result) runCommand(Number(result.dataset.commandIndex));
  });
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      elements.command.hidden ? openCommand() : closeCommand();
      return;
    }
    if (elements.command.hidden) return;
    if (event.key === "Escape") closeCommand();
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!commandItems.length) return;
      const direction = event.key === "ArrowDown" ? 1 : -1;
      commandIndex = (commandIndex + direction + commandItems.length) % commandItems.length;
      renderCommandResults(elements.commandInput.value);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      runCommand(commandIndex);
    }
  });

  localStorage.removeItem("aigc-look-library-collapsed");
  localStorage.removeItem("aigc-look-composer-collapsed");
  setPaneCollapsed("library", false);
  setPaneCollapsed("composer", false);
  document.querySelector("#tone-workspace .library-pane")?.appendChild(elements.referencePanel);
  renderSnapshot(snapshot);
})(typeof window !== "undefined" ? window : globalThis);
