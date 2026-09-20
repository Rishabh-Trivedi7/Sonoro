import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../constants/routes'
import { formatDuration } from '../discover/TrackCard'

/**
 * ListeningItem — Compact recently heard track row.
 * Includes thumbnail, title, artist, duration, and tap action without horizontal overflow.
 */
export default function ListeningItem({ track }) {
  const [imageError, setImageError] = useState(false)

  const durationLabel =
    track.duration && !isNaN(track.duration)
      ? formatDuration(track.duration)
      : track.listenedAgo || ''

  return (
    <div className="group flex items-center justify-between gap-3 p-2.5 rounded-lg bg-charcoal/30 hover:bg-charcoal/60 border border-border/40 hover:border-border transition-all duration-200">
      {/* Left: Thumbnail + Title/Artist info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Compact Track Artwork */}
        <div className="w-12 h-12 rounded-md overflow-hidden bg-elevated border border-border shrink-0 flex items-center justify-center">
          {!imageError && track.artwork ? (
            <img
              src={track.artwork}
              alt={`${track.title} artwork`}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              onError={() => setImageError(true)}
            />
          ) : (
            <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a.75.75 0 0 0 .552-.72v-1.89m-9 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66A.75.75 0 0 0 9 14.803V9.75" />
            </svg>
          )}
        </div>

        {/* Track Details */}
        <div className="min-w-0 flex-1">
          <h4 className="font-sans font-medium text-sm text-cream truncate group-hover:text-gold transition-colors duration-200" title={track.title}>
            {track.title}
          </h4>
          <div className="flex items-center gap-1.5 text-xs text-muted truncate mt-0.5">
            <span className="truncate">{track.artist}</span>
            {durationLabel && (
              <>
                <span className="text-border">•</span>
                <span className="text-muted/70 shrink-0 font-mono text-[11px]">{durationLabel}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: Relevant Action */}
      <Link
        to={`${ROUTES.DISCOVER}?q=${encodeURIComponent(track.title || '')}`}
        className="shrink-0 text-xs text-gold/90 hover:text-gold font-medium px-2.5 py-1.5 rounded bg-gold/10 hover:bg-gold/20 transition-colors flex items-center gap-1 min-h-[36px]"
        title="Find and play in Discover"
        aria-label={`Play ${track.title}`}
      >
        <span>▶</span>
        <span className="hidden sm:inline">Play</span>
      </Link>
    </div>
  )
}
