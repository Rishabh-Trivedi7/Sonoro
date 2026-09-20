import { useState } from 'react'
import { formatDuration } from './TrackCard'
import Button from '../ui/Button'
import Input from '../ui/Input'

export default function TrackDetail({
  track,
  onClose,
  onCreateRoom,
  onPlayStandalone,
  creating = false,
}) {
  const [roomName, setRoomName] = useState(
    track ? `${track.title.slice(0, 30)} Lounge` : ''
  )

  if (!track) return null

  const handleCreate = (e) => {
    e.preventDefault()
    if (!roomName.trim()) return
    onCreateRoom(roomName.trim(), track)
  }

  return (
    <div className="bg-charcoal border border-border rounded-xl p-6 shadow-xl relative overflow-hidden">
      {/* Background ambient color */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl pointer-events-none" />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-1.5 text-muted hover:text-cream rounded-md hover:bg-elevated transition-colors"
        aria-label="Close track detail"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Large Artwork */}
        <div className="w-full md:w-56 aspect-video md:aspect-square shrink-0 rounded-lg overflow-hidden bg-obsidian border border-border/70 relative">
          <img
            src={track.thumbnail || `https://img.youtube.com/vi/${track.providerId}/hqdefault.jpg`}
            alt={track.title}
            className="w-full h-full object-cover"
          />
          {track.duration > 0 && (
            <span className="absolute bottom-2 right-2 px-2 py-0.5 text-xs font-medium bg-obsidian/85 text-cream rounded">
              {formatDuration(track.duration)}
            </span>
          )}
        </div>

        {/* Track Info + Room Form */}
        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-gold/15 text-gold border border-gold/20">
              <span>Official Track</span>
            </div>

            {onPlayStandalone && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPlayStandalone(track)}
                className="text-xs border-gold/40 text-gold hover:bg-gold/10 flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>Listen Standalone</span>
              </Button>
            )}
          </div>

          <h2 className="font-display text-xl text-cream font-semibold line-clamp-2 leading-tight">
            {track.title}
          </h2>
          <p className="text-muted text-sm mt-1">{track.artist}</p>

          <form onSubmit={handleCreate} className="mt-6 pt-5 border-t border-border space-y-4">
            <Input
              id="roomName"
              label="Listening Room Name"
              type="text"
              placeholder="Give your room a vibe..."
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              required
            />

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={creating || !roomName.trim()}
                className="flex-1 sm:flex-none"
              >
                {creating ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-obsidian border-t-transparent rounded-full animate-spin" />
                    Opening Room...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                    </svg>
                    Start Room with this Track
                  </span>
                )}
              </Button>

              {onPlayStandalone && (
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => onPlayStandalone(track)}
                  className="flex-1 sm:flex-none"
                >
                  ▶ Listen Alone
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={onClose}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
