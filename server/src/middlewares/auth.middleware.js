import jwt from 'jsonwebtoken'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { User } from '../models/user.model.js'

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization') || req.headers?.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Unauthorized request')
    }

    const token = authHeader.replace('Bearer ', '').trim()

    if (!token) {
      throw new ApiError(401, 'Unauthorized request')
    }

    let decodedToken
    try {
      decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    } catch (err) {
      throw new ApiError(401, 'Invalid or expired access token')
    }

    const user = await User.findById(decodedToken?._id).select('-password')

    if (!user) {
      throw new ApiError(401, 'Unauthorized request')
    }

    req.user = user
    next()
  } catch (error) {
    throw new ApiError(error?.statusCode || 401, error?.message || 'Invalid or expired access token')
  }
})
