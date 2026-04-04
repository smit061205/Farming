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
      login(data.access_token)
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

      <main className="pt-32 pb-24 px-8 md:px-20 max-w-[1600px] mx-auto grid grid-cols-12 gap-8 items-center min-h-screen">
        {/* Left: Editorial Text */}
        <div className="col-span-12 lg:col-span-6 space-y-10">
          <div>
            <span className="font-label text-xs uppercase tracking-[0.3em] text-[#9f402d] font-bold mb-4 block">
              Field Access
            </span>
            <h1 className="font-headline text-7xl md:text-8xl font-bold text-[#173809] tracking-tighter leading-none mb-6">
              Enter the <br />
              <span className="italic font-light">Terroir.</span>
            </h1>
            <p className="font-body text-xl text-[#43493e] max-w-lg leading-relaxed">
              Sign in to access your personalized field intelligence dashboard and precision soil analytics.
            </p>
          </div>

          {/* Decorative metrics strip */}
          <div className="flex gap-8">
            {[
              { val: '2.4K+', label: 'Fields Analyzed' },
              { val: '98%', label: 'Accuracy Rate' },
              { val: '12x', label: 'Yield Improvement' },
            ].map(({ val, label }) => (
              <div key={label}>
                <div className="text-4xl font-headline font-black text-[#173809]">{val}</div>
                <div className="text-xs uppercase tracking-widest text-[#43493e] font-bold mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Decorative image */}
          <div className="hidden lg:block relative h-64 rounded-[2rem] overflow-hidden soil-shadow">
            <img
              src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=80"
              alt="Agricultural field"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#173809]/60 to-transparent flex items-end p-8">
              <div>
                <div className="text-[#c5efad] text-xs uppercase tracking-widest font-bold mb-1">Live System</div>
                <div className="text-white text-2xl font-headline font-bold">Field Journal No. 42</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Login Form */}
        <div className="col-span-12 lg:col-span-5 lg:col-start-8">
          <div
            className="bg-[#f8f4db] rounded-[3rem] p-12 relative overflow-hidden"
            style={{ boxShadow: '0 20px 40px rgba(29,28,13,0.06)' }}
          >
            {/* Background glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#2d4f1e]/10 rounded-full blur-3xl"></div>

            <div className="relative z-10">
              <h2 className="font-headline text-3xl font-bold text-[#173809] mb-2">
                Welcome back
              </h2>
              <p className="text-[#43493e] mb-8 font-body">
                Enter your credentials to access the platform.
              </p>

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

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Identifier */}
                <div>
                  <label className="block font-label text-xs uppercase tracking-widest text-[#43493e] mb-3 ml-2">
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
                      placeholder={mode === 'email' ? 'agrarian@terroir.com' : '98765 43210'}
                      required
                      className={`w-full bg-[#e7e3ca] border-0 rounded-full py-5 text-lg font-body text-[#173809] focus:outline-none focus:bg-[#fefae0] transition-colors placeholder:text-[#73796d] ${
                        mode === 'phone' ? 'pl-[88px] pr-8' : 'px-8'
                      }`}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block font-label text-xs uppercase tracking-widest text-[#43493e] mb-3 ml-2">
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
                      className="w-full bg-[#e7e3ca] border-0 rounded-full px-8 py-5 pr-16 text-lg font-body text-[#173809] focus:outline-none focus:bg-[#fefae0] transition-colors placeholder:text-[#73796d]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-[#173809]/40 hover:text-[#173809] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[22px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="notranslate w-full bg-[#173809] text-white rounded-full py-6 px-12 font-headline text-xl font-bold hover:scale-[0.98] transition-all flex items-center justify-center gap-3 group mt-4 disabled:opacity-50"
                  style={{ boxShadow: '0 20px 40px rgba(29,28,13,0.12)' }}
                >
                  {isLoading ? 'Verifying...' : 'Enter Field Journal'}
                  {!isLoading && <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">arrow_forward</span>}
                </button>
              </form>

              <div className="mt-8 text-center pt-6 border-t border-[#173809]/10">
                <p className="text-sm font-label uppercase tracking-widest text-[#43493e] font-bold">
                  Lack clearance?
                </p>
                <button
                  onClick={() => navigate('/onboarding')}
                  className="mt-2 font-headline text-xl font-black text-[#9f402d] hover:text-[#c05030] transition-colors"
                >
                  Initialize New Terroir
                </button>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

