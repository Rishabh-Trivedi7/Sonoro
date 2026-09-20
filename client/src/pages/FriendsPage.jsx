import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageContainer from '../components/ui/PageContainer'
import SectionHeading from '../components/ui/SectionHeading'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import friendshipService from '../services/friendshipService'
import userService from '../services/userService'
import { getProfileRoute, ROUTES } from '../constants/routes'

export default function FriendsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('friends') // 'friends' | 'requests'
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [compatibilities, setCompatibilities] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Add friend / user search form
  const [addUsername, setAddUsername] = useState('')
  const [adding, setAdding] = useState(false)
  const [addMessage, setAddMessage] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [friendsData, requestsData] = await Promise.all([
        friendshipService.getFriends(),
        friendshipService.getPendingRequests(),
      ])
      setFriends(friendsData)
      setRequests(requestsData)

      // Fetch compatibility scores for friends
      const scores = {}
      await Promise.all(
        friendsData.map(async (f) => {
          const friendUser = f.friend || f.recipient || f.requester
          if (friendUser?._id) {
            try {
              const res = await friendshipService.getCompatibility(friendUser._id)
              scores[friendUser._id] = res.compatibilityScore
            } catch {
              scores[friendUser._id] = null
            }
          }
        })
      )
      setCompatibilities(scores)
    } catch (err) {
      console.error('Failed to load friends:', err)
      setError('Could not load friends list.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Live user search by username or UID
  useEffect(() => {
    const trimmed = addUsername.trim()
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await userService.searchUsers(trimmed)
        setSearchResults(results || [])
      } catch (err) {
        console.warn('User search error:', err)
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [addUsername])

  const handleSendRequestTo = async (identifier) => {
    setAdding(true)
    setAddMessage(null)
    try {
      await friendshipService.sendRequest(identifier)
      setAddMessage({ type: 'success', text: `Friend request sent to ${identifier}!` })
      setAddUsername('')
      setSearchResults([])
    } catch (err) {
      setAddMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to send friend request.',
      })
    } finally {
      setAdding(false)
    }
  }

  const handleSendRequest = async (e) => {
    e.preventDefault()
    if (!addUsername.trim()) return
    await handleSendRequestTo(addUsername.trim())
  }

  const handleRespond = async (friendshipId, action) => {
    try {
      await friendshipService.respondToRequest({ friendshipId, action })
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} request.`)
    }
  }

  const handleRemoveFriend = async (friendshipId) => {
    if (window.confirm('Are you sure you want to remove this connection?')) {
      try {
        await friendshipService.removeFriend(friendshipId)
        fetchData()
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to remove connection.')
      }
    }
  }

  return (
    <PageContainer>
      <div className="pt-6 pb-12">
        {/* Header */}
        <SectionHeading
          title="Listening Circle"
          description="Connect with friends to compare taste and tune into rooms together"
        />

        {/* User Search & Connect Bar */}
        <div className="mt-6 p-4 bg-charcoal border border-border rounded-xl relative">
          <form onSubmit={handleSendRequest} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Find listeners by username or UID (e.g. Rahul or SON-7K4P92)..."
              value={addUsername}
              onChange={(e) => setAddUsername(e.target.value)}
              className="flex-1 bg-obsidian border border-border rounded-md px-3.5 py-2 text-sm text-cream placeholder:text-muted/60 focus:outline-none focus:border-gold/70"
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={adding || !addUsername.trim()}
              className="shrink-0"
            >
              {adding ? 'Sending...' : 'Connect +'}
            </Button>
          </form>

          {/* User Search Results List */}
          {searchResults.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
              <p className="text-[11px] text-muted uppercase tracking-wider font-semibold">
                Matching Listeners ({searchResults.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
                {searchResults.map((u) => (
                  <div
                    key={u._id}
                    className="flex items-center justify-between p-2 rounded-lg bg-obsidian/60 border border-border/50 gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-elevated border border-border flex items-center justify-center font-bold text-xs text-gold shrink-0">
                        {u.avatar?.url ? (
                          <img
                            src={u.avatar.url}
                            alt={u.username}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          (u.username || 'U')[0].toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-cream truncate">
                            {u.username}
                          </span>
                          {u.uid && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-gold/15 text-gold border border-gold/20 shrink-0">
                              {u.uid}
                            </span>
                          )}
                        </div>
                        {u.bio && (
                          <p className="text-[10px] text-muted truncate">{u.bio}</p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSendRequestTo(u.username)}
                      className="px-2.5 py-1 text-[11px] rounded bg-gold/15 text-gold hover:bg-gold hover:text-obsidian transition-colors shrink-0 font-medium"
                    >
                      Connect
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searching && (
            <p className="text-[11px] text-gold/80 mt-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-ping" />
              Searching listeners by name or UID...
            </p>
          )}

          {addMessage && (
            <p
              className={`text-xs mt-2.5 ${
                addMessage.type === 'success' ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {addMessage.text}
            </p>
          )}
        </div>

        {/* Tabs: Friends vs Pending Requests */}
        <div className="mt-8 flex items-center gap-4 border-b border-border pb-2">
          <button
            onClick={() => setActiveTab('friends')}
            className={[
              'text-sm font-medium pb-2 -mb-2.5 transition-colors relative',
              activeTab === 'friends'
                ? 'text-gold border-b-2 border-gold font-semibold'
                : 'text-muted hover:text-cream',
            ].join(' ')}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={[
              'text-sm font-medium pb-2 -mb-2.5 transition-colors relative flex items-center gap-1.5',
              activeTab === 'requests'
                ? 'text-gold border-b-2 border-gold font-semibold'
                : 'text-muted hover:text-cream',
            ].join(' ')}
          >
            <span>Requests</span>
            {requests.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-gold text-obsidian text-[10px] font-bold flex items-center justify-center">
                {requests.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-12 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-16 bg-charcoal/50 border border-border/40 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : activeTab === 'friends' ? (
          /* Friends List */
          friends.length > 0 ? (
            <div className="mt-6 space-y-3">
              {friends.map((friendship) => {
                const friend = friendship.friend || friendship.recipient || friendship.requester
                const score = friend?._id ? compatibilities[friend._id] : null

                return (
                  <div
                    key={friendship._id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-charcoal border border-border rounded-xl gap-4 hover:border-gold/30 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-elevated border border-border flex items-center justify-center overflow-hidden text-sm font-bold text-gold shrink-0">
                        {friend?.avatar?.url ? (
                          <img
                            src={friend.avatar.url}
                            alt={friend.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (friend?.username || 'U')[0].toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0">
                        <Link
                          to={getProfileRoute(friend?.username)}
                          className="font-medium text-cream text-sm hover:text-gold transition-colors truncate block"
                        >
                          {friend?.username}
                        </Link>
                        <p className="text-xs text-muted truncate">
                          {friend?.bio || 'Sonora listener'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                      {/* Music Compatibility score badge */}
                      {score !== null && score !== undefined && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-gold/10 border border-gold/20 text-gold text-xs font-mono">
                          <span>♫</span>
                          <span>{score}% taste match</span>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(ROUTES.ROOMS)}
                        className="text-xs"
                      >
                        Vibe Together
                      </Button>

                      <button
                        onClick={() => handleRemoveFriend(friendship._id)}
                        className="p-1.5 text-muted hover:text-red-400 transition-colors text-xs"
                        title="Disconnect"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mt-12 text-center py-16 bg-charcoal/30 border border-dashed border-border rounded-xl">
              <p className="font-display text-base text-cream">No connections yet</p>
              <p className="text-xs text-muted max-w-sm mx-auto mt-1 mb-4">
                Sonora is better together. Search a username above to invite a friend into your listening circle.
              </p>
            </div>
          )
        ) : (
          /* Pending Requests */
          requests.length > 0 ? (
            <div className="mt-6 space-y-3">
              {requests.map((req) => (
                <div
                  key={req._id}
                  className="flex items-center justify-between p-4 bg-charcoal border border-border rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-elevated border border-border flex items-center justify-center font-bold text-gold text-sm">
                      {(req.requester?.username || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-cream">
                        {req.requester?.username}
                      </p>
                      <p className="text-xs text-muted">Sent you a connection request</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleRespond(req._id, 'accept')}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRespond(req._id, 'reject')}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-12 text-center py-16 bg-charcoal/30 border border-dashed border-border rounded-xl">
              <p className="font-display text-base text-cream">No pending requests</p>
              <p className="text-xs text-muted mt-1">
                You're all caught up with your invites.
              </p>
            </div>
          )
        )}
      </div>
    </PageContainer>
  )
}
