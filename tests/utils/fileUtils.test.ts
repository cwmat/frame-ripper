import { describe, it, expect } from 'vitest';
import {
  formatFileSize,
  getFileExtension,
  isVideoFile,
  validateVideoFile,
  sanitizeFilename,
} from '../../src/utils/fileUtils';

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
  });

  it('formats gigabytes', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
  });
});

describe('getFileExtension', () => {
  it('returns extension with dot', () => {
    expect(getFileExtension('video.mp4')).toBe('.mp4');
    expect(getFileExtension('file.name.webm')).toBe('.webm');
  });

  it('returns empty string for no extension', () => {
    expect(getFileExtension('noext')).toBe('');
  });
});

describe('isVideoFile', () => {
  it('accepts video MIME types', () => {
    expect(isVideoFile(new File([], 'test.mp4', { type: 'video/mp4' }))).toBe(true);
    expect(isVideoFile(new File([], 'test.webm', { type: 'video/webm' }))).toBe(true);
  });

  it('accepts by extension when MIME is empty', () => {
    expect(isVideoFile(new File([], 'test.mkv', { type: '' }))).toBe(true);
  });

  it('rejects non-video files', () => {
    expect(isVideoFile(new File([], 'test.txt', { type: 'text/plain' }))).toBe(false);
  });
});

describe('validateVideoFile', () => {
  it('returns null for valid video files', () => {
    expect(validateVideoFile(new File(['x'], 'test.mp4', { type: 'video/mp4' }))).toBeNull();
  });

  it('returns error for non-video files', () => {
    expect(validateVideoFile(new File(['x'], 'test.txt', { type: 'text/plain' }))).toContain(
      'Unsupported',
    );
  });
});

describe('sanitizeFilename', () => {
  it('replaces special characters with underscores', () => {
    expect(sanitizeFilename('my video (1).mp4')).toBe('my_video__1_.mp4');
  });

  it('keeps safe characters', () => {
    expect(sanitizeFilename('test-file_v2.mp4')).toBe('test-file_v2.mp4');
  });
});
