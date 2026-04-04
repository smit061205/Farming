import API_BASE from "../api.js"
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import FieldMap from '../components/FieldMap'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const [insights, setInsights] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cached_insights')) || {} } catch { return {} }
  })
  const [telemetry, setTelemetry] = useState(null)

  // Read the last analysis the user submitted from InputPage
  const lastAnalysis = (() => {
    try { return JSON.parse(localStorage.getItem('last_analysis')) } catch { return null }
  })()

  useEffect(() => {
    if (!token) return
    // Build URL with latest analysis params so AI uses the most recent soil data
    const la = (() => { try { return JSON.parse(localStorage.getItem('last_analysis')) } catch { return null } })()
    const params = la
      ? `?n=${la.N}&p=${la.P}&k=${la.K}&ph=${la.pH}&crop_type=${encodeURIComponent(la.cropType || '')}&soil_type=${encodeURIComponent(la.soilType || '')}`
      : ''
    fetch(`${API_BASE}/api/engine/insights${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setInsights(data)
        // Cache so next visit is instant
        try { localStorage.setItem('cached_insights', JSON.stringify(data)) } catch {}
      })
      .catch(err => console.error('Could not fetch insights:', err))
  }, [token])

  const refreshInsights = async () => {
    setInsights({})
    try {
      await fetch(`${API_BASE}/api/engine/cache`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch {}
    const la = (() => { try { return JSON.parse(localStorage.getItem('last_analysis')) } catch { return null } })()
    const params = la
      ? `?n=${la.N}&p=${la.P}&k=${la.K}&ph=${la.pH}&crop_type=${encodeURIComponent(la.cropType || '')}&soil_type=${encodeURIComponent(la.soilType || '')}`
      : ''
    try { localStorage.removeItem('cached_insights') } catch {}
    fetch(`${API_BASE}/api/engine/insights${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setInsights(data)
        try { localStorage.setItem('cached_insights', JSON.stringify(data)) } catch {}
      })
      .catch(err => console.error('Could not refresh insights:', err))
  }

  useEffect(() => {
    const lat = user?.coordinates?.lat
    const lng = user?.coordinates?.lng
    if (!lat || !lng) return
    fetch(`${API_BASE}/api/engine/fetch-telemetry?lat=${lat}&lng=${lng}`)
      .then(res => res.json())
      .then(data => { if (data.status === 'success') setTelemetry(data.data) })
      .catch(() => {})
  }, [user?.coordinates?.lat, user?.coordinates?.lng])



  const soilPh = lastAnalysis?.pH ?? user?.soil_data?.ph
  const soilN = lastAnalysis?.N ?? user?.soil_data?.nitrogen
  // Read P and K from last analysis, then profile (now stored from Phase 3), then derive
  const soilP = lastAnalysis?.P
    ?? user?.soil_data?.phosphorus
    ?? (soilN ? Math.round(50 + (parseFloat(soilPh || 7) - 7) * 10) : null)
  const soilK = lastAnalysis?.K
    ?? user?.soil_data?.potassium
    ?? (soilN ? Math.round(200 + (parseFloat(soilPh || 7) - 7) * 30) : null)
  const soilType = lastAnalysis?.soilType ?? user?.soil_data?.soil_type ?? null
  const hasAnalysis = !!lastAnalysis
  const dataSource = hasAnalysis
    ? lastAnalysis.cropType ? `${lastAnalysis.cropType} · ${lastAnalysis.soilType}` : 'Analyzed Values'
    : user?.soil_data?.data_source === 'ocr' ? 'OCR Lab Report' : 'Profile Baseline'
  const coords = user?.coordinates


  const phScore = soilPh ? Math.max(0, Math.min(100, Math.round(100 - Math.abs(parseFloat(soilPh) - 6.5) * 20))) : null
  const nScore = soilN ? Math.max(0, Math.min(100, Math.round((parseFloat(soilN) / 500) * 100))) : null
  const healthScore = phScore && nScore ? Math.round((phScore + nScore) / 2) : phScore || nScore || 72
  const healthLabel = healthScore >= 80 ? 'Optimal' : healthScore >= 60 ? 'Moderate' : 'Needs Attention'
  const healthColor = healthScore >= 80 ? '#c5efad' : healthScore >= 60 ? '#fb9f54' : '#9f402d'

  return (
    <div className="bg-[#fefae0] text-[#1d1c0d]">
      <Navbar activeLink="dashboard" />

      <main className="pt-32 pb-20 px-8 md:px-12 max-w-[1920px] mx-auto">

        {/* Header */}
        <header className="mb-12 grid grid-cols-12 gap-8 items-end">
          <div className="col-span-12 lg:col-span-7">
            <p className="font-headline font-bold text-[#9f402d] uppercase tracking-[0.2em] mb-4">Field Journal No. 42</p>
            <h1 className="font-headline text-7xl md:text-8xl font-bold text-[#173809] tracking-tighter leading-none mb-8">
              The Digital <br />
              <span className="italic font-light">Agrarian</span>
            </h1>
            <p className="text-xl text-[#43493e] max-w-xl leading-relaxed">
              Analyzing subsurface nitrogen cycles and satellite vegetation indices to optimize the upcoming harvest cycle. Your terroir is speaking; we are translating.
            </p>
          </div>
          <div className="col-span-12 lg:col-span-4 lg:col-start-9 relative">
            <div className="rounded-[2rem] overflow-hidden relative" style={{ boxShadow: '0 20px 40px rgba(29,28,13,0.06)', height: '220px', isolation: 'isolate' }}>
              <FieldMap coordinates={coords} zoom={12} height="100%" showLabel={true} />
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-[#173809]/80 backdrop-blur-sm px-3 py-1.5 rounded-full" style={{ zIndex: 400 }}>
                <div className="w-2 h-2 rounded-full bg-[#c5efad]" style={{ boxShadow: '0 0 8px 2px rgba(197,239,173,0.8)' }}></div>
                <span className="font-headline font-bold text-white uppercase tracking-widest text-[10px]">Field Locked</span>
              </div>
            </div>
          </div>
        </header>

        {/* Live Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            {
              icon: 'science', label: 'Soil pH',
              value: soilPh != null ? parseFloat(soilPh).toFixed(1) : '—',
              sub: soilPh != null ? (parseFloat(soilPh) < 6 ? 'Acidic' : parseFloat(soilPh) > 7.5 ? 'Alkaline' : 'Neutral') : 'No Data',
              color: '#173809', light: '#c5efad'
            },
            {
              icon: 'water_drop', label: 'Soil Moisture',
              value: telemetry?.moisture != null ? `${telemetry.moisture}%` : '—',
              sub: telemetry?.moisture != null ? (telemetry.moisture < 20 ? 'Low — Irrigate' : telemetry.moisture > 60 ? 'Waterlogged' : 'Optimal') : 'Sync Required',
              color: '#1a4a7a', light: '#a8d4f5'
            },
            {
              icon: 'thermostat', label: 'Surface Temp',
              value: telemetry?.temperature != null ? `${telemetry.temperature}°C` : '—',
              sub: telemetry?.temperature != null ? (telemetry.temperature > 35 ? 'Heat Stress Risk' : 'Normal Range') : 'Sync Required',
              color: '#7a2a1a', light: '#f5b8a8'
            },
            {
              icon: 'grass', label: 'Soil Health',
              value: healthScore,
              sub: healthLabel,
              color: healthScore >= 80 ? '#173809' : healthScore >= 60 ? '#7a4a00' : '#7a2a1a',
              light: healthColor
            }
          ].map(({ icon, label, value, sub, color, light }) => (
            <div key={label} className="rounded-[1.5rem] p-6 relative overflow-hidden" style={{ backgroundColor: color, boxShadow: '0 10px 30px rgba(29,28,13,0.1)' }}>
              <div className="absolute -bottom-4 -right-4 opacity-10">
                <span className="material-symbols-outlined text-[6rem] text-white">{icon}</span>
              </div>
              <span className="material-symbols-outlined text-2xl mb-3 block" style={{ color: light }}>{icon}</span>
              <p className="font-label text-xs uppercase tracking-widest text-white/50 mb-1">{label}</p>
              <p className="font-headline font-black text-3xl text-white mb-1">{value}</p>
              <p className="font-label text-xs font-bold" style={{ color: light }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* NPK Panel */}
        {(soilN || soilPh) && (
          <div className="bg-[#173809] rounded-[2rem] p-8 mb-12 relative overflow-hidden" style={{ boxShadow: '0 20px 40px rgba(29,28,13,0.12)' }}>
            <div className="absolute -top-12 -right-12 opacity-5 font-headline text-[16rem] leading-none pointer-events-none select-none text-white">N</div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
              <div>
                <p className="font-label text-xs uppercase tracking-widest text-[#c5efad]/60 mb-1">
                  Soil Chemistry Baseline
                  <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: hasAnalysis ? 'rgba(197,239,173,0.2)' : 'rgba(255,255,255,0.1)' }}>
                    {dataSource}
                  </span>
                </p>
                <h3 className="font-headline text-2xl font-bold text-white">Nutrient Profile</h3>
              </div>
              <button onClick={() => navigate('/input')} className="bg-[#c5efad] text-[#173809] px-6 py-2.5 rounded-full font-label text-xs uppercase tracking-widest font-bold hover:bg-white transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">edit</span>
                {hasAnalysis ? 'Run New Analysis' : 'Analyze Field'}
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8 relative z-10">
              {[
                { label: 'Nitrogen (N)', value: soilN != null ? `${soilN} ppm` : '—' },
                { label: 'Phosphorus (P)', value: soilP != null ? `${soilP} ppm` : '—' },
                { label: 'Potassium (K)', value: soilK != null ? `${soilK} ppm` : '—' },
                { label: 'pH Level', value: soilPh != null ? parseFloat(soilPh).toFixed(1) : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/5 rounded-[1rem] p-5">
                  <p className="font-label text-[10px] uppercase tracking-widest text-[#c5efad]/50 mb-2">{label}</p>
                  <p className="font-headline font-black text-2xl text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Crop Recommendations — full width */}
        <section className="mb-12">
          <div className="mb-10 flex justify-between items-center">
            <h2 className="font-headline text-4xl font-bold text-[#173809] tracking-tight">AI Crop Recommendations</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={refreshInsights}
                className="px-5 py-3 border-2 border-[#173809] text-[#173809] rounded-full font-label text-xs uppercase tracking-widest font-bold hover:bg-[#173809] hover:text-white transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                Refresh AI
              </button>
              <button
                onClick={() => navigate('/input')}
                className="px-8 py-3 bg-[#173809] text-white rounded-full font-headline font-bold tracking-tight hover:opacity-90 transition-all"
                style={{ boxShadow: '0 20px 40px rgba(29,28,13,0.06)' }}
              >
                New Analysis
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {insights.cropCards?.map(({ tag, name, score, bg, reason }, i) => (
              <div
                key={i}
                className="group rounded-[2rem] p-8 hover:scale-[1.02] transition-transform duration-500 cursor-pointer flex flex-col"
                style={{ backgroundColor: bg || '#e7e3ca', boxShadow: '0 20px 40px rgba(29,28,13,0.06)' }}
              >
                {/* Crop icon + tag */}
                <div className="flex items-center justify-between mb-6">
                  <p className="font-headline font-bold text-[#9f402d] text-sm tracking-widest uppercase">{tag}</p>
                  <div className="w-10 h-10 rounded-full bg-[#173809]/8 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#173809] text-xl">grass</span>
                  </div>
                </div>

                {/* Crop name + score */}
                <h3 className="font-headline text-3xl font-bold text-[#173809] mb-2 capitalize">{name}</h3>
                <div className="flex items-end gap-2 mb-4">
                  <span className="text-5xl font-headline font-black text-[#173809]">{score}</span>
                  <span className="text-xl font-bold text-[#2d4f1e] pb-1">% Match</span>
                </div>
                <div className="h-1.5 bg-[#173809]/10 rounded-full overflow-hidden mb-6">
                  <div className="h-full bg-[#173809] rounded-full" style={{ width: `${score}%` }}></div>
                </div>

                {/* AI reason */}
                <div className="flex-1 border-t border-[#173809]/10 pt-5">
                  <p className="font-label text-[10px] uppercase tracking-widest text-[#173809]/40 mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[12px]">psychiatry</span>
                    Why this crop
                  </p>
                  <p className="text-[#43493e] text-sm leading-relaxed">
                    {reason || 'AI reasoning not available. Click Refresh AI to generate.'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom Row: 3 equal columns — no empty space */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Active Intelligence */}
          <div className="bg-[#f8f4db] rounded-[2rem] p-10 relative overflow-hidden" style={{ boxShadow: '0 20px 40px rgba(29,28,13,0.06)' }}>
            <div className="absolute top-4 right-4 opacity-10">
              <span className="material-symbols-outlined text-[#173809] text-[6rem]">memory</span>
            </div>
            <h3 className="font-headline text-2xl font-bold text-[#173809] mb-8 tracking-tight relative z-10">Active Intelligence</h3>
            <div className="space-y-6 relative z-10">
              {insights.activeIntelligence?.map(({ color, glow, title, desc, actionLabel }, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="mt-1.5 w-3 h-3 flex-shrink-0 rounded-full" style={{ backgroundColor: color, boxShadow: glow }}></div>
                  <div>
                    <h4 className="font-bold text-[#173809] text-base leading-tight mb-1">{title}</h4>
                    <p className="text-[#43493e] text-sm leading-relaxed">{desc}</p>
                    {actionLabel && (
                      <button onClick={() => navigate('/fertilizer')} className="mt-2 text-[#9f402d] text-xs font-bold uppercase tracking-widest hover:underline">
                        {actionLabel}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fertilizer Protocol */}
          {insights.fertilizerProtocol ? (
            <div className="bg-[#173809] rounded-[2rem] p-10 relative overflow-hidden" style={{ boxShadow: '0 20px 40px rgba(29,28,13,0.12)' }}>
              <div className="absolute -bottom-8 -right-8 opacity-10">
                <span className="material-symbols-outlined text-[10rem] text-white">agriculture</span>
              </div>
              <p className="font-label text-xs uppercase tracking-widest text-[#c5efad]/50 mb-2 relative z-10">Recommended Protocol</p>
              <h3 className="font-headline text-2xl font-bold text-white mb-1 relative z-10">{insights.fertilizerProtocol.formulaName}</h3>
              <p className="text-[#c5efad] font-headline font-black text-3xl mb-6 relative z-10">{insights.fertilizerProtocol.npk}</p>
              <div className="grid grid-cols-2 gap-3 relative z-10">
                {[
                  { label: 'Dosage', val: insights.fertilizerProtocol.dosage },
                  { label: 'Timing', val: insights.fertilizerProtocol.timing },
                  { label: 'Mode', val: insights.fertilizerProtocol.mode },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-white/10 rounded-xl p-4">
                    <p className="font-label text-[10px] uppercase tracking-widest text-[#c5efad]/50 mb-1">{label}</p>
                    <p className="font-bold text-white text-sm">{val}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate('/fertilizer')}
                className="mt-6 w-full bg-[#c5efad] text-[#173809] py-3 rounded-full font-label text-xs uppercase tracking-widest font-bold hover:bg-white transition-colors relative z-10"
              >
                View Full Protocol →
              </button>
            </div>
          ) : (
            <div className="bg-[#e7e3ca] rounded-[2rem] p-10 flex flex-col items-center justify-center text-center" style={{ boxShadow: '0 20px 40px rgba(29,28,13,0.06)' }}>
              <span className="material-symbols-outlined text-5xl text-[#9f402d] mb-4">science</span>
              <h3 className="font-headline text-xl font-bold text-[#173809] mb-2">No Protocol Yet</h3>
              <p className="text-[#43493e] text-sm mb-6">Run a soil analysis to generate your personalized fertilizer schedule.</p>
              <button onClick={() => navigate('/input')} className="bg-[#173809] text-white px-8 py-3 rounded-full font-label text-xs uppercase tracking-widest font-bold hover:opacity-90 transition-all">
                Analyze Now
              </button>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex flex-col gap-4">
            <button
              onClick={() => navigate('/soil-health')}
              className="flex-1 group bg-[#e7e3ca] rounded-[2rem] p-8 text-left hover:bg-[#2d4f1e] transition-all duration-300 relative overflow-hidden"
              style={{ boxShadow: '0 20px 40px rgba(29,28,13,0.06)' }}
            >
              <div className="absolute -bottom-4 -right-4 opacity-10">
                <span className="material-symbols-outlined text-[6rem] text-[#173809]">grass</span>
              </div>
              <span className="material-symbols-outlined text-3xl text-[#173809] group-hover:text-[#c5efad] mb-3 block relative z-10 transition-colors">monitoring</span>
              <h3 className="font-headline text-xl font-bold text-[#173809] group-hover:text-white mb-1 relative z-10 transition-colors">AI Soil Interpreter</h3>
              <p className="text-[#43493e] text-sm group-hover:text-white/70 mb-4 relative z-10 transition-colors">Deep geological soil analysis report.</p>
              <span className="font-label text-xs font-bold uppercase tracking-widest text-[#173809] group-hover:text-[#c5efad] flex items-center gap-2 relative z-10 transition-colors">
                View Report <span className="material-symbols-outlined text-base group-hover:translate-x-2 transition-transform">arrow_forward</span>
              </span>
            </button>

            <button
              onClick={() => navigate('/input')}
              className="flex-1 group bg-[#9f402d] rounded-[2rem] p-8 text-left hover:bg-[#c05030] transition-all duration-300 relative overflow-hidden"
              style={{ boxShadow: '0 20px 40px rgba(159,64,45,0.2)' }}
            >
              <div className="absolute -bottom-4 -right-4 opacity-10">
                <span className="material-symbols-outlined text-[6rem] text-white">satellite_alt</span>
              </div>
              <span className="material-symbols-outlined text-3xl text-white/80 mb-3 block relative z-10">satellite_alt</span>
              <h3 className="font-headline text-xl font-bold text-white mb-1 relative z-10">Sync Satellite Data</h3>
              <p className="text-white/70 text-sm mb-4 relative z-10">Fetch live moisture &amp; soil temperature.</p>
              <span className="font-label text-xs font-bold uppercase tracking-widest text-white/80 flex items-center gap-2 relative z-10 group-hover:text-white transition-colors">
                Go to Analyze <span className="material-symbols-outlined text-base group-hover:translate-x-2 transition-transform">arrow_forward</span>
              </span>
            </button>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
