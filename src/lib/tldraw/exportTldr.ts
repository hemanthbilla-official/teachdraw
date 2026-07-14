import { type Editor, serializeTldrawJsonBlob } from 'tldraw'
import { sanitizeFileName } from '@/lib/filename'

export async function exportTldr(editor: Editor, title?: string): Promise<void> {
  const blob = await serializeTldrawJsonBlob(editor)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${sanitizeFileName(title || 'teachdraw-board')}.tldr`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
