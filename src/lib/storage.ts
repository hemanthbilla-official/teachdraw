export const STORAGE_KEYS = {
  markdown: 'teachdraw:markdown',
  selectedTemplate: 'teachdraw:selectedTemplate',
  layout: 'teachdraw:layout',
  columns: 'teachdraw:columns',
  flowOrientation: 'teachdraw:flowOrientation',
  lastSnapshot: 'teachdraw:lastSnapshot',
} as const

export function readStorage(key: string): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(key)
}

export function writeStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, value)
}
