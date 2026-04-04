import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import FieldMap from '../../components/FieldMap'

export default function MicrobialMapsView() {
  const { user } = useAuth()
  const [mapUrl, setMapUrl] = useState(null)

  useEffect(() => {
    const lat = user?.location?.lat || 23.16;
    const lng = user?.location?.lng || 72.44;
    
    fetch(`http://127.0.0.1:8000/api/engine/satellite-map?lat=${lat}&lng=${lng}&layer_type=microbial`)
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
              Microbiology 04.24
            </span>
            <h1 className="text-5xl md:text-6xl font-headline font-bold text-[#173809] tracking-tighter leading-none">
              Microbial Maps
            </h1>
          </div>
          <p className="text-lg text-[#43493e] font-medium max-w-md text-right leading-relaxed hidden md:block">
            Visualizing the unseen. Fungal to bacterial ratios, active biomass, and pathogen pressure indexing across your terroir.
          </p>
        </div>

        {/* 4-Column KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#173809] text-white rounded-3xl p-6 soil-shadow relative overflow-hidden flex flex-col justify-between">
            <span className="text-[#c5efad] font-bold text-xs uppercase tracking-widest mb-4">Fungi:Bacteria</span>
            <div className="flex items-baseline gap-2 z-10">
              <span className="text-5xl font-headline font-bold">1.2</span>
              <span className="text-white/50 text-2xl font-bold">:1</span>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
          </div>
          
          <div className="bg-[#f8f4db] rounded-3xl p-6 soil-shadow flex flex-col justify-between border border-white/50">
            <span className="text-[#9f402d] font-bold text-xs uppercase tracking-widest mb-4">Respiration</span>
            <div className="flex items-end gap-2 mb-2 z-10">
              <span className="text-5xl font-headline font-bold text-[#173809]">48</span>
              <span className="text-sm font-bold text-[#43493e] mb-1">mg CO₂-C</span>
            </div>
            <div className="h-1.5 w-full bg-[#e7e3ca] rounded-full overflow-hidden">
              <div className="h-full bg-[#9f402d] w-3/4 rounded-full"></div>
            </div>
          </div>

          <div className="md:col-span-2 bg-[#e7e3ca] rounded-3xl p-6 soil-shadow relative overflow-hidden flex flex-col justify-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4"></div>
             <div>
               <p className="text-[#173809]/60 font-bold text-xs uppercase tracking-widest mb-1">Status Indicator</p>
               <h3 className="text-3xl font-headline font-bold text-[#173809] mb-2">Optimal Canopy</h3>
               <p className="text-sm font-medium text-[#43493e] leading-relaxed max-w-sm">
                 Decrease till rate to preserve delicate hyphal networks. Satellite indexing confirms dense leaf-area biomass.
               </p>
             </div>
          </div>
        </div>
      </div>

      {/* Map Layout */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 gap-8 relative z-10">
        <div className="bg-[#e7e3ca] rounded-[2.5rem] overflow-hidden soil-shadow relative h-[450px]">
          <div className="absolute top-6 left-6 z-[9999] flex flex-col gap-2 pointer-events-none">
             <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-black/5">
                <h3 className="font-headline font-bold text-[#173809] text-sm mb-2">Biomass Heatmap</h3>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#173809] flex-shrink-0"></span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#43493e]">Mycorrhizal Max</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#c5efad] flex-shrink-0"></span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#43493e]">Active Bacteria</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#9f402d] flex-shrink-0"></span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#43493e]">Bare Soil / Pathogen</span>
                  </div>
                </div>
             </div>
          </div>

          <div className="absolute top-6 right-6 bg-[#173809]/80 backdrop-blur-sm text-[#c5efad] text-[10px] font-label uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1.5 z-[9999]">
            {mapUrl ? (
              <><span className="w-1.5 h-1.5 bg-[#c5efad] rounded-full animate-pulse"></span> GEE Canopy Active</>
            ) : (
              <><span className="w-1.5 h-1.5 bg-[#e7e3ca] rounded-full"></span> Sourcing Tile...</>
            )}
          </div>

          <FieldMap
            coordinates={user?.location || {lat: 23.16, lng: 72.44, label: "Gujrat"}}
            zoom={15}
            geeUrlTemplate={mapUrl}
            showLabel={false}
          />
        </div>
      </div>
      
      {/* Decorative Bottom Fluting */}
      <div className="max-w-7xl mx-auto mt-16 h-1 w-full bg-gradient-to-r from-transparent via-[#173809]/10 to-transparent"></div>
    </div>
  )
}
