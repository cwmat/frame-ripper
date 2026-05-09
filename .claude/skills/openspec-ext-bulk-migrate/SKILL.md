---
name: openspec-ext-bulk-migrate
description: Implement and validate multiple OpenSpec changes in one session — typically the output of repeated /opsx-ext:port runs. Orders changes, applies them sequentially with lint/test/build between each, pauses on failure. Not an OpenSpec official workflow; companion to /opsx:apply for migration scenarios. Use when the user says "implement all the ported changes", "migrate them all", "bulk apply", or has 3+ pending changes that need to ship together.
---

# Bulk-implement multiple OpenSpec changes

This skill is for the case where you have N pending changes (often from porting specs from another project) and want to implement them in one coordinated pass — not 10 separate `/opsx:apply` invocations with no shared context.

## When to use vs. not

**Use this when:**
- 3 or more changes are ready to apply (artifacts complete, `tasks.md` populated)
- The changes are part of one migration / port-batch and conceptually belong together
- Cross-cutting validation between changes matters (catch regressions early)

**Don't use this when:**
- One change. Just run `/opsx:apply <name>`.
- Changes are unrelated and would normally be separate PRs. Run them individually so each gets its own review.
- Changes touch the same files in conflicting ways. Resolve the overlap first.

## Inputs

- (Optional) An explicit ordered list of change names: `/opsx-ext:bulk a, b, c`
- (Optional) Filter expression: `/opsx-ext:bulk --tag=ui` (if user uses tags). Only honor if the user mentions one.
- If no input: discover all unarchived changes whose `apply` state is `ready` (artifacts done, tasks pending).

## Preflight

1. **Discover candidates.**
   ```bash
   openspec list --json
   ```
   Filter to entries not in `archive/` and whose status reports artifacts complete.
2. **Filter by readiness.** For each candidate run `openspec status --change <name> --json`. Skip any whose `applyRequires` aren't `done` — surface them in the report so the user knows.
3. **Order them.** Default order: alphabetical by change name. Better order, when detectable: topological by file overlap (changes that touch foundational types first, then dependents). When in doubt, ask the user to confirm or reorder.
4. **Show the queue and confirm.** Before doing any work, print the planned order and ask the user to approve, edit, or cancel. This is the single most important pause point — running 8 changes in the wrong order wastes a lot of time.
5. **Working tree should be clean.** If dirty, warn and ask whether to proceed (a clean tree makes per-change commits sensible; a dirty tree means the bulk run mixes pre-existing edits into the first change's commit).

## Steps (per change in the queue)

For each change, in order:

1. **Read context** — proposal, design, specs, tasks (the `apply` instructions tell you the paths).
2. **Implement tasks** — same logic as `/opsx:apply`. Edit files, mark each task `- [x]` as completed.
3. **Validate after the change.** Run, in this order, stopping on the first failure:
   - `npm run lint` (or this repo's lint command from `package.json` / `CLAUDE.md`)
   - `npm run build` (type-check + production build)
   - `npm test` (or equivalent — single pass, not watch mode)
4. **On success:** print a one-line `✓ <change-name>` and continue. Do **not** auto-commit, archive, or sync between changes — leave that to the user. (If the user explicitly asks for per-change commits, ask `/write-commit` or commit manually with their approval.)
5. **On failure:** stop the bulk run. Print:
   - Which change broke things
   - Which step failed (lint / build / test) and the relevant error excerpt
   - The current queue position (e.g., "3 of 7 done, broke on #4")
   - Three explicit options: **fix and resume**, **skip this change and continue**, **abort the bulk run**
   Do not auto-fix. The user picks.

## Manual verification at the end

After the queue completes (or partially completes), print a summary table:

```
✓ change-a   (12 tasks done, lint+build+test pass)
✓ change-b   (8 tasks done,  lint+build+test pass)
⚠ change-c   skipped — user choice after test failure in `tests/foo.test.ts`
○ change-d   not attempted (after stop)
```

Then surface the manual / browser-only checks that were marked off in each `tasks.md` (look for tasks under headers like "Verify end-to-end" or "Manual verification"). Call them out explicitly so the user doesn't forget — the bulk run can't run them.

Finally, suggest the next steps: run `/opsx:archive` per change once verified (or `/opsx:bulk-archive` if available in the user's profile).

## Anti-patterns

- **Auto-committing between changes.** Tempting for clean history, but it hides failures inside earlier commits. Let the user commit when they've reviewed.
- **Continuing past a failure silently.** A red lint or test means the next change builds on broken state. Always pause.
- **Picking up where you left off without re-validating.** If the user fixes a failure manually and asks to resume, re-run lint/build/test on the *current* change before moving to the next — the manual fix may have introduced a separate issue.
- **Running this on a dirty tree without warning.** The bulk run's edits will mix with the user's WIP and become impossible to bisect.
- **Doing the work of `/opsx:apply` differently.** This skill is `/opsx:apply` in a loop with validation between iterations and explicit failure handling. It should not invent new task-implementation logic.

## Composition

```
/opsx-ext:port  (×N)   →  N changes in openspec/changes/
/opsx-ext:bulk         →  applies + validates them in order
/opsx:archive  (×N)    →  user-driven, after manual verification
```
