## MODIFIED Requirements

### Requirement: Persisted vs transient state split

The Zustand store SHALL persist exactly eight extraction-settings fields (`extractionMode`, `fps`, `nthFrame`, `outputFormat`, `jpgQuality`, `nearbyFrames`, `reverse`, `maxWidth`) via the `persist` middleware's `partialize`. All other store state — `cursorTime`, `status`, `progress`, `progressLabel`, `videoInfo`, `videoFile`, `frameCount`, `error` — SHALL remain in-memory only and SHALL NOT be written to localStorage.

#### Scenario: only settings appear in localStorage

- **WHEN** the user changes mode, fps, format, quality, nthFrame, nearbyFrames, reverse, or maxWidth
- **THEN** the persisted shape contains those fields and only those fields
- **AND** `cursorTime`, `status`, `progress`, `videoInfo`, `videoFile`, `frameCount`, and `error` are absent from the persisted blob

#### Scenario: cursorTime resets on reload despite the user having set it

- **WHEN** the user seeks the video to a non-zero cursor time and reloads the page
- **THEN** the rehydrated `cursorTime` is `0` (per `DEFAULT_SETTINGS.cursorTime`)

#### Scenario: maxWidth survives reload

- **WHEN** the user sets `maxWidth=1280` and reloads the page
- **THEN** the rehydrated `maxWidth` is `1280`

### Requirement: Defaults

When no persisted state exists (first-time user) the store SHALL initialise from `DEFAULT_SETTINGS`: `mode='fps'`, `fps=1`, `nthFrame=10`, `format='jpg'`, `jpgQuality=85`, `cursorTime=0`, `nearbyFrames=0`, `reverse=false`, `maxWidth=0`. When persisted state is present but missing newly-added keys, the missing keys SHALL fall back to their `DEFAULT_SETTINGS` values without throwing (Zustand `persist` default merge behaviour). The default `maxWidth=0` SHALL mean "no scaling" — the runtime branch in `buildExtractionArgs` checks `maxWidth > 0`, so an absent or zero value produces today's pre-scaling argument shape.

#### Scenario: first-time user gets defaults

- **WHEN** the page loads with no `frame-ripper-settings` entry
- **THEN** the store initialises with `extractionMode='fps'`, `fps=1`, `nthFrame=10`, `outputFormat='jpg'`, `jpgQuality=85`, `nearbyFrames=0`, `reverse=false`, `maxWidth=0`

#### Scenario: pre-feature persisted blob fills gaps from defaults

- **WHEN** the persisted blob predates the addition of the `reverse` field
- **THEN** the rehydrated `reverse` value is `false`
- **AND** the application continues to load without error

#### Scenario: persisted blob without maxWidth rehydrates as 0

- **WHEN** the persisted blob predates the addition of the `maxWidth` field
- **THEN** the rehydrated `maxWidth` value is `0`
- **AND** subsequent extractions produce arguments with no `scale=` clause

### Requirement: resetAll scope

`resetAll()` SHALL reset every store field — including persisted settings — to its `DEFAULT_SETTINGS` value, clear `videoInfo`/`videoFile`, and zero out transient state. This is the action invoked when the user removes the loaded video or hits Start Over. All eight persisted settings, including `maxWidth`, SHALL be returned to their defaults.

#### Scenario: removing video resets settings to defaults

- **WHEN** the user has set non-default settings (including `maxWidth=1280`) and then triggers `resetAll()`
- **THEN** every persisted setting is back to `DEFAULT_SETTINGS` (notably `maxWidth=0`)
- **AND** `videoInfo` and `videoFile` are `null`
- **AND** `status='idle'`, `progress=0`, `frameCount=0`, `error=null`
