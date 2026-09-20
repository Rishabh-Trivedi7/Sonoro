import { Router } from 'express'
import { search, addTrack } from '../controllers/search.controller.js'
import { verifyJWT } from '../middlewares/auth.middleware.js'

const router = Router()

router.route('/').get(search)
router.route('/tracks').get(search)
router.route('/tracks').post(verifyJWT, addTrack)

export default router
