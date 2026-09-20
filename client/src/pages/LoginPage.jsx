import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ROUTES } from '../constants/routes'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const from = location.state?.from?.pathname || ROUTES.HOME

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!identifier.trim() || !password) {
      setError('Please enter your email or username and password')
      return
    }

    setLoading(true)
    try {
      const isEmail = identifier.includes('@')
      await login({
        email: isEmail ? identifier.trim() : undefined,
        username: !isEmail ? identifier.trim() : undefined,
        password,
      })
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-charcoal border border-border rounded-xl p-8 shadow-2xl backdrop-blur-sm relative overflow-hidden">
          {/* Subtle decorative gold ambient glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="text-center mb-8">
            <Link
              to={ROUTES.HOME}
              className="inline-flex items-center gap-2 mb-3 group"
            >
              <span className="font-display text-2xl text-cream tracking-[0.14em] font-semibold group-hover:text-gold transition-colors">
                SONORA
              </span>
              <span className="flex items-center gap-[2px] opacity-70 group-hover:opacity-100 transition-opacity">
                <span className="w-[2px] h-2 bg-gold rounded-full" />
                <span className="w-[2px] h-3.5 bg-gold rounded-full" />
                <span className="w-[2px] h-1.5 bg-gold rounded-full" />
              </span>
            </Link>
            <h1 className="font-display text-xl text-cream font-medium">
              Welcome back
            </h1>
            <p className="text-sm text-muted mt-1">
              Enter the lounge to listen and connect
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-3 bg-red-950/40 border border-red-800/60 rounded-md text-red-300 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Standard Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              id="identifier"
              label="Email or Username"
              type="text"
              placeholder="aria or aria@example.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
            />

            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              disabled={loading}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-obsidian" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Signing in...</span>
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Switch to Register */}
          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted">
              Don't have an account?{' '}
              <Link
                to={ROUTES.REGISTER}
                className="text-gold hover:underline font-medium ml-1"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
