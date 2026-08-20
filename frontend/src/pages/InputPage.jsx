import API_BASE from "../api.js"
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import FieldMap from '../components/FieldMap'
import SoilOCRUploader from '../components/onboarding/SoilOCRUploader'
import { CROP_OPTIONS, GROWTH_STAGE_OPTIONS } from '../constants/crops'

const NPK_CONFIG = [
  { key: 'N', label: 'Nitrogen', unit: 'mg/kg', min: 0, max: 500, desc: 'Drives leaf & stem growth' },
  { key: 'P', label: 'Phosphorus', unit: 'mg/kg', min: 0, max: 300, desc: 'Root & bloom development' },
  { key: 'K', label: 'Potassium', unit: 'mg/kg', min: 0, max: 800, desc: 'Stress & drought resilience' },
]

function getNPKStatus(key, val) {
  const t = { N: { low: 100, high: 300 }, P: { low: 30, high: 150 }, K: { low: 100, high: 400 } }[key]
  if (val < t.low) return 'Deficient'
  if (val > t.high) return 'Excess'
  return 'Optimal'
}

// Values outside these bounds are still accepted — real fields can be
// genuine outliers — but flagged so a mistyped digit gets a second look
// instead of silently feeding the fertilizer math.
const PLAUSIBLE_RANGE = {
  pH: { low: 3.5, high: 9.5 },
  N:  { low: 0, high: 400 },
  P:  { low: 0, high: 150 },
  K:  { low: 0, high: 600 },
}

function isUnusual(key, val) {
  const r = PLAUSIBLE_RANGE[key]
  if (!r || val === '' || val == null || isNaN(val)) return false
  return val < r.low || val > r.high
}

