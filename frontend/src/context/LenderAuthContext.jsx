import API_BASE from '../api.js'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const LenderAuthContext = createContext()

export function LenderAuthProvider({ children }) {
  const [lenderToken, setLenderToken] = useState(localStorage.getItem('lender_token'))
  const [lenderUser, setLenderUser] = useState(null)
  const [isLenderLoading, setIsLenderLoading] = useState(true)

  const fetchLenderUser = useCallback(async (t) => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      const res = await fetch('${API_BASE}/api/users/me', {
        headers: { Authorization: `Bearer ${t}` },
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      if (!res.ok) throw new Error('Token expired')
      const data = await res.json()
      setLenderUser(data)
    } catch (err) {
      console.error('Lender Auth error:', err)
      localStorage.removeItem('lender_token')
      setLenderToken(null)
      setLenderUser(null)
    }
  }, [])

  useEffect(() => {
    if (lenderToken) {
      fetchLenderUser(lenderToken).finally(() => setIsLenderLoading(false))
    } else {
      setIsLenderLoading(false)
    }
  }, [lenderToken, fetchLenderUser])

  const lenderLogin = (newToken) => {
    localStorage.setItem('lender_token', newToken)
    setLenderToken(newToken)
  }

  const lenderLogout = () => {
    localStorage.removeItem('lender_token')
    setLenderToken(null)
    setLenderUser(null)
  }

  return (
    <LenderAuthContext.Provider value={{ lenderToken, lenderUser, lenderLogin, lenderLogout, isLenderLoading }}>
      {children}
    </LenderAuthContext.Provider>
  )
}

export function useLenderAuth() {
  return useContext(LenderAuthContext)
}
