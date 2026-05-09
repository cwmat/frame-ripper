# extraction-settings-persistence

## Purpose

How FrameRipper remembers the user's extraction preferences across reloads while keeping ephemeral session state out of localStorage. Owned by the Zustand store (`useAppStore`) with the `persist` middleware. Defines the persisted/transient split, the storage key, defaults, the two reset scopes, and the `error → status` link.

## Requirements

### Requirement: Persisted vs transient state split

The Zustand store SHALL persist exactly seven extraction-settings fields (`extractionMode`, `fps`, `nthFrame`, `outputFormat`, `jpgQuality`, `nearbyFrames`, `reverse`) via the `persist` middleware's `partialize`. All other store state — `cursorTime`, `status`, `progress`, `progressLabel`, `videoInfo`, `videoFile`, `frameCount`, `error` — SHALL remain in-memory only and SHALL NOT be written to localStorage.

#### Scenario: only settings appear in localStorage

- **WHEN** the user changes mode, fps, format, quality, nthFrame, nearbyFrames, or reverse
- **THEN** the persisted shape contains those fields and only those fields
- **AND** `cursorTime`, `status`, `progress`, `videoInfo`, `videoFile`, `frameCount`, and `error` are absent from the persisted blob

#### Scenario: cursorTime resets on reload despite the user having set it

- **WHEN** the user seeks the video to a non-zero cursor time and reloads the page
- **THEN** the rehydrated `cursorTime` is `0` (per `DEFAULT_SETTINGS.cursorTime`)

### Requirement: Storage key

The persisted settings SHALL be stored under the localStorage key `frame-ripper-settings` exactly. Renaming this key constitutes a breaking change.

#### Scenario: key is fixed

- **WHEN** the persist middleware writes to storage
- **THEN** it uses the key `frame-ripper-settings`

### Requirement: Defaults

When no persisted state exists (first-time user) the store SHALL initialise from `DEFAULT_SETTINGS`: `mode='fps'`, `fps=1`, `nthFrame=10`, `format='jpg'`, `jpgQuality=85`, `cursorTime=0`, `nearbyFrames=0`, `reverse=false`. When persisted state is present but missing newly-added keys, the missing keys SHALL fall back to their `DEFAULT_SETTINGS` values without throwing (Zustand `persist` default merge behaviour).

#### Scenario: first-time user gets defaults

- **WHEN** the page loads with no `frame-ripper-settings` entry
- **THEN** the store initialises with `extractionMode='fps'`, `fps=1`, `nthFrame=10`, `outputFormat='jpg'`, `jpgQuality=85`, `nearbyFrames=0`, `reverse=false`

#### Scenario: pre-feature persisted blob fills gaps from defaults

- **WHEN** the persisted blob predates the addition of the `reverse` field
- **THEN** the rehydrated `reverse` value is `false`
- **AND** the application continues to load without error

### Requirement: resetExtraction scope

`resetExtraction()` SHALL clear only transient extraction state (`status='idle'`, `progress=0`, `progressLabel=''`, `frameCount=0`, `error=null`). It SHALL NOT touch persisted user settings (mode, fps, format, etc.) and SHALL NOT clear the loaded video. This is the action invoked when a new video is dropped or when Clear All runs.

#### Scenario: settings survive resetExtraction

- **WHEN** the user has set `fps=5`, `format='png'` and then triggers `resetExtraction()`
- **THEN** `fps` is still `5`, `outputFormat` is still `png`
- **AND** `status='idle'`, `progress=0`, `frameCount=0`, `error=null`

### Requirement: resetAll scope

`resetAll()` SHALL reset every store field — including persisted settings — to its `DEFAULT_SETTINGS` value, clear `videoInfo`/`videoFile`, and zero out transient state. This is the action invoked when the user removes the loaded video or hits Start Over.

#### Scenario: removing video resets settings to defaults

- **WHEN** the user has set non-default settings and then triggers `resetAll()`
- **THEN** every persisted setting is back to `DEFAULT_SETTINGS`
- **AND** `videoInfo` and `videoFile` are `null`
- **AND** `status='idle'`, `progress=0`, `frameCount=0`, `error=null`

### Requirement: Error sets status to error, clearing it returns to idle

`setError(message)` SHALL set `error=message` AND `status='error'`. `setError(null)` SHALL clear the error AND set `status='idle'`. This guarantees the status state machine and the error string remain coherent without callers needing to remember to update both.

#### Scenario: setting an error transitions status

- **WHEN** `setError('Extraction failed')` is called
- **THEN** the store has `error='Extraction failed'` and `status='error'`

#### Scenario: clearing error returns to idle

- **WHEN** `setError(null)` is called
- **THEN** the store has `error=null` and `status='idle'`

## Source anchors (codified 2026-05-09 at commit 7f12443)

- Persisted vs transient split — `src/store/appStore.ts:11-29,123-134`
- Storage key — `src/store/appStore.ts:124`
- Defaults — `src/store/appStore.ts:56-74`, `src/utils/constants.ts:31-40`
- resetExtraction scope — `src/store/appStore.ts:96-103`
- resetAll scope — `src/store/appStore.ts:104-121`
- Error → status link — `src/store/appStore.ts:93`
