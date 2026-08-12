# Ambient Music And Flexible Duration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an independent ambient-music case category and let users choose preset, custom, or natural-ending duration behavior across all music prompt outputs.

**Architecture:** Extend the existing v2 music state without removing the numeric `duration` compatibility field. Keep duration calculation and migration as pure helpers in `music-data.js`; let `music-app.js` own visibility and synchronization of the three duration modes; let `music-adapters.js` decide whether to emit a numeric duration or natural-ending language.

**Tech Stack:** Static HTML, CSS, browser JavaScript IIFEs, Node `assert` tests, Playwright CLI.

## Global Constraints

- Ambient music purpose ID is exactly `ambient_music` and displays as `氛围音乐`.
- Ship exactly eight initial ambient-music templates covering space, nature, city, science fiction, suspense, Eastern landscape, warm interior, and industrial atmosphere.
- Duration modes are exactly `preset`, `custom`, and `natural`.
- Presets are exactly 15, 30, 60, 90, 120, 180, and 300 seconds.
- Custom duration is 5–3600 seconds, entered as minutes and seconds.
- Natural mode emits no numeric target duration and preserves the last numeric value in state.
- Existing projects without duration mode migrate to `preset` and retain their original numeric duration.
- Do not claim that any platform guarantees the requested duration.
- Do not add generation APIs, audio players, upload, or DAW controls.

---

### Task 1: Duration State And Migration

**Files:**
- Modify: `music-data.js`
- Test: `prompt-generator.test.js`

**Interfaces:**
- Produces: `DURATION_MODES`, `DURATION_PRESETS`, `durationSecondsFromParts(minutes, seconds)`, `durationPartsFromSeconds(duration)`.
- Extends normalized state with `durationMode`, `customDurationMinutes`, `customDurationSeconds`.

- [ ] **Step 1: Add failing migration and conversion tests**

```js
assert.deepStrictEqual(durationPartsFromSeconds(155), { minutes: 2, seconds: 35 });
assert.strictEqual(durationSecondsFromParts(2, 35), 155);
assert.strictEqual(normalizeMusicState({ duration: 90 }).durationMode, "preset");
assert.strictEqual(normalizeMusicState({ durationMode: "custom", customDurationMinutes: 2, customDurationSeconds: 35 }).duration, 155);
```

- [ ] **Step 2: Run the Node suite and verify the new test fails**

Run `/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node prompt-generator.test.js`.
Expected: missing duration helper exports.

- [ ] **Step 3: Implement constants, helpers, defaults, and normalization**

Use:

```js
const DURATION_MODES = { preset: "常用时长", custom: "自定义时长", natural: "自然完整结束" };
const DURATION_PRESETS = [15, 30, 60, 90, 120, 180, 300];
```

Clamp custom totals to 5–3600 seconds. In natural mode retain the prior normalized `duration`; do not replace it with zero or an empty string.

- [ ] **Step 4: Run full tests and verify zero failures**

- [ ] **Step 5: Defer commit when mixed pre-existing music files prevent a clean scoped commit**

Record `git diff --check` for the touched files and do not stage unrelated work.

---

### Task 2: Ambient Music Purpose And Eight Templates

**Files:**
- Modify: `music-data.js`
- Modify: `index.html`
- Test: `prompt-generator.test.js`

**Interfaces:**
- Extends `MUSIC_PURPOSES` with `ambient_music`.
- Adds exactly eight `MUSIC_TEMPLATES` records whose IDs begin `ambient-`.

- [ ] **Step 1: Add failing catalog tests**

Assert `MUSIC_PURPOSES.ambient_music === "氛围音乐"`, exactly eight templates use that purpose, IDs are unique, and every template has non-empty scene, sceneEn, emotion, instruments, rhythm, production, duration, and BPM.

- [ ] **Step 2: Run tests and verify the purpose assertion fails**

- [ ] **Step 3: Add the eight controlled templates**

Use IDs:

```text
ambient-environmental-space
ambient-nature-meditation
ambient-city-night
ambient-deep-space
ambient-suspense-bed
ambient-eastern-landscape
ambient-warm-interior
ambient-industrial-machine
```

