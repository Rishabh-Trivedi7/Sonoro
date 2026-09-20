import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageContainer from '../components/ui/PageContainer'
import SectionHeading from '../components/ui/SectionHeading'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { useAuth } from '../hooks/useAuth'
import historyService from '../services/historyService'
import userService from '../services/userService'
import roomService from '../services/roomService'
import { getRoomRoute, ROUTES } from '../constants/routes'

/**
 * Format raw listening seconds into a human-readable duration (e.g., "0h 0m", "1h 24m").
 * Returns "0h 0m" when seconds is 0 or unrecorded.
 */
function formatListeningTime(seconds = 0) {
  const s = Math.round(Number(seconds))
  if (isNaN(s) || s <= 0) return '0h 0m'
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  return `${hours}h ${minutes}m`
}

export default function ProfilePage() {
  const { username: paramUsername } = useParams()
  const navigate = useNavigate()
  const { user: currentUser, logout, updateLocalUser } = useAuth()

  const isOwnProfile = !paramUsername || (currentUser && paramUsername === currentUser.username)

  const [profileUser, setProfileUser] = useState(isOwnProfile ? currentUser : null)
  const [dna, setDna] = useState(null)
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState({
    songsListened: 0,
    totalListeningTime: 0,
    friendsCount: 0,
    roomsJoined: 0,
    roomsHosted: 0,
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false)
  const [bio, setBio] = useState('')
  const [username, setUsername] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)

  // UID copy state — must be unconditional (Rules of Hooks)
  const [copiedUid, setCopiedUid] = useState(false)

  const loadStats = useCallback(async () => {
    if (!isOwnProfile) return
    setStatsLoading(true)
    setStatsError(false)
    try {
      const statsData = await userService.getUserStats()
      setStats({
        songsListened: Number(statsData?.songsListened) || 0,
        totalListeningTime: Number(statsData?.totalListeningTime) || 0,
        friendsCount: Number(statsData?.friendsCount) || 0,
        roomsJoined: Number(statsData?.roomsJoined) || 0,
        roomsHosted: Number(statsData?.roomsHosted) || 0,
      })
    } catch (err) {
      console.warn('Failed to load profile statistics:', err)
      setStatsError(true)
    } finally {
      setStatsLoading(false)
    }
  }, [isOwnProfile])

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setError(null)

    const loadProfile = async () => {
      try {
        let u = currentUser
        if (!isOwnProfile && paramUsername) {
          u = await userService.getUserProfile(paramUsername)
        }
        if (isMounted) {
          setProfileUser(u)
          setBio(u?.bio || '')
          setUsername(u?.username || '')
        }

        // Fetch Music DNA, listening history, and dynamic stats
        if (isOwnProfile) {
          const [dnaData, historyData] = await Promise.all([
            historyService.getMusicDNA().catch(() => null),
            historyService.getHistory().catch(() => []),
          ])
          if (isMounted) {
            if (dnaData) setDna(dnaData)
            if (historyData) setHistory(historyData)
          }
          await loadStats()
        }
      } catch (err) {
        console.error('Failed to load profile:', err)
        if (isMounted) setError('User not found or profile unavailable.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadProfile()
    return () => {
      isMounted = false
    }
  }, [paramUsername, isOwnProfile, currentUser, loadStats])

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const formData = new FormData()
      if (bio !== profileUser?.bio) formData.append('bio', bio)
      if (username !== profileUser?.username) formData.append('username', username)
      if (avatarFile) formData.append('avatar', avatarFile)

      const updated = await userService.updateProfile(formData)
      setProfileUser(updated)
      updateLocalUser(updated)
      setIsEditing(false)
      setAvatarFile(null)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleStartRoomFromHistory = async (track) => {
    try {
      const room = await roomService.createRoom({
        name: `${track.title.slice(0, 30)} Lounge`,
        currentTrack: track,
      })
      navigate(getRoomRoute(room._id))
    } catch (err) {
      alert('Could not start room.')
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-border border-t-gold animate-spin" />
          <p className="text-sm text-muted">Loading listener profile...</p>
        </div>
      </PageContainer>
    )
  }

  if (error || !profileUser) {
    return (
      <PageContainer>
        <div className="py-20 text-center">
          <h2 className="font-display text-xl text-cream font-semibold">
            {error || 'Profile Not Found'}
          </h2>
          <p className="text-xs text-muted mt-1 mb-4">
            The requested listener profile does not exist.
          </p>
          <Button variant="primary" size="sm" onClick={() => navigate(ROUTES.HOME)}>
            Return Home
          </Button>
        </div>
      </PageContainer>
    )
  }

  const displayAvatar = avatarPreview || profileUser.avatar?.url || ''

  const handleCopyUid = () => {
    if (profileUser?.uid) {
      navigator.clipboard.writeText(profileUser.uid)
      setCopiedUid(true)
      setTimeout(() => setCopiedUid(false), 2000)
    }
  }

  return (
    <PageContainer>
      <div className="pt-6 pb-16 space-y-10">
        {/* Profile Card Hero */}
        <div className="bg-charcoal border border-border rounded-xl p-4 sm:p-6 md:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gold/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Avatar with optional file picker */}
              <div className="relative group shrink-0">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-elevated border-2 border-border flex items-center justify-center text-2xl font-display font-semibold text-gold shadow-md">
                  {displayAvatar ? (
                    <img
                      src={displayAvatar}
                      alt={profileUser.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (profileUser.username || 'U')[0].toUpperCase()
                  )}
                </div>

                {isOwnProfile && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 rounded-full bg-obsidian/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-cream transition-opacity font-medium backdrop-blur-xs cursor-pointer"
                    >
                      Change
                    </button>
                  </>
                )}
              </div>

              {/* User Bio, Sonora UID, & Meta */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="font-display text-2xl md:text-3xl text-cream font-semibold">
                    {profileUser.username}
                  </h1>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/20 font-medium">
                    Listener
                  </span>
                </div>

                {/* Sonora UID Display with Copy Button */}
                {profileUser.uid && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-xs text-muted font-medium">Sonora UID</span>
                    <div className="inline-flex items-center gap-2 bg-obsidian/80 border border-border/80 px-2.5 py-1 rounded-md shadow-xs">
                      <span className="text-xs font-mono font-bold text-gold tracking-wider">
                        {profileUser.uid}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyUid}
                        className="text-[11px] font-medium text-cream/80 hover:text-gold transition-colors ml-1 px-1.5 py-0.5 rounded bg-elevated/60 hover:bg-elevated cursor-pointer"
                        title="Copy public Sonora UID"
                      >
                        {copiedUid ? (
                          <span className="text-emerald-400 font-medium flex items-center gap-1">
                            ✓ Copied
                          </span>
                        ) : (
                          'Copy'
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-sm text-muted max-w-md pt-0.5">
                  {profileUser.bio || 'Curating moods and sharing quiet moments through sound.'}
                </p>

                {isOwnProfile && (
                  <p className="text-xs text-muted/60 font-mono">
                    {profileUser.email}
                  </p>
                )}
              </div>
            </div>

            {/* Profile Action Buttons */}
            {isOwnProfile && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto mt-2 sm:mt-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="min-h-[36px]"
                >
                  {isEditing ? 'Close Edit' : 'Edit Profile'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(ROUTES.SETTINGS)}
                  className="min-h-[36px]"
                >
                  Settings
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="text-red-400 hover:text-red-300 min-h-[36px] cursor-pointer"
                >
                  Sign Out
                </Button>
              </div>
            )}
          </div>

          {/* Inline Edit Form */}
          {isEditing && (
            <form
              onSubmit={handleSaveProfile}
              className="mt-6 pt-6 border-t border-border space-y-4 max-w-md"
            >
              <Input
                id="editUsername"
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                required
              />
              <Input
                id="editBio"
                label="Bio / Sonic Manifesto"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="What sounds move you?"
              />
              <div className="text-[11px] text-muted">
                To update your account email address, visit{' '}
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.SETTINGS)}
                  className="text-gold underline cursor-pointer"
                >
                  Settings → Account & Security
                </button>
                .
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" variant="primary" size="sm" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* ── Dynamic Listening Stats Section ──────────────────────── */}
        {isOwnProfile && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <SectionHeading
                title="Listening Stats"
                description="Live activity and milestones derived from your Sonora sessions"
              />
              <button
                type="button"
                onClick={loadStats}
                disabled={statsLoading}
                className="text-xs text-muted hover:text-gold transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Refresh statistics"
              >
                <span className={statsLoading ? 'animate-spin' : ''}>🔄</span>
                <span>{statsLoading ? 'Updating...' : 'Refresh'}</span>
              </button>
            </div>

            {statsError && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-md text-red-300 text-xs flex items-center justify-between">
                <span>Failed to load some activity stats. Displaying available data.</span>
                <button
                  type="button"
                  onClick={loadStats}
                  className="underline hover:text-red-200 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
              {/* 1. Songs Listened */}
              <div className="bg-charcoal border border-border rounded-xl p-3.5 sm:p-5 shadow-md flex flex-col justify-between hover:border-gold/30 transition-colors">
                <span className="text-[11px] font-medium text-muted uppercase tracking-wider">
                  Songs Listened
                </span>
                <div className="mt-3">
                  {statsLoading ? (
                    <div className="h-8 w-16 bg-elevated rounded animate-pulse" />
                  ) : (
                    <p className="font-display text-2xl sm:text-3xl text-cream font-bold">
                      {stats.songsListened}
                    </p>
                  )}
                  <p className="text-[11px] text-muted mt-0.5">Distinct tracks</p>
                </div>
              </div>

              {/* 2. Total Listening Time */}
              <div className="bg-charcoal border border-border rounded-xl p-5 shadow-md flex flex-col justify-between hover:border-gold/30 transition-colors">
                <span className="text-[11px] font-medium text-muted uppercase tracking-wider">
                  Listening Time
                </span>
                <div className="mt-3">
                  {statsLoading ? (
                    <div className="h-8 w-20 bg-elevated rounded animate-pulse" />
                  ) : (
                    <p className="font-display text-2xl sm:text-3xl text-gold font-bold">
                      {formatListeningTime(stats.totalListeningTime)}
                    </p>
                  )}
                  <p className="text-[11px] text-muted mt-0.5">Active playback</p>
                </div>
              </div>

              {/* 3. Friends */}
              <div className="bg-charcoal border border-border rounded-xl p-5 shadow-md flex flex-col justify-between hover:border-gold/30 transition-colors">
                <span className="text-[11px] font-medium text-muted uppercase tracking-wider">
                  Friends
                </span>
                <div className="mt-3">
                  {statsLoading ? (
                    <div className="h-8 w-16 bg-elevated rounded animate-pulse" />
                  ) : (
                    <p className="font-display text-2xl sm:text-3xl text-gold font-bold">
                      {stats.friendsCount}
                    </p>
                  )}
                  <p className="text-[11px] text-muted mt-0.5">Accepted connections</p>
                </div>
              </div>

              {/* 4. Rooms Joined */}
              <div className="bg-charcoal border border-border rounded-xl p-5 shadow-md flex flex-col justify-between hover:border-gold/30 transition-colors">
                <span className="text-[11px] font-medium text-muted uppercase tracking-wider">
                  Rooms Joined
                </span>
                <div className="mt-3">
                  {statsLoading ? (
                    <div className="h-8 w-16 bg-elevated rounded animate-pulse" />
                  ) : (
                    <p className="font-display text-2xl sm:text-3xl text-cream font-bold">
                      {stats.roomsJoined}
                    </p>
                  )}
                  <p className="text-[11px] text-muted mt-0.5">Community spaces</p>
                </div>
              </div>

              {/* 5. Rooms Hosted */}
              <div className="bg-charcoal border border-border rounded-xl p-5 shadow-md flex flex-col justify-between hover:border-gold/30 transition-colors">
                <span className="text-[11px] font-medium text-muted uppercase tracking-wider">
                  Rooms Hosted
                </span>
                <div className="mt-3">
                  {statsLoading ? (
                    <div className="h-8 w-16 bg-elevated rounded animate-pulse" />
                  ) : (
                    <p className="font-display text-2xl sm:text-3xl text-cream font-bold">
                      {stats.roomsHosted}
                    </p>
                  )}
                  <p className="text-[11px] text-muted mt-0.5">Curated lounges</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Music DNA Section */}
        {dna && (
          <div className="space-y-6">
            <SectionHeading
              title="Music DNA"
              description="Acoustic fingerprint aggregated from your listening sessions"
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Sonic Spectrum: Genres */}
              <div className="lg:col-span-6 bg-charcoal border border-border rounded-xl p-6 shadow-md">
                <h3 className="font-display text-base text-cream font-semibold mb-1">
                  Genre Distribution
                </h3>
                <p className="text-xs text-muted mb-5">
                  Proportion of sonic styles across your rooms and solo listens
                </p>

                {dna.genres?.length > 0 ? (
                  <div className="space-y-3.5">
                    {dna.genres.map((g) => (
                      <div key={g.name} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-cream">{g.name}</span>
                          <span className="text-muted font-mono">{g.percentage}%</span>
                        </div>
                        <div className="w-full h-2 bg-obsidian rounded-full overflow-hidden border border-border/50">
                          <div
                            className="h-full bg-gold rounded-full transition-all duration-500"
                            style={{ width: `${g.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-muted border border-dashed border-border/50 rounded-lg">
                    Listen to a few tracks to generate your genre spectrum
                  </div>
                )}
              </div>

              {/* Top Artists */}
              <div className="lg:col-span-6 bg-charcoal border border-border rounded-xl p-6 shadow-md">
                <h3 className="font-display text-base text-cream font-semibold mb-1">
                  Top Resonances
                </h3>
                <p className="text-xs text-muted mb-5">
                  Artists most frequently in rotation
                </p>

                {dna.topArtists?.length > 0 ? (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {dna.topArtists.map((item, idx) => (
                      <div
                        key={item.artist}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-obsidian/50 border border-border/50"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 text-xs text-gold font-mono font-bold text-center">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-medium text-cream">
                            {item.artist}
                          </span>
                        </div>
                        <span className="text-xs text-muted font-mono">
                          {item.count} {item.count === 1 ? 'listen' : 'listens'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-muted border border-dashed border-border/50 rounded-lg">
                    No artist data recorded yet
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recent Listening History */}
        {isOwnProfile && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <SectionHeading
                title="Recent Listening"
                description="Soundscapes you tuned into recently"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(ROUTES.LIBRARY)}
                className="text-xs"
              >
                Full Library →
              </Button>
            </div>

            {history.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {history.slice(0, 8).map((entry) => (
                  <div
                    key={entry._id}
                    className="p-3 bg-charcoal border border-border rounded-lg flex items-center gap-3 hover:border-gold/40 transition-colors group"
                  >
                    <img
                      src={
                        entry.thumbnail ||
                        `https://img.youtube.com/vi/${entry.providerId}/hqdefault.jpg`
                      }
                      alt={entry.title}
                      className="w-12 h-12 rounded object-cover shrink-0 bg-obsidian"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-cream truncate group-hover:text-gold transition-colors">
                        {entry.title}
                      </p>
                      <p className="text-[11px] text-muted truncate">
                        {entry.artist}
                      </p>
                      <button
                        onClick={() => handleStartRoomFromHistory(entry)}
                        className="text-[10px] text-gold hover:underline mt-1 block cursor-pointer"
                      >
                        Start Room →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center bg-charcoal/30 border border-dashed border-border rounded-xl">
                <p className="text-xs text-muted">
                  No listening history yet. Start or join a room to record your musical journey.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  )
}
