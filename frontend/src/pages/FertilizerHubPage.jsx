import API_BASE from "../api.js"
import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { CROP_OPTIONS, GROWTH_STAGE_OPTIONS } from '../constants/crops'

const SOIL_TYPES_DB = [
  {
    id: 's1', name: 'Sandy Soil', texture: 'Coarse', draining: 'Excellent',
    phRange: '5.5 – 7.0', fertility: 'Low', icon: 'grain',
    description: 'Composed of large, loose particles that drain extremely fast. Warms up quickly in spring but retains almost no nutrients or moisture, requiring frequent irrigation and amendment.',
    bestCrops: 'Carrots, Radishes, Potatoes, Peanuts',
    amendment: 'Compost, Organic Matter, Clay'
  },
  {
    id: 's2', name: 'Clay Soil', texture: 'Fine', draining: 'Poor',
    phRange: '6.0 – 7.5', fertility: 'High', icon: 'layers',
    description: 'Dense, compact particles that hold water and nutrients extremely well. Prone to waterlogging and cracking when dry. Rich in minerals but difficult to work when wet.',
    bestCrops: 'Wheat, Rice, Brassicas, Aster Flowers',
    amendment: 'Gypsum, Organic Matter, Sand'
  },
  {
    id: 's3', name: 'Loam Soil', texture: 'Mixed', draining: 'Balanced',
    phRange: '6.0 – 7.0', fertility: 'Very High', icon: 'eco',
    description: 'The ideal agricultural soil — a balanced mix of sand, silt, and clay. Holds moisture without waterlogging, is nutrient-rich, well-aerated, and easy to work.',
    bestCrops: 'Corn, Tomatoes, Soy, Shrubs, Legumes',
    amendment: 'Minimal — maintain organic matter'
  },
  {
    id: 's4', name: 'Silt Soil', texture: 'Medium-Fine', draining: 'Moderate',
    phRange: '6.0 – 7.3', fertility: 'High', icon: 'water',
    description: 'Smooth, silky particles finer than sand but coarser than clay. Retains moisture well and is very fertile. Can compact and crust easily, reducing surface drainage.',
    bestCrops: 'Wheat, Grapes, Cannabis, Soft Fruits',
    amendment: 'Organic Compost to improve structure'
  },
  {
    id: 's5', name: 'Sandy Loam', texture: 'Coarse-Mixed', draining: 'Good',
    phRange: '5.8 – 7.0', fertility: 'Moderate', icon: 'landscape',
    description: 'A sandy base improved with enough loam to increase nutrient and water retention. Excellent drainage while supporting healthy root growth. Widely used in commercial horticulture.',
    bestCrops: 'Strawberries, Peas, Onions, Root Crops',
    amendment: 'Compost, Slow-release fertilizers'
  },
  {
    id: 's6', name: 'Clay Loam', texture: 'Fine-Mixed', draining: 'Slow-Moderate',
    phRange: '6.2 – 7.5', fertility: 'High', icon: 'circle',
    description: 'A heavier loam with strong clay content. Retains moisture and nutrients efficiently. Common in productive agricultural valleys. Can become compacted under heavy machinery.',
    bestCrops: 'Sugar Beet, Cotton, Cereal Grains, Sunflowers',
    amendment: 'Gypsum, Drainage management'
  },
  {
    id: 's7', name: 'Peat Soil', texture: 'Spongy', draining: 'Very Poor',
    phRange: '3.5 – 6.0', fertility: 'Low (Raw)', icon: 'forest',
    description: 'Dark, acidic, and spongy from accumulated organic matter. Exceptionally water-retentive. Low in mineral nutrients naturally but extremely responsive to lime and nutrient amendment.',
    bestCrops: 'Blueberries, Rhododendrons, Heathers',
    amendment: 'Lime to raise pH, mineral fertilizers'
  },
  {
    id: 's8', name: 'Chalk / Calcareous', texture: 'Lumpy', draining: 'High',
    phRange: '7.5 – 8.5', fertility: 'Low-Moderate', icon: 'brightness_high',
    description: 'Highly alkaline soil formed over chalk or limestone bedrock. Locks up iron and manganese causing chlorosis. Lightweight and free-draining but highly inhospitable without acidification.',
    bestCrops: 'Lavender, Sage, Cabbages, Brassicas',
    amendment: 'Sulfur to acidify, chelated iron'
  }
]

