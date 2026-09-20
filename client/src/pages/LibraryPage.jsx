import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageContainer from '../components/ui/PageContainer'
import SectionHeading from '../components/ui/SectionHeading'
import Button from '../components/ui/Button'
import historyService from '../services/historyService'
import roomService from '../services/roomService'
import { getRoomRoute, ROUTES } from '../constants/routes'

export default function LibraryPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('history') // 'history' | 'rooms'
  const [history, setHistory] = useState([])
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    setLoading(true)

    const fetchLibraryData = async () => {
      try {
        const [histData, roomData] = await Promise.all([
          historyService.getHistory(),
          roomService.getUserRooms(),
        ])
        if (isMounted) {
          setHistory(histData)
          setRooms(roomData)
        }
      } catch (err) {
        console.error('Failed to load library:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchLibraryData()
    return () => {
      isMounted = false
    }
  }, [])

  const handleStartRoom = async (track) => {
    try {
      const newRoom = await roomService.createRoom({
        name: `${track.title.slice(0, 30)} Lounge`,
        currentTrack: track,
      })
      navigate(getRoomRoute(newRoom._id))
    } catch (err) {
      alert('Could not start room.')
    }
  }

  return (
    <PageContainer>
      <div className="pt-6 pb-16">
        <SectionHeading
          title="Personal Archive"
          description="Your complete acoustic journey and hosted listening rooms"
        />

        {/* Tabs */}
        <div className="mt-8 flex items-center gap-6 border-b border-border pb-2">
          <button
            onClick={() => setActiveTab('history')}
            className={[
              'text-sm font-medium pb-2 -mb-2.5 transition-colors relative',
              activeTab === 'history'
                ? 'text-gold border-b-2 border-gold font-semibold'
                : 'text-muted hover:text-cream',
            ].join(' ')}
          >
            Listening History ({history.length})
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={[
              'text-sm font-medium pb-2 -mb-2.5 transition-colors relative',
              activeTab === 'rooms'
                ? 'text-gold border-b-2 border-gold font-semibold'
                : 'text-muted hover:text-cream',
            ].join(' ')}
          >
            My Rooms ({rooms.length})
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-12 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 bg-charcoal/50 border border-border/40 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : activeTab === 'history' ? (
          history.length > 0 ? (
            <div className="mt-6 space-y-2.5">
              {history.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between p-3.5 bg-charcoal border border-border rounded-xl hover:border-gold/30 transition-colors gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={
                        item.thumbnail ||
                        `https://img.youtube.com/vi/${item.providerId}/hqdefault.jpg`
                      }
                      alt={item.title}
                      className="w-12 h-12 rounded object-cover shrink-0 bg-obsidian"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-cream truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {item.artist} •{' '}
                        <span className="text-muted/60">
                          {new Date(item.listenedAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStartRoom(item)}
                    className="text-xs shrink-0"
                  >
                    Start Room →
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-12 text-center py-16 bg-charcoal/30 border border-dashed border-border rounded-xl">
              <p className="font-display text-base text-cream">No history recorded</p>
              <p className="text-xs text-muted max-w-sm mx-auto mt-1 mb-5">
                Join a room or play a track from Discover to start building your listening archive.
              </p>
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate(ROUTES.DISCOVER)}
              >
                Discover Music
              </Button>
            </div>
          )
        ) : (
          /* My Rooms */
          rooms.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {rooms.map((room) => (
                <div
                  key={room._id}
                  className="bg-charcoal border border-border rounded-xl p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span
                        className={[
                          'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                          room.status === 'active'
                            ? 'bg-green-950/60 text-green-400 border border-green-800/40'
                            : 'bg-muted/10 text-muted border border-border',
                        ].join(' ')}
                      >
                        {room.status}
                      </span>
                      <span className="text-muted text-[11px]">
                        {new Date(room.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="font-display text-base text-cream font-semibold truncate">
                      {room.name}
                    </h3>
                    <p className="text-xs text-muted mt-1 truncate">
                      {room.currentTrack?.title
                        ? `Last track: ${room.currentTrack.title}`
                        : 'No track played'}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/70 flex justify-end">
                    {room.status === 'active' ? (
                      <Link to={getRoomRoute(room._id)}>
                        <Button variant="primary" size="sm" className="text-xs">
                          Enter Lounge →
                        </Button>
                      </Link>
                    ) : (
                      <span className="text-xs text-muted/60 italic">Session ended</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-12 text-center py-16 bg-charcoal/30 border border-dashed border-border rounded-xl">
              <p className="font-display text-base text-cream">No rooms hosted yet</p>
              <p className="text-xs text-muted max-w-sm mx-auto mt-1 mb-5">
                Host your first social listening room and play soundscapes with your friends.
              </p>
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate(ROUTES.ROOMS)}
              >
                Host a Room
              </Button>
            </div>
          )
        )}
      </div>
    </PageContainer>
  )
}
