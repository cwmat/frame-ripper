---
name: review-changes
description: Review the pending diff before committing — run lint, typecheck, and tests, then read the changes for obvious issues. Use when the user says "review my changes", "check this before I commit", or after a chunk of edits.
---

# Review pending changes

Run in this order. Stop and surface failures rather than continuing past them.

## 1. Static checks (parallel)

Run these in a single message:

- `npm run lint`
- `npm run build` (this is `tsc -b && vite build` — catches type errors)
- `npm test`

If anything fails, report the failure and stop. Do not auto-fix without asking.

## 2. Read the diff

```
git status
git diff
```

Look for:
- **Frame data in React state.** This codebase deliberately keeps frame `Uint8Array`s in IndexedDB only. Pulling them into a hook, context, or component state will OOM on large videos. See `App.tsx` and `FrameGallery.tsx` for the lazy-resolve pattern.
- **New ffmpeg arg construction outside `src/utils/ffmpegCommands.ts`.** That file is the single source of truth — push new args back into `buildExtractionArgs`.
- **Settings added to `appStore` but missing from `partialize`** (or vice versa). Persisted settings live in one list; transient state in another.
- **Hardcoded `/frame-ripper/` paths.** The Vite `base` already handles this — use root-relative URLs and let Vite prepend.
- **Comments restating what the code does.** Strip them.

## 3. Report

Summarize: what passed, what failed, and any concerns from the diff read. Don't commit — leave that to the user.
