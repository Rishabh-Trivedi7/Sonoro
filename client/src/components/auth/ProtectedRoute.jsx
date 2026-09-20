import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../constants/routes'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, initialized, loading } = useAuth()
  const location = useLocation()

  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center gap-4 text-cream">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-border border-t-gold animate-spin" />
          <span className="absolute w-2 h-2 rounded-full bg-gold animate-ping" />
        </div>
        <p className="font-display tracking-widest text-sm text-muted">SONORA</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  return children
}
