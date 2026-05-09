## 1. Naming helper utility

- [x] 1.1 Create `src/utils/zipNaming.ts` exporting two pure functions: `formatTimestampLabel(seconds: number): string | null` and `buildZipEntryName(input: ZipEntryNameInput): string`
- [x] 1.2 Define and export the `ZipEntryNameInput` type: `{ baseName: string; mode: ExtractionMode; archiveIndex: number; totalFrames: number; ext: string; cursorTime?: number; nearbyFrames?: number; }` (note: `baseName` is assumed already-sanitized; `ext` is the leading-dot suffix like `.jpg`)
- [x] 1.3 Implement `formatTimestampLabel`: return `null` when `!Number.isFinite(seconds) || seconds < 0`; otherwise format as `HH-MM-SS.mmm` with zero-padded hours/minutes/seconds (2 digits) and 3-digit milliseconds, separators `-` and `.`
- [x] 1.4 Implement `buildZipEntryName`: compute padded index as `String(archiveIndex + 1).padStart(Math.max(4, Math.ceil(Math.log10(totalFrames + 1))), '0')`
- [x] 1.5 In `buildZipEntryName`, when `mode === 'at-cursor'` derive per-frame time as `seekTime + (archiveIndex / AT_CURSOR_NEIGHBOR_FPS)` where `seekTime = max(0, cursorTime - nearbyFrames / AT_CURSOR_NEIGHBOR_FPS)`; if `formatTimestampLabel` returns `null` fall back to the index label
- [x] 1.6 In `buildZipEntryName`, for `fps` and `every-nth` modes use the index label
- [x] 1.7 Compose the final string as `${baseName}_${frameLabel}${ext}` and return it (no `frames/` prefix — the caller scopes the JSZip folder)

## 2. Shared constant for neighborhood fps

- [x] 2.1 Add `export const AT_CURSOR_NEIGHBOR_FPS = 24;` to `src/utils/constants.ts`
- [x] 2.2 Replace the literal `24` in `buildExtractionArgs` (`src/utils/ffmpegCommands.ts`, current line ~52) with the new constant via `import { AT_CURSOR_NEIGHBOR_FPS } from './constants'`
- [x] 2.3 Import the same constant in `src/utils/zipNaming.ts`

## 3. `useDownload` wiring

- [x] 3.1 In `src/hooks/useDownload.ts`, define an exported type `DownloadZipContext = { mode: ExtractionMode; fps: number; nthFrame: number; cursorTime: number; nearbyFrames: number; }`
- [x] 3.2 Change `downloadZip` signature to `(frames: ExtractedFrame[], videoName: string, context: DownloadZipContext) => Promise<void>` and update the `UseDownloadReturn` interface
- [x] 3.3 Compute `const baseName = sanitizeFilename(videoName.replace(/\.[^.]+$/, ''));` once at the top of `downloadZip`, **before** the existing folder loop, and reuse it for both the in-zip entries and the outer ZIP filename (de-dupe with the existing `baseName` variable in the outer-name section)
- [x] 3.4 In the packaging loop, derive `const ext = frame.filename.endsWith('.png') ? '.png' : '.jpg';` per frame
- [x] 3.5 Replace `folder.file(frame.filename, frame.data)` with `folder.file(buildZipEntryName({ baseName, mode: context.mode, archiveIndex: i, totalFrames: frames.length, ext, cursorTime: context.cursorTime, nearbyFrames: context.nearbyFrames }), frame.data)` (use a `for` loop with index, not a `for…of`)
- [x] 3.6 `downloadSingleFrame` is unchanged — verify nothing else in the file imports the old single-arg shape

## 4. App.tsx call site

- [x] 4.1 In `src/App.tsx`, update `handleDownloadZip` (~line 177) to pass the context object: `downloadZip(frames, videoInfo.name, { mode, fps, nthFrame, cursorTime, nearbyFrames })`
- [x] 4.2 Add the missing fields (`mode`, `fps`, `nthFrame`, `cursorTime`, `nearbyFrames`) to the `useCallback` dependency array if not already present
- [x] 4.3 Confirm the destructure block (~line 35) already pulls all five fields from the store; add any that are missing

