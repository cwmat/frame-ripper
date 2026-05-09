import { describe, it, expect } from 'vitest';
import {
  buildExtractionArgs,
  computeFramePlacement,
  getOutputPattern,
} from '../../src/utils/ffmpegCommands';
import type { ExtractionMode, ExtractionSettings } from '../../src/types';

describe('getOutputPattern', () => {
  it('returns jpg pattern for jpg format', () => {
    expect(getOutputPattern('jpg')).toBe('frame_%04d.jpg');
  });

  it('returns png pattern for png format', () => {
    expect(getOutputPattern('png')).toBe('frame_%04d.png');
  });
});

describe('buildExtractionArgs', () => {
  const base = { cursorTime: 0, nearbyFrames: 0, reverse: false };

  it('builds fps mode args with jpg output', () => {
    const settings: ExtractionSettings = {
      ...base,
      mode: 'fps',
      fps: 1,
      nthFrame: 10,
      format: 'jpg',
      jpgQuality: 85,
    };

    const args = buildExtractionArgs('input.mp4', settings);
    expect(args).toContain('-i');
    expect(args).toContain('input.mp4');
    expect(args).toContain('-vf');
    expect(args).toContain('fps=1');
    expect(args).toContain('-q:v');
    expect(args[args.length - 1]).toBe('frame_%04d.jpg');
  });

  it('builds fps mode args with png output (no quality flag)', () => {
    const settings: ExtractionSettings = {
      ...base,
      mode: 'fps',
      fps: 5,
      nthFrame: 10,
      format: 'png',
      jpgQuality: 85,
    };

    const args = buildExtractionArgs('input.mp4', settings);
    expect(args).toContain('fps=5');
    expect(args).not.toContain('-q:v');
    expect(args[args.length - 1]).toBe('frame_%04d.png');
  });

  it('builds every-nth mode args', () => {
    const settings: ExtractionSettings = {
      ...base,
      mode: 'every-nth',
      fps: 1,
      nthFrame: 10,
      format: 'jpg',
      jpgQuality: 50,
    };

    const args = buildExtractionArgs('input.mp4', settings);
    expect(args).toContain('-vsync');
    expect(args).toContain('vfr');    // \\, in JS source → \, in the string, matching what ffmpeg receives    expect(args).toContain('select=not(mod(n\,10))');
  });

  it('maps quality 100 to lowest q:v value (best quality)', () => {
    const settings: ExtractionSettings = {
      ...base,
      mode: 'fps',
      fps: 1,
      nthFrame: 10,
      format: 'jpg',
      jpgQuality: 100,
    };

    const args = buildExtractionArgs('input.mp4', settings);
    const qIdx = args.indexOf('-q:v');
    expect(qIdx).toBeGreaterThan(-1);
    expect(parseInt(args[qIdx + 1])).toBe(2);
  });

  it('maps quality 1 to highest q:v value (worst quality)', () => {
    const settings: ExtractionSettings = {
      ...base,
      mode: 'fps',
      fps: 1,
      nthFrame: 10,
      format: 'jpg',
      jpgQuality: 1,
    };

    const args = buildExtractionArgs('input.mp4', settings);
    const qIdx = args.indexOf('-q:v');
    expect(parseInt(args[qIdx + 1])).toBe(31);
  });

  it('builds at-cursor mode args with no nearby frames', () => {
    const settings: ExtractionSettings = {
      ...base,
      mode: 'at-cursor',
      fps: 1,
      nthFrame: 10,
      format: 'png',
      jpgQuality: 85,
      cursorTime: 5.5,
      nearbyFrames: 0,
    };

    const args = buildExtractionArgs('input.mp4', settings);
    expect(args).toContain('-ss');
    expect(args).toContain('5.5');
    expect(args).toContain('-frames:v');
    expect(args).toContain('1');
    expect(args).not.toContain('-vf');
    expect(args[args.length - 1]).toBe('frame_%04d.png');
  });

  it('builds at-cursor mode args with nearby frames', () => {
    const settings: ExtractionSettings = {
      ...base,
      mode: 'at-cursor',
      fps: 1,
      nthFrame: 10,
      format: 'jpg',
      jpgQuality: 90,
      cursorTime: 10,
      nearbyFrames: 3,
    };

    const args = buildExtractionArgs('input.mp4', settings);
    expect(args).toContain('-ss');
    expect(args).toContain('-frames:v');
    expect(args).toContain('7'); // 1 + 2*3
    expect(args).toContain('-q:v');
  });

  it('clamps at-cursor seek time to zero for early cursor', () => {
    const settings: ExtractionSettings = {
      ...base,
      mode: 'at-cursor',
      fps: 1,
      nthFrame: 10,
      format: 'png',
      jpgQuality: 85,
      cursorTime: 0.01,
      nearbyFrames: 5,
    };

    const args = buildExtractionArgs('input.mp4', settings);
    const ssIdx = args.indexOf('-ss');
    expect(parseFloat(args[ssIdx + 1])).toBe(0);
  });

  it('produces identical args regardless of reverse for each mode', () => {
    const modes: ExtractionMode[] = ['fps', 'every-nth', 'at-cursor'];
    for (const mode of modes) {
      const off: ExtractionSettings = {
        mode,
        fps: 2,
        nthFrame: 5,
        format: 'jpg',
        jpgQuality: 75,
        cursorTime: 3,
        nearbyFrames: 2,
        reverse: false,
      };
      const on: ExtractionSettings = { ...off, reverse: true };
      expect(buildExtractionArgs('input.mp4', on)).toEqual(
        buildExtractionArgs('input.mp4', off),
      );
    }
  });
});

