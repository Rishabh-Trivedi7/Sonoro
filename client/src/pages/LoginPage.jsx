import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import authService from '../services/authService'
import { ROUTES } from '../constants/routes'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, verifyRegistration } = useAuth()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Unverified email handling state
  const [requiresVerification, setRequiresVerification] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [resendStatus, setResendStatus] = useState('')

  const from = location.state?.from?.pathname || ROUTES.HOME

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setResendStatus('')

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
      const responseData = err.response?.data?.data
      if (responseData?.requiresEmailVerification) {
        setRequiresVerification(true)
        setUnverifiedEmail(responseData.email || identifier.trim())
        setError('This account requires email verification before logging in.')
      } else {
        setError(err.response?.data?.message || 'Invalid credentials. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    setResendStatus('')

    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    setLoading(true)
    try {
      await verifyRegistration({
        email: unverifiedEmail,
        otp: otp.trim(),
      })
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired code. Please request a new one.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setError('')
    setResendStatus('')
    setLoading(true)
    try {
      await authService.resendRegistrationOtp(unverifiedEmail)
      setResendStatus('Verification code resent to your email.')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code.')
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
              {requiresVerification ? 'Verify Account' : 'Welcome back'}
            </h1>
            <p className="text-sm text-muted mt-1">
              {requiresVerification
                ? `Enter code sent to ${unverifiedEmail}`
                : 'Enter the lounge to listen and connect'}
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

          {/* Success status */}
          {resendStatus && (
            <div className="mb-6 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-md text-emerald-300 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{resendStatus}</span>
            </div>
          )}

          {!requiresVerification ? (
            /* Standard Login Form */
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
          ) : (
            /* Controlled OTP verification form for unverified accounts */
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label
                  htmlFor="verifyCode"
                  className="block text-xs font-medium uppercase tracking-wider text-muted mb-2 text-center"
                >
                  6-Digit Verification Code
                </label>
                <input
                  id="verifyCode"
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  className="w-full text-center tracking-[0.35em] font-mono text-2xl py-3 px-4 rounded-lg bg-obsidian border border-border focus:border-gold focus:outline-hidden text-cream transition-colors placeholder:text-muted/40"
                  autoFocus
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={loading || otp.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </Button>

              <div className="flex flex-col items-center gap-2 pt-2 text-xs">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-gold hover:underline font-medium cursor-pointer"
                >
                  Resend verification code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRequiresVerification(false)
                    setError('')
                    setOtp('')
                  }}
                  className="text-muted hover:text-cream cursor-pointer"
                >
                  ← Back to standard login
                </button>
              </div>
            </form>
          )}

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
