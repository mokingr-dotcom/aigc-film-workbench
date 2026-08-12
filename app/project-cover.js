(function initProjectCover(root) {
  function createProjectCoverResolver({ getCastingAsset, createObjectURL, revokeObjectURL, staticCoverFor } = {}) {
    if (typeof getCastingAsset !== "function") throw new TypeError("缺少角色资产读取方法。");
    if (typeof createObjectURL !== "function" || typeof revokeObjectURL !== "function") {
      throw new TypeError("缺少 Blob URL 生命周期方法。");
    }
    if (typeof staticCoverFor !== "function") throw new TypeError("缺少本地封面回退方法。");

    const generations = new Map();
    const urls = new Map();

    function own(projectId, url) {
      const owned = urls.get(projectId) || new Set();
      owned.add(url);
      urls.set(projectId, owned);
    }

    async function resolve(project) {
      const projectId = String(project?.id || "");
      const generation = (generations.get(projectId) || 0) + 1;
      generations.set(projectId, generation);
      const assetId = project?.workspaces?.casting?.referenceAsset?.id || "";

      if (assetId) {
        try {
          const record = await getCastingAsset(assetId);
          if (record?.blob) {
            const src = createObjectURL(record.blob);
            own(projectId, src);
            return {
              projectId,
              src,
              kind: "blob",
              stale: generations.get(projectId) !== generation
            };
          }
        } catch (error) {
          // A static local cover is the recoverable path.
        }
      }

      return {
        projectId,
        src: staticCoverFor(project),
        kind: "static",
        stale: generations.get(projectId) !== generation
      };
    }

    function releaseProject(projectId) {
      const id = String(projectId || "");
      generations.set(id, (generations.get(id) || 0) + 1);
      for (const url of urls.get(id) || []) revokeObjectURL(url);
      urls.delete(id);
    }

    function releaseAll() {
      for (const projectId of [...urls.keys()]) releaseProject(projectId);
    }

    return { resolve, releaseProject, releaseAll };
  }

  const api = { createProjectCoverResolver };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.aigcProjectCover = api;
})(typeof window !== "undefined" ? window : globalThis);
