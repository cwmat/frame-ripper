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
  it('builds fps mode args with jpg output', () => {
    const settings: ExtractionSettings = {
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
});
