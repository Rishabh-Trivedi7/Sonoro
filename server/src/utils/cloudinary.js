import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'

// Initialize Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * Upload a local file to Cloudinary, then remove the local temp file.
 * Returns the Cloudinary response (url, public_id, etc.) or null on failure.
 *
 * @param {string} localFilePath - Absolute path to the temp file
 * @param {object} options - Cloudinary upload options
 * @returns {Promise<object|null>}
 */
export const uploadToCloudinary = async (localFilePath, options = {}) => {
  if (!localFilePath) return null

  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: 'auto',
      folder: 'sonora/avatars',
      ...options,
    })
    // Remove temp file after successful upload
    fs.unlinkSync(localFilePath)
    return response
  } catch (error) {
    // Always clean up temp file
    try { fs.unlinkSync(localFilePath) } catch (_) {}
    console.error('Cloudinary upload error:', error.message)
    return null
  }
}

/**
 * Delete an asset from Cloudinary by its public_id.
 *
 * @param {string} publicId
 * @returns {Promise<void>}
 */
export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return
  try {
    await cloudinary.uploader.destroy(publicId)
  } catch (error) {
    console.error('Cloudinary delete error:', error.message)
  }
}
