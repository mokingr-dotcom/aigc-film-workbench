(function (root) {
  "use strict";

  const MAX_SCREENPLAY_CHARACTERS = 60000;
  const SUPPORTED_EXTENSIONS = [".txt", ".docx"];

  async function readScreenplayFile(file) {
    const name = String(file && file.name || "");
    const extension = `.${name.split(".").pop().toLowerCase()}`;
    if (!file || !SUPPORTED_EXTENSIONS.includes(extension)) {
      throw new Error("请选择 .txt 或 .docx 剧本文件。");
    }

    let rawText;
    try {
      rawText = extension === ".txt"
        ? await file.text()
        : (await root.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
    } catch (error) {
      if (extension === ".docx") {
        throw new Error("无法读取该 DOCX 正文，请转换为 TXT 后重试。");
      }
      throw error;
    }

    const normalized = String(rawText || "").replace(/\r\n?/g, "\n").trim();
    if (!normalized) throw new Error("剧本文件为空。");
    if (normalized.length > MAX_SCREENPLAY_CHARACTERS) {
      throw new Error("剧本超过 60000 字符，请拆分后导入。");
    }

    return {
      title: name.replace(/\.[^.]+$/, "") || "未命名剧本",
      sourceType: "file",
      sourceFileName: name,
      rawText: normalized
    };
  }

  root.aigcScreenplayImport = { readScreenplayFile };
})(typeof window !== "undefined" ? window : globalThis);
