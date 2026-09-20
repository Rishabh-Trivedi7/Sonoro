import { User } from '../models/user.model.js'
import { Room } from '../models/room.model.js'
import { generateUserUID, generateRoomRID } from './idGenerator.js'

/**
 * Idempotent backfill function to assign UIDs to existing users
 * and RIDs + default roomType to existing rooms.
 */
export async function backfillUIDsAndRIDs() {
  try {
    // ── 1. Backfill Users ──────────────────────────────────────────────
    const usersWithoutUID = await User.find({
      $or: [{ uid: { $exists: false } }, { uid: null }, { uid: '' }],
    })

    if (usersWithoutUID.length > 0) {
      console.log(`🔄 Backfilling UID for ${usersWithoutUID.length} existing user(s)...`)
      for (const user of usersWithoutUID) {
        let assigned = false
        while (!assigned) {
          const candidateUID = generateUserUID()
          const exists = await User.findOne({ uid: candidateUID })
          if (!exists) {
            user.uid = candidateUID
            await user.save({ validateBeforeSave: false })
            assigned = true
          }
        }
      }
      console.log('✅ User UID backfill complete.')
    }

    // ── 2. Backfill isEmailVerified for Existing Users ─────────────────
    const usersWithoutEmailVerified = await User.find({
      isEmailVerified: { $exists: false },
    })

    if (usersWithoutEmailVerified.length > 0) {
      console.log(`🔄 Backfilling isEmailVerified for ${usersWithoutEmailVerified.length} existing user(s)...`)
      for (const user of usersWithoutEmailVerified) {
        user.isEmailVerified = true
        await user.save({ validateBeforeSave: false })
      }
      console.log('✅ User isEmailVerified backfill complete.')
    }

    // ── 3. Backfill Rooms ──────────────────────────────────────────────
    const roomsToUpdate = await Room.find({
      $or: [
        { rid: { $exists: false } },
        { rid: null },
        { rid: '' },
        { roomType: { $exists: false } },
        { roomType: null },
      ],
    })

    if (roomsToUpdate.length > 0) {
      console.log(`🔄 Backfilling RID/roomType for ${roomsToUpdate.length} existing room(s)...`)
      for (const room of roomsToUpdate) {
        if (!room.roomType) {
          room.roomType = 'public'
        }
        if (!room.rid) {
          let assigned = false
          while (!assigned) {
            const candidateRID = generateRoomRID()
            const exists = await Room.findOne({ rid: candidateRID })
            if (!exists) {
              room.rid = candidateRID
              assigned = true
            }
          }
        }
        await room.save({ validateBeforeSave: false })
      }
      console.log('✅ Room RID backfill complete.')
    }
  } catch (error) {
    console.error('⚠️ Backfill error:', error.message)
  }
}
