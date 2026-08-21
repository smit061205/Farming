import API_BASE from "../api.js"
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import MapPicker from '../components/onboarding/MapPicker'
import SoilOCRUploader from '../components/onboarding/SoilOCRUploader'
import { Field, Toggle, Num } from '../components/onboarding/WizardUI'
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

// Drives the nitrogen split-application schedule in fertilizer_engine.py —
// drip/sprinkler fields get a real fertigation split, flood/canal fields
// under heavy rain get a more conservative split.
const IRRIGATION_OPTIONS = [
  { value: 'rainfed', label: 'Rainfed' },
  { value: 'canal', label: 'Canal' },
  { value: 'drip', label: 'Drip' },
  { value: 'sprinkler', label: 'Sprinkler' },
  { value: 'flood', label: 'Flood' },
]

// How the fertilizer itself is placed in the field — distinct from
// "Planting Method" (how the crop went in). Feeds the heat-volatilization
// warning: broadcasting loses more nitrogen to the air than incorporating
// or banding it.
const APPLICATION_METHOD_OPTIONS = [
  { value: 'broadcast', label: 'Broadcast on surface' },
  { value: 'incorporated', label: 'Mixed into soil' },
  { value: 'banded', label: 'Placed in bands' },
  { value: 'fertigation', label: 'Through irrigation water' },
]

function emptyCrop() {
  return {
    cropType: CROP_OPTIONS[0], fieldSize: '', fieldSizeUnit: 'acres',
    ph: '', nitrogen: '', phosphorus: '', potassium: '',
    currentFertilizer: '', pastFertilizer: '', irrigation: 'canal',
    applicationMethod: 'broadcast', waterlogged: false,
  }
}

