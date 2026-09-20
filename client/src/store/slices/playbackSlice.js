import { createSlice } from '@reduxjs/toolkit'

const playbackSlice = createSlice({
  name: 'playback',
  initialState: {
    isPlaying: false,
    position: 0,       // seconds
    duration: 0,       // seconds (from YT player)
    updatedAt: null,   // server timestamp of last state change
    providerId: null,  // current YouTube videoId
  },
  reducers: {
    setPlaybackState: (state, action) => {
      return { ...state, ...action.payload }
    },
    clearPlayback: () => ({
      isPlaying: false,
      position: 0,
      duration: 0,
      updatedAt: null,
      providerId: null,
    }),
    setDuration: (state, action) => {
      state.duration = action.payload
    },
  },
})

export const { setPlaybackState, clearPlayback, setDuration } = playbackSlice.actions
export default playbackSlice.reducer
