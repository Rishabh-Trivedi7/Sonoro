import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { User } from '../models/user.model.js'
import { Room } from '../models/room.model.js'
import { RoomMessage } from '../models/roomMessage.model.js'
import { ListeningHistory } from '../models/listeningHistory.model.js'
import { RoomJoinRequest } from '../models/roomJoinRequest.model.js'

/**
 * In-memory presence store.
 * roomId → Map<socketId, { userId, username, avatar }>
 *
 * This is intentionally simple — no Redis.
 * Reconnecting clients rejoin and re-populate this store.
 */
const roomPresence = new Map()

const getPresence = (roomId) => {
  if (!roomPresence.has(roomId)) return []
  return Array.from(roomPresence.get(roomId).values())
}

const addPresence = (roomId, socketId, userInfo) => {
  if (!roomPresence.has(roomId)) roomPresence.set(roomId, new Map())
  roomPresence.get(roomId).set(socketId, userInfo)
}

const removePresence = (roomId, socketId) => {
  if (roomPresence.has(roomId)) {
    roomPresence.get(roomId).delete(socketId)
    if (roomPresence.get(roomId).size === 0) roomPresence.delete(roomId)
  }
}

/**
 * Authenticate a socket using JWT from handshake auth or query.
 * Returns the User document or throws.
 */
const authenticateSocket = async (socket) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace('Bearer ', '')

  if (!token) throw new Error('No token provided')

  const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
  const user = await User.findById(decoded._id).select('-password -refreshToken')
  if (!user) throw new Error('User not found')

  return user
}

// In-memory cache for room host IDs: canonicalRoomId -> hostUserId (string)
// Enables sub-millisecond host authorization for realtime playback controls
const roomHosts = new Map()

/**
 * Initialize Socket.IO event handlers.
 * @param {import('socket.io').Server} io
 */
