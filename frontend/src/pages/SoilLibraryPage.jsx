import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function SoilLibraryPage() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [apiStatus, setApiStatus] = useState('live')
  const [selectedPlant, setSelectedPlant] = useState(null)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 500)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    setIsLoading(true)
    fetch(`http://127.0.0.1:8000/api/library/search-plants?q=${debouncedQuery}`)
      .then(res => res.json())
      .then(data => {
        const fetchedResults = data.data || [];
        setResults(fetchedResults)
        setApiStatus(data.status)
        setIsLoading(false)
        
        // Auto-select the first plant if nothing is selected yet
        if (fetchedResults.length > 0 && !selectedPlant) {
          setSelectedPlant(fetchedResults[0])
        }
      })
      .catch(e => {
        console.error("Library search error:", e)
        setIsLoading(false)
      })
  }, [debouncedQuery])

  return (
    <div className="bg-[#fefae0] text-[#1d1c0d] overflow-x-hidden min-h-screen flex flex-col">
      <Navbar activeLink="library" />

      <main className="flex-grow pt-32 pb-24 px-4 md:px-8 max-w-[1920px] mx-auto w-full">
        <div className="animate-in fade-in duration-700 ease-out max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-[#173809] border-b border-[#173809]/10 pb-6">
             <div>
                <span className="font-headline font-bold tracking-widest text-[#9f402d] text-xs uppercase mb-3 block">
                  Global Reference Database
                </span>
                <h1 className="text-5xl md:text-6xl font-headline font-bold tracking-tight">
                  Farmer's Encyclopedia
                </h1>
             </div>
              {apiStatus && apiStatus.includes('mock') && (
                  <div className="flex items-center gap-2 bg-[#9f402d]/10 text-[#9f402d] px-5 py-3 rounded-full text-xs font-bold uppercase tracking-widest">
                    <span className="material-symbols-outlined text-[16px]">wifi_off</span>
                    Offline Database Active
                  </div>
              )}
          </div>

          {/* The Encyclopedia Layout */}
          <div className="bg-[#fefce8] rounded-[2.5rem] shadow-2xl flex flex-col lg:flex-row overflow-hidden border border-[#173809]/10 min-h-[700px] lg:max-h-[800px]">
             
             {/* Left Sidebar: The Index */}
             <div className="w-full lg:w-1/3 xl:w-[400px] bg-[#fefae0] border-b lg:border-b-0 lg:border-r border-[#173809]/10 flex flex-col z-10 shrink-0 h-[400px] lg:h-auto">
                {/* Search Box */}
                <div className="p-6 pb-2 relative z-20 bg-[#fefae0]">
                   <div className="relative">
                     <input
                       type="text"
                       value={query}
                       onChange={(e) => setQuery(e.target.value)}
                       placeholder="Search species..."
                       className="w-full bg-white border border-[#173809]/20 rounded-2xl px-6 py-4 text-lg font-body text-[#173809] focus:outline-none focus:border-[#9f402d] focus:ring-4 focus:ring-[#9f402d]/10 transition-all font-medium placeholder:text-[#173809]/30"
                     />
                     {isLoading ? (
                       <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-[#173809]/50 animate-spin">cycle</span>
                     ) : (
                       <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-[#173809]/30">search</span>
                     )}
                   </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                   {results.length === 0 && !isLoading && (
                      <div className="text-center p-8 mt-10">
                         <span className="material-symbols-outlined text-4xl text-[#173809]/20 mb-4 block">search_off</span>
                         <p className="text-[#173809]/50 font-medium">{debouncedQuery ? 'No botanical records found.' : 'Search the library to begin.'}</p>
                      </div>
                   )}
                   <div className="space-y-2">
                     {results.map((plant) => {
                       const isSelected = selectedPlant?.id === plant.id;
                       return (
                         <button 
                           key={plant.id}
                           onClick={() => setSelectedPlant(plant)}
                           className={`w-full text-left p-4 rounded-2xl transition-all duration-200 flex items-center gap-4 ${
                             isSelected 
                               ? 'bg-[#173809] text-white shadow-xl translate-x-2' 
                               : 'bg-transparent text-[#173809] hover:bg-[#e7e3ca] hover:translate-x-1'
                           }`}
                         >
                           <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-white border border-black/5">
                             <img 
                                src={plant.default_image?.regular_url} 
                                alt={plant.common_name} 
                                className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                           </div>
                           <div className="truncate flex-1">
                              <h3 className={`font-headline font-bold truncate text-lg ${isSelected ? 'text-white' : 'text-[#173809]'}`}>
                                 {plant.common_name}
                              </h3>
                              <p className={`text-sm truncate font-medium ${isSelected ? 'text-[#c5efad]' : 'text-[#43493e]'}`}>
                                 {plant.cycle}
                              </p>
                           </div>
                           {isSelected && (
                              <span className="material-symbols-outlined text-[#c5efad]">chevron_right</span>
                           )}
                         </button>
                       )
                     })}
                   </div>
                </div>
             </div>

             {/* Right Main Content: The Detail View */}
             <div className="flex-1 bg-white relative flex flex-col h-[600px] lg:h-auto overflow-y-auto custom-scrollbar">
                {!selectedPlant ? (
                   // Null State
                   <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#f8f4db]/50">
                      <div className="w-48 h-48 bg-[#e7e3ca] rounded-full flex items-center justify-center mb-8 shadow-inner">
                         <span className="material-symbols-outlined text-8xl text-[#173809]/40">local_library</span>
                      </div>
                      <h2 className="text-4xl font-headline font-bold text-[#173809] tracking-tight mb-4">The Farmer's Archive</h2>
                      <p className="max-w-md text-xl text-[#43493e] font-medium leading-relaxed">
                         Select a species from the index to access detailed growth parameters and biological requirements.
                      </p>
                   </div>
                ) : (
                   // Dynamic Plant Profile
                   <div className="animate-in fade-in zoom-in-95 duration-300">
                      <div className="relative h-64 md:h-80 w-full bg-[#173809]">
                         <img 
                            src={selectedPlant.default_image?.regular_url} 
                            alt={selectedPlant.common_name} 
                            className="w-full h-full object-cover opacity-80 mix-blend-overlay"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                         />
                         <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent"></div>
                         <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 z-10 translate-y-8">
                            <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white/50 max-w-3xl">
                               <span className="bg-[#c5efad] text-[#173809] text-[11px] uppercase tracking-widest font-bold px-4 py-1.5 rounded-full mb-4 inline-block shadow-sm">
                                 Record #{selectedPlant.id}
                               </span>
                               <h2 className="text-4xl md:text-5xl font-headline font-black text-[#173809] tracking-tight leading-none mb-2">
                                  {selectedPlant.common_name}
                               </h2>
                               <h3 className="text-xl text-[#43493e] italic font-serif">
                                  {selectedPlant.scientific_name?.[0] || 'Classification Unavailable'}
                               </h3>
                            </div>
                         </div>
                      </div>

                      {/* Content Grid */}
                      <div className="p-8 md:p-12 pt-16 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white">
                         
                         <div className="bg-[#f8f4db] p-8 rounded-[2rem] border border-[#173809]/5">
                            <div className="flex items-center gap-4 mb-6 border-b border-[#173809]/10 pb-4">
                               <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                                  <span className="material-symbols-outlined text-[#9f402d]">psychiatry</span>
                               </div>
                               <h4 className="text-sm uppercase tracking-widest text-[#173809] font-bold">Lifecycle & Growth</h4>
                            </div>
                            <div className="space-y-4">
                               <div>
                                  <p className="text-xs uppercase tracking-widest text-[#173809]/50 font-bold mb-1">Biological Classification</p>
                                  <p className="text-2xl font-bold text-[#173809]">{selectedPlant.cycle}</p>
                               </div>
                               <p className="text-base text-[#43493e] font-medium leading-relaxed">
                                  {selectedPlant.cycle === 'Perennial' 
                                     ? 'This crop survives multiple growing seasons. Ideal for building permanent soil fungal networks and long-term erosion control.'
                                     : 'This crop completes its life cycle in one season. Perfect for seasonal rotation and rapid nutrient injection back into soil beds.'}
                               </p>
                            </div>
                         </div>

                         <div className="bg-[#f8f4db] p-8 rounded-[2rem] border border-[#173809]/5">
                            <div className="flex items-center gap-4 mb-6 border-b border-[#173809]/10 pb-4">
                               <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                                  <span className="material-symbols-outlined text-[#173809]">light_mode</span>
                               </div>
                               <h4 className="text-sm uppercase tracking-widest text-[#173809] font-bold">Climate Needs</h4>
                            </div>
                            
                            <div className="space-y-6">
                               <div>
                                  <p className="text-xs uppercase tracking-widest text-[#173809]/50 font-bold mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-sm">water_drop</span> Irrigation Demand</p>
                                  <p className="text-xl font-bold text-[#173809] capitalize">{selectedPlant.watering}</p>
                               </div>
                               
                               <div>
                                  <p className="text-xs uppercase tracking-widest text-[#173809]/50 font-bold mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-sm">wb_sunny</span> Light Exposure</p>
                                  <div className="flex flex-wrap gap-2">
                                     {selectedPlant.sunlight?.map((sun, i) => (
                                        <span key={i} className="bg-white px-4 py-2 rounded-full text-sm text-[#173809] font-bold shadow-sm capitalize border border-black/5">
                                           {sun}
                                        </span>
                                     ))}
                                  </div>
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>
                )}
             </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
