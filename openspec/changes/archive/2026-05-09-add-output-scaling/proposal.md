## Why

Users extracting frames from modern phone or camera footage (4K / 1080p) often only want lightweight reference images, but today every frame is written at full source resolution. Result: large IndexedDB footprint, slow caching loop, and bloated ZIP downloads — for no real benefit when the user just needs thumbnails or scrubbable stills. A simple "max width" knob lets users opt into downscaling at extraction time without introducing a new pipeline stage.

## What Changes

- Add an optional **max output width** extraction setting (in pixels). `0` (or unset) means "use the source resolution" — no scale filter is injected. A positive value caps the long edge to that width.
- When `maxWidth > 0`, `buildExtractionArgs` SHALL append a `scale='min(iw\,<w>)':-2` clause to the video filter chain. This means:
  - In `fps` mode: filter becomes `fps=<n>,scale='min(iw\,<w>)':-2`.
  - In `every-nth` mode: filter becomes `select=not(mod(n\,<n>)),scale='min(iw\,<w>)':-2` (with `-vsync vfr` retained).
  - In `at-cursor` mode (which currently has no `-vf`): a `-vf scale='min(iw\,<w>)':-2` flag is added.
- `min(iw, w)` enforces "max width" semantics — narrower source videos are never upscaled. Height tracks aspect ratio via `:-2` (rounded to an even number, safe for any encoder).
- Persist the new setting under the existing `frame-ripper-settings` localStorage key (eighth persisted field).
- Add a UI control in `ExtractionSettings` (a numeric input or a small set of presets like `Original / 1920 / 1280 / 854 / 640`) wired to the new store action.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `frame-extraction`: new requirement for an optional output-scaling filter that composes with the three existing selection modes; the at-cursor "no `-vf`" guarantee is relaxed to "no `-vf` unless a scale is configured".
- `extraction-settings-persistence`: the persisted-fields list grows from seven to eight; the new field follows the existing default-merge behaviour for older persisted blobs.

## Impact

- **Code**: `src/types/index.ts` (add `maxWidth: number` to `ExtractionSettings`), `src/utils/constants.ts` (default `maxWidth: 0`), `src/store/appStore.ts` (new persisted field, action, reset coverage, partialize entry), `src/utils/ffmpegCommands.ts` (single new branch in `buildExtractionArgs` that conditionally appends/extends `-vf`), `src/components/features/ExtractionSettings.tsx` (new control).
- **Tests**: new cases in `tests/utils/ffmpegCommands.test.ts` covering each mode × scale-on/scale-off, plus the `min(iw,...)` escaping.
- **Specs**: delta updates to `frame-extraction` (new requirement + amendment to existing scenario) and `extraction-settings-persistence` (count grows, new default).
- **No new dependencies**, no change to ffmpeg.wasm version, no change to IndexedDB schema, no change to PWA caching strategy.
- **Backwards compatibility**: persisted blobs from before this change rehydrate cleanly because `maxWidth` defaults to `0` (no-op) when absent — same merge behaviour the `reverse` field relies on.
