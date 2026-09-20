import apiClient from './apiClient'

const authService = {
  /**
   * Initiate registration. Backend sends a 6-digit OTP to the user's email.
   * Returns { email, requiresEmailVerification: true }.
   */
  register: async (userData) => {
    const response = await apiClient.post('/users/register', userData)
    return response.data.data
  },

  /**
   * Verify registration OTP. Backend creates verified user and returns { user, accessToken }.
   */
  verifyRegistration: async ({ email, otp }) => {
    const response = await apiClient.post('/users/verify-registration', { email, otp })
    return response.data.data // { user, accessToken }
  },

  /**
   * Resend a fresh registration verification OTP (subject to 60s cooldown).
   */
  resendRegistrationOtp: async (email) => {
    const response = await apiClient.post('/users/resend-registration-otp', { email })
    return response.data.data
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
