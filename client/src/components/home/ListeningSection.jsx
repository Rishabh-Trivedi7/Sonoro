import ListeningItem from './ListeningItem'

/**
 * ListeningSection — Quieter personal listening context.
 *
 * Placed at the bottom of the Home hierarchy to keep focus on
 * shared listening rooms and social compatibility.
 */
export default function ListeningSection({ tracks }) {
  if (!tracks || tracks.length === 0) return null

  return (
    <section aria-labelledby="listening-heading" className="pt-2">
      {/* Section Header */}
      <div className="mb-5 sm:mb-6">
        <h2
          id="listening-heading"
          className="font-sans font-semibold text-xl sm:text-2xl text-cream tracking-tight"
        >
          Your listening
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-muted font-sans">
          Recently heard
        </p>
      </div>

      {/* Tracks Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {tracks.map((track) => (
          <ListeningItem key={track.id} track={track} />
        ))}
      </div>
    </section>
  )
}
