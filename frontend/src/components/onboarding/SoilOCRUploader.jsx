import API_BASE from '../api.js'
import { useState, useRef } from 'react'

const FIELD_LABELS = {
  ph:                 { label: 'pH Level',       unit: '',    icon: 'science'    },
  nitrogen_ppm:       { label: 'Nitrogen (N)',    unit: 'ppm', icon: 'grass'      },
  phosphorus_ppm:     { label: 'Phosphorus (P)',  unit: 'ppm', icon: 'local_florist' },
  potassium_ppm:      { label: 'Potassium (K)',   unit: 'ppm', icon: 'water_drop' },
  organic_matter_pct: { label: 'Organic Matter',  unit: '%',   icon: 'compost'    },
}

const LOADING_STEPS = [
  'Scanning document structure…',
  'Identifying chemical notation…',
  'Reading NPK values…',
  'Calibrating pH extraction…',
  'Finalising soil profile…',
]

export default function SoilOCRUploader({ onExtracted }) {
  const [dragOver, setDragOver]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [extracted, setExtracted] = useState(null)
  const [fileName, setFileName]   = useState(null)
  const [stepIdx, setStepIdx]     = useState(0)
  const fileRef = useRef()

  const processFile = async (file) => {
    if (!file) return
    setError(null); setExtracted(null)
    setFileName(file.name); setLoading(true); setStepIdx(0)

    const interval = setInterval(() =>
      setStepIdx(i => Math.min(i + 1, LOADING_STEPS.length - 1)), 800
    )
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('${API_BASE}/api/engine/ocr-soil-report', { method: 'POST', body: form })
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'OCR failed') }
      const json = await res.json()
      setExtracted(json.data)
      onExtracted(json.data)
    } catch (e) {
      setError(e.message || 'Could not read the document. Try a clearer image.')
    } finally {
      clearInterval(interval); setLoading(false)
    }
  }

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }
  const handleFileChange = (e) => { const f = e.target.files[0]; if (f) processFile(f) }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer ${
          dragOver
            ? 'border-[#173809]/40 bg-[#173809]/4'
            : 'border-[#173809]/15 hover:border-[#173809]/30 hover:bg-[#173809]/3 bg-white'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !loading && fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={handleFileChange} />

        {loading ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#173809]/15 border-t-[#173809] rounded-full animate-spin" />
            <p className="text-xs font-medium text-[#173809]/50 animate-pulse">{LOADING_STEPS[stepIdx]}</p>
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center gap-2 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-[#173809]/6 flex items-center justify-center mb-1">
              <span className="material-symbols-outlined text-[#173809]/40 text-2xl">upload_file</span>
            </div>
            <p className="text-sm font-bold text-[#173809]">
              {fileName || 'Drop your lab report here'}
            </p>
            <p className="text-xs text-[#173809]/40">PDF, JPG or PNG — soil report or photo of test kit</p>
            <span className="mt-2 inline-block bg-[#173809] text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
              Browse file
            </span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-[#9f402d]/6 border border-[#9f402d]/15 rounded-xl px-4 py-3">
          <span className="material-symbols-outlined text-[#9f402d] text-[16px] mt-0.5 shrink-0">error</span>
          <div>
            <p className="text-xs font-bold text-[#9f402d] mb-0.5">Extraction failed</p>
            <p className="text-xs text-[#9f402d]/70">{error}</p>
          </div>
        </div>
      )}

      {/* Extracted values */}
      {extracted && (
        <div className="bg-[#fafaf8] border border-[#173809]/8 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="material-symbols-outlined text-[#173809] text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#173809]/50">Extracted — review before continuing</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(FIELD_LABELS).map(([key, { label, unit, icon }]) => {
              const val = extracted[key]
              const found = val !== null && val !== undefined
              return (
                <div key={key} className={`rounded-xl p-3 flex items-center gap-2 border ${found ? 'bg-white border-[#173809]/10' : 'bg-[#fafaf8] border-[#173809]/5 opacity-50'}`}>
                  <span className={`material-symbols-outlined text-[16px] ${found ? 'text-[#173809]/60' : 'text-[#173809]/20'}`}>{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#173809]/40">{label}</p>
                    <p className="text-sm font-bold text-[#173809]">
                      {found ? `${val} ${unit}` : <span className="text-[#173809]/25 font-normal text-xs">Not found</span>}
                    </p>
                  </div>
                  <span className={`material-symbols-outlined text-[13px] ${found ? 'text-[#173809]/50' : 'text-[#173809]/20'}`}>
                    {found ? 'check' : 'close'}
                  </span>
                </div>
              )
            })}
          </div>
          <button type="button" onClick={() => fileRef.current?.click()} className="w-full text-center text-xs font-bold uppercase tracking-widest text-[#173809]/30 hover:text-[#173809]/60 pt-1 transition-colors">
            Try a different file
          </button>
        </div>
      )}
    </div>
  )
}
