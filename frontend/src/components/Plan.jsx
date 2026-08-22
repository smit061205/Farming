import React, { useState } from 'react';
import { Card, Section, Badge, rs } from './ui.jsx';
import { renderEngine } from '../engineStrings.js';
import CropRecommendations from './CropRecommendations.jsx';

const AMEND_NAME = {
  gypsum: { en: 'Gypsum', hi: 'जिप्सम', gu: 'જીપ્સમ' },
  lime: { en: 'Agricultural lime', hi: 'चूना', gu: 'ચૂનો' },
};

const NUTRIENT = {
  N: { label: 'N', full: { en: 'Nitrogen', hi: 'नाइट्रोजन', gu: 'નાઇટ્રોજન' }, color: 'bg-leaf-700' },
  P: { label: 'P', full: { en: 'Phosphorus', hi: 'फॉस्फोरस', gu: 'ફોસ્ફરસ' }, color: 'bg-leaf-500' },
  K: { label: 'K', full: { en: 'Potash', hi: 'पोटाश', gu: 'પોટાશ' }, color: 'bg-[#A8730F]' },
  S: { label: 'S', full: { en: 'Sulphur', hi: 'सल्फर', gu: 'સલ્ફર' }, color: 'bg-[#C08A1E]' },
  Zn: { label: 'Zn', full: { en: 'Zinc', hi: 'जिंक', gu: 'ઝીંક' }, color: 'bg-leaf-400' },
};