## 5. Tests

- [x] 5.1 Create `tests/utils/zipNaming.test.ts`
- [x] 5.2 Test `formatTimestampLabel(0)` → `'00-00-00.000'`
- [x] 5.3 Test `formatTimestampLabel(83.456)` → `'00-01-23.456'`
- [x] 5.4 Test `formatTimestampLabel(3661.001)` → `'01-01-01.001'`
- [x] 5.5 Test `formatTimestampLabel(NaN)` → `null` and `formatTimestampLabel(-1)` → `null` and `formatTimestampLabel(Infinity)` → `null`
- [x] 5.6 Test `buildZipEntryName` with `mode='fps'`, `archiveIndex=0`, `totalFrames=5`, `baseName='clip'`, `ext='.jpg'` → `'clip_0001.jpg'`
- [x] 5.7 Test `buildZipEntryName` with `mode='every-nth'`, `archiveIndex=2`, `totalFrames=3`, `baseName='clip'`, `ext='.png'` → `'clip_0003.png'`
- [x] 5.8 Test `buildZipEntryName` with `mode='at-cursor'`, `archiveIndex=0`, `totalFrames=1`, `cursorTime=83.456`, `nearbyFrames=0`, `baseName='clip'`, `ext='.jpg'` → `'clip_00-01-23.456.jpg'`
- [x] 5.9 Test `buildZipEntryName` `at-cursor` 3-frame neighborhood produces three timestamps spaced by `1/24s` around `cursorTime`
- [x] 5.10 Test `buildZipEntryName` with `mode='at-cursor'` and `cursorTime=NaN` falls back to the index label `'clip_0001.jpg'` (and the result does not contain `NaN`)
- [x] 5.11 Test padding floor: `mode='fps'`, `totalFrames=7` → padded to 4 digits (`_0007`)
- [x] 5.12 Test padding growth: `mode='fps'`, `totalFrames=12000`, `archiveIndex=11999` → `_12000`
- [x] 5.13 Test that an awkward source name `'My Video (1).mp4'` after `sanitizeFilename(... .replace(/\.[^.]+$/, ''))` becomes `'My_Video__1_'` and round-trips through `buildZipEntryName` cleanly
- [x] 5.14 Optional: snapshot/regex test confirming every emitted entry name matches `/^[A-Za-z0-9._-]+$/` for a sweep of mode × index inputs

## 6. Verification

- [x] 6.1 Run `npm run lint` — no new warnings
- [x] 6.2 Run `npm test` — all tests pass, including the new `zipNaming.test.ts` cases
- [x] 6.3 Run `npm run build` — typecheck clean, build succeeds
- [x] 6.4 Manual smoke (dev server): drop video A, extract in `fps` mode, download ZIP — confirm entries are `frames/<A>_0001.jpg` style
- [x] 6.5 Manual smoke: drop video B (different name), extract again, download a second ZIP — confirm entries are `frames/<B>_NNNN.jpg`; merge both archives' contents into one folder and confirm no overwrite warning
- [x] 6.6 Manual smoke: extract in `at-cursor` mode at a non-trivial cursor time (e.g. 1m 23s), download — confirm entries embed the `HH-MM-SS.mmm` timestamp
- [x] 6.7 Manual smoke: switch to PNG output, extract in `fps` mode, download — confirm entries end `.png`
- [x] 6.8 Manual smoke: enable Reverse, extract in `fps` mode, download — confirm entries are `<base>_0001…<base>_NNNN` in temporal order matching the gallery view

## 7. Plumb `filenamePrefix` through `useDownload` and `App.tsx`

- [x] 7.1 In `src/hooks/useDownload.ts`, add an optional `filenamePrefix?: string` field to the `DownloadZipContext` type
- [x] 7.2 In `downloadZip`, after computing the source-derived `baseName`, derive `effectivePrefix = sanitizeFilename(context.filenamePrefix?.trim() ?? '') || baseName` (trim-then-sanitize so whitespace-only input falls back; see 9.3 for rationale)
- [x] 7.3 Use `effectivePrefix` for **both** the in-zip entries (pass as `baseName` to `buildZipEntryName`) and the outer ZIP filename (`frame-ripper-${effectivePrefix}-${timestamp}.zip`)
- [x] 7.4 In `src/App.tsx`, change `handleDownloadZip` to accept an optional prefix arg: `(prefix?: string) => { … downloadZip(frames, videoInfo.name, { …, filenamePrefix: prefix }) }`
- [x] 7.5 Update the `useCallback` dependency array if needed (no new deps expected — `prefix` is a parameter, not a closed-over value)

