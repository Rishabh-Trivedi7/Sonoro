import mongoose, { Schema } from 'mongoose'

/**
 * Track — Sonora's curated track catalog.
 *
 * Tracks are provider-agnostic at the application layer.
 * The provider + providerId pair uniquely identifies the source video.
 *
 * Thumbnails are constructed from provider conventions:
 *   YouTube: https://img.youtube.com/vi/{providerId}/hqdefault.jpg
 *
 * Tracks are seeded from catalog data and can be added by users
 * via the "Add by YouTube URL" flow.
 */
const trackSchema = new Schema(
  {
    provider: {
      type: String,
      required: true,
      enum: ['youtube'],
      default: 'youtube',
    },
    providerId: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    artist: {
      type: String,
      required: true,
      trim: true,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    duration: {
      // Duration in seconds — optional, derived from player
      type: Number,
      default: 0,
    },
    addedBy: {
      // null = seeded catalog entry, ObjectId = user-submitted
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

// Compound unique index: one entry per provider + videoId
trackSchema.index({ provider: 1, providerId: 1 }, { unique: true })

// Text index for search
trackSchema.index({ title: 'text', artist: 'text' })

export const Track = mongoose.model('Track', trackSchema)
