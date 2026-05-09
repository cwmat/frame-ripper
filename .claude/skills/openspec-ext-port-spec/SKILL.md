---
name: openspec-ext-port-spec
description: Port a spec (or a folder of openspec-shaped artifacts) from another project into this repo as a new openspec change, adapting design + tasks to this repo's stack. Preserves WHAT (requirements) and rewrites HOW (design) and STEPS (tasks). Output is a standard openspec/changes/<name>/ ready for /opsx:apply. Use when the user says "port the spec from <other project>", "I have specs from another repo I want to bring over", or "adapt this old spec for our new stack".
---

# Port a spec into this project

External specs are valuable; their *implementation strategy* usually isn't. This skill keeps the requirements (WHAT) and rebuilds the design + tasks (HOW + STEPS) for the current stack, then lays it out as a standard openspec change so it composes with `/opsx:apply`, `/opsx:archive`, and `/opsx:sync`.

## Inputs

- **Source path**: a directory on disk containing openspec-shaped artifacts. Expected layout — at minimum:
  ```
  <source-dir>/
  ├── proposal.md           (optional but useful)
  ├── specs/
  │   └── <capability>/
  │       └── spec.md       (REQUIRED — this is what gets ported)
  ├── design.md             (optional — will be rewritten)
  └── tasks.md              (optional — will be rewritten)
  ```
- **Target change name** (kebab-case). If missing, derive from the source's capability name + a verb prefix (e.g., `add-user-auth`).

If the source isn't laid out this way, **stop and guide the user** to restructure it. Refusal here saves a lot of cleanup later — point them at the shape above and offer to help create a wrapper directory.

## Preflight

1. Confirm `openspec/changes/<target-name>/` does not exist. If it does, ask: continue the existing change or pick a new name?
2. Read this repo's stack signals (these inform the rewrite):
   - `package.json` — dependencies, framework, test runner
   - `CLAUDE.md` — architecture conventions, persistence model, file layout
   - `tsconfig.json` / language configs
3. Read the source spec to identify any tech-stack-specific assumptions (e.g., "stores in PostgreSQL", "uses Redux", "Express middleware"). Flag these for the user before proceeding — some may not translate.

## Steps

1. **Scaffold via the official tool.** Use `openspec new change <target-name>` so `.openspec.yaml` and the directory shape match exactly what `/opsx:apply` expects.
2. **Copy the spec.** For each `<source-dir>/specs/<capability>/spec.md`, copy to `openspec/changes/<target-name>/specs/<capability>/spec.md` wrapped with `## ADDED Requirements` (since it's new in this repo). Preserve every Requirement and Scenario. Use exactly **4 hashes** for `#### Scenario:`.
3. **Adapt requirements that name foreign tech.** For each requirement that references a stack-specific component absent from this repo, ask the user:
   - "The source spec requires *<foreign-thing>*. This repo uses *<local-equivalent>*. Adapt the requirement, port verbatim, or drop?"
   Default to "adapt" and propose new wording. Do not silently drop — every dropped requirement should be visible in the diff and noted in `proposal.md` under Impact.
4. **Write `proposal.md`** following the official template:
   - **Why**: this project's reason for adopting the capability (ask the user if the source's Why doesn't translate)
   - **What Changes**: derived from the spec's requirements
   - **Capabilities → New**: list each capability ported
   - **Impact**: file paths in *this* repo (use Glob to locate the right modules), this repo's storage/state, this repo's tests
5. **Write `design.md`** from scratch. Discard the source's design — the *decisions* don't apply, only the *constraints*. Cover:
   - Context: brief — "porting from <source>"
   - Goals / Non-Goals (carry from source if still applicable; cut anything stack-bound)
   - Decisions: rewrite for this stack. Map old → new explicitly:
     `> Source used <X>; this design uses <Y> because <reason from this repo's CLAUDE.md / conventions>.`
   - Risks / Trade-offs: flag any requirement that didn't translate cleanly
   - Migration plan: usually "additive — no migration" for ported features
6. **Write `tasks.md`** from scratch. Group by layer following this repo's architecture (e.g., types → store → utils → hooks → UI → tests → verify). Use the actual file paths from this repo, not the source's. Use `- [ ]` checkbox format so `/opsx:apply` can track progress.
7. **Validate the change.** Run `openspec status --change <target-name>` and confirm all 4 artifacts are `done`. Surface any validation errors to the user before declaring success.

## Output

Print:
- The target change directory
- A summary of what was preserved verbatim vs. adapted vs. flagged for user attention
- The exact next command: `/opsx:apply <target-name>`

## Anti-patterns

- **Porting tasks from the source.** They reference the source repo's file paths and conventions; they're never right for the target. Always rewrite.
- **Auto-adapting silently.** Every adaptation that changes a requirement's meaning must be confirmed with the user. Better to pause than to ship a quietly-wrong spec.
- **Skipping the `proposal.md` Why rewrite.** A copied Why ("we need this for our compliance audit") that doesn't apply here will mislead future readers and the agent that runs `/opsx:apply`.
- **Bundling multiple unrelated capabilities into one ported change.** If the source has three independent capabilities, run the skill three times (or guide the user to split the source first).

## Composition

Output composes with the standard OpenSpec lifecycle:

```
/opsx-ext:port  →  openspec/changes/<name>/   (this skill)
/opsx:apply     →  implements tasks.md
/opsx:archive   →  moves to archive/, can sync to openspec/specs/
```

For multiple changes from the same source repo, run this skill per-change, then `/opsx-ext:bulk` to implement them in dependency order.
