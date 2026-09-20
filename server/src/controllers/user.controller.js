import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { cookieOptions } from '../utils/cookieOptions.js'
import { User } from '../models/user.model.js'
import { Room } from '../models/room.model.js'
import { Friendship } from '../models/friendship.model.js'
import { ListeningHistory } from '../models/listeningHistory.model.js'
import { Otp } from '../models/otp.model.js'
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js'
import { generateAndSaveOTP, verifyOTP } from '../utils/otp.service.js'
import { sendOTPEmail } from '../utils/email/emailService.js'

const getCookieName = () => process.env.REFRESH_TOKEN_COOKIE_NAME || 'sonora_refresh_token'

/**
 * ── Registration Flow with Email OTP ──────────────────────────────────────────
 * Step 1: POST /users/register
 * Validates input, hashes password, saves pending OTP record, and sends 6-digit OTP.
 */
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body

  if (!username?.trim() || !email?.trim() || !password?.trim()) {
    throw new ApiError(400, 'All fields (username, email, password) are required')
  }

  const normalizedUsername = username.trim().toLowerCase()
  const normalizedEmail = email.trim().toLowerCase()

  if (normalizedUsername.length < 3) {
    throw new ApiError(400, 'Username must be at least 3 characters long')
  }

  if (password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters long')
  }

  // Check if username or email is already taken by a verified/active account
  const existedUser = await User.findOne({
    $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
  })

  if (existedUser) {
    throw new ApiError(409, 'User with email or username already exists')
  }

  // Pre-hash password with bcrypt for secure storage in pending OTP payload
  const passwordHash = await bcrypt.hash(password, 10)

  // Generate and store OTP securely (SHA-256 hashed)
  const { otp } = await generateAndSaveOTP({
    email: normalizedEmail,
    purpose: 'registration',
    payload: {
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
    },
  })

  // Dispatch branded transactional email (or dev fallback)
  await sendOTPEmail({
    to: normalizedEmail,
    otp,
    purpose: 'registration',
    username: normalizedUsername,
  })

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        email: normalizedEmail,
        requiresEmailVerification: true,
      },
      'Verification code sent to your email. Please enter the 6-digit code to complete registration.'
    )
  )
})

/**
 * Step 2: POST /users/verify-registration
 * Verifies submitted OTP, creates verified User document, and establishes authenticated session.
 */
const verifyRegistration = asyncHandler(async (req, res) => {
  const { email, otp } = req.body

  if (!email?.trim() || !otp) {
    throw new ApiError(400, 'Email and verification code are required')
  }

  const normalizedEmail = email.trim().toLowerCase()

  // Verify OTP against stored hash (checks attempts, expiration, single-use)
  const verification = await verifyOTP({
    email: normalizedEmail,
    otp: otp.toString().trim(),
    purpose: 'registration',
  })

  const { username, passwordHash } = verification.payload || {}

  if (!username || !passwordHash) {
    throw new ApiError(400, 'Registration details missing or expired. Please register again.')
  }

  // Check again to avoid race conditions
  const existedUser = await User.findOne({
    $or: [{ username }, { email: normalizedEmail }],
  })

  if (existedUser) {
    throw new ApiError(409, 'User with email or username already exists')
  }

  // Create active, email-verified user
  const user = await User.create({
    username,
    email: normalizedEmail,
    password: passwordHash,
    isEmailVerified: true,
  })

  if (!user) {
    throw new ApiError(500, 'Something went wrong while creating the account')
  }

  // Establish authenticated session with tokens
  const accessToken = user.generateAccessToken()
  const refreshToken = user.generateRefreshToken()

  user.refreshToken = refreshToken
  await user.save({ validateBeforeSave: false })

  const registeredUser = await User.findById(user._id).select('-password -refreshToken')
  const cookieName = getCookieName()

  return res
    .status(201)
    .cookie(cookieName, refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        201,
        {
          user: registeredUser,
          accessToken,
        },
        'Account verified and created successfully'
      )
    )
})

/**
 * POST /users/resend-registration-otp
 * Resends a fresh OTP subject to 60-second cooldown limit.
 */
const resendRegistrationOtp = asyncHandler(async (req, res) => {
  const { email } = req.body

  if (!email?.trim()) {
    throw new ApiError(400, 'Email is required')
  }

  const normalizedEmail = email.trim().toLowerCase()

  // Check if already registered and verified
  const existedUser = await User.findOne({ email: normalizedEmail })
  if (existedUser && existedUser.isEmailVerified !== false) {
    throw new ApiError(400, 'This email is already verified. Please sign in.')
  }

  // Find most recent pending registration OTP record
  const pendingOtp = await Otp.findOne({
    email: normalizedEmail,
    purpose: 'registration',
  }).sort({ createdAt: -1 })

  if (!pendingOtp || !pendingOtp.payload?.username) {
    throw new ApiError(400, 'No pending registration found for this email. Please register again.')
  }

  const { otp } = await generateAndSaveOTP({
    email: normalizedEmail,
    purpose: 'registration',
    payload: pendingOtp.payload,
  })

  await sendOTPEmail({
    to: normalizedEmail,
    otp,
    purpose: 'registration',
    username: pendingOtp.payload.username,
  })

  return res.status(200).json(
    new ApiResponse(
      200,
      { email: normalizedEmail },
      'A new verification code has been sent to your email'
    )
  )
})

