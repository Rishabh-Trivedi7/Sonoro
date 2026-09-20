import { Resend } from 'resend'
import { ApiError } from '../ApiError.js'

/**
 * Resend SDK singleton.
 * Initialised lazily so the module can be imported without RESEND_API_KEY
 * being set (the dev console-fallback path doesn't need it).
 */
let resendClient = null

function getResend() {
  if (resendClient) return resendClient
  const apiKey = process.env.RESEND_API_KEY
  if (apiKey) {
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

/**
 * Generate branded HTML email content for Sonora OTP verification.
 * ── Preserved exactly from the original Nodemailer implementation ──
 */
function generateEmailHtml({ otp, purpose, username }) {
  let title = 'Verification Code'
  let description = 'Use the verification code below to complete your action.'

  if (purpose === 'registration') {
    title = 'Verify Your Sonora Account'
    description = `Welcome to Sonora${username ? `, ${username}` : ''}! Use this 6-digit code to complete your registration and step into the communal audio lounge.`
  } else if (purpose === 'email_change') {
    title = 'Verify New Email Address'
    description = 'You requested to update your Sonora account email. Enter this code to verify your new email address. If you did not request this, you can safely ignore this email.'
  } else if (purpose === 'account_deletion') {
    title = 'Confirm Account Deletion'
    description = 'You requested to permanently delete your Sonora account. This action is irreversible and will remove your profile, listening history, and UID. Enter this code to confirm deletion.'
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0b0e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f5f0eb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0b0e; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="500" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #141419; border: 1px solid #26262e; border-radius: 12px; padding: 36px 32px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);">
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <span style="font-size: 20px; font-weight: 700; letter-spacing: 0.16em; color: #f5f0eb; text-decoration: none;">
                SONORA
              </span>
              <div style="margin-top: 4px; font-size: 11px; color: #c5a059; letter-spacing: 0.1em; text-transform: uppercase;">
                Social Listening Platform
              </div>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td align="center" style="padding-bottom: 12px;">
              <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #ffffff;">${title}</h2>
            </td>
          </tr>

          <!-- Description -->
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #a1a1aa; text-align: center;">
                ${description}
              </p>
            </td>
          </tr>

          <!-- OTP Code Box -->
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <div style="background-color: #1d1d24; border: 1px solid #33333d; border-radius: 8px; padding: 18px 24px; display: inline-block;">
                <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 32px; font-weight: 700; letter-spacing: 0.28em; color: #e5c05d; padding-left: 0.28em;">
                  ${otp}
                </span>
              </div>
            </td>
          </tr>

          <!-- Expiry Notice -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <p style="margin: 0; font-size: 12px; color: #71717a;">
                This code expires in <strong style="color: #a1a1aa;">10 minutes</strong>. Do not share this code with anyone.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="border-top: 1px solid #26262e; padding-top: 20px;">
              <p style="margin: 0; font-size: 11px; color: #52525b; text-align: center; line-height: 1.5;">
                This is an automated message from Sonora. If you did not initiate this request, no action is needed and your account remains secure.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Send an OTP verification email via the Resend HTTP API.
 *
 * Behaviour:
 *  - Production / staging: RESEND_API_KEY is set → email is sent via Resend.
 *  - Development / CI:     RESEND_API_KEY is absent → OTP is printed to console.
 *
 * On Resend error the function throws an ApiError(502) so the controller's
 * asyncHandler can return a proper HTTP response and the frontend loading
 * state is never permanently stuck.
 *
 * @param {Object}  options
 * @param {string}  options.to       - Recipient email address
 * @param {string}  options.otp      - Plain 6-digit OTP
 * @param {string}  options.purpose  - 'registration' | 'email_change' | 'account_deletion'
 * @param {string}  [options.username] - Optional username for personalisation
 * @returns {Promise<boolean>}
 */
export async function sendOTPEmail({ to, otp, purpose, username = '' }) {
  const client = getResend()
  const from = process.env.EMAIL_FROM || '"Sonora" <no-reply@sonora.audio>'

  const subjectMap = {
    registration: 'Verify your Sonora account',
    email_change: 'Confirm your new Sonora email address',
    account_deletion: 'Confirm Sonora account deletion',
  }

  const subject = subjectMap[purpose] || 'Sonora verification code'
  const html = generateEmailHtml({ otp, purpose, username })

  // ── Production path: send via Resend HTTP API ────────────────────────────────
  if (client) {
    const { data, error } = await client.emails.send({
      from,
      to,
      subject,
      html,
      text: `Your Sonora verification code is: ${otp}. It will expire in 10 minutes.`,
    })

    if (error) {
      // Log detailed Resend error server-side only — never expose to client
      console.error('⚠️ [Sonora Email Service] Resend API error:', error)
      throw new ApiError(
        502,
        'We were unable to send the verification email. Please try again in a moment.'
      )
    }

    console.info(`✅ [Sonora Email Service] OTP email sent via Resend (id: ${data?.id}) → ${to}`)
    return true
  }

  // ── Development fallback: no API key configured ──────────────────────────────
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📨 [Sonora Email Service - DEV MODE]`)
  console.log(`   To:       ${to}`)
  console.log(`   Purpose:  ${purpose}`)
  console.log(`   OTP:      ${otp}`)
  console.log(`   Expires:  10 minutes`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  return true
}
