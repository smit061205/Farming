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
            Please read this before using AgriSense on your farm.
          </p>
        </header>

        <article className="space-y-12 text-[#43493e] leading-relaxed">
          <section>
            <h2 className="text-2xl font-headline font-bold text-[#173809] mb-4">1. Using AgriSense</h2>
            <p>
              By using the AgriSense app, you agree to these terms. If you don't agree, please don't use the app.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-headline font-bold text-[#173809] mb-4">2. Our Recommendations Are Guidance, Not a Guarantee</h2>
            <p className="mb-4">
              Our fertilizer recommendations are calculated from your soil test, crop, and the weather forecast. While we test our methods carefully, we can't predict every real-world condition — like sudden flooding or a pest outbreak.
            </p>
            <div className="bg-[#e7e3ca] p-6 rounded-[1rem] border-l-4 border-[#9f402d] mt-4">
              <strong className="text-[#173809]">Please note:</strong> AgriSense is not responsible for crop loss or damage from following a recommendation. When in doubt, check with a local agriculture expert before applying any fertilizer.
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-headline font-bold text-[#173809] mb-4">3. Your Account</h2>
            <p>
              Keep your login details private. You're responsible for the accuracy of the soil and field data you enter — better data means better recommendations.
            </p>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  )
}
