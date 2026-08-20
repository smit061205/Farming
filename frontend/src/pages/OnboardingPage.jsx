import API_BASE from "../api.js"
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import MapPicker from '../components/onboarding/MapPicker'
import { useAuth } from '../context/AuthContext'
import { CROP_OPTIONS } from '../constants/crops'

// Same plausible-range check used on the Analyze Field page — still
// accepted (real outliers exist), just flagged so a mistyped value gets a
// second look instead of silently going into the fertilizer math.
const PLAUSIBLE_RANGE = { N: { low: 0, high: 400 }, P: { low: 0, high: 150 }, K: { low: 0, high: 600 } }
function isUnusual(key, val) {
  const r = PLAUSIBLE_RANGE[key]
  if (!r || val === '' || val == null || isNaN(val)) return false
  return val < r.low || val > r.high
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [fullName, setFullName] = useState('')
  const [mode, setMode] = useState('email')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [keepSignedIn, setKeepSignedIn] = useState(true)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Field basics — needed for every recommendation, asked once up front
  // instead of a farmer discovering an empty dashboard later.
  const [coordinates, setCoordinates] = useState(null)
  const [cropType, setCropType] = useState(CROP_OPTIONS[0])
  const [fieldSize, setFieldSize] = useState('')
  const [fieldSizeUnit, setFieldSizeUnit] = useState('acres')

  // Soil test — optional. Most farmers won't have lab numbers on hand at
  // signup, so these are left blank-friendly; the engine falls back to a
  // safe regional estimate until a real reading is added later.
  const [ph, setPh] = useState('')
  const [nitrogen, setNitrogen] = useState('')
  const [phosphorus, setPhosphorus] = useState('')
  const [potassium, setPotassium] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    if (!coordinates?.lat) { setError('Please set your field location — tap "Use My Location" or click the map.'); return }
    if (!fieldSize || parseFloat(fieldSize) <= 0) { setError('Please enter your field size.'); return }
    if (ph !== '' && (parseFloat(ph) < 0 || parseFloat(ph) > 14)) { setError('pH is measured on a 0–14 scale — please check that reading.'); return }

    const soilData = { cropType, fieldSize: parseFloat(fieldSize), fieldSizeUnit }
    if (ph !== '') soilData.ph = parseFloat(ph)
    if (nitrogen !== '') soilData.nitrogen = parseFloat(nitrogen)
    if (phosphorus !== '') soilData.phosphorus = parseFloat(phosphorus)
    if (potassium !== '') soilData.potassium = parseFloat(potassium)

    setIsLoading(true)
    try {
      const payload = {
        full_name: fullName,
        password,
        ...(mode === 'email' ? { email: identifier } : { phone: `+91${identifier}` }),
        coordinates,
        soil_data: soilData,
      }
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        if (Array.isArray(data.detail)) {
          throw new Error(data.detail.map(d => `${d.loc.at(-1)}: ${d.msg}`).join(', '))
        }
        throw new Error(data.detail || 'Could not create your account.')
      }
      login(data.access_token, keepSignedIn)
      navigate('/dashboard')
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
              Create Your Account
            </h1>
            <p className="text-[#43493e]">
              Tell us about your field so we can give you real numbers, not guesses.
            </p>
          </div>

          <div
            className="bg-[#f8f4db] rounded-[2.5rem] p-8 md:p-10"
            style={{ boxShadow: '0 20px 40px rgba(29,28,13,0.06)' }}
          >
            {error && (
              <div className="bg-[#9f402d]/10 border border-[#9f402d]/20 text-[#9f402d] px-4 py-3 rounded-xl text-sm font-bold mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label className="block font-label text-xs uppercase tracking-widest text-[#43493e] mb-2 ml-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ramesh Patel"
                  autoComplete="name"
                  required
                  className="w-full bg-white border-0 rounded-full px-6 py-4 text-base font-body text-[#173809] focus:outline-none focus:ring-2 focus:ring-[#173809]/20 transition-shadow placeholder:text-[#73796d]"
                />
              </div>

              {/* Email / Phone toggle */}
              <div>
                <div className="flex bg-[#e7e3ca] rounded-full p-1 mb-3">
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
                <div className="relative flex items-center">
                  {mode === 'phone' && (
                    <span className="absolute left-6 text-sm font-bold text-[#173809]/60 pointer-events-none">+91</span>
                  )}
                  <input
                    type={mode === 'email' ? 'email' : 'tel'}
                    inputMode={mode === 'phone' ? 'numeric' : undefined}
                    maxLength={mode === 'phone' ? 10 : undefined}
                    value={identifier}
                    onChange={(e) => setIdentifier(mode === 'phone' ? e.target.value.replace(/\D/g, '') : e.target.value)}
                    placeholder={mode === 'email' ? 'you@example.com' : '98765 43210'}
                    autoComplete={mode === 'email' ? 'username' : 'tel'}
                    required
                    className={`w-full bg-white border-0 rounded-full py-4 text-base font-body text-[#173809] focus:outline-none focus:ring-2 focus:ring-[#173809]/20 transition-shadow placeholder:text-[#73796d] ${
                      mode === 'phone' ? 'pl-16 pr-6' : 'px-6'
                    }`}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block font-label text-xs uppercase tracking-widest text-[#43493e] mb-2 ml-2">
                  Password <span className="normal-case font-normal text-[#43493e]/60">(min 8 characters)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
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

              {/* Confirm Password */}
              <div>
                <label className="block font-label text-xs uppercase tracking-widest text-[#43493e] mb-2 ml-2">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                  className="w-full bg-white border-0 rounded-full px-6 py-4 text-base font-body text-[#173809] focus:outline-none focus:ring-2 focus:ring-[#173809]/20 transition-shadow placeholder:text-[#73796d]"
                />
              </div>

              {/* ── Your Field (required) ── */}
              <div className="pt-4 border-t border-[#173809]/10">
                <h3 className="font-headline text-lg font-bold text-[#173809] mb-1">Your Field</h3>
                <p className="text-xs text-[#43493e]/70 mb-4">This is how we tell you exactly what to apply and how much.</p>

                <label className="block font-label text-xs uppercase tracking-widest text-[#43493e] mb-2 ml-2">
                  Field Location
                </label>
                <MapPicker value={coordinates} onChange={setCoordinates} autoDetect />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-label text-xs uppercase tracking-widest text-[#43493e] mb-2 ml-2">
                    Crop
                  </label>
                  <select
                    value={cropType}
                    onChange={(e) => setCropType(e.target.value)}
                    className="w-full bg-white border-0 rounded-full px-6 py-4 text-base font-body text-[#173809] focus:outline-none focus:ring-2 focus:ring-[#173809]/20 transition-shadow"
                  >
                    {CROP_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-label text-xs uppercase tracking-widest text-[#43493e] mb-2 ml-2">
                    Field Size
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={fieldSize}
                      onChange={(e) => setFieldSize(e.target.value)}
                      placeholder="2"
                      required
                      className="w-full min-w-0 bg-white border-0 rounded-full px-5 py-4 text-base font-body text-[#173809] focus:outline-none focus:ring-2 focus:ring-[#173809]/20 transition-shadow placeholder:text-[#73796d]"
                    />
                    <select
                      value={fieldSizeUnit}
                      onChange={(e) => setFieldSizeUnit(e.target.value)}
                      className="bg-white border-0 rounded-full px-3 text-xs font-bold text-[#173809] focus:outline-none focus:ring-2 focus:ring-[#173809]/20 transition-shadow shrink-0"
                    >
                      <option value="acres">acres</option>
                      <option value="hectares">ha</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Soil Test (optional) ── */}
              <div className="pt-4 border-t border-[#173809]/10">
                <h3 className="font-headline text-lg font-bold text-[#173809] mb-1">Soil Test <span className="font-body font-normal text-sm text-[#43493e]/60">(optional)</span></h3>
                <p className="text-xs text-[#43493e]/70 mb-4">Have a lab report? Add the numbers now. Don't have one yet? Leave this blank — you can add it anytime, and we'll use a safe estimate for your area until then.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label text-xs uppercase tracking-widest text-[#43493e] mb-2 ml-2">pH</label>
                    <input
                      type="number" step="0.1" min="0" max="14"
                      value={ph}
                      onChange={(e) => setPh(e.target.value)}
                      placeholder="e.g. 6.5"
                      className="w-full bg-white border-0 rounded-full px-6 py-4 text-base font-body text-[#173809] focus:outline-none focus:ring-2 focus:ring-[#173809]/20 transition-shadow placeholder:text-[#73796d]"
                    />
                  </div>
                  <div>
                    <label className="block font-label text-xs uppercase tracking-widest text-[#43493e] mb-2 ml-2">Nitrogen <span className="normal-case">(ppm)</span></label>
                    <input
                      type="number" step="any" min="0"
                      value={nitrogen}
                      onChange={(e) => setNitrogen(e.target.value)}
                      placeholder="e.g. 120"
                      className={`w-full bg-white border rounded-full px-6 py-4 text-base font-body text-[#173809] focus:outline-none focus:ring-2 transition-shadow placeholder:text-[#73796d] ${
                        isUnusual('N', parseFloat(nitrogen)) ? 'border-[#9f402d]/50 focus:ring-[#9f402d]/20' : 'border-transparent focus:ring-[#173809]/20'
                      }`}
                    />
                    {isUnusual('N', parseFloat(nitrogen)) && <p className="text-[10px] text-[#9f402d] font-bold mt-1.5 ml-2">Unusual for a lab test — double-check this reading</p>}
                  </div>
                  <div>
                    <label className="block font-label text-xs uppercase tracking-widest text-[#43493e] mb-2 ml-2">Phosphorus <span className="normal-case">(ppm)</span></label>
                    <input
                      type="number" step="any" min="0"
                      value={phosphorus}
                      onChange={(e) => setPhosphorus(e.target.value)}
                      placeholder="e.g. 45"
                      className={`w-full bg-white border rounded-full px-6 py-4 text-base font-body text-[#173809] focus:outline-none focus:ring-2 transition-shadow placeholder:text-[#73796d] ${
                        isUnusual('P', parseFloat(phosphorus)) ? 'border-[#9f402d]/50 focus:ring-[#9f402d]/20' : 'border-transparent focus:ring-[#173809]/20'
                      }`}
                    />
                    {isUnusual('P', parseFloat(phosphorus)) && <p className="text-[10px] text-[#9f402d] font-bold mt-1.5 ml-2">Unusual for a lab test — double-check this reading</p>}
                  </div>
                  <div>
                    <label className="block font-label text-xs uppercase tracking-widest text-[#43493e] mb-2 ml-2">Potassium <span className="normal-case">(ppm)</span></label>
                    <input
                      type="number" step="any" min="0"
                      value={potassium}
                      onChange={(e) => setPotassium(e.target.value)}
                      placeholder="e.g. 200"
                      className={`w-full bg-white border rounded-full px-6 py-4 text-base font-body text-[#173809] focus:outline-none focus:ring-2 transition-shadow placeholder:text-[#73796d] ${
                        isUnusual('K', parseFloat(potassium)) ? 'border-[#9f402d]/50 focus:ring-[#9f402d]/20' : 'border-transparent focus:ring-[#173809]/20'
                      }`}
                    />
                    {isUnusual('K', parseFloat(potassium)) && <p className="text-[10px] text-[#9f402d] font-bold mt-1.5 ml-2">Unusual for a lab test — double-check this reading</p>}
                  </div>
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

              <button
                type="submit"
                disabled={isLoading}
                className="notranslate w-full bg-[#173809] text-white rounded-full py-4 font-headline text-lg font-bold hover:bg-[#2d4f1e] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? 'Creating your account…' : 'Create Account'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('/login')}
                className="text-sm font-bold text-[#9f402d] hover:text-[#c05030] transition-colors"
              >
                Already have an account? Sign in
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
