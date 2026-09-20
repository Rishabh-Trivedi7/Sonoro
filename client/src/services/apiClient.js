import axios from 'axios'
import { store } from '../store/store'
import { setCredentials, clearCredentials } from '../store/slices/authSlice'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // sends the HttpOnly refresh-token cookie on every request
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Request interceptor ──────────────────────────────────────────────────────
// Attach the in-memory access token from Redux to every outgoing request.
apiClient.interceptors.request.use(
  (config) => {
    const state = store.getState()
    const token = state.auth.accessToken
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Response interceptor — 401 refresh flow ──────────────────────────────────
// When a request receives a 401, attempt a single silent token refresh.
// Prevents infinite loops and concurrent refresh storms.
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Only intercept 401s that:
    // - haven't already been retried
    // - are not the auth endpoints themselves (avoids infinite loops)
    const isAuthEndpoint =
      originalRequest.url?.includes('/users/login') ||
      originalRequest.url?.includes('/users/register') ||
      originalRequest.url?.includes('/users/refresh-token')

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      // If a refresh is already in flight, queue this request and wait
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return apiClient(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Use a raw axios call so this request itself is NOT intercepted by this handler
        const response = await axios.post(
          `${BASE_URL}/users/refresh-token`,
          {},
          { withCredentials: true }
        )

        const { accessToken, user } = response.data.data
        const currentUser = user || store.getState().auth.user

        store.dispatch(setCredentials({ user: currentUser, accessToken }))

        processQueue(null, accessToken)
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        store.dispatch(clearCredentials())
        // Redirect to login — we are outside React so use window.location
        window.location.replace('/login')
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
