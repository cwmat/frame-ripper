---
name: openspec-ext-codify-bulk
description: Codify multiple capabilities at once into baseline OpenSpec specs — for one-time brownfield onboarding when you want a full set of specs in a coordinated pass rather than incremental single-capability runs. Mandatory planning step (user approves boundaries before any spec is written) plus quality floors prevent the "shallow specs from auto-discovery" failure mode. Use when the user says "codify everything", "bulk codify the codebase", "back-fill all our specs", or "let's adopt OpenSpec on this whole project at once".
license: MIT
compatibility: Requires openspec CLI. Companion skill, not part of the official OpenSpec project.
metadata:
  author: project-local
  version: "1.0"
---

# Bulk-codify multiple capabilities

This is the bulk version of `openspec-ext-codify-from-code`. Use when the user wants to codify a *set* of capabilities in one coordinated session — typically when adopting OpenSpec on a stable brownfield project as a one-time onboarding milestone.

## Tension with OpenSpec philosophy (read before using)

OpenSpec maintainers actively push back on upfront bulk spec generation:
> "Trying to generate all your specs upfront is a waste of time."

That advice is correct *most of the time*. But there's a narrow window where bulk codify is the right tool:

**Good times to bulk codify:**
- One-time onboarding to OpenSpec on a stable project that isn't being actively rewritten
- Monorepo-style codebase with clear package/domain boundaries the user already understands
- Preparing a baseline before starting real OpenSpec changes (so the first `/opsx-propose` has something to delta against)

**Bad times — push back instead:**
- Code is actively churning. Specs go stale before they're useful. Single-capability codify on what's stable, skip the rest.
- User hasn't decided what counts as a "capability" yet. Do that first manually — bulk codify can't think *for* the user about boundaries.
- Hoping bulk codify replaces understanding the codebase. It documents what's already understood; it doesn't substitute for understanding.

If any of the "bad times" apply, surface them and recommend the single-capability `/opsx-ext-codify` workflow instead. Don't grudgingly run bulk if you've identified a smell — better to refuse than to ship 20 weak specs.

## Inputs

- (Optional) An explicit list of capability names: `/opsx-ext-codify-bulk auth, frame-extraction, download`
- (Optional) A scope hint: a directory to focus discovery on (e.g., `src/utils/`)
- If neither: discovery runs over the whole `src/` tree and proposes boundaries.

## Preflight (mandatory)

1. **Working tree must be clean.** Same rule as single codify, more important here because bulk runs touch many files. Abort with one-line explanation if `git status` is dirty.
2. **High-churn check.** Run `git log --since="30 days ago" --pretty=oneline -- src/ | wc -l`. If recent commit volume is high (rough heuristic: >40 commits in 30 days touching `src/`), surface it and ask whether to proceed — bulk codifying a churning codebase produces specs that decay fast.

## Phase 1 — Discover

Survey the codebase for natural capability boundaries. Sources, in priority order:

1. **Top-level feature folders** — `src/components/features/<X>/`, `src/hooks/use<X>.ts`, `src/utils/<X>.ts` are usually capability-shaped.
2. **Test file groupings** — files in `tests/` cluster by capability. A folder of related test files is strong evidence of a capability boundary.
3. **Public exports of clearly-named modules** — exports from `src/utils/<name>.ts` that have no internal callers but are reached by the rest of the app are capability surfaces.
4. **Domain naming** — files matching shared name fragments (e.g., everything `*Frame*`) often constitute one capability.

