import { createSlice } from '@reduxjs/toolkit'

const roomSlice = createSlice({
  name: 'room',
  initialState: {
    currentRoom: null,   // full room document from REST
    members: [],         // live presence from socket
    queue: [],           // live queue from socket
    messages: [],        // chat messages
  },
  reducers: {
    setRoom: (state, action) => {
      state.currentRoom = action.payload
    },
    clearRoom: (state) => {
      state.currentRoom = null
      state.members = []
      state.queue = []
      state.messages = []
    },
    setMembers: (state, action) => {
      state.members = action.payload
    },
    setQueue: (state, action) => {
      state.queue = action.payload
    },
    addMessage: (state, action) => {
      state.messages = [...state.messages.slice(-199), action.payload]
    },
    setMessages: (state, action) => {
      state.messages = action.payload
    },
    updateCurrentTrack: (state, action) => {
      if (state.currentRoom) {
        state.currentRoom = { ...state.currentRoom, currentTrack: action.payload }
      }
    },
  },
})

export const {
  setRoom,
  clearRoom,
  setMembers,
  setQueue,
  addMessage,
  setMessages,
  updateCurrentTrack,
} = roomSlice.actions
export default roomSlice.reducer
