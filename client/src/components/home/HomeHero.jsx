import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../constants/routes'

/**
 * HomeHero — Editorial greeting and primary search entry.
 *
 * Characteristics:
 * - "Good evening." in Playfair Display (editorial typographic presence)
 * - "What are you listening to?" in Inter muted
 * - Generous breathing space
 * - Primary search entry that supports focus, typing, and Enter navigation to /discover
 * - No fake search dropdowns or backend API calls
 */
export default function HomeHero() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`${ROUTES.DISCOVER}?q=${encodeURIComponent(query.trim())}`)
    } else {
      navigate(ROUTES.DISCOVER)
    }
  }

  return (
    <section className="pt-8 sm:pt-14 lg:pt-20 pb-4" aria-label="Hero">
      {/* Editorial Greetings */}
      <div className="space-y-2">
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-cream tracking-tight font-normal">
          Good evening.
        </h1>
        <p className="font-sans text-base sm:text-lg text-muted font-normal">
          What are you listening to?
        </p>
      </div>

      {/* Primary Search Entry */}
      <form
        onSubmit={handleSubmit}
        className="mt-6 sm:mt-8 max-w-2xl"
        role="search"
        aria-label="Music Search"
      >
        <div className="group relative flex items-center bg-charcoal border border-border hover:border-[#33332E] focus-within:border-gold/60 focus-within:ring-1 focus-within:ring-gold/40 rounded-md px-4 py-3.5 transition-all duration-200 shadow-sm">
          {/* Search Icon */}
          <svg
            className="w-5 h-5 text-muted shrink-0 mr-3.5 group-focus-within:text-gold transition-colors duration-200"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>

          {/* Search Input */}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a song, artist, album..."
            className="w-full bg-transparent text-cream placeholder-muted text-sm sm:text-base font-sans outline-none focus:outline-none"
            aria-label="Search for music"
          />

          {/* Subtle Enter key hint when typing */}
          {query.trim().length > 0 && (
            <button
              type="submit"
              className="text-xs text-muted hover:text-gold transition-colors shrink-0 px-2 py-0.5 rounded border border-border"
              aria-label="Submit search"
            >
              ↵ Enter
            </button>
          )}
        </div>
      </form>
    </section>
  )
}