export default function Plan({ rec, t, lang }) {
  const [showWhy, setShowWhy] = useState(false);
  const keys = ['N', 'P', 'K', 'S', 'Zn'].filter((k) => rec.dose[k] > 0 || rec.zeroDoseReasons?.[k]);

  return (
    <div className="space-y-8">
      {/* -------------------------------------------------------- the dose */}
      <Section
        title={t('yourPlan')}
        sub={`${rec.cropName} · ${rec.areaHa} ${t('hectare')} · ${rec.zoneName[lang] || rec.zoneName.en}`}
        right={<Badge tone={rec.tier === 'A' ? 'leaf' : 'slate'}>{rec.tier === 'A' ? t('tierA') : t('tierB')}</Badge>}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {keys.map((k) => {
            const v = rec.dose[k];
            const zero = v === 0;
            const n = NUTRIENT[k];
            return (
              <Card key={k} className={`p-4 ${zero ? 'bg-sprout/40' : ''}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-7 h-7 ${n.color} text-leaf-50 text-xs font-bold grid place-items-center`}>
                    {n.label}
                  </span>
                  <span className="text-xs font-semibold text-leaf-700">{n.full[lang] || n.full.en}</span>
                </div>
                {zero ? (
                  <div className="text-lg font-bold text-leaf-600">{t('applyNone')}</div>
                ) : (
                  <div className="font-display text-4xl font-bold tabular-nums text-leaf-900 leading-none tracking-tightest">
                    {v}<span className="text-sm font-semibold text-leaf-500 ml-1">kg</span>
                  </div>
                )}
                <div className="text-[11px] text-leaf-600/80 mt-1">
                  {zero ? '' : `${t('perHectare')} · ${rec.dosePerField[k]} kg ${t('forYourField')}`}
                </div>
              </Card>
            );
          })}
        </div>

        {/* zero-dose reasons — the most important message in the product */}
        {Object.entries(rec.zeroDoseReasons || {}).length > 0 && (
          <div className="mt-3 space-y-2">
            {Object.entries(rec.zeroDoseReasons).map(([k, why]) => (
              <div key={k} className="flex gap-3 items-start bg-leaf-700 text-leaf-50 px-5 py-4">
                <span className="text-lg leading-none mt-0.5">✓</span>
                <p className="text-sm leading-relaxed">{renderEngine(why, lang)}</p>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setShowWhy((s) => !s)}
          className="mt-3 text-sm font-semibold text-leaf-700 hover:text-leaf-900 underline underline-offset-4">
          {t('whyThis')} {showWhy ? '▲' : '▼'}
        </button>
        {showWhy && (
          <Card className="mt-2 p-4 fade-up">
            <ul className="space-y-2 text-sm text-leaf-800">
              {Object.entries(rec.method_explain || {}).map(([k, m]) => (
                <li key={k} className="flex gap-2">
                  <span className="font-bold w-6 shrink-0">{k}</span>
                  <code className="text-xs bg-white rounded px-2 py-1 border border-leaf-200 flex-1">{m}</code>
                </li>
              ))}
            </ul>
            <p className="text-xs text-leaf-600 mt-3">
              {rec.tier === 'A' ? t('tierAExplain') : t('tierBExplain')}
            </p>
          </Card>
        )}
      </Section>

      <CropRecommendations rec={rec} t={t} lang={lang} placement="plan" />

      {rec.budgetNotice && (
        <Section
          title={t('budgetAlert')}
          right={<Badge tone={rec.budgetNotice.provider === 'template' ? 'slate' : 'leaf'}>
            {rec.budgetNotice.provider === 'template' ? t('budgetRuleBased') : t('cropSuggestionsAI')}
          </Badge>}
        >
          <Card className="p-5 border-earth-300 bg-earth-50">
            <p className="text-sm text-earth-700 leading-relaxed">{rec.budgetNotice.text}</p>
          </Card>
        </Section>
      )}

      {/* ------------------------------------------------------ what to buy */}
      <Section
        title={rec.budgetPlan?.limitedBy?.length ? t('buyWithinBudget') : t('buyThis')}
        sub={rec.budgetPlan?.limitedBy?.length ? `${t('budgetCap')}: ${rs(rec.budgetPlan.totalCost)} / ${rs(rec.budgetPlan.spendLimit)}` : undefined}
      >
        <div className="space-y-2">
          {rec.products.length === 0 && (
            <Card className="p-5 text-center text-leaf-700">{t('applyNone')}</Card>
          )}
          {rec.products.map((p) => (
            <Card key={p.id} className="p-4 flex items-center gap-4 hover:border-leaf-700 transition-colors">
              <div className="w-11 h-11 bg-sprout grid place-items-center shrink-0">
                <BagIcon className="w-6 h-6 text-leaf-700" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display font-bold text-leaf-900">{p.name[lang] || p.name.en}</div>
                <div className="text-xs text-leaf-600/90 mt-0.5">{renderEngine(p, lang)}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-display text-xl font-bold tabular-nums text-leaf-900">
                  {p.bags} <span className="text-xs font-semibold text-leaf-500">{t('bags')}</span>
                </div>
                <div className="text-[11px] text-leaf-600 tabular-nums">{p.totalKg} {t('kg')} · {rs(p.costTotal)}</div>
              </div>
            </Card>
          ))}
        </div>

        {rec.organic && (
          <Card className="p-4 mt-2 border-earth-300 bg-earth-50">
            <div className="flex items-center gap-3">
              <span className="text-xl">🌱</span>
              <div className="flex-1">
                <div className="font-semibold text-earth-700">{rec.organic.name[lang] || rec.organic.name.en}</div>
                <div className="text-xs text-earth-700/80">
                  {rec.organic.totalTonnes} t · {rs(rec.organic.cost)} · N {Math.round(rec.organic.credit.N)} ·
                  {' '}P {Math.round(rec.organic.credit.P)} · K {Math.round(rec.organic.credit.K)} kg/ha
                </div>
              </div>
            </div>
          </Card>
        )}

        {rec.amendments?.map((a) => (
          <Card key={a.id} className="p-4 mt-2 bg-earth-50 border-earth-300">
            <div className="text-sm font-bold text-earth-700">{AMEND_NAME[a.id]?.[lang] || AMEND_NAME[a.id]?.en} — {a.kgPerHa} kg/ha</div>
            <div className="text-xs text-earth-700/80 mt-0.5">{renderEngine(a, lang)}</div>
          </Card>
        ))}
      </Section>

      {/* ----------------------------------------------------- cost compare */}
      <Section title={t('costCompare')}>
        <Card className="p-5">
          <CostBar
            label={t('thisPlan')}
            value={rec.comparison.planCost}
            max={rec.comparison.blanketCost}
            tone="leaf"
          />
          <div className="h-3" />
          <CostBar
            label={t('blanketDose')}
            value={rec.comparison.blanketCost}
            max={rec.comparison.blanketCost}
            tone="earth"
          />

          {(() => {
            const cmp = rec.comparison;
            return (
              <div className={`mt-5 px-5 py-4 ${cmp.savedTotal > 0 ? 'bg-leaf-700' : 'bg-earth-500'} text-leaf-50`}>
                {cmp.savedTotal > 0 ? (
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <span className="font-semibold">{t('youSave')}</span>
                    <span className="font-display text-3xl font-bold tabular-nums tracking-tightest">
                      {rs(cmp.savedTotal)}
                      <span className="text-sm font-semibold opacity-80 ml-2">
                        ({cmp.savedPct}%) {t('perSeason')}
                      </span>
                    </span>
                  </div>
                ) : (
                  <p className="text-sm font-medium">{t('costsMore')}</p>
                )}
                <p className="text-[11px] opacity-80 mt-1.5">{t('priceCompareNote')}</p>
              </div>
            );
          })()}
        </Card>
      </Section>

      {/* --------------------------------------------------------- warnings */}
      {rec.warnings?.length > 0 && (
        <Section title={t('warnings')}>
          <div className="space-y-2">
            {rec.warnings.map((w, i) => (
              <Card key={i} className={`p-4 flex gap-3 ${w.level === 'warn' ? 'bg-earth-50 border-earth-300' : 'bg-white'}`}>
                <span className="text-lg leading-none">{w.level === 'warn' ? '⚠️' : 'ℹ️'}</span>
                <p className="text-sm text-leaf-800 leading-relaxed">{renderEngine(w, lang)}</p>
              </Card>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function CostBar({ label, value, max, tone }) {
  const pct = max > 0 ? Math.max(6, (value / max) * 100) : 0;
  const bg = tone === 'leaf' ? 'bg-leaf-700' : 'bg-earth-500';
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-sm font-semibold text-leaf-800">{label}</span>
        <span className="font-display text-xl font-bold tabular-nums text-leaf-900">{rs(value)}</span>
      </div>
      <div className="h-4 bg-leaf-100 overflow-hidden">
        <div className={`h-full ${bg} bar-grow`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const BagIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
    <path d="M7 8h10l1.5 11a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2L7 8Z" fill="currentColor" opacity=".25" />
    <path d="M7 8h10l1.5 11a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2L7 8Z" stroke="currentColor" strokeWidth="1.6" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
