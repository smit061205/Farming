import API_BASE from "../../api.js"
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function AIInterpreterView({ fieldId }) {
  const { token } = useAuth()
  const [report, setReport] = useState('')
  const [status, setStatus] = useState('loading') // 'loading' | 'ok' | 'no_data' | 'unavailable'

  useEffect(() => {
    if (!token) return
    setStatus('loading')
    let targetLang = 'en'
    const match = document.cookie.match(/googtrans=\/en\/([a-zA-Z-]+)/)
    if (match && match[1]) targetLang = match[1]

    const fieldQuery = fieldId ? `&field_id=${fieldId}` : ''
    fetch(`${API_BASE}/api/engine/soil-report?lang=${targetLang}${fieldQuery}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setReport(data.report || '')
        setStatus(data.status || 'unavailable')
      })
      .catch(err => {
        console.error(err)
        setReport('')
        setStatus('unavailable')
      })
  }, [token, fieldId])

  const loading = status === 'loading'

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

      <div className="md:col-span-12">
        <div className="bg-[#173809] rounded-[2rem] p-12 text-white relative shadow-2xl min-h-[280px] flex flex-col justify-center">
          <div className="absolute top-4 right-4 flex gap-2">
            <div className={`w-3 h-3 rounded-full ${loading ? 'bg-[#c5efad] animate-pulse' : 'bg-[#c5efad]'}`}></div>
            <div className={`w-3 h-3 rounded-full ${loading ? 'bg-[#c5efad]/50 animate-pulse delay-75' : 'bg-[#c5efad]'}`}></div>
            <div className={`w-3 h-3 rounded-full ${loading ? 'bg-[#c5efad]/20 animate-pulse delay-150' : 'bg-[#c5efad]'}`}></div>
          </div>

          <div className="mb-8 border-b border-white/10 pb-6 flex items-baseline gap-4">
            <span className="font-headline font-bold text-[#c5efad] tracking-widest text-sm uppercase">AI Analysis</span>
          </div>

          <div className="font-body text-xl md:text-2xl font-light leading-relaxed text-[#fefae0] notranslate">
            {loading ? (
              <span className="animate-pulse">Reading your soil test…</span>
            ) : status === 'no_data' ? (
              <span className="block text-lg text-white/70">
                Add a pH and nitrogen reading for this field to get an AI analysis of it.
              </span>
            ) : status === 'unavailable' ? (
              <span className="block text-lg text-white/70">
                The AI analysis is temporarily unavailable — please check back shortly.
              </span>
            ) : (
              <span className="animate-fade-in block">
                {report}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
