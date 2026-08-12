# Task 3a Fix Report

## Scoped changes

- `project-archive-service.js` now requires the raw `project.json` bytes to equal `utf8Encode(canonicalProjectJson(manifest.project))` in both `preflightPackage` and `validatePackageData`.
- Central-directory validation now rejects ZIP64 size sentinels and ZIP64 extra fields before extraction.
- `prompt-generator.test.js` adds a formatting/key-order mutation that must be rejected by both preflight and import validation.
- `prompt-generator.test.js` adds pre-inflate mutation coverage for duplicate paths, encrypted entries, data descriptors, ZIP64 sentinel and extra fields, multi-disk entries, and oversized central-directory records.

## Verification

Command:

```text
/Users/xiaoweixiaogang/.local/node-v24.15.0/bin/node prompt-generator.test.js
```

The two scoped Task 3a tests pass:

- `project archive rejects unsafe central-directory mutations before inflate`
- `project archive requires project.json bytes to equal the canonical manifest project`

The full suite exits with code 1 because six unrelated archive import/storage tests fail in the existing workspace state:

- `project archive service rewrites every package ID and rolls back only newly written assets`
- `project archive rejects malformed PNG JPEG and WebP plus decoded metadata mismatches before writes`
- `project archive allocates collision-free IDs and uses create-only storage`
- `project archive journals before writes and cleans a record when create commits then rejects`
- `project archive retains failed cleanup entries for startup recovery`
- `archive import stores expose create-only owned-record APIs`

No commit was created.
