---
name: "OPSX-EXT: Codify"
description: Codify a single existing capability into an OpenSpec spec by reading code + tests (brownfield). Companion to OpenSpec, not official.
category: Workflow
tags: [openspec, brownfield, custom]
---

Codify one capability of the existing codebase into a baseline OpenSpec spec.

Reads the code and its tests as the source of truth, derives requirements + WHEN/THEN scenarios from observed behavior, and writes `openspec/specs/<capability>/spec.md`. Does NOT create an `openspec/changes/<name>/` — these specs are the baseline, not a delta.

**Argument**: a capability name in kebab-case (e.g., `frame-extraction`). If omitted, list candidate boundaries from `src/` and ask the user to pick.

This is one capability per invocation. Bulk codification is intentionally not supported — it produces shallow specs and contradicts OpenSpec's "build specs as you need them" philosophy.

Invoke the `openspec-ext-codify-from-code` skill and follow its workflow exactly. Pay particular attention to the **clean working tree** preflight — abort if `git status` is dirty.

ARGUMENTS: $ARGUMENTS
