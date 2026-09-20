import apiClient from './apiClient'

export const roomService = {
  createRoom: async ({ name, currentTrack, roomType = 'public' }) => {
    const response = await apiClient.post('/rooms', { name, currentTrack, roomType })
    return response.data.data
  },

  getActiveRooms: async () => {
    const response = await apiClient.get('/rooms')
    return response.data.data
  },

  searchRooms: async (query) => {
    const response = await apiClient.get('/rooms/search', {
      params: { q: query },
    })
    return response.data.data
  },

  getUserRooms: async () => {
    const response = await apiClient.get('/rooms/mine')
    return response.data.data
  },

  getRoom: async (roomId) => {
    const response = await apiClient.get(`/rooms/${roomId}`)
    return response.data.data
  },

  endRoom: async (roomId) => {
    const response = await apiClient.patch(`/rooms/${roomId}/end`)
    return response.data.data
  },

  requestJoin: async (roomId) => {
    const response = await apiClient.post(`/rooms/${roomId}/join-request`)
    return response.data.data
  },

  getJoinRequests: async (roomId) => {
    const response = await apiClient.get(`/rooms/${roomId}/join-requests`)
    return response.data.data
  },

  respondJoinRequest: async (roomId, requestId, action) => {
    const response = await apiClient.patch(`/rooms/${roomId}/join-requests/${requestId}`, {
      action,
    })
    return response.data.data
  },

  getJoinRequestStatus: async (roomId) => {
    const response = await apiClient.get(`/rooms/${roomId}/join-request/status`)
    return response.data.data
  },
}

export default roomService
