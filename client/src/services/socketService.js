import { io } from 'socket.io-client'

class SocketService {
  constructor() {
    this.socket = null
  }

  connect(token) {
    if (this.socket && this.socket.connected) return this.socket

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000'

    this.socket = io(socketUrl, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    this.socket.on('connect', () => {
      console.log('⚡ Connected to Sonora real-time socket:', this.socket.id)
    })

    this.socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message)
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  getSocket() {
    return this.socket
  }

  // Room Actions
  joinRoom(roomId) {
    if (this.socket) this.socket.emit('room:join', roomId)
  }

  leaveRoom() {
    if (this.socket) this.socket.emit('room:leave')
  }

  play(position = 0) {
    if (this.socket) this.socket.emit('playback:play', { position })
  }

  pause(position = 0) {
    if (this.socket) this.socket.emit('playback:pause', { position })
  }

  seek(position = 0) {
    if (this.socket) this.socket.emit('playback:seek', { position })
  }

  changeTrack(track) {
    if (this.socket) this.socket.emit('playback:change', { track })
  }

  addToQueue(track) {
    if (this.socket) this.socket.emit('queue:add', { track })
  }

  voteQueue(queueItemId) {
    if (this.socket) this.socket.emit('queue:vote', { queueItemId })
  }

  nextQueue(queueItemId = null) {
    if (this.socket) this.socket.emit('queue:next', { queueItemId })
  }

  sendMessage(text) {
    if (this.socket) this.socket.emit('chat:message', { text })
  }
}

export const socketService = new SocketService()
export default socketService
