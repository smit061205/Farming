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

// Mirrors the backend's fertilizer encyclopedia (engine_routes.py
// FERTILIZER_DB) — a controlled list so "what are you applying" is a real,
// matchable product name instead of free text prone to typos and drift.
const FERTILIZER_OPTIONS = [
  'None yet',
  'Granular Urea',
  'DAP (Diammonium Phosphate)',
  'Muriate of Potash (MOP)',
  'Triple Superphosphate (TSP)',
  'Ammonium Sulfate',
  'Calcium Nitrate',
  'Blood Meal',
  'Bone Meal',
  'Kelp Meal',
  'Worm Castings',
  'Other / a mix',
]

function emptyCrop() {
  return {
    cropType: CROP_OPTIONS[0], fieldSize: '', fieldSizeUnit: 'acres',
    ph: '', nitrogen: '', phosphorus: '', potassium: '',
    currentFertilizer: '', pastFertilizer: '',
  }
}

// A dropdown of real product names, with an "Other / a mix" option that
// reveals a free-text field for genuine blends ("Urea + DAP") the fixed
// list can't name. Whether the text field is showing is its own local UI
// state — decoupled from the string value itself, so there's no need to
// smuggle a "custom mode" flag through the value (e.g. a sentinel space).
function FertilizerSelect({ label, value, onChange, placeholder }) {
  const [customMode, setCustomMode] = useState(() => value !== '' && !FERTILIZER_OPTIONS.includes(value))
  const selectValue = customMode ? 'Other / a mix' : value

  return (
    <div>
      <label className="block font-label text-xs uppercase tracking-widest text-[#43493e] mb-2 ml-2">{label}</label>
      <select
        value={selectValue}
        onChange={(e) => {
          if (e.target.value === 'Other / a mix') { setCustomMode(true); return }
          setCustomMode(false)
          onChange(e.target.value)
        }}
        className="w-full bg-white border-0 rounded-full px-6 py-4 text-base font-body text-[#173809] focus:outline-none focus:ring-2 focus:ring-[#173809]/20 transition-shadow"
      >
        <option value="">Select…</option>
        {FERTILIZER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {customMode && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus
          className="w-full mt-2 bg-white border border-[#173809]/15 rounded-full px-6 py-3 text-sm font-body text-[#173809] focus:outline-none focus:ring-2 focus:ring-[#173809]/20 transition-shadow placeholder:text-[#73796d]"
        />
      )}
    </div>
  )
}

