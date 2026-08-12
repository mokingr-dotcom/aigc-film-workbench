(function initProjectDashboard(root) {
  if (!root.document) return;

  const core = root.aigcWorkspaceCore;
  const summaryApi = root.aigcProjectSummary;
  const coverApi = root.aigcProjectCover;
  if (!core || !summaryApi || !coverApi) return;

  const elements = {
    workspace: document.querySelector("#project-workspace"),
    center: document.querySelector("#project-center-column"),
    categories: document.querySelector("#project-category-nav"),
    libraryCount: document.querySelector("#project-library-count"),
    spotlight: document.querySelector("#project-spotlight"),
    visualBible: document.querySelector("#project-visual-bible"),
    stages: document.querySelector("#project-stage-list"),
    stageMeta: document.querySelector("#project-stage-meta"),
    cards: document.querySelector("#project-card-list"),
    detail: document.querySelector("#project-active-detail"),
    detailContent: document.querySelector("#project-active-detail-content"),
    detailOpen: document.querySelector("#project-detail-open"),
    detailClose: document.querySelector("#project-detail-close"),
    search: document.querySelector("#project-dashboard-search"),
    sort: document.querySelector("#project-dashboard-sort"),
    categorySelect: document.querySelector("#project-category-select"),
    newProject: document.querySelector("#project-dashboard-new"),
    onboardingDialog: document.querySelector("#project-onboarding-dialog"),
    onboardingForm: document.querySelector("#project-onboarding-form"),
    name: document.querySelector("#project-onboarding-name"),
    type: document.querySelector("#project-onboarding-type"),
    aspect: document.querySelector("#project-onboarding-aspect"),
    duration: document.querySelector("#project-onboarding-duration"),
    durationUnit: document.querySelector("#project-onboarding-duration-unit"),
    onboardingError: document.querySelector("#project-onboarding-error"),
    onboardingImport: document.querySelector("#project-onboarding-import")
  };

  const CATEGORY_META = [
    { id: "all", label: "全部项目" },
    { id: "recent", label: "最近项目" },
    { id: "favorite", label: "我的收藏" },
    { id: "backup", label: "备份项目" }
  ];
  const WORKSPACE_ORDER = ["tone", "casting", "camera", "poster", "reverse", "music"];
  const WORKSPACE_INDEX = { tone: "01", casting: "02", camera: "03", poster: "04", reverse: "05", music: "06" };
  const TYPE_LABELS = {
    drama: "剧情片",
    documentary: "纪录片",
    commercial: "广告 / 宣传片",
    animation: "动画",
    short: "短片",
    series: "剧集"
  };
  const STATIC_COVERS = [
    "assets/poster-templates/film-character-world.jpg",
    "assets/poster-templates/film-negative-space.jpg",
    "assets/poster-templates/film-dual-conflict.jpg",
    "assets/poster-templates/film-object-symbol.jpg",
    "assets/poster-templates/film-portrait-close.jpg",
    "assets/poster-templates/film-split-world.jpg"
  ];

  function staticCoverForProject(project) {
    const explicit = project?.workspaces?.poster?.referencePreview || project?.workspaces?.poster?.templateImage;
    if (typeof explicit === "string" && explicit.startsWith("assets/")) return explicit;
    const hash = [...String(project?.id || project?.name || "project")]
      .reduce((total, character) => total + character.charCodeAt(0), 0);
    return STATIC_COVERS[hash % STATIC_COVERS.length];
  }

  const coverResolver = coverApi.createProjectCoverResolver({
    getCastingAsset: (id) => root.aigcCastingAssetStore?.get(id),
    createObjectURL: (blob) => root.URL.createObjectURL(blob),
    revokeObjectURL: (url) => root.URL.revokeObjectURL(url),
    staticCoverFor: staticCoverForProject
  });

  let snapshot = core.getProjectSnapshot();
  let renderGeneration = 0;
  let formMode = "starter";
  let renderedProjectIds = new Set();
  let detailReturnFocus = null;
  let scrollTimer = 0;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function selectedProject() {
    const id = snapshot.dashboardView.selectedProjectId || snapshot.activeProjectId;
    return snapshot.projects.find((project) => project.id === id) || snapshot.projects[0];
  }

  function projectType(project) {
    const value = project?.productionMeta?.type || "drama";
    return TYPE_LABELS[value] || value;
  }

  function formatDuration(seconds) {
    const duration = Number(seconds);
    if (!Number.isFinite(duration) || duration <= 0) return "时长待定";
    if (duration < 60) return `${duration} 秒`;
    const minutes = Math.round(duration / 60);
    return minutes >= 60 ? `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分` : `${minutes} 分钟`;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "刚刚更新";
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  }

  function categoryCount(category) {
    if (category === "favorite") return snapshot.projects.filter((project) => project.favorite).length;
    if (category === "backup") return snapshot.projects.filter((project) => project.backupOf || project.importedAt || project.name.includes("备份")).length;
    if (category === "recent") return Math.min(snapshot.projects.length, 8);
    return snapshot.projects.length;
  }

  function renderNavigation() {
    const active = snapshot.dashboardView.category;
    elements.libraryCount.textContent = `${snapshot.projects.length} 个项目`;
    elements.categories.innerHTML = CATEGORY_META.map((category) => `
      <button type="button" data-project-category="${category.id}" class="${category.id === active ? "active" : ""}" aria-current="${category.id === active ? "page" : "false"}">
        <span>${category.label}</span><small>${categoryCount(category.id)}</small>
      </button>`).join("");
  }

  function visibleProjects() {
    const view = snapshot.dashboardView;
    const query = view.search.trim().toLocaleLowerCase("zh-CN");
    let projects = snapshot.projects.filter((project) => {
      if (view.category === "favorite" && !project.favorite) return false;
      if (view.category === "backup" && !(project.backupOf || project.importedAt || project.name.includes("备份"))) return false;
      const haystack = `${project.name} ${project.productionMeta?.type || ""}`.toLocaleLowerCase("zh-CN");
      return !query || haystack.includes(query);
    });
    projects.sort((a, b) => {
      if (view.sort === "name-asc") return a.name.localeCompare(b.name, "zh-CN");
      const field = view.sort === "created-desc" ? "createdAt" : "updatedAt";
      return String(b[field] || "").localeCompare(String(a[field] || ""));
    });
    return view.category === "recent" ? projects.slice(0, 8) : projects;
  }

  function summaryLine(summary) {
    if (!summary) return "尚未设置";
    return summary.status === "configured" ? `${summary.title} · ${summary.detail}` : summary.detail;
  }

  function renderProjectCard(project) {
    const summary = summaryApi.summarizeProject(project);
    const highlights = WORKSPACE_ORDER.map((id) => summary.summaries[id])
      .filter((item) => item.status === "configured")
      .slice(0, 3)
      .map((item) => item.title);
    return `
      <article class="project-card" role="option" tabindex="0" data-project-id="${escapeHtml(project.id)}" aria-selected="${project.id === selectedProject()?.id}">
        <div class="project-card-image"><img data-project-cover="${escapeHtml(project.id)}" alt="" loading="lazy"></div>
        <div class="project-card-body">
          <div class="project-card-heading"><div><small>${escapeHtml(projectType(project))}</small><h3>${escapeHtml(project.name)}</h3></div><button type="button" data-project-action="favorite" aria-label="${project.favorite ? "取消收藏" : "收藏项目"}" title="${project.favorite ? "取消收藏" : "收藏项目"}"><i data-lucide="star" aria-hidden="true"></i></button></div>
          <p>${escapeHtml([project.productionMeta?.aspectRatio || "16:9", formatDuration(project.productionMeta?.estimatedDurationSeconds), highlights.join(" / ") || "等待建立视觉方案"].join(" · "))}</p>
          <div class="project-card-footer"><span>${summary.configuredCount} / 6 个工作台</span><button type="button" data-project-action="continue"><i data-lucide="arrow-right" aria-hidden="true"></i>继续创作</button></div>
        </div>
      </article>`;
  }

  function renderProjects() {
    const projects = visibleProjects();
    const nextIds = new Set(projects.map((project) => project.id));
    for (const id of renderedProjectIds) {
      if (!nextIds.has(id) && id !== selectedProject()?.id) coverResolver.releaseProject(id);
    }
    renderedProjectIds = nextIds;
    if (!projects.length) {
      const condition = snapshot.dashboardView.search || CATEGORY_META.find((item) => item.id === snapshot.dashboardView.category)?.label || "当前条件";
      elements.cards.innerHTML = `<div class="project-empty-state"><i data-lucide="folder-search" aria-hidden="true"></i><strong>没有找到项目</strong><p>当前条件：${escapeHtml(condition)}</p><button type="button" data-project-action="clear-filters">清除筛选</button></div>`;
      return [];
    }
    elements.cards.innerHTML = projects.map(renderProjectCard).join("");
    return projects;
  }

  function renderSpotlight(project, summary) {
    const continuation = core.continueActiveProject();
    const next = continuation.target === "foundation"
      ? { workspace: "tone", actionLabel: "建立视觉基准" }
      : { workspace: continuation.target, actionLabel: summary.summaries[continuation.target]?.actionLabel || "继续创作" };
    elements.spotlight.innerHTML = `
      <img data-project-cover="${escapeHtml(project.id)}" alt="${escapeHtml(project.name)}项目画面">
      <div class="project-spotlight-copy">
        <span>当前项目</span>
        <h1>${escapeHtml(project.name)}</h1>
        <p>${escapeHtml([projectType(project), project.productionMeta?.aspectRatio || "16:9", formatDuration(project.productionMeta?.estimatedDurationSeconds), summaryLine(summary.summaries.tone)].join(" · "))}</p>
      </div>
      <div class="project-spotlight-actions"><button type="button" data-project-action="edit-bible" data-project-id="${escapeHtml(project.id)}" class="project-secondary-action">视觉圣经</button><button type="button" data-project-action="continue" data-project-id="${escapeHtml(project.id)}" class="project-primary-action">${escapeHtml(next.actionLabel)}<i data-lucide="arrow-right" aria-hidden="true"></i></button></div>`;
  }

  function renderVisualBible(project) {
    const bible = project?.visualBible || {};
    const locked = bible.status === "locked";
    const rows = [
      ["色彩", bible.colorDirection],
      ["光影", bible.lightingDirection],
      ["摄影", bible.cameraDirection],
      ["材质", bible.materialDirection]
    ];
    elements.visualBible.hidden = false;
    elements.visualBible.innerHTML = `
      <label class="project-bible-heading"><span>PROJECT / VISUAL BIBLE</span><input class="project-name-editor" data-project-name-editor maxlength="60" value="${escapeHtml(project.name)}" aria-label="项目名称"><small class="status-${locked ? "locked" : "draft"}">${locked ? "已锁定" : "草案"}</small></label>
      ${rows.map(([label, content]) => `<div class="project-bible-row"><span>${label}</span><strong>${escapeHtml(content || "待确定")}</strong></div>`).join("")}
      <div class="project-bible-actions"><button type="button" data-project-action="edit-bible" data-project-id="${escapeHtml(project.id)}">编辑</button><button type="button" data-project-action="restart-guided" data-project-id="${escapeHtml(project.id)}">重新引导</button><button type="button" data-project-action="professional-mode" data-project-id="${escapeHtml(project.id)}">专业模式</button></div>`;
  }

  function renderStages(project, summary) {
    elements.stageMeta.textContent = `${summary.configuredCount} / 6 个工作台已设置 · 下一步：${summary.next.title}`;
    elements.stages.innerHTML = WORKSPACE_ORDER.map((id) => {
      const item = summary.summaries[id];
      return `<button type="button" class="project-stage-item status-${item.status}" data-open-workspace="${id}"><span>${WORKSPACE_INDEX[id]} ${escapeHtml(item.title)}</span><strong>${escapeHtml(item.detail)}</strong><small>${item.status === "configured" ? "已设置" : item.status === "unreadable" ? "检查数据" : "待建立"}</small></button>`;
    }).join("");
  }

  function renderDetail(project, summary) {
    elements.detailContent.innerHTML = `
      <header class="project-detail-header"><span>当前项目</span><h2>${escapeHtml(project.name)}</h2><p>${escapeHtml(projectType(project))} · 更新于 ${escapeHtml(formatDate(project.updatedAt))}</p></header>
      <div class="project-detail-cover"><img data-project-cover="${escapeHtml(project.id)}" alt="${escapeHtml(project.name)}封面"><span>${escapeHtml(project.productionMeta?.aspectRatio || "16:9")}</span></div>
      <button type="button" class="project-detail-continue" data-project-action="continue" data-project-id="${escapeHtml(project.id)}" aria-label="${escapeHtml(summary.next.actionLabel)}：${escapeHtml(summary.next.title)}">${escapeHtml(summary.next.actionLabel)} · ${escapeHtml(summary.next.title)}<i data-lucide="arrow-right" aria-hidden="true"></i></button>
      <section class="project-detail-section"><h3>六个工作台</h3><div class="project-workspace-grid">${WORKSPACE_ORDER.map((id) => {
        const item = summary.summaries[id];
        return `<button type="button" data-open-workspace="${id}" class="status-${item.status}"><span>${escapeHtml(item.title)}</span><small>${escapeHtml(item.status === "configured" ? "已设置" : item.status === "unreadable" ? "需检查" : "待建立")}</small></button>`;
      }).join("")}</div></section>
      <section class="project-next-step"><span>推荐下一步</span><strong>${escapeHtml(summary.next.title)}</strong><p>${escapeHtml(summary.next.detail)}</p></section>`;
  }

  function renderSelectedProject(project) {
    if (!project) return;
    const summary = summaryApi.summarizeProject(project);
    renderSpotlight(project, summary);
    renderVisualBible(project);
    renderStages(project, summary);
    renderDetail(project, summary);
  }

  async function resolveCovers(projects, generation) {
    const unique = [...new Map(projects.filter(Boolean).map((project) => [project.id, project])).values()];
    await Promise.all(unique.map(async (project) => {
      const result = await coverResolver.resolve(project);
      if (result.stale || generation !== renderGeneration) return;
      document.querySelectorAll("[data-project-cover]").forEach((image) => {
        if (image.dataset.projectCover === project.id) image.src = result.src;
      });
    }));
  }

  function render() {
    renderGeneration += 1;
    const generation = renderGeneration;
    renderNavigation();
    const projects = renderProjects();
    const selected = selectedProject();
    renderSelectedProject(selected);
    elements.search.value = snapshot.dashboardView.search;
    elements.sort.value = snapshot.dashboardView.sort;
    elements.categorySelect.value = snapshot.dashboardView.category;
    root.requestAnimationFrame(() => {
      if (Math.abs(elements.center.scrollTop - snapshot.dashboardView.scrollTop) > 2) {
        elements.center.scrollTop = snapshot.dashboardView.scrollTop;
      }
    });
    if (root.lucide) root.lucide.createIcons({ attrs: { "stroke-width": 1.7 } });
    void resolveCovers([...projects, selected], generation);
  }

  async function handleProjectAction(event) {
    const actionElement = event.target.closest("[data-project-action]");
    if (!actionElement) return false;
    const action = actionElement.dataset.projectAction;
    if (action === "clear-filters") {
      core.setDashboardView({ category: "all", search: "", sort: "updated-desc", scrollTop: 0 });
      return true;
    }
    const projectId = actionElement.dataset.projectId || event.target.closest("[data-project-id]")?.dataset.projectId;
    if (!projectId) return true;
    if (action === "favorite") {
      core.toggleFavorite(projectId);
      return true;
    }
    if (action === "continue") {
      await core.selectProject(projectId);
      const next = core.continueActiveProject();
      if (next.target === "foundation") {
        const targetStep = core.getProjectContext().brief.story ? "visual" : "brief";
        root.aigcProjectFoundation.open(targetStep);
      }
      else await core.openProjectWorkspace(projectId, next.target);
      return true;
    }
    if (action === "edit-bible" || action === "restart-guided") {
      await core.selectProject(projectId);
      root.aigcProjectFoundation.open(action === "restart-guided" ? "brief" : "visual");
      return true;
    }
    if (action === "professional-mode") {
      await core.openProjectWorkspace(projectId, core.getActiveProject().activeWorkspace || "tone");
      return true;
    }
    return true;
  }

  elements.cards.addEventListener("click", async (event) => {
    if (await handleProjectAction(event)) return;
    const card = event.target.closest("[data-project-id]");
    if (card) await core.selectProject(card.dataset.projectId);
  });

  elements.cards.addEventListener("keydown", async (event) => {
    const card = event.target.closest('[role="option"][data-project-id]');
    if (!card || event.target.closest("button")) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    await core.selectProject(card.dataset.projectId);
  });

  elements.workspace.addEventListener("click", async (event) => {
    if (elements.cards.contains(event.target)) return;
    if (await handleProjectAction(event)) return;
    const workspace = event.target.closest("[data-open-workspace]")?.dataset.openWorkspace;
    if (workspace) await core.openProjectWorkspace(selectedProject().id, workspace);
  });

  elements.search.addEventListener("input", () => core.setDashboardView({ search: elements.search.value }));
  elements.sort.addEventListener("change", () => core.setDashboardView({ sort: elements.sort.value, scrollTop: 0 }));
  elements.categorySelect.addEventListener("change", () => core.setDashboardView({ category: elements.categorySelect.value, scrollTop: 0 }));
  elements.categories.addEventListener("click", (event) => {
    const button = event.target.closest("[data-project-category]");
    if (button) core.setDashboardView({ category: button.dataset.projectCategory, scrollTop: 0 });
  });
  elements.visualBible.addEventListener("input", (event) => {
    const field = event.target.closest("[data-project-name-editor]");
    if (!field) return;
    const name = field.value.trim().slice(0, 60) || "未命名电影项目";
    const projectName = document.querySelector("#project-name");
    if (!projectName || projectName.value === name) return;
    projectName.value = name;
    projectName.dispatchEvent(new Event("input", { bubbles: true }));
  });
  elements.center.addEventListener("scroll", () => {
    if (root.aigcWorkspaceNavigation?.current() !== "projects") return;
    root.clearTimeout(scrollTimer);
    scrollTimer = root.setTimeout(() => {
      core.setDashboardView({ scrollTop: Math.round(elements.center.scrollTop) });
    }, 180);
  }, { passive: true });

  elements.newProject.addEventListener("click", () => {
    // Let people explore the library first. The starter project is completed
    // only after they deliberately choose to create their first project.
    formMode = snapshot.onboardingComplete === false ? "starter" : "new";
    elements.onboardingForm.reset();
    elements.onboardingError.textContent = "";
    elements.onboardingDialog.showModal();
  });

  elements.onboardingImport.addEventListener("click", () => {
    elements.onboardingDialog.close();
    document.querySelector("#project-center-open")?.click();
  });

  function onboardingDuration() {
    const value = Number(elements.duration.value);
    if (!Number.isFinite(value) || value <= 0) return null;
    const seconds = elements.durationUnit.value === "minutes" ? Math.round(value * 60) : Math.round(value);
    if (seconds < 1 || seconds > 86400) throw new Error("预计时长必须在 1 秒到 24 小时之间。");
    return seconds;
  }

  elements.onboardingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    elements.onboardingError.textContent = "";
    try {
      const fields = {
        name: elements.name.value,
        type: elements.type.value,
        aspectRatio: elements.aspect.value,
        estimatedDurationSeconds: onboardingDuration()
      };
      if (formMode === "starter") core.completeOnboarding(fields);
      else await core.createProject(fields);
      elements.onboardingDialog.close();
    } catch (error) {
      elements.onboardingError.textContent = error.message || "项目创建失败。";
    }
  });

  function openDetail() {
    detailReturnFocus = document.activeElement;
    elements.workspace.dataset.detailOpen = "true";
    elements.detail.setAttribute("aria-modal", "true");
    elements.detailClose.focus();
  }

  function closeDetail() {
    elements.workspace.dataset.detailOpen = "false";
    elements.detail.removeAttribute("aria-modal");
    if (detailReturnFocus?.focus) detailReturnFocus.focus();
  }

  elements.detailOpen.addEventListener("click", openDetail);
  elements.detailClose.addEventListener("click", closeDetail);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.workspace.dataset.detailOpen === "true") closeDetail();
    if (event.key !== "Tab" || elements.workspace.dataset.detailOpen !== "true") return;
    const focusable = [...elements.detail.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter((node) => !node.disabled);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  const unsubscribe = core.subscribeProjects((next) => {
    snapshot = next;
    render();
  });
  root.addEventListener("beforeunload", () => {
    unsubscribe();
    coverResolver.releaseAll();
  }, { once: true });

  render();
})(typeof window !== "undefined" ? window : globalThis);
