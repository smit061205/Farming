import { motion } from 'framer-motion'

/**
 * Shared botanical leaf-ring loader used by:
 *  - LoadingPage (analysis transition)
 *  - SoilHealthPage (tab switching)
 *  - App.jsx (page transitions via AnimatePresence)
 *
 * Props:
 *  - label: string — text shown below the spinner
 *  - fullScreen: bool — if true, centres in the viewport; otherwise fills the parent
 */
export default function PageTransitionLoader({ label = 'Loading', fullScreen = false }) {
  const COUNT = 8
  const RADIUS = 28

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col items-center justify-center gap-8 bg-[#fefae0] ${
        fullScreen ? 'fixed inset-0 z-[9999]' : 'min-h-[60vh] w-full'
      }`}
    >
      {/* Leaf ring */}
      <div className="relative w-20 h-20">
        {Array.from({ length: COUNT }).map((_, i) => {
          const angle = (360 / COUNT) * i
          const delay = -(i * (1.4 / COUNT))
          return (
            <motion.span
              key={i}
              className="material-symbols-outlined absolute top-1/2 left-1/2 text-[#173809] select-none pointer-events-none"
              style={{
                fontSize: 14,
                fontVariationSettings: "'FILL' 1",
                opacity: 0.12 + (i / COUNT) * 0.88,
                originX: '50%',
                originY: '50%',
              }}
              animate={{ rotate: 360 }}
              transition={{
                repeat: Infinity,
                duration: 1.4,
                ease: 'linear',
                delay,
              }}
              // Position each leaf around the ring using a fixed offset
              initial={{
                x: `calc(-50% + ${Math.cos((angle * Math.PI) / 180) * RADIUS}px)`,
                y: `calc(-50% + ${Math.sin((angle * Math.PI) / 180) * RADIUS}px)`,
              }}
            >
              eco
            </motion.span>
          )
        })}

        {/* Centre pulse dot */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
        >
          <div className="w-3 h-3 rounded-full bg-[#173809]" />
        </motion.div>
      </div>

      {/* Label */}
      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#173809]/30 mb-1">
          Please wait
        </p>
        <p className="font-headline font-bold text-xl text-[#173809]">{label}</p>
      </div>
    </motion.div>
  )
}
