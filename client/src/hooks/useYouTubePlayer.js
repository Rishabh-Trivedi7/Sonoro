import { useEffect, useRef, useState, useCallback } from 'react'

let ytScriptLoaded = false
let ytScriptLoading = false
const readyCallbacks = []

function loadYouTubeIframeApi(callback) {
  if (typeof window !== 'undefined' && window.YT && window.YT.Player) {
    callback()
    return
  }

  readyCallbacks.push(callback)

  if (!ytScriptLoading) {
    ytScriptLoading = true
    const existingTag = document.querySelector('script[src*="youtube.com/iframe_api"]')
    if (!existingTag) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
    }

    const previousOnReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (previousOnReady) previousOnReady()
      ytScriptLoaded = true
      ytScriptLoading = false
      while (readyCallbacks.length) {
        const cb = readyCallbacks.shift()
        cb()
      }
    }
  }
}

export function useYouTubePlayer({
  containerId,
  videoId,
  autoPlay = false,
  startSeconds = 0,
  onReady,
  onStateChange,
  onError,
}) {
  const playerRef = useRef(null)
  const [isReady, setIsReady] = useState(false)
  const isReadyRef = useRef(false)

  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady
  const onStateChangeRef = useRef(onStateChange)
  onStateChangeRef.current = onStateChange
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  useEffect(() => {
    let isCancelled = false

    loadYouTubeIframeApi(() => {
      if (isCancelled || !document.getElementById(containerId)) return

      if (playerRef.current) {
        try {
          playerRef.current.destroy()
        } catch {
          // ignore
        }
      }

      playerRef.current = new window.YT.Player(containerId, {
        videoId: videoId || '',
        playerVars: {
          autoplay: autoPlay ? 1 : 0,
          start: Math.floor(startSeconds) || 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            if (isCancelled) return
            isReadyRef.current = true
            setIsReady(true)
            if (onReadyRef.current) onReadyRef.current(event)
          },
          onStateChange: (event) => {
            if (isCancelled) return
            if (onStateChangeRef.current) onStateChangeRef.current(event)
          },
          onError: (event) => {
            if (isCancelled) return
            console.warn('YouTube Player error code:', event.data)
            if (onErrorRef.current) onErrorRef.current(event)
          },
        },
      })
    })

    return () => {
      isCancelled = true
      isReadyRef.current = false
      setIsReady(false)
      if (playerRef.current) {
        try {
          playerRef.current.destroy()
        } catch {
          // ignore
        }
        playerRef.current = null
      }
    }
  }, [containerId])

  const play = useCallback(() => {
    if (playerRef.current && playerRef.current.playVideo) {
      try {
        playerRef.current.playVideo()
      } catch (err) {
        console.warn('YT play failed:', err)
      }
    }
  }, [])

  const pause = useCallback(() => {
    if (playerRef.current && playerRef.current.pauseVideo) {
      try {
        playerRef.current.pauseVideo()
      } catch (err) {
        console.warn('YT pause failed:', err)
      }
    }
  }, [])

  const seekTo = useCallback((seconds) => {
    if (playerRef.current && playerRef.current.seekTo) {
      try {
        playerRef.current.seekTo(seconds, true)
      } catch (err) {
        console.warn('YT seek failed:', err)
      }
    }
  }, [])

  const loadVideo = useCallback((newVideoId, startSeconds = 0) => {
    if (playerRef.current && isReadyRef.current && playerRef.current.loadVideoById) {
      try {
        playerRef.current.loadVideoById({
          videoId: newVideoId,
          startSeconds: startSeconds || 0,
        })
      } catch (err) {
        console.warn('YT loadVideoById failed:', err)
      }
    }
  }, [])

  const getCurrentTime = useCallback(() => {
    if (playerRef.current && isReadyRef.current && playerRef.current.getCurrentTime) {
      try {
        return playerRef.current.getCurrentTime() || 0
      } catch {
        return 0
      }
    }
    return 0
  }, [])

  const getDuration = useCallback(() => {
    if (playerRef.current && isReadyRef.current && playerRef.current.getDuration) {
      try {
        return playerRef.current.getDuration() || 0
      } catch {
        return 0
      }
    }
    return 0
  }, [])

  return {
    playerRef,
    isReady,
    play,
    pause,
    seekTo,
    loadVideo,
    getCurrentTime,
    getDuration,
  }
}

export default useYouTubePlayer
