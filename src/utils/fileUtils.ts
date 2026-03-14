import { ACCEPTED_VIDEO_TYPES, MAX_FILE_SIZE } from './constants';

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function getFileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

export function isVideoFile(file: File): boolean {
  if (ACCEPTED_VIDEO_TYPES.includes(file.type)) return true;
  // Fallback: check extension for files with empty MIME
  const ext = getFileExtension(file.name);
  return ['.mp4', '.webm', '.ogv', '.mkv', '.mov', '.avi'].includes(ext);
}

export function validateVideoFile(file: File): string | null {
  if (!isVideoFile(file)) {
    return 'Unsupported file type. Please drop a video file (MP4, WebM, MKV, MOV, AVI).';
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File too large (${formatFileSize(file.size)}). Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`;
  }
  return null;
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
