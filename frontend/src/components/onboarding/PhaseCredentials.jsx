import API_BASE from "../../api.js"
import { useState } from 'react'

export default function PhaseCredentials({ data, update, next, prev }) {
  const [emailError, setEmailError]     = useState('')
  const [phoneError, setPhoneError]     = useState('')
  const [checking, setChecking]         = useState(false)
  const [confirmPw, setConfirmPw]       = useState('')
  const [pwError, setPwError]           = useState('')
  const [showPw, setShowPw]             = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)

  const checkEmail = async () => {
    setEmailError('')
    if (!data.email) return
    setChecking(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/check-email?email=${encodeURIComponent(data.email)}`)
      const r = await res.json()
      if (r.exists) setEmailError('An account with this email already exists.')
    } catch {}
    finally { setChecking(false) }
  }

  const validatePhone = (val) => {
    if (!val) return '' // optional
    const digits = val.replace(/[\s\-\(\)]/g, '')
    if (!/^(\+91)?[6-9]\d{9}$/.test(digits)) return 'Enter a valid 10-digit Indian mobile number.'
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // At least one identifier must be provided
    if (!data.email && !data.phone) {
      setPhoneError('Please provide at least an email address or a mobile number.')
      return
    }
    // Validate phone format if provided
    const pErr = validatePhone(data.phone || '')
    if (pErr) { setPhoneError(pErr); return }
    if (data.password.length < 8) { setPwError('Password must be at least 8 characters.'); return }
    if (data.password !== confirmPw) { setPwError('Passwords do not match.'); return }
    setPwError('')
    
    setChecking(true)
    try {
      if (data.email) {
        const res = await fetch(`${API_BASE}/api/auth/check-email?email=${encodeURIComponent(data.email)}`)
        const r = await res.json()
        if (r.exists) {
          setEmailError('An account with this email already exists.')
          setChecking(false)
          return
        }
      }
    } catch (err) {
      console.error(err)
    }
    setChecking(false)
    next()
  }

  const inputClass = (hasError) =>
    `w-full bg-[#fafaf8] border rounded-xl px-5 py-3.5 text-base font-medium text-[#173809] focus:outline-none transition-colors placeholder:text-[#173809]/25 ${
      hasError ? 'border-[#9f402d]/40 bg-[#9f402d]/3' : 'border-[#173809]/10 focus:border-[#173809]/25'
    }`

  return (
    <div className="flex flex-col h-full">
      <div className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#173809]/30 mb-2">Step 2 of 3</p>
        <h2 className="font-headline text-3xl font-bold text-[#173809] tracking-tight">Credentials</h2>
        <p className="text-sm text-[#173809]/50 mt-1">Secure your account. Use an email <em>or</em> a mobile number — whichever you have.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 flex-1">

        {/* Email */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#173809]/40 mb-2">
            Email Address <span className="normal-case font-normal text-[#173809]/30">(optional if you have a phone)</span>
          </label>
          <div className="relative">
            <input
              autoFocus type="email"
              value={data.email || ''}
              onChange={e => { update({ email: e.target.value }); setEmailError('') }}
              onBlur={checkEmail}
              placeholder="you@example.com"
              className={inputClass(!!emailError)}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[18px]">
              {checking
                ? <span className="material-symbols-outlined text-[#173809]/30 animate-spin text-[18px]">progress_activity</span>
                : !emailError && data.email
                ? <span className="material-symbols-outlined text-[#173809]/50 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                : null
              }
            </span>
          </div>
          {emailError && <p className="mt-1.5 ml-1 text-xs font-medium text-[#9f402d]">{emailError}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#173809]/40 mb-2">
            Mobile Number <span className="normal-case font-normal text-[#173809]/30">(optional if you have an email)</span>
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-4 text-sm font-bold text-[#173809]/40 pointer-events-none">+91</span>
            <input
              type="tel" inputMode="numeric" maxLength={10}
              value={data.phone || ''}
              onChange={e => { update({ phone: e.target.value.replace(/\D/g, '') }); setPhoneError('') }}
              placeholder="98765 43210"
              className={`${inputClass(!!phoneError)} pl-12`}
            />
          </div>
          {phoneError && <p className="mt-1.5 ml-1 text-xs font-medium text-[#9f402d]">{phoneError}</p>}
        </div>

        {/* Password */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#173809]/40 mb-2">Password <span className="normal-case font-normal">(min 8 chars)</span></label>
          <div className="relative">
            <input
              required autoComplete="new-password"
              type={showPw ? 'text' : 'password'}
              value={data.password}
              onChange={e => { update({ password: e.target.value }); setPwError('') }}
              placeholder="••••••••"
              className={inputClass(false)}
            />
            <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#173809]/30 hover:text-[#173809]/60 transition-colors">
              <span className="material-symbols-outlined text-[18px]">{showPw ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
        </div>

        {/* Confirm */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#173809]/40 mb-2">Confirm Password</label>
          <div className="relative">
            <input
              required autoComplete="new-password"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPw}
              onChange={e => { setConfirmPw(e.target.value); setPwError('') }}
              placeholder="••••••••"
              className={inputClass(!!pwError)}
            />
            <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#173809]/30 hover:text-[#173809]/60 transition-colors">
              <span className="material-symbols-outlined text-[18px]">{showConfirm ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
          {pwError && <p className="mt-1.5 ml-1 text-xs font-medium text-[#9f402d]">{pwError}</p>}
        </div>

        <div className="pt-4 flex gap-3">
          <button type="button" onClick={prev} className="bg-[#fafaf8] border border-[#173809]/10 text-[#173809] rounded-xl px-5 py-4 font-bold hover:bg-[#f0ede0] active:scale-95 transition-all flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <button
            type="submit"
            disabled={!!emailError || checking}
            className="flex-1 bg-[#173809] text-white rounded-xl py-4 font-bold text-sm uppercase tracking-widest hover:bg-[#2d4f1e] active:scale-[0.99] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
            <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
        </div>
      </form>
    </div>
  )
}
