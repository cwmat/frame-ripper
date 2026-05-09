## 1. Types and defaults

- [x] 1.1 Add `maxWidth: number` to `ExtractionSettings` in `src/types/index.ts`
- [x] 1.2 Add `maxWidth: 0` to `DEFAULT_SETTINGS` in `src/utils/constants.ts`
- [x] 1.3 Define a small preset list (e.g. `OUTPUT_WIDTH_PRESETS = [0, 1920, 1280, 854, 640]` with `0` meaning "Original") in `src/utils/constants.ts`

## 2. Store wiring

- [x] 2.1 Add `maxWidth: number` and `setMaxWidth: (n: number) => void` to the `AppState` interface in `src/store/appStore.ts`
- [x] 2.2 Initialise `maxWidth` from `DEFAULT_SETTINGS.maxWidth` in the store body
- [x] 2.3 Implement `setMaxWidth` (clamp negatives to `0`, clamp `> 7680` to `7680`)
- [x] 2.4 Add `maxWidth` to the `partialize` block (eighth persisted field)
- [x] 2.5 Add `maxWidth: DEFAULT_SETTINGS.maxWidth` to the `resetAll` payload

## 3. ffmpeg argument construction

- [x] 3.1 In `src/utils/ffmpegCommands.ts`, build the video-filter chain for `fps` and `every-nth` modes as an array of filter strings rather than a single literal, so a `scale=...` clause can be appended
- [x] 3.2 When `settings.maxWidth > 0`, append `scale='min(iw\\,${maxWidth})':-2` to the chain (note the `\\,` JS escape)
- [x] 3.3 For `at-cursor` mode, when `settings.maxWidth > 0`, push a fresh `-vf` flag with the same `scale='min(iw\\,${maxWidth})':-2` value
- [x] 3.4 Verify the existing `every-nth` `-vsync vfr` flag is still emitted after the filter-chain refactor

## 4. Tests

- [x] 4.1 In `tests/utils/ffmpegCommands.test.ts`, add a "scaling" describe block
- [x] 4.2 Test: `maxWidth=0` produces no `scale=` substring in any of the three modes
- [x] 4.3 Test: `fps` mode with `maxWidth=640` → `-vf` value is `fps=<n>,scale='min(iw\,640)':-2`
- [x] 4.4 Test: `every-nth` mode with `maxWidth=640` → `-vf` value is `select=not(mod(n\,<n>)),scale='min(iw\,640)':-2` AND args still contain `-vsync vfr`
- [x] 4.5 Test: `at-cursor` mode with `maxWidth=640` → args contain `-vf scale='min(iw\,640)':-2` AND still begin with `-ss <t> -i <input>`
- [x] 4.6 Test: the literal substring `min(iw\,1280)` appears in the emitted args (escaped comma assertion)
- [x] 4.7 Test: `maxWidth=-1` is treated the same as `maxWidth=0` (no `scale=`)

## 5. UI control

- [x] 5.1 In `src/components/features/ExtractionSettings.tsx`, add a "Max output width" labeled control bound to `maxWidth` / `setMaxWidth`
- [x] 5.2 Render the preset chips from `OUTPUT_WIDTH_PRESETS`; `0` chip displays as "Original"
- [x] 5.3 Add a free-form numeric input alongside the chips (same pattern as the fps free-form field)
- [x] 5.4 Add helper text: "Caps frame width in pixels. Won't upscale narrower videos."
- [x] 5.5 Confirm visual placement with the existing settings layout (Format / Quality / FPS column)

## 6. Verification

- [x] 6.1 Run `npm run lint` — no new warnings
- [x] 6.2 Run `npm test` — all tests pass, including new scaling cases
- [x] 6.3 Run `npm run build` — typecheck clean, build succeeds
- [x] 6.4 Manual smoke test in `npm run dev`: load a >1080p video, set `maxWidth=640`, extract in each of the three modes, confirm extracted frames are 640 px wide (or less) and aspect ratio preserved
- [x] 6.5 Manual smoke test: set `maxWidth=640`, reload the page, confirm the value persists; then trigger Start Over and confirm `maxWidth` resets to `0`
- [x] 6.6 Manual smoke test: clear localStorage entry `frame-ripper-settings`, reload — confirm app boots cleanly with default `maxWidth=0`
