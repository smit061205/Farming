import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function TermsPage() {
  return (
    <div className="bg-[#fefae0] text-[#1d1c0d] overflow-x-hidden min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-32 pb-24 px-8 md:px-12 max-w-4xl mx-auto w-full">
        <header className="mb-16">
          <span className="text-[#9f402d] font-headline font-bold tracking-widest text-xs uppercase mb-4 block">
            Legal
          </span>
          <h1 className="text-5xl md:text-7xl font-headline font-bold text-[#173809] tracking-tighter leading-none mb-8">
            Terms of <span className="italic font-light">Service</span>
          </h1>
          <p className="text-xl text-[#43493e] font-medium leading-relaxed">
            Please read these conditions carefully before integrating our telemetry hardware into your operational ecosystem.
          </p>
        </header>

        <article className="space-y-12 text-[#43493e] leading-relaxed">
          <section>
            <h2 className="text-2xl font-headline font-bold text-[#173809] mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing the Technological Terroir dashboard or API, you agree to be bound by these Terms of Service. Disagreeing with these Terms revokes your authorization to utilize our agrarian recommendation engines and machine learning interfaces.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-headline font-bold text-[#173809] mb-4">2. Agnostic Recommendations & Liability</h2>
            <p className="mb-4">
              All fertilization and crop rotation recommendations derived from our system are algorithmic projections based on statistical terroir models. While rigorously tested, we cannot account for unpredictable meteorological anomalies or macro-ecological shifts (e.g. flash flooding, extreme pest invasion).
            </p>
            <div className="bg-[#e7e3ca] p-6 rounded-[1rem] border-l-4 border-[#9f402d] mt-4">
              <strong className="text-[#173809]">Disclaimer:</strong> Technological Terroir assumes no liability for chemical scorch or yield reduction resulting from the blind application of unverified protocols. Local agronomic consultation is always advised.
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-headline font-bold text-[#173809] mb-4">3. Device Lifespan & Network Sync</h2>
            <p>
              Sensor batteries are rated for two full harvest cycles under nominal terrestrial conditions. Interference via dense canopy foliage may artificially degrade the LoRaWAN signal required for our primary dashboards. Ensure sensor heads remain unoccluded.
            </p>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  )
}
