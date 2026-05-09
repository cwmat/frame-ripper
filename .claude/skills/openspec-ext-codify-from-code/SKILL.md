---
name: openspec-ext-codify-from-code
description: Reverse-engineer an OpenSpec capability spec from existing code in a brownfield project. ONE capability at a time — reads source + tests, derives requirements with WHEN/THEN scenarios, writes openspec/specs/<capability>/spec.md. Not an OpenSpec official workflow; companion to it. Use when the user asks to "codify what's already built", "generate a spec for the existing X feature", or "back-fill specs for this brownfield code".
---

# Codify existing code into an OpenSpec spec

Brownfield projects have working code but no specs. This skill produces a single capability spec by *observing* the code, not by imagining new behavior.

## Core principle

**The code + its tests are the contract. Specs document, they don't invent.**
If a behavior isn't in the code or asserted by a test, do not write a requirement for it. Speculative requirements pollute the baseline and force fake compliance later.

## Inputs

- A capability name (kebab-case). If not provided, prompt the user — list candidate boundaries you see in `src/` and let them pick. Don't auto-select.
- (Optional) A scope hint: file paths, a feature folder, or a test file the capability is exercised by.

## Preflight (mandatory)

1. **Working tree must be clean.** Run `git status` — if there are uncommitted changes, abort with a one-line explanation: specs derived from a half-edited tree will encode in-flight work as if it were stable.
2. Confirm `openspec/specs/<capability>/spec.md` does **not** already exist. If it does, ask whether to overwrite, append, or pick a new name.

## Steps

1. **Map the capability.** Use Glob/Grep to identify:
   - Public entry points (exported functions, components, hooks, routes, classes)
   - Tests for this capability (richest behavior source — assertions are proto-scenarios)
   - Type definitions / interfaces that shape the contract
   - Any constants/config that constrain behavior
2. **Read what you found.** Don't summarize — read enough to state what each entry point *does*, what it *returns*, and what edge cases the tests pin down.
3. **Draft requirements.** Each requirement is a SHALL/MUST statement that's *currently true*. Categories that usually surface:
   - **Contract**: what inputs map to what outputs
   - **Invariants**: state shape, ordering, uniqueness
   - **Edge handling**: empty/zero/boundary inputs, error paths
   - **Integration**: how this capability talks to others (storage, network, other modules)
4. **Pull scenarios from tests.** Every existing test maps cleanly to a `#### Scenario:` block. The test description becomes the scenario name; arrange/assert lines become WHEN/THEN. Use exactly **4 hashes** for `#### Scenario:` (3 silently fails OpenSpec validation).
5. **Write the spec** to `openspec/specs/<capability>/spec.md` using this shape:

   ```md
   # <capability-name>

   <one-paragraph description of what this capability covers, derived from observed code>

   ## Requirements

   ### Requirement: <name>
   The system SHALL <observed behavior>.

   #### Scenario: <name from test or behavior>
   - **WHEN** <condition>
   - **THEN** <observed outcome>
   ```

6. **Append a "Source anchors" section** at the bottom listing each requirement with a `file:line` pointer to where the behavior lives. This makes the spec auditable — a future maintainer can verify the requirement against current code:

   ```md
   ## Source anchors (codified <YYYY-MM-DD> at commit <sha>)

   - Requirement: <name> — `src/path/file.ts:42`, `tests/path/file.test.ts:17-29`
   ```

7. **Show the diff and stop.** Do not commit. Print the new file path and a 3-line summary: how many requirements, how many scenarios, where the source anchors point. Hand control back so the user can review and tweak.

## Anti-patterns (refuse to do these)

- **Codifying multiple capabilities in one run.** One per invocation. Bulk codification produces shallow specs because attention dilutes across modules.
- **Codifying actively-churning code.** If `git log -- <files>` shows heavy recent activity, surface that to the user and ask whether to wait until it settles.
- **Inventing aspirational requirements.** ("Should support i18n" — does the code support i18n today? If no, don't write it.) Aspirations belong in `/opsx-ext:port` or a regular `/opsx:propose`, not here.
- **Skipping tests.** If the capability has no tests, *say so explicitly* in the output: scenarios will be weaker. Suggest adding tests before re-running, or proceed with code-derived scenarios marked `<!-- inferred from code, not test-asserted -->`.

## Composition

The output is a normal canonical spec. From here:
- A future change can delta against it via `/opsx:propose` → `specs/<capability>/spec.md` with `## MODIFIED Requirements`.
- Run `/opsx-ext:codify` once per stable capability over time. This is the recommended path — it aligns with OpenSpec's "build specs as you need them" philosophy.
- For the narrow case where you genuinely want to codify *many* capabilities in one onboarding pass (stable codebase, one-time adoption milestone), see `/opsx-ext:codify-bulk`. It runs this same workflow in a loop with a mandatory user-approval gate on the boundary set, plus quality floors that halt the run if specs start coming out empty. Don't reach for the bulk version by default.
