# frame-gallery

## Purpose

The grid UI that shows extracted frame thumbnails, lets the user pick which frames to include in the ZIP, and reports a lightweight selection summary upward without ever holding frame bytes in parent state. Covers `FrameGallery` (load + selection + select-all/none) and `FrameThumbnail` (lazy thumbnail rendering with object-URL lifecycle).

## Requirements

### Requirement: All frames selected by default

When the gallery loads frames after extraction, every frame SHALL be selected by default. The user can then deselect frames they don't want before downloading.

#### Scenario: initial selection covers every frame

- **WHEN** the gallery's load effect resolves with `N` frames
- **THEN** the internal `selectedIndices` set contains every frame's `index`
- **AND** the parent receives `selectedCount = N` via `onSelectionChange`

### Requirement: Lazy thumbnail rendering

`FrameThumbnail` SHALL defer creating an object URL and rendering an `<img>` until it intersects the viewport (with a `200px` `rootMargin`). This keeps memory and decode cost bounded for galleries of hundreds of frames.

#### Scenario: out-of-viewport thumbnail shows a placeholder

- **WHEN** a thumbnail is mounted but is more than 200px from the viewport
- **THEN** no object URL is created
- **AND** a spinner placeholder is rendered in the image area

#### Scenario: scrolling into view triggers image load

- **WHEN** the thumbnail intersects the viewport (or comes within 200px)
- **THEN** an object URL is created from the frame's `Uint8Array` with the correct MIME (`image/png` or `image/jpeg` based on filename suffix)
- **AND** the `<img>` is rendered with `loading="lazy"`

#### Scenario: object URL is revoked on unmount or change

- **WHEN** the thumbnail unmounts (or the source data changes)
- **THEN** the previous object URL is revoked via `URL.revokeObjectURL`

### Requirement: Selection toggling

The gallery SHALL support per-frame toggling, Select All, and Deselect All. Clicking a thumbnail toggles its membership in `selectedIndices`. The header button toggles between Select All and Deselect All depending on current state (all selected → Deselect All; otherwise → Select All).

#### Scenario: clicking a thumbnail toggles its selection

- **WHEN** a thumbnail is clicked while selected
- **THEN** its `index` is removed from `selectedIndices`
- **WHEN** the same thumbnail is clicked again
- **THEN** its `index` is re-added

#### Scenario: Select All vs Deselect All button

- **WHEN** `selectedIndices.size === frames.length`
- **THEN** the header button shows "Deselect All" and clicking empties the set
- **WHEN** `selectedIndices.size < frames.length`
- **THEN** the header button shows "Select All" and clicking selects every frame

### Requirement: Lightweight selection signal upward

The gallery SHALL report selection state to its parent via `onSelectionChange(indices, count, totalSize)` whenever the selection changes. The total size SHALL be aggregated from a per-frame size lookup map (built once from the loaded frames) so the parent never needs to re-read frame bytes from IndexedDB to display selected size.

#### Scenario: parent receives indices, count, and aggregated size

- **WHEN** the user toggles a frame's selection
- **THEN** the parent's `onSelectionChange` is invoked with the updated `Set<number>`, its `size`, and the sum of those frames' `size` fields

#### Scenario: size is computed from the lookup, not the bytes

- **WHEN** `onSelectionChange` runs
- **THEN** the size is summed via the in-memory `frameSizeMap` keyed by `index`
- **AND** `getAllFrames`/`getFramesByIndices` is not invoked for the size calculation

### Requirement: Single-frame download passthrough

The gallery SHALL expose a per-thumbnail download affordance that, when clicked, calls the parent-supplied `onDownloadFrame(frame)` without toggling that frame's selection (the click event is `stopPropagation`'d).

#### Scenario: download button does not toggle selection

- **WHEN** the user clicks the download icon overlay on a selected thumbnail
- **THEN** `onDownloadFrame` is called with the frame
- **AND** the thumbnail's selection state is unchanged

### Requirement: Loading state derived from frame count

While the loaded frame snapshot does not match the parent's `frameCount` prop, the gallery SHALL render a loading spinner instead of the grid. Once `loadedFrameCount === frameCount`, the grid renders.

#### Scenario: loading view while data is being fetched

- **WHEN** `getAllFrames` has not yet resolved for the current `frameCount`
- **THEN** the gallery renders a centred spinner with "Loading frames…"

#### Scenario: zero frames renders nothing

- **WHEN** the load resolves with zero frames
- **THEN** the gallery returns `null` (no UI)

## Source anchors (codified 2026-05-09 at commit 7f12443)

- Default-select-all and load — `src/components/features/FrameGallery.tsx:19-48`
- Lazy thumbnail rendering — `src/components/features/FrameThumbnail.tsx:18-52`
- Toggling and select-all — `src/components/features/FrameGallery.tsx:59-79,112-127`
- Lightweight upward signal — `src/components/features/FrameGallery.tsx:21,33-41,51-57`, `src/App.tsx:55-69`
- Single-frame download passthrough — `src/components/features/FrameThumbnail.tsx:58-64,106-112`
- Loading state — `src/components/features/FrameGallery.tsx:23-25,81-92`
