import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

import LandingPage       from './pages/LandingPage'
import LoginPage         from './pages/LoginPage'
import InputPage         from './pages/InputPage'
import LoadingPage       from './pages/LoadingPage'
import DashboardPage     from './pages/DashboardPage'
import FertilizerPage    from './pages/FertilizerPage'
import SoilHealthPage    from './pages/SoilHealthPage'
import SoilLibraryPage   from './pages/SoilLibraryPage'
import FertilizerHubPage from './pages/FertilizerHubPage'
import PrivacyPage       from './pages/PrivacyPage'
import TermsPage         from './pages/TermsPage'
import SustainabilityPage from './pages/SustainabilityPage'
import ContactPage       from './pages/ContactPage'
import ProfilePage       from './pages/ProfilePage'
import OnboardingPage    from './pages/OnboardingPage'
import ConsultPage       from './pages/ConsultPage'
import LoansPage         from './pages/LoansPage'
import LoanTermsPage    from './pages/LoanTermsPage'
import LenderLandingPage   from './pages/LenderLandingPage'
import LenderDashboardPage from './pages/LenderDashboardPage'
import LenderProfilePage   from './pages/LenderProfilePage'
import { AuthProvider, useAuth }  from './context/AuthContext'
import { LenderAuthProvider } from './context/LenderAuthContext'
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
          <Route path="/sustainability" element={<SustainabilityPage />} />
          <Route path="/contact"       element={<ContactPage />} />

          {/* Protected */}
          <Route path="/input"         element={<ProtectedRoute allowedRoles={['farmer']}><InputPage /></ProtectedRoute>} />
          <Route path="/loading"       element={<ProtectedRoute allowedRoles={['farmer']}><LoadingPage /></ProtectedRoute>} />
          <Route path="/dashboard"     element={<ProtectedRoute allowedRoles={['farmer']}><DashboardPage /></ProtectedRoute>} />
          <Route path="/fertilizer"    element={<ProtectedRoute allowedRoles={['farmer']}><FertilizerPage /></ProtectedRoute>} />
          <Route path="/soil-health"   element={<ProtectedRoute allowedRoles={['farmer']}><SoilHealthPage /></ProtectedRoute>} />
          <Route path="/soil-library"  element={<ProtectedRoute allowedRoles={['farmer']}><SoilLibraryPage /></ProtectedRoute>} />
          <Route path="/fertilizer-hub" element={<ProtectedRoute allowedRoles={['farmer']}><FertilizerHubPage /></ProtectedRoute>} />
          <Route path="/profile"       element={<ProtectedRoute allowedRoles={['farmer']}><ProfilePage /></ProtectedRoute>} />
          
          <Route path="/consult"       element={<ProtectedRoute allowedRoles={['farmer']}><ConsultPage /></ProtectedRoute>} />
          <Route path="/loans"         element={<ProtectedRoute allowedRoles={['farmer']}><LoansPage /></ProtectedRoute>} />
          <Route path="/loans/terms"   element={<LoanTermsPage />} />

          {/* Lender Persona */}
          <Route path="/lender"           element={<LenderLandingPage />} />
          <Route path="/lender/dashboard" element={<ProtectedRoute allowedRoles={['lender']}><LenderDashboardPage /></ProtectedRoute>} />
          <Route path="/lender/profile"   element={<ProtectedRoute allowedRoles={['lender']}><LenderProfilePage /></ProtectedRoute>} />

          <Route path="*"              element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <LenderAuthProvider>
      <AuthProvider>
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>
      </AuthProvider>
    </LenderAuthProvider>
  )
}
