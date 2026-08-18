import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import heroImage from "../assets/image.png";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="bg-[#fefae0] text-[#1d1c0d] overflow-x-hidden">
      <Navbar />

      <main className="pt-32">
        {/* Hero Section */}
        <section className="max-w-[1440px] mx-auto px-6 sm:px-8 md:px-12 pb-24 grid grid-cols-12 gap-8 items-center">
          <div className="col-span-12 md:col-span-6 z-10">
            <div className="mb-6 inline-flex items-center gap-2 bg-[#c5efad] px-4 py-1.5 rounded-full text-[#173809] font-bold text-xs uppercase tracking-widest">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#173809] opacity-75"></span>
                <span
                  className="relative inline-flex rounded-full h-2 w-2 bg-[#173809]"
                  style={{ boxShadow: "0 0 8px rgba(23,56,9,0.5)" }}
                ></span>
              </span>
              Precision Fertilizer, Not Guesswork
            </div>

            <h1 className="font-headline text-4xl sm:text-6xl md:text-8xl font-bold text-[#173809] leading-[0.9] tracking-tighter mb-8">
              Exact Dose. <br /> Every Field.
            </h1>

            <p className="font-body text-xl text-[#43493e] max-w-lg mb-10 leading-relaxed">
              We turn soil health, crop type, and weather patterns into the exact
              fertilizer type and quantity your field needs — cutting waste,
              protecting soil, and growing farmer income.
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => navigate("/login")}
                className="bg-[#173809] text-white px-10 py-5 rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-transform flex items-center gap-3"
                style={{ boxShadow: "0 20px 40px rgba(29,28,13,0.06)" }}
              >
                Get Your Fertilizer Plan
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>

          <div className="col-span-12 md:col-span-6 relative">
            <div className="relative rounded-[2rem] overflow-hidden soil-shadow">
              <img
                alt="Farmer with digital device in field"
                className="w-full h-[600px] object-cover rounded-[2rem]"
                src={heroImage}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#173809]/40 to-transparent rounded-[2rem]"></div>
            </div>
          </div>
        </section>

        {/* Problem vs Solution Section */}
        <section className="bg-[#f2efd5] py-32">
          <div className="max-w-[1440px] mx-auto px-6 sm:px-8 md:px-12">
            <div className="flex flex-col md:flex-row gap-16 items-center">
              <div className="flex-1 space-y-8">
                <h2 className="font-headline text-5xl font-bold text-[#173809] tracking-tight">
                  Deciphering the Dirt.
                </h2>
                <p className="text-lg text-[#43493e] leading-relaxed">
                  Traditional soil reports are static, complex, and often
                  outdated by the time they reach you. We turn data into
                  clarity.
                </p>
              </div>
              <div className="flex-1 flex flex-col md:flex-row gap-6 relative">
                {/* Messy Report Card */}
                <div className="bg-[#e7e3ca] p-8 rounded-[2rem] soil-shadow -rotate-2 opacity-50 blur-[1px] hover:blur-0 transition-all duration-500">
                  <div className="text-xs uppercase font-bold text-[#43493e] mb-4">
                    Paper Report #420
                  </div>
                  <div className="h-4 w-48 bg-[#c3c8bb]/40 rounded-full mb-2"></div>
                  <div className="h-4 w-32 bg-[#c3c8bb]/40 rounded-full mb-6"></div>
                  <div className="space-y-2">
                    <div className="h-2 w-full bg-[#c3c8bb]/30 rounded-full"></div>
                    <div className="h-2 w-full bg-[#c3c8bb]/30 rounded-full"></div>
                    <div className="h-2 w-5/6 bg-[#c3c8bb]/30 rounded-full"></div>
                  </div>
                </div>
                {/* Clean UI Card */}
                <div className="bg-white p-10 rounded-[2rem] soil-shadow z-10 md:-ml-12 md:mt-12 border-l-[12px] border-[#173809]">
                  <div className="flex justify-between items-center mb-8">
                    <div className="font-headline font-bold text-[#173809]">
                      Live Field Analysis
                    </div>
                    <div className="bg-[#c5efad] px-3 py-1 rounded-full text-[10px] font-bold text-[#173809] flex items-center gap-2">
                      <span
                        className="w-1.5 h-1.5 bg-[#173809] rounded-full animate-pulse"
                        style={{ boxShadow: "0 0 5px rgba(23,56,9,0.5)" }}
                      ></span>
                      ACTIVE
                    </div>
                  </div>
                  <div className="flex gap-8">
                    <div>
                      <div className="text-3xl font-bold font-headline text-[#173809]">
                        Nitrogen
                      </div>
                      <div className="text-sm text-[#43493e]">
                        Optimum Range
                      </div>
                    </div>
                    <div className="w-24 h-24 rounded-full border-[6px] border-[#9f402d] flex items-center justify-center">
                      <span className="text-xl font-bold text-[#9f402d]">
                        High
                      </span>
                    </div>
                  </div>
                  <div className="mt-6 text-[#43493e] font-medium italic">
                    "Action: Reduce urea application by 12%."
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Methodology Section */}
        <section className="py-32 bg-[#fefae0]">
          <div className="max-w-[1440px] mx-auto px-6 sm:px-8 md:px-12">
            <div className="text-center mb-24">
              <h3 className="text-sm font-bold uppercase tracking-[0.4em] text-[#9f402d] mb-4">
                The Methodology
              </h3>
              <h2 className="font-headline text-6xl font-bold text-[#173809]">
                From Soil to Action.
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                {
                  title: "Upload Soil Data",
                  desc: "Connect your field sensors or upload your latest chemical lab report. We ingest structured and unstructured data effortlessly.",
                },
                {
                  title: "Weather-Adjusted Engine",
                  desc: "Our dosing engine cross-references crop nutrient targets against the 5-day rain and heat forecast, splitting or timing doses to prevent leaching and runoff.",
                },
                {
                  title: "Exact Type & Quantity",
                  desc: "No more guesswork. Get the precise fertilizer product and kilogram amount for your exact field size — not just a generic rate.",
                },
              ].map(({ title, desc }, i) => (
                <div key={i} className="group relative">
                  <div className="text-[120px] font-black text-[#e7e3ca] absolute -top-16 -left-4 z-0 opacity-40 select-none font-headline leading-none">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="relative z-10 space-y-6 pt-6">
                    <h4 className="text-2xl font-bold text-[#173809] font-headline">
                      {title}
                    </h4>
                    <p className="text-[#43493e] leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="py-32 px-6 sm:px-8 md:px-12 bg-[#f8f4db]">
          <div className="max-w-[1440px] mx-auto">
            <div className="grid grid-cols-12 gap-8">
              {/* Large Feature Card */}
              <div className="col-span-12 lg:col-span-8 bg-[#fefae0] rounded-[3rem] p-12 flex flex-col justify-between min-h-[500px] soil-shadow relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="bg-[#ffdad3] text-[#802918] inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
                    Core Engine
                  </div>
                  <h3 className="text-5xl font-bold text-[#173809] font-headline mb-6">
                    Precision Fertilizer Plan
                  </h3>
                  <p className="text-xl text-[#43493e] max-w-md leading-relaxed">
                    Your exact soil deficit, crop demand, and field size converted
                    into kilograms of a named product — with the application
                    schedule adjusted for the coming week's weather.
                  </p>
                </div>
                <div className="relative z-10">
                  <button
                    onClick={() => navigate("/login")}
                    className="bg-[#4e2500] text-white px-8 py-4 rounded-full font-bold flex items-center gap-3 hover:scale-105 active:scale-95 transition-transform"
                  >
                    Get Your Plan
                  </button>
                </div>
                <div className="absolute top-0 right-0 w-1/2 h-full bg-[#c5efad]/30 rounded-l-full translate-x-12 translate-y-12 -rotate-12 group-hover:scale-110 transition-transform duration-700"></div>
              </div>

              {/* Side Grid */}
              <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
                <div className="bg-[#e7e3ca] p-8 rounded-[2rem] soil-shadow flex-1 flex flex-col justify-center gap-4">
                  <span className="material-symbols-outlined text-4xl text-[#9f402d]">
                    eco
                  </span>
                  <h4 className="text-2xl font-bold text-[#173809] font-headline">
                    Sustainability Score
                  </h4>
                  <p className="text-[#43493e]">
                    See the waste and emissions avoided vs. blanket application.
                  </p>
                </div>
                <div className="bg-[#173809] text-white p-8 rounded-[2rem] soil-shadow flex-1 flex flex-col justify-center gap-4 relative overflow-hidden">
                  <div className="relative z-10">
                    <span className="material-symbols-outlined text-4xl text-[#c5efad]">
                      monitoring
                    </span>
                    <h4 className="text-2xl font-bold font-headline">
                      Soil Health Score
                    </h4>
                    <p className="text-[#c5efad]/80">
                      Real-time benchmark against global standards.
                    </p>
                  </div>
                  <div className="absolute -bottom-8 -right-8 opacity-20">
                    <span className="material-symbols-outlined text-[160px]">
                      grass
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 sm:px-8 md:px-12 py-32">
          <div className="bg-[#173809] rounded-[3rem] p-24 text-center text-white soil-shadow relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(169,210,147,0.1),transparent)]"></div>
            <h2 className="font-headline text-6xl md:text-8xl font-bold mb-10 relative z-10 leading-tight">
              Ready to listen <br /> to your land?
            </h2>
            <div className="flex flex-col md:flex-row justify-center gap-6 relative z-10">
              <button
                onClick={() => navigate("/login")}
                className="bg-[#9f402d] text-white px-12 py-6 rounded-full font-bold text-xl soil-shadow hover:scale-105 active:scale-95 transition-transform"
              >
                Get Started Free
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
