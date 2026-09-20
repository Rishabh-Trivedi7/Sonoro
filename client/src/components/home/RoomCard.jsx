import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getRoomRoute, ROUTES } from '../../constants/routes'

export default function RoomCard({ room }) {
  const [imageError, setImageError] = useState(false)
  const targetRoute = room._id ? getRoomRoute(room._id) : ROUTES.ROOMS

  return (
    <Link
      to={targetRoute}
      className="group flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-md"
      aria-label={`Enter listening room: ${room.name}`}
    >
      {/* 1. Primary Anchor: Square Album Artwork */}
      <div className="relative aspect-square w-full rounded-md overflow-hidden bg-charcoal border border-border transition-colors duration-200">
        {!imageError ? (
          <img
            src={room.artwork}
            alt={`${room.name} album cover`}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#181816] text-muted p-4">
            <svg className="w-12 h-12 text-[#2E2E2A] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a.75.75 0 0 0 .552-.72v-1.89m-9 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66A.75.75 0 0 0 9 14.803V9.75" />
            </svg>
            <span className="text-xs text-muted/80">{room.tag || 'Listening Room'}</span>
          </div>
        )}

        {/* Subtle dark vignette on hover to enrich depth */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-obsidian/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* 2. Room Identity & Listening Context */}
      <div className="mt-3.5 space-y-1">
        {/* Room Name */}
        <h3 className="font-sans font-medium text-base text-cream group-hover:text-gold transition-colors duration-200">
          {room.name}
        </h3>

        {/* Current Track */}
        <p className="font-sans text-sm text-muted line-clamp-1">
          {room.currentTrack}
        </p>

        {/* Listener Count */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-gold/80 animate-pulse" aria-hidden="true" />
          <span className="font-sans text-xs text-muted">
            {room.listenersCount} people listening
          </span>
        </div>

        {/* Subtle Invitation Affordance: Enter room → */}
        <div className="pt-2">
          <span className="inline-flex items-center gap-1 font-sans text-xs text-muted group-hover:text-cream transition-colors duration-200">
            Enter room
            <span className="transition-transform duration-200 ease-out group-hover:translate-x-1">
              →
            </span>
          </span>
        </div>
      </div>
    </Link>
  )
}
