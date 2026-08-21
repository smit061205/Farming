import React from 'react';
import { Card, Section, Badge, TrafficLight, verdictStyle, WeatherIcon, rs } from './ui.jsx';
import { renderEngine, engineText } from '../engineStrings.js';

const localeOf = (lang) => (lang === 'hi' ? 'hi-IN' : lang === 'gu' ? 'gu-IN' : 'en-IN');

export default function Timing({ rec, t, lang }) {
  const a = rec.advisory;
  if (!a) return <Card className="p-6 text-leaf-700">No forecast available.</Card>;

  const v = verdictStyle(a.verdict);
  const loc = localeOf(lang);
  const verdictLabel = t(`verdict${a.verdict}`);

  const days = groupByDay(rec.weather.blocks);

  return (
    <div className="space-y-8">
      {/* ------------------------------------------------------- the verdict */}
      <section className="fade-up">
        <div className={`${v.bg} p-6 sm:p-8 text-leaf-50 relative overflow-hidden`}>
          <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-leaf-50/10" />
          <div className="relative flex items-start gap-4">
            <TrafficLight verdict={a.verdict} className="mt-1 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="eyebrow text-leaf-50/70">{t('timing')}</div>
              <h2 className="font-display text-3xl sm:text-5xl font-bold mt-1 leading-[.95] tracking-tightest">{verdictLabel}</h2>

              {a.override && (
                <div className="mt-4 bg-leaf-50/15 px-4 py-3">
                  <div className="font-bold text-sm">{renderEngine(a.override, lang)}</div>
                  <p className="text-sm opacity-95 mt-0.5 leading-relaxed">{renderEngine(a.override, lang, 'msg')}</p>
                </div>
              )}

              <div className="mt-3 space-y-2.5">
                {a.rulesFired.length === 0 && (
                  <p className="text-sm opacity-95">{engineText(lang, 'clear')}</p>
                )}
                {a.rulesFired.map((r) => (
                  <div key={r.id} className="flex gap-2.5">
                    <span className="text-xs font-mono opacity-60 mt-1 shrink-0">{r.id}</span>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">{renderEngine(r, lang)}</div>
                      <p className="text-sm opacity-90 leading-relaxed">{renderEngine(r, lang, 'msg')}</p>
                      <div className="text-[11px] opacity-70 mt-0.5 italic">{renderEngine({ key: r.mechKey }, lang)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- ₹ at risk */}
      {a.risk?.rupeesAtRisk > 0 && (
        <Card className="p-5 border-earth-300 bg-earth-50">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <div>
              <div className="font-display text-4xl font-bold tabular-nums text-earth-500 tracking-tightest">{rs(a.risk.rupeesAtRisk)}</div>
              <div className="text-sm font-semibold text-leaf-900/75">{t('atRisk')}</div>
            </div>
            <div className="text-right">
              <div className="font-display text-3xl font-bold tabular-nums text-earth-500">{a.risk.nLossPct}%</div>
              <div className="text-xs text-leaf-900/70">{t('ofNitrogen')}</div>
            </div>
          </div>
          <ul className="mt-4 space-y-1 text-xs text-leaf-900/70">
            {a.risk.factors.map((f, i) => <li key={i}>· {f}</li>)}
          </ul>
          <p className="text-[11px] text-leaf-500 mt-2 italic">{a.risk.disclaimer}</p>
        </Card>
      )}

      {/* ---------------------------------------------------- best windows */}
      <Section title={t('bestWindows')}>
        <div className="grid gap-2 sm:grid-cols-3">
          {a.windows.map((w, i) => (
            <Card key={w.t} className={`p-5 ${i === 0 ? 'bg-leaf-700 text-leaf-50 border-leaf-700' : ''}`}>
              <div className="flex items-center justify-between">
                <Badge tone={i === 0 ? 'leaf' : 'slate'}>{i === 0 ? '★ Best' : `#${i + 1}`}</Badge>
                <span className={`text-xs tabular-nums ${i === 0 ? 'text-leaf-50/70' : 'text-leaf-500'}`}>{Math.round(w.tempC)}°C</span>
              </div>
              <div className="mt-3 font-semibold text-current opacity-80">
                {new Date(w.t).toLocaleDateString(loc, { weekday: 'long' })}
              </div>
              <div className="font-display text-3xl font-bold tabular-nums leading-tight tracking-tightest">
                {new Date(w.t).toLocaleTimeString(loc, { hour: 'numeric', hour12: true })}
              </div>
              <p className="text-xs opacity-70 mt-2 leading-relaxed">
                {w.reasons.slice(0, 2).join(', ')}
              </p>
            </Card>
          ))}
        </div>
      </Section>

      {/* -------------------------------------------------------- forecast */}
      <Section
        title={t('forecast')}
        right={
          <Badge tone={rec.weather.source === 'openweather' ? 'leaf' : 'amber'}>
            {rec.weather.source === 'openweather'
              ? `${t('liveWeather')}${rec.weather.place ? ` · ${rec.weather.place}` : ''}`
              : t('sampleWeather')}
          </Badge>
        }
      >
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="flex gap-2 min-w-max pb-1">
            {days.map((d) => (
              <Card key={d.key} className="p-4 w-28 shrink-0 text-center">
                <div className="text-xs font-semibold text-leaf-700">
                  {new Date(d.t).toLocaleDateString(loc, { weekday: 'short' })}
                </div>
                <WeatherIcon icon={d.icon} className="w-9 h-9 mx-auto my-1.5" />
                <div className="font-display text-base font-bold tabular-nums text-leaf-900">
                  {Math.round(d.max)}° <span className="text-leaf-400 font-medium">{Math.round(d.min)}°</span>
                </div>
                <div className={`text-xs tabular-nums mt-1 font-bold ${d.rain > 25 ? 'text-earth-500' : d.rain > 0 ? 'text-leaf-600' : 'text-leaf-300'}`}>
                  {d.rain > 0 ? `${d.rain} mm` : '—'}
                </div>
              </Card>
            ))}
          </div>
        </div>
        {rec.weather.note && <p className="text-xs text-earth-500 mt-2">{rec.weather.note}</p>}
      </Section>
    </div>
  );
}

function groupByDay(blocks) {
  const map = new Map();
  for (const b of blocks) {
    const key = new Date(b.t).toDateString();
    if (!map.has(key)) map.set(key, { key, t: b.t, max: -99, min: 99, rain: 0, icons: [] });
    const d = map.get(key);
    d.max = Math.max(d.max, b.tempC);
    d.min = Math.min(d.min, b.tempC);
    d.rain += b.rainMm;
    d.icons.push(b.icon);
  }
  return [...map.values()].map((d) => ({
    ...d,
    rain: Math.round(d.rain * 10) / 10,
    icon: d.icons.find((i) => i.startsWith('09') || i.startsWith('10')) || d.icons[Math.floor(d.icons.length / 2)],
  }));
}
