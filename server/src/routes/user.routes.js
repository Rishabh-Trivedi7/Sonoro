import { Router } from 'express'
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getCurrentUser,
  updateProfile,
  getUserProfile,
  searchUsers,
  getUserStats,
  getUserSettings,
  updateUserSettings,
  changeEmail,
  changeEmailRequest,
  changePassword,
  deleteAccount,
  deleteAccountRequest,
} from '../controllers/user.controller.js'
import { verifyJWT } from '../middlewares/auth.middleware.js'
import { upload } from '../utils/multer.js'

const router = Router()

// ── Public routes ─────────────────────────────────────────────────────────────
// IMPORTANT: Specific static paths must be registered BEFORE the /:username
// wildcard route, otherwise Express would match them as usernames.
router.route('/register').post(registerUser)
router.route('/login').post(loginUser)
router.route('/refresh-token').post(refreshAccessToken)

// ── Protected routes ──────────────────────────────────────────────────────────
// These must also come before /:username to prevent the wildcard swallowing them.
router.route('/logout').post(verifyJWT, logoutUser)
router.route('/me').get(verifyJWT, getCurrentUser)
router.route('/me/profile').patch(verifyJWT, upload.single('avatar'), updateProfile)
router.route('/me/stats').get(verifyJWT, getUserStats)
router.route('/me/settings').get(verifyJWT, getUserSettings).patch(verifyJWT, updateUserSettings)

// Account & Security routes
router.route('/me/change-email').post(verifyJWT, changeEmail)
router.route('/me/change-email/request').post(verifyJWT, changeEmailRequest)
router.route('/me/change-password').post(verifyJWT, changePassword)
router.route('/me/delete').post(verifyJWT, deleteAccount)
router.route('/me/delete/request').post(verifyJWT, deleteAccountRequest)

router.route('/search').get(verifyJWT, searchUsers)

// ── Wildcard public profile route (must be last) ──────────────────────────────
router.route('/:username').get(getUserProfile)

export default router
