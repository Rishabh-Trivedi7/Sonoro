import { useEffect, useRef, useState, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import useYouTubePlayer from '../../hooks/useYouTubePlayer'
import socketService from '../../services/socketService'
import { setPlaybackState, setDuration } from '../../store/slices/playbackSlice'
import { formatDuration } from '../discover/TrackCard'
import historyService from '../../services/historyService'

export default function YouTubePlayer({
  room,
  isHost: isHostProp,
  onNextTrack,
  mode = 'room', // 'room' | 'standalone'
  standaloneTrack = null,
  authoritativePlayback = null,
  onClose,
}) {
  const dispatch = useDispatch()
  const isStandalone = mode === 'standalone'
  const isHost = isStandalone ? true : Boolean(isHostProp)

  const currentTrack = isStandalone ? standaloneTrack : room?.currentTrack
  const videoId = currentTrack?.providerId

  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [isPlayingLocally, setIsPlayingLocally] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [showVideo, setShowVideo] = useState(false)

  const containerId = useRef(`yt-player-${Math.random().toString(36).substring(2, 9)}`).current
  const hasInitialSyncedRef = useRef(false)
  const currentVideoIdRef = useRef(null)
  // Set when onReady fires but no snapshot was available yet. A later effect will
  // perform the sync once the snapshot arrives.
  const pendingSyncRef = useRef(false)
  // Tracks whether we need to unmute after the muted autoplay starts.
  const needsUnmuteRef = useRef(false)

  // latestPlaybackRef always mirrors the freshest authoritative snapshot so onReady
  // (and any deferred effect) can read it without closing over a stale value.
  const latestPlaybackRef = useRef(authoritativePlayback || room?.playback)
  latestPlaybackRef.current = authoritativePlayback || room?.playback

  // ── Dynamic Listening Session & Stats Tracking ──
  const sessionStartRef = useRef(null)
  const recordedTrackIdRef = useRef(null)
  const songStartTimerRef = useRef(null)
  const currentTrackRef = useRef(currentTrack)
  currentTrackRef.current = currentTrack
  const roomIdRef = useRef(room?._id)
  roomIdRef.current = room?._id

  const flushSessionTime = useCallback(() => {
    if (sessionStartRef.current !== null) {
      const now = Date.now()
      const elapsedSec = Math.round((now - sessionStartRef.current) / 1000)
      sessionStartRef.current = null
      if (elapsedSec >= 2) {
        historyService.recordListeningTime({
          durationSeconds: elapsedSec,
          roomId: roomIdRef.current || null,
          providerId: currentTrackRef.current?.providerId,
        }).catch(() => {})
      }
    }
  }, [])

  // Calculate where the room's playback should be RIGHT NOW.
  //
  // The server sends two kinds of snapshots:
  //   A) Calculated snapshot (room:state, join_request_resolved, REST getRoom):
  //      position = already-advanced current position at the moment it was calculated
  //      timestamp | serverTime | receivedAt = the ms epoch when that position was calculated
  //      → add (now - calculatedAt) to account for network + load latency
  //
  //   B) Raw DB snapshot (room.playback without timestamp enrichment):
  //      position = position when host last pressed play/pause/seek
  //      updatedAt = server time of that last host action
  //      → add (now - updatedAt)
  //
  // In both cases the formula is the same: position + (now - referenceTime).
  // The only difference is which field carries the reference time.
  // We MUST NOT fall through from A to B; that would double-count elapsed time.
  const getAuthoritativePosition = useCallback((playback) => {
    if (!playback) return 0
    const basePosition = playback.position || 0
    if (!playback.isPlaying) return Math.max(0, basePosition)

    // Prefer the explicit calculation-time marker (type A snapshot)
    const calcTs = playback.receivedAt ?? playback.timestamp ?? playback.serverTime ?? null
    if (calcTs !== null) {
      const ms = typeof calcTs === 'number' ? calcTs : new Date(calcTs).getTime()
      if (!isNaN(ms)) {
        return Math.max(0, basePosition + Math.max(0, (Date.now() - ms) / 1000))
      }
    }

    // Fall back to raw DB updatedAt (type B snapshot)
    if (playback.updatedAt) {
      const ms = new Date(playback.updatedAt).getTime()
      if (!isNaN(ms)) {
        return Math.max(0, basePosition + Math.max(0, (Date.now() - ms) / 1000))
      }
    }

    return Math.max(0, basePosition)
  }, [])

  // ── YouTube Player instance ───────────────────────────────────────────────────
  // Created at position 0, not autoplay, not pre-seeked.
  // ALL initial listener synchronization happens in ONE place: the onReady callback.
  // onStateChange does NOT re-seek or re-play during normal YouTube init transitions.
  const {
    playerRef,
    isReady,
    play,
    pause,
    seekTo,
    loadVideo,
    getCurrentTime,
    getDuration,
  } = useYouTubePlayer({
    containerId,
    videoId,
    autoPlay: false,
    startSeconds: 0,
    onReady: (e) => {
      const player = e.target
      const dur = player.getDuration ? (player.getDuration() || currentTrack?.duration || 0) : (currentTrack?.duration || 0)
      setTotalDuration(dur)
      dispatch(setDuration(dur))

      // Sync currentVideoIdRef so the track-change effect doesn't treat this as a song switch
      currentVideoIdRef.current = videoId

      // ── Host / Standalone ─────────────────────────────────────────────────
      // Host player always starts PAUSED regardless of the room's playback state.
      // The host manually presses Play — we never autoplay on the host side.
      if (isHost || isStandalone) {
        if (!isStandalone && latestPlaybackRef.current && videoId) {
          const snap = latestPlaybackRef.current
          // Restore the cursor position only so the host can see where they left off.
          const startPos = snap.position || 0
          if (startPos > 0) {
            player.seekTo(startPos, true)
            setCurrentTime(startPos)
          }
          // Host is always paused on (re)load. Manual Play triggers the existing
          // host PLAY command which broadcasts to all listeners.
          player.pauseVideo()
          setIsPlayingLocally(false)
          dispatch(setPlaybackState({ isPlaying: false, position: startPos }))
          hasInitialSyncedRef.current = true
        }
        return
      }

      // ── Listener: single controlled synchronization ───────────────────────
      // Guard: only run once per player instance.
      if (hasInitialSyncedRef.current) return

      const snap = latestPlaybackRef.current
      if (!snap || !videoId) {
        // Snapshot not yet available (room:state still in flight). Mark pending;
        // the useEffect below will execute the sync once the snapshot arrives.
        pendingSyncRef.current = true
        return
      }

      // If the room's track changed while the player was loading, reload.
      const authorizedTrackId = room?.currentTrack?.providerId || videoId
      if (authorizedTrackId !== videoId) {
        currentVideoIdRef.current = authorizedTrackId
        player.loadVideoById({ videoId: authorizedTrackId, startSeconds: 0 })
        return
      }

      // ONE seek to the calculated current host position.
      const targetPos = getAuthoritativePosition(snap)
      if (targetPos > 0) {
        player.seekTo(targetPos, true)
        setCurrentTime(targetPos)
      }

      if (snap.isPlaying) {
        // Mute BEFORE playVideo() so the browser's autoplay policy allows the
        // call to succeed without a user gesture. needsUnmuteRef signals
        // onStateChange to unmute once the player is actually PLAYING (state=1),
        // ensuring audio is restored as soon as the buffer starts.
        needsUnmuteRef.current = true
        try { player.mute() } catch (_) {}
        player.playVideo()
        setIsPlayingLocally(true)
        dispatch(setPlaybackState({ isPlaying: true, position: targetPos }))
      } else {
        player.pauseVideo()
        setIsPlayingLocally(false)
        dispatch(setPlaybackState({ isPlaying: false, position: targetPos }))
      }

      hasInitialSyncedRef.current = true
    },
    onStateChange: (event) => {
      // 1=PLAYING  2=PAUSED  0=ENDED  3=BUFFERING  5=CUED  -1=UNSTARTED
      // We do NOT re-seek or re-play on lifecycle states during initial loading.
      if (event.data === 1) {
        // Unmute here — AFTER the player has actually started, so the browser
        // can't block it. This is safe to call every time state=1 fires
        // because needsUnmuteRef is cleared after first use.
        if (needsUnmuteRef.current) {
          needsUnmuteRef.current = false
          try { event.target.unMute() } catch (_) {}
        }
        setIsPlayingLocally(true)

        // Record start timestamp for dynamic listening session
        sessionStartRef.current = Date.now()

        // Count distinct song listened after 5 seconds of active playback
        const track = currentTrackRef.current
        if (track && track.providerId && recordedTrackIdRef.current !== track.providerId) {
          if (songStartTimerRef.current) clearTimeout(songStartTimerRef.current)
          songStartTimerRef.current = setTimeout(() => {
            historyService.recordSongListen({
              provider: track.provider || 'youtube',
              providerId: track.providerId,
              title: track.title,
              artist: track.artist,
              thumbnail: track.thumbnail,
              roomId: roomIdRef.current || null,
            }).catch(() => {})
            recordedTrackIdRef.current = track.providerId
          }, 5000)
        }
      } else if (event.data === 2) {
        setIsPlayingLocally(false)
        if (songStartTimerRef.current) {
          clearTimeout(songStartTimerRef.current)
          songStartTimerRef.current = null
        }
        flushSessionTime()
      } else if (event.data === 0) {
        setIsPlayingLocally(false)
        if (songStartTimerRef.current) {
          clearTimeout(songStartTimerRef.current)
          songStartTimerRef.current = null
        }
        flushSessionTime()
        if (isHost && onNextTrack) {
          onNextTrack()
        }
      }
    },
  })

  // ── Deferred listener sync ────────────────────────────────────────────────
  // Handles the race where onReady fires before the room:state snapshot arrives.
  // pendingSyncRef is set in onReady when latestPlaybackRef.current was null.
  // This effect watches authoritativePlayback; when it arrives it performs the
  // exact same ONE seek + ONE playVideo that onReady would have done.
  useEffect(() => {
    if (isHost || isStandalone || !isReady || !videoId) return
    if (!pendingSyncRef.current) return
    if (hasInitialSyncedRef.current) return

    const snap = authoritativePlayback || room?.playback
    if (!snap) return

    pendingSyncRef.current = false
    hasInitialSyncedRef.current = true

    const player = playerRef.current
    if (!player) return

    const targetPos = getAuthoritativePosition(snap)
    if (targetPos > 0) {
      player.seekTo(targetPos, true)
      setCurrentTime(targetPos)
    }

    if (snap.isPlaying) {
      needsUnmuteRef.current = true
      try { player.mute() } catch (_) {}
      player.playVideo()
      setIsPlayingLocally(true)
      dispatch(setPlaybackState({ isPlaying: true, position: targetPos }))
    } else {
      player.pauseVideo()
      setIsPlayingLocally(false)
      dispatch(setPlaybackState({ isPlaying: false, position: targetPos }))
    }
  }, [isHost, isStandalone, isReady, videoId, authoritativePlayback, room?.playback,
      getAuthoritativePosition, playerRef, dispatch])

  // When track changes to a different song, load new video and reset sync guards
  useEffect(() => {
    if (videoId && isReady) {
      if (currentVideoIdRef.current && currentVideoIdRef.current !== videoId) {
        flushSessionTime()
        if (songStartTimerRef.current) {
          clearTimeout(songStartTimerRef.current)
          songStartTimerRef.current = null
        }
        recordedTrackIdRef.current = null

        currentVideoIdRef.current = videoId
        hasInitialSyncedRef.current = false
        pendingSyncRef.current = false
        needsUnmuteRef.current = false
        loadVideo(videoId, 0)
        setCurrentTime(0)
      } else if (!currentVideoIdRef.current) {
        currentVideoIdRef.current = videoId
      }
    }
  }, [videoId, isReady, loadVideo, flushSessionTime])

  // Flush listening time when leaving room or unmounting
  useEffect(() => {
    return () => {
      if (songStartTimerRef.current) {
        clearTimeout(songStartTimerRef.current)
      }
      flushSessionTime()
    }
  }, [flushSessionTime])

  // Periodic time ticker
  useEffect(() => {
    const interval = setInterval(() => {
      if (isReady) {
        const t = getCurrentTime()
        setCurrentTime(t)
        const d = getDuration()
        if (d && d !== totalDuration) {
          setTotalDuration(d)
        }
      }
    }, 500)
    return () => clearInterval(interval)
  }, [isReady, getCurrentTime, getDuration, totalDuration])

  // Listen to socket playback events (Only in room mode)
  useEffect(() => {
    if (isStandalone) return

    const socket = socketService.getSocket()
    if (!socket) return

    const handlePlay = ({ position, timestamp }) => {
      const drift = timestamp ? (Date.now() - timestamp) / 1000 : 0
      const targetPos = (position || 0) + drift
      const current = getCurrentTime()
      if (Math.abs(current - targetPos) > 0.5) {
        seekTo(targetPos)
      }
      play()
      setIsPlayingLocally(true)
      dispatch(setPlaybackState({ isPlaying: true, position: targetPos }))
    }

    const handlePause = ({ position }) => {
      pause()
      if (position !== undefined) {
        seekTo(position)
      }
      setIsPlayingLocally(false)
      dispatch(setPlaybackState({ isPlaying: false, position }))
    }

    const handleSeek = ({ position }) => {
      seekTo(position)
      setCurrentTime(position)
      dispatch(setPlaybackState({ position }))
    }

    const handleTrackChange = ({ track }) => {
      if (track?.providerId) {
        currentVideoIdRef.current = track.providerId
        loadVideo(track.providerId, 0)
        setCurrentTime(0)
      }
    }

    socket.on('playback:play', handlePlay)
    socket.on('playback:pause', handlePause)
    socket.on('playback:seek', handleSeek)
    socket.on('playback:change', handleTrackChange)

    return () => {
      socket.off('playback:play', handlePlay)
      socket.off('playback:pause', handlePause)
      socket.off('playback:seek', handleSeek)
      socket.off('playback:change', handleTrackChange)
    }
  }, [isStandalone, getCurrentTime, seekTo, play, pause, loadVideo, dispatch])

  // Playback controls
  const handlePlayPause = () => {
    if (!isHost) return
    const current = getCurrentTime()
    if (isPlayingLocally) {
      pause()
      setIsPlayingLocally(false)
      if (!isStandalone) {
        socketService.pause(current)
      }
    } else {
      play()
      setIsPlayingLocally(true)
      if (!isStandalone) {
        socketService.play(current)
      }
    }
  }

  const handleSeek = (e) => {
    if (!isHost) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, clickX / rect.width))
    const targetPos = percentage * (totalDuration || currentTrack?.duration || 1)
    seekTo(targetPos)
    setCurrentTime(targetPos)
    if (!isStandalone) {
      socketService.seek(targetPos)
    }
  }

  const progressPercent =
    totalDuration > 0 ? Math.min(100, (currentTime / totalDuration) * 100) : 0

  return (
    <div className="bg-charcoal border border-border rounded-xl overflow-hidden shadow-2xl relative">
      {/* Top Bar */}
      <div className="px-5 py-3 border-b border-border/70 flex items-center justify-between text-xs text-muted">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5">
            <span
              className={[
                'w-2 h-2 rounded-full',
                isPlayingLocally ? 'bg-green-500 animate-pulse' : 'bg-muted/40',
              ].join(' ')}
            />
            <span className="font-medium text-cream">
              {isPlayingLocally ? 'Now Playing' : 'Paused'}
            </span>
          </span>
          <span className="text-border">•</span>
          <span>
            {isStandalone
              ? 'Personal Session (Standalone Listening)'
              : isHost
              ? 'You are the Host (Playback Controls Active)'
              : `Synchronized with Host (${room?.host?.username || 'Host'})`}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowVideo(!showVideo)}
            className="text-[11px] text-muted hover:text-gold transition-colors flex items-center gap-1"
          >
            {showVideo ? 'Hide Video' : 'Show Video Player'}
          </button>
          {isStandalone && onClose && (
            <button
              onClick={onClose}
              className="text-xs text-muted hover:text-cream px-1.5 py-0.5 rounded hover:bg-elevated transition-colors"
              title="Close player"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Player Display */}
      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          {/* Visual Artwork or Embedded Player */}
          <div className="relative w-full md:w-64 aspect-video shrink-0 rounded-lg overflow-hidden bg-obsidian border border-border">
            {/* The actual YouTube iframe target element */}
            <div
              id={containerId}
              className={[
                'w-full h-full transition-opacity duration-300',
                showVideo ? 'opacity-100 relative z-10' : 'opacity-0 absolute inset-0 -z-10 pointer-events-none',
              ].join(' ')}
            />

            {/* Custom Album Art / Vinyl when video is hidden */}
            {!showVideo && (
              <div className="absolute inset-0 z-0">
                <img
                  src={
                    currentTrack?.thumbnail ||
                    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                  }
                  alt={currentTrack?.title || 'No Track'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-obsidian/30 backdrop-blur-[1px]" />
                {/* Subtle animated sound wave overlay when playing */}
                {isPlayingLocally && (
                  <div className="absolute bottom-3 left-3 flex items-end gap-1 px-2 py-1 bg-obsidian/75 rounded backdrop-blur-xs">
                    <span className="w-1 h-3 bg-gold animate-bounce" />
                    <span className="w-1 h-5 bg-gold animate-pulse" />
                    <span className="w-1 h-2.5 bg-gold animate-bounce" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Track Details */}
          <div className="flex-1 w-full min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-gold/15 text-gold border border-gold/20">
                {isStandalone ? 'Personal Audio' : 'Lounge Session'}
              </span>
              {!isStandalone && room?.name && (
                <span className="text-xs text-muted truncate">
                  Room: {room.name} {room.rid && `(${room.rid})`}
                </span>
              )}
            </div>

            <h2 className="font-display text-2xl text-cream font-semibold truncate">
              {currentTrack?.title || 'Waiting for Track...'}
            </h2>
            <p className="text-muted text-sm mt-0.5 truncate">
              {currentTrack?.artist || 'Select a track to start listening'}
            </p>

            {/* Audio Progress Bar */}
            <div className="mt-5 space-y-1.5">
              <div
                onClick={isHost ? handleSeek : undefined}
                className={[
                  'relative w-full h-2 bg-obsidian rounded-full overflow-hidden border border-border/80 group',
                  isHost ? 'cursor-pointer' : 'cursor-default',
                ].join(' ')}
              >
                <div
                  className="h-full bg-gold transition-all duration-150 relative"
                  style={{ width: `${progressPercent}%` }}
                >
                  {isHost && (
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-cream rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </div>

              <div className="flex justify-between text-xs text-muted font-mono">
                <span>{formatDuration(currentTime)}</span>
                <span>{formatDuration(totalDuration || currentTrack?.duration)}</span>
              </div>
            </div>

            {/* Playback Controls */}
            {isHost ? (
              <div className="mt-4 flex items-center gap-4">
                <button
                  onClick={handlePlayPause}
                  className="h-11 px-6 rounded-md bg-gold text-obsidian font-medium flex items-center gap-2 hover:bg-gold/90 active:scale-98 transition-all shadow-md"
                  aria-label={isPlayingLocally ? 'Pause' : 'Play'}
                >
                  {isPlayingLocally ? (
                    <>
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                      <span>{isStandalone ? 'Pause' : 'Pause Session'}</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <span>{isStandalone ? 'Play' : 'Play for Room'}</span>
                    </>
                  )}
                </button>

                {!isStandalone && onNextTrack && (
                  <button
                    onClick={onNextTrack}
                    className="h-11 px-4 rounded-md border border-border text-cream hover:border-gold/50 hover:text-gold flex items-center gap-1.5 text-sm transition-colors"
                  >
                    <span>Next Track</span>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                    </svg>
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2 text-xs text-muted bg-elevated/50 p-2.5 rounded-md border border-border/50">
                <svg className="w-4 h-4 text-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  The host is steering this lounge session. Your audio is in direct sync.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
