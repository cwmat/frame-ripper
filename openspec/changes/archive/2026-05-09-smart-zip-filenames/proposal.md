## Why

Today every frame inside the ZIP is named `frame_0001.jpg`, `frame_0002.jpg`, … regardless of which video produced them. When users extract from several videos in a row, the downloaded ZIPs end up with collision-prone, indistinguishable contents — drag two of them into the same folder and `frame_0001.jpg` from clip A silently overwrites `frame_0001.jpg` from clip B. The source filename is already known to `downloadZip`, so embedding it (and optionally the frame's source-video timestamp) is a small UX win that makes the output portable across batches.

## What Changes

- Rename ZIP entries at packaging time inside `useDownload.downloadZip`. Frame bytes in IndexedDB and the per-frame `filename` field are unchanged — the rename happens as JSZip ingests each entry, so this is a pure presentation-layer tweak with no impact on extraction, storage, or the gallery.
- The new in-zip name SHALL be `<prefix>_<frameLabel>.<ext>`, where:
  - `<prefix>` is the user-chosen filename prefix (see next bullet). It defaults to the sanitized source video base; the user can override it.
  - `<frameLabel>` is either a zero-padded frame index (`0001`, `0002`, …) **or** an HH-MM-SS.mmm timestamp derived from the frame's source-video time, depending on which extraction mode produced the frame. Default for `fps` and `every-nth` modes is the index; default for `at-cursor` mode is the timestamp (since users explicitly chose a moment in time and want to see it back). The exact selection rule lives in `design.md`.
  - `<ext>` is the existing `.jpg` / `.png` derived from the frame's current filename suffix — preserved as-is.
- Add a **"Filename prefix"** text input to the `DownloadPanel`. It seeds itself with the sanitized source video base whenever a new video is loaded; the user can edit it before clicking "Download ZIP". The input value is sanitized through `sanitizeFilename` before being used; if the result is empty, the namer falls back to the seeded default. A short live-preview line under the input (e.g. `clip_0001.jpg`) shows what the first entry will look like. Pure UX — no Zustand persistence, no settings store change.
- The same chosen `<prefix>` SHALL drive the **outer ZIP filename** (`frame-ripper-<prefix>-<timestamp>.zip`) so the saved-to-disk archive matches the entries inside it. Today the outer name uses the source-video base; that base becomes the *default* for the prefix input.
- When the source-video time is not derivable (no fps known, no cursor anchor, etc.), fall back to the frame index — never produce an empty or `NaN`-laden label.
- The single-frame download path (`downloadSingleFrame`) is **not** changed in this proposal. It already uses `frame.filename`, and a one-off save into the user's Downloads folder doesn't have the cross-batch collision problem the ZIP does. Out of scope: extending the same naming to single downloads (a future change can revisit).
- The in-zip top-level folder remains `frames/` — no change.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `frame-download`: the existing "ZIP packaging of selected frames" requirement currently mandates that each entry is named using the frame's `filename` field verbatim. That requirement changes — entries SHALL be renamed during packaging using a source-aware label. The single-frame download requirement and the outer ZIP filename requirement are unaffected.

## Impact

- **Code**:
  - `src/hooks/useDownload.ts` — `downloadZip` signature grows to accept the extraction settings (or just the bits it needs: `mode`, `fps`, `nthFrame`, `cursorTime`, `nearbyFrames`) so it can compute timestamps for each frame's source-video position. The packaging loop renames each entry before calling `folder.file(...)`. Adds an optional `filenamePrefix` field to the context so the user-edited prefix flows from the UI into both the in-zip entries and the outer ZIP filename.
  - `src/App.tsx` — wherever `downloadZip(frames, videoName)` is called, pass the extra context through. Forwards the prefix from the panel into the call.
  - `src/components/features/DownloadPanel.tsx` — adds a labeled text input ("Filename prefix") with a live preview line, owns the prefix as local state, re-seeds when `videoName` changes, sanitizes on submit, and emits the chosen prefix via the existing `onDownloadZip` callback (signature changes from `() => void` to `(prefix?: string) => void`).
  - `src/utils/fileUtils.ts` (or a new `src/utils/zipNaming.ts`) — pure helper(s) for `formatTimestampLabel(seconds)` (HH-MM-SS.mmm) and `buildZipEntryName({ baseName, mode, frameIndex, totalFrames, fps, nthFrame, cursorTime, nearbyFrames, ext })`. Keeping these as pure functions makes them unit-testable in the same `tests/utils/` style the repo already uses.
- **State / storage**: no changes to Zustand or IndexedDB. The chosen prefix is ephemeral local state in `DownloadPanel`; nothing is persisted across sessions or videos. The `ExtractedFrame.filename` field stays canonical for in-app display; the ZIP rename is local to `downloadZip`.
- **Tests**: new unit tests for the naming helpers covering each mode, the fallback path, and `sanitizeFilename` interaction with awkward source filenames (spaces, parentheses, unicode, no-extension). One additional unit case for the prefix override path (custom prefix + sanitization). No new integration tests — JSZip and ffmpeg.wasm are not exercised in tests per existing convention. The `DownloadPanel` itself is not unit-tested today (no component tests in the repo); the prefix UI is verified via the existing manual smoke flow.
- **No new dependencies**, no PWA / build / deploy changes, no schema migrations, no breaking changes to URLs or persisted settings.
- **Backwards compatibility**: cached frames already in IndexedDB from a previous session keep their original `frame.filename` — they'll still render in the gallery and zip up under the new naming on the next download (because the rename derives from current settings + base name, not from the stored filename).
