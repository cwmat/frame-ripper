## 1. Types and defaults

- [x] 1.1 Add `reverse: boolean` to `ExtractionSettings` in `src/types/index.ts`
- [x] 1.2 Add `reverse: false` to `DEFAULT_SETTINGS` in `src/utils/constants.ts`

## 2. Store

- [x] 2.1 Add `reverse: boolean` field to `AppState` and initialize from `DEFAULT_SETTINGS.reverse` in `src/store/appStore.ts`
- [x] 2.2 Add `setReverse(value: boolean)` setter
- [x] 2.3 Include `reverse` in `partialize` so it persists to `frame-ripper-settings`
- [x] 2.4 Reset `reverse` in `resetAll` (no need to reset in `resetExtraction` — it's a setting, not transient state)

## 3. Pure helper for index/filename placement

- [x] 3.1 Add `computeFramePlacement(i, total, originalName, reverse) → { index, filename }` to `src/utils/ffmpegCommands.ts` (or a sibling file in `src/utils/`)
- [x] 3.2 Filename uses 4-digit zero-padded numbering matching ffmpeg's `frame_%04d.<ext>` shape; extension is preserved from `originalName`

## 4. Wire reversal into the extraction loop

- [x] 4.1 In `src/hooks/useFrameExtractor.ts`, pass `settings.reverse` and `totalFrames` into `computeFramePlacement` inside the per-frame loop
- [x] 4.2 Replace the literal `index: i` and `filename: file.name` assignments on the saved `ExtractedFrame` with the helper's outputs
- [x] 4.3 Confirm `buildExtractionArgs` is **not** modified — reversal must not change the ffmpeg arg list

## 5. UI

- [x] 5.1 Add a "Reverse order" checkbox/toggle to `src/components/features/ExtractionSettings.tsx`, bound to `useAppStore(s => s.reverse)` and `setReverse`
- [x] 5.2 Disable the toggle while `isExtracting` (mirror the existing pattern used by the other inputs)
- [x] 5.3 Show helper text under the toggle: "Last frame becomes #1"
- [x] 5.4 Place the toggle near the format/quality controls — not inside the mode-specific sub-panels — so it visually reads as orthogonal to the mode

## 6. Tests

- [x] 6.1 Add `tests/utils/computeFramePlacement.test.ts` (or extend `tests/utils/ffmpegCommands.test.ts`) covering: `total=1` reverse on/off, `total=2` reverse on/off, `total=N` reverse maps `i=0` to last filename and `i=N-1` to first, filenames are unique and zero-padded, extension is preserved for both `.jpg` and `.png`
- [x] 6.2 Add a `buildExtractionArgs` regression test asserting deep equality between `reverse: true` and `reverse: false` arg arrays (settings otherwise equal) for each `ExtractionMode`

## 7. Verify end-to-end

- [x] 7.1 `npm run lint`
- [x] 7.2 `npm run build` (type-check + production build)
- [x] 7.3 `npm test` (all 28 existing tests pass + new tests)
- [x] 7.4 `npm run dev` — drop a video, toggle Reverse, extract under each mode (`fps`, `every-nth`, `at-cursor` with `nearbyFrames > 0`), verify gallery order and ZIP filename order match the reversed sequence
- [x] 7.5 Reload the page mid-flow and confirm the Reverse toggle persists
