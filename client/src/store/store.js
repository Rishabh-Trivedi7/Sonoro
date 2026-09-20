import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import roomReducer from './slices/roomSlice'
import playbackReducer from './slices/playbackSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    room: roomReducer,
    playback: playbackReducer,
  },
})
