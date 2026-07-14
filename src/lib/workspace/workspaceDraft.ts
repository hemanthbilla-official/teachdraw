export const WORKSPACE_DRAFT_STORAGE_KEY = 'teachdraw.workspace-draft.v1'
export const WORKSPACE_DRAFT_VERSION = 1 as const
export const WORKSPACE_DRAFT_DEBOUNCE_MS = 300
export const TEACHDRAW_CANVAS_PERSISTENCE_KEY = 'teachdraw.canvas.v1'

export type WorkspaceDraftV1 = {
  version: typeof WORKSPACE_DRAFT_VERSION
  markdown: string
}

export type WorkspaceDraftLoadResult =
  | { status: 'loaded'; draft: WorkspaceDraftV1 }
  | { status: 'empty' }
  | { status: 'invalid' }
  | { status: 'unavailable' }

export function createWorkspaceDraft(markdown: string): WorkspaceDraftV1 {
  return {
    version: WORKSPACE_DRAFT_VERSION,
    markdown,
  }
}

export function readWorkspaceDraft(storage?: Storage): WorkspaceDraftLoadResult {
  const target = storage ?? getBrowserStorage()
  if (!target) return { status: 'unavailable' }

  let serialized: string | null

  try {
    serialized = target.getItem(WORKSPACE_DRAFT_STORAGE_KEY)
  } catch {
    return { status: 'unavailable' }
  }

  if (!serialized) return { status: 'empty' }

  try {
    const parsed: unknown = JSON.parse(serialized)
    return isWorkspaceDraftV1(parsed) ? { status: 'loaded', draft: parsed } : { status: 'invalid' }
  } catch {
    return { status: 'invalid' }
  }
}

export function writeWorkspaceDraft(
  draft: WorkspaceDraftV1,
  storage?: Storage
): boolean {
  const target = storage ?? getBrowserStorage()
  if (!target) return false

  try {
    target.setItem(WORKSPACE_DRAFT_STORAGE_KEY, JSON.stringify(draft))
    return true
  } catch {
    return false
  }
}

function getBrowserStorage(): Storage | null {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function isWorkspaceDraftV1(value: unknown): value is WorkspaceDraftV1 {
  if (!value || typeof value !== 'object') return false

  const draft = value as Record<string, unknown>
  return draft.version === WORKSPACE_DRAFT_VERSION && typeof draft.markdown === 'string'
}
