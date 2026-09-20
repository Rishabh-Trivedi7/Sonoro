import apiClient from './apiClient'

export const historyService = {
  recordListen: async (listenData) => {
    const response = await apiClient.post('/history', listenData)
    return response.data.data
  },

  recordSongListen: async (listenData) => {
    const response = await apiClient.post('/history/listen', listenData)
    return response.data.data
  },

  recordListeningTime: async (timeData) => {
    const response = await apiClient.post('/history/time', timeData)
    return response.data.data
  },

  getHistory: async () => {
    const response = await apiClient.get('/history')
    return response.data.data
  },

  getMusicDNA: async () => {
    const response = await apiClient.get('/history/dna')
    return response.data.data
  },
}

export default historyService
