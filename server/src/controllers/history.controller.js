import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { ListeningHistory } from '../models/listeningHistory.model.js'
import { User } from '../models/user.model.js'

/**
 * POST /api/v1/history
 * Record a meaningful listening event.
 * Deduplicates multiple rapid calls for the same user and track (within 60s).
 */
const recordListen = asyncHandler(async (req, res) => {
  const { provider, providerId, title, artist, thumbnail, roomId } = req.body

  if (!providerId || !title || !artist) {
    throw new ApiError(400, 'providerId, title, and artist are required')
  }

  // Deduplication: prevent duplicate record within 60s for the same track
  const recent = await ListeningHistory.findOne({
    user: req.user._id,
    providerId,
    listenedAt: { $gt: new Date(Date.now() - 60000) },
  })

  if (recent) {
    return res.status(200).json(new ApiResponse(200, recent, 'Listen already recorded recently'))
  }

  const entry = await ListeningHistory.create({
    user: req.user._id,
    provider: provider || 'youtube',
    providerId,
    title,
    artist,
    thumbnail: thumbnail || `https://img.youtube.com/vi/${providerId}/hqdefault.jpg`,
    roomId: roomId || null,
    listenedAt: new Date(),
  })

  return res.status(201).json(new ApiResponse(201, entry, 'Listen recorded'))
})

/**
 * POST /api/v1/history/time
 * Record actual listening playback duration.
 * Called on pause, song change, or room departure (never on a 1-second interval).
 */
const recordListeningTime = asyncHandler(async (req, res) => {
  const { durationSeconds } = req.body

  const sec = Math.round(Number(durationSeconds))
  if (isNaN(sec) || sec <= 0) {
    throw new ApiError(400, 'Valid positive durationSeconds is required')
  }

  // Cap single report at 7200 seconds (2 hours) to avoid bogus inputs
  const cappedSeconds = Math.min(sec, 7200)

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $inc: { 'stats.listeningTimeSeconds': cappedSeconds },
    },
    { returnDocument: 'after', select: 'stats' }
  )

  return res.status(200).json(
    new ApiResponse(
      200,
      { totalListeningTime: updatedUser?.stats?.listeningTimeSeconds || 0 },
      'Listening duration recorded successfully'
    )
  )
})

/**
 * GET /api/v1/history
 * Get the current user's recent listening history.
 */
const getHistory = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50)

  const history = await ListeningHistory.find({ user: req.user._id })
    .sort({ listenedAt: -1 })
    .limit(limit)
    .lean()

  return res.json(new ApiResponse(200, history, 'Listening history fetched'))
})

/**
 * GET /api/v1/history/dna
 * Calculate Music DNA for the current user from listening history.
 */
const getMusicDNA = asyncHandler(async (req, res) => {
  const history = await ListeningHistory.find({ user: req.user._id }).lean()

  if (history.length === 0) {
    return res.json(
      new ApiResponse(
        200,
        {
          topArtists: [],
          genres: [],
          totalListens: 0,
          uniqueTracks: 0,
        },
        'Music DNA'
      )
    )
  }

  // Artist frequency
  const artistMap = {}
  history.forEach((h) => {
    const key = h.artist.trim()
    artistMap[key] = (artistMap[key] || 0) + 1
  })

  const topArtists = Object.entries(artistMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([artist, count]) => ({ artist, count }))

  // Simple genre inference from track titles / artist names
  const GENRE_KEYWORDS = {
    Bollywood: [
      'arijit',
      'kumar sanu',
      'udit',
      'shreya',
      'sonu nigam',
      'atif',
      'pritam',
      'shankar',
      'jasleen',
      'jubin',
      'b praak',
      'armaan malik',
      'neha kakkar',
      'hanumankind',
      'shashwat',
      'raataan',
      'dhurandhar',
      'kesariya',
      'fitoor',
      'tum hi ho',
      'channa',
      'heeriye',
      'mereya',
      'teri mitti',
      'tera ban',
    ],
    Indie: [
      'prateek kuhad',
      'ritviz',
      'nucleya',
      'when chai met toast',
      'the local train',
      'kho gaye',
      'cold/mess',
      'kasoor',
    ],
    'R&B': ['weeknd', 'frank ocean', 'sza', 'khalid', 'blinding', 'save your tears', 'starboy'],
    Acoustic: [
      'bon iver',
      'vance joy',
      'george ezra',
      'tom odell',
      'riptide',
      'budapest',
      'holocene',
      'skinny love',
      'another love',
    ],
    Pop: [
      'ed sheeran',
      'taylor swift',
      'adele',
      'dua lipa',
      'perfect',
      'shape of you',
      'shallow',
      'golden hour',
      'jvke',
    ],
  }

  const genreScores = {}
  history.forEach((h) => {
    const combined = `${h.title} ${h.artist}`.toLowerCase()
    Object.entries(GENRE_KEYWORDS).forEach(([genre, keywords]) => {
      if (keywords.some((kw) => combined.includes(kw))) {
        genreScores[genre] = (genreScores[genre] || 0) + 1
      }
    })
  })

  const total = Object.values(genreScores).reduce((s, c) => s + c, 0)
  const genres = Object.entries(genreScores)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => ({
      name,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))

  const classifiedPct = genres.reduce((s, g) => s + g.percentage, 0)
  if (classifiedPct < 100 && genres.length > 0) {
    genres.push({ name: 'Other', percentage: 100 - classifiedPct })
  }

  const uniqueTracks = new Set(history.map((h) => h.providerId)).size

  return res.json(
    new ApiResponse(
      200,
      {
        topArtists,
        genres,
        totalListens: history.length,
        uniqueTracks,
      },
      'Music DNA'
    )
  )
})

export { recordListen, recordListeningTime, getHistory, getMusicDNA }