const NUTRIENT_META = {
  nitrogen:   { short: 'N', color: '#173809' },
  phosphorus: { short: 'P', color: '#9f402d' },
  potassium:  { short: 'K', color: '#4e2500' },
}

// Standard Indian retail bag sizes — Urea is sold in 45kg bags, DAP/MOP in 50kg.
const BAG_SIZE_KG = {
  'Granular Urea': 45,
  'DAP (Diammonium Phosphate)': 50,
  'Muriate of Potash (MOP)': 50,
}

const PLANTING_METHODS = [
  'Broadcasting', 'Line Sowing / Drilling', 'Transplanting',
  'Direct Seeding', 'Drip / Fertigation', 'SRI (System of Rice Intensification)',
]

// Connects to ICAR's Krishi Vigyan Kendra network — the real, local channel
// through which Indian farmers get hands-on training on application
// methods (broadcasting, banding, fertigation) — verified reachable.
const FERTILIZER_METHODS_HELP_URL = 'https://icar.org.in/en/agricultural-extension-division/krishi-vigyan-kendra-kvk-farm-science-centre'

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

function StatusBadge({ status }) {
  const label = status === 'deficient' ? 'Apply Now' : status === 'excess' ? 'Over-Supplied' : 'Sufficient'
  const cls = status === 'deficient' ? 'bg-[#9f402d]/10 text-[#9f402d]'
            : status === 'excess'    ? 'bg-[#b8862e]/12 text-[#8a641c]'
            : 'bg-[#173809]/8 text-[#173809]'
  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shrink-0 flex items-center gap-1 ${cls}`}>
      {status === 'excess' && <span className="material-symbols-outlined text-[13px]">warning</span>}
      {label}
    </span>
  )
}

// ── Add Field form ──────────────────────────────────────────────────────────
function AddFieldModal({ token, onClose, onSaved }) {
  const [form, setForm] = useState({
    cropType: CROP_OPTIONS[0], plantingMethod: PLANTING_METHODS[0], soilType: 'Clay Loam',
    fieldSize: '', fieldSizeUnit: 'acres', growthStage: 'sowing',
    ph: '', nitrogen: '', phosphorus: '', potassium: '',
    currentFertilizer: '', pastFertilizer: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.fieldSize || parseFloat(form.fieldSize) <= 0) { setError('Enter this field\'s size.'); return }
    setSaving(true)
    try {
      const payload = {
        cropType: form.cropType, plantingMethod: form.plantingMethod, soilType: form.soilType,
        fieldSize: parseFloat(form.fieldSize), fieldSizeUnit: form.fieldSizeUnit, growthStage: form.growthStage,
        currentFertilizer: form.currentFertilizer, pastFertilizer: form.pastFertilizer,
      }
      if (form.ph !== '') payload.ph = parseFloat(form.ph)
      if (form.nitrogen !== '') payload.nitrogen = parseFloat(form.nitrogen)
      if (form.phosphorus !== '') payload.phosphorus = parseFloat(form.phosphorus)
      if (form.potassium !== '') payload.potassium = parseFloat(form.potassium)

      const res = await fetch(`${API_BASE}/api/users/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Could not save this field.')
      const data = await res.json()
      const newField = data.fields[data.fields.length - 1]
      onSaved(newField)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#1d1c0d]/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#fefae0] rounded-[2rem] p-8 md:p-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline text-2xl font-bold text-[#173809]">Add Another Field</h2>
          <button onClick={onClose} className="text-[#173809]/40 hover:text-[#173809]">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="text-sm text-[#43493e] mb-6">Each field gets its own soil test and independent fertilizer plan — a farmer growing rice on one plot and cotton on another shouldn't get one blended recommendation.</p>

        {error && <div className="bg-[#9f402d]/10 border border-[#9f402d]/20 text-[#9f402d] px-4 py-3 rounded-xl text-sm font-bold mb-5">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#173809]/50 mb-2">Crop</label>
              <select value={form.cropType} onChange={e => set('cropType', e.target.value)} className="w-full bg-white border border-[#173809]/10 rounded-xl px-4 py-3 text-sm font-bold text-[#173809]">
                {CROP_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#173809]/50 mb-2">Planting Method</label>
              <select value={form.plantingMethod} onChange={e => set('plantingMethod', e.target.value)} className="w-full bg-white border border-[#173809]/10 rounded-xl px-4 py-3 text-sm font-bold text-[#173809]">
                {PLANTING_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#173809]/50 mb-2">Soil Type</label>
              <select value={form.soilType} onChange={e => set('soilType', e.target.value)} className="w-full bg-white border border-[#173809]/10 rounded-xl px-4 py-3 text-sm font-bold text-[#173809]">
                {['Clay Loam', 'Sandy Loam', 'Silt Loam', 'Sandy', 'Loamy', 'Clay'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#173809]/50 mb-2">Field Size</label>
              <div className="flex gap-2">
                <input type="number" min="0" step="0.1" value={form.fieldSize} onChange={e => set('fieldSize', e.target.value)} placeholder="e.g. 2"
                  className="w-full min-w-0 bg-white border border-[#173809]/10 rounded-xl px-3 py-3 text-sm font-bold text-[#173809]" />
                <select value={form.fieldSizeUnit} onChange={e => set('fieldSizeUnit', e.target.value)} className="bg-white border border-[#173809]/10 rounded-xl px-2 text-xs font-bold text-[#173809] shrink-0">
                  <option value="acres">acres</option>
                  <option value="hectares">ha</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#173809]/50 mb-2">Growth Stage</label>
              <select value={form.growthStage} onChange={e => set('growthStage', e.target.value)} className="w-full bg-white border border-[#173809]/10 rounded-xl px-4 py-3 text-sm font-bold text-[#173809]">
                {GROWTH_STAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-[#173809]/10">
            <h3 className="font-headline text-base font-bold text-[#173809] mb-1">Soil Test <span className="font-body font-normal text-xs text-[#43493e]/60">(optional)</span></h3>
            <p className="text-xs text-[#43493e]/70 mb-3">Leave blank to use a regional estimate until you add a real test.</p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { key: 'ph', label: 'pH' }, { key: 'nitrogen', label: 'N (ppm)' },
                { key: 'phosphorus', label: 'P (ppm)' }, { key: 'potassium', label: 'K (ppm)' },
              ].map(({ key, label }) => {
                const flagKey = key === 'ph' ? 'pH' : key === 'nitrogen' ? 'N' : key === 'phosphorus' ? 'P' : 'K'
                const unusual = isUnusual(flagKey, parseFloat(form[key]))
                return (
                  <div key={key}>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#173809]/50 mb-2">{label}</label>
                    <input
                      type="number" step="any" value={form[key]} onChange={e => set(key, e.target.value)}
                      className={`w-full bg-white border rounded-xl px-3 py-3 text-sm font-bold text-[#173809] ${unusual ? 'border-[#9f402d]/50' : 'border-[#173809]/10'}`}
                    />
                    {unusual && <p className="text-[9px] text-[#9f402d] font-bold mt-1">Unusual — double-check</p>}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#173809]/50 mb-2">Currently Applying</label>
              <input type="text" value={form.currentFertilizer} onChange={e => set('currentFertilizer', e.target.value)} placeholder="e.g. Urea only"
                className="w-full bg-white border border-[#173809]/10 rounded-xl px-4 py-3 text-sm text-[#173809]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#173809]/50 mb-2">Used Previously</label>
              <input type="text" value={form.pastFertilizer} onChange={e => set('pastFertilizer', e.target.value)} placeholder="e.g. DAP last season"
                className="w-full bg-white border border-[#173809]/10 rounded-xl px-4 py-3 text-sm text-[#173809]" />
            </div>
          </div>

          <button type="submit" disabled={saving} className="w-full bg-[#173809] text-white rounded-full py-4 font-headline text-base font-bold hover:bg-[#2d4f1e] active:scale-[0.98] transition-all disabled:opacity-50 mt-2">
            {saving ? 'Adding Field…' : 'Add Field'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function FertilizerHubPage() {
  const { token, user, refreshUser } = useAuth()
  const [activeFieldId, setActiveFieldId] = useState(null) // null = primary field
  const [precision, setPrecision] = useState(null)
  const [isLoadingPrecision, setIsLoadingPrecision] = useState(true)
  const [cost, setCost] = useState(null)
  const [history, setHistory] = useState([])
  const [showAddField, setShowAddField] = useState(false)
  const [encyclopedia, setEncyclopedia] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cached_fert_encyc')) || [] } catch { return [] }
  })
  const [isLoadingEncyc, setIsLoadingEncyc] = useState(encyclopedia.length === 0)

  const extraFields = user?.fields || []
  const fieldTabs = [
    { id: null, label: user?.soil_data?.cropType || 'Primary Field' },
    ...extraFields.map(f => ({ id: f.id, label: f.cropType })),
  ]

  useEffect(() => {
    if (!token) return
    setIsLoadingPrecision(true)
    const fieldQuery = activeFieldId ? `?field_id=${activeFieldId}` : ''
    fetch(`${API_BASE}/api/engine/precision-recommendation${fieldQuery}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') setPrecision(data)
        else setPrecision(null)
        setIsLoadingPrecision(false)
      })
      .catch(() => setIsLoadingPrecision(false))

    fetch(`${API_BASE}/api/engine/sustainability-impact${fieldQuery}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { if (data.status === 'success') setCost(data.impact.cost) })
      .catch(() => {})
  }, [token, activeFieldId])

  useEffect(() => {
    if (!token) return
    // Unfiltered — the history section is a whole-farm overview, so it spans
    // every field, not just whichever one is currently active above.
    fetch(`${API_BASE}/api/engine/recommendation-history?limit=10`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { if (data.status === 'success') setHistory(data.history || []) })
      .catch(() => {})

    setIsLoadingEncyc(encyclopedia.length === 0)
    fetch(`${API_BASE}/api/engine/fertilizer-encyclopedia`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setEncyclopedia(data.data || [])
        setIsLoadingEncyc(false)
        try { localStorage.setItem('cached_fert_encyc', JSON.stringify(data.data || [])) } catch {}
      })
      .catch(() => setIsLoadingEncyc(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeFieldId])

  const excessCount = history.reduce((n, run) => n + Object.values(run.nutrients || {}).filter(d => d.status === 'excess').length, 0)

  return (
    <div className="bg-[#fefae0] text-[#1d1c0d] overflow-x-hidden min-h-screen flex flex-col">
      <Navbar activeLink="fertilizers" />

      {showAddField && (
        <AddFieldModal
          token={token}
          onClose={() => setShowAddField(false)}
          onSaved={async (newField) => {
            await refreshUser()
            setShowAddField(false)
            setActiveFieldId(newField.id)
          }}
        />
      )}

      <main className="flex-grow pt-32 pb-24 px-4 md:px-12 max-w-[1920px] mx-auto w-full">

        {/* ── Header + Field Switcher ── */}
        <header className="mb-12 max-w-7xl mx-auto">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <span className="font-label uppercase tracking-[0.3em] text-[#9f402d] text-sm font-bold mb-4 block">Made For Your Fields</span>
              <h1 className="font-headline text-3xl sm:text-4xl md:text-6xl font-bold text-[#173809] tracking-tighter leading-none">Fertilizer Dashboard</h1>
            </div>
            <a
              href={FERTILIZER_METHODS_HELP_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white border border-[#173809]/15 text-[#173809] px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#173809]/5 transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">help</span>
              Get Hands-On Help Nearby
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {fieldTabs.map(tab => (
              <button
                key={tab.id || 'primary'}
                onClick={() => setActiveFieldId(tab.id)}
                className={`px-5 py-2.5 rounded-full text-sm font-bold capitalize transition-colors ${
                  activeFieldId === tab.id ? 'bg-[#173809] text-white' : 'bg-white text-[#173809]/60 border border-[#173809]/10 hover:text-[#173809]'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <button
              onClick={() => setShowAddField(true)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold text-[#9f402d] border border-dashed border-[#9f402d]/40 hover:bg-[#9f402d]/5 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add Field
            </button>
          </div>
        </header>

        {/* ── Fertilizer History — the main, whole-farm overview ── */}
        <section className="mb-16 max-w-7xl mx-auto">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="font-headline text-2xl md:text-3xl font-bold text-[#173809] tracking-tight">Fertilizer History</h2>
              <p className="text-[#173809]/50 text-sm mt-1">Every recommendation across every field, most recent first.</p>
            </div>
            {history.length > 0 && (
              <div className="flex gap-3">
                <div className="bg-white border border-[#173809]/8 rounded-2xl px-5 py-3 text-center">
                  <p className="font-headline text-2xl font-bold text-[#173809]">{history.length}</p>
                  <p className="text-[9px] uppercase tracking-widest text-[#173809]/40 font-bold">Runs Logged</p>
                </div>
                <div className={`border rounded-2xl px-5 py-3 text-center ${excessCount > 0 ? 'bg-[#b8862e]/8 border-[#b8862e]/20' : 'bg-white border-[#173809]/8'}`}>
                  <p className={`font-headline text-2xl font-bold ${excessCount > 0 ? 'text-[#8a641c]' : 'text-[#173809]'}`}>{excessCount}</p>
                  <p className={`text-[9px] uppercase tracking-widest font-bold ${excessCount > 0 ? 'text-[#8a641c]/70' : 'text-[#173809]/40'}`}>Times Over-Supplied</p>
                </div>
              </div>
            )}
          </div>

          {history.length === 0 ? (
            <div className="bg-white rounded-[2rem] border border-[#173809]/8 p-10 text-center text-[#173809]/50 text-sm">
              No recommendations yet — run one below to start building your field's history.
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] border border-[#173809]/8 divide-y divide-[#173809]/6 overflow-hidden">
              {history.map((run) => {
                const date = run.created_at ? new Date(run.created_at * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
                return (
                  <div key={run.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 px-6 py-4">
                    <span className="text-xs font-bold text-[#173809]/40 uppercase tracking-widest w-28 shrink-0">{date}</span>
                    <span className="text-sm font-bold text-[#173809] w-32 shrink-0 capitalize">{run.crop_type}</span>
                    <div className="flex gap-2 shrink-0">
                      {Object.entries(run.nutrients || {}).map(([label, d]) => {
                        const meta = NUTRIENT_META[label]
                        const dotColor = d.status === 'deficient' ? '#9f402d' : d.status === 'excess' ? '#b8862e' : '#173809'
                        const statusText = d.status === 'deficient' ? 'Deficient' : d.status === 'excess' ? 'Over-supplied' : 'Sufficient'
                        return (
                          <div key={label} className="relative group/dot">
                            <span
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 cursor-default"
                              style={{ backgroundColor: dotColor }}
                            >
                              {meta.short}
                            </span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/dot:block z-20 w-max max-w-[220px]">
                              <div className="bg-[#1d1c0d] text-white text-xs rounded-xl px-3 py-2 shadow-xl">
                                <p className="font-bold capitalize mb-0.5">{label} on {date}</p>
                                <p className="text-white/70">{d.available_kg_ha} kg/ha inserted · target {d.target_kg_ha} kg/ha</p>
                                <p className="font-bold mt-0.5" style={{ color: dotColor === '#173809' ? '#c5efad' : dotColor }}>{statusText}</p>
                              </div>
                              <div className="w-2 h-2 bg-[#1d1c0d] rotate-45 mx-auto -mt-1" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-sm text-[#43493e] flex-grow min-w-0 truncate">{run.headline}</p>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Fertilizers Needed — the active field's plan, one unified panel ── */}
        <section className="mb-24 max-w-7xl mx-auto">
          <header className="mb-6">
            <h2 className="font-headline text-2xl md:text-3xl font-bold text-[#173809] tracking-tight">Fertilizers Needed</h2>
            <p className="text-[#173809]/50 text-sm mt-1">For the field selected above.</p>
          </header>

          {isLoadingPrecision ? (
            <div className="animate-pulse bg-[#e7e3ca] h-96 rounded-[2.5rem] w-full" />
          ) : !precision ? (
            <div className="bg-white rounded-[2.5rem] p-10 border border-[#173809]/8 text-[#173809]/50">
              Add a soil test for this field to generate a precision plan.
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-[#173809]/8 shadow-sm">
              {/* Summary strip */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-8 mb-8 border-b border-[#173809]/8">
                <div className="max-w-2xl">
                  <span className="text-xs font-bold text-[#9f402d] uppercase tracking-widest">{precision.dose.crop_type} · {precision.dose.field_size} {precision.dose.field_size_unit}</span>
                  <h3 className="text-2xl font-headline font-bold text-[#173809] mt-2 mb-3 leading-tight">{precision.ai.headline}</h3>
                  <p className="text-[#43493e] text-sm leading-relaxed">{precision.ai.explanation}</p>
                </div>
                <div className="flex gap-4 shrink-0">
                  {precision.dose.weather.rain_forecast_mm_5d !== null && (
                    <div className="text-center">
                      <span className="material-symbols-outlined text-[#173809]/40">rainy</span>
                      <p className="text-xs font-bold text-[#173809] mt-1">{precision.dose.weather.rain_forecast_mm_5d}mm/5d</p>
                    </div>
                  )}
                  {precision.dose.weather.avg_temp_c !== null && (
                    <div className="text-center">
                      <span className="material-symbols-outlined text-[#173809]/40">thermostat</span>
                      <p className="text-xs font-bold text-[#173809] mt-1">{precision.dose.weather.avg_temp_c}°C</p>
                    </div>
                  )}
                  {cost && (
                    <div className="text-center">
                      <span className="material-symbols-outlined text-[#173809]/40">payments</span>
                      <p className="text-xs font-bold text-[#173809] mt-1">₹{cost.recommended_inr.toLocaleString('en-IN')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Nutrient cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {Object.entries(precision.dose.nutrients).map(([label, data]) => {
                  const meta = NUTRIENT_META[label]
                  const status = data.status || (data.product_kg_total > 0 ? 'deficient' : 'sufficient')
                  const barMax = Math.max(data.target_kg_ha, data.available_kg_ha, 1)
                  const availablePct = Math.min(100, (data.available_kg_ha / barMax) * 100)
                  const targetPct = Math.min(100, (data.target_kg_ha / barMax) * 100)
                  const bagSize = BAG_SIZE_KG[data.product]
                  const bagCount = bagSize && data.product_kg_total > 0 ? Math.ceil(data.product_kg_total / bagSize) : null
                  const barColor = status === 'deficient' ? '#9f402d' : status === 'excess' ? '#b8862e' : '#173809'

                  return (
                    <div key={label} className={`rounded-2xl border p-5 ${status === 'excess' ? 'border-[#b8862e]/30 bg-[#b8862e]/5' : 'border-[#173809]/8'}`}>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="relative group/badge">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base shrink-0 cursor-default" style={{ backgroundColor: `${meta.color}14`, color: meta.color }}>
                            {meta.short}
                          </div>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/badge:block z-20 w-max max-w-[220px]">
                            <div className="bg-[#1d1c0d] text-white text-xs rounded-xl px-3 py-2 shadow-xl">
                              <p className="font-bold capitalize mb-0.5">{label} today</p>
                              <p className="text-white/70">{data.available_kg_ha} kg/ha inserted · target {data.target_kg_ha} kg/ha</p>
                            </div>
                            <div className="w-2 h-2 bg-[#1d1c0d] rotate-45 mx-auto -mt-1" />
                          </div>
                        </div>
                        <div className="flex-grow min-w-0">
                          <span className="font-bold text-[#173809] capitalize block">{label}</span>
                          <span className="text-[11px] text-[#173809]/40">{data.available_kg_ha} of {data.target_kg_ha} kg/ha target</span>
                        </div>
                      </div>
                      <StatusBadge status={status} />
                      <div className="relative h-2.5 bg-[#173809]/8 rounded-full my-3">
                        <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-500" style={{ width: `${availablePct}%`, backgroundColor: barColor }} />
                        <div className="absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-[#1d1c0d]/50 rounded-full" style={{ left: `calc(${targetPct}% - 2px)` }} title={`Target: ${data.target_kg_ha} kg/ha`} />
                      </div>
                      {status === 'deficient' ? (
                        <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#173809]/6 text-sm">
                          <span className="text-[#43493e]">
                            <span className="font-bold text-[#173809]">{data.product_kg_total} kg</span> {data.product}
                            {bagCount && <span className="text-[#173809]/40"> · ~{bagCount} bag{bagCount > 1 ? 's' : ''}</span>}
                          </span>
                          {data.cost_inr > 0 && <span className="font-bold text-[#173809] shrink-0">₹{data.cost_inr.toLocaleString('en-IN')}</span>}
                        </div>
                      ) : status === 'excess' ? (
                        <p className="text-xs text-[#8a641c] font-medium pt-3 border-t border-[#b8862e]/20">{data.surplus_kg_ha} kg/ha more than needed — stop applying.</p>
                      ) : (
                        <p className="text-xs text-[#173809]/50 pt-3 border-t border-[#173809]/6">No application needed</p>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Notes */}
              <div className="space-y-3">
                {precision.ai?.current_practice_note && (
                  <div className="flex gap-3 bg-[#173809]/5 rounded-xl p-4 text-sm text-[#173809]">
                    <span className="material-symbols-outlined text-[18px] shrink-0">compare_arrows</span>
                    {precision.ai.current_practice_note}
                  </div>
                )}
                {precision.ai?.trend_note && (
                  <div className="flex gap-3 bg-[#b8862e]/8 rounded-xl p-4 text-sm text-[#8a641c]">
                    <span className="material-symbols-outlined text-[18px] shrink-0">trending_up</span>
                    {precision.ai.trend_note}
                  </div>
                )}
                {precision.dose.notes.map((note, i) => (
                  <div key={i} className="flex gap-3 bg-[#ffdad3]/40 rounded-xl p-4 text-sm text-[#802918]">
                    <span className="material-symbols-outlined text-[18px] shrink-0">warning</span>
                    {note}
                  </div>
                ))}
                <div className="flex gap-3 bg-[#f8f4db] rounded-xl p-4 text-xs text-[#173809]/50">
                  <span className="material-symbols-outlined text-[16px] shrink-0">receipt_long</span>
                  Priced at India's NBS Kharif 2026 notified MRP for Urea, DAP &amp; MOP — government rates change seasonally.
                </div>
              </div>

              {precision.dose.application_plan.length > 1 && (
                <div className="mt-6 pt-6 border-t border-[#173809]/6">
                  <p className="text-[10px] uppercase tracking-widest text-[#173809]/40 font-bold mb-3">When to Apply</p>
                  <div className="flex gap-3">
                    {precision.dose.application_plan.map((stage, i) => (
                      <div key={i} className="flex-1 bg-[#f8f4db] rounded-xl p-4 text-center">
                        <p className="text-2xl font-headline font-bold text-[#173809]">{stage.pct_of_nitrogen}%</p>
                        <p className="text-xs text-[#173809]/50 mt-1">{stage.stage}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="w-full h-px bg-[#173809]/10 my-20 max-w-7xl mx-auto" />

        {/* ── Fertilizer Encyclopedia ── */}
        <section className="max-w-7xl mx-auto mb-20">
          <header className="mb-12">
            <span className="font-label uppercase tracking-[0.3em] text-[#173809]/40 text-sm font-bold mb-2 block">Learn More</span>
            <h2 className="font-headline text-4xl md:text-5xl font-bold text-[#173809] tracking-tighter">Fertilizer Guide</h2>
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {isLoadingEncyc ? [1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="animate-pulse bg-[#f8f4db] h-64 rounded-3xl" />
            )) : encyclopedia.map((item) => (
              <div key={item.id} className="bg-[#f8f4db] rounded-3xl p-6 border border-[#173809]/5 hover:bg-white hover:shadow-xl transition-all duration-300 group flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                  <span className="material-symbols-outlined text-[#173809]/20 group-hover:text-[#9f402d] transition-colors">science</span>
                  <span className={`text-[9px] uppercase font-bold tracking-widest px-2 py-1 rounded-full ${item.type === 'Organic' ? 'bg-[#c5efad] text-[#173809]' : 'bg-[#e7e3ca] text-[#173809]/60'}`}>{item.type}</span>
                </div>
                <h4 className="font-headline font-bold text-xl text-[#173809] mb-1">{item.name}</h4>
                <p className="font-mono text-[#9f402d] font-bold tracking-widest mb-4">{item.npk}</p>
                <p className="text-sm text-[#43493e] leading-relaxed mb-6 flex-grow">{item.description}</p>
                <div className="mt-auto pt-4 border-t border-[#173809]/10">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-[#173809]/40 mb-1">Ideal For</p>
                  <p className="text-sm font-medium text-[#173809] truncate">{item.bestFor}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="w-full h-px bg-[#173809]/10 my-20 max-w-7xl mx-auto" />

        {/* ── Soil Types Encyclopedia ── */}
        <section className="max-w-7xl mx-auto">
          <header className="mb-12">
            <span className="font-label uppercase tracking-[0.3em] text-[#173809]/40 text-sm font-bold mb-2 block">Soil Guide</span>
            <h2 className="font-headline text-4xl md:text-5xl font-bold text-[#173809] tracking-tighter">Soil Types Explained</h2>
            <p className="text-[#173809]/50 text-base mt-3 max-w-2xl leading-relaxed">
              Knowing your soil type helps explain why it needs a different fertilizer plan than your neighbor's field.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SOIL_TYPES_DB.map((soil) => {
              const fertilityColor = {
                'Low': '#9f402d', 'Low (Raw)': '#9f402d', 'Low-Moderate': '#9f402d',
                'Moderate': '#173809', 'High': '#173809', 'Very High': '#173809',
              }[soil.fertility] || '#173809'

              return (
                <div key={soil.id} className="bg-white rounded-3xl border border-[#173809]/8 hover:shadow-xl transition-all duration-300 group overflow-hidden flex flex-col">
                  {/* Header strip */}
                  <div className="bg-[#fafaf8] px-6 pt-6 pb-5 border-b border-[#173809]/6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-[#e7e3ca]/60 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#173809]/50 text-xl">{soil.icon}</span>
                      </div>
                      <span
                        className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full"
                        style={{ backgroundColor: `${fertilityColor}14`, color: fertilityColor }}
                      >
                        {soil.fertility} Fertility
                      </span>
                    </div>
                    <h4 className="font-headline font-bold text-xl text-[#173809]">{soil.name}</h4>
                    <p className="text-xs text-[#173809]/40 font-medium mt-0.5">{soil.texture} · {soil.draining} drainage</p>
                  </div>

                  {/* Body */}
                  <div className="px-6 py-5 flex flex-col flex-grow">
                    <p className="text-sm text-[#43493e] leading-relaxed mb-5 flex-grow">{soil.description}</p>

                    <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[#173809]/6">
                      <span className="material-symbols-outlined text-[#173809]/30 text-[15px]">science</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#173809]/30">pH Range</span>
                      <span className="ml-auto font-mono font-bold text-sm text-[#173809]">{soil.phRange}</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-[9px] uppercase tracking-widest font-bold text-[#173809]/30 mb-1">Best Crops</p>
                        <p className="text-xs font-semibold text-[#173809]/70 leading-relaxed">{soil.bestCrops}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-widest font-bold text-[#173809]/30 mb-1">Recommended Amendment</p>
                        <p className="text-xs font-semibold text-[#173809]/70 leading-relaxed">{soil.amendment}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

      </main>

      <Footer />
    </div>
  )
}
