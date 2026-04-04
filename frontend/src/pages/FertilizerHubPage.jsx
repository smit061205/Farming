import API_BASE from "../api.js"
import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'

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

export default function FertilizerHubPage() {
  const { token } = useAuth()
  const [top3, setTop3] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cached_fert_top3')) || [] } catch { return [] }
  })
  const [summary, setSummary] = useState(() => {
    try { return localStorage.getItem('cached_fert_summary') || '' } catch { return '' }
  })
  const [encyclopedia, setEncyclopedia] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cached_fert_encyc')) || [] } catch { return [] }
  })
  const [isLoadingRecs, setIsLoadingRecs] = useState(top3.length === 0)
  const [isLoadingEncyc, setIsLoadingEncyc] = useState(encyclopedia.length === 0)

  useEffect(() => {
    if (!token) return
    setIsLoadingRecs(top3.length === 0)
    fetch(`${API_BASE}/api/engine/fertilizer-top3`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setTop3(data.recommendations || [])
        setSummary(data.summary || '')
        setIsLoadingRecs(false)
        try {
          localStorage.setItem('cached_fert_top3', JSON.stringify(data.recommendations || []))
          localStorage.setItem('cached_fert_summary', data.summary || '')
        } catch {}
      })
      .catch(() => setIsLoadingRecs(false))

    setIsLoadingEncyc(encyclopedia.length === 0)
    fetch(`${API_BASE}/api/engine/fertilizer-encyclopedia`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setEncyclopedia(data.data || [])
        setIsLoadingEncyc(false)
        try { localStorage.setItem('cached_fert_encyc', JSON.stringify(data.data || [])) } catch {}
      })
      .catch(() => setIsLoadingEncyc(false))
  }, [token])

  return (
    <div className="bg-[#fefae0] text-[#1d1c0d] overflow-x-hidden min-h-screen flex flex-col">
      <Navbar activeLink="fertilizers" />

      <main className="flex-grow pt-32 pb-24 px-4 md:px-12 max-w-[1920px] mx-auto w-full">

        {/* ── AI Top 3 ── */}
        <section className="mb-24 max-w-7xl mx-auto">
          <header className="mb-12">
            <span className="font-label uppercase tracking-[0.3em] text-[#9f402d] text-sm font-bold mb-4 block">Algorithmic Nutrition</span>
            <h1 className="font-headline text-5xl md:text-7xl font-bold text-[#173809] tracking-tighter leading-none mb-6">Precision Formulas</h1>
            {isLoadingRecs ? (
              <div className="animate-pulse bg-[#e7e3ca] h-24 rounded-2xl w-full max-w-3xl" />
            ) : (
              <div className="bg-[#173809] text-white p-6 md:p-8 rounded-[2rem] max-w-4xl shadow-xl flex gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#c5efad]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="shrink-0 pt-1"><span className="material-symbols-outlined text-[#c5efad] text-3xl">smart_toy</span></div>
                <div className="relative z-10">
                  <h3 className="text-sm font-bold text-[#c5efad] uppercase tracking-widest mb-2">AI Analysis</h3>
                  <p className="text-lg md:text-xl font-medium leading-relaxed opacity-90">{summary}</p>
                </div>
              </div>
            )}
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {isLoadingRecs ? [1,2,3].map(i => (
              <div key={i} className="animate-pulse bg-white/50 h-80 rounded-[2.5rem] border border-[#173809]/10" />
            )) : top3.map((fert, idx) => (
              <div key={idx} className="bg-white rounded-[2.5rem] p-8 shadow-[0_20px_40px_rgba(23,56,9,0.05)] border border-[#173809]/5 relative overflow-hidden group hover:-translate-y-2 transition-transform duration-300 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6 border-b border-[#173809]/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#173809] to-[#2d4f1e] text-white flex items-center justify-center font-bold shadow-md">#{idx + 1}</div>
                    <span className="text-xs font-bold text-[#173809]/40 uppercase tracking-widest">Priority Rank</span>
                  </div>
                  <span className={`text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full ${fert.type === 'Organic' ? 'bg-[#c5efad]/40 text-[#173809]' : 'bg-[#e7e3ca] text-[#173809]'}`}>
                    {fert.type || 'Standard'}
                  </span>
                </div>
                <h3 className="text-3xl font-headline font-bold text-[#173809] mb-1 line-clamp-1">{fert.name}</h3>
                <p className="text-2xl font-black text-[#9f402d] tracking-widest mb-6 font-mono">{fert.npk}</p>
                <div className="bg-gradient-to-br from-[#f8f4db] to-[#fefae0] p-6 rounded-2xl border border-[#173809]/5 flex-grow shadow-inner">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-[#9f402d] text-lg">auto_awesome</span>
                    <p className="text-[10px] uppercase tracking-widest text-[#9f402d] font-bold">AI Selection Rationale</p>
                  </div>
                  <p className="text-[#1d1c0d] font-medium leading-relaxed italic border-l-2 border-[#9f402d]/30 pl-4">{fert.reason || fert.description}</p>
                </div>
                {fert.dosage && (
                  <div className="mt-6 pt-5 border-t border-[#173809]/10 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest text-[#173809]/40 font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">scale</span> Target Dosage</span>
                    <span className="font-bold text-[#173809] bg-[#e7e3ca]/50 px-3 py-1 rounded-md">{fert.dosage}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="w-full h-px bg-[#173809]/10 my-20 max-w-7xl mx-auto" />

        {/* ── Fertilizer Encyclopedia ── */}
        <section className="max-w-7xl mx-auto mb-20">
          <header className="mb-12">
            <span className="font-label uppercase tracking-[0.3em] text-[#173809]/40 text-sm font-bold mb-2 block">Reference Database</span>
            <h2 className="font-headline text-4xl md:text-5xl font-bold text-[#173809] tracking-tighter">Fertilizer Encyclopedia</h2>
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
            <span className="font-label uppercase tracking-[0.3em] text-[#173809]/40 text-sm font-bold mb-2 block">Terroir Knowledge Base</span>
            <h2 className="font-headline text-4xl md:text-5xl font-bold text-[#173809] tracking-tighter">Soil Types Encyclopedia</h2>
            <p className="text-[#173809]/50 text-base mt-3 max-w-2xl leading-relaxed">
              Understanding your terrain's composition is the foundation of precision agriculture. Each soil type demands a distinct nutritional and management strategy.
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
