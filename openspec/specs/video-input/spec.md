# video-input

## Purpose

How a user gets a video into FrameRipper. Covers the drag-and-drop / click-to-browse `DropZone`, accepted file types and size limit, validation error surfaces, and the file-name helpers used by the rest of the app (extension detection, sanitisation for ZIP base names, file-size formatting for the UI).

## Requirements

### Requirement: Accepted video file types

The system SHALL accept video files identified by either MIME type (`video/mp4`, `video/webm`, `video/ogg`, `video/x-matroska`, `video/quicktime`, `video/x-msvideo`) or, when the MIME type is empty, by file extension (`.mp4`, `.webm`, `.ogv`, `.mkv`, `.mov`, `.avi`). Files matching neither SHALL be rejected with the message `Unsupported file type. Please drop a video file (MP4, WebM, MKV, MOV, AVI).`.

#### Scenario: MIME type is recognised

- **WHEN** `isVideoFile` is called with a `File` whose type is `video/mp4`
- **THEN** the result is `true`

#### Scenario: empty MIME falls back to extension

- **WHEN** `isVideoFile` is called with a `File` whose type is `''` and name is `test.mkv`
- **THEN** the result is `true`

#### Scenario: non-video file is rejected

- **WHEN** `validateVideoFile` is called with a `text/plain` file
- **THEN** the returned error string contains the word `Unsupported`

### Requirement: File size limit

The system SHALL reject files larger than `2 GB` (2 × 1024 × 1024 × 1024 bytes) with an error message containing the actual and maximum sizes formatted via `formatFileSize`.

#### Scenario: oversized file is rejected

- **WHEN** `validateVideoFile` is called with a file whose `size` exceeds `MAX_FILE_SIZE`
- **THEN** the returned error message includes both the file's formatted size and `2.0 GB`

#### Scenario: valid file passes validation

- **WHEN** `validateVideoFile` is called with a small video file
- **THEN** the function returns `null`

### Requirement: Drag-and-drop and click-to-browse

`DropZone` SHALL accept a single video file via either drag-and-drop or click-to-browse, validate the dropped/selected file, and either invoke its `onFileDrop` callback (on success) or display the validation error inline (on failure). The component SHALL be no-op while `disabled` is true. The hidden `<input type="file">` SHALL declare `accept` from `ACCEPTED_VIDEO_EXTENSIONS` and reset its value after each selection so the same file can be re-selected.

#### Scenario: drop a valid video

- **WHEN** the user drops a `video/mp4` file onto the zone
- **THEN** `onFileDrop` is called with the file
- **AND** no error message is shown

#### Scenario: drop a non-video file

- **WHEN** the user drops a `text/plain` file
- **THEN** `onFileDrop` is not called
- **AND** the validation error is displayed inline beneath the zone

#### Scenario: disabled zone ignores drops

- **WHEN** `disabled` is true and the user drops a file
- **THEN** `onFileDrop` is not called
- **AND** no error is set

#### Scenario: click opens the native file picker

- **WHEN** the user clicks the zone with `disabled=false`
- **THEN** the hidden file input is clicked
- **AND** selecting a file resets the input value to allow re-selection

### Requirement: Filename helpers for downstream output

The system SHALL provide pure helpers used by the extraction pipeline and ZIP download: `getFileExtension(name)` returns the last `.ext` (lowercased) or empty string when none; `sanitizeFilename(name)` replaces every character outside `[a-zA-Z0-9._-]` with `_` for use as a ZIP base name; `generateId()` returns a `crypto.randomUUID()` string.

#### Scenario: getFileExtension returns lowercase extension with dot

- **WHEN** `getFileExtension('Video.MP4')` is called
- **THEN** the result is `.mp4`

#### Scenario: getFileExtension returns empty string when no dot

- **WHEN** `getFileExtension('noext')` is called
- **THEN** the result is `''`

#### Scenario: sanitizeFilename replaces unsafe characters

- **WHEN** `sanitizeFilename('my video (1).mp4')` is called
- **THEN** the result is `my_video__1_.mp4`

#### Scenario: sanitizeFilename keeps safe characters

- **WHEN** `sanitizeFilename('test-file_v2.mp4')` is called
- **THEN** the result is `test-file_v2.mp4`

### Requirement: File size formatting

`formatFileSize(bytes)` SHALL render adaptive units `B`, `KB`, `MB`, `GB` using a 1024 base. Values under 1 KB SHALL be rendered as integer bytes (e.g. `0 B`, `500 B`). Values at 1 KB and above SHALL be rendered with one decimal of precision in the largest unit that yields a value `< 1024`.

#### Scenario: bytes under 1 KB

- **WHEN** `formatFileSize(0)` and `formatFileSize(500)` are called
- **THEN** the results are `0 B` and `500 B`

#### Scenario: KB / MB / GB

- **WHEN** `formatFileSize(1024)`, `formatFileSize(1024*1024)`, and `formatFileSize(1024*1024*1024)` are called
- **THEN** the results are `1.0 KB`, `1.0 MB`, and `1.0 GB`

## Source anchors (codified 2026-05-09 at commit 7f12443)

- Accepted file types — `src/utils/fileUtils.ts:16-21`, `src/utils/constants.ts:9-25`, `tests/utils/fileUtils.test.ts:42-54`
- Size limit — `src/utils/fileUtils.ts:23-31`, `src/utils/constants.ts:27`, `tests/utils/fileUtils.test.ts:56-66`
- DropZone behavior — `src/components/ui/DropZone.tsx:12-83,107-113`
- Filename helpers — `src/utils/fileUtils.ts:11-13,33-39`, `tests/utils/fileUtils.test.ts:30-39,68-76`
- File size formatting — `src/utils/fileUtils.ts:3-9`, `tests/utils/fileUtils.test.ts:10-28`
