---
name: "OPSX-EXT: Port"
description: Port an external openspec-shaped spec into this repo as a new change, adapting design + tasks for the current stack. Companion to OpenSpec, not official.
category: Workflow
tags: [openspec, migration, custom]
---

Port a spec from another project into a new openspec change in this repo.

Preserves the source's requirements (WHAT) verbatim, regenerates `proposal.md`, `design.md`, and `tasks.md` for this repo's stack (HOW + STEPS). Output is a standard `openspec/changes/<name>/` directory that composes with `/opsx:apply`, `/opsx:archive`, and `/opsx:sync`.

**Argument**: a path to a directory containing openspec-shaped artifacts (at minimum `specs/<capability>/spec.md`). Optionally followed by a target change name.

The source MUST be laid out in openspec change shape — that's deliberate, so the skill can rely on a known structure and so the port composes with `/opsx-ext:bulk` for downstream "implement all" runs. If the source isn't shaped that way, the skill will guide the user to restructure it before proceeding.

Invoke the `openspec-ext-port-spec` skill and follow its workflow exactly. Pause before silently dropping or auto-adapting any requirement that names foreign tech absent from this repo.

ARGUMENTS: $ARGUMENTS
