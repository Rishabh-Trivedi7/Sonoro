import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageContainer from '../components/ui/PageContainer'
import SectionHeading from '../components/ui/SectionHeading'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import roomService from '../services/roomService'
import searchService from '../services/searchService'
import { getRoomRoute, ROUTES } from '../constants/routes'

export default function RoomsPage() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Room Search state (by name or RID)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [joiningRequests, setJoiningRequests] = useState({}) // roomId -> 'pending' | 'success'

  // Create room modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [roomType, setRoomType] = useState('public') // 'public' | 'private'
  const [catalogTracks, setCatalogTracks] = useState([])
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [creating, setCreating] = useState(false)
  const [songSearchQuery, setSongSearchQuery] = useState('')
  const [songSearchResults, setSongSearchResults] = useState([])
  const [searchingSong, setSearchingSong] = useState(false)

  const fetchRooms = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await roomService.getActiveRooms()
      setRooms(data)
    } catch (err) {
      console.error('Failed to fetch rooms:', err)
      setError('Unable to load active rooms. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRooms()
  }, [])

  // Room search handler
  const handleRoomSearch = async (e) => {
    if (e) e.preventDefault()
    const trimmed = searchQuery.trim()
    if (!trimmed) {
      setSearchResults(null)
      return
    }

    setSearching(true)
    try {
      const results = await roomService.searchRooms(trimmed)
      setSearchResults(results || [])
    } catch (err) {
      console.error('Room search failed:', err)
    } finally {
      setSearching(false)
    }
  }

  const handleRequestJoin = async (roomId) => {
    try {
      setJoiningRequests((prev) => ({ ...prev, [roomId]: 'sending' }))
      await roomService.requestJoin(roomId)
      // Mark as pending — host is notified via real-time socket, no alert needed
      setJoiningRequests((prev) => ({ ...prev, [roomId]: 'pending' }))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send join request.')
      setJoiningRequests((prev) => ({ ...prev, [roomId]: 'error' }))
    }
  }

  const handleSongSearch = async (e) => {
    if (e) e.preventDefault()
    const query = songSearchQuery.trim()
    if (!query) return
    setSearchingSong(true)
    try {
      const results = await searchService.searchTracks(query)
      setSongSearchResults(results || [])
      if (results && results.length > 0) {
        setSelectedTrack(results[0])
      }
    } catch (err) {
      console.error('Song search failed in room creation:', err)
    } finally {
      setSearchingSong(false)
    }
  }

  const openCreateModal = async () => {
    setIsCreateOpen(true)
    setRoomType('public')
    setSongSearchQuery('')
    setSongSearchResults([])
    if (catalogTracks.length === 0) {
      try {
        const tracks = await searchService.searchTracks('')
        setCatalogTracks(tracks)
        if (tracks.length > 0) setSelectedTrack(tracks[0])
      } catch (err) {
        console.warn('Could not load tracks for room creation:', err)
      }
    }
  }

  const handleCreateRoom = async (e) => {
    e.preventDefault()
    if (!roomName.trim()) return

    setCreating(true)
    try {
      const newRoom = await roomService.createRoom({
        name: roomName.trim(),
        currentTrack: selectedTrack || undefined,
        roomType,
      })
      navigate(getRoomRoute(newRoom._id))
    } catch (err) {
      console.error('Failed to create room:', err)
      alert(err.response?.data?.message || 'Could not create room.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <PageContainer>
      <div className="pt-6 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <SectionHeading
            title="Listening Rooms"
            description="Drop in on active social sessions or host your own soundscape"
          />
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setSearchResults(null)
                setSearchQuery('')
                fetchRooms()
              }}
              className="text-xs"
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={openCreateModal}
            >
              + Create Room
            </Button>
          </div>
        </div>

        {/* Room Search Bar (Name or RID) */}
        <div className="mb-8 p-4 bg-charcoal border border-border rounded-xl">
          <form onSubmit={handleRoomSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search rooms by Name or RID (e.g. Midnight Acoustics or RM-8F3K21)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (!e.target.value.trim()) setSearchResults(null)
                }}
                className="w-full bg-obsidian border border-border rounded-md pl-10 pr-10 py-2.5 text-sm text-cream placeholder:text-muted/60 focus:outline-none focus:border-gold/70"
              />
              <svg
                className="absolute left-3.5 top-3 w-4 h-4 text-muted/70"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setSearchResults(null)
                  }}
                  className="absolute right-3.5 top-3 text-muted hover:text-cream text-xs"
                >
                  ✕
                </button>
              )}
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={searching}
              className="shrink-0"
            >
              {searching ? 'Searching...' : 'Search Rooms'}
            </Button>
          </form>
        </div>

        {error && (
          <div className="p-4 bg-red-950/30 border border-red-800/50 rounded-lg text-red-300 text-sm mb-6 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={fetchRooms} className="text-xs text-cream hover:underline">
              Retry
            </button>
          </div>
        )}

        {/* Search Results Display (if active search) */}
        {searchResults !== null && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg text-cream font-semibold">
                Search Results ({searchResults.length})
              </h3>
              <button
                onClick={() => {
                  setSearchResults(null)
                  setSearchQuery('')
                }}
                className="text-xs text-muted hover:text-cream"
              >
                Clear Results
              </button>
            </div>

            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {searchResults.map((room) => {
                  const track = room.currentTrack
                  const isPrivate = room.roomType === 'private'
                  const canEnter = !isPrivate || room.isHost || room.userRequestStatus === 'accepted'
                  const isPending =
                    joiningRequests[room._id] === 'pending' || room.userRequestStatus === 'pending'
                  const isSending = joiningRequests[room._id] === 'sending'

                  return (
                    <div
                      key={room._id}
                      className="group bg-charcoal border border-border rounded-xl p-5 flex flex-col justify-between hover:border-gold/40 transition-all duration-200 shadow-md hover:shadow-gold/5"
                    >
                      <div>
                        {/* Top Bar: Room Type & Host */}
                        <div className="flex items-center justify-between text-xs text-muted mb-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={[
                                'px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider',
                                isPrivate
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  : 'bg-green-500/15 text-green-400 border border-green-500/30',
                              ].join(' ')}
                            >
                              {isPrivate ? 'Private Room' : 'Public Lounge'}
                            </span>
                            {room.rid && (
                              <span className="font-mono text-[10px] text-gold/90 px-1.5 py-0.5 rounded bg-elevated border border-border/70">
                                {room.rid}
                              </span>
                            )}
                          </div>
                          <span className="truncate max-w-[120px]">
                            by {room.host?.username || 'Host'}
                          </span>
                        </div>

                        {/* Room Name */}
                        <h3 className="font-display text-lg text-cream font-semibold line-clamp-1 group-hover:text-gold transition-colors">
                          {room.name}
                        </h3>

                        {/* Track Preview */}
                        {track ? (
                          <div className="mt-3.5 flex items-center gap-3 p-2 rounded-lg bg-obsidian/60 border border-border/40">
                            <img
                              src={
                                track.thumbnail ||
                                `https://img.youtube.com/vi/${track.providerId}/hqdefault.jpg`
                              }
                              alt={track.title}
                              className="w-12 h-12 rounded object-cover shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-cream truncate">
                                {track.title}
                              </p>
                              <p className="text-[11px] text-muted truncate">
                                {track.artist}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3.5 p-3 rounded-lg bg-obsidian/40 border border-border/40 text-xs text-muted/60 text-center">
                            Selecting track...
                          </div>
                        )}
                      </div>

                      {/* Bottom Action */}
                      <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between">
                        <span className="text-xs text-muted">
                          {room.queue?.length || 0} in queue
                        </span>

                        {canEnter ? (
                          <Link to={getRoomRoute(room._id)}>
                            <Button variant="primary" size="sm" className="text-xs">
                              {room.isHost ? 'Enter as Host →' : 'Join Room →'}
                            </Button>
                          </Link>
                        ) : isPending ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            className="text-xs border-amber-500/40 text-amber-400 bg-amber-500/10 cursor-not-allowed"
                          >
                            Request Pending
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={isSending}
                            onClick={() => handleRequestJoin(room._id)}
                            className="text-xs"
                          >
                            {isSending ? 'Sending...' : 'Request to Join'}
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-charcoal/20 border border-dashed border-border rounded-xl">
                <p className="font-display text-base text-cream">No rooms matched "{searchQuery}"</p>
                <p className="text-xs text-muted mt-1">
                  Try searching with a different room name or Sonora RID.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Normal Directory Rooms Header */}
        {searchResults === null && (
          <>
            {/* Rooms Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-charcoal/50 border border-border/40 rounded-xl p-5 animate-pulse space-y-3"
                  >
                    <div className="h-5 bg-elevated rounded w-2/3" />
                    <div className="h-4 bg-elevated/70 rounded w-1/2" />
                    <div className="aspect-video bg-elevated/40 rounded-lg mt-3" />
                  </div>
                ))}
              </div>
            ) : rooms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {rooms.map((room) => {
                  const track = room.currentTrack
                  return (
                    <div
                      key={room._id}
                      className="group bg-charcoal border border-border rounded-xl p-5 flex flex-col justify-between hover:border-gold/40 transition-all duration-200 shadow-md hover:shadow-gold/5"
                    >
                      <div>
                        {/* Top Bar: Live Status, RID & Host */}
                        <div className="flex items-center justify-between text-xs text-muted mb-3">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 text-cream font-medium">
                              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                              Live Lounge
                            </span>
                            {room.rid && (
                              <span className="font-mono text-[10px] text-gold/90 px-1.5 py-0.5 rounded bg-elevated border border-border/70">
                                {room.rid}
                              </span>
                            )}
                          </div>
                          <span className="truncate max-w-[120px]">
                            by {room.host?.username || 'Host'}
                          </span>
                        </div>

                        {/* Room Name */}
                        <h3 className="font-display text-lg text-cream font-semibold line-clamp-1 group-hover:text-gold transition-colors">
                          {room.name}
                        </h3>

                        {/* Track Preview */}
                        {track ? (
                          <div className="mt-3.5 flex items-center gap-3 p-2 rounded-lg bg-obsidian/60 border border-border/40">
                            <img
                              src={
                                track.thumbnail ||
                                `https://img.youtube.com/vi/${track.providerId}/hqdefault.jpg`
                              }
                              alt={track.title}
                              className="w-12 h-12 rounded object-cover shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-cream truncate">
                                {track.title}
                              </p>
                              <p className="text-[11px] text-muted truncate">
                                {track.artist}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3.5 p-3 rounded-lg bg-obsidian/40 border border-border/40 text-xs text-muted/60 text-center">
                            Selecting track...
                          </div>
                        )}
                      </div>

                      {/* Bottom Action */}
                      <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between">
                        <span className="text-xs text-muted">
                          {room.queue?.length || 0} in queue
                        </span>
                        <Link to={getRoomRoute(room._id)}>
                          <Button variant="primary" size="sm" className="text-xs">
                            Join Room →
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Empty state */
              <div className="text-center py-20 bg-charcoal/20 border border-dashed border-border rounded-xl">
                <div className="w-12 h-12 rounded-full bg-elevated text-gold flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                </div>
                <h3 className="font-display text-lg text-cream font-medium">
                  No Active Rooms
                </h3>
                <p className="text-xs text-muted max-w-sm mx-auto mt-1 mb-6">
                  The lounge is quiet right now. Start a room and invite your friends to listen along in sync.
                </p>
                <Button variant="primary" size="md" onClick={openCreateModal}>
                  Start a Room Now
                </Button>
              </div>
            )}
          </>
        )}

        {/* Create Room Modal */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian/85 backdrop-blur-sm">
            <div className="bg-charcoal border border-border rounded-xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg text-cream font-semibold">
                  Create a Listening Lounge
                </h3>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="text-muted hover:text-cream p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateRoom} className="space-y-4">
                <Input
                  id="modalRoomName"
                  label="Room Name"
                  placeholder="Midnight Acoustics, Indie Vibes..."
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  required
                />

                {/* Public vs Private Room Selector */}
                <div>
                  <label className="text-xs font-sans font-medium text-muted uppercase tracking-wider block mb-2">
                    Room Visibility & Access
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRoomType('public')}
                      className={[
                        'p-2.5 rounded-lg border text-left transition-colors cursor-pointer',
                        roomType === 'public'
                          ? 'bg-gold/15 border-gold/70 text-cream'
                          : 'bg-obsidian/60 border-border text-muted hover:border-muted/50',
                      ].join(' ')}
                    >
                      <span className="block text-xs font-semibold text-gold">Public Room</span>
                      <span className="block text-[10px] text-muted mt-0.5 leading-tight">
                        Visible in lounge directory. Anyone can join.
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoomType('private')}
                      className={[
                        'p-2.5 rounded-lg border text-left transition-colors cursor-pointer',
                        roomType === 'private'
                          ? 'bg-gold/15 border-gold/70 text-cream'
                          : 'bg-obsidian/60 border-border text-muted hover:border-muted/50',
                      ].join(' ')}
                    >
                      <span className="block text-xs font-semibold text-gold">Private Room</span>
                      <span className="block text-[10px] text-muted mt-0.5 leading-tight">
                        Hidden from directory. Requires host approval or RID to join.
                      </span>
                    </button>
                  </div>
                </div>

                {/* Starting Song Selection */}
                <div>
                  <label className="text-xs font-sans font-medium text-muted uppercase tracking-wider block mb-2">
                    Select Opening Track
                  </label>

                  {/* Search any song */}
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={songSearchQuery}
                      onChange={(e) => setSongSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleSongSearch(e)
                        }
                      }}
                      placeholder="Search any song, artist..."
                      className="flex-1 bg-obsidian/80 border border-border rounded-lg px-3 py-1.5 text-xs text-cream placeholder:text-muted/60 focus:outline-none focus:border-gold/60"
                    />
                    <button
                      type="button"
                      onClick={handleSongSearch}
                      disabled={searchingSong || !songSearchQuery.trim()}
                      className="px-3 py-1.5 bg-gold/15 hover:bg-gold/25 border border-gold/40 text-gold text-xs font-medium rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {searchingSong ? 'Searching...' : 'Search'}
                    </button>
                  </div>

                  {selectedTrack && (
                    <div className="mb-2 p-2 bg-gold/10 border border-gold/40 rounded-lg flex items-center gap-2.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-gold px-1.5 py-0.5 bg-gold/20 rounded">
                        Selected
                      </span>
                      <img
                        src={selectedTrack.thumbnail}
                        alt={selectedTrack.title}
                        className="w-7 h-7 rounded object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-cream truncate">
                          {selectedTrack.title}
                        </p>
                        <p className="text-[10px] text-muted truncate">
                          {selectedTrack.artist}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="max-h-40 overflow-y-auto space-y-1.5 border border-border rounded-lg p-2 bg-obsidian/60">
                    {(songSearchResults.length > 0 ? songSearchResults : catalogTracks).length === 0 ? (
                      <div className="text-center py-4 text-xs text-muted">
                        {searchingSong ? 'Searching songs...' : 'Type a song name above and click Search'}
                      </div>
                    ) : (
                      (songSearchResults.length > 0 ? songSearchResults : catalogTracks).map((tr) => {
                        const isSelected =
                          (selectedTrack?.providerId && tr.providerId && selectedTrack.providerId === tr.providerId) ||
                          (selectedTrack?._id && tr._id && selectedTrack._id === tr._id) ||
                          (selectedTrack?.title === tr.title && selectedTrack?.artist === tr.artist)
                        return (
                          <div
                            key={tr.providerId || tr._id || tr.title}
                            onClick={() => setSelectedTrack(tr)}
                            className={[
                              'flex items-center gap-2.5 p-1.5 rounded cursor-pointer transition-colors',
                              isSelected
                                ? 'bg-gold/20 border border-gold/50'
                                : 'hover:bg-elevated border border-transparent',
                            ].join(' ')}
                          >
                            <img
                              src={tr.thumbnail}
                              alt={tr.title}
                              className="w-8 h-8 rounded object-cover shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-cream truncate">
                                {tr.title}
                              </p>
                              <p className="text-[11px] text-muted truncate">
                                {tr.artist}
                              </p>
                            </div>
                            {isSelected && (
                              <span className="text-gold text-xs font-bold pr-1">✓</span>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={creating || !roomName.trim()}
                  >
                    {creating ? 'Launching...' : 'Create & Enter'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
