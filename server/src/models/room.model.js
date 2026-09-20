import mongoose, { Schema } from 'mongoose'
import { generateRoomRID } from '../utils/idGenerator.js'

/**
 * Room — A Sonora listening room.
 *
 * The room is the core social unit of Sonora.
 * One host controls playback; all members listen together.
 *
 * currentTrack and playback are embedded for fast real-time access.
 * The queue is managed via Socket.IO and stored in the DB for persistence.
 */

const trackEmbedSchema = new Schema(
  {
    provider: { type: String, default: 'youtube' },
    providerId: { type: String, required: true },
    title: { type: String, required: true },
    artist: { type: String, required: true },
    thumbnail: { type: String, required: true },
    duration: { type: Number, default: 0 },
  },
  { _id: false }
)

const playbackSchema = new Schema(
  {
    isPlaying: { type: Boolean, default: false },
    position: { type: Number, default: 0 }, // seconds
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const queueItemSchema = new Schema(
  {
    track: { type: trackEmbedSchema, required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requestedByName: { type: String, required: true },
    votes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    voteCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

const roomSchema = new Schema(
  {
    rid: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    roomType: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    host: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    currentTrack: {
      type: trackEmbedSchema,
      default: null,
    },
    playback: {
      type: playbackSchema,
      default: () => ({ isPlaying: false, position: 0, updatedAt: new Date() }),
    },
    queue: {
      type: [queueItemSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'ended'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
)

roomSchema.pre('save', async function () {
  if (!this.rid) {
    this.rid = generateRoomRID()
  }
})

roomSchema.index({ host: 1 })
roomSchema.index({ status: 1, roomType: 1, createdAt: -1 })
roomSchema.index({ status: 1, createdAt: -1 })

export const Room = mongoose.model('Room', roomSchema)

