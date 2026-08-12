# 项目生产包安全重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` task-by-task.

**Goal:** Replace the unsafe first archive importer with a bounded, validated, collision-safe, recoverable local project-package import path.

**Architecture:** The work is split into sequential boundaries. First inspect a Classic ZIP central directory before payload extraction. Next validate real image bytes and use create-only store records. Finally make the import journal own every planned asset until the caller durably commits the project metadata.

**Tech Stack:** Vanilla JavaScript, DataView, fflate 0.8.2, IndexedDB, localStorage, existing Node assertions.

## Task 1: Pre-inflation ZIP and canonical payload

**Files:** `project-archive-service.js`, `prompt-generator.test.js`.

- [ ] Add failing tests for 163 entries, unsafe/duplicate paths, encrypted/data-descriptor/ZIP64/multi-disk fields, oversized central-directory sizes, and mismatched `manifest.project` / `project.json`.
- [ ] Add a `DataView` Classic-ZIP inspector that rejects unsupported layouts and validates every central/local header before any full `unzipSync`.
- [ ] Extract only bounded `manifest.json` first; validate exact entries against it, then extract all bounded payloads.
- [ ] Canonically serialize project JSON with sorted object keys and require byte payload, manifest project and import input to match.
- [ ] Enforce project JSON, asset aggregate and final ZIP size during export.
- [ ] Run the full Node suite.

## Task 2: Verified images and create-only imported records

**Files:** `project-archive-service.js`, `casting-asset-store.js`, `poster-asset-store.js`, `project-reference-store.js`, `prompt-generator.test.js`.

- [ ] Add tests for corrupt/declared-wrong image bytes, mismatched dimensions, source-ID collisions, occupied destination IDs and create-only behavior.
- [ ] Validate PNG/JPEG/WebP signatures, decode image dimensions with an injectable decoder, and reject declared MIME/dimension mismatch before every write.
- [ ] Add `createImportedRecord` using IndexedDB `add` and `removeImportedRecord(id, importToken)` to all three stores.
- [ ] Allocate unique fresh IDs with bounded retry and reject a collision rather than overwriting.
- [ ] Run the full Node suite.

## Task 3: V2 journal and project-commit transaction

**Files:** `project-archive-service.js`, `workspace-core.js`, `prompt-generator.test.js`.

- [ ] Add tests for committed-then-rejected writes, deletion failures, restart recovery and metadata commit interruption.
- [ ] Persist a V2 journal containing all planned IDs and an import token before the first asset write.
- [ ] Keep the journal through a caller-owned, create-only project metadata commit; clear it only after that commit succeeds.
- [ ] Recover by retaining assets for a matching committed project token or conditionally removing only token-owned staged assets. Preserve failed cleanup entries.
- [ ] Run the full Node suite and a clean-browser import/export scenario.

