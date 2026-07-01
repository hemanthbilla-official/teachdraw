import { type Editor, getSnapshot } from 'tldraw'
import { sanitizeFileName } from '@/lib/filename'

export function exportTldr(editor: Editor, title?: string): void {
  const snapshot = getSnapshot(editor.store)
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${sanitizeFileName(title || 'teachdraw-board')}.tldr`
  anchor.click()
  URL.revokeObjectURL(url)
}
