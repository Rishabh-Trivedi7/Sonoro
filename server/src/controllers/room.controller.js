import mongoose from 'mongoose'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { Room } from '../models/room.model.js'
import { RoomJoinRequest } from '../models/roomJoinRequest.model.js'
import { getIO } from '../socket/ioInstance.js'

/**
 * Helper to find a room by either MongoDB _id or Sonora RID.
 */
const findRoomByIdOrRID = async (identifier) => {
  if (!identifier) return null
  const trimmed = identifier.trim()
  const isMongoId = mongoose.Types.ObjectId.isValid(trimmed) && /^[0-9a-fA-F]{24}$/.test(trimmed)
  
  if (isMongoId) {
    return await Room.findOne({
      $or: [{ _id: trimmed }, { rid: trimmed.toUpperCase() }],
    })
  }
  return await Room.findOne({ rid: trimmed.toUpperCase() })
}

/**
 * Calculate the authoritative playback position based on server time.
 */
export const getAuthoritativePlayback = (playback, trackDuration = 0) => {
  const now = Date.now()
  if (!playback) return { isPlaying: false, position: 0, serverTime: now, timestamp: now }
  
  let currentPosition = playback.position || 0
  if (playback.isPlaying && playback.updatedAt) {
    const elapsedSec = (now - new Date(playback.updatedAt).getTime()) / 1000
    currentPosition = Math.max(0, currentPosition + elapsedSec)
  }

  if (trackDuration > 0 && currentPosition > trackDuration) {
    currentPosition = trackDuration
  }

  return {
    isPlaying: playback.isPlaying || false,
    position: currentPosition,
    updatedAt: playback.updatedAt,
    serverTime: now,
    timestamp: now,
  }
}

/**
 * POST /api/v1/rooms
 * Create a new listening room. The creator becomes the host.
 */
const createRoom = asyncHandler(async (req, res) => {
  const { name, currentTrack, roomType = 'public' } = req.body

  if (!name?.trim()) {
    throw new ApiError(400, 'Room name is required')
  }

  const trackId = currentTrack?.providerId || currentTrack?.videoId
  if (!trackId) {
    throw new ApiError(400, 'A starting track is required to create a room')
  }

  const normalizedRoomType = roomType === 'private' ? 'private' : 'public'

  const room = await Room.create({
    name: name.trim(),
    roomType: normalizedRoomType,
    host: req.user._id,
    currentTrack: {
      provider: currentTrack.provider || 'youtube',
      providerId: trackId,
      title: currentTrack.title,
      artist: currentTrack.artist,
      thumbnail: currentTrack.thumbnail,
      duration: currentTrack.duration || 0,
    },
    playback: {
      isPlaying: false,
      position: 0,
      updatedAt: new Date(),
    },
    queue: [],
    status: 'active',
  })

  const populated = await Room.findById(room._id).populate('host', 'username avatar uid').lean()

  return res.status(201).json(new ApiResponse(201, populated, 'Room created'))
})

/**
 * GET /api/v1/rooms/:roomId
 * Get a single room by ID or RID.
 * Enforces private room authorization.
 */
const getRoom = asyncHandler(async (req, res) => {
  const room = await findRoomByIdOrRID(req.params.roomId)

  if (!room) {
    throw new ApiError(404, 'Room not found')
  }

  // Populate host info
  await room.populate('host', 'username avatar uid')

  const isHost = room.host._id.equals(req.user._id)

  // Enforce private room access control
  if (room.roomType === 'private' && !isHost) {
    const approvedRequest = await RoomJoinRequest.findOne({
      room: room._id,
      requester: req.user._id,
      status: 'accepted',
    })

    if (!approvedRequest) {
      // Check if user has a pending request
      const pendingRequest = await RoomJoinRequest.findOne({
        room: room._id,
        requester: req.user._id,
      })

      const status = pendingRequest ? pendingRequest.status : 'none'
      throw new ApiError(403, 'This is a private room. Host approval is required to join.', [], {
        isPrivate: true,
        roomId: room._id,
        rid: room.rid,
        roomName: room.name,
        requestStatus: status,
      })
    }
  }

  const roomObj = room.toObject()
  roomObj.playback = {
    ...roomObj.playback,
    ...getAuthoritativePlayback(room.playback, room.currentTrack?.duration),
  }

  return res.json(new ApiResponse(200, roomObj, 'Room fetched'))
})

