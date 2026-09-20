import { useState } from 'react'

/**
 * ListeningItem — Compact recently heard track row.
 *
 * Intentionally quieter visual weight than rooms or vibe people.
 * Provides personal context without distracting from shared listening.
 */
export default function ListeningItem({ track }) {
  const [imageError, setImageError] = useState(false)

  return (
    <div className="group flex items-center gap-3.5 p-2 rounded-md hover:bg-charcoal/50 transition-colors duration-200">
      {/* Compact Track Artwork */}
      <div className="w-12 h-12 rounded-sm overflow-hidden bg-elevated border border-border shrink-0 flex items-center justify-center">
        {!imageError ? (
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
        <h4 className="font-sans font-medium text-sm text-cream truncate group-hover:text-gold transition-colors duration-200">
          {track.title}
        </h4>
        <p className="font-sans text-xs text-muted truncate mt-0.5">
          {track.artist}
        </p>
      </div>
    </div>
  )
}
