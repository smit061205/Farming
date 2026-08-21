import { useState } from 'react'
import API_BASE from '../api.js'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

function SmsSimulator() {
  const [log, setLog] = useState([
    { from: 'sys', text: 'Send: AGRI <CROP> <pH> <N> <P> <K> <SIZE-ACRES>' },
  ])
  const [input, setInput] = useState('AGRI WHEAT 6.5 20 10 10 2')
  const [busy, setBusy] = useState(false)

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    setLog(l => [...l, { from: 'me', text }])
    setInput('')
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/api/engine/sms-sim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      setLog(l => [...l, { from: 'sys', text: data.reply, segments: data.segments }])
    } catch {
      setLog(l => [...l, { from: 'sys', text: 'Could not reach the simulator — check your connection.' }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mb-16">
      <div className="flex items-center gap-2.5 mb-1">
        <h2 className="text-2xl font-headline font-bold text-[#173809]">Same Engine, No App Needed</h2>
        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#b8862e]/12 text-[#8a641c]">Gateway integration pending</span>
      </div>
      <p className="text-[#43493e] leading-relaxed mb-4">
        This demonstrates the exact same dosing math above, reachable from a plain feature phone with no
        internet and no app — a structured text command in, a plain-language dose reply out. No login needed,
        matching how a real SMS gateway would work for a farmer who's never opened the app.
      </p>
      <div className="max-w-sm mx-auto">
        <div className="border-8 border-[#173809] bg-[#173809] rounded-2xl overflow-hidden">
          <div className="bg-[#173809] py-1.5 flex justify-center">
            <span className="w-16 h-1 rounded-full bg-white/30" />
          </div>
          <div className="bg-[#f8f4db] h-72 overflow-y-auto p-3 space-y-2">
            {log.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 text-xs font-mono whitespace-pre-wrap leading-relaxed rounded-lg ${
                  m.from === 'me' ? 'bg-[#173809] text-white' : 'bg-white border border-[#173809]/15 text-[#173809]'
                }`}>
                  {m.text}
                  {m.segments && <div className="text-[9px] opacity-50 mt-1">{m.segments} SMS segment{m.segments > 1 ? 's' : ''}</div>}
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white p-2 flex gap-1.5 border-t border-[#173809]/15">
            <input
              className="flex-1 border border-[#173809]/15 rounded-lg px-2 py-1.5 text-xs font-mono"
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
            />
            <button onClick={send} disabled={busy}
              className="bg-[#173809] text-white rounded-lg px-3 text-xs font-bold disabled:opacity-40">
              Send
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

const Code = ({ children }) => (
  <pre className="bg-[#f8f4db] border border-[#173809]/10 rounded-xl p-4 text-xs font-mono overflow-x-auto text-[#173809] whitespace-pre-wrap my-3">
    {children}
  </pre>
)

const Block = ({ title, children }) => (
  <section>
    <h2 className="text-2xl font-headline font-bold text-[#173809] mb-3">{title}</h2>
    <div className="space-y-3 text-[#43493e] leading-relaxed">{children}</div>
  </section>
)

const VERIFIED_CROPS = [
  ['Rice', '60-30-30', 'ICAR, irrigated Kharif'],
  ['Wheat', '120-60-40', 'ICAR general recommendation'],
  ['Maize', '135-62.5-50', 'ICAR (+ZnSO4, not yet modeled)'],
  ['Sugarcane', '250-125-150', 'ICAR general recommendation'],
  ['Cotton', '120-60-60', 'Maharashtra state POP, irrigated Bt cotton'],
  ['Soybean', '20-60-20', 'ICAR general recommendation'],
  ['Chickpea', '20-60-20', 'ICAR general recommended dose'],
  ['Groundnut', '20-50-30', 'ICAR-CCARI Goa trial'],
  ['Potato', '270-80-150', 'ICAR-CPRI commercial dose'],
  ['Tomato', '75-40-25', 'General/standard, non-hybrid'],
  ['Mustard', '80-40-40', 'ICAR general recommendation'],
  ['Sunflower', '60-80-60', 'ICAR recommended dose'],
  ['Onion', '100-50-50', 'ICAR-DOGR, rainy season'],
]

export default function MethodologyPage() {
  return (
    <div className="bg-[#fefae0] text-[#1d1c0d] overflow-x-hidden min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-32 pb-24 px-8 md:px-12 max-w-4xl mx-auto w-full">
        <header className="mb-16">
          <span className="text-[#9f402d] font-headline font-bold tracking-widest text-xs uppercase mb-4 block">
            The Methodology
          </span>
          <h1 className="text-5xl md:text-7xl font-headline font-bold text-[#173809] tracking-tighter leading-none mb-8">
            How It <span className="italic font-light">Works</span>
          </h1>
          <p className="text-xl text-[#43493e] font-medium leading-relaxed">
            Every formula, limit, and source behind the numbers you see. Nothing here is hidden, because
            a recommendation you cannot check is a recommendation you cannot trust.
          </p>
        </header>

        <SmsSimulator />

        <article className="space-y-14">
          <Block title="1 · The Dose">
            <p>For each nutrient, the deficit is simply what the crop needs minus what your soil already has:</p>
            <Code>deficit_kg_ha = max(0, crop_target_kg_ha − available_kg_ha)</Code>
            <p>That deficit is converted into a named product using the product's real nutrient fraction — Urea is 46% nitrogen, DAP is 46% P₂O₅, MOP is 60% K₂O:</p>
            <Code>product_kg_ha = deficit_kg_ha ÷ product_nutrient_fraction</Code>
            <p>
              DAP is <b>18-46-0</b> — 18% nitrogen alongside its 46% phosphorus. Whatever DAP a field needs for
              phosphorus also delivers a real amount of nitrogen for free, so the nitrogen figure is computed
              last and credited for that: <code className="text-xs bg-[#f8f4db] px-1.5 py-0.5 rounded">urea_kg_ha = max(0, n_deficit − dap_kg_ha × 0.18) ÷ 0.46</code>.
              Skipping this credit is the most common way a fertilizer calculator over-recommends urea — it's why
              phosphorus and potassium are always computed before nitrogen.
            </p>
            <p>When the result is zero, the plan says so plainly — that's the point of a soil-test-driven plan over a blanket dose.</p>
          </Block>

          <Block title="2 · Crop Nutrient Targets">
            <p>
              Each crop's N-P₂O₅-K₂O target is individually sourced from ICAR or a named state/institute
              publication — not a single generic number stretched across every crop.
            </p>
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-[#173809]/50 border-b border-[#173809]/15">
                    <th className="py-2 pr-3">Crop</th><th className="pr-3">N-P₂O₅-K₂O (kg/ha)</th><th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {VERIFIED_CROPS.map(([crop, npk, src]) => (
                    <tr key={crop} className="border-b border-[#173809]/8">
                      <td className="py-2 pr-3 font-bold text-[#173809]">{crop}</td>
                      <td className="pr-3 font-mono text-xs">{npk}</td>
                      <td className="text-xs text-[#43493e]/80">{src}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm">
              Any crop typed in that isn't on this list falls back to a generic placeholder target and is
              flagged with a <span className="font-bold text-[#8a641c]">Generic Estimate</span> badge on the
              Fertilizer Hub instead of the <span className="font-bold text-[#173809]">ICAR-Verified</span> badge
              — so the plan never quietly presents an unresearched number as equally reliable.
            </p>
          </Block>

          <Block title="3 · Soil Test Interpretation">
            <p>Available nutrient readings come in as ppm (mg/kg) from your soil test and convert to kg/ha for the top ~15cm furrow slice:</p>
            <Code>available_kg_ha = ppm × 2.24</Code>
            <p className="text-sm bg-[#fff7ea] border border-[#b8862e]/25 rounded-xl px-4 py-3">
              <b className="text-[#8a641c]">Open question, not yet resolved:</b> crop targets above follow the
              P₂O₅/K₂O convention, but this conversion factor is elemental-basis. Indian soil labs are
              inconsistent about which basis they report — if yours reports P₂O₅ directly, this comparison may
              currently overstate the real phosphorus deficit by roughly 2x. Flagged honestly rather than guessed at.
            </p>
          </Block>

          <Block title="4 · Over-Supply Detection">
            <p>Available nutrient at or above 1.5× the crop's target is flagged excess, not just "sufficient":</p>
            <Code>status = "excess" if available_kg_ha ≥ target_kg_ha × 1.5</Code>
            <p>This is the direct mechanism behind catching over-fertilization — the core failure mode the problem this app addresses is actually about, which a plain deficit-only calculation would silently miss entirely.</p>
          </Block>

          <Block title="5 · When To Apply">
            <p>The 5-day rain/heat forecast (Open-Meteo) adjusts both the timing and the split of the nitrogen dose:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm">
              <li>Above <b>25mm</b> rain in 5 days → split the nitrogen dose to reduce leaching/runoff loss</li>
              <li>Above <b>35°C</b> average forecast → incorporate urea into soil instead of surface-broadcasting, to limit ammonia volatilization (skipped if you've already selected an incorporated or banded application method)</li>
              <li>Drip/sprinkler irrigation → a 4-way fertigation-style split across the season, regardless of rain, since that's simply how those systems deliver nitrogen</li>
              <li>Flood/canal irrigation + heavy rain forecast → a more conservative 3-way split, since standing-water fields compound runoff and denitrification risk</li>
              <li>Field currently waterlogged → hold nitrogen entirely until it drains; applying into standing water loses it almost immediately</li>
            </ul>
          </Block>

          <Block title="6 · Soil Health Score">
            <p>A 0-100 composite, weighted toward pH since it gates how available every other nutrient actually is:</p>
            <Code>{`score = pH_score×0.40 + N_score×0.30 + P_score×0.15 + K_score×0.15`}</Code>
            <p>
              Each nutrient score peaks at the crop's own target and falls off symmetrically in both directions —
              a field with double the nitrogen it needs scores just as poorly as one with half, matching the
              over-supply detection above rather than rewarding "more nutrients" with no ceiling.
            </p>
          </Block>

          <Block title="7 · Cost & Environmental Impact">
            <p>
              Product cost is priced at India's NBS (Nutrient Based Subsidy) Kharif 2026 notified retail MRP for
              Urea, DAP, and MOP — the same rate a farmer actually pays at a dealer, cross-checked against the
              Department of Fertilizers notification.
            </p>
            <p>
              The "Average Approach" comparison on the Roadmap page is a modeled scenario, not this farmer's
              actual history (the app keeps no record of that): a typical blanket application at the full crop
              target plus a 25% over-application margin, representing a common pattern for farms applying
              fertilizer without a soil test — priced at the same real rates.
            </p>
            <p>
              CO₂e figures use an illustrative embodied-emissions factor for nitrogen (manufacture + field
              use), not a field-measured or IPCC-cited number — treat them as directional, not precise.
            </p>
          </Block>

          <Block title="8 · What This Is Not">
            <div className="bg-[#fff7ea] border border-[#b8862e]/25 rounded-xl p-5 text-sm space-y-2.5 text-[#8a641c]">
              <p><b>No agronomist has reviewed this app's specific implementation.</b> The underlying targets come from published ICAR and institute sources; the code applying them hasn't had a field-side audit.</p>
              <p><b>The AI never invents a number.</b> Groq only narrates the dose already computed by the deterministic math above — every figure it explains was calculated before it ever saw a prompt.</p>
              <p><b>Yield and income figures are illustrative reference values,</b> not a financial guarantee — real yield depends on far more than fertilizer.</p>
              <p><b>A "Generic Estimate" badge means exactly that.</b> That crop's target hasn't been individually sourced yet — treat those numbers as a rough starting point, not a precision dose.</p>
            </div>
          </Block>

          <Block title="9 · Sources">
            <ul className="text-sm space-y-1.5">
              <li>· ICAR — crop-wise general fertilizer recommendations, and institute-specific studies (CPRI, CCARI, DOGR) cited per crop above</li>
              <li>· Maharashtra state Package of Practices — irrigated Bt cotton dose</li>
              <li>· Dept. of Fertilizers, Govt. of India — NBS Kharif 2026 notified retail MRP</li>
              <li>· Open-Meteo — 5-day precipitation/temperature forecast API</li>
            </ul>
          </Block>
        </article>
      </main>

      <Footer />
    </div>
  )
}
