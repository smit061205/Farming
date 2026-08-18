import { useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function ContactPage() {
  const [sent, setSent] = useState(false)

  return (
    <div className="bg-[#fefae0] text-[#1d1c0d] overflow-x-hidden min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-32 pb-24 px-8 md:px-12 max-w-[1920px] mx-auto w-full">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">

          {/* Left: Header + Details */}
          <div className="lg:col-span-5 lg:sticky lg:top-40">
            <span className="text-[#9f402d] font-headline font-bold tracking-widest text-xs uppercase mb-4 block">
              Get in Touch
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-headline font-bold text-[#173809] tracking-tighter leading-none mb-8">
              We're Here <br />
              <span className="italic font-light">to Help.</span>
            </h1>
            <p className="text-xl text-[#43493e] font-light max-w-sm leading-relaxed mb-12">
              Questions about your fertilizer plan, a soil report, or the app itself — send us a message and we'll get back to you within a few days.
            </p>

            <div className="space-y-8">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-full bg-[#173809]/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[#173809]">mail</span>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#9f402d] mb-1">Email Us</p>
                  <p className="font-headline font-bold text-[#173809]">help@agrisense.app</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-full bg-[#173809]/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[#173809]">location_on</span>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#9f402d] mb-1">Office</p>
                  <p className="font-headline font-bold text-[#173809]">Plot 12, Agri Tech Park<br />Rajkot, Gujarat 360001</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-full bg-[#173809]/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[#173809]">schedule</span>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#9f402d] mb-1">Hours</p>
                  <p className="font-headline font-bold text-[#173809]">Mon – Sat, 9 AM – 6 PM IST</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Contact Form */}
          <div className="lg:col-span-7">
            {sent ? (
              <div className="bg-[#173809] text-white rounded-[3rem] p-16 flex flex-col items-center justify-center text-center h-full min-h-[500px] soil-shadow">
                <span className="material-symbols-outlined text-[#c5efad] text-6xl mb-8" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <h2 className="text-4xl font-headline font-bold mb-4">Message Sent</h2>
                <p className="text-white/70 text-lg max-w-sm leading-relaxed">
                  Thanks for reaching out. Our team will get back to you soon.
                </p>
                <button
                  onClick={() => setSent(false)}
                  className="mt-10 px-8 py-4 rounded-full bg-white/10 hover:bg-white/20 font-bold uppercase tracking-widest text-sm transition-colors"
                >
                  Send Another
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); setSent(true) }}
                className="bg-[#f8f4db] rounded-[3rem] p-10 md:p-16 space-y-8 soil-shadow"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#9f402d] mb-3">First Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Ramesh"
                      className="w-full bg-white/60 border-0 rounded-2xl px-6 py-4 font-headline font-bold text-[#173809] placeholder:text-[#173809]/30 placeholder:font-normal outline-none focus:ring-2 focus:ring-[#173809]/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#9f402d] mb-3">Last Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Patel"
                      className="w-full bg-white/60 border-0 rounded-2xl px-6 py-4 font-headline font-bold text-[#173809] placeholder:text-[#173809]/30 placeholder:font-normal outline-none focus:ring-2 focus:ring-[#173809]/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#9f402d] mb-3">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="ramesh@example.com"
                    className="w-full bg-white/60 border-0 rounded-2xl px-6 py-4 font-headline font-bold text-[#173809] placeholder:text-[#173809]/30 placeholder:font-normal outline-none focus:ring-2 focus:ring-[#173809]/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#9f402d] mb-3">Subject</label>
                  <select className="w-full bg-white/60 border-0 rounded-2xl px-6 py-4 font-headline font-bold text-[#173809] outline-none focus:ring-2 focus:ring-[#173809]/20 transition-all appearance-none cursor-pointer">
                    <option>Fertilizer Recommendation Help</option>
                    <option>Soil Report Question</option>
                    <option>Account & Billing</option>
                    <option>Partnership Inquiry</option>
                    <option>Something Else</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#9f402d] mb-3">Message</label>
                  <textarea
                    required
                    rows={6}
                    placeholder="Tell us what's going on with your field..."
                    className="w-full bg-white/60 border-0 rounded-2xl px-6 py-4 font-headline font-bold text-[#173809] placeholder:text-[#173809]/30 placeholder:font-normal outline-none focus:ring-2 focus:ring-[#173809]/20 transition-all resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#173809] text-white rounded-full py-5 font-bold text-sm tracking-widest uppercase hover:bg-[#2d4f1e] active:scale-95 transition-all shadow-lg"
                >
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
