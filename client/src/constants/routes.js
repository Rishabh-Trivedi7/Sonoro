/**
 * Route path constants — single source of truth for navigation.
 * Use with <Link to={ROUTES.X} /> and useNavigate() across the app.
 */
export const ROUTES = {
  HOME: '/home',
  DISCOVER: '/discover',
  FRIENDS: '/friends',
  ROOMS: '/rooms',
  ROOM_DETAIL: '/rooms/:roomId',
  LIBRARY: '/library',
  PROFILE: '/profile',
  USER_PROFILE: '/profile/:username',
  LOGIN: '/login',
  REGISTER: '/register',
  SETTINGS: '/settings',
}

export const getRoomRoute = (roomId) => `/rooms/${roomId}`
export const getProfileRoute = (username) => `/profile/${username}`
