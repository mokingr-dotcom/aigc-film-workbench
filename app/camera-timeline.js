(function initCameraTimeline(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.aigcCameraTimeline = api;
})(typeof window !== "undefined" ? window : globalThis, function createCameraTimeline() {
  const TRACKS = [
    { id: "performance", label: "人物表演", keywords: ["人物", "主角", "角色", "眼", "呼吸", "停", "抬", "转", "走", "起身", "手", "肩", "重心"] },
    { id: "camera", label: "摄影机运动", keywords: ["摄影机", "镜头", "机位", "跟随", "横移", "推进", "后退", "升高", "降低", "固定", "环绕", "摇摄", "构图"] },
    { id: "scene", label: "场景事件", keywords: ["背景", "前景", "中景", "门", "窗", "光", "雨", "雾", "声音", "物件", "车辆", "人群", "环境"] }
  ];

  function clean(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .replace(/^[，；。\s]+|[，；。\s]+$/g, "")
      .trim();
  }

  function normalizeDuration(value) {
    return Number(value) === 30 ? 30 : 15;
  }

  function extractTimelineSegments(prompt, duration = 15) {
    const maxDuration = normalizeDuration(duration);
    const segments = [];
    const expression = /(\d+)\s*-\s*(\d+)\s*秒([^；。]*[；。]?)/g;
    let match;
    while ((match = expression.exec(String(prompt || "")))) {
      const start = Math.max(0, Math.min(maxDuration, Number(match[1])));
      const end = Math.max(start, Math.min(maxDuration, Number(match[2])));
      if (end > start) segments.push({ start, end, text: clean(match[3]) });
    }
    return segments;
  }

  function fallbackSegments(item, duration = 15) {
    const maxDuration = normalizeDuration(duration);
    const text = clean(item?.analysis || item?.blocking || item?.core || item?.camera || item?.name);
    const description = text || "保持主体、空间和摄影机运动连续";
    if (maxDuration === 30) {
      return [
        { start: 0, end: 10, text: `建立：${description}` },
        { start: 10, end: 20, text: `推进：${description}` },
        { start: 20, end: 30, text: `落点：${description}` }
      ];
    }
    return [
      { start: 0, end: 5, text: `建立：${description}` },
      { start: 5, end: 10, text: `发展：${description}` },
      { start: 10, end: 15, text: `落点：${description}` }
    ];
  }

  function phraseForTrack(text, track) {
    const phrases = clean(text).split(/[，；。]/).map(clean).filter(Boolean);
    return phrases.find((phrase) => track.keywords.some((keyword) => phrase.includes(keyword))) || phrases[0] || "保持连续";
  }

  function buildCameraTimelineModel(item, duration = 15) {
    const maxDuration = normalizeDuration(duration);
    const segments = extractTimelineSegments(item?.prompt, maxDuration);
    const usable = segments.length && segments.at(-1).end >= maxDuration ? segments : fallbackSegments(item, maxDuration);
    return {
      duration: maxDuration,
      markers: maxDuration === 30 ? [0, 5, 10, 15, 20, 25, 30] : [0, 3, 6, 9, 12, 15],
      segments: usable,
      tracks: TRACKS.map((track) => ({
        id: track.id,
        label: track.label,
        beats: usable.map((segment) => ({
          start: segment.start,
          end: segment.end,
          label: phraseForTrack(segment.text, track)
        }))
      }))
    };
  }

  function requiresBlockingMap(item) {
    const text = [item?.name, item?.core, item?.analysis, item?.camera, item?.blocking]
      .filter(Boolean)
      .join(" ");
    const signals = ["三层", "多人", "地标", "轴线", "队列", "环绕", "升高", "降低", "横移", "路线", "前景", "中景", "背景"];
    return signals.filter((signal) => text.includes(signal)).length >= 2;
  }

  function buildBlockingMapModel(model) {
    const segments = model?.segments || [];
    const chosen = segments.length >= 3
      ? [segments[0], segments[Math.floor((segments.length - 1) / 2)], segments[segments.length - 1]]
      : fallbackSegments({ name: "连续空间调度" }, model?.duration);
    return {
      points: chosen.map((segment, index) => ({
        id: ["A", "B", "C"][index],
        time: index === 2 ? segment.end : segment.start,
        label: clean(segment.text)
      }))
    };
  }

  return { extractTimelineSegments, buildCameraTimelineModel, requiresBlockingMap, buildBlockingMapModel };
});
