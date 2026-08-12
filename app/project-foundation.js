(function initProjectFoundation(root) {
  if (!root.document) return;
  const core = root.aigcWorkspaceCore;
  const navigation = root.aigcWorkspaceNavigation;
  if (!core || !navigation) return;

  const dialog = document.querySelector("#project-foundation-dialog");
  if (!dialog) return;
  const elements = {
    close: document.querySelector("#foundation-close"),
    error: document.querySelector("#foundation-error"),
    steps: [...document.querySelectorAll("[data-foundation-step]")],
    progress: [...document.querySelectorAll("[data-foundation-progress]")],
    projectName: document.querySelector("#foundation-project-name"),
    story: document.querySelector("#foundation-story"),
    platform: document.querySelector("#foundation-platform"),
    era: document.querySelector("#foundation-era"),
    region: document.querySelector("#foundation-region"),
    models: document.querySelector("#foundation-models"),
    route: [...document.querySelectorAll('input[name="foundation-route"]')],
    mood: document.querySelector("#foundation-mood"),
    color: document.querySelector("#foundation-color"),
    lighting: document.querySelector("#foundation-lighting"),
    camera: document.querySelector("#foundation-camera"),
    material: document.querySelector("#foundation-material"),
    negatives: document.querySelector("#foundation-negatives"),
    upload: document.querySelector("#foundation-reference-upload"),
    references: document.querySelector("#foundation-reference-list"),
    back: document.querySelector("#foundation-back"),
    next: document.querySelector("#foundation-next"),
    skip: document.querySelector("#foundation-skip"),
    draft: document.querySelector("#foundation-draft"),
    lock: document.querySelector("#foundation-lock"),
    professional: document.querySelector("#foundation-professional")
  };
  const STEP_IDS = ["brief", "visual", "route"];
  let step = "brief";
  let referenceUrls = [];

  function releaseReferenceUrls() {
    referenceUrls.forEach((url) => root.URL.revokeObjectURL(url));
    referenceUrls = [];
  }

  function setError(message = "") {
    elements.error.textContent = message;
  }

  function value(element) {
    return String(element?.value || "").trim();
  }

  function readBrief() {
    const route = elements.route.find((input) => input.checked)?.value || "library";
    return {
      story: value(elements.story),
      platform: elements.platform.value,
      era: value(elements.era),
      region: value(elements.region),
      targetModels: value(elements.models).split(/[,，\n]/).map((item) => item.trim()).filter(Boolean),
      route
    };
  }

  function readBible() {
    return {
      mood: value(elements.mood),
      colorDirection: value(elements.color),
      lightingDirection: value(elements.lighting),
      cameraDirection: value(elements.camera),
      materialDirection: value(elements.material),
      negativeConstraints: String(elements.negatives?.value || "").split(/\n|；|;/).map((item) => item.trim()).filter(Boolean)
    };
  }

  function renderFields() {
    const context = core.getProjectContext();
    const { project, brief, bible } = context;
    elements.projectName.value = project.name || "";
    elements.story.value = brief.story;
    elements.platform.value = brief.platform;
    elements.era.value = brief.era;
    elements.region.value = brief.region;
    elements.models.value = brief.targetModels.join(", ");
    elements.route.forEach((input) => { input.checked = input.value === brief.route; });
    elements.mood.value = bible.mood;
    elements.color.value = bible.colorDirection;
    elements.lighting.value = bible.lightingDirection;
    elements.camera.value = bible.cameraDirection;
    elements.material.value = bible.materialDirection;
    elements.negatives.value = bible.negativeConstraints.join("\n");
    dialog.dataset.visualBibleStatus = bible.status;
    dialog.dataset.projectName = project.name;
  }

  async function renderReferences() {
    releaseReferenceUrls();
    const project = core.getActiveProject();
    const referenceStore = root.aigcProjectReferenceStore;
    if (!project || !referenceStore?.get) {
      elements.references.innerHTML = "";
      return;
    }
    const ids = project.creativeBrief?.referenceAssetIds || [];
    const items = await Promise.all(ids.map(async (id) => {
      const record = await referenceStore.get(id).catch(() => null);
      if (!record) return { id, missing: true };
      const url = root.URL.createObjectURL(record.blob);
      referenceUrls.push(url);
      return { id, meta: record.meta, url };
    }));
    elements.references.innerHTML = items.map((item) => item.missing
      ? `<div class="foundation-reference missing"><span>参考图不可用</span><button type="button" data-foundation-remove-reference="${item.id}">移除</button></div>`
      : `<div class="foundation-reference"><img src="${item.url}" alt="${item.meta.name || "项目参考图"}"><span>${item.meta.name || "项目参考图"}</span><button type="button" data-foundation-remove-reference="${item.id}">移除</button></div>`
    ).join("");
  }

  function renderStep() {
    const index = STEP_IDS.indexOf(step);
    elements.steps.forEach((panel) => {
      const active = panel.dataset.foundationStep === step;
      panel.hidden = !active;
      panel.classList.toggle("active", active);
    });
    elements.progress.forEach((item) => item.classList.toggle("active", item.dataset.foundationProgress === step));
    elements.back.hidden = index === 0;
    elements.next.hidden = step === "route";
    elements.lock.hidden = step !== "route";
    elements.skip.hidden = step !== "brief";
    setError();
  }

  function setStep(nextStep) {
    step = STEP_IDS.includes(nextStep) ? nextStep : "brief";
    renderStep();
  }

  function validateBrief() {
    if (!value(elements.projectName)) throw new Error("请先填写项目名称。");
    if (!value(elements.story)) throw new Error("请用一句话说明这个项目要拍什么。");
  }

  function saveDraft() {
    core.renameActiveProject(value(elements.projectName));
    const brief = readBrief();
    const bible = readBible();
    core.patchProjectFoundation({ creativeBrief: brief, visualBible: bible });
    renderFields();
    return { brief, bible };
  }

  async function addFiles(files) {
    for (const file of [...files]) await core.addProjectReference(file);
    await renderReferences();
  }

  async function advance() {
    try {
      if (step === "brief") validateBrief();
      saveDraft();
      if (step === "brief") setStep("visual");
      else if (step === "visual") setStep("route");
    } catch (error) {
      setError(error.message || "无法保存项目基础信息。");
    }
  }

  function close() {
    if (dialog.open) dialog.close();
    releaseReferenceUrls();
  }

  async function lock() {
    try {
      saveDraft();
      core.lockActiveVisualBible();
      close();
      navigation.show("projects");
    } catch (error) {
      setError(error.message || "无法锁定视觉基准。");
    }
  }

  function open(target = "brief") {
    renderFields();
    setStep(target);
    void renderReferences();
    if (!dialog.open) dialog.showModal();
    root.lucide?.createIcons({ attrs: { "stroke-width": 1.7 } });
  }

  elements.close.addEventListener("click", close);
  elements.back.addEventListener("click", () => setStep(STEP_IDS[Math.max(0, STEP_IDS.indexOf(step) - 1)]));
  elements.next.addEventListener("click", () => { void advance(); });
  elements.draft.addEventListener("click", () => {
    try { saveDraft(); setError("草案已保存在当前浏览器。"); } catch (error) { setError(error.message || "保存失败。"); }
  });
  elements.lock.addEventListener("click", () => { void lock(); });
  elements.skip.addEventListener("click", () => { close(); navigation.show("projects"); });
  elements.professional.addEventListener("click", () => {
    const target = readBrief().route;
    close();
    navigation.show(target === "library" ? "tone" : target);
  });
  elements.upload.addEventListener("change", () => {
    const files = elements.upload.files;
    if (!files?.length) return;
    void addFiles(files).catch((error) => setError(error.message || "参考图上传失败。")).finally(() => { elements.upload.value = ""; });
  });
  elements.references.addEventListener("click", (event) => {
    const id = event.target.closest("[data-foundation-remove-reference]")?.dataset.foundationRemoveReference;
    if (!id) return;
    void core.removeProjectReference(id).then(renderReferences).catch((error) => setError(error.message || "参考图删除失败。"));
  });
  dialog.addEventListener("close", releaseReferenceUrls);
  document.addEventListener("aigc:project-context", () => {
    if (!dialog.open) return;
    renderFields();
    void renderReferences();
  });

  root.aigcProjectFoundation = { open, close };
})(typeof window !== "undefined" ? window : globalThis);
