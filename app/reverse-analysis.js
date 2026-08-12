(function initReverseAnalysis(root) {
  const DIMENSION_DEFINITIONS = [
    { key: "subject", label: "主体特征", short: "数量、身份、比例、动作与表情" },
    { key: "composition", label: "构图方式", short: "布局、留白、动线与空间层级" },
    { key: "camera", label: "镜头角度", short: "景别、机位、焦段感与景深" },
    { key: "lighting", label: "光线方向", short: "主光、光比、软硬与投影" },
    { key: "color", label: "色彩搭配", short: "主辅色、冷暖、面积与饱和度" },
    { key: "material", label: "材质细节", short: "皮肤、布料、金属与真实瑕疵" },
    { key: "style", label: "画面风格", short: "媒介、年代、类型与成像质感" },
    { key: "background", label: "背景元素", short: "地点、天气、道具与叙事层级" }
  ];

  function normalizeDimensions(value = {}) {
    return Object.fromEntries(DIMENSION_DEFINITIONS.map(({ key }) => [key, String(value[key] || "").trim()]));
  }

  function countCalibratedDimensions(value) {
    return Object.values(normalizeDimensions(value)).filter(Boolean).length;
  }

  function buildHumanConstraints(value) {
    const normalized = normalizeDimensions(value);
    const lines = DIMENSION_DEFINITIONS
      .filter(({ key }) => normalized[key])
      .map(({ key, label }) => `${label}：${normalized[key]}`);
    return lines.length
      ? lines.join("\n")
      : "暂无人工确认约束；请根据参考图完成全部八维分析。";
  }

  const api = { DIMENSION_DEFINITIONS, normalizeDimensions, countCalibratedDimensions, buildHumanConstraints };
  root.aigcReverseAnalysis = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