// One crop's full picture — crop, soil test, and fertilizer use together,
// since a plan can't say "keep, switch, or stop" without all three at once.
// Used for both the primary crop and every additional one, so a two-crop
// farm gets the same depth of data for each, not a lightweight second pass.
function CropCard({ title, subtitle, values, onChange, onRemove }) {
  const set = (patch) => onChange({ ...values, ...patch })
  return (
    <div className="bg-white/60 rounded-3xl p-5 space-y-4 border border-[#173809]/8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-headline text-base font-bold text-[#173809]">{title}</h3>
          {subtitle && <p className="text-xs text-[#43493e]/60">{subtitle}</p>}
        </div>
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-[#9f402d]/60 hover:text-[#9f402d]">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* Crop + size */}
      <div className="grid grid-cols-2 gap-3">
        <select
          value={values.cropType}
          onChange={(e) => set({ cropType: e.target.value })}
          className="w-full bg-white border border-[#173809]/10 rounded-full px-5 py-3.5 text-sm font-body text-[#173809] focus:outline-none focus:ring-2 focus:ring-[#173809]/20"
        >
          {CROP_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex gap-2">
          <input
            type="number" min="0" step="0.1" value={values.fieldSize}
            onChange={(e) => set({ fieldSize: e.target.value })}
            placeholder="Field size" required
            className="w-full min-w-0 bg-white border border-[#173809]/10 rounded-full px-4 py-3.5 text-sm font-body text-[#173809] focus:outline-none focus:ring-2 focus:ring-[#173809]/20 placeholder:text-[#73796d]"
          />
          <select
            value={values.fieldSizeUnit}
            onChange={(e) => set({ fieldSizeUnit: e.target.value })}
            className="bg-white border border-[#173809]/10 rounded-full px-3 text-xs font-bold text-[#173809] focus:outline-none focus:ring-2 focus:ring-[#173809]/20 shrink-0"
          >
            <option value="acres">acres</option>
            <option value="hectares">ha</option>
          </select>
        </div>
      </div>

      {/* Soil test */}
      <div className="pt-3 border-t border-[#173809]/8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#173809]/40 mb-3">Soil Test <span className="normal-case font-normal">— optional, we'll estimate until you add one</span></p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'ph', label: 'pH', flagKey: 'pH', ph: true },
            { key: 'nitrogen', label: 'Nitrogen (ppm)', flagKey: 'N' },
            { key: 'phosphorus', label: 'Phosphorus (ppm)', flagKey: 'P' },
            { key: 'potassium', label: 'Potassium (ppm)', flagKey: 'K' },
          ].map(({ key, label, flagKey }) => {
            const unusual = isUnusual(flagKey, parseFloat(values[key]))
            return (
              <div key={key}>
                <input
                  type="number" step={key === 'ph' ? '0.1' : 'any'} min="0"
                  value={values[key]}
                  onChange={(e) => set({ [key]: e.target.value })}
                  placeholder={label}
                  className={`w-full bg-white border rounded-full px-5 py-3 text-sm font-body text-[#173809] focus:outline-none focus:ring-2 transition-shadow placeholder:text-[#73796d] ${
                    unusual ? 'border-[#9f402d]/50 focus:ring-[#9f402d]/20' : 'border-[#173809]/10 focus:ring-[#173809]/20'
                  }`}
                />
                {unusual && <p className="text-[9px] text-[#9f402d] font-bold mt-1 ml-2">Unusual — double-check</p>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Fertilizer use */}
      <div className="pt-3 border-t border-[#173809]/8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#173809]/40 mb-3">Fertilizer Use <span className="normal-case font-normal">— optional</span></p>
        <div className="grid grid-cols-2 gap-3">
          <FertilizerSelect label="Currently Applying" value={values.currentFertilizer} onChange={(v) => set({ currentFertilizer: v })} placeholder="Describe the mix" />
          <FertilizerSelect label="Used Previously" value={values.pastFertilizer} onChange={(v) => set({ pastFertilizer: v })} placeholder="Describe the mix" />
        </div>
      </div>
    </div>
  )
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

  // Location is farm-wide (one map pin), not per-crop.
  const [coordinates, setCoordinates] = useState(null)

  // Primary crop — crop, soil test, and fertilizer use bundled as one
  // object, same shape as every additional crop, so both render through
  // the same CropCard and submit the same way.
  const [primaryCrop, setPrimaryCrop] = useState(emptyCrop())

  // Other crops — most real farms grow more than one. Prefilled from the
  // primary crop's soil test and fertilizer use, since a second field is
  // often similar, rather than starting the farmer from a blank card.
  const [additionalCrops, setAdditionalCrops] = useState([])
  const addCropRow = () => setAdditionalCrops(prev => [...prev, {
    ...emptyCrop(),
    ph: primaryCrop.ph, nitrogen: primaryCrop.nitrogen, phosphorus: primaryCrop.phosphorus, potassium: primaryCrop.potassium,
    currentFertilizer: primaryCrop.currentFertilizer, pastFertilizer: primaryCrop.pastFertilizer,
  }])
  const removeCropRow = (idx) => setAdditionalCrops(prev => prev.filter((_, i) => i !== idx))
  const updateCropRow = (idx, values) => setAdditionalCrops(prev => prev.map((row, i) => i === idx ? values : row))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    if (!coordinates?.lat) { setError('Please set your field location — tap "Use My Location" or click the map.'); return }
    if (!primaryCrop.fieldSize || parseFloat(primaryCrop.fieldSize) <= 0) { setError('Please enter your field size.'); return }
    if (primaryCrop.ph !== '' && (parseFloat(primaryCrop.ph) < 0 || parseFloat(primaryCrop.ph) > 14)) { setError('pH is measured on a 0–14 scale — please check that reading.'); return }

    const badCropRow = additionalCrops.find(row => !row.fieldSize || parseFloat(row.fieldSize) <= 0)
    if (badCropRow) { setError('Enter a field size for each additional crop, or remove it.'); return }

    const soilData = { cropType: primaryCrop.cropType, fieldSize: parseFloat(primaryCrop.fieldSize), fieldSizeUnit: primaryCrop.fieldSizeUnit }
    if (primaryCrop.ph !== '') soilData.ph = parseFloat(primaryCrop.ph)
    if (primaryCrop.nitrogen !== '') soilData.nitrogen = parseFloat(primaryCrop.nitrogen)
    if (primaryCrop.phosphorus !== '') soilData.phosphorus = parseFloat(primaryCrop.phosphorus)
    if (primaryCrop.potassium !== '') soilData.potassium = parseFloat(primaryCrop.potassium)
    if (primaryCrop.currentFertilizer !== '') soilData.currentFertilizer = primaryCrop.currentFertilizer
    if (primaryCrop.pastFertilizer !== '') soilData.pastFertilizer = primaryCrop.pastFertilizer

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

      // Any additional crops become their own independent fields, created
      // right after the account so they're there the moment the farmer
      // lands on the dashboard — not a separate discovery later.
      for (const row of additionalCrops) {
        try {
          const fieldPayload = {
            cropType: row.cropType, fieldSize: parseFloat(row.fieldSize), fieldSizeUnit: row.fieldSizeUnit,
            currentFertilizer: row.currentFertilizer || '', pastFertilizer: row.pastFertilizer || '',
          }
          if (row.ph !== '') fieldPayload.ph = parseFloat(row.ph)
          if (row.nitrogen !== '') fieldPayload.nitrogen = parseFloat(row.nitrogen)
          if (row.phosphorus !== '') fieldPayload.phosphorus = parseFloat(row.phosphorus)
          if (row.potassium !== '') fieldPayload.potassium = parseFloat(row.potassium)
          await fetch(`${API_BASE}/api/users/fields`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.access_token}` },
            body: JSON.stringify(fieldPayload),
          })
        } catch { /* one failed crop shouldn't block account creation */ }
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

              {/* ── Field Location (required, farm-wide) ── */}
              <div className="pt-4 border-t border-[#173809]/10">
                <h3 className="font-headline text-lg font-bold text-[#173809] mb-1">Your Field</h3>
                <p className="text-xs text-[#43493e]/70 mb-4">This is how we tell you exactly what to apply and how much.</p>

                <label className="block font-label text-xs uppercase tracking-widest text-[#43493e] mb-2 ml-2">
                  Field Location
                </label>
                <MapPicker value={coordinates} onChange={setCoordinates} autoDetect />
              </div>

              {/* ── Primary crop — crop, soil test, and fertilizer use together ── */}
              <CropCard
                title="Primary Crop"
                values={primaryCrop}
                onChange={setPrimaryCrop}
              />

              {/* ── Other crops — same depth, prefilled from the primary crop ── */}
              {additionalCrops.map((row, idx) => (
                <CropCard
                  key={idx}
                  title={`Crop ${idx + 2}`}
                  subtitle="Soil test and fertilizer use prefilled from your primary crop — edit as needed"
                  values={row}
                  onChange={(v) => updateCropRow(idx, v)}
                  onRemove={() => removeCropRow(idx)}
                />
              ))}
              <button
                type="button"
                onClick={addCropRow}
                className="flex items-center gap-1.5 text-sm font-bold text-[#173809]/60 hover:text-[#173809] px-2"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Grow another crop too?
              </button>

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
