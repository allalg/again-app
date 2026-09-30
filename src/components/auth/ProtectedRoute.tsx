import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export function ProtectedRoute() {
  const { user, isLoading, isInitialized } = useAuthStore()
  const hasAuthCode = typeof window !== 'undefined' && (
    window.location.search.includes('code=') ||
    window.location.hash.includes('access_token=')
  )

  const hasError = typeof window !== 'undefined' && (
    window.location.search.includes('error=') ||
    window.location.hash.includes('error=')
  )

  if (hasError) {
    return <Navigate to={`/login${window.location.search}${window.location.hash}`} replace />
  }

  if (!isInitialized || isLoading || (hasAuthCode && !user)) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
