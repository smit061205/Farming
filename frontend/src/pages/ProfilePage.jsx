import API_BASE from "../api.js"
import { useState, useEffect, useCallback } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import MapPicker from '../components/onboarding/MapPicker'

export default function ProfilePage() {
  const { user, token } = useAuth()

  // Original values fetched from server — used by "Reset to Default"
  const [original, setOriginal] = useState(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [orgName, setOrgName] = useState('')
  const [coordinates, setCoordinates] = useState(null)
  const [title, setTitle] = useState('')
  const [focuses, setFocuses] = useState([])
  const [soilData, setSoilData] = useState({})
  const [profilePhoto, setProfilePhoto] = useState('')

  const [notificationPrefs, setNotificationPrefs] = useState({
    satellite_alerts: true,
    biweekly_reports: true,
  })
  const [saved, setSaved] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [soilError, setSoilError] = useState('')
  const [testEmailSent, setTestEmailSent] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)

  const hydrate = useCallback((data) => {
    setFullName(data.full_name || '')
    setEmail(data.email || '')
    setOrgName(data.org_name || '')
    
    // Coordinates standard object
    if (data.coordinates && typeof data.coordinates === 'object') {
      setCoordinates(data.coordinates)
    } else if (typeof data.coordinates === 'string') {
      setCoordinates({ label: data.coordinates })
    } else {
      setCoordinates(null)
    }
    
    setTitle(data.title || '')
    setFocuses(data.focuses || [])
    setSoilData(data.soil_data || {})
    setProfilePhoto(data.profile_photo || '')
    if (data.notification_prefs) {
      setNotificationPrefs(data.notification_prefs)
    }
  }, [])

  // Fetch latest full profile directly from API on mount
  const fetchUserProfile = useCallback(() => {
    if (!token) return
    fetch(`${API_BASE}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        setOriginal(data)
        hydrate(data)
      })
  }, [token, hydrate])

  useEffect(() => {
    fetchUserProfile()
  }, [fetchUserProfile])

  // Validate soil data before saving
  const validateSoil = () => {
    if (soilData.ph !== '' && soilData.ph !== undefined) {
      const ph = parseFloat(soilData.ph)
      if (isNaN(ph) || ph < 0 || ph > 14) {
        setSoilError('pH must be between 0 and 14')
        return false
      }
    }
    if (soilData.nitrogen !== '' && soilData.nitrogen !== undefined) {
      const n = parseFloat(soilData.nitrogen)
      if (isNaN(n) || n < 0 || n > 1000) {
        setSoilError('Nitrogen must be between 0 and 1000 ppm')
        return false
      }
    }
    setSoilError('')
    return true
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!validateSoil()) return
    setSaveLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          org_name: orgName,
          coordinates,
          title,
          focuses,
          soil_data: soilData,
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

  const handleReset = () => {
    if (original) hydrate(original)
    setSoilError('')
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => setProfilePhoto(reader.result)
    reader.readAsDataURL(file)
  }

  const removeTag = (tag) => setFocuses(prev => prev.filter(f => f !== tag))
  
  const handleReportUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsExtracting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${API_BASE}/api/engine/ocr-soil-report`, {
        method: 'POST',
        body: formData
      })
      
      const result = await res.json()
      if (!res.ok) throw new Error(result.detail || "Extraction failed")
      
      // Auto-populate the form inputs with extracted values
      setSoilData(prev => ({
        ...prev,
        ph: result.data.ph !== null ? result.data.ph.toString() : prev.ph || '',
        nitrogen: result.data.nitrogen_ppm !== null ? result.data.nitrogen_ppm.toString() : prev.nitrogen || '',
        phosphorus: result.data.phosphorus_ppm !== null ? result.data.phosphorus_ppm.toString() : prev.phosphorus || '',
        potassium: result.data.potassium_ppm !== null ? result.data.potassium_ppm.toString() : prev.potassium || '',
        organic_matter_pct: result.data.organic_matter_pct !== null ? result.data.organic_matter_pct.toString() : prev.organic_matter_pct || ''
      }))
      
      alert("Soil Lab Report Extracted! Please verify the numbers and click 'Save Profile'.")
    } catch (err) {
      console.error(err)
      alert("Failed to process report: " + err.message)
    } finally {
      setIsExtracting(false)
    }
  }

  const avatarInitial = fullName ? fullName.charAt(0).toUpperCase() : '?'

  return (
    <div className="bg-[#fefae0] text-[#1d1c0d] min-h-screen overflow-x-hidden flex flex-col">
      <Navbar activeLink="profile" />

      <main className="pt-32 pb-24 px-6 md:px-12 max-w-[1440px] mx-auto flex-1 w-full">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">

          {/* ── Left Column ── */}
          <div className="md:col-span-4 flex flex-col gap-8">

            {/* Profile Avatar Card */}
            <div
              className="bg-[#e7e3ca] rounded-[2rem] p-8 flex flex-col items-center text-center relative overflow-hidden"
              style={{ boxShadow: '0 20px 40px rgba(29, 28, 13, 0.06)' }}
            >
              <div className="absolute -top-10 -right-10 opacity-5 font-headline text-9xl select-none">01</div>

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
                {fullName || 'Your Name'}
              </h1>
              <p className="text-[#9f402d] font-medium tracking-wide mt-1">
                {title || 'Farmer'}
              </p>

              <div className="mt-8 w-full flex flex-col gap-3">
                {coordinates?.label && (
                  <div className="flex items-center justify-between p-4 bg-[#f8f4db] rounded-lg">
                    <span className="font-label text-sm opacity-60 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">location_on</span>
                      Location
                    </span>
                    <span className="font-label text-sm font-bold text-[#173809] truncate max-w-[140px]" title={coordinates.label}>
                      {coordinates.label}
                    </span>
                  </div>
                )}

                {soilData && (soilData.ph || soilData.nitrogen) && (
                  <div className="p-4 bg-[#173809] rounded-lg text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 opacity-10">
                      <span className="material-symbols-outlined text-7xl">science</span>
                    </div>
                    <p className="font-label text-xs text-white/60 uppercase tracking-widest mb-2">Soil Baseline</p>
                    
                    <div className="flex justify-between mt-2">
                      {soilData.ph && (
                        <div>
                          <p className="font-body text-xs text-white/50">pH Level</p>
                          <p className="font-headline font-bold text-xl text-[#c5efad]">{soilData.ph}</p>
                        </div>
                      )}
                      {soilData.nitrogen && (
                        <div className="text-right">
                          <p className="font-body text-xs text-white/50">Nitrogen</p>
                          <p className="font-headline font-bold text-xl text-[#c5efad]">
                            {soilData.nitrogen} <span className="text-sm font-body font-normal">ppm</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Email Notifications */}
            <div className="bg-[#f8f4db] rounded-[2rem] p-8" style={{ boxShadow: '0 20px 40px rgba(29, 28, 13, 0.06)' }}>
              <h3 className="font-headline text-xl font-bold mb-2 text-[#173809]">Email Notifications</h3>
              <p className="text-xs text-[#43493e]/60 font-body mb-6">Alerts are sent to <strong>{email}</strong></p>
              <div className="space-y-5">

                {/* Satellite Alerts */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-body text-sm font-bold text-[#43493e]">Satellite Spike Alerts</p>
                    <p className="text-xs text-[#43493e]/50 mt-0.5">Get emailed instantly when our satellite detects abnormal NDVI or NDWI readings over your field.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotificationPrefs(p => ({ ...p, satellite_alerts: !p.satellite_alerts }))}
                    className="flex-shrink-0 mt-1"
                  >
                    <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${notificationPrefs.satellite_alerts ? 'bg-[#173809]' : 'bg-[#c3c8bb]'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${notificationPrefs.satellite_alerts ? 'translate-x-6' : ''}`}></div>
                    </div>
                  </button>
                </div>

                {/* Biweekly Reports */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-body text-sm font-bold text-[#43493e]">Biweekly AI Reports</p>
                    <p className="text-xs text-[#43493e]/50 mt-0.5">Receive a beautifully formatted field intelligence report with AI soil analysis every two weeks.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotificationPrefs(p => ({ ...p, biweekly_reports: !p.biweekly_reports }))}
                    className="flex-shrink-0 mt-1"
                  >
                    <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${notificationPrefs.biweekly_reports ? 'bg-[#173809]' : 'bg-[#c3c8bb]'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${notificationPrefs.biweekly_reports ? 'translate-x-6' : ''}`}></div>
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
                        headers: { Authorization: `Bearer ${token}` }
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
              <div className="absolute top-0 right-0 p-10 opacity-5 font-headline text-[12rem] leading-none pointer-events-none select-none text-[#173809]">ID</div>

              <header className="mb-12 relative z-10">
                <h2 className="font-headline text-4xl font-bold text-[#173809] mb-2">Profile & Field Settings</h2>
                <p className="font-body text-lg text-[#43493e] max-w-lg">
                  Keep your field location, soil baseline, and contact details current so every recommendation stays accurate.
                </p>
              </header>

              {saved && (
                <div className="mb-6 bg-[#c5efad]/40 border border-[#173809]/20 text-[#173809] px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-3 z-10 relative">
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Profile saved successfully!
                </div>
              )}

              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 relative z-10">

                {/* Full Name */}
                <div className="space-y-2">
                  <label className="font-label text-xs uppercase tracking-widest text-[#173809] font-bold px-4">Full Legal Name</label>
                  <input
                    className="w-full bg-[#f8f4db] rounded-full px-6 py-4 border-none focus:outline-none focus:bg-[#e7e3ca] transition-colors font-body text-[#1d1c0d]"
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="font-label text-xs uppercase tracking-widest text-[#173809] font-bold px-4">Email Designation</label>
                  <input
                    className="w-full bg-[#f8f4db] rounded-full px-6 py-4 border-none focus:outline-none focus:bg-[#e7e3ca] transition-colors font-body text-[#1d1c0d]"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <label className="font-label text-xs uppercase tracking-widest text-[#173809] font-bold px-4">Title</label>
                  <input
                    className="w-full bg-[#f8f4db] rounded-full px-6 py-4 border-none focus:outline-none focus:bg-[#e7e3ca] transition-colors font-body text-[#1d1c0d]"
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                </div>

                {/* Operational Territory header */}
                <div className="md:col-span-2 mt-4">
                  <h3 className="font-headline text-xl font-bold text-[#173809] flex items-center gap-3">
                    <span className="material-symbols-outlined">agriculture</span>
                    Operational Territory
                  </h3>
                </div>

                {/* Org Name */}
                <div className="space-y-2">
                  <label className="font-label text-xs uppercase tracking-widest text-[#173809] font-bold px-4">Organization Name</label>
                  <input
                    className="w-full bg-[#f8f4db] rounded-full px-6 py-4 border-none focus:outline-none focus:bg-[#e7e3ca] transition-colors font-body text-[#1d1c0d]"
                    type="text"
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                  />
                </div>

                {/* Coordinates */}
                <div className="space-y-2">
                  <label className="font-label text-xs uppercase tracking-widest text-[#173809] font-bold px-4">Geo-Location Coordinates</label>
                  <div className="pt-2">
                    <MapPicker 
                      value={coordinates} 
                      onChange={setCoordinates} 
                    />
                  </div>
                </div>

                {/* Focuses */}
                {focuses.length > 0 && (
                  <div className="md:col-span-2 space-y-2">
                    <label className="font-label text-xs uppercase tracking-widest text-[#173809] font-bold px-4">Territorial Focus</label>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {focuses.map(tag => (
                        <span
                          key={tag}
                          onClick={() => removeTag(tag)}
                          className="bg-[#173809] text-white font-label text-sm px-6 py-2 rounded-full flex items-center gap-2 cursor-pointer hover:bg-[#9f402d] active:scale-95 transition-all capitalize"
                        >
                          {tag}
                          <span className="material-symbols-outlined text-sm">close</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Soil Baseline Data */}
                <div className="md:col-span-2 mt-2">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                    <h3 className="font-headline text-xl font-bold text-[#173809] flex items-center gap-3">
                      <span className="material-symbols-outlined">science</span>
                      Soil Baseline Data
                    </h3>
                    <label className="text-[10px] font-bold tracking-widest uppercase bg-[#c5efad] text-[#173809] px-4 py-2 rounded-full cursor-pointer hover:bg-[#173809] hover:text-white transition-colors flex items-center gap-2 shadow-sm">
                      {isExtracting ? (
                         <>
                           <span className="material-symbols-outlined text-[14px] animate-spin">refresh</span>
                           Extracting...
                         </>
                      ) : (
                         <>
                           <span className="material-symbols-outlined text-[14px]">upload_file</span>
                           Upload PDF/Image
                           <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleReportUpload} disabled={isExtracting} />
                         </>
                      )}
                    </label>
                  </div>
                  {soilError && (
                    <p className="mb-3 text-xs font-bold text-[#9f402d] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      {soilError}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="font-label text-xs uppercase tracking-widest text-[#173809] font-bold px-4">pH Level <span className="text-[#43493e] normal-case">(0 – 14)</span></label>
                      <input
                        className="w-full bg-[#f8f4db] rounded-full px-6 py-4 border-none focus:outline-none focus:bg-[#e7e3ca] transition-colors font-body text-[#1d1c0d]"
                        type="number" step="0.1" min="0" max="14"
                        value={soilData.ph || ''}
                        onChange={e => { setSoilData(prev => ({ ...prev, ph: e.target.value })); setSoilError('') }}
                        placeholder="e.g. 6.5"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="font-label text-xs uppercase tracking-widest text-[#173809] font-bold px-4">Nitrogen <span className="text-[#43493e] normal-case">(0 – 1000 ppm)</span></label>
                      <input
                        className="w-full bg-[#f8f4db] rounded-full px-6 py-4 border-none focus:outline-none focus:bg-[#e7e3ca] transition-colors font-body text-[#1d1c0d]"
                        type="number" step="any" min="0" max="1000"
                        value={soilData.nitrogen || ''}
                        onChange={e => { setSoilData(prev => ({ ...prev, nitrogen: e.target.value })); setSoilError('') }}
                        placeholder="e.g. 120"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="font-label text-xs uppercase tracking-widest text-[#173809] font-bold px-4">Phosphorus <span className="text-[#43493e] normal-case">(0 – 500 ppm)</span></label>
                      <input
                        className="w-full bg-[#f8f4db] rounded-full px-6 py-4 border-none focus:outline-none focus:bg-[#e7e3ca] transition-colors font-body text-[#1d1c0d]"
                        type="number" step="any" min="0" max="500"
                        value={soilData.phosphorus || ''}
                        onChange={e => { setSoilData(prev => ({ ...prev, phosphorus: e.target.value })); setSoilError('') }}
                        placeholder="e.g. 45"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="font-label text-xs uppercase tracking-widest text-[#173809] font-bold px-4">Potassium <span className="text-[#43493e] normal-case">(0 – 1000 ppm)</span></label>
                      <input
                        className="w-full bg-[#f8f4db] rounded-full px-6 py-4 border-none focus:outline-none focus:bg-[#e7e3ca] transition-colors font-body text-[#1d1c0d]"
                        type="number" step="any" min="0" max="1000"
                        value={soilData.potassium || ''}
                        onChange={e => { setSoilData(prev => ({ ...prev, potassium: e.target.value })); setSoilError('') }}
                        placeholder="e.g. 200"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="md:col-span-2 mt-10 flex justify-end">
                  <button
                    className="w-full md:w-auto bg-[#173809] text-white font-label font-bold px-12 py-5 rounded-full transition-all active:scale-95 hover:bg-[#2d4f1e] relative overflow-hidden group shadow-xl disabled:opacity-50"
                    type="submit"
                    disabled={saveLoading}
                  >
                    <span className="relative z-10 text-lg uppercase tracking-widest font-headline">
                      {saveLoading ? 'Saving...' : 'Save Profile'}
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
