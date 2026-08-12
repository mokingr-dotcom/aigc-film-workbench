(function initCastingAssetStore(root) {
  const DB_NAME = "aigc-film-workbench-assets-v1";
  const STORE_NAME = "casting-images";
  const MAX_BYTES = 15 * 1024 * 1024;
  const MAX_EDGE = 2560;
  const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

  function planImageProcessing({ type, width, height, transparent = false } = {}) {
    const longestEdge = Math.max(width || 0, height || 0);
    const scale = longestEdge > MAX_EDGE ? MAX_EDGE / longestEdge : 1;
    const targetWidth = Math.max(1, Math.round((width || 1) * scale));
    const targetHeight = Math.max(1, Math.round((height || 1) * scale));
    const outputType = type === "image/png" && transparent ? "image/png" : "image/webp";
    const resized = targetWidth !== width || targetHeight !== height;
    return {
      width: targetWidth,
      height: targetHeight,
      outputType,
      quality: 0.9,
      shouldEncode: resized || outputType !== type || type === "image/jpeg" || type === "image/webp"
    };
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { planImageProcessing };
  }

  function validateFile(file) {
    if (!file || !ACCEPTED_TYPES.has(file.type)) {
      return { ok: false, error: "仅支持 JPG、PNG 或 WebP 图片。" };
    }
    if (file.size > MAX_BYTES) {
      return { ok: false, error: "图片不能超过 15MB。" };
    }
    return { ok: true };
  }

  function openDatabase() {
    if (!root.indexedDB) {
      return Promise.reject(new Error("当前浏览器不支持本地图片存储。"));
    }

    return new Promise((resolve, reject) => {
      const request = root.indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("无法打开本地图片存储。"));
    });
  }

  function getImage(file) {
    if (typeof root.createImageBitmap === "function") {
      return root.createImageBitmap(file);
    }

    return new Promise((resolve, reject) => {
      if (!root.Image || !root.URL || typeof root.URL.createObjectURL !== "function") {
        reject(new Error("当前浏览器无法读取图片。"));
        return;
      }
      const image = new root.Image();
      const url = root.URL.createObjectURL(file);
      image.onload = () => {
        root.URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        root.URL.revokeObjectURL(url);
        reject(new Error("图片无法读取或已损坏。"));
      };
      image.src = url;
    });
  }

  function createCanvas(width, height) {
    if (typeof root.OffscreenCanvas === "function") {
      return new root.OffscreenCanvas(width, height);
    }
    if (root.document && typeof root.document.createElement === "function") {
      const canvas = root.document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      return canvas;
    }
    throw new Error("当前浏览器无法处理图片。");
  }

  function canvasToBlob(canvas, type, quality) {
    if (typeof canvas.convertToBlob === "function") {
      return canvas.convertToBlob({ type, quality });
    }
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("图片处理失败。"));
      }, type, quality);
    });
  }

  function hasTransparency(context, width, height) {
    if (!context || typeof context.getImageData !== "function") return false;
    const pixels = context.getImageData(0, 0, width, height).data;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] < 255) return true;
    }
    return false;
  }

  function metadataFor(file, blob, width, height) {
    return {
      name: file.name || "reference-image",
      type: blob.type || file.type,
      width,
      height,
      size: blob.size,
      updatedAt: new Date().toISOString()
    };
  }

  async function prepareImage(file) {
    const validation = validateFile(file);
    if (!validation.ok) throw new Error(validation.error);

    let image;
    try {
      image = await getImage(file);
      const width = image.width || image.naturalWidth;
      const height = image.height || image.naturalHeight;
      if (!width || !height) throw new Error("图片无法读取或已损坏。");

      const initialPlan = planImageProcessing({ type: file.type, width, height });
      const canvas = createCanvas(initialPlan.width, initialPlan.height);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("当前浏览器无法处理图片。");
      context.drawImage(image, 0, 0, initialPlan.width, initialPlan.height);

      const transparent = file.type === "image/png" && hasTransparency(context, initialPlan.width, initialPlan.height);
      const plan = planImageProcessing({ type: file.type, width, height, transparent });
      if (!plan.shouldEncode) {
        return { blob: file, meta: metadataFor(file, file, width, height) };
      }

      const blob = await canvasToBlob(canvas, plan.outputType, plan.quality);
      return {
        blob,
        meta: metadataFor(file, blob, plan.width, plan.height)
      };
    } catch (error) {
      if (error && error.message === "图片无法读取或已损坏。") throw error;
      throw new Error(error && error.message ? error.message : "图片处理失败。");
    } finally {
      if (image && typeof image.close === "function") image.close();
    }
  }

  function withoutBlob(record) {
    const meta = { ...record };
    delete meta.blob;
    return meta;
  }

  async function put(blob, meta = {}) {
    if (!blob) throw new Error("缺少要保存的图片。");
    const id = meta.id || `asset-${crypto.randomUUID()}`;
    const record = { id, blob, ...meta };
    record.id = id;
    record.blob = blob;

    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(record);
      transaction.oncomplete = () => {
        database.close();
        resolve(withoutBlob(record));
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error || new Error("图片保存失败。"));
      };
      transaction.onabort = () => {
        database.close();
        reject(transaction.error || new Error("图片保存失败。"));
      };
    });
  }

  function importedRecord({ id, blob, meta = {}, projectId, importToken } = {}) {
    const BlobType = root.Blob || (typeof Blob === "function" ? Blob : null);
    const normalizedId = typeof id === "string" ? id.trim() : "";
    const sourceMeta = meta && typeof meta === "object" && !Array.isArray(meta) ? meta : null;
    const type = typeof sourceMeta?.type === "string" ? sourceMeta.type.trim().toLowerCase() : "";
    const width = sourceMeta?.width;
    const height = sourceMeta?.height;
    const normalizedProjectId = projectId === undefined ? "" : typeof projectId === "string" ? projectId.trim() : "";
    if (!normalizedId || normalizedId.length > 180) throw new Error("图片 ID 无效。");
    if (!BlobType || !(blob instanceof BlobType) || !ACCEPTED_TYPES.has(blob.type.toLowerCase())) throw new Error("图片 Blob 无效。");
    if (!sourceMeta || !ACCEPTED_TYPES.has(type) || blob.type.toLowerCase() !== type) throw new Error("图片元数据类型无效。");
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > MAX_EDGE || height > MAX_EDGE) throw new Error("图片尺寸无效。");
    if (!Number.isInteger(sourceMeta.size) || sourceMeta.size !== blob.size || sourceMeta.size < 1 || sourceMeta.size > MAX_BYTES) throw new Error("图片大小无效。");
    if (projectId !== undefined && (!normalizedProjectId || normalizedProjectId.length > 180)) throw new Error("项目编号无效。");
    if (typeof importToken !== "string" || !importToken) throw new Error("导入令牌无效。");
    return { ...sourceMeta, id: normalizedId, blob, ...(normalizedProjectId ? { projectId: normalizedProjectId } : {}), importToken, type, width, height, size: blob.size };
  }

  async function createImportedRecord(input) {
    const record = importedRecord(input);
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).add(record);
      transaction.oncomplete = () => { database.close(); resolve(withoutBlob(record)); };
      transaction.onerror = () => { database.close(); reject(transaction.error || new Error("图片导入失败。")); };
      transaction.onabort = () => { database.close(); reject(transaction.error || new Error("图片导入失败。")); };
    });
  }

  async function get(id) {
    if (!id) return null;
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(id);
      let result = null;
      request.onsuccess = () => {
        const record = request.result;
        result = record ? { blob: record.blob, meta: withoutBlob(record) } : null;
      };
      transaction.oncomplete = () => {
        database.close();
        resolve(result);
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error || new Error("图片读取失败。"));
      };
      transaction.onabort = () => {
        database.close();
        reject(transaction.error || new Error("图片读取失败。"));
      };
    });
  }

  async function remove(id) {
    if (!id) return;
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(id);
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error || new Error("图片删除失败。"));
      };
      transaction.onabort = () => {
        database.close();
        reject(transaction.error || new Error("图片删除失败。"));
      };
    });
  }

  async function removeImportedRecord(id, importToken) {
    if (!id) return false;
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      let removed = false;
      request.onsuccess = () => {
        if (request.result && request.result.importToken === importToken) {
          store.delete(id);
          removed = true;
        }
      };
      transaction.oncomplete = () => { database.close(); resolve(removed); };
      transaction.onerror = () => { database.close(); reject(transaction.error || new Error("图片删除失败。")); };
      transaction.onabort = () => { database.close(); reject(transaction.error || new Error("图片删除失败。")); };
    });
  }

  async function storeExample(url, name) {
    const fetcher = root.fetch || (typeof fetch === "function" ? fetch : null);
    if (!fetcher) throw new Error("当前浏览器无法读取示例图片。");
    const response = await fetcher(url);
    if (!response.ok) throw new Error("示例图片读取失败。");
    const blob = await response.blob();
    const fileName = name || String(url).split("/").pop() || "example-image";
    const FileCtor = root.File || (typeof File === "function" ? File : null);
    if (!FileCtor) throw new Error("当前浏览器无法读取示例图片。");
    const file = new FileCtor([blob], fileName, { type: blob.type || "image/png" });
    const prepared = await prepareImage(file);
    return put(prepared.blob, prepared.meta);
  }

  const api = {
    validateFile,
    planImageProcessing,
    prepareImage,
    put,
    createImportedRecord,
    get,
    remove,
    removeImportedRecord,
    storeExample
  };
  root.aigcCastingAssetStore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
