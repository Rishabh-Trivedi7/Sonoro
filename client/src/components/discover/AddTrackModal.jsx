import { useState } from 'react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import searchService from '../../services/searchService'

export default function AddTrackModal({ isOpen, onClose, onTrackAdded }) {
  const [videoUrl, setVideoUrl] = useState('')
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [duration, setDuration] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!videoUrl.trim() || !title.trim() || !artist.trim()) {
      setError('Please provide a YouTube URL or Video ID, Title, and Artist')
      return
    }

    setLoading(true)
    try {
      const addedTrack = await searchService.addTrack({
        videoUrl: videoUrl.trim(),
        title: title.trim(),
        artist: artist.trim(),
        duration: duration ? parseInt(duration, 10) : 0,
      })

      setVideoUrl('')
      setTitle('')
      setArtist('')
      setDuration('')
      onTrackAdded(addedTrack)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add track. Check URL or Video ID.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian/80 backdrop-blur-sm">
      <div className="bg-charcoal border border-border rounded-xl max-w-lg w-full p-6 shadow-2xl relative">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-cream font-semibold">
            Add Track to Catalog
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-muted hover:text-cream rounded"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-xs text-muted mb-5">
          Paste any standard YouTube video URL or ID (e.g.{' '}
          <span className="text-gold font-mono">https://www.youtube.com/watch?v=dQw4w9WgXcQ</span> or{' '}
          <span className="text-gold font-mono">dQw4w9WgXcQ</span>).
        </p>

        {error && (
          <div className="mb-4 p-2.5 bg-red-950/40 border border-red-800/60 rounded text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="videoUrl"
            label="YouTube Video URL or Video ID"
            type="text"
            placeholder="https://youtube.com/watch?v=..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="title"
              label="Track Title"
              type="text"
              placeholder="Song title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Input
              id="artist"
              label="Artist / Band"
              type="text"
              placeholder="Artist name"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              required
            />
          </div>

          <Input
            id="duration"
            label="Duration in seconds (Optional)"
            type="number"
            placeholder="e.g. 215"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="ghost" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={loading}>
              {loading ? 'Adding...' : 'Add Track'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
