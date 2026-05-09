import { describe, it, expect } from 'vitest';
import {
  buildZipEntryName,
  formatTimestampLabel,
  resolveZipPrefix,
} from '../../src/utils/zipNaming';
import { sanitizeFilename } from '../../src/utils/fileUtils';
import { AT_CURSOR_NEIGHBOR_FPS } from '../../src/utils/constants';
import type { ExtractionMode } from '../../src/types';

describe('formatTimestampLabel', () => {
  it('formats 0 seconds', () => {
    expect(formatTimestampLabel(0)).toBe('00-00-00.000');
  });

  it('formats sub-minute seconds with milliseconds', () => {
    expect(formatTimestampLabel(83.456)).toBe('00-01-23.456');
  });

  it('formats hours/minutes/seconds with millisecond precision', () => {
    expect(formatTimestampLabel(3661.001)).toBe('01-01-01.001');
  });

  it('returns null for non-finite or negative values', () => {
    expect(formatTimestampLabel(NaN)).toBeNull();
    expect(formatTimestampLabel(-1)).toBeNull();
    expect(formatTimestampLabel(Number.POSITIVE_INFINITY)).toBeNull();
    expect(formatTimestampLabel(Number.NEGATIVE_INFINITY)).toBeNull();
  });
});

describe('resolveZipPrefix', () => {
  const fallback = 'clip';

  it('uses the user prefix when supplied and non-empty', () => {
    expect(resolveZipPrefix('MyShoot', fallback)).toBe('MyShoot');
  });

  it('sanitizes disallowed characters in the user prefix', () => {
    expect(resolveZipPrefix('My Shoot (1)', fallback)).toBe('My_Shoot__1_');
  });

  it('falls back when prefix is undefined', () => {
    expect(resolveZipPrefix(undefined, fallback)).toBe(fallback);
  });

  it('falls back when prefix is empty string', () => {
    expect(resolveZipPrefix('', fallback)).toBe(fallback);
  });

  it('falls back when prefix is whitespace-only', () => {
    expect(resolveZipPrefix('   ', fallback)).toBe(fallback);
    expect(resolveZipPrefix('\t\n  ', fallback)).toBe(fallback);
  });
});

describe('buildZipEntryName', () => {
  it('uses index label for fps mode', () => {
    expect(
      buildZipEntryName({
        baseName: 'clip',
        mode: 'fps',
        archiveIndex: 0,
        totalFrames: 5,
        ext: '.jpg',
      }),
    ).toBe('clip_0001.jpg');
  });

  it('uses index label for every-nth mode', () => {
    expect(
      buildZipEntryName({
        baseName: 'clip',
        mode: 'every-nth',
        archiveIndex: 2,
        totalFrames: 3,
        ext: '.png',
      }),
    ).toBe('clip_0003.png');
  });

  it('uses HH-MM-SS.mmm timestamp label for at-cursor mode', () => {
    expect(
      buildZipEntryName({
        baseName: 'clip',
        mode: 'at-cursor',
        archiveIndex: 0,
        totalFrames: 1,
        ext: '.jpg',
        cursorTime: 83.456,
        nearbyFrames: 0,
      }),
    ).toBe('clip_00-01-23.456.jpg');
  });

  it('spaces at-cursor neighborhood frames at 1/AT_CURSOR_NEIGHBOR_FPS s around cursorTime', () => {
    const cursorTime = 10.0;
    const nearbyFrames = 1;
    const totalFrames = 3;
    const baseName = 'clip';
    const ext = '.jpg';
    const step = 1 / AT_CURSOR_NEIGHBOR_FPS;

    const names = [0, 1, 2].map((i) =>
      buildZipEntryName({
        baseName,
        mode: 'at-cursor',
        archiveIndex: i,
        totalFrames,
        ext,
        cursorTime,
        nearbyFrames,
      }),
    );

    const expected = [
      `clip_${formatTimestampLabel(cursorTime - step)!}.jpg`,
      `clip_${formatTimestampLabel(cursorTime)!}.jpg`,
      `clip_${formatTimestampLabel(cursorTime + step)!}.jpg`,
    ];

    expect(names).toEqual(expected);
  });

  it('falls back to index label when at-cursor cursorTime is NaN', () => {
    const name = buildZipEntryName({
      baseName: 'clip',
      mode: 'at-cursor',
      archiveIndex: 0,
      totalFrames: 1,
      ext: '.jpg',
      cursorTime: NaN,
      nearbyFrames: 0,
    });
    expect(name).toBe('clip_0001.jpg');
    expect(name).not.toContain('NaN');
  });

  it('pads index to four digits for archives with up to 9999 frames', () => {
    expect(
      buildZipEntryName({
        baseName: 'clip',
        mode: 'fps',
        archiveIndex: 6,
        totalFrames: 7,
        ext: '.jpg',
      }),
    ).toBe('clip_0007.jpg');
  });

  it('grows the index padding for archives larger than 9999 frames', () => {
    expect(
      buildZipEntryName({
        baseName: 'clip',
        mode: 'fps',
        archiveIndex: 11999,
        totalFrames: 12000,
        ext: '.jpg',
      }),
    ).toBe('clip_12000.jpg');
  });

  it('uses any caller-supplied baseName verbatim (prefix-agnostic)', () => {
    expect(
      buildZipEntryName({
        baseName: 'MyShoot',
        mode: 'fps',
        archiveIndex: 0,
        totalFrames: 3,
        ext: '.jpg',
      }),
    ).toBe('MyShoot_0001.jpg');
  });

  it('round-trips an awkward source name through sanitizeFilename', () => {
    const baseName = sanitizeFilename('My Video (1).mp4'.replace(/\.[^.]+$/, ''));
    expect(baseName).toBe('My_Video__1_');

    const entry = buildZipEntryName({
      baseName,
      mode: 'fps',
      archiveIndex: 0,
      totalFrames: 1,
      ext: '.jpg',
    });
    expect(entry).toBe('My_Video__1__0001.jpg');
  });

  it('emits filename-safe characters across mode × index sweep', () => {
    const safe = /^[A-Za-z0-9._-]+$/;
    const modes: ExtractionMode[] = ['fps', 'every-nth', 'at-cursor'];
    for (const mode of modes) {
      for (let i = 0; i < 10; i++) {
        const name = buildZipEntryName({
          baseName: 'clip',
          mode,
          archiveIndex: i,
          totalFrames: 10,
          ext: '.jpg',
          cursorTime: 5.5,
          nearbyFrames: 4,
        });
        expect(name, `mode=${mode} i=${i} -> ${name}`).toMatch(safe);
      }
    }
  });
});