export const initSocket = (io) => {
  // ── Auth Middleware ─────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      socket.user = await authenticateSocket(socket)
      next()
    } catch (err) {
      next(new Error('Authentication failed'))
    }
  })

  io.on('connection', (socket) => {
    const user = socket.user
    console.log(`🔌 ${user.username} connected (${socket.id})`)

    // Join personal user room for targeted notifications (e.g. join requests)
    socket.join(`user:${user._id.toString()}`)

    // Track which room this socket is in
    let currentRoomId = null
    let isCurrentRoomHost = false

    const verifyHost = async () => {
      if (!currentRoomId) return false
      if (isCurrentRoomHost) return true
      const cachedHost = roomHosts.get(currentRoomId)
      if (cachedHost) return cachedHost === user._id.toString()
      const r = await Room.findById(currentRoomId).select('host').lean()
      if (!r) return false
      const hId = (r.host?._id || r.host).toString()
      roomHosts.set(currentRoomId, hId)
      return hId === user._id.toString()
    }

    // ── room:join ────────────────────────────────────────────────────
    socket.on('room:join', async (roomId) => {
      try {
        if (!roomId) return socket.emit('error', { message: 'Room ID is required' })

        const trimmed = roomId.toString().trim()
        const isMongoId = mongoose.Types.ObjectId.isValid(trimmed) && /^[0-9a-fA-F]{24}$/.test(trimmed)
        const room = await Room.findOne(
          isMongoId ? { $or: [{ _id: trimmed }, { rid: trimmed.toUpperCase() }] } : { rid: trimmed.toUpperCase() }
        )
          .populate('host', 'username avatar uid')
          .lean()

        if (!room || room.status !== 'active') {
          return socket.emit('error', { message: 'Room not found or inactive' })
        }

        const canonicalRoomId = room._id.toString()
        const isHost = room.host?._id?.toString() === user._id.toString()

        // ── Enforce Private Room Authorization ──
        if (room.roomType === 'private' && !isHost) {
          const approved = await RoomJoinRequest.findOne({
            room: room._id,
            requester: user._id,
            status: 'accepted',
          })

          if (!approved) {
            return socket.emit('error', {
              message: 'Access denied: Host approval required for private room',
              isPrivate: true,
            })
          }
        }

        // Leave previous room if any
        if (currentRoomId && currentRoomId !== canonicalRoomId) {
          socket.leave(currentRoomId)
          removePresence(currentRoomId, socket.id)
          io.to(currentRoomId).emit('room:presence', getPresence(currentRoomId))
        }

        const hostId = (room.host?._id || room.host).toString()
        roomHosts.set(canonicalRoomId, hostId)
        isCurrentRoomHost = isHost

        currentRoomId = canonicalRoomId
        socket.join(canonicalRoomId)

        addPresence(canonicalRoomId, socket.id, {
          userId: user._id.toString(),
          username: user.username,
          avatar: user.avatar?.url || '',
        })

        // Track unique joined rooms dynamically in user stats
        User.updateOne(
          { _id: user._id },
          { $addToSet: { 'stats.joinedRooms': room._id } }
        ).catch((err) => console.warn('Failed to update joinedRooms stat:', err.message))

        // ── Calculate Authoritative Room Playback State ──
        const now = Date.now()
        let currentPosition = room.playback?.position || 0
        if (room.playback?.isPlaying && room.playback?.updatedAt) {
          const elapsedSec = (now - new Date(room.playback.updatedAt).getTime()) / 1000
          currentPosition = Math.max(0, currentPosition + elapsedSec)
        }
        if (room.currentTrack?.duration > 0 && currentPosition > room.currentTrack.duration) {
          currentPosition = room.currentTrack.duration
        }

        const authoritativePlayback = {
          isPlaying: room.playback?.isPlaying || false,
          position: currentPosition,
          updatedAt: room.playback?.updatedAt,
          timestamp: now,
          serverTime: now,
        }

        // Send authoritative room state to the joining socket
        socket.emit('room:state', {
          room: {
            ...room,
            playback: authoritativePlayback,
          },
          authoritativePlayback,
          members: getPresence(canonicalRoomId),
        })

        // Broadcast updated presence to all in room
        io.to(canonicalRoomId).emit('room:presence', getPresence(canonicalRoomId))

        // Send recent chat history
        const messages = await RoomMessage.find({ room: room._id })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean()
        socket.emit('chat:history', messages.reverse())
      } catch (err) {
        console.error('room:join error:', err.message)
        socket.emit('error', { message: 'Failed to join room' })
      }
    })

    // ── room:leave ───────────────────────────────────────────────────
    socket.on('room:leave', async () => {
      if (!currentRoomId) return

      const leavingRoomId = currentRoomId
      const wasHost = isCurrentRoomHost

      // Remove this socket from presence before broadcasting
      socket.leave(leavingRoomId)
      removePresence(leavingRoomId, socket.id)
      currentRoomId = null
      isCurrentRoomHost = false

      if (wasHost) {
        // Host has left — end the room and notify all remaining members
        roomHosts.delete(leavingRoomId)
        roomPresence.delete(leavingRoomId)

        // Persist ended status non-blockingly
        Room.findByIdAndUpdate(leavingRoomId, { $set: { status: 'ended' } }).catch((err) =>
          console.error('room:leave host end DB error:', err.message)
        )

        io.to(leavingRoomId).emit('room:host_left', {
          roomId: leavingRoomId,
          message: 'Host has left the room',
        })
      } else {
        // Regular member left — update presence for everyone and emit named departure
        io.to(leavingRoomId).emit('room:presence', getPresence(leavingRoomId))
        io.to(leavingRoomId).emit('room:member_left', {
          roomId: leavingRoomId,
          userId: user._id.toString(),
          username: user.username,
        })
      }
    })

    // ── playback:play ────────────────────────────────────────────────
    // Host only. Broadcasts immediately with server timestamp; persists non-blockingly.
    socket.on('playback:play', async ({ position }) => {
      if (!currentRoomId) return
      try {
        const authorized = await verifyHost()
        if (!authorized) {
          return socket.emit('error', { message: 'Only the host can control playback' })
        }

        const now = Date.now()
        const pos = position ?? 0

        // Immediate realtime broadcast to room
        io.to(currentRoomId).emit('playback:play', {
          position: pos,
          timestamp: now,
        })

        // Non-blocking database persistence
        Room.findByIdAndUpdate(currentRoomId, {
          $set: {
            'playback.isPlaying': true,
            'playback.position': pos,
            'playback.updatedAt': new Date(now),
          },
        }).catch((err) => console.error('playback:play DB persist error:', err.message))
      } catch (err) {
        console.error('playback:play error:', err.message)
      }
    })

    // ── playback:pause ───────────────────────────────────────────────
    // Host only. Broadcasts immediately; persists non-blockingly.
    socket.on('playback:pause', async ({ position }) => {
      if (!currentRoomId) return
      try {
        const authorized = await verifyHost()
        if (!authorized) {
          return socket.emit('error', { message: 'Only the host can control playback' })
        }

        const now = Date.now()
        const pos = position ?? 0

        // Immediate realtime broadcast to room
        io.to(currentRoomId).emit('playback:pause', { position: pos, timestamp: now })

        // Non-blocking database persistence
        Room.findByIdAndUpdate(currentRoomId, {
          $set: {
            'playback.isPlaying': false,
            'playback.position': pos,
            'playback.updatedAt': new Date(now),
          },
        }).catch((err) => console.error('playback:pause DB persist error:', err.message))
      } catch (err) {
        console.error('playback:pause error:', err.message)
      }
    })

    // ── playback:seek ────────────────────────────────────────────────
    // Host only. Broadcasts immediately; persists non-blockingly.
    socket.on('playback:seek', async ({ position }) => {
      if (!currentRoomId) return
      try {
        const authorized = await verifyHost()
        if (!authorized) {
          return socket.emit('error', { message: 'Only the host can control playback' })
        }

        const now = Date.now()
        const pos = position ?? 0

        // Immediate realtime broadcast to room
        io.to(currentRoomId).emit('playback:seek', { position: pos, timestamp: now })

        // Non-blocking database persistence
        Room.findByIdAndUpdate(currentRoomId, {
          $set: {
            'playback.position': pos,
            'playback.updatedAt': new Date(now),
          },
        }).catch((err) => console.error('playback:seek DB persist error:', err.message))
      } catch (err) {
        console.error('playback:seek error:', err.message)
      }
    })

    // ── playback:change ──────────────────────────────────────────────
    // Host changes current track. Broadcasts immediately; persists non-blockingly.
    socket.on('playback:change', async ({ track }) => {
      if (!currentRoomId || !track?.providerId) return
      try {
        const authorized = await verifyHost()
        if (!authorized) {
          return socket.emit('error', { message: 'Only the host can change tracks' })
        }

        const now = Date.now()

        // Immediate realtime broadcast to room
        io.to(currentRoomId).emit('playback:change', { track, timestamp: now })

        // Non-blocking database persistence
        Room.findByIdAndUpdate(currentRoomId, {
          $set: {
            currentTrack: track,
            'playback.isPlaying': false,
            'playback.position': 0,
            'playback.updatedAt': new Date(now),
          },
        }).catch((err) => console.error('playback:change DB persist error:', err.message))

        // Record listening history in background
        const members = getPresence(currentRoomId)
        if (members && members.length > 0) {
          const historyDocs = members.map((m) => ({
            user: m.userId,
            provider: track.provider || 'youtube',
            providerId: track.providerId,
            title: track.title,
            artist: track.artist,
            thumbnail: track.thumbnail,
            roomId: currentRoomId,
            listenedAt: new Date(now),
          }))
          ListeningHistory.insertMany(historyDocs, { ordered: false }).catch(() => {})
        }
      } catch (err) {
        console.error('playback:change error:', err.message)
      }
    })

    // ── queue:add ────────────────────────────────────────────────────
    socket.on('queue:add', async ({ track }) => {
      if (!currentRoomId) return
      try {
        const room = await Room.findById(currentRoomId)
        if (!room || room.status !== 'active') return
        if (!track?.providerId) return

        room.queue.push({
          track,
          requestedBy: user._id,
          requestedByName: user.username,
          votes: [],
          voteCount: 0,
        })
        await room.save()

        io.to(currentRoomId).emit('queue:updated', room.queue)
      } catch (err) {
        console.error('queue:add error:', err.message)
      }
    })

    // ── queue:vote ───────────────────────────────────────────────────
    socket.on('queue:vote', async ({ queueItemId }) => {
      if (!currentRoomId) return
      try {
        const room = await Room.findById(currentRoomId)
        if (!room) return

        const item = room.queue.id(queueItemId)
        if (!item) return

        const alreadyVoted = item.votes.some((v) => v.equals(user._id))
        if (alreadyVoted) {
          // Toggle off
          item.votes = item.votes.filter((v) => !v.equals(user._id))
        } else {
          item.votes.push(user._id)
        }
        item.voteCount = item.votes.length

        await room.save()

        io.to(currentRoomId).emit('queue:updated', room.queue)
      } catch (err) {
        console.error('queue:vote error:', err.message)
      }
    })

    // ── queue:next ───────────────────────────────────────────────────
    // Host picks next track from queue (or top-voted).
    socket.on('queue:next', async ({ queueItemId }) => {
      if (!currentRoomId) return
      try {
        const room = await Room.findById(currentRoomId)
        if (!room || !room.host.equals(user._id)) return

        let nextTrack = null
        if (queueItemId) {
          const item = room.queue.id(queueItemId)
          if (item) {
            nextTrack = item.track
            room.queue = room.queue.filter((q) => q._id.toString() !== queueItemId)
          }
        } else if (room.queue.length > 0) {
          // Auto pick top-voted
          room.queue.sort((a, b) => b.voteCount - a.voteCount)
          nextTrack = room.queue[0].track
          room.queue.shift()
        }

        if (!nextTrack) return

        const now = Date.now()
        room.currentTrack = nextTrack
        room.playback = { isPlaying: false, position: 0, updatedAt: new Date(now) }

        // Immediate realtime broadcast
        io.to(currentRoomId).emit('playback:change', { track: nextTrack, timestamp: now })
        io.to(currentRoomId).emit('queue:updated', room.queue)

        await room.save()
      } catch (err) {
        console.error('queue:next error:', err.message)
      }
    })

    // ── chat:message ─────────────────────────────────────────────────
    socket.on('chat:message', async ({ text }) => {
      if (!currentRoomId) return
      const trimmed = text?.trim()
      if (!trimmed || trimmed.length > 500) return

      try {
        const message = await RoomMessage.create({
          room: currentRoomId,
          sender: user._id,
          senderName: user.username,
          text: trimmed,
        })

        io.to(currentRoomId).emit('chat:message', {
          _id: message._id,
          senderName: message.senderName,
          senderId: user._id.toString(),
          text: message.text,
          createdAt: message.createdAt,
        })
      } catch (err) {
        console.error('chat:message error:', err.message)
      }
    })

    // ── disconnect ───────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`🔌 ${user.username} disconnected (${socket.id})`)
      if (!currentRoomId) return

      const leavingRoomId = currentRoomId
      const wasHost = isCurrentRoomHost

      removePresence(leavingRoomId, socket.id)
      currentRoomId = null
      isCurrentRoomHost = false

      if (wasHost) {
        // Host disconnected unexpectedly — end the room and notify all members
        // (Socket.IO disconnect fires only after full transport close, not on transient reconnects)
        roomHosts.delete(leavingRoomId)
        roomPresence.delete(leavingRoomId)

        Room.findByIdAndUpdate(leavingRoomId, { $set: { status: 'ended' } }).catch((err) =>
          console.error('disconnect host end DB error:', err.message)
        )

        io.to(leavingRoomId).emit('room:host_left', {
          roomId: leavingRoomId,
          message: 'Host has left the room',
        })
      } else {
        // Regular member disconnected — update presence for everyone
        io.to(leavingRoomId).emit('room:presence', getPresence(leavingRoomId))
        io.to(leavingRoomId).emit('room:member_left', {
          roomId: leavingRoomId,
          userId: user._id.toString(),
          username: user.username,
        })
      }
    })
  })
}
