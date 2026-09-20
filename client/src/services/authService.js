import apiClient from './apiClient'

const authService = {
  /**
   * Register user directly. Backend creates verified user and returns { user, accessToken }.
   */
  register: async (userData) => {
    const response = await apiClient.post('/users/register', userData)
    return response.data.data // { user, accessToken }
  },

  /**
   * Login with email/username + password.
   * Returns { user, accessToken }; refresh token is in the HttpOnly cookie.
   */
  login: async (credentials) => {
    const response = await apiClient.post('/users/login', credentials)
    return response.data.data // { user, accessToken }
  },

  /**
   * Logout. Requires a valid access token (Bearer header attached by apiClient).
   * Backend clears the stored refresh token and the cookie.
   */
  logout: async () => {
    const response = await apiClient.post('/users/logout')
    return response.data
  },

  /**
   * Get the currently authenticated user.
   * Requires a valid access token.
   */
  getCurrentUser: async () => {
    const response = await apiClient.get('/users/me')
    return response.data.data
  },

  /**
   * Silently exchange the HttpOnly refresh-token cookie for a new access token.
   * The browser automatically sends the cookie — no manual token is needed.
   * Returns { user, accessToken }.
   */
  refreshToken: async () => {
    const response = await apiClient.post('/users/refresh-token')
    return response.data.data // { user, accessToken }
  },
}

export default authService
