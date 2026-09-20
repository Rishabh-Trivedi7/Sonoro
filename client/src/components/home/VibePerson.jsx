import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../constants/routes'

/**
 * VibePerson — Music compatibility social identity card.
 *
 * Focuses purely on music compatibility rather than social follower metrics.
 * Uses typographic percentage with gold accent. No circular charts or progress bars.
 */
export default function VibePerson({ person }) {
  const [avatarError, setAvatarError] = useState(false)

  return (
    <Link
      to={ROUTES.PROFILE}
      className="group relative p-4 rounded-md bg-charcoal/40 hover:bg-charcoal border border-border/80 hover:border-border transition-all duration-200 flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      aria-label={`View music profile of ${person.name}, ${person.matchPercentage}% music match`}
    >
      <div>
        {/* Header: Avatar + Typographic Match % */}
        <div className="flex items-start justify-between gap-3">
          {/* Avatar */}
          <div className="w-11 h-11 rounded-full overflow-hidden bg-elevated border border-border shrink-0 flex items-center justify-center">
            {!avatarError ? (
              <img
                src={person.avatar}
                alt={`${person.name}'s avatar`}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <span className="text-sm font-medium text-gold font-sans">
                {person.name[0]}
              </span>
            )}
          </div>

          {/* Typographic Compatibility Percentage */}
          <div className="text-right">
            <span className="font-sans font-semibold text-gold text-lg leading-tight tracking-tight block group-hover:text-[#DEBC84] transition-colors duration-200">
              {person.matchPercentage}%
            </span>
            <span className="text-[11px] text-muted tracking-wide block uppercase font-sans">
              music match
            </span>
          </div>
        </div>

        {/* Person Identity */}
        <div className="mt-3.5">
          <h3 className="font-sans font-medium text-sm text-cream group-hover:text-cream transition-colors">
            {person.name}
          </h3>

          {/* Subtle Music Clue */}
          <p className="mt-1 text-xs text-muted leading-relaxed line-clamp-2">
            {person.clue}
          </p>
        </div>
      </div>
    </Link>
  )
}
