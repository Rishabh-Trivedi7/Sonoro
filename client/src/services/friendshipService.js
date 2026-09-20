import apiClient from './apiClient'

export const friendshipService = {
  getFriends: async () => {
    const response = await apiClient.get('/friends')
    return response.data.data
  },

  getPendingRequests: async () => {
    const response = await apiClient.get('/friends/pending')
    return response.data.data
  },

  sendRequest: async (recipientUsername) => {
    const response = await apiClient.post('/friends/request', { recipientUsername })
    return response.data.data
  },

  respondToRequest: async ({ friendshipId, action }) => {
    const response = await apiClient.put('/friends/respond', { friendshipId, action })
    return response.data.data
  },

  removeFriend: async (friendshipId) => {
    const response = await apiClient.delete(`/friends/${friendshipId}`)
    return response.data.data
  },

  getCompatibility: async (userId) => {
    const response = await apiClient.get(`/friends/compatibility/${userId}`)
    return response.data.data
  },
}

export default friendshipService
