## Context

The frame-download path lives entirely in `src/hooks/useDownload.ts`. `downloadZip(frames, videoName)` builds a `JSZip`, drops every frame into a top-level `frames/` folder using `frame.filename` (today: `frame_0001.jpg`-style), then triggers a browser download whose outer name already includes the sanitized source video name (`frame-ripper-<base>-<timestamp>.zip`). The current outer-name pattern proves we already have the source video's name at the call site — we just don't push it inside the archive.

The frame metadata stored in IndexedDB (`ExtractedFrame { id, index, filename, data, size }`) deliberately does **not** carry source-video timestamps. ffmpeg writes frames as `frame_%04d.<ext>` and `useFrameExtractor.computeFramePlacement` either keeps that name or rewrites it to a reverse-counted variant — the original temporal position is reconstructable from the frame's `index` plus the extraction settings, but is not persisted. That matters because the `cursorTime` / `nearbyFrames` / `fps` / `nthFrame` values active **at the time of extraction** are what determine each frame's source-video time, and the user could in principle change those settings between extracting and downloading. The store currently exposes only the *current* settings, not the ones used for the extraction that produced the cached frames.

`downloadZip` is called from exactly one site — `App.tsx:177-181` — and the store has all the fields we'd need to thread through. The call already takes `videoInfo.name`, so adding extraction context to the same call is a natural extension.

`sanitizeFilename` (`src/utils/fileUtils.ts:37-39`) already handles the whitelist: `[^a-zA-Z0-9._-] → '_'`. The existing outer-name path uses it; we'll reuse it for the in-zip base.

## Goals / Non-Goals

**Goals:**

- Eliminate the cross-batch collision: extracting from `clipA.mp4` and `clipB.mp4` in the same session SHALL produce ZIPs whose entries don't overwrite each other when merged into one folder.
- Encode useful temporal information for `at-cursor` extractions (which the user navigated to a specific moment in the source video) so the saved frames are self-describing.
- Keep the change scoped to packaging — no schema, no extraction, no IndexedDB, no UI changes beyond the resulting filename inside downloaded archives.
- Pure helpers that can be unit-tested in the existing `tests/utils/` style.
- Graceful fallback to the index-based label whenever timestamp data is missing or non-finite, so the rename is never the cause of a broken download.

**Non-Goals:**

- Renaming `ExtractedFrame.filename` itself or the gallery's displayed label. Those stay as `frame_NNNN.<ext>`. The rename happens only as JSZip ingests entries.
- Renaming files written by `downloadSingleFrame`. A user-initiated single download lands in `~/Downloads/frame_0001.jpg` and is rarely confused across batches in practice; broadening scope here would force the same settings-threading into a code path that doesn't need it. Revisitable as its own change.
- A user-configurable filename **template** (`{base}_{ts}` etc.). Out of scope; we pick one good default per mode and ship it. Templating is a large rabbit hole (escape rules, validation, persistence, UI) that the proposal explicitly avoids. The user-controllable **prefix** added below is *not* a template — it's a single replaceable token.
- Carrying a source-video timestamp on each `ExtractedFrame`. Avoids an IndexedDB shape change for a cosmetic win.
- Persisting the chosen prefix across sessions or videos. The prefix is ephemeral and re-seeds from the source video name on every new video. Persisting "last prefix used" would be confusing across unrelated videos.

## Decisions

### 1. Compute the zip-entry name at packaging time, not at extraction time

The rename happens inside `downloadZip` as JSZip ingests each entry — the `ExtractedFrame.filename` field stays as `frame_NNNN.<ext>` and the gallery, single-download, and IndexedDB cache are unchanged. This is the smallest possible footprint: one helper + one loop change + one extra arg through the call site.

**Alternatives considered:**

