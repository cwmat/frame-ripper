# /opsx-ext-codify-bulk

Bulk-codify multiple existing capabilities into baseline OpenSpec specs in one coordinated session.

**Argument** (optional): comma-separated list of capability names, OR a directory to focus discovery on (e.g., `src/utils/`). If omitted, the workflow discovers boundaries across the whole `src/` tree and proposes them for user approval.

This is a one-time brownfield onboarding tool — for adopting OpenSpec on a stable project all at once. For incremental adoption (one capability when you happen to be working in that area), use `/opsx-ext-codify` instead.

The workflow has a **mandatory planning phase** before any spec is written: it discovers candidate capability boundaries, shows the list, and waits for the user to confirm/edit/add/remove before looping. That checkpoint is what separates this from the "auto-discover and pray" pattern that produces shallow specs.

Read `.github/skills/openspec-ext-codify-bulk/SKILL.md` and follow its workflow exactly. Pay particular attention to:
- The **clean working tree** preflight
- The **high-churn check** (bulk codifying actively-changing code produces specs that decay fast)
- The **Phase 2 approval gate** — never skip it
- The **quality floor** — halt if 2 consecutive specs come out with 0 requirements rather than continuing to produce noise

Setup note: this prompt file lives at `.codex/prompts/opsx-ext-codify-bulk.md` in the repo. To enable it as a Codex CLI slash command, symlink or copy it into `~/.codex/prompts/`.
