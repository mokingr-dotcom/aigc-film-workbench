(function initWorkspaceNavigation(root) {
  if (!root.document) return;

  const VALID = new Set(["projects", "tone", "camera", "casting", "poster", "reverse", "music"]);
  const buttons = [...document.querySelectorAll(".mode-button[data-workspace]")];
  const views = [...document.querySelectorAll(".workspace-view")];
  const listeners = new Set();
  let active = "";

  function syncLocation(next) {
    if (!root.history?.replaceState || !root.location?.href) return;
    const url = new URL(root.location.href);
    url.searchParams.set("workspace", next === "projects" ? "project" : next);
    root.history.replaceState(root.history.state, "", url);
  }

  function show(name) {
    const next = VALID.has(name) ? name : "projects";
    views.forEach((view) => {
      const selected = view.dataset.workspaceView === next;
      view.hidden = !selected;
      view.classList.toggle("active", selected);
    });
    buttons.forEach((button) => {
      const selected = button.dataset.workspace === next;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", String(selected));
    });
    syncLocation(next);
    if (active !== next) {
      active = next;
      document.documentElement.dataset.activeWorkspace = next;
      listeners.forEach((listener) => listener(next));
    }
    return next;
  }

  buttons.forEach((button) => button.addEventListener("click", () => show(button.dataset.workspace)));

  root.aigcWorkspaceNavigation = {
    show,
    current: () => active,
    subscribe(listener) {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
