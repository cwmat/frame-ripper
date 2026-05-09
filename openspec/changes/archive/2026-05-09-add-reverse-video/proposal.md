## Why

FrameRipper currently extracts frames in forward temporal order only. Users producing boomerang loops, reverse-action GIFs, sprite sheets that animate backwards, or ML datasets requiring time-reversed sequences have to re-sort frames manually after download. A native "reverse" option keeps the workflow in-app and makes the output usable as-is.

## What Changes

- Add a **Reverse** toggle to the extraction settings panel, applied as a final pass over the extracted frame set regardless of selection mode (`fps`, `every-nth`, `at-cursor`).
- When enabled, frame indices and on-disk filenames (`frame_0001.jpg` …) are assigned in reverse temporal order so the **last frame of the source becomes `frame_0001`** and the first becomes `frame_NNNN`.
- The toggle is orthogonal to the existing `ExtractionMode` — not a new mode. It composes with format (`jpg`/`png`), quality, and all three selection modes.
- Persist the toggle alongside the other extraction settings (`frame-ripper-settings` localStorage).
- Surface reverse state in the FrameGallery thumbnails' index labels so the order is visible to the user.

## Capabilities

### New Capabilities
- `reverse-extraction`: User-controllable toggle that reverses the temporal order of extracted frames. Covers settings UI, persistence, the post-extraction reorder step, and how downstream consumers (gallery, ZIP) observe the reversed order.

### Modified Capabilities
<!-- No existing specs in openspec/specs/ — all behavior is new. -->

## Impact

- **Code**:
  - `src/types/index.ts` — extend `ExtractionSettings` with `reverse: boolean`.
  - `src/utils/constants.ts` — add `reverse: false` to `DEFAULT_SETTINGS`.
  - `src/store/appStore.ts` — add field, setter, include in `partialize`, reset in `resetAll`.
  - `src/utils/ffmpegCommands.ts` — no change to ffmpeg args; reversal happens in JS post-extraction so it composes with all modes.
  - `src/hooks/useFrameExtractor.ts` — when `settings.reverse`, assign `index` and `filename` based on reversed position before calling `saveFrame`. The IndexedDB `by-index` ordering then drives the gallery and ZIP without further changes.
  - `src/components/features/ExtractionSettings.tsx` — checkbox/toggle UI bound to the store.
  - `tests/utils/` — no new ffmpegCommands tests needed; add coverage for the reversal helper if extracted as a pure function (recommended).
- **APIs / dependencies**: none. Pure JS reordering of an in-memory file list. No new packages.
- **Storage**: no IndexedDB schema change; only the `index` values written differ.
- **PWA / build**: unaffected.
- **Tests**: existing 28 tests continue to pass unchanged. New unit test(s) for the reversal helper.
