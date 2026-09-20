import mongoose, { Schema } from 'mongoose'

/**
 * RoomJoinRequest — Handles access requests for private Sonora rooms.
 */
const roomJoinRequestSchema = new Schema(
  {
    room: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    requester: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

// Ensure one request per user per room
roomJoinRequestSchema.index({ room: 1, requester: 1 }, { unique: true })

export const RoomJoinRequest = mongoose.model('RoomJoinRequest', roomJoinRequestSchema)
