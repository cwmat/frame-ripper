## Context

FrameRipper extracts frames via ffmpeg.wasm into the WASM filesystem (`frame_0001.{jpg,png}`, …), then loops over them, persists each `Uint8Array` to IndexedDB keyed by `id` with an `index` field, and deletes the file from WASM FS as it goes (see `src/hooks/useFrameExtractor.ts`). Downstream consumers (`FrameGallery`, ZIP download) read frames via the `by-index` IndexedDB index, so on-disk filename order and the stored `index` value are the only two things that determine the user-visible ordering.

ffmpeg has a native `-vf reverse` filter, but it buffers the entire decoded stream in memory before writing output. For multi-minute videos in WASM that would exceed the heap. A JS-side reorder of already-extracted frames is cheaper, simpler, and orthogonal to the three existing selection modes (`fps` / `every-nth` / `at-cursor`).

## Goals / Non-Goals

**Goals:**
- Add a single `reverse: boolean` setting that, when enabled, makes the extracted frame sequence run last-to-first regardless of which selection mode produced it.
- Keep ffmpeg's argument list unchanged; reversal happens entirely in the JS post-extraction loop.
- Persist the toggle alongside the other extraction settings under the existing `frame-ripper-settings` key, with no IndexedDB schema migration.
- Compose cleanly with `at-cursor` (the temporally-bounded mode): reversing a 21-frame cursor window flips its order.

**Non-Goals:**
- Producing a reversed *video* file (e.g., MP4 out). FrameRipper extracts frames; encoding is out of scope.
- Any audio handling (FrameRipper already discards audio).
- Reversing while preserving original filenames as metadata. The reversed sequence becomes canonical; original positions are not retained.
- Per-frame or partial reversal (e.g., reverse only a sub-range). Single boolean only.

## Decisions

### Reversal happens in JS, not via `-vf reverse`

ffmpeg's `reverse` filter requires holding all decoded frames in memory before emitting output. On a 5-minute 30 fps clip that's 9000 raw frames — well past WASM's practical heap. Since `useFrameExtractor` already iterates the extracted files one by one, swapping the index assignment is O(1) per frame and requires no extra memory.

**Alternative considered:** add `reverse` to the ffmpeg arg list. Rejected on memory grounds. Also would have meant a fourth `ExtractionMode`-like axis in `ffmpegCommands.ts`, which is the wrong shape — reverse is orthogonal to selection.

### Reversal is a separate axis, not a fourth `ExtractionMode`

`ExtractionMode` answers *which* frames to pick. Reverse answers *in what order* to deliver the picked set. Conflating them would force every future combination (`reverse-fps`, `reverse-every-nth`, `reverse-at-cursor`) into the union, and the cross-product would explode. A boolean toggle keeps the modes orthogonal.

### Reversal point: at index/filename assignment, not after IndexedDB write

The frame loop reads `frame_0001.jpg`, `frame_0002.jpg`, … in name order from the WASM FS. We compute the stored `index` and rewrite the `filename` *as we save*:

```ts
const storedIndex = settings.reverse ? (totalFrames - 1 - i) : i;
const storedFilename = settings.reverse
  ? `frame_${String(storedIndex + 1).padStart(4, '0')}.${ext}`
  : file.name;
```

This means downstream code (`FrameGallery` reading `by-index`, `useDownload` writing each `frame.filename` into the ZIP) keeps working unchanged. The IndexedDB record *is* the canonical reversed sequence — there's no second pass.

**Alternative considered:** save in original order, reverse on read. Rejected because every consumer would need to know about the toggle, and "what's in the DB" would no longer match "what the user sees."

### Pure helper extracted for testability

Index/filename computation moves into a small pure function in `src/utils/ffmpegCommands.ts` (or a new sibling — TBD during implementation):

```ts
export function computeFramePlacement(
  i: number,
  total: number,
  originalName: string,
  reverse: boolean,
): { index: number; filename: string }
```

Pure, no ffmpeg dependency, easy to cover in `tests/utils/`. The existing 28 tests stay green.

### UI placement: ExtractionSettings, not a separate panel

A single checkbox under the format/quality controls. Disabled while `isExtracting`. Label: "Reverse order" with helper text "Last frame becomes #1." Persisted via the existing `partialize` list.

## Risks / Trade-offs

- **Risk:** Users expect a reversed *video file* and get reversed frames instead. → Mitigation: helper text under the toggle clarifies "frames extracted last-to-first." Out-of-scope reversed-video work is captured as a non-goal here.
- **Risk:** With `at-cursor` mode and `nearbyFrames = 0`, reversal is a no-op (single frame). → Acceptable; the toggle is silently inert in that case, no warning needed.
- **Risk:** Filename collision if reversal logic is wrong (two frames written with same `frame_NNNN`). → Mitigation: unit-test `computeFramePlacement` with `total ∈ {1, 2, N}` and assert filenames are unique and zero-padded.
- **Trade-off:** We don't preserve the original temporal index in the IndexedDB record. If a future feature wants both orderings, it'll need a schema bump. Acceptable now — no current consumer needs it.
- **Trade-off:** ZIP filenames in the download are the reversed names, not the source-time names. Users who want source-time naming can leave the toggle off. Documented in helper text.

## Migration Plan

No migration. Pure additive change:
1. Existing IndexedDB records are untouched (the toggle defaults to `false`).
2. Persisted settings under `frame-ripper-settings` gain a new `reverse` key on first write; Zustand's persist middleware tolerates missing keys via the default.
3. No build, deploy, or PWA cache changes.

Rollback: revert the commit. The new `reverse` key in localStorage becomes ignored; no cleanup needed.

## Open Questions

- Should the gallery thumbnail labels show the reversed index (`#1` for the temporally last frame) or the source-time index? **Tentative:** reversed — match what the ZIP will contain. Confirm during implementation review.
- Toggle visual: checkbox vs. switch? Defer to existing component conventions in `ExtractionSettings.tsx`.
