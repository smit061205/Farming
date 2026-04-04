import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import PageTransitionLoader from '../components/PageTransitionLoader'

export default function LoadingPage() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/dashboard', { state: location.state })
    }, 2400)
    return () => clearTimeout(timer)
  }, [])

  return <PageTransitionLoader label="Calibrating Terroir Engine" fullScreen />
}