describe('computeFramePlacement', () => {
  it('passes through original index and filename when reverse is false', () => {
    expect(computeFramePlacement(0, 5, 'frame_0001.jpg', false)).toEqual({
      index: 0,
      filename: 'frame_0001.jpg',
    });
    expect(computeFramePlacement(4, 5, 'frame_0005.jpg', false)).toEqual({
      index: 4,
      filename: 'frame_0005.jpg',
    });
  });

  it('is a no-op for total=1 even when reverse is true', () => {
    const off = computeFramePlacement(0, 1, 'frame_0001.png', false);
    const on = computeFramePlacement(0, 1, 'frame_0001.png', true);
    expect(on).toEqual(off);
    expect(on.filename).toBe('frame_0001.png');
    expect(on.index).toBe(0);
  });

  it('swaps the pair when total=2 and reverse is true', () => {
    expect(computeFramePlacement(0, 2, 'frame_0001.jpg', true)).toEqual({
      index: 1,
      filename: 'frame_0002.jpg',
    });
    expect(computeFramePlacement(1, 2, 'frame_0002.jpg', true)).toEqual({
      index: 0,
      filename: 'frame_0001.jpg',
    });
  });

  it('maps i=0 to last position and i=N-1 to first position for arbitrary N', () => {
    const N = 17;
    const first = computeFramePlacement(0, N, 'frame_0001.png', true);
    const last = computeFramePlacement(N - 1, N, `frame_${String(N).padStart(4, '0')}.png`, true);
    expect(first.index).toBe(N - 1);
    expect(first.filename).toBe(`frame_${String(N).padStart(4, '0')}.png`);
    expect(last.index).toBe(0);
    expect(last.filename).toBe('frame_0001.png');
  });

  it('produces unique zero-padded filenames across the full range', () => {
    const N = 12;
    const seen = new Set<string>();
    for (let i = 0; i < N; i++) {
      const { filename, index } = computeFramePlacement(i, N, 'frame_0001.jpg', true);
      expect(filename).toMatch(/^frame_\d{4}\.jpg$/);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(N);
      seen.add(filename);
    }
    expect(seen.size).toBe(N);
  });

  it('preserves the extension for both jpg and png', () => {
    expect(computeFramePlacement(2, 5, 'frame_0003.jpg', true).filename).toMatch(/\.jpg$/);
    expect(computeFramePlacement(2, 5, 'frame_0003.png', true).filename).toMatch(/\.png$/);
  });
});
