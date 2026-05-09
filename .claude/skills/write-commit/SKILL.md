---
name: write-commit
description: Write a short, conventional-style commit message for the staged changes. Use when the user asks to "commit this", "write a commit message", or "commit with a good message". Optimizes for brevity.
---

# Write a commit

Brevity wins. The diff shows the *what* — the message captures the *why* in as few words as possible.

## Steps

1. Run in parallel:
   - `git status`
   - `git diff --staged` (or `git diff` if nothing staged yet)
   - `git log --oneline -10` (match this repo's existing style)
2. Pick the right type prefix:
   - `feat:` new user-facing capability
   - `fix:` bug fix
   - `perf:` performance, no behavior change
   - `refactor:` internal restructure, no behavior change
   - `ci:` workflow/build config
   - `docs:` README, CLAUDE.md, comments
   - `test:` tests only
   - `chore:` deps, formatting, tooling
3. Write the subject:
   - Lowercase, imperative, **≤ 60 chars**, no trailing period.
   - Subject says **what** changed in plain words.
4. Body — only if needed. Many commits don't need one. Add a body when the *why* is non-obvious from the diff (workaround, constraint, prior incident). Wrap at ~72 chars. One short paragraph.
5. Commit via heredoc to preserve newlines:

```
git commit -m "$(cat <<'EOF'
feat: add scene-change extraction mode

Uses ffmpeg's select=gt(scene\,0.4) filter. Threshold defaults to 0.4
based on testing against the sample clips in /public.
EOF
)"
```

## Examples (from this repo's history — match this voice)

- `perf: fix janky frame selection by removing heavy data from render loop`
- `ci: add .npmrc with legacy-peer-deps for vite 8 compat`
- `feat: add 'Extract at Cursor' extraction mode`

## Don'ts

- No emoji, no `WIP`, no `🤖 Generated with...` footers (this repo doesn't use them).
- Don't list every file changed — the diff already does that.
- Don't restate the title in the body.
- Don't `--amend` published commits or use `--no-verify`.
