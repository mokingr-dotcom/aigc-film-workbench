(function initPosterAssetStore(root) {
  "use strict";

  const DB_NAME = "aigc-poster-compositor-assets-v1";
  const STORE_NAME = "poster-images";
  const MAX_BYTES = 20 * 1024 * 1024;
  const LIMITS = {
    source: { types: ["image/jpeg", "image/png", "image/webp"], maxEdge: 12000, maxPixels: 50000000 },
    title: { types: ["image/png"], maxEdge: 8000, maxPixels: 32000000 }
  };

  function validatePosterFile(file, kind = "source") {
    const limit = LIMITS[kind];
    if (!limit) return { ok: false, error: "未知图片用途" };
    if (!file || !limit.types.includes(file.type)) {
      return { ok: false, error: kind === "title" ? "片名字标只支持 PNG 图片" : "海报只支持 JPG、PNG 或 WebP 图片" };
    }
    if (!Number.isFinite(file.size) || file.size <= 0) return { ok: false, error: "图片文件为空或已损坏" };
    if (file.size > MAX_BYTES) return { ok: false, error: "图片不能超过 20 MB" };
    return { ok: true };
  }

  function validatePosterDimensions({ width, height } = {}, kind = "source") {
    const limit = LIMITS[kind];
    if (!limit) return { ok: false, error: "未知图片用途" };
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
      return { ok: false, error: "无法读取图片尺寸" };
    }
    if (width > limit.maxEdge || height > limit.maxEdge || width * height > limit.maxPixels) {
      return { ok: false, error: kind === "title" ? "字标 PNG 最大 8000 像素且不超过 3200 万像素" : "海报最大 12000 像素且不超过 5000 万像素" };
    }
    return { ok: true };
  }

  function metadataWithoutBlob(record) {
    if (!record) return null;
    const { blob, ...metadata } = record;
    return { ...metadata };
  }

  function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("本地图片数据库操作失败"));
      transaction.onabort = () => reject(transaction.error || new Error("本地图片数据库操作已取消"));
    });
  }

  function openDatabase() {
    if (!root.indexedDB) return Promise.reject(new Error("当前浏览器不支持本地图片保存"));
    return new Promise((resolve, reject) => {
      const request = root.indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("无法打开本地图片数据库"));
    });
  }

  async function withStore(mode, operation) {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      const value = await operation(store, transaction);
      await transactionDone(transaction);
      return value;
    } finally {
      database.close();
    }
  }

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("本地图片读写失败"));
    });
  }

  async function detectPngTransparency(image, width, height) {
    if (!root.document) return false;
    const maxSample = 512;
    const scale = Math.min(1, maxSample / Math.max(width, height));
    const canvas = root.document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let index = 3; index < pixels.length; index += 4) if (pixels[index] < 250) return true;
    return false;
  }

  async function inspectPosterImage(file, kind = "source") {
    const fileCheck = validatePosterFile(file, kind);
    if (!fileCheck.ok) throw new Error(fileCheck.error);
    if (!root.URL || !root.Image) throw new Error("当前环境无法解码图片");
    const url = root.URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => {
        const candidate = new root.Image();
        candidate.onload = () => resolve(candidate);
        candidate.onerror = () => reject(new Error("图片解码失败，请检查文件是否损坏"));
        candidate.src = url;
      });
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      const dimensionCheck = validatePosterDimensions({ width, height }, kind);
      if (!dimensionCheck.ok) throw new Error(dimensionCheck.error);
      const transparent = kind === "title" ? await detectPngTransparency(image, width, height) : null;
      return { width, height, transparent };
    } finally {
      root.URL.revokeObjectURL(url);
    }
  }

  function createAssetId(kind) {
    const token = root.crypto?.randomUUID ? root.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `poster-${kind}-${token}`;
  }

  async function put(blob, meta = {}) {
    const kind = meta.kind === "title" ? "title" : "source";
    const record = {
      id: meta.id || createAssetId(kind),
      blob,
      kind,
      name: String(meta.name || "image").slice(0, 180),
      type: blob.type,
      size: blob.size,
      width: Number(meta.width) || 0,
      height: Number(meta.height) || 0,
      transparent: kind === "title" ? Boolean(meta.transparent) : null,
      updatedAt: new Date().toISOString()
    };
    await withStore("readwrite", (store) => requestResult(store.put(record)));
    return metadataWithoutBlob(record);
  }

  function importedRecord({ id, blob, meta = {}, projectId, importToken } = {}) {
    const BlobType = root.Blob || (typeof Blob === "function" ? Blob : null);
    const sourceMeta = meta && typeof meta === "object" && !Array.isArray(meta) ? meta : null;
    const kind = sourceMeta?.kind === "title" ? "title" : sourceMeta?.kind === "source" ? "source" : "";
    const normalizedId = typeof id === "string" ? id.trim() : "";
    const type = typeof sourceMeta?.type === "string" ? sourceMeta.type.trim().toLowerCase() : "";
    const width = sourceMeta?.width;
    const height = sourceMeta?.height;
    const normalizedProjectId = projectId === undefined ? "" : typeof projectId === "string" ? projectId.trim() : "";
    if (!normalizedId || normalizedId.length > 180) throw new Error("海报图片 ID 无效");
    if (!BlobType || !(blob instanceof BlobType) || !type || blob.type.toLowerCase() !== type) throw new Error("海报图片 Blob 无效");
    if (!sourceMeta || !LIMITS[kind] || !LIMITS[kind].types.includes(type)) throw new Error("海报图片元数据无效");
    if (!Number.isInteger(sourceMeta.size) || sourceMeta.size !== blob.size || sourceMeta.size < 1 || sourceMeta.size > MAX_BYTES) throw new Error("海报图片大小无效");
    const dimensions = validatePosterDimensions({ width, height }, kind);
    if (!dimensions.ok) throw new Error(dimensions.error);
    if (projectId !== undefined && (!normalizedProjectId || normalizedProjectId.length > 180)) throw new Error("项目编号无效");
    if (typeof importToken !== "string" || !importToken) throw new Error("导入令牌无效");
    return {
      id: normalizedId, blob, kind, name: String(sourceMeta.name || "image").slice(0, 180), type,
      size: blob.size, width, height, transparent: kind === "title" ? Boolean(sourceMeta.transparent) : null,
      ...(normalizedProjectId ? { projectId: normalizedProjectId } : {}), importToken,
      updatedAt: typeof sourceMeta.updatedAt === "string" ? sourceMeta.updatedAt : new Date().toISOString()
    };
  }

  async function createImportedRecord(input) {
    const record = importedRecord(input);
    await withStore("readwrite", (store) => requestResult(store.add(record)));
    return metadataWithoutBlob(record);
  }

  async function get(id) {
    if (!id) return null;
    return withStore("readonly", (store) => requestResult(store.get(id)));
  }

  async function remove(id) {
    if (!id) return;
    await withStore("readwrite", (store) => requestResult(store.delete(id)));
  }

  async function removeImportedRecord(id, importToken) {
    if (!id) return false;
    return withStore("readwrite", async (store) => {
      const record = await requestResult(store.get(id));
      if (!record || record.importToken !== importToken) return false;
      await requestResult(store.delete(id));
      return true;
    });
  }

  async function list() {
    return withStore("readonly", async (store) => (await requestResult(store.getAll())).map(metadataWithoutBlob));
  }

  const api = { DB_NAME, STORE_NAME, MAX_BYTES, LIMITS, validatePosterFile, validatePosterDimensions, metadataWithoutBlob, inspectPosterImage, detectPngTransparency, put, createImportedRecord, get, remove, removeImportedRecord, list };
  root.aigcPosterAssetStore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
