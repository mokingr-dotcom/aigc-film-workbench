(function initProjectArchive(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.aigcProjectArchive = api;
})(typeof window !== "undefined" ? window : globalThis, function createProjectArchiveApi() {
  const FORMAT = "aigc-project-package";
  const VERSION = 1;
  const MAX_ARCHIVE_BYTES = 250 * 1024 * 1024;
  const MAX_ASSETS = 160;
  const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
  const MAX_PROJECT_BYTES = 2 * 1024 * 1024;
  const MAX_IMAGE_EDGE = 8192;
  const MAX_IMAGE_PIXELS = 40 * 1000 * 1000;
  const STORES = new Set(["casting", "poster", "project-reference"]);
  const ALLOWED_PATHS = new Set(["manifest.json", "project.json"]);
  const RESERVED_IDS = new Set(["__proto__", "prototype", "constructor"]);
  const REQUIRED_ASSET_FIELDS = ["store", "sourceId", "path", "mime", "size", "sha256", "meta", "usages"];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function values(value) {
    return Array.isArray(value) ? value : [];
  }

  function ids(items) {
    return [...new Set(items.filter((id) => typeof id === "string" && id.trim()).map((id) => id.trim()))].sort();
  }

  function hasOwn(object, key) {
    return Boolean(object && Object.prototype.hasOwnProperty.call(object, key));
  }

  function lookup() {
    return Object.create(null);
  }

  function assertIdentifier(value, label = "资源编号") {
    if (typeof value !== "string" || !value.trim() || RESERVED_IDS.has(value)) throw new Error(`${label}不安全。`);
    return value;
  }

  function referenceGroups(project) {
    const refs = collectReferencedAssetIds(project);
    return {
      casting: refs.castingIds,
      poster: refs.posterIds,
      "project-reference": refs.projectReferenceIds
    };
  }

  function assertReferencesCovered(project, assets) {
    const available = new Map();
    values(assets).forEach((asset) => {
      const store = asset?.store;
      const sourceId = asset?.sourceId;
      if (STORES.has(store) && typeof sourceId === "string") available.set(`${store}\u0000${sourceId}`, true);
    });
    Object.keys(referenceGroups(project)).forEach((store) => referenceGroups(project)[store].forEach((sourceId) => {
      assertIdentifier(sourceId);
      if (!available.has(`${store}\u0000${sourceId}`)) throw new Error("项目包缺少被引用的资源。");
    }));
  }

  function collectReferencedAssetIds(project = {}) {
    const casting = project.workspaces?.casting || {};
    const poster = project.workspaces?.poster || {};
    const compositor = poster.posterCompositor || poster.compositor || {};
    const castingIds = [
      casting.referenceAsset?.id,
      casting.referenceAssetId,
      ...values(casting.versions).map((version) => version?.referenceAssetId)
    ];
    const posterIds = [compositor.sourceAsset?.id, compositor.titleAsset?.id, poster.sourceAsset?.id, poster.titleAsset?.id];
    const projectReferenceIds = [
      ...values(project.creativeBrief?.referenceAssetIds),
      ...values(project.assetLocks).flatMap((asset) => [
        ...values(asset?.referenceAssetIds),
        ...values(asset?.masterVersions).flatMap((version) => values(version?.referenceAssetIds))
      ]),
      ...values(project.scenes).flatMap((scene) => values(scene?.shots).flatMap((shot) =>
        values(shot?.productionResults).filter((result) => result?.selected === true).map((result) => result.keyframeReferenceId)))
    ];
    return { castingIds: ids(castingIds), posterIds: ids(posterIds), projectReferenceIds: ids(projectReferenceIds) };
  }

  function projectForArchive(project = {}) {
    const result = clone(project);
    values(result.scenes).forEach((scene) => values(scene?.shots).forEach((shot) => {
      values(shot?.productionResults).forEach((record) => {
        if (record.selected !== true) record.keyframeReferenceId = "";
      });
    }));
    return result;
  }

  function archivePath(store, index) {
    if (!STORES.has(store)) throw new Error("不支持的资源存储类型。");
    return `assets/${store}/${String(index + 1).padStart(6, "0")}.bin`;
  }

  function createArchiveManifest(project, assets, now) {
    const sourceAssets = values(assets);
    if (sourceAssets.length > MAX_ASSETS) throw new Error("项目包图片资源不能超过 160 个。");
    const manifestAssets = sourceAssets.map((asset, index) => {
      const source = asset && typeof asset === "object" ? asset : {};
      const store = source.store;
      const item = {
        store,
        sourceId: typeof source.sourceId === "string" ? source.sourceId : "",
        path: archivePath(store, index),
        mime: typeof source.mime === "string" ? source.mime : "",
        size: source.size,
        sha256: typeof source.sha256 === "string" ? source.sha256 : "",
        meta: source.meta,
        usages: source.usages
      };
      if (source.projectId) item.projectId = String(source.projectId);
      validateAssetFields(item, { checkPath: false });
      return item;
    });
    assertIdentifier(project?.id, "项目编号");
    assertReferencesCovered(project, manifestAssets);
    return {
      format: FORMAT,
      version: VERSION,
      exportedAt: typeof now === "string" ? now : new Date(now || Date.now()).toISOString(),
      project: projectForArchive(project),
      assets: manifestAssets
    };
  }

  function createImportIdMap(project = {}, assets, createId) {
    if (typeof createId !== "function") throw new TypeError("缺少 ID 生成器。");
    assertIdentifier(project.id, "项目编号");
    const sourceAssets = values(assets);
    assertReferencesCovered(project, sourceAssets);
    const map = { project: lookup(), casting: lookup(), poster: lookup(), "project-reference": lookup() };
    map.project[project.id] = createId("project");
    if (typeof map.project[project.id] !== "string" || !map.project[project.id]) throw new Error("ID 生成器返回了无效编号。");
    sourceAssets.forEach((asset) => {
      const store = asset?.store;
      const sourceId = asset?.sourceId;
      if (!STORES.has(store) || !sourceId) return;
      assertIdentifier(sourceId);
      if (!hasOwn(map[store], sourceId)) {
        const nextId = createId(store);
        if (typeof nextId !== "string" || !nextId || RESERVED_IDS.has(nextId)) throw new Error("ID 生成器返回了无效编号。");
        map[store][sourceId] = nextId;
      }
    });
    return map;
  }

  function rewrite(value, idMap) {
    if (typeof value !== "string" || !value) return "";
    if (!hasOwn(idMap, value) || typeof idMap[value] !== "string") throw new Error("项目包存在未映射的资源引用。");
    return idMap[value];
  }

  function rewriteProjectReferences(project, idMap = {}) {
    const result = clone(project);
    result.id = rewrite(result.id, idMap.project || lookup());
    const casting = result.workspaces?.casting;
    if (casting) {
      if (casting.referenceAsset) casting.referenceAsset.id = rewrite(casting.referenceAsset.id, idMap.casting || lookup());
      casting.referenceAssetId = rewrite(casting.referenceAssetId, idMap.casting || lookup());
      values(casting.versions).forEach((version) => { version.referenceAssetId = rewrite(version.referenceAssetId, idMap.casting || lookup()); });
    }
    const poster = result.workspaces?.poster;
    const compositor = poster?.posterCompositor || poster?.compositor;
    if (compositor) {
      ["sourceAsset", "titleAsset"].forEach((key) => { if (compositor[key]) compositor[key].id = rewrite(compositor[key].id, idMap.poster || lookup()); });
    }
    result.creativeBrief?.referenceAssetIds?.forEach((id, index, list) => { list[index] = rewrite(id, idMap["project-reference"] || lookup()); });
    values(result.assetLocks).forEach((asset) => {
      asset.referenceAssetIds?.forEach((id, index, list) => { list[index] = rewrite(id, idMap["project-reference"] || lookup()); });
      values(asset.masterVersions).forEach((version) => version.referenceAssetIds?.forEach((id, index, list) => { list[index] = rewrite(id, idMap["project-reference"] || lookup()); }));
    });
    values(result.scenes).forEach((scene) => values(scene?.shots).forEach((shot) => values(shot?.productionResults).forEach((record) => {
      record.keyframeReferenceId = rewrite(record.keyframeReferenceId, idMap["project-reference"] || lookup());
    })));
    return result;
  }

  function entryPath(entry) { return typeof entry === "string" ? entry : entry?.path; }
  function assertSafePath(path) {
    if (ALLOWED_PATHS.has(path)) return;
    if (!/^assets\/(casting|poster|project-reference)\/\d{6}\.bin$/.test(path)) throw new Error("项目包包含不安全或未知路径。");
  }

  function validateAssetFields(asset, { checkPath = true } = {}) {
    if (!asset || typeof asset !== "object" || REQUIRED_ASSET_FIELDS.some((field) => !hasOwn(asset, field))) throw new Error("资源清单字段不完整。");
    assertIdentifier(asset.sourceId);
    if (!STORES.has(asset.store) || typeof asset.mime !== "string" || !asset.mime.trim() || !Number.isSafeInteger(asset.size) || asset.size < 0 || typeof asset.sha256 !== "string" || !asset.sha256.trim() || !asset.meta || typeof asset.meta !== "object" || Array.isArray(asset.meta) || !Array.isArray(asset.usages)) throw new Error("资源清单字段不完整。");
    if (checkPath) {
      assertSafePath(asset.path);
      const match = /^assets\/([^/]+)\/\d{6}\.bin$/.exec(asset.path);
      if (!match || match[1] !== asset.store) throw new Error("资源存储类型与路径不一致。");
    }
  }

  function actualEntrySize(entry) {
    if (!entry || typeof entry !== "object") return null;
    const byteSizes = [entry.data?.byteLength, entry.bytes?.byteLength, entry.blob?.size]
      .filter((value) => Number.isSafeInteger(value) && value >= 0);
    if (byteSizes.length) {
      if (new Set(byteSizes).size !== 1) throw new Error("资源实际字节数不一致。");
      const actualSize = byteSizes[0];
      if (entry.size !== undefined && entry.size !== actualSize) throw new Error("资源声明大小与实际字节数不匹配。");
      return actualSize;
    }
    return Number.isSafeInteger(entry.size) && entry.size >= 0 ? entry.size : null;
  }

  function validateArchiveManifest(manifest, entries) {
    if (!manifest || manifest.format !== FORMAT || manifest.version !== VERSION) throw new Error("不支持的项目包版本。");
    const projectId = manifest.project?.id;
    assertIdentifier(projectId, "项目编号");
    const assets = values(manifest.assets);
    if (assets.length > MAX_ASSETS) throw new Error("项目包图片资源不能超过 160 个。");
    const suppliedEntries = values(entries);
    const paths = suppliedEntries.map(entryPath);
    if (new Set(paths).size !== paths.length) throw new Error("项目包包含重复文件。");
    suppliedEntries.forEach((entry) => assertSafePath(entryPath(entry)));
    if (!paths.includes("manifest.json") || !paths.includes("project.json")) throw new Error("项目包缺少必要文件。");
    const assetPaths = new Set();
    let total = 0;
    assets.forEach((asset) => {
      validateAssetFields(asset);
      if (!asset.path || assetPaths.has(asset.path)) throw new Error("资源清单路径无效或重复。");
      assetPaths.add(asset.path);
      if (asset.projectId && asset.projectId !== projectId) throw new Error("资源项目编号不一致。");
      assertSafePath(asset.path);
      if (!paths.includes(asset.path)) throw new Error("项目包缺少资源文件。");
      const entry = suppliedEntries.find((candidate) => entryPath(candidate) === asset.path);
      const actualSize = actualEntrySize(entry);
      if (actualSize === null || actualSize !== asset.size) throw new Error("资源声明大小与实际字节数不匹配。");
      if (actualSize > MAX_IMAGE_BYTES) throw new Error("图片资源超过 V1 大小限制。");
      total += actualSize;
      const meta = asset.meta || {};
      const width = Number(meta.width);
      const height = Number(meta.height);
      if (width || height) {
        if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > MAX_IMAGE_EDGE || height > MAX_IMAGE_EDGE || width * height > MAX_IMAGE_PIXELS) throw new Error("图片尺寸超过 V1 限制。");
      }
    });
    assertReferencesCovered(manifest.project, assets);
    const projectEntry = suppliedEntries.find((entry) => entryPath(entry) === "project.json");
    const projectSize = actualEntrySize(projectEntry) ?? 0;
    if (projectSize > MAX_PROJECT_BYTES) throw new Error("项目数据超过 V1 大小限制。");
    if (total > MAX_ARCHIVE_BYTES) throw new Error("项目包超过 250 MB 限制。");
    return true;
  }

  return { collectReferencedAssetIds, projectForArchive, createArchiveManifest, createImportIdMap, rewriteProjectReferences, validateArchiveManifest };
});
