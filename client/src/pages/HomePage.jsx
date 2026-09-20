import { useState, useEffect } from 'react'
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

export default function HomePage() {
  const { isAuthenticated } = useAuth()
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
    <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-12 space-y-16 sm:space-y-20 lg:space-y-24">
      {/* 1. Hero / Search */}
      <HomeHero />

      {/* 2. Your Rooms */}
      <RoomsSection rooms={roomsToDisplay} />

      {/* 3. People You May Vibe With */}
      <VibePeopleSection people={peopleToDisplay} />

      {/* 4. Your Listening */}
      <ListeningSection tracks={listeningToDisplay} />
    </div>
  )
}
