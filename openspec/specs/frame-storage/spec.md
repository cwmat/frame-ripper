# frame-storage

## Purpose

Persistence layer for extracted frame bytes. Frames are deliberately kept out of React state — all bulk image data lives in IndexedDB and is read on demand. This capability owns the database schema, the CRUD surface, and ordering guarantees that downstream consumers (FrameGallery, ZIP download) rely on.

## Requirements

### Requirement: IndexedDB schema

Frame bytes SHALL be persisted in an IndexedDB database named `frame-ripper-db` at version `1`, with a single object store `frames` whose `keyPath` is `id` and which has an index named `by-index` over the `index` field. The schema upgrade handler SHALL be idempotent (no-op if `frames` already exists).

#### Scenario: store and index exist after first open

- **WHEN** the database is opened for the first time
- **THEN** `frames` is created with `keyPath: 'id'`
- **AND** the `by-index` index is created over the `index` field

#### Scenario: subsequent opens reuse the schema

- **WHEN** the database is opened a second time at the same version
- **THEN** the upgrade handler does not recreate the store
- **AND** existing records remain accessible

### Requirement: Per-frame and batch persistence

The system SHALL provide `saveFrame(frame)` to persist a single `ExtractedFrame` (keyed by its `id`) and `saveFramesBatch(frames)` to persist many in a single `readwrite` transaction. Both SHALL upsert by `id`.

#### Scenario: saveFrame upserts by id

- **WHEN** `saveFrame` is called with a frame whose `id` is already present
- **THEN** the existing record is overwritten with the new value

#### Scenario: saveFramesBatch is transactional

- **WHEN** `saveFramesBatch` is called with `N` frames
- **THEN** all `N` are committed in a single `readwrite` transaction whose `done` promise resolves only after every put

### Requirement: Index-ordered retrieval

`getAllFrames()` SHALL return every persisted frame ordered by the `index` field via the `by-index` index. This ordering is the canonical playback order and is what the gallery and ZIP rely on (no caller needs to re-sort).

#### Scenario: getAllFrames is ordered by index

- **WHEN** frames have been saved with assorted `index` values
- **THEN** `getAllFrames` returns them sorted ascending by `index`

#### Scenario: count and total size

- **WHEN** `getFrameCount()` is called after saving `N` frames
- **THEN** the result is `N`
- **AND** `getTotalSize()` returns the sum of every frame's `size` field

### Requirement: Selective retrieval by index

`getFramesByIndices(indices: Set<number>)` SHALL return the subset of stored frames whose `index` value is in the supplied set, preserving the index-ordered traversal. This is the entry point used by ZIP download to read only the user-selected frames.

#### Scenario: only requested indices are returned

- **WHEN** `getFramesByIndices(new Set([1, 3, 5]))` is called against a store of 10 frames
- **THEN** the returned array contains only the frames whose `index` is `1`, `3`, or `5`

#### Scenario: empty set returns empty array

- **WHEN** `getFramesByIndices(new Set())` is called
- **THEN** the result is `[]`

### Requirement: Bulk and single deletion

The system SHALL provide `clearFrames()` to empty the entire `frames` store and `deleteFrame(id)` to delete a single frame by `id`. `clearFrames` is invoked on new video drop, on Clear All, and on Start Over.

#### Scenario: clearFrames empties the store

- **WHEN** `clearFrames()` is called against a non-empty store
- **THEN** `getFrameCount()` afterwards returns `0`

#### Scenario: deleteFrame removes only the matching id

- **WHEN** `deleteFrame(id)` is called
- **THEN** the record with that `id` is removed
- **AND** other records remain

### Requirement: Survives reload

Persisted frames SHALL outlive a page refresh — IndexedDB is the single source of truth, not React state or memory. Frames are wiped only on explicit user actions (new video drop, Clear All, Start Over).

#### Scenario: extracted frames are still present after reload

- **WHEN** a user extracts frames and reloads the page
- **THEN** opening the database reveals the same frames in the same `index` order

## Source anchors (codified 2026-05-09 at commit 7f12443)

- Schema — `src/store/frameDb.ts:1-30`
- saveFrame / saveFramesBatch — `src/store/frameDb.ts:32-44`
- Index-ordered retrieval — `src/store/frameDb.ts:51-65`
- Selective retrieval — `src/store/frameDb.ts:67-70`
- Bulk and single deletion — `src/store/frameDb.ts:72-80`
- Survives reload — `src/store/frameDb.ts:1-30`, integration in `src/App.tsx:91-92,106,182`
