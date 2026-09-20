import { useEffect } from 'react'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import AppLayout from './layouts/AppLayout'
import HomePage from './pages/HomePage'
import DiscoverPage from './pages/DiscoverPage'
import FriendsPage from './pages/FriendsPage'
import RoomsPage from './pages/RoomsPage'
import RoomPage from './pages/RoomPage'
import LibraryPage from './pages/LibraryPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import NotFoundPage from './pages/NotFoundPage'
import ProtectedRoute from './components/auth/ProtectedRoute'
import PublicRoute from './components/auth/PublicRoute'
import { ROUTES } from './constants/routes'
import authService from './services/authService'
import socketService from './services/socketService'
import { setCredentials, clearCredentials } from './store/slices/authSlice'

const router = createBrowserRouter([
  {
    // Application shell
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to={ROUTES.HOME} replace /> },
      {
        path: 'home',
        element: (
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'discover',
        element: (
          <ProtectedRoute>
            <DiscoverPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'rooms',
        element: (
          <ProtectedRoute>
            <RoomsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'rooms/:roomId',
        element: (
          <ProtectedRoute>
            <RoomPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'friends',
        element: (
          <ProtectedRoute>
            <FriendsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'library',
        element: (
          <ProtectedRoute>
            <LibraryPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile/:username',
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'login',
        element: (
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        ),
      },
      {
        path: 'register',
        element: (
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        ),
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])

export default function App() {
  const dispatch = useDispatch()

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const refreshData = await authService.refreshToken()
        const token = refreshData?.accessToken
        const user = refreshData?.user || (token ? await authService.getCurrentUser() : null)
        if (token && user) {
          dispatch(setCredentials({ user, accessToken: token }))
          socketService.connect(token)
          return
        }
      } catch {
        // No valid session
      }
      dispatch(clearCredentials())
    }

    restoreSession()
  }, [dispatch])

  return <RouterProvider router={router} />
}
