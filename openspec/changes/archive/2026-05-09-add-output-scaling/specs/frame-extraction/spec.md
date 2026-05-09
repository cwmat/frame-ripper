## ADDED Requirements

### Requirement: Optional output width scaling

The system SHALL accept an optional `maxWidth` extraction setting (in pixels). When `maxWidth > 0`, `buildExtractionArgs` SHALL inject a `scale='min(iw\,<maxWidth>)':-2` clause into the video filter chain so output frames are downscaled to at most `maxWidth` pixels wide while preserving aspect ratio. The `min(iw, ...)` form SHALL prevent upscaling of narrower source videos. The `-2` height target SHALL preserve aspect ratio while rounding to an even number. When `maxWidth <= 0`, the system SHALL omit the `scale=` clause entirely (no scaling, no `-vf scale=...` in any mode).

The injection SHALL compose with the existing selection-mode filters as follows:

- `fps` mode: extend the existing `-vf fps=<n>` to `-vf fps=<n>,scale='min(iw\,<maxWidth>)':-2`.
- `every-nth` mode: extend the existing `-vf select=not(mod(n\,<n>))` to `-vf select=not(mod(n\,<n>)),scale='min(iw\,<maxWidth>)':-2`. The `-vsync vfr` flag SHALL still be present.
- `at-cursor` mode: add a new `-vf scale='min(iw\,<maxWidth>)':-2` flag (this mode has no `-vf` when `maxWidth <= 0`).

The `\,` escape (one backslash, one comma) SHALL be present in the runtime string inside the `min(...)` expression so the comma is not interpreted as a filter-chain separator.

#### Scenario: maxWidth = 0 produces no scale clause in any mode

- **WHEN** `buildExtractionArgs` runs with `maxWidth=0` in any of the three modes
- **THEN** the resulting args do not contain the substring `scale=` and do not contain `:-2`

#### Scenario: fps mode appends scale to the fps filter

- **WHEN** `buildExtractionArgs` runs with `mode='fps'`, `fps=1`, `maxWidth=640`
- **THEN** the `-vf` value is `fps=1,scale='min(iw\,640)':-2`

#### Scenario: every-nth mode appends scale to the select filter

- **WHEN** `buildExtractionArgs` runs with `mode='every-nth'`, `nthFrame=10`, `maxWidth=640`
- **THEN** the `-vf` value is `select=not(mod(n\,10)),scale='min(iw\,640)':-2`
- **AND** the args still contain `-vsync` followed by `vfr`

#### Scenario: at-cursor mode adds a fresh scale filter

- **WHEN** `buildExtractionArgs` runs with `mode='at-cursor'`, `cursorTime=5.5`, `nearbyFrames=0`, `maxWidth=640`
- **THEN** the args contain `-vf` followed by `scale='min(iw\,640)':-2`
- **AND** the args still begin with `-ss 5.5 -i <input>` and contain `-frames:v 1`

#### Scenario: comma inside min() is escaped with a backslash

- **WHEN** `buildExtractionArgs` runs with any mode and `maxWidth=1280`
- **THEN** the resulting args contain the literal substring `min(iw\,1280)` (backslash-comma, not bare comma)

#### Scenario: negative or non-positive maxWidth is treated as off

- **WHEN** `buildExtractionArgs` runs with `maxWidth=-1` or `maxWidth=0`
- **THEN** the resulting args do not contain `scale=`

## MODIFIED Requirements

### Requirement: Three frame selection modes

The system SHALL support three modes of selecting which video frames to extract, each producing a distinct ffmpeg argument list. `fps` SHALL use the `-vf fps=<n>` filter. `every-nth` SHALL use `-vf select=not(mod(n\,<n>)) -vsync vfr` (with a JS-source backslash-comma so ffmpeg receives an escaped comma). `at-cursor` SHALL use input-side seek (`-ss <time>` placed **before** `-i <input>`) followed by `-frames:v <count>`. Each mode's filter chain MAY be extended with the `scale=` clause defined under "Optional output width scaling" when `maxWidth > 0`.

#### Scenario: fps mode produces the fps filter

- **WHEN** `buildExtractionArgs` is called with `mode='fps'` and `fps=1`
- **THEN** the args contain `-i`, the input filename, `-vf`, and `fps=1`
- **AND** the last arg is the output pattern

#### Scenario: every-nth mode produces a select filter with vsync vfr

- **WHEN** `buildExtractionArgs` is called with `mode='every-nth'` and `nthFrame=10`
- **THEN** the args contain `select=not(mod(n\,10))`, `-vsync`, and `vfr`

#### Scenario: at-cursor mode uses input-side seek and has no -vf when scaling is off

- **WHEN** `buildExtractionArgs` is called with `mode='at-cursor'`, `cursorTime=5.5`, `nearbyFrames=0`, and `maxWidth=0`
- **THEN** the args begin with `-ss 5.5 -i <input>` and contain `-frames:v 1`
- **AND** no `-vf` filter is present
