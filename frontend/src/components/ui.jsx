import React from 'react';

export const Leaf = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
    <path d="M24 42V16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <path d="M24 26C24 16 16.5 8 7 6c-2 10 5.5 20 17 20Z" fill="currentColor" opacity=".85" />
    <path d="M24 34c0-9 7.5-17 17-19 2 10-5.5 19-17 19Z" fill="currentColor" opacity=".5" />
  </svg>
);

export function Card({ children, className = '', ...rest }) {
  return <div className={`card ${className}`} {...rest}>{children}</div>;
}

export function Section({ title, sub, children, right }) {
  return (
    <section className="fade-up">
      <div className="flex items-end justify-between gap-4 mb-3">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-leaf-700 tracking-tightest">{title}</h2>
          {sub && <p className="text-sm text-leaf-900/70 mt-1.5 max-w-2xl leading-relaxed">{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Stat({ label, value, unit, tone = 'leaf', sub }) {
  const tones = {
    leaf: 'bg-white border-leaf-200 text-leaf-800',
    amber: 'bg-earth-50 border-earth-300 text-[#7A5A0A]',
    sky: 'bg-white border-leaf-300 text-leaf-700',
    rose: 'bg-earth-50 border-earth-300 text-earth-700',
  };
  return (
    <div className={`border px-4 py-3 ${tones[tone]}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wider opacity-70">{label}</div>
      <div className="text-2xl font-bold tabular-nums leading-tight mt-0.5">
        {value}{unit && <span className="text-sm font-semibold opacity-70 ml-1">{unit}</span>}
      </div>
      {sub && <div className="text-xs opacity-75 mt-0.5">{sub}</div>}
    </div>
  );
}

export function Field({ label, hint, children, badge }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <label className="label">{label}</label>
        {badge && <span className="text-[10px] font-semibold uppercase tracking-wide text-leaf-500 mb-1.5">{badge}</span>}
      </div>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export function Toggle({ options, value, onChange, cols = 2 }) {
  return (
    <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`border px-3 py-2.5 text-sm font-semibold transition-all ${
            value === o.value
              ? 'bg-leaf-700 border-leaf-700 text-leaf-50'
              : 'bg-white border-leaf-300 text-leaf-700 hover:border-leaf-700'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const VERDICT_STYLE = {
  GO:     { bg: 'bg-leaf-700',  text: 'text-leaf-700',  soft: 'bg-sprout border-leaf-300',   dot: 'bg-leaf-600' },
  MODIFY: { bg: 'bg-[#A8730F]', text: 'text-[#A8730F]', soft: 'bg-earth-50 border-earth-300', dot: 'bg-[#A8730F]' },
  WAIT:   { bg: 'bg-earth-500', text: 'text-earth-500', soft: 'bg-earth-50 border-earth-300', dot: 'bg-earth-500' },
};
export const verdictStyle = (v) => VERDICT_STYLE[v] || VERDICT_STYLE.MODIFY;

export function TrafficLight({ verdict, className = '' }) {
  const order = ['WAIT', 'MODIFY', 'GO'];
  return (
    <div className={`flex flex-col gap-1.5 ${className}`} aria-hidden="true">
      {order.map((v) => {
        const on = v === verdict;
        const color = v === 'GO' ? 'bg-sprout' : v === 'MODIFY' ? 'bg-[#E8C169]' : 'bg-[#E8A08F]';
        return (
          <span
            key={v}
            className={`w-3.5 h-3.5 rounded-full transition-all ${on ? `${color} shadow-[0_0_0_4px_rgba(255,255,255,.35)]` : 'bg-white/25'}`}
          />
        );
      })}
    </div>
  );
}

export function Badge({ children, tone = 'leaf' }) {
  const tones = {
    leaf: 'bg-sprout text-leaf-700',
    amber: 'bg-earth-100 text-[#7A5A0A]',
    rose: 'bg-earth-500 text-leaf-50',
    slate: 'bg-white text-leaf-600 border border-leaf-300',
  };
  return <span className={`chip ${tones[tone]}`}>{children}</span>;
}

export const rs = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export const WeatherIcon = ({ icon, className = 'w-8 h-8' }) => {
  const rain = icon?.startsWith('09') || icon?.startsWith('10') || icon?.startsWith('11');
  const cloud = icon?.startsWith('02') || icon?.startsWith('03') || icon?.startsWith('04');
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
      {!cloud && !rain && <circle cx="16" cy="14" r="7" fill="#F5B841" />}
      {(cloud || rain) && <path d="M9 20a5 5 0 0 1 .6-9.96A7 7 0 0 1 23 11.5 4.5 4.5 0 0 1 22.5 20H9Z" fill="#B7C6CE" />}
      {rain && <>
        <path d="M11 23l-1.5 4M16 23l-1.5 4M21 23l-1.5 4" stroke="#4A9BD1" strokeWidth="2" strokeLinecap="round" />
      </>}
    </svg>
  );
};
