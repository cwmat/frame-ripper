# GitHub Copilot instructions

This repo has tool-specific instruction files for several AI agents. Copilot reads this file; Claude Code reads [`CLAUDE.md`](../CLAUDE.md); Codex/Cursor/Aider/etc. read [`AGENTS.md`](../AGENTS.md). All three describe the same project — pick the one matching your tool.

## Project at a glance

FrameRipper is a fully client-side video-frame extractor (React 19 + ffmpeg.wasm + IndexedDB). Architecture details live in [`CLAUDE.md`](../CLAUDE.md) and [`AGENTS.md`](../AGENTS.md) — read one of those before touching extraction, state, or the frame cache.

## Commands

```bash
npm run dev         # Vite dev server
npm run build       # tsc -b && vite build
npm run lint        # eslint .
npm test            # vitest run (single pass)
```

## Style

- **Comments**: default to none. Add only when the WHY is non-obvious.
- **No backwards-compat shims** unless explicitly needed.
- **Frame data lives in IndexedDB only** — never put `Uint8Array` frame bytes into React state. Will OOM on large videos.
- **ffmpeg arg construction lives in `src/utils/ffmpegCommands.ts`** — single source of truth.

## Spec-driven development with OpenSpec

This project uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) for spec-driven changes. Specs live in `openspec/specs/`; in-flight changes in `openspec/changes/<name>/`; archived changes under `openspec/changes/archive/`.

The OpenSpec project ships official slash prompts in `.github/prompts/opsx-*.prompt.md` (`/opsx-propose`, `/opsx-apply`, `/opsx-archive`, `/opsx-sync`, `/opsx-explore`).

This repo also ships **custom companion prompts** under `.github/prompts/opsx-ext-*.prompt.md` for brownfield/migration scenarios that OpenSpec doesn't cover natively:

| Prompt | When to use |
|---|---|
| `/opsx-ext-codify <capability>` | Codify ONE existing capability into a baseline `openspec/specs/<capability>/spec.md` from observed code + tests. Requires a clean working tree. |
| `/opsx-ext-codify-bulk [scope]` | Bulk codify many capabilities in one onboarding pass. Mandatory user-approval gate on the boundary set; auto-halts on quality floor. |
| `/opsx-ext-port <source-dir>` | Port an external openspec-shaped spec into this repo as a new change, adapting design + tasks for this stack. |
| `/opsx-ext-bulk` | Apply 3+ pending changes in confirmed order with lint/build/test between each. Pauses on failure. |

The `opsx-ext:` workflows are unofficial — clearly marked so they don't get confused with future official OpenSpec commands. Full workflow bodies live in `.github/skills/openspec-ext-*/SKILL.md`.

## Tests

Vitest with `jsdom`. Tests live under `tests/` mirroring `src/utils/` (not colocated). Pure utilities are covered; ffmpeg.wasm and IndexedDB are not mocked.
