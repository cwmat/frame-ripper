import { describe, it, expect } from 'vitest';
import { formatDuration, formatPercent, formatFrameNumber } from '../../src/utils/formatUtils';

describe('formatDuration', () => {
  it('formats seconds only', () => {
    expect(formatDuration(45)).toBe('0:45');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(90)).toBe('1:30');
  });

  it('formats hours', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
  });
});

describe('formatPercent', () => {
  it('formats 0-1 range to percentage string', () => {
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(0.5)).toBe('50%');
    expect(formatPercent(1)).toBe('100%');
  });
});

describe('formatFrameNumber', () => {
  it('pads frame numbers', () => {
    expect(formatFrameNumber(1, 100)).toBe('001');
    expect(formatFrameNumber(42, 1000)).toBe('0042');
    expect(formatFrameNumber(5, 9)).toBe('5');
  });
});
