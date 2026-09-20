import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import PageContainer from '../components/ui/PageContainer'
import SectionHeading from '../components/ui/SectionHeading'
import TrackCard from '../components/discover/TrackCard'
import TrackDetail from '../components/discover/TrackDetail'
import AddTrackModal from '../components/discover/AddTrackModal'
import YouTubePlayer from '../components/room/YouTubePlayer'
import Button from '../components/ui/Button'
import searchService from '../services/searchService'
import roomService from '../services/roomService'
import { getRoomRoute } from '../constants/routes'

const GENRE_TAGS = ['All', 'Acoustic', 'Bollywood', 'Indie', 'Lo-Fi', 'R&B']

export default function DiscoverPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const initialQuery = searchParams.get('q') || ''
  const [query, setQuery] = useState(initialQuery)
  const [selectedTag, setSelectedTag] = useState('All')
  const [tracks, setTracks] = useState([])
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [standaloneTrack, setStandaloneTrack] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [creatingRoom, setCreatingRoom] = useState(false)

  const fetchTracks = useCallback(async (searchQuery = '') => {
    setLoading(true)
    setError(null)
    try {
      const results = await searchService.searchTracks(searchQuery)
      setTracks(results)
    } catch (err) {
      console.error('Search error:', err)
      setError(
        err.response?.data?.message || 'Something went wrong while searching. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  // Sync with search URL param
  useEffect(() => {
    const q = searchParams.get('q') || ''
    setQuery(q)
    fetchTracks(q)
  }, [searchParams, fetchTracks])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    const trimmed = query.trim()
    setSearchParams(trimmed ? { q: trimmed } : {})
  }

  const handleTagClick = (tag) => {
    setSelectedTag(tag)
    if (tag === 'All') {
      setQuery('')
      setSearchParams({})
    } else {
      setQuery(tag)
      setSearchParams({ q: tag })
    }
  }

  const handleStartRoom = async (roomName, track) => {
    setCreatingRoom(true)
    try {
      const newRoom = await roomService.createRoom({
        name: roomName || `${track.title} Room`,
        currentTrack: track,
      })
      navigate(getRoomRoute(newRoom._id))
    } catch (err) {
      console.error('Failed to create room:', err)
      alert(err.response?.data?.message || 'Could not create room. Please try again.')
    } finally {
      setCreatingRoom(false)
    }
  }

  return (
    <PageContainer>
      {/* Header & Search */}
      <div className="pt-6 pb-8">
        <SectionHeading
          title="Discover Music"
          description="Explore Sonora's soundscapes, search any artist or song, or add your own"
        />

        {/* Search Bar + Actions */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by song title, artist, or vibe..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-charcoal border border-border rounded-lg pl-10 pr-10 py-3 text-base sm:text-sm text-cream placeholder:text-muted/60 focus:outline-none focus:border-gold/70 transition-colors shadow-inner min-h-[44px]"
              />
              <svg
                className="absolute left-3.5 top-3.5 w-4 h-4 text-muted/70"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setSearchParams({})
                  }}
                  className="absolute right-3.5 top-3.5 text-muted hover:text-cream text-xs p-1"
                >
                  ✕
                </button>
              )}
            </div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              className="shrink-0 min-h-[44px]"
            >
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </form>

          <Button
            variant="outline"
            size="lg"
            onClick={() => setIsAddModalOpen(true)}
            className="shrink-0 min-h-[44px]"
            title="Manual YouTube URL fallback"
          >
            <span className="text-gold font-bold">+</span> Add by URL
          </Button>
        </div>

        {/* Genre / Filter pills (Horizontally scrollable on mobile) */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 sm:flex-wrap">
          {GENRE_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className={[
                'px-3.5 py-1.5 text-xs rounded-full border transition-all duration-150 shrink-0 cursor-pointer min-h-[32px]',
                selectedTag === tag
                  ? 'bg-gold/15 border-gold/60 text-gold font-medium'
                  : 'bg-charcoal/50 border-border/80 text-muted hover:text-cream hover:border-muted/50',
              ].join(' ')}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Standalone Player (Personal Listening) */}
      {standaloneTrack && (
        <div className="mb-8">
          <YouTubePlayer
            mode="standalone"
            standaloneTrack={standaloneTrack}
            onClose={() => setStandaloneTrack(null)}
          />
        </div>
      )}

      {/* Selected Track Detail Hero (if selected) */}
      {selectedTrack && (
        <div className="mb-8">
          <TrackDetail
            track={selectedTrack}
            onClose={() => setSelectedTrack(null)}
            onCreateRoom={(name, track) => handleStartRoom(name, track)}
            onPlayStandalone={(track) => setStandaloneTrack(track)}
            creating={creatingRoom}
          />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-950/30 border border-red-800/50 rounded-lg text-red-300 text-sm mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => fetchTracks(query)}
            className="text-xs text-cream hover:underline ml-4"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="py-4">
          <div className="flex items-center gap-2 mb-4 text-xs text-gold">
            <span className="w-2 h-2 rounded-full bg-gold animate-ping" />
            <span>Searching soundscapes...</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-charcoal/40 border border-border/40 rounded-lg overflow-hidden animate-pulse"
              >
                <div className="aspect-video bg-elevated" />
                <div className="p-3.5 space-y-2">
                  <div className="h-4 bg-elevated rounded w-3/4" />
                  <div className="h-3 bg-elevated/60 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : tracks.length > 0 ? (
        /* Track grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 pb-12">
          {tracks.map((track) => (
            <TrackCard
              key={track._id || track.providerId}
              track={track}
              isSelected={selectedTrack?._id === track._id}
              onSelect={(t) => setSelectedTrack(t)}
              onPlayStandalone={(t) => setStandaloneTrack(t)}
              onStartRoom={(t) =>
                handleStartRoom(`${t.title.slice(0, 30)} Lounge`, t)
              }
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="py-16 text-center border border-dashed border-border rounded-xl bg-charcoal/20">
          <div className="w-12 h-12 rounded-full bg-elevated text-gold flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          </div>
          <h3 className="font-display text-base text-cream font-medium">No tracks found</h3>
          <p className="text-xs text-muted max-w-sm mx-auto mt-1 mb-5">
            {query
              ? `No tracks matched "${query}". Try searching for another artist or song.`
              : 'The catalog is empty. Add a YouTube track to get started.'}
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Track by URL
          </Button>
        </div>
      )}

      {/* Add Track Modal (Fallback manual URL) */}
      <AddTrackModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onTrackAdded={(newTrack) => {
          setTracks((prev) => [newTrack, ...prev])
          setSelectedTrack(newTrack)
        }}
      />
    </PageContainer>
  )
}
