# frame-extraction

## Purpose

The core pipeline that turns a loaded video into a sequence of image frames stored in IndexedDB. Covers ffmpeg argument construction for the three selection modes (`fps`, `every-nth`, `at-cursor`), JPG quality mapping, the post-extraction read/save loop, the extraction status state machine, cancellation, and the post-extract `computeFramePlacement` reorder hook that the `reverse-extraction` capability composes against.

## Requirements

### Requirement: Three frame selection modes

The system SHALL support three modes of selecting which video frames to extract, each producing a distinct ffmpeg argument list. `fps` SHALL use the `-vf fps=<n>` filter. `every-nth` SHALL use `-vf select=not(mod(n\,<n>)) -vsync vfr` (with a JS-source backslash-comma so ffmpeg receives an escaped comma). `at-cursor` SHALL use input-side seek (`-ss <time>` placed **before** `-i <input>`) followed by `-frames:v <count>`. Each mode's filter chain MAY be extended with the `scale=` clause defined under "Optional output width scaling" when `maxWidth > 0`.

#### Scenario: fps mode produces the fps filter

- **WHEN** `buildExtractionArgs` is called with `mode='fps'` and `fps=1`
- **THEN** the args contain `-i`, the input filename, `-vf`, and `fps=1`
- **AND** the last arg is the output pattern

#### Scenario: every-nth mode produces a select filter with vsync vfr

- **WHEN** `buildExtractionArgs` is called with `mode='every-nth'` and `nthFrame=10`
- **THEN** the args contain `select=not(mod(n\,10))`, `-vsync`, and `vfr`

#### Scenario: at-cursor mode uses input-side seek and has no -vf when scaling is off

- **WHEN** `buildExtractionArgs` is called with `mode='at-cursor'`, `cursorTime=5.5`, `nearbyFrames=0`, and `maxWidth=0`
- **THEN** the args begin with `-ss 5.5 -i <input>` and contain `-frames:v 1`
- **AND** no `-vf` filter is present

### Requirement: Optional output width scaling

The system SHALL accept an optional `maxWidth` extraction setting (in pixels). When `maxWidth > 0`, `buildExtractionArgs` SHALL inject a `scale='min(iw\,<maxWidth>)':-2` clause into the video filter chain so output frames are downscaled to at most `maxWidth` pixels wide while preserving aspect ratio. The `min(iw, ...)` form SHALL prevent upscaling of narrower source videos. The `-2` height target SHALL preserve aspect ratio while rounding to an even number. When `maxWidth <= 0`, the system SHALL omit the `scale=` clause entirely (no scaling, no `-vf scale=...` in any mode).

The injection SHALL compose with the existing selection-mode filters as follows:

- `fps` mode: extend the existing `-vf fps=<n>` to `-vf fps=<n>,scale='min(iw\,<maxWidth>)':-2`.
- `every-nth` mode: extend the existing `-vf select=not(mod(n\,<n>))` to `-vf select=not(mod(n\,<n>)),scale='min(iw\,<maxWidth>)':-2`. The `-vsync vfr` flag SHALL still be present.
- `at-cursor` mode: add a new `-vf scale='min(iw\,<maxWidth>)':-2` flag (this mode has no `-vf` when `maxWidth <= 0`).

The `\,` escape (one backslash, one comma) SHALL be present in the runtime string inside the `min(...)` expression so the comma is not interpreted as a filter-chain separator.

#### Scenario: maxWidth = 0 produces no scale clause in any mode

- **WHEN** `buildExtractionArgs` runs with `maxWidth=0` in any of the three modes
- **THEN** the resulting args do not contain the substring `scale=` and do not contain `:-2`

#### Scenario: fps mode appends scale to the fps filter

- **WHEN** `buildExtractionArgs` runs with `mode='fps'`, `fps=1`, `maxWidth=640`
- **THEN** the `-vf` value is `fps=1,scale='min(iw\,640)':-2`

#### Scenario: every-nth mode appends scale to the select filter

- **WHEN** `buildExtractionArgs` runs with `mode='every-nth'`, `nthFrame=10`, `maxWidth=640`
- **THEN** the `-vf` value is `select=not(mod(n\,10)),scale='min(iw\,640)':-2`
- **AND** the args still contain `-vsync` followed by `vfr`

#### Scenario: at-cursor mode adds a fresh scale filter

- **WHEN** `buildExtractionArgs` runs with `mode='at-cursor'`, `cursorTime=5.5`, `nearbyFrames=0`, `maxWidth=640`
- **THEN** the args contain `-vf` followed by `scale='min(iw\,640)':-2`
- **AND** the args still begin with `-ss 5.5 -i <input>` and contain `-frames:v 1`