/**
 * ── Login Behavior ────────────────────────────────────────────────────────────
 * Allows login only if credentials match AND isEmailVerified !== false.
 */
const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body

  if ((!username && !email) || !password) {
    throw new ApiError(400, 'Username/Email and password are required')
  }

  const user = await User.findOne({
    $or: [
      ...(username ? [{ username: username.toLowerCase().trim() }] : []),
      ...(email ? [{ email: email.toLowerCase().trim() }] : []),
    ],
  })

  // Use a generic error to avoid leaking whether the email/username exists
  if (!user) {
    throw new ApiError(401, 'Invalid user credentials')
  }

  const isPasswordValid = await user.isPasswordCorrect(password)

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid user credentials')
  }

  // Block login if unverified and return controlled path for email verification
  if (user.isEmailVerified === false) {
    return res.status(403).json(
      new ApiResponse(
        403,
        {
          email: user.email,
          requiresEmailVerification: true,
        },
        'Please verify your email before logging in. A verification code can be requested.'
      )
    )
  }

  const accessToken = user.generateAccessToken()
  const refreshToken = user.generateRefreshToken()

  user.refreshToken = refreshToken
  await user.save({ validateBeforeSave: false })

  const loggedInUser = await User.findById(user._id).select('-password -refreshToken')
  const cookieName = getCookieName()

  return res
    .status(200)
    .cookie(cookieName, refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
        },
        'User logged in successfully'
      )
    )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
  const cookieName = getCookieName()
  const incomingRefreshToken = req.cookies?.[cookieName] || req.cookies?.refreshToken

  if (!incomingRefreshToken) {
    throw new ApiError(401, 'Unauthorized request')
  }

  let decodedToken
  try {
    decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired refresh token')
  }

  const user = await User.findById(decodedToken?._id)

  if (!user) {
    throw new ApiError(401, 'Unauthorized request')
  }

  if (user.refreshToken !== incomingRefreshToken) {
    throw new ApiError(401, 'Invalid or expired refresh token')
  }

  const newAccessToken = user.generateAccessToken()
  const newRefreshToken = user.generateRefreshToken()

  user.refreshToken = newRefreshToken
  await user.save({ validateBeforeSave: false })

  const refreshedUser = await User.findById(user._id).select('-password -refreshToken')

  return res
    .status(200)
    .cookie(cookieName, newRefreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: refreshedUser,
          accessToken: newAccessToken,
        },
        'Access token refreshed successfully'
      )
    )
})

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: null,
      },
    },
    {
      returnDocument: 'after',
    }
  )

  const cookieName = getCookieName()

  return res
    .status(200)
    .clearCookie(cookieName, cookieOptions)
    .json(new ApiResponse(200, {}, 'User logged out successfully'))
})

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, 'Current user profile fetched successfully'))
})

const updateProfile = asyncHandler(async (req, res) => {
  const { bio, username } = req.body
  const user = await User.findById(req.user._id)

  if (!user) throw new ApiError(404, 'User not found')

  if (username !== undefined && username.trim()) {
    const normalizedUsername = username.trim().toLowerCase()
    if (normalizedUsername !== user.username) {
      if (normalizedUsername.length < 3) {
        throw new ApiError(400, 'Username must be at least 3 characters long')
      }
      const taken = await User.findOne({ username: normalizedUsername })
      if (taken) throw new ApiError(409, 'Username already taken')
      user.username = normalizedUsername
    }
  }

  if (bio !== undefined) {
    user.bio = bio.trim().slice(0, 300)
  }

  // Avatar upload via Cloudinary
  if (req.file) {
    const oldPublicId = user.avatar?.public_id
    const result = await uploadToCloudinary(req.file.path, {
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
    })
    if (result) {
      if (oldPublicId) await deleteFromCloudinary(oldPublicId)
      user.avatar = { url: result.secure_url, public_id: result.public_id }
    }
  }

  await user.save({ validateBeforeSave: false })

  const updated = await User.findById(user._id).select('-password -refreshToken')
  return res.json(new ApiResponse(200, updated, 'Profile updated'))
})

