# /opsx-ext-codify

Codify one capability of the existing codebase into a baseline OpenSpec spec.

Reads the code and its tests as the source of truth, derives requirements + WHEN/THEN scenarios from observed behavior, and writes `openspec/specs/<capability>/spec.md`. Does NOT create an `openspec/changes/<name>/` — these specs are the baseline, not a delta.

**Argument**: a capability name in kebab-case (e.g., `frame-extraction`). If omitted, list candidate boundaries from `src/` and ask the user to pick.

This is one capability per invocation. Bulk codification is intentionally not supported — it produces shallow specs and contradicts OpenSpec's "build specs as you need them" philosophy.

Read `.github/skills/openspec-ext-codify-from-code/SKILL.md` and follow its workflow exactly. Pay particular attention to the **clean working tree** preflight — abort if `git status` is dirty.

Setup note: this prompt file lives at `.codex/prompts/opsx-ext-codify.md` in the repo. To enable it as a Codex CLI slash command, symlink or copy it into `~/.codex/prompts/`.
