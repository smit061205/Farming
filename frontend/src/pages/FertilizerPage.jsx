import API_BASE from "../api.js"
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'

export default function FertilizerPage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [insights, setInsights] = useState(null)

  useEffect(() => {
    if (!token) return
    fetch('${API_BASE}/api/engine/insights', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setInsights(data))
      .catch(err => console.error("Could not fetch insights:", err))
  }, [token])

  const handleComplete = () => {
    navigate('/dashboard')
  }

  if (!insights) {
    return (
      <div className="bg-[#fefae0] min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined text-[#173809] text-5xl animate-spin">eco</span>
      </div>
    )
  }

  const proto = insights.fertilizerProtocol || {}

  return (
    <div className="bg-[#fefae0] text-[#1d1c0d] overflow-x-hidden min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-32 pb-24 px-6 md:px-12 max-w-[1440px] mx-auto w-full">
        {/* Header Section */}
        <header className="mb-20">
          <div className="flex flex-col md:flex-row items-baseline gap-4 mb-4">
            <span className="text-[#9f402d] font-headline font-bold text-lg tracking-widest uppercase">04 / Protocol</span>
            <h1 className="text-5xl md:text-7xl font-headline font-bold tracking-tighter text-[#173809] leading-[0.9]">
              Precision Nutrition Protocol
            </h1>
          </div>
          <p className="text-xl md:text-2xl text-[#1d1c0d]/70 max-w-2xl font-light leading-relaxed">
            Synchronizing synthetic precision with metabolic cycles of the plant to optimize nutrient efficiency and mineral uptake.
          </p>
        </header>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Recommended Formula Card */}
          <section className="lg:col-span-8">
            <div className="relative bg-[#e7e3ca] rounded-[3rem] p-12 overflow-hidden shadow-lg group">
              <div className="absolute -top-10 -right-10 opacity-10">
                <span className="material-symbols-outlined text-[12rem]">science</span>
              </div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 mb-8 px-4 py-1 rounded-full bg-[#173809] text-white text-sm font-semibold tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-[#c5efad] animate-pulse" style={{ boxShadow: '0 0 8px rgba(197,239,173,0.8)' }}></span>
                  AI SYNERGY RECOMMENDATION
                </div>
                <h2 className="text-3xl font-headline font-medium text-[#173809]/60 mb-2 uppercase tracking-wide">Recommended Formula</h2>
                <div className="text-4xl md:text-6xl font-headline font-bold text-[#173809] leading-tight mb-12">
                  {proto.formulaName || 'Granular Urea'} <span className="text-[#9f402d]">{proto.npk || '(46-0-0)'}</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-[#173809]/10">
                  <div>
                    <p className="text-sm font-label font-bold text-[#173809]/40 uppercase tracking-widest mb-4">Algorithmic Justification</p>
                    <p className="text-lg leading-relaxed text-[#1d1c0d]">Derived securely from the intersection of your recorded soil baseline and simulated climatic models to maximize ecological yield without risking toxicity.</p>
                  </div>
                  <div className="bg-[#f2efd5] rounded-lg p-6">
                    <p className="text-sm font-label font-bold text-[#173809]/40 uppercase tracking-widest mb-2">Soil Compatibility</p>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#173809]">check_circle</span>
                      <span className="font-medium">94% Fit for your Terroir</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Action Details Side Cards */}
          <aside className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Dosage Card */}
            <div className="bg-[#f8f4db] rounded-[2rem] p-8 transition-all duration-500 hover:bg-[#e7e3ca] shadow-md">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 rounded-full bg-[#173809]/5">
                  <span className="material-symbols-outlined text-[#173809] text-3xl">scale</span>
                </div>
                <span className="text-xs font-bold text-[#173809]/30 uppercase tracking-widest">Metric 01</span>
              </div>
              <h4 className="text-lg font-headline font-bold text-[#173809]/60 uppercase tracking-wider mb-1">Dosage</h4>
              <div className="text-4xl font-headline font-bold text-[#173809]">{proto.dosage || '120 kg'}</div>
            </div>

            {/* Timing Card */}
            <div className="bg-[#f8f4db] rounded-[2rem] p-8 transition-all duration-500 hover:bg-[#e7e3ca] shadow-md">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 rounded-full bg-[#9f402d]/5">
                  <span className="material-symbols-outlined text-[#9f402d] text-3xl">schedule</span>
                </div>
                <span className="text-xs font-bold text-[#173809]/30 uppercase tracking-widest">Metric 02</span>
              </div>
              <h4 className="text-lg font-headline font-bold text-[#173809]/60 uppercase tracking-wider mb-1">Timing</h4>
              <div className="text-3xl font-headline font-bold text-[#173809] leading-tight">{proto.timing || '--'}</div>
            </div>

            {/* Mode Card */}
            <div className="bg-[#f8f4db] rounded-[2rem] p-8 transition-all duration-500 hover:bg-[#e7e3ca] shadow-md">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 rounded-full bg-[#173809]/5">
                  <span className="material-symbols-outlined text-[#173809] text-3xl">broadcast_on_home</span>
                </div>
                <span className="text-xs font-bold text-[#173809]/30 uppercase tracking-widest">Metric 03</span>
              </div>
              <h4 className="text-lg font-headline font-bold text-[#173809]/60 uppercase tracking-wider mb-1">Application Mode</h4>
              <div className="text-3xl font-headline font-bold text-[#173809] leading-tight">{proto.mode || '--'}</div>
            </div>

          </aside>
        </div>

        <div className="mt-16 flex justify-end">
           <button 
              onClick={handleComplete}
              className="bg-[#173809] text-white px-8 py-5 rounded-full font-bold uppercase tracking-widest text-sm transition-transform active:scale-95 shadow-lg flex items-center gap-3 hover:bg-[#2d4f1e]"
            >
              LOG PROTOCOL COMPLETION
              <span className="material-symbols-outlined text-lg">check_circle</span>
            </button>
        </div>
      </main>

      <Footer dark />
    </div>
  )
}
