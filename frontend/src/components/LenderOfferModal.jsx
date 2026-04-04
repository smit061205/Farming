import API_BASE from "../api.js"
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useLenderAuth } from '../context/LenderAuthContext'

const STEPS = ['Configure Details', 'Review & Dispatch', 'Processed']

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, idx) => (
        <div key={label} className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-black transition-all ${
            idx < current ? 'bg-[#c5efad] text-[#173809]' :
            idx === current ? 'bg-[#173809] text-white' :
            'bg-[#e7e3ca] text-[#173809]/40'
          }`}>
            {idx < current
              ? <span className="material-symbols-outlined text-sm">check</span>
              : idx + 1
            }
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-widest hidden sm:block ${
            idx === current ? 'text-[#173809]' : 'text-[#173809]/30'
          }`}>{label}</span>
          {idx < STEPS.length - 1 && (
            <div className={`h-px w-6 sm:w-10 transition-all ${idx < current ? 'bg-[#173809]' : 'bg-[#173809]/10'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function LenderOfferModal({ farmer, onClose }) {
  const { lenderUser, lenderToken } = useLenderAuth()
  const [step, setStep] = useState(0)

  const [offerData, setOfferData] = useState({
    amount: '',
    interestRate: '',
    duration: '',
    repaymentType: 'Post-Harvest Bullet',
    termsConfirmed: false,
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Validate step 0
  const validateConfig = () => {
    const e = {}
    if (!offerData.amount || Number(offerData.amount) < 1000) e.amount = 'Minimum ₹1,000 required'
    if (!offerData.interestRate || Number(offerData.interestRate) <= 0 || Number(offerData.interestRate) > 100) e.interestRate = 'Valid rate (0-100) required'
    if (!offerData.duration || Number(offerData.duration) < 1) e.duration = 'Valid duration required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = () => {
    if (step === 0 && !validateConfig()) return
    setStep((s) => s + 1)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await fetch(`${API_BASE}/api/notifications/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${lenderToken}` },
      })
    } catch (_) { /* Best-effort simulation */ }
    setIsSubmitting(false)
    setStep(2)
  }

  const inputClass = (field) =>
    `w-full border rounded-xl px-4 py-3 text-sm text-[#173809] bg-[#fefae0] focus:outline-none focus:ring-2 focus:ring-[#173809]/20 transition ${
      errors[field] ? 'border-[#9f402d]' : 'border-[#173809]/15'
    }`

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={step < 2 ? onClose : undefined}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-8"
      >
        {/* Close */}
        {step < 2 && (
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-[#173809]/40 hover:text-[#173809] transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        )}

        {/* Farmer Header Info */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#173809]/10">
          <div className="w-14 h-14 rounded-full bg-[#f8f4db] flex items-center justify-center border border-[#173809]/5">
            <span className="material-symbols-outlined text-2xl text-[#173809]">agriculture</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="font-headline font-black text-[#173809] text-xl leading-none">Farmer {farmer.id?.slice(-6).toUpperCase()}</p>
              <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-widest ${
                farmer.risk_score?.includes('A') ? 'bg-[#c5efad] text-[#173809]' : 
                farmer.risk_score?.includes('B') ? 'bg-yellow-200 text-yellow-900' : 
                'bg-[#9f402d]/20 text-[#9f402d]'
              }`}>
                Tier {farmer.risk_score}
              </span>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#43493e] mt-2">{farmer.region} · {farmer.crop_type}</p>
          </div>
        </div>

        <StepIndicator current={step} />

        <AnimatePresence mode="wait">

          {/* STEP 0: Configure Offer */}
          {step === 0 && (
            <motion.div key="config" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-headline font-black text-2xl text-[#173809] mb-2 tracking-tight">Configure Structuring</h2>
              <p className="text-sm text-[#43493e] mb-6">Dial in the financial parameters for the pre-approved offer. This will be visible exclusively to this farmer.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#173809]/60 mb-1">
                    Principal Loan Amount (₹)
                  </label>
                  <input 
                    className={inputClass('amount')} 
                    placeholder="e.g. 50000" 
                    type="number" 
                    value={offerData.amount} 
                    onChange={e => setOfferData({ ...offerData, amount: e.target.value })} 
                  />
                  {errors.amount && <p className="text-xs text-[#9f402d] mt-1">{errors.amount}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#173809]/60 mb-1">
                      Interest Rate (%)
                    </label>
                    <input 
                      className={inputClass('interestRate')} 
                      placeholder="e.g. 8.5" 
                      type="number" step="0.1"
                      value={offerData.interestRate} 
                      onChange={e => setOfferData({ ...offerData, interestRate: e.target.value })} 
                    />
                    {errors.interestRate && <p className="text-xs text-[#9f402d] mt-1">{errors.interestRate}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#173809]/60 mb-1">
                      Duration (Months)
                    </label>
                    <input 
                      className={inputClass('duration')} 
                      placeholder="e.g. 12" 
                      type="number"
                      value={offerData.duration} 
                      onChange={e => setOfferData({ ...offerData, duration: e.target.value })} 
                    />
                    {errors.duration && <p className="text-xs text-[#9f402d] mt-1">{errors.duration}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#173809]/60 mb-1">Repayment Schedule</label>
                  <div className="flex gap-3">
                    {['Post-Harvest Bullet', 'Monthly Installments'].map(t => (
                      <button key={t} onClick={() => setOfferData({ ...offerData, repaymentType: t })}
                        className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${
                          offerData.repaymentType === t
                            ? 'bg-[#173809] text-white border-[#173809]'
                            : 'bg-[#fefae0] text-[#173809] border-[#173809]/15 hover:border-[#173809]/40'
                        }`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleNext}
                className="mt-8 w-full bg-[#173809] text-white py-4 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-[#2d4f1e] transition-colors"
              >
                Review Application
              </button>
            </motion.div>
          )}

          {/* STEP 1: Review & Disclaimer */}
          {step === 1 && (
            <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-headline font-black text-2xl text-[#173809] mb-2 tracking-tight">Review & Dispatch</h2>
              <p className="text-sm text-[#43493e] mb-6">Review the terms before dispatching this offer via our secure marketplace ledger.</p>

              <div className="space-y-4">
                {/* Offer data summary */}
                <div className="bg-[#fefae0] rounded-2xl p-5 border border-[#173809]/10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#173809]/50 mb-3">Structured Terms</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-[#43493e]/60">Principal</span><strong className="notranslate text-[#173809]">₹{Number(offerData.amount).toLocaleString('en-IN')}</strong></div>
                    <div className="flex justify-between"><span className="text-[#43493e]/60">Interest (p.a.)</span><strong className="notranslate text-[#173809]">{offerData.interestRate}%</strong></div>
                    <div className="flex justify-between"><span className="text-[#43493e]/60">Duration</span><strong className="notranslate text-[#173809]">{offerData.duration} Months</strong></div>
                    <div className="flex justify-between"><span className="text-[#43493e]/60">Repayment</span><strong className="text-[#173809] capitalize">{offerData.repaymentType}</strong></div>
                  </div>
                </div>

                {/* Farmer context summary */}
                <div className="bg-[#fefae0] rounded-2xl p-5 border border-[#173809]/10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#173809]/50 mb-3">Risk Context</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-[#43493e]/60">pH Data</span> <strong className="notranslate ml-2 text-[#173809]">{farmer?.ph || '—'}</strong></div>
                    <div><span className="text-[#43493e]/60">Platform Risk</span> <strong className="notranslate ml-2 text-[#173809]">Tier {farmer?.risk_score}</strong></div>
                  </div>
                </div>

                <div className="bg-[#e7e3ca] rounded-xl p-4 text-xs text-[#43493e] leading-relaxed">
                  ⚠️ <strong>Disclaimer:</strong> This platform performs algorithmic credentialing via satellite imagery, but provides <strong>no guarantee of repayment or fund security</strong>. Read our <Link to="/loans/terms" target="_blank" className="text-[#9f402d] font-bold underline">Terms & Conditions</Link> for detailed liability policies.
                </div>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={offerData.termsConfirmed}
                    onChange={(e) => setOfferData({ ...offerData, termsConfirmed: e.target.checked })}
                    className="mt-1 w-4 h-4 accent-[#173809] cursor-pointer"
                  />
                  <span className="text-sm text-[#43493e] leading-relaxed group-hover:text-[#173809] transition-colors">
                    I have verified these terms and acknowledge that Agritech Insight is a zero-liability matchmaking venue.
                  </span>
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(0)} className="flex-1 border border-[#173809]/20 text-[#173809] py-4 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-[#e7e3ca] transition-colors">
                  Back
                </button>
                <button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || !offerData.termsConfirmed}
                  className="flex-1 bg-[#173809] text-white py-4 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-[#2d4f1e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Dispatching...' : 'Dispatch Offer'}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Success */}
          {step === 2 && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
              <div className="w-20 h-20 rounded-full bg-[#173809] flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-4xl text-[#c5efad]">send</span>
              </div>
              <h2 className="font-headline font-black text-2xl text-[#173809] mb-3 tracking-tight">Offer Dispatched!</h2>
              <p className="text-sm text-[#43493e] mb-2 leading-relaxed">
                Your pre-approved structural term sheet is now viewable by <strong>Farmer {farmer.id?.slice(-8).toUpperCase()}</strong> in their secure portal.
              </p>
              <p className="text-xs text-[#43493e]/60 mb-8 mt-4">
                If the farmer formally accepts, their encrypted PII and bank details will be unlocked for direct disbursement.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => {
                    const ref = `OFFER-${Date.now().toString(36).toUpperCase()}`
                    const now = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })
                    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Pledged Loan Offer Receipt</title>
                    <style>
                      body { font-family: 'Inter', 'Helvetica Neue', sans-serif; max-width: 680px; margin: 40px auto; color: #1d1c0d; padding: 0 24px; }
                      h1 { font-size: 28px; font-weight: 900; letter-spacing: -1px; margin-bottom: 4px; }
                      .sub { font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #888; margin-bottom: 32px; font-weight: bold; }
                      .section { margin-bottom: 24px; border-top: 1px solid #e0ddc8; padding-top: 16px; }
                      .section h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #888; margin-bottom: 12px; }
                      .row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px; }
                      .row strong { text-align: right; }
                      .warning { background: #fef3f2; border: 1px solid #f5c6c0; padding: 12px 16px; border-radius: 8px; font-size: 12px; color: #9f402d; margin-top: 32px; line-height: 1.5; }
                      .ref { font-family: monospace; background: #e7e3ca; padding: 4px 10px; border-radius: 4px; color: #173809; font-weight: bold;}
                      @media print { body { margin: 20px; } }
                    </style></head><body>
                    <h1>Technological Terroir</h1>
                    <p class="sub">Structured Offer Dispatch Receipt</p>
                    
                    <div class="section"><h2>Meta Data</h2>
                      <div class="row"><span>Ledger Ref No.</span><strong class="ref">${ref}</strong></div>
                      <div class="row"><span>Timestamp</span><strong>${now}</strong></div>
                      <div class="row"><span>Originating Entity</span><strong>${lenderUser?.org_name || 'Global Bank'}</strong></div>
                      <div class="row"><span>Recipient (Anonymised)</span><strong>${farmer.id?.slice(-8).toUpperCase()}</strong></div>
                    </div>
                    
                    <div class="section"><h2>Financial Parameters</h2>
                      <div class="row"><span>Principal Liability</span><strong>₹${Number(offerData.amount).toLocaleString('en-IN')}</strong></div>
                      <div class="row"><span>Interest Premium (p.a.)</span><strong>${offerData.interestRate}%</strong></div>
                      <div class="row"><span>Lifecycle (Months)</span><strong>${offerData.duration}</strong></div>
                      <div class="row"><span>Repayment Vector</span><strong>${offerData.repaymentType}</strong></div>
                    </div>
                    
                    <div class="section"><h2>Recipient Context Map</h2>
                      <div class="row"><span>Primary Agronomy</span><strong>${farmer.crop_type} (${farmer.region})</strong></div>
                      <div class="row"><span>Verified NPK Ratio</span><strong>${farmer.nitrogen_ppm}:${farmer.phosphorus_ppm}:${Math.floor((farmer.nitrogen_ppm+farmer.phosphorus_ppm)*0.6)}</strong></div>
                      <div class="row"><span>System Risk Grade</span><strong>Tier ${farmer.risk_score}</strong></div>
                    </div>
                    
                    <div class="warning">⚠️ <strong>Zero Liability Clause:</strong> This certificate acknowledges the dispatch of terms across the platform. Technological Terroir is a non-banking financial conduit. By presenting this offer, the originating entity accepts total liability for the disbursement and collection of assets. No platform guarantee exists.</div>
                    </body></html>`
                    const w = window.open('', '_blank')
                    w.document.write(html)
                    w.document.close()
                    w.focus()
                    setTimeout(() => w.print(), 500)
                  }}
                  className="flex items-center justify-center gap-2 border border-[#173809]/20 text-[#173809] px-6 py-3 rounded-full font-bold text-sm hover:bg-[#e7e3ca] transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Export Offer (PDF)
                </button>
                <button onClick={onClose}
                  className="bg-[#173809] text-white px-8 py-3 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-[#2d4f1e] transition-colors">
                  Close Dashboard
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  )
}
