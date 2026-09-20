import { useState } from 'react'
import socketService from '../../services/socketService'
import searchService from '../../services/searchService'
import Button from '../ui/Button'
import { formatDuration } from '../discover/TrackCard'

export default function RoomQueue({
  queue = [],
  isHost = false,
  currentUserId,
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await searchService.searchTracks(searchQuery.trim())
      setSearchResults(res)
    } catch (err) {
      console.error('Queue track search failed:', err)
    } finally {
      setSearching(false)
    }
  }

  const handleAddTrack = (track) => {
    socketService.addToQueue(track)
    setIsSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const handleVote = (queueItemId) => {
    socketService.voteQueue(queueItemId)
  }

  const handlePlayNow = (queueItemId) => {
    if (isHost) {
      socketService.nextQueue(queueItemId)
    }
  }

  return (
    <div className="bg-charcoal border border-border rounded-xl p-5 shadow-lg flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/70">
        <div>
          <h3 className="font-display text-sm text-cream font-medium flex items-center gap-2">
            <span>Upcoming Queue</span>
            <span className="text-[11px] px-2 py-0.2 bg-gold/15 text-gold rounded-full font-mono">
              {queue.length}
            </span>
          </h3>
          <p className="text-[11px] text-muted">Voted on by room listeners</p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsSearchOpen(true)}
          className="text-xs"
        >
          + Request Song
        </Button>
      </div>

      {/* Queue items */}
      <div className="flex-1 overflow-y-auto space-y-2.5 max-h-80 pr-1">
        {queue.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border/60 rounded-lg">
            <p className="text-xs text-muted">The queue is empty</p>
            <p className="text-[11px] text-muted/70 mt-1">
              Suggest a song to shape the upcoming vibe
            </p>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="mt-3 text-xs text-gold hover:underline font-medium"
            >
              Request a Track
            </button>
          </div>
        ) : (
          queue.map((item) => {
            const hasVoted = item.votes?.some(
              (v) => v === currentUserId || v?._id === currentUserId
            )
            return (
              <div
                key={item._id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-obsidian/40 border border-border/40 hover:border-border transition-colors gap-3"
              >
                {/* Thumbnail & Title */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <img
                    src={
                      item.track?.thumbnail ||
                      `https://img.youtube.com/vi/${item.track?.providerId}/hqdefault.jpg`
                    }
                    alt={item.track?.title}
                    className="w-10 h-10 rounded object-cover shrink-0 bg-elevated"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-cream truncate">
                      {item.track?.title}
                    </p>
                    <p className="text-[11px] text-muted truncate">
                      {item.track?.artist} •{' '}
                      <span className="text-muted/60">
                        req. by {item.requestedByName || 'listener'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Actions: Vote & Play Now */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Vote button */}
                  <button
                    onClick={() => handleVote(item._id)}
                    className={[
                      'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors border',
                      hasVoted
                        ? 'bg-gold/20 text-gold border-gold/40'
                        : 'bg-elevated border-border text-muted hover:text-cream hover:border-muted/50',
                    ].join(' ')}
                    title="Upvote song in queue"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 4l-8 8h6v8h4v-8h6z" />
                    </svg>
                    <span className="font-mono text-[11px]">{item.voteCount || 0}</span>
                  </button>

                  {/* Host Play Now button */}
                  {isHost && (
                    <button
                      onClick={() => handlePlayNow(item._id)}
                      className="p-1.5 rounded bg-gold/10 hover:bg-gold/20 text-gold text-xs transition-colors"
                      title="Play this track next"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Track Search Modal for Queue Request */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian/85 backdrop-blur-sm">
          <div className="bg-charcoal border border-border rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-display text-base text-cream font-semibold">
                Request a Track
              </h4>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="text-muted hover:text-cream p-1"
              >
                ✕
              </button>
            </div>

            {/* Search form */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Search catalog by title or artist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="flex-1 bg-obsidian border border-border rounded-lg px-3 py-2 text-sm sm:text-xs text-cream focus:outline-none focus:border-gold/70 min-h-[40px]"
              />
              <Button type="submit" variant="primary" size="sm" disabled={searching} className="shrink-0 min-h-[40px] px-3.5">
                {searching ? '...' : 'Search'}
              </Button>
            </form>

            {/* Results */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[150px]">
              {searchResults.length > 0 ? (
                searchResults.map((track) => (
                  <div
                    key={track._id || track.providerId}
                    className="flex items-center justify-between p-2 rounded-lg bg-obsidian border border-border/60 hover:border-gold/50 transition-colors gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <img
                        src={track.thumbnail}
                        alt={track.title}
                        className="w-9 h-9 rounded object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-cream truncate">
                          {track.title}
                        </p>
                        <p className="text-[11px] text-muted truncate">
                          {track.artist}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAddTrack(track)}
                      className="text-xs shrink-0 ml-2 min-h-[36px]"
                    >
                      Add
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted text-center py-8">
                  {searching
                    ? 'Searching catalog...'
                    : 'Search for any song to queue it for the room'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
