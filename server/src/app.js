import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import healthRouter from './routes/health.routes.js'
import userRouter from './routes/user.routes.js'
import searchRouter from './routes/search.routes.js'
import roomRouter from './routes/room.routes.js'
import friendshipRouter from './routes/friendship.routes.js'
import historyRouter from './routes/history.routes.js'
import { notFound } from './middlewares/notFound.middleware.js'
import { errorHandler } from './middlewares/error.middleware.js'

const app = express()

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
}))

app.use(express.json({ limit: '16kb' }))
app.use(express.urlencoded({ extended: true, limit: '16kb' }))
app.use(express.static('public'))
app.use(cookieParser())

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/v1/health', healthRouter)
app.use('/api/v1/users', userRouter)
app.use('/api/v1/search', searchRouter)
app.use('/api/v1/rooms', roomRouter)
app.use('/api/v1/friends', friendshipRouter)
app.use('/api/v1/history', historyRouter)

// ─── Error Handling Middleware ────────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

export { app }
