import { useMemo } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { token } = useAuth()
  const location = useLocation()
  // Stable reference — a fresh { from: location } literal on every render makes
  // <Navigate>'s redirect effect re-fire continuously (React Router treats each
  // new state object as a distinct navigation), which trips React's update-depth guard.
  const redirectState = useMemo(() => ({ from: location }), [location])
  // Render immediately if a token exists — don't block navigation on a network
  // round-trip to verify it. Pages fetch their own data and show their own
  // loading states; if the token turns out to be invalid, AuthContext clears
  // it on a 401 and this component redirects to /login on the next render.
  if (!token) return <Navigate to="/login" state={redirectState} replace />
  return children
}
