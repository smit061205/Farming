import API_BASE from "../api.js"
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { buildFieldTabs } from '../utils/fields'

const inr = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`

const NUTRIENT_STATUS_STYLE = {
  deficient: { label: 'Apply Now', color: '#9f402d', bg: 'rgba(159,64,45,0.1)' },
  excess: { label: 'Over-Supplied', color: '#8a641c', bg: 'rgba(184,134,46,0.14)' },
  sufficient: { label: 'On Target', color: '#173809', bg: 'rgba(23,56,9,0.08)' },
}

const PRODUCT_COLOR = {
  'Granular Urea': '#173809',
  'DAP (Diammonium Phosphate)': '#b8862e',
  'Muriate of Potash (MOP)': '#9f402d',
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

function NutrientBeforeAfter({ label, data }) {
  const barMax = Math.max(data.target_kg_ha, data.available_kg_ha, 1)
  const beforePct = Math.min(100, (data.available_kg_ha / barMax) * 100)
  const afterPct = Math.min(100, (data.target_kg_ha / barMax) * 100)
  const status = NUTRIENT_STATUS_STYLE[data.status] || NUTRIENT_STATUS_STYLE.sufficient
  return (
    <div className="p-6 rounded-2xl bg-[#f8f4db]">
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold text-[#173809] capitalize">{label}</span>
        <span
          className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
          style={{ backgroundColor: status.bg, color: status.color }}
        >
          {status.label}
        </span>
      </div>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs text-[#173809]/50 mb-1">
            <span>Now</span><span className="font-bold text-[#173809]/70">{data.available_kg_ha} kg/ha</span>
          </div>
          <div className="h-2 bg-[#e7e3ca] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${beforePct}%`, backgroundColor: status.color }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-[#173809]/50 mb-1">
            <span>Target</span><span className="font-bold text-[#173809]/70">{data.target_kg_ha} kg/ha</span>
          </div>
          <div className="h-2 bg-[#e7e3ca] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#173809]" style={{ width: `${afterPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function SeasonTimeline({ seasonPlan }) {
  const [activeId, setActiveId] = useState(seasonPlan.stages[0]?.id)
  const active = seasonPlan.stages.find(s => s.id === activeId) || seasonPlan.stages[0]
  const hasChart = seasonPlan.chart_products.length > 0

  return (
    <div>
      {/* Stage timeline — clickable */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
        {seasonPlan.stages.map((stage, i) => (
          <div key={stage.id} className="flex items-center shrink-0">
            <button
              onClick={() => setActiveId(stage.id)}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-2xl transition-colors ${
                activeId === stage.id ? 'bg-[#173809] text-white' : 'bg-[#f8f4db] text-[#173809]/60 hover:text-[#173809]'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{stage.icon}</span>
              <span className="text-xs font-bold whitespace-nowrap">{stage.label}</span>
            </button>
            {i < seasonPlan.stages.length - 1 && (
              <span className="material-symbols-outlined text-[#173809]/20 mx-1">chevron_right</span>
            )}
          </div>
        ))}
      </div>

      {/* Active stage detail */}
      {active && (
        <div className="bg-[#f8f4db] rounded-2xl p-6 md:p-8 mb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-full bg-[#173809]/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[#173809] text-xl">{active.icon}</span>
            </div>
            <div>
              <h4 className="font-headline text-lg font-bold text-[#173809]">{active.label}</h4>
              <p className="text-xs text-[#173809]/50">{active.window}</p>
            </div>
          </div>
          <ul className="space-y-3">
            {active.actions.map((action, i) => (
              <li key={i} className="flex gap-3 text-sm text-[#43493e] leading-relaxed">
                <span className="material-symbols-outlined text-[#173809]/40 text-[18px] mt-0.5 shrink-0">arrow_right</span>
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Season-wide chart */}
      {hasChart && (
        <div>
          <h4 className="font-bold text-[#173809] mb-4">Fertilizer Applied, By Stage</h4>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={seasonPlan.chart_data} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#173809" strokeOpacity={0.08} vertical={false} />
              <XAxis dataKey="stage" tick={{ fill: '#173809', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `${v}kg`} tick={{ fill: '#173809', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => `${v} kg`} cursor={{ fill: '#173809', fillOpacity: 0.04 }} />
              <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700, color: '#173809' }} />
              {seasonPlan.chart_products.map(product => (
                <Bar key={product} dataKey={product} stackId="fert" fill={PRODUCT_COLOR[product] || '#173809'} radius={[4, 4, 0, 0]} maxBarSize={60} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default function RoadmapPage() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [impact, setImpact] = useState(null)
  const [seasonPlan, setSeasonPlan] = useState(null)
  const [isLoading, setIsLoading] = useState(!!token)
  const [activeFieldId, setActiveFieldId] = useState(null) // null = primary field

  const fieldTabs = buildFieldTabs(user)
  const activeCrop = activeFieldId
    ? (user?.fields || []).find(f => f.id === activeFieldId)?.cropType
    : user?.soil_data?.cropType

  useEffect(() => {
    if (!token) return
    setIsLoading(true)
    const fieldQuery = activeFieldId ? `?field_id=${activeFieldId}` : ''
    fetch(`${API_BASE}/api/engine/sustainability-impact${fieldQuery}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setImpact(data.status === 'success' ? data.impact : null)
        setSeasonPlan(data.status === 'success' ? data.season_plan : null)
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [token, activeFieldId])

  const costData = impact ? [
    { name: 'Blanket Application', value: impact.cost.baseline_inr, fill: '#e7e3ca' },
    { name: 'This Plan', value: impact.cost.recommended_inr, fill: '#173809' },
  ] : []

  const scoreDelta = impact ? impact.projected_health_score - impact.health_score : 0

  return (
    <div className="bg-[#fefae0] text-[#1d1c0d] overflow-x-hidden min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-32 pb-24 px-8 md:px-12 max-w-[1920px] mx-auto w-full">
        <header className="mb-12 max-w-7xl mx-auto">
          <span className="text-[#9f402d] font-headline font-bold tracking-widest text-xs uppercase mb-4 block">
            Your Roadmap
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-headline font-bold text-[#173809] tracking-tighter leading-none mb-6">
            Fertilizer &amp; Soil Health,<br />Mapped Out{activeCrop ? ` for ${activeCrop}` : ''}.
          </h1>
          <p className="text-lg md:text-xl text-[#43493e] font-light max-w-2xl leading-relaxed">
            Where this field stands today, what to do about it in order, and where it lands if you follow the plan — all from this field's own soil test, not a generic checklist.
          </p>
        </header>

        <div className="max-w-7xl mx-auto mb-20">
          {!token ? (
            <div className="bg-white rounded-[2.5rem] p-12 border border-[#173809]/8 text-center">
              <p className="text-[#173809]/60 mb-6">Sign in and analyze your field to see its personalized roadmap.</p>
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
              Add a soil test for this field to see its personalized roadmap.
            </div>
          ) : (
            <>
              {/* ── Before / After hero ── */}
              <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-[#173809]/8 shadow-sm mb-8">
                <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
                  <div>
                    <span className="text-[#9f402d] font-headline font-bold tracking-widest text-xs uppercase mb-1 block">Your Outcome</span>
                    <h3 className="text-2xl font-headline font-bold text-[#173809]">Today vs. After This Plan</h3>
                  </div>
                  {scoreDelta > 0 && (
                    <span className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full bg-[#c5efad]/40 text-[#173809] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">trending_up</span>
                      +{scoreDelta} points
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-10 items-center">
                  <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#173809]/40 mb-4">Today</p>
                    <div className="w-32 h-32 mx-auto rounded-full flex items-center justify-center bg-[#e7e3ca]">
                      <span className="text-5xl font-headline font-black text-[#173809]">{impact.health_score}</span>
                    </div>
                    <p className="text-sm text-[#43493e] mt-4">Soil Health Score</p>
                    <p className="text-xs text-[#173809]/40 mt-1">pH {impact.before_after.ph.before}</p>
                  </div>
                  <div className="flex md:flex-col justify-center">
                    <span className="material-symbols-outlined text-4xl text-[#9f402d] rotate-90 md:rotate-0">arrow_forward</span>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#173809]/40 mb-4">After This Plan</p>
                    <div className="w-32 h-32 mx-auto rounded-full flex items-center justify-center bg-[#173809]">
                      <span className="text-5xl font-headline font-black text-[#c5efad]">{impact.projected_health_score}</span>
                    </div>
                    <p className="text-sm text-[#43493e] mt-4">Soil Health Score</p>
                    <p className="text-xs text-[#173809]/40 mt-1">pH {impact.before_after.ph.after}</p>
                  </div>
                </div>
              </div>

              {/* ── Impact stats ── */}
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
                  sub={`${impact.reference.crop_yield_kg_ha.toLocaleString('en-IN')} → ${impact.reference.projected_yield_kg_ha.toLocaleString('en-IN')} kg/ha · ${inr(impact.income.net_income_impact_inr)} net`}
                />
              </div>

              {/* ── Per-nutrient before/after ── */}
              <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-[#173809]/8 shadow-sm mb-8">
                <div className="mb-6">
                  <span className="text-[#9f402d] font-headline font-bold tracking-widest text-xs uppercase mb-1 block">Soil Chemistry</span>
                  <h3 className="text-2xl font-headline font-bold text-[#173809]">Nutrient Levels: Now vs. Target</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Object.entries(impact.before_after.nutrients).map(([label, data]) => (
                    <NutrientBeforeAfter key={label} label={label} data={data} />
                  ))}
                </div>
              </div>

              {/* ── The season plan ── */}
              {seasonPlan && (
                <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-[#173809]/8 shadow-sm mb-8">
                  <div className="mb-8">
                    <span className="text-[#9f402d] font-headline font-bold tracking-widest text-xs uppercase mb-2 block">The Whole Season</span>
                    <h3 className="text-2xl font-headline font-bold text-[#173809]">How To Get There</h3>
                    <p className="text-[#43493e] text-sm mt-2 max-w-2xl">
                      Tap a stage to see what to do then and why — phosphorus and potassium go in fully at sowing since neither moves through soil, while nitrogen is timed and split around this field's own rain forecast.
                    </p>
                  </div>
                  <SeasonTimeline seasonPlan={seasonPlan} />
                </div>
              )}

              {/* ── Cost comparison ── */}
              <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-[#173809]/8 shadow-sm">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <h3 className="text-xl font-bold text-[#173809]">Fertilizer Cost: Blanket vs. This Plan</h3>
                </div>
                <p className="text-sm text-[#43493e] mb-6">
                  {impact.cost.recommended_inr === 0
                    ? "This plan costs you nothing this season — your soil already meets or exceeds every target, so there's nothing worth buying."
                    : `This plan costs ${inr(impact.cost.recommended_inr)} against ${inr(impact.cost.baseline_inr)} for a blanket application without a soil test.`}
                </p>
                <div className="space-y-5">
                  {costData.map((entry) => {
                    const maxVal = Math.max(costData[0].value, costData[1].value, 1)
                    const pct = entry.value > 0 ? Math.max((entry.value / maxVal) * 100, 3) : 0
                    return (
                      <div key={entry.name}>
                        <div className="flex justify-between items-baseline mb-2">
                          <span className="text-sm font-bold text-[#173809]">{entry.name}</span>
                          <span className="text-sm font-bold text-[#173809]">{inr(entry.value)}</span>
                        </div>
                        <div className="h-8 bg-[#f8f4db] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: entry.fill }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-[#173809]/40 mt-6">{impact.baseline_method} {impact.disclaimer}</p>
              </div>
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