// A dropdown of real product names, with an "Other / a mix" option that
// reveals a free-text field for genuine blends ("Urea + DAP") the fixed
// list can't name. Whether the text field is showing is its own local UI
// state — decoupled from the string value itself, so there's no need to
// smuggle a "custom mode" flag through the value (e.g. a sentinel space).
function FertilizerSelect({ label, value, onChange, placeholder, required }) {
  const [customMode, setCustomMode] = useState(() => value !== '' && !FERTILIZER_OPTIONS.includes(value))
  const selectValue = customMode ? 'Other / a mix' : value

  return (
    <div>
      <label className="block font-label text-xs uppercase tracking-widest text-[#43493e] mb-2 ml-2">{label}</label>
      <select
        value={selectValue}
        required={required}
        onChange={(e) => {
          if (e.target.value === 'Other / a mix') { setCustomMode(true); return }
          setCustomMode(false)
          onChange(e.target.value)
        }}
        className="w-full bg-white border-0 rounded-full px-6 py-4 text-base font-body text-[#173809] focus:outline-none focus:ring-2 focus:ring-[#173809]/20 transition-shadow shadow-sm"
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
          required={required}
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
    <div className="bg-[#173809]/[0.05] rounded-[1.75rem] p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#173809]/50 text-xl">agriculture</span>
          <div>
            <h3 className="font-headline text-base font-bold text-[#173809]">{title}</h3>
            {subtitle && <p className="text-xs text-[#43493e]/60">{subtitle}</p>}
          </div>
        </div>
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-[#9f402d]/60 hover:text-[#9f402d]">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* Crop + size */}
      <div className="space-y-3">
        <Field label="Crop">
          <select
            value={values.cropType}
            onChange={(e) => set({ cropType: e.target.value })}
            className="w-full bg-white border-0 rounded-full px-5 py-3.5 text-sm font-body text-[#173809] focus:outline-none focus:ring-2 focus:ring-[#173809]/20 shadow-sm"
          >
            {CROP_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Field Size">
            <input
              type="number" min="0" step="0.1" value={values.fieldSize}
              onChange={(e) => set({ fieldSize: e.target.value })}
              placeholder="e.g. 2.5" required
              className="w-full bg-white border-0 rounded-full px-5 py-3.5 text-sm font-body text-[#173809] focus:outline-none focus:ring-2 focus:ring-[#173809]/20 placeholder:text-[#73796d] shadow-sm"
            />
          </Field>
          <Field label="Unit">
            <Toggle
              cols={2}
              value={values.fieldSizeUnit}
              onChange={(v) => set({ fieldSizeUnit: v })}
              options={[{ value: 'acres', label: 'Acres' }, { value: 'hectares', label: 'Hectares' }]}
            />
          </Field>
        </div>
        <Field label="Irrigation">
          <select
            value={values.irrigation}
            onChange={(e) => set({ irrigation: e.target.value })}
            className="w-full bg-white border-0 rounded-full px-5 py-3.5 text-sm font-body text-[#173809] focus:outline-none focus:ring-2 focus:ring-[#173809]/20 shadow-sm"
          >
            {IRRIGATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Fertilizer Application Method" hint="How you place fertilizer, not how you planted — broadcasting on the surface loses more nitrogen to the air than mixing it in.">
          <select
            value={values.applicationMethod}
            onChange={(e) => set({ applicationMethod: e.target.value })}
            className="w-full bg-white border-0 rounded-full px-5 py-3.5 text-sm font-body text-[#173809] focus:outline-none focus:ring-2 focus:ring-[#173809]/20 shadow-sm"
          >
            {APPLICATION_METHOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Standing Water">
          <Toggle
            cols={2}
            value={values.waterlogged}
            onChange={(v) => set({ waterlogged: v })}
            options={[{ value: false, label: 'No' }, { value: true, label: 'Yes, right now' }]}
          />
        </Field>
      </div>

      {/* Soil test — upload a lab report to auto-fill, or type the values in directly */}
      <div className="pt-4 border-t border-[#173809]/10">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#173809]/45 mb-3">
          <span className="material-symbols-outlined text-[13px]">science</span> Soil Test
        </p>
        <SoilOCRUploader onExtracted={(extracted) => {
          const patch = {}
          if (extracted.ph !== null) patch.ph = extracted.ph
          if (extracted.nitrogen_ppm !== null) patch.nitrogen = extracted.nitrogen_ppm
          if (extracted.phosphorus_ppm !== null) patch.phosphorus = extracted.phosphorus_ppm
          if (extracted.potassium_ppm !== null) patch.potassium = extracted.potassium_ppm
          if (Object.keys(patch).length > 0) set(patch)
        }} />
        <div className="flex items-center gap-3 my-4">
          <span className="h-px flex-1 bg-[#173809]/10" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#173809]/30">Or type it in</span>
          <span className="h-px flex-1 bg-[#173809]/10" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Num label="pH" value={values.ph} onChange={(v) => set({ ph: v })} step="0.1" ph required unusual={isUnusual('pH', parseFloat(values.ph))} />
          <Num label="Nitrogen" value={values.nitrogen} onChange={(v) => set({ nitrogen: v })} unit="ppm" required unusual={isUnusual('N', parseFloat(values.nitrogen))} />
          <Num label="Phosphorus" value={values.phosphorus} onChange={(v) => set({ phosphorus: v })} unit="ppm" required unusual={isUnusual('P', parseFloat(values.phosphorus))} />
          <Num label="Potassium" value={values.potassium} onChange={(v) => set({ potassium: v })} unit="ppm" required unusual={isUnusual('K', parseFloat(values.potassium))} />
        </div>
      </div>

      {/* Fertilizer use */}
      <div className="pt-4 border-t border-[#173809]/10">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#173809]/45 mb-3">
          <span className="material-symbols-outlined text-[13px]">eco</span> Fertilizer Use
        </p>
        <div className="grid grid-cols-2 gap-3">
          <FertilizerSelect label="Currently Applying" value={values.currentFertilizer} onChange={(v) => set({ currentFertilizer: v })} placeholder="Describe the mix" required />
          <FertilizerSelect label="Used Previously" value={values.pastFertilizer} onChange={(v) => set({ pastFertilizer: v })} placeholder="Describe the mix" required />
        </div>
      </div>
    </div>
  )
}

const STEPS = [
  { id: 1, title: 'Your Account', sub: "Who's this field plan for?" },
  { id: 2, title: 'Your Field', sub: 'Pin its location — this drives your weather and timing advice.' },
  { id: 3, title: 'Your Crops', sub: 'Crop, soil test, and fertilizer use — add every field you grow.' },
  { id: 4, title: 'Finish Up', sub: "Review and you're in." },
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [step, setStep] = useState(1)
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
    irrigation: primaryCrop.irrigation, applicationMethod: primaryCrop.applicationMethod,
  }])
  const removeCropRow = (idx) => setAdditionalCrops(prev => prev.filter((_, i) => i !== idx))
  const updateCropRow = (idx, values) => setAdditionalCrops(prev => prev.map((row, i) => i === idx ? values : row))

  // Soil test and fertilizer use are mandatory per crop — "None yet" is a
  // valid, selectable answer for fertilizer use, so this never blocks a
  // farmer who genuinely hasn't applied anything, only one who hasn't
  // answered at all.
  const validateCrop = (row, label) => {
    if (!row.fieldSize || parseFloat(row.fieldSize) <= 0) return `Enter ${label}'s field size.`
    if (row.ph === '' || row.nitrogen === '' || row.phosphorus === '' || row.potassium === '') return `Fill in ${label}'s full soil test (pH, N, P, K).`
    if (parseFloat(row.ph) < 0 || parseFloat(row.ph) > 14) return `${label}'s pH is measured on a 0–14 scale — please check that reading.`
    if (row.currentFertilizer === '' || row.pastFertilizer === '') return `Select what ${label} is currently applying and used previously — "None yet" is fine if that's true.`
    return null
  }

  // Same validation rules handleSubmit already enforces, just checked one
  // step earlier so a farmer finds out about a missing field before reaching
  // the end, not after clicking Create Account.
  const validateStep = (n) => {
    if (n === 1) {
      if (!fullName.trim()) return 'Enter your name.'
      if (!identifier.trim()) return mode === 'email' ? 'Enter your email.' : 'Enter your phone number.'
      if (password.length < 8) return 'Password must be at least 8 characters.'
      if (password !== confirmPassword) return 'Passwords do not match.'
      return null
    }
    if (n === 2) {
      if (!coordinates?.lat) return 'Please set your field location — tap "Use My Location" or click the map.'
      return null
    }
    if (n === 3) {
      const primaryError = validateCrop(primaryCrop, 'your primary crop')
      if (primaryError) return primaryError
      for (let i = 0; i < additionalCrops.length; i++) {
        const rowError = validateCrop(additionalCrops[i], `crop ${i + 2}`)
        if (rowError) return rowError
      }
      return null
    }
    return null
  }

  const goNext = () => {
    const stepError = validateStep(step)
    if (stepError) { setError(stepError); return }
    setError('')
    setStep(s => Math.min(4, s + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const goBack = () => {
    setError('')
    setStep(s => Math.max(1, s - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Guards against Enter-key submission reaching this early — the only
    // type="submit" button in the DOM is on the last step, but this keeps
    // the real submission logic from ever running before then regardless.
    if (step !== STEPS.length) { goNext(); return }

    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    if (!coordinates?.lat) { setError('Please set your field location — tap "Use My Location" or click the map.'); return }

    const primaryError = validateCrop(primaryCrop, 'your primary crop')
    if (primaryError) { setError(primaryError); return }
    for (let i = 0; i < additionalCrops.length; i++) {
      const rowError = validateCrop(additionalCrops[i], `crop ${i + 2}`)
      if (rowError) { setError(rowError); return }
    }

    const soilData = {
      cropType: primaryCrop.cropType, fieldSize: parseFloat(primaryCrop.fieldSize), fieldSizeUnit: primaryCrop.fieldSizeUnit,
      ph: parseFloat(primaryCrop.ph), nitrogen: parseFloat(primaryCrop.nitrogen),
      phosphorus: parseFloat(primaryCrop.phosphorus), potassium: parseFloat(primaryCrop.potassium),
      currentFertilizer: primaryCrop.currentFertilizer, pastFertilizer: primaryCrop.pastFertilizer,
      irrigation: primaryCrop.irrigation, applicationMethod: primaryCrop.applicationMethod, waterlogged: primaryCrop.waterlogged,
    }

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
            ph: parseFloat(row.ph), nitrogen: parseFloat(row.nitrogen),
            phosphorus: parseFloat(row.phosphorus), potassium: parseFloat(row.potassium),
            currentFertilizer: row.currentFertilizer, pastFertilizer: row.pastFertilizer,
            irrigation: row.irrigation, applicationMethod: row.applicationMethod,
          }
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

  const current = STEPS[step - 1]

  return (
    <div className="bg-[#fefae0] text-[#1d1c0d] min-h-screen overflow-x-hidden">
      <Navbar />

      <main className="min-h-screen flex items-center justify-center px-6 py-32">
        <div className="w-full max-w-2xl">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs font-bold text-[#173809]/60 mb-2 uppercase tracking-widest">
              <span>Step {step} of {STEPS.length}</span>
              <span className="tabular-nums">{Math.round((step / STEPS.length) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-[#e7e3ca] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#173809] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(step / STEPS.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="text-center mb-10">
            <h1 className="font-headline text-4xl font-bold text-[#173809] tracking-tight mb-3">
              {current.title}
            </h1>
            <p className="text-[#43493e]">{current.sub}</p>
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
              {/* ── Step 1 — Account ── */}
              {step === 1 && (
                <div className="space-y-5">
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
                </div>
              )}

              {/* ── Step 2 — Field Location ── */}
              {step === 2 && (
                <div>
                  <label className="block font-label text-xs uppercase tracking-widest text-[#43493e] mb-2 ml-2">
                    Field Location
                  </label>
                  <MapPicker value={coordinates} onChange={setCoordinates} autoDetect />
                </div>
              )}

              {/* ── Step 3 — Crops ── */}
              {step === 3 && (
                <div className="space-y-5">
                  <CropCard
                    title="Primary Crop"
                    values={primaryCrop}
                    onChange={setPrimaryCrop}
                  />

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
                </div>
              )}

              {/* ── Step 4 — Finish ── */}
              {step === 4 && (
                <div className="space-y-5">
                  <div className="bg-white/60 rounded-2xl p-5 space-y-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#173809]/45">Ready to create</p>
                    <SummaryRow label="Name" value={fullName} />
                    <SummaryRow label={mode === 'email' ? 'Email' : 'Phone'} value={mode === 'phone' ? `+91 ${identifier}` : identifier} />
                    <SummaryRow label="Field location" value={coordinates?.label || (coordinates?.lat ? `${coordinates.lat.toFixed(3)}, ${coordinates.lng.toFixed(3)}` : '—')} />
                    <SummaryRow label="Crops" value={[primaryCrop.cropType, ...additionalCrops.map(c => c.cropType)].join(', ')} />
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer select-none px-2">
                    <input
                      type="checkbox"
                      checked={keepSignedIn}
                      onChange={(e) => setKeepSignedIn(e.target.checked)}
                      className="w-5 h-5 rounded-md border-2 border-[#173809]/30 text-[#173809] accent-[#173809] cursor-pointer"
                    />
                    <span className="text-sm font-medium text-[#43493e]">Keep me signed in</span>
                  </label>
                </div>
              )}

              {/* Nav buttons */}
              <div className="flex gap-3 pt-2">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={goBack}
                    className="px-6 py-4 rounded-full font-headline font-bold text-[#173809] border border-[#173809]/20 hover:bg-white transition-colors"
                  >
                    Back
                  </button>
                )}
                {step < STEPS.length ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="notranslate flex-1 bg-[#173809] text-white rounded-full py-4 font-headline text-lg font-bold hover:bg-[#2d4f1e] active:scale-[0.98] transition-all"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="notranslate flex-1 bg-[#173809] text-white rounded-full py-4 font-headline text-lg font-bold hover:bg-[#2d4f1e] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? 'Creating your account…' : 'Create Account'}
                  </button>
                )}
              </div>
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

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-[#43493e]/60">{label}</span>
      <span className="font-bold text-[#173809] text-right truncate">{value || '—'}</span>
    </div>
  )
}
