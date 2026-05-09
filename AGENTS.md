# AGENTS.md

This file documents conventions for AI coding agents (Codex, Cursor, and any other AGENTS.md-aware tool) working in this repository.

For Claude Code-specific guidance, see [`CLAUDE.md`](./CLAUDE.md). For GitHub Copilot, see prompt files in `.github/prompts/` and skills in `.github/skills/`.

## Project at a glance

FrameRipper is a fully client-side video-frame extractor (React 19 + ffmpeg.wasm + IndexedDB). All processing happens in the browser; video bytes never leave the machine. Architecture details, the extraction pipeline, and the deliberate Zustand/IndexedDB split are in [`CLAUDE.md`](./CLAUDE.md) — read that first if you're touching extraction, state, or the frame cache.

## Commands

```bash
npm run dev         # Vite dev server on http://localhost:5173
npm run build       # tsc -b && vite build  (type-check is part of build)
npm run lint        # eslint .
npm test            # vitest run (single pass, jsdom)
npx vitest run tests/utils/ffmpegCommands.test.ts   # one file
npx vitest run -t "builds fps args"                 # by test name
```

## Spec-driven development with OpenSpec

This project uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) for spec-driven changes. The official workflow ships slash commands under the `opsx:` namespace; this repo also ships **custom companion workflows** under `opsx-ext:` for brownfield/migration scenarios that OpenSpec doesn't cover natively.

### Layout

```
openspec/
├── specs/<capability>/spec.md        # canonical spec for the capability
├── changes/<name>/                   # in-flight change proposals
│   ├── proposal.md                   # why + what
│   ├── design.md                     # how
│   ├── specs/<capability>/spec.md    # delta (ADDED / MODIFIED / REMOVED requirements)
│   └── tasks.md                      # implementation checklist
└── changes/archive/YYYY-MM-DD-<name>/   # completed changes
```

### Official workflow (use these for new features)

| Step | Command |
|---|---|
| 1. Plan a change | `openspec new change <name>` then write proposal/design/specs/tasks (or run the OpenSpec slash commands) |
| 2. Apply the change | Implement tasks in `tasks.md`, marking each `- [x]` as you go |
| 3. Sync the spec | Once tasks are complete, sync delta requirements into `openspec/specs/` |
| 4. Archive | Move the change to `openspec/changes/archive/YYYY-MM-DD-<name>/` |

The Codex-equivalent slash commands for these official steps are not pre-bundled — invoke the OpenSpec CLI directly (`openspec status`, `openspec new change`, `openspec instructions <artifact>`).

### Custom companion workflows (`opsx-ext:` — unofficial)

These three workflows exist because OpenSpec doesn't ship native support for them. They live in `.codex/prompts/` for slash invocation in Codex CLI (symlink or copy to `~/.codex/prompts/` to enable). The full workflow body for each is in `.github/skills/openspec-ext-*/SKILL.md`.

#### `/opsx-ext-codify <capability>`

**Reverse-engineer a baseline OpenSpec spec from existing code.** For brownfield projects without specs. Reads code + tests for ONE capability, derives requirements + WHEN/THEN scenarios from observed behavior, writes `openspec/specs/<capability>/spec.md`.

- One capability per invocation. Bulk codification is intentionally not supported (produces shallow specs and contradicts OpenSpec's "build specs as you need them" philosophy).
- Requires a clean working tree — specs derived from a half-edited tree will encode in-flight work as if it were stable.
- Output includes a "Source anchors" section with `file:line` refs so future maintainers can verify each requirement against current code.

Full body: [`.github/skills/openspec-ext-codify-from-code/SKILL.md`](./.github/skills/openspec-ext-codify-from-code/SKILL.md)

#### `/opsx-ext-codify-bulk [scope]`

**Bulk version of codify, for one-time brownfield onboarding.** Discovers candidate capability boundaries across `src/` (or a specified scope), shows the candidate list, and **waits for user approval before writing any spec**. After approval, loops over the single-codify workflow with quality floors that auto-halt if specs start coming out empty (signal that the boundaries are wrong).

- Use this for the narrow case of adopting OpenSpec on a stable codebase as a one-time milestone. For incremental adoption, prefer single `/opsx-ext-codify`.
- Push back on bad timing: actively-churning code, undecided boundaries, or "I want bulk to substitute for understanding the codebase" should all redirect to the single workflow.
- Quality floor: halts if 2 consecutive specs write 0 requirements, or 3 are quality-flagged total. Don't power through — surface the boundary problem to the user.

Full body: [`.github/skills/openspec-ext-codify-bulk/SKILL.md`](./.github/skills/openspec-ext-codify-bulk/SKILL.md)

#### `/opsx-ext-port <source-dir> [target-name]`

**Port a spec from another project, adapting design + tasks for this stack.** Preserves WHAT (requirements) verbatim; rewrites HOW (design.md) and STEPS (tasks.md) using this repo's stack and conventions.

- Source must be in openspec change shape (at minimum `<source-dir>/specs/<capability>/spec.md`). If not, the workflow stops and guides the user to restructure first — this composes cleanly with the official archive/sync flows downstream.
- Output is a standard `openspec/changes/<target-name>/` directory ready for `/opsx-apply` (or for the bulk workflow below).
- Pauses for user input on every requirement that names foreign tech absent from this repo. Never silently drops or auto-adapts requirements.

Full body: [`.github/skills/openspec-ext-port-spec/SKILL.md`](./.github/skills/openspec-ext-port-spec/SKILL.md)

#### `/opsx-ext-bulk [name1,name2,...]`

**Apply N pending changes in confirmed order with lint+build+test between each.** Pauses on failure with three options (fix, skip, abort).

- Use only when 3+ changes are ready and conceptually belong together (typically the output of repeated `/opsx-ext-port` runs). For one change, run `/opsx-apply <name>` directly.
- Does not auto-commit, archive, or sync between changes — that stays the user's call.
- Always shows the planned order and waits for confirmation before starting.

Full body: [`.github/skills/openspec-ext-bulk-migrate/SKILL.md`](./.github/skills/openspec-ext-bulk-migrate/SKILL.md)

### When to use which

| Situation | Workflow |
|---|---|
| New feature, blank slate | `openspec new change` (official `propose → apply → archive`) |
| Existing code with no spec, one capability | `/opsx-ext-codify <capability>` (clean tree required) |
| One-time onboarding, codify many capabilities | `/opsx-ext-codify-bulk` (mandatory boundary-approval gate) |
| Bringing a spec from another project | `/opsx-ext-port <source-dir>` to scaffold a change |
| 3+ ported changes ready to ship | `/opsx-ext-bulk` after confirming the order |

## Style and conventions

- **Comments**: default to none. Add only when the WHY is non-obvious (hidden constraint, subtle invariant, workaround for a specific bug).
- **No backwards-compat shims** unless explicitly needed. Delete unused code rather than commenting it out or renaming `_unused`.
- **Frame data in IndexedDB only** — never put `Uint8Array` frame bytes into React state, hooks, or contexts. Will OOM on large videos. See `App.tsx` and `FrameGallery.tsx` for the lazy-resolve pattern.
- **ffmpeg arg construction lives in `src/utils/ffmpegCommands.ts`** — single source of truth. Don't construct ffmpeg args anywhere else.

## Tests

Vitest with `jsdom` and `globals: true`. Tests live under `tests/` mirroring `src/utils/` (not colocated). Pure utilities are covered; ffmpeg.wasm and IndexedDB are not mocked.
