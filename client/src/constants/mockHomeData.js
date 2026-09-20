/**
 * Mock data for the Sonora Home experience (Chunk 7).
 *
 * Local mock data only — no backend or external dependencies.
 * All artwork and avatar URLs point to stable, tasteful photography
 * with fallback mechanisms in UI components for complete resilience.
 */

export const MOCK_ROOMS = [
  {
    id: 'room-1',
    name: 'Dhurandhar Night',
    currentTrack: 'Dhurandhar — Title Track',
    artist: 'Shashwat Sachdev, Hanumankind',
    listenersCount: 4,
    artwork: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=600&q=80',
    tag: 'Hip-Hop & Cinema',
  },
  {
    id: 'room-2',
    name: 'Late Night Drives',
    currentTrack: 'Kho Gaye Hum Kahan',
    artist: 'Jasleen Royal & Prateek Kuhad',
    listenersCount: 7,
    artwork: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    tag: 'Indie & Chill',
  },
  {
    id: 'room-3',
    name: 'Sunday Slowdowns',
    currentTrack: 'Yeh Fitoor Mera',
    artist: 'Arijit Singh & Amit Trivedi',
    listenersCount: 3,
    artwork: 'https://images.unsplash.com/photo-1445985543470-41fba5c3144a?auto=format&fit=crop&w=600&q=80',
    tag: 'Acoustic Soul',
  },
]

export const MOCK_VIBE_PEOPLE = [
  {
    id: 'person-1',
    name: 'Ananya',
    matchPercentage: 91,
    clue: 'Mostly: Bollywood · Indie · R&B',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'person-2',
    name: 'Rahul',
    matchPercentage: 87,
    clue: 'Recently listening to: Arijit Singh',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'person-3',
    name: 'Priya',
    matchPercentage: 82,
    clue: 'Mostly: Acoustic · Lo-fi · Ambient',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'person-4',
    name: 'Kabir',
    matchPercentage: 78,
    clue: 'Recently listening to: Prateek Kuhad',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
  },
]

export const MOCK_RECENT_LISTENING = [
  {
    id: 'track-1',
    title: 'Dhurandhar — Title Track',
    artist: 'Shashwat Sachdev, Hanumankind',
    artwork: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'track-2',
    title: 'Yeh Fitoor Mera',
    artist: 'Arijit Singh, Amit Trivedi',
    artwork: 'https://images.unsplash.com/photo-1445985543470-41fba5c3144a?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'track-3',
    title: 'Kho Gaye Hum Kahan',
    artist: 'Jasleen Royal, Prateek Kuhad',
    artwork: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'track-4',
    title: 'Heeriye',
    artist: 'Jasleen Royal, Arijit Singh',
    artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80',
  },
]

export const MOCK_CURRENT_USER = {
  name: 'Samar',
  handle: 'samar',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80',
}
