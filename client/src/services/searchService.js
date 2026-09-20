import apiClient from './apiClient'

export const searchService = {
  /**
   * Search tracks. If query is provided, queries live YouTube metadata via backend.
   * If query is empty, fetches the initial Sonora catalog.
   */
  searchTracks: async (query) => {
    const cleanQuery = query?.trim()
    if (!cleanQuery) {
      const response = await apiClient.get('/search/tracks')
      return response.data.data || []
    }
    const response = await apiClient.get('/search', {
      params: { q: cleanQuery },
    })
    return response.data.data || []
  },

  /**
   * Manual track addition by YouTube URL or videoId (fallback).
   */
  addTrack: async (trackData) => {
    const response = await apiClient.post('/search/tracks', trackData)
    return response.data.data
  },
}

export default searchService
