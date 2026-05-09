---
name: add-test
description: Add a Vitest test for a utility or component. Use when the user asks to "add a test for X", "cover this with tests", or after writing a new pure function in src/utils/.
---

# Add a test

## Where tests live

Tests are **not colocated**. They mirror `src/` under `tests/`:

- `src/utils/foo.ts` → `tests/utils/foo.test.ts`

Existing examples to match style: `tests/utils/ffmpegCommands.test.ts`, `tests/utils/fileUtils.test.ts`, `tests/utils/formatUtils.test.ts`.

## Conventions in this repo

- **Vitest globals are on** (`globals: true` in `vitest.config.ts`). Use `describe` / `it` / `expect` directly — no imports needed.
- Environment is `jsdom`. `@testing-library/jest-dom` matchers are loaded via `tests/setup.ts`.
- ffmpeg.wasm and IndexedDB are **not mocked**. Cover the pure utility surface; don't try to test `useFrameExtractor` end-to-end.
- One `describe` per export, one `it` per behavior. Keep arrange/act/assert tight — no shared mutable fixtures.

## Template

```ts
import { describe, it, expect } from 'vitest';
import { myFn } from '../../src/utils/myModule';

describe('myFn', () => {
  it('handles the happy path', () => {
    expect(myFn(input)).toEqual(expected);
  });

  it('handles edge case X', () => {
    expect(() => myFn(badInput)).toThrow();
  });
});
```

## Run it

```
npx vitest run tests/utils/myModule.test.ts   # one file
npx vitest run -t "handles the happy path"    # one test by name
npm run test:watch                             # watch mode while iterating
```
