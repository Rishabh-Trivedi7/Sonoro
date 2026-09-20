import VibePerson from './VibePerson'

/**
 * VibePeopleSection — Sonora's music compatibility social discovery.
 *
 * Emphasizes shared acoustic sensibility and music tastes that feel familiar.
 */
export default function VibePeopleSection({ people }) {
  if (!people || people.length === 0) return null

  return (
    <section aria-labelledby="vibe-people-heading">
      {/* Section Header */}
      <div className="mb-6 sm:mb-8">
        <h2
          id="vibe-people-heading"
          className="font-sans font-semibold text-2xl sm:text-3xl text-cream tracking-tight"
        >
          People you may vibe with
        </h2>
        <p className="mt-1 text-sm text-muted font-sans">
          Music tastes that feel strangely familiar.
        </p>
      </div>

      {/* People Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {people.map((person) => (
          <VibePerson key={person.id} person={person} />
        ))}
      </div>
    </section>
  )
}
