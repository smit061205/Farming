import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLenderAuth } from '../context/LenderAuthContext'

const Loading = () => (
  <div className="min-h-screen bg-[#fefae0] flex items-center justify-center">
    <div className="text-[#173809] font-headline font-bold text-xl animate-pulse tracking-widest uppercase">
      Verifying Access...
    </div>
  </div>
)

// Guard for farmer-only routes
function FarmerRoute({ children }) {
  const { token, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return <Loading />
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

// Guard for lender-only routes
function LenderRoute({ children }) {
  const { lenderToken, isLenderLoading } = useLenderAuth()
  if (isLenderLoading) return <Loading />
  if (!lenderToken) return <Navigate to="/lender" replace />
  return children
}

export default function ProtectedRoute({ children, allowedRoles }) {
  const isLenderRoute = allowedRoles && allowedRoles.includes('lender')
  if (isLenderRoute) return <LenderRoute>{children}</LenderRoute>
  return <FarmerRoute>{children}</FarmerRoute>
}
