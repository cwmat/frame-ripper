---
description: Codify multiple capabilities at once into baseline OpenSpec specs, with mandatory user-approved boundary planning. Companion to OpenSpec, not official.
---

Bulk-codify multiple existing capabilities into baseline OpenSpec specs in one coordinated session.

**Argument** (optional): comma-separated list of capability names, OR a directory to focus discovery on (e.g., `src/utils/`). If omitted, the skill discovers boundaries across the whole `src/` tree and proposes them for user approval.

This is a one-time brownfield onboarding tool — for adopting OpenSpec on a stable project all at once. For incremental adoption (one capability when you happen to be working in that area), use `/opsx-ext-codify` instead.

The workflow has a **mandatory planning phase** before any spec is written: the skill discovers candidate capability boundaries, shows the list, and waits for the user to confirm/edit/add/remove before looping. That checkpoint is what separates this from the "auto-discover and pray" pattern that produces shallow specs.

Invoke the `openspec-ext-codify-bulk` skill at `.github/skills/openspec-ext-codify-bulk/SKILL.md` and follow its workflow exactly. Pay particular attention to:
- The **clean working tree** preflight
- The **high-churn check** (bulk codifying actively-changing code produces specs that decay fast)
- The **Phase 2 approval gate** — never skip it
- The **quality floor** — halt if 2 consecutive specs come out with 0 requirements rather than continuing to produce noise

ARGUMENTS: $ARGUMENTS