const getUserProfile = asyncHandler(async (req, res) => {
  const identifier = req.params.username.trim()
  const user = await User.findOne({
    $or: [
      { username: identifier.toLowerCase() },
      { uid: identifier.toUpperCase() },
    ],
  }).select('-password -refreshToken')

  if (!user) throw new ApiError(404, 'User not found')

  return res.json(new ApiResponse(200, user, 'User profile fetched'))
})

const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query
  if (!q || !q.trim()) {
    return res.json(new ApiResponse(200, [], 'Users fetched'))
  }

  const queryStr = q.trim()
  const regex = new RegExp(queryStr, 'i')

  const users = await User.find({
    _id: { $ne: req.user._id },
    $or: [
      { username: regex },
      { uid: queryStr.toUpperCase() },
      { uid: regex },
    ],
  })
    .select('_id uid username avatar bio')
    .limit(20)
    .lean()

  return res.json(new ApiResponse(200, users, 'Users fetched successfully'))
})

/**
 * ── Dynamic Listening Stats ───────────────────────────────────────────────────
 * GET /users/me/stats
 * Computes:
 * - songsListened: distinct tracks listened to from ListeningHistory
 * - totalListeningTime: actual persisted playback seconds from listening sessions
 * - friendsCount: accepted friendships only
 * - roomsJoined: actual rooms user has joined
 * - roomsHosted: rooms where user is host
 */
const getUserStats = asyncHandler(async (req, res) => {
  const userId = req.user._id

  // 1. Songs Listened: number of distinct songs user has actually listened to
  const distinctSongs = await ListeningHistory.distinct('providerId', { user: userId })
  const songsListened = distinctSongs.length

  // 2. Total Listening Time: actual accumulated playback time in seconds
  const user = await User.findById(userId).select('stats')
  const totalListeningTime = user?.stats?.listeningTimeSeconds || 0

  // 3. Friends count: symmetric accepted friendships
  const friendsCount = await Friendship.countDocuments({
    $or: [{ requester: userId }, { recipient: userId }],
    status: 'accepted',
  })

  // 4. Rooms Joined: actual rooms successfully joined
  const roomsJoined = Math.max(
    user?.stats?.joinedRooms?.length || 0,
    user?.stats?.roomsJoined || 0
  )

  // 5. Rooms Hosted: rooms where user is host
  const roomsHosted = await Room.countDocuments({ host: userId })

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        songsListened,
        totalListeningTime,
        friendsCount,
        roomsJoined,
        roomsHosted,
      },
      'User listening statistics fetched successfully'
    )
  )
})

/**
 * ── Privacy & Settings ────────────────────────────────────────────────────────
 * GET /users/me/settings
 */
const getUserSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('privacy email username uid createdAt')

  const defaultPrivacy = {
    discoverable: 'everyone',
    friendRequests: 'everyone',
    roomInvites: 'everyone',
  }

  const privacy = {
    ...defaultPrivacy,
    ...(user?.privacy?.toObject ? user.privacy.toObject() : user?.privacy || {}),
  }

  // Active session details (current session)
  const activeSessions = [
    {
      id: 'current',
      device: req.headers['user-agent'] || 'Current Browser',
      ip: req.ip || 'Current Device',
      lastActive: new Date(),
      isCurrent: true,
    },
  ]

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        privacy,
        activeSessions,
        email: user?.email,
      },
      'User settings fetched successfully'
    )
  )
})

/**
 * PATCH /users/me/settings
 */
const updateUserSettings = asyncHandler(async (req, res) => {
  const { privacy } = req.body
  const user = await User.findById(req.user._id)

  if (!user) throw new ApiError(404, 'User not found')

  if (privacy) {
    const validDiscoverable = ['everyone', 'friends', 'none']
    const validFriendReqs = ['everyone', 'none']
    const validRoomInvites = ['everyone', 'friends', 'none']

    if (!user.privacy) {
      user.privacy = { discoverable: 'everyone', friendRequests: 'everyone', roomInvites: 'everyone' }
    }

    if (privacy.discoverable && validDiscoverable.includes(privacy.discoverable)) {
      user.privacy.discoverable = privacy.discoverable
    }
    if (privacy.friendRequests && validFriendReqs.includes(privacy.friendRequests)) {
      user.privacy.friendRequests = privacy.friendRequests
    }
    if (privacy.roomInvites && validRoomInvites.includes(privacy.roomInvites)) {
      user.privacy.roomInvites = privacy.roomInvites
    }
  }

  await user.save({ validateBeforeSave: false })

  return res.status(200).json(
    new ApiResponse(200, { privacy: user.privacy }, 'Privacy settings updated successfully')
  )
})

/**
 * ── Email Change with OTP ─────────────────────────────────────────────────────
 * Step 1: POST /users/me/change-email/request
 */
