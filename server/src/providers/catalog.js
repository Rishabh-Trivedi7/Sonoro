import { Track } from '../models/track.model.js'
import { CATALOG_SEED } from '../db/catalogSeed.js'

/**
 * Catalog Provider — Sonora's search abstraction.
 *
 * Searches Sonora's curated MongoDB track catalog.
 * Returns normalized Track objects with the shape:
 *   { provider, providerId, title, artist, thumbnail, duration }
 *
 * This abstraction isolates the rest of the application from
 * the search implementation. A live provider (e.g. a YouTube Data API
 * integration) can be substituted here without changing any other layer.
 *
 * Thumbnails are constructed using YouTube's standard URL pattern —
 * no scraping, no downloading, no re-hosting.
 */

/**
 * Ensure the catalog is seeded with default tracks.
 * Called once on server startup.
 */
export const seedCatalog = async () => {
  try {
    const count = await Track.countDocuments()
    if (count === 0) {
      await Track.insertMany(CATALOG_SEED, { ordered: false })
      console.log(`🎵 Seeded ${CATALOG_SEED.length} tracks into the Sonora catalog`)
    }
  } catch (err) {
    // Duplicate key errors on subsequent seeds are expected and safe to ignore
    if (err.code !== 11000) {
      console.error('Catalog seed error:', err.message)
    }
  }
}

/**
 * Search the catalog for tracks matching the query.
 * Uses MongoDB text search on title + artist fields.
 *
 * @param {string} query
 * @param {number} limit
 * @returns {Promise<Track[]>}
 */
export const searchTracks = async (query, limit = 20) => {
  if (!query || !query.trim()) {
    // Return recent catalog entries when no query
    return Track.find({}).sort({ createdAt: -1 }).limit(limit).lean()
  }

  // MongoDB text search — indexed on title + artist
  const results = await Track.find(
    { $text: { $search: query.trim() } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .lean()

  if (results.length > 0) return results

  // Fallback: regex search for partial matches
  const regex = new RegExp(query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  return Track.find({
    $or: [{ title: regex }, { artist: regex }],
  })
    .limit(limit)
    .lean()
}

/**
 * Normalize a raw Track document into Sonora's provider-agnostic shape.
 * This is the only place in the application that knows about
 * provider-specific thumbnail URL construction.
 *
 * @param {object} track - Raw track document or plain object
 * @returns {object} Normalized track
 */
export const normalizeTrack = (track) => ({
  provider: track.provider || 'youtube',
  providerId: track.providerId,
  title: track.title,
  artist: track.artist,
  thumbnail: track.thumbnail || `https://img.youtube.com/vi/${track.providerId}/hqdefault.jpg`,
  duration: track.duration || 0,
})

/**
 * Extract a YouTube video ID from a URL or raw ID string.
 * Supports: full URLs, short URLs, embed URLs, bare IDs.
 *
 * @param {string} input
 * @returns {string|null} videoId or null if not parseable
 */
export const extractVideoId = (input) => {
  if (!input) return null
  const trimmed = input.trim()

  // Already a bare ID (11 alphanumeric chars with - and _)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed

  try {
    const url = new URL(trimmed)
    // https://www.youtube.com/watch?v=...
    const v = url.searchParams.get('v')
    if (v) return v
    // https://youtu.be/...
    if (url.hostname === 'youtu.be') return url.pathname.slice(1)
    // https://www.youtube.com/embed/...
    const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/)
    if (embedMatch) return embedMatch[1]
  } catch {
    // Not a valid URL — not a valid ID either
  }

  return null
}
