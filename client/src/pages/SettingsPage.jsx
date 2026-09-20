import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageContainer from '../components/ui/PageContainer'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { useAuth } from '../hooks/useAuth'
import userService from '../services/userService'
import { ROUTES } from '../constants/routes'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, logout, updateLocalUser } = useAuth()

  // Active section tab: 'privacy' | 'security'
  const [activeTab, setActiveTab] = useState('privacy')

  // Privacy State
  const [privacy, setPrivacy] = useState({
    discoverable: 'everyone',
    friendRequests: 'everyone',
    roomInvites: 'everyone',
  })
  const [privacyLoading, setPrivacyLoading] = useState(false)
  const [privacyFeedback, setPrivacyFeedback] = useState({ error: '', success: '' })

  // Change Email State
  const [newEmail, setNewEmail] = useState('')
  const [emailOtp, setEmailOtp] = useState('')
  const [emailStep, setEmailStep] = useState('input') // 'input' | 'otp'
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailFeedback, setEmailFeedback] = useState({ error: '', success: '' })
  const [emailCooldown, setEmailCooldown] = useState(0)

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordFeedback, setPasswordFeedback] = useState({ error: '', success: '' })

  // Delete Account State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteStep, setDeleteStep] = useState('warn') // 'warn' | 'otp'
  const [deleteOtp, setDeleteOtp] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteFeedback, setDeleteFeedback] = useState({ error: '' })
  const [deleteCooldown, setDeleteCooldown] = useState(0)

  // Active sessions state
  const [activeSessions, setActiveSessions] = useState([])

  // Load initial settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await userService.getSettings()
        if (data.privacy) setPrivacy(data.privacy)
        if (data.activeSessions) setActiveSessions(data.activeSessions)
      } catch (err) {
        console.error('Failed to load settings:', err)
      }
    }
    fetchSettings()
  }, [])

  // Cooldown timers
  useEffect(() => {
    let timer
    if (emailCooldown > 0) {
      timer = setInterval(() => setEmailCooldown((prev) => (prev > 0 ? prev - 1 : 0)), 1000)
    }
    return () => clearInterval(timer)
  }, [emailCooldown])

  useEffect(() => {
    let timer
    if (deleteCooldown > 0) {
      timer = setInterval(() => setDeleteCooldown((prev) => (prev > 0 ? prev - 1 : 0)), 1000)
    }
    return () => clearInterval(timer)
  }, [deleteCooldown])

  // ── Privacy Handlers ──────────────────────────────────────────────────────────
  const handleSavePrivacy = async (e) => {
    e.preventDefault()
    setPrivacyLoading(true)
    setPrivacyFeedback({ error: '', success: '' })

    try {
      await userService.updateSettings({ privacy })
      setPrivacyFeedback({ error: '', success: 'Privacy settings saved successfully.' })
      setTimeout(() => setPrivacyFeedback((p) => ({ ...p, success: '' })), 3000)
    } catch (err) {
      setPrivacyFeedback({
        error: err.response?.data?.message || 'Failed to update privacy settings.',
        success: '',
      })
    } finally {
      setPrivacyLoading(false)
    }
  }

  // ── Change Email Handlers ─────────────────────────────────────────────────────
  const handleRequestEmailOtp = async (e) => {
    e.preventDefault()
    setEmailFeedback({ error: '', success: '' })

    if (!newEmail.trim()) {
      setEmailFeedback({ error: 'Please enter a valid new email address.', success: '' })
      return
    }

    setEmailLoading(true)
    try {
      await userService.changeEmailRequest(newEmail.trim())
      setEmailStep('otp')
      setEmailCooldown(60)
      setEmailFeedback({
        error: '',
        success: `Verification code sent to ${newEmail.trim()}. Enter it below to confirm.`,
      })
    } catch (err) {
      setEmailFeedback({
        error: err.response?.data?.message || 'Failed to request email change code.',
        success: '',
      })
    } finally {
      setEmailLoading(false)
    }
  }

  const handleVerifyEmailChange = async (e) => {
    e.preventDefault()
    setEmailFeedback({ error: '', success: '' })

    if (!emailOtp.trim() || emailOtp.trim().length !== 6) {
      setEmailFeedback({ error: 'Please enter the 6-digit verification code.', success: '' })
      return
    }

    setEmailLoading(true)
    try {
      const updatedUser = await userService.changeEmailVerify({
        newEmail: newEmail.trim(),
        otp: emailOtp.trim(),
      })
      updateLocalUser(updatedUser)
      setEmailStep('input')
      setNewEmail('')
      setEmailOtp('')
      setEmailFeedback({
        error: '',
        success: 'Your email address has been updated and verified successfully!',
      })
    } catch (err) {
      setEmailFeedback({
        error: err.response?.data?.message || 'Invalid or expired verification code.',
        success: '',
      })
    } finally {
      setEmailLoading(false)
    }
  }

  // ── Change Password Handlers ──────────────────────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordFeedback({ error: '', success: '' })

    if (!currentPassword || !newPassword) {
      setPasswordFeedback({ error: 'Please fill in all password fields.', success: '' })
      return
    }

    if (newPassword.length < 6) {
      setPasswordFeedback({ error: 'New password must be at least 6 characters long.', success: '' })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ error: 'New passwords do not match.', success: '' })
      return
    }

    setPasswordLoading(true)
    try {
      await userService.changePassword({ currentPassword, newPassword })
      setPasswordFeedback({ error: '', success: 'Password changed successfully.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordFeedback((p) => ({ ...p, success: '' })), 4000)
    } catch (err) {
      setPasswordFeedback({
        error: err.response?.data?.message || 'Failed to change password. Please check your current password.',
        success: '',
      })
    } finally {
      setPasswordLoading(false)
    }
  }

  // ── Delete Account Handlers ───────────────────────────────────────────────────
  const handleRequestDeleteOtp = async () => {
    setDeleteFeedback({ error: '' })
    setDeleteLoading(true)

    try {
      await userService.deleteAccountRequest()
      setDeleteStep('otp')
      setDeleteCooldown(60)
    } catch (err) {
      setDeleteFeedback({
        error: err.response?.data?.message || 'Failed to send deletion confirmation code.',
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleConfirmDelete = async (e) => {
    e.preventDefault()
    setDeleteFeedback({ error: '' })

    if (!deleteOtp.trim() || deleteOtp.trim().length !== 6) {
      setDeleteFeedback({ error: 'Please enter the 6-digit confirmation code.' })
      return
    }

    setDeleteLoading(true)
    try {
      await userService.deleteAccountVerify(deleteOtp.trim())
      setDeleteModalOpen(false)
      await logout()
      navigate(ROUTES.LOGIN, { replace: true })
    } catch (err) {
      setDeleteFeedback({
        error: err.response?.data?.message || 'Invalid or expired confirmation code.',
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <PageContainer>
      <div className="pt-6 pb-20 max-w-4xl mx-auto space-y-8">
        {/* Header Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-border pb-4 sm:pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted mb-1">
              <Link to={ROUTES.PROFILE} className="hover:text-cream transition-colors">
                Profile
              </Link>
              <span>/</span>
              <span className="text-gold font-medium">Settings</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl text-cream font-semibold">
              Settings & Security
            </h1>
            <p className="text-sm text-muted mt-1">
              Manage your privacy preferences and account security architecture
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(ROUTES.PROFILE)}
            className="self-start sm:self-auto"
          >
            ← Back to Profile
          </Button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-border gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
              activeTab === 'privacy'
                ? 'border-gold text-cream font-semibold'
                : 'border-transparent text-muted hover:text-cream'
            }`}
          >
            Privacy
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
              activeTab === 'security'
                ? 'border-gold text-cream font-semibold'
                : 'border-transparent text-muted hover:text-cream'
            }`}
          >
            Account & Security
          </button>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: PRIVACY                                                      */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <div className="bg-charcoal border border-border rounded-xl p-4 sm:p-8 shadow-md">
              <h2 className="font-display text-lg text-cream font-semibold mb-1">
                Social Privacy Controls
              </h2>
              <p className="text-xs text-muted mb-6">
                Determine who can discover your acoustic presence, send friend connections, or invite you to listening rooms.
              </p>

              {privacyFeedback.error && (
                <div className="mb-5 p-3 bg-red-950/40 border border-red-800/60 rounded-md text-red-300 text-xs">
                  {privacyFeedback.error}
                </div>
              )}
              {privacyFeedback.success && (
                <div className="mb-5 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-md text-emerald-300 text-xs">
                  {privacyFeedback.success}
                </div>
              )}

              <form onSubmit={handleSavePrivacy} className="space-y-6 max-w-xl">
                {/* Discoverability */}
                <div className="space-y-1.5">
                  <label htmlFor="discoverable" className="block text-xs font-medium uppercase tracking-wider text-muted">
                    Who can find me
                  </label>
                  <select
                    id="discoverable"
                    value={privacy.discoverable}
                    onChange={(e) => setPrivacy((p) => ({ ...p, discoverable: e.target.value }))}
                    className="w-full bg-obsidian border border-border rounded-lg px-3.5 py-2.5 text-base text-cream focus:border-gold focus:outline-hidden"
                  >
                    <option value="everyone">Everyone (Publicly searchable via username/UID)</option>
                    <option value="friends">Friends Only</option>
                    <option value="none">No one (Hidden from search)</option>
                  </select>
                </div>

                {/* Friend Requests */}
                <div className="space-y-1.5">
                  <label htmlFor="friendRequests" className="block text-xs font-medium uppercase tracking-wider text-muted">
                    Who can send friend requests
                  </label>
                  <select
                    id="friendRequests"
                    value={privacy.friendRequests}
                    onChange={(e) => setPrivacy((p) => ({ ...p, friendRequests: e.target.value }))}
                    className="w-full bg-obsidian border border-border rounded-lg px-3.5 py-2.5 text-base text-cream focus:border-gold focus:outline-hidden"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="none">No one (Direct requests disabled)</option>
                  </select>
                </div>

                {/* Room Invites */}
                <div className="space-y-1.5">
                  <label htmlFor="roomInvites" className="block text-xs font-medium uppercase tracking-wider text-muted">
                    Who can invite me to rooms
                  </label>
                  <select
                    id="roomInvites"
                    value={privacy.roomInvites}
                    onChange={(e) => setPrivacy((p) => ({ ...p, roomInvites: e.target.value }))}
                    className="w-full bg-obsidian border border-border rounded-lg px-3.5 py-2.5 text-base text-cream focus:border-gold focus:outline-hidden"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="friends">Friends Only</option>
                    <option value="none">No one</option>
                  </select>
                </div>

                <Button type="submit" variant="primary" size="md" disabled={privacyLoading}>
                  {privacyLoading ? 'Saving...' : 'Save Privacy Settings'}
                </Button>
              </form>
            </div>

            {/* Blocked Users Section */}
            <div className="bg-charcoal border border-border rounded-xl p-6 sm:p-8 shadow-md">
              <h2 className="font-display text-lg text-cream font-semibold mb-1">
                Blocked Users
              </h2>
              <p className="text-xs text-muted mb-4">
                Blocked users cannot send you messages, join private lounges, or view your Music DNA.
              </p>
              <div className="py-8 text-center border border-dashed border-border/70 rounded-lg text-xs text-muted">
                No users currently blocked.
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: ACCOUNT & SECURITY                                           */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'security' && (
          <div className="space-y-8">
            {/* 1. Change Email Section with OTP */}
            <div className="bg-charcoal border border-border rounded-xl p-4 sm:p-8 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h2 className="font-display text-lg text-cream font-semibold">
                  Email Address
                </h2>
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/70 text-emerald-400">
                  ✓ Verified
                </span>
              </div>
              <p className="text-xs text-muted mb-5">
                Current email:{' '}
                <span className="font-mono text-cream font-medium">
                  {user?.email}
                </span>
                . Changing your email requires OTP verification sent to the new email address.
              </p>

              {emailFeedback.error && (
                <div className="mb-4 p-3 bg-red-950/40 border border-red-800/60 rounded-md text-red-300 text-xs">
                  {emailFeedback.error}
                </div>
              )}
              {emailFeedback.success && (
                <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-md text-emerald-300 text-xs">
                  {emailFeedback.success}
                </div>
              )}

              {emailStep === 'input' ? (
                <form onSubmit={handleRequestEmailOtp} className="space-y-4 max-w-md">
                  <Input
                    id="newEmail"
                    label="New Email Address"
                    type="email"
                    placeholder="new-address@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                  <Button type="submit" variant="primary" size="sm" disabled={emailLoading}>
                    {emailLoading ? 'Sending code...' : 'Send Verification Code'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyEmailChange} className="space-y-4 max-w-md">
                  <div className="space-y-1.5">
                    <label htmlFor="emailOtpInput" className="block text-xs font-medium uppercase tracking-wider text-muted">
                      Enter 6-Digit Code sent to {newEmail}
                    </label>
                    <input
                      id="emailOtpInput"
                      type="text"
                      maxLength={6}
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="••••••"
                      className="w-full text-center tracking-[0.3em] font-mono text-xl py-2.5 px-4 rounded-lg bg-obsidian border border-border focus:border-gold focus:outline-hidden text-cream"
                      autoFocus
                      required
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={emailLoading || emailOtp.length !== 6}
                    >
                      {emailLoading ? 'Verifying...' : 'Confirm Email Change'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEmailStep('input')
                        setEmailOtp('')
                        setEmailFeedback({ error: '', success: '' })
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                  {emailCooldown > 0 ? (
                    <p className="text-[11px] text-muted">
                      Resend code available in {emailCooldown}s
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestEmailOtp}
                      disabled={emailLoading}
                      className="text-xs text-gold hover:underline cursor-pointer"
                    >
                      Resend verification code
                    </button>
                  )}
                </form>
              )}
            </div>

            {/* 2. Change Password */}
            <div className="bg-charcoal border border-border rounded-xl p-4 sm:p-8 shadow-md">
              <h2 className="font-display text-lg text-cream font-semibold mb-1">
                Change Password
              </h2>
              <p className="text-xs text-muted mb-5">
                Update your account password. Requires your current password for security verification.
              </p>

              {passwordFeedback.error && (
                <div className="mb-4 p-3 bg-red-950/40 border border-red-800/60 rounded-md text-red-300 text-xs">
                  {passwordFeedback.error}
                </div>
              )}
              {passwordFeedback.success && (
                <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-md text-emerald-300 text-xs">
                  {passwordFeedback.success}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <Input
                  id="currentPassword"
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <Input
                  id="newPassword"
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  required
                />
                <Input
                  id="confirmPassword"
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  required
                />
                <Button type="submit" variant="primary" size="sm" disabled={passwordLoading}>
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </div>

            {/* 3. Active Sessions */}
            <div className="bg-charcoal border border-border rounded-xl p-4 sm:p-8 shadow-md">
              <h2 className="font-display text-lg text-cream font-semibold mb-1">
                Active Sessions
              </h2>
              <p className="text-xs text-muted mb-4">
                Devices currently authenticated into your Sonora account.
              </p>
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-obsidian/70 border border-border/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-cream font-medium">Current Browser / Web App</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                          Active Now
                        </span>
                      </div>
                      <p className="text-[11px] text-muted">
                        Session protected with HttpOnly refresh token rotation
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Delete Account (Danger Zone) */}
            <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-4 sm:p-8 shadow-md">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h2 className="font-display text-lg font-semibold">
                  Danger Zone: Delete Account
                </h2>
              </div>
              <p className="text-xs text-red-200/80 mb-5 leading-relaxed max-w-xl">
                Permanently deletes your Sonora profile, public Sonora UID (
                <span className="font-mono text-cream">{user?.uid}</span>), curated room
                history, and friendship relationships. This action is irreversible and requires email OTP confirmation.
              </p>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeleteModalOpen(true)
                  setDeleteStep('warn')
                  setDeleteOtp('')
                  setDeleteFeedback({ error: '' })
                }}
                className="border-red-800/80 text-red-400 hover:bg-red-950/40 hover:text-red-300"
              >
                Delete Sonora Account...
              </Button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* DELETE ACCOUNT CONFIRMATION MODAL                                    */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {deleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-charcoal border border-red-900/60 rounded-xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-lg text-red-400 font-semibold">
                    Confirm Account Deletion
                  </h3>
                  <p className="text-xs text-muted mt-1">
                    Step {deleteStep === 'warn' ? '1: Acknowledgment' : '2: Email Verification'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="text-muted hover:text-cream text-lg leading-none cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {deleteFeedback.error && (
                <div className="p-3 bg-red-950/60 border border-red-800 rounded-md text-red-300 text-xs">
                  {deleteFeedback.error}
                </div>
              )}

              {deleteStep === 'warn' ? (
                <div className="space-y-4">
                  <div className="p-3 bg-obsidian/80 border border-border rounded-lg text-xs text-cream/90 space-y-2">
                    <p className="font-semibold text-red-300">
                      Are you absolutely sure?
                    </p>
                    <p className="text-muted text-[11px] leading-relaxed">
                      To prevent accidental loss, Sonora will send a single-use 6-digit confirmation code to{' '}
                      <span className="text-cream font-mono font-medium">{user?.email}</span>.
                      Your account will only be deleted once this code is successfully verified.
                    </p>
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRequestDeleteOtp}
                      disabled={deleteLoading}
                      className="border-red-700 bg-red-950/40 text-red-300 hover:bg-red-900/60"
                    >
                      {deleteLoading ? 'Sending code...' : 'Send Deletion Code'}
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleConfirmDelete} className="space-y-4">
                  <div>
                    <label htmlFor="deleteOtpInput" className="block text-xs font-medium uppercase tracking-wider text-muted mb-2">
                      Enter 6-Digit Deletion Code
                    </label>
                    <input
                      id="deleteOtpInput"
                      type="text"
                      maxLength={6}
                      value={deleteOtp}
                      onChange={(e) => setDeleteOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="••••••"
                      className="w-full text-center tracking-[0.3em] font-mono text-2xl py-2.5 px-4 rounded-lg bg-obsidian border border-red-900/80 focus:border-red-500 focus:outline-hidden text-cream"
                      autoFocus
                      required
                    />
                    <p className="text-[11px] text-muted text-center mt-2">
                      Code dispatched to {user?.email}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    {deleteCooldown > 0 ? (
                      <span className="text-[11px] text-muted">
                        Resend in {deleteCooldown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestDeleteOtp}
                        disabled={deleteLoading}
                        className="text-xs text-gold hover:underline cursor-pointer"
                      >
                        Resend code
                      </button>
                    )}

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteModalOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={deleteLoading || deleteOtp.length !== 6}
                        className="bg-red-700 hover:bg-red-600 text-cream"
                      >
                        {deleteLoading ? 'Deleting...' : 'Permanently Delete'}
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
