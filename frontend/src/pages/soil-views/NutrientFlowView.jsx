export default function NutrientFlowView() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      
      {/* Top Section */}
      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-8 pb-8 border-b border-[#173809]/10">
          <div>
            <span className="text-[#9f402d] font-headline font-bold tracking-widest text-xs uppercase mb-2 block">
              Mineral Dynamics
            </span>
            <h1 className="text-5xl md:text-6xl font-headline font-bold text-[#173809] tracking-tighter leading-none">
              Nutrient Flow
            </h1>
          </div>
          <p className="text-lg text-[#43493e] font-medium max-w-md text-right leading-relaxed hidden md:block">
            Tracking the mobility of ions through the soil profile. Optimizing Cation Exchange Capacity (CEC) to minimize chemical leeching.
          </p>
        </div>

        {/* 4-Column KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#173809] text-white rounded-3xl p-6 soil-shadow relative overflow-hidden flex flex-col justify-between">
            <span className="text-[#c5efad] font-bold text-xs uppercase tracking-widest mb-4">Ion Capacity</span>
            <div className="flex items-baseline gap-2 z-10">
              <span className="text-4xl font-headline font-bold">24.5</span>
              <span className="text-white/50 text-sm font-bold">meq/100g</span>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
          </div>
          
          <div className="bg-[#9f402d] text-white rounded-3xl p-6 soil-shadow flex flex-col justify-between border border-white/10 relative overflow-hidden">
            <span className="text-white/80 font-bold text-xs uppercase tracking-widest mb-4">Nitrate Leech</span>
            <div className="flex items-end gap-2 mb-2 z-10">
              <span className="text-4xl font-headline font-bold text-white">Mod</span>
              <span className="text-sm font-bold text-white/50 mb-1">Risk</span>
            </div>
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
          </div>

          <div className="md:col-span-2 bg-[#e7e3ca] rounded-3xl p-6 soil-shadow relative overflow-hidden flex items-center justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4"></div>
             <div>
               <p className="text-[#173809]/60 font-bold text-xs uppercase tracking-widest mb-1">Base Saturation</p>
               <h3 className="text-3xl font-headline font-bold text-[#173809] mb-2">Stable at 82%</h3>
               <p className="text-sm font-medium text-[#43493e] leading-relaxed max-w-sm">
                 Your soil's ability to hold onto Calcium, Magnesium, and Potassium is excellent due to high clay content.
               </p>
             </div>
             <div className="hidden lg:block p-4 bg-white/50 rounded-full border border-white">
                <span className="material-symbols-outlined text-[#173809] text-3xl">hub</span>
             </div>
          </div>
        </div>
      </div>

      {/* Cross-Section Lower Dashboard */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Wide Ion Balance Chart */}
        <div className="lg:col-span-2 bg-[#f8f4db] rounded-[2.5rem] p-10 soil-shadow flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-headline font-bold text-[#173809]">Cation Equilibrium</h2>
          </div>
          <div className="flex-1 flex flex-col justify-center space-y-6">
             {[
              { label: 'Calcium (Ca++)', target: '65-75%', current: '65%', color: '#173809' },
              { label: 'Magnesium (Mg++)', target: '10-15%', current: '15%', color: '#9f402d' },
              { label: 'Potassium (K+)', target: '3-5%', current: '4%', color: '#fb9f54' },
              { label: 'Hydrogen (H+)', target: '<10%', current: '5%', color: '#173809', opacity: 0.3 },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between group">
                <div className="w-1/3">
                  <span className="font-bold text-[#43493e]">{item.label}</span>
                  <div className="text-[10px] uppercase font-bold text-[#173809]/40 tracking-widest mt-0.5">Target: {item.target}</div>
                </div>
                <div className="flex items-center gap-4 w-2/3">
                  <div className="flex-1 h-3 bg-[#e7e3ca] rounded-full overflow-hidden border border-[#173809]/5">
                    <div className="h-full rounded-full transition-all duration-1000 ease-out group-hover:opacity-80" style={{ width: item.current, backgroundColor: item.color, opacity: item.opacity || 1 }}></div>
                  </div>
                  <span className="text-sm font-bold w-12 text-right" style={{ color: item.color, opacity: item.opacity || 1 }}>{item.current}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Panel */}
        <div className="lg:col-span-1 bg-white border border-[#173809]/10 rounded-[2.5rem] p-10 soil-shadow flex flex-col relative overflow-hidden">
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#173809]/10">
              <div>
                <h4 className="font-headline font-bold text-xl text-[#173809] mb-1">Salinity (EC)</h4>
                <p className="text-[10px] text-[#43493e] font-bold uppercase tracking-widest">Conductivity</p>
              </div>
              <div className="text-right bg-[#e7e3ca] px-4 py-2 rounded-xl">
                <div className="text-2xl font-headline font-bold text-[#173809]">1.2 <span className="text-xs text-[#173809]/50">dS/m</span></div>
              </div>
            </div>

            <p className="text-[#43493e] text-sm font-medium leading-relaxed mb-10">
              Recent heavy rainfall has pushed soluble nitrates past the 40cm root zone. Delay synthetic N-application until moisture stabilizes.
            </p>
            
            <button className="mt-auto bg-[#173809] text-white rounded-full py-4 px-6 font-bold text-sm tracking-widest uppercase hover:bg-[#9f402d] transition-colors duration-300 flex items-center justify-between group">
              View Leech Log
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