/**
 * GET /api/v1/rooms
 * Get active PUBLIC rooms (browse directory).
 */
const getActiveRooms = asyncHandler(async (req, res) => {
  const rooms = await Room.find({ status: 'active', roomType: 'public' })
    .populate('host', 'username avatar uid')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean()

  return res.json(new ApiResponse(200, rooms, 'Active rooms fetched'))
})

/**
 * GET /api/v1/rooms/search
 * Search rooms by room name or RID. Returns matching public and private rooms.
 */
const searchRooms = asyncHandler(async (req, res) => {
  const { q } = req.query
  if (!q || !q.trim()) {
    return res.json(new ApiResponse(200, [], 'Rooms search results'))
  }

  const queryStr = q.trim()
  const regex = new RegExp(queryStr, 'i')

  const rooms = await Room.find({
    status: 'active',
    $or: [
      { name: regex },
      { rid: queryStr.toUpperCase() },
      { rid: regex },
    ],
  })
    .populate('host', 'username avatar uid')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean()

  // For private rooms, enrich with the current user's membership/request status
  const enrichedRooms = await Promise.all(
    rooms.map(async (room) => {
      const isHost = room.host?._id?.toString() === req.user._id.toString()
      let userRequestStatus = 'none'

      if (room.roomType === 'private' && !isHost) {
        const joinReq = await RoomJoinRequest.findOne({
          room: room._id,
          requester: req.user._id,
        })
        if (joinReq) {
          userRequestStatus = joinReq.status
        }
      }

      return {
        ...room,
        isHost,
        userRequestStatus,
      }
    })
  )

  return res.json(new ApiResponse(200, enrichedRooms, 'Rooms found'))
})

/**
 * GET /api/v1/rooms/mine
 * Get rooms created by the current user.
 */