- *Persist the renamed filename in IndexedDB at extraction time.* Rejected — couples extraction to download concerns, requires a schema migration for the cached field, and would re-run the rename if the user changes the source video name (today they can't, but conceptually this couples two layers that don't need to be coupled).
- *Add a `sourceTime: number` field to `ExtractedFrame`.* Rejected — every cached frame survives page refresh; introducing a new field is a forward-only schema change for a label that can be derived from `index + settings`. If a future feature genuinely needs per-frame source time on disk, that can be its own change.

### 2. The naming function is a pure utility under `src/utils/`

`buildZipEntryName({ baseName, mode, frameIndex, totalFrames, fps, nthFrame, cursorTime, nearbyFrames, ext })` lives in `src/utils/zipNaming.ts` (new file) alongside `formatTimestampLabel(seconds): string`. Pure inputs, deterministic output, no React/IndexedDB/JSZip imports — testable in vitest the same way `ffmpegCommands` and `fileUtils` are.

`baseName` is the **already-sanitized** source video base — i.e., the caller is responsible for running `sanitizeFilename(videoName.replace(/\.[^.]+$/, ''))`. This mirrors the convention `useDownload` already follows for the outer ZIP name and keeps `sanitizeFilename`'s single responsibility intact.

### 3. Label selection rule — index for `fps` / `every-nth`, timestamp for `at-cursor`

The proposal sketched this; here's the rationale.

- **`fps`**: extracted frames are ordered samples at a fixed rate. The frame index is the natural label (`base_0001.jpg`, `base_0002.jpg`). A timestamp would be derivable (`index / fps`) but adds noise for the common case where the user just wants "the Nth sample".
- **`every-nth`**: same logic — the user is downsampling by count, not by time. Index label.
- **`at-cursor`**: the user explicitly navigated to a moment in the source video and asked for "this and N nearby". The label that's actually useful is the **time**, not the index. The center frame's time is `cursorTime`; the frames to either side are spaced ~`1/24s` apart per the existing seek logic in `ffmpegCommands.buildExtractionArgs` (line 53: `seekOffset = nearbyFrames / 24`). Compute each frame's source time as `seekTime + (frameIndex / 24)` where `seekTime = max(0, cursorTime - nearbyFrames/24)` and `frameIndex` is the 0-based offset within the at-cursor extraction.

