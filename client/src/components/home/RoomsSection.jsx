import RoomCard from './RoomCard'

/**
 * RoomsSection — Displays active listening spaces.
 *
 * Sonora's core differentiator: "Who do you want to listen with?"
 * Presents 3 substantial rooms that feel like places rather than cards.
 */
export default function RoomsSection({ rooms }) {
  if (!rooms || rooms.length === 0) return null

  return (
    <section aria-labelledby="rooms-heading">
      {/* Section Header */}
      <div className="mb-6 sm:mb-8">
        <h2
          id="rooms-heading"
          className="font-sans font-semibold text-2xl sm:text-3xl text-cream tracking-tight"
        >
          Your rooms
        </h2>
        <p className="mt-1 text-sm text-muted font-sans">
          Places you've been listening together.
        </p>
      </div>

      {/* Rooms Grid — 3 substantial rooms */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8">
        {rooms.map((room) => (
          <RoomCard key={room.id} room={room} />
        ))}
      </div>
    </section>
  )
}