const getUserRooms = asyncHandler(async (req, res) => {
  const rooms = await Room.find({ host: req.user._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean()

  return res.json(new ApiResponse(200, rooms, 'Your rooms fetched'))
})

/**
 * PATCH /api/v1/rooms/:roomId/end
 * End a room (host only).
 */
const endRoom = asyncHandler(async (req, res) => {
  const room = await findRoomByIdOrRID(req.params.roomId)

  if (!room) throw new ApiError(404, 'Room not found')
  if (!room.host.equals(req.user._id)) throw new ApiError(403, 'Only the host can end this room')

  room.status = 'ended'
  await room.save()

  // Notify all members in real-time so their UIs update immediately
  try {
    const io = getIO()
    if (io) {
      const canonicalRoomId = room._id.toString()
      io.to(canonicalRoomId).emit('room:host_left', {
        roomId: canonicalRoomId,
        rid: room.rid,
        message: 'Host has ended the room session',
      })
    }
  } catch (notifyErr) {
    console.error('endRoom socket notify failed (non-fatal):', notifyErr.message)
  }

  return res.json(new ApiResponse(200, {}, 'Room ended'))
})

/**
 * POST /api/v1/rooms/:roomId/join-request
 * Submit a join request for a private room.
 */
const requestJoinRoom = asyncHandler(async (req, res) => {
  const room = await findRoomByIdOrRID(req.params.roomId)

  if (!room || room.status !== 'active') {
    throw new ApiError(404, 'Room not found or no longer active')
  }

  if (room.roomType !== 'private') {
    return res.json(new ApiResponse(200, { status: 'public' }, 'Room is public. Direct join allowed.'))
  }

  if (room.host.equals(req.user._id)) {
    return res.json(new ApiResponse(200, { status: 'host' }, 'You are the host of this room.'))
  }

  let joinRequest = await RoomJoinRequest.findOne({
    room: room._id,
    requester: req.user._id,
  })

  if (joinRequest) {
    if (joinRequest.status === 'accepted') {
      return res.json(new ApiResponse(200, joinRequest, 'You are already approved to join this room.'))
    }
    if (joinRequest.status === 'pending') {
      return res.json(new ApiResponse(200, joinRequest, 'Your join request is already pending host approval.'))
    }
    // If previously rejected, allow re-requesting
    joinRequest.status = 'pending'
    await joinRequest.save()
  } else {
    joinRequest = await RoomJoinRequest.create({
      room: room._id,
      requester: req.user._id,
      status: 'pending',
    })
  }

  // ── Real-time: notify host via personal socket room ──
  try {
    const io = getIO()
    if (io) {
      const populated = await RoomJoinRequest.findById(joinRequest._id)
        .populate('requester', '_id uid username avatar bio')
        .lean()
      io.to(`user:${room.host.toString()}`).emit('room:join_request_received', {
        request: populated,
        roomName: room.name,
        roomId: room._id.toString(),
      })
    }
  } catch (notifyErr) {
    console.error('Host socket notify failed (non-fatal):', notifyErr.message)
  }

  return res.status(201).json(new ApiResponse(201, joinRequest, 'Join request sent to host.'))
})

/**
 * GET /api/v1/rooms/:roomId/join-requests
 * Host only: view all pending join requests for a room.
 */
const getJoinRequests = asyncHandler(async (req, res) => {
  const room = await findRoomByIdOrRID(req.params.roomId)

  if (!room) throw new ApiError(404, 'Room not found')
  if (!room.host.equals(req.user._id)) throw new ApiError(403, 'Only the host can view join requests')

  const requests = await RoomJoinRequest.find({
    room: room._id,
    status: 'pending',
  })
    .populate('requester', '_id uid username avatar bio')
    .sort({ createdAt: -1 })
    .lean()

  return res.json(new ApiResponse(200, requests, 'Join requests fetched'))
})

/**
 * PATCH /api/v1/rooms/:roomId/join-requests/:requestId
 * Host only: Accept or reject a join request.
 */
const respondToJoinRequest = asyncHandler(async (req, res) => {
  const { action } = req.body // 'accept' | 'reject'
  if (!['accept', 'reject'].includes(action)) {
    throw new ApiError(400, 'Action must be accept or reject')
  }

  const room = await findRoomByIdOrRID(req.params.roomId)
  if (!room) throw new ApiError(404, 'Room not found')
  if (!room.host.equals(req.user._id)) throw new ApiError(403, 'Only the host can respond to join requests')

  const joinRequest = await RoomJoinRequest.findOne({
    _id: req.params.requestId,
    room: room._id,
  })

  if (!joinRequest) {
    throw new ApiError(404, 'Join request not found')
  }

  joinRequest.status = action === 'accept' ? 'accepted' : 'rejected'
  await joinRequest.save()

  // ── Real-time: notify requester via their personal socket room ──
  try {
    const io = getIO()
    if (io) {
      const payload = {
        status: joinRequest.status,
        roomId: room._id.toString(),
        rid: room.rid,
        roomName: room.name,
      }

      // On acceptance, include current authoritative playback so the client
      // can join at the correct timestamp without an extra round-trip.
      if (action === 'accept') {
        payload.authoritativePlayback = getAuthoritativePlayback(room.playback, room.currentTrack?.duration)
        payload.currentTrack = room.currentTrack
      }

      io.to(`user:${joinRequest.requester.toString()}`).emit('room:join_request_resolved', payload)
    }
  } catch (notifyErr) {
    console.error('Requester socket notify failed (non-fatal):', notifyErr.message)
  }

  return res.json(new ApiResponse(200, joinRequest, `Join request ${action}ed successfully`))
})

/**
 * GET /api/v1/rooms/:roomId/join-request/status
 * Check current user's join request status.
 */
const getJoinRequestStatus = asyncHandler(async (req, res) => {
  const room = await findRoomByIdOrRID(req.params.roomId)
  if (!room) throw new ApiError(404, 'Room not found')

  const isHost = room.host.equals(req.user._id)
  if (isHost) {
    return res.json(new ApiResponse(200, { status: 'accepted', isHost: true }, 'You are the host'))
  }

  if (room.roomType === 'public') {
    return res.json(new ApiResponse(200, { status: 'accepted', isHost: false }, 'Room is public'))
  }

  const joinRequest = await RoomJoinRequest.findOne({
    room: room._id,
    requester: req.user._id,
  })

  return res.json(
    new ApiResponse(
      200,
      {
        status: joinRequest ? joinRequest.status : 'none',
        isHost: false,
        rid: room.rid,
        roomName: room.name,
      },
      'Join request status fetched'
    )
  )
})

export {
  createRoom,
  getRoom,
  getActiveRooms,
  searchRooms,
  getUserRooms,
  endRoom,
  requestJoinRoom,
  getJoinRequests,
  respondToJoinRequest,
  getJoinRequestStatus,
}

