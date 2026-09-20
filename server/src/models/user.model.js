import mongoose, { Schema } from 'mongoose'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { generateUserUID } from '../utils/idGenerator.js'

const userSchema = new Schema(
  {
    uid: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: false, // Optional for future Google-only users
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Unique index applies only when googleId is present
    },
    avatar: {
      url: {
        type: String,
        default: '',
      },
      public_id: {
        type: String,
        default: '',
      },
    },
    bio: {
      type: String,
      default: '',
    },
    refreshToken: {
      type: String,
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: true,
    },
    privacy: {
      discoverable: {
        type: String,
        enum: ['everyone', 'friends', 'none'],
        default: 'everyone',
      },
      friendRequests: {
        type: String,
        enum: ['everyone', 'none'],
        default: 'everyone',
      },
      roomInvites: {
        type: String,
        enum: ['everyone', 'friends', 'none'],
        default: 'everyone',
      },
    },
    stats: {
      listeningTimeSeconds: {
        type: Number,
        default: 0,
      },
      roomsJoined: {
        type: Number,
        default: 0,
      },
      joinedRooms: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Room',
        },
      ],
    },
  },
  {
    timestamps: true,
  }
)

// Pre-save hook to hash password and assign UID if missing
userSchema.pre('save', async function () {
  if (!this.uid) {
    this.uid = generateUserUID()
  }
  if (!this.isModified('password')) return
  if (this.password) {
    // If password is not already a bcrypt hash, hash it with salt 10
    if (!this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      this.password = await bcrypt.hash(this.password, 10)
    }
  }
})

// Instance method to compare password
userSchema.methods.isPasswordCorrect = async function (password) {
  if (!this.password) return false
  return await bcrypt.compare(password, this.password)
}

// Instance method to generate Access Token
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  )
}

// Instance method to generate Refresh Token
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  )
}

export const User = mongoose.model('User', userSchema)
