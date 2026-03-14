import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'

interface Props {
  children: React.ReactNode
}

export default function AuthGuard({ children }: Props) {
  const authenticated = useAuthStore((s) => s.authenticated)

  if (!authenticated) return <Navigate to="/login" replace />

  return <>{children}</>
}
