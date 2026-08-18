import API_BASE from "../api.js"
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'

const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+1',  flag: '🇺🇸', name: 'USA' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+61', flag: '🇦🇺', name: 'AUS' },
  { code: '+65', flag: '🇸🇬', name: 'SGP' },
  { code: '+60', flag: '🇲🇾', name: 'MYS' },
  { code: '+92', flag: '🇵🇰', name: 'PAK' },
  { code: '+880', flag: '🇧🇩', name: 'BGD' },
  { code: '+977', flag: '🇳🇵', name: 'NPL' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const [mode, setMode] = useState('email')
  const [identifier, setIdentifier] = useState('')
  const [countryCode, setCountryCode] = useState('+91')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [keepSignedIn, setKeepSignedIn] = useState(true)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const body = mode === 'email'
        ? { email: identifier, password }
        : { phone: `${countryCode}${identifier}`, password }

      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Authentication failed')
      login(data.access_token, keepSignedIn)
      const from = location.state?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-[#fefae0] text-[#1d1c0d] min-h-screen overflow-x-hidden">
      <Navbar />

      <main className="min-h-screen flex items-center justify-center px-6 py-32">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="font-headline text-4xl font-bold text-[#173809] tracking-tight mb-3">
              Sign In
            </h1>
            <p className="text-[#43493e]">
              Access your field's precision fertilizer plan.
            </p>
          </div>

          <div
            className="bg-[#f8f4db] rounded-[2.5rem] p-8 md:p-10"
            style={{ boxShadow: '0 20px 40px rgba(29,28,13,0.06)' }}
          >
            {/* Email / Phone toggle */}
            <div className="flex bg-[#e7e3ca] rounded-full p-1 mb-6">
              {[
                { key: 'email', icon: 'mail', label: 'Email' },
                { key: 'phone', icon: 'smartphone', label: 'Phone' },
              ].map(({ key, icon, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setMode(key); setIdentifier(''); setError('') }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold transition-all ${
                    mode === key
                      ? 'bg-[#173809] text-white shadow'
                      : 'text-[#173809]/60 hover:text-[#173809]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{icon}</span>
                  {label}
                </button>
              ))}
            </div>

            {error && (
              <div className="bg-[#9f402d]/10 border border-[#9f402d]/20 text-[#9f402d] px-4 py-3 rounded-xl text-sm font-bold mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Identifier */}
              <div>
                <label className="block font-label text-xs uppercase tracking-widest text-[#43493e] mb-2 ml-2">
                  {mode === 'email' ? 'Email Address' : 'Mobile Number'}
                </label>
                <div className="relative flex items-center">
                  {mode === 'phone' && (
                    <select
                      value={countryCode}
                      onChange={e => setCountryCode(e.target.value)}
                      className="absolute left-3 h-[calc(100%-12px)] bg-transparent border-0 border-r border-[#173809]/15 text-[#173809] font-bold text-sm focus:outline-none cursor-pointer pr-2 z-10 appearance-none"
                      style={{ width: '72px' }}
                    >
                      {COUNTRY_CODES.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                      ))}
                    </select>
                  )}
                  <input
                    type={mode === 'email' ? 'email' : 'tel'}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={mode === 'email' ? 'you@example.com' : '98765 43210'}
                    autoComplete={mode === 'email' ? 'username' : 'tel'}
                    required
                    className={`w-full bg-white border-0 rounded-full py-4 text-base font-body text-[#173809] focus:outline-none focus:ring-2 focus:ring-[#173809]/20 transition-shadow placeholder:text-[#73796d] ${
                      mode === 'phone' ? 'pl-[88px] pr-6' : 'px-6'
                    }`}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block font-label text-xs uppercase tracking-widest text-[#43493e] mb-2 ml-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    required
                    className="w-full bg-white border-0 rounded-full px-6 py-4 pr-14 text-base font-body text-[#173809] focus:outline-none focus:ring-2 focus:ring-[#173809]/20 transition-shadow placeholder:text-[#73796d]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-[#173809]/40 hover:text-[#173809] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {/* Keep signed in */}
              <label className="flex items-center gap-3 cursor-pointer select-none px-2">
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  className="w-5 h-5 rounded-md border-2 border-[#173809]/30 text-[#173809] accent-[#173809] cursor-pointer"
                />
                <span className="text-sm font-medium text-[#43493e]">Keep me signed in</span>
              </label>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="notranslate w-full bg-[#173809] text-white rounded-full py-4 font-headline text-lg font-bold hover:bg-[#2d4f1e] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('/onboarding')}
                className="text-sm font-bold text-[#9f402d] hover:text-[#c05030] transition-colors"
              >
                New here? Create an account
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
