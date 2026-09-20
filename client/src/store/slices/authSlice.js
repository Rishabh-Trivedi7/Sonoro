import { createSlice } from '@reduxjs/toolkit'

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    accessToken: null,
    isAuthenticated: false,
    // loading: true during the initial session-restoration check
    loading: true,
    // initialized flips to true only once the session check is complete
    // (success or failure). Protected routes must wait for this before deciding.
    initialized: false,
  },
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user
      state.accessToken = action.payload.accessToken
      state.isAuthenticated = true
      state.loading = false
      state.initialized = true
    },
    clearCredentials: (state) => {
      state.user = null
      state.accessToken = null
      state.isAuthenticated = false
      state.loading = false
      state.initialized = true
    },
    setLoading: (state, action) => {
      state.loading = action.payload
    },
    updateUser: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
      }
    },
  },
})

export const { setCredentials, clearCredentials, setLoading, updateUser } = authSlice.actions
export default authSlice.reducer
