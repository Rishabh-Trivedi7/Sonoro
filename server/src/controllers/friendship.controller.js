import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { Friendship } from '../models/friendship.model.js'
import { User } from '../models/user.model.js'
import { ListeningHistory } from '../models/listeningHistory.model.js'

/**
 * POST /api/v1/friends/request
 * Send a friend request.
 */
const sendRequest = asyncHandler(async (req, res) => {
  const { recipientUsername, recipientId } = req.body
  const requesterId = req.user._id

  if (!recipientUsername && !recipientId) {
    throw new ApiError(400, 'recipientUsername or recipientId is required')
  }

  let recipient = null
  if (recipientUsername) {
    const trimmed = recipientUsername.trim()
    recipient = await User.findOne({
      $or: [
        { username: trimmed.toLowerCase() },
        { uid: trimmed.toUpperCase() },
      ],
    })
  } else if (recipientId) {
    recipient = await User.findById(recipientId)
  }

  if (!recipient) throw new ApiError(404, 'User not found')

  if (recipient._id.equals(requesterId)) {
    throw new ApiError(400, 'You cannot send a friend request to yourself')
  }

  const targetRecipientId = recipient._id

  // Check for existing friendship in either direction
  const existing = await Friendship.findOne({
    $or: [
      { requester: requesterId, recipient: targetRecipientId },
      { requester: targetRecipientId, recipient: requesterId },
    ],
  })

  if (existing) {
    if (existing.status === 'accepted') throw new ApiError(409, 'Already friends')
    if (existing.status === 'pending') throw new ApiError(409, 'Friend request already sent')
    // Rejected — allow re-request
    existing.status = 'pending'
    existing.requester = requesterId
    existing.recipient = targetRecipientId
    await existing.save()
    return res.json(new ApiResponse(200, existing, 'Friend request sent'))
  }

  const friendship = await Friendship.create({
    requester: requesterId,
    recipient: targetRecipientId,
    status: 'pending',
  })

  return res.status(201).json(new ApiResponse(201, friendship, 'Friend request sent'))
})

/**
 * PATCH /api/v1/friends/respond
 * Accept or reject a friend request.
 */
const respondToRequest = asyncHandler(async (req, res) => {
  const { friendshipId, action } = req.body

  if (!friendshipId || !action) throw new ApiError(400, 'friendshipId and action are required')
  if (!['accept', 'reject'].includes(action)) {
    throw new ApiError(400, 'action must be "accept" or "reject"')
  }

  const friendship = await Friendship.findById(friendshipId)
  if (!friendship) throw new ApiError(404, 'Friend request not found')

  // Only the recipient can respond
  if (!friendship.recipient.equals(req.user._id)) {
    throw new ApiError(403, 'You can only respond to requests sent to you')
  }

  if (friendship.status !== 'pending') {
    throw new ApiError(409, 'This request has already been responded to')
  }

  friendship.status = action === 'accept' ? 'accepted' : 'rejected'
  await friendship.save()

  return res.json(new ApiResponse(200, friendship, `Friend request ${friendship.status}`))
})

/**
 * GET /api/v1/friends
 * Get current user's accepted friends.
 */
const getFriends = asyncHandler(async (req, res) => {
  const userId = req.user._id

  const friendships = await Friendship.find({
    $or: [{ requester: userId }, { recipient: userId }],
    status: 'accepted',
  })
    .populate('requester', 'username avatar bio')
    .populate('recipient', 'username avatar bio')
    .lean()

  // Return the "other" user in each friendship
  const friends = friendships.map((f) => {
    const friend = f.requester._id.toString() === userId.toString()
      ? f.recipient
      : f.requester
    return {
      ...friend,
      friend,
      friendshipId: f._id,
    }
  })

  return res.json(new ApiResponse(200, friends, 'Friends fetched'))
})

/**
 * GET /api/v1/friends/pending
 * Get pending incoming friend requests.
 */
const getPendingRequests = asyncHandler(async (req, res) => {
  const requests = await Friendship.find({
    recipient: req.user._id,
    status: 'pending',
  })
    .populate('requester', 'username avatar')
    .lean()

  return res.json(new ApiResponse(200, requests, 'Pending requests fetched'))
})

/**
 * DELETE /api/v1/friends/:friendshipId
 * Remove a friend or cancel a sent request.
 */
const removeFriend = asyncHandler(async (req, res) => {
  const friendship = await Friendship.findById(req.params.friendshipId)

  if (!friendship) throw new ApiError(404, 'Friendship not found')

  const userId = req.user._id
  const isParty =
    friendship.requester.equals(userId) || friendship.recipient.equals(userId)

  if (!isParty) throw new ApiError(403, 'You are not part of this friendship')

  await friendship.deleteOne()

  return res.json(new ApiResponse(200, {}, 'Friendship removed'))
})

/**
 * GET /api/v1/friends/compatibility/:userId
 * Calculate a simple music compatibility score between the current user
 * and another user, based on shared artists in listening history.
 */
const getCompatibility = asyncHandler(async (req, res) => {
  const meId = req.user._id
  const otherId = req.params.userId

  const other = await User.findById(otherId).select('username avatar bio')
  if (!other) throw new ApiError(404, 'User not found')

  const [myHistory, theirHistory] = await Promise.all([
    ListeningHistory.find({ user: meId }).lean(),
    ListeningHistory.find({ user: otherId }).lean(),
  ])

  // Aggregate artist play counts
  const countArtists = (history) => {
    const map = {}
    history.forEach((h) => {
      const key = h.artist.toLowerCase().trim()
      map[key] = (map[key] || 0) + 1
    })
    return map
  }

  const myArtists = countArtists(myHistory)
  const theirArtists = countArtists(theirHistory)

  const myKeys = new Set(Object.keys(myArtists))
  const theirKeys = new Set(Object.keys(theirArtists))
  const sharedKeys = [...myKeys].filter((k) => theirKeys.has(k))

  let score = 0
  if (myKeys.size + theirKeys.size > 0) {
    // Jaccard-style similarity on artist sets
    const union = new Set([...myKeys, ...theirKeys]).size
    const intersection = sharedKeys.length
    score = Math.round((intersection / union) * 100)
  }

  // Shared artists (top 5 by combined play count)
  const sharedArtists = sharedKeys
    .map((k) => ({ artist: k, count: (myArtists[k] || 0) + (theirArtists[k] || 0) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((x) => x.artist)

  return res.json(
    new ApiResponse(200, {
      score,
      sharedArtists,
      myListenCount: myHistory.length,
      theirListenCount: theirHistory.length,
      user: other,
    }, 'Compatibility calculated')
  )
})

export {
  sendRequest,
  respondToRequest,
  getFriends,
  getPendingRequests,
  removeFriend,
  getCompatibility,
}