#### Scenario: comma inside min() is escaped with a backslash

- **WHEN** `buildExtractionArgs` runs with any mode and `maxWidth=1280`
- **THEN** the resulting args contain the literal substring `min(iw\,1280)` (backslash-comma, not bare comma)

#### Scenario: negative or non-positive maxWidth is treated as off

- **WHEN** `buildExtractionArgs` runs with `maxWidth=-1` or `maxWidth=0`
- **THEN** the resulting args do not contain `scale=`

### Requirement: JPG quality mapping (PNG omits quality)

For JPG output the system SHALL map a 1–100 quality input to ffmpeg's inverted 2–31 `-q:v` scale (1 → 31 worst, 100 → 2 best, with linear mapping in between). For PNG output the system SHALL omit `-q:v` entirely.

#### Scenario: quality 100 maps to q:v 2

- **WHEN** JPG output is requested with `jpgQuality=100`
- **THEN** the args contain `-q:v 2`

#### Scenario: quality 1 maps to q:v 31

- **WHEN** JPG output is requested with `jpgQuality=1`
- **THEN** the args contain `-q:v 31`

#### Scenario: PNG output has no quality flag

- **WHEN** PNG output is requested
- **THEN** the args do not contain `-q:v`
- **AND** the output pattern ends in `.png`

### Requirement: at-cursor seek window

For `at-cursor` mode the system SHALL extract `1 + 2 * nearbyFrames` frames centred on the cursor. The seek time SHALL be `cursorTime - nearbyFrames/24` (a generous nominal-24fps window) clamped to a minimum of `0`.

#### Scenario: nearby = 0 yields a single frame

- **WHEN** at-cursor mode runs with `nearbyFrames=0`
- **THEN** `-frames:v 1` is requested

#### Scenario: nearby = N yields 1 + 2N frames

- **WHEN** at-cursor mode runs with `nearbyFrames=3`
- **THEN** `-frames:v 7` is requested

#### Scenario: cursor near video start clamps seek to zero

- **WHEN** at-cursor mode runs with `cursorTime=0.01` and `nearbyFrames=5`
- **THEN** the `-ss` value is `0`

### Requirement: Output filename pattern

Extracted frames SHALL be written to ffmpeg's virtual filesystem using a zero-padded 4-digit pattern `frame_%04d.<ext>`, where `<ext>` is `jpg` or `png` matching the requested format.

#### Scenario: jpg pattern

- **WHEN** `getOutputPattern('jpg')` is called
- **THEN** the result is `frame_%04d.jpg`

#### Scenario: png pattern

- **WHEN** `getOutputPattern('png')` is called
- **THEN** the result is `frame_%04d.png`

### Requirement: Frame placement (reorder hook)

The system SHALL compute the final IndexedDB `index` and on-disk `filename` for each emitted frame via `computeFramePlacement(i, total, originalName, reverse)`. The function SHALL be a pure mapping: when `reverse=false` it is identity; when `total=1` it is identity regardless of `reverse`; when `reverse=true` and `total>1` it produces a bijection that maps source position `i` to position `total-1-i`, preserving the original extension.

#### Scenario: identity when reverse is false

- **WHEN** `computeFramePlacement(i, N, name, false)` is called for any valid `i`, `N`, `name`
- **THEN** the returned `(index, filename)` equals `(i, name)`

#### Scenario: no-op for total = 1

- **WHEN** `computeFramePlacement(0, 1, 'frame_0001.png', true)` is called
- **THEN** the result is `(0, 'frame_0001.png')`

#### Scenario: swaps the pair for total = 2 with reverse

- **WHEN** `computeFramePlacement(0, 2, 'frame_0001.jpg', true)` and `computeFramePlacement(1, 2, 'frame_0002.jpg', true)` are called
- **THEN** they return `(1, 'frame_0002.jpg')` and `(0, 'frame_0001.jpg')` respectively

#### Scenario: i = 0 maps to last, i = N-1 maps to first

- **WHEN** `computeFramePlacement` runs with `reverse=true` over an arbitrary `N > 1`
- **THEN** `i=0` produces `index=N-1` and `filename=frame_<N-padded>.<ext>`
- **AND** `i=N-1` produces `index=0` and `filename=frame_0001.<ext>`

#### Scenario: filenames are unique and zero-padded across the full range

- **WHEN** `computeFramePlacement` is called for every `i` in `[0, N)` with `reverse=true`
- **THEN** the resulting filenames are pairwise distinct, all match `/^frame_\d{4}\.(jpg|png)$/`, and the original extension is preserved

### Requirement: Extraction status state machine

