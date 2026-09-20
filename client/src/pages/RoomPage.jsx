import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import PageContainer from '../components/ui/PageContainer'
import YouTubePlayer from '../components/room/YouTubePlayer'
import MemberList from '../components/room/MemberList'
import RoomQueue from '../components/room/RoomQueue'
import RoomChat from '../components/room/RoomChat'
import Button from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'
import socketService from '../services/socketService'
import roomService from '../services/roomService'
import {
  setRoom,
  clearRoom,
  setMembers,
  setQueue,
  setMessages,
  addMessage,
  updateCurrentTrack,
} from '../store/slices/roomSlice'
import { ROUTES } from '../constants/routes'

export default function RoomPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { user } = useAuth()

  const { currentRoom, members, queue, messages } = useSelector((state) => state.room)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [accessDeniedInfo, setAccessDeniedInfo] = useState(null)
  const [requestStatus, setRequestStatus] = useState('none')
  const [authoritativePlayback, setAuthoritativePlayback] = useState(null)
  const [copiedRid, setCopiedRid] = useState(false)
  const [hostLeftMessage, setHostLeftMessage] = useState(null)

  // Host Join Requests state
  const [joinRequests, setJoinRequests] = useState([])
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false)

  const isHost = Boolean(
    user && currentRoom && (
      currentRoom.host?._id === user._id ||
      currentRoom.host === user._id
    )
  )

  const fetchJoinRequests = useCallback(async () => {
    if (!roomId) return
    try {
      const data = await roomService.getJoinRequests(roomId)
      setJoinRequests(data || [])
    } catch {
      // ignore
    }
  }, [roomId])

  // Initialize room data and socket connection
  const initRoom = useCallback(async () => {
    if (!roomId) return
    setLoading(true)
    setError(null)
    setAccessDeniedInfo(null)
    try {
      const roomData = await roomService.getRoom(roomId)
      dispatch(setRoom(roomData))
      dispatch(setQueue(roomData.queue || []))
      if (roomData.playback) {
        setAuthoritativePlayback({
          ...roomData.playback,
          receivedAt: Date.now(),
        })
      }

      // If host of private room, fetch pending join requests
      if (roomData.roomType === 'private' && (roomData.host?._id === user?._id || roomData.host === user?._id)) {
        fetchJoinRequests()
      }

      // Join room through Socket.IO
      socketService.joinRoom(roomId)
    } catch (err) {
      console.error('Failed to load room:', err)
      const errData = err.response?.data
      if (err.response?.status === 403 || errData?.errors?.isPrivate) {
        setAccessDeniedInfo(errData?.errors || { isPrivate: true })
        setRequestStatus(errData?.errors?.requestStatus || 'none')
      } else {
        setError(errData?.message || 'Room not found or no longer active.')
      }
    } finally {
      setLoading(false)
    }
  }, [roomId, dispatch, user?._id, fetchJoinRequests])

  useEffect(() => {
    initRoom()

    // Socket Event Subscriptions
    const socket = socketService.getSocket()
    if (socket) {
      const handleRoomState = ({ room, authoritativePlayback: authState, members: mList }) => {
        const now = Date.now()
        if (room) {
          dispatch(setRoom(room))
          dispatch(setQueue(room.queue || []))
        }
        if (authState) {
          setAuthoritativePlayback({ ...authState, receivedAt: now })
        } else if (room?.playback) {
          setAuthoritativePlayback({ ...room.playback, receivedAt: now })
        }
        if (mList) dispatch(setMembers(mList))
      }

      const handlePresence = (presence) => {
        dispatch(setMembers(presence))
      }

      const handleQueueUpdate = (updatedQueue) => {
        dispatch(setQueue(updatedQueue))
      }

      const handleChatHistory = (history) => {
        dispatch(setMessages(history))
      }

      const handleChatMessage = (msg) => {
        dispatch(addMessage(msg))
      }

      const handleTrackChange = ({ track }) => {
        dispatch(updateCurrentTrack(track))
      }

      const handleJoinRequestReceived = ({ request }) => {
        // Optimistically prepend the new request to state so the host
        // sees it immediately without a round-trip.
        if (request) {
          setJoinRequests((prev) => {
            // Avoid duplicates if request already present (e.g. re-request)
            const exists = prev.some((r) => r._id === request._id)
            if (exists) return prev
            return [request, ...prev]
          })
        } else {
          // Fallback: re-fetch from server
          fetchJoinRequests()
        }
      }

      const handleError = ({ message, isPrivate }) => {
        console.warn('Room socket error:', message)
        if (isPrivate) {
          setAccessDeniedInfo((prev) => prev || { isPrivate: true })
        }
      }

      const handleHostLeft = ({ message }) => {
        // Clear room Redux state immediately
        dispatch(clearRoom())
        setHostLeftMessage(message || 'Host has left the room')
        // Auto-navigate to rooms list after a brief moment so user reads the message
        setTimeout(() => {
          navigate(ROUTES.ROOMS)
        }, 2800)
      }

      // room:member_left — room:presence broadcast already updates members[]
      // via handlePresence above. This handler exists for future extensibility
      // (e.g. per-user departure toast) without polling.
      const handleMemberLeft = ({ username }) => {
        // No-op for now: presence update from handlePresence covers the member list.
        // You can add a subtle toast here if desired.
        console.debug(`[room] ${username} left the room`)
      }

      socket.on('room:state', handleRoomState)
      socket.on('room:presence', handlePresence)
      socket.on('queue:updated', handleQueueUpdate)
      socket.on('chat:history', handleChatHistory)
      socket.on('chat:message', handleChatMessage)
      socket.on('playback:change', handleTrackChange)
      socket.on('room:join_request_received', handleJoinRequestReceived)
      socket.on('room:host_left', handleHostLeft)
      socket.on('room:member_left', handleMemberLeft)
      socket.on('error', handleError)

      return () => {
        socket.off('room:state', handleRoomState)
        socket.off('room:presence', handlePresence)
        socket.off('queue:updated', handleQueueUpdate)
        socket.off('chat:history', handleChatHistory)
        socket.off('chat:message', handleChatMessage)
        socket.off('playback:change', handleTrackChange)
        socket.off('room:join_request_received', handleJoinRequestReceived)
        socket.off('room:host_left', handleHostLeft)
        socket.off('room:member_left', handleMemberLeft)
        socket.off('error', handleError)
        socketService.leaveRoom()
        dispatch(clearRoom())
      }
    }

    return () => {
      socketService.leaveRoom()
      dispatch(clearRoom())
    }
  }, [roomId, dispatch, user?._id, fetchJoinRequests])

  const handleNextTrack = useCallback(() => {
    socketService.nextQueue()
  }, [])

  const handleLeaveRoom = () => {
    socketService.leaveRoom()
    navigate(ROUTES.ROOMS)
  }

  // ── Real-time join request resolution listener ────────────────────────────────────
  // When host accepts or rejects, AppLayout dispatches sonora:join_request_resolved.
  // If accepted, immediately clear accessDeniedInfo and run initRoom to enter and play!
  useEffect(() => {
    const onResolved = (e) => {
      const { status, roomId: resRoomId, authoritativePlayback: authPlayback } = e.detail || {}
      if (resRoomId && resRoomId !== roomId && currentRoom?.rid !== resRoomId) {
        return
      }
      if (status === 'accepted') {
        setAccessDeniedInfo(null)
        setRequestStatus('accepted')
        if (authPlayback) {
          setAuthoritativePlayback({
            ...authPlayback,
            receivedAt: Date.now(),
          })
        }
        initRoom()
      } else if (status === 'rejected') {
        setRequestStatus('rejected')
      }
    }
    window.addEventListener('sonora:join_request_resolved', onResolved)
    return () => window.removeEventListener('sonora:join_request_resolved', onResolved)
  }, [roomId, initRoom, currentRoom?.rid])

  const handleEndRoom = async () => {
    if (window.confirm('Are you sure you want to end this room session for everyone?')) {
      try {
        await roomService.endRoom(roomId)
        navigate(ROUTES.ROOMS)
      } catch (err) {
        console.error('Failed to end room:', err)
      }
    }
  }

  const handleCopyRid = () => {
    if (currentRoom?.rid) {
      navigator.clipboard.writeText(currentRoom.rid)
      setCopiedRid(true)
      setTimeout(() => setCopiedRid(false), 2000)
    }
  }

  const handleSendJoinRequest = async () => {
    try {
      setRequestStatus('sending')
      await roomService.requestJoin(roomId)
      setRequestStatus('pending')
      // No alert needed — host will be notified via socket in real-time
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send request.')
      setRequestStatus('error')
    }
  }

  const handleRespondToRequest = async (requestId, action) => {
    try {
      await roomService.respondJoinRequest(roomId, requestId, action)
      setJoinRequests((prev) => prev.filter((r) => r._id !== requestId))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update request.')
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-border border-t-gold animate-spin" />
          <p className="text-sm text-muted">Entering listening lounge...</p>
        </div>
      </PageContainer>
    )
  }

  // Host-Left: shown when another user's host departure is received
  if (hostLeftMessage) {
    return (
      <PageContainer>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
          <div className="w-14 h-14 rounded-full bg-charcoal text-gold border border-border flex items-center justify-center mb-5">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
          </div>
          <h2 className="font-display text-2xl text-cream font-semibold mb-2">
            {hostLeftMessage}
          </h2>
          <p className="text-sm text-muted mb-6">
            The listening session has ended. Returning you to the rooms directory...
          </p>
          <div className="w-32 h-1 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-gold rounded-full animate-[shrink_2.8s_linear_forwards]" />
          </div>
          <button
            type="button"
            onClick={() => navigate(ROUTES.ROOMS)}
            className="mt-5 text-xs text-muted hover:text-cream underline underline-offset-2 transition-colors cursor-pointer"
          >
            Go now
          </button>
        </div>
      </PageContainer>
    )
  }

  // Access Denied for Private Room
  if (accessDeniedInfo) {
    return (
      <PageContainer>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
          <div className="w-14 h-14 rounded-full bg-amber-950/40 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-4">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="font-display text-2xl text-cream font-semibold">
            {accessDeniedInfo.roomName || 'Private Listening Lounge'}
          </h2>
          {accessDeniedInfo.rid && (
            <span className="font-mono text-xs text-gold px-2 py-0.5 rounded bg-elevated border border-border mt-1">
              {accessDeniedInfo.rid}
            </span>
          )}
          <p className="text-sm text-muted mt-3 mb-6">
            This room is private. To maintain an intimate vibe, the host must approve listeners before granting entry.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
            {requestStatus === 'pending' ? (
              <Button variant="outline" size="md" disabled className="text-xs border-amber-500/40 text-amber-400 bg-amber-500/10">
                ⏳ Request Pending Host Approval
              </Button>
            ) : requestStatus === 'rejected' ? (
              <div className="flex flex-col items-center gap-3 w-full">
                <p className="text-xs text-red-400 font-medium">Your request was declined by the host.</p>
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleSendJoinRequest}
                  disabled={requestStatus === 'sending'}
                  className="border-red-900/50 text-red-300 hover:border-red-600"
                >
                  Send Another Request
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={handleSendJoinRequest}
                disabled={requestStatus === 'sending'}
              >
                {requestStatus === 'sending' ? 'Sending Request...' : 'Request Access to Join'}
              </Button>
            )}
            <Button variant="ghost" size="md" onClick={() => navigate(ROUTES.ROOMS)}>
              Browse Rooms
            </Button>
          </div>
        </div>
      </PageContainer>
    )
  }

  if (error || !currentRoom) {
    return (
      <PageContainer>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
          <div className="w-12 h-12 rounded-full bg-red-950/40 text-red-400 flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="font-display text-xl text-cream font-semibold">
            {error || 'Room Unavailable'}
          </h2>
          <p className="text-sm text-muted max-w-sm mt-1 mb-6">
            This room may have ended or the link is invalid. Return to the lounge directory to find or start another session.
          </p>
          <Button variant="primary" size="md" onClick={() => navigate(ROUTES.ROOMS)}>
            Browse Active Rooms
          </Button>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="pt-4 pb-12 space-y-6">
        {/* Room Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
              <span className="text-xs uppercase tracking-wider text-gold font-semibold">
                Live Communal Audio
              </span>
              <span
                className={[
                  'text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded',
                  currentRoom.roomType === 'private'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'bg-green-500/15 text-green-400 border border-green-500/30',
                ].join(' ')}
              >
                {currentRoom.roomType === 'private' ? 'Private Room' : 'Public Room'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl sm:text-3xl text-cream font-semibold">
                {currentRoom.name}
              </h1>
              {currentRoom.rid && (
                <button
                  type="button"
                  onClick={handleCopyRid}
                  className="font-mono text-xs text-gold/90 px-2 py-0.5 rounded bg-elevated border border-border/80 hover:border-gold/50 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Click to copy Room RID"
                >
                  <span>RID: {currentRoom.rid}</span>
                  <span className="text-[10px] text-muted">{copiedRid ? 'Copied!' : 'Copy'}</span>
                </button>
              )}
            </div>

            <p className="text-xs text-muted mt-1">
              Host:{' '}
              <span className="text-cream font-medium">
                {currentRoom.host?.username || 'Host'}
              </span>
              {' '}• {members.length} {members.length === 1 ? 'listener' : 'listeners'} tuned in
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Host Join Requests button (Private Rooms) */}
            {isHost && currentRoom.roomType === 'private' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRequestsModalOpen(true)}
                className="text-xs border-gold/40 text-gold hover:bg-gold/10 relative"
              >
                <span>Requests</span>
                {joinRequests.length > 0 && (
                  <span className="ml-1.5 w-4 h-4 rounded-full bg-gold text-obsidian text-[10px] font-bold inline-flex items-center justify-center">
                    {joinRequests.length}
                  </span>
                )}
              </Button>
            )}

            {isHost && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEndRoom}
                className="text-xs border-red-900/50 text-red-300 hover:border-red-600 hover:bg-red-950/30"
              >
                End Session
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLeaveRoom}
              className="text-xs"
            >
              Leave Room
            </Button>
          </div>
        </div>

        {/* Primary Audio Player with authoritative join position */}
        <YouTubePlayer
          room={currentRoom}
          isHost={isHost}
          authoritativePlayback={authoritativePlayback}
          onNextTrack={handleNextTrack}
        />

        {/* Room Social Panels Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Presence + Upcoming Queue */}
          <div className="lg:col-span-7 space-y-6">
            <MemberList
              members={members}
              hostId={currentRoom.host?._id || currentRoom.host}
            />
            <RoomQueue
              queue={queue}
              isHost={isHost}
              currentUserId={user?._id}
            />
          </div>

          {/* Right Column: Room Chat */}
          <div className="lg:col-span-5">
            <RoomChat
              messages={messages}
              currentUserId={user?._id}
            />
          </div>
        </div>

        {/* Host Join Requests Modal */}
        {isRequestsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian/85 backdrop-blur-sm">
            <div className="bg-charcoal border border-border rounded-xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                <h3 className="font-display text-lg text-cream font-semibold">
                  Access Requests ({joinRequests.length})
                </h3>
                <button
                  onClick={() => setIsRequestsModalOpen(false)}
                  className="text-muted hover:text-cream p-1 text-sm"
                >
                  ✕
                </button>
              </div>

              {joinRequests.length > 0 ? (
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {joinRequests.map((req) => (
                    <div
                      key={req._id}
                      className="flex items-center justify-between p-3 rounded-lg bg-obsidian/60 border border-border"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-elevated border border-border flex items-center justify-center font-bold text-xs text-gold shrink-0">
                          {(req.requester?.username || 'U')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-cream truncate">
                              {req.requester?.username}
                            </span>
                            {req.requester?.uid && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-gold/15 text-gold border border-gold/20 shrink-0">
                                {req.requester?.uid}
                              </span>
                            )}
                          </div>
                          {req.requester?.bio && (
                            <p className="text-[10px] text-muted truncate">{req.requester.bio}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleRespondToRequest(req._id, 'accept')}
                          className="text-xs px-2.5 py-1"
                        >
                          Accept
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRespondToRequest(req._id, 'reject')}
                          className="text-xs px-2 py-1 text-red-400 hover:text-red-300"
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-cream font-medium">No pending requests</p>
                  <p className="text-xs text-muted mt-1">
                    When listeners request to join this private room, they'll appear here.
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-4 mt-4 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsRequestsModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