For each candidate, capture:
- **Name** (kebab-case, derived from the folder/file/domain)
- **Scope** (1-line: which files/tests are in this capability's surface)
- **Estimated requirement count** (rough: `# of public exports + # of test cases`)
- **Confidence** — high (clear surface + good tests), medium (clear surface but light tests), low (fuzzy boundary or no tests). Confidence drives default order.
- **Existing spec?** — if `openspec/specs/<capability>/spec.md` already exists, mark for skip-or-overwrite decision in Phase 2.

Output of this phase is a single proposed list, **not** any written specs.

## Phase 2 — Approve (mandatory pause)

Show the candidate list to the user as a table:

```
#  Capability         Scope                                  Reqs (est)  Confidence  Existing?
1  frame-extraction   src/hooks/useFrameExtractor.ts + ...   ~6          high        no
2  ffmpeg-loader      src/wasm/ffmpegLoader.ts               ~3          high        no
3  download           src/hooks/useDownload.ts               ~4          medium      no
…
```

Then prompt the user to confirm:

1. **Boundaries**: Add, remove, rename, or merge any rows. Do not proceed with the default list silently — assume the user wants to edit.
2. **Order**: Default is by confidence descending. User can reorder.
3. **Mode**: `interactive` (pause for ack after each spec, recommended for first-time bulk) or `unattended` (write all then review at end).
4. **Existing specs policy**: skip / overwrite / append per-capability or one global default.

**No specs are written until the user signs off on this list.** This is the single most important checkpoint in the workflow.

## Phase 3 — Loop

For each approved capability, run the **single-capability codify workflow** body from `openspec-ext-codify-from-code` exactly as documented there:

1. Map the capability (read public surface + tests + types)
2. Draft requirements (SHALL statements derived from observed behavior)
3. Pull scenarios from tests (4-hash `#### Scenario:` per test case)
4. Write `openspec/specs/<capability>/spec.md` with the canonical shape
5. Append "Source anchors" section with `file:line` refs

After each capability:
- Print a 3-line summary: requirements written, scenarios written, source anchors count
- **Quality check**: if a spec wrote 0 or 1 requirements, mark it ⚠ in the summary — the boundary is probably wrong
- If `interactive` mode: pause and ask user `continue / skip / edit / abort` before next capability
- If `unattended` mode: continue, but count quality-flagged specs

**Quality floor — auto-halt rules:**
- If **2 consecutive** specs write 0 requirements → halt. Boundaries are wrong; surface that and ask the user to revisit Phase 2.
- If **3 capabilities total** are quality-flagged across the run → halt with the same message.

Don't power through quality issues. The goal is a usable baseline, not a number of files written.

## Phase 4 — Final review

After the loop completes (or partially completes), print a summary table:

```
✓ frame-extraction     6 reqs, 14 scenarios   src/hooks/useFrameExtractor.ts:30-130
✓ ffmpeg-loader        3 reqs, 6 scenarios    src/wasm/ffmpegLoader.ts:1-60
⚠ ui-toasts            1 req,  1 scenario     LOW QUALITY — consider redrawing boundary
○ download             not attempted (run halted at quality floor)
```

Then:
1. Recommend `git status` and `git diff openspec/specs/` so the user can review the batch as a unit.
2. Suggest reviewing low-quality (`⚠`) entries first — they're the boundary mistakes.
3. **Do not commit.** Each spec is the user's to review, edit, and stage.
4. If the run halted partway, hint at how to resume: re-run `/opsx-ext-codify-bulk` and the discovery phase will skip already-written `openspec/specs/<capability>/spec.md` files (per the existing-spec policy chosen in Phase 2).

## Anti-patterns (refuse to do these)

- **Skipping Phase 2 ("just go fast").** The user-approved boundary set is what makes bulk codify produce usable specs. Without it, you ship noise.
- **Codifying everything in `src/`.** Some files are too small or incidental to merit a capability spec. Single-file utility modules with two exports usually shouldn't be their own capability — fold them into a parent or skip.
- **Power-walking past quality flags.** If specs are coming out empty, the boundaries are wrong. Halt, don't continue.
- **Auto-committing the batch.** Same reason as `/opsx-ext-bulk` for apply: hides issues, makes review harder.
- **Treating bulk as an alternative to single codify rather than a sibling.** The single-capability workflow remains the right tool for incremental adoption. Bulk is the one-time-onboarding tool.

## Composition

```
/opsx-ext-codify-bulk           →  N entries in openspec/specs/<capability>/spec.md
                                   (review + commit by the user)
/opsx-propose <future-change>   →  delta against the baseline written here
```

After bulk codify, future capability additions or modifications should go through normal `/opsx-propose` → `/opsx-apply` → `/opsx-archive` flow with the new specs as the baseline. Don't re-bulk.
