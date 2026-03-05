# BOT_CONTEXT

## Project Goal
- This repository is maintained by an automated Linear-driven coding bot.
- Primary objective: implement the requested change with minimal scope, push to a dedicated branch, and keep PR status clear.

## Workflow Contract
- Source task comes from Linear issue description.
- Preferred outcome per run:
  1. make focused code changes for the issue
  2. pass build
  3. push branch
  4. create or update PR
  5. leave clear status summary in Linear
- Branch naming convention:
  - `auto/<ISSUE_ID>-<timestamp>`

## Change Scope Rules
- Do only what is required for the issue.
- Avoid unrelated refactors.
- Keep file touch set small.
- If requirement is ambiguous, choose conservative implementation and document assumptions in summary.

## Repository Conventions
- Tech stack: Vue 3 + Vite frontend with Node backend in `server/`.
- Build command (root): `npm run build`.
- Backend dependency install path: `server/`.
- Generated file `public/git-log.json` is acceptable from prebuild scripts.

## Safety / Cost Controls
- Do not read or include large/unrelated directories in reasoning context:
  - `node_modules/`, `dist/`, `build/`, `coverage/`, `.git/`
- Avoid including binary/media artifacts in context.
- Prefer targeted reads of files directly related to the issue.

## Quality Bar
- Ensure modified code is syntactically correct.
- Run or respect build checks before finalizing.
- If build fails, keep failure details concise and actionable.

## PR / Summary Expectations
- PR and final summary should explicitly include:
  - task objective (from issue)
  - what changed (file-level)
  - branch and commit
  - build status
  - unresolved items (if any)

## Linear Status Policy
- During execution: move to `Processing` / `In Progress`.
- On successful implementation: move to `In Review`.
- On failure: rollback to backlog/todo-compatible state and explain reason.

## Notes For Repeat Runs
- If same issue is rerun, prioritize incremental updates over rewriting prior work.
- Reuse existing open PR for the same issue when possible.
