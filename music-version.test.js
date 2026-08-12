const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const context = { console };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync("music-data.js", "utf8"), context, { filename: "music-data.js" });
const D = context.aigcMusicData;
assert.ok(D, "music data API should load");

const snapshot = D.normalizeMusicState({
  ...D.DEFAULT_MUSIC_STATE,
  templateId: "film-psychological-suspense",
  sceneZh: "夜间走廊里，人物意识到危险正在靠近",
  versions: []
});
const saved = {
  id: "music-version-test-1",
  number: 1,
  name: "配乐方案 V1",
  createdAt: "2026-08-12T00:00:00.000Z",
  targetModel: "suno",
  prompt: "test prompt",
  musicState: snapshot
};
const restored = D.normalizeMusicState({ ...snapshot, versions: [saved] });
assert.equal(restored.versions.length, 1);
assert.equal(restored.versions[0].targetModel, "suno");
assert.equal(restored.versions[0].musicState.sceneZh, snapshot.sceneZh);
assert.equal(restored.versions[0].musicState.versions.length, 0);

const tooMany = Array.from({ length: 20 }, (_, index) => ({ ...saved, id: `music-version-${index}`, number: index + 1 }));
assert.equal(D.normalizeMusicState({ ...snapshot, versions: tooMany }).versions.length, D.MUSIC_VERSION_LIMIT);
assert.equal(D.normalizeMusicState({ ...D.DEFAULT_MUSIC_STATE, versions: [{ id: "invalid" }] }).versions.length, 0);
console.log("PASS music version snapshots normalize, restore, and cap safely");
