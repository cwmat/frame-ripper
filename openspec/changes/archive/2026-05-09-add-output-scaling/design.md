## Context

FrameRipper builds ffmpeg argument lists in one place — `src/utils/ffmpegCommands.ts:32` (`buildExtractionArgs`). Three extraction modes produce three argument shapes today:

- `fps` → `-i <input> -vf fps=<n> [-q:v <q>] frame_%04d.<ext>`
- `every-nth` → `-i <input> -vf select=not(mod(n\,<n>)) -vsync vfr [-q:v <q>] frame_%04d.<ext>`
- `at-cursor` → `-ss <t> -i <input> -frames:v <count> [-q:v <q>] frame_%04d.<ext>` (no `-vf` at all)

Settings flow App.tsx → `useAppStore` (Zustand, persisted via `partialize`) → `buildExtractionArgs`. The pure utility is fully unit-tested in `tests/utils/ffmpegCommands.test.ts`; ffmpeg.wasm itself is not mocked. The `extraction-settings-persistence` spec encodes "exactly seven persisted fields" — a count we'll need to bump.

## Goals / Non-Goals

**Goals:**

- Let users cap extracted-frame width to a target pixel count to shrink IndexedDB usage and ZIP downloads.
- Compose cleanly with all three existing modes via a single conditional branch in `buildExtractionArgs` — no new pipeline stage, no new ffmpeg pass.
- Preserve aspect ratio automatically; never upscale narrower videos.
- Persist the new setting alongside the existing seven so it survives reload.
- Keep the change minimal: one new field, one new branch, one new test group, one new UI control.

**Non-Goals:**

- Height-based scaling, max-area scaling, or scaling by percentage. Width is the simplest mental model and covers the dominant use case (4K phone footage → smaller stills).
- Per-mode scaling overrides. Scale is a single global setting that applies whenever extraction runs.
- Resampling or filter quality controls (`-sws_flags`, etc.). ffmpeg's default `bicubic` is fine for thumbnail-class output.
- Format-specific scaling (e.g., scaling only when JPG). Out of scope.

## Decisions

### 1. Use `scale='min(iw\,W)':-2` instead of `scale=W:-2`

The user's original sketch was `scale=<w>:-2`. That literally upscales when the source is narrower than `<w>`, which would inflate IndexedDB usage instead of shrinking it — the opposite of the goal. Wrapping the width in `min(iw, W)` enforces "max width" semantics: never upscale, only downscale.

The escaped comma (`\,` in the ffmpeg string, `\\,` in JS source) is required because `scale` lives inside a `-vf` filter chain where unescaped commas separate filters. We already use this same trick for `every-nth` (`select=not(mod(n\,<n>))`), so the convention is established.

`-2` for height (rather than `-1`) rounds the auto-computed height to an even number. Some encoders reject odd dimensions; image output is permissive but `-2` is harmless and future-proofs against any encoder swap.

**Alternatives considered:**

- `scale=W:-2` (the literal sketch) — rejected because it upscales.
- `scale=if(gt(iw\,W)\,W\,iw):-2` — equivalent to `min(iw,W)` but harder to read and more chars to escape.
- A separate "force-resize" boolean — adds UI complexity for a niche case (deliberately upscaling stills).

### 2. Use `0` as the sentinel for "off"

Persisted settings in this repo already lean on numeric primitives (no nullable settings). A `maxWidth` of `0` reads naturally as "no limit / original" and avoids introducing the first nullable persisted field. The branch in `buildExtractionArgs` is a simple `if (settings.maxWidth > 0)`.

**Alternative considered:** `maxWidth: number | null` with `null` meaning off. Rejected — adds a new pattern to the persisted-settings shape for no real gain, and Zustand's default-merge handling of nullable + missing-key cases is one more edge case to validate.

### 3. Compose via filter-chain extension, not a second `-vf` flag

