(function initProjectReferenceStore(root) {
  const DB_NAME = "aigc-film-workbench-project-references-v1";
  const STORE_NAME = "project-references";
  const MAX_BYTES = 20 * 1024 * 1024;
  const MAX_EDGE = 8192;
  const MAX_PIXELS = 40 * 1000 * 1000;
  const RESERVED_IDS = new Set(["__proto__", "prototype", "constructor"]);

  function withoutBlob(record) {
    if (!record) return null;
    const metadata = { ...record };
    delete metadata.blob;
    return metadata;
  }

  function preparedRecord(record) {
    const source = record && typeof record === "object" && !Array.isArray(record) ? record : null;
    if (!source) throw new TypeError("参考图片记录格式无效。");
    const id = typeof source.id === "string" ? source.id.trim() : "";
    const projectId = typeof source.projectId === "string" ? source.projectId.trim() : "";
    const BlobType = root.Blob || (typeof Blob === "function" ? Blob : null);
    const blob = source.blob;
    const type = typeof source.type === "string" ? source.type.trim().toLowerCase() : "";
    const width = source.width;
    const height = source.height;
    const size = source.size;

    if (!id || id.length > 180 || RESERVED_IDS.has(id)) throw new Error("参考图片 ID 无效。");
    if (!projectId || projectId.length > 180) throw new Error("缺少项目编号。");
    if (!BlobType || !(blob instanceof BlobType)) throw new Error("参考图片必须包含 Blob。");
    if (!type.startsWith("image/") || blob.type.toLowerCase() !== type) throw new Error("参考图片必须是 image 类型。");
    if (!Number.isInteger(size) || size !== blob.size || size < 1 || size > MAX_BYTES) throw new Error("参考图片大小无效。");
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > MAX_EDGE || height > MAX_EDGE || width * height > MAX_PIXELS) {
      throw new Error("参考图片尺寸无效。");
    }

    return {
      id,
      projectId,
      blob,
      name: typeof source.name === "string" ? source.name.slice(0, 180) : "reference-image",
      type,
      width,
      height,
      size,
      updatedAt: typeof source.updatedAt === "string" && source.updatedAt.length <= 80 ? source.updatedAt : new Date().toISOString()
    };
  }

  function openDatabase() {
    if (!root.indexedDB) return Promise.reject(new Error("当前浏览器不支持本地图片存储。"));
    return new Promise((resolve, reject) => {
      const request = root.indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("无法打开项目参考图存储。"));
    });
  }

  async function putFile(file, projectId) {
    const processor = root.aigcCastingAssetStore?.prepareImage;
    if (typeof processor !== "function") throw new Error("当前浏览器无法处理参考图片。");
    if (!projectId) throw new Error("缺少项目编号。");
    const prepared = await processor(file);
    const record = {
      id: `project-ref-${crypto.randomUUID()}`,
      projectId,
      blob: prepared.blob,
      name: prepared.meta.name,
      type: prepared.meta.type,
      width: prepared.meta.width,
      height: prepared.meta.height,
      size: prepared.meta.size,
      updatedAt: new Date().toISOString()
    };
    return putPreparedRecord(record);
  }

  async function putPreparedRecord(record) {
    const prepared = preparedRecord(record);
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).add(prepared);
      transaction.oncomplete = () => {
        database.close();
        resolve(withoutBlob(prepared));
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error?.name === "ConstraintError" ? new Error("参考图片 ID 必须是新的。") : transaction.error || new Error("参考图片保存失败。"));
      };
      transaction.onabort = () => {
        database.close();
        reject(transaction.error?.name === "ConstraintError" ? new Error("参考图片 ID 必须是新的。") : transaction.error || new Error("参考图片保存失败。"));
      };
    });
  }

  async function createImportedRecord({ id, blob, meta = {}, projectId, importToken } = {}) {
    if (!projectId) throw new Error("缺少项目编号。");
    if (!meta || typeof meta !== "object" || Array.isArray(meta)) throw new Error("参考图片元数据无效。");
    const prepared = preparedRecord({ ...meta, id, projectId, blob, importToken });
    if (typeof importToken !== "string" || !importToken) throw new Error("导入令牌无效。");
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).add({ ...prepared, importToken });
      transaction.oncomplete = () => { database.close(); resolve(withoutBlob({ ...prepared, importToken })); };
      transaction.onerror = () => { database.close(); reject(transaction.error?.name === "ConstraintError" ? new Error("参考图片 ID 必须是新的。") : transaction.error || new Error("参考图片导入失败。")); };
      transaction.onabort = () => { database.close(); reject(transaction.error?.name === "ConstraintError" ? new Error("参考图片 ID 必须是新的。") : transaction.error || new Error("参考图片导入失败。")); };
    });
  }

  async function getRecord(id) {
    if (!id) return null;
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(id);
      let result = null;
      request.onsuccess = () => { result = request.result || null; };
      transaction.oncomplete = () => {
        database.close();
        resolve(result ? { ...result } : null);
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error || new Error("参考图片读取失败。"));
      };
      transaction.onabort = () => {
        database.close();
        reject(transaction.error || new Error("参考图片读取失败。"));
      };
    });
  }

  async function get(id) {
    const record = await getRecord(id);
    return record ? { blob: record.blob, meta: withoutBlob(record) } : null;
  }

  async function listForProject(projectId) {
    if (!projectId) return [];
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).getAll();
      let records = [];
      request.onsuccess = () => { records = Array.isArray(request.result) ? request.result : []; };
      transaction.oncomplete = () => {
        database.close();
        resolve(records.filter((record) => record.projectId === projectId).map(withoutBlob));
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error || new Error("参考图片读取失败。"));
      };
      transaction.onabort = () => {
        database.close();
        reject(transaction.error || new Error("参考图片读取失败。"));
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
        reject(transaction.error || new Error("参考图片删除失败。"));
      };
      transaction.onabort = () => {
        database.close();
        reject(transaction.error || new Error("参考图片删除失败。"));
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
      transaction.onerror = () => { database.close(); reject(transaction.error || new Error("参考图片删除失败。")); };
      transaction.onabort = () => { database.close(); reject(transaction.error || new Error("参考图片删除失败。")); };
    });
  }

  const api = { DB_NAME, STORE_NAME, MAX_BYTES, MAX_EDGE, MAX_PIXELS, putFile, putPreparedRecord, createImportedRecord, get, getRecord, listForProject, remove, removeImportedRecord };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.aigcProjectReferenceStore = api;
})(typeof window !== "undefined" ? window : globalThis);
