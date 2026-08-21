import API_BASE from "../api.js"
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { buildFieldTabs } from '../utils/fields'

const inr = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`

const CATEGORY_ICON = {
  soil: 'science',
  fertilizer: 'eco',
  timing: 'schedule',
  'soil-health': 'compost',
  monitor: 'history',
}

const PRIORITY_STYLE = {
  critical: { label: 'Do This First', dot: '#9f402d', chipBg: 'rgba(159,64,45,0.1)', chipText: '#9f402d' },
  important: { label: 'This Season', dot: '#b8862e', chipBg: 'rgba(184,134,46,0.12)', chipText: '#8a641c' },
  routine: { label: 'Ongoing', dot: '#173809', chipBg: 'rgba(23,56,9,0.08)', chipText: '#173809' },
}

function RoadmapStep({ step, isLast }) {
  const style = PRIORITY_STYLE[step.priority] || PRIORITY_STYLE.routine
  return (
    <div className="flex gap-5">
      <div className="flex flex-col items-center shrink-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-headline font-bold text-white text-sm"
          style={{ backgroundColor: style.dot }}
        >
          {step.order}
        </div>
        {!isLast && <div className="w-px flex-1 bg-[#173809]/10 my-2" />}
      </div>
      <div className={isLast ? 'pb-0' : 'pb-8'}>
        <div className="flex items-center gap-3 mb-1.5 flex-wrap">
          <h4 className="font-headline text-lg font-bold text-[#173809]">{step.title}</h4>
          <span
            className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
            style={{ backgroundColor: style.chipBg, color: style.chipText }}
          >
            {style.label}
          </span>
        </div>
        <p className="text-[#43493e] text-sm leading-relaxed max-w-2xl">{step.description}</p>
      </div>
    </div>
  )
}

function ImpactStat({ icon, label, value, sub, dark }) {
  return (
    <div className={`p-8 rounded-[2rem] soil-shadow ${dark ? 'bg-[#173809] text-white' : 'bg-white'}`}>
      <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-6 ${dark ? 'bg-white/10' : 'bg-[#173809]/10'}`}>
        <span className={`material-symbols-outlined text-2xl ${dark ? 'text-[#c5efad]' : 'text-[#173809]'}`}>{icon}</span>
      </div>
      <p className={`text-4xl font-headline font-bold mb-1 ${dark ? 'text-[#c5efad]' : 'text-[#173809]'}`}>{value}</p>
      <p className={`text-sm font-bold uppercase tracking-widest ${dark ? 'text-white/50' : 'text-[#173809]/40'}`}>{label}</p>
      {sub && <p className={`text-sm mt-3 leading-relaxed ${dark ? 'text-white/70' : 'text-[#43493e]'}`}>{sub}</p>}
    </div>
  )
}

