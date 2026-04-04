import API_BASE from "../../api.js"
import { useState, useEffect } from 'react'
import MapPicker from './MapPicker'
import SoilOCRUploader from './SoilOCRUploader'

const SOIL_TYPES = ['Clay', 'Loam', 'Sandy', 'Silt', 'Clay Loam', 'Sandy Loam']

export default function PhaseGeology({ data, update, prev, submit }) {
  const [soilMode, setSoilMode] = useState('upload')
  const [telemetry, setTelemetry] = useState(null)
  const [telemetryLoading, setTelemetryLoading] = useState(false)

  const hasLocation = !!(data.coordinates?.lat)
  const soilData = data.soil_data || {}

  const handleSoilUpdate = (key, val) =>
    update({ soil_data: { ...soilData, [key]: val } })

  useEffect(() => {
    if (!hasLocation) return
    setTelemetryLoading(true)
    const { lat, lng } = data.coordinates
    fetch(`${API_BASE}/api/engine/fetch-telemetry?lat=${lat}&lng=${lng}`)
      .then(r => r.json())
      .then(res => { if (res.status === 'success') setTelemetry(res.data) })
      .catch(() => {})
      .finally(() => setTelemetryLoading(false))
  }, [data.coordinates?.lat, data.coordinates?.lng])

  const handleOcrExtracted = (extracted) => {
    const patch = {}
    if (extracted.ph != null)             patch.ph           = String(extracted.ph)
    if (extracted.nitrogen_ppm != null)   patch.nitrogen     = String(extracted.nitrogen_ppm)
    if (extracted.phosphorus_ppm != null) patch.phosphorus   = String(extracted.phosphorus_ppm)
    if (extracted.potassium_ppm != null)  patch.potassium    = String(extracted.potassium_ppm)
    if (extracted.organic_matter_pct != null) patch.organic_matter = String(extracted.organic_matter_pct)
    if (Object.keys(patch).length > 0) {
      update({ soil_data: { ...soilData, ...patch, data_source: 'ocr' } })
      setSoilMode('manual')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    let finalSoilData = { ...soilData }
    try {
      const ph = parseFloat(soilData.ph || 6.5)
      const n  = parseFloat(soilData.nitrogen || 0)
      const p  = soilData.phosphorus ? parseFloat(soilData.phosphorus) : null
      const k  = soilData.potassium  ? parseFloat(soilData.potassium)  : null
      const res = await fetch('${API_BASE}/api/engine/derive-soil-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ph, nitrogen: n, phosphorus: p, potassium: k, soil_type: soilData.soil_type || 'loam', lat: data.coordinates?.lat, lng: data.coordinates?.lng }),
      })
      if (res.ok) {
        const metrics = await res.json()
        finalSoilData = { ...finalSoilData, ...metrics, data_source: finalSoilData.data_source || 'manual' }
        update({ soil_data: finalSoilData })
      }
    } catch {}
    submit({ soil_data: finalSoilData })
  }

  const inputClass = "w-full bg-white border border-[#173809]/10 rounded-xl px-4 py-3 text-sm font-medium text-[#173809] focus:outline-none focus:border-[#173809]/25 transition-colors placeholder:text-[#173809]/25"

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#173809]/30 mb-2">Step 3 of 3</p>
        <h2 className="font-headline text-3xl font-bold text-[#173809] tracking-tight">Soil Profile</h2>
        <p className="text-sm text-[#173809]/50 mt-1">Pin your land and provide your soil chemistry baseline.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 flex-1">

        {/* Map */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#173809]/40 mb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">location_on</span>
            Field Location {!hasLocation && <span className="text-[#9f402d] font-normal normal-case tracking-normal">— click to pin</span>}
          </label>
          <div className="rounded-2xl overflow-hidden border border-[#173809]/10">
            <MapPicker value={data.coordinates} onChange={(c) => update({ coordinates: c })} />
          </div>
        </div>

        {/* Live Telemetry strip */}
        {hasLocation && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: 'water_drop', label: 'Moisture', value: telemetryLoading ? '…' : telemetry?.moisture != null ? `${telemetry.moisture}%` : 'N/A' },
              { icon: 'thermostat', label: 'Surface Temp', value: telemetryLoading ? '…' : telemetry?.temperature != null ? `${telemetry.temperature}°C` : 'N/A' },
            ].map(({ icon, label, value }) => (
              <div key={label} className="bg-[#fafaf8] border border-[#173809]/8 rounded-xl p-3 flex items-center gap-3">
                <span className="material-symbols-outlined text-[#173809]/30 text-lg">{icon}</span>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#173809]/30">{label}</p>
                  <p className="text-base font-bold text-[#173809]">{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Org name */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#173809]/40 mb-2">Organisation</label>
          <input
            required type="text"
            value={data.org_name || ''}
            onChange={e => update({ org_name: e.target.value })}
            placeholder="Obsidian Valley Farms"
            className="w-full bg-[#fafaf8] border border-[#173809]/10 rounded-xl px-5 py-3.5 text-base font-medium text-[#173809] focus:outline-none focus:border-[#173809]/25 transition-colors placeholder:text-[#173809]/25"
          />
        </div>

        {/* Soil Chemistry */}
        <div className="bg-[#fafaf8] border border-[#173809]/8 rounded-2xl overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-[#173809]/8">
            {[
              { id: 'upload', label: 'Upload Report' },
              { id: 'manual', label: 'Enter Manually' },
            ].map(({ id, label }) => (
              <button
                key={id} type="button"
                onClick={() => setSoilMode(id)}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${soilMode === id ? 'text-[#173809] border-b-2 border-[#173809] -mb-px bg-white' : 'text-[#173809]/30 hover:text-[#173809]/60'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {soilMode === 'upload' && (
              <div>
                <SoilOCRUploader onExtracted={handleOcrExtracted} />
                {soilData.ph && (
                  <p className="mt-3 text-center text-xs text-[#173809]/40 font-medium">
                    ✓ Values extracted — switch to Manual to review
                  </p>
                )}
              </div>
            )}

            {soilMode === 'manual' && (
              <div className="space-y-4">
                {soilData.data_source === 'ocr' && (
                  <div className="flex items-center gap-2 bg-[#173809]/5 rounded-xl px-4 py-2">
                    <span className="material-symbols-outlined text-[#173809]/50 text-[15px]">auto_awesome</span>
                    <p className="text-xs font-medium text-[#173809]/50">Auto-extracted from lab report — review below</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'ph',         label: 'pH Level',        placeholder: '6.5', step: '0.1', max: 14  },
                    { key: 'nitrogen',   label: 'Nitrogen (ppm)',   placeholder: '120', step: '1',   max: 1000 },
                    { key: 'phosphorus', label: 'Phosphorus (ppm)', placeholder: '48',  step: '1',   max: 500  },
                    { key: 'potassium',  label: 'Potassium (ppm)',  placeholder: '194', step: '1',   max: 1000 },
                  ].map(({ key, label, placeholder, step, max }) => (
                    <div key={key}>
                      <label className="block text-[9px] font-bold uppercase tracking-widest text-[#173809]/40 mb-1.5">{label}</label>
                      <input
                        type="number" step={step} min="0" max={max}
                        value={soilData[key] || ''}
                        onChange={e => handleSoilUpdate(key, e.target.value)}
                        placeholder={placeholder}
                        className={inputClass}
                        {...(key === 'ph' || key === 'nitrogen' ? { required: true } : {})}
                      />
                    </div>
                  ))}
                </div>

                {/* Soil Type chips */}
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-[#173809]/40 mb-2">Soil Type</label>
                  <div className="flex flex-wrap gap-2">
                    {SOIL_TYPES.map(type => (
                      <button
                        key={type} type="button"
                        onClick={() => handleSoilUpdate('soil_type', type.toLowerCase())}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                          soilData.soil_type === type.toLowerCase()
                            ? 'bg-[#173809] text-white'
                            : 'bg-white border border-[#173809]/10 text-[#173809]/50 hover:border-[#173809]/25 hover:text-[#173809]'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-2 flex gap-3">
          <button type="button" onClick={prev} className="bg-[#fafaf8] border border-[#173809]/10 text-[#173809] rounded-xl px-5 py-4 font-bold hover:bg-[#f0ede0] active:scale-95 transition-all flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <button
            type="submit"
            disabled={!hasLocation || (!soilData.ph && !soilData.nitrogen)}
            className="flex-1 bg-[#173809] text-white rounded-xl py-4 font-bold text-sm uppercase tracking-widest hover:bg-[#2d4f1e] active:scale-[0.99] transition-all flex items-center justify-center gap-2 group disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {!hasLocation ? 'Pin your location first' : (!soilData.ph && !soilData.nitrogen) ? 'Add soil data to continue' : 'Complete Setup'}
            {hasLocation && (soilData.ph || soilData.nitrogen) && (
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">check</span>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