const changeEmailRequest = asyncHandler(async (req, res) => {
  const { newEmail } = req.body

  if (!newEmail?.trim()) {
    throw new ApiError(400, 'New email address is required')
  }

  const normalizedNewEmail = newEmail.trim().toLowerCase()

  if (normalizedNewEmail === req.user.email.toLowerCase()) {
    throw new ApiError(400, 'New email must be different from your current email')
  }

  const emailExists = await User.findOne({ email: normalizedNewEmail })
  if (emailExists) {
    throw new ApiError(409, 'An account with this email address already exists')
  }

  // Generate OTP sent to the NEW email address
  const { otp } = await generateAndSaveOTP({
    email: normalizedNewEmail,
    purpose: 'email_change',
    payload: {
      userId: req.user._id,
      newEmail: normalizedNewEmail,
    },
  })

  await sendOTPEmail({
    to: normalizedNewEmail,
    otp,
    purpose: 'email_change',
    username: req.user.username,
  })

  return res.status(200).json(
    new ApiResponse(
      200,
      { newEmail: normalizedNewEmail },
      'Verification code sent to your new email address'
    )
  )
})

/**
 * Step 2: POST /users/me/change-email/verify
 */
const changeEmailVerify = asyncHandler(async (req, res) => {
  const { newEmail, otp } = req.body

  if (!newEmail?.trim() || !otp) {
    throw new ApiError(400, 'New email and verification code are required')
  }

  const normalizedNewEmail = newEmail.trim().toLowerCase()

  const verification = await verifyOTP({
    email: normalizedNewEmail,
    otp: otp.toString().trim(),
    purpose: 'email_change',
  })

  if (verification.payload?.userId?.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Unauthorized email change verification request')
  }

  const user = await User.findById(req.user._id)
  if (!user) throw new ApiError(404, 'User not found')

  // Check once more for collisions
  const collision = await User.findOne({
    email: normalizedNewEmail,
    _id: { $ne: req.user._id },
  })

  if (collision) {
    throw new ApiError(409, 'An account with this email address already exists')
  }

  user.email = normalizedNewEmail
  user.isEmailVerified = true
  await user.save({ validateBeforeSave: false })

  const updatedUser = await User.findById(user._id).select('-password -refreshToken')

  return res.status(200).json(
    new ApiResponse(200, updatedUser, 'Email address changed successfully')
  )
})

/**
 * ── Change Password ───────────────────────────────────────────────────────────
 * POST /users/me/change-password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current password and new password are required')
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, 'New password must be at least 6 characters long')
  }

  const user = await User.findById(req.user._id)
  if (!user) throw new ApiError(404, 'User not found')

  const isCurrentCorrect = await user.isPasswordCorrect(currentPassword)
  if (!isCurrentCorrect) {
    throw new ApiError(400, 'Current password is incorrect')
  }

  user.password = newPassword
  await user.save()

  return res.status(200).json(new ApiResponse(200, {}, 'Password changed successfully'))
})

/**
 * ── Account Deletion with OTP ─────────────────────────────────────────────────
 * Step 1: POST /users/me/delete/request
 */
const deleteAccountRequest = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
  if (!user) throw new ApiError(404, 'User not found')

  const { otp } = await generateAndSaveOTP({
    email: user.email,
    purpose: 'account_deletion',
    payload: {
      userId: user._id,
    },
  })

  await sendOTPEmail({
    to: user.email,
    otp,
    purpose: 'account_deletion',
    username: user.username,
  })

  return res.status(200).json(
    new ApiResponse(
      200,
      { email: user.email },
      'Verification code sent to your email to confirm account deletion'
    )
  )
})

/**
 * Step 2: POST /users/me/delete/verify
 */
const deleteAccountVerify = asyncHandler(async (req, res) => {
  const { otp } = req.body

  if (!otp) {
    throw new ApiError(400, 'Verification code is required to confirm account deletion')
  }

  const user = await User.findById(req.user._id)
  if (!user) throw new ApiError(404, 'User not found')

  const verification = await verifyOTP({
    email: user.email,
    otp: otp.toString().trim(),
    purpose: 'account_deletion',
  })

  if (verification.payload?.userId?.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Unauthorized deletion request')
  }

  // Invalidate any active OTPs
  await Otp.deleteMany({ email: user.email })

  // Delete user document
  await User.findByIdAndDelete(user._id)

  const cookieName = getCookieName()

  return res
    .status(200)
    .clearCookie(cookieName, cookieOptions)
    .json(new ApiResponse(200, {}, 'Account permanently deleted'))
})

export {
  registerUser,
  verifyRegistration,
  resendRegistrationOtp,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getCurrentUser,
  updateProfile,
  getUserProfile,
  searchUsers,
  getUserStats,
  getUserSettings,
  updateUserSettings,
  changeEmailRequest,
  changeEmailVerify,
  changePassword,
  deleteAccountRequest,
  deleteAccountVerify,
}
