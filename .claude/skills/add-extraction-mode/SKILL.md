---
name: add-extraction-mode
description: Add a new ExtractionMode (alongside fps, every-nth, at-cursor) end-to-end. Use when the user asks to add a new way of selecting frames — e.g. "extract one frame per scene change", "extract a time range".
---

# Add a new extraction mode

A mode change touches five layers in this order. Do them in order — type first so the rest is type-driven.

## 1. Type — `src/types/index.ts`

Extend the union and (if the mode needs new inputs) add fields to `ExtractionSettings`:

```ts
export type ExtractionMode = 'fps' | 'every-nth' | 'at-cursor' | 'my-new-mode';

export interface ExtractionSettings {
  // ... existing fields
  myNewParam: number;  // only if needed
}
```

## 2. Defaults + persistence — `src/utils/constants.ts` and `src/store/appStore.ts`

- Add the new field to `DEFAULT_SETTINGS` in `constants.ts`.
- In `appStore.ts`: add field, setter, include in `partialize` (if it should persist across reloads — settings do, transient state doesn't), and reset in `resetAll`.

## 3. ffmpeg args — `src/utils/ffmpegCommands.ts`

This file is the **single source of truth** for ffmpeg invocation. Add a branch in `buildExtractionArgs`. Note the existing patterns:

- `at-cursor` puts `-ss` **before** `-i` for fast keyframe seek.
- `every-nth` uses `\\,` in the JS string so ffmpeg sees an escaped comma in the `select` filter.
- JPG quality (`-q:v`) is appended at the end regardless of mode.

## 4. UI — `src/components/features/ExtractionSettings.tsx`

Add a radio/tab option for the new mode and any new input controls. Wire them to the `appStore` setters from step 2.

## 5. Tests — `tests/utils/ffmpegCommands.test.ts`

Add `it(...)` cases covering the new branch: typical input, edge values (0, max), and any escaping. There are 28 existing tests — match their shape.

## 6. Status label (optional)

If the new mode warrants a distinct progress label, update `STATUS_LABELS` in `constants.ts` — but the existing `extracting` / `caching` labels usually cover it.

## Verify

```
npm test && npm run build && npm run dev
```

Then drop a video in the browser and exercise the new mode end-to-end. Type-checking and unit tests do **not** verify ffmpeg actually produces the expected frames — only a real run does.
