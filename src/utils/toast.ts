export type ToastType = 'success' | 'error' | 'info';

let addToastFn: ((message: string, type: ToastType) => void) | null = null;

export function toast(message: string, type: ToastType = 'info') {
  addToastFn?.(message, type);
}

export function registerToastHandler(fn: (message: string, type: ToastType) => void) {
  addToastFn = fn;
}

export function unregisterToastHandler() {
  addToastFn = null;
}