export default function SustainabilityPage() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [impact, setImpact] = useState(null)
  const [roadmap, setRoadmap] = useState([])
  const [isLoading, setIsLoading] = useState(!!token)
  const [activeFieldId, setActiveFieldId] = useState(null) // null = primary field

  const fieldTabs = buildFieldTabs(user)

  useEffect(() => {
    if (!token) return
    setIsLoading(true)
    const fieldQuery = activeFieldId ? `?field_id=${activeFieldId}` : ''
    fetch(`${API_BASE}/api/engine/sustainability-impact${fieldQuery}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setImpact(data.status === 'success' ? data.impact : null)
        setRoadmap(data.status === 'success' ? (data.roadmap || []) : [])
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [token, activeFieldId])

  const costData = impact ? [
    { name: 'Blanket Application', value: impact.cost.baseline_inr, fill: '#e7e3ca' },
    { name: 'Precision Recommendation', value: impact.cost.recommended_inr, fill: '#173809' },
  ] : []

  return (
    <div className="bg-[#fefae0] text-[#1d1c0d] overflow-x-hidden min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-32 pb-24 px-8 md:px-12 max-w-[1920px] mx-auto w-full">
        <header className="mb-16 grid grid-cols-1 md:grid-cols-12 gap-12 items-end max-w-7xl mx-auto">
          <div className="md:col-span-8">
            <span className="text-[#9f402d] font-headline font-bold tracking-widest text-xs uppercase mb-4 block">
              Sustainability Impact
            </span>
            <h1 className="text-4xl sm:text-6xl md:text-8xl font-headline font-bold text-[#173809] tracking-tighter leading-none mb-8">
              Precision Over <br />
              <span className="italic font-light">Excess.</span>
            </h1>
            <p className="text-xl md:text-2xl text-[#43493e] font-light max-w-2xl leading-relaxed">
              Over-fertilizing doesn't raise yield — it degrades soil, wastes money, and runs off into waterways. Every recommendation here applies only the calculated deficit, nothing more.
            </p>
          </div>
        </header>

        {/* ── Personalized Impact ── */}
        <div className="max-w-7xl mx-auto mb-20">
          {!token ? (
            <div className="bg-white rounded-[2.5rem] p-12 border border-[#173809]/8 text-center">
              <p className="text-[#173809]/60 mb-6">Sign in and analyze your field to see your field's personalized sustainability impact.</p>
              <button
                onClick={() => navigate('/login')}
                className="bg-[#173809] text-white px-8 py-4 rounded-full font-bold hover:scale-105 active:scale-95 transition-transform"
              >
                Sign In
              </button>
            </div>
          ) : (
          <>
            {fieldTabs.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 mb-8">
                {fieldTabs.map(tab => (
                  <button
                    key={tab.id || 'primary'}
                    onClick={() => setActiveFieldId(tab.id)}
                    className={`px-5 py-2.5 rounded-full text-sm font-bold capitalize transition-colors ${
                      activeFieldId === tab.id ? 'bg-[#173809] text-white' : 'bg-white text-[#173809]/60 border border-[#173809]/10 hover:text-[#173809]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          {isLoading ? (
            <div className="animate-pulse bg-[#e7e3ca] h-96 rounded-[2.5rem] w-full" />
          ) : !impact ? (
            <div className="bg-white rounded-[2.5rem] p-12 border border-[#173809]/8 text-center text-[#173809]/50">
              Add a soil test for this field to see its personalized sustainability impact.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <ImpactStat
                  icon="eco"
                  label="Less Fertilizer Used"
                  value={`${impact.fertilizer_reduction_pct}%`}
                  sub="vs. blanket application without a soil test"
                  dark
                />
                <ImpactStat
                  icon="cloud"
                  label="CO₂e Avoided"
                  value={`${impact.co2e_avoided_kg} kg`}
                  sub="From unnecessary nitrogen manufacture & runoff"
                />
                <ImpactStat
                  icon="savings"
                  label="Input Cost Saved"
                  value={inr(impact.cost.savings_inr)}
                  sub="On this field, this season"
                />
                <ImpactStat
                  icon="trending_up"
                  label="Est. Yield Uplift"
                  value={`+${impact.yield_uplift_pct}%`}
                  sub={`Net income impact: ${inr(impact.income.net_income_impact_inr)}`}
                />
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-[#173809]/8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-[#173809]">Fertilizer Cost: Blanket vs. Precision</h3>
                  <span className="text-[10px] uppercase tracking-widest text-[#173809]/40 font-bold">Soil Health Score: {impact.health_score}/100</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={costData} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#173809" strokeOpacity={0.08} horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `₹${v}`} tick={{ fill: '#173809', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#173809', fontWeight: 700, fontSize: 12 }} axisLine={false} tickLine={false} width={180} />
                    <Tooltip formatter={(v) => inr(v)} cursor={{ fill: '#173809', fillOpacity: 0.04 }} />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={44}>
                      {costData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-[#173809]/40 mt-4">{impact.baseline_method} {impact.disclaimer}</p>
              </div>

              {roadmap.length > 0 && (
                <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-[#173809]/8 shadow-sm mt-8">
                  <div className="mb-8">
                    <span className="text-[#9f402d] font-headline font-bold tracking-widest text-xs uppercase mb-2 block">Your Plan</span>
                    <h3 className="text-2xl font-headline font-bold text-[#173809]">Fertilizer &amp; Soil Health Roadmap</h3>
                    <p className="text-[#43493e] text-sm mt-2 max-w-2xl">
                      In order, built from this field's own soil test and precision dose — not a generic checklist.
                    </p>
                  </div>
                  <div>
                    {roadmap.map((step, i) => (
                      <RoadmapStep key={step.order} step={step} isLast={i === roadmap.length - 1} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          </>
          )}
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="bg-[#f8f4db] p-12 rounded-[2rem] soil-shadow">
            <div className="w-16 h-16 rounded-full bg-[#173809]/10 flex items-center justify-center mb-8">
              <span className="material-symbols-outlined text-[#173809] text-3xl">science</span>
            </div>
            <h2 className="text-3xl font-headline font-bold text-[#173809] mb-4">Why Excess Hurts</h2>
            <p className="text-[#43493e] leading-relaxed">
              Applying more nitrogen than a crop can use doesn't sit in the soil waiting — it leaches into groundwater, runs off into waterways, and volatilizes into the air as greenhouse gas. It also acidifies soil over time, degrading the very productivity it was meant to boost.
            </p>
          </div>

          <div className="bg-[#173809] text-white p-12 rounded-[2rem] soil-shadow">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-8">
              <span className="material-symbols-outlined text-[#c5efad] text-3xl">water_drop</span>
            </div>
            <h2 className="text-3xl font-headline font-bold text-[#c5efad] mb-4">Weather-Aware Timing</h2>
            <p className="text-white/80 leading-relaxed">
              A dose that's right on paper can still wash away in the wrong weather. The engine checks the 5-day rain and heat forecast and splits or times the application to keep nutrients where the crop can actually use them.
            </p>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  )
}
