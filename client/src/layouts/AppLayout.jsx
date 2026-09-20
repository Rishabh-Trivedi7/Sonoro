import { useState, useEffect } from 'react'
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import { ROUTES, getRoomRoute } from '../constants/routes'
import { useAuth } from '../hooks/useAuth'
import socketService from '../services/socketService'

const NAV_ITEMS = [
  {
    name: 'Home',
    path: ROUTES.HOME,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    name: 'Discover',
    path: ROUTES.DISCOVER,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    ),
  },
  {
    name: 'Friends',
    path: ROUTES.FRIENDS,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
  },
  {
    name: 'Rooms',
    path: ROUTES.ROOMS,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 0 1 0-5.304m5.304 0a3.75 3.75 0 0 1 0 5.304m-7.425 2.121a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M12 12h.008v.008H12V12Z" />
      </svg>
    ),
  },
  {
    name: 'Library',
    path: ROUTES.LIBRARY,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a.75.75 0 0 0 .552-.72v-1.89m-9 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66A.75.75 0 0 0 9 14.803V9.75" />
      </svg>
    ),
  },
]

export default function AppLayout() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [avatarError, setAvatarError] = useState(false)

  const avatarUrl = user?.avatar?.url

  // ── Global real-time join-request resolution listener ───────────────────────────
  // Mounted once in the app shell so it works regardless of which page B is on.
  // Runs whenever isAuthenticated changes so it attaches after login/restore.
  useEffect(() => {
    if (!isAuthenticated) return

    const attach = () => {
      const socket = socketService.getSocket()
      if (!socket) return false

      const handleResolved = ({ status, roomId, authoritativePlayback, currentTrack }) => {
        // Broadcast custom DOM event so RoomPage updates reactively (both accept and reject)
        window.dispatchEvent(
          new CustomEvent('sonora:join_request_resolved', {
            detail: { status, roomId, authoritativePlayback, currentTrack },
          })
        )
        if (status === 'accepted' && roomId) {
          // Auto-navigate requester into the room if on a different page.
          navigate(getRoomRoute(roomId))
        }
      }

      socket.on('room:join_request_resolved', handleResolved)
      return () => socket.off('room:join_request_resolved', handleResolved)
    }

    // Try to attach immediately; if socket isn't ready yet, retry after 1s
    const cleanup = attach()
    if (cleanup) return cleanup

    const timer = setTimeout(() => {
      attach()
    }, 1000)
    return () => clearTimeout(timer)
  }, [isAuthenticated, navigate])

  return (
    <div className="min-h-screen bg-obsidian text-cream flex flex-col selection:bg-gold selection:text-obsidian overflow-x-hidden">
      {/* ── Top Header Navigation ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-obsidian/90 backdrop-blur-md border-b border-border transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
          {/* Brand Wordmark with subtle acoustic ripple detail */}
          <Link
            to={ROUTES.HOME}
            className="group flex items-center gap-2.5 focus-visible:ring-1 focus-visible:ring-gold rounded-sm py-1"
            aria-label="Sonora Home"
          >
            <span className="font-display text-lg text-cream tracking-[0.14em] font-semibold group-hover:text-gold transition-colors duration-200">
              SONORA
            </span>
            <span
              className="flex items-center gap-[2px] opacity-70 group-hover:opacity-100 transition-opacity duration-200"
              aria-hidden="true"
            >
              <span className="w-[2px] h-2 bg-gold rounded-full" />
              <span className="w-[2px] h-3.5 bg-gold rounded-full" />
              <span className="w-[2px] h-1.5 bg-gold rounded-full" />
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Main Navigation">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  [
                    'relative py-2 text-sm font-medium tracking-wide transition-colors duration-200',
                    isActive ? 'text-cream font-semibold' : 'text-muted hover:text-cream',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <span>{item.name}</span>
                    {isActive && (
                      <span
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold transition-all duration-200"
                        aria-hidden="true"
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Auth State / Profile Avatar (Far Right) */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  to={ROUTES.PROFILE}
                  className="group relative flex items-center gap-2 rounded-full p-0.5 focus-visible:ring-2 focus-visible:ring-gold"
                  aria-label="View Profile"
                >
                  <span className="hidden sm:inline text-xs text-muted group-hover:text-cream font-medium">
                    {user?.username}
                  </span>
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-border group-hover:border-gold transition-colors duration-200 bg-charcoal flex items-center justify-center">
                    {avatarUrl && !avatarError ? (
                      <img
                        src={avatarUrl}
                        alt={user?.username || 'Profile'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <span className="text-xs font-semibold text-gold font-sans">
                        {(user?.username || 'U')[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="text-xs font-medium text-muted hover:text-red-400 px-2 sm:px-2.5 py-1.5 rounded transition-colors flex items-center gap-1 focus-visible:ring-1 focus-visible:ring-red-400"
                  title="Log out"
                  aria-label="Log out"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                  </svg>
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to={ROUTES.LOGIN}
                  className="text-xs font-medium text-cream hover:text-gold px-3 py-1.5 rounded transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to={ROUTES.REGISTER}
                  className="text-xs font-medium bg-gold text-obsidian px-3.5 py-1.5 rounded-md hover:bg-gold/85 transition-colors shadow-sm"
                >
                  Join
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Page Content ─────────────────────────────────────────── */}
      <main className="flex-1 pb-24 md:pb-12">
        <Outlet />
      </main>

      {/* ── Mobile Bottom Navigation Bar ──────────────────────────── */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 bg-obsidian/95 backdrop-blur-lg border-t border-border md:hidden transition-colors duration-200"
        aria-label="Mobile Navigation"
      >
        <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                [
                  'relative flex flex-col items-center justify-center flex-1 py-1 gap-1 text-[11px] font-medium tracking-tight transition-colors duration-200',
                  isActive ? 'text-cream' : 'text-muted hover:text-cream',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <div className={isActive ? 'text-gold' : 'text-muted'}>
                    {item.icon}
                  </div>
                  <span>{item.name}</span>
                  {isActive && (
                    <span
                      className="absolute top-1 right-1/2 translate-x-3 w-1 h-1 rounded-full bg-gold"
                      aria-hidden="true"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
