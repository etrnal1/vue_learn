# BOT_CONTEXT

- Do minimal, issue-scoped changes only.
- Process only `Processing/In Progress` issues with required labels.
- One issue per run; unchanged fingerprint => skip.
- Reuse existing PR for same issue; else use `auto/<ISSUE_ID>-<timestamp>`.

- Model selection:
  - default provider: Claude
  - auto routing: docs/simple -> `haiku`, general -> `haiku`
  - `model:*` label overrides auto routing

- Docs tasks:
  - try literal fast-path first
  - if fast-path misses, fallback to AI (do not fail immediately)

- Build:
  - docs-only changes (`.md/.markdown/.txt/.rst`) => skip build
  - otherwise run `npm run build`

- Keep context small: avoid `.git`, `node_modules`, `dist`, `build`, `coverage`, binaries/media.
- On failure: write clear reason to Linear and record fingerprint.
- On success: move to `In Review` and report branch/commit/PR/build result.
