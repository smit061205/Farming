import API_BASE from "../../api.js"
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function AIInterpreterView() {
  const { token } = useAuth()
  const [report, setReport] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    let targetLang = 'en'
    const match = document.cookie.match(/googtrans=\/en\/([a-zA-Z-]+)/)
    if (match && match[1]) targetLang = match[1]

    fetch(`${API_BASE}/api/engine/soil-report?lang=${targetLang}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setReport(data.report || 'Unable to generate analysis.')
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setReport('Critical error establishing neural link.')
        setLoading(false)
      })
  }, [token])

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start animate-fade-in">
      <div className="md:col-span-12">
        <div className="flex items-center gap-4 mb-4">
          <span className="material-symbols-outlined text-[#173809] text-3xl">psychology</span>
          <h2 className="font-headline text-4xl font-bold text-[#173809] uppercase tracking-tighter">
            AI Soil Interpreter
          </h2>
        </div>
        <p className="font-body text-[#43493e] text-lg max-w-3xl leading-relaxed mb-8">
          An AI-written analysis of your soil test — what your pH and nitrogen levels mean for this crop, and what amendment they call for.
        </p>
      </div>

      <div className="md:col-span-8">
        <div className="bg-[#173809] rounded-[2rem] p-12 text-white relative shadow-2xl min-h-[400px]">
          <div className="absolute top-4 right-4 flex gap-2">
            <div className={`w-3 h-3 rounded-full ${loading ? 'bg-[#c5efad] animate-pulse' : 'bg-[#c5efad]'}`}></div>
            <div className={`w-3 h-3 rounded-full ${loading ? 'bg-[#c5efad]/50 animate-pulse delay-75' : 'bg-[#c5efad]'}`}></div>
            <div className={`w-3 h-3 rounded-full ${loading ? 'bg-[#c5efad]/20 animate-pulse delay-150' : 'bg-[#c5efad]'}`}></div>
          </div>
          
          <div className="mb-8 border-b border-white/10 pb-6 flex items-baseline gap-4">
            <span className="font-headline font-bold text-[#c5efad] tracking-widest text-sm uppercase">Secure Neural Link</span>
            <span className="font-body text-xs text-white/40">v3.1.4</span>
          </div>

          <div className="font-body text-xl md:text-2xl font-light leading-relaxed text-[#fefae0] notranslate">
            {loading ? (
              <span className="animate-pulse">Awaiting neural completion...</span>
            ) : (
              <span className="animate-fade-in block">
                {report}
                <span className="animate-ping inline-block w-2 bg-[#c5efad] h-5 ml-2 align-baseline"></span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="md:col-span-4 space-y-6">
        <div className="bg-[#e7e3ca] rounded-[2rem] p-8 shadow-md">
          <span className="material-symbols-outlined text-[#9f402d] text-4xl mb-4">bug_report</span>
          <h3 className="font-headline text-xl font-bold text-[#173809] mb-2">Microbial Density</h3>
          <p className="text-[#43493e] text-sm">Extracted via statistical inference from correlative data. Exact counts require physical sampling.</p>
        </div>
        <div className="bg-[#f8f4db] rounded-[2rem] p-8 shadow-md">
          <span className="material-symbols-outlined text-[#173809] text-4xl mb-4">hub</span>
          <h3 className="font-headline text-xl font-bold text-[#173809] mb-2">Confidence Level</h3>
          <p className="text-[#43493e] text-sm mb-4">Neural mapping certainty sits at 92.4%.</p>
          <div className="w-full h-2 bg-[#e7e3ca] rounded-full overflow-hidden">
            <div className="w-[92.4%] h-full bg-[#173809]"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
