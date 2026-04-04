import API_BASE from "../api.js"
import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUser = useCallback(async (t) => {
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
      // CRITICAL: If a lender token somehow ended up in the farmer auth store, evict it.
      if (data.role === 'lender') {
        console.warn('AuthContext: Lender token detected in farmer store — evicting.')
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
        return
      }
      setUser(data)
    } catch (err) {
      console.error('Auth error:', err)
      // Do NOT call logout() here — it changes token which re-fires
      // useEffect([token, fetchUser]), causing an infinite render loop.
      localStorage.removeItem('token')
      setToken(null)
      setUser(null)
    }
  }, [])

  useEffect(() => {
    if (token) {
      fetchUser(token).finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [token, fetchUser])

  const login = (newToken) => {
    localStorage.setItem('token', newToken)
    setToken(newToken)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  // Call this after mutating user data on the backend to keep global state fresh
  const refreshUser = useCallback(() => {
    if (token) return fetchUser(token)
  }, [token, fetchUser])

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

