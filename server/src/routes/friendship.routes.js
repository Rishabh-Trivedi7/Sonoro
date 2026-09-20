import { Router } from 'express'
import {
  sendRequest,
  respondToRequest,
  getFriends,
  getPendingRequests,
  removeFriend,
  getCompatibility,
} from '../controllers/friendship.controller.js'
import { verifyJWT } from '../middlewares/auth.middleware.js'

const router = Router()

router.use(verifyJWT)

router.route('/').get(getFriends)
router.route('/request').post(sendRequest)
router.route('/respond').patch(respondToRequest).put(respondToRequest)
router.route('/pending').get(getPendingRequests)
router.route('/compatibility/:userId').get(getCompatibility)
router.route('/:friendshipId').delete(removeFriend)

export default router
