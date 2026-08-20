import API_BASE from "../api.js"
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import FieldMap from '../components/FieldMap'
import { getDeviceLocation } from '../utils/geo'

const NUTRIENT_SHORT = { nitrogen: 'N', phosphorus: 'P', potassium: 'K' }

export default function DashboardPage() {
  const navigate = useNavigate()
  const { token, user, refreshUser } = useAuth()
  const [insights, setInsights] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cached_insights')) || {} } catch { return {} }
  })
  const [telemetry, setTelemetry] = useState(null)
  const [precision, setPrecision] = useState(null)
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState('')

  const handleEnableLocation = async () => {
    setIsLocating(true)
    setLocationError('')
    try {
      const loc = await getDeviceLocation()
      await fetch(`${API_BASE}/api/users/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ coordinates: loc }),
      })
      await refreshUser()
    } catch (err) {
      setLocationError(
        err.code === 1
          ? 'Location access denied — enable it in your browser settings, or pin it manually in your profile.'
          : 'Could not get your location. Please try again.'
      )
    } finally {
      setIsLocating(false)
    }
  }

  // Auto-attempt geolocation once per visit for any account with no saved
  // location — the farmer shouldn't have to find and click a button just
  // to unlock the satellite/weather data every other part of the page needs.
  const autoLocateAttempted = useRef(false)
  useEffect(() => {
    if (!user || autoLocateAttempted.current || user?.coordinates?.lat) return
    autoLocateAttempted.current = true
    handleEnableLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (!token) return
    // No query params — the backend reads the farmer's saved profile, the
    // same single source of truth every other page (Fertilizer Hub, the
    // precision plan below) already uses. A local-only override here was
    // letting this page show different numbers than the rest of the app
    // for the same account whenever Analyze Field hadn't been saved yet.
    fetch(`${API_BASE}/api/engine/insights`, {
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

  // The real fertilizer plan (type + quantity), same engine that powers the Fertilizer Hub —
  // keeps the Dashboard's summary card in sync with the authoritative recommendation.
  useEffect(() => {
    if (!token) return
    fetch(`${API_BASE}/api/engine/precision-recommendation`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (data.status === 'success') setPrecision(data) })
      .catch(err => console.error('Could not fetch precision recommendation:', err))
  }, [token])

  const refreshInsights = async () => {
    setInsights({})
    try {
      await fetch(`${API_BASE}/api/engine/cache`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch {}
    try { localStorage.removeItem('cached_insights') } catch {}
    fetch(`${API_BASE}/api/engine/insights`, {
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

  useEffect(() => {
    if (window.location.hash) {
      setTimeout(() => {
        const id = window.location.hash.replace('#', '')
        const element = document.getElementById(id)
        if (element) element.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [])



  const soilPh = user?.soil_data?.ph
  const soilN = user?.soil_data?.nitrogen
  const soilP = user?.soil_data?.phosphorus
    ?? (soilN ? Math.round(50 + (parseFloat(soilPh || 7) - 7) * 10) : null)
  const soilK = user?.soil_data?.potassium
    ?? (soilN ? Math.round(200 + (parseFloat(soilPh || 7) - 7) * 30) : null)
  const soilType = user?.soil_data?.soilType ?? null
  const cropType = user?.soil_data?.cropType ?? null
  const hasAnalysis = soilN != null
  const dataSource = hasAnalysis
    ? cropType ? [cropType, soilType].filter(Boolean).join(' · ') : 'Analyzed Values'
    : user?.soil_data?.data_source === 'ocr' ? 'OCR Lab Report' : 'Profile Baseline'
  const coords = user?.coordinates


  // The real score — same weighted pH/N/P/K formula the backend uses
  // everywhere else (sustainability impact, field diagnostics) — not a
  // separately-invented approximation. Honest '—' when it hasn't been
  // computed yet, never a made-up placeholder number.
  const healthScore = user?.soil_data?.overall_health_score ?? null
  const healthLabel = healthScore == null ? 'No Data' : healthScore >= 80 ? 'Optimal' : healthScore >= 60 ? 'Moderate' : 'Needs Attention'
  const healthColor = healthScore == null ? '#e7e3ca' : healthScore >= 80 ? '#c5efad' : healthScore >= 60 ? '#fb9f54' : '#9f402d'

  return (
    <div className="bg-[#fefae0] text-[#1d1c0d]">
      <Navbar activeLink="dashboard" />

      <main className="pt-32 pb-20 px-8 md:px-12 max-w-[1920px] mx-auto">

        {/* Header */}
        <header className="mb-12 grid grid-cols-12 gap-8 items-end">
          <div className="col-span-12 lg:col-span-7">
            <p className="font-headline font-bold text-[#9f402d] uppercase tracking-[0.2em] mb-4">Precision Dosing Console</p>
            <h1 className="font-headline text-4xl sm:text-6xl md:text-8xl font-bold text-[#173809] tracking-tighter leading-none mb-8">
              Know Exactly <br />
              <span className="italic font-light">What to Apply.</span>
            </h1>
            <p className="text-xl text-[#43493e] max-w-xl leading-relaxed">
              We read your soil chemistry and the coming week's weather to tell you the precise fertilizer type and quantity your field needs — no more, no less.
            </p>
          </div>
          <div className="col-span-12 lg:col-span-4 lg:col-start-9 relative">
            <div className="rounded-[2rem] overflow-hidden relative" style={{ boxShadow: '0 20px 40px rgba(29,28,13,0.06)', height: '220px', isolation: 'isolate' }}>
              <FieldMap coordinates={coords} zoom={12} height="100%" showLabel={true} hideEmptyOverlay={true} />
              {coords?.lat ? (
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-[#173809]/80 backdrop-blur-sm px-3 py-1.5 rounded-full" style={{ zIndex: 400 }}>
                  <div className="w-2 h-2 rounded-full bg-[#c5efad]" style={{ boxShadow: '0 0 8px 2px rgba(197,239,173,0.8)' }}></div>
                  <span className="font-headline font-bold text-white uppercase tracking-widest text-[10px]">Field Locked</span>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#173809]/70 backdrop-blur-sm px-6 text-center" style={{ zIndex: 400 }}>
                  <span className="material-symbols-outlined text-white text-3xl">location_off</span>
                  <p className="text-white/80 text-xs font-medium">No location set — satellite &amp; weather data need it</p>
                  <button
                    onClick={handleEnableLocation}
                    disabled={isLocating}
                    className="flex items-center gap-2 bg-[#c5efad] text-[#173809] text-xs font-label uppercase tracking-widest font-bold px-5 py-2.5 rounded-full hover:bg-white active:scale-95 transition-all disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {isLocating ? 'progress_activity' : 'my_location'}
                    </span>
                    {isLocating ? 'Locating…' : 'Enable My Location'}
                  </button>
                  {locationError && <p className="text-[#f5b8a8] text-[10px] max-w-[220px]">{locationError}</p>}
                </div>
              )}
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
              icon: 'grass', label: 'AgriSense Score',
              value: healthScore != null ? `${healthScore}%` : '—',
              sub: healthLabel,
              color: healthScore == null ? '#43493e' : healthScore >= 80 ? '#173809' : healthScore >= 60 ? '#7a4a00' : '#7a2a1a',
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
        <section id="ai-crop-recommendations" className="mb-12 scroll-m-[120px]">
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
                      <button onClick={() => navigate('/fertilizer-hub')} className="mt-2 text-[#9f402d] text-xs font-bold uppercase tracking-widest hover:underline">
                        {actionLabel}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fertilizer Plan — the real, computed dose (same engine as the Fertilizer Hub) */}
          {precision?.dose ? (
            <div className="bg-[#173809] rounded-[2rem] p-10 relative overflow-hidden" style={{ boxShadow: '0 20px 40px rgba(29,28,13,0.12)' }}>
              <div className="absolute -bottom-8 -right-8 opacity-10">
                <span className="material-symbols-outlined text-[10rem] text-white">agriculture</span>
              </div>
              <p className="font-label text-xs uppercase tracking-widest text-[#c5efad]/50 mb-2 relative z-10">Your Fertilizer Plan</p>
              <h3 className="font-headline text-2xl font-bold text-white mb-1 relative z-10">{precision.dose.crop_type}</h3>
              <p className="text-[#c5efad] text-sm font-medium mb-6 relative z-10 line-clamp-2">{precision.ai?.headline}</p>
              <div className="grid grid-cols-3 gap-3 relative z-10">
                {Object.entries(precision.dose.nutrients).map(([label, data]) => (
                  <div key={label} className="bg-white/10 rounded-xl p-4">
                    <p className="font-label text-[10px] uppercase tracking-widest text-[#c5efad]/50 mb-1">{NUTRIENT_SHORT[label] || label}</p>
                    <p className="font-bold text-white text-sm">{data.product_kg_total} kg</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate('/fertilizer-hub')}
                className="mt-6 w-full bg-[#c5efad] text-[#173809] py-3 rounded-full font-label text-xs uppercase tracking-widest font-bold hover:bg-white transition-colors relative z-10"
              >
                View Full Plan →
              </button>
            </div>
          ) : (
            <div className="bg-[#e7e3ca] rounded-[2rem] p-10 flex flex-col items-center justify-center text-center" style={{ boxShadow: '0 20px 40px rgba(29,28,13,0.06)' }}>
              <span className="material-symbols-outlined text-5xl text-[#9f402d] mb-4">science</span>
              <h3 className="font-headline text-xl font-bold text-[#173809] mb-2">No Plan Yet</h3>
              <p className="text-[#43493e] text-sm mb-6">Run a soil analysis to generate your personalized fertilizer plan.</p>
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
              onClick={() => navigate('/soil-health')}
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
                View Soil Health <span className="material-symbols-outlined text-base group-hover:translate-x-2 transition-transform">arrow_forward</span>
              </span>
            </button>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
