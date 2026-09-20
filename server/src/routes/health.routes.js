import { Router } from 'express'
import { ApiResponse } from '../utils/ApiResponse.js'

const router = Router()

router.route('/').get((req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, { status: 'OK' }, 'Sonora API is running 🎵'))
})

export default router