ffmpeg accepts only one `-vf` per output. So when `fps` or `every-nth` mode is active, we extend their existing filter string with a comma:

```
-vf fps=1                               →  -vf fps=1,scale='min(iw\,640)':-2
-vf select=not(mod(n\,10)) -vsync vfr   →  -vf select=not(mod(n\,10)),scale='min(iw\,640)':-2 -vsync vfr
```

For `at-cursor` (which has no `-vf` today), we add a fresh `-vf scale='min(iw\,640)':-2` flag. The relaxation of the existing "at-cursor has no `-vf`" requirement is captured in the spec delta.

The implementation builds the filter as a small array and joins on `,` at the end — keeps escaping local and avoids string-template gotchas.

### 4. UI control: numeric input with presets

Offer a small set of preset chips (`Original`, `1920`, `1280`, `854`, `640`) plus a free-form numeric input — the same pattern used by `FPS_PRESETS` for the fps field. `Original` writes `0` to the store. Validation: clamp `< 0` to `0`, clamp absurdly large values (`> 7680`) to `7680` (8K).

### 5. Test surface

`tests/utils/ffmpegCommands.test.ts` is the only place this needs new coverage. Add:

- `maxWidth=0` → no `scale=` substring in any of the three modes (regression guard).
- `maxWidth=640` in fps mode → filter is `fps=<n>,scale='min(iw\,640)':-2`.
- `maxWidth=640` in every-nth mode → filter is `select=...,scale='min(iw\,640)':-2` and `-vsync vfr` is still present.
- `maxWidth=640` in at-cursor mode → args contain `-vf scale='min(iw\,640)':-2`.
- Escaping: the resulting string contains a literal `\,` (one backslash) inside the `min(...)` expression.

Per repo convention, ffmpeg.wasm is not exercised in tests — the pure-arg shape is the contract.

## Risks / Trade-offs

- **[Risk] Filter-string escaping mistakes silently produce wrong frames.** ffmpeg failure surfaces as a non-zero exit code via the existing error path (`useFrameExtractor.extract` → `setError`), but a malformed filter could also be parsed as a no-op or a different filter. → Mitigation: tests assert the exact escaped form (`\\,` in JS source ↔ `\,` in the runtime string), matching the convention already used for `every-nth`.
- **[Risk] Single-source videos already at or below `maxWidth` produce identical-size frames; users may expect a guaranteed downscale.** → Mitigation: this is the intended `min(iw, W)` semantics; document in the UI control's helper text (e.g., "won't upscale narrower videos").
- **[Risk] Aspect-ratio rounding via `-2` can drop one row of pixels for odd-input heights at extreme widths.** → Mitigation: acceptable for thumbnail-class output; the alternative (`-1`) risks encoder errors for negligible quality gain.
- **[Trade-off] Width-only scaling is less flexible than width+height or area-cap.** → Trade made deliberately to keep the UI to one numeric input; can be revisited if users ask.
- **[Trade-off] Rehydrating older persisted blobs leans on Zustand's default merge.** Same mechanism the `reverse` field already relies on — no schema migration needed, but means we must keep `DEFAULT_SETTINGS.maxWidth = 0` stable, not change its default later.

## Migration Plan

No data migration. The new field is additive:

1. Ship the new `DEFAULT_SETTINGS.maxWidth = 0` and `partialize` entry. Older persisted blobs missing the key will rehydrate with `0` via Zustand's default merge.
2. Build → deploy. Users on stale tabs continue to work because the runtime check is `if (settings.maxWidth > 0)`; `undefined > 0` is `false`, so the worst-case stale-state path still produces today's args.

**Rollback:** revert the commit. Persisted blobs that picked up the new key will simply have an unused `maxWidth` field — harmless and ignored by the older code.

## Open Questions

- Do we want the "Original" preset to display the source's actual width as a reminder (e.g., `Original (3840 px)`)? Defer to UI implementation; not blocking for the spec.
