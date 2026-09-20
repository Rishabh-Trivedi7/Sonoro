import mongoose, { Schema } from 'mongoose'

/**
 * RoomMessage — Lightweight room chat message.
 *
 * Chat remains secondary to the music.
 * Messages are stored for session history but the room is
 * not a messaging application.
 */
const roomMessageSchema = new Schema(
  {
    room: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
)

roomMessageSchema.index({ room: 1, createdAt: 1 })

export const RoomMessage = mongoose.model('RoomMessage', roomMessageSchema)
