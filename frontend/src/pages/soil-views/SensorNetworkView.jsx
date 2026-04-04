import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import SoilTrendsChart from '../../components/SoilTrendsChart'

export default function SensorNetworkView() {
  const { user } = useAuth()
  
  // Try to load any actively analyzed data
  let lastAnalysis = null
  try {
    const saved = localStorage.getItem('last_analysis')
    if (saved) lastAnalysis = JSON.parse(saved)
  } catch {}

  // Parse metrics
  const soilPh = parseFloat(lastAnalysis?.pH ?? user?.soil_data?.ph ?? 6.5)
  const soilN = parseFloat(lastAnalysis?.N ?? user?.soil_data?.nitrogen ?? 120)
  const soilP = parseFloat(lastAnalysis?.P ?? user?.soil_data?.phosphorus ?? 45)
  const soilK = parseFloat(lastAnalysis?.K ?? user?.soil_data?.potassium ?? 180)
  
  const om = parseFloat(user?.soil_data?.organic_matter_pct ?? 4.2).toFixed(1)
  const cec = parseFloat(user?.soil_data?.cec ?? 15.0).toFixed(1)
  const salinity = user?.soil_data?.salinity_risk ?? "Low"
  const limeReq = user?.soil_data?.lime_requirement_tons_per_ha ?? 0

  const phScore = Math.max(0, Math.min(100, Math.round(100 - Math.abs(soilPh - 6.5) * 20)))
  const nScore = Math.max(0, Math.min(100, Math.round((soilN / 300) * 100)))
  const vitality = Math.round((phScore + nScore) / 2) || 88

  const phStatus = soilPh < 6 ? 'Acidic' : soilPh > 7.5 ? 'Alkaline' : 'Neutral'

  const [satelliteData, setSatelliteData] = useState(null)
  
  useEffect(() => {
    // Defaulting to Gujarat coordinates if auth user has no location
    const lat = user?.location?.lat || 23.16;
    const lng = user?.location?.lng || 72.44;
    
    fetch(`http://127.0.0.1:8000/api/engine/satellite-insights?lat=${lat}&lng=${lng}`)
      .then(res => res.json())
      .then(data => setSatelliteData(data))
      .catch(console.error)
  }, [user])

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      
      {/* Top Section: Title & High-Level KPIs */}
      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-8 pb-8 border-b border-[#173809]/10">
          <div>
            <span className="text-[#9f402d] font-headline font-bold tracking-widest text-xs uppercase mb-2 block">
              Live Field Status
            </span>
            <h1 className="text-5xl md:text-6xl font-headline font-bold text-[#173809] tracking-tighter leading-none">
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
            <span className="text-[#173809] font-bold text-xs uppercase tracking-widest mb-4">Vitality Index</span>
            <div className="flex items-baseline gap-2 z-10">
              <span className="text-5xl font-headline font-bold text-[#173809]">{vitality}%</span>
              <span className="text-[#2d4f1e] font-bold text-sm tracking-wide">{vitality > 85 ? 'Optimal' : vitality > 60 ? 'Stable' : 'Critical'}</span>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#c5efad]/40 rounded-full blur-2xl"></div>
          </div>
          <div className="bg-[#f8f4db] rounded-3xl p-6 soil-shadow flex flex-col justify-between border border-white/50">
            <span className="text-[#173809] font-bold text-xs uppercase tracking-widest mb-4">Cation Exchange Limit</span>
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
            <span className="text-white/70 font-bold text-xs uppercase tracking-widest mb-4">pH Equilibrium</span>
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

      {/* Main 50/50 Symmetrical Split */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        
        {/* Left Column: Macro-Nutrient Stratification */}
        <div className="bg-[#f8f4db] rounded-[2.5rem] p-10 soil-shadow flex flex-col">
          <div className="flex items-center gap-3 mb-10">
            <span className="material-symbols-outlined text-[#173809] bg-[#e7e3ca] rounded-full p-2">grass</span>
            <h2 className="text-2xl font-headline font-bold text-[#173809]">Macro-Nutrient Stratification</h2>
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

        {/* Right Column: Physical & Diagnostic Risk Profile */}
        <div className="bg-[#173809] text-[#fefae0] rounded-[2.5rem] p-10 soil-shadow flex flex-col relative overflow-hidden">
          <div className="flex items-center gap-3 mb-10 relative z-10">
            <span className="material-symbols-outlined text-[#173809] bg-[#c5efad] rounded-full p-2">analytics</span>
            <h2 className="text-2xl font-headline font-bold text-white">Diagnostic Risk Profile</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 flex-1 content-center relative z-10">
            <div>
              <p className="text-[#c5efad] text-xs font-bold uppercase tracking-widest mb-1">Lime Requirement</p>
              <p className="text-3xl font-headline font-bold text-white mb-2">{limeReq} <span className="text-lg text-white/50">t/ha</span></p>
              <p className="text-xs text-white/50">{limeReq > 0 ? 'Corrective amendent advised' : 'No lime required'}</p>
            </div>
            <div>
               <p className="text-[#c5efad] text-xs font-bold uppercase tracking-widest mb-1">Salinity Risk</p>
              <p className="text-3xl font-headline font-bold text-white mb-2">{salinity}</p>
              <p className="text-xs text-white/50">Electrical conductivity assessment</p>
            </div>
            <div>
               <p className="text-[#c5efad] text-xs font-bold uppercase tracking-widest mb-1">Buffer pH Status</p>
              <p className="text-3xl font-headline font-bold text-white mb-2">Stable</p>
              <p className="text-xs text-white/50">Calculated from CEC & base saturation</p>
            </div>
            <div>
               <p className="text-[#c5efad] text-xs font-bold uppercase tracking-widest mb-1">Soil Texture</p>
              <p className="text-3xl font-headline font-bold text-white mb-2 capitalize">{user?.soil_data?.soil_type || 'Loam'}</p>
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
            <h2 className="text-2xl font-headline font-bold text-[#173809]">Telemetry Projection</h2>
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
            <SoilTrendsChart />
          </div>
        </div>

        {/* Action Panel */}
        <div className="lg:col-span-1 bg-[#9f402d] text-white rounded-[2.5rem] p-10 soil-shadow flex flex-col relative overflow-hidden">
          <div className="relative z-10 flex flex-col h-full">
            <h2 className="text-3xl font-headline font-bold mb-4 tracking-tighter leading-tight">Recommended<br/>Culturals</h2>
            <p className="text-white/80 text-sm font-medium leading-relaxed mb-10">
              Based on the diagnostic profile, your soil presents an opportunity for targeted biological inoculants to boost low solubility reserves.
            </p>
            
            <button className="mt-auto bg-white text-[#9f402d] rounded-full py-4 px-6 font-bold text-sm tracking-widest uppercase hover:bg-[#173809] hover:text-white transition-colors duration-300 flex items-center justify-between group">
              Generate Protocol
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
