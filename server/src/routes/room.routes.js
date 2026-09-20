import { Router } from 'express'
import {
  createRoom,
  getRoom,
  getActiveRooms,
  searchRooms,
  getUserRooms,
  endRoom,
  requestJoinRoom,
  getJoinRequests,
  respondToJoinRequest,
  getJoinRequestStatus,
} from '../controllers/room.controller.js'
import { verifyJWT } from '../middlewares/auth.middleware.js'

const router = Router()

// All room routes require authentication
router.use(verifyJWT)

router.route('/').post(createRoom)
router.route('/').get(getActiveRooms)
router.route('/search').get(searchRooms)
router.route('/mine').get(getUserRooms)

// Specific room routes
router.route('/:roomId').get(getRoom)
router.route('/:roomId/end').patch(endRoom)
router.route('/:roomId/join-request').post(requestJoinRoom)
router.route('/:roomId/join-requests').get(getJoinRequests)
router.route('/:roomId/join-requests/:requestId').patch(respondToJoinRequest)
router.route('/:roomId/join-request/status').get(getJoinRequestStatus)

export default router
