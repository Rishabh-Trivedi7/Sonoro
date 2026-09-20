import crypto from 'crypto'

/**
 * Generate a random alphanumeric uppercase string of specified length.
 * Excludes characters like O, 0, I, 1 to prevent user confusion if desired,
 * or uses full clean standard charset.
 */
const ALPHANUM = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

export function generateRandomCode(length = 6) {
  let result = ''
  const bytes = crypto.randomBytes(length)
  for (let i = 0; i < length; i++) {
    result += ALPHANUM[bytes[i] % ALPHANUM.length]
  }
  return result
}

/**
 * Generates a Sonora User UID.
 * Example: SON-7K4P92
 */
export function generateUserUID() {
  return `SON-${generateRandomCode(6)}`
}

/**
 * Generates a Sonora Room RID.
 * Example: RM-8F3K21
 */
export function generateRoomRID() {
  return `RM-${generateRandomCode(6)}`
}
