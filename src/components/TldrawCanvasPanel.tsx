'use client'

import { Tldraw, type Editor } from 'tldraw'

type Props = {
  onMount: (editor: Editor) => void
}

export function TldrawCanvasPanel({ onMount }: Props) {
  return (
    <section
      className="min-h-[70vh] flex-1 overflow-hidden border-t border-slate-200 bg-white lg:min-h-0 lg:border-l lg:border-t-0"
      data-testid="teachdraw-canvas"
    >
      <Tldraw onMount={onMount} />
    </section>
  )
}
