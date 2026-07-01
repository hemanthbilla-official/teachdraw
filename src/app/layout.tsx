import type { Metadata } from 'next'
import 'tldraw/tldraw.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'TeachDraw',
  description: 'Markdown to editable tldraw board',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
