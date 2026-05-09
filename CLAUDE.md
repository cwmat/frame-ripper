# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev         # Vite dev server on http://localhost:5173
npm run build       # tsc -b && vite build  (type-check is part of build)
npm run preview     # serve dist/ locally
npm run lint        # eslint .
npm run format      # prettier --write src/**/*.{ts,tsx,css}
npm test            # vitest run (single pass, jsdom)
npm run test:watch  # vitest watch
npx vitest run tests/utils/ffmpegCommands.test.ts        # run a single test file
npx vitest run -t "builds fps args"                      # run by test name
```

CI (`.github/workflows/deploy.yml`) runs `npm i` (not `npm ci`) → `lint` → `test` → `build` and deploys `dist/` to GitHub Pages on push to `main`. `.npmrc` sets `legacy-peer-deps=true` because `@tailwindcss/vite@4.2.x` doesn't yet declare `vite@8` as a peer — keep this until tailwind ships v8 support.

## Architecture

FrameRipper is a fully client-side video-frame extractor. Video bytes never leave the browser.

### The extraction pipeline (read this before touching extraction code)

The flow is **App.tsx → useFrameExtractor → ffmpeg.wasm → IndexedDB**, with a deliberate split between persistent settings (Zustand) and bulk frame data (IndexedDB):

1. **`src/wasm/ffmpegLoader.ts`** — singleton ffmpeg.wasm instance loaded from a CDN (`unpkg.com/@ffmpeg/core@<version>/dist/esm`). `initFFmpeg` is idempotent and dedupes concurrent loads via `loadPromise`. The instance is **never terminated on unmount** — it's reused across extractions. The vite config excludes `@ffmpeg/ffmpeg` and `@ffmpeg/util` from `optimizeDeps` so ffmpeg core is loaded at runtime, not bundled.
2. **`useFrameExtractor.extract`** writes the input video into ffmpeg's WASM filesystem at `/input<ext>`, runs `ffmpeg.exec(args)` with args built by `buildExtractionArgs`, then iterates ffmpeg's virtual `/` directory, reads each `frame_%04d.{jpg,png}` file, and saves it to IndexedDB via `saveFrame`. Files are deleted from the WASM FS as they're persisted to keep memory bounded. A `cancelledRef` flag short-circuits the loop on cancel.
3. **`src/utils/ffmpegCommands.ts`** is the single source of truth for ffmpeg argument construction. Three modes (see `ExtractionMode` in `src/types/index.ts`):
   - `fps` → `-vf fps=<n>`
   - `every-nth` → `-vf select=not(mod(n\,<n>)) -vsync vfr` (note the JS `\\,` → ffmpeg-escaped comma)
   - `at-cursor` → `-ss <cursorTime - nearby/24> -i <input> -frames:v <1 + 2*nearby>` (seek **before** input for fast keyframe seek)
   JPG quality is mapped 1–100 → ffmpeg's inverted `-q:v` 31–2 in `mapJpgQuality`.

### State is split deliberately

- **Zustand (`src/store/appStore.ts`)** holds two kinds of state in one store:
  - **persisted** (under `frame-ripper-settings` localStorage key, via `partialize`): the six extraction settings.
  - **transient** (status, progress, video info/file, frameCount, error): not persisted. `resetExtraction` clears just transient extraction state; `resetAll` also resets settings to defaults.
- **IndexedDB (`src/store/frameDb.ts`, db `frame-ripper-db`, store `frames`)** holds all extracted frame bytes. Frames are keyed by `id` with a `by-index` index. Frames are **never held in React state** — `App.tsx` keeps only `selectedIndicesRef` (a `Set<number>`) plus aggregated count/size, and resolves to `Uint8Array` on demand via `getFramesByIndices` when zipping. The frame cache survives page refresh but is wiped on new video drop / Clear All / Start Over. If you add features that read frame bytes, do it lazily — putting all frames into a hook or context will OOM on large videos.

### Status state machine

`ExtractionStatus = 'idle' | 'loading-ffmpeg' | 'reading-video' | 'extracting' | 'caching' | 'done' | 'error'`. `App.tsx` derives `isExtracting` from the four middle states. The progress bar is indeterminate during `loading-ffmpeg` and `reading-video`; ffmpeg's own progress event drives it during `extracting` and per-frame loop progress during `caching`.

### Component layers

- `components/ui/` — reusable primitives (Button, DropZone, ProgressBar, Spinner, Toast)
- `components/layout/` — Header, Footer, Layout shell
- `components/features/` — domain components: VideoPreview (reports `currentTime` via `onTimeUpdate`/`onSeeked` for `at-cursor` mode), ExtractionSettings, FrameGallery, FrameThumbnail, DownloadPanel
- `hooks/` — `useFFmpeg` (reactive wrapper over the singleton), `useFrameExtractor` (the pipeline above), `useDownload` (JSZip with `compression: 'STORE'` since images are already compressed)

### PWA / deploy

`vite-plugin-pwa` is configured with `registerType: 'autoUpdate'`. Workbox `runtimeCaching` caches the ffmpeg core CDN URL (`CacheFirst`, 30-day expiry) so the app works offline after first load. `globPatterns` includes `**/*.wasm` and `maximumFileSizeToCacheInBytes` is 50 MB to fit ffmpeg-core.

`vite.config.ts` sets `base: '/frame-ripper/'` for GitHub Pages — change this if the repo is renamed or hosted elsewhere, or assets will 404.

## Spec-driven development with OpenSpec

This project uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) for spec-driven changes. Specs live in `openspec/specs/<capability>/spec.md`; in-flight changes live in `openspec/changes/<name>/` (proposal, design, specs delta, tasks); completed changes are archived under `openspec/changes/archive/YYYY-MM-DD-<name>/`. See [`AGENTS.md`](./AGENTS.md) for the canonical workflow description shared across all AI tools in this repo.

| Situation | Use |
|---|---|
| New feature, blank slate | Official `/opsx:propose` → `/opsx:apply` → `/opsx:archive` |
| Existing code with no spec | `/opsx-ext:codify <capability>` (one at a time, clean tree required) |
| Bringing a spec from another project | `/opsx-ext:port <source-dir>` |
| 3+ ported changes ready to ship | `/opsx-ext:bulk` after confirming order |

The `opsx-ext:` namespace is custom to this repo — it covers brownfield/migration scenarios that OpenSpec doesn't ship native commands for. The body of each custom workflow is in `.claude/skills/openspec-ext-*/SKILL.md`.

## Project skills

Custom skills live in `.claude/skills/`:

- **review-changes** — lint + typecheck + tests + diff read before committing
- **add-test** — vitest patterns and conventions used in this repo
- **add-extraction-mode** — end-to-end walkthrough for extending `ExtractionMode`
- **write-commit** — short, conventional commit messages matching this repo's voice

Use them when the user's ask matches a skill's `description`.

### OpenSpec extension skills (`opsx-ext:` namespace)

Custom companions to OpenSpec — clearly marked unofficial via the `opsx-ext:` prefix to distinguish from the official `opsx:` commands. Slash commands live in `.claude/commands/opsx-ext/` and delegate to skills in `.claude/skills/openspec-ext-*/`:

- **`/opsx-ext:codify <capability>`** — reverse-engineer a baseline `openspec/specs/<capability>/spec.md` from existing code + tests in this brownfield repo. One capability per invocation. Requires a clean working tree.
- **`/opsx-ext:port <source-dir> [target-name]`** — port an openspec-shaped folder from another project into a new `openspec/changes/<name>/`, preserving the spec but rewriting design.md + tasks.md for this repo's stack.
- **`/opsx-ext:bulk [name1,name2,...]`** — apply N pending changes in confirmed order with lint/build/test between each. Pauses on failure. For 3+ changes that ship together (e.g., the output of repeated `/opsx-ext:port` runs).

## Tests

Vitest with `jsdom` and `globals: true`. Tests live under `tests/` (mirroring `src/utils/`), not colocated. `tests/setup.ts` only imports `@testing-library/jest-dom`. Existing tests cover the pure utility surface (`ffmpegCommands`, `fileUtils`, `formatUtils`) — ffmpeg.wasm and IndexedDB are not mocked or exercised in tests.
