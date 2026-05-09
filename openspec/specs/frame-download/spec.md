# frame-download

## Purpose

How extracted frames leave the browser. Covers the JSZip-based bulk ZIP download (selected frames only), the per-frame single-image download, the ZIP filename convention, and the streaming/progress contract surfaced to the UI.

## Requirements

### Requirement: ZIP packaging of selected frames

`downloadZip(frames, videoName)` SHALL package the supplied `ExtractedFrame[]` into a ZIP archive. Every frame SHALL be added inside a top-level folder named `frames`, using the frame's `filename` field as the in-zip name (so reversed-order extractions retain their reversed filenames in the archive).

#### Scenario: frames are placed under frames/

- **WHEN** `downloadZip` runs with frames whose filenames are `frame_0001.jpg` and `frame_0002.jpg`
- **THEN** the archive contains `frames/frame_0001.jpg` and `frames/frame_0002.jpg`

#### Scenario: empty selection is a no-op

- **WHEN** `downloadZip` is called with `frames.length === 0`
- **THEN** the function returns immediately without creating a blob or triggering a download

### Requirement: STORE compression

The ZIP SHALL use `compression: 'STORE'` (no compression) because JPG and PNG payloads are already compressed; further DEFLATE adds CPU time without meaningful size reduction. `streamFiles: true` SHALL be set on `generateAsync`.

#### Scenario: archive is uncompressed

- **WHEN** `generateAsync` is called inside `downloadZip`
- **THEN** the options include `compression: 'STORE'` and `streamFiles: true`

### Requirement: ZIP filename convention

The downloaded ZIP filename SHALL follow the pattern `frame-ripper-<sanitized-base>-<timestamp>.zip`, where `<sanitized-base>` is the source video's filename with its extension stripped and run through `sanitizeFilename`, and `<timestamp>` is `new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')` (compact UTC, seconds precision).

#### Scenario: filename is sanitized and timestamped

- **WHEN** `downloadZip` is called with `videoName = 'My Video (1).mp4'`
- **THEN** the resulting download filename matches `/^frame-ripper-My_Video__1_-\d{8}T\d{6}\.zip$/`

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

## Source anchors (codified 2026-05-09 at commit 7f12443)

- ZIP packaging — `src/hooks/useDownload.ts:17-31`
- Empty-selection no-op — `src/hooks/useDownload.ts:19-20`
- STORE compression — `src/hooks/useDownload.ts:33-42`
- Filename convention — `src/hooks/useDownload.ts:45-47`, `src/utils/fileUtils.ts:37-39`
- Progress reporting — `src/hooks/useDownload.ts:14-15,21-22,40-41,57-60`
- Single-frame download — `src/hooks/useDownload.ts:65-76`
