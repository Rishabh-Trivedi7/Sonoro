export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days matching refresh token lifetime
}
