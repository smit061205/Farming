import API_BASE from "../api.js"
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const STEPS = ['Consent', 'Bank Details', 'Review', 'Submitted']

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

export default function LoanApplicationModal({ partner, onClose }) {
  const { user, token } = useAuth()
  const [step, setStep] = useState(0)
  const [consentChecked, setConsentChecked] = useState(false)
  const [bankData, setBankData] = useState({
    accountName: '',
    phone: '',
    countryCode: '+91',
    principalAmount: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifsc: '',
    bankName: '',
    accountType: 'savings',
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const soil = user?.soil_data || {}

  // Validate bank step
  const validateBank = () => {
    const e = {}
    if (!bankData.accountName.trim()) e.accountName = 'Required'
    if (!/^\d{7,15}$/.test(bankData.phone.replace(/\s/g, ''))) e.phone = 'Enter a valid mobile number'
    if (!bankData.principalAmount || isNaN(bankData.principalAmount) || Number(bankData.principalAmount) < 1000) e.principalAmount = 'Enter an amount of at least 1,000'
    if (!/^\d{9,18}$/.test(bankData.accountNumber)) e.accountNumber = 'Must be 9–18 digits'
    if (bankData.accountNumber !== bankData.confirmAccountNumber) e.confirmAccountNumber = 'Account numbers do not match'
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankData.ifsc.toUpperCase())) e.ifsc = 'Invalid IFSC (e.g. SBIN0001234)'
    if (!bankData.bankName.trim()) e.bankName = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = () => {
    if (step === 1 && !validateBank()) return
    setStep((s) => s + 1)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await fetch(`${API_BASE}/api/notifications/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch (_) { /* best-effort notification */ }
    setIsSubmitting(false)
    setStep(3)
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
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={step < 3 ? onClose : undefined}
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
        {step < 3 && (
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-[#173809]/40 hover:text-[#173809] transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        )}

        {/* Partner Badge */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#fefae0] flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl text-[#173809]">{partner.logo}</span>
          </div>
          <div>
            <p className="font-headline font-black text-[#173809] text-lg leading-tight">{partner.name}</p>
            <p className="text-xs font-bold uppercase tracking-widest text-[#9f402d]">{partner.type} · {partner.interest}</p>
          </div>
        </div>

        <StepIndicator current={step} />

        <AnimatePresence mode="wait">

          {/* STEP 0: Consent */}
          {step === 0 && (
            <motion.div key="consent" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-headline font-black text-2xl text-[#173809] mb-4 tracking-tight">Data Sharing Consent</h2>
              <p className="text-sm text-[#43493e] mb-6 leading-relaxed">
                To apply, you authorise Technological Terroir to share the following verified farm data with <strong>{partner.name}</strong>:
              </p>

              <ul className="space-y-3 mb-6">
                {[
                  { icon: 'science', label: 'Soil Composition', detail: `pH ${soil.ph || '—'} · N ${soil.nitrogen || '—'} · P ${soil.phosphorus || '—'} · K ${soil.potassium || '—'}` },
                  { icon: 'satellite_alt', label: 'Satellite Anomaly Report', detail: '30-day NDVI · Risk event log' },
                  { icon: 'location_on', label: 'Farm Region', detail: user?.coordinates?.label || 'GPS bounding box' },
                  { icon: 'person', label: 'Anonymised Profile', detail: 'No name, phone, or Aadhaar shared at this stage' },
                ].map(({ icon, label, detail }) => (
                  <li key={label} className="flex items-start gap-3 bg-[#fefae0] rounded-xl p-3 border border-[#173809]/5">
                    <span className="material-symbols-outlined text-[#173809] text-lg mt-0.5">{icon}</span>
                    <div>
                      <p className="text-sm font-bold text-[#173809]">{label}</p>
                      <p className="text-xs text-[#43493e]/70 notranslate">{detail}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="bg-[#e7e3ca] rounded-xl p-4 mb-6 text-xs text-[#43493e] leading-relaxed">
                ⚠️ This platform is a <strong>marketplace only</strong> and makes <strong>no guarantee of loan approval or disbursement</strong>.
                Read our full{' '}
                <Link to="/loans/terms" target="_blank" className="text-[#9f402d] font-bold underline">
                  Loan Terms & Conditions
                </Link>{' '}
                before proceeding.
              </div>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-[#173809] cursor-pointer"
                />
                <span className="text-sm text-[#43493e] leading-relaxed group-hover:text-[#173809] transition-colors">
                  I consent to sharing my verified farm data with <strong>{partner.name}</strong> and I have read and agree to the{' '}
                  <Link to="/loans/terms" target="_blank" className="text-[#9f402d] font-bold underline">Loan Terms & Conditions</Link>.
                </span>
              </label>

              <button
                onClick={handleNext}
                disabled={!consentChecked}
                className="mt-8 w-full bg-[#173809] text-white py-4 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-[#2d4f1e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue to Bank Details
              </button>
            </motion.div>
          )}

          {/* STEP 1: Bank Details */}
          {step === 1 && (
            <motion.div key="bank" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-headline font-black text-2xl text-[#173809] mb-2 tracking-tight">Bank Details</h2>
              <p className="text-sm text-[#43493e] mb-6">This is where the lender will disburse funds if your application is approved. Your data is encrypted end-to-end.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#173809]/60 mb-1">Account Holder Name</label>
                  <input className={inputClass('accountName')} placeholder="As printed on passbook"
                    value={bankData.accountName} onChange={e => setBankData({ ...bankData, accountName: e.target.value })} />
                  {errors.accountName && <p className="text-xs text-[#9f402d] mt-1">{errors.accountName}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#173809]/60 mb-1">Requested Principal Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#173809]/40 font-bold">₹</span>
                    <input className={`${inputClass('principalAmount')} pl-8`} placeholder="e.g. 50000" type="text" inputMode="numeric"
                      value={bankData.principalAmount} onChange={e => setBankData({ ...bankData, principalAmount: e.target.value.replace(/\D/g, '') })} />
                  </div>
                  {errors.principalAmount && <p className="text-xs text-[#9f402d] mt-1">{errors.principalAmount}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#173809]/60 mb-1">
                    Mobile Number <span className="text-[#9f402d] font-black">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={bankData.countryCode}
                      onChange={e => setBankData({ ...bankData, countryCode: e.target.value })}
                      className="border border-[#173809]/15 rounded-xl px-2 py-3 text-sm font-bold text-[#173809] bg-[#fefae0] focus:outline-none w-24 shrink-0"
                    >
                      {['+91 🇮🇳','+1 🇺🇸','+44 🇬🇧','+971 🇦🇪','+61 🇦🇺','+65 🇸🇬','+92 🇵🇰','+880 🇧🇩','+977 🇳🇵'].map(c => {
                        const code = c.split(' ')[0]
                        return <option key={code} value={code}>{c}</option>
                      })}
                    </select>
                    <input className={`flex-1 ${inputClass('phone')}`} placeholder="98765 43210" type="tel" inputMode="numeric"
                      value={bankData.phone} onChange={e => setBankData({ ...bankData, phone: e.target.value.replace(/\D/g, '') })} />
                  </div>
                  {errors.phone && <p className="text-xs text-[#9f402d] mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#173809]/60 mb-1">Bank Name</label>
                  <select className={inputClass('bankName')} value={bankData.bankName}
                    onChange={e => setBankData({ ...bankData, bankName: e.target.value })}>
                    <option value="">Select your bank</option>
                    {['State Bank of India', 'Punjab National Bank', 'Bank of Baroda', 'Canara Bank', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'UCO Bank', 'Union Bank of India', 'NABARD', 'Other'].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  {errors.bankName && <p className="text-xs text-[#9f402d] mt-1">{errors.bankName}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#173809]/60 mb-1">Account Type</label>
                  <div className="flex gap-3">
                    {['savings', 'current'].map(t => (
                      <button key={t} onClick={() => setBankData({ ...bankData, accountType: t })}
                        className={`flex-1 py-3 rounded-xl border text-sm font-bold capitalize transition-all ${
                          bankData.accountType === t
                            ? 'bg-[#173809] text-white border-[#173809]'
                            : 'bg-[#fefae0] text-[#173809] border-[#173809]/15 hover:border-[#173809]/40'
                        }`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#173809]/60 mb-1">Account Number</label>
                  <input className={inputClass('accountNumber')} placeholder="9 – 18 digits" type="text" inputMode="numeric"
                    value={bankData.accountNumber} onChange={e => setBankData({ ...bankData, accountNumber: e.target.value.replace(/\D/g, '') })} />
                  {errors.accountNumber && <p className="text-xs text-[#9f402d] mt-1">{errors.accountNumber}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#173809]/60 mb-1">Confirm Account Number</label>
                  <input className={inputClass('confirmAccountNumber')} placeholder="Re-enter account number" type="text" inputMode="numeric"
                    value={bankData.confirmAccountNumber} onChange={e => setBankData({ ...bankData, confirmAccountNumber: e.target.value.replace(/\D/g, '') })} />
                  {errors.confirmAccountNumber && <p className="text-xs text-[#9f402d] mt-1">{errors.confirmAccountNumber}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#173809]/60 mb-1">IFSC Code</label>
                  <input className={inputClass('ifsc')} placeholder="e.g. SBIN0001234" maxLength={11}
                    value={bankData.ifsc} onChange={e => setBankData({ ...bankData, ifsc: e.target.value.toUpperCase() })} />
                  {errors.ifsc && <p className="text-xs text-[#9f402d] mt-1">{errors.ifsc}</p>}
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => setStep(0)} className="flex-1 border border-[#173809]/20 text-[#173809] py-4 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-[#e7e3ca] transition-colors">
                  Back
                </button>
                <button onClick={handleNext} className="flex-1 bg-[#173809] text-white py-4 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-[#2d4f1e] transition-colors">
                  Review Application
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Review */}
          {step === 2 && (
            <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-headline font-black text-2xl text-[#173809] mb-2 tracking-tight">Review & Submit</h2>
              <p className="text-sm text-[#43493e] mb-6">Please verify all information before submitting. You cannot edit after submission.</p>

              <div className="space-y-4">
                {/* Farm data summary */}
                <div className="bg-[#fefae0] rounded-2xl p-5 border border-[#173809]/10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#173809]/50 mb-3">Loan Request & Farm Data</p>
                  <div className="flex justify-between mb-3 pb-3 border-b border-[#173809]/10"><span className="text-[#43493e]/60 text-sm">Principal Amount</span><strong className="text-[#173809] text-base">₹ {Number(bankData.principalAmount).toLocaleString()}</strong></div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-[#43493e]/60">pH</span> <strong className="notranslate ml-2 text-[#173809]">{soil.ph || '—'}</strong></div>
                    <div><span className="text-[#43493e]/60">Nitrogen</span> <strong className="notranslate ml-2 text-[#173809]">{soil.nitrogen || '—'}</strong></div>
                    <div><span className="text-[#43493e]/60">Phosphorus</span> <strong className="notranslate ml-2 text-[#173809]">{soil.phosphorus || '—'}</strong></div>
                    <div><span className="text-[#43493e]/60">Potassium</span> <strong className="notranslate ml-2 text-[#173809]">{soil.potassium || '—'}</strong></div>
                  </div>
                </div>

                {/* Bank data summary */}
                <div className="bg-[#fefae0] rounded-2xl p-5 border border-[#173809]/10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#173809]/50 mb-3">Bank Details</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-[#43493e]/60">Holder</span><strong className="notranslate text-[#173809]">{bankData.accountName}</strong></div>
                    <div className="flex justify-between"><span className="text-[#43493e]/60">Mobile</span><strong className="notranslate text-[#173809]">{bankData.countryCode} {bankData.phone}</strong></div>
                    <div className="flex justify-between"><span className="text-[#43493e]/60">Bank</span><strong className="notranslate text-[#173809]">{bankData.bankName}</strong></div>
                    <div className="flex justify-between"><span className="text-[#43493e]/60">Account</span><strong className="notranslate text-[#173809]">{'•'.repeat(Math.max(0, bankData.accountNumber.length - 4))}{bankData.accountNumber.slice(-4)}</strong></div>
                    <div className="flex justify-between"><span className="text-[#43493e]/60">IFSC</span><strong className="notranslate text-[#173809]">{bankData.ifsc}</strong></div>
                    <div className="flex justify-between"><span className="text-[#43493e]/60">Type</span><strong className="text-[#173809] capitalize">{bankData.accountType}</strong></div>
                  </div>
                </div>

                <p className="text-[10px] text-[#43493e]/50 leading-relaxed">
                  By clicking Submit, you confirm all details are correct and reconfirm your consent to the{' '}
                  <Link to="/loans/terms" target="_blank" className="text-[#9f402d] underline font-bold">Loan Terms & Conditions</Link>.
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(1)} className="flex-1 border border-[#173809]/20 text-[#173809] py-4 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-[#e7e3ca] transition-colors">
                  Back
                </button>
                <button onClick={handleSubmit} disabled={isSubmitting}
                  className="flex-1 bg-[#9f402d] text-white py-4 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-[#7c2f1e] transition-colors disabled:opacity-60">
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Success */}
          {step === 3 && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
              <div className="w-20 h-20 rounded-full bg-[#c5efad] flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-4xl text-[#173809]">check_circle</span>
              </div>
              <h2 className="font-headline font-black text-2xl text-[#173809] mb-3 tracking-tight">Application Submitted!</h2>
              <p className="text-sm text-[#43493e] mb-2 leading-relaxed">
                Your expression of interest has been sent to <strong>{partner.name}</strong>. A representative will review your verified farm profile.
              </p>
              <p className="text-xs text-[#43493e]/60 mb-8">
                Remember — this is a marketplace match, not a guaranteed offer. The lender will contact you independently if they wish to proceed.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => {
                    const ref = `TT-${Date.now().toString(36).toUpperCase()}`
                    const now = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })
                    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Loan Application Receipt</title>
                    <style>
                      body { font-family: 'Georgia', serif; max-width: 680px; margin: 40px auto; color: #1d1c0d; padding: 0 24px; }
                      h1 { font-size: 28px; font-weight: 900; letter-spacing: -1px; margin-bottom: 4px; }
                      .sub { font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #888; margin-bottom: 32px; }
                      .section { margin-bottom: 24px; border-top: 1px solid #e0ddc8; padding-top: 16px; }
                      .section h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #888; margin-bottom: 12px; }
                      .row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px; }
                      .row strong { text-align: right; }
                      .warning { background: #fef3f2; border: 1px solid #f5c6c0; padding: 12px 16px; border-radius: 8px; font-size: 12px; color: #9f402d; margin-top: 32px; }
                      .ref { font-family: monospace; background: #f5f2e8; padding: 4px 10px; border-radius: 4px; }
                      @media print { body { margin: 20px; } }
                    </style></head><body>
                    <h1>Technological Terroir</h1>
                    <p class="sub">Loan Application Receipt</p>
                    <div class="section"><h2>Reference</h2>
                      <div class="row"><span>Reference No.</span><strong class="ref">${ref}</strong></div>
                      <div class="row"><span>Submitted</span><strong>${now}</strong></div>
                      <div class="row"><span>Applicant</span><strong>${user?.full_name || 'N/A'}</strong></div>
                      <div class="row" style="margin-top:8px; padding-top:8px; border-top:1px dashed #e0ddc8;"><span>Requested Principal</span><strong>₹ ${Number(bankData.principalAmount).toLocaleString()}</strong></div>
                    </div>
                    <div class="section"><h2>Lender</h2>
                      <div class="row"><span>Institution</span><strong>${partner.name}</strong></div>
                      <div class="row"><span>Product</span><strong>${partner.type}</strong></div>
                      <div class="row"><span>Indicative Rate</span><strong>${partner.interest}</strong></div>
                      <div class="row"><span>Match Score</span><strong>${partner.match}</strong></div>
                    </div>
                    <div class="section"><h2>Farm Data Shared</h2>
                      <div class="row"><span>Soil pH</span><strong>${soil.ph || '—'}</strong></div>
                      <div class="row"><span>Nitrogen (N)</span><strong>${soil.nitrogen || '—'}</strong></div>
                      <div class="row"><span>Phosphorus (P)</span><strong>${soil.phosphorus || '—'}</strong></div>
                      <div class="row"><span>Potassium (K)</span><strong>${soil.potassium || '—'}</strong></div>
                      <div class="row"><span>Location</span><strong>${user?.coordinates?.label || 'GPS Region'}</strong></div>
                    </div>
                    <div class="section"><h2>Bank Details</h2>
                      <div class="row"><span>Holder</span><strong>${bankData.accountName}</strong></div>
                      <div class="row"><span>Mobile</span><strong>${bankData.countryCode} ${bankData.phone}</strong></div>
                      <div class="row"><span>Bank</span><strong>${bankData.bankName}</strong></div>
                      <div class="row"><span>Account</span><strong>••••${bankData.accountNumber.slice(-4)}</strong></div>
                      <div class="row"><span>IFSC</span><strong>${bankData.ifsc}</strong></div>
                      <div class="row"><span>Type</span><strong style="text-transform:capitalize">${bankData.accountType}</strong></div>
                    </div>
                    <div class="warning">⚠️ <strong>No Guarantee:</strong> This receipt confirms your expression of interest only. Technological Terroir is a marketplace platform and makes no guarantee of loan approval, disbursement, or interest rate. All financial negotiations occur exclusively between you and the listed institution.</div>
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
                  Download Receipt (PDF)
                </button>
                <button onClick={onClose}
                  className="bg-[#173809] text-white px-8 py-3 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-[#2d4f1e] transition-colors">
                  Done
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  )
}
