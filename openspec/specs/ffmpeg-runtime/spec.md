# ffmpeg-runtime

## Purpose

The singleton ffmpeg.wasm runtime — how the WASM core is fetched, loaded, deduped, and shared across the app's lifetime. Covers `initFFmpeg`/`getFFmpegInstance`/`terminateFFmpeg` in the loader module and the reactive `useFFmpeg` hook that wraps them. The runtime is deliberately not bundled into the JS bundle: it's loaded from a CDN at runtime so the main bundle stays small.

## Requirements

### Requirement: Idempotent loader

`initFFmpeg` SHALL return the existing loaded `FFmpeg` instance on every call after the first successful load, without re-fetching the core or re-initialising. Once loaded, the singleton SHALL persist for the lifetime of the page.

#### Scenario: second call returns the same instance

- **WHEN** `initFFmpeg()` is awaited, then `initFFmpeg()` is awaited again
- **THEN** both calls resolve to the same `FFmpeg` reference
- **AND** `ffmpeg.load(...)` is invoked only once

### Requirement: Concurrent load deduplication

When `initFFmpeg` is called while a load is already in flight, the system SHALL return the same in-flight `Promise<FFmpeg>` rather than starting a second load.

#### Scenario: parallel callers share one load

- **WHEN** two callers invoke `initFFmpeg` concurrently before the first has resolved
- **THEN** both receive the same resolved instance
- **AND** the underlying core/wasm fetches run only once

### Requirement: Optional progress reporting

`initFFmpeg(onProgress?)` SHALL accept an optional callback. When provided, the callback SHALL receive load progress values clamped to `[0, 1]`, sourced from ffmpeg's `progress` event.

#### Scenario: progress callback is invoked during load

- **WHEN** `initFFmpeg(onProgress)` is called and ffmpeg emits a `progress` event with `progress=0.5`
- **THEN** `onProgress(0.5)` is called

#### Scenario: progress is clamped

- **WHEN** ffmpeg emits a `progress` event with a value outside `[0, 1]`
- **THEN** `onProgress` receives `Math.max(0, Math.min(1, value))`

### Requirement: Core fetched from CDN at runtime

The core JavaScript and WASM blobs SHALL be fetched at runtime from `${FFMPEG_CORE_BASE_URL}/ffmpeg-core.js` and `${FFMPEG_CORE_BASE_URL}/ffmpeg-core.wasm` (currently `https://unpkg.com/@ffmpeg/core@<FFMPEG_CORE_VERSION>/dist/esm`) via `toBlobURL`, then passed to `ffmpeg.load({ coreURL, wasmURL })`. The core SHALL NOT be bundled into the application JS bundle. (Vite's `optimizeDeps.exclude` is configured accordingly.)

#### Scenario: core is fetched, not imported

- **WHEN** `initFFmpeg` runs for the first time
- **THEN** `toBlobURL` is invoked with `${FFMPEG_CORE_BASE_URL}/ffmpeg-core.js` and the wasm path
- **AND** `ffmpeg.load` is called with the resulting blob URLs

### Requirement: No auto-termination on component unmount

`useFFmpeg`'s effect cleanup SHALL NOT terminate the singleton — the runtime is intentionally reusable across mounts to avoid paying the ~30 MB core download cost on every navigation. Termination SHALL only happen when `terminate()` is invoked explicitly.

#### Scenario: hook unmount preserves the instance

- **WHEN** a component using `useFFmpeg` unmounts
- **THEN** the singleton remains loaded
- **AND** `getFFmpegInstance()` continues to return the loaded instance

#### Scenario: explicit terminate clears state

- **WHEN** `terminateFFmpeg()` is called
- **THEN** the singleton is terminated and `ffmpegInstance` and `loadPromise` are reset to `null`
- **AND** the next `initFFmpeg()` call performs a fresh load

### Requirement: Load failure resets dedupe promise

If a load attempt rejects, `loadPromise` SHALL be reset to `null` so a subsequent `initFFmpeg` call performs a new attempt rather than re-throwing the cached failure.

#### Scenario: failed load can be retried

- **WHEN** `initFFmpeg` rejects (e.g. network failure)
- **THEN** `loadPromise` is set to `null`
- **AND** the next `initFFmpeg` call starts a new load attempt

## Source anchors (codified 2026-05-09 at commit 7f12443)

- Idempotent loader — `src/wasm/ffmpegLoader.ts:5-12`
- Concurrent dedupe — `src/wasm/ffmpegLoader.ts:6,15,17-39,42`
- Progress reporting — `src/wasm/ffmpegLoader.ts:8,20-24`, `src/hooks/useFFmpeg.ts:18-34`
- CDN fetch at runtime — `src/wasm/ffmpegLoader.ts:26-35`, `src/utils/constants.ts:6-7`
- No auto-terminate — `src/hooks/useFFmpeg.ts:42-46`, `src/wasm/ffmpegLoader.ts:53-59`
- Failure resets loadPromise — `src/wasm/ffmpegLoader.ts:41-46`
