import mongoose, { Schema } from 'mongoose'

/**
 * Friendship — Symmetric friendship relationship between users.
 *
 * Status flow:
 *   requester sends request → status: 'pending'
 *   recipient accepts       → status: 'accepted'
 *   recipient rejects       → status: 'rejected' (or document deleted)
 *
 * The social graph in Sonora exists so users can listen together.
 */
const friendshipSchema = new Schema(
  {
    requester: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
)

// Prevent duplicate friendship documents in either direction
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true })

export const Friendship = mongoose.model('Friendship', friendshipSchema)
