import API_BASE from "../api.js"
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PhasePersonal from '../components/onboarding/PhasePersonal'
import PhaseCredentials from '../components/onboarding/PhaseCredentials'
import PhaseGeology from '../components/onboarding/PhaseGeology'
import { useAuth } from '../context/AuthContext'

const STEPS = [
  { num: 1, label: 'Identity' },
  { num: 2, label: 'Credentials' },
  { num: 3, label: 'Soil Profile' },
]

const slide = {
  initial: { opacity: 0, y: 16 },
  in:      { opacity: 1, y: 0 },
  out:     { opacity: 0, y: -16 },
}
const slideTransition = { type: 'tween', ease: 'easeInOut', duration: 0.3 }

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    full_name: '', gender: '', title: '', email: '', phone: '', password: '',
    org_name: '', coordinates: null, focuses: [], profile_photo: '',
    soil_data: { ph: '', nitrogen: '' },
  })

  const updateData = (fields) => setFormData(prev => ({ ...prev, ...fields }))
  const handleNext = () => setStep(s => Math.min(s + 1, 3))
  const handlePrev = () => setStep(s => Math.max(s - 1, 1))

  const handleSubmit = async (finalDataPatch = {}) => {
    setIsSubmitting(true)
    setError('')
    await new Promise(r => setTimeout(r, 1200))
    try {
      const payload = { ...formData, ...finalDataPatch }
      const res = await fetch('${API_BASE}/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        if (Array.isArray(data.detail)) {
          throw new Error(data.detail.map(d => `${d.loc.at(-1)}: ${d.msg}`).join(', '))
        }
        throw new Error(data.detail || 'Registration failed')
      }
      login(data.access_token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
      setIsSubmitting(false)
    }
  }

  // ── Submitting Screen ──────────────────────────────────────────────────────
  if (isSubmitting) {
    return (
      <div className="min-h-screen bg-[#fefae0] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center px-8 max-w-sm"
        >
          <div className="w-16 h-16 rounded-full border-2 border-[#173809]/20 border-t-[#173809] animate-spin mb-8" />
          <h2 className="font-headline text-3xl font-bold text-[#173809] tracking-tight mb-3">
            Setting up your profile
          </h2>
          <p className="text-sm text-[#173809]/40 leading-relaxed">
            Calibrating soil matrices and anchoring geological baseline…
          </p>
        </motion.div>
      </div>
    )
  }

  // ── Main Layout ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#fefae0] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl bg-white rounded-[2.5rem] shadow-[0_32px_80px_rgba(23,56,9,0.08)] border border-[#173809]/5 overflow-hidden flex flex-col md:flex-row min-h-[600px]">

        {/* ── Left: Static sidebar ── */}
        <div className="w-full md:w-64 lg:w-72 bg-[#fafaf8] border-b md:border-b-0 md:border-r border-[#173809]/8 flex flex-col justify-between p-8 shrink-0">
          <div>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#173809]/40 hover:text-[#173809] transition-colors mb-10"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Back to Login
            </button>

            <h1 className="font-headline text-xl font-bold text-[#173809] tracking-tight mb-1">
              Technological Terroir
            </h1>
            <p className="text-xs text-[#173809]/40 mb-10">Field Intelligence Platform</p>

            <nav className="space-y-2">
              {STEPS.map(s => {
                const done = step > s.num
                const active = step === s.num
                return (
                  <div key={s.num} className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${active ? 'bg-[#173809] text-white' : 'text-[#173809]/40'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      done   ? 'bg-[#173809]/10 text-[#173809]' :
                      active ? 'bg-white/20 text-white' :
                               'border border-[#173809]/20 text-[#173809]/30'
                    }`}>
                      {done
                        ? <span className="material-symbols-outlined text-[13px]">check</span>
                        : s.num
                      }
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-widest ${active ? 'text-white' : done ? 'text-[#173809]/60' : 'text-[#173809]/30'}`}>
                      {s.label}
                    </span>
                  </div>
                )
              })}
            </nav>
          </div>

          {/* Progress bar */}
          <div className="mt-10">
            <div className="flex justify-between text-[10px] font-bold text-[#173809]/30 uppercase tracking-widest mb-2">
              <span>Progress</span>
              <span>{Math.round(((step - 1) / 2) * 100)}%</span>
            </div>
            <div className="h-1 bg-[#173809]/8 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#173809] rounded-full transition-all duration-500"
                style={{ width: `${((step - 1) / 2) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Right: Form area ── */}
        <div className="flex-1 p-8 md:p-12 relative overflow-hidden">
          {error && (
            <div className="mb-6 flex items-start gap-3 bg-[#9f402d]/6 border border-[#9f402d]/15 rounded-2xl px-4 py-3">
              <span className="material-symbols-outlined text-[#9f402d] text-[16px] mt-0.5 shrink-0">error</span>
              <p className="text-sm font-medium text-[#9f402d]">{error}</p>
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" variants={slide} initial="initial" animate="in" exit="out" transition={slideTransition}>
                <PhasePersonal data={formData} update={updateData} next={handleNext} />
              </motion.div>
            )}
            {step === 2 && (
              <motion.div key="s2" variants={slide} initial="initial" animate="in" exit="out" transition={slideTransition}>
                <PhaseCredentials data={formData} update={updateData} next={handleNext} prev={handlePrev} />
              </motion.div>
            )}
            {step === 3 && (
              <motion.div key="s3" variants={slide} initial="initial" animate="in" exit="out" transition={slideTransition}>
                <PhaseGeology data={formData} update={updateData} prev={handlePrev} submit={handleSubmit} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
