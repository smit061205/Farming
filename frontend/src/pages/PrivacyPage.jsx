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
            Privacy <span className="italic font-light">Policy</span>
          </h1>
          <p className="text-xl text-[#43493e] font-medium leading-relaxed">
            Effective Date: April 2026. Your farm data belongs to you. Here's how we look after it.
          </p>
        </header>

        <article className="space-y-12 text-[#43493e] leading-relaxed">
          <section>
            <h2 className="text-2xl font-headline font-bold text-[#173809] mb-4">1. What We Collect</h2>
            <p>
              When you enter your soil test results or connect field sensors, we collect your nitrogen, phosphorus, and potassium levels, soil moisture, and location. This data is encrypted and stored securely, and we never sell or share it with fertilizer companies or other third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-headline font-bold text-[#173809] mb-4">2. How We Use It to Improve Recommendations</h2>
            <p className="mb-4">
              We use anonymized, combined data from many farms to make our recommendations more accurate over time. Your exact field location is never included in this — only your individual soil values are used to generate your personal fertilizer plan.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-headline font-bold text-[#173809] mb-4">3. Satellite Images</h2>
            <p>
              If you allow it, we look up satellite images of your field to check crop health (NDVI) and soil moisture. We don't keep these images longer than the current growing season unless you choose to save them.
            </p>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  )
}
