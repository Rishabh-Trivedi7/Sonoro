import apiClient from './apiClient'

export const userService = {
  getUserProfile: async (username) => {
    const response = await apiClient.get(`/users/${username}`)
    return response.data.data
  },

  updateProfile: async (formDataOrData) => {
    const isFormData = formDataOrData instanceof FormData
    const response = await apiClient.patch('/users/me/profile', formDataOrData, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    })
    return response.data.data
  },

  searchUsers: async (query) => {
    const response = await apiClient.get('/users/search', {
      params: { q: query },
    })
    return response.data.data
  },

  getUserStats: async () => {
    const response = await apiClient.get('/users/me/stats')
    return response.data.data
  },

  getSettings: async () => {
    const response = await apiClient.get('/users/me/settings')
    return response.data.data
  },

  updateSettings: async (settingsData) => {
    const response = await apiClient.patch('/users/me/settings', settingsData)
    return response.data.data
  },

  changeEmail: async (newEmail) => {
    const response = await apiClient.post('/users/me/change-email', { newEmail })
    return response.data.data
  },

  changePassword: async ({ currentPassword, newPassword }) => {
    const response = await apiClient.post('/users/me/change-password', {
      currentPassword,
      newPassword,
    })
    return response.data.data
  },

  deleteAccount: async () => {
    const response = await apiClient.post('/users/me/delete')
    return response.data.data
  },
}

export default userService
