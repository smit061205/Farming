import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import FieldMap from '../../components/FieldMap'
import API_BASE from '../../api'

export default function AtmosphericView() {
  const { user } = useAuth()
  const [mapUrl, setMapUrl] = useState(null)

  useEffect(() => {
    const lat = user?.location?.lat || 23.16;
    const lng = user?.location?.lng || 72.44;
    
    fetch(`${API_BASE}/api/engine/satellite-map?lat=${lat}&lng=${lng}&layer_type=atmospheric`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success' && data.url) {
          setMapUrl(data.url)
        }
      })
      .catch(console.error)
  }, [user])

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      
      {/* Top Section */}
      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-8 pb-8 border-b border-[#173809]/10">
          <div>
            <span className="text-[#9f402d] font-headline font-bold tracking-widest text-xs uppercase mb-2 block">
              Micro-Climate Data
            </span>
            <h1 className="text-5xl md:text-6xl font-headline font-bold text-[#173809] tracking-tighter leading-none">
              Atmospheric Tracker
            </h1>
          </div>
          <p className="text-lg text-[#43493e] font-medium max-w-md text-right leading-relaxed hidden md:block">
            Integrating local telemetry with macro-weather models to predict evapotranspiration and thermal stress on the canopy.
          </p>
        </div>

        {/* 4-Column KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#173809] text-white rounded-3xl p-6 soil-shadow relative overflow-hidden flex flex-col justify-between">
            <span className="text-[#c5efad] font-bold text-xs uppercase tracking-widest mb-4">Evapotranspiration</span>
            <div className="flex items-baseline gap-2 z-10">
              <span className="text-5xl font-headline font-bold">6.2</span>
              <span className="text-white/50 text-sm font-bold">mm/day</span>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
          </div>
          
          <div className="bg-[#f8f4db] rounded-3xl p-6 soil-shadow flex flex-col justify-between border border-white/50">
            <span className="text-[#173809]/50 font-bold text-xs uppercase tracking-widest mb-4">Vapor Pressure Deficit</span>
            <div className="flex items-end gap-2 mb-2 z-10">
              <span className="text-4xl font-headline font-bold text-[#173809]">1.4</span>
              <span className="text-sm font-bold text-[#173809] mb-1">kPa</span>
            </div>
            <div className="h-1.5 w-full bg-[#e7e3ca] rounded-full overflow-hidden">
              <div className="h-full bg-[#fb9f54]" style={{ width: '65%' }}></div>
            </div>
          </div>

          <div className="md:col-span-2 bg-[#e7e3ca] rounded-3xl p-6 soil-shadow relative overflow-hidden flex flex-col justify-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4"></div>
             <div className="flex items-center gap-6 z-10">
               <div className="p-4 bg-[#9f402d]/10 rounded-full text-[#9f402d]">
                 <span className="material-symbols-outlined text-3xl">device_thermostat</span>
               </div>
               <div>
                 <p className="text-[#173809]/60 font-bold text-xs uppercase tracking-widest mb-1">Soil Thermal Core (15cm)</p>
                 <div className="flex items-end gap-2">
                   <h3 className="text-4xl font-headline font-bold text-[#173809]">18°C</h3>
                   <span className="text-sm font-bold text-[#43493e] mb-1 tracking-wide">Optimal Root Growth</span>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* Cross-Section Lower Map & Action Panel */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Dynamic Map Frame */}
        <div className="lg:col-span-2 bg-[#e7e3ca] rounded-[2.5rem] p-4 soil-shadow relative h-[450px]">
          <div className="absolute top-8 left-8 z-[9999] flex flex-col gap-2 pointer-events-none">
             <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-black/5">
                <h3 className="font-headline font-bold text-[#173809] text-sm mb-2">Moisture Penetration</h3>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#173809] flex-shrink-0"></span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#43493e]">Saturated Canopy</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#fb9f54] flex-shrink-0"></span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#43493e]">Transpiration Stress</span>
                  </div>
                </div>
             </div>
          </div>

          <div className="absolute top-8 right-8 bg-[#173809]/80 backdrop-blur-sm text-[#c5efad] text-[10px] font-label uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1.5 z-[9999]">
            {mapUrl ? (
              <><span className="w-1.5 h-1.5 bg-[#c5efad] rounded-full animate-pulse"></span> GEE Thermal / Moisture</>
            ) : (
              <><span className="w-1.5 h-1.5 bg-[#e7e3ca] rounded-full"></span> Sourcing Tile...</>
            )}
          </div>
          
          <div className="w-full h-full rounded-[2rem] overflow-hidden">
            <FieldMap
              coordinates={user?.location || {lat: 23.16, lng: 72.44, label: "Gujrat"}}
              zoom={14}
              geeUrlTemplate={mapUrl}
              showLabel={false}
            />
          </div>
        </div>

        {/* Action Panel */}
        <div className="lg:col-span-1 bg-white border border-[#173809]/10 rounded-[2.5rem] p-10 soil-shadow flex flex-col relative overflow-hidden">
          <div className="relative z-10 flex flex-col h-full">
            <h2 className="text-3xl font-headline font-bold mb-4 tracking-tighter leading-tight text-[#173809]">Solar Radiation<br/>Offset</h2>
            <p className="text-[#43493e] text-sm font-medium leading-relaxed mb-10">
               High atmospheric demand driven by elevated solar radiation. Water loss from soil and vine transpiration is outpacing irrigation protocols.
            </p>

            <div className="flex flex-col gap-3 mt-auto mb-8">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#173809]">7-Day Forecast Trend</span>
              <div className="flex gap-2 h-16 items-end">
                {[4, 5, 6, 8, 7, 5, 4].map((val, i) => (
                  <div key={i} className="flex-1 bg-[#173809]/10 hover:bg-[#173809] transition-colors rounded-t-sm" style={{ height: `${(val/8)*100}%` }}></div>
                ))}
              </div>
            </div>
            
            <button className="bg-[#173809] text-white rounded-full py-4 px-6 font-bold text-sm tracking-widest uppercase hover:bg-[#c5efad] hover:text-[#173809] transition-colors duration-300 flex items-center justify-between group block w-full">
              Irrigation Adjust
              <span className="material-symbols-outlined transform group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>
        </div>

      </div>

      {/* Decorative Bottom Fluting */}
      <div className="max-w-7xl mx-auto mt-16 h-1 w-full bg-gradient-to-r from-transparent via-[#173809]/10 to-transparent"></div>
    </div>
  )
}
