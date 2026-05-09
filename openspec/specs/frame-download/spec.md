# frame-download

## Purpose

How extracted frames leave the browser. Covers the JSZip-based bulk ZIP download (selected frames only), the per-frame single-image download, the ZIP filename convention, and the streaming/progress contract surfaced to the UI.

## Requirements

### Requirement: ZIP packaging of selected frames

`downloadZip(frames, videoName, context)` SHALL package the supplied `ExtractedFrame[]` into a ZIP archive. Every frame SHALL be added inside a top-level folder named `frames`. Each entry's in-zip name SHALL be computed at packaging time per the "Source-aware in-zip entry names" and "Per-mode label selection" requirements; the frame's `filename` field SHALL NOT be used as the in-zip name.

The `context` argument is a small object describing the extraction settings active for this archive — at minimum `{ mode, fps, nthFrame, cursorTime, nearbyFrames }` and an optional `filenamePrefix` carrying the user-edited prefix — used by the namer to choose between index and timestamp labels and to override the default source-derived prefix. `downloadZip` SHALL NOT depend on the full `ExtractionSettings` shape. When `filenamePrefix` is omitted or sanitizes to empty, the source-derived default SHALL be used.

#### Scenario: frames are placed under frames/

- **WHEN** `downloadZip` runs with two frames extracted from source `clip.mp4` in `fps` mode with no `filenamePrefix`
- **THEN** the archive contains entries `frames/clip_0001.<ext>` and `frames/clip_0002.<ext>`

#### Scenario: empty selection is a no-op

- **WHEN** `downloadZip` is called with `frames.length === 0`
- **THEN** the function returns immediately without creating a blob or triggering a download

#### Scenario: stored frame.filename is not used as the entry name

- **WHEN** `downloadZip` packages a frame whose `filename` is `frame_0042.jpg` from source `myvid.mp4` in `fps` mode at archive index `0`
- **THEN** the in-zip entry path is `frames/myvid_0001.jpg` (not `frames/frame_0042.jpg`)

### Requirement: Source-aware in-zip entry names

`downloadZip` SHALL rename each frame's in-zip entry name during packaging using a source-aware label, so frames extracted from different source videos in the same session do not collide when extracted into a shared folder.

The entry name SHALL follow the pattern `<prefix>_<frameLabel><ext>`, where:

