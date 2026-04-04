import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function SustainabilityPage() {
  return (
    <div className="bg-[#fefae0] text-[#1d1c0d] overflow-x-hidden min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-32 pb-24 px-8 md:px-12 max-w-[1920px] mx-auto w-full">
        <header className="mb-20 grid grid-cols-1 md:grid-cols-12 gap-12 items-end max-w-7xl mx-auto">
          <div className="md:col-span-8">
            <span className="text-[#9f402d] font-headline font-bold tracking-widest text-xs uppercase mb-4 block">
              Core Mission
            </span>
            <h1 className="text-6xl md:text-8xl font-headline font-bold text-[#173809] tracking-tighter leading-none mb-8">
              Yield vs. <br />
              <span className="italic font-light">Ecology</span>
            </h1>
            <p className="text-xl md:text-2xl text-[#43493e] font-light max-w-2xl leading-relaxed">
              We do not accept the premise that maximizing output requires degrading the topsoil layer. True yield is intergenerational.
            </p>
          </div>
        </header>

        {/* Hero Image */}
        <div className="max-w-7xl mx-auto mb-20 relative h-[500px] rounded-[3rem] overflow-hidden soil-shadow">
          <img src="https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=1200&q=80" className="w-full h-full object-cover" alt="Soil Layers" />
          <div className="absolute inset-0 bg-[#173809]/20 mix-blend-overlay"></div>
          <div className="absolute bottom-12 left-12 bg-white/90 backdrop-blur-md p-6 rounded-[1.5rem] shadow-xl max-w-md">
            <h3 className="font-headline font-bold text-[#173809] text-xl mb-2">Our Goal: -30% Nitrate Runoff</h3>
            <p className="text-[#43493e] text-sm">By hyper-localizing chemical drop zones, we are actively cutting the pollution entering the water table.</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="bg-[#f8f4db] p-12 rounded-[2rem] soil-shadow">
            <div className="w-16 h-16 rounded-full bg-[#173809]/10 flex items-center justify-center mb-8">
              <span className="material-symbols-outlined text-[#173809] text-3xl">psychiatry</span>
            </div>
            <h2 className="text-3xl font-headline font-bold text-[#173809] mb-4">Carbon Sequestration</h2>
            <p className="text-[#43493e] leading-relaxed">
              Our models actively encourage cover crop deployments that maximize root depth. A healthy hectare of mycelium networks can capture metric tons of atmospheric carbon, transitioning farms from heavy emitters into climate stabilizers.
            </p>
          </div>

          <div className="bg-[#173809] text-white p-12 rounded-[2rem] soil-shadow">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-8">
              <span className="material-symbols-outlined text-[#c5efad] text-3xl">water_drop</span>
            </div>
            <h2 className="text-3xl font-headline font-bold text-[#c5efad] mb-4">Evapotranspiration Deficit</h2>
            <p className="text-white/80 leading-relaxed">
              Global water reservoirs are under unprecedented stress. The Technological Terroir engine constantly maps dew points and solar load to advise on precision irrigation, preventing the disastrous squandering of fresh water on dormant rootscapes.
            </p>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  )
}
