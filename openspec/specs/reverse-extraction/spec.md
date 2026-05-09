# reverse-extraction

User-controllable toggle that reverses the temporal order of extracted frames. Covers settings UI, persistence, the post-extraction reorder step, and how downstream consumers (gallery, ZIP) observe the reversed order.

## Requirements

### Requirement: Reverse toggle in extraction settings

The extraction settings UI SHALL expose a single boolean **Reverse** control that, when enabled, causes the next extraction to deliver frames in reverse temporal order. The control SHALL compose with every existing `ExtractionMode` (`fps`, `every-nth`, `at-cursor`) without restricting which mode is active. The control SHALL be disabled while an extraction is in progress.

#### Scenario: Toggle visible alongside other settings

- **WHEN** a user has loaded a video and the extraction settings panel is visible
- **THEN** a "Reverse" toggle is shown alongside format, quality, and mode controls
- **AND** the toggle is enabled when status is `idle`, `done`, or `error`
- **AND** the toggle is disabled when status is `loading-ffmpeg`, `reading-video`, `extracting`, or `caching`

#### Scenario: Toggle composes with each mode

- **WHEN** a user selects any of `fps`, `every-nth`, or `at-cursor` mode
- **THEN** the Reverse toggle remains available and its current value is preserved
- **AND** changing the mode does not reset the toggle

### Requirement: Persistence of the reverse setting

The reverse toggle's value SHALL be persisted under the existing `frame-ripper-settings` localStorage key, alongside the other extraction settings. It SHALL default to `false` for first-time users and for users whose persisted settings predate this feature.

#### Scenario: Setting persists across reload

- **WHEN** a user enables Reverse and reloads the page
- **THEN** the toggle is still enabled on next load

#### Scenario: Default for users without the key

- **WHEN** a user's persisted settings object does not contain a `reverse` key
- **THEN** the application treats the value as `false` and continues without error

#### Scenario: Reset returns toggle to false

- **WHEN** the user triggers `resetAll` (e.g., removes the loaded video)
- **THEN** the persisted `reverse` value is reset to `false`

### Requirement: Reversed frame ordering on extraction

When the reverse toggle is enabled at the moment extraction begins, the system SHALL assign frame indices and on-disk filenames such that the temporally **last** frame produced by ffmpeg becomes index `0` (filename `frame_0001.<ext>`) and the temporally **first** frame becomes index `N-1` (filename `frame_NNNN.<ext>`), where `N` is the total number of extracted frames. The reversal SHALL apply uniformly regardless of which `ExtractionMode` produced the source frames.

#### Scenario: Reverse with fps mode

- **WHEN** a user extracts at 1 fps with Reverse enabled from a 10-second clip
- **THEN** 10 frames are saved with `frame_0001.<ext>` containing the visual content of the source's 10th-second frame
- **AND** `frame_0010.<ext>` containing the visual content of the source's 1st-second frame

#### Scenario: Reverse with every-nth mode

- **WHEN** a user extracts every 5th frame with Reverse enabled from a clip yielding 6 selected frames
- **THEN** the 6 saved frames are numbered `frame_0001.<ext>` through `frame_0006.<ext>` in reversed temporal order

#### Scenario: Reverse with at-cursor mode and nearby > 0

- **WHEN** a user extracts at the cursor with `nearbyFrames = 5` (11 frames total) and Reverse enabled
- **THEN** the 11 saved frames are numbered `frame_0001.<ext>` (post-cursor side) through `frame_0011.<ext>` (pre-cursor side)

#### Scenario: Reverse is a no-op for single-frame extraction

- **WHEN** a user extracts at the cursor with `nearbyFrames = 0` (1 frame) and Reverse enabled
- **THEN** exactly one frame is saved as `frame_0001.<ext>` with the same content as the non-reversed case

#### Scenario: Filenames are unique and zero-padded

- **WHEN** any reversed extraction produces `N` frames
- **THEN** every saved frame has a distinct filename
- **AND** every filename uses 4-digit zero-padded numbering (`frame_0001`, …, `frame_NNNN`)

### Requirement: Downstream consumers observe reversed order

Once frames are persisted with reversed indices, the FrameGallery, single-frame download, and ZIP download SHALL all observe the reversed order with no toggle-aware logic of their own. The IndexedDB record (filename plus `index`) SHALL be the canonical ordering source.

#### Scenario: Gallery displays reversed order

- **WHEN** extraction completes with Reverse enabled
- **THEN** the FrameGallery's first thumbnail corresponds to the temporally last source frame
- **AND** the last thumbnail corresponds to the temporally first source frame

#### Scenario: ZIP contains reversed filenames

- **WHEN** the user downloads a ZIP after a reversed extraction
- **THEN** every file inside the `frames/` folder uses the reversed filename
- **AND** alphabetical sorting of the ZIP entries yields the reversed playback order

### Requirement: ffmpeg invocation is unchanged by the reverse toggle

The ffmpeg argument list produced by `buildExtractionArgs` SHALL NOT depend on the `reverse` setting. Reversal SHALL be implemented entirely as a JS-side reordering during the post-extraction save loop, so ffmpeg memory usage is identical with the toggle on or off.

#### Scenario: Argument list is identical

- **WHEN** `buildExtractionArgs` is called with otherwise-identical settings differing only in `reverse`
- **THEN** the two returned argument arrays are deep-equal
