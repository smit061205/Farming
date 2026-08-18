import { useEffect, useState } from 'react'
import API_BASE from '../../api'
import { useAuth } from '../../context/AuthContext'

const fmtDate = (ts) => ts
  ? new Date(ts * 1000).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' })
  : '—'

export default function ArchiveView() {
  const { token } = useAuth()
  const [history, setHistory] = useState([])
  const [isLoading, setIsLoading] = useState(!!token)

  useEffect(() => {
    if (!token) return
    fetch(`${API_BASE}/api/engine/recommendation-history`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setHistory(data.history || [])
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [token])

  return (
    <>
      <div className="max-w-7xl mx-auto mb-16 grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
        <div className="md:col-span-8">
          <span className="text-[#9f402d] font-headline font-bold tracking-widest text-xs uppercase mb-4 block">Historical Database</span>
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-headline font-bold text-[#173809] tracking-tighter leading-none mb-8">
            Recommendation <br />Archive
          </h1>
          <p className="text-xl md:text-2xl text-[#43493e] font-light max-w-2xl leading-relaxed">
            Every precision fertilizer plan generated for your fields, so you can track what was recommended and when.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="bg-[#f8f4db] rounded-[2rem] p-4 md:p-10 soil-shadow overflow-x-auto">
          {isLoading ? (
            <div className="animate-pulse h-64 bg-[#e7e3ca]/60 rounded-2xl" />
          ) : history.length === 0 ? (
            <div className="text-center py-16 text-[#173809]/50">
              No recommendations yet — run an analysis on the Analyze page to start building your history.
            </div>
          ) : (
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="border-b border-[#173809]/10">
                  <th className="pb-6 text-sm font-bold uppercase tracking-widest text-[#173809]/50">Date</th>
                  <th className="pb-6 text-sm font-bold uppercase tracking-widest text-[#173809]/50">Crop / Field</th>
                  <th className="pb-6 text-sm font-bold uppercase tracking-widest text-[#173809]/50">Headline</th>
                  <th className="pb-6 text-sm font-bold uppercase tracking-widest text-[#173809]/50 text-right">N · P · K (kg)</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => {
                  const n = r.nutrients?.nitrogen?.product_kg_total ?? 0
                  const p = r.nutrients?.phosphorus?.product_kg_total ?? 0
                  const k = r.nutrients?.potassium?.product_kg_total ?? 0
                  return (
                    <tr key={r.id} className="border-b border-[#173809]/5 hover:bg-[#e7e3ca]/50 transition-colors">
                      <td className="py-6 align-top">
                        <span className="text-[#43493e] font-medium whitespace-nowrap">{fmtDate(r.created_at)}</span>
                      </td>
                      <td className="py-6 align-top">
                        <span className="font-headline font-bold text-[#173809]">{r.crop_type}</span>
                        <p className="text-xs text-[#173809]/40">{r.field_size} {r.field_size_unit}</p>
                      </td>
                      <td className="py-6 align-top">
                        <span className="text-[#43493e] text-sm">{r.headline}</span>
                      </td>
                      <td className="py-6 align-top text-right whitespace-nowrap">
                        <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-[#c5efad] text-[#173809]">
                          {n} · {p} · {k}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
