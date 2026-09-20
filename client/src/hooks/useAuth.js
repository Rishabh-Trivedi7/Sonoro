import { useSelector, useDispatch } from 'react-redux'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { setCredentials, clearCredentials, updateUser } from '../store/slices/authSlice'
import authService from '../services/authService'
import socketService from '../services/socketService'
import { ROUTES } from '../constants/routes'

export function useAuth() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user, accessToken, isAuthenticated, loading, initialized } = useSelector(
    (state) => state.auth
  )

  const login = useCallback(
    async (credentials) => {
      const data = await authService.login(credentials)
      // data = { user, accessToken }
      dispatch(setCredentials({ user: data.user, accessToken: data.accessToken }))
      socketService.connect(data.accessToken)
      return data
    },
    [dispatch]
  )

  const register = useCallback(
    async (userData) => {
      const data = await authService.register(userData)
      // data = { email, requiresEmailVerification: true }
      return data
    },
    []
  )

  const verifyRegistration = useCallback(
    async ({ email, otp }) => {
      const data = await authService.verifyRegistration({ email, otp })
      // data = { user, accessToken }
      if (data?.accessToken && data?.user) {
        dispatch(setCredentials({ user: data.user, accessToken: data.accessToken }))
        socketService.connect(data.accessToken)
      }
      return data
    },
    [dispatch]
  )

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch {
      // proceed with local cleanup regardless of API response
    }
    socketService.disconnect()
    dispatch(clearCredentials())
    navigate(ROUTES.LOGIN, { replace: true })
  }, [dispatch, navigate])

  const updateLocalUser = useCallback(
    (userData) => {
      dispatch(updateUser(userData))
    },
    [dispatch]
  )

  return {
    user,
    accessToken,
    isAuthenticated,
    loading,
    initialized,
    login,
    register,
    verifyRegistration,
    logout,
    updateLocalUser,
  }
}

export default useAuth
