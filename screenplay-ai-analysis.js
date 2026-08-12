(function initScreenplayAiAnalysis(root) {
  function clean(value, limit = 60000) { return String(value || "").replace(/\r\n?/g, "\n").trim().slice(0, limit); }
  function buildPrompt(project, rawText) {
    return [
      "你是电影导演、编剧顾问和AIGC分镜导演。先从导演视角判断剧本的真实银幕时长、叙事段落、场次密度和镜头数量；然后只根据剧本原文拆出可独立生成的视频镜头，不要杜撰不存在的情节、角色或场景。",
      `项目：${clean(project?.name, 60) || "未命名项目"}`,
      `项目目标时长：${Number(project?.productionMeta?.estimatedDurationSeconds || 0) ? `${Math.round(Number(project.productionMeta.estimatedDurationSeconds) / 60)} 分钟` : "未设定，请按原文内容估算"}`,
      "返回纯 JSON：{\"analysis\":{\"estimatedDurationSeconds\":0,\"recommendedSceneCount\":0,\"recommendedShotCount\":0,\"structureRationale\":\"导演对片长、节奏与拆分依据的简短判断\",\"densityWarning\":\"如场次或镜头密度偏低则说明原因，否则为空\"},\"scenes\":[{\"number\":1,\"title\":\"\",\"setting\":\"\",\"time\":\"\",\"sourceExcerpt\":\"剧本原文依据\",\"storyBeat\":\"本场发生什么\",\"characters\":[\"\"],\"emotion\":\"\",\"action\":\"\",\"estimatedDurationSeconds\":0,\"shots\":[{\"durationSeconds\":15,\"promptCard\":{\"narrative\":\"\",\"action\":\"\",\"performance\":\"\",\"framing\":\"\",\"movement\":\"\",\"beatPlan\":\"\",\"sound\":\"\"}}]}]}",
      "不要只根据剧本的章节标题或大段落拆场，也不要为了省略而把连续剧情压缩成三五场。地点、时间、人物关系、行动目标、冲突升级、信息揭示、情绪转折或空间调度发生变化时，都应判断是否成为独立场次。一个长场景也要按叙事节奏拆成多个镜头。每个镜头必须有可见动作、表演、景别构图和有动机的运镜。每场 sourceExcerpt 必须是可在原文中找到的连续摘录。单镜头 5-30 秒；一场由多个镜头组成。先在内部完成全剧覆盖检查，再输出 JSON。",
      `剧本原文：\n${clean(rawText)}`
    ].join("\n\n");
  }
  function parsePayload(value) {
    const raw = clean(value, 120000);
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = (fenced ? fenced[1] : raw).trim();
    let data;
    try { data = JSON.parse(candidate); } catch (error) {
      const match = raw.match(/\{[\s\S]*\}/);
      try { data = match ? JSON.parse(match[0]) : null; } catch (ignored) { data = null; }
    }
    if (!data || !Array.isArray(data.scenes) || !data.scenes.length) throw new Error("模型没有返回可用的 scenes JSON。请检查模型输出格式。");
    const analysis = data.analysis && typeof data.analysis === "object" && !Array.isArray(data.analysis) ? {
      estimatedDurationSeconds: Math.max(0, Math.min(21600, Math.round(Number(data.analysis.estimatedDurationSeconds) || 0))),
      recommendedSceneCount: Math.max(0, Math.min(999, Math.round(Number(data.analysis.recommendedSceneCount) || 0))),
      recommendedShotCount: Math.max(0, Math.min(9999, Math.round(Number(data.analysis.recommendedShotCount) || 0))),
      structureRationale: clean(data.analysis.structureRationale, 500),
      densityWarning: clean(data.analysis.densityWarning, 300)
    } : null;
    return { scenes: data.scenes, analysis };
  }
  function parse(value) { return parsePayload(value).scenes; }
  async function request(config, project, rawText) {
    const endpoint = clean(config?.endpoint, 500).replace(/\/$/, "");
    const model = clean(config?.model, 160);
    const apiKey = clean(config?.apiKey, 400);
    if (!endpoint || !model || !apiKey) throw new Error("请填写接口地址、模型名称和本地 API 密钥。");
    const response = await root.fetch(`${endpoint}/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model, temperature: 0.2, messages: [{ role: "user", content: buildPrompt(project, rawText) }] }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error?.message || `模型请求失败（${response.status}）`);
    return parsePayload(payload?.choices?.[0]?.message?.content);
  }
  const api = { buildPrompt, parse, parsePayload, request };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.aigcScreenplayAiAnalysis = api;
})(typeof window !== "undefined" ? window : globalThis);
