const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const { searchItems, composePrompt, upgradeItem, compactReferences, referencePromptLines, renderReferenceFilms, renderPromptDetails, defaultToneSelection, restoreToneSelection, firstToneSelectionForCategory } = require("./app.js");
const promptData = require("./prompt-data.js");
const premiumTypeStyles = require("./premium-type-styles.js");
const chineseDramaStyles = require("./chinese-drama-styles.js");
const cameraPromptData = require("./camera-data.js");
const {
  extractTimelineSegments,
  buildCameraTimelineModel,
  requiresBlockingMap,
  buildBlockingMapModel
} = require("./camera-timeline.js");
const {
  decideCastingAssetRetention,
  collectProjectCastingAssetIds,
  collectProjectPosterAssetIds,
  collectProjectReferenceAssetIds,
  isProjectReferenceUsed,
  withoutProjectReferenceAssetIds,
  persistThenCleanup
} = require("./workspace-core.js");
const projectReferenceStore = require("./project-reference-store.js");
const {
  CASTING_TEMPLATE_PROFILES,
  appendRoleVersion,
  castingLayoutSelection,
  buildCharacterSummary,
  buildCharacterSummaryFromElements,
  castingLayoutRules,
  castingNegativeRule,
  castingReferenceRule,
  castingStatusLabel,
  castingTemplateCaptions,
  createVersionPreviewCache,
  getCastingSourceValidation,
  getIdentityValidation,
  normalizeCastingState,
  retainMissingReferenceMetadata,
  persistReferenceAssetMutation
} = require("./casting-app.js");
const castingAssetStore = require("./casting-asset-store.js");
const { planImageProcessing } = castingAssetStore;
const {
  validatePosterFile,
  validatePosterDimensions,
  metadataWithoutBlob
} = require("./poster-asset-store.js");
const posterAssetStore = require("./poster-asset-store.js");
const {
  DEFAULT_POSTER_COMPOSITOR_STATE,
  calculateCenterCrop,
  migratePosterLayerFontStyles,
  normalizePosterCompositorState,
  createPosterTextLayer,
  safePosterExportName
} = require("./poster-compositor.js");
const {
  DIMENSION_DEFINITIONS,
  normalizeDimensions,
  countCalibratedDimensions,
  buildHumanConstraints
} = require("./reverse-analysis.js");
const {
  MUSIC_PURPOSES,
  MUSIC_GENRES,
  MUSIC_VOCABULARIES,
  MUSIC_TEMPLATES,
  DEFAULT_MUSIC_STATE,
  MUSIC_SCHEMA_VERSION,
  MUSIC_TARGETS,
  INSTRUMENT_PRESETS,
  INSTRUMENT_REGIONS,
  INSTRUMENT_FAMILIES,
  MUSIC_INSTRUMENTS,
  filterMusicInstruments,
  DURATION_MODES,
  DURATION_PRESETS,
  durationSecondsFromParts,
  durationPartsFromSeconds,
  normalizeMusicState,
  applyInstrumentPreset,
  toggleInstrument,
  analyzeMusicConflicts,
  validateMusicState,
  scaleMusicTimeline,
  composeMusicPrompt
} = require("./music-data.js");
const { RESTRICTIONS, buildMusicOutput } = require("./music-adapters.js");
const {
  extractSceneCandidates,
  normalizeSceneAssistant,
  SCENE_REFERENCE_LIBRARY,
  buildSceneAssistantDraft,
  buildSceneCreativeSuggestions,
  buildDirectorAnalysisPrompt,
  parseDirectorAnalysisResult
} = require("./scene-assistant-data.js");
const { normalizeSceneVideoCard, buildSceneVideoPrompt } = require("./scene-video-adapters.js");
const { buildPrompt: buildAiScreenplayPrompt, parse: parseAiScreenplayResult, parsePayload: parseAiScreenplayPayload } = require("./screenplay-ai-analysis.js");
const { assess: assessScreenplayAnalysisQuality, reanalysisInstruction } = require("./screenplay-analysis-quality.js");
const { deriveProjectSceneInheritance } = require("./scene-inheritance.js");
const { assessSceneReadiness, assessShotReadiness } = require("./scene-readiness.js");
const { normalizeAssetLocks, lockSceneAssets, unlockSceneAsset, assetsForScene, assetLockPreview, assetLedger, continuityReport, pruneUnreferencedAssets, syncProjectAssetLedger, saveAssetMasterVersion, applyAssetMasterVersion } = require("./project-asset-locks.js");
const { buildProjectShotDelivery, buildShotModelPackage } = require("./project-delivery.js");
const { buildShotContinuity } = require("./project-shot-continuity.js");
const { buildProjectProductionQueue } = require("./project-production-queue.js");
const { buildProjectProductionAudit, buildProjectProductionAuditMarkdown } = require("./project-production-audit.js");
const { summarizeSceneProduction, collectSceneProjectReferenceIds, collectShotProjectReferenceIds, referenceUploadStillCurrent, referenceUploadCanProceed } = require("./project-scenes.js");
const { buildShotReadinessGate, buildShotProductionCard } = require("./project-shot-readiness.js");
const {
  normalizeProductionResults,
  createProductionResult,
  selectProductionResult,
  deleteProductionResult,
  resultStatusFor
} = require("./project-shot-results.js");
const {
  safeHttpsResultUrl,
  keyframeReferenceStillUsed,
  createPreviewUrlGuard,
  saveShotResultTransaction,
  deleteShotResultTransaction
} = require("./project-shot-results-ui.js");
const {
  PROJECT_STORE_SCHEMA_VERSION,
  WORKSPACE_IDS,
  normalizeProjectStore,
  normalizeScreenplay,
  normalizeCreativeBrief,
  normalizeVisualBible,
  normalizeProjectScenes,
  normalizeSceneShot,
  createShotPromptVersion,
  patchProjectScenes,
  replanProjectSceneDuration,
  buildSceneShotPrompt,
  parseScreenplayIntoScenes,
  patchProjectScreenplay,
  analyzeScreenplay,
  previewScreenplayReanalysis,
  applyScreenplayAnalysis,
  clearProjectScreenplay,
  completeOnboarding,
  createProjectInStore,
  patchDashboardView,
  toggleProjectFavorite,
  patchProjectFoundation,
  lockVisualBible,
  unlockVisualBible
} = require("./project-store.js");
const { summarizeProject, decideProjectContinuation } = require("./project-summary.js");
const { createProjectCoverResolver } = require("./project-cover.js");
const projectArchive = require("./project-archive.js");

const {
  TITLE_CATEGORIES,
  TITLE_LANGUAGE_MODES,
  TITLE_MATERIALS,
  TITLE_TEMPLATES,
  DEFAULT_TITLE_TEMPLATE_ID,
  getTitleTemplate,
  filterTitleTemplates,
  normalizePosterTitleState
} = require("./poster-title-template-data.js");
const {
  TITLE_MARK_CATEGORIES,
  TITLE_MARK_TEMPLATES,
  DEFAULT_TITLE_MARK_TEMPLATE_ID,
  getTitleMarkTemplate,
  buildTitleMarkSearchText,
  filterTitleMarkTemplates,
  normalizePosterTitleMarkState
} = require("./poster-title-mark-data.js");

let testChain = Promise.resolve();

runTest("project production package contracts collect, project, remap and validate safely", () => {
  const project = {
    id: "project-1",
    workspaces: {
      casting: {
        referenceAsset: { id: "casting-1" },
        versions: [{ referenceAssetId: "casting-history-1" }]
      },
      poster: { posterCompositor: { sourceAsset: { id: "poster-source-1" }, titleAsset: { id: "poster-title-1" } } }
    },
    creativeBrief: { referenceAssetIds: ["brief-1"] },
    assetLocks: [{ referenceAssetIds: ["lock-2", "lock-1"] }],
    scenes: [{ shots: [{ productionResults: [
      { selected: true, keyframeReferenceId: "selected-keyframe" },
      { selected: false, keyframeReferenceId: "unselected-keyframe" }
    ] }] }]
  };
  const refs = projectArchive.collectReferencedAssetIds(project);
  assert.deepStrictEqual(refs.projectReferenceIds.sort(), ["brief-1", "lock-1", "lock-2", "selected-keyframe"].sort());
  assert(!refs.projectReferenceIds.includes("unselected-keyframe"));
  assert.strictEqual(projectArchive.projectForArchive(project).scenes[0].shots[0].productionResults[1].keyframeReferenceId, "");

  const assets = [
    { store: "casting", sourceId: "casting-1", projectId: "project-1", mime: "image/png", size: 3, sha256: "a", meta: {}, usages: [] },
    { store: "casting", sourceId: "casting-history-1", mime: "image/png", size: 3, sha256: "a2", meta: {}, usages: [] },
    { store: "poster", sourceId: "poster-source-1", mime: "image/png", size: 4, sha256: "b", meta: {}, usages: [] },
    { store: "poster", sourceId: "poster-title-1", mime: "image/png", size: 4, sha256: "b2", meta: {}, usages: [] },
    { store: "project-reference", sourceId: "brief-1", mime: "image/jpeg", size: 5, sha256: "c", meta: { width: 100, height: 100 }, usages: [] },
    { store: "project-reference", sourceId: "lock-1", mime: "image/jpeg", size: 5, sha256: "d", meta: {}, usages: [] },
    { store: "project-reference", sourceId: "lock-2", mime: "image/jpeg", size: 5, sha256: "e", meta: {}, usages: [] },
    { store: "project-reference", sourceId: "selected-keyframe", mime: "image/jpeg", size: 5, sha256: "f", meta: {}, usages: [] }
  ];
  const manifest = projectArchive.createArchiveManifest(project, assets, "2026-07-27T00:00:00.000Z");
  assert.strictEqual(manifest.format, "aigc-project-package");
  assert.strictEqual(manifest.version, 1);
  assert.deepStrictEqual(manifest.assets.map((asset) => asset.path), [
    "assets/casting/000001.bin", "assets/casting/000002.bin", "assets/poster/000003.bin", "assets/poster/000004.bin",
    "assets/project-reference/000005.bin", "assets/project-reference/000006.bin", "assets/project-reference/000007.bin", "assets/project-reference/000008.bin"
  ]);
  const entries = [
    { path: "manifest.json", size: 0 },
    { path: "project.json", size: 0 },
    ...manifest.assets.map((asset) => ({ path: asset.path, size: asset.size }))
  ];
  assert(projectArchive.validateArchiveManifest(manifest, entries));

  let generatedId = 0;
  const createId = (kind) => `${kind}-new-${++generatedId}`;
  const idMap = projectArchive.createImportIdMap(project, assets, createId);
  assert(idMap.project["project-1"]);
  assert(idMap.casting["casting-1"]);
  assert(idMap.poster["poster-source-1"]);
  assert(idMap["project-reference"]["brief-1"]);
  const rewritten = projectArchive.rewriteProjectReferences(projectArchive.projectForArchive(project), {
    project: { "project-1": "project-new" },
    casting: { "casting-1": "casting-new", "casting-history-1": "casting-history-new" },
    poster: { "poster-source-1": "poster-source-new", "poster-title-1": "poster-title-new" },
    "project-reference": { "brief-1": "brief-new", "lock-1": "lock-1-new", "lock-2": "lock-2-new", "selected-keyframe": "keyframe-new" }
  });
  assert.strictEqual(rewritten.id, "project-new");
  assert.strictEqual(rewritten.workspaces.casting.referenceAsset.id, "casting-new");
  assert.strictEqual(rewritten.workspaces.casting.versions[0].referenceAssetId, "casting-history-new");
  assert.strictEqual(rewritten.workspaces.poster.posterCompositor.titleAsset.id, "poster-title-new");
  assert.deepStrictEqual(rewritten.creativeBrief.referenceAssetIds, ["brief-new"]);
  assert.strictEqual(rewritten.scenes[0].shots[0].productionResults[0].keyframeReferenceId, "keyframe-new");

  const rejects = (change, expected) => assert.throws(() => projectArchive.validateArchiveManifest(change(manifest), entries), expected);
  rejects((value) => ({ ...value, version: 2 }), /版本/);
  rejects((value) => ({ ...value, assets: [{ ...value.assets[0], path: "../escape.bin" }, ...value.assets.slice(1)] }), /路径/);
  rejects((value) => ({ ...value, assets: [...value.assets, { ...value.assets[0], path: value.assets[0].path }] }), /重复/);
  rejects((value) => ({ ...value, project: { ...value.project, id: "project-2" } }), /项目编号/);
  rejects((value) => ({ ...value, assets: [{ ...value.assets[0], path: "" }, ...value.assets.slice(1)] }), /路径/);
  rejects((value) => ({ ...value, assets: Array.from({ length: 161 }, (_, index) => ({ ...value.assets[0], path: `assets/casting/${String(index + 1).padStart(6, "0")}.bin` })) }), /160/);
  rejects((value) => ({ ...value, assets: [{ ...value.assets[0], size: 20 * 1024 * 1024 + 1 }, ...value.assets.slice(1)] }), /大小/);
  rejects((value) => ({ ...value, assets: [{ ...value.assets[0], meta: { width: 9000, height: 100 } }, ...value.assets.slice(1)] }), /尺寸/);
  rejects((value) => ({ ...value, assets: value.assets.slice(0, 1) }), /引用|完整|缺少/);
  rejects((value) => ({ ...value, assets: [{ ...value.assets[0], sourceId: "__proto__" }, ...value.assets.slice(1)] }), /标识|ID|不安全/);
  rejects((value) => ({ ...value, assets: [{ ...value.assets[0], sourceId: "constructor" }, ...value.assets.slice(1)] }), /标识|ID|不安全/);
  rejects((value) => ({ ...value, assets: [{ ...value.assets[0], size: 1 }, ...value.assets.slice(1)] }), /字节|大小|不匹配/);
  const oversizedEntry = entries.map((entry) => entry.path === manifest.assets[0].path ? { ...entry, size: 20 * 1024 * 1024 + 1 } : entry);
  assert.throws(() => projectArchive.validateArchiveManifest({ ...manifest, assets: [{ ...manifest.assets[0], size: 20 * 1024 * 1024 + 1 }, ...manifest.assets.slice(1)] }, oversizedEntry), /大小/);
  const byteBackedEntry = entries.map((entry) => entry.path === manifest.assets[0].path
    ? { ...entry, size: 1, data: new Uint8Array(21 * 1024 * 1024) }
    : entry);
  assert.throws(() => projectArchive.validateArchiveManifest({ ...manifest, assets: [{ ...manifest.assets[0], size: 1 }, ...manifest.assets.slice(1)] }, byteBackedEntry), /大小/);
  const aggregateAssets = Array.from({ length: 13 }, (_, index) => ({
    store: "casting", sourceId: `extra-${index}`, path: `assets/casting/${String(index + 1).padStart(6, "0")}.bin`, mime: "image/png",
    size: 20 * 1024 * 1024, sha256: `hash-${index}`, meta: {}, usages: []
  }));
  const aggregateEntries = [
    { path: "manifest.json", size: 0 }, { path: "project.json", size: 0 },
    ...aggregateAssets.map((asset) => ({ path: asset.path, size: asset.size }))
  ];
  assert.throws(() => projectArchive.validateArchiveManifest({ ...manifest, project: { id: "project-empty", workspaces: {}, creativeBrief: {}, assetLocks: [], scenes: [] }, assets: aggregateAssets }, aggregateEntries), /250/);
  rejects((value) => ({ ...value, assets: [{ ...value.assets[0], mime: "" }, ...value.assets.slice(1)] }), /字段|完整|mime/);
  rejects((value) => ({ ...value, assets: [{ ...value.assets[0], usages: undefined }, ...value.assets.slice(1)] }), /字段|完整|usages/);
  rejects((value) => ({ ...value, assets: [{ ...value.assets[0], path: "assets/poster/000001.bin" }, ...value.assets.slice(1)] }), /存储|路径/);

  const reservedProject = { ...project, id: "__proto__" };
  assert.throws(() => projectArchive.createImportIdMap(reservedProject, assets, (kind) => `${kind}-new`), /标识|ID|不安全/);
  let completeId = 0;
  const completeMap = projectArchive.createImportIdMap(project, assets, (kind) => `${kind}-new-${++completeId}`);
  const rewrittenWithNullPrototypeIds = projectArchive.rewriteProjectReferences(projectArchive.projectForArchive(project), completeMap);
  assert.strictEqual(typeof rewrittenWithNullPrototypeIds.id, "string");
  assert.strictEqual(typeof rewrittenWithNullPrototypeIds.workspaces.casting.referenceAsset.id, "string");
  assert.throws(() => projectArchive.rewriteProjectReferences(project, { project: Object.create(null) }), /映射|引用/);
});

runTest("project reference cleanup retains every cross-project usage and imported JSON copies own no reference IDs", async () => {
  const referencedProject = {
    id: "project-a",
    creativeBrief: { referenceAssetIds: ["brief-ref"] },
    assetLocks: [{ referenceAssetIds: ["lock-ref", "shared-ref"] }],
    scenes: [{ shots: [{ productionResults: [
      { selected: true, keyframeReferenceId: "selected-keyframe" },
      { selected: false, keyframeReferenceId: "history-keyframe" }
    ] }] }]
  };
  const otherProject = {
    id: "project-b",
    creativeBrief: { referenceAssetIds: ["shared-ref"] },
    assetLocks: [],
    scenes: []
  };

  assert.deepStrictEqual(
    collectProjectReferenceAssetIds(referencedProject),
    ["brief-ref", "lock-ref", "shared-ref", "selected-keyframe", "history-keyframe"]
  );
  assert.strictEqual(isProjectReferenceUsed([otherProject], "shared-ref"), true);
  assert.strictEqual(isProjectReferenceUsed([otherProject], "selected-keyframe"), false);
  assert.strictEqual(isProjectReferenceUsed(undefined, "selected-keyframe"), true);
  assert.deepStrictEqual(collectSceneProjectReferenceIds(referencedProject.scenes[0]), ["selected-keyframe", "history-keyframe"]);
  assert.deepStrictEqual(collectShotProjectReferenceIds(referencedProject.scenes[0].shots[0]), ["selected-keyframe", "history-keyframe"]);

  const importedCopy = withoutProjectReferenceAssetIds(referencedProject);
  assert.deepStrictEqual(importedCopy.creativeBrief.referenceAssetIds, []);
  assert.deepStrictEqual(importedCopy.assetLocks[0].referenceAssetIds, []);
  assert(importedCopy.scenes[0].shots[0].productionResults.every((record) => !record.keyframeReferenceId));
  assert.deepStrictEqual(collectProjectReferenceAssetIds(importedCopy), []);

  assert.strictEqual(typeof projectReferenceStore.putPreparedRecord, "function");
  assert.strictEqual(typeof projectReferenceStore.getRecord, "function");
  await assert.rejects(
    () => projectReferenceStore.putPreparedRecord({ id: "project-ref-bad", projectId: "project-a", blob: new Blob(["x"], { type: "text/plain" }), type: "text/plain", width: 10, height: 10, size: 1 }),
    /图片|image/
  );
});

runTest("shot production results normalize selected versions and safe metadata", () => {
  const records = normalizeProductionResults([
    { id: "result-new", selected: true, resultUrl: "https://example.test/video", seed: "42", createdAt: "2026-07-26T10:00:00.000Z" },
    { id: "result-old", selected: true, resultUrl: "javascript:alert(1)", platform: "seedance", createdAt: "2026-07-25T10:00:00.000Z" }
  ]);
  assert.strictEqual(records.length, 2);
  assert.strictEqual(records.filter((item) => item.selected).length, 1);
  assert.strictEqual(records.find((item) => item.selected).id, "result-new");
  assert.strictEqual(records[0].resultUrl, "https://example.test/video");
  assert.strictEqual(records[1].resultUrl, "");
  assert.strictEqual(normalizeProductionResults([{ id: "bad-date", createdAt: "x" }])[0].createdAt, "");
  assert.strictEqual(normalizeProductionResults([{ id: "long-date", createdAt: "2026-07-26T10:00:00.000Z".repeat(20) }])[0].createdAt, "");
});

runTest("duplicate production result IDs become deterministic and independently addressable", () => {
  const records = normalizeProductionResults([
    { id: "same-id", selected: true, createdAt: "2026-07-26T10:00:00.000Z" },
    { id: "same-id", selected: false, createdAt: "2026-07-26T11:00:00.000Z" }
  ]);
  assert.deepStrictEqual(records.map((record) => record.id), ["same-id", "same-id-2"]);
  const selected = selectProductionResult({ status: "generated", productionResults: records }, "same-id-2");
  assert.deepStrictEqual(selected.productionResults.map((record) => record.selected), [false, true]);
  assert.throws(() => deleteProductionResult(selected, "same-id-2"), /选定/);
  assert.strictEqual(deleteProductionResult(selected, "same-id").productionResults.length, 1);
});

runTest("production result creation maps metadata and status safely", () => {
  const record = createProductionResult({
    versionLabel: " V3 ", platform: "seedance", modelVersion: "Seedance 1.5 Pro", seed: 42,
    resultUrl: "http://example.test/video", keyframeReferenceId: "project-ref-1",
    notes: "完成", revisionReason: ""
  }, "2026-07-26T10:00:00.000Z");
  assert.strictEqual(record.versionLabel, "V3");
  assert.strictEqual(record.seed, "42");
  assert.strictEqual(record.resultUrl, "");
  assert.strictEqual(record.createdAt, "2026-07-26T10:00:00.000Z");
  assert.strictEqual(resultStatusFor(record), "keyframe");
  assert.strictEqual(resultStatusFor({ ...record, resultUrl: "https://example.test/video" }), "generated");
  assert.strictEqual(resultStatusFor({ ...record, revisionReason: "需要返工" }), "revision");
  assert.strictEqual(resultStatusFor({ ...record, selected: true }), "locked");
});

runTest("result UI only accepts absolute HTTPS external result URLs", () => {
  assert.strictEqual(safeHttpsResultUrl("https://example.test/result"), "https://example.test/result");
  ["example.test/result", "http://example.test/result", "javascript:alert(1)", "https:example.test/result"].forEach((value) => {
    assert.strictEqual(safeHttpsResultUrl(value), "", value);
  });
});

runTest("shared keyframe references are retained for results and asset locks", () => {
  const project = {
    scenes: [{ shots: [
      { productionResults: [{ id: "result-a", keyframeReferenceId: "project-ref-shared" }] },
      { productionResults: [{ id: "result-b", keyframeReferenceId: "project-ref-other" }] }
    ] }],
    assetLocks: [{ id: "CHAR-001", referenceAssetIds: ["project-ref-locked"] }]
  };
  assert.strictEqual(keyframeReferenceStillUsed(project, "project-ref-shared"), true);
  assert.strictEqual(keyframeReferenceStillUsed(project, "project-ref-locked"), true);
  assert.strictEqual(keyframeReferenceStillUsed(project, "project-ref-unused"), false);
});

runTest("stale preview requests revoke newly created object URLs immediately", () => {
  const calls = [];
  let sequence = 0;
  const guard = createPreviewUrlGuard({
    createObjectURL() { const url = `blob:preview-${++sequence}`; calls.push(`create:${url}`); return url; },
    revokeObjectURL(url) { calls.push(`revoke:${url}`); }
  });
  const staleRequest = guard.beginRequest();
  const currentRequest = guard.beginRequest();
  assert.strictEqual(guard.createUrlForCurrentRequest(staleRequest, {}), "");
  const currentUrl = guard.createUrlForCurrentRequest(currentRequest, {});
  assert.strictEqual(currentUrl, "blob:preview-2");
  guard.invalidate();
  assert.deepStrictEqual(calls, ["create:blob:preview-1", "revoke:blob:preview-1", "create:blob:preview-2", "revoke:blob:preview-2"]);
});

runTest("result save rolls back the shot and removes a newly uploaded keyframe when persistence fails", async () => {
  const original = { id: "shot-1", status: "planned", productionResults: [{ id: "result-old" }] };
  let current = original;
  const removed = [];
  await assert.rejects(() => saveShotResultTransaction({
    shot: original,
    file: { name: "keyframe.png" },
    projectId: "project-1",
    uploadKeyframe: async () => ({ id: "project-ref-new" }),
    removeKeyframe: async (id) => { removed.push(id); },
    createResult: (value) => ({ id: "result-new", ...value }),
    normalizeResults: (value) => value,
    requestedStatus: "generated",
    resultFields: { resultUrl: "https://example.test/result" },
    applyShot: (next) => { current = next; },
    persist: async () => { throw new Error("persist failed"); }
  }), /persist failed/);
  assert.strictEqual(current, original);
  assert.deepStrictEqual(removed, ["project-ref-new"]);
});

runTest("result deletion cleans a keyframe only after metadata persistence succeeds", async () => {
  const original = { id: "shot-1", productionResults: [{ id: "result-old", keyframeReferenceId: "project-ref-old" }] };
  const events = [];
  let current = original;
  await deleteShotResultTransaction({
    shot: original,
    resultId: "result-old",
    deleteResult: () => ({ ...original, productionResults: [] }),
    applyShot: (next) => { current = next; },
    persist: async () => { events.push("persist"); },
    keyframeStillUsed: () => false,
    removeKeyframe: async (id) => { events.push(`remove:${id}`); }
  });
  assert.deepStrictEqual(events, ["persist", "remove:project-ref-old"]);
  assert.deepStrictEqual(current.productionResults, []);

  current = original;
  events.length = 0;
  await assert.rejects(() => deleteShotResultTransaction({
    shot: original,
    resultId: "result-old",
    deleteResult: () => ({ ...original, productionResults: [] }),
    applyShot: (next) => { current = next; },
    persist: async () => { events.push("persist"); throw new Error("persist failed"); },
    keyframeStillUsed: () => false,
    removeKeyframe: async (id) => { events.push(`remove:${id}`); }
  }), /persist failed/);
  assert.strictEqual(current, original);
  assert.deepStrictEqual(events, ["persist"]);
});

runTest("selecting and deleting production results preserve a valid selected version", () => {
  const shot = { status: "generated", productionResults: [
    { id: "result-a", versionLabel: "V1", selected: true },
    { id: "result-b", versionLabel: "V2", selected: false }
  ] };
  const selected = selectProductionResult(shot, "result-b");
  assert.strictEqual(selected.status, "locked");
  assert.deepStrictEqual(selected.productionResults.map((item) => item.selected), [false, true]);
  assert.throws(() => deleteProductionResult(selected, "result-b"), /选定/);
  const deleted = deleteProductionResult(selected, "result-a");
  assert.deepStrictEqual(deleted.productionResults.map((item) => item.id), ["result-b"]);
});

runTest("old shots normalize without production result records", () => {
  const store = normalizeProjectStore({
    schemaVersion: 7,
    onboardingComplete: true,
    activeProjectId: "p1",
    projects: [{ id: "p1", name: "雾港", scenes: [{ id: "scene-1", shots: [{ id: "shot-1" }] }] }]
  }, { createBlankProject: () => ({ id: "starter", name: "未命名电影项目", workspaces: {} }) });
  assert.deepStrictEqual(store.projects[0].scenes[0].shots[0].productionResults, []);
});

runTest("screenplay import exposes local txt and docx reader", () => {
  const source = fs.readFileSync("screenplay-import.js", "utf8");
  const indexHtml = fs.readFileSync("index.html", "utf8");
  assert(source.includes("readScreenplayFile"));
  assert(source.includes(".txt"));
  assert(source.includes(".docx"));
  assert(source.includes("60000"));
  assert(indexHtml.includes("project-screenplay-file"));
  assert(indexHtml.includes("mammoth.browser.min.js"));
});

runTest("project store migrates old libraries without reopening onboarding", () => {
  const old = {
    schemaVersion: 1,
    activeProjectId: "p1",
    projects: [{ id: "p1", name: "未命名电影项目", activeWorkspace: "camera", workspaces: { camera: { scene: "码头" } } }]
  };
  const normalized = normalizeProjectStore(old, {
    createBlankProject: () => ({ id: "new", name: "未命名电影项目", activeWorkspace: "tone", workspaces: {} })
  });
  assert.strictEqual(normalized.schemaVersion, PROJECT_STORE_SCHEMA_VERSION);
  assert.strictEqual(normalized.onboardingComplete, true);
  assert.strictEqual(normalized.projects[0].activeWorkspace, "camera");
  assert.strictEqual(normalized.projects[0].workspaces.camera.scene, "码头");
});

runTest("project store migrates a film brief and visual bible without changing workspaces", () => {
  const store = normalizeProjectStore({
    schemaVersion: 2,
    onboardingComplete: true,
    activeProjectId: "p1",
    projects: [{ id: "p1", name: "雾港", activeWorkspace: "camera", workspaces: { camera: { scene: "码头" } } }]
  }, {
    createBlankProject: () => ({ id: "starter", name: "未命名电影项目", workspaces: {} })
  });

  const project = store.projects[0];
  assert.strictEqual(store.schemaVersion, PROJECT_STORE_SCHEMA_VERSION);
  assert.deepStrictEqual(project.workspaces.camera, { scene: "码头" });
  assert.strictEqual(project.creativeBrief.story, "");
  assert.strictEqual(project.creativeBrief.platform, "film");
  assert.strictEqual(project.visualBible.status, "draft");
  assert.deepStrictEqual(project.visualBible.toneItems, []);
  assert.deepStrictEqual(project.scenes, []);
});

runTest("project visual bible transitions preserve workspaces and timestamps", () => {
  const baseStore = normalizeProjectStore({
    schemaVersion: 2,
    onboardingComplete: true,
    activeProjectId: "p1",
    projects: [{ id: "p1", name: "雾港", activeWorkspace: "camera", workspaces: { camera: { scene: "码头" } } }]
  }, {
    createBlankProject: () => ({ id: "starter", name: "未命名电影项目", workspaces: {} })
  });
  const patched = patchProjectFoundation(baseStore, "p1", {
    creativeBrief: { story: "港口失踪案", route: "camera" },
    visualBible: { mood: "克制悬疑", palette: ["#123456", "invalid"], negativeConstraints: ["不要过曝", 9] }
  }, "2026-07-21T10:00:00.000Z");
  const locked = lockVisualBible(patched, "p1", "2026-07-21T10:01:00.000Z");
  const unlocked = unlockVisualBible(locked, "p1", "2026-07-21T10:02:00.000Z");

  assert.deepStrictEqual(locked.projects[0].workspaces.camera, { scene: "码头" });
  assert.strictEqual(locked.projects[0].creativeBrief.story, "港口失踪案");
  assert.deepStrictEqual(locked.projects[0].visualBible.palette, ["#123456"]);
  assert.deepStrictEqual(locked.projects[0].visualBible.negativeConstraints, ["不要过曝"]);
  assert.strictEqual(locked.projects[0].visualBible.status, "locked");
  assert.strictEqual(locked.projects[0].visualBible.updatedAt, "2026-07-21T10:01:00.000Z");
  assert.strictEqual(unlocked.projects[0].visualBible.status, "draft");
  assert.strictEqual(unlocked.projects[0].visualBible.updatedAt, "2026-07-21T10:02:00.000Z");
});

runTest("project foundation normalizers reject malformed values", () => {
  assert.deepStrictEqual(normalizeCreativeBrief({ platform: "unknown", targetModels: ["Seedance", 1], referenceAssetIds: ["ref-1", 2] }), {
    story: "",
    platform: "film",
    era: "",
    region: "",
    targetModels: ["Seedance"],
    route: "library",
    referenceAssetIds: ["ref-1"]
  });
  assert.deepStrictEqual(normalizeVisualBible({ status: "anything", palette: ["#abcdef", "#ABCDEG"], toneItems: [{ id: "tone-1", category: "director" }, { id: 2, category: "director" }] }).palette, ["#abcdef"]);
});

runTest("project reference assets remain outside project JSON", () => {
  const source = fs.readFileSync("project-reference-store.js", "utf8");
  const core = fs.readFileSync("workspace-core.js", "utf8");
  assert(source.includes('STORE_NAME = "project-references"'));
  assert(source.includes("aigcCastingAssetStore?.prepareImage"));
  assert(core.includes("aigcProjectReferenceStore"));
  const baseStore = normalizeProjectStore({
    onboardingComplete: true,
    activeProjectId: "p1",
    projects: [{ id: "p1", name: "雾港", activeWorkspace: "tone", workspaces: {} }]
  }, { createBlankProject: () => ({ id: "starter", name: "未命名电影项目", workspaces: {} }) });
  const next = patchProjectFoundation(baseStore, "p1", { creativeBrief: { referenceAssetIds: ["project-ref-1"] } }, "2026-07-21T10:00:00.000Z");
  assert.deepStrictEqual(next.projects[0].creativeBrief.referenceAssetIds, ["project-ref-1"]);
  assert.strictEqual(JSON.stringify(next).includes("data:image"), false);
});

runTest("project foundation exposes the three guided film steps", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const source = fs.readFileSync("project-foundation.js", "utf8");
  assert(html.includes('id="project-foundation-dialog"'));
  assert(html.includes('data-foundation-step="brief"'));
  assert(html.includes('data-foundation-step="visual"'));
  assert(html.includes('data-foundation-step="route"'));
  assert(html.includes('id="foundation-project-name"'));
  assert(source.includes("aigcProjectFoundation"));
  assert(source.includes("renameActiveProject"));
  assert(source.includes("lockActiveVisualBible"));
});

runTest("project scenes preserve a bounded scene and 15-second shot contract", () => {
  const scenes = normalizeProjectScenes([{
    id: "scene-01",
    title: "雨夜码头",
    setting: "北方港口候船厅，冬夜",
    characters: ["林岚"],
    emotion: "压住恐惧的警觉",
    action: "她握紧证物，缓慢转身",
    shots: [{ id: "shot-01", durationSeconds: 15, framing: "中近景", movement: "缓慢推进", performance: "呼吸变浅，目光寻找出口", sound: "雨声、远处汽笛、脚步回响" }]
  }]);
  assert.strictEqual(scenes.length, 1);
  assert.strictEqual(scenes[0].shots[0].durationSeconds, 15);
  assert.deepStrictEqual(scenes[0].characters, ["林岚"]);
  const numberedPrompt = buildSceneShotPrompt({ name: "雾港", creativeBrief: {}, visualBible: {} }, scenes[0], scenes[0].shots[0]);
  assert(numberedPrompt.includes("【镜头编号】场 01 · 镜 01"));
});

runTest("project shot delivery orders scenes and keeps pending production details", () => {
  const project = {
    name: "雾港/来信",
    creativeBrief: { era: "1990年代", region: "北方港口" },
    visualBible: { mood: "潮湿悬疑", colorDirection: "冷灰", lightingDirection: "码头钠灯侧逆光", materialDirection: "35mm胶片颗粒", negativeConstraints: ["不要塑料皮肤"] },
    assetLocks: [{ id: "CHAR-001", kind: "character", name: "林岚", detail: "深色风衣", referenceAssetIds: ["project-ref-1"], referenceRule: "保持同一身份" }],
    scenes: [
      { id: "scene-2", number: 2, title: "旧旅馆", setting: "旧旅馆房间", time: "凌晨", storyBeat: "她听见走廊脚步", characters: ["林岚"], assetIds: ["CHAR-001"], estimatedDurationSeconds: 15, shots: [{ id: "shot-2", durationSeconds: 15, targetModel: "seedance", status: "generated", promptCard: { narrative: "她转向门口", action: "攥紧证物", performance: "屏住呼吸", framing: "中近景", movement: "缓慢推近", sound: "走廊脚步与房间底噪" }, negativeConstraints: ["不要字幕"] }] },
      { id: "scene-1", number: 1, title: "码头", setting: "港口码头", time: "冬夜", storyBeat: "林岚抵达码头", characters: ["林岚"], assetIds: ["CHAR-001"], estimatedDurationSeconds: 15, shots: [{ id: "shot-1", durationSeconds: 15, targetModel: "general", status: "planned", promptCard: { narrative: "林岚穿过候船厅", framing: "中景", movement: "固定机位" }, negativeConstraints: [] }] }
    ]
  };
  const output = buildProjectShotDelivery(project);
  assert.deepStrictEqual(output.scenes.map((scene) => scene.number), [1, 2]);
  assert.strictEqual(output.summary.sceneCount, 2);
  assert.strictEqual(output.summary.shotCount, 2);
  assert.strictEqual(output.summary.readyShotCount, 1);
  assert.strictEqual(output.summary.pendingShotCount, 1);
  assert.strictEqual(output.filename, "雾港_来信_镜头交付包.md");
  assert(output.markdown.includes("场 01 · 镜 01"));
  assert(output.markdown.includes("待补条件：可见动作、声音与限制"));
  assert(output.markdown.includes("CHAR-001｜林岚"));
  assert(output.markdown.indexOf("场 01 · 镜 01") < output.markdown.indexOf("场 02 · 镜 01"));
  assert.strictEqual(project.scenes[0].number, 2);
});

runTest("project delivery exposes and exports only the selected shot production result", () => {
  const output = buildProjectShotDelivery({
    name: "测试项目",
    scenes: [{
      number: 1,
      title: "码头",
      shots: [{
        id: "shot-1",
        durationSeconds: 15,
        productionResults: [
          { id: "result-a", versionLabel: "V1", selected: false, platform: "旧平台", resultUrl: "https://example.test/old", notes: "不应导出" },
          { id: "result-b", versionLabel: "V2", selected: true, platform: "Seedance", modelVersion: "Seedance 1.5 Pro", seed: "99", resultUrl: "https://example.test/final", notes: "已通过角色与场景一致性人工检查" }
        ]
      }]
    }]
  });
  const shot = output.scenes[0].shots[0];
  assert.strictEqual(shot.selectedResult.id, "result-b");
  assert.strictEqual(shot.selectedResult.resultUrl, "https://example.test/final");
  assert(output.markdown.includes("### 选定生成结果"));
  assert(output.markdown.includes("- 版本：V2"));
  assert(output.markdown.includes("- 平台 / 模型：Seedance / Seedance 1.5 Pro"));
  assert(output.markdown.includes("- Seed：99"));
  assert(output.markdown.includes("- 外部结果：https://example.test/final"));
  assert(output.markdown.includes("- 备注：已通过角色与场景一致性人工检查"));
  assert(!output.markdown.includes("https://example.test/old"));
  assert(!output.markdown.includes("旧平台"));
  assert(!output.markdown.includes("不应导出"));
});

runTest("project delivery preserves legacy shot output when no selected production result exists", () => {
  const output = buildProjectShotDelivery({
    name: "旧项目",
    scenes: [{ number: 1, title: "车站", shots: [{ id: "shot-1", durationSeconds: 15, productionResults: [{ id: "result-a", selected: false, resultUrl: "https://example.test/history" }] }] }]
  });
  assert.strictEqual(output.scenes[0].shots[0].selectedResult, null);
  assert(!output.markdown.includes("选定生成结果"));
  assert(!output.markdown.includes("https://example.test/history"));
  assert(output.markdown.includes("- 制作状态：待生图"));
});

runTest("project production summary counts generated, revision, locked, and completed outputs", () => {
  const summary = summarizeSceneProduction({
    estimatedDurationSeconds: 120,
    shots: [
      { id: "shot-ready", status: "planned" },
      { id: "shot-generated-a", status: "generated" },
      { id: "shot-generated-b", status: "generated" },
      { id: "shot-revision", status: "revision" },
      { id: "shot-locked-a", status: "locked" },
      { id: "shot-locked-b", status: "locked" }
    ]
  }, (shot) => shot.id === "shot-ready");
  assert.strictEqual(summary.generationReadyCount, 1);
  assert.strictEqual(summary.generatedCount, 2);
  assert.strictEqual(summary.revisionCount, 1);
  assert.strictEqual(summary.lockedCount, 2);
  assert.strictEqual(summary.completedProductionCount, 4);
  assert.strictEqual(summary.shotCount, 6);
  assert.strictEqual(summary.plannedSeconds, 120);
});

runTest("project shot delivery keeps the authored shot-sheet order and exports locked reference rules", () => {
  const project = {
    name: "顺序测试",
    visualBible: {},
    assetLocks: [{ id: "CHAR-002", kind: "character", name: "阿野", detail: "黑色夹克", referenceAssetIds: ["project-ref-actor-a", "project-ref-actor-b"], referenceRule: "脸部与发型必须保持一致" }],
    scenes: [{
      id: "scene-1",
      number: 1,
      title: "走廊",
      assetIds: ["CHAR-002"],
      shots: [
        { id: "shot-2", durationSeconds: 15, promptCard: { narrative: "先执行的第二镜描述", action: "停住", performance: "克制", framing: "中景", movement: "固定机位", sound: "环境底噪" } },
        { id: "shot-10", durationSeconds: 15, promptCard: { narrative: "后执行的第十镜描述，含 ``` 特殊标记", action: "回头", performance: "惊觉", framing: "近景", movement: "缓慢推进", sound: "脚步声" } }
      ]
    }]
  };
  const output = buildProjectShotDelivery(project);
  assert(output.markdown.indexOf("先执行的第二镜描述") < output.markdown.indexOf("后执行的第十镜描述"));
  assert(output.markdown.includes("project-ref-actor-a、project-ref-actor-b"));
  assert(output.markdown.includes("脸部与发型必须保持一致"));
  assert(output.markdown.includes("````text"));
});

runTest("model-ready shot package preserves active formal prompt, duration, and reference order", () => {
  const project = {
    name: "雾港来信",
    assetLocks: [
      { id: "CHAR-001", kind: "character", name: "林岚", detail: "深色风衣", referenceAssetIds: ["ref-char"], referenceRule: "锁定脸部与发型" },
      { id: "LOC-001", kind: "location", name: "候船厅", detail: "雨夜", referenceAssetIds: ["ref-loc"], referenceRule: "锁定空间结构" },
      { id: "PROP-001", kind: "prop", name: "牛皮信封", detail: "潮湿折痕", referenceAssetIds: ["ref-prop"], referenceRule: "锁定材质与尺寸" }
    ]
  };
  const scene = { id: "scene-01", number: 1, title: "雨夜码头", assetIds: ["CHAR-001", "LOC-001", "PROP-001"], shots: [] };
  const shot = { id: "shot-01", deliveryMode: "seedance30", durationSeconds: 30, promptVersions: [{ id: "formal-v2", prompt: "正式 V2：林岚在候船厅握紧信封，0-10秒建立，10-20秒推进，20-30秒停住。" }], activePromptVersionId: "formal-v2" };
  scene.shots.push(shot);
  const seedance = buildShotModelPackage(project, scene, shot, "seedance");
  const general = buildShotModelPackage(project, scene, shot, "general");
  assert.strictEqual(seedance.references.length, 3);
  assert(seedance.markdown.includes("# Seedance｜场 01 · 镜 01交付包"));
  assert(seedance.markdown.includes("30 秒镜头"));
  assert(seedance.markdown.includes("ref-char"));
  assert(seedance.markdown.includes("ref-loc"));
  assert(seedance.markdown.includes("ref-prop"));
  assert(seedance.markdown.includes("正式 V2：林岚"));
  assert(seedance.filename.includes("Seedance交付包.md"));
  assert(general.markdown.includes("# 通用视频模型｜场 01 · 镜 01交付包"));
});

runTest("adjacent-shot continuity blocks changed character masters and warns intentional visual changes", () => {
  const project = {
    assetLocks: [
      { id: "CHAR-001", kind: "character", name: "林岚" },
      { id: "CHAR-009", kind: "character", name: "林岚" },
      { id: "PROP-001", kind: "prop", name: "信封" }
    ],
    scenes: [
      { id: "scene-01", number: 1, setting: "候船厅", time: "雨夜", assetIds: ["CHAR-001", "PROP-001"], shots: [{ id: "shot-01", promptCard: { props: "信封、手电", movement: "人物向左移动" } }] },
      { id: "scene-02", number: 2, setting: "码头栈桥", time: "凌晨", assetIds: ["CHAR-009"], shots: [{ id: "shot-01", promptCard: { props: "手电", movement: "人物向右移动" } }] }
    ]
  };
  const first = buildShotContinuity(project, project.scenes[0], project.scenes[0].shots[0]);
  const changed = buildShotContinuity(project, project.scenes[1], project.scenes[1].shots[0]);
  assert.strictEqual(first.status, "first");
  assert.strictEqual(changed.status, "blocked");
  assert(changed.blockers.some((issue) => issue.label === "角色母版不一致"));
  assert(changed.warnings.some((issue) => issue.label === "场景发生切换"));
  assert(changed.warnings.some((issue) => issue.label === "时间发生变化"));
  assert(changed.warnings.some((issue) => issue.label === "关键道具需核对"));
  assert(changed.warnings.some((issue) => issue.label === "运动方向需核对"));
});

runTest("shot readiness gate blocks unresolved asset masters while grouping production conditions", () => {
  const project = {
    visualBible: { colorDirection: "冷灰基调", lightingDirection: "侧逆光", negativeConstraints: ["不要字幕"] },
    workspaces: { casting: { role: "林岚" }, camera: { selectedDetail: { name: "中近景" }, action: "缓慢推进" } },
    assetLocks: [
      { id: "CHAR-001", kind: "character", name: "林岚", detail: "深色风衣", referenceAssetIds: ["project-ref-linlan"], referenceRule: "脸部与服装保持一致" },
      { id: "LOC-001", kind: "location", name: "港口候船厅", detail: "冬夜", referenceAssetIds: [], referenceRule: "空间结构与主光方向保持一致" }
    ]
  };
  const scene = {
    number: 1,
    setting: "港口候船厅",
    characters: ["林岚"],
    assetIds: ["CHAR-001", "LOC-001"],
    storyBeat: "她察觉到身后有人靠近"
  };
  const shot = { durationSeconds: 15, promptCard: { narrative: "林岚停住脚步", action: "握紧信封", performance: "呼吸放缓", framing: "中近景", movement: "缓慢推进", sound: "雨声与远处汽笛" }, negativeConstraints: ["不要字幕"] };
  const gate = buildShotReadinessGate(project, scene, shot);
  assert.strictEqual(gate.ready, false);
  assert.deepStrictEqual(gate.groups.map((group) => group.id), ["story", "visual", "delivery"]);
  assert.strictEqual(gate.assets.find((asset) => asset.id === "CHAR-001").referenceCount, 1);
  assert.strictEqual(gate.assets.find((asset) => asset.id === "CHAR-001").referenceRule, "脸部与服装保持一致");
  assert.strictEqual(gate.assets.find((asset) => asset.id === "LOC-001").referenceCount, 0);
  assert(gate.actions.some((action) => action.id === "focus-asset-reference" && action.assetId === "LOC-001"));
  assert(!gate.actions.some((action) => action.id === "go-tone"));
});

runTest("shot production card separates generation readiness from lockable delivery", () => {
  const project = {
    visualBible: { colorDirection: "冷灰", lightingDirection: "侧逆光", negativeConstraints: ["不要字幕"] },
    workspaces: { casting: { role: "林岚" }, camera: { selectedDetail: { name: "中近景" }, action: "缓慢推进" } },
    assetLocks: [{ id: "CHAR-001", kind: "character", name: "林岚", referenceAssetIds: ["ref-1"], masterStatus: "locked" }]
  };
  const scene = { id: "scene-01", number: 1, characters: ["林岚"], setting: "候船厅", assetIds: ["CHAR-001"], storyBeat: "她发现证物", videoCard: { performance: "先停顿再抬眼" } };
  const incomplete = { id: "shot-01", deliveryMode: "seedance30", durationSeconds: 30, promptCard: { narrative: "林岚走入候船厅", action: "握紧信封", performance: "呼吸变浅", framing: "中近景", movement: "缓慢推进", sound: "雨声", beatPlan: "建立 → 推进" }, negativeConstraints: ["不要字幕"] };
  scene.shots = [incomplete];
  const blocked = buildShotProductionCard(project, scene, incomplete);
  assert.strictEqual(blocked.ready, false);
  assert.strictEqual(blocked.lockable, false);
  assert.strictEqual(blocked.checks.find((check) => check.id === "camera").ready, false);
  assert.strictEqual(blocked.checks.find((check) => check.id === "prompt").ready, false);
  assert.strictEqual(blocked.nextAction.id, "focus-beat-plan");
  const complete = { ...incomplete, promptCard: { ...incomplete.promptCard, beatPlan: "建立人物与空间 → 触发证物 → 停在决定前" }, promptVersions: [{ id: "prompt-v1" }], productionResults: [{ id: "result-v1", selected: true }] };
  scene.shots = [complete];
  const delivered = buildShotProductionCard(project, scene, complete);
  assert.strictEqual(delivered.ready, true);
  assert.strictEqual(delivered.lockable, true);
  assert.strictEqual(delivered.identity.shotNumber, 1);
});

runTest("scene shot prompts inherit the visual bible and keep production constraints", () => {
  const prompt = buildSceneShotPrompt({
    name: "雾港来信",
    creativeBrief: { era: "1990年代", region: "北方沿海城市" },
    visualBible: {
      mood: "压抑克制",
      colorDirection: "低饱和青灰，微弱暖钨丝灯",
      lightingDirection: "侧逆光，深阴影",
      cameraDirection: "真实手持克制推进",
      materialDirection: "65mm胶片颗粒，真实皮肤",
      negativeConstraints: ["不要塑料皮肤", "不要字幕"]
    }
  }, {
    number: 1,
    title: "雨夜码头",
    setting: "北方港口候船厅，冬夜",
    characters: ["林岚"],
    emotion: "压住恐惧的警觉",
    action: "她握紧证物，缓慢转身"
  }, {
    durationSeconds: 15,
    framing: "中近景",
    movement: "缓慢推进",
    performance: "呼吸变浅，目光寻找出口",
    sound: "雨声、远处汽笛、脚步回响"
  });
  ["雾港来信", "第 01 场", "低饱和青灰", "缓慢推进", "15 秒", "不要塑料皮肤", "不要字幕"].forEach((token) => assert(prompt.includes(token), `missing ${token}`));
});

runTest("scene inheritance keeps project master data separate from scene overrides", () => {
  const inherited = deriveProjectSceneInheritance({
    visualBible: { colorDirection: "低饱和青灰", lightingDirection: "侧逆光", cameraDirection: "真实胶片颗粒" },
    workspaces: {
      tone: { selectedDetails: [{ title: "雨夜港口", color: "冷暖对比", lighting: "逆光", camera: "35mm" }] },
      casting: { role: "林岚", age: "30岁女性", costume: "深色风衣", traits: "左眉疤痕" },
      camera: { selectedDetail: { name: "走廊跟拍" }, action: "缓慢推进" },
      music: { sceneZh: "雨夜港口", coreEmotion: "tense", intensity: "low", structure: { opening: "低频铺垫" } }
    }
  });
  assert(inherited.character.value.includes("林岚"));
  assert.strictEqual(inherited.tone.color, "低饱和青灰");
  assert(inherited.camera.detail.includes("走廊跟拍"));
  assert(inherited.music.prompt.includes("配乐后期单独生成"));
  const prompt = buildSceneVideoPrompt({ narrative: "她停在门前", characters: inherited.character.value, setting: "雨夜走廊", color: inherited.tone.color, lighting: inherited.tone.lighting, cameraTexture: inherited.tone.texture, framing: "中近景", movement: "缓慢推进", musicCue: inherited.music.prompt }, "seedance");
  assert(prompt.includes("【配乐流程】"));
  assert(prompt.includes("当前视频生成不要背景音乐"));
});

runTest("scene readiness identifies only production blockers and allows inherited masters", () => {
  const project = {
    visualBible: { colorDirection: "低饱和青灰", lightingDirection: "侧逆光", cameraDirection: "65mm 胶片颗粒" },
    workspaces: { casting: { role: "林岚" }, camera: { selectedDetail: { name: "走廊跟拍" }, action: "缓慢推进" } }
  };
  const ready = assessSceneReadiness({
    storyBeat: "她在雨夜码头停下，听见身后的脚步。",
    setting: "北方港口候船厅",
    characters: [],
    shots: [{ framing: "中近景", movement: "缓慢推进", sound: "雨声与脚步回响" }]
  }, project);
  assert.strictEqual(ready.ready, true);
  assert.strictEqual(ready.complete, 5);
  assert.deepStrictEqual(ready.missing, []);
  assert(ready.items.some((item) => item.id === "character" && item.source === "项目母版"));

  const blocked = assessSceneReadiness({ storyBeat: "", setting: "", characters: [], shots: [{}] }, { workspaces: {} });
  assert.strictEqual(blocked.ready, false);
  assert.deepStrictEqual(blocked.missing, ["叙事", "人物", "地点", "影调", "镜头"]);
});

runTest("shot readiness evaluates the requested current shot instead of the first shot", () => {
  const project = {
    visualBible: { colorDirection: "低饱和青灰", lightingDirection: "侧逆光" },
    assetLocks: [{ id: "CHAR-001", kind: "character", name: "林岚" }]
  };
  const scene = {
    storyBeat: "林岚在雨夜码头等待来信。",
    characters: ["林岚"],
    setting: "北方港口候船厅",
    action: "她握紧信封，停在闸门前。",
    videoCard: { sound: "雨声与远处汽笛", negatives: "不要字幕，不要水印" },
    assetIds: ["CHAR-001"],
    shots: [
      { id: "shot-01", framing: "中近景", movement: "缓慢推进", promptCard: { narrative: "建立人物", action: "她走入画面", sound: "雨声", framing: "中近景", movement: "缓慢推进" }, negativeConstraints: ["不要字幕"] },
      { id: "shot-02", promptCard: { narrative: "她停在闸门前" }, negativeConstraints: ["不要字幕"] }
    ]
  };
  const first = assessShotReadiness(project, scene, scene.shots[0]);
  const current = assessShotReadiness(project, scene, scene.shots[1]);
  assert.strictEqual(first.ready, true);
  assert.strictEqual(current.ready, false);
  assert(current.missing.includes("景别与运镜"));
});

runTest("shot readiness flags missing same-name asset master references and exempts pure environment shots", () => {
  const project = {
    visualBible: { colorDirection: "冷青灰", lightingDirection: "阴天柔光" },
    assetLocks: [
      { id: "CHAR-001", kind: "character", name: "林岚" },
      { id: "LOC-001", kind: "location", name: "港口候船厅" }
    ]
  };
  const scene = {
    storyBeat: "林岚走进候船厅。",
    characters: ["林岚"],
    setting: "港口候船厅",
    action: "她推开玻璃门。",
    videoCard: { sound: "风声", negatives: "不要字幕" },
    assetIds: [],
    shots: [{ framing: "中景", movement: "稳定跟随", promptCard: { narrative: "她进入候船厅" }, negativeConstraints: ["不要水印"] }]
  };
  const blocked = assessShotReadiness(project, scene, scene.shots[0]);
  assert(blocked.missing.some((item) => item.includes("角色参考资产 CHAR-001")));
  assert(blocked.missing.some((item) => item.includes("场景参考资产 LOC-001")));

  const environment = assessShotReadiness({ visualBible: project.visualBible }, {
    storyBeat: "空镜建立雨夜港口的空间关系。",
    setting: "雨夜港口",
    videoCard: { sound: "海风与雨声", negatives: "不要人物，不要字幕" },
    shots: [{ framing: "大全景", movement: "缓慢横移", promptCard: { narrative: "无人空镜，建立港口空间" }, negativeConstraints: ["不要水印"] }]
  }, { framing: "大全景", movement: "缓慢横移", promptCard: { narrative: "无人空镜，建立港口空间" }, negativeConstraints: ["不要水印"] });
  assert.strictEqual(environment.ready, true);
  assert(environment.items.some((item) => item.id === "subject" && item.source === "空镜豁免"));
});

runTest("scene asset locks assign stable master ids and keep scene references bounded", () => {
  const project = {
    workspaces: { casting: { id: "CHAR-009", role: "林岚，刑警", costume: "深色风衣", traits: "左眉尾浅疤" } },
    assetLocks: []
  };
  const scene = { id: "scene-01", setting: "北方港口候船厅", videoCard: { props: "证物信封、银色腕表" }, assetIds: [] };
  const result = lockSceneAssets(project, scene, ["character", "location", "prop"]);
  assert.deepStrictEqual(result.added.map((asset) => asset.id), ["CHAR-009", "LOC-001", "PROP-001", "PROP-002"]);
  assert.deepStrictEqual(result.scene.assetIds, ["CHAR-009", "LOC-001", "PROP-001", "PROP-002"]);
  assert.strictEqual(assetsForScene(result.project, result.scene).prompt, "引用锁定资产：CHAR-009 林岚，刑警；LOC-001 北方港口候船厅；PROP-001 证物信封；PROP-002 银色腕表。不得更换人物身份、空间结构或关键物件。");
  const repeated = lockSceneAssets(result.project, result.scene, ["character", "location", "prop"]);
  assert.strictEqual(repeated.added.length, 0);
  assert.strictEqual(repeated.project.assetLocks.length, 4);
  const unlocked = unlockSceneAsset(repeated.project, repeated.scene, "PROP-001");
  assert(!unlocked.scene.assetIds.includes("PROP-001"));
  assert(!unlocked.project.assetLocks.some((asset) => asset.id === "PROP-001"));
  const assetPrompt = buildSceneShotPrompt({ ...result.project, name: "雾港", visualBible: {}, creativeBrief: {} }, result.scene, { durationSeconds: 15, framing: "中近景", movement: "缓慢推进" });
  assert(assetPrompt.includes("【锁定资产】引用锁定资产：CHAR-009 林岚，刑警"));
});

runTest("scene asset locks cover every named character and expose a lock-all preview", () => {
  const project = {
    assetLocks: [],
    workspaces: { casting: { id: "CHAR-009", role: "林岚，刑警", costume: "深灰风衣" } }
  };
  const scene = {
    id: "scene-02",
    characters: ["林岚", "店员"],
    setting: "便利店柜台",
    videoCard: { props: "一张旧照片" },
    assetIds: []
  };
  const preview = assetLockPreview(project, scene);
  assert.deepStrictEqual(preview.candidates.map((asset) => asset.name), ["林岚，刑警", "店员", "便利店柜台", "一张旧照片"]);
  assert.strictEqual(preview.pending.length, 4);
  const locked = lockSceneAssets(project, scene, ["character", "location", "prop"]);
  assert.deepStrictEqual(locked.scene.assetIds, ["CHAR-009", "CHAR-010", "LOC-001", "PROP-001"]);
  assert.strictEqual(assetLockPreview(locked.project, locked.scene).pending.length, 0);
  assert(assetsForScene(locked.project, locked.scene).prompt.includes("CHAR-010 店员"));
});

runTest("reference-bearing character and location assets enter a scene prompt", () => {
  const locks = normalizeAssetLocks([
    { id: "CHAR-001", kind: "character", name: "林岚", referenceAssetIds: ["project-ref-char"], referenceRule: "脸部、发型和体型保持一致" },
    { id: "LOC-001", kind: "location", name: "港口码头", referenceAssetIds: ["project-ref-loc"], referenceRule: "保持码头结构和侧逆光方向" }
  ]);
  const result = assetsForScene({ assetLocks: locks }, { assetIds: ["CHAR-001", "LOC-001"] });
  assert(result.prompt.includes("角色参考资产"));
  assert(result.prompt.includes("project-ref-char"));
  assert(result.prompt.includes("场景参考资产"));
  assert(result.prompt.includes("project-ref-loc"));
});

runTest("reference assets stay outside project JSON and remain protected while scenes use them", () => {
  const asset = normalizeAssetLocks([{ id: "CHAR-001", kind: "character", name: "林岚", referenceAssetIds: ["project-ref-char"] }])[0];
  const result = unlockSceneAsset(
    { assetLocks: [asset], scenes: [{ id: "scene-2", assetIds: ["CHAR-001"] }] },
    { id: "scene-1", assetIds: ["CHAR-001"] },
    "CHAR-001"
  );
  assert.strictEqual(result.removedFromProject, false);
  assert.deepStrictEqual(result.project.assetLocks[0].referenceAssetIds, ["project-ref-char"]);
});

runTest("asset reference uploads reject a seventh image before storage", () => {
  assert.strictEqual(referenceUploadCanProceed({ referenceAssetIds: ["ref-1", "ref-2", "ref-3", "ref-4", "ref-5"] }), true);
  assert.strictEqual(referenceUploadCanProceed({ referenceAssetIds: ["ref-1", "ref-2", "ref-3", "ref-4", "ref-5", "ref-6"] }), false);
  const source = fs.readFileSync("project-scenes.js", "utf8");
  assert(source.includes("已绑定 6 张参考图，请先删除一张再上传"));
  assert(source.indexOf("referenceUploadCanProceed(asset)") < source.indexOf("referenceStore.putFile(file, project.id)"));
});

runTest("asset reference uploads require the original active project and scene after storage", () => {
  const project = { id: "project-a" };
  const scene = { id: "scene-a" };
  assert.strictEqual(referenceUploadStillCurrent(project, scene, "project-a", "scene-a"), true);
  assert.strictEqual(referenceUploadStillCurrent({ id: "project-b" }, scene, "project-a", "scene-a"), false);
  assert.strictEqual(referenceUploadStillCurrent(project, { id: "scene-b" }, "project-a", "scene-a"), false);
  const source = fs.readFileSync("project-scenes.js", "utf8");
  assert(source.includes("await referenceStore.remove(metadata.id).catch(() => {});"));
  assert(source.includes("项目或场次已切换，参考图未绑定，请重新上传。"));
});

runTest("scene desk exposes uploadable character and location reference assets", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const source = fs.readFileSync("project-scenes.js", "utf8");
  assert(html.includes("project-character-reference-upload"));
  assert(html.includes("project-location-reference-upload"));
  ["角色参考图", "场景参考图", "upload-asset-reference", "addAssetReference", "data-project-reference-preview"].forEach((token) => assert(source.includes(token), `missing ${token}`));
});

runTest("scene asset locks ignore editor guidance text until real production details exist", () => {
  const result = lockSceneAssets({ assetLocks: [] }, {
    id: "scene-empty",
    videoCard: { characters: "补充出场人物。", setting: "补充内外景、地点与空间关系。", props: "" },
    assetIds: []
  }, ["character", "location", "prop"]);
  assert.strictEqual(result.added.length, 0);
  assert.deepStrictEqual(result.scene.assetIds, []);
});

runTest("project asset ledger reports every scene reference and only flags actionable continuity gaps", () => {
  const project = {
    assetLocks: [
      { id: "CHAR-001", kind: "character", name: "林岚", detail: "深灰风衣，左眉尾浅疤" },
      { id: "LOC-001", kind: "location", name: "港口候船厅", detail: "" },
      { id: "PROP-001", kind: "prop", name: "证物信封", detail: "关键物件" }
    ],
    scenes: [
      { id: "scene-01", number: 1, title: "候船厅", assetIds: ["CHAR-001", "LOC-001"] },
      { id: "scene-02", number: 2, title: "码头雨夜", assetIds: ["CHAR-001", "PROP-001"] }
    ]
  };
  const ledger = assetLedger(project);
  assert.strictEqual(ledger.referencedCount, 3);
  assert.strictEqual(ledger.unreferencedCount, 0);
  assert.strictEqual(ledger.byKind.character[0].references.length, 2);
  assert.strictEqual(ledger.byKind.location[0].attention, "需要建立母版或上传参考图");
  assert.strictEqual(ledger.byKind.prop[0].attention, "需要建立母版或上传参考图");
  const cleanup = pruneUnreferencedAssets([...project.assetLocks, { id: "PROP-002", kind: "prop", name: "遗留物件" }], project.scenes);
  assert.deepStrictEqual(cleanup.removed.map((asset) => asset.id), ["PROP-002"]);
  assert.strictEqual(cleanup.assetLocks.length, 3);
});

runTest("full screenplay asset scan merges recurring assets and keeps prop reference masters", () => {
  const project = {
    assetLocks: [],
    scenes: [
      { id: "scene-01", number: 1, characters: ["林岚"], setting: "港口候船厅", videoCard: { props: "红色信封" } },
      { id: "scene-02", number: 2, characters: ["林岚"], setting: "港口候船厅", videoCard: { props: "红色信封" } }
    ]
  };
  const result = syncProjectAssetLedger(project);
  assert.strictEqual(result.added.length, 3);
  assert.strictEqual(result.project.assetLocks.filter((asset) => asset.kind === "character").length, 1);
  assert.strictEqual(result.project.assetLocks.find((asset) => asset.kind === "prop").masterStatus, "needs_master");
  assert.strictEqual(result.scenes[0].assetIds.length, 3);
  assert.strictEqual(result.scenes[1].assetIds.length, 3);
  const prop = normalizeAssetLocks([{ id: "PROP-001", kind: "prop", name: "红色信封", referenceAssetIds: ["project-ref-prop-a"] }])[0];
  assert.deepStrictEqual(prop.referenceAssetIds, ["project-ref-prop-a"]);
  assert.strictEqual(prop.masterStatus, "has_reference");
});

runTest("full screenplay asset scan cautiously extracts clear character and prop clues from local scene text", () => {
  const result = syncProjectAssetLedger({ assetLocks: [], scenes: [{ id: "scene-01", number: 1, setting: "港口候船厅", sourceExcerpt: "林岚握住红色信封，望向玻璃门外。" }] });
  assert.strictEqual(result.project.assetLocks.filter((asset) => asset.kind === "character").length, 1);
  assert.strictEqual(result.project.assetLocks.filter((asset) => asset.kind === "prop").length, 1);
  assert(result.project.assetLocks.some((asset) => asset.kind === "character" && asset.name === "林岚"));
  assert(result.project.assetLocks.some((asset) => asset.kind === "prop" && asset.name === "红色信封"));
});

runTest("asset masters retain versioned reference snapshots and can restore a selected master", () => {
  const initial = { id: "CHAR-001", kind: "character", name: "林岚", detail: "深灰风衣", referenceRule: "保持脸部和发型", referenceAssetIds: ["project-ref-linlan-v1"], masterStatus: "locked" };
  const saved = saveAssetMasterVersion(initial, new Date("2026-08-11T00:00:00.000Z"));
  assert.strictEqual(saved.masterVersions.length, 1);
  assert.strictEqual(saved.activeMasterVersionId, saved.masterVersions[0].id);
  const changed = { ...saved, detail: "黑色雨衣", referenceAssetIds: ["project-ref-linlan-v2"], activeMasterVersionId: "" };
  const restored = applyAssetMasterVersion(changed, saved.masterVersions[0].id);
  assert.strictEqual(restored.detail, "深灰风衣");
  assert.deepStrictEqual(restored.referenceAssetIds, ["project-ref-linlan-v1"]);
});

runTest("historical asset master references remain protected for project cleanup and archive", () => {
  const project = { assetLocks: [{ id: "CHAR-001", kind: "character", name: "林岚", referenceAssetIds: ["project-ref-current"], masterVersions: [{ id: "master-v1", referenceAssetIds: ["project-ref-history"] }] }], scenes: [] };
  assert.deepStrictEqual(collectProjectReferenceAssetIds(project).sort(), ["project-ref-current", "project-ref-history"]);
  assert.strictEqual(isProjectReferenceUsed([project], "project-ref-history"), true);
  assert.deepStrictEqual(projectArchive.collectReferencedAssetIds(project).projectReferenceIds.sort(), ["project-ref-current", "project-ref-history"]);
});

runTest("production queue follows screenplay, locked assets, formal prompts, results, then delivery", () => {
  assert.strictEqual(buildProjectProductionQueue({ scenes: [] })[0].kind, "screenplay");
  const base = { id: "scene-01", shots: [{ id: "shot-01", promptVersions: [], productionResults: [] }], assetIds: ["CHAR-001"] };
  const assetTask = buildProjectProductionQueue({ scenes: [base], assetLocks: [{ id: "CHAR-001", masterStatus: "has_reference" }] });
  assert.strictEqual(assetTask[0].kind, "assets");
  const promptTask = buildProjectProductionQueue({ scenes: [base], assetLocks: [{ id: "CHAR-001", masterStatus: "locked" }] });
  assert.strictEqual(promptTask[0].kind, "prompts");
  const resultTask = buildProjectProductionQueue({ scenes: [{ ...base, shots: [{ id: "shot-01", promptVersions: [{ id: "prompt-v1" }], productionResults: [] }] }], assetLocks: [{ id: "CHAR-001", masterStatus: "locked" }] });
  assert.strictEqual(resultTask[0].kind, "results");
  const deliveryTask = buildProjectProductionQueue({ scenes: [{ ...base, shots: [{ id: "shot-01", promptVersions: [{ id: "prompt-v1" }], productionResults: [{ id: "result-v1", selected: true }] }] }], assetLocks: [{ id: "CHAR-001", masterStatus: "locked" }] });
  assert.strictEqual(deliveryTask[0].kind, "delivery");
});

runTest("production audit separates generation blockers from result review and produces a handoff report", () => {
  const project = { name: "雾港来信", assetLocks: [{ id: "CHAR-001", name: "林岚", masterStatus: "has_reference" }], scenes: [{ id: "scene-01", number: 1, assetIds: ["CHAR-001"], shots: [{ id: "shot-01", promptVersions: [], productionResults: [], status: "planned" }, { id: "shot-02", promptVersions: [{ id: "v1" }], productionResults: [], status: "revision" }] }] };
  const audit = buildProjectProductionAudit(project);
  assert.strictEqual(audit.blockers.length, 2);
  assert.strictEqual(audit.review.length, 2);
  assert.strictEqual(audit.readyForDelivery, false);
  const markdown = buildProjectProductionAuditMarkdown(project);
  assert(markdown.includes("生成前阻塞项：2"));
  assert(markdown.includes("场 01 · 镜 02 标记为需返工"));
});

runTest("shot delivery mode persists formal prompt versions with locked asset snapshots", () => {
  const scene = { id: "scene-01", number: 1, title: "候船厅", characters: ["林岚"], setting: "港口候船厅", assetIds: ["CHAR-001"], shots: [] };
  const project = { name: "测试短片", scenes: [scene], assetLocks: [{ id: "CHAR-001", kind: "character", name: "林岚", referenceAssetIds: ["project-ref-linlan"], masterStatus: "locked" }] };
  const shot = normalizeSceneShot({ id: "shot-01", durationSeconds: 30, deliveryMode: "seedance30", targetModel: "seedance", promptCard: { narrative: "林岚进入候船厅", action: "停在红色信封前" } }, 0);
  scene.shots = [shot];
  const saved = createShotPromptVersion(project, scene, shot, new Date("2026-08-11T00:00:00.000Z"));
  assert.strictEqual(saved.deliveryMode, "seedance30");
  assert.strictEqual(saved.promptVersions.length, 1);
  assert.strictEqual(saved.promptVersions[0].deliveryMode, "seedance30");
  assert.deepStrictEqual(saved.promptVersions[0].assetIds, ["CHAR-001"]);
  assert.strictEqual(saved.activePromptVersionId, saved.promptVersions[0].id);
});

runTest("continuity review only flags scenes that omit an already-established master asset", () => {
  const project = {
    assetLocks: [
      { id: "CHAR-001", kind: "character", name: "林岚，刑警", detail: "深灰风衣" },
      { id: "LOC-001", kind: "location", name: "港口候船厅", detail: "冬夜" }
    ],
    scenes: [
      { id: "scene-01", number: 1, title: "候船厅", characters: ["林岚"], setting: "港口候船厅", assetIds: ["CHAR-001", "LOC-001"] },
      { id: "scene-02", number: 2, title: "码头入口", videoCard: { characters: "林岚", setting: "港口候船厅" }, assetIds: [] },
      { id: "scene-03", number: 3, title: "新地点", characters: ["店员"], setting: "便利店", assetIds: [] }
    ]
  };
  const report = continuityReport(project);
  assert.strictEqual(report.issues.length, 2);
  assert.deepStrictEqual(report.issues.map((issue) => issue.asset.id), ["CHAR-001", "LOC-001"]);
  assert(report.issues.every((issue) => issue.sceneId === "scene-02"));
  assert(report.issues[0].detail.includes("可能发生人物身份漂移"));
});

runTest("scene shots keep independent production status and prompt overrides", () => {
  const [scene] = normalizeProjectScenes([{
    id: "scene-01",
    shots: [
      { id: "shot-01", status: "keyframe", durationSeconds: 12, framing: "全景", movement: "缓慢横移", promptCard: { narrative: "先建立空旷码头", action: "她从远处走近" } },
      { id: "shot-02", status: "generated", durationSeconds: 15, promptCard: { narrative: "切到她握紧信封", performance: "呼吸变浅" } }
    ]
  }]);
  assert.strictEqual(scene.shots[0].status, "keyframe");
  assert.strictEqual(scene.shots[0].promptCard.narrative, "先建立空旷码头");
  assert.strictEqual(scene.shots[1].status, "generated");
  assert.strictEqual(scene.shots[1].promptCard.performance, "呼吸变浅");
  assert.strictEqual(normalizeProjectScenes([{ shots: [{ status: "unknown" }] }])[0].shots[0].status, "planned");
  const transferPrompt = buildSceneShotPrompt({ name: "雾港", creativeBrief: {}, visualBible: {} }, { ...scene, storyBeat: "原始场次叙事" }, scene.shots[0]);
  assert(transferPrompt.includes("先建立空旷码头"));
  assert(transferPrompt.includes("她从远处走近"));
  assert(transferPrompt.includes("全景；缓慢横移"));
});

runTest("shot target model persists per shot and old projects default to general", () => {
  const [scene] = normalizeProjectScenes([{
    shots: [{ id: "old-shot" }, { id: "seedance-shot", targetModel: "seedance" }, { id: "invalid-shot", targetModel: "unknown" }]
  }]);
  assert.strictEqual(scene.shots[0].targetModel, "general");
  assert.strictEqual(scene.shots[1].targetModel, "seedance");
  assert.strictEqual(scene.shots[2].targetModel, "general");
  const next = patchProjectScenes({ projects: [{ id: "p1", scenes: [scene] }] }, "p1", [scene], "2026-07-26T00:00:00.000Z");
  assert.strictEqual(next.projects[0].scenes[1 - 1].shots[1].targetModel, "seedance");
});

runTest("scene normalization preserves planned scene duration while shots remain independent", () => {
  const [scene] = normalizeProjectScenes([{
    estimatedDurationSeconds: 52,
    shots: [{ durationSeconds: 12 }, { durationSeconds: 15 }]
  }]);
  assert.strictEqual(scene.estimatedDurationSeconds, 52);
  assert.strictEqual(scene.shots.length, 2);
  assert.strictEqual(scene.shots[0].durationSeconds, 12);
});

runTest("patching scenes updates only the selected project scene sheet", () => {
  const store = normalizeProjectStore({
    onboardingComplete: true,
    activeProjectId: "p1",
    projects: [{ id: "p1", name: "雾港", workspaces: {} }, { id: "p2", name: "另一项目", workspaces: {} }]
  }, { createBlankProject: () => ({ id: "starter", name: "未命名电影项目", workspaces: {} }) });
  const next = patchProjectScenes(store, "p1", [{ id: "scene-01", title: "雨夜码头", shots: [{ id: "shot-01" }] }], "2026-07-21T10:00:00.000Z");
  assert.strictEqual(next.projects[0].scenes[0].title, "雨夜码头");
  assert.deepStrictEqual(next.projects[1].scenes, []);
});

runTest("screenplay parser turns Chinese scene headings into confirmable scene cards", () => {
  const scenes = parseScreenplayIntoScenes(`第 01 场 外景 港口码头 冬夜\n林岚独自穿过候船厅，手里攥着证物。\n\n第 02 场 内景 旧旅馆房间 凌晨\n她把证物放到桌上，听见走廊传来脚步声。`);
  assert.strictEqual(scenes.length, 2);
  assert.strictEqual(scenes[0].title, "港口码头");
  assert.strictEqual(scenes[0].time, "冬夜");
  assert(scenes[0].storyBeat.includes("林岚独自穿过候船厅"));
  assert(scenes[0].sourceExcerpt.includes("林岚独自穿过候船厅"));
  assert.strictEqual(scenes[1].title, "旧旅馆房间");
});

runTest("screenplay parser creates editable AIGC shot drafts with an initial scene duration", () => {
  const [scene] = parseScreenplayIntoScenes("第 01 场 外景 港口码头 冬夜\n林岚独自穿过候船厅，手里攥着证物。她听见身后汽笛，停在昏暗的门灯下。");
  assert(scene.shots.length >= 2);
  assert.strictEqual(scene.estimatedDurationSeconds, scene.shots.reduce((total, shot) => total + shot.durationSeconds, 0));
  assert(scene.shots.some((shot) => shot.promptCard.narrative.includes("林岚独自穿过候船厅")));
});

runTest("AI screenplay analysis keeps a source excerpt for every confirmable scene", () => {
  const rawText = "第 01 场 外景 港口码头 冬夜\n林岚独自穿过候船厅，手里攥着证物。";
  const prompt = buildAiScreenplayPrompt({ name: "雾港" }, rawText);
  assert(prompt.includes("sourceExcerpt"));
  assert(prompt.includes(rawText));
  const scenes = parseAiScreenplayResult(JSON.stringify({
    scenes: [{
      number: 1,
      title: "港口码头",
      setting: "外景，港口码头",
      time: "冬夜",
      sourceExcerpt: "林岚独自穿过候船厅，手里攥着证物。",
      storyBeat: "林岚带着证物穿过候船厅，建立她的紧张状态。",
      characters: ["林岚"],
      emotion: "克制紧张",
      action: "攥紧证物，穿过候船厅",
      estimatedDurationSeconds: 24,
      shots: [{ durationSeconds: 12, promptCard: { narrative: "建立码头与人物", action: "林岚向前走", performance: "呼吸克制", framing: "中景", movement: "缓慢跟拍", beatPlan: "建立后停在证物", sound: "海风与远处汽笛" } }]
    }]
  }));
  const normalized = normalizeProjectScenes(scenes);
  assert.strictEqual(normalized[0].sourceExcerpt, "林岚独自穿过候船厅，手里攥着证物。");
  assert.strictEqual(normalized[0].shots.length, 1);
  const output = buildSceneVideoPrompt({ narrative: "建立码头与人物", sourceExcerpt: normalized[0].sourceExcerpt, characters: "林岚", emotion: "克制紧张", performance: "呼吸克制", action: "林岚向前走", setting: "港口码头", color: "冷青灰", lighting: "侧逆光", cameraTexture: "真实电影质感", framing: "中景", movement: "缓慢跟拍" });
  assert(output.includes("【剧本原文依据】林岚独自穿过候船厅"));
});

runTest("AI screenplay quality gate rejects severely compressed scene and shot coverage", () => {
  const project = { productionMeta: { estimatedDurationSeconds: 4200 } };
  const analysis = { directorEstimate: { estimatedDurationSeconds: 900, recommendedSceneCount: 60, recommendedShotCount: 300 }, scenes: [{ setting: "港口", storyBeat: "相遇", characters: ["林岚"], shots: [{}, {}] }, { setting: "旅馆", storyBeat: "离开", characters: ["林岚"], shots: [{}, {}] }, { setting: "码头", storyBeat: "追逐", characters: ["林岚"], shots: [{}, {}] }] };
  const quality = assessScreenplayAnalysisQuality(project, "林岚".repeat(1400), analysis);
  assert.strictEqual(quality.passed, false);
  assert.strictEqual(quality.lowSceneCoverage, true);
  assert.strictEqual(quality.durationMismatch, true);
  assert(reanalysisInstruction(quality).includes("重新以电影导演"));
});

runTest("AI screenplay analysis requests and preserves a director structure estimate", () => {
  const prompt = buildAiScreenplayPrompt({ name: "雾港" }, "第 01 场 外景 港口 夜\n林岚进入码头。");
  assert(prompt.includes('"analysis"'));
  assert(prompt.includes("不要只根据剧本的章节标题或大段落拆场"));
  const payload = parseAiScreenplayPayload(JSON.stringify({
    analysis: { estimatedDurationSeconds: 720, recommendedSceneCount: 12, recommendedShotCount: 56, structureRationale: "两段行动和一次信息反转形成十二场。", densityWarning: "" },
    scenes: [{ number: 1, title: "港口", sourceExcerpt: "林岚进入码头。", shots: [] }]
  }));
  assert.strictEqual(payload.analysis.estimatedDurationSeconds, 720);
  assert.strictEqual(payload.analysis.recommendedSceneCount, 12);
  assert.strictEqual(payload.scenes.length, 1);
});

runTest("screenplay analysis distributes project target duration across scene shot drafts", () => {
  const screenplay = Array.from({ length: 60 }, (_, index) => `第 ${String(index + 1).padStart(2, "0")} 场 内景 走廊 夜\n人物走过走廊，停在门前。`).join("\n\n");
  const analysis = previewScreenplayReanalysis({
    productionMeta: { estimatedDurationSeconds: 4200 },
    scenes: []
  }, screenplay);
  assert.strictEqual(analysis.scenes.length, 60);
  assert.strictEqual(analysis.scenes.reduce((total, scene) => total + scene.estimatedDurationSeconds, 0), 4200);
  assert(analysis.scenes.every((scene) => scene.shots.length >= 5));
  assert(analysis.scenes.every((scene) => scene.shots.reduce((total, shot) => total + shot.durationSeconds, 0) === scene.estimatedDurationSeconds));
});

runTest("project duration replanning turns a 70 minute target into a 60 scene shot plan", () => {
  const screenplay = Array.from({ length: 60 }, (_, index) => `第 ${String(index + 1).padStart(2, "0")} 场 内景 走廊 夜\n人物走过走廊，停在门前。`).join("\n\n");
  const store = normalizeProjectStore({
    onboardingComplete: true,
    activeProjectId: "p1",
    projects: [{ id: "p1", name: "长片", screenplay: { rawText: screenplay }, scenes: parseScreenplayIntoScenes(screenplay), workspaces: {} }]
  }, { createBlankProject: () => ({ id: "starter", name: "未命名电影项目", workspaces: {} }) });
  const next = replanProjectSceneDuration(store, "p1", 4200, "2026-07-23T10:00:00.000Z");
  const scenes = next.projects[0].scenes;
  assert.strictEqual(next.projects[0].productionMeta.estimatedDurationSeconds, 4200);
  assert.strictEqual(scenes.reduce((total, scene) => total + scene.estimatedDurationSeconds, 0), 4200);
  assert(scenes.every((scene) => scene.shots.length >= 5));
});

runTest("project scene production desk exposes an explicit target duration replanning control", () => {
  const scenes = fs.readFileSync("project-scenes.js", "utf8");
  const core = fs.readFileSync("workspace-core.js", "utf8");
  assert(scenes.includes("目标片长（分钟）"));
  assert(scenes.includes('data-scene-action="replan-project-duration"'));
  assert(scenes.includes("core.replanProjectSceneDuration"));
  assert(core.includes("replanProjectSceneDuration"));
});

runTest("project scene desk exposes a full-project shot delivery package", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const scenes = fs.readFileSync("project-scenes.js", "utf8");
  const css = fs.readFileSync("project-scenes.css", "utf8");
  assert(html.includes("project-delivery.js"));
  ["copy-project-shot-delivery", "download-project-shot-delivery", "复制整片镜头包", "下载 Markdown", "buildProjectShotDelivery"].forEach((token) => assert(scenes.includes(token), token));
  assert(scenes.includes("复制失败，请手动复制"));
  assert(css.includes("project-production-delivery"));
  assert(css.includes("@media (max-width: 1023px)"));
});

runTest("project scene desk exposes a shot generation gate with focused production actions", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const scenes = fs.readFileSync("project-scenes.js", "utf8");
  assert(html.includes("project-shot-readiness.js"));
  ["SHOT GENERATION GATE", "project-shot-generation-gate", "go-casting", "go-tone", "go-camera", "focus-setting", "focus-asset-reference"].forEach((token) => assert(scenes.includes(token), token));
});

runTest("project scene desk exposes the shot production result panel and actions", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const source = fs.readFileSync("project-scenes.js", "utf8");
  assert(html.includes('id="project-result-keyframe-upload"'));
  assert(html.indexOf("project-shot-results.js") < html.indexOf("project-store.js"));
  ["renderShotProductionResults", "open-result-form", "save-result", "select-result", "delete-result", "open-result-url", "referenceStore.putFile", "createProductionResult", "selectProductionResult", "deleteProductionResult"].forEach((needle) => assert(source.includes(needle), `missing ${needle}`));
});

runTest("project result UI keeps a compact production history at narrow widths", () => {
  const css = fs.readFileSync("project-scenes.css", "utf8");
  assert(css.includes(".project-shot-results"));
  assert(css.includes("@media (max-width: 720px)"));
});

runTest("shot generation gate keeps compact grouped controls at every project viewport", () => {
  const css = fs.readFileSync("project-scenes.css", "utf8");
  assert(css.includes(".project-shot-generation-gate"));
  assert(css.includes(".project-shot-generation-gate-actions"));
  assert(css.includes("@media (max-width: 720px)"));
});

runTest("project scene production map keeps scenes vertically ordered and labels each scene shot range", () => {
  const source = fs.readFileSync("project-scenes.js", "utf8");
  const css = fs.readFileSync("project-scenes.css", "utf8");
  assert(source.includes("全片场次分镜表"));
  assert(source.includes("本场共 ${String(summary.shotCount).padStart(2, \"0\")} 镜"));
  assert(source.includes("镜 01–${String(summary.shotCount).padStart(2, \"0\")}"));
  assert(css.includes("max-height: 530px; overflow-y: auto"));
  assert(!css.includes(".scene-production-map { display: grid; grid-template-columns: repeat(4"));
});

runTest("project storyboard keeps scene-shot labels, production state, prompt version and registered keyframe together", () => {
  const scenes = fs.readFileSync("project-scenes.js", "utf8");
  const css = fs.readFileSync("project-scenes.css", "utf8");
  ["renderProjectStoryboard", "select-storyboard-shot", "select-storyboard-filter", "data-project-result-preview", "SHOT STORYBOARD"].forEach((token) => assert(scenes.includes(token), token));
  ["project-storyboard", "project-storyboard-frame", "aspect-ratio: 16 / 9"].forEach((token) => assert(css.includes(token), token));
});

runTest("screenplay parser falls back to paragraph scenes without headings", () => {
  const scenes = parseScreenplayIntoScenes("林岚在雨里等待渡船。\n\n船靠岸后，她发现同伴的外套被遗落在座位上。");
  assert.strictEqual(scenes.length, 2);
  assert.strictEqual(scenes[0].title, "原始段落 01");
  assert(scenes[1].storyBeat.includes("同伴的外套"));
});

runTest("screenplay parser preserves a prologue before the first scene heading as a draft scene", () => {
  const scenes = parseScreenplayIntoScenes("序幕：雾港沉睡在冬夜的雨里。\n\n第 01 场 外景 港口码头 冬夜\n林岚独自穿过候船厅。");
  assert.strictEqual(scenes.length, 2);
  assert.strictEqual(scenes[0].title, "原始段落 01");
  assert(scenes[0].storyBeat.includes("雾港沉睡"));
  assert.strictEqual(scenes[0].status, "draft");
  assert.strictEqual(scenes[1].title, "港口码头");
  assert.deepStrictEqual(scenes.map((scene) => scene.number), [1, 2]);
});

runTest("screenplay parser assigns ordered unique numbers to prologue and mixed headings", () => {
  const rawText = "序幕：雾港沉睡在冬夜的雨里。\n\nINT. ROOM DAY\n林岚醒来，窗外的雨还没有停。\n\n第 05 场 外景 港口码头 夜\n她走进雨幕。";
  const scenes = parseScreenplayIntoScenes(rawText);
  const analysis = previewScreenplayReanalysis({ scenes }, rawText);
  assert.deepStrictEqual(scenes.map((scene) => scene.number), [1, 2, 5]);
  assert.deepStrictEqual(analysis.summary, { added: 0, updated: 0, retained: 3, protected: 0, total: 3 });
});

runTest("screenplay source types keep only new paste and file across versions", () => {
  const screenplay = normalizeScreenplay({
    sourceType: "new",
    versions: [{ sourceType: "paste" }, { sourceType: "file" }, { sourceType: "remote" }]
  });
  assert.strictEqual(screenplay.sourceType, "new");
  assert.deepStrictEqual(screenplay.versions.map((version) => version.sourceType), ["paste", "file", "paste"]);
});

runTest("patching a screenplay stores source text and replaces only the active project scenes", () => {
  const store = normalizeProjectStore({
    onboardingComplete: true,
    activeProjectId: "p1",
    projects: [{ id: "p1", name: "雾港", workspaces: {} }, { id: "p2", name: "另一项目", workspaces: {} }]
  }, { createBlankProject: () => ({ id: "starter", name: "未命名电影项目", workspaces: {} }) });
  const next = patchProjectScreenplay(store, "p1", "第 01 场 外景 港口 冬夜\n林岚等待渡船。", "2026-07-21T10:00:00.000Z");
  assert(next.projects[0].screenplay.rawText.includes("林岚等待渡船"));
  assert.strictEqual(next.projects[0].scenes.length, 1);
  assert.deepStrictEqual(next.projects[1].scenes, []);
});

runTest("screenplay analysis returns a confirmable change summary", () => {
  const project = {
    screenplay: { title: "旧稿", sourceType: "paste", sourceFileName: "", rawText: "第 01 场 内景 房间 夜\n旧内容", versions: [] },
    scenes: [{ id: "scene-a", number: 1, title: "房间", setting: "内景 · 房间", time: "夜", storyBeat: "旧内容", shots: [] }]
  };
  const analysis = previewScreenplayReanalysis(project, "第 01 场 内景 房间 夜\n新内容\n\n第 02 场 外景 天台 清晨\n人物离开。");
  assert.deepStrictEqual(analysis.summary, { added: 1, updated: 1, retained: 0, protected: 0, total: 2 });
  assert.strictEqual(analysis.scenes[0].storyBeat, "新内容");
  assert.deepStrictEqual(analysis.decisions.map((decision) => ({
    kind: decision.kind,
    action: decision.action,
    existingSceneId: decision.existingSceneId || "",
    proposedSceneId: decision.proposedSceneId || ""
  })), [
    { kind: "update", action: "update-story", existingSceneId: "scene-a", proposedSceneId: analysis.scenes[0].id },
    { kind: "add", action: "add", existingSceneId: "", proposedSceneId: analysis.scenes[1].id }
  ]);
});

runTest("screenplay reanalysis does not let a new preamble consume an existing numbered scene", () => {
  const project = {
    scenes: [{ id: "scene-a", number: 1, title: "房间", setting: "内景 · 房间", time: "夜", storyBeat: "旧内容", shots: [] }]
  };
  const analysis = previewScreenplayReanalysis(project, "序幕：雨声淹没了街道。\n\n第 01 场 内景 房间 夜\n旧内容");
  assert.deepStrictEqual(analysis.summary, { added: 1, updated: 0, retained: 1, protected: 0, total: 2 });
});

runTest("screenplay reanalysis counts a same-number scene identity edit as updated", () => {
  const project = {
    scenes: [{ id: "scene-a", number: 1, title: "房间", setting: "内景 · 房间", time: "夜", storyBeat: "旧内容", shots: [] }]
  };
  const analysis = previewScreenplayReanalysis(project, "第 01 场 内景 卧室 夜\n新内容");
  assert.deepStrictEqual(analysis.summary, { added: 0, updated: 1, retained: 0, protected: 0, total: 1 });
  assert.strictEqual(analysis.decisions[0].kind, "update");
  assert.strictEqual(analysis.decisions[0].action, "update-story");
  assert.strictEqual(analysis.decisions[0].existingSceneId, "scene-a");
});

runTest("screenplay reanalysis protects production scenes and only updates story fields", () => {
  const project = {
    scenes: [{
      id: "scene-a",
      number: 1,
      title: "房间",
      setting: "内景 · 房间",
      time: "夜",
      storyBeat: "旧内容",
      sourceExcerpt: "旧原文",
      emotion: "旧情绪",
      action: "旧动作",
      assetIds: ["CHAR-001"],
      videoCard: { color: "青灰", action: "握紧信封" },
      assistant: { directorAnalysis: { dramaticFunction: "旧任务", source: "imported" } },
      visualOverride: { colorDirection: "旧色彩", lightingDirection: "旧布光", cameraDirection: "旧摄影" },
      shots: [{ id: "shot-a", status: "generated", targetModel: "seedance", promptCard: { action: "回头" } }],
      status: "approved"
    }]
  };
  const preview = previewScreenplayReanalysis(project, "第 01 场 内景 卧室 夜\n新内容");
  assert.strictEqual(preview.decisions[0].protected, true);
  assert.strictEqual(preview.decisions[0].action, "update-story");
  const next = applyScreenplayAnalysis(normalizeProjectStore({
    projects: [{ id: "p1", name: "项目", ...project }],
    activeProjectId: "p1"
  }, { createBlankProject: () => ({ id: "starter", name: "未命名电影项目", workspaces: {} }) }), "p1", preview, "2026-07-26T10:00:00.000Z");
  const scene = next.projects[0].scenes[0];
  assert.strictEqual(scene.setting, "内景 · 卧室");
  assert.strictEqual(scene.storyBeat, "新内容");
  assert.strictEqual(scene.sourceExcerpt, "新内容");
  assert.deepStrictEqual(scene.assetIds, ["CHAR-001"]);
  assert.strictEqual(scene.videoCard.color, "青灰");
  assert.strictEqual(scene.assistant.directorAnalysis.dramaticFunction, "旧任务");
  assert.strictEqual(scene.visualOverride.colorDirection, "旧色彩");
  assert.strictEqual(scene.shots[0].status, "generated");
  assert.strictEqual(scene.shots[0].targetModel, "seedance");
  assert.strictEqual(scene.status, "approved");
});

runTest("screenplay reanalysis keeps unmatched existing scenes by default", () => {
  const project = {
    scenes: [
      { id: "scene-a", number: 1, title: "房间", setting: "内景 · 房间", time: "夜", storyBeat: "旧内容", shots: [] },
      { id: "scene-b", number: 2, title: "走廊", setting: "内景 · 走廊", time: "夜", storyBeat: "保留场次", shots: [] }
    ]
  };
  const preview = previewScreenplayReanalysis(project, "第 01 场 内景 房间 夜\n新内容");
  const retained = preview.decisions.find((decision) => decision.existingSceneId === "scene-b");
  assert(retained);
  assert.strictEqual(retained.kind, "retained");
  assert.strictEqual(retained.action, "keep-existing");
  const next = applyScreenplayAnalysis(normalizeProjectStore({
    projects: [{ id: "p1", name: "项目", ...project }],
    activeProjectId: "p1"
  }, { createBlankProject: () => ({ id: "starter", name: "未命名电影项目", workspaces: {} }) }), "p1", preview, "2026-07-26T10:00:00.000Z");
  assert.strictEqual(next.projects[0].scenes.some((scene) => scene.id === "scene-b"), true);
});

runTest("screenplay reanalysis lets a new draft be skipped without deleting existing scenes", () => {
  const project = {
    scenes: [{ id: "scene-a", number: 1, title: "房间", setting: "内景 · 房间", time: "夜", storyBeat: "旧内容", shots: [] }]
  };
  const preview = previewScreenplayReanalysis(project, "第 01 场 内景 房间 夜\n旧内容\n\n第 02 场 外景 天台 清晨\n人物离开。");
  preview.decisions = preview.decisions.map((decision) => decision.kind === "add"
    ? { ...decision, action: "skip-proposed" }
    : decision);
  const next = applyScreenplayAnalysis(normalizeProjectStore({
    projects: [{ id: "p1", name: "项目", ...project }],
    activeProjectId: "p1"
  }, { createBlankProject: () => ({ id: "starter", name: "未命名电影项目", workspaces: {} }) }), "p1", preview, "2026-07-26T10:00:00.000Z");
  assert.strictEqual(next.projects[0].scenes.length, 1);
  assert.strictEqual(next.projects[0].scenes[0].id, "scene-a");
});

runTest("screenplay reanalysis can add all proposed scenes when there is no existing production scene", () => {
  const preview = previewScreenplayReanalysis({ scenes: [] }, "第 01 场 内景 房间 夜\n旧内容\n\n第 02 场 外景 天台 清晨\n人物离开。");
  assert(preview.decisions.every((decision) => decision.action === "add"));
  const next = applyScreenplayAnalysis(normalizeProjectStore({
    projects: [{ id: "p1", name: "项目", scenes: [], workspaces: {} }],
    activeProjectId: "p1"
  }, { createBlankProject: () => ({ id: "starter", name: "未命名电影项目", workspaces: {} }) }), "p1", preview, "2026-07-26T10:00:00.000Z");
  assert.deepStrictEqual(next.projects[0].scenes.map((scene) => scene.number), [1, 2]);
});

runTest("applying analysis saves the prior screenplay as a bounded version", () => {
  const store = normalizeProjectStore({
    projects: [{ id: "p1", name: "项目", screenplay: { title: "旧稿", rawText: "旧剧本", versions: [] }, scenes: [] }],
    activeProjectId: "p1"
  }, { createBlankProject: () => ({ id: "starter", name: "未命名电影项目", workspaces: {} }) });
  const analysis = analyzeScreenplay("第 01 场 内景 房间 夜\n新剧本");
  const next = applyScreenplayAnalysis(store, "p1", { ...analysis, source: { title: "新稿", sourceType: "file", sourceFileName: "new.txt" } }, "2026-07-21T12:00:00.000Z");
  assert.strictEqual(next.projects[0].screenplay.title, "新稿");
  assert.strictEqual(next.projects[0].screenplay.versions[0].rawText, "旧剧本");
});

runTest("clearing a saved screenplay preserves manually prepared scene sheets", () => {
  const store = normalizeProjectStore({
    onboardingComplete: true,
    activeProjectId: "p1",
    projects: [{
      id: "p1",
      name: "流程测试短片",
      scenes: [{ id: "scene-01", title: "天桥", storyBeat: "阿岚停下脚步。" }],
      screenplay: {
        title: "流程测试短片",
        sourceType: "paste",
        rawText: "第 01 场 外景 天桥 傍晚",
        updatedAt: "2026-07-23T10:00:00.000Z",
        versions: [{ title: "旧稿", sourceType: "paste", rawText: "旧稿", updatedAt: "2026-07-22T10:00:00.000Z" }]
      },
      workspaces: {}
    }]
  }, { createBlankProject: () => ({ id: "starter", name: "未命名电影项目", workspaces: {} }) });
  const next = clearProjectScreenplay(store, "p1", "2026-07-23T11:00:00.000Z");
  assert.strictEqual(next.projects[0].screenplay.rawText, "");
  assert.strictEqual(next.projects[0].screenplay.versions.length, 0);
  assert.strictEqual(next.projects[0].scenes.length, 1);
  assert.strictEqual(next.projects[0].scenes[0].title, "天桥");
});

runTest("screenplay analysis caps source text and saved versions locally", () => {
  const store = normalizeProjectStore({
    projects: [{
      id: "p1",
      name: "项目",
      screenplay: {
        rawText: "旧剧本",
        versions: Array.from({ length: 12 }, (_, index) => ({ rawText: `版本 ${index + 1}`, updatedAt: "2026-07-21T00:00:00.000Z" }))
      },
      scenes: []
    }],
    activeProjectId: "p1"
  }, { createBlankProject: () => ({ id: "starter", name: "未命名电影项目", workspaces: {} }) });
  const analysis = analyzeScreenplay("x".repeat(60001));
  const next = applyScreenplayAnalysis(store, "p1", analysis, "2026-07-21T12:00:00.000Z");
  assert.strictEqual(analysis.rawText.length, 60000);
  assert.strictEqual(next.projects[0].screenplay.versions.length, 12);
  assert.strictEqual(next.projects[0].screenplay.versions[0].rawText, "旧剧本");
});

runTest("scene assistant extracts dialogue narration and local production candidates", () => {
  const result = extractSceneCandidates({
    storyBeat: "林岚：别回头。\n旁白：雨没有停。\n林岚握紧泛黄信封，听见身后脚步。",
    title: "雨夜码头",
    setting: "外景 港口码头 冬夜"
  });
  assert.deepStrictEqual(result.dialogueLines, [{ speaker: "林岚", text: "别回头。" }]);
  assert.deepStrictEqual(result.voiceOverLines, ["雨没有停。"]);
  assert(result.characterCandidates.includes("林岚"));
  assert(result.actionCandidates.some((item) => item.includes("握紧")));
  assert(result.propCandidates.includes("信封"));
});

runTest("scene assistant builds a bounded source-derived draft for a screenplay scene", () => {
  const draft = buildSceneAssistantDraft({
    storyBeat: "阿岚把照片放在柜台上，对店员说：这张照片不是我拍的。她强忍不安，慢慢抬头看向门外。"
  });
  assert.deepStrictEqual(draft.characters, ["阿岚"]);
  assert.strictEqual(draft.emotion, "不安");
  assert(draft.action.includes("阿岚把照片放在柜台上"));
  assert.strictEqual(draft.dialogue, "阿岚：这张照片不是我拍的");
  assert(draft.props.includes("照片"));
  assert.strictEqual(draft.references.performance.id, "held-breath");
});

runTest("scene assistant normalizes one reference per production dimension", () => {
  const state = normalizeSceneAssistant({ selectedReferences: { color: "cold-warm", lighting: "window-soft", camera: "imax-65", framing: "close-up", performance: "held-breath", movement: "slow-push" } });
  assert.deepStrictEqual(Object.keys(state.selectedReferences).sort(), ["camera", "color", "framing", "lighting", "movement", "performance"]);
  assert.strictEqual(state.lipSyncEnabled, false);
  assert.strictEqual(SCENE_REFERENCE_LIBRARY.color.length > 0, true);
});

runTest("scene assistant ranks local look and camera suggestions from screenplay cues", () => {
  const suspense = buildSceneCreativeSuggestions({
    storyBeat: "阿岚握紧照片，听见门外动静，强忍不安。"
  });
  assert.strictEqual(suspense.looks.length, 3);
  assert.strictEqual(suspense.cameras.length, 3);
  assert.strictEqual(suspense.looks[0].id, "suspense-press");
  assert.strictEqual(suspense.cameras[0].id, "clue-push");
  assert(suspense.looks[0].reason.includes("不安"));

  const movement = buildSceneCreativeSuggestions({
    storyBeat: "阿岚抱着旧相机穿过人行天桥，停下脚步后回头。"
  });
  assert.strictEqual(movement.cameras[0].id, "observational-follow");
});

runTest("director analysis prompt requests story-first professional scene analysis and safely parses it", () => {
  const prompt = buildDirectorAnalysisPrompt({ name: "雾港" }, {
    title: "雨夜码头",
    setting: "外景 港口码头",
    time: "冬夜",
    characters: ["林岚"],
    storyBeat: "林岚握紧信封，听见身后的脚步。"
  });
  assert(prompt.includes("本场戏剧任务"));
  assert(prompt.includes("不要杜撰"));
  const parsed = parseDirectorAnalysisResult('{"dramaticFunction":"建立威胁","characterObjective":"确认身后的人","obstacle":"环境黑暗且无法回头","turn":"脚步突然停止","audienceInformation":"有人正在跟踪她","emotionalArc":"不安升级为警觉","directorialIntent":"让观众和人物一起等待","visualStrategy":"低饱和冷灰，实景暖光","shotStrategy":"先建立空旷码头，再缓慢靠近人物，停在她的回头前"}');
  assert.strictEqual(parsed.ok, true);
  assert.strictEqual(parsed.analysis.dramaticFunction, "建立威胁");
  assert.strictEqual(parsed.analysis.source, "imported");
  const labeled = parseDirectorAnalysisResult("本场戏剧任务：制造等待\n人物目标：确认身后的人\n镜头策略：先看空间，再看人物的反应");
  assert.strictEqual(labeled.ok, true);
  assert.strictEqual(labeled.analysis.shotStrategy, "先看空间，再看人物的反应");
});

runTest("scene assistant preserves imported director analysis without replacing existing local controls", () => {
  const state = normalizeSceneAssistant({
    selectedReferences: { movement: "slow-push" },
    directorAnalysis: { dramaticFunction: "信息揭示", directorialIntent: "让停顿先于回答", shotStrategy: "固定等待后推进", source: "imported" }
  });
  assert.strictEqual(state.selectedReferences.movement, "slow-push");
  assert.strictEqual(state.directorAnalysis.dramaticFunction, "信息揭示");
  assert.strictEqual(state.directorAnalysis.source, "imported");
});

runTest("scene video adapters keep one scene card and produce four model outputs", () => {
  const card = normalizeSceneVideoCard({ narrative: "她听见脚步声后回头", characters: "林岚", emotion: "警觉升级", action: "握紧信封并缓慢转身", setting: "旧旅馆走廊，凌晨", color: "低饱和青灰", lighting: "侧逆光", framing: "中近景", movement: "缓慢推进", dialogue: "别回头。", lipSync: false, shotNumber: "场 03 · 镜 02", dramaticFunction: "建立威胁", directorialIntent: "让观众先听见脚步", shotStrategy: "先建立空镜，再推进人物" });
  assert(buildSceneVideoPrompt(card, "general").includes("不要字幕"));
  assert(buildSceneVideoPrompt(card, "general").includes("【动作】握紧信封并缓慢转身"));
  assert(buildSceneVideoPrompt(card, "general").includes("【导演意图】让观众先听见脚步"));
  assert(buildSceneVideoPrompt(card, "general").includes("【镜头编号】场 03 · 镜 02"));
  assert(buildSceneVideoPrompt(card, "seedance").includes("0-5秒"));
  assert(buildSceneVideoPrompt(card, "seedance", "seedance30").includes("20-30秒"));
  assert(buildSceneVideoPrompt(card, "jimeng-kling").includes("身份稳定"));
  assert(buildSceneVideoPrompt(card, "runway-pika").includes("镜头运动"));
});

runTest("scene video card persists a model-neutral beat plan and exposes four output tabs", () => {
  const [scene] = normalizeProjectScenes([{
    id: "scene-1",
    number: 1,
    videoCard: { narrative: "她回头", beatPlan: "建立不安，转身确认，停在门口", lipSync: true }
  }]);
  assert.strictEqual(scene.videoCard.beatPlan, "建立不安，转身确认，停在门口");
  assert.strictEqual(scene.videoCard.lipSync, true);
  assert(buildSceneVideoPrompt(scene.videoCard, "seedance").includes("建立不安，转身确认，停在门口"));
  const html = fs.readFileSync("index.html", "utf8");
  const source = fs.readFileSync("project-scenes.js", "utf8");
  assert(html.includes('src="scene-video-adapters.js'));
  ["通用视频模型", "Seedance 15 秒", "即梦 / 可灵", "Runway / Pika"].forEach((label) => assert(source.includes(label)));
  assert(source.includes('data-video-target="${id}"'));
  assert(source.includes("data-video-card-field"));
  assert(source.includes("data-video-card-toggle"));
});

runTest("project dashboard exposes a project-scoped scene sheet and camera handoff", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const scenes = fs.readFileSync("project-scenes.js", "utf8");
  const core = fs.readFileSync("workspace-core.js", "utf8");
  const camera = fs.readFileSync("camera-app.js", "utf8");
  ["project-scene-workbench", "project-scene-list", "project-scene-editor", "project-scene-prompt"].forEach((id) => {
    assert(html.includes(`id=\"${id}\"`), `missing #${id}`);
  });
  assert(html.includes('src="project-scenes.js'));
  assert(scenes.includes("buildSceneShotPrompt"));
  assert(scenes.includes("复制导演分析模板"));
  assert(scenes.includes("粘贴分析结果"));
  assert(scenes.includes("parseDirectorAnalysis"));
  assert(scenes.includes("snapshot = core.getProjectSnapshot();"));
  assert(scenes.includes("sendSceneShotToCamera"));
  assert(core.includes("patchProjectScenes"));
  assert(core.includes("sendSceneShotToCamera"));
  assert(camera.includes("receiveSceneShot"));
  assert(camera.includes("const shotCard = shot.promptCard || {}"));
  ["shotCard.narrative", "shotCard.performance", "shotCard.action", "shotCard.sound"].forEach((value) => {
    assert(camera.includes(value), `camera handoff must respect ${value}`);
  });
});

runTest("project scene sheet exposes a safe local scene-analysis draft action", () => {
  const scenes = fs.readFileSync("project-scenes.js", "utf8");
  const css = fs.readFileSync("project-scenes.css", "utf8");
  assert(scenes.includes("buildSceneAssistantDraft"));
  assert(scenes.includes('data-scene-action="apply-scene-analysis"'));
  assert(scenes.includes("write only blank fields"));
  assert(scenes.includes("applySceneAnalysisDraft"));
  assert(css.includes(".project-scene-analysis-draft"));
});

runTest("project scene sheet exposes safe scene look and camera suggestion actions", () => {
  const scenes = fs.readFileSync("project-scenes.js", "utf8");
  const css = fs.readFileSync("project-scenes.css", "utf8");
  assert(scenes.includes("buildSceneCreativeSuggestions"));
  assert(scenes.includes('data-scene-action="apply-scene-look"'));
  assert(scenes.includes('data-scene-action="apply-scene-camera"'));
  assert(scenes.includes("applySceneCreativeSuggestion"));
  assert(scenes.includes("only apply empty scene visual fields and empty shot-card fields"));
  assert(css.includes(".project-scene-creative-suggestions"));
});

runTest("project scene prompt distinguishes a working draft from a deliverable video prompt", () => {
  const scenes = fs.readFileSync("project-scenes.js", "utf8");
  const css = fs.readFileSync("project-scenes.css", "utf8");
  assert(scenes.includes("sceneDeliveryStatus"));
  assert(scenes.includes("SHOT DELIVERY STATUS"));
  assert(scenes.includes("制作草稿"));
  assert(scenes.includes("可直接生成"));
  assert(scenes.includes("补齐后发送"));
  assert(scenes.includes("当前镜头尚未满足视频生成条件"));
  assert(scenes.includes("scenePromptPackage"));
  assert(scenes.includes('data-scene-action="copy-scene-package"'));
  assert(scenes.includes("复制整场镜头包"));
  assert(css.includes(".project-scene-prompt-status"));
});

runTest("project scene sheet exposes a scene production plan before individual shot editing", () => {
  const scenes = fs.readFileSync("project-scenes.js", "utf8");
  assert(scenes.includes("sceneProductionSummary"));
  assert(scenes.includes("scene-production-plan"));
  assert(scenes.includes("预计时长"));
  assert(scenes.includes("镜头数"));
  assert(scenes.includes("生成进度"));
});

runTest("project production flow separates script, scenes, assets and delivery", () => {
  const scenes = fs.readFileSync("project-scenes.js", "utf8");
  const css = fs.readFileSync("project-scenes.css", "utf8");
  assert(scenes.includes("const PRODUCTION_STEPS"));
  assert(scenes.includes('data-scene-action="select-production-step"'));
  ["script", "scenes", "assets", "delivery"].forEach((step) => {
    assert(scenes.includes(`${step}: { number:`));
    assert(css.includes(`data-production-step=\"${step}\"`));
  });
});

runTest("selected scene shows a production brief and separates scene duration from shot duration", () => {
  const scenes = fs.readFileSync("project-scenes.js", "utf8");
  assert(scenes.includes('field("本场预计时长（秒）", "estimatedDurationSeconds"'));
  assert(scenes.includes("本场镜头计划"));
  assert(scenes.includes("单镜头生成提示词"));
  assert(scenes.includes("场次预计"));
});

runTest("project scene readiness refreshes without rerendering a field being edited", () => {
  const scenes = fs.readFileSync("project-scenes.js", "utf8");
  assert(scenes.includes("refreshSceneReadiness"));
  assert(scenes.includes("refreshSceneReadiness();"));
  assert(scenes.includes("const panel = elements.editor.querySelector(\".project-scene-readiness\")"));
  assert(scenes.includes("refreshProjectProductionStrip"));
});

runTest("project scene asset panel exposes a single-action continuity lock", () => {
  const scenes = fs.readFileSync("project-scenes.js", "utf8");
  assert(scenes.includes("assetLockPreview"));
  assert(scenes.includes('data-scene-action="lock-all-assets"'));
  assert(scenes.includes("一键锁定本场资产"));
  assert(scenes.includes("可锁定"));
  assert(scenes.includes("editableVideoCardFor"));
  assert(scenes.includes("refreshAssetLockPanel"));
  assert(scenes.includes("project-scene-assets-pending"));
  assert(scenes.includes("PROJECT ASSET LEDGER"));
  assert(scenes.includes("renderProjectAssetLedger"));
  assert(scenes.includes('data-scene-action="prune-assets"'));
  assert(scenes.includes("CONTINUITY REVIEW"));
  assert(scenes.includes("renderProjectContinuityReview"));
});

runTest("project screenplay entry exposes three sources and safe confirmation", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const scenes = fs.readFileSync("project-scenes.js", "utf8");
  ["project-screenplay-new", "project-screenplay-paste", "project-screenplay-file", "project-screenplay-title", "project-screenplay-version", "project-screenplay-analyze", "project-screenplay-confirm"].forEach((id) => {
    assert(html.includes(`id=\"${id}\"`), `missing #${id}`);
  });
  assert(scenes.includes("readScreenplayFile"));
  assert(scenes.includes("previewProjectScreenplay"));
  assert(scenes.includes("applyProjectScreenplay"));
});

runTest("project screenplay accepts a reviewed external model breakdown without an API", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const scenes = fs.readFileSync("project-scenes.js", "utf8");
  ["project-screenplay-copy-template", "project-screenplay-external-result", "project-screenplay-import-result"].forEach((id) => {
    assert(html.includes(`id=\"${id}\"`), `missing #${id}`);
  });
  ["copyScreenplayAnalysisTemplate", "importExternalScreenplayAnalysis", "analysisMode: \"external\"", "api.parse(result)"].forEach((token) => assert(scenes.includes(token), token));
});

runTest("project screenplay entry exposes a per-scene safe reanalysis diff review", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const scenes = fs.readFileSync("project-scenes.js", "utf8");
  const css = fs.readFileSync("project-scenes.css", "utf8");
  assert(html.includes('id="project-screenplay-diff"'));
  ["renderScreenplayDiff", "update-analysis-decision", "保留当前制作场", "确认应用"].forEach((token) => assert(scenes.includes(token), token));
  assert(css.includes(".project-screenplay-diff"));
  assert(css.includes(".project-screenplay-diff-row"));
});

runTest("dashboard prioritizes the visual bible before generic workspace progress", () => {
  const source = fs.readFileSync("project-dashboard.js", "utf8");
  assert(source.includes("project-visual-bible"));
  assert(source.includes("continueActiveProject"));
  assert(source.includes("aigcProjectFoundation.open"));
});

runTest("dashboard keeps professional mode separate from persisted workspaces", () => {
  const source = fs.readFileSync("project-dashboard.js", "utf8");
  assert(source.includes('data-project-action="professional-mode"'));
  assert(!source.includes('activeWorkspace = "projects"'));
});

runTest("dashboard exposes an explicit editable project-name field", () => {
  const source = fs.readFileSync("project-dashboard.js", "utf8");
  assert(source.includes("data-project-name-editor"));
  assert(source.includes("project-name-editor"));
});

runTest("every creative workspace exposes a project context target", () => {
  const html = fs.readFileSync("index.html", "utf8");
  ["tone", "camera", "casting", "poster", "reverse", "music"].forEach((workspace) => {
    assert(html.includes(`data-project-context="${workspace}"`));
  });
});

runTest("every workbench accepts an explicit project context insertion", () => {
  ["app.js", "camera-app.js", "casting-app.js", "poster-app.js", "reverse-app.js", "music-app.js"].forEach((file) => {
    assert(fs.readFileSync(file, "utf8").includes("receiveProjectContext"));
  });
});

runTest("fresh project store keeps one starter and completes it in place", () => {
  const fresh = normalizeProjectStore(null, {
    createBlankProject: () => ({ id: "starter", name: "未命名电影项目", activeWorkspace: "tone", workspaces: {} })
  });
  assert.strictEqual(fresh.projects.length, 1);
  assert.strictEqual(fresh.onboardingComplete, false);
  const completed = completeOnboarding(fresh, {
    name: "雾港来信", type: "drama", aspectRatio: "2.39:1", estimatedDurationSeconds: 720
  }, "2026-07-19T10:00:00.000Z");
  assert.strictEqual(completed.projects.length, 1);
  assert.strictEqual(completed.projects[0].id, "starter");
  assert.strictEqual(completed.onboardingComplete, true);
});

runTest("dashboard view and favorite transitions reject malformed input", () => {
  const store = normalizeProjectStore({
    schemaVersion: 2,
    onboardingComplete: true,
    activeProjectId: "p1",
    projects: [{ id: "p1", name: "A", activeWorkspace: "tone", workspaces: {} }]
  }, { createBlankProject: () => ({ id: "fallback", name: "未命名电影项目", workspaces: {} }) });
  const patched = patchDashboardView(store, { category: "unknown", sort: "name-asc", selectedProjectId: "missing", scrollTop: -10 });
  assert.deepStrictEqual(patched.dashboardView, { category: "all", sort: "name-asc", search: "", selectedProjectId: "p1", scrollTop: 0 });
  const favorited = toggleProjectFavorite(patched, "p1", "2026-07-19T10:00:00.000Z");
  assert.strictEqual(favorited.projects[0].favorite, true);
});

runTest("project store only accepts six creative workspace ids", () => {
  assert.deepStrictEqual(WORKSPACE_IDS, ["tone", "camera", "casting", "poster", "reverse", "music"]);
});

runTest("regular project creation appends and selects one project", () => {
  const store = normalizeProjectStore({
    onboardingComplete: true,
    activeProjectId: "p1",
    projects: [{ id: "p1", name: "A", activeWorkspace: "tone", workspaces: {} }]
  }, { createBlankProject: () => ({ id: "fallback", name: "未命名电影项目", workspaces: {} }) });
  const next = createProjectInStore(store, { name: "风从海上来", type: "documentary", aspectRatio: "16:9" }, {
    createBlankProject: (name) => ({ id: "p2", name, activeWorkspace: "tone", workspaces: {} }),
    now: "2026-07-19T11:00:00.000Z"
  });
  assert.strictEqual(next.projects.length, 2);
  assert.strictEqual(next.activeProjectId, "p2");
  assert.strictEqual(next.dashboardView.selectedProjectId, "p2");
});

runTest("project summaries expose all six stable workspace contracts", () => {
  const result = summarizeProject({
    activeWorkspace: "camera",
    workspaces: {
      tone: { selected: [{ title: "冷暖都市", palette: "青橙对比", lighting: "低照度" }] },
      camera: { selected: { id: "case-01", title: "码头跟随长镜头" }, aspect: "wide" },
      casting: { identity: { name: "林岚" }, versions: [{ number: 1 }] },
      poster: {},
      reverse: { sourceFileName: "dock.jpg", dimensions: { subject: "人物" } },
      music: { templateId: "film-intimate-drama", coreEmotion: "restrained", bpm: 72 }
    }
  });
  assert.deepStrictEqual(Object.keys(result.summaries), ["tone", "camera", "casting", "poster", "reverse", "music"]);
  assert.strictEqual(result.summaries.camera.status, "configured");
  assert.strictEqual(result.summaries.poster.status, "empty");
  assert.strictEqual(result.configuredCount, 5);
  assert.strictEqual(result.next.workspace, "poster");
});

runTest("project summary prioritizes the earliest incomplete workspace over an already configured active workspace", () => {
  const result = summarizeProject({
    activeWorkspace: "music",
    workspaces: { music: { templateId: "film-psychological-suspense", sceneZh: "人物停在雨夜站台", coreEmotion: "tense", bpm: 58 } }
  });
  assert.strictEqual(result.summaries.music.status, "configured");
  assert.strictEqual(result.next.workspace, "tone");
  assert.strictEqual(result.next.status, "empty");
});

runTest("project continuation sends an unlocked project to foundation", () => {
  const result = decideProjectContinuation({
    activeWorkspace: "camera",
    visualBible: { status: "draft" },
    creativeBrief: { route: "camera" },
    workspaces: {}
  });
  assert.deepStrictEqual(result, { target: "foundation", reason: "visual-bible-draft" });
});

runTest("project continuation honors the selected unfinished route after locking", () => {
  const result = decideProjectContinuation({
    activeWorkspace: "tone",
    visualBible: { status: "locked" },
    creativeBrief: { route: "camera" },
    workspaces: { camera: { selectedExplicit: false } }
  });
  assert.deepStrictEqual(result, { target: "camera", reason: "route-incomplete" });
});

runTest("project summaries fail soft for malformed workspace data", () => {
  const result = summarizeProject({ activeWorkspace: "tone", workspaces: { casting: "broken" } });
  assert.strictEqual(result.summaries.casting.status, "unreadable");
  assert.strictEqual(result.next.workspace, "casting");
  assert(result.next.detail.includes("检查数据"));
});

runTest("completed project suggests review without fake percentage", () => {
  const configured = {
    tone: { selected: [{ title: "A" }] }, camera: { selected: { id: "A" } }, casting: { identity: { name: "A" } },
    poster: { title: "A" }, reverse: { sourceFileName: "A.jpg" }, music: { templateId: "A" }
  };
  const result = summarizeProject({ activeWorkspace: "music", workspaces: configured });
  assert.strictEqual(result.configuredCount, 6);
  assert.strictEqual(result.next.workspace, "music");
  assert(!result.next.detail.includes("100%"));
});

runTest("project cover resolver ignores stale assets and revokes every object URL", async () => {
  const pending = new Map();
  const revoked = [];
  let nextUrl = 0;
  const resolver = createProjectCoverResolver({
    getCastingAsset: (id) => new Promise((resolve) => pending.set(id, resolve)),
    createObjectURL: () => `blob:cover-${++nextUrl}`,
    revokeObjectURL: (url) => revoked.push(url),
    staticCoverFor: () => "assets/poster-templates/film-negative-space.jpg"
  });
  const first = resolver.resolve({ id: "p1", workspaces: { casting: { referenceAsset: { id: "a1" } } } });
  const second = resolver.resolve({ id: "p1", workspaces: { casting: { referenceAsset: { id: "a2" } } } });
  pending.get("a1")({ blob: { id: "old" } });
  pending.get("a2")({ blob: { id: "new" } });
  assert.strictEqual((await first).stale, true);
  assert.strictEqual((await second).src, "blob:cover-2");
  resolver.releaseProject("p1");
  assert.deepStrictEqual(revoked, ["blob:cover-1", "blob:cover-2"]);
});

runTest("project cover resolver falls back without broken images", async () => {
  const resolver = createProjectCoverResolver({
    getCastingAsset: async () => null,
    createObjectURL: () => "blob:unused",
    revokeObjectURL: () => {},
    staticCoverFor: () => "assets/poster-templates/film-character-world.jpg"
  });
  const result = await resolver.resolve({ id: "p1", workspaces: {} });
  assert.strictEqual(result.kind, "static");
  assert.strictEqual(result.src, "assets/poster-templates/film-character-world.jpg");
});

function extractBalancedCssBlock(css, marker) {
  const markerIndex = css.indexOf(marker);
  if (markerIndex < 0) return "";
  const openIndex = css.indexOf("{", markerIndex);
  if (openIndex < 0) return "";
  let depth = 0;
  for (let index = openIndex; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") depth -= 1;
    if (depth === 0) return css.slice(openIndex + 1, index);
  }
  return "";
}

function cssRuleBody(css, selector) {
  return extractBalancedCssBlock(css, selector);
}

runTest("selected tone option 2 is the only active visual override", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const theme = fs.readFileSync("tone-option2.css", "utf8");
  assert(html.includes('href="tone-option2.css?v=20260717-tone-library-colors-v3"'));
  assert(!html.includes('href="precision-theme.css'));
  assert(!html.includes('href="archive.css'));
  [
    "--studio-canvas: #f3f2ef",
    "--studio-paper: #fbfaf7",
    "--studio-ink: #161817",
    "--studio-petrol: #0f5a50",
    "--studio-cinema: #111312",
  ].forEach((token) => assert(theme.toLowerCase().includes(token)));
});

runTest("selected option 2 exposes the editorial screening layout", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const theme = fs.readFileSync("tone-option2.css", "utf8");
  assert(html.includes("AIGC电影视觉工作台"));
  ["影调", "运镜", "角色定妆", "海报", "画面反推"].forEach((label) => assert(html.includes(`>${label}<`) || html.includes(`>${label}`)));
  ["15秒运镜", "30秒运镜"].forEach((label) => assert(html.includes(`>${label}<`) || html.includes(`>${label}`)));
  assert(theme.includes("--studio-header-height: 66px"));
  assert(theme.includes("grid-template-columns: minmax(0, 1fr) minmax(430px, 36vw)"));
  assert(theme.includes("grid-template-areas:"));
  assert(theme.includes('"preview composer"'));
  assert(theme.includes('"library composer"'));
});

runTest("selected option 2 keeps accessible control states and local film assets", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const theme = fs.readFileSync("tone-option2.css", "utf8");
  assert(theme.includes(":is(.field input, .field select, .field textarea"));
  assert(theme.includes("outline: 2px solid var(--studio-petrol)"));
  assert(theme.includes("cursor: not-allowed"));
  assert(html.includes('src="assets/tone-option2-hero.png"'));
  assert(fs.existsSync("design-references/tone-option-2.png"));
  assert(fs.existsSync("assets/tone-option2-hero.png"));
});

runTest("tone library presents categories and cards as readable text", () => {
  const app = fs.readFileSync("app.js", "utf8");
  const theme = fs.readFileSync("tone-option2.css", "utf8");
  ["全部影调", "导演影调", "类型影调", "高级影调", "中国影视", "场景影调"]
    .forEach((label) => assert(app.includes(`\"${label}\"`)));
  assert(!theme.includes("#tone-workspace .result::before"));
  assert(theme.includes("#tone-workspace .result-name"));
  assert(theme.includes("white-space: normal"));
  assert(theme.includes("color: var(--studio-ink)"));
});

runTest("tone library supports wheel browsing and complete reference titles", () => {
  const app = fs.readFileSync("app.js", "utf8");
  const theme = fs.readFileSync("tone-option2.css", "utf8");
  const referenceTitleRule = theme.match(/#tone-workspace \.look-reference-card em\s*\{([\s\S]*?)\}/)?.[1] || "";
  const referenceImageRule = theme.match(/#tone-workspace \.look-reference-card img\s*\{([\s\S]*?)\}/)?.[1] || "";
  assert(app.includes('addEventListener("wheel"'));
  assert(app.includes("passive: false"));
  assert(theme.includes("scroll-snap-type: x proximity"));
  assert(theme.includes("scroll-snap-align: start"));
  assert(referenceTitleRule.includes("white-space: normal"));
  assert(referenceTitleRule.includes("-webkit-line-clamp: 2"));
  assert(referenceImageRule.includes("aspect-ratio: 16 / 9"));
  assert(referenceImageRule.includes("height: auto"));
  assert(referenceImageRule.includes("object-fit: cover"));
});

runTest("switching tone categories clears a stale search filter", () => {
  const app = fs.readFileSync("app.js", "utf8");
  const tabHandler = app.match(/button\.addEventListener\("click", \(\) => \{\s*state\.category = key;([\s\S]*?)render\(\);\s*\}\);/)?.[1] || "";
  assert(tabHandler.includes('state.query = "";'));
  assert(tabHandler.includes('elements.search.value = "";'));
});

runTest("tone library fits reference films inside short desktop viewports", () => {
  const theme = fs.readFileSync("tone-option2.css", "utf8");
  const shortViewportStart = theme.indexOf("@media (max-height: 940px) and (min-width: 821px)");
  const shortViewportRule = shortViewportStart >= 0 ? theme.slice(shortViewportStart) : "";
  assert(shortViewportRule.includes("#tone-workspace.app-shell"));
  assert(shortViewportRule.includes("min-height: 0"));
  assert(shortViewportRule.includes("#tone-workspace .look-reference-card"));
  assert(shortViewportRule.includes("grid-template-rows: auto minmax(28px, auto)"));
  assert(theme.includes("grid-template-rows: 48px 46px 42px 174px minmax(170px, 1fr)"));
  assert(shortViewportRule.includes("grid-template-rows: 40px 40px 36px 146px minmax(150px, 1fr)"));
});

runTest("tone library uses readable category controls and larger browse cards", () => {
  const theme = fs.readFileSync("tone-option2.css", "utf8");
  const tabRule = cssRuleBody(theme, "#tone-workspace .tab");
  const resultRule = cssRuleBody(theme, "#tone-workspace .result {");
  const nameRule = cssRuleBody(theme, "#tone-workspace .result-name");
  const tagsRule = cssRuleBody(theme, "#tone-workspace .result-tags");
  assert(tabRule.includes("min-height: 36px"));
  assert(tabRule.includes("font-size: 12px"));
  assert(resultRule.includes("height: 154px"));
  assert(nameRule.includes("font-size: 14px"));
  assert(tagsRule.includes("font-size: 11px"));
  assert(tagsRule.includes("-webkit-line-clamp: 3"));
  assert(theme.includes("grid-auto-columns: minmax(230px, 1fr)"));
});

runTest("tone categories use distinct restrained color identities", () => {
  const app = fs.readFileSync("app.js", "utf8");
  const theme = fs.readFileSync("tone-option2.css", "utf8");
  assert(app.includes("button.dataset.category = key"));
  [
    'data-category="directors"',
    'data-category="types"',
    'data-category="premiumTypes"',
    'data-category="chineseDrama"',
    'data-category="scenes"',
    ".result-directors",
    ".result-types",
    ".result-premiumTypes",
    ".result-chineseDrama",
    ".result-scenes",
    "--tone-card-accent",
    "--tone-card-surface"
  ].forEach((contract) => assert(theme.includes(contract), `missing ${contract}`));
});

runTest("a fresh local site starts with a reference-bearing tone selected", () => {
  const selection = defaultToneSelection({ directors: promptData.directors });
  assert.strictEqual(selection.length, 1);
  assert.strictEqual(selection[0].id, "D004");
  assert.strictEqual(selection[0].category, "directors");
  assert(selection[0].references.length >= 3);
});

runTest("legacy blank projects receive the default reference-bearing tone once", () => {
  const appData = { directors: promptData.directors };
  const migrated = restoreToneSelection(appData, { selected: [], blendMode: false });
  const intentionallyCleared = restoreToneSelection(appData, { schemaVersion: 2, selected: [], blendMode: false });
  assert.strictEqual(migrated[0].id, "D004");
  assert.strictEqual(intentionallyCleared.length, 0);
});

runTest("every type and scene tone exposes three reference films", () => {
  [
    ...promptData.types.map((item) => ({ ...item, category: "types" })),
    ...promptData.scenes.map((item) => ({ ...item, category: "scenes" }))
  ].forEach((item) => {
    const references = upgradeItem(item).references;
    assert.strictEqual(references.length, 3, `${item.id} ${item.name}`);
  });
});

runTest("opening a tone category selects its first reference-bearing card", () => {
  const appData = { types: promptData.types, scenes: promptData.scenes };
  const typeSelection = firstToneSelectionForCategory(appData, "types", "all");
  const sceneSelection = firstToneSelectionForCategory(appData, "scenes", "all");
  assert.strictEqual(typeSelection[0].id, "T01");
  assert.strictEqual(sceneSelection[0].id, "S01");
  assert.strictEqual(typeSelection[0].references.length, 3);
  assert.strictEqual(sceneSelection[0].references.length, 3);
});

function runTest(name, fn) {
  testChain = testChain.then(async () => {
    try {
      await fn();
      console.log(`PASS ${name}`);
    } catch (error) {
      console.error(`FAIL ${name}`);
      console.error(error.message);
      process.exitCode = 1;
    }
  });
}

runTest("loads director, type, and scene data", () => {
  assert(promptData.directors.length >= 20);
  assert(promptData.types.length >= 10);
  assert(promptData.scenes.length >= 10);
});

runTest("reverse analysis normalizes and counts eight human calibration fields", () => {
  assert.deepStrictEqual(DIMENSION_DEFINITIONS.map((item) => item.key), [
    "subject", "composition", "camera", "lighting",
    "color", "material", "style", "background"
  ]);
  const normalized = normalizeDimensions({
    subject: "  单人，38岁女刑警  ",
    lighting: "冷白逆光",
    unknown: "ignored"
  });
  assert.strictEqual(normalized.subject, "单人，38岁女刑警");
  assert.strictEqual(normalized.lighting, "冷白逆光");
  assert.strictEqual(normalized.background, "");
  assert.strictEqual(normalized.unknown, undefined);
  assert.strictEqual(countCalibratedDimensions(normalized), 2);
  assert(buildHumanConstraints(normalized).includes("主体特征：单人，38岁女刑警"));
  assert(buildHumanConstraints(normalized).includes("光线方向：冷白逆光"));
  assert(!buildHumanConstraints(normalized).includes("背景元素："));
});

runTest("reverse workspace exposes the three-column editable analysis contract", () => {
  const html = fs.readFileSync("index.html", "utf8");
  [
    'class="reverse-reference-panel"',
    'class="reverse-analysis-panel"',
    'class="reverse-result-panel"',
    'id="reverse-dimension-grid"',
    'id="reverse-calibration-count"',
    'id="reverse-clear-dimensions"',
    'data-reverse-resizer="left"',
    'data-reverse-resizer="right"',
    'src="reverse-analysis.js',
    'href="reverse-three-column.css'
  ].forEach((contract) => assert(html.includes(contract), `missing ${contract}`));
  ["subject", "composition", "camera", "lighting", "color", "material", "style", "background"]
    .forEach((key) => assert(html.includes(`data-reverse-dimension="${key}"`), `missing ${key}`));
});

runTest("reverse three-column stylesheet defines balanced responsive analysis layout", () => {
  const css = fs.readFileSync("reverse-three-column.css", "utf8");
  [
    "--reverse-left-width", "--reverse-right-width",
    "minmax(500px, 1fr)", "object-fit: contain",
    ".reverse-column-resizer:focus-visible",
    "@media (max-width: 1180px)", "@media (max-width: 820px)"
  ].forEach((contract) => assert(css.includes(contract), `missing ${contract}`));
});

runTest("reverse narrow layout keeps each panel independently scrollable", () => {
  const css = fs.readFileSync("reverse-three-column.css", "utf8");
  const narrowLayout = cssRuleBody(css, "@media (max-width: 1180px)");
  const panelHeight = "height: min(640px, calc(100vh - var(--studio-header-height, 66px) - 20px));";

  [
    "#reverse-workspace .reverse-reference-panel",
    "#reverse-workspace .reverse-analysis-panel",
    "#reverse-workspace .reverse-result-panel"
  ].forEach((selector) => {
    const panel = cssRuleBody(narrowLayout, selector);
    assert(panel.includes(panelHeight), `${selector} is missing its viewport-safe height`);
    assert(panel.includes("overflow-y: auto;"), `${selector} is missing vertical scrolling`);
    assert(panel.includes("overflow-x: hidden;"), `${selector} can overflow horizontally`);
  });

  assert(cssRuleBody(narrowLayout, "#reverse-workspace #reverse-dimension-grid").includes("overflow-y: auto;"));
  assert(cssRuleBody(narrowLayout, "#reverse-workspace .reverse-output-field textarea").includes("min-height: 360px;"));
});

runTest("reverse medium layout balances the reference board with task settings", () => {
  const css = fs.readFileSync("reverse-three-column.css", "utf8");
  const mediumLayout = cssRuleBody(css, "@media (min-width: 821px) and (max-width: 1180px)");
  const referencePanel = cssRuleBody(mediumLayout, "#reverse-workspace .reverse-reference-panel");
  assert(referencePanel.includes("grid-template-columns: minmax(320px, 0.9fr) minmax(0, 1.1fr);"));
  assert(cssRuleBody(mediumLayout, "#reverse-workspace .reverse-panel-header").includes("grid-column: 1 / -1;"));
  assert(cssRuleBody(mediumLayout, "#reverse-workspace .reverse-task-settings").includes("grid-column: 2;"));
});

runTest("reverse workspace preserves its existing field contract exactly once", () => {
  const html = fs.readFileSync("index.html", "utf8");
  [
    "reverse-source-mode", "reverse-image-input", "reverse-image-preview", "reverse-image-placeholder",
    "reverse-privacy-note", "reverse-purpose", "reverse-fidelity", "reverse-emphasis", "reverse-ratio",
    "reverse-quality", "reverse-text-policy", "reverse-replacement", "reverse-extra", "reverse-output",
    "reverse-filename", "reverse-validation", "reverse-copy", "reverse-example", "reverse-clear"
  ].forEach((id) => {
    const occurrences = html.split(`id="${id}"`).length - 1;
    assert.strictEqual(occurrences, 1, `expected #${id} exactly once, found ${occurrences}`);
  });

  const source = fs.readFileSync("reverse-app.js", "utf8");
  ["aigcReverseWorkbench", "exportState", "importState", "loadExample", "clearFields", "composePrompt", "URL.revokeObjectURL"]
    .forEach((contract) => assert(source.includes(contract), `missing ${contract}`));
});

runTest("reverse controller owns editable calibration state and prompt integration", () => {
  const source = fs.readFileSync("reverse-app.js", "utf8");
  [
    "aigcReverseAnalysis",
    "dimensionInputs",
    "state.dimensions",
    "countCalibratedDimensions",
    "buildHumanConstraints",
    "renderDimensionState",
    "人工确认约束"
  ].forEach((contract) => assert(source.includes(contract), `missing ${contract}`));
});

runTest("reverse calibration state persists with backwards-compatible project state", () => {
  const source = fs.readFileSync("reverse-app.js", "utf8");
  assert(source.includes("dimensions: normalizeDimensions(state.dimensions)"));
  assert(source.includes("layout: { ...state.layout }"));
  assert(source.includes("saved.dimensions"));
  assert(source.includes("saved.layout"));
  assert(source.includes("normalizeDimensions(saved.dimensions)"));
});

runTest("reverse controller exposes accessible persistent draggable columns", () => {
  const source = fs.readFileSync("reverse-app.js", "utf8");
  [
    "pointerdown", "setPointerCapture", "ArrowLeft", "ArrowRight", "dblclick",
    "--reverse-left-width", "--reverse-right-width", "leftWidth", "rightWidth",
    "aria-valuenow", "aigc:workspace-dirty"
  ].forEach((contract) => assert(source.includes(contract), `missing ${contract}`));
  const exportBody = source.match(/exportState\(\) \{([\s\S]*?)\n\s*\},\n\s*importState/)?.[1] || "";
  assert(exportBody.includes("layout:"));
  assert(source.includes("saved.layout"));
});

runTest("reverse controller validates image previews and releases object URLs", () => {
  const source = fs.readFileSync("reverse-app.js", "utf8");
  [
    "image/jpeg", "image/png", "image/webp",
    "仅支持 JPG、PNG 或 WebP 图片。",
    "图片无法预览，请重新选择。",
    'addEventListener("error"',
    "URL.createObjectURL", "URL.revokeObjectURL", "is-error"
  ].forEach((contract) => assert(source.includes(contract), `missing ${contract}`));
});

function createReverseControllerHarness() {
  const dispatchedEvents = [];
  const documentListeners = new Map();
  const elementsBySelector = new Map();

  function createClassList() {
    const names = new Set();
    return {
      contains(name) { return names.has(name); },
      toggle(name, force) {
        const enabled = force === undefined ? !names.has(name) : Boolean(force);
        if (enabled) names.add(name); else names.delete(name);
        return enabled;
      }
    };
  }

  function createElement({ value = "", dataset = {} } = {}) {
    let currentValue = String(value);
    const listeners = new Map();
    const attributes = new Map();
    const capturedPointers = new Set();
    const styleValues = new Map();
    return {
      dataset,
      classList: createClassList(),
      disabled: false,
      hidden: false,
      files: [],
      clientWidth: 1440,
      style: {
        setProperty(name, nextValue) { styleValues.set(name, String(nextValue)); },
        getPropertyValue(name) { return styleValues.get(name) || ""; },
        removeProperty(name) { styleValues.delete(name); }
      },
      selectionEnd: currentValue.length,
      selectionStart: currentValue.length,
      textContent: "",
      valueWrites: 0,
      get value() { return currentValue; },
      set value(nextValue) {
        currentValue = String(nextValue);
        this.valueWrites += 1;
        this.selectionStart = currentValue.length;
        this.selectionEnd = currentValue.length;
      },
      addEventListener(type, listener) { listeners.set(type, listener); },
      removeEventListener(type, listener) {
        if (listeners.get(type) === listener) listeners.delete(type);
      },
      trigger(type, event = {}) {
        listeners.get(type)?.({
          target: this,
          type,
          preventDefault() {},
          pointerId: 1,
          clientX: 0,
          key: "",
          shiftKey: false,
          ...event
        });
      },
      setAttribute(name, nextValue) { attributes.set(name, String(nextValue)); },
      getAttribute(name) { return attributes.get(name) || null; },
      removeAttribute(name) { attributes.delete(name); },
      setPointerCapture(pointerId) { capturedPointers.add(pointerId); },
      hasPointerCapture(pointerId) { return capturedPointers.has(pointerId); },
      releasePointerCapture(pointerId) { capturedPointers.delete(pointerId); },
      focus() {},
      select() {}
    };
  }

  const dimensionInputs = ["subject", "composition", "camera", "lighting", "color", "material", "style", "background"].map((key) => {
    const field = createElement();
    const input = createElement({ dataset: { reverseDimension: key } });
    input.closest = (selector) => selector === ".reverse-dimension-field" ? field : null;
    return input;
  });
  const add = (selector, element = createElement()) => {
    elementsBySelector.set(selector, element);
    return element;
  };

  add("#reverse-workspace", createElement());
  add("#reverse-source-mode", createElement({ value: "target" }));
  add("#reverse-image-input", createElement());
  add("#reverse-image-preview", createElement());
  add("#reverse-image-placeholder", createElement());
  add(".reverse-upload", createElement());
  add("#reverse-reference-status", createElement());
  add("#reverse-privacy-note", createElement());
  add("#reverse-purpose", createElement({ value: "film" }));
  add("#reverse-fidelity", createElement({ value: "balanced" }));
  add("#reverse-emphasis", createElement({ value: "all" }));
  add("#reverse-ratio", createElement({ value: "source" }));
  add("#reverse-quality", createElement({ value: "cinematic" }));
  add("#reverse-text-policy", createElement({ value: "remove" }));
  add("#reverse-replacement", createElement());
  add("#reverse-extra", createElement());
  add("#reverse-output", createElement());
  add("#reverse-filename", createElement());
  add("#reverse-validation", createElement());
  add("#reverse-copy", createElement());
  add("#reverse-example", createElement());
  add("#reverse-clear", createElement());
  add("#reverse-clear-dimensions", createElement());
  add("#reverse-calibration-count", createElement());
  add(".reverse-calibration-summary strong", createElement());
  const resizers = [
    createElement({ dataset: { reverseResizer: "left" } }),
    createElement({ dataset: { reverseResizer: "right" } })
  ];

  const document = {
    querySelector(selector) { return elementsBySelector.get(selector) || null; },
    querySelectorAll(selector) {
      if (selector === "[data-reverse-dimension]") return dimensionInputs;
      if (selector === "[data-reverse-resizer]") return resizers;
      return [];
    },
    addEventListener(type, listener) { documentListeners.set(type, listener); },
    dispatchEvent(event) {
      dispatchedEvents.push(event);
      documentListeners.get(event.type)?.(event);
      return true;
    },
    execCommand() { return true; }
  };
  class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  }
  const rootListeners = new Map();
  const createdUrls = [];
  const revokedUrls = [];
  const root = {
    aigcReverseAnalysis: require("./reverse-analysis.js"),
    document,
    innerWidth: 1440,
    addEventListener(type, listener) { rootListeners.set(type, listener); },
    trigger(type, event = {}) { rootListeners.get(type)?.({ target: root, type, ...event }); }
  };
  const context = {
    CustomEvent,
    URL: {
      createObjectURL(file) {
        const url = `blob:reference-${createdUrls.length + 1}`;
        createdUrls.push({ file, url });
        return url;
      },
      revokeObjectURL(url) { revokedUrls.push(url); }
    },
    document,
    navigator: { clipboard: { writeText: async () => {} } },
    setTimeout,
    window: root
  };
  vm.runInNewContext(fs.readFileSync("reverse-app.js", "utf8"), context, { filename: "reverse-app.js" });
  const workspace = elementsBySelector.get("#reverse-workspace");
  return {
    dimensionInputs,
    dispatchedEvents,
    elementsBySelector,
    resizers,
    root,
    createdUrls,
    revokedUrls,
    workbench: root.aigcReverseWorkbench,
    resizeTo(width) {
      root.innerWidth = width;
      workspace.clientWidth = width;
      root.trigger("resize");
    }
  };
}

runTest("reverse calibration input preserves selection when its normalized value is unchanged", () => {
  const harness = createReverseControllerHarness();
  const subject = harness.dimensionInputs[0];
  subject.value = "ABCDE";
  subject.selectionStart = 2;
  subject.selectionEnd = 4;
  subject.valueWrites = 0;

  subject.trigger("input");

  assert.strictEqual(subject.valueWrites, 0);
  assert.strictEqual(subject.selectionStart, 2);
  assert.strictEqual(subject.selectionEnd, 4);
});

runTest("reverse calibration uses normalized dimensions for field state and both counters", () => {
  const harness = createReverseControllerHarness();
  const subject = harness.dimensionInputs[0];
  subject.value = "   ";
  subject.trigger("input");

  assert.strictEqual(subject.value, "");
  assert.strictEqual(subject.closest(".reverse-dimension-field").classList.contains("calibrated"), false);
  assert.strictEqual(harness.elementsBySelector.get("#reverse-calibration-count").textContent, "已校准 0/8");
  assert.strictEqual(harness.elementsBySelector.get(".reverse-calibration-summary strong").textContent, "0 / 8");

  const css = fs.readFileSync("reverse-three-column.css", "utf8");
  assert(css.includes(".reverse-dimension-field.calibrated"));
  assert(!css.includes(":placeholder-shown"));
});

runTest("reverse calibration buttons notify workspace persistence exactly once per mutation", () => {
  const harness = createReverseControllerHarness();
  harness.dimensionInputs[0].trigger("input");
  harness.elementsBySelector.get("#reverse-clear-dimensions").trigger("click");
  harness.elementsBySelector.get("#reverse-clear").trigger("click");
  harness.elementsBySelector.get("#reverse-example").trigger("click");

  assert.strictEqual(harness.dispatchedEvents.length, 3);
  harness.dispatchedEvents.forEach((event) => {
    assert.strictEqual(event.type, "aigc:workspace-dirty");
    assert.strictEqual(event.detail.workspace, "reverse");
  });
});

function assertReverseLayout(workbench, expected) {
  const layout = workbench.exportState().layout;
  assert.strictEqual(layout.leftWidth, expected.leftWidth);
  assert.strictEqual(layout.rightWidth, expected.rightWidth);
  assert.deepStrictEqual(Object.keys(layout).sort(), ["leftWidth", "rightWidth"]);
}

runTest("reverse layout survives resize and restores inline tracks after the compact desktop band", () => {
  const harness = createReverseControllerHarness();
  const workspace = harness.elementsBySelector.get("#reverse-workspace");
  harness.workbench.importState({ layout: { leftWidth: 360, rightWidth: 520 } });
  assertReverseLayout(harness.workbench, { leftWidth: 360, rightWidth: 520 });

  harness.resizeTo(1439);
  assertReverseLayout(harness.workbench, { leftWidth: 360, rightWidth: 520 });

  harness.resizeTo(1200);
  assertReverseLayout(harness.workbench, { leftWidth: 360, rightWidth: 520 });
  assert.strictEqual(workspace.style.getPropertyValue("--reverse-left-width"), "");
  assert.strictEqual(workspace.style.getPropertyValue("--reverse-right-width"), "");
  harness.resizers.forEach((resizer) => assert.strictEqual(resizer.getAttribute("aria-disabled"), "true"));

  harness.resizeTo(1440);
  assertReverseLayout(harness.workbench, { leftWidth: 360, rightWidth: 520 });
  assert.strictEqual(workspace.style.getPropertyValue("--reverse-left-width"), "360px");
  assert.strictEqual(workspace.style.getPropertyValue("--reverse-right-width"), "520px");
});

runTest("reverse import validates each layout field without spreading malformed data", () => {
  const harness = createReverseControllerHarness();
  harness.workbench.importState({ layout: ["bad"] });
  assertReverseLayout(harness.workbench, { leftWidth: 300, rightWidth: 500 });

  harness.workbench.importState({ layout: { leftWidth: 350, rightWidth: "580" } });
  assertReverseLayout(harness.workbench, { leftWidth: 350, rightWidth: 500 });
  harness.resizers.forEach((resizer) => {
    assert.match(resizer.getAttribute("aria-valuemin"), /^\d+$/);
    assert.match(resizer.getAttribute("aria-valuemax"), /^\d+$/);
    assert.match(resizer.getAttribute("aria-valuenow"), /^\d+$/);
  });
});

runTest("reverse resizers clamp only their active rail and synchronize final ARIA bounds", () => {
  const harness = createReverseControllerHarness();
  const [left, right] = harness.resizers;

  harness.workbench.importState({ layout: { leftWidth: 300, rightWidth: 500 } });
  left.trigger("pointerdown", { clientX: 0 });
  left.trigger("pointermove", { clientX: 300 });
  left.trigger("pointerup", { clientX: 300 });
  assertReverseLayout(harness.workbench, { leftWidth: 398, rightWidth: 500 });
  assert.strictEqual(left.getAttribute("aria-valuemax"), "398");
  assert.strictEqual(right.getAttribute("aria-valuemax"), "500");

  harness.workbench.importState({ layout: { leftWidth: 300, rightWidth: 500 } });
  right.trigger("pointerdown", { clientX: 0 });
  right.trigger("pointermove", { clientX: -300 });
  right.trigger("pointerup", { clientX: -300 });
  assertReverseLayout(harness.workbench, { leftWidth: 300, rightWidth: 598 });
  assert.strictEqual(left.getAttribute("aria-valuemax"), "300");
  assert.strictEqual(right.getAttribute("aria-valuemax"), "598");
});

runTest("reverse pointer cleanup requires capture and handles lost capture once", () => {
  const missingCapture = createReverseControllerHarness();
  const missingLeft = missingCapture.resizers[0];
  missingLeft.setPointerCapture = undefined;
  missingLeft.trigger("pointerdown", { clientX: 0 });
  assert.strictEqual(missingLeft.classList.contains("dragging"), false);
  assert.strictEqual(missingCapture.dispatchedEvents.length, 0);

  const harness = createReverseControllerHarness();
  const left = harness.resizers[0];
  left.trigger("pointerdown", { clientX: 0 });
  left.trigger("lostpointercapture", { clientX: 0 });
  left.trigger("pointerup", { clientX: 0 });
  assert.strictEqual(left.classList.contains("dragging"), false);
  assert.strictEqual(harness.dispatchedEvents.length, 1);
});

runTest("reverse invalid image replacement clears the prior preview and blocks copy", () => {
  const harness = createReverseControllerHarness();
  const input = harness.elementsBySelector.get("#reverse-image-input");
  const sourceMode = harness.elementsBySelector.get("#reverse-source-mode");
  const copy = harness.elementsBySelector.get("#reverse-copy");
  const upload = harness.elementsBySelector.get(".reverse-upload");
  const status = harness.elementsBySelector.get("#reverse-reference-status");

  sourceMode.value = "local";
  input.files = [{ name: "first.png", type: "image/png" }];
  input.trigger("change");
  assert.strictEqual(copy.disabled, false);

  input.files = [{ name: "replacement.gif", type: "image/gif" }];
  input.trigger("change");
  assert.deepStrictEqual(harness.revokedUrls, ["blob:reference-1"]);
  assert.strictEqual(harness.workbench.exportState().imageName, "");
  assert.strictEqual(copy.disabled, true);
  assert.strictEqual(upload.classList.contains("is-error"), true);
  assert.strictEqual(status.textContent, "仅支持 JPG、PNG 或 WebP 图片。");
});

runTest("reverse restored image metadata supplies the visible output filename", () => {
  const harness = createReverseControllerHarness();
  harness.workbench.importState({ sourceMode: "local", imageName: "restored-frame.webp" });
  assert.strictEqual(
    harness.elementsBySelector.get("#reverse-filename").textContent,
    "REVERSE_restored-frame_八维反推_v001.txt"
  );
});

runTest("loads the master camera library into the local workspace", () => {
  assert.strictEqual(cameraPromptData.cases.length, 24);
  assert.strictEqual(cameraPromptData.genres.length, 22);
  assert(cameraPromptData.cases.some((item) => item.film === "教父" && item.prompt.includes("15秒")));
  assert(cameraPromptData.genres.some((item) => item.name.includes("悬疑推理") && item.tone && item.camera));
});

runTest("camera library keeps searchable blocking, lighting, and reference details", () => {
  const caseText = cameraPromptData.cases.map((item) => Object.values(item).join(" ")).join(" ");
  const genreText = cameraPromptData.genres.map((item) => Object.values(item).flat().join(" ")).join(" ");
  assert(caseText.includes("缓慢推进"));
  assert(caseText.includes("花样年华"));
  assert(cameraPromptData.genres.every((item) => item.tone && item.camera && item.blocking));
  assert(genreText.includes("IMAX") || cameraPromptData.cases.some((item) => item.prompt.includes("IMAX")));
});

runTest("selected camera option A exposes the director timeline contract", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const theme = fs.readFileSync("camera-option-a.css", "utf8");
  assert(html.includes('href="camera-option-a-seedance30-layout.css'));
  assert(html.includes('src="camera-timeline-seedance30.js'));
  [
    'id="camera-stage"',
    'id="camera-monitor"',
    'id="camera-timeline"',
    'id="camera-blocking-toggle"',
    'id="camera-blocking-map"',
    'id="camera-save-version"'
  ].forEach((contract) => assert(html.includes(contract), `missing ${contract}`));
  assert(theme.includes("#camera-workspace.camera-shell"));
  assert(theme.includes("var(--camera-library-width)"));
  assert(theme.includes("var(--camera-composer-width)"));
  assert(theme.includes('grid-template-areas: "library library-resizer stage composer-resizer composer"'));
});

runTest("camera balanced workbench gives both information rails readable desktop space", () => {
  const css = fs.readFileSync("camera-option-a.css", "utf8");
  const shellRule = cssRuleBody(css, "#camera-workspace.camera-shell");
  const stageRule = cssRuleBody(css, "#camera-workspace .camera-stage");
  const cinemaRule = cssRuleBody(css, '#camera-workspace .camera-stage[data-camera-aspect="cinema"] .camera-monitor');
  const wideRule = cssRuleBody(css, '#camera-workspace .camera-stage[data-camera-aspect="wide"] .camera-monitor');
  const monitorImageRule = cssRuleBody(css, "#camera-workspace .camera-monitor img");
  const timelineRule = cssRuleBody(css, "#camera-workspace .camera-timeline-panel");
  const blockingRule = cssRuleBody(css, "#camera-workspace .camera-blocking-map");
  const midCss = extractBalancedCssBlock(css, "@media (max-width: 1393px) and (min-width: 1181px)");
  const midShellRule = cssRuleBody(midCss, "#camera-workspace.camera-shell");
  const beatRule = cssRuleBody(css, "#camera-workspace .camera-beat");
  const trackLabelRule = cssRuleBody(css, "#camera-workspace .camera-track > strong");
  const mapCardRule = cssRuleBody(css, "#camera-workspace .camera-map-points article");
  const mapCopyRule = cssRuleBody(css, "#camera-workspace .camera-map-points p");
  const methodRule = cssRuleBody(css, "#camera-workspace .camera-card .camera-card-method");
  const titleRule = cssRuleBody(css, "#camera-workspace .camera-card h2");
  const copyRule = cssRuleBody(css, "#camera-workspace .camera-card p");
  const labelRule = cssRuleBody(css, "#camera-workspace .camera-composer .field > span");
  const inputRule = cssRuleBody(css, "#camera-workspace .camera-composer input,");
  const outputRule = cssRuleBody(css, "#camera-workspace #camera-output");

  assert(shellRule.includes("--camera-library-width: 350px"));
  assert(shellRule.includes("--camera-composer-width: 520px"));
  assert(midShellRule.includes("--camera-library-width: 320px"));
  assert(midShellRule.includes("--camera-composer-width: 460px"));
  assert(stageRule.includes("grid-template-rows: auto max-content max-content max-content"));
  assert(stageRule.includes("align-content: start"));
  assert(stageRule.includes("overflow-y: auto"));
  assert(cinemaRule.includes("max-height: 300px"));
  assert(cinemaRule.includes("aspect-ratio: 21 / 9"));
  assert(wideRule.includes("max-height: 360px"));
  assert(wideRule.includes("aspect-ratio: 16 / 9"));
  assert(stageRule.includes("background: #dbe1dd"));
  assert(monitorImageRule.includes("object-fit: cover"));
  assert(timelineRule.includes("overflow: visible"));
  assert(timelineRule.includes("background: #d4dbd6"));
  assert(blockingRule.includes("min-height: 210px"));
  assert(blockingRule.includes("background: #e6ebe7"));
  assert(!blockingRule.includes("max-height"));
  assert(trackLabelRule.includes("font-size: 11px"));
  assert(beatRule.includes("font-size: 10px"));
  assert(beatRule.includes("white-space: normal"));
  assert(beatRule.includes("-webkit-line-clamp: 2"));
  assert(mapCardRule.includes("background: #f7f8f6"));
  assert(mapCopyRule.includes("font-size: 11px"));
  assert(methodRule.includes("-webkit-line-clamp: 2"));
  assert(titleRule.includes("font-size: 12px"));
  assert(copyRule.includes("font-size: 10px"));
  assert(labelRule.includes("font-size: 11px"));
  assert(inputRule.includes("font-size: 12px"));
  assert(outputRule.includes("font-size: 12px"));
});

runTest("camera stacked workbench preserves content-sized stage order", () => {
  const css = fs.readFileSync("camera-option-a.css", "utf8");
  const tabletCss = extractBalancedCssBlock(css, "@media (max-width: 1180px)");
  const narrowCss = extractBalancedCssBlock(css, "@media (max-width: 720px)");
  const shellRule = cssRuleBody(tabletCss, "#camera-workspace.camera-shell");
  const stageRule = cssRuleBody(tabletCss, "#camera-workspace .camera-stage");
  const mapRule = cssRuleBody(narrowCss, "#camera-workspace .camera-map-points");

  assert(shellRule.includes('grid-template-areas: "stage" "library" "composer"'));
  assert(stageRule.includes("grid-template-rows: auto max-content max-content max-content"));
  assert(stageRule.includes("min-height: 0"));
  assert(stageRule.includes("overflow: visible"));
  assert(mapRule.includes("grid-template-columns: 1fr"));
});

runTest("camera monitor exposes a persistent 21:9 and 16:9 aspect switch", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const source = fs.readFileSync("camera-app.js", "utf8");
  const cameraMonitorHtml = html.slice(html.indexOf('id="camera-monitor"'), html.indexOf('class="camera-timeline-panel"'));

  assert(html.includes('id="camera-aspect-switch"'));
  assert(html.includes('href="camera-option-a-seedance30-layout.css?v=20260811-v1"'));
  assert(/src="camera-app-seedance30\.js\?v=[^"]+"/.test(html));
  assert(html.includes('data-camera-aspect="cinema"'));
  assert(html.includes('data-camera-aspect="wide"'));
  assert(cameraMonitorHtml.includes('id="camera-monitor-aspect-label"'));
  assert(html.includes('aria-pressed="true">21:9'));
  assert(html.includes('aria-pressed="false">16:9'));
  assert(source.includes('aspect: "cinema"'));
  assert(source.includes('aspectButtons: [...document.querySelectorAll("[data-camera-aspect]")]'));
  assert(source.includes('elements.stage.dataset.cameraAspect = state.aspect'));
  assert(source.includes('elements.monitorAspectLabel.textContent = state.aspect === "wide" ? "16:9" : "21:9"'));
  assert(source.includes('button.setAttribute("aria-pressed", String(active))'));
  assert(source.includes('state.aspect = saved.aspect === "wide" ? "wide" : "cinema"'));
  assert(source.includes('aspect: state.aspect'));
});

runTest("camera redesign preserves all business-critical field IDs", () => {
  const html = fs.readFileSync("index.html", "utf8");
  [
    "camera-search", "camera-source-tabs", "camera-group-filter", "camera-results",
    "camera-character", "camera-scene", "camera-look", "camera-performance",
    "camera-action", "camera-sound", "camera-ending", "camera-validation",
    "camera-output", "camera-copy", "camera-clear"
  ].forEach((id) => assert(html.includes(`id="${id}"`), `missing #${id}`));
});

runTest("camera timeline converts a 15-second case into three readable tracks", () => {
  const item = cameraPromptData.cases.find((entry) => entry.id === "C05");
  const segments = extractTimelineSegments(item.prompt);
  const model = buildCameraTimelineModel(item);
  assert(segments.length >= 4);
  assert.strictEqual(segments[0].start, 0);
  assert.strictEqual(segments.at(-1).end, 15);
  assert.deepStrictEqual(model.markers, [0, 3, 6, 9, 12, 15]);
  assert.deepStrictEqual(model.tracks.map((track) => track.id), ["performance", "camera", "scene"]);
  assert(model.tracks.every((track) => track.beats.length > 0));
  assert(model.tracks.flatMap((track) => track.beats).every((beat) => beat.start >= 0 && beat.end <= 15 && beat.end > beat.start));
});

runTest("camera timeline supports a 30-second director take with three continuous acts", () => {
  const item = {
    prompt: "0-10秒 人物在门口停住，摄影机缓慢推进；10-20秒 她转向桌面，摄影机横移跟随；20-30秒 她握住证物，镜头停在新的构图。"
  };
  const model = buildCameraTimelineModel(item, 30);
  assert.strictEqual(model.duration, 30);
  assert.deepStrictEqual(model.markers, [0, 5, 10, 15, 20, 25, 30]);
  assert.deepStrictEqual(model.segments.map((segment) => [segment.start, segment.end]), [[0, 10], [10, 20], [20, 30]]);
  assert(model.tracks.flatMap((track) => track.beats).every((beat) => beat.start >= 0 && beat.end <= 30 && beat.end > beat.start));
});

runTest("camera workbench provides a Seedance 2.5 30-second structured prompt mode", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const source = fs.readFileSync("camera-app-seedance30.js", "utf8");
  assert(html.includes('data-camera-duration="15"'));
  assert(html.includes('data-camera-duration="30"'));
  assert(html.includes('data-camera-structure="quick"'));
  assert(html.includes('data-camera-structure="formal"'));
  ["camera-beat-start", "camera-beat-middle", "camera-beat-end", "camera-reference-locks"].forEach((id) => {
    assert(html.includes(`id="${id}"`), `missing #${id}`);
  });
  ["【Seedance 2.5｜30秒导演长镜头】", "【0–10秒｜建立】", "【10–20秒｜推进】", "【20–30秒｜落点】", "【角色与参考锁定】", "【连续性与限定负面】", "composeSeedance30Quick", "composeSeedance30Formal"].forEach((copy) => {
    assert(source.includes(copy), `missing Seedance 30-second copy: ${copy}`);
  });
  assert(source.includes('buildCameraTimelineModel(timelineItem, duration)'));
  assert(source.includes('state.mode === "seedance30" ? 30 : 15'));
  assert(source.includes('state.mode === "seedance30"'));
  assert(source.includes('elements.durationModes.forEach'));
  assert(source.includes('if (state.mode === "seedance30") state.last30Mode = structure'));
});

runTest("camera blocking map is reserved for spatially complex cases", () => {
  const layered = cameraPromptData.cases.find((entry) => entry.id === "C07");
  const intimate = cameraPromptData.cases.find((entry) => entry.id === "C05");
  assert.strictEqual(requiresBlockingMap(layered), true);
  assert.strictEqual(requiresBlockingMap(intimate), false);
  const map = buildBlockingMapModel(buildCameraTimelineModel(layered));
  assert.deepStrictEqual(map.points.map((point) => point.id), ["A", "B", "C"]);
  assert(map.points.every((point) => point.time >= 0 && point.time <= 15 && point.label));
});

runTest("every selected camera case and genre opens a blocking map", () => {
  const source = fs.readFileSync("camera-app.js", "utf8");
  assert(source.includes("state.blockingOpen = true"));
  assert(source.includes("const supportsMap = Boolean(item)"));
  assert(!source.includes("const supportsMap = Boolean(item && requiresBlockingMap(item))"));
});

runTest("camera blocking map includes linked shot descriptions for cases and genres", () => {
  const source = fs.readFileSync("camera-app.js", "utf8");
  const css = fs.readFileSync("camera-option-a.css", "utf8");
  const timelineRule = cssRuleBody(css, "#camera-workspace .camera-timeline-panel");
  const blockingRule = cssRuleBody(css, "#camera-workspace .camera-blocking-map");

  assert(source.includes("function cameraDescription(item)"));
  assert(source.includes('class="camera-shot-description"'));
  assert(source.includes("镜头意图"));
  assert(source.includes("调度方法"));
  assert(source.includes("影调氛围"));
  assert(source.includes("运镜调度"));
  assert(source.includes("cameraDescription(item)"));
  assert(css.includes("#camera-workspace .camera-shot-description"));
  assert(timelineRule.includes("background: #d4dbd6"));
  assert(blockingRule.includes("background: #e6ebe7"));
});

runTest("camera workbench exposes persistent draggable column dividers", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const source = fs.readFileSync("camera-app.js", "utf8");
  const css = fs.readFileSync("camera-option-a.css", "utf8");
  const shellRule = cssRuleBody(css, "#camera-workspace.camera-shell");
  const resizerRule = cssRuleBody(css, "#camera-workspace .camera-column-resizer");

  assert(html.includes('id="camera-library-resizer"'));
  assert(html.includes('id="camera-composer-resizer"'));
  assert(html.includes('role="separator"'));
  assert(html.includes('data-camera-resizer="library"'));
  assert(html.includes('data-camera-resizer="composer"'));
  assert(shellRule.includes("--camera-library-width: 350px"));
  assert(shellRule.includes("--camera-composer-width: 520px"));
  assert(shellRule.includes("var(--camera-library-width)"));
  assert(shellRule.includes("var(--camera-composer-width)"));
  assert(shellRule.includes('"library library-resizer stage composer-resizer composer"'));
  assert(resizerRule.includes("cursor: col-resize"));
  assert(source.includes('querySelectorAll("[data-camera-resizer]")'));
  assert(source.includes('addEventListener("pointerdown"'));
  assert(source.includes('addEventListener("dblclick"'));
  assert(source.includes('addEventListener("keydown"'));
  assert(source.includes("panelWidths: state.panelWidths"));
  assert(source.includes("saved.panelWidths"));
  assert(source.includes("aigcWorkspaceCore?.persistNow"));
  assert(css.includes("container-name: camera-library"));
  assert(css.includes("@container camera-library (min-width: 430px)"));
  assert(css.includes("-webkit-line-clamp: 3"));
});

runTest("camera controller synchronizes monitor timeline map and versions", () => {
  const source = fs.readFileSync("camera-app.js", "utf8");
  [
    "buildCameraTimelineModel",
    "buildBlockingMapModel",
    "requiresBlockingMap",
    "renderCameraStage",
    "renderCameraTimeline",
    "renderBlockingMap",
    "camera-save-version",
    "versions"
  ].forEach((contract) => assert(source.includes(contract), `missing ${contract}`));
  assert(source.includes("aigcCameraWorkbench"));
  assert(source.includes("receiveTone(prompt)"));
  assert(source.includes("receiveCharacter(summary)"));
});

runTest("index exposes tone and camera workspaces without network dependencies", () => {
  const html = fs.readFileSync("index.html", "utf8");
  assert(html.includes('id="tone-workspace"'));
  assert(html.includes('id="camera-workspace"'));
  assert(html.includes('src="camera-data.js"'));
  assert(html.includes('src="camera-app-seedance30.js'));
  assert(!/https?:\/\//.test(html));
});

runTest("index exposes the casting master workspace", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const castingSource = fs.readFileSync("casting-app.js", "utf8");
  assert(html.includes('id="casting-workspace"'));
  assert(html.includes('data-workspace="casting"'));
  assert(html.includes('data-casting-layout="three"'));
  assert(html.includes('data-casting-layout="four"'));
  assert(html.includes('data-casting-layout="single"'));
  assert(html.includes('data-casting-source="reference"'));
  assert(html.includes('data-casting-source="text"'));
  assert(html.includes('id="casting-medium"'));
  assert(html.includes('id="casting-era"'));
  assert(html.includes('id="casting-genre"'));
  assert(html.includes('id="casting-tone"'));
  assert(html.includes('src="casting-app.js'));
  assert(castingSource.includes("脸颊饱满度"));
  assert(castingSource.includes("干燥、低反光的真实真人皮肤"));
  assert(castingSource.includes("专业影棚双层柔光"));
  assert(castingSource.includes("不得出现“看起来相似”但实际不同的人脸"));
  assert(castingSource.includes("RAW照片质感"));
  assert(castingSource.includes("把现有单张角色参考图转换为规范多视图身份母版"));
  assert(castingSource.includes("缺失视角补全规则"));
  assert(castingSource.includes("保留真人自然的左右不对称"));
  assert(castingSource.includes("不要正脸贴图式侧脸"));
  assert(castingSource.includes("在没有人物参考图的情况下，从文字设定生成一张高精度单视图身份候选肖像"));
  assert(castingSource.includes("脸部占画面高度约55%至65%"));
  assert(!castingSource.includes("IDENTITY_CANDIDATE"));
  assert(!castingSource.includes("LOCKED_MASTER"));
  assert(!html.includes("IDENTITY_CANDIDATE"));
  assert(!html.includes("LOCKED_MASTER"));
  assert(castingSource.includes("电影级二维手绘动画"));
  assert(castingSource.includes("迪士尼经典二维动画"));
  assert(castingSource.includes("皮克斯式三维动画"));
  assert(castingSource.includes("吉卜力 / 宫崎骏手绘动画"));
  assert(castingSource.includes("梦工厂式三维动画"));
  assert(castingSource.includes("漫画混合动画"));
  assert(castingSource.includes("必须创建原创角色"));
  assert(castingSource.includes("中国东方电影动画角色"));
  assert(castingSource.includes("故事年代与服化道纪律"));
  assert(castingSource.includes("类型影调只作用于角色"));
  assert(castingSource.includes("不要不同视图混合不同画风"));
});

runTest("selected casting option 3 exposes the role archive contract", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const theme = fs.readFileSync("casting-option-3.css", "utf8");
  assert(html.includes('href="casting-option-3.css'));
  [
    'class="casting-archive"',
    'id="casting-stage"',
    'class="casting-inspector"',
    'id="casting-identity-board-image"',
    'id="casting-version-strip"',
    'id="casting-save-version"'
  ].forEach((contract) => assert(html.includes(contract), `missing ${contract}`));
  assert(theme.includes("#casting-workspace.casting-shell"));
  assert(theme.includes("grid-template-columns: minmax(270px, 17vw) minmax(600px, 48vw) minmax(450px, 1fr)"));
  assert(theme.includes('grid-template-areas: "archive stage inspector"'));
  assert(fs.existsSync("design-references/casting-option-3.png"));
  assert(fs.existsSync("assets/casting-char-001-board.png"));
});

runTest("casting page presents a reference and template workbench", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const css = fs.readFileSync("casting-option-3.css", "utf8");
  assert(html.includes("角色视觉参考与提示词模板"));
  assert(html.includes('data-casting-source="reference" aria-pressed="true">有参考图'));
  assert(html.includes('data-casting-layout="identity" aria-pressed="false">身份资料板'));
  ["casting-template-sample", "casting-template-title", "casting-template-purpose", "casting-template-composition", "casting-template-stage"]
    .forEach((id) => assert(html.includes(`id="${id}"`), `missing #${id}`));
  const sampleRule = css.match(/#casting-workspace #casting-template-sample\s*\{([\s\S]*?)\}/)?.[1] || "";
  assert(sampleRule.includes("object-fit: contain"));
  assert(!html.includes("固定角色生图提示词"));
});

runTest("casting character summary transfers identity board details with fallbacks", () => {
  const summary = buildCharacterSummary({
    id: "CHAR-SENTINEL",
    role: "林岚 / 法医",
    age: "38岁，中国女性",
    body: "168cm，匀称偏瘦",
    face: "圆钝下巴，平直眉",
    hair: "黑色齐肩直发",
    costume: "白衬衫与深灰风衣",
    traits: "银色腕表",
    wardrobe: "深灰风衣、白衬衫、黑色直筒裤",
    props: "银色腕表、法医证件",
    neutralExpression: "克制、警觉",
    expressionSet: "观察、怀疑、确认",
    signatureAction: "戴手套后检查证物",
    stance: "肩背挺直，重心稳定"
  });

  [
    "CHAR-SENTINEL", "林岚 / 法医", "服装层级：深灰风衣、白衬衫、黑色直筒裤",
    "固定道具：银色腕表、法医证件", "常态与情绪表情：克制、警觉 / 观察、怀疑、确认",
    "标志性动作与站姿：戴手套后检查证物 / 肩背挺直，重心稳定"
  ].forEach((term) => assert(summary.includes(term), `summary missing ${term}`));

  const fallbackSummary = buildCharacterSummary({});
  ["服装层级：未填写", "固定道具：未填写", "常态与情绪表情：未填写 / 未填写", "标志性动作与站姿：未填写 / 未填写"]
    .forEach((term) => assert(fallbackSummary.includes(term), `fallback missing ${term}`));
});

runTest("public casting character summary maps every identity DOM field", () => {
  const fieldValues = {
    id: "PUBLIC_ID",
    role: "PUBLIC_ROLE",
    age: "PUBLIC_AGE",
    body: "PUBLIC_BODY",
    face: "PUBLIC_FACE",
    hair: "PUBLIC_HAIR",
    costume: "PUBLIC_COSTUME",
    traits: "PUBLIC_TRAITS",
    wardrobe: "PUBLIC_WARDROBE",
    props: "PUBLIC_PROPS",
    neutralExpression: "PUBLIC_NEUTRAL",
    expressionSet: "PUBLIC_EXPRESSIONS",
    signatureAction: "PUBLIC_ACTION",
    stance: "PUBLIC_STANCE"
  };
  const fakeElements = Object.fromEntries(
    Object.entries(fieldValues).map(([key, fieldValue]) => [key, { value: fieldValue }])
  );
  const summary = buildCharacterSummaryFromElements(fakeElements);

  Object.values(fieldValues).forEach((sentinel) => {
    assert(summary.includes(sentinel), `public transfer path omitted ${sentinel}`);
  });

  const source = fs.readFileSync("casting-app.js", "utf8");
  const publicSummaryBody = source.match(/function characterSummary\(\) \{([\s\S]*?)\n  \}/)?.[1] || "";
  assert(publicSummaryBody.includes("buildCharacterSummaryFromElements(elements)"));
  assert(source.includes("getCharacterSummary: characterSummary"));
});

runTest("casting layout samples remain complete on desktop and mobile", () => {
  const css = fs.readFileSync("casting-option-3.css", "utf8");
  const mobileRule = extractBalancedCssBlock(css, "@media (max-width: 720px)");
  const boardRule = cssRuleBody(mobileRule, "#casting-workspace .casting-identity-board");
  const sampleRule = cssRuleBody(mobileRule, "#casting-workspace #casting-template-sample");
  const referenceLayerRule = cssRuleBody(mobileRule, "#casting-workspace .casting-reference-layer");
  const referenceImageRule = cssRuleBody(mobileRule, "#casting-workspace #casting-identity-board-image");
  const guideRule = cssRuleBody(mobileRule, "#casting-workspace .casting-template-guide-grid");
  const wrappingRule = cssRuleBody(mobileRule, "#casting-workspace .casting-template-guide :is(p, small)");

  ["grid-template-rows: auto auto 30px", "aspect-ratio: auto"].forEach((declaration) => assert(boardRule.includes(declaration)));
  ["aspect-ratio: 16 / 9", "object-fit: contain"].forEach((declaration) => assert(sampleRule.includes(declaration)));
  ["position: relative", "inset: auto", "width: 100%", "aspect-ratio: 16 / 9", "box-shadow: none"]
    .forEach((declaration) => assert(referenceLayerRule.includes(declaration)));
  assert(referenceImageRule.includes("object-fit: contain"));
  assert(guideRule.includes("grid-template-columns: 1fr"));
  ["white-space: normal", "overflow-wrap: anywhere"].forEach((declaration) => assert(wrappingRule.includes(declaration)));
  assert(!/font-size\s*:\s*[^;]*(vw|vh|vmin|vmax)/.test(css));
});

runTest("casting desktop controls and reference asset never cover the 16:9 sample", () => {
  const css = fs.readFileSync("casting-option-3.css", "utf8");
  const switchRule = cssRuleBody(css, "#casting-workspace .casting-source-switch,");
  const boardRule = cssRuleBody(css, "#casting-workspace .casting-identity-board");
  const sampleRule = cssRuleBody(css, "#casting-workspace #casting-template-sample");
  const referenceRule = cssRuleBody(css, "#casting-workspace .casting-reference-layer");

  ["grid-auto-flow: row", "grid-auto-columns: auto"].forEach((declaration) => {
    assert(switchRule.includes(declaration), `switch controls missing ${declaration}`);
  });
  assert(css.includes("#casting-workspace .casting-layout-switch {\n  grid-template-columns: repeat(2, minmax(0, 1fr))"));
  ["grid-template-columns: minmax(0, 1fr) clamp(150px, 24%, 180px)", "aspect-ratio: auto"]
    .forEach((declaration) => assert(boardRule.includes(declaration), `desktop board missing ${declaration}`));
  ["grid-column: 1", "aspect-ratio: 16 / 9", "object-fit: contain"]
    .forEach((declaration) => assert(sampleRule.includes(declaration), `desktop sample missing ${declaration}`));
  ["position: relative", "grid-column: 2", "width: 100%", "box-shadow: none"]
    .forEach((declaration) => assert(referenceRule.includes(declaration), `desktop reference missing ${declaration}`));
});

runTest("casting template profiles cover all four image boards", () => {
  assert.deepStrictEqual(Object.keys(CASTING_TEMPLATE_PROFILES), ["single", "three", "four", "identity"]);
  assert.strictEqual(CASTING_TEMPLATE_PROFILES.identity.image, "assets/casting-template-identity-board.png?v=20260811-young-woman-v1");
  ["人物主肖像", "服装", "道具", "表情", "动作"].forEach((term) => {
    assert(CASTING_TEMPLATE_PROFILES.identity.composition.includes(term));
  });
});

runTest("missing reference blobs retain project metadata and disable reference output", () => {
  const referenceAsset = { id: "legacy-missing-asset", name: "legacy.png" };
  const state = {
    assetRequest: 7,
    referenceAsset,
    previewUrl: "blob:stale-preview",
    assetError: ""
  };
  const revoked = [];

  assert.strictEqual(retainMissingReferenceMetadata(state, 7, (url) => revoked.push(url)), true);
  assert.strictEqual(state.referenceAsset, referenceAsset, "legacy reference metadata must be retained");
  assert.strictEqual(state.previewUrl, "");
  assert(state.assetError.includes("重新上传"));
  assert.deepStrictEqual(revoked, ["blob:stale-preview"]);
  assert.deepStrictEqual(getCastingSourceValidation("reference", state.referenceAsset, state.previewUrl), ["referenceAsset"]);
});

runTest("every casting template has matching visible composition captions", () => {
  assert.deepStrictEqual(castingTemplateCaptions("single"), ["身份主图"]);
  assert.deepStrictEqual(castingTemplateCaptions("three"), ["正脸特写", "45° 半身", "正面全身"]);
  assert.deepStrictEqual(castingTemplateCaptions("four"), ["正脸特写", "90° 侧脸特写", "正面全身", "45° 全身", "背面全身"]);
  assert.deepStrictEqual(castingTemplateCaptions("identity"), ["人物主肖像", "服装拆解", "固定道具", "表情组", "动作姿态"]);
  const html = fs.readFileSync("index.html", "utf8");
  const source = fs.readFileSync("casting-app.js", "utf8");
  assert(html.includes('id="casting-template-caption"'));
  assert(source.includes("elements.templateCaption.replaceChildren"));
});

runTest("four-view casting template prioritizes two clear face anchors over full-body faces", () => {
  const rules = castingLayoutRules("four", "reference", {}, "16:9");
  const negative = castingNegativeRule("four", "不要游戏CG");
  const referenceRule = castingReferenceRule("four", "reference", "preserve-all", "保留左眉尾浅疤");

  ["左侧约35%", "正脸五官大头特写", "严格90度侧脸大头特写", "右侧约65%", "正面全身", "45度全身", "严格背面全身"].forEach((term) => {
    assert(rules.composition.includes(term), `four-view composition missing ${term}`);
  });
  ["保守补全", "正面全身", "45度全身", "背面全身", "背面不得回头"].forEach((term) => {
    assert(rules.completion.includes(term), `four-view completion missing ${term}`);
  });
  ["不要背面回头或露出正脸", "不要额外视图"].forEach((term) => {
    assert(negative.includes(term), `four-view negative missing ${term}`);
  });
  assert(referenceRule.includes("最高优先级身份锚点"));
  assert(referenceRule.includes("背面不得露出正脸"));
});

runTest("identity prompts allow required expression and action groups", () => {
  const identityNegative = castingNegativeRule("identity", "不要游戏CG");
  ["不要重复人脸", "不要拼贴多视图", "不要重复肢体"].forEach((term) => {
    assert(!identityNegative.includes(term), `identity negative contradicts required groups: ${term}`);
  });
  ["不要身份漂移", "不要多余身份人物", "不要游戏CG"].forEach((term) => {
    assert(identityNegative.includes(term), `identity negative missing ${term}`);
  });
  assert(castingNegativeRule("three", "不要游戏CG").includes("不要重复人脸"));
});

runTest("single view preserves reference mode and uses a single-portrait reference rule", () => {
  const selection = castingLayoutSelection({ source: "reference", layout: "three", ratio: "16:9" }, "single");
  assert.deepStrictEqual(selection, { source: "reference", layout: "single", ratio: "4:5" });
  const referenceRule = castingReferenceRule("single", "reference", "preserve-all", "保留左眉尾浅疤");
  assert(referenceRule.includes("单视图身份肖像"));
  assert(referenceRule.includes("只出现一个人物和一张脸"));
  assert(referenceRule.includes("保留左眉尾浅疤"));
  assert(!referenceRule.includes("转换为多视图"));
});

runTest("casting segmented controls expose selected state to assistive technology", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const source = fs.readFileSync("casting-app.js", "utf8");
  assert(html.includes('data-casting-source="reference" aria-pressed="true"'));
  assert(html.includes('data-casting-layout="three" aria-pressed="true"'));
  assert(source.includes('button.setAttribute("aria-pressed"'));
});

runTest("casting layout rules execute all four profile paths", () => {
  const expectedTerms = {
    single: "单视图",
    three: "三视图",
    four: "四视图",
    identity: "16:9角色身份资料板"
  };

  Object.entries(expectedTerms).forEach(([layout, term]) => {
    const rules = castingLayoutRules(layout, "text", {});
    assert(rules.composition.includes(term), `${layout} composition did not execute`);
    assert(rules.completion.length > 0, `${layout} completion is empty`);
    assert(rules.pose.length > 0, `${layout} pose is empty`);
  });
});

runTest("casting status labels use the exact four-layout contract", () => {
  assert.deepStrictEqual(
    ["single", "three", "four", "identity"].map(castingStatusLabel),
    ["单视图参考", "三视图参考", "四视图参考", "身份资料板参考"]
  );
  assert.strictEqual(castingStatusLabel("unknown"), "三视图参考");
});

runTest("identity layout completion and pose use identity groups without strict view demands", () => {
  const values = {
    neutralExpression: "SENTINEL_NEUTRAL_EXPRESSION",
    expressionSet: "SENTINEL_EXPRESSION_SET",
    signatureAction: "SENTINEL_SIGNATURE_ACTION",
    stance: "SENTINEL_STANCE"
  };
  const rules = castingLayoutRules("identity", "reference", values, "4:5");

  ["服装", "道具", "表情", "动作"].forEach((term) => {
    assert(rules.completion.includes(term), `identity completion missing ${term}`);
  });
  assert.strictEqual(rules.outputFormat, "16:9 横向角色身份资料板构图");
  assert(rules.compositionLock.includes("16:9横向身份资料板"));
  assert(rules.compositionLock.includes("不得改成单幅肖像、三视图、四视图或其他画幅"));
  Object.values(values).forEach((sentinel) => {
    assert(rules.pose.includes(sentinel), `identity pose missing ${sentinel}`);
  });
  ["侧面", "背面", "90度", "45度全身"].forEach((strictView) => {
    assert(!rules.completion.includes(strictView), `identity completion demands ${strictView}`);
    assert(!rules.pose.includes(strictView), `identity pose demands ${strictView}`);
  });
});

runTest("identity validation requires six fields only for the identity layout", () => {
  const complete = {
    wardrobe: "SENTINEL_WARDROBE",
    props: "SENTINEL_PROPS",
    neutralExpression: "SENTINEL_NEUTRAL",
    expressionSet: "SENTINEL_EXPRESSIONS",
    signatureAction: "SENTINEL_ACTION",
    stance: "SENTINEL_STANCE"
  };

  ["single", "three", "four"].forEach((layout) => {
    assert.deepStrictEqual(getIdentityValidation(layout, {}), []);
  });
  assert.deepStrictEqual(getIdentityValidation("identity", complete), []);
  assert.deepStrictEqual(getIdentityValidation("identity", { ...complete, props: "", stance: "  " }), ["props", "stance"]);
});

runTest("casting source validation requires asset id and preview only in reference mode", () => {
  assert.deepStrictEqual(getCastingSourceValidation("text", null, ""), []);
  assert.deepStrictEqual(getCastingSourceValidation("reference", null, ""), ["referenceAsset"]);
  assert.deepStrictEqual(getCastingSourceValidation("reference", { id: "asset-1" }, ""), ["referenceAsset"]);
  assert.deepStrictEqual(getCastingSourceValidation("reference", null, "blob:preview"), ["referenceAsset"]);
  assert.deepStrictEqual(getCastingSourceValidation("reference", { id: "asset-1" }, "blob:preview"), []);
});

runTest("casting state normalization round-trips identity and asset version metadata", () => {
  const saved = {
    layout: "identity",
    source: "reference",
    wardrobe: "SENTINEL_WARDROBE",
    props: "SENTINEL_PROPS",
    neutralExpression: "SENTINEL_NEUTRAL",
    expressionSet: "SENTINEL_EXPRESSIONS",
    signatureAction: "SENTINEL_ACTION",
    stance: "SENTINEL_STANCE",
    versions: [{ number: 7, label: "SENTINEL_VERSION", referenceAssetId: "asset-7" }],
    referenceAsset: { id: "asset-7", name: "sentinel.webp", customMetadata: "preserved" }
  };
  const normalized = normalizeCastingState(saved);

  ["wardrobe", "props", "neutralExpression", "expressionSet", "signatureAction", "stance"].forEach((key) => {
    assert.strictEqual(normalized[key], saved[key]);
  });
  assert.deepStrictEqual(normalized.versions, saved.versions);
  assert.deepStrictEqual(normalized.referenceAsset, saved.referenceAsset);
  assert.notStrictEqual(normalized.versions, saved.versions);
  assert.notStrictEqual(normalized.referenceAsset, saved.referenceAsset);
});

runTest("casting guide subtitle exposes a dynamic profile hook", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const source = fs.readFileSync("casting-app.js", "utf8");
  assert(html.includes('id="casting-template-stage-label"'));
  assert(source.includes("elements.templateStageLabel.textContent = profile.stage"));
});

runTest("casting identity board fields persist and enter the prompt", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const source = fs.readFileSync("casting-app.js", "utf8");
  ["casting-wardrobe", "casting-props", "casting-neutral-expression", "casting-expression-set", "casting-signature-action", "casting-stance"]
    .forEach((id) => assert(html.includes(`id="${id}"`), `missing #${id}`));
  ["wardrobe", "props", "neutralExpression", "expressionSet", "signatureAction", "stance"]
    .forEach((key) => assert(source.includes(`${key}: elements.${key}.value`), `missing export ${key}`));
  ["【服装层级】", "【固定道具】", "【表情组】", "【动作姿态组】"]
    .forEach((heading) => assert(source.includes(heading), `missing ${heading}`));
});

runTest("casting render keeps source layers and normalized imports wired", () => {
  const source = fs.readFileSync("casting-app.js", "utf8");
  const render = source.match(/function render\(\) \{([\s\S]*?)\n  \}/)?.[1] || "";

  assert(source.includes("normalizeCastingState(saved)"));
  assert(render.includes("elements.referenceLayer.hidden = !referenceMode"));
  assert(!render.includes("elements.templateSample.hidden"), "template sample must remain visible in both source modes");
  assert(render.includes("getIdentityValidation(state.layout, currentIdentityValues())"));
  assert(render.includes("getCastingSourceValidation(state.source, state.referenceAsset, state.previewUrl)"));
});

runTest("casting archive and identity versions stay readable and uncropped", () => {
  const theme = fs.readFileSync("casting-option-3.css", "utf8");
  const versionImageRule = theme.match(/#casting-workspace \.casting-version-card img\s*\{([\s\S]*?)\}/)?.[1] || "";
  const identityBoardRule = theme.match(/#casting-workspace \.casting-identity-board\s*\{([\s\S]*?)\}/)?.[1] || "";
  const rosterImageRule = theme.match(/#casting-workspace \.casting-roster-item img,\s*#casting-workspace \.casting-roster-placeholder\s*\{([\s\S]*?)\}/)?.[1] || "";
  const outputRule = theme.match(/#casting-workspace #casting-output\s*\{([\s\S]*?)\}/)?.[1] || "";
  assert(theme.includes("grid-template-rows: 58px auto minmax(300px, 1fr)"));
  assert(theme.includes("font-size: 12px"));
  assert(theme.includes("grid-template-columns: 52px minmax(0, 1fr)"));
  const templateSampleRule = theme.match(/#casting-workspace #casting-template-sample\s*\{([\s\S]*?)\}/)?.[1] || "";
  assert(identityBoardRule.includes("aspect-ratio: auto"));
  assert(templateSampleRule.includes("aspect-ratio: 16 / 9"));
  assert(rosterImageRule.includes("object-fit: contain"));
  assert(!rosterImageRule.includes("object-fit: cover"));
  assert(versionImageRule.includes("object-fit: contain"));
  assert(!versionImageRule.includes("object-fit: cover"));
  assert(outputRule.includes("font-size: 12px"));
});

runTest("casting asset metadata does not cover the contained reference image", () => {
  const theme = fs.readFileSync("casting-option-3.css", "utf8");
  const identityImageRule = theme.match(/#casting-workspace #casting-identity-board-image\s*\{([\s\S]*?)\}/)?.[1] || "";
  const assetMetaRule = theme.match(/#casting-workspace \.casting-asset-meta\s*\{([\s\S]*?)\}/)?.[1] || "";

  assert(identityImageRule.includes("inset: 0 0 72px"));
  assert(identityImageRule.includes("width: 100%"));
  assert(identityImageRule.includes("height: calc(100% - 72px)"));
  assert(assetMetaRule.includes("bottom: 30px"));
});

runTest("casting option 3 preserves every prompt input and transfer action", () => {
  const html = fs.readFileSync("index.html", "utf8");
  [
    "casting-id", "casting-role", "casting-age", "casting-body", "casting-face",
    "casting-hair", "casting-costume", "casting-traits", "casting-reference-notes",
    "casting-reference", "casting-medium", "casting-era", "casting-genre",
    "casting-tone", "casting-skin", "casting-lighting", "casting-ratio",
    "casting-output", "casting-copy", "casting-clear", "casting-example",
    "casting-send-camera", "casting-send-poster"
  ].forEach((id) => assert(html.includes(`id="${id}"`), `missing #${id}`));
});

runTest("casting controller keeps bounded role versions in project state", () => {
  const source = fs.readFileSync("casting-app.js", "utf8");
  [
    "casting-save-version",
    "casting-version-strip",
    "renderIdentityStage",
    "renderVersions",
    "versions: state.versions",
    "slice(-20)"
  ].forEach((contract) => assert(source.includes(contract), `missing ${contract}`));
});

runTest("workspace deep links open the requested production tool", () => {
  const core = fs.readFileSync("workspace-core.js", "utf8");
  assert(core.includes('new URLSearchParams(root.location.search).get("workspace")'));
  assert(core.includes("requestedWorkspace && api[requestedWorkspace]"));
  assert(core.includes('preferredWorkspace ? preferredWorkspace : "projects"'));
});

runTest("workspace navigation keeps the shareable URL synchronized", () => {
  const navigation = fs.readFileSync("workspace-navigation.js", "utf8");
  const core = fs.readFileSync("workspace-core.js", "utf8");
  assert(navigation.includes("history.replaceState"));
  assert(navigation.includes('searchParams.set("workspace"'));
  assert(navigation.includes('next === "projects" ? "project" : next'));
  assert(core.includes('requestedWorkspace === "project" ? "projects"'));
});

runTest("global search indexes every workspace and the major production libraries", () => {
  const source = fs.readFileSync("look-studio.js", "utf8");
  [
    '{ id: "projects", name: "项目"',
    '{ id: "music", name: "音乐配乐"',
    "root.cameraPromptData?.cases",
    "root.aigcMusicData?.MUSIC_TEMPLATES",
    "root.aigcPosterTemplateData?.templates"
  ].forEach((token) => assert(source.includes(token), token));
});

runTest("default workbench values do not create fake project progress", () => {
  const result = summarizeProject({
    activeWorkspace: "tone",
    workspaces: {
      poster: { purpose: "film", ratio: "2:3" },
      music: {
        coreEmotion: "restrained",
        orchestration: { lead: ["piano", "string_ensemble"], support: ["soft_cello"] }
      },
      camera: { selected: { id: "C01" }, selectedExplicit: false }
    }
  });
  assert.strictEqual(result.configuredCount, 0);
});

runTest("onboarding edits do not persist untouched workspace defaults", () => {
  const core = fs.readFileSync("workspace-core.js", "utf8");
  const app = fs.readFileSync("app.js", "utf8");
  assert(core.includes("isCreativeWorkspaceEdit"));
  assert(core.includes('workspace.dataset.workspaceView !== "projects"'));
  assert(app.includes("selectedExplicit: false"));
  assert(app.includes("state.selectedExplicit = true"));
  assert(app.includes("selectedExplicit: state.selectedExplicit"));
});

runTest("project dashboard keeps first visit unblocked until the user opens new project", () => {
  const source = fs.readFileSync("project-dashboard.js", "utf8");
  assert(!source.includes('snapshot.onboardingComplete === false && !elements.onboardingDialog.open'));
  assert(source.includes('formMode = snapshot.onboardingComplete === false ? "starter" : "new"'));
  assert(source.includes('elements.newProject.addEventListener("click"'));
});

runTest("project scene editor exposes a single-shot production card with direct next action", () => {
  const source = fs.readFileSync("project-scenes.js", "utf8");
  const readiness = fs.readFileSync("project-shot-readiness.js", "utf8");
  const css = fs.readFileSync("project-scenes.css", "utf8");
  assert(source.includes("function renderShotProductionCard"));
  assert(source.includes("project-shot-production-card"));
  assert(source.includes('data-scene-action="open-shot-production-next"'));
  ["角色参考", "场景 / 道具", "影调光影", "表演动作", "运镜节奏", "提示词版本"].forEach((label) => assert(readiness.includes(label)));
  assert(source.includes("30秒三段节拍"));
  assert(source.includes("focus-beat-plan"));
  assert(css.includes(".project-shot-production-checks"));
  assert(css.includes("repeat(6, minmax(0, 1fr))"));
});

runTest("project scene editor provides model packages and actionable adjacent-shot continuity", () => {
  const source = fs.readFileSync("project-scenes.js", "utf8");
  const continuity = fs.readFileSync("project-shot-continuity.js", "utf8");
  const css = fs.readFileSync("project-scenes.css", "utf8");
  assert(source.includes("copy-shot-model-package"));
  assert(source.includes("download-shot-model-package"));
  assert(source.includes("select-continuity-predecessor"));
  assert(source.includes("focus-continuity-field"));
  assert(source.includes("复制 Seedance 交付包"));
  assert(continuity.includes("角色母版不一致"));
  assert(continuity.includes("场景发生切换"));
  assert(css.includes(".project-shot-continuity"));
});

runTest("camera opens with a preview case without counting it as a user decision", () => {
  const source = fs.readFileSync("camera-app.js", "utf8");
  assert(source.includes("selectedExplicit: false"));
  assert(source.includes("defaultCameraSelection"));
  assert(source.includes("state.selectedExplicit = true"));
  assert(source.includes("selectedExplicit: state.selectedExplicit"));
});

runTest("project dashboard is a view and never a persisted creative workspace", () => {
  const navigation = fs.readFileSync("workspace-navigation.js", "utf8");
  const camera = fs.readFileSync("camera-app.js", "utf8");
  const core = fs.readFileSync("workspace-core.js", "utf8");
  assert(navigation.includes('"projects"'));
  assert(navigation.includes("workspace-view"));
  assert(!camera.includes('modeButtons: [...document.querySelectorAll("[data-workspace]")]'));
  assert(core.includes('if (view !== "projects")'));
  assert(core.includes("getProjectSnapshot"));
  assert(core.includes("completeOnboarding"));
});

runTest("project dashboard preserves six deep links", () => {
  const core = fs.readFileSync("workspace-core.js", "utf8");
  assert(core.includes('preferredWorkspace ? preferredWorkspace : "projects"'));
  ["tone", "camera", "casting", "poster", "reverse", "music"].forEach((id) => assert(core.includes(id)));
});

runTest("project dashboard exposes the confirmed three-column production contract", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const source = fs.readFileSync("project-dashboard.js", "utf8");
  [
    "project-workspace", "project-mode-button", "project-center-column", "project-category-nav", "project-spotlight", "project-stage-list",
    "project-card-list", "project-active-detail", "project-dashboard-new", "project-dashboard-sort", "project-category-select",
    "project-detail-open", "project-detail-close", "project-onboarding-dialog", "project-onboarding-import"
  ].forEach((id) => assert.strictEqual((html.match(new RegExp(`id=["']${id}["']`, "g")) || []).length, 1));
  ["getProjectSnapshot", "subscribeProjects", "setDashboardView", "selectProject", "completeOnboarding", "createProject", "toggleFavorite", "openProjectWorkspace"].forEach((token) => assert(source.includes(token)));
  assert(source.includes("releaseProject"));
  assert(source.includes("releaseAll"));
});

runTest("project cards separate selection from commands", () => {
  const source = fs.readFileSync("project-dashboard.js", "utf8");
  assert(source.includes('role="option"'));
  assert(source.includes('data-project-action="continue"'));
  assert(source.includes('data-project-action="favorite"'));
  assert(!source.includes("dblclick"));
});

runTest("project dashboard stylesheet locks the confirmed fusion visual system", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const css = fs.readFileSync("project-dashboard.css", "utf8");
  assert(html.includes('href="project-dashboard.css'));
  ["--project-canvas: #e9e9e3", "--project-paper: #fbfaf5", "--project-nav: #1b1e1a", "--project-primary: #536557", "--project-amber: #b5823e", "--project-error: #7a4344"].forEach((token) => assert(css.includes(token)));
  assert(css.includes("grid-template-columns: clamp(180px, 13vw, 208px) minmax(0, 1fr) clamp(360px, 29vw, 420px)"));
  assert(css.includes("aspect-ratio: 16 / 5"));
  assert(css.includes("aspect-ratio: 16 / 9"));
  assert(css.includes("@media (max-width: 1279px)"));
  assert(css.includes("@media (max-width: 1023px)"));
  assert(css.includes("@media (max-width: 819px)"));
  assert(css.includes("@media (max-width: 390px)"));
  assert(css.includes("@media (prefers-reduced-motion: reduce)"));
});

runTest("index exposes the poster and commercial key visual workspace", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const posterSource = fs.readFileSync("poster-app.js", "utf8");
  assert(html.includes('id="poster-workspace"'));
  assert(html.includes('data-workspace="poster"'));
  assert(html.includes('id="poster-purpose"'));
  assert(html.includes('id="poster-tone"'));
  assert(html.includes('id="poster-lighting"'));
  assert(html.includes('id="poster-color-grade"'));
  assert(html.includes('data-poster-source="reference"'));
  assert(html.includes('data-poster-source="text"'));
  assert(html.includes('id="poster-composition"'));
  assert(html.includes('id="poster-font"'));
  assert(html.includes('src="poster-app.js'));
  assert(posterSource.includes("人物大脸主视觉"));
  assert(posterSource.includes("小人物与宏大环境"));
  assert(posterSource.includes("群像金字塔"));
  assert(posterSource.includes("双重曝光 / 记忆叠化"));
  assert(posterSource.includes("商品英雄主视觉"));
  assert(posterSource.includes("生成无字海报底图"));
  assert(posterSource.includes("整张海报只使用一个主色体系"));
  assert(posterSource.includes("高对比电影衬线字体"));
  assert(posterSource.includes("纯文字新建模式，不使用任何人物、商品或风格参考图"));
  assert(posterSource.includes("伦勃朗光"));
  assert(posterSource.includes("侧光 / 半明半暗"));
  assert(posterSource.includes("逆光 / 轮廓光"));
  assert(posterSource.includes("场景光源 / 动机光"));
  assert(posterSource.includes("冷暖对比"));
  assert(posterSource.includes("青橙互补"));
  assert(posterSource.includes("低饱和去色"));
  assert(posterSource.includes("【电影布光】"));
  assert(posterSource.includes("【电影色彩关系】"));
  assert(posterSource.includes("不要乱码"));
});

runTest("poster workspace exposes the three-column production contract", () => {
  const html = fs.readFileSync("index.html", "utf8");
  [
    'class="poster-template-panel"',
    'class="poster-monitor-panel"',
    'class="poster-parameter-panel"',
    'id="poster-template-list"',
    'id="poster-monitor-canvas"',
    'id="poster-ratio-switch"',
    'data-poster-resizer="left"',
    'data-poster-resizer="right"',
    'src="poster-template-data.js',
    'href="poster-three-column.css'
  ].forEach((contract) => assert(html.includes(contract), `missing ${contract}`));
});

runTest("poster title library exposes accessible views filters and local data", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const css = fs.readFileSync("poster-three-column.css", "utf8");
  const titleDataIndex = html.indexOf('src="poster-title-template-data.js');
  const posterAppIndex = html.indexOf('src="poster-app.js');
  assert(titleDataIndex > -1 && titleDataIndex < posterAppIndex, "title data must load before poster app");
  [
    'id="poster-library-view"',
    'data-poster-library-view="composition"',
    'data-poster-library-view="title"',
    'id="poster-title-filters"',
    'data-poster-title-category="all"',
    'data-poster-title-language="bilingual"',
    'id="poster-title-template-list"',
    'aria-label="标题字模板"'
  ].forEach((contract) => assert(html.includes(contract), `missing ${contract}`));
  [
    ".poster-library-view-switch",
    ".poster-title-filter-row",
    ".poster-title-template-card",
    ".poster-title-template-card:focus-visible",
    ".poster-title-template-card[aria-selected=\"true\"]",
    "overflow-x: auto"
  ].forEach((contract) => assert(css.includes(contract), `missing ${contract}`));
});

runTest("poster workspace exposes a dedicated AI title-mark mode", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const css = fs.readFileSync("poster-three-column.css", "utf8");
  [
    'data-poster-library-view="title-mark"',
    'id="poster-title-mark-library"',
    'id="poster-title-mark-template-list"',
    'id="poster-title-mark-methods"',
    'id="poster-title-mark-metaphor"',
    'id="poster-title-mark-output-mode"',
    'src="poster-title-mark-data.js'
  ].forEach((token) => assert(html.includes(token), token));
  [
    ".poster-title-mark-template-card",
    ".poster-title-mark-sample",
    ".poster-title-mark-template-card:focus-visible",
    ".poster-title-mark-methods",
    "grid-template-columns: repeat(3, minmax(0, 1fr))"
  ].forEach((token) => assert(css.includes(token), token));
});

runTest("poster workbench preserves its public field and project contracts", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const source = fs.readFileSync("poster-app.js", "utf8");
  [
    "poster-purpose", "poster-ratio", "poster-genre", "poster-tone",
    "poster-lighting", "poster-color-grade", "poster-composition",
    "poster-subject", "poster-environment", "poster-look", "poster-reference",
    "poster-focus", "poster-text-mode", "poster-font", "poster-title-position",
    "poster-text-color", "poster-title", "poster-tagline", "poster-credits",
    "poster-output", "poster-copy"
  ].forEach((id) => {
    const occurrences = html.match(new RegExp(`id=["']${id}["']`, "g")) || [];
    assert.strictEqual(occurrences.length, 1, `${id} must occur exactly once`);
  });
  [
    "aigcPosterWorkbench", "exportState", "importState", "loadExample",
    "clearFields", "【电影布光】", "【电影色彩关系】"
  ].forEach((contract) => assert(source.includes(contract), `missing ${contract}`));
});

runTest("poster template catalog defines thirteen purpose-aware visual records", () => {
  const data = require("./poster-template-data.js");
  assert.deepStrictEqual(Object.keys(data.purposes), ["film", "social", "product"]);
  assert.strictEqual(data.templates.length, 13);
  assert.strictEqual(new Set(data.templates.map((template) => template.id)).size, 13);
  ["2:3", "4:5", "9:16", "16:9", "3:2", "1:1"].forEach((ratio) => {
    assert(data.ratios.includes(ratio), `missing ${ratio}`);
  });
  data.templates.forEach((template) => {
    assert(template.image.startsWith("assets/poster-templates/"));
    assert(template.promptRule.length > 30, `${template.id} prompt rule is too short`);
    assert(template.purposeGroups.length > 0, `${template.id} has no purpose group`);
  });
  assert.strictEqual(data.getTemplatesForPurpose("film").length, 9);
  assert.strictEqual(data.getTemplatesForPurpose("social").length, 1);
  assert.strictEqual(data.getTemplatesForPurpose("product").length, 3);
});

runTest("poster template catalog ships every local bitmap reference", () => {
  const data = require("./poster-template-data.js");
  data.templates.forEach((template) => {
    assert(fs.existsSync(template.image), `missing ${template.image}`);
    assert(template.image.endsWith(".jpg"), `${template.image} must be a jpg`);
    assert(fs.statSync(template.image).size > 20 * 1024, `${template.image} is unexpectedly small`);
  });
});

runTest("poster title catalog defines sixteen complete bilingual design systems", () => {
  assert.strictEqual(TITLE_TEMPLATES.length, 16);
  assert.strictEqual(new Set(TITLE_TEMPLATES.map((template) => template.id)).size, 16);
  assert(getTitleTemplate(DEFAULT_TITLE_TEMPLATE_ID));
  TITLE_TEMPLATES.forEach((template) => {
    assert(TITLE_CATEGORIES[template.category], `${template.id} has an invalid category`);
    assert.deepStrictEqual(template.languageModes, ["cn", "en", "bilingual"]);
    assert(template.references.length >= 2 && template.references.length <= 3, `${template.id} needs 2-3 references`);
    template.references.forEach((reference) => assert(/\(20\d{2}\)$/.test(reference), `${reference} needs a release year`));
    ["cnRule", "enRule", "hierarchyRule", "layoutRule", "promptRule", "negativeRule", "previewClass"].forEach((key) => {
      assert(String(template[key] || "").trim().length > 10, `${template.id} missing ${key}`);
    });
    assert(template.materialOptions.length >= 1, `${template.id} needs a material`);
    template.materialOptions.forEach((material) => assert(TITLE_MATERIALS[material], `${template.id} has invalid material ${material}`));
  });
});

runTest("poster title-mark catalog defines forty-eight complete film systems", () => {
  assert.strictEqual(TITLE_MARK_TEMPLATES.length, 48);
  assert.strictEqual(Object.keys(TITLE_MARK_CATEGORIES).length, 12);
  assert.strictEqual(new Set(TITLE_MARK_TEMPLATES.map((item) => item.id)).size, 48);
  Object.keys(TITLE_MARK_CATEGORIES).forEach((category) => {
    assert.strictEqual(TITLE_MARK_TEMPLATES.filter((item) => item.category === category).length, 4, category);
  });
  ["eastern-cold-serif", "crime-cut-sans", "scifi-geometric-metal", "period-dark-gold", "literary-life-hand", "fantasy-starlight-serif"]
    .forEach((id) => assert(getTitleMarkTemplate(id), `missing legacy template ${id}`));
  TITLE_MARK_TEMPLATES.forEach((item) => {
    ["id", "label", "sampleTitle", "skeleton", "metaphorRule", "material", "lighting", "hierarchyRule", "background", "promptRule", "negativeRule", "previewClass"].forEach((key) => assert(item[key], `${item.id || "title-mark"} missing ${key}`));
    assert(Array.isArray(item.methods) && item.methods.length >= 1 && item.methods.length <= 3, `${item.id} has invalid methods`);
  });
});

runTest("poster title-mark filters and saved state stay bounded", () => {
  const before = JSON.stringify(TITLE_MARK_TEMPLATES);
  assert.strictEqual(filterTitleMarkTemplates({ category: "eastern" }).length, 4);
  assert(filterTitleMarkTemplates({ query: "手写" }).some((item) => item.id === "literary-life-hand"));
  assert(filterTitleMarkTemplates({ query: "金属" }).some((item) => item.material === "metal"));
  assert(buildTitleMarkSearchText(getTitleMarkTemplate("crime-cut-sans")).includes("悬疑"));
  assert.deepStrictEqual(
    filterTitleMarkTemplates({ favorites: ["crime-cut-sans"], favoritesOnly: true }).map((item) => item.id),
    ["crime-cut-sans"]
  );
  assert.strictEqual(JSON.stringify(TITLE_MARK_TEMPLATES), before);
  const normalized = normalizePosterTitleMarkState({
    titleMarkTemplate: "missing",
    titleMarkMethods: ["shared-stroke", "long-stroke", "cut", "negative-space"],
    titleMarkBackground: "missing",
    titleMarkQuery: " x ".repeat(100),
    titleMarkFavorites: ["crime-cut-sans", "crime-cut-sans", "missing"],
    titleMarkFavoritesOnly: "yes"
  });
  assert.strictEqual(normalized.titleMarkTemplate, DEFAULT_TITLE_MARK_TEMPLATE_ID);
  assert.strictEqual(normalized.titleMarkMethods.length, 3);
  assert.strictEqual(normalized.titleMarkBackground, "black");
  assert(normalized.titleMarkQuery.length <= 80);
  assert.deepStrictEqual(normalized.titleMarkFavorites, ["crime-cut-sans"]);
  assert.strictEqual(normalized.titleMarkFavoritesOnly, false);
});

runTest("poster title catalog filters by category and language without mutating data", () => {
  const literary = filterTitleTemplates({ category: "literary", language: "bilingual" });
  assert(literary.length >= 2);
  assert(literary.every((template) => template.category === "literary"));
  assert(literary.every((template) => template.languageModes.includes("bilingual")));
  assert.strictEqual(filterTitleTemplates({ category: "invalid", language: "invalid" }).length, 16);
  assert.strictEqual(Object.keys(TITLE_LANGUAGE_MODES).length, 3);
});

runTest("poster title state normalization rejects malformed saved values", () => {
  assert.deepStrictEqual(normalizePosterTitleState({
    titleLibraryView: "title",
    titleCategory: "scifi",
    titleLanguage: "en",
    titleTemplate: "en-wide-scifi",
    englishTitle: "SIGNAL",
    titleMaterial: "metal"
  }), {
    titleLibraryView: "title",
    titleCategory: "scifi",
    titleLanguage: "en",
    titleTemplate: "en-wide-scifi",
    englishTitle: "SIGNAL",
    titleMaterial: "metal"
  });
  assert.deepStrictEqual(normalizePosterTitleState({
    titleLibraryView: "broken",
    titleCategory: "broken",
    titleLanguage: "broken",
    titleTemplate: "broken",
    englishTitle: 123,
    titleMaterial: "broken"
  }), {
    titleLibraryView: "composition",
    titleCategory: "all",
    titleLanguage: "bilingual",
    titleTemplate: DEFAULT_TITLE_TEMPLATE_ID,
    englishTitle: "",
    titleMaterial: getTitleTemplate(DEFAULT_TITLE_TEMPLATE_ID).materialOptions[0]
  });
});

runTest("poster three-column stylesheet defines balanced responsive production layout", () => {
  const css = fs.readFileSync("poster-three-column.css", "utf8");
  [
    "--poster-left-width", "--poster-right-width",
    "grid-template-columns", "minmax(420px, 1fr)",
    "object-fit: contain", ".poster-column-resizer:focus-visible",
    "@media (max-width: 1180px)", "@media (max-width: 820px)"
  ].forEach((contract) => assert(css.includes(contract), `missing ${contract}`));
});

runTest("poster controller synchronizes purpose templates ratios and monitor", () => {
  const source = fs.readFileSync("poster-app.js", "utf8");
  [
    "aigcPosterTemplateData", "renderTemplateLibrary", "selectedTemplate",
    "data-poster-purpose-group", "dataset.posterRatio", "aria-selected",
    "poster-monitor-image", "visualIntent", "subjectRatio", "typographyRisk",
    "template.promptRule"
  ].forEach((contract) => assert(source.includes(contract), `missing ${contract}`));
});

runTest("poster controller renders and selects title systems with safe live preview", () => {
  const source = fs.readFileSync("poster-app.js", "utf8");
  const css = fs.readFileSync("poster-three-column.css", "utf8");
  [
    "aigcPosterTitleTemplateData",
    "renderTitleTemplateLibrary",
    "renderLibraryView",
    "selectTitleTemplate",
    "filterTitleTemplates",
    "data-poster-title-template-id",
    "titleTemplate.previewClass",
    "poster-preview-title-cn",
    "poster-preview-title-en",
    "escapeHtml(value(elements.title",
    "escapeHtml(state.englishTitle"
  ].forEach((contract) => assert(source.includes(contract), `missing ${contract}`));
  assert(source.includes('event.target.closest("[data-poster-title-template-id]")'));
  assert(source.includes('event.key !== "Enter" && event.key !== " "'));
  [
    ".poster-preview-title-system",
    ".poster-preview-title-cn",
    ".poster-preview-title-en",
    ".title-preview-modern-song",
    ".title-preview-wide-scifi",
    ".title-preview-type-as-image"
  ].forEach((contract) => assert(css.includes(contract), `missing ${contract}`));
  const titleSystemRule = cssRuleBody(css, ".poster-preview-title-system");
  assert(titleSystemRule.includes("width: auto"));
  assert(titleSystemRule.includes("min-width: min(56%, 280px)"));
});

runTest("poster controller renders and selects safe title-mark systems", () => {
  const source = fs.readFileSync("poster-app.js", "utf8");
  [
    "aigcPosterTitleMarkData",
    "currentTitleMarkTemplate",
    "renderTitleMarkLibrary",
    "renderTitleMarkControls",
    "toggleTitleMarkMethod",
    "data-poster-title-mark-template-id",
    "data-poster-title-mark-method",
    "poster-title-mark-preview"
  ].forEach((token) => assert(source.includes(token), token));
  assert(source.includes("escapeHtml(titleText)"));
  assert(source.includes("slice(-3)"));
});

runTest("poster title-mark browser exposes complete search and favorite controls", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const source = fs.readFileSync("poster-app.js", "utf8");
  const css = fs.readFileSync("poster-three-column.css", "utf8");
  [
    "poster-title-mark-query",
    "poster-title-mark-clear-query",
    "poster-title-mark-favorites-only",
    "poster-title-mark-empty"
  ].forEach((id) => assert.strictEqual((html.match(new RegExp(`id=[\"']${id}[\"']`, "g")) || []).length, 1, `expected #${id} once`));
  assert.strictEqual((html.match(/data-poster-title-mark-category=/g) || []).length, 13);
  [
    "titleMarkQuery",
    "titleMarkFavorites",
    "titleMarkFavoritesOnly",
    "data-poster-title-mark-favorite-id",
    "visibleTitleMarkTemplates"
  ].forEach((token) => assert(source.includes(token), `missing ${token}`));
  [
    ".poster-title-mark-toolbar",
    ".poster-title-mark-favorite",
    ".poster-title-mark-empty"
  ].forEach((selector) => assert(css.includes(selector), `missing ${selector}`));
});

runTest("poster compositor state clamps three stable layers", () => {
  const state = normalizePosterCompositorState({
    selectedLayer: "unknown",
    guidesVisible: "yes",
    snapEnabled: false,
    exportFormat: "gif",
    layers: {
      "title-cn": { x: 2, y: -1, widthRatio: 4, rotation: 999, opacity: -2 },
      "title-image": { x: 0.2, y: 0.3, widthRatio: 0.7, rotation: 15, opacity: 0.8 },
      unknown: { x: 0.5 }
    }
  });
  assert.strictEqual(state.selectedLayer, "title-cn");
  assert.strictEqual(state.guidesVisible, true);
  assert.strictEqual(state.snapEnabled, false);
  assert.strictEqual(state.exportFormat, "png");
  assert.strictEqual(state.layers["title-cn"].x, 1);
  assert.strictEqual(state.layers["title-cn"].y, 0);
  assert.strictEqual(state.layers["title-cn"].rotation, 180);
  assert.strictEqual(state.layers["title-cn"].opacity, 0);
  assert(!state.layers.unknown);
  assert.strictEqual(Object.keys(DEFAULT_POSTER_COMPOSITOR_STATE.layers).length, 3);
});

runTest("poster compositor preserves safe dynamic text layers", () => {
  const custom = createPosterTextLayer("tagline", 4);
  assert.strictEqual(custom.id, "text-tagline-4");
  assert.strictEqual(custom.layer.role, "tagline");
  assert(custom.layer.text.includes("宣传语"));

  const state = normalizePosterCompositorState({
    selectedLayer: custom.id,
    layers: {
      [custom.id]: { ...custom.layer, text: "真相\n沉在雾里", color: "#ef4444", locked: true },
      "text-unsafe/../": { ...custom.layer, text: "discard" }
    }
  });
  assert.strictEqual(state.selectedLayer, custom.id);
  assert.strictEqual(state.layers[custom.id].text, "真相\n沉在雾里");
  assert.strictEqual(state.layers[custom.id].color, "#ef4444");
  assert.strictEqual(state.layers[custom.id].locked, true);
  assert(!state.layers["text-unsafe/../"]);
});

runTest("poster compositor exposes editable position locks and free text operations", () => {
  const source = fs.readFileSync("poster-compositor.js", "utf8");
  ["addText", "duplicateLayer", "removeLayer", "setLayerText"].forEach((name) => assert(source.includes(`function ${name}`), name));
  assert(source.includes("perPixelTargetFind: true"));
  assert(source.includes("selectable: true, evented: true"));
  assert(source.includes("lockMovementX: layer.locked"));
  assert(source.includes("locked: state.layers[id].locked"));
  assert(source.includes("function syncCanvasTextLayers"));
  assert(source.includes("applyLayer(id, state.layers[id], object);"));
  assert(!source.includes("selectable: !layer.locked"));
});

runTest("poster workbench provides free text layer controls", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const app = fs.readFileSync("poster-app.js", "utf8");
  const css = fs.readFileSync("poster-compositor.css", "utf8");
  [
    "poster-add-text", "poster-add-text-role", "poster-layer-text", "poster-layer-color",
    "poster-layer-duplicate", "poster-layer-delete"
  ].forEach((id) => assert.strictEqual((html.match(new RegExp(`id=[\"']${id}[\"']`, "g")) || []).length, 1, `expected #${id} once`));
  assert(app.includes("renderCompositorLayerList"));
  assert(app.includes("compositor?.addText"));
  assert(css.includes(".poster-add-text-row"));
});

runTest("poster monitor exposes direct bilingual layer selection", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const app = fs.readFileSync("poster-app.js", "utf8");
  const css = fs.readFileSync("poster-compositor.css", "utf8");
  ["poster-canvas-layer-switcher", "poster-canvas-layer-cn", "poster-canvas-layer-en", "poster-canvas-layer-image"].forEach((id) => {
    assert.strictEqual((html.match(new RegExp(`id=[\"']${id}[\"']`, "g")) || []).length, 1, `expected #${id} once`);
  });
  assert(app.includes("canvasLayerButtons"));
  assert(app.includes("data-poster-canvas-layer"));
  assert(css.includes(".poster-canvas-layer-switcher"));
});

runTest("poster monitor drags the selected layer from anywhere on the canvas", () => {
  const compositor = fs.readFileSync("poster-compositor.js", "utf8");
  [
    "function bindDirectLayerDrag",
    "canvas.upperCanvasEl",
    "element.ownerDocument",
    "const eventSurface = element.parentElement || element",
    "editable: false",
    "documentTarget.addEventListener(\"pointermove\"",
    "documentTarget.addEventListener(\"pointerup\"",
    "eventSurface.addEventListener(\"mousedown\"",
    "documentTarget.addEventListener(\"mousemove\"",
    "documentTarget.addEventListener(\"mouseup\"",
    "sourceSize.width / rect.width",
    "direct-layer-dragging"
  ].forEach((token) => assert(compositor.includes(token), token));
});

runTest("poster monitor switches bilingual layers by clicking their canvas objects", () => {
  const compositor = fs.readFileSync("poster-compositor.js", "utf8");
  [
    "function layerAtEvent",
    "canvas.getScenePoint",
    "candidate.containsPoint(scenePoint)",
    "selectLayer(hitLayerId)",
    "eventSurface.addEventListener(\"click\""
  ].forEach((token) => assert(compositor.includes(token), token));
});

runTest("poster monitor blocks native browser dragging before moving text layers", () => {
  const compositor = fs.readFileSync("poster-compositor.js", "utf8");
  const css = fs.readFileSync("poster-compositor.css", "utf8");
  [
    "element.draggable = false",
    "const onNativeDragStart",
    "eventSurface.addEventListener(\"dragstart\"",
    "eventSurface.removeEventListener(\"dragstart\""
  ].forEach((token) => assert(compositor.includes(token), token));
  assert(css.includes("-webkit-user-drag: none"));
});

runTest("poster monitor supports Chrome-level drag capture and explicit double-click editing", () => {
  const compositor = fs.readFileSync("poster-compositor.js", "utf8");
  [
    "const windowTarget = documentTarget.defaultView",
    "windowTarget?.addEventListener(\"pointermove\"",
    "windowTarget?.addEventListener(\"mousemove\"",
    "try { element.setPointerCapture",
    "const onDoubleClick",
    "enterTextEditing(hitLayerId)",
    "eventSurface.addEventListener(\"dblclick\""
  ].forEach((token) => assert(compositor.includes(token), token));
});

runTest("poster monitor recovers from a missed pointer-up and recognizes repeated clicks as editing", () => {
  const compositor = fs.readFileSync("poster-compositor.js", "utf8");
  [
    "let lastLayerClick",
    "if (drag && !drag.moved)",
    "element.classList.remove(\"direct-layer-dragging\")",
    "const repeatedClick",
    "now - lastLayerClick.at <= 420",
    "if (repeatedClick && isTextLayer(hitLayerId))",
    "enterTextEditing(hitLayerId)"
  ].forEach((token) => assert(compositor.includes(token), token));
});

runTest("poster double-click editing activates the visible synchronized text field", () => {
  const compositor = fs.readFileSync("poster-compositor.js", "utf8");
  const app = fs.readFileSync("poster-app.js", "utf8");
  [
    "editrequest: new Set()",
    "emit(\"editrequest\", { id, text: object.text })"
  ].forEach((token) => assert(compositor.includes(token), token));
  [
    "instance.on(\"editrequest\"",
    "elements.layerText.focus({ preventScroll: false })",
    "elements.layerText.select()",
    "正在编辑"
  ].forEach((token) => assert(app.includes(token), token));
});

runTest("poster monitor supports keyboard nudging when browser extensions intercept dragging", () => {
  const compositor = fs.readFileSync("poster-compositor.js", "utf8");
  [
    "eventSurface.tabIndex = 0",
    "const onKeyDown",
    "ArrowLeft: [-1, 0]",
    "ArrowRight: [1, 0]",
    "ArrowUp: [0, -1]",
    "ArrowDown: [0, 1]",
    "eventSurface.addEventListener(\"keydown\""
  ].forEach((token) => assert(compositor.includes(token), token));
});

runTest("poster workbench exposes reliable directional move controls", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const app = fs.readFileSync("poster-app.js", "utf8");
  const css = fs.readFileSync("poster-compositor.css", "utf8");
  ["poster-layer-nudge-left", "poster-layer-nudge-right", "poster-layer-nudge-up", "poster-layer-nudge-down"].forEach((id) => {
    assert.strictEqual((html.match(new RegExp(`id=[\"']${id}[\"']`, "g")) || []).length, 1, id);
  });
  assert(app.includes("function nudgeSelectedLayer"));
  assert(app.includes("layerNudgeButtons"));
  assert(css.includes(".poster-layer-nudge"));
});

runTest("poster export filename removes path characters", () => {
  assert.strictEqual(
    safePosterExportName(["A/B", "迷雾:码头", "3000x4500", "v001"], "png"),
    "POSTER_A_B_迷雾_码头_3000x4500_v001.png"
  );
});

runTest("poster asset validation separates background and PNG title limits", () => {
  assert(validatePosterFile({ type: "image/jpeg", size: 1024 }, "source").ok);
  assert(validatePosterFile({ type: "image/webp", size: 1024 }, "source").ok);
  assert(!validatePosterFile({ type: "image/svg+xml", size: 1024 }, "source").ok);
  assert(validatePosterFile({ type: "image/png", size: 1024 }, "title").ok);
  assert(!validatePosterFile({ type: "image/jpeg", size: 1024 }, "title").ok);
  assert(!validatePosterDimensions({ width: 13000, height: 1000 }, "source").ok);
  assert(!validatePosterDimensions({ width: 10000, height: 6000 }, "source").ok);
  assert(!validatePosterDimensions({ width: 8000, height: 5000 }, "title").ok);
  assert.deepStrictEqual(metadataWithoutBlob({ id: "asset-1", blob: { private: true }, width: 100 }), { id: "asset-1", width: 100 });
});

runTest("poster compositor UI loads local dependencies and complete controls", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const css = fs.readFileSync("poster-compositor.css", "utf8");
  [
    "poster-source-upload", "poster-source-replace", "poster-source-remove", "poster-source-status",
    "poster-compositor-canvas", "poster-compositor-empty", "poster-view-fit", "poster-view-100",
    "poster-guides-toggle", "poster-title-asset-upload", "poster-title-asset-remove",
    "poster-layer-title-cn", "poster-layer-title-en", "poster-layer-title-image",
    "poster-layer-visible", "poster-layer-locked", "poster-layer-reset", "poster-layer-size",
    "poster-layer-letter-spacing", "poster-layer-line-height", "poster-layer-align",
    "poster-layer-rotation", "poster-layer-opacity", "poster-position-top", "poster-position-center",
    "poster-position-bottom", "poster-position-left-bottom", "poster-position-right-bottom",
    "poster-undo", "poster-redo", "poster-export-format", "poster-export-summary", "poster-download"
  ].forEach((id) => assert.strictEqual((html.match(new RegExp(`id=[\"']${id}[\"']`, "g")) || []).length, 1, `expected #${id} once`));
  const fabricIndex = html.indexOf('src="vendor/fabric-7.4.0.min.js"');
  const assetIndex = html.indexOf('src="poster-asset-store.js');
  const compositorIndex = html.indexOf('src="poster-compositor.js');
  const appIndex = html.indexOf('src="poster-app.js');
  assert(fabricIndex > 0 && fabricIndex < assetIndex && assetIndex < compositorIndex && compositorIndex < appIndex);
  assert(!html.includes("cdn.jsdelivr.net/npm/fabric"));
  [".poster-compositor-stage", ".poster-layer-list", ".poster-compositor-guides", ".poster-compositor-empty", "@media (max-width: 480px)"].forEach((token) => assert(css.includes(token), token));
});

runTest("poster project assets stay outside JSON blobs and collect for cleanup", () => {
  const project = { workspaces: { poster: { posterCompositor: {
    sourceAsset: { id: "poster-source-1", name: "poster.jpg" },
    titleAsset: { id: "poster-title-1", name: "title.png" }
  } } } };
  assert.deepStrictEqual(collectProjectPosterAssetIds(project), ["poster-source-1", "poster-title-1"]);
  assert.deepStrictEqual(collectProjectPosterAssetIds({ workspaces: { poster: { posterCompositor: { sourceAsset: { blob: "forbidden" } } } } }), []);
});

runTest("poster output ratios use centered pixel crops without stretching", () => {
  assert.deepStrictEqual(calculateCenterCrop(1200, 800, "1:1"), {
    width: 800, height: 800, offsetX: -200, offsetY: 0
  });
  assert.deepStrictEqual(calculateCenterCrop(800, 1200, "16:9"), {
    width: 800, height: 450, offsetX: 0, offsetY: -375
  });
  assert.deepStrictEqual(calculateCenterCrop(1024, 1536, "2:3"), {
    width: 1024, height: 1536, offsetX: 0, offsetY: 0
  });
});

runTest("poster Chinese and English layers persist independent font styles", () => {
  const normalized = normalizePosterCompositorState({ layers: {
    "title-cn": { fontStyleKey: "calligraphy" },
    "title-en": { fontStyleKey: "condensed" }
  } });
  assert.strictEqual(normalized.layers["title-cn"].fontStyleKey, "calligraphy");
  assert.strictEqual(normalized.layers["title-en"].fontStyleKey, "condensed");
  const html = fs.readFileSync("index.html", "utf8");
  const app = fs.readFileSync("poster-app.js", "utf8");
  assert(html.includes('id="poster-layer-font-style"'));
  assert(app.includes("applyTypographyToLayer"));
  assert(app.includes('poster-preview-title-cn custom-font-${chineseFontStyle}'));
  assert(app.includes('poster-preview-title-en custom-font-${englishFontStyle}'));
});

runTest("poster compositor recalculates text geometry after every font change", () => {
  const compositor = fs.readFileSync("poster-compositor.js", "utf8");
  const app = fs.readFileSync("poster-app.js", "utf8");
  ["cn-display-serif", "cn-hei", "cn-fangsong", "cn-rounded", "object.initDimensions?.()"].forEach((token) => {
    assert(compositor.includes(token), token);
  });
  ["fontFamily: \"cn-display-serif\"", "fontFamily: \"cn-playful\"", "letterSpacing: 140"].forEach((token) => {
    assert(app.includes(token), token);
  });
});

runTest("poster compositor loads bundled Chinese display fonts before drawing", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const css = fs.readFileSync("poster-compositor.css", "utf8");
  const compositor = fs.readFileSync("poster-compositor.js", "utf8");
  const app = fs.readFileSync("poster-app.js", "utf8");
  ["MaShanZheng-Regular.ttf", "ZCOOLKuaiLe-Regular.ttf", "ZCOOLQingKeHuangYou-Regular.ttf"].forEach((file) => {
    assert(fs.existsSync(`assets/fonts/${file}`), file);
    assert(css.includes(file), file);
  });
  ["cn-brush", "cn-display", "cn-playful", "ensureBundledFonts", "await ensureBundledFonts()"].forEach((token) => assert(compositor.includes(token), token));
  ["fontFamily: \"cn-brush\"", "fontFamily: \"cn-display\"", "fontFamily: \"cn-playful\""].forEach((token) => assert(app.includes(token), token));
  assert(html.includes("poster-layer-delete-v25"));
});

runTest("poster upload mode distinguishes editable fonts from AI title-mark prompts", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const app = fs.readFileSync("poster-app.js", "utf8");
  const css = fs.readFileSync("poster-compositor.css", "utf8");
  assert(html.includes(">可编辑字体</button>"));
  assert(html.includes(">AI字标生成</button>"));
  assert(app.includes('state.titleLibraryView = "title"'));
  assert(app.includes("applyTypographyToLayer(compositorState.selectedLayer, template.fontKey)"));
  assert(css.includes("grid-template-columns: repeat(3, minmax(0, 1fr))"));
});

runTest("poster projects reopen directly in the uploaded-image text compositor", () => {
  const app = fs.readFileSync("poster-app.js", "utf8");
  const css = fs.readFileSync("poster-three-column.css", "utf8");
  [
    "parameterScroll",
    "parameterGroups",
    "compositorControls",
    'state.titleLibraryView = "title"',
    "group.open = group === elements.compositorControls",
    'classList.toggle("is-compositor-mode", hasSource)'
  ].forEach((token) => assert(app.includes(token), token));
  assert(css.includes(".poster-parameter-scroll.is-compositor-mode .poster-compositor-controls"));
  assert(css.includes("order: -1"));
});

runTest("poster dynamic text layers select after creation and delete from button or keyboard", () => {
  const compositor = fs.readFileSync("poster-compositor.js", "utf8");
  const app = fs.readFileSync("poster-app.js", "utf8");
  [
    'event.key === "Delete"',
    'event.key === "Backspace"',
    "TEXT_LAYER_ID.test(state.selectedLayer)",
    "removeLayer(state.selectedLayer)"
  ].forEach((token) => assert(compositor.includes(token), token));
  [
    "const createdId = compositor?.addText",
    "state.compositor.selectedLayer = createdId",
    "compositor?.selectLayer(createdId)",
    "const removed = compositor?.removeLayer(id)",
    'elements.layerList.addEventListener("keydown"',
    '!/^text-/.test(button.dataset.posterLayer || "")',
    "compositor?.removeLayer(button.dataset.posterLayer)"
  ].forEach((token) => assert(app.includes(token), token));
});

runTest("poster layer editor keeps multiline input in the visible synchronized textarea", () => {
  const compositor = fs.readFileSync("poster-compositor.js", "utf8");
  const app = fs.readFileSync("poster-app.js", "utf8");
  [
    "editable: false",
    "emit(\"editrequest\", { id, text: object.text })",
    "return setLayerText(id, `${state.layers[id].text || \"\"}\\n`)"
  ].forEach((token) => assert(compositor.includes(token), token));
  [
    "textarea.selectionStart",
    "textarea.selectionEnd",
    "const nextText",
    "textarea.setSelectionRange(start + 1, start + 1)"
  ].forEach((token) => assert(app.includes(token), token));
  assert(!compositor.includes("onInlineEditingKeyDown"));
});

runTest("legacy poster layers inherit the saved global font direction", () => {
  const migrated = migratePosterLayerFontStyles({ layers: {
    "title-cn": { letterSpacing: -10 },
    "title-en": { letterSpacing: 50 }
  } }, "horror");
  assert.strictEqual(migrated.layers["title-cn"].fontStyleKey, "horror");
  assert.strictEqual(migrated.layers["title-en"].fontStyleKey, "horror");
  const existing = migratePosterLayerFontStyles({ layers: {
    "title-cn": { fontStyleKey: "calligraphy" },
    "title-en": { fontStyleKey: "condensed" }
  } }, "horror");
  assert.strictEqual(existing.layers["title-cn"].fontStyleKey, "calligraphy");
  assert.strictEqual(existing.layers["title-en"].fontStyleKey, "condensed");
});

runTest("poster text layers switch cleanly between multiline editing and dragging", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const compositor = fs.readFileSync("poster-compositor.js", "utf8");
  const app = fs.readFileSync("poster-app.js", "utf8");
  const previewCss = fs.readFileSync("poster-three-column.css", "utf8");
  assert(html.includes('<textarea id="poster-title"'));
  assert(html.includes('<textarea id="poster-english-title"'));
  assert(html.includes('id="poster-layer-edit-text"'));
  assert(compositor.includes("enterTextEditing"));
  assert(compositor.includes("finishTextEditing"));
  assert(compositor.includes("fontWeight"));
  assert(app.includes("COMPOSITOR_FONT_PRESETS"));
  assert(app.includes("applyCompositorTypography"));
  assert(app.includes("custom-font-${elements.font.value}"));
  assert(app.includes("compositor?.finishTextEditing()"));
  assert(previewCss.includes("white-space: pre-line"));
  assert(previewCss.includes(".custom-font-calligraphy"));
});

runTest("poster title controls persist and compose abstracted typography prompts", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const source = fs.readFileSync("poster-app.js", "utf8");
  [
    "poster-title-language",
    "poster-english-title",
    "poster-title-material",
    "poster-title-template-summary",
    "poster-title-references"
  ].forEach((id) => {
    assert.strictEqual((html.match(new RegExp(`id=["']${id}["']`, "g")) || []).length, 1, `expected #${id} once`);
  });
  [
    "normalizePosterTitleState",
    "TITLE_MATERIALS",
    "titleLibraryView: state.titleLibraryView",
    "titleCategory: state.titleCategory",
    "titleLanguage: state.titleLanguage",
    "titleTemplate: state.titleTemplate",
    "englishTitle: elements.englishTitle.value",
    "titleMaterial: elements.titleMaterial.value",
    "titleTemplate.promptRule",
    "titleTemplate.negativeRule",
    "titleMaterial.rule"
  ].forEach((contract) => assert(source.includes(contract), `missing ${contract}`));
  const typographyBody = source.match(/function typographyRule\(\) \{([\s\S]*?)\n  \}/)?.[1] || "";
  assert(!typographyBody.includes("titleTemplate.references"), "reference films must not enter generated prompt");
  assert(source.includes('state.titleTemplate = "cn-condensed-crime"'));
  assert(source.includes('elements.englishTitle.value = "THE SILENT HARBOR"'));
});

runTest("poster controller exposes accessible persistent draggable columns", () => {
  const source = fs.readFileSync("poster-app.js", "utf8");
  [
    "pointerdown", "setPointerCapture", "ArrowLeft", "ArrowRight", "dblclick",
    "--poster-left-width", "--poster-right-width", "leftWidth", "rightWidth",
    "aria-valuenow"
  ].forEach((contract) => assert(source.includes(contract), `missing ${contract}`));
  const exportBody = source.match(/exportState\(\) \{([\s\S]*?)\n\s*\},\n\s*importState/)?.[1] || "";
  assert(exportBody.includes("layout:"));
  assert(source.includes("saved.layout"));
});

runTest("commercial foundation exposes projects, transfers, and validation", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const coreSource = fs.readFileSync("workspace-core.js", "utf8");
  const cameraSource = fs.readFileSync("camera-app.js", "utf8");
  const castingSource = fs.readFileSync("casting-app.js", "utf8");
  const posterSource = fs.readFileSync("poster-app.js", "utf8");
  assert(html.includes('id="project-center-open"'));
  assert(html.includes('id="project-list"'));
  assert(html.includes('id="project-export"'));
  assert(html.includes('id="project-import"'));
  assert(html.includes('id="tone-send-camera"'));
  assert(html.includes('id="tone-send-poster"'));
  assert(html.includes('id="casting-send-camera"'));
  assert(html.includes('id="casting-send-poster"'));
  assert(html.includes('src="workspace-core.js'));
  assert(coreSource.includes("localStorage"));
  assert(coreSource.includes("captureWorkspaces"));
  assert(coreSource.includes("exportProjects"));
  assert(coreSource.includes("importProjects"));
  assert(coreSource.includes('button.disabled = false'));
  assert(coreSource.includes('classList.toggle("requires-input"'));
  assert(coreSource.includes('showToast(message)'));
  assert(cameraSource.includes("aigcCameraWorkbench"));
  assert(castingSource.includes("aigcCastingWorkbench"));
  assert(posterSource.includes("aigcPosterWorkbench"));
  assert(cameraSource.includes("还需完成"));
  assert(castingSource.includes("角色身份信息完整"));
  assert(posterSource.includes("海报信息完整"));
});

runTest("tone selection defaults to one look and bounds deliberate blending", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const appSource = fs.readFileSync("app.js", "utf8");
  assert(html.includes('id="tone-blend-toggle"'));
  assert(appSource.includes("blendMode: false"));
  assert(appSource.includes("state.selected = [item]"));
  assert(appSource.includes("slice(-2)"));
  assert(appSource.includes("第一个选择为主影调，占70%"));
  assert(appSource.includes("第二个选择为辅助影调，占30%"));
  assert(appSource.includes("restored.slice(-1)"));
});

runTest("index exposes the eight-dimension reverse prompt workspace", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const reverseSource = fs.readFileSync("reverse-app.js", "utf8");
  const coreSource = fs.readFileSync("workspace-core.js", "utf8");
  assert(html.includes('data-workspace="reverse"'));
  assert(html.includes('id="reverse-workspace"'));
  assert(html.includes('id="reverse-image-input"'));
  assert(html.includes('id="reverse-purpose"'));
  assert(html.includes('id="reverse-fidelity"'));
  assert(html.includes('id="reverse-output"'));
  assert(html.includes('src="reverse-app.js'));
  ["主体特征", "构图方式", "镜头角度", "光线方向", "色彩搭配", "材质细节", "画面风格", "背景元素"].forEach((dimension) => {
    assert(reverseSource.includes(dimension));
  });
  assert(reverseSource.includes("请不要只描述图片里有什么"));
  assert(reverseSource.includes("完整中文复刻提示词"));
  assert(reverseSource.includes("限定负面词"));
  assert(reverseSource.includes("技术参数摘要"));
  assert(reverseSource.includes("不上传服务器"));
  assert(reverseSource.includes("aigcReverseWorkbench"));
  assert(coreSource.includes("reverse: root.aigcReverseWorkbench"));
});

runTest("cinematic console keeps local assets, navigation, and motion fallbacks", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const theme = fs.readFileSync("cinematic.css", "utf8");
  const motion = fs.readFileSync("ui-motion.js", "utf8");
  const cameraSource = fs.readFileSync("camera-app.js", "utf8");
  assert(html.includes('class="workspace-header workspace-commandbar"'));
  assert(html.includes('src="vendor/lucide.min.js"'));
  assert(html.includes('src="ui-motion.js'));
  assert(fs.existsSync("assets/cinematic-control-room.jpg"));
  assert(fs.existsSync("vendor/lucide.min.js"));
  assert(theme.includes("Cinematic console theme"));
  assert(theme.includes("prefers-reduced-motion"));
  assert(theme.includes("cinematic-control-room.jpg"));
  assert(theme.includes('data-active-workspace="camera"'));
  assert(theme.includes("--workspace-secondary"));
  assert(theme.includes("output-scanning"));
  assert(theme.includes("Softer graphite studio"));
  assert(theme.includes("Global horizontal filmmaker console"));
  assert(theme.includes("#151b20"));
  assert(motion.includes("LOOK DEVELOPMENT"));
  assert(motion.includes("ensureButtonIcon"));
  assert(motion.includes("triggerOutputScan"));
  assert(motion.includes('dataset.activeWorkspace'));
  const navigationSource = fs.readFileSync("workspace-navigation.js", "utf8");
  assert(navigationSource.includes("aigcWorkspaceNavigation"));
  assert(!cameraSource.includes("state.workspace = nextWorkspace"));
  assert(!cameraSource.includes("function renderWorkspace()"));
});

runTest("search finds Chinese director and visual keyword", () => {
  const results = searchItems(promptData, "王家卫 雨夜");
  assert(results.some((item) => item.name.includes("王家卫")));
  assert(results.some((item) => item.prompt.includes("雨")));
});

runTest("directors have country labels and can be filtered by country", () => {
  assert(promptData.directors.every((item) => item.country));
  const japaneseDirectors = searchItems(promptData, "", "directors", "日本");
  assert(japaneseDirectors.length >= 5);
  assert(japaneseDirectors.every((item) => item.country === "日本"));
  assert(japaneseDirectors.some((item) => item.name.includes("黑泽明")));
});

runTest("can import premium TOP100 styles into search", () => {
  const imported = {
    ...promptData,
    premiumTypes: premiumTypeStyles,
  };
  const results = searchItems(imported, "P001 克制现实主义", "premiumTypes");
  assert(results.length >= 1);
  assert(results[0].id === "P001");
  assert(results[0].name.includes("克制现实主义"));
});

runTest("premium styles include searchable reference films", () => {
  const imported = {
    ...promptData,
    premiumTypes: premiumTypeStyles,
  };
  const first = premiumTypeStyles.find((item) => item.id === "P001");
  assert(Array.isArray(first.references));
  assert(first.references.length >= 2);
  const results = searchItems(imported, "一次别离", "premiumTypes");
  assert(results.some((item) => item.id === "P001"));
});

runTest("upgraded items expose structured film prompt fields", () => {
  const director = promptData.directors.find((item) => item.name.includes("王家卫"));
  const upgradedDirector = upgradeItem({ ...director, category: "directors" });
  ["scenarios", "color", "lighting", "camera", "texture", "avoid", "intensity"].forEach((key) => {
    assert(upgradedDirector[key], `missing ${key}`);
  });
  assert(!upgradedDirector.copyPrompt.includes("参考 Wong Kar-wai"));
  assert(upgradedDirector.copyPrompt.includes("色调："));
  assert(upgradedDirector.intensity.realistic);
  assert(upgradedDirector.intensity.cinematic);
  assert(upgradedDirector.intensity.stylized);
});

runTest("director cards include searchable representative films", () => {
  const director = promptData.directors.find((item) => item.id === "D001");
  const upgraded = upgradeItem({ ...director, category: "directors" });
  assert(Array.isArray(upgraded.references));
  assert(upgraded.references.length === 3);
  assert(upgraded.references.some((reference) => reference.includes("2001太空漫游")));
  assert(upgraded.references.some((reference) => reference.includes("闪灵")));
  const results = searchItems(promptData, "闪灵", "directors");
  assert(results.some((item) => item.id === "D001"));
});

runTest("type library includes a dedicated suspense and mystery cluster", () => {
  const mysteryTypes = promptData.types.filter((item) => /悬疑|推理|侦探|刑侦|密室/.test(`${item.name} ${(item.tags || []).join(" ")}`));
  assert(mysteryTypes.length >= 8);
  assert(mysteryTypes.some((item) => item.name.includes("悬疑片")));
  assert(mysteryTypes.some((item) => item.name.includes("密室悬疑")));
  assert(mysteryTypes.some((item) => item.name.includes("刑侦悬疑")));
  mysteryTypes.forEach((item) => {
    assert(Array.isArray(item.references) && item.references.length >= 2, `${item.id} missing references`);
  });
  const results = searchItems(promptData, "密室悬疑", "types");
  assert(results.some((item) => item.name.includes("密室悬疑")));
});

runTest("type library includes animation film tone styles", () => {
  const animationTypes = promptData.types.filter((item) => /动画|赛璐璐|定格|水墨|迪士尼|皮克斯|宫崎骏|吉卜力|国风/.test(`${item.name} ${(item.tags || []).join(" ")}`));
  assert(animationTypes.length >= 16);
  assert(animationTypes.some((item) => item.name.includes("迪士尼")));
  assert(animationTypes.some((item) => item.name.includes("皮克斯")));
  assert(animationTypes.some((item) => item.name.includes("宫崎骏") || item.name.includes("吉卜力")));
  assert(animationTypes.some((item) => item.name.includes("新海诚")));
  assert(animationTypes.some((item) => item.name.includes("今敏")));
  assert(animationTypes.some((item) => item.name.includes("定格动画")));
  assert(animationTypes.some((item) => item.name.includes("东方水墨")));
  assert(animationTypes.some((item) => item.name.includes("中国国风")));
  animationTypes.forEach((item) => {
    assert(Array.isArray(item.references) && item.references.length >= 2, `${item.id} missing references`);
  });
  const disneyResults = searchItems(promptData, "迪士尼", "types");
  assert(disneyResults.some((item) => item.name.includes("迪士尼")));
  const pixarResults = searchItems(promptData, "皮克斯", "types");
  assert(pixarResults.some((item) => item.name.includes("皮克斯")));
  const ghibliResults = searchItems(promptData, "宫崎骏", "types");
  assert(ghibliResults.some((item) => item.name.includes("宫崎骏")));
  const celResults = searchItems(promptData, "新海诚", "types");
  assert(celResults.some((item) => item.name.includes("新海诚")));
  const chineseResults = searchItems(promptData, "中国 国风", "types");
  assert(chineseResults.some((item) => item.name.includes("中国国风")));
  const stopMotionResults = searchItems(promptData, "鬼妈妈", "types");
  assert(stopMotionResults.some((item) => item.name.includes("定格") || item.name.includes("暗黑奇幻")));
});

runTest("premium references are upgraded with release years", () => {
  const upgraded = upgradeItem({ ...premiumTypeStyles[0], category: "premiumTypes" });
  upgraded.references.forEach((reference) => {
    assert(/\d{4}/.test(reference), `premium reference is missing year: ${reference}`);
  });
});

runTest("can import Chinese film and drama styles into search", () => {
  const imported = {
    ...promptData,
    chineseDrama: chineseDramaStyles,
  };
  assert(chineseDramaStyles.length >= 40);
  assert(chineseDramaStyles.every((item) => item.group && item.prompt && item.audit));
  assert(chineseDramaStyles.every((item) => Array.isArray(item.references) && item.references.length >= 2));
  const results = searchItems(imported, "山海情", "chineseDrama");
  assert(results.some((item) => item.name.includes("乡村")));
});

runTest("Chinese style audit text is searchable and included in composed prompts", () => {
  const imported = {
    ...promptData,
    chineseDrama: chineseDramaStyles,
  };
  const results = searchItems(imported, "大光比 侧光", "chineseDrama");
  const powerStyle = results.find((item) => item.name.includes("沉郁权谋"));
  assert(powerStyle);
  const output = composePrompt({
    subject: "朝堂内，一位官员在烛光下沉默",
    selectedItems: [{ ...powerStyle, category: "chineseDrama" }],
    mood: "压抑、肃杀",
    extra: "古装正剧质感",
    negatives: ["避免塑料古偶感"],
  });
  assert(output.includes("沉郁权谋"));
  assert(output.includes("单片参考"));
  assert(!output.includes("参考作品"));
  assert(output.includes("校正"));
});

runTest("Chinese reference titles include release years", () => {
  chineseDramaStyles.forEach((item) => {
    item.references.forEach((reference) => {
      assert(/\d{4}/.test(reference), `${item.id} reference is missing year: ${reference}`);
    });
  });
});

runTest("Chinese regional visual styles are available", () => {
  const imported = {
    ...promptData,
    chineseDrama: chineseDramaStyles,
  };
  const results = searchItems(imported, "西北 风沙", "chineseDrama");
  assert(results.some((item) => item.name.includes("西北")));
});

runTest("result reference and audit text stay in normal card flow", () => {
  const css = fs.readFileSync("style.css", "utf8");
  assert(css.includes(".result-refs,"));
  assert(css.includes("overflow-wrap: anywhere"));
  assert(css.includes("overflow: hidden"));
  assert(css.includes("white-space: normal"));
  assert(css.includes("word-break: break-word"));
  assert(css.includes(".reference-line"));
  assert(css.includes("display: block"));
  assert(css.includes("min-height: 92px"));
  assert(css.includes("overflow: visible"));
  assert(css.includes("min-width: 0"));
});

runTest("premium card references render as separate single-film prompts", () => {
  const upgraded = upgradeItem({ ...premiumTypeStyles[0], category: "premiumTypes" });
  const compacted = compactReferences(upgraded.references);
  const lines = referencePromptLines(upgraded);
  const rendered = renderReferenceFilms(upgraded);
  assert(compacted.includes("一次别离（2011）"));
  assert(compacted.includes("小偷家族（2018）"));
  assert(compacted.includes("海边的曼彻斯特（2016）"));
  assert(!compacted.includes("等 3 部"));
  assert(lines.length === 3);
  assert(lines[0].includes("只参考《一次别离（2011）》"));
  assert(!lines[0].includes("小偷家族"));
  assert(lines[1].includes("只参考《小偷家族（2018）》"));
  assert((rendered.match(/reference-line/g) || []).length === 3);
  assert(rendered.includes("参考1：只参考"));
  assert(rendered.includes("不混合其他参考片"));
  assert(upgraded.copyPrompt.includes("单片参考"));
  assert(!upgraded.copyPrompt.includes("小偷家族（2018）"));
});

runTest("library cards render six-part prompt detail fields", () => {
  const upgraded = upgradeItem({ ...premiumTypeStyles[0], category: "premiumTypes" });
  assert.strictEqual(typeof renderPromptDetails, "function");
  const rendered = renderPromptDetails(upgraded);
  ["色调", "光影", "镜头", "材质", "适合", "避免"].forEach((label) => {
    assert(rendered.includes(`<b>${label}</b>`), `missing detail label: ${label}`);
  });
  const css = fs.readFileSync("style.css", "utf8");
  assert(css.includes(".result-detail-grid"));
  assert(css.includes(".detail-item"));
  assert(css.includes(".detail-value"));
});

runTest("result cards stay in normal flow when hovered or focused", () => {
  const css = fs.readFileSync("style.css", "utf8");
  assert(!css.includes("translateY("));
  assert(css.includes("position: relative"));
  assert(css.includes("overflow: hidden"));
  assert(css.includes("isolation: isolate"));
});

runTest("library results use stable rows and compact cards", () => {
  const css = fs.readFileSync("style.css", "utf8");
  const app = fs.readFileSync("app.js", "utf8");
  assert(css.includes("grid-template-rows: auto auto auto auto 1fr"));
  assert(css.includes(".result-summary"));
  assert(css.includes(".result-premiumTypes"));
  assert(css.includes(".result-directors"));
  assert(css.includes("min-height: 410px"));
  assert(css.includes(".result-chineseDrama"));
  assert(css.includes(".result-chineseDrama .result-refs"));
  assert(!app.includes("result-structure\"><b>适用"));
  assert(app.includes("renderPromptDetails(upgraded)"));
  assert(app.includes("result-${upgraded.category}"));
});

runTest("result cards avoid native button clipping", () => {
  const app = fs.readFileSync("app.js", "utf8");
  const css = fs.readFileSync("style.css", "utf8");
  assert(app.includes('document.createElement("article")'));
  assert(app.includes('setAttribute("role", "button")'));
  assert(app.includes("tabIndex = 0"));
  assert(css.includes("cursor: pointer"));
});

runTest("composePrompt combines selected items into a usable prompt", () => {
  const director = promptData.directors.find((item) => item.name.includes("王家卫"));
  const type = promptData.types.find((item) => item.name.includes("心理惊悚"));
  const scene = promptData.scenes.find((item) => item.name.includes("雨夜街道"));
  const output = composePrompt({
    subject: "海边旧旅馆，一个女人回头看",
    selectedItems: [director, type, scene],
    mood: "孤独、暧昧、危险",
    extra: "宽银幕构图，真实电影摄影",
    negatives: ["避免卡通感", "避免过曝", "避免塑料皮肤"],
  });

  assert(output.includes("海边旧旅馆"));
  assert(output.includes("王家卫"));
  assert(output.includes("心理惊悚"));
  assert(output.includes("雨夜街道"));
  assert(output.includes("色调："));
  assert(output.includes("光影："));
  assert(output.includes("镜头："));
  assert(output.includes("孤独、暧昧、危险"));
  assert(output.includes("避免卡通感"));
});

runTest("look studio keeps search favorites versions and monitor shell wired", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const app = fs.readFileSync("app.js", "utf8");
  const studio = fs.readFileSync("look-studio.js", "utf8");
  const css = fs.readFileSync("look-studio.css", "utf8");

  assert(html.includes('id="command-center"'));
  assert(html.includes('class="look-preview-pane"'));
  assert(html.includes('id="look-monitor"'));
  assert(html.includes('class="look-compare-strip"'));
  assert(html.includes('class="look-dna-grid"'));
  assert(html.includes('src="look-studio.js?'));
  assert(html.includes('href="look-studio.css?'));
  assert(app.includes("favoriteKeys"));
  assert(app.includes("saveVersion"));
  assert(app.includes("getSearchItems"));
  assert(studio.includes('document.querySelector("#command-center")'));
  assert(studio.includes('document.querySelector("#look-version-list")'));
  assert(studio.includes('document.querySelector("#look-dna-light")'));
  assert(css.includes("#tone-workspace.app-shell"));
  assert(css.includes(".command-center"));
  assert(css.includes("prefers-reduced-motion"));
});

runTest("layout keeps both information rails readable", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const studio = fs.readFileSync("look-studio.js", "utf8");
  const archive = fs.readFileSync("archive.css", "utf8");

  assert(!html.includes("archive.css"));
  assert(archive.includes("grid-template-columns: minmax(340px, .95fr) minmax(500px, 1.2fr) minmax(400px, 1fr)"));
  assert(archive.includes(".result-directors,"));
  assert(archive.includes("max-height: none !important"));
  assert(archive.includes("overflow: visible !important"));
  assert(archive.includes(".pane-collapse"));
  assert(studio.includes('setPaneCollapsed("library", false)'));
  assert(studio.includes('setPaneCollapsed("composer", false)'));
});

runTest("casting asset store defines persistent image limits and CRUD", () => {
  const source = fs.readFileSync("casting-asset-store.js", "utf8");
  ["image/jpeg", "image/png", "image/webp", "15 * 1024 * 1024", "indexedDB", "prepareImage", "storeExample", "put", "get", "remove"]
    .forEach((contract) => assert(source.includes(contract), `missing ${contract}`));
  assert(!source.includes("localStorage.setItem"));
});

runTest("casting workspace exposes a persistent reference upload surface", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const theme = fs.readFileSync("casting-option-3.css", "utf8");
  ["casting-reference-file", "casting-upload-empty", "casting-asset-meta", "casting-replace-image", "casting-remove-image", "casting-upload-error", "casting-roster-current-image"]
    .forEach((id) => assert(html.includes(`id="${id}"`), `missing #${id}`));
  assert(html.includes('accept="image/jpeg,image/png,image/webp"'));
  assert(html.includes('src="casting-asset-store.js'));
  assert(theme.includes(".is-dragging"));
  assert(theme.includes("object-fit: contain"));
});

runTest("casting controller persists and restores reference asset metadata", () => {
  const source = fs.readFileSync("casting-app.js", "utf8");
  ["referenceAsset", "handleReferenceFile", "restoreReferenceAsset", "clearReferenceAsset", "persistWorkspaceNow", "referenceAssetId"]
    .forEach((contract) => assert(source.includes(contract), `missing ${contract}`));
  assert(source.includes("URL.revokeObjectURL"));
  assert(!/identityImage\.src\s*=\s*["']assets\/casting-char-001-board\.png/.test(source));
});

runTest("workspace core saves asynchronous workbench asset changes", () => {
  const source = fs.readFileSync("workspace-core.js", "utf8");
  assert(source.includes('addEventListener("aigc:workspace-dirty"'));
  assert(source.includes("persistNow"));
  assert(source.includes("cleanupCastingAssetIfUnreferenced"));
  assert(source.includes("本地图片素材未包含"));
});

runTest("casting asset cleanup retains cross-project and saved-version references", () => {
  const projects = [
    {
      id: "project-active",
      workspaces: {
        casting: {
          referenceAsset: { id: "asset-old" },
          versions: []
        }
      }
    },
    {
      id: "project-duplicate",
      workspaces: {
        casting: {
          referenceAsset: { id: "asset-shared" },
          versions: []
        }
      }
    }
  ];
  const liveCastingState = {
    referenceAsset: { id: "asset-new" },
    versions: [{ referenceAssetId: "asset-old" }]
  };

  const savedVersion = decideCastingAssetRetention({
    projects,
    activeProjectId: "project-active",
    liveCastingState,
    assetId: "asset-old"
  });
  const duplicateProject = decideCastingAssetRetention({
    projects,
    activeProjectId: "project-active",
    liveCastingState,
    assetId: "asset-shared"
  });
  const unreferenced = decideCastingAssetRetention({
    projects,
    activeProjectId: "project-active",
    liveCastingState,
    assetId: "asset-unused"
  });
  const uncertain = decideCastingAssetRetention({
    projects: [{ id: "project-active", workspaces: { casting: { versions: "unknown" } } }],
    activeProjectId: "project-active",
    liveCastingState: { referenceAsset: null, versions: "unknown" },
    assetId: "asset-uncertain"
  });

  assert.deepStrictEqual(savedVersion, { retain: true, reason: "saved-version" });
  assert.deepStrictEqual(duplicateProject, { retain: true, reason: "project-reference" });
  assert.deepStrictEqual(unreferenced, { retain: false, reason: "unreferenced" });
  assert.deepStrictEqual(uncertain, { retain: true, reason: "uncertain" });
});

runTest("casting asset cleanup fails closed when the active live state is unavailable", () => {
  const projects = [{
    id: "project-active",
    workspaces: {
      casting: {
        referenceAsset: { id: "asset-live" },
        versions: []
      }
    }
  }];

  assert.deepStrictEqual(decideCastingAssetRetention({
    projects,
    activeProjectId: "project-active",
    liveCastingState: undefined,
    assetId: "asset-live"
  }), { retain: true, reason: "uncertain" });
});

runTest("casting reference mode requires a restored preview before copy or version save", () => {
  const source = fs.readFileSync("casting-app.js", "utf8");
  assert(source.includes("missing.push(...getCastingSourceValidation(state.source, state.referenceAsset, state.previewUrl))"));
});

runTest("Load Example is disabled and guarded before changing casting fields", () => {
  const source = fs.readFileSync("casting-app.js", "utf8");
  const loadExample = source.match(/async function loadExample\(\) \{([\s\S]*?)\n  \}/)?.[1] || "";
  const guardIndex = loadExample.indexOf("if (state.assetBusy) return false;");
  const firstMutationIndex = loadExample.indexOf('elements.id.value = "CHAR-001";');

  assert(guardIndex >= 0, "Load Example is missing its busy guard");
  assert(firstMutationIndex >= 0 && guardIndex < firstMutationIndex, "Load Example guards too late");
  assert(source.includes("elements.example.disabled = state.assetBusy"));
});

runTest("reference asset mutation rolls back state and removes the new Blob when persistNow fails", async () => {
  const targetState = {
    assetRequest: 7,
    referenceAsset: { id: "asset-old", name: "old.png" },
    previewUrl: "blob:old"
  };
  const revoked = [];
  const removed = [];
  let stateChanges = 0;

  const result = await persistReferenceAssetMutation({
    targetState,
    request: 7,
    nextAsset: { id: "asset-new", name: "new.webp" },
    nextPreviewUrl: "blob:new",
    persistNow: async () => { throw new Error("quota exceeded"); },
    revokeObjectURL: (url) => revoked.push(url),
    removeOwnedAsset: async (assetId) => { removed.push(assetId); },
    onStateChange: () => { stateChanges += 1; }
  });

  assert.strictEqual(result.committed, false);
  assert.strictEqual(result.rolledBack, true);
  assert.deepStrictEqual(targetState.referenceAsset, { id: "asset-old", name: "old.png" });
  assert.strictEqual(targetState.previewUrl, "blob:old");
  assert.deepStrictEqual(revoked, ["blob:new"]);
  assert.deepStrictEqual(removed, ["asset-new"]);
  assert.strictEqual(stateChanges, 2);
});

runTest("reference asset deletion keeps the old preview and Blob when persistNow fails", async () => {
  const targetState = {
    assetRequest: 3,
    referenceAsset: { id: "asset-old" },
    previewUrl: "blob:old"
  };
  const revoked = [];
  const removed = [];

  const result = await persistReferenceAssetMutation({
    targetState,
    request: 3,
    nextAsset: null,
    nextPreviewUrl: "",
    persistNow: async () => { throw new Error("write failed"); },
    revokeObjectURL: (url) => revoked.push(url),
    removeOwnedAsset: async (assetId) => { removed.push(assetId); }
  });

  assert.strictEqual(result.committed, false);
  assert.deepStrictEqual(targetState.referenceAsset, { id: "asset-old" });
  assert.strictEqual(targetState.previewUrl, "blob:old");
  assert.deepStrictEqual(revoked, []);
  assert.deepStrictEqual(removed, []);
});

runTest("reference asset replacement releases the old preview only after metadata persists", async () => {
  const targetState = {
    assetRequest: 4,
    referenceAsset: { id: "asset-old" },
    previewUrl: "blob:old"
  };
  const order = [];

  const result = await persistReferenceAssetMutation({
    targetState,
    request: 4,
    nextAsset: { id: "asset-new" },
    nextPreviewUrl: "blob:new",
    persistNow: async () => { order.push("persist"); },
    revokeObjectURL: (url) => order.push(`revoke:${url}`),
    removeOwnedAsset: async () => { order.push("remove-new"); },
    onStateChange: () => { order.push("state"); }
  });

  assert.strictEqual(result.committed, true);
  assert.strictEqual(result.cleanupAssetId, "asset-old");
  assert.deepStrictEqual(order, ["state", "persist", "revoke:blob:old"]);
  assert.strictEqual(targetState.previewUrl, "blob:new");
});

runTest("reference asset rollback never overwrites a newly imported project or leaks its old preview", async () => {
  const targetState = {
    assetRequest: 1,
    referenceAsset: { id: "asset-old-project" },
    previewUrl: "blob:old-project"
  };
  const revoked = [];
  const removed = [];
  let rejectPersist;
  const pending = persistReferenceAssetMutation({
    targetState,
    request: 1,
    nextAsset: { id: "asset-new-upload" },
    nextPreviewUrl: "blob:new-upload",
    persistNow: () => new Promise((resolve, reject) => { rejectPersist = reject; }),
    revokeObjectURL: (url) => revoked.push(url),
    removeOwnedAsset: async (assetId) => { removed.push(assetId); }
  });

  targetState.assetRequest = 2;
  targetState.referenceAsset = { id: "asset-imported-project" };
  targetState.previewUrl = "blob:imported-project";
  rejectPersist(new Error("late failure"));
  const result = await pending;

  assert.strictEqual(result.rolledBack, false);
  assert.deepStrictEqual(targetState.referenceAsset, { id: "asset-imported-project" });
  assert.strictEqual(targetState.previewUrl, "blob:imported-project");
  assert.deepStrictEqual(revoked, ["blob:new-upload", "blob:old-project"]);
  assert.deepStrictEqual(removed, ["asset-new-upload"]);
});

runTest("saved role versions restore independent Object URLs and revoke them on eviction", async () => {
  const source = fs.readFileSync("casting-app.js", "utf8");
  const revoked = [];
  const cache = createVersionPreviewCache({
    loadAsset: async (assetId) => ({ blob: { assetId } }),
    createObjectURL: (blob) => `blob:version:${blob.assetId}`,
    revokeObjectURL: (url) => revoked.push(url)
  });

  await cache.sync(["asset-a", "asset-b"]);
  assert.strictEqual(cache.get("asset-a"), "blob:version:asset-a");
  assert.strictEqual(cache.get("asset-b"), "blob:version:asset-b");
  assert.notStrictEqual(cache.get("asset-a"), cache.get("asset-b"));

  await cache.sync(["asset-b"]);
  assert.deepStrictEqual(revoked, ["blob:version:asset-a"]);
  cache.clear();
  assert.deepStrictEqual(revoked, ["blob:version:asset-a", "blob:version:asset-b"]);
  assert(source.includes("versionPreviewCache.get(version.referenceAssetId)"));
  assert(source.includes("versionPreviewCache.clear()"));
  assert(source.includes("restoreVersionPreviews()"));
});

runTest("version preview restoration ignores stale project loads without leaking URLs", async () => {
  let resolveAsset;
  const revoked = [];
  const cache = createVersionPreviewCache({
    loadAsset: () => new Promise((resolve) => { resolveAsset = resolve; }),
    createObjectURL: () => "blob:stale-version",
    revokeObjectURL: (url) => revoked.push(url)
  });

  const pending = cache.sync(["asset-old-project"]);
  cache.clear();
  resolveAsset({ blob: { assetId: "asset-old-project" } });
  await pending;

  assert.strictEqual(cache.get("asset-old-project"), "");
  assert.deepStrictEqual(revoked, []);
});

runTest("version eviction persists metadata before cleaning candidate Blobs", async () => {
  const targetState = {
    versions: Array.from({ length: 20 }, (_, index) => ({
      number: index + 1,
      referenceAssetId: `asset-${index + 1}`
    }))
  };
  const update = appendRoleVersion(targetState, { number: 21, referenceAssetId: "asset-current" });
  const order = [];

  assert.strictEqual(targetState.versions.length, 20);
  assert.deepStrictEqual(update.evictedAssetIds, ["asset-1"]);
  await persistThenCleanup({
    assetIds: update.evictedAssetIds,
    persistMetadata: async () => { order.push("persist"); },
    cleanupAsset: async (assetId) => { order.push(`cleanup:${assetId}`); }
  });
  assert.deepStrictEqual(order, ["persist", "cleanup:asset-1"]);

  let cleanedAfterFailure = false;
  await assert.rejects(() => persistThenCleanup({
    assetIds: ["asset-2"],
    persistMetadata: async () => { throw new Error("persist failed"); },
    cleanupAsset: async () => { cleanedAfterFailure = true; }
  }));
  assert.strictEqual(cleanedAfterFailure, false);
});

runTest("project deletion collects current and historical assets and retains shared references", () => {
  const deletedProject = {
    id: "project-deleted",
    workspaces: {
      casting: {
        referenceAsset: { id: "asset-current" },
        versions: [
          { referenceAssetId: "asset-history" },
          { referenceAssetId: "asset-shared" },
          { referenceAssetId: "asset-history" }
        ]
      }
    }
  };
  const remainingProjects = [
    {
      id: "project-active",
      workspaces: { casting: { referenceAsset: { id: "asset-shared" }, versions: [] } }
    }
  ];

  assert.deepStrictEqual(
    collectProjectCastingAssetIds(deletedProject),
    ["asset-current", "asset-history", "asset-shared"]
  );
  assert.deepStrictEqual(decideCastingAssetRetention({
    projects: remainingProjects,
    activeProjectId: "project-active",
    liveCastingState: remainingProjects[0].workspaces.casting,
    assetId: "asset-shared"
  }), { retain: true, reason: "project-reference" });
  assert.deepStrictEqual(decideCastingAssetRetention({
    projects: remainingProjects,
    activeProjectId: "project-active",
    liveCastingState: remainingProjects[0].workspaces.casting,
    assetId: "asset-history"
  }), { retain: false, reason: "unreferenced" });
});

runTest("project deletion persists the reduced project list before candidate cleanup", async () => {
  const source = fs.readFileSync("workspace-core.js", "utf8");
  const deletedProject = {
    id: "project-deleted",
    workspaces: {
      casting: {
        referenceAsset: { id: "asset-current" },
        versions: [{ referenceAssetId: "asset-history" }]
      }
    }
  };
  const order = [];

  await persistThenCleanup({
    assetIds: collectProjectCastingAssetIds(deletedProject),
    persistMetadata: async () => { order.push("persist-project-list"); },
    cleanupAsset: async (assetId) => { order.push(`query-and-clean:${assetId}`); }
  });

  assert.deepStrictEqual(order, [
    "persist-project-list",
    "query-and-clean:asset-current",
    "query-and-clean:asset-history"
  ]);
  assert(source.includes("collectProjectCastingAssetIds(persistedProject)"));
  assert(source.includes("collectProjectPosterAssetIds(persistedProject)"));
  assert(source.includes("persistThenCleanup({"));
  assert(source.includes('candidate.kind === "poster"'));
  assert(source.includes("cleanupPosterAssetIfUnreferenced(candidate.assetId)"));
});

runTest("image processing re-encodes small opaque images and preserves transparent PNG", () => {
  assert.deepStrictEqual(planImageProcessing({
    type: "image/jpeg",
    width: 1600,
    height: 1200,
    transparent: false
  }), {
    width: 1600,
    height: 1200,
    outputType: "image/webp",
    quality: 0.9,
    shouldEncode: true
  });
  assert.deepStrictEqual(planImageProcessing({
    type: "image/webp",
    width: 1200,
    height: 1600,
    transparent: false
  }), {
    width: 1200,
    height: 1600,
    outputType: "image/webp",
    quality: 0.9,
    shouldEncode: true
  });
  assert.deepStrictEqual(planImageProcessing({
    type: "image/png",
    width: 1200,
    height: 800,
    transparent: true
  }), {
    width: 1200,
    height: 800,
    outputType: "image/png",
    quality: 0.9,
    shouldEncode: false
  });
});

runTest("asset store get resolves only after its readonly transaction completes", () => {
  const source = fs.readFileSync("casting-asset-store.js", "utf8");
  const getBody = source.match(/async function get\(id\) \{([\s\S]*?)\n  \}/)?.[1] || "";
  const completeBody = getBody.match(/transaction\.oncomplete\s*=\s*\(\)\s*=>\s*\{([\s\S]*?)\}/)?.[1] || "";
  const successBody = getBody.match(/request\.onsuccess\s*=\s*\(\)\s*=>\s*\{([\s\S]*?)\n\s*\};/)?.[1] || "";
  assert(completeBody.includes("resolve"));
  assert(!successBody.includes("resolve"));
});

runTest("casting template workbench ships four local visual samples", () => {
  [
    "assets/casting-template-single.png",
    "assets/casting-template-three.png",
    "assets/casting-template-four.png",
    "assets/casting-template-identity-board.png"
  ].forEach((file) => assert(fs.existsSync(file), `missing ${file}`));
});

if (false) { // Legacy timeline-workspace tests retained as migration history.
runTest("music catalog covers every approved production purpose", () => {
  const requiredPurposes = ["film", "series", "short", "documentary", "advertising", "promo", "trailer", "animation", "game", "social"];
  assert.deepStrictEqual(Object.keys(MUSIC_PURPOSES), requiredPurposes);
  requiredPurposes.forEach((purpose) => {
    assert(MUSIC_TEMPLATES.some((template) => template.purpose === purpose), `missing ${purpose} template`);
  });
  assert.strictEqual(MUSIC_TEMPLATES.length, 44);
  MUSIC_TEMPLATES.forEach((template) => {
    ["id", "purpose", "genre", "vocabulary", "name", "scene", "emotion", "instruments", "duration", "bpm"].forEach((key) => {
      assert(template[key] !== undefined, `${template.id || "unknown"} missing ${key}`);
    });
  });
});

runTest("music default filters always expose at least one usable template", () => {
  const source = fs.readFileSync("music-app.js", "utf8");
  assert(MUSIC_TEMPLATES.some((template) => (
    template.purpose === DEFAULT_MUSIC_STATE.purpose &&
    template.genre === DEFAULT_MUSIC_STATE.genre &&
    template.vocabulary === DEFAULT_MUSIC_STATE.vocabulary
  )));
  assert(source.includes("let filters = { genre: state.genre, vocabulary: state.vocabulary };"));
});

runTest("music state normalization rejects malformed imported values", () => {
  const normalized = normalizeMusicState({
    duration: -8,
    bpm: 999,
    timeline: "bad",
    layout: { leftWidth: "wide", rightWidth: 9000 },
    purpose: "unknown"
  });
  assert.strictEqual(normalized.duration, DEFAULT_MUSIC_STATE.duration);
  assert.strictEqual(normalized.bpm, DEFAULT_MUSIC_STATE.bpm);
  assert.deepStrictEqual(normalized.timeline, DEFAULT_MUSIC_STATE.timeline);
  assert.deepStrictEqual(normalized.layout, DEFAULT_MUSIC_STATE.layout);
  assert.strictEqual(normalized.purpose, DEFAULT_MUSIC_STATE.purpose);
});

runTest("music timeline rescales deterministically and validates its full duration", () => {
  const scaled = scaleMusicTimeline(DEFAULT_MUSIC_STATE.timeline, 15, 30);
  assert.deepStrictEqual(scaled.map(({ start, end }) => [start, end]), [[0, 10], [10, 24], [24, 30]]);
  assert.strictEqual(validateMusicState({ ...DEFAULT_MUSIC_STATE, duration: 30, timeline: scaled }).valid, true);
  const invalid = validateMusicState({
    ...DEFAULT_MUSIC_STATE,
    timeline: [{ start: 0, end: 8 }, { start: 7, end: 15 }]
  });
  assert.strictEqual(invalid.valid, false);
  assert(invalid.errors.some((message) => message.includes("交叉")));
});

runTest("music prompt follows the approved instrumental scoring structure", () => {
  const prompt = composeMusicPrompt({
    ...DEFAULT_MUSIC_STATE,
    picture: "冬夜火车站，女调查员终于确认同伴背叛",
    dialogueMode: "dense"
  });
  [
    "【用途与叙事任务】", "【音乐参数】", "【情绪与动态】", "【配器设计】",
    "【分段时间轴】", "【画面与声音关系】", "【结尾】", "【限定词】",
    "0–5秒", "密集对白", "避让人声主要频段", "无演唱", "无歌词", "无人声哼唱", "无旁白"
  ].forEach((text) => assert(prompt.includes(text), `missing ${text}`));
  assert(!prompt.includes("undefined"));
});

runTest("music templates retain the exact approved IDs and enum references", () => {
  assert.deepStrictEqual(MUSIC_TEMPLATES.map((template) => template.id), [
    "film-intimate-drama", "film-psychological-suspense", "film-crime-investigation", "film-epic-war",
    "film-scifi-future", "film-romantic-emotion", "film-horror-lurking", "film-light-comedy",
    "series-family-drama", "series-period-intrigue", "series-urban-emotion", "short-poetic-minimal",
    "short-social-reality", "short-experimental-texture", "documentary-nature", "documentary-humanities",
    "documentary-social-reality", "documentary-biography", "documentary-technology", "advertising-luxury",
    "advertising-technology", "advertising-automotive", "advertising-fashion", "advertising-food",
    "advertising-charity", "promo-city", "promo-tourism", "promo-corporate", "promo-launch",
    "promo-sports", "promo-public-service", "trailer-suspense", "trailer-action-rise", "trailer-emotional",
    "trailer-epic-countdown", "animation-fantasy", "animation-child-comedy", "animation-eastern",
    "game-exploration", "game-combat", "game-future-electronic", "social-hook", "social-dialogue-bed",
    "social-product-demo"
  ]);
  MUSIC_TEMPLATES.forEach((template) => {
    assert(MUSIC_PURPOSES[template.purpose], `${template.id} has an unknown purpose`);
    assert(MUSIC_GENRES[template.genre], `${template.id} has an unknown genre`);
    assert(MUSIC_VOCABULARIES[template.vocabulary], `${template.id} has an unknown vocabulary`);
  });
});

runTest("music data exposes its API as a browser global without CommonJS", () => {
  const browserContext = { window: {} };
  vm.runInNewContext(fs.readFileSync("music-data.js", "utf8"), browserContext, { filename: "music-data.js" });
  const browserApi = browserContext.window.aigcMusicData;
  assert(browserApi);
  assert.strictEqual(browserApi.MUSIC_TEMPLATES.length, 44);
  assert.strictEqual(typeof browserApi.composeMusicPrompt, "function");
  assert.strictEqual(browserApi.MUSIC_PURPOSES.film, "电影");
});

runTest("music validation rejects timeline gaps", () => {
  const validation = validateMusicState({
    ...DEFAULT_MUSIC_STATE,
    timeline: [
      { start: 0, end: 5, task: "建立氛围", texture: "钢琴", dynamic: "pp" },
      { start: 10, end: 15, task: "形成落点", texture: "弦乐", dynamic: "p" }
    ]
  });
  assert.strictEqual(validation.valid, false);
  assert(validation.errors.some((message) => message.includes("空档")));
});

runTest("music extra restrictions stay negative and deduplicated", () => {
  const prompt = composeMusicPrompt({
    ...DEFAULT_MUSIC_STATE,
    extraRestrictions: "模仿某作曲家的风格\n模仿某作曲家的风格"
  });
  const restriction = "进一步避免：模仿某作曲家的风格";
  assert(prompt.includes(restriction));
  assert.strictEqual(prompt.split(restriction).length - 1, 1);
  assert(!prompt.includes("\n模仿某作曲家的风格\n"));
});

runTest("music ignores blank extra restriction lines before adding the negative prefix", () => {
  [
    DEFAULT_MUSIC_STATE,
    { ...DEFAULT_MUSIC_STATE, extraRestrictions: " \n\n\t\n  \n" }
  ].forEach((state) => {
    const prompt = composeMusicPrompt(state);
    assert(!prompt.split("\n").includes("进一步避免："));
  });
});

runTest("music narration avoids video speech while remaining voiceless itself", () => {
  const prompt = composeMusicPrompt({ ...DEFAULT_MUSIC_STATE, dialogueMode: "narration" });
  assert(prompt.includes("成片画面含有旁白"));
  assert(prompt.includes("配乐避让人声主要频段"));
  assert(prompt.includes("生成的音乐本身不含旁白人声"));
  assert(prompt.includes("无旁白"));
});

runTest("music workspace exposes one complete accessible shell", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const ids = [
    "music-workspace", "music-purpose-tabs", "music-genre", "music-vocabulary", "music-template-list", "music-template-count",
    "music-duration", "music-bpm", "music-meter", "music-tonality", "music-emotion-start", "music-emotion-end",
    "music-lead-instrument", "music-support-instruments", "music-excluded-instruments", "music-dynamics", "music-timeline",
    "music-picture", "music-edit-rhythm", "music-dialogue-mode", "music-ending", "music-extra-restrictions",
    "music-validation", "music-output", "music-filename", "music-example", "music-clear", "music-copy"
  ];
  ids.forEach((id) => assert.strictEqual(html.split(`id="${id}"`).length - 1, 1, `expected #${id} once`));
  assert(html.includes('data-workspace="music"'));
  assert(html.includes('href="music-workspace.css?v=20260717-music-workspace-v1"'));
  assert(html.indexOf('src="music-data.js?v=20260717-music-data-v1"') < html.indexOf('src="music-app.js?v=20260717-music-app-v1"'));
  assert(html.indexOf('src="music-app.js?v=20260717-music-app-v1"') < html.indexOf('src="workspace-core.js'));
  const toneCss = fs.readFileSync("tone-option2.css", "utf8");
  assert(cssRuleBody(toneCss, ".workspace-header .mode-switch").includes("grid-template-columns: repeat(6, minmax(82px, 1fr));"));
});

runTest("music workspace participates in navigation, projects, and motion metadata", () => {
  const core = fs.readFileSync("workspace-core.js", "utf8");
  const motion = fs.readFileSync("ui-motion.js", "utf8");
  assert(core.includes("music: root.aigcMusicWorkbench"));
  assert(motion.includes('music: { code: "MUSIC SCORING", title: "音乐配乐" }'));
  assert(motion.includes('music: "#music-workspace .music-output-panel"'));
  assert(motion.includes('"music-copy"'));
});

runTest("music project state remains backwards compatible", () => {
  const core = fs.readFileSync("workspace-core.js", "utf8");
  assert(core.includes("project.workspaces?.[key] || {}"));
  assert(core.includes("captureWorkspaces()"));
  assert(core.includes("Object.entries(api)"));
});

runTest("music app loads before core and legacy projects receive empty music state", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const core = fs.readFileSync("workspace-core.js", "utf8");
  const applyStart = core.indexOf("function applyProjectState(project)");
  const applyEnd = core.indexOf("function formatTime", applyStart);
  const applySource = core.slice(applyStart, applyEnd);
  assert(html.indexOf('src="music-app.js') < html.indexOf('src="workspace-core.js'));
  assert(applySource.includes("Object.entries(api)"));
  assert(applySource.includes("project.workspaces?.[key] || {}"));
});

runTest("music workspace CSS defines balanced responsive columns", () => {
  const css = fs.readFileSync("music-workspace.css", "utf8");
  const panelRule = cssRuleBody(css, "#music-workspace :is(.music-library-panel, .music-structure-panel, .music-output-panel)");
  assert(css.includes("grid-template-columns: var(--music-left-width) 9px minmax(440px, 1fr) 9px var(--music-right-width);"));
  assert(css.includes("@media (max-width: 1180px)"));
  assert(css.includes("@media (max-width: 820px)"));
  assert(css.includes("overflow-x: hidden"));
  assert(panelRule.includes("border: 0;"));
  assert(panelRule.includes("border-radius: 0;"));
  assert(!css.includes("border-radius: 20px"));
});

runTest("music workspace protects compact desktop, accessible rails, and readable metadata", () => {
  const css = fs.readFileSync("music-workspace.css", "utf8");
  const toneCss = fs.readFileSync("tone-option2.css", "utf8");
  const compactStart = css.indexOf("@media (min-width: 1181px) and (max-width: 1320px)");
  const compactRule = compactStart >= 0 ? css.slice(compactStart, css.indexOf("@media (max-width: 1180px)", compactStart)) : "";
  const headerCompactStart = toneCss.indexOf("@media (max-width: 1100px)");
  const headerCompactRule = headerCompactStart >= 0 ? toneCss.slice(headerCompactStart, toneCss.indexOf("@media (max-width: 1024px)", headerCompactStart)) : "";
  const mobileStart = toneCss.indexOf("@media (max-width: 820px)");
  const mobileRule = mobileStart >= 0 ? toneCss.slice(mobileStart) : "";

  assert(compactRule.includes("--music-left-width: 280px;"));
  assert(compactRule.includes("--music-right-width: 420px;"));
  assert(compactRule.includes("grid-template-columns: var(--music-left-width) 9px minmax(420px, 1fr) 9px var(--music-right-width);"));
  assert(compactRule.includes("padding: 8px;"));
  assert(cssRuleBody(css, "#music-workspace .music-output-panel {").includes("overflow-y: auto;"));
  assert(cssRuleBody(css, "#music-workspace .music-output-panel {").includes("overflow-x: hidden;"));
  assert(cssRuleBody(css, "#music-workspace .music-structure-panel {").includes("overflow-y: auto;"));
  assert(cssRuleBody(css, "#music-workspace .music-structure-panel {").includes("overflow-x: hidden;"));
  assert(css.includes("#music-workspace .music-column-resizer:hover::after,"));
  assert(css.includes("#music-workspace .music-column-resizer:focus-visible::after"));
  assert(cssRuleBody(css, "#music-workspace .music-column-resizer:hover::after,").includes("content: attr(aria-label);"));
  assert(mobileRule.includes(".workspace-header .mode-switch"));
  assert(mobileRule.includes("grid-template-columns: repeat(6, minmax(0, 1fr));"));
  assert(mobileRule.includes(".workspace-header .mode-button"));
  assert(mobileRule.includes("min-width: 0;"));
  assert(headerCompactRule.includes(".workspace-header .mode-switch"));
  assert(headerCompactRule.includes("grid-template-columns: repeat(6, minmax(0, 1fr));"));
  assert(headerCompactRule.includes(".workspace-header .mode-button"));
  assert(headerCompactRule.includes("min-width: 0;"));
  [
    "#music-workspace :is(.music-panel-header, .music-output-toolbar, .music-timeline-section > header) :is(span, small)",
    "#music-workspace .music-count",
    "#music-workspace .music-template-card strong",
    "#music-workspace .music-template-meta span",
    "#music-workspace .music-timeline-fields label",
    "#music-workspace .music-file-row",
    "#music-workspace .music-file-row code"
  ].forEach((selector) => assert(cssRuleBody(css, selector).includes("font-size: 11px;"), `${selector} must be at least 11px`));
});

runTest("music controller exposes persistence and production interactions", () => {
  const source = fs.readFileSync("music-app.js", "utf8");
  [
    "aigcMusicData", "aigcMusicWorkbench", "exportState", "importState", "composeMusicPrompt",
    "validateMusicState", "scaleMusicTimeline", "renderPurposeTabs", "renderTemplateList",
    "renderTimeline", "applyTemplate", "loadExample", "clearFields", "aigc:workspace-dirty",
    "pointerdown", "ArrowLeft", "ArrowRight", "dblclick", "aria-valuenow"
  ].forEach((contract) => assert(source.includes(contract), `missing ${contract}`));
});

runTest("music controller never enables copy for an invalid timeline", () => {
  const source = fs.readFileSync("music-app.js", "utf8");
  assert(source.includes("elements.copy.disabled = !validation.valid"));
  assert(source.includes("elements.validation.textContent = validation.errors.join"));
  assert(source.includes('detail: { workspace: "music" }'));
});

function createMusicControllerHarness() {
  const dispatchedEvents = [];
  const elementsBySelector = new Map();
  const rootListeners = new Map();

  function createClassList() {
    const names = new Set();
    return {
      add(name) { names.add(name); },
      remove(name) { names.delete(name); },
      contains(name) { return names.has(name); },
      toggle(name, force) {
        const enabled = force === undefined ? !names.has(name) : Boolean(force);
        if (enabled) names.add(name); else names.delete(name);
        return enabled;
      }
    };
  }

  function createElement({ value = "", dataset = {} } = {}) {
    let currentValue = String(value);
    const listeners = new Map();
    const attributes = new Map();
    const styleValues = new Map();
    const capturedPointers = new Set();
    return {
      dataset,
      classList: createClassList(),
      disabled: false,
      clientWidth: 1440,
      textContent: "",
      innerHTML: "",
      style: {
        setProperty(name, nextValue) { styleValues.set(name, String(nextValue)); },
        getPropertyValue(name) { return styleValues.get(name) || ""; },
        removeProperty(name) { styleValues.delete(name); }
      },
      get value() { return currentValue; },
      set value(nextValue) { currentValue = String(nextValue); },
      addEventListener(type, listener) { listeners.set(type, listener); },
      removeEventListener(type, listener) {
        if (listeners.get(type) === listener) listeners.delete(type);
      },
      trigger(type, event = {}) {
        listeners.get(type)?.({
          target: this,
          button: 0,
          clientX: 0,
          pointerId: 1,
          key: "",
          shiftKey: false,
          preventDefault() {},
          ...event
        });
      },
      setAttribute(name, nextValue) { attributes.set(name, String(nextValue)); },
      getAttribute(name) { return attributes.get(name) || null; },
      removeAttribute(name) { attributes.delete(name); },
      setPointerCapture(pointerId) { capturedPointers.add(pointerId); },
      hasPointerCapture(pointerId) { return capturedPointers.has(pointerId); },
      releasePointerCapture(pointerId) { capturedPointers.delete(pointerId); },
      replaceChildren() {},
      append() {},
      focus() {},
      select() {}
    };
  }

  const add = (selector, element = createElement()) => {
    elementsBySelector.set(selector, element);
    return element;
  };
  const workspace = add("#music-workspace", createElement());
  add("#music-purpose-tabs", createElement());
  add("#music-genre", createElement({ value: "drama" }));
  add("#music-vocabulary", createElement({ value: "orchestral" }));
  add("#music-template-list", createElement());
  add("#music-template-count", createElement());
  add("#music-duration", createElement({ value: "15" }));
  add("#music-bpm", createElement({ value: "72" }));
  add("#music-meter", createElement({ value: "4/4" }));
  add("#music-tonality", createElement({ value: "minor" }));
  add("#music-emotion-start", createElement({ value: "克制、留白" }));
  add("#music-emotion-end", createElement({ value: "情绪轻微抬升后留有余韵" }));
  add("#music-lead-instrument", createElement({ value: "低音弦乐" }));
  add("#music-support-instruments", createElement({ value: "钢琴单音、柔和环境纹理" }));
  add("#music-excluded-instruments", createElement());
  add("#music-dynamics", createElement({ value: "pp 起步，缓慢渐强至 mp" }));
  const timeline = add("#music-timeline", createElement());
  add("#music-picture", createElement());
  add("#music-edit-rhythm", createElement({ value: "克制的镜头节奏，不强制卡点" }));
  add("#music-dialogue-mode", createElement({ value: "none" }));
  add("#music-ending", createElement({ value: "保留自然尾音" }));
  add("#music-extra-restrictions", createElement());
  add("#music-validation", createElement());
  add("#music-output", createElement());
  add("#music-filename", createElement());
  add("#music-example", createElement());
  add("#music-clear", createElement());
  add("#music-copy", createElement());
  const purposeButtons = Object.keys(MUSIC_PURPOSES).map((purpose) => createElement({ dataset: { musicPurpose: purpose } }));
  const resizers = [
    createElement({ dataset: { musicResizer: "left" } }),
    createElement({ dataset: { musicResizer: "right" } })
  ];
  const document = {
    body: { classList: createClassList() },
    querySelector(selector) { return elementsBySelector.get(selector) || null; },
    querySelectorAll(selector) {
      if (selector === "[data-music-purpose]") return purposeButtons;
      if (selector === "[data-music-resizer]") return resizers;
      return [];
    },
    createElement() { return createElement(); },
    dispatchEvent(event) { dispatchedEvents.push(event); return true; },
    execCommand() { return true; }
  };
  class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  }
  const root = {
    aigcMusicData: require("./music-data.js"),
    document,
    innerWidth: 1440,
    confirm() { return true; },
    addEventListener(type, listener) { rootListeners.set(type, listener); },
    trigger(type, event = {}) { rootListeners.get(type)?.({ target: root, type, ...event }); }
  };
  const context = {
    window: root,
    document,
    CustomEvent,
    navigator: { clipboard: { writeText: async () => {} } },
    setTimeout,
    clearTimeout
  };
  vm.runInNewContext(fs.readFileSync("music-app.js", "utf8"), context, { filename: "music-app.js" });
  return { dispatchedEvents, elementsBySelector, purposeButtons, resizers, root, timeline, workbench: root.aigcMusicWorkbench, workspace };
}

runTest("shared workspace navigation owns music visibility without a second listener", () => {
  const cameraSource = fs.readFileSync("camera-app.js", "utf8");
  const musicSource = fs.readFileSync("music-app.js", "utf8");
  const navigationSource = fs.readFileSync("workspace-navigation.js", "utf8");

  assert(navigationSource.includes('"music"'));
  assert(navigationSource.includes('document.querySelectorAll(".workspace-view")'));
  assert(!cameraSource.includes('musicWorkspace: document.querySelector("#music-workspace")'));
  assert(!musicSource.includes("syncWorkspaceVisibility"));
  assert(!musicSource.includes('document.querySelectorAll("[data-workspace]")'));
});

runTest("music controller blocks copy when an edited timeline becomes invalid", () => {
  const harness = createMusicControllerHarness();
  harness.timeline.trigger("input", {
    target: { dataset: { musicSegmentIndex: "0", musicSegmentField: "end" }, value: "7" }
  });
  assert.strictEqual(harness.elementsBySelector.get("#music-copy").disabled, true);
  assert(harness.elementsBySelector.get("#music-validation").textContent.includes("交叉"));
});

runTest("music controller rescales timeline boundaries from 15 to 30 seconds", () => {
  const harness = createMusicControllerHarness();
  const duration = harness.elementsBySelector.get("#music-duration");
  duration.value = "30";
  duration.trigger("change");
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(harness.workbench.exportState().timeline.map(({ start, end }) => [start, end]))),
    [[0, 10], [10, 24], [24, 30]]
  );
});

runTest("music controller export and import round-trip normalized state", () => {
  const source = createMusicControllerHarness();
  source.workbench.importState({
    purpose: "trailer", genre: "action", vocabulary: "hybrid", duration: 30, bpm: 126,
    picture: "冬夜火车站的背叛确认", timeline: [
      { start: 0, end: 10, task: "压低呼吸", texture: "低频", dynamic: "pp" },
      { start: 10, end: 24, task: "危险抬升", texture: "弦乐", dynamic: "mp" },
      { start: 24, end: 30, task: "突然留白", texture: "钢琴", dynamic: "p" }
    ],
    layout: { leftWidth: 336, rightWidth: 548 }
  });
  const saved = source.workbench.exportState();
  const restored = createMusicControllerHarness();
  restored.workbench.importState(saved);
  assert.strictEqual(JSON.stringify(restored.workbench.exportState()), JSON.stringify(saved));
});

runTest("music dirty events use the document bus observed by project autosave", () => {
  const source = fs.readFileSync("music-app.js", "utf8");
  assert(source.includes('document.dispatchEvent(new root.CustomEvent("aigc:workspace-dirty"'));
  assert(!source.includes('function notifyDirty() { root.dispatchEvent'));
});

runTest("music controller emits one dirty event for one field mutation", () => {
  const harness = createMusicControllerHarness();
  const bpm = harness.elementsBySelector.get("#music-bpm");
  bpm.value = "88";
  bpm.trigger("input");
  assert.strictEqual(harness.dispatchedEvents.length, 1);
  assert.strictEqual(harness.dispatchedEvents[0].detail.workspace, "music");
});

runTest("music clear and example each emit exactly one dirty event", () => {
  const exampleHarness = createMusicControllerHarness();
  exampleHarness.workbench.loadExample();
  assert.strictEqual(exampleHarness.dispatchedEvents.length, 1);
  assert.strictEqual(exampleHarness.dispatchedEvents[0].detail.workspace, "music");

  const clearHarness = createMusicControllerHarness();
  clearHarness.workbench.clearFields();
  assert.strictEqual(clearHarness.dispatchedEvents.length, 1);
  assert.strictEqual(clearHarness.dispatchedEvents[0].detail.workspace, "music");
});

runTest("music example avoids duplicated sentence punctuation in its prompt", () => {
  const harness = createMusicControllerHarness();
  harness.workbench.loadExample();
  assert(!harness.workbench.composePrompt().includes("。。"));
});

function createMusicReviewHarness() {
  const dispatchedEvents = [];
  const elementsBySelector = new Map();
  const rootListeners = new Map();

  function createClassList() {
    const names = new Set();
    return {
      add(name) { names.add(name); },
      remove(name) { names.delete(name); },
      toggle(name, force) {
        const enabled = force === undefined ? !names.has(name) : Boolean(force);
        if (enabled) names.add(name); else names.delete(name);
        return enabled;
      }
    };
  }

  function matches(element, selector) {
    return (selector === ".music-timeline-row" && element.className === "music-timeline-row") ||
      (selector === ".music-time-code" && element.className === "music-time-code") ||
      (selector === "[data-music-template-id]" && Boolean(element.dataset.musicTemplateId));
  }

  function createElement({ value = "", dataset = {} } = {}) {
    let currentValue = String(value);
    const listeners = new Map();
    const attributes = new Map();
    const element = {
      dataset,
      children: [],
      parentNode: null,
      className: "",
      classList: createClassList(),
      disabled: false,
      textContent: "",
      selectionStart: currentValue.length,
      selectionEnd: currentValue.length,
      style: { setProperty() {}, removeProperty() {} },
      get value() { return currentValue; },
      set value(nextValue) {
        currentValue = String(nextValue);
        this.selectionStart = currentValue.length;
        this.selectionEnd = currentValue.length;
      },
      append(...children) {
        children.forEach((child) => {
          child.parentNode = element;
          element.children.push(child);
        });
      },
      replaceChildren(...children) {
        element.children = [];
        element.append(...children);
      },
      closest(selector) {
        let current = element;
        while (current) {
          if (matches(current, selector)) return current;
          current = current.parentNode;
        }
        return null;
      },
      querySelector(selector) {
        const queue = [...element.children];
        while (queue.length) {
          const child = queue.shift();
          if (matches(child, selector)) return child;
          queue.push(...child.children);
        }
        return null;
      },
      addEventListener(type, listener) { listeners.set(type, listener); },
      removeEventListener(type, listener) {
        if (listeners.get(type) === listener) listeners.delete(type);
      },
      trigger(type, event = {}) {
        listeners.get(type)?.({ target: element, preventDefault() {}, button: 0, pointerId: 1, clientX: 0, ...event });
      },
      setAttribute(name, nextValue) { attributes.set(name, String(nextValue)); },
      getAttribute(name) { return attributes.get(name) || null; },
      setPointerCapture() {},
      hasPointerCapture() { return false; },
      releasePointerCapture() {},
      focus() {},
      select() {}
    };
    return element;
  }

  function findElement(element, predicate) {
    if (predicate(element)) return element;
    for (const child of element.children) {
      const found = findElement(child, predicate);
      if (found) return found;
    }
    return null;
  }

  const add = (selector, element = createElement()) => {
    elementsBySelector.set(selector, element);
    return element;
  };
  add("#music-workspace", createElement());
  add("#music-purpose-tabs", createElement());
  add("#music-genre", createElement({ value: "drama" }));
  add("#music-vocabulary", createElement({ value: "orchestral" }));
  const templateList = add("#music-template-list", createElement());
  add("#music-template-count", createElement());
  add("#music-duration", createElement({ value: "15" }));
  add("#music-bpm", createElement({ value: "72" }));
  add("#music-meter", createElement({ value: "4/4" }));
  add("#music-tonality", createElement({ value: "minor" }));
  add("#music-emotion-start", createElement({ value: "克制、留白" }));
  add("#music-emotion-end", createElement({ value: "情绪轻微抬升后留有余韵" }));
  add("#music-lead-instrument", createElement({ value: "低音弦乐" }));
  add("#music-support-instruments", createElement({ value: "钢琴单音、柔和环境纹理" }));
  add("#music-excluded-instruments", createElement());
  add("#music-dynamics", createElement({ value: "pp 起步，缓慢渐强至 mp" }));
  const timeline = add("#music-timeline", createElement());
  add("#music-picture", createElement());
  add("#music-edit-rhythm", createElement({ value: "克制的镜头节奏，不强制卡点" }));
  add("#music-dialogue-mode", createElement({ value: "none" }));
  add("#music-ending", createElement({ value: "保留自然尾音" }));
  add("#music-extra-restrictions", createElement());
  add("#music-validation", createElement());
  add("#music-output", createElement());
  add("#music-filename", createElement());
  add("#music-example", createElement());
  add("#music-clear", createElement());
  add("#music-copy", createElement());
  const purposeButtons = Object.keys(MUSIC_PURPOSES).map((purpose) => createElement({ dataset: { musicPurpose: purpose } }));
  const resizers = [createElement({ dataset: { musicResizer: "left" } }), createElement({ dataset: { musicResizer: "right" } })];
  const document = {
    body: { classList: createClassList() },
    querySelector(selector) { return elementsBySelector.get(selector) || null; },
    querySelectorAll(selector) {
      if (selector === "[data-music-purpose]") return purposeButtons;
      if (selector === "[data-music-resizer]") return resizers;
      return [];
    },
    createElement() { return createElement(); },
    dispatchEvent(event) { dispatchedEvents.push(event); return true; },
    execCommand() { return true; }
  };
  class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  }
  const root = {
    aigcMusicData: require("./music-data.js"),
    document,
    innerWidth: 1440,
    confirmDecision: true,
    confirm() { return this.confirmDecision; },
    addEventListener(type, listener) { rootListeners.set(type, listener); }
  };
  vm.runInNewContext(fs.readFileSync("music-app.js", "utf8"), {
    window: root,
    document,
    CustomEvent,
    navigator: { clipboard: { writeText: async () => {} } },
    setTimeout,
    clearTimeout
  }, { filename: "music-app.js" });
  return { dispatchedEvents, elementsBySelector, findElement, root, templateList, timeline, workbench: root.aigcMusicWorkbench };
}

runTest("music validation rejects raw invalid duration, BPM, and timeline numeric values", () => {
  [
    { ...DEFAULT_MUSIC_STATE, duration: 0 },
    { ...DEFAULT_MUSIC_STATE, bpm: Number.NaN },
    { ...DEFAULT_MUSIC_STATE, timeline: [{ ...DEFAULT_MUSIC_STATE.timeline[0], end: "" }] }
  ].forEach((state) => assert.strictEqual(validateMusicState(state).valid, false));
});

runTest("music controller blocks raw BPM without exporting a default BPM prompt", () => {
  const harness = createMusicReviewHarness();
  const bpm = harness.elementsBySelector.get("#music-bpm");
  bpm.value = "300";
  bpm.trigger("input");
  assert.strictEqual(harness.elementsBySelector.get("#music-copy").disabled, true);
  assert(harness.elementsBySelector.get("#music-validation").textContent.includes("BPM"));
  assert.strictEqual(harness.elementsBySelector.get("#music-output").value, "");
  assert.strictEqual(harness.workbench.exportState().bpm, 300);
  assert.strictEqual(harness.workbench.composePrompt(), "");
});

runTest("music controller retains blank and non-finite timeline ends as blocking live errors", () => {
  ["", "not-a-number"].forEach((rawEnd) => {
    const harness = createMusicReviewHarness();
    const end = harness.findElement(harness.timeline, (element) => element.dataset.musicSegmentIndex === "0" && element.dataset.musicSegmentField === "end");
    end.value = rawEnd;
    harness.timeline.trigger("input", { target: end });
    assert.strictEqual(harness.elementsBySelector.get("#music-copy").disabled, true);
    assert(harness.elementsBySelector.get("#music-validation").textContent.includes("时间轴"));
    assert.strictEqual(harness.elementsBySelector.get("#music-output").value, "");
    assert.strictEqual(harness.workbench.exportState().timeline[0].end, rawEnd);
    assert.strictEqual(harness.workbench.composePrompt(), "");
  });
});

runTest("music malformed import repairs timeline for its accepted duration without dirtying", () => {
  const harness = createMusicReviewHarness();
  harness.workbench.importState({ duration: 30, bpm: 999, timeline: "malformed" });
  const saved = harness.workbench.exportState();
  assert.strictEqual(saved.duration, 30);
  assert.strictEqual(saved.bpm, 72);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(saved.timeline.map(({ start, end }) => [start, end]))), [[0, 10], [10, 24], [24, 30]]);
  assert.strictEqual(harness.elementsBySelector.get("#music-copy").disabled, false);
  assert.strictEqual(harness.dispatchedEvents.length, 0);
});

runTest("music template replacement confirms same-template reset and honors cancel", () => {
  const harness = createMusicReviewHarness();
  harness.workbench.importState({ purpose: "film", genre: "suspense", vocabulary: "texture" });
  let card = harness.findElement(harness.templateList, (element) => element.dataset.musicTemplateId === "film-psychological-suspense");
  harness.templateList.trigger("click", { target: card });
  const tonality = harness.elementsBySelector.get("#music-tonality");
  const dynamics = harness.elementsBySelector.get("#music-dynamics");
  const end = harness.findElement(harness.timeline, (element) => element.dataset.musicSegmentIndex === "0" && element.dataset.musicSegmentField === "end");
  tonality.value = "major";
  tonality.trigger("change");
  dynamics.value = "ff 突然推进";
  dynamics.trigger("input");
  end.value = "4";
  harness.timeline.trigger("input", { target: end });
  harness.root.confirmDecision = false;
  card = harness.findElement(harness.templateList, (element) => element.dataset.musicTemplateId === "film-psychological-suspense");
  harness.templateList.trigger("click", { target: card });
  assert.strictEqual(tonality.value, "major");
  assert.strictEqual(dynamics.value, "ff 突然推进");
  assert.strictEqual(end.value, "4");
  harness.root.confirmDecision = true;
  harness.templateList.trigger("click", { target: card });
  assert.strictEqual(tonality.value, "minor");
  assert.strictEqual(dynamics.value, "pp 起步，缓慢渐强至 mp");
  assert.strictEqual(harness.findElement(harness.timeline, (element) => element.dataset.musicSegmentIndex === "0" && element.dataset.musicSegmentField === "end").value, "5");
});

runTest("music timeline updates its timecode without moving the active input selection", () => {
  const harness = createMusicReviewHarness();
  const end = harness.findElement(harness.timeline, (element) => element.dataset.musicSegmentIndex === "0" && element.dataset.musicSegmentField === "end");
  const row = end.closest(".music-timeline-row");
  const timeCode = row.querySelector(".music-time-code");
  end.value = "7";
  end.selectionStart = 1;
  end.selectionEnd = 1;
  harness.timeline.trigger("input", { target: end });
  assert.strictEqual(timeCode.textContent, "0–7 秒");
  assert.strictEqual(end.selectionStart, 1);
  assert.strictEqual(end.selectionEnd, 1);
});

runTest("music pristine defaults apply a template without replacement confirmation", () => {
  const harness = createMusicReviewHarness();
  let confirmations = 0;
  harness.root.confirm = () => { confirmations += 1; return false; };
  const genre = harness.elementsBySelector.get("#music-genre");
  const vocabulary = harness.elementsBySelector.get("#music-vocabulary");
  genre.value = "suspense";
  genre.trigger("change");
  vocabulary.value = "texture";
  vocabulary.trigger("change");
  const card = harness.findElement(harness.templateList, (element) => element.dataset.musicTemplateId === "film-psychological-suspense");
  harness.templateList.trigger("click", { target: card });
  assert.strictEqual(confirmations, 0);
  assert.strictEqual(harness.workbench.exportState().templateId, "film-psychological-suspense");
});

runTest("music unedited selected template switches without replacement confirmation", () => {
  const harness = createMusicReviewHarness();
  const genre = harness.elementsBySelector.get("#music-genre");
  const vocabulary = harness.elementsBySelector.get("#music-vocabulary");
  vocabulary.value = "strings";
  vocabulary.trigger("change");
  let card = harness.findElement(harness.templateList, (element) => element.dataset.musicTemplateId === "film-intimate-drama");
  harness.templateList.trigger("click", { target: card });
  let confirmations = 0;
  harness.root.confirm = () => { confirmations += 1; return false; };
  genre.value = "suspense";
  genre.trigger("change");
  vocabulary.value = "texture";
  vocabulary.trigger("change");
  card = harness.findElement(harness.templateList, (element) => element.dataset.musicTemplateId === "film-psychological-suspense");
  harness.templateList.trigger("click", { target: card });
  assert.strictEqual(confirmations, 0);
  assert.strictEqual(harness.workbench.exportState().templateId, "film-psychological-suspense");
});
}

runTest("cross-model music data migrates legacy projects into schema v2", () => {
  const migrated = normalizeMusicState({
    purpose: "documentary",
    picture: "山村手艺人的清晨",
    leadInstrument: "钢琴与低音弦乐",
    supportInstruments: "环境纹理",
    duration: 30,
    bpm: 68
  });
  assert.strictEqual(migrated.schemaVersion, MUSIC_SCHEMA_VERSION);
  assert.strictEqual(migrated.sceneZh, "山村手艺人的清晨");
  assert(migrated.orchestration.lead.includes("piano"));
  assert(migrated.orchestration.lead.includes("low_strings"));
});

runTest("cross-model music presets merge and individual instruments toggle", () => {
  const original = normalizeMusicState({ ...DEFAULT_MUSIC_STATE, sceneZh: "测试画面" });
  const preset = applyInstrumentPreset(original, "synth-pulse-granular");
  assert(preset.orchestration.lead.includes("analog_synth"));
  assert(preset.orchestration.lead.includes("piano"));
  const removed = toggleInstrument(preset, "lead", "analog_synth");
  assert(!removed.orchestration.lead.includes("analog_synth"));
  assert.strictEqual(Object.keys(INSTRUMENT_PRESETS).length, 8);
});

runTest("cross-model music adapters produce five instrumental contracts", () => {
  const state = normalizeMusicState({ ...DEFAULT_MUSIC_STATE, sceneZh: "冬夜车站，调查员意识到危险", sceneEn: "A detective realizes the danger at a winter railway station" });
  Object.keys(MUSIC_TARGETS).forEach((target) => {
    const output = buildMusicOutput(state, target, "detailed");
    assert.strictEqual(output.targetModel, target);
    assert.strictEqual(output.instrumental, true);
    assert(output.combined.includes("no lyrics"));
    assert(output.combined.includes("no humming"));
    assert(output.fields.length >= 2);
  });
  assert(RESTRICTIONS.includes("no spoken word"));
});

runTest("cross-model music keeps untranslated Chinese out of English model prompts", () => {
  const state = normalizeMusicState({ ...DEFAULT_MUSIC_STATE, templateId: "", sceneZh: "只存在于中文分析的特殊场景", sceneEn: "" });
  const output = buildMusicOutput(state, "udio", "concise");
  assert(output.directorAnalysis.includes("只存在于中文分析的特殊场景"));
  assert(!output.combined.includes("只存在于中文分析的特殊场景"));
  assert(output.warnings.includes("英文场景补充未填写，模型提示词仅使用受控音乐字段。"));
  const stable = buildMusicOutput({ ...state, structure: { opening: "中文开场", development: "中文发展", climax: "中文高潮", ending: "中文结尾" } }, "stable_audio", "detailed");
  assert(!/[\u3400-\u9fff]/.test(stable.combined));
});

runTest("cross-model music validation blocks missing scene and lead but keeps conflicts advisory", () => {
  const invalid = normalizeMusicState({ ...DEFAULT_MUSIC_STATE, templateId: "", sceneZh: "", narrativeGoal: "", orchestration: { lead: [], support: [], rhythmBass: [], textureSpace: [], exclude: [] } });
  const result = validateMusicState(invalid);
  assert.strictEqual(result.valid, false);
  assert(result.errors.some((message) => message.includes("画面场景")));
  assert(result.errors.some((message) => message.includes("主奏")));
  const conflicted = normalizeMusicState({ ...DEFAULT_MUSIC_STATE, sceneZh: "亲密人物场景", coreEmotion: "intimate", orchestration: { ...DEFAULT_MUSIC_STATE.orchestration, rhythmBass: ["cinematic_percussion"] } });
  assert.strictEqual(validateMusicState(conflicted).valid, true);
  assert(analyzeMusicConflicts(conflicted).length > 0);
});

runTest("cross-model music workspace exposes the approved production contract", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const ids = [
    "music-search", "music-template-list", "music-scene-zh", "music-scene-en", "music-subject-state", "music-narrative-goal", "music-key-beat",
    "music-primary-genre", "music-secondary-genre", "music-era", "music-cultural-language", "music-core-emotion", "music-intensity",
    "music-instrument-presets", "music-instrument-layers", "music-duration", "music-tempo-feel", "music-rhythm-feel",
    "music-structure-opening", "music-structure-development", "music-structure-climax", "music-structure-ending", "music-advanced-toggle",
    "music-target-model", "music-prompt-density", "music-director-analysis", "music-output-fields", "music-copy-all", "music-validation"
  ];
  ids.forEach((id) => assert.strictEqual((html.match(new RegExp(`id=["']${id}["']`, "g")) || []).length, 1, `expected #${id} once`));
  assert(html.indexOf("music-data.js") < html.indexOf("music-adapters.js"));
  assert(html.indexOf("music-adapters.js") < html.indexOf("music-app.js"));
});

runTest("cross-model music controller preserves persistence, copy, adapters, and dirty events", () => {
  const source = fs.readFileSync("music-app.js", "utf8");
  ["exportState", "importState", "getOutput", "buildMusicOutput", "applyInstrumentPreset", "toggleInstrument", "aigc:workspace-dirty", "data-music-copy-field"].forEach((token) => assert(source.includes(token), `missing ${token}`));
  const css = fs.readFileSync("music-workspace.css", "utf8");
  assert(css.includes("grid-template-columns: var(--music-left-width) 6px minmax(430px, 1fr) 6px var(--music-right-width);"));
  assert(css.includes("font-size: 14px"));
});

runTest("music film-grading visual system exposes the selected design contract", () => {
  const musicMarkup = fs.readFileSync("index.html", "utf8");
  const musicCss = fs.readFileSync("music-workspace.css", "utf8");
  const musicAppSource = fs.readFileSync("music-app.js", "utf8");

  assert(musicMarkup.includes('class="music-mobile-switch"'));
  assert(musicMarkup.includes('class="music-status-bar"'));
  ["music-status-project", "music-status-duration", "music-status-tempo", "music-status-meter"].forEach((id) => {
    assert.strictEqual((musicMarkup.match(new RegExp(`id=["']${id}["']`, "g")) || []).length, 1, `expected #${id} once`);
  });
  assert(musicCss.includes("--music-canvas: #eeede8"));
  assert(musicCss.includes("--music-paper: #fbfaf6"));
  assert(musicCss.includes("--music-nav: #20231f"));
  assert(musicCss.includes("--music-primary: #4d6251"));
  assert(musicCss.includes("--music-amber: #b5813f"));
  assert(musicCss.includes('html[data-active-workspace="music"]'));
  assert(musicCss.includes("@media (prefers-reduced-motion: reduce)"));
  assert(musicAppSource.includes("data-music-mobile-pane"));
  assert(musicAppSource.includes("music-template-thumb"));
});

runTest("music film-grading layout exposes new defaults and keyboard-resizable rails", () => {
  const musicAppSource = fs.readFileSync("music-app.js", "utf8");
  const musicCss = fs.readFileSync("music-workspace.css", "utf8");
  assert.deepStrictEqual(DEFAULT_MUSIC_STATE.layout, { leftWidth: 400, rightWidth: 490 });
  assert(musicAppSource.includes('addEventListener("keydown"'));
  assert(musicAppSource.includes('event.key === "ArrowLeft"'));
  assert(musicAppSource.includes('event.key === "ArrowRight"'));
  assert(musicCss.includes("clamp(240px, var(--music-left-width), 26vw)"));
  assert(musicCss.includes("clamp(320px, var(--music-right-width), 32vw)"));
  assert(musicCss.includes('@media (max-width: 899px)'));
});

runTest("music film-grading layout migrates only the historical default rails", () => {
  const migrated = normalizeMusicState({ ...DEFAULT_MUSIC_STATE, layout: { leftWidth: 320, rightWidth: 500 } });
  const customized = normalizeMusicState({ ...DEFAULT_MUSIC_STATE, layout: { leftWidth: 360, rightWidth: 540 } });
  assert.deepStrictEqual(migrated.layout, { leftWidth: 400, rightWidth: 490 });
  assert.deepStrictEqual(customized.layout, { leftWidth: 360, rightWidth: 540 });
});

runTest("world music instrument catalog supports controlled region and family filters", () => {
  assert.strictEqual(INSTRUMENT_REGIONS.china, "中国");
  assert.strictEqual(INSTRUMENT_FAMILIES.bowed, "拉弦");
  assert(MUSIC_INSTRUMENTS.length >= 40);
  assert.strictEqual(new Set(MUSIC_INSTRUMENTS.map((item) => item.id)).size, MUSIC_INSTRUMENTS.length);
  MUSIC_INSTRUMENTS.forEach((item) => {
    assert(item.id && item.zh && item.en && item.region && item.family, `incomplete instrument ${item.id}`);
    assert(Array.isArray(item.layers) && item.layers.length > 0, `missing layers ${item.id}`);
  });
  assert(filterMusicInstruments({ region: "china", family: "bowed" }).some((item) => item.id === "erhu"));
  assert(filterMusicInstruments({ region: "china", family: "woodwind" }).some((item) => item.id === "dizi"));
  assert(filterMusicInstruments({ region: "universal", family: "plucked" }).some((item) => item.id === "acoustic_guitar"));
});

runTest("music case cards expose full-surface mouse and keyboard selection", () => {
  const source = fs.readFileSync("music-app.js", "utf8");
  assert(source.includes("musicTemplateCard"));
  assert(source.includes('card.setAttribute("role", "button")'));
  assert(source.includes('event.target.closest("[data-music-favorite]")'));
  assert(source.includes('event.key === "Enter" || event.key === " "'));
  assert(source.includes('event.target.closest("[data-music-template-card]")'));
});

runTest("music director design exposes region and instrument-family browsing", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const source = fs.readFileSync("music-app.js", "utf8");
  ["music-instrument-region", "music-instrument-family", "music-instrument-selection-count"].forEach((id) => {
    assert.strictEqual((html.match(new RegExp(`id=["']${id}["']`, "g")) || []).length, 1, `expected #${id} once`);
  });
  assert(source.includes('instrumentFilters = { region: "all", family: "all" }'));
  assert(source.includes("filterMusicInstruments(instrumentFilters)"));
  assert(source.includes("已选 ${selectedCount} 件乐器"));
  assert(source.includes("当前地域和类型下暂无乐器，请调整筛选。"));
});

runTest("world instrument selections persist and enter Chinese and English music outputs", () => {
  const state = normalizeMusicState({
    ...DEFAULT_MUSIC_STATE,
    sceneZh: "山间人物独自行走",
    sceneEn: "A solitary figure walking through the mountains",
    orchestration: {
      ...DEFAULT_MUSIC_STATE.orchestration,
      lead: ["erhu", "dizi", "acoustic_guitar"]
    }
  });
  assert.deepStrictEqual(state.orchestration.lead, ["erhu", "dizi", "acoustic_guitar"]);
  const generic = buildMusicOutput(state, "generic", "detailed");
  const udio = buildMusicOutput(state, "udio", "detailed");
  ["二胡", "笛子", "原声吉他"].forEach((name) => assert(generic.directorAnalysis.includes(name) || generic.combined.includes(name)));
  ["erhu", "dizi bamboo flute", "acoustic guitar"].forEach((name) => assert(udio.combined.includes(name)));
});

runTest("music duration modes convert custom values and migrate legacy projects", () => {
  assert.deepStrictEqual(durationPartsFromSeconds(155), { minutes: 2, seconds: 35 });
  assert.strictEqual(durationSecondsFromParts(2, 35), 155);
  assert.deepStrictEqual(DURATION_PRESETS, [15, 30, 60, 90, 120, 180, 300]);
  assert.strictEqual(DURATION_MODES.natural, "自然完整结束");
  assert.strictEqual(normalizeMusicState({ duration: 90 }).durationMode, "preset");
  const custom = normalizeMusicState({ durationMode: "custom", customDurationMinutes: 2, customDurationSeconds: 35 });
  assert.strictEqual(custom.duration, 155);
  assert.strictEqual(custom.customDurationMinutes, 2);
  assert.strictEqual(custom.customDurationSeconds, 35);
});

runTest("ambient music is an independent purpose with eight complete cases", () => {
  assert.strictEqual(MUSIC_PURPOSES.ambient_music, "氛围音乐");
  const ambient = MUSIC_TEMPLATES.filter((item) => item.purpose === "ambient_music");
  assert.strictEqual(ambient.length, 8);
  assert.strictEqual(new Set(ambient.map((item) => item.id)).size, 8);
  ambient.forEach((item) => {
    ["scene", "sceneEn", "emotion", "instruments", "rhythm", "production"].forEach((key) => assert(String(item[key] || "").trim(), `${item.id} missing ${key}`));
    assert(item.duration > 0 && item.bpm > 0);
  });
  const html = fs.readFileSync("index.html", "utf8");
  assert(html.includes('data-music-purpose="ambient_music">氛围音乐</button>'));
});

runTest("music workspace exposes preset custom and natural duration controls", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const source = fs.readFileSync("music-app.js", "utf8");
  ["music-duration-mode", "music-custom-duration", "music-duration-minutes", "music-duration-seconds", "music-duration-summary", "music-duration-natural-note"].forEach((id) => {
    assert.strictEqual((html.match(new RegExp(`id=["']${id}["']`, "g")) || []).length, 1, `expected #${id} once`);
  });
  assert(source.includes("syncDurationControls"));
  assert(source.includes("durationSecondsFromParts"));
  assert(source.includes('state.durationMode === "natural"'));
});

runTest("music adapters distinguish numeric custom and natural ending duration", () => {
  const base = { ...DEFAULT_MUSIC_STATE, sceneZh: "雾中森林", sceneEn: "A forest covered in mist" };
  const custom = buildMusicOutput(normalizeMusicState({ ...base, durationMode: "custom", customDurationMinutes: 2, customDurationSeconds: 35 }), "udio", "detailed");
  assert(custom.combined.includes("155 seconds"));
  const natural = buildMusicOutput(normalizeMusicState({ ...base, durationMode: "natural", duration: 15 }), "udio", "detailed");
  assert(!natural.combined.includes("15 seconds"));
  assert(natural.combined.includes("natural full-length ending after completing the musical arc, no hard duration target"));
  const genericNatural = buildMusicOutput(normalizeMusicState({ ...base, durationMode: "natural" }), "generic", "detailed");
  assert(genericNatural.combined.includes("时长不做硬性限制，完成四段结构后自然结束并保留尾音"));
});

runTest("poster title-mark controls persist and compose isolated asset prompts", () => {
  const source = fs.readFileSync("poster-app.js", "utf8");
  [
    "composeTitleMarkPrompt",
    "activePosterPrompt",
    "titleMarkCategory",
    "titleMarkTemplate",
    "titleMarkMethods",
    "titleMarkSkeleton",
    "titleMarkMaterial",
    "titleMarkLighting",
    "titleMarkBackground",
    "titleMarkOutputMode",
    "titleMarkMetaphor",
    "normalizePosterTitleMarkState",
    "无人物、无场景、无海报排版",
    "错字、乱码、随机英文"
  ].forEach((token) => assert(source.includes(token), `missing title-mark token: ${token}`));
});

runTest("project archive service exports exact referenced assets and preflights without writes", async () => {
  const service = createArchiveTestService({
    archive: projectArchive,
    createId: (() => { let index = 0; return (kind) => `${kind}-new-${++index}`; })()
  });
  const records = {
    casting: new Map([["casting-1", archiveTestRecord("casting-1")]]),
    poster: new Map([["poster-1", archiveTestRecord("poster-1", { kind: "source" })]]),
    "project-reference": new Map([["reference-1", archiveTestRecord("reference-1", { projectId: "project-1" })]])
  };
  const writes = [];
  const stores = createArchiveTestStores(records, writes);
  const project = archiveServiceProjectFixture();
  const exported = await service.exportActiveProject(project, { stores });
  const preflight = await service.preflightPackage(exported.blob);

  assert.strictEqual(preflight.summary.assetCount, 3);
  assert.deepStrictEqual(preflight.packageData.manifest.assets.map((asset) => asset.sourceId), ["casting-1", "poster-1", "reference-1"]);
  assert.deepStrictEqual(Object.keys(preflight.packageData.entries).sort(), [
    "assets/casting/000001.bin", "assets/poster/000002.bin", "assets/project-reference/000003.bin", "manifest.json", "project.json"
  ]);
  assert.deepStrictEqual(writes, []);
});

runTest("project archive service rejects a mismatched hash before writing assets", async () => {
  const service = createArchiveTestService({ archive: projectArchive });
  const records = {
    casting: new Map([["casting-1", archiveTestRecord("casting-1")]]),
    poster: new Map([["poster-1", archiveTestRecord("poster-1", { kind: "source" })]]),
    "project-reference": new Map([["reference-1", archiveTestRecord("reference-1", { projectId: "project-1" })]])
  };
  const writes = [];
  const stores = createArchiveTestStores(records, writes);
  const exported = await service.exportActiveProject(archiveServiceProjectFixture(), { stores });
  const packageData = (await service.preflightPackage(exported.blob)).packageData;
  packageData.manifest.assets[0].sha256 = "0".repeat(64);

  await assert.rejects(() => service.importPackage(packageData, stores), /哈希|完整性/);
  assert.deepStrictEqual(writes, []);
});

runTest("project archive service stops export when a referenced local image is missing", async () => {
  const service = createArchiveTestService({ archive: projectArchive });
  const records = { casting: new Map(), poster: new Map(), "project-reference": new Map() };
  const writes = [];
  await assert.rejects(
    () => service.exportActiveProject(archiveServiceProjectFixture(), { stores: createArchiveTestStores(records, writes) }),
    /缺少被引用的本地图片/
  );
  assert.deepStrictEqual(writes, []);
});

runTest("project archive service rewrites every package ID and rolls back only newly written assets", async () => {
  const service = createArchiveTestService({
    archive: projectArchive,
    createId: (() => { let index = 0; return (kind) => `${kind}-imported-${++index}`; })()
  });
  const sourceRecords = {
    casting: new Map([["casting-1", archiveTestRecord("casting-1")]]),
    poster: new Map([["poster-1", archiveTestRecord("poster-1", { kind: "source" })]]),
    "project-reference": new Map([["reference-1", archiveTestRecord("reference-1", { projectId: "project-1" })]])
  };
  const sourceWrites = [];
  const exported = await service.exportActiveProject(archiveServiceProjectFixture(), { stores: createArchiveTestStores(sourceRecords, sourceWrites) });
  const packageData = (await service.preflightPackage(exported.blob)).packageData;

  const successRecords = { casting: new Map(), poster: new Map(), "project-reference": new Map() };
  const successWrites = [];
  const imported = await service.importPackage(packageData, createArchiveTestStores(successRecords, successWrites));
  assert.notStrictEqual(imported.project.id, "project-1");
  assert.notStrictEqual(imported.project.workspaces.casting.referenceAsset.id, "casting-1");
  assert.notStrictEqual(imported.project.workspaces.poster.posterCompositor.sourceAsset.id, "poster-1");
  assert.notStrictEqual(imported.project.creativeBrief.referenceAssetIds[0], "reference-1");
  assert.strictEqual(successWrites.filter((item) => item.action === "create").length, 3);

  const rollbackRecords = {
    casting: new Map([["existing-casting", { id: "existing-casting" }]]),
    poster: new Map(),
    "project-reference": new Map()
  };
  const rollbackWrites = [];
  const failingStores = createArchiveTestStores(rollbackRecords, rollbackWrites, { failAfterPuts: 2 });
  await assert.rejects(() => service.importPackage(packageData, failingStores), /simulated write failure/);
  assert(rollbackRecords.casting.has("existing-casting"));
  assert.strictEqual(rollbackRecords.casting.size, 1);
  assert.strictEqual(rollbackRecords.poster.size, 0);
  assert.strictEqual(rollbackRecords["project-reference"].size, 0);
  assert.strictEqual(rollbackWrites.filter((item) => item.action === "remove").length, 2);
});

runTest("project archive service recovers only journaled asset IDs", async () => {
  const storage = createArchiveTestStorage();
  const records = {
    casting: new Map([["keep", { id: "keep" }], ["remove", { id: "remove", importToken: "recovery-token" }]]),
    poster: new Map(),
    "project-reference": new Map()
  };
  const writes = [];
  const service = createArchiveTestService({
    archive: projectArchive,
    storage,
    stores: createArchiveTestStores(records, writes)
  });
  storage.setItem(service.JOURNAL_KEY || "aigc-project-package-import-journal-v1", JSON.stringify({
    version: 1,
    entries: [{ store: "casting", id: "remove", importToken: "recovery-token" }]
  }));
  const result = await service.recoverInterruptedImport();
  assert.deepStrictEqual(result, { recovered: 1 });
  assert(records.casting.has("keep"));
  assert(!records.casting.has("remove"));
  assert.strictEqual(storage.getItem("aigc-project-package-import-journal-v1"), null);
  assert.deepStrictEqual(writes, [{ action: "remove", store: "casting", id: "remove" }]);
});

runTest("project archive preflight rejects excessive central-directory entries before inflate", async () => {
  let inflateCalls = 0;
  const service = createArchiveTestService({
    archive: projectArchive,
    fflate: {
      unzipSync() {
        inflateCalls += 1;
        throw new Error("inflate must not run");
      }
    }
  });

  await assert.rejects(() => service.preflightPackage(archiveManyEntryZip(163)), /文件|数量|160|目录/);
  assert.strictEqual(inflateCalls, 0);
});

runTest("project archive rejects unsafe central-directory paths before inflate", async () => {
  let inflateCalls = 0;
  const service = createArchiveTestService({
    archive: projectArchive,
    fflate: {
      unzipSync() {
        inflateCalls += 1;
        throw new Error("inflate must not run");
      }
    }
  });

  await assert.rejects(() => service.preflightPackage(archivePackageBlob({ "../escape.bin": new Uint8Array() })), /路径|目录|ZIP/);
  assert.strictEqual(inflateCalls, 0);
});

runTest("project archive rejects unsafe central-directory mutations before inflate", async () => {
  const sourceStores = createArchiveTestStores(archiveSourceRecords(), []);
  const exported = await createArchiveTestService({ archive: projectArchive }).exportActiveProject(
    archiveServiceProjectFixture(), { stores: sourceStores }
  );
  const cleanBytes = new Uint8Array(await exported.blob.arrayBuffer());
  const mutations = [
    ["duplicate path", (bytes) => mutateArchiveCentralEntry(bytes, 1, (view, central, local) => {
      copyArchiveName(bytes, central, local, findArchiveCentralEntry(bytes, "assets/casting/000001.bin"));
    })],
    ["encrypted flag", (bytes) => mutateArchiveCentralEntry(bytes, 0, (view, central) => view.setUint16(central + 8, 1, true))],
    ["data descriptor flag", (bytes) => mutateArchiveCentralEntry(bytes, 0, (view, central) => view.setUint16(central + 8, 8, true))],
    ["ZIP64 size sentinel", (bytes) => mutateArchiveCentralEntry(bytes, 0, (view, central) => view.setUint32(central + 20, 0xffffffff, true))],
    ["ZIP64 extra field", (bytes) => mutateArchiveCentralEntry(bytes, 0, (view, central, local, nameEnd) => {
      view.setUint16(central + 30, 4, true);
      bytes.set([0x01, 0x00, 0x00, 0x00], nameEnd);
    })],
    ["multi-disk entry", (bytes) => mutateArchiveCentralEntry(bytes, 0, (view, central) => view.setUint16(central + 34, 1, true))],
    ["oversized central directory record", (bytes) => mutateArchiveCentralEntry(bytes, 0, (view, central) => view.setUint16(central + 28, 0xffff, true))]
  ];

  for (const [label, mutate] of mutations) {
    let inflateCalls = 0;
    const service = createArchiveTestService({
      archive: projectArchive,
      fflate: { unzipSync() { inflateCalls += 1; throw new Error("inflate must not run"); } }
    });
    const bytes = new Uint8Array(cleanBytes);
    mutate(bytes);
    await assert.rejects(() => service.preflightPackage(new Blob([bytes])), /项目包|ZIP|目录|路径|不一致/, label);
    assert.strictEqual(inflateCalls, 0, label);
  }
});

runTest("project archive rejects malformed PNG JPEG and WebP plus decoded metadata mismatches before writes", async () => {
  const records = archiveSourceRecords();
  const writes = [];
  const stores = createArchiveTestStores(records, writes);
  const service = createArchiveTestService({ archive: projectArchive });
  const exported = await service.exportActiveProject(archiveServiceProjectFixture(), { stores });
  const clean = (await service.preflightPackage(exported.blob)).packageData;
  const malformed = [
    ["image/png", archiveMalformedPng()],
    ["image/jpeg", archiveMalformedJpeg()],
    ["image/webp", archiveMalformedWebp()]
  ];

  for (const [mime, bytes] of malformed) {
    const candidate = cloneArchivePackageData(clean);
    const asset = candidate.manifest.assets[0];
    candidate.entries[asset.path] = bytes;
    asset.mime = mime;
    asset.size = bytes.byteLength;
    asset.sha256 = archiveSha256(bytes);
    asset.meta = { ...asset.meta, type: mime, size: bytes.byteLength, width: 1, height: 1 };
    candidate.entries["manifest.json"] = new TextEncoder().encode(JSON.stringify(candidate.manifest));
    await assert.rejects(() => service.preflightPackage(archivePackageBlob(candidate.entries)), /图片|解码|损坏|格式/);
    await assert.rejects(() => service.importPackage(candidate, stores), /图片|解码|损坏|格式/);
  }

  const mismatch = cloneArchivePackageData(clean);
  mismatch.manifest.assets[0].meta.width = 2;
  mismatch.entries["manifest.json"] = new TextEncoder().encode(JSON.stringify(mismatch.manifest));
  await assert.rejects(() => service.preflightPackage(archivePackageBlob(mismatch.entries)), /尺寸|元数据/);
  await assert.rejects(() => service.importPackage(mismatch, stores), /尺寸|元数据/);
  assert.deepStrictEqual(writes, []);
});

runTest("project archive requires project.json bytes to equal the canonical manifest project", async () => {
  const records = archiveSourceRecords();
  const writes = [];
  const stores = createArchiveTestStores(records, writes);
  const service = createArchiveTestService({ archive: projectArchive });
  const exported = await service.exportActiveProject(archiveServiceProjectFixture(), { stores });
  const packageData = (await service.preflightPackage(exported.blob)).packageData;
  const divergentProject = {
    scenes: packageData.project.scenes,
    assetLocks: packageData.project.assetLocks,
    workspaces: packageData.project.workspaces,
    name: packageData.project.name,
    id: packageData.project.id,
    creativeBrief: packageData.project.creativeBrief
  };
  packageData.entries["project.json"] = new TextEncoder().encode(JSON.stringify(divergentProject, null, 2));
  const blob = archivePackageBlob(packageData.entries);

  await assert.rejects(() => service.preflightPackage(blob), /项目数据|一致|canonical|规范/);
  await assert.rejects(() => service.importPackage({ ...packageData, project: divergentProject }, stores), /项目数据|一致|canonical|规范/);
  assert.deepStrictEqual(writes, []);
});

runTest("project archive allocates collision-free IDs and uses create-only storage", async () => {
  const sourceStores = createArchiveTestStores(archiveSourceRecords(), []);
  const sequences = {
    project: ["project-1", "project-imported"],
    casting: ["occupied", "casting-imported"],
    poster: ["casting-imported", "poster-imported"],
    "project-reference": ["reference-1", "reference-imported"]
  };
  const service = createArchiveTestService({
    archive: projectArchive,
    createId(kind) {
      return sequences[kind].shift();
    }
  });
  const exported = await service.exportActiveProject(archiveServiceProjectFixture(), { stores: sourceStores });
  const packageData = (await service.preflightPackage(exported.blob)).packageData;
  const destination = {
    casting: new Map([["occupied", { id: "occupied", marker: "keep" }]]),
    poster: new Map(),
    "project-reference": new Map()
  };
  const writes = [];
  const imported = await service.importPackage(packageData, createArchiveTestStores(destination, writes));

  assert.strictEqual(imported.project.id, "project-imported");
  assert.strictEqual(imported.project.workspaces.casting.referenceAsset.id, "casting-imported");
  assert.strictEqual(imported.project.workspaces.poster.posterCompositor.sourceAsset.id, "poster-imported");
  assert.strictEqual(imported.project.creativeBrief.referenceAssetIds[0], "reference-imported");
  assert.strictEqual(destination.casting.get("occupied").marker, "keep");
  assert.strictEqual(writes.filter((item) => item.action === "create").length, 3);
});

runTest("project archive journals before writes and cleans a record when create commits then rejects", async () => {
  const storage = createArchiveTestStorage();
  const service = createArchiveTestService({
    archive: projectArchive,
    storage,
    createId: (() => { let index = 0; return (kind) => `${kind}-journal-${++index}`; })()
  });
  const sourceStores = createArchiveTestStores(archiveSourceRecords(), []);
  const exported = await service.exportActiveProject(archiveServiceProjectFixture(), { stores: sourceStores });
  const packageData = (await service.preflightPackage(exported.blob)).packageData;
  const destination = { casting: new Map(), poster: new Map(), "project-reference": new Map() };
  const writes = [];

  await assert.rejects(
    () => service.importPackage(packageData, createArchiveTestStores(destination, writes, { writeThenRejectAt: 1 })),
    /committed then rejected/
  );
  assert.strictEqual(destination.casting.size, 0);
  assert.strictEqual(destination.poster.size, 0);
  assert.strictEqual(destination["project-reference"].size, 0);
  assert.strictEqual(storage.getItem("aigc-project-package-import-journal-v1"), null);
});

runTest("project archive retains failed cleanup entries for startup recovery", async () => {
  const storage = createArchiveTestStorage();
  const removeFailures = new Set();
  const service = createArchiveTestService({
    archive: projectArchive,
    storage,
    createId: (() => { let index = 0; return (kind) => `${kind}-cleanup-${++index}`; })()
  });
  const sourceStores = createArchiveTestStores(archiveSourceRecords(), []);
  const exported = await service.exportActiveProject(archiveServiceProjectFixture(), { stores: sourceStores });
  const packageData = (await service.preflightPackage(exported.blob)).packageData;
  const destination = { casting: new Map(), poster: new Map(), "project-reference": new Map() };
  const writes = [];
  removeFailures.add("casting-cleanup-2");
  const stores = createArchiveTestStores(destination, writes, { failAfterPuts: 1, removeFailures });

  await assert.rejects(() => service.importPackage(packageData, stores), /simulated write failure/);
  const retained = JSON.parse(storage.getItem("aigc-project-package-import-journal-v1"));
  assert.deepStrictEqual(retained.entries.map((entry) => [entry.store, entry.id]), [["casting", "casting-cleanup-2"]]);
  assert(destination.casting.has("casting-cleanup-2"));

  removeFailures.clear();
  const recovered = await service.recoverInterruptedImport();
  assert.deepStrictEqual(recovered, { recovered: 1 });
  assert(!destination.casting.has("casting-cleanup-2"));
  assert.strictEqual(storage.getItem("aigc-project-package-import-journal-v1"), null);
});

runTest("project archive v2 journal retains committed project assets during restart recovery", async () => {
  const storage = createArchiveTestStorage();
  const records = {
    casting: new Map([["casting-v2", { id: "casting-v2", importToken: "import-v2" }]]),
    poster: new Map(),
    "project-reference": new Map()
  };
  const writes = [];
  const service = createArchiveTestService({
    archive: projectArchive,
    storage,
    stores: createArchiveTestStores(records, writes),
    getCommittedProjectToken(projectId) { return projectId === "project-v2" ? "import-v2" : ""; }
  });
  storage.setItem("aigc-project-package-import-journal-v1", JSON.stringify({
    version: 2,
    operationId: "operation-v2",
    projectId: "project-v2",
    importToken: "import-v2",
    phase: "metadata-committing",
    entries: [{ store: "casting", id: "casting-v2", importToken: "import-v2" }]
  }));

  const result = await service.recoverInterruptedImport();
  assert.deepStrictEqual(result, { recovered: 0, retained: 1 });
  assert(records.casting.has("casting-v2"));
  assert.strictEqual(storage.getItem("aigc-project-package-import-journal-v1"), null);
  assert.deepStrictEqual(writes, []);
});

runTest("project archive export enforces project JSON and completed ZIP limits", async () => {
  const service = createArchiveTestService({ archive: projectArchive });
  await assert.rejects(
    () => service.exportActiveProject({ id: "oversized-project", padding: "x".repeat(2 * 1024 * 1024 + 1) }, {
      stores: createArchiveTestStores({ casting: new Map(), poster: new Map(), "project-reference": new Map() }, [])
    }),
    /项目数据|2 MB|大小/
  );

  const oversizedZipService = createArchiveTestService({
    archive: projectArchive,
    fflate: { zipSync: () => ({ byteLength: 250 * 1024 * 1024 + 1 }) }
  });
  await assert.rejects(
    () => oversizedZipService.exportActiveProject({ id: "small-project" }, {
      stores: createArchiveTestStores({ casting: new Map(), poster: new Map(), "project-reference": new Map() }, [])
    }),
    /250 MB|项目包/
  );
});

runTest("archive import stores expose create-only owned-record APIs", () => {
  assert.strictEqual(typeof castingAssetStore.createImportedRecord, "function");
  assert.strictEqual(typeof castingAssetStore.removeImportedRecord, "function");
  assert.strictEqual(typeof posterAssetStore.createImportedRecord, "function");
  assert.strictEqual(typeof posterAssetStore.removeImportedRecord, "function");
  assert.strictEqual(typeof projectReferenceStore.createImportedRecord, "function");
  assert.strictEqual(typeof projectReferenceStore.removeImportedRecord, "function");
});

runTest("archive import stores reject collisions and protect records with import tokens", async () => {
  const previousIndexedDB = globalThis.indexedDB;
  globalThis.indexedDB = createContractIndexedDB();
  try {
    const blob = new Blob(["png"], { type: "image/png" });
    const cases = [
      [castingAssetStore, { id: "contract-casting", blob, meta: { name: "casting.png", type: "image/png", width: 1, height: 1, size: blob.size } }],
      [posterAssetStore, { id: "contract-poster", blob, meta: { kind: "source", name: "poster.png", type: "image/png", width: 1, height: 1, size: blob.size } }],
      [projectReferenceStore, { id: "contract-reference", blob, projectId: "project-contract", meta: { name: "reference.png", type: "image/png", width: 1, height: 1, size: blob.size } }]
    ];
    for (const [store, input] of cases) {
      await store.createImportedRecord({ ...input, importToken: "token-a" });
      await assert.rejects(() => store.createImportedRecord({ ...input, importToken: "token-b" }), /新的|Constraint|约束|collision/i);
      assert.strictEqual(await store.removeImportedRecord(input.id, "token-b"), false);
      assert(await (store.getRecord ? store.getRecord(input.id) : store.get(input.id)));
      assert.strictEqual(await store.removeImportedRecord(input.id, "token-a"), true);
      assert.strictEqual(await (store.getRecord ? store.getRecord(input.id) : store.get(input.id)), null);
    }
  } finally {
    globalThis.indexedDB = previousIndexedDB;
  }
});

function createContractIndexedDB() {
  const databases = new Map();
  const schedule = typeof queueMicrotask === "function" ? queueMicrotask : (callback) => Promise.resolve().then(callback);
  const createRequest = (transaction, operation) => {
    const request = { result: undefined, error: null, onsuccess: null, onerror: null };
    transaction.pending += 1;
    schedule(() => {
      try {
        request.result = operation();
        if (typeof request.onsuccess === "function") request.onsuccess();
      } catch (error) {
        request.error = error;
        transaction.error = error;
        transaction.failed = true;
        if (typeof request.onerror === "function") request.onerror();
      }
      transaction.pending -= 1;
      if (transaction.pending === 0) schedule(() => {
        if (transaction.failed) {
          if (typeof transaction.onerror === "function") transaction.onerror();
        } else if (typeof transaction.oncomplete === "function") transaction.oncomplete();
      });
    });
    return request;
  };
  const createStore = (records, transaction) => ({
    add(record) { return createRequest(transaction, () => {
      if (records.has(record.id)) throw Object.assign(new Error("ID collision"), { name: "ConstraintError" });
      records.set(record.id, { ...record });
      return record;
    }); },
    get(id) { return createRequest(transaction, () => records.get(id)); },
    delete(id) { return createRequest(transaction, () => { records.delete(id); return undefined; }); }
  });
  return {
    open(name) {
      const request = { result: null, error: null, onupgradeneeded: null, onsuccess: null, onerror: null };
      schedule(() => {
        let database = databases.get(name);
        const isNew = !database;
        if (!database) {
          const records = new Map();
          database = {
            objectStoreNames: { contains: (storeName) => storeName === database.storeName },
            storeName: null,
            createObjectStore(storeName) { database.storeName = storeName; return createStore(records, { pending: 0 }); },
            transaction(storeName) {
              const transaction = { pending: 0, failed: false, error: null, oncomplete: null, onerror: null, onabort: null,
                objectStore: () => createStore(records, transaction) };
              return transaction;
            },
            close() {}
          };
          databases.set(name, database);
        }
        request.result = database;
        if (isNew && typeof request.onupgradeneeded === "function") request.onupgradeneeded();
        if (typeof request.onsuccess === "function") request.onsuccess();
      });
      return request;
    }
  };
}

function archiveServiceProjectFixture() {
  return {
    id: "project-1",
    name: "Archive fixture",
    workspaces: {
      casting: { referenceAsset: { id: "casting-1" }, versions: [] },
      poster: { posterCompositor: { sourceAsset: { id: "poster-1" } } }
    },
    creativeBrief: { referenceAssetIds: ["reference-1"] },
    assetLocks: [],
    scenes: []
  };
}

const ARCHIVE_TEST_PNG_BYTES = new Uint8Array(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
));

function archiveTestBlob() {
  return new Blob([ARCHIVE_TEST_PNG_BYTES], { type: "image/png" });
}

function archiveTestRecord(id, extra = {}) {
  const blob = archiveTestBlob();
  const record = {
    id,
    blob,
    name: `${id}.png`,
    type: "image/png",
    width: 1,
    height: 1,
    size: blob.size,
    ...extra
  };
  return extra.projectId || extra.kind ? record : { blob, meta: { ...record, blob: undefined } };
}

function archiveSourceRecords() {
  return {
    casting: new Map([["casting-1", archiveTestRecord("casting-1")]]),
    poster: new Map([["poster-1", archiveTestRecord("poster-1", { kind: "source" })]]),
    "project-reference": new Map([["reference-1", archiveTestRecord("reference-1", { projectId: "project-1" })]])
  };
}

async function archiveTestDecodeImage(blob, mime) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (mime !== "image/png" || bytes.byteLength !== ARCHIVE_TEST_PNG_BYTES.byteLength ||
    bytes.some((byte, index) => byte !== ARCHIVE_TEST_PNG_BYTES[index])) {
    throw new Error("图片解码失败");
  }
  return { width: 1, height: 1 };
}

function createArchiveTestService(options = {}) {
  return require("./project-archive-service.js").createService({
    decodeImage: archiveTestDecodeImage,
    ...options
  });
}

function archiveManyEntryZip(entryCount) {
  const entries = Object.fromEntries(Array.from({ length: entryCount }, (_, index) => [
    `assets/casting/${String(index + 1).padStart(6, "0")}.bin`,
    new Uint8Array()
  ]));
  return require("./vendor/fflate-0.8.2.min.js").zipSync(entries, { level: 0 });
}

function archiveMalformedPng() {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  new DataView(bytes.buffer).setUint32(8, 13);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  new DataView(bytes.buffer).setUint32(16, 1);
  new DataView(bytes.buffer).setUint32(20, 1);
  return bytes;
}

function archiveMalformedJpeg() {
  return new Uint8Array([
    0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x01, 0x00, 0x01,
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00, 0xff, 0xd9
  ]);
}

function archiveMalformedWebp() {
  const bytes = new Uint8Array(30);
  bytes.set(Buffer.from("RIFF"), 0);
  new DataView(bytes.buffer).setUint32(4, 22, true);
  bytes.set(Buffer.from("WEBPVP8X"), 8);
  new DataView(bytes.buffer).setUint32(16, 10, true);
  return bytes;
}

function archiveSha256(bytes) {
  return require("crypto").createHash("sha256").update(bytes).digest("hex");
}

function cloneArchivePackageData(packageData) {
  return {
    manifest: JSON.parse(JSON.stringify(packageData.manifest)),
    project: JSON.parse(JSON.stringify(packageData.project)),
    entries: Object.fromEntries(Object.entries(packageData.entries).map(([path, bytes]) => [path, new Uint8Array(bytes)]))
  };
}

function archivePackageBlob(entries) {
  const bytes = require("./vendor/fflate-0.8.2.min.js").zipSync(entries, { level: 6 });
  return new Blob([bytes], { type: "application/zip" });
}

function findArchiveCentralEntries(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let index = bytes.length - 22; index >= 0; index -= 1) {
    if (bytes[index] === 0x50 && bytes[index + 1] === 0x4b && bytes[index + 2] === 0x05 && bytes[index + 3] === 0x06) {
      eocd = index;
      break;
    }
  }
  const count = view.getUint16(eocd + 8, true);
  const entries = [];
  let cursor = view.getUint32(eocd + 16, true);
  for (let index = 0; index < count; index += 1) {
    const nameSize = view.getUint16(cursor + 28, true);
    const extraSize = view.getUint16(cursor + 30, true);
    const commentSize = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    entries.push({ central: cursor, local: localOffset, nameEnd: cursor + 46 + nameSize });
    cursor += 46 + nameSize + extraSize + commentSize;
  }
  return entries;
}

function findArchiveCentralEntry(bytes, path) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return findArchiveCentralEntries(bytes).find(({ central }) => {
    const nameSize = view.getUint16(central + 28, true);
    return new TextDecoder().decode(bytes.subarray(central + 46, central + 46 + nameSize)) === path;
  });
}

function mutateArchiveCentralEntry(bytes, entryIndex, mutate) {
  const entry = findArchiveCentralEntries(bytes)[entryIndex];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  mutate(view, entry.central, entry.local, entry.nameEnd);
}

function copyArchiveName(bytes, targetCentral, targetLocal, source) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const nameSize = view.getUint16(source.central + 28, true);
  view.setUint16(targetCentral + 28, nameSize, true);
  bytes.set(bytes.subarray(source.central + 46, source.central + 46 + nameSize), targetCentral + 46);
  view.setUint16(targetLocal + 26, nameSize, true);
  bytes.set(bytes.subarray(source.local + 30, source.local + 30 + nameSize), targetLocal + 30);
}

function createArchiveTestStores(records, writes, { failAfterPuts = 0, writeThenRejectAt = 0, removeFailures = new Set() } = {}) {
  let putCount = 0;
  async function create(kind, record) {
    putCount += 1;
    if (failAfterPuts && putCount > failAfterPuts) throw new Error("simulated write failure");
    if (records[kind].has(record.id)) throw new Error("ID collision");
    records[kind].set(record.id, { ...record });
    writes.push({ action: "create", store: kind, id: record.id });
    if (writeThenRejectAt === putCount) throw new Error("committed then rejected");
    return { ...record, blob: undefined };
  }
  async function removeImported(kind, id, importToken) {
    if (removeFailures.has(id)) throw new Error("simulated remove failure");
    const record = records[kind].get(id);
    if (!record || record.importToken !== importToken) return false;
    records[kind].delete(id);
    writes.push({ action: "remove", store: kind, id });
    return true;
  }
  const simpleStore = (kind) => ({
    async get(id) { return records[kind].get(id) || null; },
    async put(blob, meta) {
      putCount += 1;
      const record = { ...meta, id: meta.id, blob };
      records[kind].set(meta.id, record);
      writes.push({ action: "put", store: kind, id: meta.id });
      if (writeThenRejectAt === putCount) throw new Error("committed then rejected");
      if (failAfterPuts && putCount > failAfterPuts) throw new Error("simulated write failure");
      return { ...record, blob: undefined };
    },
    async createImportedRecord(record) { return create(kind, record); },
    async removeImportedRecord(id, importToken) { return removeImported(kind, id, importToken); },
    async remove(id) {
      if (removeFailures.has(id)) throw new Error("simulated remove failure");
      records[kind].delete(id);
      writes.push({ action: "remove", store: kind, id });
    }
  });
  return {
    casting: simpleStore("casting"),
    poster: simpleStore("poster"),
    "project-reference": {
      async getRecord(id) { return records["project-reference"].get(id) || null; },
      async putPreparedRecord(record) {
        putCount += 1;
        records["project-reference"].set(record.id, { ...record });
        writes.push({ action: "put", store: "project-reference", id: record.id });
        if (writeThenRejectAt === putCount) throw new Error("committed then rejected");
        if (failAfterPuts && putCount > failAfterPuts) throw new Error("simulated write failure");
        return { ...record, blob: undefined };
      },
      async createImportedRecord(record) { return create("project-reference", record); },
      async removeImportedRecord(id, importToken) { return removeImported("project-reference", id, importToken); },
      async remove(id) {
        if (removeFailures.has(id)) throw new Error("simulated remove failure");
        records["project-reference"].delete(id);
        writes.push({ action: "remove", store: "project-reference", id });
      }
    }
  };
}

function createArchiveTestStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}
