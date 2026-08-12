# Task 3: Image validation and import-ID collision safety

## Scope and conclusion

This is a HIGH-severity import-boundary issue. A package is untrusted input, but the current service validates the manifest's claims rather than the image bytes and then routes those bytes into overwrite-capable store methods. A malicious or merely corrupted package can therefore persist non-image bytes labelled `image/png`, or replace an existing casting/poster record if a generated ID collides.

The checked-in tests already describe the intended direction (`decodeImage`, `createImportedRecord`, and `removeImportedRecord`), but the production modules do not implement or call those contracts.

## Root cause

### Image validation

- `project-archive-service.js:271-275` verifies only hash/length and `asset.mime`; `assertImageMime` is a string allowlist, not byte validation.
- `project-archive-service.js:280-292` repeats the hash/length check on `packageData`, but does not check MIME at all and never decodes an image.
- `project-archive.js:236-241` treats manifest `meta.width`/`meta.height` as optional, attacker-controlled metadata. It does not require them or compare them with decoded dimensions.
- The service constructs `Blob` with the declared MIME at `project-archive-service.js:321`; this assigns a label to arbitrary bytes and cannot make them an image.
- The destination stores do not close this gap: casting uses raw `put` (`casting-asset-store.js:166-190`), poster uses raw `put` (`poster-asset-store.js:123-139`), and project-reference checks `Blob.type` and caller-provided dimensions but does not decode (`project-reference-store.js:28-35`).

### ID and rollback safety

- `project-archive.js:131-150` calls `createId` once per mapping and only checks non-empty/reserved values. It neither rejects source IDs/previous allocations nor checks destination occupancy.
- `project-archive-service.js:295-303` calls the normal `put` methods. Casting and poster use IndexedDB `put` (`casting-asset-store.js:176`, `poster-asset-store.js:137`), which overwrite a same-key record. Project-reference happens to use `add` (`project-reference-store.js:88`), so behaviour differs by store.
- The journal is appended after the write resolves (`project-archive-service.js:322-324`). A write that commits and then rejects is not journaled and cannot be removed. Cleanup calls unrestricted `remove` (`project-archive-service.js:305-309`), so it has no proof that a record belongs to this import; it also clears the journal even when a removal fails (`328-330`, `335-341`).

## Required validation sequence

Use the same `validatePackageData` routine for both ZIP preflight and import, with ZIP preflight supplying decoded bytes. Do every step below before allocating IDs or writing IndexedDB.

1. Bound the archive bytes; parse the central directory; reject encrypted entries, duplicate paths, unsafe paths, excessive entry count (at most `MAX_ASSETS + 2`), individual compression-ratio abuse, and a declared uncompressed total over the archive limit before `unzipSync`.
2. Inflate; require exactly `manifest.json`, `project.json`, and the manifest asset paths. Parse both JSON documents with their size limit first, then require deep equality between `project.json` and canonical `manifest.project` (not just matching IDs).
3. Validate archive format/version, identifiers, all asset fields, store/path correspondence, duplicate source IDs per store, references, asset-count, entry sizes, aggregate size, and SHA-256. Require one of JPEG/PNG/WebP at this structural stage.
4. For each asset, validate the actual bytes: strict signature/container parser for the declared MIME, then decode the `Blob` with an injectable production decoder. The decoder must fail on malformed/truncated images and return actual `{ mime, width, height }`. Reject when the parsed/decoded MIME differs from `asset.mime`, when decoded dimensions differ from `meta.width`/`meta.height`, or when any per-store size/dimension/kind policy fails. Dimensions must be mandatory for imported assets.
5. Preserve only normalized, verified metadata in the validated package result. Do not let `putAsset` consume raw manifest dimensions or a MIME that was not verified.
6. Resolve all stores and assert their create-only/owned-delete interface before allocating IDs. Allocate a distinct import token and a fully collision-free ID plan. Do not write during this stage.
7. Write one journal entry containing `{ store, id, importToken }` and persist it *before* each create attempt. Call create-only write. A collision is either retried with a new unallocated ID before any dependent write, or reported as an import failure; it must never fall through to overwrite.
8. On success, clear the journal only after every create succeeds. On failure/startup recovery, call owned deletion for each journal entry; retain and persist only entries whose deletion failed. Clear the journal only when no entries remain.

The browser decoder can use `createImageBitmap` where available and an `Image`/object-URL fallback. Pair it with format-signature parsing: browser image decode alone may sniff content and does not establish that the bytes match the declared MIME. Close bitmaps and revoke object URLs in `finally`.

## Minimal store interfaces

Do not retrofit the normal interactive `put` path for import. Add two narrow APIs to all three stores:

```js
createImportedRecord({ id, blob, meta, projectId?, importToken })
  // Validates the already-decoded, store-specific record.
  // Uses IndexedDB objectStore.add(...), never put(...).
  // Stores importToken and rejects ConstraintError as an ID collision.

removeImportedRecord(id, importToken)
  // In one readwrite transaction, reads the record and deletes it only when
  // record.importToken === importToken. Returns true when deleted, false otherwise.
```

Store-specific validation should remain authoritative: casting enforces its accepted MIME and normalized size/edge limits; poster enforces `kind` (title is PNG), source/title limits and transparency metadata; project-reference enforces project ID, MIME allowlist, Blob size and decoded dimensions. `putPreparedRecord` can remain for its existing caller, but import must use `createImportedRecord` so the operation has create-only and ownership semantics.

For ID allocation, add a small async service helper rather than expanding store reads: keep a single `usedIds` set containing the source project ID, every source asset ID, and each proposed destination ID. Reject reserved/blank IDs and retry boundedly (for example 16 attempts). Atomic `add` remains the definitive occupancy check, since `get`-then-`add` races. On a `ConstraintError`, regenerate the still-unwritten asset's ID, rebuild the project reference projection, and retry; use a project-store create-only API too if the service is made responsible for committing the returned project. The current service does not own project persistence, so its caller must commit the returned project with an equivalent `add`/create-only operation.

## Minimal regression tests

1. PNG, JPEG, and WebP whose header/container is malformed or truncated, with matching manifest hash/size/MIME: preflight and direct `importPackage` reject before any write.
2. Valid bytes declared as a different allowed MIME, and valid bytes with forged dimensions: reject before writes. Also reject missing dimensions and per-store violations (casting over its 15 MB/2560 policy; poster title non-PNG or over its title limits).
3. Preserve the existing successful 1x1 PNG fixture to prove a valid package imports through the decoder.
4. Deterministic ID generator yields source IDs, a previously allocated ID in another namespace, and an occupied destination ID: it retries; no existing record changes; returned project references match final IDs.
5. Each casting/poster/project-reference `createImportedRecord` rejects an existing key (prove `add`, not `put`).
6. A create that commits then rejects is cleaned because its journal entry was persisted first. A cleanup failure leaves exactly that `{ store, id, importToken }` entry for `recoverInterruptedImport`; a mismatched token cannot delete another record.
7. A store-interface preflight failure produces zero writes and no journal.

## Evidence and verification status

Relevant intended tests already exist in `prompt-generator.test.js:5979-6139`, including malformed image, decoded-metadata, collision, create-only, and recovery cases. They currently cannot pass against these source modules because the decoder and import-only APIs are absent/unused. I could not execute them in this environment because `node` is not installed (`zsh: command not found: node`). No production files were modified for this investigation.