## 8. `DownloadPanel` prefix UI

- [x] 8.1 In `src/components/features/DownloadPanel.tsx`, add a required `videoName: string` prop
- [x] 8.2 Pass `videoInfo.name` to `<DownloadPanel videoName={videoInfo.name} … />` in `src/App.tsx`
- [x] 8.3 Change the `onDownloadZip` prop signature to `(prefix?: string) => void` so the panel can hand its current value back to `App.tsx`
- [x] 8.4 Inside `DownloadPanel`, derive the seed value with `useMemo`: `const defaultPrefix = useMemo(() => sanitizeFilename(videoName.replace(/\.[^.]+$/, '')), [videoName]);`
- [x] 8.5 Add `const [prefix, setPrefix] = useState(defaultPrefix);` plus a `useEffect(() => setPrefix(defaultPrefix), [defaultPrefix]);` so the input re-seeds on video change
- [x] 8.6 Render a labeled text input ("Filename prefix") above the action button row, bound to `prefix` / `setPrefix`. Placeholder = `defaultPrefix`. Disable the input while `zipping`
- [x] 8.7 Render a small live-preview line under the input showing `${sanitizeFilename(prefix) || defaultPrefix}_0001.<ext>` (use `format.toLowerCase()` for the extension)
- [x] 8.8 Wire the existing `Download ZIP` button's `onClick` to `() => onDownloadZip(prefix)` so the panel's chosen value flows back to `App.tsx`
- [x] 8.9 Style the input + preview to match the existing panel surface (`var(--surface-1)`, `var(--border)`, etc.) — small text input with subtle border, helper text in `var(--text-muted)`

## 9. Tests for the prefix override path

- [x] 9.1 In `tests/utils/zipNaming.test.ts`, add a test: `buildZipEntryName` with `baseName='MyShoot'` (caller-sanitized override) produces `MyShoot_0001.jpg` — confirms the helper itself is prefix-agnostic
- [x] 9.2 Add a fileUtils test confirming `sanitizeFilename('   ') === '___'` (whitespace becomes underscores) — documents the rationale for trim-then-sanitize in 9.3
- [x] 9.3 `sanitizeFilename` does not return empty for whitespace, so a `resolveZipPrefix(userPrefix, fallback)` helper was extracted into `src/utils/zipNaming.ts` (`sanitizeFilename(userPrefix?.trim() ?? '') || fallback`) and `useDownload` now uses it. Tests cover supplied / sanitized / undefined / empty / whitespace-only paths

## 10. Verification (prefix scope)

- [x] 10.1 Run `npm run lint` — no new warnings
- [x] 10.2 Run `npm test` — all tests pass, including new prefix-override cases
- [x] 10.3 Run `npm run build` — typecheck clean, build succeeds
- [x] 10.4 Manual smoke: load a video, confirm the prefix input is pre-filled with the sanitized video name and the preview line shows `<base>_0001.<ext>`
- [x] 10.5 Manual smoke: edit the prefix to `MyShoot`, confirm the preview updates live to `MyShoot_0001.<ext>`, click Download, confirm both the saved file (`frame-ripper-MyShoot-…zip`) and its inner entries use `MyShoot_NNNN`
- [x] 10.6 Manual smoke: clear the prefix input completely, click Download — confirm it falls back to the source-derived default for both inner and outer names (no `frame-ripper--…zip`, no `_0001.jpg` entries)
- [x] 10.7 Manual smoke: load video A, edit prefix, then drop video B — confirm the prefix input resets to video B's sanitized name (does not retain the edited value from video A)
- [x] 10.8 Manual smoke: type disallowed characters (`My/Shoot:1`) into the input, confirm the preview shows the sanitized form, and confirm the resulting download uses the sanitized form
