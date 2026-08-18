import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Footer from '../components/Footer'
import { useReactToPrint } from 'react-to-print'
import PageTransitionLoader from '../components/PageTransitionLoader'

import SensorNetworkView  from './soil-views/SensorNetworkView'
import ArchiveView        from './soil-views/ArchiveView'
import AIInterpreterView  from './soil-views/AIInterpreterView'
import Navbar             from '../components/Navbar'
import PrintableReport    from '../components/PrintableReport'

const VIEW_MAP = {
  sensor:      SensorNetworkView,
  interpreter: AIInterpreterView,
  archive:     ArchiveView,
}

export default function SoilHealthPage() {
  const reportRef = useRef(null)
  const [activeTab, setActiveTab]       = useState('sensor')
  const [displayTab, setDisplayTab]     = useState('sensor')   // what's actually rendered
  const [isTabLoading, setIsTabLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const tabs = [
    { id: 'sensor',      icon: 'sensors',     label: 'Sensor Network' },
    { id: 'interpreter', icon: 'psychology',   label: 'AI Report'       },
    { id: 'archive',     icon: 'auto_stories', label: 'Archive'         },
  ]

  // When activeTab changes, show loader then swap content
  useEffect(() => {
    if (activeTab === displayTab) return
    setIsTabLoading(true)
    const t = setTimeout(() => {
      setDisplayTab(activeTab)
      setIsTabLoading(false)
    }, 600)
    return () => clearTimeout(t)
  }, [activeTab])

  const handleTabClick = (id) => {
    if (id === activeTab) return
    setActiveTab(id)
  }

  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: 'AgriSense_Soil_Report',
    onAfterPrint:  () => setIsGenerating(false),
    onPrintError:  () => setIsGenerating(false),
  })

  const triggerDownload = useCallback(() => {
    setIsGenerating(true)
    setTimeout(() => { handlePrint() }, 800)
  }, [handlePrint])

  const ActiveComponent = VIEW_MAP[displayTab]
  const activeLabel = tabs.find(t => t.id === activeTab)?.label ?? ''

  return (
    <div className="bg-[#fefae0] text-[#1d1c0d] overflow-x-hidden min-h-screen">
      <Navbar />

      {/* ── Side Navigation ── */}
      <aside className="h-screen w-72 fixed left-0 top-0 bg-[#fefae0] flex-col p-8 gap-8 pt-32 hidden lg:flex border-r border-[#173809]/10 z-40">
        <div className="flex flex-col gap-1">
          <h3 className="font-headline font-bold text-[#173809] text-xl tracking-tight">North Vineyard</h3>
          <p className="text-[#1d1c0d]/40 text-sm font-semibold">Block A-12</p>
        </div>

        <nav className="flex flex-col gap-1 relative">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex items-center gap-4 px-4 py-3 rounded-full font-semibold transition-all duration-200 text-left relative ${
                  isActive
                    ? 'text-[#173809] bg-[#173809]/8'
                    : 'text-[#173809]/40 hover:text-[#173809]/70 hover:bg-[#173809]/5'
                }`}
              >
                {/* Active indicator dot */}
                {isActive && (
                  <motion.span
                    layoutId="active-dot"
                    className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#173809]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span
                  className="material-symbols-outlined transition-all"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {tab.icon}
                </span>
                <span>{tab.label}</span>

                {/* Small loading pulse when this tab is loading */}
                {isTabLoading && activeTab === tab.id && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-[#173809] animate-ping opacity-60" />
                )}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-6">
          <button
            onClick={triggerDownload}
            disabled={isGenerating}
            className={`text-white rounded-full py-4 px-6 font-bold text-sm tracking-wide shadow-lg transition-all flex items-center justify-center gap-2 ${
              isGenerating ? 'bg-[#173809]/50 cursor-wait' : 'bg-[#173809] hover:bg-[#9f402d] active:scale-95'
            }`}
          >
            {isGenerating ? (
              <><span className="material-symbols-outlined animate-spin text-sm">cycle</span> Generating…</>
            ) : (
              <><span className="material-symbols-outlined text-sm">download</span> Download Report</>
            )}
          </button>
          <a className="flex items-center gap-4 px-4 text-[#173809]/40 font-semibold" href="#">
            <span className="material-symbols-outlined">help_outline</span>
            <span>Support</span>
          </a>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="lg:ml-72 pt-32 px-6 md:px-12 pb-24 relative z-0 min-h-[80vh]">
        <AnimatePresence mode="wait">
          {isTabLoading ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <PageTransitionLoader label={activeLabel} />
            </motion.div>
          ) : (
            <motion.div
              key={displayTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            >
              {ActiveComponent && <ActiveComponent />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-[#fefae0]/90 backdrop-blur-lg flex justify-around p-4 z-50 border-t border-[#173809]/10">
        {tabs.slice(0, 4).map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-[#173809]' : 'text-[#1d1c0d]/40'}`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                {tab.icon}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-tighter">{tab.label.split(' ')[0]}</span>
            </button>
          )
        })}
      </nav>

      <div className="lg:ml-72 mt-20 relative z-0">
        <Footer dark />
      </div>

      {/* PrintableReport — only mounted while generating a download. Mounting it
          eagerly on every page load was firing a second, duplicate round of
          satellite/map requests (it renders its own SensorNetworkView copy),
          which is exactly what was slowing the map down. */}
      {isGenerating && (
        <div
          style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '1200px', pointerEvents: 'none', zIndex: -1 }}
          aria-hidden="true"
        >
          <PrintableReport reportRef={reportRef} />
        </div>
      )}
    </div>
  )
}
