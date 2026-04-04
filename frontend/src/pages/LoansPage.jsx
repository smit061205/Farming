import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import LoanApplicationModal from '../components/LoanApplicationModal'
import { useAuth } from '../context/AuthContext'

const LOAN_PARTNERS = [
  {
    id: 1,
    name: 'Kisan Rural Bank',
    type: 'Microfinance Loan',
    interest: '4.5% APR',
    match: '98%',
    description: 'Specifically matches your high Nitrogen efficiency. Low risk tier applied.',
    logo: 'account_balance'
  },
  {
    id: 2,
    name: 'AgriGrow Finance',
    type: 'Equipment & Fertilizer Line',
    interest: '5.2% APR',
    match: '92%',
    description: 'Pre-approved based on your 200m buffer zone satellite anomaly check.',
    logo: 'savings'
  },
  {
    id: 3,
    name: 'Terroir Risk Insurance',
    type: 'Crop Yield Insurance',
    interest: 'Variable Premium',
    match: '85%',
    description: 'Your pH balance reduces liability by 15% on standard wheat crop insurance.',
    logo: 'verified_user'
  }
]

export default function LoansPage() {
  const { user } = useAuth()
  const [activePartner, setActivePartner] = useState(null)

  const soil = user?.soil_data || {}
  const hasGoodSoil = soil.ph && soil.nitrogen

  const riskScore = hasGoodSoil ? 'A+' : 'Pending'
  const riskColor = hasGoodSoil ? 'text-[#c5efad]' : 'text-yellow-400'

  return (
    <div className="min-h-screen bg-bg-light relative overflow-x-hidden selection:bg-[#9f402d] selection:text-white">
      <Navbar />

      <main className="pt-32 pb-24 px-6 relative z-10 max-w-7xl mx-auto">
        
        <header className="mb-12">
          <div className="flex items-center gap-3 text-[#173809] mb-3">
            <span className="material-symbols-outlined text-4xl">payments</span>
            <h1 className="font-headline text-3xl md:text-5xl font-black uppercase tracking-tighter">Finance Hub</h1>
          </div>
          <p className="text-[#43493e] max-w-2xl text-sm leading-relaxed">
            Connect directly with verified Agritech loan and insurance providers. By securely sharing your satellite and soil data, you unlock lower interest rates based on proven risk-reduction.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#9f402d] text-sm">gavel</span>
            <p className="text-xs text-[#43493e]/60">
              By applying you agree to our{' '}
              <Link to="/loans/terms" className="text-[#9f402d] font-bold hover:underline">Loan Terms & Conditions</Link>
              {' '}&amp; data sharing policy.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: Risk Profile */}
          <div className="lg:col-span-4">
            <div className="bg-[#173809] rounded-3xl p-8 text-white sticky top-24 shadow-2xl">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
                <div>
                  <h3 className="font-headline font-bold uppercase tracking-widest text-xs text-white/50 mb-1">Blockchain Rating</h3>
                  <div className={`font-black text-5xl tracking-tighter ${riskColor}`}>
                    {riskScore}
                  </div>
                </div>
                <span className="material-symbols-outlined text-[4rem] text-white/10">health_and_safety</span>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-headline text-sm font-bold mb-2">Verified Yield Factors</h4>
                  {hasGoodSoil ? (
                    <ul className="space-y-3 font-label text-xs tracking-wide">
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[#c5efad] text-sm">check_circle</span> pH Balanced ({soil.ph})</li>
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[#c5efad] text-sm">check_circle</span> NPK Mapped</li>
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[#c5efad] text-sm">check_circle</span> GPS Coordinates Verified</li>
                      <li className="flex items-center gap-2"><span className="material-symbols-outlined text-yellow-400 text-sm">warning</span> Low Organic Matter</li>
                    </ul>
                  ) : (
                    <p className="notranslate text-sm text-white/50 bg-white/5 p-4 rounded-xl border border-white/10 border-dashed">
                      Please upload a soil test report in the Analyze tab to unlock your verified rating and access premium low-interest loans.
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-white/10">
                   <p className="notranslate text-[10px] text-white/40 uppercase tracking-widest leading-relaxed">
                     Your data is securely transmitted directly to financial partners. Technological Terroir takes 0% commission.
                   </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Financial Partners */}
          <div className="lg:col-span-8 space-y-4">
             <div className="bg-[#e7e3ca] rounded-2xl p-4 flex gap-4 items-center border border-[#173809]/10 shadow-sm">
                <span className="material-symbols-outlined text-[#173809]">info</span>
                <p className="text-sm text-[#173809] font-medium leading-tight">
                  Because you share transparent satellite and soil data, lenders view your farm as a <strong className="text-[#9f402d]">lower-risk asset</strong>.
                </p>
             </div>

             <AnimatePresence>
               {LOAN_PARTNERS.map((partner, idx) => (
                 <motion.div 
                    key={partner.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white rounded-3xl p-6 border border-[#173809]/10 shadow-lg hover:shadow-xl transition-all group"
                 >
                    <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                       <div className="w-16 h-16 rounded-2xl bg-[#fefae0] text-[#173809] flex items-center justify-center shrink-0">
                         <span className="material-symbols-outlined text-3xl">{partner.logo}</span>
                       </div>
                       
                       <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-1">
                            <h3 className="notranslate font-headline font-bold text-xl text-[#173809]">{partner.name}</h3>
                            <span className="bg-[#c5efad]/30 text-[#173809] text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full">
                              {partner.match} Match
                            </span>
                          </div>
                          <p className="notranslate text-sm text-[#9f402d] font-bold tracking-wide uppercase mb-2">{partner.type} • {partner.interest}</p>
                          <p className="notranslate text-sm text-[#43493e] leading-relaxed">{partner.description}</p>
                       </div>

                       <button 
                         onClick={() => setActivePartner(partner)}
                         disabled={!hasGoodSoil}
                         className={`notranslate shrink-0 px-6 py-3 rounded-full font-label text-xs font-bold uppercase tracking-widest transition-colors ${
                           hasGoodSoil 
                             ? 'bg-[#173809] text-white hover:bg-[#2d4f1e]'
                             : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                         }`}
                       >
                          Apply Now
                       </button>
                    </div>
                 </motion.div>
               ))}
             </AnimatePresence>
          </div>

        </div>
      </main>

      <Footer />

      {/* Application Modal */}
      <AnimatePresence>
        {activePartner && (
          <LoanApplicationModal
            partner={activePartner}
            onClose={() => setActivePartner(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
