import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { normalizeTrack, extractVideoId } from '../providers/catalog.js'
import { searchYouTube } from '../providers/youtube.js'
import { Track } from '../models/track.model.js'

/**
 * GET /api/v1/search?q=...
 * GET /api/v1/search/tracks?q=...
 *
 * When a query is provided:
 *   → Normalize query
 *   → Empty query returns 400 Bad Request
 *   → Search YouTube live via Innertube API
 *   → Returns metadata + videoId for each result:
 *       { provider, providerId, videoId, title, artist, thumbnail, duration, durationFormatted }
 *   → If no results: returns 200 with empty array
 *
 * When no query is provided:
 *   → If /tracks: return seeded Sonora catalog tracks (browse experience)
 *   → If /: 400 Bad Request (query required)
 */
const search = asyncHandler(async (req, res) => {
  const hasQueryParam = req.query.q !== undefined

  if (hasQueryParam) {
    const rawQuery = req.query.q || ''
    const query = rawQuery.trim().replace(/\s+/g, ' ')

    if (!query) {
      throw new ApiError(400, 'Search query cannot be empty')
    }

    try {
      const results = await searchYouTube(query, 12)
      return res.json(new ApiResponse(200, results, 'Search results'))
    } catch (err) {
      console.error('[search.controller] YouTube search failed:', err.message)
      throw new ApiError(500, 'Search service temporarily unavailable. Please try again.')
    }
  }

  // If accessed via /search without query param
  if (req.path === '/' || req.path === '') {
    throw new ApiError(400, 'Search query is required')
  }

  // /search/tracks without query: return Sonora catalog for initial browse
  const catalogTracks = await Track.find({}).sort({ createdAt: -1 }).limit(24).lean()
  const normalized = catalogTracks.map(normalizeTrack)
  return res.json(new ApiResponse(200, normalized, 'Catalog tracks'))
})

/**
 * POST /api/v1/search/tracks
 *
 * Add a track to the Sonora catalog by YouTube URL or bare videoId.
 * Kept intact as manual fallback.
 * Requires authentication.
 *
 * Body: { url, videoUrl, title, artist, duration? }
 */
const addTrack = asyncHandler(async (req, res) => {
  const url = req.body.url || req.body.videoUrl
  const { title, artist, duration } = req.body

  if (!url || !title?.trim() || !artist?.trim()) {
    throw new ApiError(400, 'url, title, and artist are required')
  }

  const videoId = extractVideoId(url)
  if (!videoId) {
    throw new ApiError(400, 'Could not extract a valid YouTube video ID from the provided URL')
  }

  const thumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`

  const track = await Track.findOneAndUpdate(
    { provider: 'youtube', providerId: videoId },
    {
      $setOnInsert: {
        provider: 'youtube',
        providerId: videoId,
        title: title.trim(),
        artist: artist.trim(),
        thumbnail,
        duration: duration ? Number(duration) : 0,
        addedBy: req.user._id,
      },
    },
    { upsert: true, new: true }
  )

  return res.status(201).json(new ApiResponse(201, normalizeTrack(track), 'Track added to catalog'))
})

export { search, addTrack }
