import { type Editor, loadSnapshot } from 'tldraw'

export async function importTldrFile(editor: Editor, file: File): Promise<void> {
  const text = await file.text()
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON file.')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('This file does not look like a valid tldraw file.')
  }

  try {
    loadSnapshot(editor.store, parsed)
    editor.zoomToFit({ animation: { duration: 320 } })
  } catch (error) {
    console.error(error)
    throw new Error('Could not import this file.')
  }
}
