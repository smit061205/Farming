import React, { useState } from 'react';
import { Card, Section, Badge } from './ui.jsx';
import { smsSim } from '../api.js';

/* ------------------------------------------------------- SMS / IVR demo */

export function SmsSim({ t }) {
  const [log, setLog] = useState([
    { from: 'sys', text: 'Send: AGRI <CROP> <pH> <N> <P> <K> <hectares>' },
  ]);
  const [input, setInput] = useState('AGRI WHEAT 6.8 220 18 240 2');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setLog((l) => [...l, { from: 'me', text }]);
    setBusy(true);
    try {
      const r = await smsSim({ text });
      setLog((l) => [...l, { from: 'sys', text: r.reply, segments: r.segments }]);
    } catch (e) {
      setLog((l) => [...l, { from: 'sys', text: String(e.message) }]);
    } finally { setBusy(false); }
  };

  return (
    <Section
      title={t('smsTitle')}
      sub="The same engine, reachable from a feature phone with no internet."
      right={<Badge tone="amber">Gateway integration pending</Badge>}
    >
      <div className="max-w-sm mx-auto">
        <div className="border-8 border-leaf-900 bg-leaf-900 overflow-hidden">
          <div className="bg-leaf-900 py-1.5 flex justify-center">
            <span className="w-16 h-1 rounded-full bg-leaf-500" />
          </div>
          <div className="bg-leaf-100 h-96 overflow-y-auto p-3 space-y-2">
            {log.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 text-xs font-mono whitespace-pre-wrap leading-relaxed ${
                  m.from === 'me' ? 'bg-leaf-700 text-leaf-50' : 'bg-white border border-leaf-200 text-leaf-900'
                }`}>
                  {m.text}
                  {m.segments && <div className="text-[9px] opacity-50 mt-1">{m.segments} SMS segment(s)</div>}
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white p-2 flex gap-1.5 border-t border-leaf-200">
            <input className="flex-1 border border-leaf-300 px-2 py-1.5 text-xs font-mono"
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()} />
            <button onClick={send} disabled={busy}
              className="bg-leaf-700 text-leaf-50 px-3 text-xs font-bold disabled:opacity-40">
              Send
            </button>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------ methodology */

export function Methodology({ meta, t }) {
  const th = meta.thresholds;
  return (
    <div className="space-y-8 max-w-3xl">
      <Section
        title={t('methodology')}
        sub="Every formula, limit and source behind the numbers. Nothing here is hidden, because a recommendation you cannot check is a recommendation you cannot trust."
      >
        <Card className="p-5 space-y-5">
          <Block title="1 · The dose">
            <p>For crops with a calibrated equation for your zone (Tier A) we use the STCR targeted-yield formula:</p>
            <Code>FX = a × TargetYield − b × SoilTestValue − OrganicCredit</Code>
            <p>For every other crop (Tier B) we use the ICAR general recommendation, corrected by your soil-test class:</p>
            <Code>FX = BaseDose × classFactor    (Low {th.classFactor.Low} · Medium {th.classFactor.Medium} · High {th.classFactor.High})</Code>
            <p>Both are clamped to zero at the bottom and to a state safe-maximum at the top. When the result is zero, we say so — that is the point of the product.</p>
          </Block>

          <Block title="2 · Soil test interpretation">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-leaf-500 border-b border-leaf-300">
                  <th className="py-2">Parameter</th><th>Low</th><th>Medium</th><th>High</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {Object.entries(th.soilClasses).map(([k, c]) => (
                  <tr key={k} className="border-b border-leaf-100">
                    <td className="py-2 font-medium">{k} <span className="text-leaf-500 text-xs">({c.unit})</span></td>
                    <td>&lt; {c.low}</td><td>{c.low}–{c.high}</td><td>&gt; {c.high}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-leaf-600 mt-2">Sulphur is deficient below {th.deficiency.S.critical} ppm; zinc below {th.deficiency.Zn.critical} ppm.</p>
          </Block>

          <Block title="3 · Which fertilizer, in what order">
            <p>Phosphorus sources carry nitrogen, so the order matters:</p>
            <Code>{`1 sulphur (SSP / ammonium sulphate)
2 phosphorus (SSP, then DAP)
3 CREDIT the nitrogen inside DAP against the nitrogen requirement
4 remaining nitrogen (urea)
5 potassium (MOP)
6 zinc (zinc sulphate)`}</Code>
            <p>Skipping step 3 is the most common way a fertilizer calculator over-recommends urea.</p>
          </Block>

          <Block title="4 · When to apply">
            <p>Rain is not simply good or bad. Light rain carries urea into the soil; heavy rain washes it off the field.</p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Above <b>{th.weatherRules.heavyRainMm24h} mm</b> in 24 h → wait (runoff and leaching)</li>
              <li><b>{th.weatherRules.lightRainMinMm}–{th.weatherRules.lightRainMaxMm} mm</b> coming in 6–24 h → apply now, it is the best window</li>
              <li>Dry {th.weatherRules.dryHours} h + above <b>{th.weatherRules.hotTempC}°C</b> + alkaline soil → mix into the soil instead of broadcasting</li>
              <li>Wind above <b>{th.weatherRules.windyKmh} km/h</b> → uneven spread</li>
              <li>Below <b>{th.weatherRules.coldTempC}°C</b> → roots take up very little</li>
            </ul>
            <p className="text-xs text-leaf-600">If the crop is at a stage that cannot wait, the advice flips from “wait” to “apply, but incorporate it” — delay is not always the safe answer.</p>
          </Block>

          <Block title="5 · Loss and impact model">
            <p>Nitrogen loss starts at {th.lossModel.volatilizationBase}% for surface-applied urea, {'+'}{th.lossModel.volatHotBonus} points above {th.lossModel.volatHotTempC}°C, {'+'}{th.lossModel.volatPhBonus} on alkaline soil, and −{th.lossModel.volatLightRainRelief} when light rain will wash it in.</p>
            <p>Greenhouse gas uses the IPCC default: 1% of applied nitrogen is emitted as N₂O, giving <b>{th.impact.n2oCo2ePerKgN} kg CO₂e per kg N</b>, plus {th.impact.ureaManufactureCo2ePerKgN} kg for manufacturing.</p>
          </Block>

          <Block title="6 · What this is not">
            <div className="bg-earth-50 border border-earth-300 p-4 text-sm text-earth-700 space-y-2">
              <p><b>No agronomist has reviewed these thresholds.</b> They come from published ICAR and Soil Health Card material. Validation with a Krishi Vigyan Kendra is planned, not done.</p>
              <p><b>The soil projection is a model, not a field trial.</b> It shows direction, not a guarantee.</p>
              <p><b>The loss figures are indicative.</b> They estimate what is typically lost under these conditions — they are not a measurement of your field.</p>
              <p><b>Tier B crops are not STCR-calibrated.</b> The badge on your recommendation tells you which one you got.</p>
            </div>
          </Block>

          <Block title="7 · Sources">
            <ul className="text-sm space-y-1 text-leaf-700">
              <li>· ICAR — Soil Test Crop Response (STCR) targeted-yield methodology</li>
              <li>· Soil Health Card scheme — soil test interpretation ranges, Government of India</li>
              <li>· IPCC Guidelines for National Greenhouse Gas Inventories — N₂O emission factor</li>
              <li>· IFA — 4R Nutrient Stewardship (right source, rate, time, place)</li>
              <li>· OpenWeather — 5-day / 3-hour forecast API</li>
            </ul>
          </Block>
        </Card>
      </Section>
    </div>
  );
}

const Block = ({ title, children }) => (
  <div>
    <h3 className="font-display text-lg font-bold text-leaf-900 mb-2">{title}</h3>
    <div className="space-y-2 text-sm text-leaf-800 leading-relaxed">{children}</div>
  </div>
);

const Code = ({ children }) => (
  <pre className="bg-leaf-100 border border-leaf-200 p-3 text-xs font-mono overflow-x-auto text-leaf-800 whitespace-pre-wrap">
    {children}
  </pre>
);