Use prepared English `sceneEn` values rather than generated or fake translations.

- [ ] **Step 4: Add the visible purpose button**

Add `<button type="button" data-music-purpose="ambient_music">氛围音乐</button>` to `#music-purpose-tabs`.

- [ ] **Step 5: Run the full Node suite**

Expected: zero failures and the new purpose exposes eight cards.

---

### Task 3: Flexible Duration Controls

**Files:**
- Modify: `index.html`
- Modify: `music-app.js`
- Modify: `music-workspace.css`
- Test: `prompt-generator.test.js`

**Interfaces:**
- Produces: `#music-duration-mode`, `#music-custom-duration`, `#music-duration-minutes`, `#music-duration-seconds`, `#music-duration-summary`, `#music-duration-natural-note`.
- Preserves: the existing `#music-duration` as the preset numeric select for compatibility.

- [ ] **Step 1: Add failing DOM and controller tests**

Assert the six new mode/custom/summary IDs exist exactly once and source contains `syncDurationControls`, `durationSecondsFromParts`, and natural-mode visibility logic.

- [ ] **Step 2: Run tests and verify missing controls fail**

- [ ] **Step 3: Replace the single duration field with a duration group**

Render mode select first. Keep `#music-duration` for preset values 15–300. Add minute and second number inputs inside `#music-custom-duration`. Add separate natural note.

- [ ] **Step 4: Synchronize state without destructive mode switches**

Preset change writes numeric `duration`. Custom input updates custom parts and computed `duration`. Natural mode changes only `durationMode`. `syncDurationControls` shows exactly one of preset, custom, or natural detail areas.

- [ ] **Step 5: Update template application and clear/import behavior**

Template selection sets mode to `preset` and picks its suggested duration. Import restores normalized duration mode. Clear returns to the default preset without dispatching duplicate dirty events.

- [ ] **Step 6: Style desktop and mobile controls**

Use a compact duration sub-grid. At mobile width stack mode, minute, and second fields without horizontal overflow.

- [ ] **Step 7: Run the full Node suite**

Expected: zero failures.

---

### Task 4: Adapter Output And Real Browser Verification

**Files:**
- Modify: `music-adapters.js`
- Modify: `music-app.js`
- Modify: `prompt-generator.test.js`

**Interfaces:**
- Extends `buildMusicOutput` numeric duration rendering with natural-ending output.
- Extends filename generation so natural mode uses `NATURAL`.

- [ ] **Step 1: Add failing output tests**

Assert preset 120 emits two-minute intent, custom 155 emits 155 seconds or 2 minutes 35 seconds, and natural mode:

```js
assert(!natural.combined.includes("15 seconds"));
assert(natural.combined.includes("natural full-length ending after completing the musical arc, no hard duration target"));
```

- [ ] **Step 2: Implement duration-aware adapters and filename**

In English model fields, numeric modes use an exact controlled duration phrase. Natural mode uses the exact sentence from Step 1. Chinese generic output uses `时长不做硬性限制，完成四段结构后自然结束并保留尾音`. Filename uses `NATURAL` instead of `${duration}s`.

- [ ] **Step 3: Run syntax and full Node verification**

Run `node --check` on all three music scripts, then the entire test suite. Expected: zero failures.

- [ ] **Step 4: Verify real browser flow at 1440×1024**

Open:

```text
http://127.0.0.1:8766/index.html?workspace=music&fresh=ambient-duration-final-v1
```

Select `氛围音乐`, verify eight cases, choose one, switch custom duration to 2:35, confirm output and filename. Switch to natural mode and confirm numeric duration disappears from output.

- [ ] **Step 5: Verify 1280×900, 1024×900, and 390×844**

Confirm no horizontal overflow, no obscured duration fields, and browser console has zero errors and warnings.

- [ ] **Step 6: Run final diff checks and provide acceptance URL**

Run:

```bash
git diff --check -- music-data.js music-adapters.js music-app.js music-workspace.css index.html prompt-generator.test.js
git status --short
```

Do not stage or reset unrelated existing changes. Return the URL from Step 4 and wait for user acceptance.
