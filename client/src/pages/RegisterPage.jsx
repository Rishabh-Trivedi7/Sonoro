import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import authService from '../services/authService'
import { ROUTES } from '../constants/routes'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, verifyRegistration } = useAuth()

  // Step 1 State: Registration details
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Step 2 State: OTP verification
  const [isVerifying, setIsVerifying] = useState(false)
  const [otp, setOtp] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendMessage, setResendMessage] = useState('')

  // Common UI State
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 60-second cooldown timer for resend
  useEffect(() => {
    let timer
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0))
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [resendCooldown])

  // Step 1: Request Registration OTP
  const handleSubmitDetails = async (e) => {
    e.preventDefault()
    setError('')
    setResendMessage('')

    if (!username.trim() || !email.trim() || !password) {
      setError('Please fill in all fields')
      return
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters long')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)
    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
      })

      // Move to OTP verification step
      setIsVerifying(true)
      setResendCooldown(60)
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    setResendMessage('')

    const cleanOtp = otp.trim()
    if (!cleanOtp || cleanOtp.length !== 6) {
      setError('Please enter the full 6-digit verification code')
      return
    }

    setLoading(true)
    try {
      await verifyRegistration({
        email: email.trim(),
        otp: cleanOtp,
      })

      // Auth established — navigate into Sonora lounge
      navigate(ROUTES.HOME, { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired verification code.')
    } finally {
      setLoading(false)
    }
  }

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return
    setError('')
    setResendMessage('')
    setLoading(true)

    try {
      await authService.resendRegistrationOtp(email.trim())
      setResendMessage('A new verification code has been dispatched to your email.')
      setResendCooldown(60)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-charcoal border border-border rounded-xl p-8 shadow-2xl backdrop-blur-sm relative overflow-hidden">
          {/* Decorative ambient glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

          {/* Brand Header */}
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
              {isVerifying ? 'Verify your email' : 'Create your space'}
            </h1>
            <p className="text-sm text-muted mt-1">
              {isVerifying ? (
                <>
                  We sent a 6-digit code to{' '}
                  <span className="text-cream font-medium">{email}</span>
                </>
              ) : (
                'Join the communal audio experience'
              )}
            </p>
          </div>

          {/* Feedback banners */}
          {error && (
            <div className="mb-6 p-3 bg-red-950/40 border border-red-800/60 rounded-md text-red-300 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {resendMessage && (
            <div className="mb-6 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-md text-emerald-300 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{resendMessage}</span>
            </div>
          )}

          {/* ── STEP 1: Registration Credentials Form ───────────────── */}
          {!isVerifying ? (
            <form onSubmit={handleSubmitDetails} className="space-y-4">
              <Input
                id="username"
                label="Username"
                type="text"
                placeholder="aria"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />

              <Input
                id="email"
                label="Email"
                type="email"
                placeholder="aria@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />

              <Input
                id="password"
                label="Password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-3"
                disabled={loading}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-obsidian" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Sending code...</span>
                  </span>
                ) : (
                  'Continue with Email'
                )}
              </Button>
            </form>
          ) : (
            /* ── STEP 2: OTP Verification Form ───────────────────────── */
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label
                  htmlFor="otpCode"
                  className="block text-xs font-medium uppercase tracking-wider text-muted mb-2 text-center"
                >
                  Enter 6-Digit Code
                </label>
                <div className="relative">
                  <input
                    id="otpCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="w-full text-center tracking-[0.35em] font-mono text-2xl py-3 px-4 rounded-lg bg-obsidian border border-border focus:border-gold focus:outline-hidden text-cream transition-colors placeholder:text-muted/40"
                    autoFocus
                    required
                  />
                </div>
                <p className="text-[11px] text-muted text-center mt-2">
                  Code expires in 10 minutes
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-obsidian" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Verifying...</span>
                  </span>
                ) : (
                  'Verify & Create Account'
                )}
              </Button>

              {/* Resend & Edit Email links */}
              <div className="flex flex-col items-center gap-2 pt-2 text-xs">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || loading}
                  className={`font-medium transition-colors ${
                    resendCooldown > 0
                      ? 'text-muted/60 cursor-not-allowed'
                      : 'text-gold hover:underline cursor-pointer'
                  }`}
                >
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : "Didn't receive code? Resend"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsVerifying(false)
                    setError('')
                    setResendMessage('')
                    setOtp('')
                  }}
                  className="text-muted hover:text-cream transition-colors cursor-pointer"
                >
                  ← Edit registration details
                </button>
              </div>
            </form>
          )}

          {/* Switch to Login */}
          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted">
              Already have an account?{' '}
              <Link
                to={ROUTES.LOGIN}
                className="text-gold hover:underline font-medium ml-1"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