- `<prefix>` is the **effective filename prefix** — the user-edited prefix when one is supplied (per "User-controllable filename prefix"), otherwise the default derived from the source video name (the source video's filename with its extension stripped and run through `sanitizeFilename`). The supplied prefix SHALL itself be passed through `sanitizeFilename` before use; if the sanitized result is empty, the namer SHALL fall back to the source-derived default.
- `<frameLabel>` is selected by extraction mode (see "Per-mode label selection" below).
- `<ext>` is taken verbatim from the frame's existing `filename` suffix (`.jpg` or `.png`), preserving the format choice and any `frame.filename` suffix already in place (e.g. for reverse-extraction renames).

The frame bytes themselves and the `ExtractedFrame.filename` field stored in IndexedDB SHALL remain unchanged. The rename happens only as JSZip ingests entries — the in-app gallery, single-frame download, and persisted frame cache are unaffected.

#### Scenario: entry name combines source-derived default prefix with the frame label

- **WHEN** `downloadZip` packages a frame whose `filename` ends `.jpg` from a source video named `My Vacation Clip.mp4` in `fps` mode at index `0`, with no user-supplied prefix
- **THEN** the in-zip entry path is `frames/My_Vacation_Clip_0001.jpg`

#### Scenario: user-supplied prefix overrides the default

- **WHEN** `downloadZip` packages a frame from source `My Vacation Clip.mp4` in `fps` mode at index `0` with a user-supplied prefix `MyShoot`
- **THEN** the in-zip entry path is `frames/MyShoot_0001.jpg`

#### Scenario: user-supplied prefix is sanitized

- **WHEN** `downloadZip` packages a frame with a user-supplied prefix `My Shoot (1)`
- **THEN** the in-zip entry name's prefix component is `My_Shoot__1_` (each disallowed character replaced by `_`)

#### Scenario: empty user-supplied prefix falls back to default

- **WHEN** `downloadZip` packages a frame from source `clip.mp4` with a user-supplied prefix that is an empty string or sanitizes to empty (e.g. `   `)
- **THEN** the in-zip entry path uses the source-derived default `clip` (e.g. `frames/clip_0001.jpg`)

#### Scenario: in-app filename is not mutated

- **WHEN** `downloadZip` finishes packaging
- **THEN** every input `ExtractedFrame.filename` value is unchanged from what was passed in
- **AND** no IndexedDB write is performed by the rename logic

### Requirement: Per-mode label selection

The `<frameLabel>` portion of the in-zip entry name SHALL be chosen by extraction mode:

- For `fps` and `every-nth` modes: a zero-padded frame index, padded to `max(4, ceil(log10(totalFrames + 1)))` digits, starting at `0001` for the first frame in the archive.
- For `at-cursor` mode: a source-video timestamp formatted as `HH-MM-SS.mmm` (zero-padded hours, minutes, seconds; three-digit milliseconds; `-` separators between components and `.` before the milliseconds). The timestamp SHALL be reconstructed from the extraction context using the same neighborhood-fps assumption used by `buildExtractionArgs` for cursor seeks (per-frame spacing of `1/24s`), with the first frame at `max(0, cursorTime - nearbyFrames/24)`.

#### Scenario: fps mode uses index labels

- **WHEN** `downloadZip` runs with `mode='fps'`, `fps=1`, and an archive of 5 frames
- **THEN** the in-zip entry names end in `_0001.jpg`, `_0002.jpg`, `_0003.jpg`, `_0004.jpg`, `_0005.jpg`

#### Scenario: every-nth mode uses index labels

- **WHEN** `downloadZip` runs with `mode='every-nth'`, `nthFrame=10`, and an archive of 3 frames
- **THEN** the in-zip entry names end in `_0001.<ext>`, `_0002.<ext>`, `_0003.<ext>`

#### Scenario: at-cursor mode uses HH-MM-SS.mmm timestamp labels

- **WHEN** `downloadZip` runs with `mode='at-cursor'`, `cursorTime=83.456`, `nearbyFrames=0`, and an archive of 1 frame from source video `clip.mp4`
- **THEN** the in-zip entry name is `frames/clip_00-01-23.456.jpg`

#### Scenario: at-cursor with neighbors spaces frames at 1/24s

- **WHEN** `downloadZip` runs with `mode='at-cursor'`, `cursorTime=10.0`, `nearbyFrames=1`, and an archive of 3 frames
- **THEN** the three in-zip entry timestamps reflect `cursorTime - 1/24`, `cursorTime`, and `cursorTime + 1/24` (within floating-point tolerance), formatted as `HH-MM-SS.mmm`

#### Scenario: index padding grows beyond four digits when needed

- **WHEN** `downloadZip` runs with `mode='fps'` and an archive of 12000 frames
- **THEN** the in-zip entry indexes are zero-padded to 5 digits (`_00001.<ext>`, …, `_12000.<ext>`)

#### Scenario: index padding stays at four digits for small archives

- **WHEN** `downloadZip` runs with `mode='fps'` and an archive of 7 frames
- **THEN** the in-zip entry indexes are zero-padded to 4 digits (`_0001.<ext>`, …, `_0007.<ext>`)

### Requirement: Fallback to index label on invalid timestamp

When `at-cursor` mode label generation would produce a non-finite or negative timestamp (e.g. due to `NaN` or missing context), the namer SHALL fall back to the index-based label rather than emitting an invalid filename. The fallback SHALL never produce an empty `<frameLabel>`, an entry containing the literal substring `NaN`, or an entry containing the literal substring `Infinity`.

#### Scenario: NaN cursor time falls back to index label

- **WHEN** `downloadZip` runs with `mode='at-cursor'` and `cursorTime=NaN`
- **THEN** every in-zip entry name uses the index-based label (e.g. `_0001.<ext>`)
- **AND** no in-zip entry name contains the substring `NaN`

#### Scenario: filename-safe label characters

- **WHEN** `downloadZip` produces any in-zip entry name
- **THEN** the entry name (excluding the leading `frames/` folder and the trailing `<ext>`) matches the character class `[A-Za-z0-9._-]`

### Requirement: User-controllable filename prefix

The `DownloadPanel` SHALL render a text input labeled with an affordance for editing the filename prefix used inside (and on) the downloaded ZIP. The input SHALL seed itself with the **source-derived default** — the source video's filename with its extension stripped and run through `sanitizeFilename` — whenever a new video is loaded. The user SHALL be able to edit the input freely; the chosen value SHALL be passed to `downloadZip` when the user clicks the download action.

The input value SHALL be sanitized via `sanitizeFilename` immediately before use (not on every keystroke); if the sanitized result is empty, the system SHALL fall back to the source-derived default rather than producing entries whose prefix is empty.

The panel SHALL render a short live-preview line showing what the first archive entry's filename will look like with the current input value (e.g. `clip_0001.jpg`), updated as the user types, computed by running the same sanitize transform on the current value.

The chosen prefix SHALL be ephemeral local state — it SHALL NOT be persisted to localStorage or Zustand; it SHALL re-seed on each new video load.

#### Scenario: input seeds with the sanitized source video name

- **WHEN** a video named `My Vacation Clip.mp4` is loaded and the `DownloadPanel` is rendered
- **THEN** the prefix input's initial value is `My_Vacation_Clip`

#### Scenario: input re-seeds when a new video is loaded

- **WHEN** the user has edited the prefix to `MyShoot` and then loads a new video named `dog_video.mp4`
- **THEN** the prefix input's value resets to `dog_video`

#### Scenario: live preview reflects sanitized input

- **WHEN** the user types `My Vacation` into the prefix input
- **THEN** the preview line shows `My_Vacation_0001.<ext>` (or the equivalent for the active extraction mode)

#### Scenario: download uses the user-edited prefix

- **WHEN** the user types `MyShoot` into the prefix input and clicks `Download ZIP`
- **THEN** `downloadZip` is invoked with the prefix `MyShoot` flowing into both the in-zip entry names and the outer ZIP filename

#### Scenario: empty prefix on submit falls back to the source-derived default

- **WHEN** the user clears the prefix input (or types only whitespace) and clicks `Download ZIP` for source `clip.mp4`
- **THEN** the resulting archive uses the prefix `clip` for both entries and outer filename

### Requirement: STORE compression

The ZIP SHALL use `compression: 'STORE'` (no compression) because JPG and PNG payloads are already compressed; further DEFLATE adds CPU time without meaningful size reduction. `streamFiles: true` SHALL be set on `generateAsync`.

#### Scenario: archive is uncompressed

- **WHEN** `generateAsync` is called inside `downloadZip`
- **THEN** the options include `compression: 'STORE'` and `streamFiles: true`

### Requirement: ZIP filename convention

The downloaded ZIP filename SHALL follow the pattern `frame-ripper-<prefix>-<timestamp>.zip`, where `<prefix>` is the **effective filename prefix** (the user-edited prefix when supplied and non-empty after sanitization, otherwise the source-derived default — the source video's filename with its extension stripped and run through `sanitizeFilename`), and `<timestamp>` is `new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')` (compact UTC, seconds precision). The same `<prefix>` value SHALL appear inside the archive's entry names per "Source-aware in-zip entry names" — the inner and outer prefixes SHALL NOT diverge.

#### Scenario: outer filename uses the source-derived default when no prefix is supplied

- **WHEN** `downloadZip` is called with `videoName = 'My Video (1).mp4'` and no `filenamePrefix`
- **THEN** the resulting download filename matches `/^frame-ripper-My_Video__1_-\d{8}T\d{6}\.zip$/`

#### Scenario: outer filename uses the user-supplied prefix

- **WHEN** `downloadZip` is called with `videoName = 'clip.mp4'` and `filenamePrefix = 'MyShoot'`
- **THEN** the resulting download filename matches `/^frame-ripper-MyShoot-\d{8}T\d{6}\.zip$/`

#### Scenario: outer and inner prefixes match

- **WHEN** `downloadZip` is called with `filenamePrefix = 'MyShoot'`
- **THEN** the outer filename's `<prefix>` component is `MyShoot`
- **AND** every in-zip entry's prefix component is `MyShoot`

### Requirement: Progress reporting

`downloadZip` SHALL expose `zipping` (boolean) and `zipProgress` (`0..1`) state. `zipping` SHALL be `true` from the moment generation starts until it finishes (success or thrown). `zipProgress` SHALL be updated from JSZip's `metadata.percent / 100` during generation and SHALL be reset to `0` in the `finally` block.

#### Scenario: zipping flag toggles around generation

- **WHEN** `downloadZip` starts
- **THEN** `zipping` becomes `true` and `zipProgress` is reset to `0`
- **WHEN** `downloadZip` finishes (resolved or thrown)
- **THEN** `zipping` becomes `false` and `zipProgress` is reset to `0`

#### Scenario: progress callback updates zipProgress

- **WHEN** JSZip emits `metadata.percent = 50`
- **THEN** `zipProgress` is set to `0.5`

### Requirement: Single-frame download

`downloadSingleFrame(frame)` SHALL trigger a browser download of a single frame as `frame.filename` with the correct MIME type derived from the filename suffix (`.png` → `image/png`, otherwise `image/jpeg`). The download SHALL be performed by creating a temporary `<a>`, clicking it, removing it from the DOM, and revoking the object URL.

#### Scenario: PNG frame uses image/png MIME

- **WHEN** `downloadSingleFrame` is called with a frame whose filename ends `.png`
- **THEN** the temporary `Blob` is constructed with `type: 'image/png'`
- **AND** the `<a>` element's `download` attribute equals `frame.filename`

#### Scenario: JPG frame uses image/jpeg MIME

- **WHEN** `downloadSingleFrame` is called with a frame whose filename ends `.jpg`
- **THEN** the temporary `Blob` is constructed with `type: 'image/jpeg'`

#### Scenario: object URL is revoked after click

- **WHEN** the download click has been dispatched
- **THEN** the temporary `<a>` is removed from the DOM
- **AND** the object URL is revoked via `URL.revokeObjectURL`

## Source anchors (codified 2026-05-09 at commit d92cbf4)

- ZIP packaging — `src/hooks/useDownload.ts:31-59`
- Empty-selection no-op — `src/hooks/useDownload.ts:33`
- Source-aware entry names — `src/utils/zipNaming.ts:44-62`, `src/hooks/useDownload.ts:43-58`
- Per-mode label selection — `src/utils/zipNaming.ts:32-35,49-55`
- Invalid-timestamp fallback — `src/utils/zipNaming.ts:15-16,57-59`
- Effective prefix resolution — `src/utils/zipNaming.ts:37-42`, `src/hooks/useDownload.ts:43-44`
- User-controllable prefix UI — `src/components/features/DownloadPanel.tsx:31-44,82-101,111`
- STORE compression — `src/hooks/useDownload.ts:61-70`
- Filename convention — `src/hooks/useDownload.ts:73-74`, `src/utils/fileUtils.ts:37-39`
- Progress reporting — `src/hooks/useDownload.ts:28-29,35-36,67-69,84-87`
- Single-frame download — `src/hooks/useDownload.ts:92-103`
