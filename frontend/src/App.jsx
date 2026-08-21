import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

import LandingPage       from './pages/LandingPage'
import LoginPage         from './pages/LoginPage'
import InputPage         from './pages/InputPage'
import DashboardPage     from './pages/DashboardPage'
import SoilHealthPage    from './pages/SoilHealthPage'
import FertilizerHubPage from './pages/FertilizerHubPage'
import PrivacyPage       from './pages/PrivacyPage'
import TermsPage         from './pages/TermsPage'
import RoadmapPage        from './pages/RoadmapPage'
import ContactPage       from './pages/ContactPage'
import ProfilePage       from './pages/ProfilePage'
import OnboardingPage    from './pages/OnboardingPage'
import ConsultPage       from './pages/ConsultPage'
import { AuthProvider, useAuth }  from './context/AuthContext'
import ProtectedRoute    from './components/ProtectedRoute'

// Page fade animation — subtle so it never feels heavy
const pageFade = {
  initial:    { opacity: 0, y: 4 },
  animate:    { opacity: 1, y: 0 },
  exit:       { opacity: 0, y: -4 },
  transition: { duration: 0.12, ease: 'easeOut' },
}

// Inner component so it can access useLocation inside BrowserRouter
function AnimatedRoutes() {
  const location = useLocation()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    // Wait until authentication is resolved before executing translation inference
    if (isLoading) return;

    async function determineLocationLanguage() {
      // 0. If the user manually changed the language this session, respect their choice and never override.
      if (sessionStorage.getItem('user_changed_language')) {
        loadGoogleTranslate()
        return
      }

      let targetLang = 'en'
      let fromProfile = false

      // 1. High Priority: Exact location bound to the user's profile
      if (user?.coordinates?.label) {
        const lbl = user.coordinates.label.toLowerCase()
        if (lbl.includes('gujarat') || lbl.includes('daman') || lbl.includes('diu') || lbl.includes('dadra')) targetLang = 'gu'
        else if (lbl.includes('maharashtra')) targetLang = 'mr'
        else if (lbl.includes('punjab')) targetLang = 'pa'
        else if (lbl.includes('tamil nadu') || lbl.includes('puducherry')) targetLang = 'ta'
        else if (lbl.includes('karnataka')) targetLang = 'kn'
        else if (lbl.includes('kerala')) targetLang = 'ml'
        else if (lbl.includes('bengal') || lbl.includes('tripura')) targetLang = 'bn'
        else if (lbl.includes('andhra') || lbl.includes('telangana')) targetLang = 'te'
        else if (lbl.includes('odisha') || lbl.includes('orissa')) targetLang = 'or'
        else if (lbl.includes('india') || lbl.includes('bharat')) targetLang = 'hi'
        
        fromProfile = true
      }

      // 2. Medium/Low Priority: Fallback to IP geolocation if no profile exists
      if (!fromProfile) {
        try {
          const res = await fetch('https://ipapi.co/json/')
          const data = await res.json()
          
          if (data.country_code === 'IN') {
             const region = data.region
             if (['Gujarat', 'Daman and Diu', 'Dadra and Nagar Haveli'].includes(region)) targetLang = 'gu'
             else if (['Maharashtra'].includes(region)) targetLang = 'mr'
             else if (['Punjab'].includes(region)) targetLang = 'pa'
             else if (['Tamil Nadu', 'Puducherry'].includes(region)) targetLang = 'ta'
             else if (['Karnataka'].includes(region)) targetLang = 'kn'
             else if (['Kerala'].includes(region)) targetLang = 'ml'
             else if (['West Bengal', 'Tripura'].includes(region)) targetLang = 'bn'
             else if (['Andhra Pradesh', 'Telangana'].includes(region)) targetLang = 'te'
             else if (['Odisha'].includes(region)) targetLang = 'or'
             else targetLang = 'hi' 
          }
        } catch (e) {
          console.warn("Geolocation fallback failed", e)
        }
      }

      // 3. Auto-set the cookie only for non-English targets (purely informational for Google Translate)
      if (targetLang !== 'en') {
        document.cookie = `googtrans=/en/${targetLang}; path=/;`
        document.cookie = `googtrans=/en/${targetLang}; domain=.${window.location.hostname}; path=/;`
      }

      // Finally, initialize translate
      loadGoogleTranslate()
    }

    function loadGoogleTranslate() {
      if (document.getElementById('google-translate-script')) return;
      window.googleTranslateElementInit = () => {
        new window.google.translate.TranslateElement(
           { pageLanguage: 'en', autoDisplay: false },
           'google_translate_element'
        )
      }
      const script = document.createElement('script')
      script.id = 'google-translate-script'
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      script.async = true
      document.body.appendChild(script)
    }

    determineLocationLanguage()
  }, [user, isLoading])

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={pageFade.initial}
        animate={pageFade.animate}
        exit={pageFade.exit}
        transition={pageFade.transition}
        style={{ minHeight: '100vh' }}
      >
        <Routes location={location}>
          {/* Public */}
          <Route path="/"              element={<LandingPage />} />
          <Route path="/login"         element={<LoginPage />} />
          <Route path="/onboarding"    element={<OnboardingPage />} />
          <Route path="/privacy"       element={<PrivacyPage />} />
          <Route path="/terms"         element={<TermsPage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/sustainability" element={<Navigate to="/roadmap" replace />} />
          <Route path="/contact"       element={<ContactPage />} />

          {/* Protected */}
          <Route path="/input"         element={<ProtectedRoute><InputPage /></ProtectedRoute>} />
          <Route path="/dashboard"     element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/soil-health"   element={<ProtectedRoute><SoilHealthPage /></ProtectedRoute>} />
          <Route path="/fertilizer-hub" element={<ProtectedRoute><FertilizerHubPage /></ProtectedRoute>} />
          <Route path="/profile"       element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          
          <Route path="/consult"       element={<ProtectedRoute><ConsultPage /></ProtectedRoute>} />

          <Route path="*"              element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
