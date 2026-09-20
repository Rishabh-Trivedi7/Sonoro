import { Router } from 'express'
import {
  recordListen,
  recordListeningTime,
  getHistory,
  getMusicDNA,
} from '../controllers/history.controller.js'
import { verifyJWT } from '../middlewares/auth.middleware.js'

const router = Router()

router.use(verifyJWT)

router.route('/').post(recordListen)
router.route('/listen').post(recordListen)
router.route('/time').post(recordListeningTime)
router.route('/').get(getHistory)
router.route('/dna').get(getMusicDNA)

export default router
