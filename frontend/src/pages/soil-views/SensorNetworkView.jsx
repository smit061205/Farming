import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import SoilTrendsChart from '../../components/SoilTrendsChart'
import FieldMap from '../../components/FieldMap'
import API_BASE from '../../api'
import { resolveField } from '../../utils/fields'

export default function SensorNetworkView({ fieldId }) {
  const { user, token } = useAuth()
  const navigate = useNavigate()

  // Parse metrics — the farmer's saved profile is the single source of truth
  // (a localStorage cache here used to let this page show different numbers
  // than the Dashboard and Fertilizer Hub for the same account).
  const soil = resolveField(user, fieldId)
  const soilPh = parseFloat(soil.ph ?? 6.5)
  const soilN = parseFloat(soil.nitrogen ?? 120)
  const soilP = parseFloat(soil.phosphorus ?? 45)
  const soilK = parseFloat(soil.potassium ?? 180)

  const om = parseFloat(soil.organic_matter_pct ?? 4.2).toFixed(1)
  const cec = parseFloat(soil.cec ?? 15.0).toFixed(1)
  const salinity = soil.salinity_risk ?? "Low"
  const limeReq = soil.lime_requirement_kg_ha ?? 0

  // The real score — same weighted pH/N/P/K formula the backend uses
  // everywhere else (sustainability impact, field diagnostics), not a
  // separately-invented pH/N-only approximation with a fake fallback.
  const vitality = soil.overall_health_score ?? null

  const phStatus = soilPh < 6 ? 'Acidic' : soilPh > 7.5 ? 'Alkaline' : 'Neutral'

  const [satelliteData, setSatelliteData] = useState(null)
  const [trendData, setTrendData] = useState([])
  const [trendLoading, setTrendLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    setTrendLoading(true)
    const fieldQuery = fieldId ? `&field_id=${fieldId}` : ''
    fetch(`${API_BASE}/api/engine/recommendation-history?limit=12${fieldQuery}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        const points = (data.history || [])
          .filter(h => h.health_score != null)
          .reverse() // oldest first, for a left-to-right timeline
          .map(h => ({
            label: h.created_at ? new Date(h.created_at * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '',
            health_score: h.health_score,
          }))
        setTrendData(points)
        setTrendLoading(false)
      })
      .catch(() => setTrendLoading(false))
  }, [token, fieldId])

  // Map Lens Switcher State
  const [activeLayer, setActiveLayer] = useState('ndvi')
  const [mapUrl, setMapUrl] = useState(null)
  const [mapStatus, setMapStatus] = useState('loading') // 'loading' | 'success' | 'empty'

  useEffect(() => {
    // Defaulting to Gujarat coordinates if auth user has no location
    const lat = user?.coordinates?.lat || 23.16;
    const lng = user?.coordinates?.lng || 72.44;

    fetch(`${API_BASE}/api/engine/satellite-insights?lat=${lat}&lng=${lng}`)
      .then(res => res.json())
      .then(data => setSatelliteData(data))
      .catch(console.error)

    setMapStatus('loading')
    fetch(`${API_BASE}/api/engine/satellite-map?lat=${lat}&lng=${lng}&layer_type=${activeLayer}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setMapUrl(data.url)
          setMapStatus('success')
        } else {
          setMapUrl(null)
          setMapStatus('empty')
        }
      })
      .catch(() => { setMapUrl(null); setMapStatus('empty') })
  }, [user, activeLayer])

  const fieldMapRef = useRef(null)
  const [isCapturing, setIsCapturing] = useState(false)

  const handleDownloadScreenshot = async () => {
    const leafletMap = fieldMapRef.current?.getLeafletMap()
    const mapContainer = leafletMap?.getContainer()
    if (!mapContainer) return

    setIsCapturing(true)
    try {
      const { toJpeg } = await import('html-to-image')
      
      const dataUrl = await toJpeg(mapContainer, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        // Make sure it captures cross origin images perfectly
        pixelRatio: 2,
        style: {
          transform: 'none',
        }
      })

      const link = document.createElement('a')
      link.download = `field-map-${activeLayer}-${new Date().toISOString().split('T')[0]}.jpeg`
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Failed to capture map screenshot:', err)
      alert('Map capture failed. Please ensure cross-origin tiles are loaded.')
    } finally {
      setIsCapturing(false)
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      
      {/* Top Section: Title & High-Level KPIs */}
      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-8 pb-8 border-b border-[#173809]/10">
          <div>
            <span className="text-[#9f402d] font-headline font-bold tracking-widest text-xs uppercase mb-2 block">
              Live Field Status
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-headline font-bold text-[#173809] tracking-tighter leading-none">
              Soil Intelligence
            </h1>
          </div>
          <p className="text-lg text-[#43493e] font-medium max-w-md text-right leading-relaxed hidden md:block">
            Symmetrical analytics overview of subterranean telemetry and recent biochemical modeling.
          </p>
        </div>

        {/* 4-Column Symmetrical KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#e7e3ca] rounded-3xl p-6 soil-shadow relative overflow-hidden flex flex-col justify-between">
            <span className="text-[#173809] font-bold text-xs uppercase tracking-widest mb-4">AgriSense Score</span>
            <div className="flex items-baseline gap-2 z-10">
              <span className="text-5xl font-headline font-bold text-[#173809]">{vitality != null ? `${vitality}%` : '—'}</span>
              <span className="text-[#2d4f1e] font-bold text-sm tracking-wide">
                {vitality == null ? 'No Data' : vitality > 85 ? 'Optimal' : vitality > 60 ? 'Stable' : 'Critical'}
              </span>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#c5efad]/40 rounded-full blur-2xl"></div>
          </div>
          <div className="bg-[#f8f4db] rounded-3xl p-6 soil-shadow flex flex-col justify-between border border-white/50">
            <span className="text-[#173809] font-bold text-xs uppercase tracking-widest mb-4">Nutrient Holding</span>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-headline font-bold text-[#173809]">{cec}</span>
              <span className="text-[#173809]/60 font-bold text-sm">meq/100g</span>
            </div>
          </div>
          <div className="bg-[#f8f4db] rounded-3xl p-6 soil-shadow flex flex-col justify-between border border-white/50">
            <span className="text-[#173809] font-bold text-xs uppercase tracking-widest mb-4">Organic Content</span>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-headline font-bold text-[#173809]">{om}%</span>
              <span className="text-[#173809]/60 font-bold text-sm">Humus</span>
            </div>
          </div>
          <div className="bg-[#173809] text-white rounded-3xl p-6 soil-shadow flex flex-col justify-between relative overflow-hidden">
            <span className="text-white/70 font-bold text-xs uppercase tracking-widest mb-4">Soil pH</span>
            <div className="flex items-baseline gap-2 z-10">
              <span className="text-5xl font-headline font-bold text-white">{soilPh.toFixed(1)}</span>
              <span className="text-[#c5efad] font-bold text-sm">{phStatus}</span>
            </div>
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <span className="material-symbols-outlined text-6xl">science</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Satellite Lens Switcher */}
      <div className="max-w-7xl mx-auto mb-10">
        <div className="bg-[#e7e3ca] rounded-[2.5rem] p-4 soil-shadow relative overflow-hidden flex flex-col lg:flex-row gap-6 lg:h-[520px]">
          
          {/* Controls Panel */}
          <div className="w-full lg:w-1/3 bg-white rounded-[2rem] p-8 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-[#173809] bg-[#e7e3ca] rounded-full p-2">satellite_alt</span>
                <h2 className="text-2xl font-headline font-bold text-[#173809]">Multispectral Lens</h2>
              </div>
              <p className="text-sm text-[#43493e] font-medium mb-8">
                Toggle optical and radiometric sensors to visualize different field metrics.
              </p>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => setActiveLayer('truecolor')}
                  className={`px-6 py-4 rounded-xl font-bold flex justify-between items-center transition-colors ${activeLayer === 'truecolor' ? 'bg-[#173809] text-white' : 'bg-[#f8f4db] text-[#173809] hover:bg-[#c5efad]'}`}
                >
                  <span className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">visibility</span> True Color Vision</span>
                  {activeLayer === 'truecolor' && <span className="w-2 h-2 rounded-full bg-[#c5efad]"></span>}
                </button>

                <button 
                  onClick={() => setActiveLayer('ndvi')}
                  className={`px-6 py-4 rounded-xl font-bold flex justify-between items-center transition-colors ${activeLayer === 'ndvi' ? 'bg-[#173809] text-white' : 'bg-[#f8f4db] text-[#173809] hover:bg-[#c5efad]'}`}
                >
                  <span className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">eco</span> NDVI (Crop Vigor)</span>
                  {activeLayer === 'ndvi' && <span className="w-2 h-2 rounded-full bg-[#c5efad]"></span>}
                </button>

                <button 
                  onClick={() => setActiveLayer('ndwi')}
                  className={`px-6 py-4 rounded-xl font-bold flex justify-between items-center transition-colors ${activeLayer === 'ndwi' ? 'bg-[#173809] text-white' : 'bg-[#f8f4db] text-[#173809] hover:bg-[#c5efad]'}`}
                >
                  <span className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">water_drop</span> NDWI (Moisture)</span>
                  {activeLayer === 'ndwi' && <span className="w-2 h-2 rounded-full bg-[#c5efad]"></span>}
                </button>

                <button 
                  onClick={() => setActiveLayer('atmospheric')}
                  className={`px-6 py-4 rounded-xl font-bold flex justify-between items-center transition-colors ${activeLayer === 'atmospheric' ? 'bg-[#173809] text-white' : 'bg-[#f8f4db] text-[#173809] hover:bg-[#c5efad]'}`}
                >
                  <span className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">thermostat</span> Thermal SWIR</span>
                  {activeLayer === 'atmospheric' && <span className="w-2 h-2 rounded-full bg-[#c5efad]"></span>}
                </button>
              </div>
            </div>

          </div>

          {/* Map Viewer */}
          <div className="w-full lg:w-2/3 min-h-[400px] lg:h-full bg-white rounded-[2rem] overflow-hidden relative border border-white/50">
            <div className="absolute top-4 right-4 z-[500] flex items-center gap-2">
              <button 
                onClick={handleDownloadScreenshot}
                disabled={isCapturing || !mapUrl}
                className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-full shadow-sm text-[10px] font-bold tracking-widest uppercase flex items-center gap-1 hover:bg-[#c5efad] transition-colors disabled:opacity-50"
                title="Download Screen Capture"
              >
                <span className="material-symbols-outlined text-[14px]">
                  {isCapturing ? 'hourglass_empty' : 'download'}
                </span>
                {isCapturing ? 'Saving...' : 'Save'}
              </button>

              <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-sm text-[10px] font-bold tracking-widest uppercase flex items-center gap-2">
                 {mapStatus === 'success' ? (
                   <><span className="w-2 h-2 bg-[#2d4f1e] rounded-full animate-pulse"></span> {activeLayer} overlay active</>
                 ) : mapStatus === 'loading' ? (
                   <><span className="w-2 h-2 bg-[#9f402d] rounded-full animate-pulse"></span> Querying satellites...</>
                 ) : (
                   <><span className="w-2 h-2 bg-[#173809]/30 rounded-full"></span> No recent cloud-free image</>
                 )}
              </div>
            </div>
            
            <FieldMap
              ref={fieldMapRef}
              coordinates={user?.coordinates || {lat: 23.16, lng: 72.44, label: "Gujarat"}}
              zoom={14}
              geeUrlTemplate={mapUrl}
              showLabel={false}
              popupContent={satelliteData ? `NDVI: ${satelliteData.ndvi} <br/> NDWI: ${satelliteData.ndwi}` : null}
            />
          </div>

        </div>
      </div>

      {/* Main 50/50 Symmetrical Split */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        
        {/* Left Column: Nutrient Levels */}
        <div className="bg-[#f8f4db] rounded-[2.5rem] p-10 soil-shadow flex flex-col">
          <div className="flex items-center gap-3 mb-10">
            <span className="material-symbols-outlined text-[#173809] bg-[#e7e3ca] rounded-full p-2">grass</span>
            <h2 className="text-2xl font-headline font-bold text-[#173809]">Nutrient Levels</h2>
          </div>
          
          <div className="space-y-10 flex-1 flex flex-col justify-center">
            {/* Nitrogen */}
            <div>
              <div className="flex justify-between items-end mb-3">
                <span className="font-bold text-[#173809]">Nitrogen (N) <span className="text-[#173809]/40 text-xs ml-2">Vegetative Growth</span></span>
                <span className="text-[#173809] font-bold tracking-tight">{soilN} <span className="text-xs text-[#173809]/60">mg/kg</span></span>
              </div>
              <div className="h-3 bg-[#e7e3ca] rounded-full overflow-hidden">
                <div className="h-full bg-[#173809] rounded-full relative" style={{ width: `${Math.min(100, (soilN / 300) * 100)}%` }}>
                  <div className="absolute top-0 right-0 w-2 h-full bg-white/30"></div>
                </div>
              </div>
            </div>
            {/* Phosphorus */}
            <div>
              <div className="flex justify-between items-end mb-3">
                <span className="font-bold text-[#173809]">Phosphorus (P) <span className="text-[#173809]/40 text-xs ml-2">Root Development</span></span>
                <span className="text-[#173809] font-bold tracking-tight">{soilP} <span className="text-xs text-[#173809]/60">mg/kg</span></span>
              </div>
              <div className="h-3 bg-[#e7e3ca] rounded-full overflow-hidden">
                <div className="h-full bg-[#173809] rounded-full relative" style={{ width: `${Math.min(100, (soilP / 100) * 100)}%` }}>
                   <div className="absolute top-0 right-0 w-2 h-full bg-white/30"></div>
                </div>
              </div>
            </div>
            {/* Potassium */}
            <div>
              <div className="flex justify-between items-end mb-3">
                <span className="font-bold text-[#173809]">Potassium (K) <span className="text-[#173809]/40 text-xs ml-2">Stress Tolerance</span></span>
                <span className="text-[#173809] font-bold tracking-tight">{soilK} <span className="text-xs text-[#173809]/60">mg/kg</span></span>
              </div>
              <div className="h-3 bg-[#e7e3ca] rounded-full overflow-hidden">
                <div className="h-full bg-[#173809] rounded-full relative" style={{ width: `${Math.min(100, (soilK / 400) * 100)}%` }}>
                   <div className="absolute top-0 right-0 w-2 h-full bg-white/30"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Soil Risks */}
        <div className="bg-[#173809] text-[#fefae0] rounded-[2.5rem] p-10 soil-shadow flex flex-col relative overflow-hidden">
          <div className="flex items-center gap-3 mb-10 relative z-10">
            <span className="material-symbols-outlined text-[#173809] bg-[#c5efad] rounded-full p-2">analytics</span>
            <h2 className="text-2xl font-headline font-bold text-white">Soil Risks</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 flex-1 content-center relative z-10">
            <div>
              <p className="text-[#c5efad] text-xs font-bold uppercase tracking-widest mb-1">Lime Requirement</p>
              <p className="text-3xl font-headline font-bold text-white mb-2">{limeReq} <span className="text-lg text-white/50">kg/ha</span></p>
              <p className="text-xs text-white/50">{limeReq > 0 ? 'Corrective amendment advised' : 'No lime required'}</p>
            </div>
            <div>
               <p className="text-[#c5efad] text-xs font-bold uppercase tracking-widest mb-1">Salinity Risk</p>
              <p className="text-3xl font-headline font-bold text-white mb-2">{salinity}</p>
              <p className="text-xs text-white/50">Electrical conductivity assessment</p>
            </div>
            <div>
               <p className="text-[#c5efad] text-xs font-bold uppercase tracking-widest mb-1">pH Status</p>
              <p className="text-3xl font-headline font-bold text-white mb-2 capitalize">{soil.ph_adequacy || 'Unknown'}</p>
              <p className="text-xs text-white/50">Calculated from your soil test</p>
            </div>
            <div>
               <p className="text-[#c5efad] text-xs font-bold uppercase tracking-widest mb-1">Soil Texture</p>
              <p className="text-3xl font-headline font-bold text-white mb-2 capitalize">{soil.soil_type || soil.soilType || 'Loam'}</p>
              <p className="text-xs text-white/50">Water retention benchmark</p>
            </div>
          </div>
          
          <div className="absolute top-1/2 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
        </div>

      </div>

      {/* Cross-Section Lower Dashboard */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Wide Chart */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-10 soil-shadow flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-headline font-bold text-[#173809]">Trends Over Time</h2>
            <div className="flex gap-4">
              {satelliteData?.info?.includes('LIVE_DATA') ? (
                <span className="flex items-center gap-1.5 text-xs font-bold text-[#2d4f1e] whitespace-nowrap bg-[#c5efad]/30 px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-[#173809] animate-pulse"></span> GEE S-2 Active
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#9f402d] whitespace-nowrap bg-[#9f402d]/10 px-3 py-1 rounded-full uppercase tracking-widest">
                  Demonstration Mode
                </span>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 relative z-10 p-4 bg-[#e7e3ca]/40 rounded-2xl mx-2 border border-[#173809]/5">
             <div>
               <p className="text-[10px] font-bold uppercase tracking-widest text-[#173809]/60">S2 NDVI Focus</p>
               <p className="text-xl font-headline font-bold text-[#173809]">{satelliteData ? satelliteData.ndvi : '--'}</p>
             </div>
             <div>
               <p className="text-[10px] font-bold uppercase tracking-widest text-[#173809]/60">S2 NDWI Moisture</p>
               <p className="text-xl font-headline font-bold text-[#173809]">{satelliteData ? satelliteData.ndwi : '--'}</p>
             </div>
             <div className="md:col-span-2">
               <p className="text-[10px] font-bold uppercase tracking-widest text-[#173809]/60">Multispectral Scanner Status</p>
               <p className="text-xs font-semibold text-[#173809]/80 truncate mt-1">
                 {satelliteData ? satelliteData.info : 'Initializing API Payload...'}
               </p>
             </div>
          </div>

          <div className="h-full min-h-[280px] mt-auto">
            {trendLoading ? (
              <div className="h-full min-h-[280px] flex items-center justify-center text-sm text-[#173809]/40">Loading trend…</div>
            ) : trendData.length >= 2 ? (
              <SoilTrendsChart data={trendData} />
            ) : (
              <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center px-6 bg-[#f8f4db] rounded-2xl">
                <p className="text-sm font-bold text-[#173809]">Not enough history yet</p>
                <p className="text-xs text-[#173809]/50 mt-1.5 max-w-sm">
                  This chart plots this field's real AgriSense Score across past soil tests. Run a fertilizer
                  recommendation here a few times over the season and a real trend line will appear.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Panel */}
        <div className="lg:col-span-1 bg-[#9f402d] text-white rounded-[2.5rem] p-10 soil-shadow flex flex-col relative overflow-hidden">
          <div className="relative z-10 flex flex-col h-full">
            <h2 className="text-3xl font-headline font-bold mb-4 tracking-tighter leading-tight">What To Do<br/>Next</h2>
            <p className="text-white/80 text-sm font-medium leading-relaxed mb-10">
              Your soil could use a boost from natural microbes to help release more nutrients to your crop.
            </p>

            <button
              onClick={() => navigate('/dashboard#ai-crop-recommendations')}
              className="mt-auto bg-white text-[#9f402d] rounded-full py-4 px-6 font-bold text-sm tracking-widest uppercase hover:bg-[#173809] hover:text-white transition-colors duration-300 flex items-center justify-between group">
              See Recommendations
              <span className="material-symbols-outlined transform group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>
          {/* Decorative Pattern */}
          <div className="absolute -bottom-10 -right-10 text-[180px] text-white/5 material-symbols-outlined select-none pointer-events-none">hub</div>
        </div>

      </div>

      {/* Decorative Bottom Fluting */}
      <div className="max-w-7xl mx-auto mt-16 h-1 w-full bg-gradient-to-r from-transparent via-[#173809]/10 to-transparent"></div>
    </div>
  )
}