Format: `HH-MM-SS.mmm` (zero-padded, milliseconds at three digits, `-` separators because `:` and `.` are filename-hostile on Windows). Example: `myvideo_00-01-23.456.jpg` (matches the proposal's example).

**Alternative considered:** *Always include the timestamp regardless of mode.* Rejected — for a 1-fps extraction of a 30-minute video, every label would be a verbose `00-12-34.000` style with monotonically-spaced values that add no information beyond the index. Index labels are shorter and reproduce the existing mental model for the common modes.

**Alternative considered:** *Let the user pick the labeling scheme via a dropdown.* Rejected — see Non-Goals. The per-mode default already covers the use cases in the proposal.

### 4. Index padding follows total selected-frame count, with a 4-digit floor

Today's ffmpeg pattern hard-codes 4 digits (`%04d`). Inside the rename helper we know `totalFrames` (the count being zipped), so we can pad to `max(4, ceil(log10(totalFrames + 1)))` and avoid `frame_00010.jpg` mixing with `frame_0009.jpg` only if someone extracts >9999 frames. The 4-digit floor preserves visual consistency with the existing `frame.filename` for typical extractions. Cheap insurance — costs ~3 lines.

### 5. `at-cursor` timestamp uses the same 24 fps assumption already encoded in `ffmpegCommands.ts`

`buildExtractionArgs` computes `seekOffset = nearbyFrames / 24` — i.e., the existing code assumes a ~24fps neighborhood when seeking before the cursor to capture nearby frames. We mirror that assumption when reconstructing per-frame times: `frameTime = seekTime + (frameIndex / 24)`. If we later replace the 24-fps assumption in extraction (e.g., probing the source's actual fps), the same change should land in both places — call this out as an open question rather than building a more elaborate pipeline now.

For frames outside the at-cursor window (i.e., a hypothetical future where settings change between extract and download), if `frameIndex >= totalFrames` the helper falls back to the index label.

### 6. Fallback to index whenever the timestamp would be `NaN`, negative, or non-finite

Defensive guard in `formatTimestampLabel`: if `!Number.isFinite(seconds) || seconds < 0`, the helper returns `null` and `buildZipEntryName` falls through to the index branch. Concretely this catches: `cursorTime` is `0` (still produces `00-00-00.000` — fine, finite), `nearbyFrames` is `0` (single-frame extract — fine, returns `00-MM-SS.mmm` for that one frame), settings drift between extract and download (rare, but harmless fallback). Always producing *some* valid label is more important than always producing the *most informative* label.

### 7. Signature of the call from `App.tsx` — pass a small context object, not the whole settings shape

Rather than `downloadZip(frames, videoName, settings)` — which would couple `useDownload` to the entire `ExtractionSettings` type — pass only what the namer needs:

```ts
downloadZip(frames, videoName, {
  mode,
  fps,
  nthFrame,
  cursorTime,
  nearbyFrames,
});
```

Three reasons: (a) the hook stays decoupled from settings shape changes elsewhere; (b) the call site already has these fields destructured from the store; (c) makes the hook's TypeScript signature self-documenting about what it cares about.

The `format` field is **not** in this context object — `ext` is derived from `frame.filename`'s suffix instead, so reverse-extraction's renamed entries (which carry the source extension verbatim) keep working without us having to re-derive it.

### 8. User-controllable prefix lives as local state in `DownloadPanel`, not Zustand

The prefix input is per-archive ephemeral. Three options were considered:

- **Local state in `DownloadPanel`** *(chosen)*. The panel owns a `useState` initialized from `sanitizeFilename(videoName.replace(/\.[^.]+$/, ''))`, and a `useEffect` keyed on `videoName` re-seeds the input whenever a new video loads. On click, the panel sanitizes its current value and calls `onDownloadZip(prefix)`; if the sanitized value is empty, it passes the seeded default instead. Smallest blast radius — no store changes, no prop-drilling, no extra `useCallback` deps in `App.tsx`.
- *Lift state to `App.tsx`.* Rejected — it would force `App.tsx` to own UI text that no other component reads. The seed/reset logic ends up identical, just one layer up, with extra prop-drilling.
- *Persist in Zustand.* Rejected on UX grounds. Carrying "last prefix used" across unrelated videos is confusing — if the user downloaded `vacation_clip` last week and today loads `dog_video.mp4`, seeing `vacation_clip` in the prefix box is wrong.

The chosen design also means the prefix input is naturally cleared on Start Over (the panel unmounts when `status !== 'done'`), which matches the rest of the panel's lifecycle without extra cleanup code.

### 9. Sanitize the prefix on submit, not on every keystroke

Sanitizing on every keystroke breaks the user's typing flow — typing a space would be silently swallowed mid-word into `_`. Instead, the input accepts any text the user types, and `sanitizeFilename` runs only when they click "Download ZIP". The live preview line (e.g. `clip_0001.jpg`) shows what *will be used* by running the same sanitize transform on the current input value, so the user sees the effective name without the input itself being mangled.

If the sanitized value is empty (user typed only whitespace or only disallowed characters), fall back to the seeded default rather than producing entries like `_0001.jpg`. The fallback is silent — no error toast, no input shake. This is a "do the right thing" path, not an error condition.

### 10. The chosen prefix drives the outer ZIP filename too

The outer ZIP file the browser saves to disk follows the existing `frame-ripper-<base>-<timestamp>.zip` pattern. We swap `<base>` for the user-chosen prefix so the saved file matches what's inside it. Otherwise the user types `MyShoot`, sees `MyShoot_0001.jpg` previewed, and downloads a file named `frame-ripper-original_video_name-...zip` — confusing.

Implementation-wise this is a one-line change inside `downloadZip` (the existing `baseName` variable already feeds both code paths after group 3.3 lands).

## Risks / Trade-offs

- **[Risk] Threading extraction context through `downloadZip` couples the download hook to extraction concepts.** → Mitigation: pass a narrow, hook-local context shape (the five fields above) rather than the full `ExtractionSettings` type. The hook stays focused on packaging; the context just describes how to label the inputs it's been handed.
- **[Risk] The 24-fps assumption baked into both `buildExtractionArgs` and the new namer can drift if one is updated without the other.** → Mitigation: extract `AT_CURSOR_NEIGHBOR_FPS = 24` to a shared constant in `src/utils/constants.ts` and import it from both call sites. A test asserts the namer reproduces the same per-frame spacing the seek logic uses.
- **[Risk] Cached frames from a previous session zip up under whatever the *current* settings are.** If the user extracts in `at-cursor` mode, navigates away, comes back, switches mode to `fps`, and downloads, the labels will be index-style for what were originally cursor frames. → Mitigation: documented behavior. The rare case (user changes settings between extract and download without re-extracting) is acceptable to mislabel because the gallery filenames (which still say `frame_0001.jpg`) remain authoritative for in-app reference. Adding a "settings snapshot per extraction" feature is a much larger change.
- **[Risk] `totalFrames` for index padding is the count being zipped (selection size), not the extraction's total frame count, so two ZIPs from the same extraction with different selections could pad differently.** → Mitigation: acceptable — the padding is per-archive consistent, which is what users actually care about (sortability inside one folder).
- **[Trade-off] The helper assumes `baseName` is already sanitized, putting the responsibility on the caller.** Slightly easier to misuse than a self-sanitizing helper. Chose this to keep one canonical sanitize-and-strip-extension chain (already in `useDownload` for the outer name) and avoid double-sanitizing.
- **[Trade-off] Filename uses `-` separators in the timestamp instead of `:` or `.`, which is less visually idiomatic for time but works on Windows/macOS/Linux without quoting.** Worth it for the cross-OS-friendliness.
- **[Risk] User edits the prefix mid-extraction, then downloads — the input retained the in-progress edit and the seeded default never overwrites it.** → Mitigation: the seed effect keys on `videoName` (not on extraction state), so the prefix only resets when a *new video* is loaded. Editing during extraction and downloading with the edited value is the intended behavior — the user is in control.
- **[Trade-off] Sanitizing only on submit (not on keystroke) means the input box can briefly contain characters that won't appear in the actual filename.** The live preview line under the input bridges this gap by showing the post-sanitize result in real time.

## Migration Plan

No data migration. All in-flight cached frames keep working — the rename derives from inputs available at download time.

1. Land the new helper + tests + the `useDownload` signature change in one PR.
2. Update the single `App.tsx` call site to pass the context object.
3. CI runs `lint → test → build`; the new tests cover the helper end-to-end. Manual smoke: extract from two videos in one session, download both ZIPs, drop them into one folder, confirm no overwrite.

**Rollback:** revert the commit. The rename is non-persistent (lives only inside generated archives), so any ZIPs already downloaded by users are unaffected by a rollback. No persisted state changes.

## Open Questions

- Should `formatTimestampLabel` use `_` instead of `-` between the time components (`00_01_23_456`) to match the `_` separator in the rest of the filename (`base_00_01_23_456.jpg`)? Defer to implementation; not blocking for the spec — the spec just requires "filename-safe characters and a deterministic format".
- Probing the source video's actual frame rate (instead of the 24-fps assumption) would make at-cursor timestamps more precise. Tracked separately — not part of this change.
- Should `every-nth` mode include the source-video index in the label (e.g., `base_0001_src0030.jpg` for the 30th source frame)? Could be useful for ML datasets but adds visual noise for the common case. Defer.
