import { describe, it, expect } from 'vitest';
import { buildExtractionArgs, getOutputPattern } from '../../src/utils/ffmpegCommands';
import type { ExtractionSettings } from '../../src/types';

describe('getOutputPattern', () => {
  it('returns jpg pattern for jpg format', () => {
    expect(getOutputPattern('jpg')).toBe('frame_%04d.jpg');
  });

  it('returns png pattern for png format', () => {
    expect(getOutputPattern('png')).toBe('frame_%04d.png');
  });
});

describe('buildExtractionArgs', () => {
  const base = { cursorTime: 0, nearbyFrames: 0 };

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
});
