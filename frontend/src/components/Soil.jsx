import React from 'react';
import { Card, Section, Stat, Badge, rs } from './ui.jsx';
import CropRecommendations from './CropRecommendations.jsx';

export default function Soil({ rec, t, lang }) {
  const h = rec.soilHealth;
  const e = rec.environment;
  const inc = rec.income;

  const grade = h.score >= 75 ? 'leaf' : h.score >= 55 ? 'amber' : 'rose';
  const gradeColor = { leaf: '#173809', amber: '#A8730F', rose: '#9F402D' }[grade];

  return (
    <div className="space-y-8">
      {/* --------------------------------------------------- health score */}
      <Section title={t('soilHealth')}>
        <Card className="p-5">
          <div className="flex items-center gap-5 flex-wrap">
            <Dial value={h.score} color={gradeColor} />
            <div className="min-w-0 flex-1">
              <div className="font-display text-5xl font-bold text-leaf-900 tabular-nums tracking-tightest">
                {h.score}<span className="text-base font-semibold text-leaf-500 ml-1.5">{t('outOf')}</span>
              </div>
              <Badge tone={grade}>{h.grade}</Badge>
              {h.untested.length > 0 && (
                <p className="text-xs text-leaf-600/80 mt-2">
                  {t('notTested')}: {h.untested.join(', ')}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            {h.parts.map((p) => (
              <div key={p.key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-leaf-800">{p.label}</span>
                  <span className="tabular-nums text-leaf-600">
                    {p.score == null ? t('notTested') : `${p.score}%`} · {p.detail}
                  </span>
                </div>
                <div className="h-2 bg-leaf-100 overflow-hidden">
                  <div
                    className={`h-full bar-grow ${p.score == null ? 'bg-leaf-200' : p.score >= 70 ? 'bg-leaf-700' : p.score >= 45 ? 'bg-[#C08A1E]' : 'bg-earth-500'}`}
                    style={{ width: `${p.score ?? 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      <CropRecommendations rec={rec} t={t} lang={lang} placement="soil" />

      {/* ---------------------------------------------------- trajectory */}
      <Section title={t('trajectory')} sub={t('trajectorySub')}>
        <Card className="p-5">
          <Trajectory data={rec.trajectory} t={t} />
          <p className="text-[11px] text-leaf-500 italic mt-3">{rec.trajectory.disclaimer}</p>
        </Card>
      </Section>

      {/* ---------------------------------------------------- environment */}
      <Section title={t('envSaved')}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Stat label={t('runoff')} value={e.runoffAvoidedKg} unit="kg N" tone="sky"
            sub={`${e.excessNAvoidedKg} kg of excess nitrogen not applied`} />
          <Stat label={t('co2e')} value={e.co2eAvoidedKg} unit="kg CO₂e" tone="leaf"
            sub={`${t('likeDriving')} ${e.co2eEquivalentKm.toLocaleString('en-IN')} ${t('km')}`} />
        </div>
        <p className="text-[11px] text-leaf-500 mt-2">{e.method}</p>
      </Section>

      {/* --------------------------------------------------- ratio check */}
      <Section title={t('ratioTitle')}>
        <Card className={`p-5 ${rec.ratio.ureaHeavy ? 'border-earth-300 bg-earth-50' : ''}`}>
          <div className="grid grid-cols-3 gap-3 text-center">
            <RatioCol label={t('thisPlan')} r={rec.ratio.applied} highlight />
            <RatioCol label={t('blanketDose')} r={rec.ratio.blanket} />
            <RatioCol label="Ideal" r={rec.ratio.ideal} />
          </div>
          <p className={`text-sm mt-4 leading-relaxed ${rec.ratio.ureaHeavy ? 'text-earth-700' : 'text-leaf-900/75'}`}>
            {rec.ratio.note}
          </p>
        </Card>
      </Section>

      {/* -------------------------------------------------------- income */}
      <Section title={t('incomeTitle')}>
        <Card className="p-5">
          <div className="space-y-2.5">
            <Row label={t('inputSaving')} value={rs(inc.inputSavingPerSeason)} />
            <Row label={t('timingSaving')} value={rs(inc.lossAvoidedByTiming)} />
            <div className="h-px bg-leaf-200 my-2" />
            <div className="flex justify-between items-baseline">
              <span className="font-semibold text-leaf-900">{t('totalKept')}</span>
              <span className="font-display text-3xl font-bold tabular-nums text-leaf-700 tracking-tightest">{rs(inc.totalPerSeason)}</span>
            </div>
          </div>
          <p className="text-[11px] text-leaf-500 mt-3">{inc.note}</p>
        </Card>
      </Section>
    </div>
  );
}

const Row = ({ label, value }) => (
  <div className="flex justify-between items-baseline gap-4">
    <span className="text-sm text-leaf-700">{label}</span>
    <span className="font-semibold tabular-nums text-leaf-900">{value}</span>
  </div>
);

const RatioCol = ({ label, r, highlight }) => (
  <div className={`px-2 py-3 ${highlight ? 'bg-leaf-700 text-leaf-50' : 'bg-leaf-100 text-leaf-800'}`}>
    <div className="text-[10px] font-semibold uppercase tracking-wide opacity-75">{label}</div>
    <div className="font-display text-xl font-bold tabular-nums mt-0.5">{r.N} : {r.P} : {r.K}</div>
  </div>
);

function Dial({ value, color }) {
  const R = 34, C = 2 * Math.PI * R;
  const dash = (Math.min(100, Math.max(0, value)) / 100) * C;
  return (
    <svg viewBox="0 0 80 80" className="w-24 h-24 shrink-0" role="img" aria-label={`Score ${value} of 100`}>
      <circle cx="40" cy="40" r={R} fill="none" stroke="#E7E3CA" strokeWidth="9" />
      <circle
        cx="40" cy="40" r={R} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${dash} ${C}`} transform="rotate(-90 40 40)"
        style={{ transition: 'stroke-dasharray .9s cubic-bezier(.16,1,.3,1)' }}
      />
      <text x="40" y="45" textAnchor="middle" className="fill-leaf-900" fontSize="20" fontWeight="700">{value}</text>
    </svg>
  );
}

function Trajectory({ data, t }) {
  const seasons = data.agrisense.map((d) => d.season);
  const all = [...data.agrisense, ...data.blanket];
  const max = Math.max(...all.map((d) => Math.max(d.N, d.K)), 10);
  const W = 320, H = 130, PAD = 6;

  const line = (rows, key) =>
    rows.map((d, i) => {
      const x = PAD + (i / (rows.length - 1)) * (W - PAD * 2);
      const y = H - PAD - (d[key] / max) * (H - PAD * 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

  return (
    <div>
      <div className="flex gap-4 text-xs mb-2 flex-wrap">
        <Legend color="#173809" label={`${t('withPlan')} — N`} />
        <Legend color="#9F402D" label={`${t('withBlanket')} — N`} dashed />
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[280px] h-40" role="img">
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={PAD} x2={W - PAD} y1={PAD + f * (H - PAD * 2)} y2={PAD + f * (H - PAD * 2)}
              stroke="#E7E3CA" strokeWidth="1" />
          ))}
          <path d={line(data.blanket, 'N')} fill="none" stroke="#9F402D" strokeWidth="2.5" strokeDasharray="5 4" strokeLinecap="round" />
          <path d={line(data.agrisense, 'N')} fill="none" stroke="#173809" strokeWidth="3" strokeLinecap="round" />
          {data.agrisense.map((d, i) => {
            const x = PAD + (i / (data.agrisense.length - 1)) * (W - PAD * 2);
            const y = H - PAD - (d.N / max) * (H - PAD * 2);
            return <circle key={i} cx={x} cy={y} r="3.5" fill="#173809" />;
          })}
        </svg>
      </div>
      <div className="flex justify-between text-[10px] text-leaf-500 px-1 tabular-nums">
        {seasons.map((s) => <span key={s}>{s === 0 ? 'Now' : `S${s}`}</span>)}
      </div>
    </div>
  );
}

const Legend = ({ color, label, dashed }) => (
  <span className="inline-flex items-center gap-1.5 text-leaf-700">
    <svg width="20" height="4" aria-hidden="true">
      <line x1="0" y1="2" x2="20" y2="2" stroke={color} strokeWidth="3" strokeDasharray={dashed ? '5 4' : ''} strokeLinecap="round" />
    </svg>
    {label}
  </span>
);
