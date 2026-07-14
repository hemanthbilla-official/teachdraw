import type { TeachDrawFrame } from '@/types/teachdraw'
import { cleanFrameTitle, normalizeHeading } from './content'
import type { DrawColor } from './types'

export type LessonChapter = {
  key: ChapterKey
  title: string
  eyebrow: string
  color: DrawColor
  frames: Array<{ frame: TeachDrawFrame; index: number }>
}

type ChapterKey = 'context' | 'foundation' | 'build' | 'verify' | 'debug' | 'practice' | 'recap'

const chapterDetails: Record<ChapterKey, Omit<LessonChapter, 'key' | 'frames'>> = {
  context: { title: 'Start with the destination', eyebrow: 'CONTEXT', color: 'grey' },
  foundation: { title: 'Build the mental model', eyebrow: 'FOUNDATION', color: 'green' },
  build: { title: 'Construct the solution', eyebrow: 'BUILD', color: 'violet' },
  verify: { title: 'Run and verify', eyebrow: 'VERIFY', color: 'green' },
  debug: { title: 'Recognize and fix failures', eyebrow: 'DEBUG', color: 'red' },
  practice: { title: 'Apply it independently', eyebrow: 'PRACTICE', color: 'violet' },
  recap: { title: 'Keep the complete picture', eyebrow: 'RECAP', color: 'orange' },
}

const chapterOrder: ChapterKey[] = ['context', 'foundation', 'build', 'verify', 'debug', 'practice', 'recap']

export function buildLessonChapters(frames: TeachDrawFrame[]): LessonChapter[] {
  const chapters: LessonChapter[] = []
  let currentKey: ChapterKey = 'context'

  frames.forEach((frame, index) => {
    const candidate = classifyChapter(frame)
    currentKey = resolveChapter(candidate, currentKey)
    const current = chapters.at(-1)

    if (current?.key === currentKey) {
      current.frames.push({ frame, index })
      return
    }

    chapters.push({ key: currentKey, ...chapterDetails[currentKey], frames: [{ frame, index }] })
  })

  return chapters
}

function classifyChapter(frame: TeachDrawFrame): ChapterKey | null {
  const title = normalizeHeading(cleanFrameTitle(frame.frameTitle))

  if (/recap|summary|memory map|what we learned|final picture|takeaway/.test(title)) return 'recap'
  if (/common error|troubleshoot|debug|failure|mistake|wrong|not found/.test(title)) return 'debug'
  if (/student practice|practice|exercise|challenge|checklist|your turn|assignment/.test(title)) return 'practice'
  if (/^test\b|testing|verify|run the|open swagger|status code|expected result|try the/.test(title)) return 'verify'
  if (/^step\b|create|build|implement|add |write |complete .*\.py|router imports|include the router|route$|query$|flow$/.test(title)) return 'build'
  if (/architecture|structure|responsibility|dependency|module|package|model|mapping|meaning|difference| vs |why |understanding|table reminder|route map/.test(title)) {
    return 'foundation'
  }
  if (/previous|today|goal|overview|current|problem|big picture|lesson destination|completed/.test(title)) return 'context'

  return null
}

function resolveChapter(candidate: ChapterKey | null, current: ChapterKey): ChapterKey {
  if (!candidate) return current

  const currentIndex = chapterOrder.indexOf(current)
  const candidateIndex = chapterOrder.indexOf(candidate)

  // Lesson chapters are a forward-only teaching path. Later examples often
  // reuse words such as "goal" or "model" without starting a new chapter.
  if (candidateIndex < currentIndex) return current

  return candidate
}
