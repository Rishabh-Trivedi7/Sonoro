/**
 * YouTube Search Provider — Sonora's live search abstraction.
 *
 * Uses YouTube Innertube search endpoint (no API key required) to query YouTube's search
 * and return only the metadata Sonora needs:
 *   { provider, providerId, videoId, title, artist, thumbnail, duration, durationFormatted }
 *
 * This module is ONLY used for:
 *   search query → metadata + videoId
 *
 * It does NOT:
 *   - download YouTube videos
 *   - extract audio
 *   - proxy media
 *   - store any media files
 *
 * Playback is handled entirely by the YouTube embedded player
 * on the frontend using the videoId.
 */

// Simple in-memory search cache with 10-minute TTL
const searchCache = new Map()
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes
const MAX_CACHE_ENTRIES = 200

const getCachedResults = (key) => {
  const cached = searchCache.get(key)
  if (!cached) return null
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    searchCache.delete(key)
    return null
  }
  return cached.data
}

const setCachedResults = (key, data) => {
  if (searchCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = searchCache.keys().next().value
    searchCache.delete(oldestKey)
  }
  searchCache.set(key, { data, timestamp: Date.now() })
}

/**
 * Format duration string (e.g. "3:45", "1:12:30") to seconds.
 */
const parseDurationSeconds = (str) => {
  if (!str) return 0
  const parts = str.split(':').map(Number)
  if (parts.length === 3) return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0)
  if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0)
  return parts[0] || 0
}

/**
 * Search YouTube for tracks matching the query.
 * Returns a clean array of normalized Sonora track objects.
 *
 * @param {string} query - Search query (normalized before calling)
 * @param {number} limit - Max number of results (default 10)
 * @returns {Promise<object[]>} Array of normalized tracks
 */
export const searchYouTube = async (query, limit = 10) => {
  if (!query || !query.trim()) return []

  const cleanQuery = query.trim().replace(/\s+/g, ' ')
  const cacheKey = `${cleanQuery.toLowerCase()}:${limit}`

  const cached = getCachedResults(cacheKey)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch('https://www.youtube.com/youtubei/v1/search', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        context: { client: { clientName: 'WEB', clientVersion: '2.20240101.01.00' } },
        query: cleanQuery,
      }),
    })

    if (!response.ok) {
      throw new Error(`YouTube responded with status ${response.status}`)
    }

    const data = await response.json()
    const contents =
      data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || []

    const results = []

    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents || []
      for (const item of items) {
        if (results.length >= limit) break

        const v = item.videoRenderer
        if (!v || !v.videoId) continue

        const title = v.title?.runs?.map((r) => r.text).join('') || v.title?.simpleText || 'Untitled'
        const artist =
          v.ownerText?.runs?.[0]?.text ||
          v.longBylineText?.runs?.[0]?.text ||
          v.shortBylineText?.runs?.[0]?.text ||
          'Unknown Artist'

        const durationFormatted = v.lengthText?.simpleText || '0:00'
        const durationSeconds = parseDurationSeconds(durationFormatted)

        const thumbnail =
          v.thumbnail?.thumbnails?.[v.thumbnail.thumbnails.length - 1]?.url ||
          `https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`

        results.push({
          provider: 'youtube',
          providerId: v.videoId,
          videoId: v.videoId,
          title,
          artist,
          thumbnail,
          duration: durationSeconds,
          durationFormatted,
        })
      }
      if (results.length >= limit) break
    }

    setCachedResults(cacheKey, results)
    return results
  } catch (err) {
    console.error('[youtube-provider] Search failed:', err.message)
    throw new Error('YouTube search temporarily unavailable. Please try again.')
  }
}