export default function InputPage() {
  const navigate = useNavigate()
  const { user, token, refreshUser } = useAuth()
  const [savedValues, setSavedValues] = useState(null)
  const [values, setValues] = useState(() => {
    try {
      const saved = localStorage.getItem('last_analysis')
      if (saved) return JSON.parse(saved)
    } catch {}
    return {
      N: 96, P: 48, K: 194, pH: 6.8, cropType: 'Wheat', soilType: 'Clay Loam',
      fieldSize: 2, fieldSizeUnit: 'acres', growthStage: 'sowing', currentFertilizer: '',
    }
  })
  const [saveStatus, setSaveStatus] = useState(null) // null | 'saving' | 'saved' | 'error'

  const isDirty = savedValues !== null &&
    JSON.stringify(values) !== JSON.stringify(savedValues)
  const [telemetryLoading, setTelemetryLoading] = useState(false)
  const [moisture, setMoisture] = useState(null)
  const [temperature, setTemperature] = useState(null)

  useEffect(() => {
    if (!user?.soil_data) return
    const sd = user.soil_data
    const ph = parseFloat(sd.ph || 6.8)
    const n  = parseFloat(sd.nitrogen || 96)
    const p  = parseFloat(sd.phosphorus) || Math.max(0, Math.round(50 + (ph - 7) * 10))
    const k  = parseFloat(sd.potassium)  || Math.max(0, Math.round(200 + (ph - 7) * 30))
    const initial = {
      pH: ph, N: n, P: p, K: k,
      cropType: sd.cropType || 'Wheat',
      soilType: sd.soilType || 'Clay Loam',
      fieldSize: sd.fieldSize ?? 2,
      fieldSizeUnit: sd.fieldSizeUnit || 'acres',
      growthStage: sd.growthStage || 'sowing',
      currentFertilizer: sd.currentFertilizer || '',
    }
    setValues(initial)
    setSavedValues(initial)
  }, [user])

  const handleSyncTelemetry = async () => {
    if (!user?.coordinates?.lat || !user?.coordinates?.lng) {
      alert('Coordinates are missing. Please ensure your location is pinned in your profile.')
      return
    }
    setTelemetryLoading(true)
    try {
      const { lat, lng } = user.coordinates
      const res = await fetch(`${API_BASE}/api/engine/fetch-telemetry?lat=${lat}&lng=${lng}`)
      const json = await res.json()
      if (json.status === 'success' && json.data) {
        const d = json.data
        if (d.moisture !== null) setMoisture(d.moisture)
        if (d.temperature !== null) setTemperature(d.temperature)
        if (d.ph !== null || d.nitrogen !== null) {
          const newPh = d.ph !== null ? d.ph : values.pH
          const n = d.nitrogen !== null ? d.nitrogen : values.N
          const p = Math.max(0, Math.round(50 + (newPh - 7) * 10))
          const k = Math.max(0, Math.round(200 + (newPh - 7) * 30))
          setValues(prev => ({ ...prev, pH: newPh, N: n, P: p, K: k }))
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setTelemetryLoading(false)
    }
  }

  // pH, N, P, K are four independent lab readings — a real soil test never
  // derives one from another, so editing one field only ever changes that
  // field. (This used to auto-recompute the other three from a made-up
  // formula whenever any single value changed, silently overwriting real
  // farmer-entered numbers.)
  const handleChange = (field, valStr) => {
    if (['cropType', 'soilType', 'fieldSizeUnit', 'growthStage', 'currentFertilizer'].includes(field)) {
      setValues(prev => ({ ...prev, [field]: valStr }))
      return
    }
    if (field === 'fieldSize') {
      setValues(prev => ({ ...prev, fieldSize: valStr === '' ? '' : Math.max(0, parseFloat(valStr) || 0) }))
      return
    }
    if (valStr === '') { setValues(prev => ({ ...prev, [field]: '' })); return }
    const val = parseFloat(valStr)
    if (isNaN(val)) return
    const clamp = field === 'pH' ? [0, 14] : field === 'N' ? [0, 500] : field === 'P' ? [0, 300] : [0, 800]
    setValues(prev => ({ ...prev, [field]: Math.max(clamp[0], Math.min(clamp[1], val)) }))
  }

  const handleSave = async () => {
    setSaveStatus('saving')
    try {
      const res = await fetch(`${API_BASE}/api/users/soil-data`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ph: parseFloat(values.pH),
          nitrogen: parseFloat(values.N),
          phosphorus: parseFloat(values.P),
          potassium: parseFloat(values.K),
          cropType: values.cropType,
          soilType: values.soilType,
          fieldSize: parseFloat(values.fieldSize) || 0,
          fieldSizeUnit: values.fieldSizeUnit,
          growthStage: values.growthStage,
          currentFertilizer: values.currentFertilizer || '',
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      localStorage.setItem('last_analysis', JSON.stringify(values))
      setSavedValues({ ...values })
      await refreshUser()       // re-fetch user profile globally
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (e) {
      console.error(e)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }

  const handleAnalyze = () => {
    localStorage.setItem('last_analysis', JSON.stringify(values))
    navigate('/dashboard', { state: { fieldData: values } })
  }

  const ph = parseFloat(values.pH) || 7
  const phStatus = ph < 5.5 ? 'Acidic' : ph > 7.5 ? 'Alkaline' : 'Neutral'
  const phPct = ((ph - 3) / 8) * 100

  return (
    <div className="bg-[#fefae0] text-[#1d1c0d] overflow-x-hidden min-h-screen flex flex-col">
      <Navbar activeLink="analyze" />

      {/* Toast */}
      {saveStatus && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-6 py-3 rounded-full text-sm font-bold shadow-2xl transition-all ${
          saveStatus === 'saving' ? 'bg-[#173809]/90 text-white' :
          saveStatus === 'saved'  ? 'bg-[#173809] text-white' :
          'bg-[#9f402d] text-white'
        }`}>
          {saveStatus === 'saving' && <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>}
          {saveStatus === 'saved'  && <span className="material-symbols-outlined text-[18px]">check_circle</span>}
          {saveStatus === 'error'  && <span className="material-symbols-outlined text-[18px]">error</span>}
          {saveStatus === 'saving' ? 'Saving to profile…'
           : saveStatus === 'saved' ? 'Profile updated across all pages'
           : 'Save failed — please retry'}
        </div>
      )}

      <main className="flex-grow pt-32 pb-24 px-4 md:px-12 max-w-[1400px] mx-auto w-full">

        {/* Header */}
        <header className="mb-14 flex items-end justify-between gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#173809]/40 mb-3 block">
              Tell Us About Your Field
            </span>
            <h1 className="font-headline text-4xl sm:text-5xl md:text-7xl font-bold text-[#173809] tracking-tighter leading-none">
              Analyze Your <span className="italic font-light">Field</span>
            </h1>
          </div>
          {isDirty && (
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="shrink-0 flex items-center gap-2 bg-[#173809] text-white px-7 py-3 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-[#2d4f1e] active:scale-95 transition-all shadow-md disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              Save Changes
            </button>
          )}
        </header>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="lg:col-span-7 space-y-5">

            {/* NPK Card */}
            <div className="bg-white rounded-3xl p-8 border border-[#173809]/8 shadow-sm">
              <div className="flex items-center justify-between mb-7 pb-5 border-b border-[#173809]/6">
                <div>
                  <h2 className="text-xl font-bold text-[#173809]">Chemical Composition</h2>
                  <p className="text-xs text-[#173809]/40 font-medium mt-0.5 uppercase tracking-widest">N · P · K</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-5">
                {NPK_CONFIG.map(({ key, label, unit, max, desc }) => {
                  const val = parseFloat(values[key]) || 0
                  const pct = Math.min(100, (val / max) * 100)
                  const status = getNPKStatus(key, val)
                  const unusual = isUnusual(key, val)
                  return (
                    <div key={key} className="group">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#173809]/40">{label}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                          status === 'Optimal' ? 'bg-[#173809]/8 text-[#173809]' :
                          status === 'Deficient' ? 'bg-[#173809]/5 text-[#173809]/50' :
                          'bg-[#173809]/5 text-[#173809]/50'
                        }`}>{status}</span>
                      </div>
                      <div className="relative mb-3">
                        <input
                          type="number"
                          min={0} max={max}
                          value={values[key]}
                          onChange={e => handleChange(key, e.target.value)}
                          className={`w-full bg-[#fafaf8] border rounded-xl px-4 py-3 text-2xl font-headline font-bold text-[#173809] focus:outline-none transition-colors ${
                            unusual ? 'border-[#9f402d]/40 focus:border-[#9f402d]' : 'border-[#173809]/10 focus:border-[#173809]/30'
                          }`}
                        />
                        <span className="absolute right-3 bottom-3 text-[10px] font-bold text-[#173809]/30 uppercase">{unit}</span>
                      </div>
                      <div className="h-1 bg-[#173809]/8 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#173809] transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      {unusual ? (
                        <p className="text-[10px] text-[#9f402d] font-bold mt-1.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">warning</span>
                          Unusual for a lab test — double-check this reading
                        </p>
                      ) : (
                        <p className="text-[10px] text-[#173809]/30 mt-1.5">{desc}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* pH Card */}
            <div className="bg-white rounded-3xl p-8 border border-[#173809]/8 shadow-sm">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-[#173809]">Soil Acidity</h2>
                  <p className="text-xs text-[#173809]/40 font-medium mt-0.5 uppercase tracking-widest">pH Scale 3 – 11</p>
                </div>
                <div className="text-right">
                  <input
                    type="number"
                    step="0.1" min="3" max="11"
                    value={values.pH}
                    onChange={e => handleChange('pH', e.target.value)}
                    className="text-5xl font-headline font-bold text-[#173809] bg-transparent border-none outline-none w-28 text-right appearance-none focus:ring-0"
                    style={{ WebkitAppearance: 'none' }}
                  />
                  <p className="text-xs font-bold text-[#173809]/40 uppercase tracking-widest">{phStatus}</p>
                </div>
              </div>
              {/* Plain single-color slider */}
              <div className="relative h-2 bg-[#173809]/8 rounded-full mb-3">
                <div className="absolute top-0 left-0 h-full bg-[#173809] rounded-full transition-all duration-300" style={{ width: `${phPct}%` }} />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-[#173809] rounded-full shadow-md border-2 border-white pointer-events-none transition-all duration-300"
                  style={{ left: `calc(${phPct}% - 10px)` }}
                />
                <input
                  type="range" min="3" max="11" step="0.1"
                  value={values.pH}
                  onChange={e => handleChange('pH', parseFloat(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[#173809]/30">
                <span>Acidic (3)</span><span>Neutral (7)</span><span>Alkaline (11)</span>
              </div>
              {isUnusual('pH', ph) && (
                <p className="text-[10px] text-[#9f402d] font-bold mt-3 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">warning</span>
                  Unusual for a lab test — double-check this reading
                </p>
              )}
            </div>

            {/* Crop, Soil Type & Growth Stage */}
            <div className="grid grid-cols-3 gap-5">
              {[
                { field: 'cropType', label: 'Crop Type', options: CROP_OPTIONS.map(o => ({ value: o, label: o })) },
                { field: 'soilType', label: 'Soil Type', options: ['Clay Loam', 'Sandy Loam', 'Silt Loam', 'Sandy', 'Loamy', 'Clay'].map(o => ({ value: o, label: o })) },
                { field: 'growthStage', label: 'Growth Stage', options: GROWTH_STAGE_OPTIONS },
              ].map(({ field, label, options }) => (
                <div key={field} className="bg-white rounded-3xl p-6 border border-[#173809]/8 shadow-sm">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#173809]/40 block mb-3">{label}</label>
                  <select
                    value={values[field]}
                    onChange={e => handleChange(field, e.target.value)}
                    className="w-full bg-[#fafaf8] border border-[#173809]/10 rounded-xl px-4 py-3 text-base font-bold text-[#173809] focus:outline-none focus:border-[#173809]/30 cursor-pointer transition-colors"
                  >
                    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Field Size — drives total product quantity, not just a per-hectare rate */}
            <div className="bg-white rounded-3xl p-8 border border-[#173809]/8 shadow-sm">
              <div className="flex items-end justify-between gap-6">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-[#173809]">Field Size</h2>
                  <p className="text-xs text-[#173809]/40 font-medium mt-0.5 uppercase tracking-widest">Converts dosage rate into total product needed</p>
                </div>
                <input
                  type="number"
                  min={0} step="0.1"
                  value={values.fieldSize}
                  onChange={e => handleChange('fieldSize', e.target.value)}
                  className="w-28 bg-[#fafaf8] border border-[#173809]/10 rounded-xl px-4 py-3 text-2xl font-headline font-bold text-[#173809] text-right focus:outline-none focus:border-[#173809]/30 transition-colors"
                />
                <div className="flex bg-[#fafaf8] border border-[#173809]/10 rounded-xl p-1 shrink-0">
                  {['acres', 'hectares'].map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => handleChange('fieldSizeUnit', u)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${
                        values.fieldSizeUnit === u ? 'bg-[#173809] text-white' : 'text-[#173809]/50 hover:text-[#173809]'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Current Fertilizer — lets the AI compare the plan against what's already being applied */}
            <div className="bg-white rounded-3xl p-8 border border-[#173809]/8 shadow-sm">
              <h2 className="text-xl font-bold text-[#173809]">What Are You Applying Now?</h2>
              <p className="text-xs text-[#173809]/40 font-medium mt-0.5 mb-4">Optional — your plan will say whether to keep, switch, or stop it.</p>
              <input
                type="text"
                value={values.currentFertilizer}
                onChange={e => handleChange('currentFertilizer', e.target.value)}
                placeholder="e.g. Urea only, or DAP + MOP, or nothing yet"
                className="w-full bg-[#fafaf8] border border-[#173809]/10 rounded-xl px-4 py-3 text-base font-medium text-[#173809] focus:outline-none focus:border-[#173809]/30 transition-colors placeholder:text-[#173809]/30"
              />
            </div>

            {/* Map Card */}
            <div className="bg-white rounded-3xl p-8 border border-[#173809]/8 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold text-[#173809]">Field Coordinates</h2>
                  <p className="text-xs text-[#173809]/40 font-medium mt-0.5">{user?.coordinates?.label || 'No location set'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {moisture !== null && (
                    <span className="text-xs font-bold text-[#173809]/60 bg-[#173809]/6 px-3 py-1.5 rounded-full">
                      💧 {moisture}%
                    </span>
                  )}
                  {temperature !== null && (
                    <span className="text-xs font-bold text-[#173809]/60 bg-[#173809]/6 px-3 py-1.5 rounded-full">
                      🌡 {temperature}°C
                    </span>
                  )}
                  <button
                    onClick={handleSyncTelemetry}
                    disabled={telemetryLoading}
                    className="bg-[#173809] text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 hover:bg-[#2d4f1e] transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[14px]">satellite_alt</span>
                    {telemetryLoading ? 'Syncing…' : 'Sync'}
                  </button>
                </div>
              </div>
              <div className="rounded-2xl overflow-hidden h-64 border border-[#173809]/10">
                <FieldMap coordinates={user?.coordinates} zoom={12} height="100%" showLabel={false} />
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="lg:col-span-5 sticky top-32 space-y-5">

            {/* Snapshot Summary */}
            <div className="bg-white rounded-3xl p-8 border border-[#173809]/8 shadow-sm">
              <div className="flex items-center justify-between mb-6 pb-5 border-b border-[#173809]/6">
                <h2 className="text-xl font-bold text-[#173809]">Field Snapshot</h2>
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#173809]/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#173809]/30 animate-pulse"></span>
                  Live
                </span>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Nitrogen', value: values.N, unit: 'mg/kg', key: 'N' },
                  { label: 'Phosphorus', value: values.P, unit: 'mg/kg', key: 'P' },
                  { label: 'Potassium', value: values.K, unit: 'mg/kg', key: 'K' },
                  { label: 'pH Level', value: values.pH, unit: '', key: null },
                ].map(item => {
                  const status = item.key ? getNPKStatus(item.key, parseFloat(item.value) || 0) : phStatus
                  return (
                    <div key={item.label} className="flex items-center justify-between py-3 border-b border-[#173809]/5 last:border-0">
                      <span className="text-sm font-medium text-[#173809]/50">{item.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-[#173809]/30">{status}</span>
                        <span className="text-lg font-headline font-bold text-[#173809]">{item.value} <span className="text-xs font-normal text-[#173809]/40">{item.unit}</span></span>
                      </div>
                    </div>
                  )
                })}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-[#173809]/40 font-medium">
                  <span>{values.cropType}</span>
                  <span className="text-[#173809]/20">·</span>
                  <span>{values.soilType}</span>
                  <span className="text-[#173809]/20">·</span>
                  <span>{values.fieldSize} {values.fieldSizeUnit}</span>
                  <span className="text-[#173809]/20">·</span>
                  <span className="capitalize">{values.growthStage}</span>
                </div>
              </div>
            </div>

            {/* OCR Upload */}
            <div className="bg-white rounded-3xl p-8 border border-[#173809]/8 shadow-sm">
              <h2 className="text-xl font-bold text-[#173809] mb-1">Lab Report Upload</h2>
              <p className="text-xs text-[#173809]/40 font-medium mb-6">Drag a soil report (PDF, JPG) for AI digitization. Values auto-fill.</p>
              <SoilOCRUploader onExtracted={(extracted) => {
                const patch = {}
                if (extracted.ph !== null) patch.pH = extracted.ph
                if (extracted.nitrogen_ppm !== null) patch.N = extracted.nitrogen_ppm
                if (extracted.phosphorus_ppm !== null) patch.P = extracted.phosphorus_ppm
                if (extracted.potassium_ppm !== null) patch.K = extracted.potassium_ppm
                if (Object.keys(patch).length > 0) {
                  setValues(prev => ({ ...prev, ...patch }))
                  alert('OCR extracted values. Verify the inputs on the left.')
                }
              }} />
            </div>

            {/* CTA */}
            <button
              onClick={handleAnalyze}
              className="w-full bg-[#173809] text-white rounded-full py-5 px-10 font-headline text-lg font-bold hover:bg-[#2d4f1e] hover:scale-[0.99] transition-all flex items-center justify-center gap-3 group shadow-[0_8px_30px_rgba(23,56,9,0.2)]"
            >
              Get My Fertilizer Plan
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform text-[20px]">arrow_forward</span>
            </button>
            <p className="text-center text-[10px] text-[#173809]/30 uppercase tracking-widest font-bold">
              Powered by AgriSense
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
