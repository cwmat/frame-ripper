---
name: "OPSX-EXT: Bulk apply"
description: Implement multiple OpenSpec changes in dependency order, with lint/test/build between each. Pauses on failure. Companion to OpenSpec, not official.
category: Workflow
tags: [openspec, migration, custom]
---

Apply multiple OpenSpec changes in one coordinated session — typically for migration work where you've ported many specs and need to ship them together.

For each change in the queue: read context, work through `tasks.md`, then run lint + build + test. On failure: stop and surface options (fix, skip, abort). Does NOT auto-commit, archive, or sync between changes — that's the user's call.

**Argument** (optional): comma-separated list of change names in the order to apply. If omitted, the skill discovers all unarchived changes that are `apply`-ready and proposes an order for the user to confirm.

Use this only when 3+ changes are ready and conceptually belong together. For a single change, run `/opsx:apply <name>` directly.

Invoke the `openspec-ext-bulk-migrate` skill and follow its workflow exactly. Pay particular attention to the **confirm-the-queue** preflight — never start implementing without showing the user the planned order first.

ARGUMENTS: $ARGUMENTS
