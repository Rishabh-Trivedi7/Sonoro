import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import {
  HomeHero,
  RoomsSection,
  VibePeopleSection,
  ListeningSection,
} from '../components/home'
import {
  MOCK_ROOMS,
  MOCK_VIBE_PEOPLE,
  MOCK_RECENT_LISTENING,
} from '../constants/mockHomeData'
import roomService from '../services/roomService'
import historyService from '../services/historyService'
import friendshipService from '../services/friendshipService'
import { useAuth } from '../hooks/useAuth'
import { getRoomRoute, ROUTES } from '../constants/routes'

export default function HomePage() {
  const { isAuthenticated } = useAuth()
  const currentRoom = useSelector((state) => state.room?.currentRoom)
  const isPlaybackPlaying = useSelector((state) => state.playback?.isPlaying)

  const [activeRooms, setActiveRooms] = useState([])
  const [recentListening, setRecentListening] = useState([])
  const [vibeFriends, setVibeFriends] = useState([])

  useEffect(() => {
    let isMounted = true

    const loadRealHomeData = async () => {
      try {
        const roomsData = await roomService.getActiveRooms()
        if (isMounted && roomsData?.length > 0) {
          const mappedRooms = roomsData.slice(0, 6).map((r) => ({
            id: r._id,
            _id: r._id,
            name: r.name,
            currentTrack: r.currentTrack ? `${r.currentTrack.title} — ${r.currentTrack.artist}` : 'Lounge session',
            artwork: r.currentTrack?.thumbnail || `https://img.youtube.com/vi/${r.currentTrack?.providerId}/hqdefault.jpg`,
            listenersCount: 1,
            tag: 'Live Session',
          }))
          setActiveRooms(mappedRooms)
        }
      } catch (err) {
        // Fallback to curated mock data
      }

      if (isAuthenticated) {
        try {
          const [hist, friends] = await Promise.all([
            historyService.getHistory().catch(() => []),
            friendshipService.getFriends().catch(() => []),
          ])

          if (isMounted && hist?.length > 0) {
            const mappedHist = hist.slice(0, 5).map((h) => ({
              id: h._id,
              title: h.title,
              artist: h.artist,
              artwork: h.thumbnail,
              duration: h.duration,
              listenedAgo: 'Recent',
            }))
            setRecentListening(mappedHist)
          }

          if (isMounted && friends?.length > 0) {
            const mappedPeople = friends.slice(0, 4).map((f) => {
              const friendUser = f.friend || f.recipient || f.requester
              return {
                id: friendUser?._id,
                name: friendUser?.username,
                avatar: friendUser?.avatar?.url,
                compatibility: 85,
                sharedArtists: ['Indie', 'Acoustic'],
                currentlyListening: 'Listening to Sonora',
              }
            })
            setVibeFriends(mappedPeople)
          }
        } catch {
          // Keep mock fallbacks
        }
      }
    }

    loadRealHomeData()
    return () => {
      isMounted = false
    }
  }, [isAuthenticated])

  const roomsToDisplay = activeRooms.length > 0 ? activeRooms : MOCK_ROOMS
  const listeningToDisplay = recentListening.length > 0 ? recentListening : MOCK_RECENT_LISTENING
  const peopleToDisplay = vibeFriends.length > 0 ? vibeFriends : MOCK_VIBE_PEOPLE

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 flex flex-col space-y-12 sm:space-y-16 lg:space-y-24">
      {/* 1. Active Listening Session (Shown when currently tuned into a lounge) */}
      {currentRoom && (
        <section
          aria-label="Current Listening Session"
          className="order-1 bg-charcoal border border-gold/40 rounded-xl p-4 sm:p-6 shadow-xl relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-elevated border border-gold/30 shrink-0 relative">
                {currentRoom.currentTrack?.thumbnail && (
                  <img
                    src={currentRoom.currentTrack.thumbnail}
                    alt={currentRoom.currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                )}
                {isPlaybackPlaying && (
                  <div className="absolute inset-0 bg-obsidian/40 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-gold animate-ping" />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gold/15 text-gold border border-gold/30">
                    Active Lounge
                  </span>
                  <span className="text-xs text-muted">
                    {isPlaybackPlaying ? 'Playing Now' : 'Session Paused'}
                  </span>
                </div>
                <h3 className="font-display text-base sm:text-lg text-cream font-semibold truncate">
                  {currentRoom.name}
                </h3>
                <p className="text-xs text-muted truncate">
                  {currentRoom.currentTrack?.title ? `${currentRoom.currentTrack.title} — ${currentRoom.currentTrack.artist}` : 'Communal listening session'}
                </p>
              </div>
            </div>

            <Link
              to={getRoomRoute(currentRoom._id)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gold text-obsidian rounded-lg text-xs font-semibold hover:bg-gold/85 transition-colors self-start sm:self-auto min-h-[40px] shrink-0"
            >
              <span>Return to Room</span>
              <span>→</span>
            </Link>
          </div>
        </section>
      )}

      {/* Discovery Hero Search (Order 5 on mobile, Order 1 on desktop) */}
      <div className="order-5 md:order-1">
        <HomeHero />
      </div>

      {/* Friends Listening (Order 2 on mobile, Order 3 on desktop) */}
      <div className="order-2 md:order-3">
        <VibePeopleSection people={peopleToDisplay} />
      </div>

      {/* Active Rooms (Order 3 on mobile, Order 2 on desktop) */}
      <div className="order-3 md:order-2">
        <RoomsSection rooms={roomsToDisplay} />
      </div>

      {/* Recently Listened (Order 4 on mobile, Order 4 on desktop) */}
      <div className="order-4 md:order-4">
        <ListeningSection tracks={listeningToDisplay} />
      </div>
    </div>
  )
}
