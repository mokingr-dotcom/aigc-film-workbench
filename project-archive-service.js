(function initProjectArchiveService(root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.aigcProjectArchiveService = api;
})(typeof window !== "undefined" ? window : globalThis, function createProjectArchiveServiceApi(root) {
  const JOURNAL_KEY = "aigc-project-package-import-journal-v1";
  const MAX_ARCHIVE_BYTES = 250 * 1024 * 1024;
  const MAX_COMPRESSION_RATIO = 100;
  const MAX_ASSETS = 160;
  const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
  const MAX_PROJECT_BYTES = 2 * 1024 * 1024;
  const STORE_NAMES = ["casting", "poster", "project-reference"];
  const RESERVED_IDS = new Set(["__proto__", "prototype", "constructor"]);
  const MAX_IMPORT_ID_ATTEMPTS = 32;
  const CASTING_MAX_BYTES = 15 * 1024 * 1024;
  const CASTING_MAX_EDGE = 2560;
  const POSTER_LIMITS = {
    source: { types: ["image/jpeg", "image/png", "image/webp"], maxEdge: 12000, maxPixels: 50000000 },
    title: { types: ["image/png"], maxEdge: 8000, maxPixels: 32000000 }
  };
  const REFERENCE_MAX_EDGE = 8192;
  const REFERENCE_MAX_PIXELS = 40 * 1000 * 1000;

  function isStableImportId(value) {
    return typeof value === "string" && value === value.trim() && value.length > 0 && value.length <= 180 && !RESERVED_IDS.has(value);
  }

  function defaultArchive() {
    if (root.aigcProjectArchive) return root.aigcProjectArchive;
    if (typeof require === "function") return require("./project-archive.js");
    throw new Error("项目包合同不可用。");
  }

  function defaultFflate() {
    if (root.fflate) return root.fflate;
    if (typeof require === "function") return require("./vendor/fflate-0.8.2.min.js");
    throw new Error("离线 ZIP 支持不可用。");
  }

  function defaultStores() {
    return {
      casting: root.aigcCastingAssetStore,
      poster: root.aigcPosterAssetStore,
      "project-reference": root.aigcProjectReferenceStore
    };
  }

  function getStorage(value) {
    if (value) return value;
    try { return root.localStorage || null; } catch (error) { return null; }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function utf8Encode(value) {
    const Encoder = root.TextEncoder || (typeof TextEncoder === "function" ? TextEncoder : null);
    if (!Encoder) throw new Error("当前环境不支持文本编码。");
    return new Encoder().encode(value);
  }

  function utf8Decode(value) {
    const Decoder = root.TextDecoder || (typeof TextDecoder === "function" ? TextDecoder : null);
    if (!Decoder) throw new Error("当前环境不支持文本解码。");
    return new Decoder().decode(value);
  }

  function bytesEqual(left, right) {
    return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
  }

  function hex(bytes) {
    return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function sha256(bytes) {
    const cryptoApi = root.crypto?.subtle ? root.crypto : (typeof require === "function" ? require("crypto").webcrypto : null);
    if (!cryptoApi?.subtle) throw new Error("当前环境不支持 SHA-256 校验。");
    const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const digest = await cryptoApi.subtle.digest("SHA-256", view);
    return hex(digest);
  }

  async function bytesFrom(value) {
    if (value instanceof Uint8Array) return new Uint8Array(value);
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    if (value && typeof value.arrayBuffer === "function") return new Uint8Array(await value.arrayBuffer());
    throw new Error("无法读取项目包文件。");
  }

  function assertImageMime(mime) {
    if (typeof mime !== "string" || !/^image\/(jpeg|png|webp)$/i.test(mime)) throw new Error("项目包包含不支持的图片类型。");
    return mime.toLowerCase();
  }

  function imageFormatError() {
    throw new Error("项目包图片格式损坏或与声明类型不一致。");
  }

  function pngImageInfo(bytes) {
    if (bytes.byteLength < 8 || ![0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte)) imageFormatError();
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let cursor = 8;
    let width = 0;
    let height = 0;
    let sawHeader = false;
    let sawData = false;
    let sawEnd = false;
    while (cursor < bytes.byteLength) {
      if (cursor + 12 > bytes.byteLength) imageFormatError();
      const length = view.getUint32(cursor, false);
      const type = String.fromCharCode(bytes[cursor + 4], bytes[cursor + 5], bytes[cursor + 6], bytes[cursor + 7]);
      const dataStart = cursor + 8;
      const dataEnd = dataStart + length;
      if (dataEnd + 4 > bytes.byteLength || dataEnd < dataStart) imageFormatError();
      if (!sawHeader) {
        if (type !== "IHDR" || length !== 13) imageFormatError();
        width = view.getUint32(dataStart, false);
        height = view.getUint32(dataStart + 4, false);
        const bitDepth = bytes[dataStart + 8];
        const colorType = bytes[dataStart + 9];
        const validDepth = (colorType === 0 && [1, 2, 4, 8, 16].includes(bitDepth)) ||
          (colorType === 2 && [8, 16].includes(bitDepth)) ||
          (colorType === 3 && [1, 2, 4, 8].includes(bitDepth)) ||
          (colorType === 4 && [8, 16].includes(bitDepth)) ||
          (colorType === 6 && [8, 16].includes(bitDepth));
        if (!width || !height || !validDepth || bytes[dataStart + 10] !== 0 || bytes[dataStart + 11] !== 0 || bytes[dataStart + 12] !== 0) imageFormatError();
        sawHeader = true;
      } else if (type === "IDAT") {
        sawData = true;
      } else if (type === "IEND") {
        if (length !== 0 || !sawData || dataEnd + 4 !== bytes.byteLength) imageFormatError();
        sawEnd = true;
        break;
      }
      cursor = dataEnd + 4;
    }
    if (!sawHeader || !sawData || !sawEnd) imageFormatError();
    return { mime: "image/png", width, height };
  }

  function jpegImageInfo(bytes) {
    if (bytes.byteLength < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) imageFormatError();
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const startOfFrame = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
    let cursor = 2;
    let width = 0;
    let height = 0;
    let inScan = false;
    let sawScan = false;
    while (cursor < bytes.byteLength) {
      let marker;
      if (inScan) {
        while (cursor < bytes.byteLength && bytes[cursor] !== 0xff) cursor += 1;
        if (cursor >= bytes.byteLength) imageFormatError();
        cursor += 1;
        while (cursor < bytes.byteLength && bytes[cursor] === 0xff) cursor += 1;
        if (cursor >= bytes.byteLength) imageFormatError();
        marker = bytes[cursor++];
        if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      } else {
        if (bytes[cursor++] !== 0xff) imageFormatError();
        while (cursor < bytes.byteLength && bytes[cursor] === 0xff) cursor += 1;
        if (cursor >= bytes.byteLength) imageFormatError();
        marker = bytes[cursor++];
      }
      if (marker === 0xd9) {
        if (!sawScan || !width || !height || cursor !== bytes.byteLength) imageFormatError();
        return { mime: "image/jpeg", width, height };
      }
      if (marker === 0xd8 || marker === 0x00 || marker === 0xff) imageFormatError();
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (cursor + 2 > bytes.byteLength) imageFormatError();
      const length = view.getUint16(cursor, false);
      if (length < 2 || cursor + length > bytes.byteLength) imageFormatError();
      const dataStart = cursor + 2;
      if (startOfFrame.has(marker)) {
        if (length < 8) imageFormatError();
        height = view.getUint16(dataStart + 1, false);
        width = view.getUint16(dataStart + 3, false);
        const components = bytes[dataStart + 5];
        if (!width || !height || !components || length !== 8 + components * 3) imageFormatError();
      }
      cursor += length;
      if (marker === 0xda) {
        if (!width || !height || length < 8) imageFormatError();
        const components = bytes[dataStart];
        if (!components || length !== 6 + components * 2) imageFormatError();
        sawScan = true;
        inScan = true;
      }
    }
    imageFormatError();
  }

  function webpImageInfo(bytes) {
    if (bytes.byteLength < 20 || String.fromCharCode(...bytes.subarray(0, 4)) !== "RIFF" || String.fromCharCode(...bytes.subarray(8, 12)) !== "WEBP") imageFormatError();
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint32(4, true) !== bytes.byteLength - 8) imageFormatError();
    let cursor = 12;
    let width = 0;
    let height = 0;
    let imageWidth = 0;
    let imageHeight = 0;
    let sawImage = false;
    let sawExtendedHeader = false;
    while (cursor < bytes.byteLength) {
      if (cursor + 8 > bytes.byteLength) imageFormatError();
      const type = String.fromCharCode(...bytes.subarray(cursor, cursor + 4));
      const size = view.getUint32(cursor + 4, true);
      const dataStart = cursor + 8;
      const dataEnd = dataStart + size;
      const paddedEnd = dataEnd + (size % 2);
      if (dataEnd < dataStart || paddedEnd > bytes.byteLength) imageFormatError();
      if (type === "VP8X") {
        if (sawExtendedHeader || size !== 10) imageFormatError();
        sawExtendedHeader = true;
        width = 1 + bytes[dataStart + 4] + (bytes[dataStart + 5] << 8) + (bytes[dataStart + 6] << 16);
        height = 1 + bytes[dataStart + 7] + (bytes[dataStart + 8] << 8) + (bytes[dataStart + 9] << 16);
      } else if (type === "VP8 ") {
        if (size < 10 || bytes[dataStart + 3] !== 0x9d || bytes[dataStart + 4] !== 0x01 || bytes[dataStart + 5] !== 0x2a) imageFormatError();
        imageWidth = (view.getUint16(dataStart + 6, true) & 0x3fff) + 1;
        imageHeight = (view.getUint16(dataStart + 8, true) & 0x3fff) + 1;
        sawImage = true;
      } else if (type === "VP8L") {
        if (size < 5 || bytes[dataStart] !== 0x2f) imageFormatError();
        const bits = (bytes[dataStart + 1] | (bytes[dataStart + 2] << 8) | (bytes[dataStart + 3] << 16) | (bytes[dataStart + 4] << 24)) >>> 0;
        imageWidth = (bits & 0x3fff) + 1;
        imageHeight = ((bits >>> 14) & 0x3fff) + 1;
        sawImage = true;
      } else if (type === "ANMF") {
        if (!sawExtendedHeader || size < 16) imageFormatError();
        sawImage = true;
      }
      cursor = paddedEnd;
    }
    if (cursor !== bytes.byteLength || !sawImage) imageFormatError();
    if (!width || !height) {
      width = imageWidth;
      height = imageHeight;
    }
    if (!width || !height) imageFormatError();
    return { mime: "image/webp", width, height };
  }

  function imageInfo(bytes, mime) {
    const declaredMime = assertImageMime(mime);
    const info = declaredMime === "image/png" ? pngImageInfo(bytes) : declaredMime === "image/jpeg" ? jpegImageInfo(bytes) : webpImageInfo(bytes);
    if (info.mime !== declaredMime) imageFormatError();
    return info;
  }

  function validateStoreImageLimits(asset, mime, width, height, size) {
    if (asset.store === "casting") {
      if (size > CASTING_MAX_BYTES || width > CASTING_MAX_EDGE || height > CASTING_MAX_EDGE) throw new Error("角色参考图片不符合本地素材库限制。");
      return;
    }
    if (asset.store === "poster") {
      const kind = asset.meta?.kind;
      if (kind !== "source" && kind !== "title") throw new Error("海报图片用途元数据无效。");
      const limit = POSTER_LIMITS[kind];
      if (!limit.types.includes(mime) || width > limit.maxEdge || height > limit.maxEdge || width * height > limit.maxPixels) {
        throw new Error("海报图片不符合本地素材库限制。");
      }
      return;
    }
    if (asset.store === "project-reference" && (width > REFERENCE_MAX_EDGE || height > REFERENCE_MAX_EDGE || width * height > REFERENCE_MAX_PIXELS)) {
      throw new Error("项目参考图片不符合本地素材库限制。");
    }
  }

  async function defaultDecodeImage(blob) {
    const createBitmap = root.createImageBitmap || (typeof createImageBitmap === "function" ? createImageBitmap : null);
    if (createBitmap) {
      const bitmap = await createBitmap(blob);
      try { return { width: bitmap.width, height: bitmap.height }; } finally { bitmap.close?.(); }
    }
    const ImageCtor = root.Image || (typeof Image === "function" ? Image : null);
    const urlApi = root.URL || (typeof URL === "function" ? URL : null);
    if (!ImageCtor || !urlApi?.createObjectURL || !urlApi?.revokeObjectURL) throw new Error("当前环境不支持图片解码校验。");
    const url = urlApi.createObjectURL(blob);
    try {
      return await new Promise((resolve, reject) => {
        const image = new ImageCtor();
        image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () => reject(new Error("项目包图片解码失败。"));
        image.src = url;
      });
    } finally {
      urlApi.revokeObjectURL(url);
    }
  }

  function metadata(record) {
    const source = record?.meta && typeof record.meta === "object" ? record.meta : record;
    if (!source || typeof source !== "object") return {};
    const result = { ...source };
    delete result.blob;
    delete result.id;
    delete result.projectId;
    return result;
  }

  function recordBlob(record) {
    return record?.blob || record?.meta?.blob || null;
  }

  function usageList(project, store, sourceId) {
    const usage = [];
    const casting = project?.workspaces?.casting || {};
    const poster = project?.workspaces?.poster || {};
    const compositor = poster.posterCompositor || poster.compositor || {};
    if (store === "casting") {
      if (casting.referenceAsset?.id === sourceId || casting.referenceAssetId === sourceId) usage.push("casting.current");
      (Array.isArray(casting.versions) ? casting.versions : []).forEach((item, index) => {
        if (item?.referenceAssetId === sourceId) usage.push(`casting.versions.${index}`);
      });
    }
    if (store === "poster") {
      if (compositor.sourceAsset?.id === sourceId || poster.sourceAsset?.id === sourceId) usage.push("poster.source");
      if (compositor.titleAsset?.id === sourceId || poster.titleAsset?.id === sourceId) usage.push("poster.title");
    }
    if (store === "project-reference") {
      (project?.creativeBrief?.referenceAssetIds || []).forEach((id, index) => { if (id === sourceId) usage.push(`creativeBrief.${index}`); });
      (project?.assetLocks || []).forEach((asset, assetIndex) => (asset?.referenceAssetIds || []).forEach((id, index) => {
        if (id === sourceId) usage.push(`assetLocks.${assetIndex}.${index}`);
      }));
      (project?.scenes || []).forEach((scene, sceneIndex) => (scene?.shots || []).forEach((shot, shotIndex) => (shot?.productionResults || []).forEach((result, resultIndex) => {
        if (result?.selected === true && result.keyframeReferenceId === sourceId) usage.push(`scenes.${sceneIndex}.shots.${shotIndex}.results.${resultIndex}`);
      })));
    }
    return usage;
  }

  function projectSummary(project, assetCount, totalBytes) {
    const scenes = Array.isArray(project?.scenes) ? project.scenes : [];
    const shots = scenes.reduce((total, scene) => total + (Array.isArray(scene?.shots) ? scene.shots.length : 0), 0);
    const locks = Array.isArray(project?.assetLocks) ? project.assetLocks.length : 0;
    const selectedResults = scenes.reduce((total, scene) => total + (Array.isArray(scene?.shots) ? scene.shots.reduce((shotTotal, shot) => shotTotal + (Array.isArray(shot?.productionResults) ? shot.productionResults.filter((item) => item?.selected === true).length : 0), 0) : 0), 0);
    return { sceneCount: scenes.length, shotCount: shots, assetLockCount: locks, selectedResultCount: selectedResults, assetCount, totalBytes };
  }

  function safeFileName(project) {
    const name = String(project?.name || "project").replace(/[\\/:*?"<>|]+/g, "_").trim().slice(0, 80) || "project";
    return `AIGC_${name}.aigc-project.zip`;
  }

  function canonicalize(value) {
    if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw new Error("项目 JSON 包含不支持的值。");
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
    }
    throw new Error("项目 JSON 包含不支持的值。");
  }

  function canonicalProjectJson(project) {
    return canonicalize(project);
  }

  function hasZip64ExtraField(bytes, start, length) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const end = start + length;
    let cursor = start;
    while (cursor < end) {
      if (cursor + 4 > end) return true;
      const fieldId = view.getUint16(cursor, true);
      const fieldLength = view.getUint16(cursor + 2, true);
      if (cursor + 4 + fieldLength > end) return true;
      if (fieldId === 1) return true;
      cursor += 4 + fieldLength;
    }
    return false;
  }

  function directoryEntries(bytes) {
    let eocd = -1;
    for (let index = bytes.length - 22; index >= Math.max(0, bytes.length - 65557); index -= 1) {
      if (bytes[index] === 0x50 && bytes[index + 1] === 0x4b && bytes[index + 2] === 0x05 && bytes[index + 3] === 0x06) { eocd = index; break; }
    }
    if (eocd < 0) throw new Error("无效项目包 ZIP 文件。");
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (eocd + 22 > bytes.length || eocd + 22 + view.getUint16(eocd + 20, true) !== bytes.length) throw new Error("无效项目包 ZIP 尾部。");
    const disk = view.getUint16(eocd + 4, true);
    const directoryDisk = view.getUint16(eocd + 6, true);
    const count = view.getUint16(eocd + 10, true);
    const diskCount = view.getUint16(eocd + 8, true);
    const directorySize = view.getUint32(eocd + 12, true);
    const offset = view.getUint32(eocd + 16, true);
    if (disk !== 0 || directoryDisk !== 0 || diskCount !== count || count > MAX_ASSETS + 2 ||
      count === 0xffff || directorySize === 0xffffffff || offset === 0xffffffff || offset + directorySize !== eocd ||
      offset < 0 || directorySize > bytes.length) throw new Error("项目包 ZIP 目录布局不受支持。");
    let cursor = offset;
    const entries = [];
    const names = new Set();
    let totalSize = 0;
    for (let index = 0; index < count; index += 1) {
      if (cursor + 46 > bytes.length || view.getUint32(cursor, true) !== 0x02014b50) throw new Error("无效项目包 ZIP 目录。");
      const flags = view.getUint16(cursor + 8, true);
      const method = view.getUint16(cursor + 10, true);
      const startDisk = view.getUint16(cursor + 34, true);
      const compressedSize = view.getUint32(cursor + 20, true);
      const size = view.getUint32(cursor + 24, true);
      const nameSize = view.getUint16(cursor + 28, true);
      const extraSize = view.getUint16(cursor + 30, true);
      const commentSize = view.getUint16(cursor + 32, true);
      const localOffset = view.getUint32(cursor + 42, true);
      const start = cursor + 46;
      const end = start + nameSize;
      const recordEnd = end + extraSize + commentSize;
      if (end > bytes.length || recordEnd > eocd || flags & 1 || flags & 8 || startDisk !== 0 || (method !== 0 && method !== 8) ||
        hasZip64ExtraField(bytes, end, extraSize) ||
        compressedSize === 0xffffffff || size === 0xffffffff ||
        compressedSize === 0 && size > 0 || size > 0 && size / compressedSize > MAX_COMPRESSION_RATIO ||
        size > MAX_ARCHIVE_BYTES || compressedSize > MAX_ARCHIVE_BYTES) throw new Error("项目包 ZIP 条目不受支持。");
      let path;
      try { path = utf8Decode(bytes.subarray(start, end)); } catch (error) { throw new Error("项目包包含无效路径。"); }
      if (!/^[\x20-\x7e]+$/.test(path) || path.endsWith("/") || names.has(path) ||
        (path !== "manifest.json" && path !== "project.json" && !/^assets\/(casting|poster|project-reference)\/\d{6}\.bin$/.test(path))) throw new Error("项目包包含不安全或重复路径。");
      names.add(path);
      totalSize += size;
      if (totalSize > MAX_ARCHIVE_BYTES || (path === "manifest.json" || path === "project.json" ? size > MAX_PROJECT_BYTES : size > MAX_IMAGE_BYTES)) throw new Error("项目包条目超过大小限制。");
      if (localOffset + 30 > offset || view.getUint32(localOffset, true) !== 0x04034b50) throw new Error("项目包本地 ZIP 头无效。");
      const localFlags = view.getUint16(localOffset + 6, true);
      const localMethod = view.getUint16(localOffset + 8, true);
      const localNameSize = view.getUint16(localOffset + 26, true);
      const localExtraSize = view.getUint16(localOffset + 28, true);
      const dataStart = localOffset + 30 + localNameSize + localExtraSize;
      if (localFlags !== flags || localMethod !== method || localNameSize !== nameSize ||
        view.getUint32(localOffset + 18, true) !== compressedSize || view.getUint32(localOffset + 22, true) !== size ||
        dataStart > offset || dataStart + compressedSize > offset ||
        !bytes.subarray(localOffset + 30, localOffset + 30 + nameSize).every((byte, i) => byte === bytes[start + i])) throw new Error("项目包本地 ZIP 条目不一致。");
      entries.push({ path, size, compressedSize, uncompressedSize: size, localHeaderOffset: localOffset, dataOffset: dataStart });
      cursor = recordEnd;
    }
    if (cursor !== eocd) throw new Error("项目包 ZIP 目录大小无效。");
    return entries;
  }

  function manifestOnly(zip, bytes) {
    const extracted = zip.unzipSync(bytes, { filter(file) { return file.name === "manifest.json"; } });
    const value = extracted["manifest.json"];
    if (!value) throw new Error("项目包缺少必要文件。");
    return new Uint8Array(value);
  }

  function assertExactEntries(manifest, entryRecords) {
    const paths = entryRecords.map((entry) => entry.path);
    if (new Set(paths).size !== paths.length) throw new Error("项目包包含重复文件。");
    const expected = new Set(["manifest.json", "project.json", ...(manifest.assets || []).map((asset) => asset.path)]);
    if (paths.length !== expected.size || paths.some((path) => !expected.has(path))) throw new Error("项目包包含未知文件。");
  }

  function readJournal(storage) {
    if (!storage) return null;
    const raw = storage.getItem(JOURNAL_KEY);
    if (!raw) return null;
    let journal;
    try { journal = JSON.parse(raw); } catch (error) { throw new Error("项目包导入恢复记录已损坏，请先清理后重试。"); }
    if (!journal || !Array.isArray(journal.entries)) throw new Error("项目包导入恢复记录无效，请先清理后重试。");
    if (journal.version === 1) return journal;
    if (journal.version !== 2 || !isStableImportId(journal.operationId) || !isStableImportId(journal.projectId) ||
      !isStableImportId(journal.importToken) || !["staging", "metadata-committing", "rollback-pending"].includes(journal.phase) ||
      journal.entries.some((entry) => !entry || !STORE_NAMES.includes(entry.store) || !isStableImportId(entry.id) || entry.importToken !== journal.importToken)) {
      throw new Error("项目包导入恢复记录无效，请先清理后重试。");
    }
    return journal;
  }

  function saveJournal(storage, journal) {
    if (storage) storage.setItem(JOURNAL_KEY, JSON.stringify(journal));
  }

  function clearJournal(storage) {
    if (storage) storage.removeItem(JOURNAL_KEY);
  }

  function resolveStores(candidate, fallback) {
    const stores = candidate && STORE_NAMES.every((name) => candidate[name]) ? candidate : fallback;
    if (!stores || STORE_NAMES.some((name) => !stores[name])) throw new Error("本地图片存储不可用。");
    return stores;
  }

  function createDefaultId(kind) {
    const token = root.crypto?.randomUUID ? root.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${kind}-${token}`;
  }

  function createService(options = {}) {
    const archive = options.archive || defaultArchive();
    const zip = options.fflate || defaultFflate();
    const storage = getStorage(options.storage);
    const makeId = options.createId || createDefaultId;
    const decodeImage = options.decodeImage || defaultDecodeImage;
    const makeImportToken = options.createImportToken || (() => createDefaultId("import"));
    const configuredStores = options.stores || defaultStores();
    let latestImportStores = null;

    async function readStoredRecord(stores, store, id) {
      const adapter = stores[store];
      const record = store === "project-reference" && typeof adapter.getRecord === "function"
        ? await adapter.getRecord(id)
        : await adapter.get(id);
      const blob = recordBlob(record);
      if (!blob || typeof blob.arrayBuffer !== "function") throw new Error(`缺少被引用的本地图片：${id}`);
      return { blob, meta: metadata(record) };
    }

    async function exportActiveProject(project, exportOptions = {}) {
      const stores = resolveStores(exportOptions.stores, configuredStores);
      const refs = archive.collectReferencedAssetIds(project);
      const groups = [
        ["casting", refs.castingIds],
        ["poster", refs.posterIds],
        ["project-reference", refs.projectReferenceIds]
      ];
      const files = {};
      const assets = [];
      let totalBytes = 0;
      for (const [store, ids] of groups) {
        for (const sourceId of ids) {
          const record = await readStoredRecord(stores, store, sourceId);
          const bytes = await bytesFrom(record.blob);
          const mime = assertImageMime(record.blob.type || record.meta.type);
          const item = {
            store,
            sourceId,
            projectId: store === "project-reference" ? project.id : undefined,
            mime,
            size: bytes.byteLength,
            sha256: await sha256(bytes),
            meta: { ...record.meta, type: mime, size: bytes.byteLength },
            usages: usageList(project, store, sourceId)
          };
          assets.push(item);
          totalBytes += bytes.byteLength;
          files[`__${assets.length}`] = bytes;
        }
      }
      const manifest = archive.createArchiveManifest(project, assets, new Date().toISOString());
      manifest.assets.forEach((asset, index) => { files[asset.path] = files[`__${index + 1}`]; delete files[`__${index + 1}`]; });
      files["manifest.json"] = utf8Encode(JSON.stringify(manifest));
      files["project.json"] = utf8Encode(canonicalProjectJson(manifest.project));
      if (files["project.json"].byteLength > MAX_PROJECT_BYTES) throw new Error("项目数据超过 2 MB 限制。");
      archive.validateArchiveManifest(manifest, Object.entries(files).map(([path, data]) => ({ path, data, size: data.byteLength })));
      const zipped = zip.zipSync(files, { level: 6 });
      if (!zipped?.byteLength || zipped.byteLength > MAX_ARCHIVE_BYTES) throw new Error("项目包超过 250 MB 限制。");
      const BlobCtor = root.Blob || (typeof Blob === "function" ? Blob : null);
      if (!BlobCtor) throw new Error("当前环境不支持项目包下载。");
      return { blob: new BlobCtor([zipped], { type: "application/zip" }), fileName: safeFileName(project), summary: projectSummary(project, assets.length, totalBytes) };
    }

    async function preflightPackage(file) {
      const bytes = await bytesFrom(file);
      if (!bytes.byteLength || bytes.byteLength > MAX_ARCHIVE_BYTES) throw new Error("项目包超过 250 MB 限制。");
      const directory = directoryEntries(bytes);
      const manifestBytes = manifestOnly(zip, bytes);
      let manifest;
      try { manifest = JSON.parse(utf8Decode(manifestBytes)); } catch (error) { throw new Error("项目包 JSON 无效。"); }
      archive.validateArchiveManifest(manifest, directory.map((entry) => ({ path: entry.path, size: entry.uncompressedSize })));
      assertExactEntries(manifest, directory);
      let unzipped;
      try { unzipped = zip.unzipSync(bytes); } catch (error) { throw new Error("无效或损坏的项目包 ZIP 文件。"); }
      const entries = Object.fromEntries(Object.entries(unzipped).map(([path, data]) => [path, new Uint8Array(data)]));
      if (Object.keys(entries).length !== directory.length || directory.some((entry) => !entries[entry.path])) throw new Error("项目包 ZIP 内容与目录不一致。");
      if (!entries["manifest.json"] || !entries["project.json"]) throw new Error("项目包缺少必要文件。");
      let project;
      try {
        project = JSON.parse(utf8Decode(entries["project.json"]));
      } catch (error) { throw new Error("项目包 JSON 无效。"); }
      if (!project || !bytesEqual(entries["project.json"], utf8Encode(canonicalProjectJson(manifest.project)))) throw new Error("项目包项目数据不一致。");
      const entryRecords = directory.map((entry) => ({ ...entry, data: entries[entry.path] }));
      archive.validateArchiveManifest(manifest, entryRecords);
      assertExactEntries(manifest, entryRecords);
      const packageData = { manifest: clone(manifest), project: clone(manifest.project), entries };
      const validated = await validatePackageData(packageData);
      return { packageData: validated, summary: projectSummary(validated.project, validated.manifest.assets.length, validated.manifest.assets.reduce((total, asset) => total + asset.size, 0)) };
    }

    function assertDistinctSourceIds(assets) {
      const sourceIds = new Set();
      for (const asset of assets) {
        const key = `${asset.store}\u0000${asset.sourceId}`;
        if (sourceIds.has(key)) throw new Error("项目包资源编号重复。");
        sourceIds.add(key);
      }
    }

    async function validateImageAsset(asset, data) {
      const mime = assertImageMime(asset.mime);
      const meta = asset.meta && typeof asset.meta === "object" && !Array.isArray(asset.meta) ? asset.meta : null;
      if (!meta || assertImageMime(meta.type) !== mime || !Number.isInteger(meta.width) || !Number.isInteger(meta.height) || meta.width < 1 || meta.height < 1) {
        throw new Error("项目包图片元数据无效。");
      }
      const info = imageInfo(data, mime);
      if (info.width !== meta.width || info.height !== meta.height) throw new Error("项目包图片尺寸与元数据不一致。");
      validateStoreImageLimits(asset, mime, info.width, info.height, data.byteLength);
      const BlobCtor = root.Blob || (typeof Blob === "function" ? Blob : null);
      if (!BlobCtor) throw new Error("当前环境不支持图片解码校验。");
      let decoded;
      try {
        decoded = await decodeImage(new BlobCtor([data], { type: mime }), mime);
      } catch (error) {
        throw new Error("项目包图片解码失败。");
      }
      if (!decoded || !Number.isInteger(decoded.width) || !Number.isInteger(decoded.height) || decoded.width < 1 || decoded.height < 1 ||
        (decoded.mime !== undefined && assertImageMime(decoded.mime) !== mime) || decoded.width !== info.width || decoded.height !== info.height) {
        throw new Error("项目包图片解码尺寸或类型不一致。");
      }
      return { ...asset, mime, meta: { ...meta, type: mime, size: data.byteLength, width: info.width, height: info.height } };
    }

    async function validatePackageData(packageData) {
      if (!packageData || !packageData.manifest || !packageData.project || !packageData.entries) throw new Error("项目包预检数据无效。");
      const manifest = clone(packageData.manifest);
      const project = clone(packageData.project);
      const entryData = Object.fromEntries(Object.entries(packageData.entries).map(([path, data]) => [path, new Uint8Array(data)]));
      const entries = Object.entries(entryData).map(([path, data]) => ({ path, data, size: data.byteLength }));
      const projectEntry = entryData["project.json"];
      if (!projectEntry || canonicalProjectJson(project) !== canonicalProjectJson(manifest.project)) throw new Error("项目包项目数据不一致。");
      let projectJson;
      try { projectJson = JSON.parse(utf8Decode(projectEntry)); } catch (error) { throw new Error("项目包 JSON 无效。"); }
      if (canonicalProjectJson(projectJson) !== canonicalProjectJson(manifest.project) || !bytesEqual(projectEntry, utf8Encode(canonicalProjectJson(manifest.project)))) throw new Error("项目包项目数据不一致。");
      archive.validateArchiveManifest(manifest, entries);
      assertExactEntries(manifest, entries);
      assertDistinctSourceIds(manifest.assets);
      const validatedAssets = [];
      for (const asset of manifest.assets) {
        const data = entryData[asset.path];
        if (!data || data.byteLength !== asset.size || await sha256(data) !== asset.sha256.toLowerCase()) throw new Error("项目包资源哈希或完整性校验失败。");
        validatedAssets.push(await validateImageAsset(asset, data));
      }
      return { manifest: { ...manifest, assets: validatedAssets }, project: clone(manifest.project), entries: entryData };
    }

    function assertImportStoreInterfaces(stores) {
      for (const name of STORE_NAMES) {
        const adapter = stores[name];
        if (typeof adapter?.createImportedRecord !== "function" || typeof adapter?.removeImportedRecord !== "function" ||
          (typeof adapter?.get !== "function" && typeof adapter?.getRecord !== "function")) throw new Error("本地图片导入存储不可用。");
      }
    }

    async function storedRecord(stores, store, id) {
      const adapter = stores[store];
      return typeof adapter.getRecord === "function" ? adapter.getRecord(id) : adapter.get(id);
    }

    function isImportId(value) { return isStableImportId(value); }

    async function allocateImportId(kind, stores, usedIds, checkStore = true) {
      for (let attempt = 0; attempt < MAX_IMPORT_ID_ATTEMPTS; attempt += 1) {
        const candidate = makeId(kind);
        if (!isImportId(candidate) || usedIds.has(candidate)) continue;
        if (checkStore && await storedRecord(stores, kind, candidate)) {
          usedIds.add(candidate);
          continue;
        }
        usedIds.add(candidate);
        return candidate;
      }
      throw new Error("无法分配新的导入 ID。");
    }

    async function createImportIdMap(project, assets, stores) {
      const usedIds = new Set([project.id, ...assets.map((asset) => asset.sourceId)]);
      const map = { project: Object.create(null), casting: Object.create(null), poster: Object.create(null), "project-reference": Object.create(null) };
      map.project[project.id] = await allocateImportId("project", stores, usedIds, false);
      for (const asset of assets) {
        if (!Object.prototype.hasOwnProperty.call(map[asset.store], asset.sourceId)) map[asset.store][asset.sourceId] = await allocateImportId(asset.store, stores, usedIds);
      }
      return { map, usedIds };
    }

    function isCollisionError(error) {
      return /constraint|collision|already exists|必须是新的|已存在/i.test(String(error?.name || "") + " " + String(error?.message || error || ""));
    }

    async function createImportedAsset(stores, asset, blob, id, projectId, importToken) {
      const meta = { ...asset.meta, type: asset.mime, size: blob.size };
      return stores[asset.store].createImportedRecord({ id, blob, meta, projectId: asset.store === "project-reference" ? projectId : undefined, importToken });
    }

    async function removeJournalEntries(entries, stores) {
      const remaining = [];
      for (const entry of entries.slice().reverse()) {
        if (!isImportId(entry.importToken)) {
          remaining.unshift(entry);
          continue;
        }
        try {
          await stores[entry.store]?.removeImportedRecord?.(entry.id, entry.importToken);
        } catch (error) {
          remaining.unshift(entry);
        }
      }
      return remaining;
    }

    async function projectHasCommittedImport(projectId, importToken, recoveryOptions) {
      const lookup = recoveryOptions?.getCommittedProjectToken || options.getCommittedProjectToken;
      if (typeof lookup !== "function") return false;
      try { return (await lookup(projectId)) === importToken; } catch (error) { return false; }
    }

    function buildImportJournal(projectId, assets, idMap) {
      const importToken = makeImportToken();
      const operationId = makeImportToken();
      if (!isImportId(importToken) || !isImportId(operationId)) throw new Error("导入令牌无效。");
      return {
        version: 2,
        operationId,
        projectId,
        importToken,
        phase: "staging",
        entries: assets.map((asset) => ({ store: asset.store, id: idMap[asset.store][asset.sourceId], importToken }))
      };
    }

    async function importPackage(packageData, existingStore, importOptions = {}) {
      const validated = await validatePackageData(packageData);
      const stores = resolveStores(existingStore, configuredStores);
      assertImportStoreInterfaces(stores);
      const pending = readJournal(storage);
      if (pending) throw new Error("检测到未完成的项目包导入，请先恢复后重试。");
      latestImportStores = stores;
      const allocation = await createImportIdMap(validated.project, validated.manifest.assets, stores);
      const idMap = allocation.map;
      let project = archive.rewriteProjectReferences(validated.project, idMap);
      const journal = buildImportJournal(project.id, validated.manifest.assets, idMap);
      saveJournal(storage, journal);
      let metadataCommitted = false;
      try {
        for (const asset of validated.manifest.assets) {
          const blob = new (root.Blob || Blob)([validated.entries[asset.path]], { type: asset.mime });
          for (let attempt = 0; attempt < MAX_IMPORT_ID_ATTEMPTS; attempt += 1) {
            const id = idMap[asset.store][asset.sourceId];
            try {
              await createImportedAsset(stores, asset, blob, id, project.id, journal.importToken);
              break;
            } catch (error) {
              if (!isCollisionError(error) || attempt + 1 >= MAX_IMPORT_ID_ATTEMPTS) throw error;
              const replacement = await allocateImportId(asset.store, stores, allocation.usedIds);
              idMap[asset.store][asset.sourceId] = replacement;
              const entry = journal.entries.find((item) => item.store === asset.store && item.id === id);
              if (!entry) throw new Error("项目包导入恢复记录不一致。");
              entry.id = replacement;
              saveJournal(storage, journal);
              project = archive.rewriteProjectReferences(validated.project, idMap);
            }
          }
        }
        journal.phase = "metadata-committing";
        saveJournal(storage, journal);
        if (typeof importOptions.commitProject === "function") {
          await importOptions.commitProject(clone(project), journal.importToken);
          metadataCommitted = true;
        }
        try {
          clearJournal(storage);
          return { project, summary: projectSummary(project, validated.manifest.assets.length, validated.manifest.assets.reduce((total, asset) => total + asset.size, 0)) };
        } catch (error) {
          if (!metadataCommitted) throw error;
          return { project, recoveryPending: true, summary: projectSummary(project, validated.manifest.assets.length, validated.manifest.assets.reduce((total, asset) => total + asset.size, 0)) };
        }
      } catch (error) {
        if (!metadataCommitted && await projectHasCommittedImport(project.id, journal.importToken, importOptions)) {
          return { project, recoveryPending: true, summary: projectSummary(project, validated.manifest.assets.length, validated.manifest.assets.reduce((total, asset) => total + asset.size, 0)) };
        }
        if (metadataCommitted) throw error;
        journal.phase = "rollback-pending";
        try { saveJournal(storage, journal); } catch (journalError) { /* The original intent record remains the recovery source. */ }
        journal.entries = await removeJournalEntries(journal.entries, stores);
        if (journal.entries.length) saveJournal(storage, journal); else clearJournal(storage);
        throw error;
      }
    }

    async function recoverInterruptedImport(recoveryOptions = {}) {
      const journal = readJournal(storage);
      if (!journal) return { recovered: 0 };
      const stores = latestImportStores || resolveStores(null, configuredStores);
      assertImportStoreInterfaces(stores);
      if (journal.version === 2 && await projectHasCommittedImport(journal.projectId, journal.importToken, recoveryOptions)) {
        clearJournal(storage);
        return { recovered: 0, retained: journal.entries.length };
      }
      const recovered = journal.entries.length;
      if (journal.version === 2) {
        journal.phase = "rollback-pending";
        saveJournal(storage, journal);
      }
      journal.entries = await removeJournalEntries(journal.entries, stores);
      if (journal.entries.length) saveJournal(storage, journal); else clearJournal(storage);
      return { recovered: recovered - journal.entries.length };
    }

    return { exportActiveProject, preflightPackage, importPackage, recoverInterruptedImport, JOURNAL_KEY };
  }

  const service = createService();
  return { ...service, createService, JOURNAL_KEY };
});
