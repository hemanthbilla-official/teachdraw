const directImageExtensionRegex = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)(?:[?#].*)?$/i

const likelyImageHostPatterns = [
  /^i\.imgur\.com$/,
  /^images\.unsplash\.com$/,
  /^images\.pexels\.com$/,
  /^images\.medium\.com$/,
  /^miro\.medium\.com$/,
  /^raw\.githubusercontent\.com$/,
  /^res\.cloudinary\.com$/,
  /^cdn\./,
  /^img\./,
  /^images\./,
  /^media\./,
]

export type ImageUrlIssue = 'invalid' | 'search-or-page' | 'thumbnail-proxy' | 'not-direct-looking'

export function isRemoteImageUrl(url: string): boolean {
  const parsed = parseHttpUrl(url)
  return Boolean(parsed)
}

export function hasDirectImageExtension(url: string): boolean {
  const parsed = parseHttpUrl(url)
  const pathname = parsed?.pathname ?? url.split(/[?#]/)[0] ?? ''
  return directImageExtensionRegex.test(pathname)
}

export function isLikelyDirectImageUrl(url: string): boolean {
  const parsed = parseHttpUrl(url)
  if (!parsed) return false

  return hasDirectImageExtension(url) || isLikelyImageHost(parsed.hostname)
}

export function getImageUrlIssue(url: string): ImageUrlIssue | undefined {
  const parsed = parseHttpUrl(url)
  if (!parsed) return 'invalid'
  if (looksLikeSearchOrPageUrl(parsed)) return 'search-or-page'
  if (looksLikeThumbnailProxyUrl(parsed)) return 'thumbnail-proxy'
  if (!isLikelyDirectImageUrl(url)) return 'not-direct-looking'
  return undefined
}

function parseHttpUrl(raw: string): URL | undefined {
  try {
    const parsed = new URL(raw.trim())
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed : undefined
  } catch {
    return undefined
  }
}

function isLikelyImageHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return likelyImageHostPatterns.some((pattern) => pattern.test(host))
}

function looksLikeSearchOrPageUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase()
  const pathname = url.pathname.toLowerCase()
  const search = url.search.toLowerCase()

  if (host.includes('google.') && (pathname.startsWith('/search') || search.includes('tbm=isch'))) return true
  if (host.includes('bing.com') && (pathname.includes('/images/search') || pathname.startsWith('/search'))) return true
  if (host.includes('duckduckgo.com') && (pathname.startsWith('/') || search.includes('q='))) return true
  if (host.includes('yandex.') && pathname.includes('/images')) return true
  if (host.includes('pinterest.') && pathname.includes('/pin/')) return true

  return false
}

function looksLikeThumbnailProxyUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase()
  const pathname = url.pathname.toLowerCase()

  if (/^encrypted-tbn\d*\.gstatic\.com$/.test(host) && pathname.startsWith('/images')) return true
  if (host.endsWith('.googleusercontent.com') && pathname.includes('/proxy/')) return true

  return false
}
