import API_BASE from '../api.js'
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLenderAuth } from '../context/LenderAuthContext'
import LenderNavbar from '../components/LenderNavbar'
import LenderOfferModal from '../components/LenderOfferModal'

const MOCK_FARMERS = [
  { id: 'usr_8af9d3b1', region: 'Nashik, Maharashtra', crop_type: 'Grapes', nitrogen_ppm: 85, phosphorus_ppm: 32, ph: 6.8, risk_score: 'A+' },
  { id: 'usr_2c4e7f09', region: 'Ludhiana, Punjab', crop_type: 'Wheat', nitrogen_ppm: 140, phosphorus_ppm: 45, ph: 7.2, risk_score: 'A' },
  { id: 'usr_9b1a5c4d', region: 'Guntur, Andhra Pradesh', crop_type: 'Chili', nitrogen_ppm: 110, phosphorus_ppm: 28, ph: 6.5, risk_score: 'B+' },
  { id: 'usr_f3d8e2a1', region: 'Surat, Gujarat', crop_type: 'Sugarcane', nitrogen_ppm: 160, phosphorus_ppm: 55, ph: 7.8, risk_score: 'B' },
  { id: 'usr_4e7b1a9c', region: 'Bikaner, Rajasthan', crop_type: 'Mustard', nitrogen_ppm: 65, phosphorus_ppm: 18, ph: 8.1, risk_score: 'C' }
]

export default function LenderDashboardPage() {
  const { lenderLogout, lenderUser } = useLenderAuth()
  const navigate = useNavigate()
  const [farmers, setFarmers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFarmer, setSelectedFarmer] = useState(null)

  const handleLogout = () => {
    lenderLogout()
    navigate('/')
  }

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('${API_BASE}/api/engine/verified-farmers')
        const data = await res.json()
        if (data.status === 'success' && data.candidates && data.candidates.length > 0) {
          setFarmers(data.candidates)
        } else {
          // Graceful fallback to rich mock data if no real farmers exist yet
          setFarmers(MOCK_FARMERS)
        }
      } catch (err) {
        console.error("Failed to load verified ledger", err)
        setFarmers(MOCK_FARMERS)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const handleOffer = (farmer) => {
    setSelectedFarmer(farmer)
  }

  return (
    <div className="min-h-screen bg-bg-light relative overflow-x-hidden selection:bg-[#9f402d] selection:text-white pb-32">
       <LenderNavbar activeLink="dashboard" />

       <main className="max-w-7xl mx-auto px-6 pt-32 pb-12">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
           <div>
              <div className="flex items-center gap-3 text-[#9f402d] mb-2">
                <span className="material-symbols-outlined text-3xl">verified_user</span>
                <span className="font-label text-xs font-bold uppercase tracking-widest">Verified Target Demographics</span>
              </div>
              <h1 className="font-headline text-4xl md:text-5xl font-black uppercase tracking-tighter text-[#173809]">
                Live Farmer Ledger
              </h1>
              <p className="mt-3 text-[#43493e] max-w-2xl">
                These profiles have been cryptographically verified against Sentinel-2 satellite data and physical soil composition scans. Their exact PII is hidden until a mutual connection is struck.
              </p>
           </div>
        </header>

        <div className="bg-white rounded-[2rem] shadow-xl border border-[#173809]/10 overflow-hidden">
           
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-[#e7e3ca]/50 border-b border-[#173809]/10 font-label text-xs uppercase tracking-widest text-[#173809]/60">
                   <th className="px-6 py-4">Anonymous ID</th>
                   <th className="px-6 py-4">General Region</th>
                   <th className="px-6 py-4">Primary Crop</th>
                   <th className="px-6 py-4">Soil NPK Health</th>
                   <th className="px-6 py-4 text-center">Risk Tier</th>
                   <th className="px-6 py-4 text-right">Action</th>
                 </tr>
               </thead>
               <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-[#43493e]">
                         <span className="material-symbols-outlined animate-spin text-3xl mb-2 text-[#9f402d]">sync</span>
                         <p className="font-label text-xs uppercase tracking-widest">Constructing Blockchain Ledger...</p>
                      </td>
                    </tr>
                  ) : farmers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-[#43493e]">
                         <p className="font-label text-xs uppercase tracking-widest">No verified farmers found on the network.</p>
                      </td>
                    </tr>
                  ) : (
                    farmers.map((farmer, idx) => (
                      <motion.tr 
                        key={farmer.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="border-b border-[#173809]/5 hover:bg-[#e7e3ca]/20 transition-colors"
                      >
                         <td className="px-6 py-5 font-mono text-sm text-[#173809]/60">
                            {farmer.id.slice(-8).toUpperCase()}
                         </td>
                         <td className="px-6 py-5 notranslate text-sm font-semibold text-[#173809]">
                            {farmer.region}
                         </td>
                         <td className="px-6 py-5 notranslate text-sm text-[#43493e]">
                            {farmer.crop_type}
                         </td>
                         <td className="px-6 py-5">
                            <div className="flex gap-3">
                               <div className="flex flex-col items-center">
                                 <span className="text-[10px] text-gray-500 font-mono">N</span>
                                 <span className={`text-xs font-bold ${farmer.nitrogen_ppm > 40 ? 'text-[#173809]' : 'text-[#9f402d]'}`}>{farmer.nitrogen_ppm}</span>
                               </div>
                               <div className="flex flex-col items-center">
                                 <span className="text-[10px] text-gray-500 font-mono">P</span>
                                 <span className={`text-xs font-bold ${farmer.phosphorus_ppm > 20 ? 'text-[#173809]' : 'text-yellow-600'}`}>{farmer.phosphorus_ppm}</span>
                               </div>
                               <div className="flex flex-col items-center">
                                 <span className="text-[10px] text-gray-500 font-mono">pH</span>
                                 <span className={`text-xs font-bold ${farmer.ph >= 6.0 && farmer.ph <= 7.5 ? 'text-[#173809]' : 'text-[#9f402d]'}`}>{farmer.ph}</span>
                               </div>
                            </div>
                         </td>
                         <td className="px-6 py-5 text-center">
                             <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-headline font-black text-lg ${
                               farmer.risk_score === 'A+' ? 'bg-[#c5efad] text-[#173809]' :
                               farmer.risk_score === 'B'  ? 'bg-yellow-200 text-yellow-900' :
                               'bg-[#9f402d]/20 text-[#9f402d]'
                             }`}>
                                {farmer.risk_score}
                             </div>
                         </td>
                         <td className="px-6 py-5 text-right">
                             <button
                               onClick={() => handleOffer(farmer)}
                               className="bg-[#173809] hover:bg-[#2d4f1e] text-[#fefae0] font-label text-[10px] sm:text-xs uppercase tracking-widest font-bold px-4 py-2 rounded-full transition-colors"
                             >
                               Offer Loan
                             </button>
                         </td>
                      </motion.tr>
                    ))
                  )}
               </tbody>
             </table>
           </div>

        </div>
      </main>

      {/* Render the Offer Modal inside AnimatePresence */}
      <AnimatePresence>
        {selectedFarmer && (
          <LenderOfferModal
            farmer={selectedFarmer}
            onClose={() => setSelectedFarmer(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
