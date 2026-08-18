import API_BASE from "../api.js"
import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext()

function readStoredToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token')
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readStoredToken)
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUser = useCallback(async (t) => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)
      const res = await fetch(`${API_BASE}/api/users/me`, {
        headers: { Authorization: `Bearer ${t}` },
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (res.status === 401) {
        // Token is genuinely invalid/expired — this is the only case that should log the user out.
        localStorage.removeItem('token')
        sessionStorage.removeItem('token')
        setToken(null)
        setUser(null)
        return
      }
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      setUser(data)
    } catch (err) {
      // Network hiccup, timeout, or server hiccup — NOT proof the token is invalid.
      // Keep the session alive; the user stays logged in and pages fall back to
      // their own loading/empty states instead of getting bounced to /login.
      console.error('Auth check failed (keeping session):', err)
    }
  }, [])

  useEffect(() => {
    if (token) {
      fetchUser(token).finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [token, fetchUser])

  const login = (newToken, remember = true) => {
    if (remember) {
      localStorage.setItem('token', newToken)
      sessionStorage.removeItem('token')
    } else {
      sessionStorage.setItem('token', newToken)
      localStorage.removeItem('token')
    }
    setToken(newToken)
  }

  const logout = () => {
    localStorage.removeItem('token')
    sessionStorage.removeItem('token')
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
