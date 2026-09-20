import mongoose, { Schema } from 'mongoose'

/**
 * Otp — Centralized verification record for email OTP security.
 *
 * Supported purposes:
 * - 'registration'     : Pending account creation
 * - 'email_change'     : Changing account email address
 * - 'account_deletion' : Confirming destructive account deletion
 *
 * Security rules:
 * - OTP is stored exclusively as a cryptographic SHA-256 hash, NEVER plaintext.
 * - Single-use: consumedAt is recorded on successful verification.
 * - Automatic expiration via MongoDB TTL index on expiresAt.
 * - Attempt limiting enforced via attempts counter.
 */
const otpSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['registration', 'email_change', 'account_deletion'],
      required: true,
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      default: {},
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

// TTL Index: Automatically removes documents when expiresAt is reached
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Compound index for fast queries when finding active OTP by email and purpose
otpSchema.index({ email: 1, purpose: 1, consumedAt: 1 })

export const Otp = mongoose.model('Otp', otpSchema)
