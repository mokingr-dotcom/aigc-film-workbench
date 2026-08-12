# Task 3a Scoped Review: Task 1

## Findings

### P1: `project.json` is not required to be the exact canonical byte payload

`preflightPackage` parses `project.json` and compares canonicalized JavaScript values at [project-archive-service.js](project-archive-service.js:330) through [project-archive-service.js](project-archive-service.js:334). `validatePackageData` repeats the same value-level comparison at [project-archive-service.js](project-archive-service.js:352) through [project-archive-service.js](project-archive-service.js:356). Neither path compares `project.json` bytes to `utf8Encode(canonicalProjectJson(manifest.project))`.

Consequently, a ZIP with whitespace, a different key order, or duplicate JSON member names in `project.json` is accepted when it parses to the same value as `manifest.project`. Task 1 requires canonical payload equality, not just semantic object equality. Reject unless the raw `project.json` bytes exactly equal the canonical serialization of `manifest.project`; add a regression that changes only formatting/key order and confirms both `preflightPackage` and `importPackage` reject it.

### P2: The Task 1 tests do not cover the required ZIP header and directory cases

[prompt-generator.test.js](prompt-generator.test.js:5967) covers the 163-entry limit and [prompt-generator.test.js](prompt-generator.test.js:5983) covers one unsafe path, but there are no tests for duplicate paths, encrypted entries, data-descriptor flags, ZIP64 sentinel/extra fields, multi-disk fields, or oversized central-directory sizes. The test suite therefore cannot establish the Task 1 requirement that these layouts reject before any `unzipSync` call.

Add mutation-based ZIP fixtures for each field class, using the `unzipSync` call counter already established by the two existing preflight tests.

## Verified Scope

- `directoryEntries` completes before either `unzipSync` call in `preflightPackage`.
- The manifest-only extraction is filtered to `manifest.json`; fflate allocates its result from the inspected declared size, which is capped at 2 MB before this call.
- Export checks canonical `project.json` size, invokes manifest validation (including aggregate asset bytes), and rejects a completed ZIP exceeding 250 MB.

**Final: FINDINGS**
