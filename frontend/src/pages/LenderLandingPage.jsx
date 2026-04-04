import API_BASE from '../api.js'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Footer from '../components/Footer'
import { useLenderAuth } from '../context/LenderAuthContext'

export default function LenderLandingPage() {
  const { lenderLogin } = useLenderAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  const handleLenderLogin = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('${API_BASE}/api/auth/demo-lender', { method: 'POST' })
      if (!res.ok) throw new Error("Failed to auth")
      const data = await res.json()
      lenderLogin(data.access_token)
      
      // Navigate and force a hard refresh context
      setTimeout(() => navigate('/lender/dashboard'), 100)
    } catch (e) {
      console.error(e)
      alert("Failed to sign in as Demo Lender")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fefae0] text-[#1d1c0d] relative overflow-x-hidden selection:bg-[#9f402d] selection:text-white">

      {/* Basic Nav */}
      <nav className="absolute top-0 left-0 w-full p-6 lg:px-12 flex justify-between items-center z-50">
        <Link to="/" className="notranslate font-headline font-black text-2xl tracking-tighter text-[#173809]">
          तकनीकी टेरोइर <span className="text-[#173809]/60 ml-2 text-sm font-normal tracking-widest uppercase border-l border-[#173809]/20 pl-2">Finance Partners</span>
        </Link>
        <Link to="/login" className="notranslate font-label text-xs uppercase tracking-widest font-bold text-[#173809] hover:bg-[#e7e3ca] transition-colors border border-[#173809]/20 px-6 py-2 rounded-full">
          Sign In
        </Link>
      </nav>

      <main className="relative z-10 pt-40 pb-24 px-6 lg:px-12 max-w-7xl mx-auto flex flex-col min-h-screen">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center flex-1">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center gap-2 mb-6">
               <span className="material-symbols-outlined text-[#173809]">hub</span>
               <span className="font-label text-xs tracking-widest uppercase font-bold text-[#173809]">Institutional Portal</span>
            </div>
            
            <h1 className="font-headline text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-8 text-[#173809]">
              Data-Backed <br/>
              Agri-Finance.
            </h1>
            
            <p className="text-[#43493e] text-lg max-w-xl leading-relaxed mb-12">
              Extend capital with confidence. Technological Terroir provides lenders with verified, real-time soil and satellite anomaly data to instantly assess farm health and reduce default risk.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
               <button onClick={handleLenderLogin} disabled={isLoading} className="bg-[#173809] text-white px-10 py-5 rounded-full font-bold text-lg hover:bg-[#2d4f1e] hover:scale-105 active:scale-95 transition-all w-fit">
                {isLoading ? 'Authenticating...' : 'Access Verified Ledger'}
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
             <div className="bg-white rounded-[2rem] p-8 text-[#173809] shadow-xl relative z-10 overflow-hidden transform rotate-2 border border-[#173809]/5">
                <div className="flex justify-between items-center mb-8 pb-6 border-b border-[#173809]/10">
                   <h3 className="notranslate font-headline font-black text-2xl uppercase tracking-tighter">Live Network Risk</h3>
                   <span className="material-symbols-outlined text-4xl text-[#9f402d]">monitoring</span>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="font-label text-[10px] uppercase tracking-widest mb-1 text-black/50">Total Verified Coverage</p>
                    <p className="font-headline font-black text-4xl">4,208 <span className="text-xl">Hectares</span></p>
                  </div>
                  <div>
                    <p className="font-label text-[10px] uppercase tracking-widest mb-1 text-black/50">System Average Soil pH</p>
                    <p className="font-headline font-bold text-2xl text-[#173809]">6.8 <span className="text-sm font-normal">Optimal</span></p>
                  </div>
                   <div>
                    <p className="font-label text-[10px] uppercase tracking-widest mb-1 text-black/50">Anomaly Detections (30 days)</p>
                    <p className="font-headline text-xl text-[#9f402d] font-bold">14 <span className="text-sm font-normal text-black/60">Risk Events Intercepted</span></p>
                  </div>
                </div>
             </div>

             {/* Decorative background element */}
             <div className="absolute inset-0 bg-[#c5efad] rounded-[2rem] -rotate-3 translate-x-4 translate-y-4 -z-10 opacity-60"></div>
          </motion.div>
        </div>
      </main>

      {/* 1. The Algorithmic Workflow */}
      <section className="bg-white border-t border-[#173809]/5 py-32 px-6 lg:px-12 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="font-headline text-4xl md:text-5xl font-black uppercase text-[#173809] mb-4">The Algorithmic Workflow</h2>
            <p className="text-[#43493e] max-w-2xl mx-auto tracking-wide text-lg">
              Observe exactly how Agritech Insight bridges the gap between massive capital pools and fragmented, unbanked agronomy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-[40px] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#173809]/20 to-transparent -z-10"></div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-[#fefae0] border border-[#173809]/10 flex items-center justify-center mb-6 shadow-sm relative">
                 <span className="material-symbols-outlined text-3xl text-[#173809]">satellite_alt</span>
                 <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#173809] text-white font-black text-xs flex items-center justify-center">1</div>
              </div>
              <h3 className="font-headline font-black text-xl text-[#173809] mb-3">Cryptographic Onboarding</h3>
              <p className="text-[#43493e]/80 text-sm leading-relaxed">
                We ingest Sentinel-2 satellite telemetries alongside NPK IoT soil probes to geometrically verify farm boundaries and assess biophysical risk factors instantly.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-[#fefae0] border border-[#173809]/10 flex items-center justify-center mb-6 shadow-sm relative">
                 <span className="material-symbols-outlined text-3xl text-[#173809]">tune</span>
                 <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#173809] text-white font-black text-xs flex items-center justify-center">2</div>
              </div>
              <h3 className="font-headline font-black text-xl text-[#173809] mb-3">Structural Matchmaking</h3>
              <p className="text-[#43493e]/80 text-sm leading-relaxed">
                Lenders establish parametric criteria (e.g., minimum Tier B risk, specific crops). The system actively screens our verified ledger shielding PII until an offer is struck.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-[#fefae0] border border-[#173809]/10 flex items-center justify-center mb-6 shadow-sm relative">
                 <span className="material-symbols-outlined text-3xl text-[#173809]">account_balance</span>
                 <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#173809] text-white font-black text-xs flex items-center justify-center">3</div>
              </div>
              <h3 className="font-headline font-black text-xl text-[#173809] mb-3">Direct Disbursement</h3>
              <p className="text-[#43493e]/80 text-sm leading-relaxed">
                Lenders securely dispatch "Pre-Approved" term sheets. If accepted by the farmer, we securely unfurl end-to-end bank APIs for friction-free disbursement.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. Institutional Grade Advantages */}
      <section className="bg-[#f8f4db] py-32 px-6 lg:px-12 relative z-10 border-t border-[#173809]/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="font-headline text-4xl md:text-5xl font-black uppercase text-[#173809] mb-6">Institutional Grade <span className="text-[#9f402d]">Advantages</span></h2>
            <p className="text-[#43493e] text-lg leading-relaxed mb-6">
              Agritech Insight transforms opaque agrarian geography into structured, investable yield curves. We eliminate the middlemen extracting exorbitant localized premiums.
            </p>
            <button onClick={handleLenderLogin} disabled={isLoading} className="notranslate border border-[#173809]/20 text-[#173809] font-label text-sm uppercase tracking-widest font-bold px-8 py-4 rounded-full text-center hover:bg-[#e7e3ca] transition-colors duration-300 bg-white">
              Access the Network
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
             {[
               { icon: "analytics", title: "Predictive Intelligence", body: "30-day early warnings on NDVI drop-offs and extreme weather, allowing active portfolio derisking." },
               { icon: "fingerprint", title: "Zero KYC Friction", body: "Farmers are strictly authenticated via geo-bound Aadhaar linkage. You just read the normalized matrix." },
               { icon: "local_florist", title: "ESG Compliance", body: "Capital deployment maps perfectly to verifiable global sustainable investment frameworks automatically." },
               { icon: "gavel", title: "Smart Contracting", body: "Our legal scaffolding ensures precise execution of parameters for Bullet or Periodic harvest repayments." },
             ].map((feature, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  key={feature.title} 
                  className="bg-white rounded-2xl p-6 border border-[#173809]/10 hover:border-[#173809]/30 transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-3xl text-[#173809] mb-4">{feature.icon}</span>
                  <h4 className="font-headline font-bold text-[#173809] mb-2">{feature.title}</h4>
                  <p className="text-xs text-[#43493e]/80 leading-relaxed">{feature.body}</p>
                </motion.div>
             ))}
          </div>
        </div>
      </section>

      {/* 3. Final Call To Action */}
      <section className="bg-gradient-to-b from-white to-[#fefae0] py-32 px-6 lg:px-12 relative z-10 text-center border-t border-[#173809]/5">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
           <div className="w-16 h-16 rounded-2xl bg-[#c5efad] flex items-center justify-center mb-8 border border-[#173809]/10 shadow-sm">
             <span className="material-symbols-outlined text-3xl text-[#173809]">verified_user</span>
           </div>
           <h2 className="font-headline text-5xl font-black uppercase text-[#173809] mb-6">Ready to originate?</h2>
           <p className="text-[#43493e] text-lg mb-12 max-w-2xl">
             Log in to our securely sandboxed environment to witness the live influx of vetted agrarian candidates awaiting structured capital.
           </p>
           <button onClick={handleLenderLogin} disabled={isLoading} className="bg-[#173809] text-white px-10 py-5 rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-transform flex items-center gap-3 shadow-xl">
              {isLoading ? 'Connecting...' : 'Launch Secured Ledger'}
           </button>
        </div>
      </section>

      <div className="border-t border-[#173809]/10">
        <Footer />
      </div>
    </div>
  )
}
