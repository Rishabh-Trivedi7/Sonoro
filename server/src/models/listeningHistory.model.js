import mongoose, { Schema } from 'mongoose'

/**
 * ListeningHistory — Records meaningful listening events.
 *
 * One entry per track per session — not per-second telemetry.
 * Used for: recent listening display, Music DNA calculation,
 * music compatibility scoring between users.
 */
const listeningHistorySchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    provider: {
      type: String,
      required: true,
      default: 'youtube',
    },
    providerId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    artist: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
      default: '',
    },
    listenedAt: {
      type: Date,
      default: Date.now,
    },
    roomId: {
      // Optional: which room this listen happened in
      type: Schema.Types.ObjectId,
      ref: 'Room',
      default: null,
    },
  },
  {
    timestamps: false,
  }
)

listeningHistorySchema.index({ user: 1, listenedAt: -1 })

export const ListeningHistory = mongoose.model('ListeningHistory', listeningHistorySchema)
