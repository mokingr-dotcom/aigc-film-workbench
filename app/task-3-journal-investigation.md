# Task 3: Journal Atomicity, Canonical Payload, and Export Limits

## Scope and evidence

This is an investigation only; production source files were not changed.

Command run:

```sh
/Users/xiaoweixiaogang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node prompt-generator.test.js
```

The suite currently has nine failing project-package checks. The failures cover rollback after a committed-but-rejected write, retained cleanup work, canonical `project.json`, export limits, central-directory limits, image validation, and the intended create-only import store APIs. The three requested problems are reproducible, not hypothetical.

Relevant implementation points:

- [project-archive-service.js](</Users/xiaoweixiaogang/Documents/AIGC 风格提示词/project-archive-service.js:316>) creates an empty journal, but only appends an entry after `await putAsset` completes at [line 323](</Users/xiaoweixiaogang/Documents/AIGC 风格提示词/project-archive-service.js:323>).
- [project-archive-service.js](</Users/xiaoweixiaogang/Documents/AIGC 风格提示词/project-archive-service.js:305>) removes with unrestricted `remove(id)`, runs removals in parallel, and never records which cleanup attempts succeeded.
- [project-archive-service.js](</Users/xiaoweixiaogang/Documents/AIGC 风格提示词/project-archive-service.js:326>) clears the journal before the caller has persisted the returned project metadata.
- [project-archive-service.js](</Users/xiaoweixiaogang/Documents/AIGC 风格提示词/project-archive-service.js:267>) checks only the two project IDs; it does not require `project.json` and `manifest.project` to be the same payload. The in-memory import path has the same gap at [line 285](</Users/xiaoweixiaogang/Documents/AIGC 风格提示词/project-archive-service.js:285>).
- [project-archive-service.js](</Users/xiaoweixiaogang/Documents/AIGC 风格提示词/project-archive-service.js:243>) emits the ZIP without validating `project.json` bytes or its final compressed byte length.

## Root Cause

### 1. The journal has an await-sized ownership gap

An IndexedDB transaction can commit its record and then report an error to the caller (or the page can terminate before its promise settles). Since the current code journals only after the awaited write, that record is not in `journal.entries` and neither immediate rollback nor startup recovery can identify it. The existing `writeThenRejectAt` regression demonstrates this exact case.

The journal also represents only assets, not the metadata commit. Clearing it when asset writes finish creates a second inconsistency window: a crash before `workspace-core` persists the returned project leaves orphaned assets; conversely, a crash after the project metadata commit but before an unrecorded finalization needs to retain, rather than delete, those assets.

### 2. Cleanup is not ownership-safe or durable per item

The journal stores only `{ store, id }`, while cleanup calls an unconditional `remove`. A future collision, a reused ID, or another import must never turn recovery into deletion of somebody else's record. Further, `Promise.all` masks which removals failed, and both failure and recovery paths clear the journal even when cleanup failed. This converts a recoverable temporary deletion failure into a permanent leak.

### 3. There are two unchecked project representations

The archive contains `manifest.project` and `project.json`. Export creates both from the same object, but import reads both and only compares IDs. A package can therefore pass with a manifest whose referenced assets describe one project and `project.json` whose creative fields describe another. `importPackage(packageData)` accepts a divergent in-memory `project` for the same reason.

### 4. Export validates too late (or not at all)

`validateArchiveManifest` has the project and asset limits, but export does not call it with byte-backed entries. It consequently permits `project.json` larger than 2 MB and returns a ZIP larger than 250 MB. Preflight also waits until after `unzipSync` to reject an excessive number of directory entries; that is an avoidable allocation/decompression exposure.

## Safe remediation

### A. Make the journal a durable import operation

Use a V2 journal. It is an intent record, written successfully before any IndexedDB create begins:

```js
{
  version: 2,
  operationId: "uuid",
  projectId: "new-project-id",
  importToken: "uuid",
  phase: "staging", // staging | metadata-committing | rollback-pending
  entries: [
    { store: "casting", id: "new-id", importToken: "uuid" }
  ]
}
```

The entry list contains every planned ID, not only successful writes. A missing record is harmless during cleanup; an unjournaled committed record is not. `saveJournal` failure must abort before the first asset write.

The import stores need explicit, validated APIs rather than the current generic `put`/`remove` pair:

```js
createImportedRecord({ id, importToken, blob, ...validatedMetadata })
removeImportedRecord(id, importToken)
```

`createImportedRecord` must use IndexedDB `add` (create-only), persist `importToken`, and resolve only on transaction completion. `removeImportedRecord` must perform "read record, compare token, delete" in one read-write transaction; it returns `false` for an absent record or a token mismatch and never deletes it. This protects pre-existing assets even if an ID allocation/cross-tab failure occurs. IDs should remain collision-resistant UUIDs, and an existing pending journal should block a new import until recovery completes.

### B. Use these precise transitions

| From | Event | Durable action | Next state |
| --- | --- | --- | --- |
| none | Preflight and fresh-ID allocation succeed | Store the full planned V2 journal. | `staging` |
| `staging` | Each asset write | Call create-only `createImportedRecord` carrying `importToken`; no journal append is needed. | `staging` |
| `staging` | All assets exist | Persist `phase: "metadata-committing"`. | `metadata-committing` |
| `metadata-committing` | Project-store write succeeds | Persist the project and its `importToken` in the same project-store write. | `metadata-committing` |
| `metadata-committing` | Finalization | Remove the journal. | none / committed |
| `staging` or `metadata-committing` | Asset, journal, or metadata error | Persist `phase: "rollback-pending"`, then perform conditional cleanup. | `rollback-pending` or none |
| `rollback-pending` | Each successful/no-longer-owned cleanup | Remove only that entry from the journal and persist the remaining list. | `rollback-pending` or none |
| `rollback-pending` with no entries | Cleanup complete | Remove journal. | none |

