import crypto from 'crypto'
import { Otp } from '../models/otp.model.js'
import { ApiError } from './ApiError.js'

const RESEND_COOLDOWN_MS = 60 * 1000 // 60 seconds
const OTP_EXPIRY_MS = 10 * 60 * 1000 // 10 minutes
const MAX_VERIFICATION_ATTEMPTS = 5

function hashOTP(otp) {
  const secret = process.env.OTP_SECRET || process.env.ACCESS_TOKEN_SECRET || 'sonora_otp_salt_fallback'
  return crypto
    .createHash('sha256')
    .update(`${otp}:${secret}`)
    .digest('hex')
}

/**
 * Generate a new 6-digit OTP and store its secure hash in MongoDB.
 * Enforces resend cooldown and invalidates previous active OTPs for the same email & purpose.
 *
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.purpose - 'registration' | 'email_change' | 'account_deletion'
 * @param {Object} [params.payload] - Arbitrary context stored with the OTP
 * @returns {Promise<{ otp: string, expiresAt: Date }>}
 */
export async function generateAndSaveOTP({ email, purpose, payload = {} }) {
  const normalizedEmail = email.trim().toLowerCase()

  // 1. Check resend cooldown on existing active OTP
  const activeExisting = await Otp.findOne({
    email: normalizedEmail,
    purpose,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 })

  if (activeExisting) {
    const elapsedMs = Date.now() - new Date(activeExisting.lastSentAt).getTime()
    if (elapsedMs < RESEND_COOLDOWN_MS) {
      const remainingSec = Math.ceil((RESEND_COOLDOWN_MS - elapsedMs) / 1000)
      throw new ApiError(
        429,
        `Please wait ${remainingSec} second${remainingSec === 1 ? '' : 's'} before requesting a new code`
      )
    }

    // Invalidate previous active OTPs for this email and purpose
    await Otp.deleteMany({
      email: normalizedEmail,
      purpose,
    })
  }

  // 2. Generate cryptographically strong 6-digit numeric OTP (100000 to 999999)
  const otp = crypto.randomInt(100000, 1000000).toString()
  const otpHash = hashOTP(otp)
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS)

  // 3. Store hashed OTP in MongoDB
  await Otp.create({
    email: normalizedEmail,
    otpHash,
    purpose,
    payload,
    attempts: 0,
    maxAttempts: MAX_VERIFICATION_ATTEMPTS,
    lastSentAt: new Date(),
    expiresAt,
  })

  return { otp, expiresAt }
}

/**
 * Verify a user-submitted OTP against its stored hash.
 * Enforces expiration, attempt limits, and single-use invalidation.
 *
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.otp - Plain 6-digit string from user input
 * @param {string} params.purpose - 'registration' | 'email_change' | 'account_deletion'
 * @returns {Promise<{ success: boolean, payload: any }>}
 */
export async function verifyOTP({ email, otp, purpose }) {
  if (!email || !otp || !purpose) {
    throw new ApiError(400, 'Email, OTP, and purpose are required')
  }

  const normalizedEmail = email.trim().toLowerCase()
  const trimmedOtp = otp.toString().trim()

  // 1. Find the active OTP record
  const record = await Otp.findOne({
    email: normalizedEmail,
    purpose,
    consumedAt: null,
  }).sort({ createdAt: -1 })

  if (!record) {
    throw new ApiError(400, 'No active verification code found. Please request a new code.')
  }

  // Check expiration
  if (record.expiresAt < new Date()) {
    await Otp.findByIdAndDelete(record._id)
    throw new ApiError(400, 'Verification code has expired. Please request a new code.')
  }

  // Check attempts
  if (record.attempts >= record.maxAttempts) {
    record.consumedAt = new Date()
    await record.save()
    throw new ApiError(400, 'Maximum verification attempts exceeded. Please request a new code.')
  }

  // 2. Compute hash and compare in constant time
  const inputHash = hashOTP(trimmedOtp)
  const isMatch =
    inputHash.length === record.otpHash.length &&
    crypto.timingSafeEqual(Buffer.from(inputHash, 'utf8'), Buffer.from(record.otpHash, 'utf8'))

  if (!isMatch) {
    record.attempts += 1
    await record.save()

    const remaining = record.maxAttempts - record.attempts
    if (remaining <= 0) {
      record.consumedAt = new Date()
      await record.save()
      throw new ApiError(400, 'Maximum verification attempts exceeded. Please request a new code.')
    }

    throw new ApiError(
      400,
      `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
    )
  }

  // 3. Mark as consumed (single-use)
  record.consumedAt = new Date()
  await record.save()

  return {
    success: true,
    payload: record.payload || {},
  }
}
