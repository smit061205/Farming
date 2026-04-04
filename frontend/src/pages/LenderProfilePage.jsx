import API_BASE from "../api.js"
import { useState, useEffect, useCallback } from 'react'
import LenderNavbar from '../components/LenderNavbar'
import Footer from '../components/Footer'
import { useLenderAuth } from '../context/LenderAuthContext'

export default function LenderProfilePage() {
  const { lenderUser, lenderToken } = useLenderAuth()

  // Original values fetched from server
  const [original, setOriginal] = useState(null)

  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [repName, setRepName] = useState('')
  const [title, setTitle] = useState('')
  const [profilePhoto, setProfilePhoto] = useState('')

  const [notificationPrefs, setNotificationPrefs] = useState({
    new_loan_matches: true,
    portfolio_risk_alerts: true,
  })
  
  const [saved, setSaved] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [testEmailSent, setTestEmailSent] = useState(false)

  const hydrate = useCallback((data) => {
    setOrgName(data.org_name || '')
    setEmail(data.email || '')
    setRepName(data.full_name || '') // Full name acts as rep name for lenders
    setTitle(data.title || '')
    setProfilePhoto(data.profile_photo || '')
    if (data.notification_prefs) {
      setNotificationPrefs({
        new_loan_matches: data.notification_prefs.new_loan_matches ?? true,
        portfolio_risk_alerts: data.notification_prefs.portfolio_risk_alerts ?? true
      })
    }
  }, [])

  // Fetch latest full profile
  useEffect(() => {
    if (!lenderToken) return
    fetch(`${API_BASE}/api/users/me`, {
      headers: { Authorization: `Bearer ${lenderToken}` }
    })
      .then(r => r.json())
      .then(data => {
        setOriginal(data)
        hydrate(data)
      })
      .catch(console.error)
  }, [lenderToken, hydrate])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaveLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${lenderToken}`
        },
        body: JSON.stringify({
          org_name: orgName,
          email,
          full_name: repName,
          title,
          profile_photo: profilePhoto,
          notification_prefs: notificationPrefs,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      console.error(err)
    } finally {
      setSaveLoading(false)
    }
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => setProfilePhoto(reader.result)
    reader.readAsDataURL(file)
  }

  const avatarInitial = orgName ? orgName.charAt(0).toUpperCase() : (repName ? repName.charAt(0).toUpperCase() : 'G')

  return (
    <div className="bg-[#fefae0] text-[#1d1c0d] min-h-screen overflow-x-hidden flex flex-col">
      <LenderNavbar activeLink="profile" />

      <main className="pt-32 pb-24 px-6 md:px-12 max-w-[1440px] mx-auto flex-1 w-full">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">

          {/* ── Left Column ── */}
          <div className="md:col-span-4 flex flex-col gap-8">

            {/* Profile Avatar Card */}
            <div
              className="bg-[#e7e3ca] rounded-[2rem] p-8 flex flex-col items-center text-center relative overflow-hidden"
              style={{ boxShadow: '0 20px 40px rgba(29, 28, 13, 0.06)' }}
            >
              <div className="absolute -top-10 -right-10 opacity-5 font-headline text-9xl select-none">ID</div>

              {/* Clickable avatar */}
              <label className="relative w-40 h-40 rounded-full mb-6 ring-offset-4 ring-2 ring-[#173809] cursor-pointer overflow-hidden group flex-shrink-0">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#173809] flex items-center justify-center">
                    <span className="font-headline text-6xl font-black text-[#c5efad]">{avatarInitial}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-[#173809]/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                  <span className="material-symbols-outlined text-white text-2xl">photo_camera</span>
                  <span className="text-white text-[10px] font-label uppercase tracking-widest">Change</span>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>

              <h1 className="font-headline text-3xl font-bold tracking-tight text-[#173809]">
                {orgName || 'Global Bank Demo'}
              </h1>
              <p className="text-[#9f402d] font-medium tracking-wide mt-1">
                Lender Account
              </p>
            </div>

            {/* Email Notifications */}
            <div className="bg-[#f8f4db] rounded-[2rem] p-8" style={{ boxShadow: '0 20px 40px rgba(29, 28, 13, 0.06)' }}>
              <h3 className="font-headline text-xl font-bold mb-2 text-[#173809]">Email Notifications</h3>
              <p className="text-xs text-[#43493e]/60 font-body mb-6">Alerts are sent to <strong>{email || 'your email'}</strong></p>
              <div className="space-y-5">

                {/* New Loan Matches */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-body text-sm font-bold text-[#43493e]">Application Matches</p>
                    <p className="text-xs text-[#43493e]/50 mt-0.5">Receive alerts when a farmer expresses interest in your specific loan products.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotificationPrefs(p => ({ ...p, new_loan_matches: !p.new_loan_matches }))}
                    className="flex-shrink-0 mt-1"
                  >
                    <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${notificationPrefs.new_loan_matches ? 'bg-[#173809]' : 'bg-[#c3c8bb]'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${notificationPrefs.new_loan_matches ? 'translate-x-6' : ''}`}></div>
                    </div>
                  </button>
                </div>

                {/* Risk Alerts */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-body text-sm font-bold text-[#43493e]">Portfolio Risk Alerts</p>
                    <p className="text-xs text-[#43493e]/50 mt-0.5">Biweekly satellite digest of extreme weather anomalies affecting your connected farmers.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotificationPrefs(p => ({ ...p, portfolio_risk_alerts: !p.portfolio_risk_alerts }))}
                    className="flex-shrink-0 mt-1"
                  >
                    <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${notificationPrefs.portfolio_risk_alerts ? 'bg-[#173809]' : 'bg-[#c3c8bb]'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${notificationPrefs.portfolio_risk_alerts ? 'translate-x-6' : ''}`}></div>
                    </div>
                  </button>
                </div>

              </div>

              {/* Test Email */}
              <div className="mt-6 pt-5 border-t border-[#173809]/10">
                <button
                  type="button"
                  disabled={testEmailSent}
                  onClick={async () => {
                    try {
                      await fetch(`${API_BASE}/api/notifications/test`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${lenderToken}` }
                      })
                      setTestEmailSent(true)
                      setTimeout(() => setTestEmailSent(false), 4000)
                    } catch(e) { console.error(e) }
                  }}
                  className="w-full flex items-center justify-center gap-2 text-xs font-label font-bold uppercase tracking-widest text-[#173809]/60 hover:text-[#173809] transition-colors py-3 disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  {testEmailSent ? 'Test Alert Sent! Check your inbox.' : 'Send Test Alert Email'}
                </button>
              </div>
            </div>
          </div>

          {/* ── Right Column ── */}
          <div className="md:col-span-8">
            <div
              className="bg-white rounded-[3rem] p-10 md:p-14 relative"
              style={{ boxShadow: '0 20px 40px rgba(29, 28, 13, 0.04)' }}
            >
              <div className="absolute top-0 right-0 p-10 opacity-5 font-headline text-[12rem] leading-none pointer-events-none select-none text-[#173809]">ORG</div>

              <header className="mb-12 relative z-10">
                <h2 className="font-headline text-4xl font-bold text-[#173809] mb-2">Institutional Orchestration</h2>
                <p className="font-body text-lg text-[#43493e] max-w-lg">
                  Calibrate your institutional profile to connect with verified agribusinesses.
                </p>
              </header>

              {saved && (
                <div className="mb-6 bg-[#c5efad]/40 border border-[#173809]/20 text-[#173809] px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-3 z-10 relative">
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Profile saved successfully!
                </div>
              )}

              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 relative z-10">
                
                {/* Institutional Info Header */}
                <div className="md:col-span-2">
                  <h3 className="font-headline text-xl font-bold text-[#173809] flex items-center gap-3 mb-2">
                    <span className="material-symbols-outlined">account_balance</span>
                    Institution Details
                  </h3>
                </div>

                {/* Org Name */}
                <div className="space-y-2">
                  <label className="font-label text-xs uppercase tracking-widest text-[#173809] font-bold px-4">Corporate Entity Name</label>
                  <input
                    className="w-full bg-[#f8f4db] rounded-full px-6 py-4 border-none focus:outline-none focus:bg-[#e7e3ca] transition-colors font-body text-[#1d1c0d]"
                    type="text"
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-2">
                  <label className="font-label text-xs uppercase tracking-widest text-[#173809] font-bold px-4">Entity Email Designation</label>
                  <input
                    className="w-full bg-[#f8f4db] rounded-full px-6 py-4 border-none focus:outline-none focus:bg-[#e7e3ca] transition-colors font-body text-[#1d1c0d]"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                {/* Point of Contact Header */}
                <div className="md:col-span-2 mt-4border-t border-[#173809]/10 pt-6">
                  <h3 className="font-headline text-xl font-bold text-[#173809] flex items-center gap-3 mb-2">
                    <span className="material-symbols-outlined">person</span>
                    Point of Contact
                  </h3>
                </div>

                {/* Rep Name */}
                <div className="space-y-2">
                  <label className="font-label text-xs uppercase tracking-widest text-[#173809] font-bold px-4">Representative Name</label>
                  <input
                    className="w-full bg-[#f8f4db] rounded-full px-6 py-4 border-none focus:outline-none focus:bg-[#e7e3ca] transition-colors font-body text-[#1d1c0d]"
                    type="text"
                    value={repName}
                    onChange={e => setRepName(e.target.value)}
                  />
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <label className="font-label text-xs uppercase tracking-widest text-[#173809] font-bold px-4">Financial Designation Title</label>
                  <input
                    className="w-full bg-[#f8f4db] rounded-full px-6 py-4 border-none focus:outline-none focus:bg-[#e7e3ca] transition-colors font-body text-[#1d1c0d]"
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Head of Agri-Lending"
                  />
                </div>

                {/* Actions */}
                <div className="md:col-span-2 mt-10 flex justify-end">
                  <button
                    className="w-full md:w-auto bg-[#173809] text-white font-label font-bold px-12 py-5 rounded-full transition-all active:scale-95 hover:bg-[#2d4f1e] relative overflow-hidden group shadow-xl disabled:opacity-50"
                    type="submit"
                    disabled={saveLoading}
                  >
                    <span className="relative z-10 text-lg uppercase tracking-widest font-headline">
                      {saveLoading ? 'Saving...' : 'Save Orchestration'}
                    </span>
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
