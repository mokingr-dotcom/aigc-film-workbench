const fs = require("fs");

const source = fs.readFileSync("Seedance电影大师级运镜提示词库.md", "utf8");

function sectionBetween(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  return source.slice(from, to === -1 ? undefined : to);
}

function clean(value) {
  return String(value || "").trim();
}

const caseSection = sectionBetween("## 二、世界大师级镜头调度案例库", "## 三、大师级运镜类型库");
const caseGroups = [...caseSection.matchAll(/^### ([A-F])\. (.+)$/gm)];
const cases = [];

for (let index = 0; index < caseGroups.length; index += 1) {
  const groupStart = caseGroups[index].index + caseGroups[index][0].length;
  const groupEnd = index + 1 < caseGroups.length ? caseGroups[index + 1].index : caseSection.length;
  const groupText = caseSection.slice(groupStart, groupEnd);
  const headings = [...groupText.matchAll(/^#### (\d{2}) 《(.+?)》（(\d{4})）(.+)$/gm)];

  for (let itemIndex = 0; itemIndex < headings.length; itemIndex += 1) {
    const heading = headings[itemIndex];
    const itemStart = heading.index + heading[0].length;
    const itemEnd = itemIndex + 1 < headings.length ? headings[itemIndex + 1].index : groupText.length;
    const itemText = groupText.slice(itemStart, itemEnd);
    const core = itemText.match(/核心调度：([^\n]+)/);
    const analysis = itemText.match(/AI化拆解：([^\n]+)/);
    const prompt = itemText.match(/15秒复刻提示词[^\n]*：\s*```text\s*([\s\S]*?)\s*```/);

    cases.push({
      id: `C${heading[1]}`,
      number: heading[1],
      group: `${caseGroups[index][1]}. ${caseGroups[index][2]}`,
      film: heading[2],
      year: heading[3],
      name: clean(heading[4].replace(/^[:：]\s*/, "")),
      core: clean(core && core[1]),
      analysis: clean(analysis && analysis[1]),
      prompt: clean(prompt && prompt[1])
    });
  }
}

const genreSection = sectionBetween("## 三、大师级运镜类型库", "## 四、常用大师级运镜动作词");
const genreHeadings = [...genreSection.matchAll(/^### (\d{2}) (.+)$/gm)];
const genres = [];

for (let index = 0; index < genreHeadings.length; index += 1) {
  const heading = genreHeadings[index];
  const itemStart = heading.index + heading[0].length;
  const itemEnd = index + 1 < genreHeadings.length ? genreHeadings[index + 1].index : genreSection.length;
  const itemText = genreSection.slice(itemStart, itemEnd);
  const field = (label) => clean((itemText.match(new RegExp(`${label}：([^\\n]+)`)) || [])[1]);
  const prompt = itemText.match(/Seedance提示词：\s*```text\s*([\s\S]*?)\s*```/);

  genres.push({
    id: `G${heading[1]}`,
    number: heading[1],
    name: clean(heading[2]),
    references: field("参考片").split("、").filter(Boolean),
    tone: field("影调光影"),
    camera: field("大师级运镜"),
    blocking: field("镜头调度"),
    prompt: clean(prompt && prompt[1])
  });
}

const payload = `/* Generated from Seedance电影大师级运镜提示词库.md. */\n(function (root, factory) {\n  const data = factory();\n  if (typeof module !== "undefined" && module.exports) module.exports = data;\n  root.cameraPromptData = data;\n})(typeof window !== "undefined" ? window : globalThis, function () {\n  return ${JSON.stringify({ cases, genres }, null, 2)};\n});\n`;

fs.writeFileSync("camera-data.js", payload);
console.log(`Generated camera-data.js: ${cases.length} cases, ${genres.length} genres`);
