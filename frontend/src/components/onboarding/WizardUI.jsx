// Reusable wizard field primitives — ported from the step-based onboarding
// flow in the reference AgriSense build (Downloads/Goal/agrisense/client/src/
// components/ui.jsx: Field, Toggle, and the Wizard's Num helper), restyled to
// this app's rounded/pill visual language instead of the reference's square
// hairline-bordered cards, so the wizard doesn't clash with the rest of the
// site (Dashboard, Roadmap, Fertilizer Hub all use the same rounded system).

export function Field({ label, hint, badge, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 ml-2">
        <label className="font-label text-xs uppercase tracking-widest text-[#43493e]">{label}</label>
        {badge && <span className="text-[9px] font-bold uppercase tracking-wide text-[#173809]/40">{badge}</span>}
      </div>
      {children}
      {hint && <p className="text-xs text-[#43493e]/60 mt-1.5 ml-2">{hint}</p>}
    </div>
  )
}

export function Toggle({ options, value, onChange, cols = 2 }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full px-4 py-3 text-sm font-bold transition-all ${
            value === o.value
              ? 'bg-[#173809] text-white shadow'
              : 'bg-white text-[#173809]/60 border border-[#173809]/15 hover:text-[#173809]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Num({ label, value, onChange, step = '1', unit, badge, ph, unusual, required }) {
  return (
    <Field label={label} badge={badge} hint={unit}>
      <input
        type="number"
        step={step}
        inputMode="decimal"
        min={ph ? 0 : 0}
        max={ph ? 14 : undefined}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
        className={`w-full bg-white rounded-full px-5 py-3.5 text-base font-semibold text-[#173809] focus:outline-none focus:ring-2 transition-shadow shadow-sm border ${
          unusual ? 'border-[#9f402d]/50 focus:ring-[#9f402d]/20' : 'border-transparent focus:ring-[#173809]/20'
        }`}
      />
      {unusual && <p className="text-[9px] text-[#9f402d] font-bold mt-1 ml-2">Unusual — double-check</p>}
    </Field>
  )
}
