import React from 'react';
import { Card, Section, Badge } from './ui.jsx';

const localeOf = (lang) => (lang === 'hi' ? 'hi-IN' : lang === 'gu' ? 'gu-IN' : 'en-IN');
const NUT_COLOR = { N: 'bg-leaf-700', P: 'bg-leaf-500', K: 'bg-[#A8730F]', S: 'bg-[#C08A1E]', Zn: 'bg-leaf-400' };

export default function Season({ rec, t, lang }) {
  const loc = localeOf(lang);
  if (!rec.calendar?.length) {
    return <Card className="p-6 text-leaf-700">Enter a sowing date to see the season plan.</Card>;
  }

  return (
    <Section title={t('calendar')} sub={t('calendarSub')}>
      <ol className="relative space-y-3 pl-7">
        <span className="absolute left-[11px] top-3 bottom-3 w-px bg-leaf-300" aria-hidden="true" />
        {rec.calendar.map((s) => {
        const passed = s.end < Date.now();
        return (
          <li key={s.index} className={`relative ${passed ? 'opacity-55' : ''}`}>
            <span className={`absolute -left-7 top-4 w-6 h-6 grid place-items-center text-[11px] font-bold text-leaf-50 ${
              passed ? 'bg-leaf-400' : s.beyondForecast ? 'bg-leaf-300' : 'bg-leaf-700'
            }`}>
              {s.index}
            </span>

            <Card className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-display font-bold text-leaf-900">{s.stage[lang] || s.stage.en}</div>
                  <div className="text-xs text-leaf-600 mt-0.5">
                    {s.daysAfterSowing === 0
                      ? new Date(s.start).toLocaleDateString(loc, { day: 'numeric', month: 'short' })
                      : `${s.daysAfterSowing} ${t('daysAfterSowing')} · ${new Date(s.start).toLocaleDateString(loc, { day: 'numeric', month: 'short' })} – ${new Date(s.end).toLocaleDateString(loc, { day: 'numeric', month: 'short' })}`}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(s.amounts).map(([k, v]) => (
                    <span key={k} className={`chip text-leaf-50 ${NUT_COLOR[k] || 'bg-leaf-700'}`}>
                      {k} {v} kg/ha
                    </span>
                  ))}
                </div>
              </div>

              {!passed && s.window && (
                <div className="mt-3 flex items-center gap-2.5 bg-sprout/40 border border-leaf-200 px-3 py-2">
                  <span className="text-leaf-600">◷</span>
                  <div className="text-xs text-leaf-800">
                    <span className="font-semibold">{t('bestWindow')}: </span>
                    {new Date(s.window.t).toLocaleDateString(loc, { weekday: 'long' })}{' '}
                    {new Date(s.window.t).toLocaleTimeString(loc, { hour: 'numeric', hour12: true })}
                    <span className="text-leaf-600/80"> — {s.window.reasons.slice(0, 2).join(', ')}</span>
                  </div>
                </div>
              )}

              {passed && (
                <div className="mt-3 text-xs text-leaf-500 italic">{t('splitPassed')}</div>
              )}
              {!passed && s.beyondForecast && (
                <div className="mt-3 text-xs text-leaf-500 italic">{t('beyondForecast')}</div>
              )}
            </Card>
          </li>
        );
      })}
      </ol>
    </Section>
  );
}