The `extract` operation SHALL drive `ExtractionStatus` through `reading-video` → `extracting` → `caching` → `done` for a successful run. ffmpeg's `progress` event SHALL drive the progress bar (clamped to `[0, 1]`) during `extracting`. The per-frame save loop SHALL drive progress during `caching`, reporting the label `Saving frame <i+1> of <N>…`. A non-zero ffmpeg exit code SHALL surface as a thrown error and set status to `error` via the app store.

#### Scenario: happy-path status transitions

- **WHEN** a successful extraction runs
- **THEN** status passes through `reading-video`, `extracting`, `caching`, and ends at `done` with progress `1`

#### Scenario: ffmpeg progress drives the bar during extracting

- **WHEN** ffmpeg emits a `progress` event with `progress=p`
- **THEN** the store progress is set to `clamp(p, 0, 1)` with label `Extracting frames…`

#### Scenario: caching loop reports per-frame progress

- **WHEN** the caching loop processes the `i`-th of `N` frames
- **THEN** the store progress is set to `(i+1)/N` with label `Saving frame <i+1> of <N>…`

#### Scenario: non-zero ffmpeg exit code surfaces as error

- **WHEN** `ffmpeg.exec` returns a non-zero exit code
- **THEN** the operation throws `FFmpeg exited with code <code>`
- **AND** the catch block sets the store error and returns `0`

### Requirement: Memory-bounded persistence

To keep WASM memory bounded for long videos, after each frame is read from ffmpeg's virtual FS and saved to IndexedDB, the source file SHALL be deleted from the WASM FS. The input video SHALL also be deleted on completion. Frame bytes SHALL NOT be retained in React state — only `frameCount` is held in the store.

#### Scenario: per-frame WASM FS cleanup

- **WHEN** the caching loop saves frame `i`
- **THEN** `ffmpeg.deleteFile(file.name)` is called for that file before moving to frame `i+1`

#### Scenario: input video cleanup on finish

- **WHEN** the caching loop completes
- **THEN** `ffmpeg.deleteFile(inputName)` is invoked
- **AND** failures in this cleanup are swallowed (do not affect the result)

#### Scenario: frame count, not frame data, in app state

- **WHEN** an extraction completes with `N` frames
- **THEN** `setFrameCount(N)` is the only frame-quantity signal written to the app store
- **AND** the frame `Uint8Array` payload is reachable only via `getAllFrames`/`getFramesByIndices` from IndexedDB

### Requirement: Cancellation

The extractor SHALL provide a `cancel()` function that sets a cancellation flag. The `extract` operation SHALL check the flag at three checkpoints — after writing the input file, after `ffmpeg.exec`, and between iterations of the caching loop — and short-circuit by returning `0` (or breaking out of the caching loop) at the next checkpoint reached. Cancellation SHALL NOT itself transition status to `done`; the caller decides what state to enter next.

#### Scenario: cancellation before exec

- **WHEN** `cancel()` is invoked after `writeFile` but before `ffmpeg.exec`
- **THEN** `extract` returns `0` without invoking `ffmpeg.exec`

#### Scenario: cancellation after exec

- **WHEN** `cancel()` is invoked after `ffmpeg.exec` resolves but before the caching loop
- **THEN** `extract` returns `0` and the caching loop does not run

#### Scenario: cancellation mid-cache

- **WHEN** `cancel()` is invoked partway through the caching loop
- **THEN** the loop breaks at its next iteration boundary
- **AND** previously-saved frames remain in IndexedDB
- **AND** status is not transitioned to `done`

## Source anchors (codified 2026-05-09 at commit 7f12443)

- Three modes — `src/utils/ffmpegCommands.ts:39-78`, `tests/utils/ffmpegCommands.test.ts:22-70`
- JPG quality mapping — `src/utils/ffmpegCommands.ts:7-10,80-83`, `tests/utils/ffmpegCommands.test.ts:72-101`
- at-cursor seek window — `src/utils/ffmpegCommands.ts:47-58`, `tests/utils/ffmpegCommands.test.ts:103-158`
- Output filename pattern — `src/utils/ffmpegCommands.ts:12-14`, `tests/utils/ffmpegCommands.test.ts:9-17`
- Frame placement — `src/utils/ffmpegCommands.ts:16-30`, `tests/utils/ffmpegCommands.test.ts:260-318`
- Optional output width scaling — `src/utils/ffmpegCommands.ts:32-37,45,56-58,70-72`, `tests/utils/ffmpegCommands.test.ts:160-236`
- Extraction status state machine — `src/hooks/useFrameExtractor.ts:30-131`, `src/types/index.ts:24-31`
- Memory-bounded persistence — `src/hooks/useFrameExtractor.ts:84-117`
- Cancellation — `src/hooks/useFrameExtractor.ts:16,32,41,69,85,134-136`