The operation needs a metadata-commit callback (or a staged-import/finalize API) so `workspace-core` persists the new project while the journal remains live. For example, extend import with `commitProject(project, importToken)`, called after staging and before journal removal. The callback must write the project with `importToken` in the durable project store. Leaving the existing API as "return project, caller commits later" cannot provide crash atomicity across assets and metadata.

Startup recovery must validate the journal schema strictly. A malformed/unknown journal cannot be safely interpreted as delete instructions: retain it, block further package imports, and surface a recovery-required error instead of silently treating it as absent.

For a valid journal:

1. Read the project store for `projectId` and require its persisted `importToken` to match.
2. If it matches, metadata is committed: retain assets and remove the journal.
3. Otherwise, mark/keep `rollback-pending`; remove each entry with `removeImportedRecord(id, importToken)` in reverse creation order.
4. After every successful removal, absent record, or token mismatch, persist a journal containing only the remaining entries.
5. Remove the journal only when the remaining list is empty. If a deletion fails, preserve it and return/throw a recoverable failure.

This is idempotent: recovery can run repeatedly, no project metadata means all owned staged assets are eventually removed, and committed metadata means no referenced asset is deleted. The project-store lookup is essential to distinguish a crash just before metadata persistence from a crash just after it.

### C. Establish one canonical project payload

Treat `manifest.project` as the canonical project object, and `project.json` as its required independently stored projection. Define one deterministic canonical JSON encoder that recursively sorts object keys, preserves array order, and rejects unsupported/non-JSON values. Use it to:

1. Export `project.json` from `canonicalProjectJson(manifest.project)`.
2. Before any preflight/import write, parse `project.json`, require `canonicalProjectJson(parsedProject) === canonicalProjectJson(manifest.project)`, and reject otherwise.
3. In `validatePackageData`, require the caller-provided `packageData.project`, parsed `entries["project.json"]`, and `manifest.project` all to equal the same canonical payload. Return a clone of `manifest.project` (not the caller-selected representation) after this check.

Canonical comparison avoids accepting a content mismatch while not rejecting harmless object-key ordering differences. It also makes the duplicate file meaningful rather than a second authority.

### D. Enforce limits before delivery and before inflation

Export should build byte-backed `project.json` once, then before ZIP creation:

1. Reject canonical project JSON above 2 MB.
2. Validate the manifest against concrete asset entry bytes, which applies the 160-image, 20-MB-per-image, and 250-MB aggregate limits.
3. ZIP the already validated bytes, then reject `zipped.byteLength > 250 * 1024 * 1024` before creating the Blob or object URL.

Preflight already rejects compressed input above 250 MB. It should additionally inspect the central directory before `unzipSync`: reject more than `MAX_ASSETS + 2` entries, unsafe/duplicate paths, impossible size arithmetic, per-entry over-limit candidates, and a conservative bounded uncompressed total. After inflate, retain the exact manifest-backed validation as the source of truth. This turns oversized-directory rejection into a no-inflate path and prevents a valid-ratio multi-entry expansion from allocating gigabytes before the aggregate limit is checked.

## Required regression tests

### Journal ownership and recovery

- A create transaction writes then rejects: all planned IDs were journaled before the call; conditional rollback removes the committed record and clears only after success.
- A crash simulated after the first/second create, before promise resolution: a new service instance recovers every owned planned ID, while an unrelated existing ID remains untouched.
- A create fails before commit: recovery sees the planned but absent ID, treats it as completed cleanup, and retains no journal.
- A cleanup failure leaves only the failed journal entry; a second recovery removes it. Verify entries are persisted after each successful cleanup rather than cleared wholesale.
- A record with the same ID but a different `importToken` is never removed.
- Restart in `metadata-committing` with matching persisted project token retains assets and clears the journal.
- Restart in `metadata-committing` without matching project metadata removes all owned assets.
- Journal persistence failure occurs before any create; malformed V1/V2 journal blocks a new import without deleting unknown records.
- Two concurrent/import-after-pending requests are serialized or rejected until recovery resolves.

### Canonical payload

- ZIP `project.json` with a changed name, nested reference, or selected-result field is rejected before every store write.
- `packageData.project` diverging from either `manifest.project` or bytes in `entries["project.json"]` is rejected before every store write.
- Equivalent objects with different key insertion order are accepted, and the returned/re-written project derives from the canonical manifest payload.

### Export and preflight limits

- Export rejects a canonical `project.json` of 2 MB plus one byte before `zipSync`.
- Export rejects an individual asset over 20 MB and total asset bytes over 250 MB before `zipSync`.
- A stub ZIP result above 250 MB rejects before Blob creation/download.
- A 163-entry central directory rejects before `unzipSync`; boundary 162 (160 assets plus two JSON files) proceeds to ordinary validation.
- A compressed archive that passes individual ratio checks but whose directory-declared aggregate exceeds the conservative uncompressed ceiling rejects before inflation.

## Implementation ordering

1. Add `importToken` and create-only/conditional-remove APIs to all three stores, with store-level transaction tests.
2. Replace the journal/rollback/recovery implementation and make the caller commit metadata inside the live journal operation.
3. Add canonical payload encoding/comparison in both archive entry points.
4. Apply export and pre-inflate size checks, then run the focused service tests and the full Node suite.

No code was changed during this investigation.
