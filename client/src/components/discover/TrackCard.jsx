import { useState } from 'react'

export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

export default function TrackCard({
  track,
  isSelected = false,
  onSelect,
  onStartRoom,
  onPlayStandalone,
}) {
  const [imageError, setImageError] = useState(false)

  // Fallback thumbnail if YouTube hqdefault fails
  const thumbnailUrl =
    !imageError && track.thumbnail
      ? track.thumbnail
      : `https://img.youtube.com/vi/${track.providerId}/hqdefault.jpg`

  return (
    <div
      onClick={() => onSelect && onSelect(track)}
      className={[
        'group relative flex flex-col bg-charcoal/80 border rounded-lg overflow-hidden cursor-pointer transition-all duration-200',
        isSelected
          ? 'border-gold shadow-lg shadow-gold/10 ring-1 ring-gold/50'
          : 'border-border hover:border-muted/40 hover:bg-elevated/70',
      ].join(' ')}
    >
      {/* Thumbnail Aspect 16:9 */}
      <div className="relative aspect-video w-full overflow-hidden bg-obsidian/60">
        <img
          src={thumbnailUrl}
          alt={track.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setImageError(true)}
          loading="lazy"
        />

        {/* Duration badge */}
        {track.duration > 0 && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 text-[10px] font-medium tracking-wide bg-obsidian/85 backdrop-blur-xs text-cream/90 rounded">
            {formatDuration(track.duration)}
          </span>
        )}

        {/* Hover play preview overlay */}
        <div
          onClick={(e) => {
            if (onPlayStandalone) {
              e.stopPropagation()
              onPlayStandalone(track)
            }
          }}
          className="absolute inset-0 bg-obsidian/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          title="Play Standalone"
        >
          <span className="w-10 h-10 rounded-full bg-gold text-obsidian flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
            <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </div>
      </div>

      {/* Track info */}
      <div className="p-3.5 flex flex-col justify-between flex-1 gap-2">
        <div>
          <h3
            className="font-medium text-cream text-sm line-clamp-1 group-hover:text-gold transition-colors"
            title={track.title}
          >
            {track.title}
          </h3>
          <p className="text-xs text-muted line-clamp-1 mt-0.5" title={track.artist}>
            {track.artist}
          </p>
        </div>

        {/* Actions bar */}
        <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-1">
          {onPlayStandalone && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onPlayStandalone(track)
              }}
              className="text-xs text-cream/90 hover:text-gold font-medium px-2 py-1 rounded hover:bg-gold/10 transition-colors flex items-center gap-1"
              title="Listen standalone"
            >
              <span>▶</span> Play
            </button>
          )}

          {onStartRoom && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onStartRoom(track)
              }}
              className="text-xs text-gold hover:text-cream font-medium px-2 py-1 rounded hover:bg-gold/10 transition-colors ml-auto"
            >
              Start Room →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
