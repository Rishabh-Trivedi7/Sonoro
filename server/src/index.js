import 'dotenv/config'
import http from 'http'
import { Server } from 'socket.io'
import connectDB from './db/index.js'
import { app } from './app.js'
import { initSocket } from './socket/index.js'
import { setIO } from './socket/ioInstance.js'
import { seedCatalog } from './providers/catalog.js'
import { backfillUIDsAndRIDs } from './utils/backfill.js'

const PORT = process.env.PORT || 8000

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  },
})

initSocket(io)
setIO(io)

connectDB()
  .then(async () => {
    // Seed the track catalog on startup (idempotent)
    await seedCatalog()
    // Safe idempotent backfill of user UID and room RID
    await backfillUIDsAndRIDs()

    server.listen(PORT, () => {
      console.log(`⚙️  Sonora server running on port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error('MONGO db connection failed !!! ', err)
  })
