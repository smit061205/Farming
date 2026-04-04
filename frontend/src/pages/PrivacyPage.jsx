import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function PrivacyPage() {
  return (
    <div className="bg-[#fefae0] text-[#1d1c0d] overflow-x-hidden min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-32 pb-24 px-8 md:px-12 max-w-4xl mx-auto w-full">
        <header className="mb-16">
          <span className="text-[#9f402d] font-headline font-bold tracking-widest text-xs uppercase mb-4 block">
            Legal
          </span>
          <h1 className="text-5xl md:text-7xl font-headline font-bold text-[#173809] tracking-tighter leading-none mb-8">
            Privacy <span className="italic font-light">Protocol</span>
          </h1>
          <p className="text-xl text-[#43493e] font-medium leading-relaxed">
            Effective Date: April 2026. Your agricultural data is yours. Here is how we protect it.
          </p>
        </header>

        <article className="space-y-12 text-[#43493e] leading-relaxed">
          <section>
            <h2 className="text-2xl font-headline font-bold text-[#173809] mb-4">1. Data Collection & Telemetry</h2>
            <p>
              When you synchronize your field sensors with the Technological Terroir platform, we collect high-resolution telemetry including localized NPK concentrations, relative humidity, and deep-soil moisture readings. This raw data is encrypted at rest and never shared with third-party chemical distributors.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-headline font-bold text-[#173809] mb-4">2. Machine Learning Anonymization</h2>
            <p className="mb-4">
              Our AI models continuously optimize crop recommendations based on macro-terroir trends. All data ingested into our global machine learning pipelines is stripped of exact geo-coordinates identifying your individual plots. Your operational privacy remains intact while contributing to the global agronomy matrix.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-headline font-bold text-[#173809] mb-4">3. Satellite Imagery Integration</h2>
            <p>
              By authorizing NDVI processing, you grant us permission to query public and private satellite networks for multi-spectral imagery centering on your designated blocks. We do not retain visual field maps beyond the active growing cycle unless you explicitly archive them.
            </p>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  )
}
