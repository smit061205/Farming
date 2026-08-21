import React, { useState, useMemo } from 'react';
import { Card, Field, Toggle, Badge } from './ui.jsx';
import SoilUpload from './SoilUpload.jsx';
import LocationPicker from './LocationPicker.jsx';
import { nearestZone, MAX_ZONE_COVERAGE_KM } from '../geo.js';

const ZONE_DEFAULTS = {
  middle: { ph: 7.6, oc: 0.45, n: 210, p: 22, k: 245, ec: 0.4, s: 9, zn: 0.5 },
  north: { ph: 7.9, oc: 0.32, n: 185, p: 18, k: 195, ec: 0.5, s: 7, zn: 0.4 },
  saurashtra: { ph: 8.1, oc: 0.38, n: 195, p: 15, k: 285, ec: 0.6, s: 8, zn: 0.45 },
};

// 1 hectare = 2.47105 acres — the internationally standard conversion, not
// a regional unit like bigha/guntha whose size varies by state and would
// need a state to convert correctly.
const HA_PER_ACRE = 0.404686;

// The STCR "targeted yield" coefficient (a) is calibrated per crop against
// quintal/ha specifically — that unit stays canonical internally. 1 quintal
// = 100 kg = 0.1 tonne, both exact SI-derived conversions.
const QUINTAL_PER_UNIT = { quintal: 1, tonne: 10, kg: 0.01 };

export default function Wizard({ meta, t, lang, onSubmit, busy, error }) {
  const [step, setStep] = useState(1);
  const [usedDefaults, setUsedDefaults] = useState(false);
  const [areaUnit, setAreaUnit] = useState('ha');
  const [areaText, setAreaText] = useState('2');
  const [yieldUnit, setYieldUnit] = useState('quintal');
  const [yieldText, setYieldText] = useState('');

  const [form, setForm] = useState({
    areaHa: 2,
    place: '',
    lat: 23.2156, lon: 72.6369,
    irrigation: 'canal',
    ph: '', oc: '', n: '', p: '', k: '', ec: '', s: '', zn: '',
    cropId: 'wheat',
    targetYield: '',
    sowingDate: '',
    alreadySown: false,
    method: 'broadcast',
    organicId: '', organicTonnes: '',
    budget: '',
    waterlogged: false,
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const crop = useMemo(
    () => meta.crops.find((c) => c.id === form.cropId),
    [meta.crops, form.cropId],
  );

  // The zone is derived from wherever the farmer's field actually is (nearest
  // centroid to the picked point) rather than asked for directly — same
  // input the dosing engine has always used, just no longer a guess. Only
  // Gujarat has real STCR calibration, so a point too far from all 3 zones
  // gets no zone at all — the engine falls back to the generic ICAR tier
  // rather than a wrong Gujarat zone being asserted for it.
  const zoneMatch = useMemo(() => nearestZone(form.lat, form.lon, meta.zones), [form.lat, form.lon, meta.zones]);
  const inCoverage = !!zoneMatch && zoneMatch.distanceKm <= MAX_ZONE_COVERAGE_KM;
  const zoneId = inCoverage ? zoneMatch.zone.id : null;
  const tier = (zoneId && crop?.tier?.[zoneId]) || 'B';

  const groups = useMemo(() => {
    const g = {};
    for (const c of meta.crops) (g[c.group] ||= []).push(c);
    return g;
  }, [meta.crops]);

  // A one-click starting point for farmers with no soil test at all. When the
  // location matches a real Gujarat zone we use its own typical values;
  // everywhere else we fall back to the midpoint of each published Soil
  // Health Card "Medium" band (the same bands the engine itself classifies
  // against) — a real, sourced number, not a made-up one.
  const genericDefaults = useMemo(() => {
    const sc = meta.thresholds?.soilClasses || {};
    const mid = (k) => (sc[k] ? Math.round(((sc[k].low + sc[k].high) / 2) * 100) / 100 : undefined);
    const def = meta.thresholds?.deficiency || {};
    return {
      ph: 7.0,
      oc: mid('OC'),
      n: mid('N'),
      p: mid('P'),
      k: mid('K'),
      ec: 0.6,
      s: def.S ? Math.round(def.S.critical * 1.5 * 10) / 10 : undefined,
      zn: def.Zn ? Math.round(def.Zn.critical * 1.3 * 100) / 100 : undefined,
    };
  }, [meta.thresholds]);

  const fillDefaults = () => {
    const d = ZONE_DEFAULTS[zoneId] || genericDefaults;
    if (!d) return;
    setForm((f) => ({ ...f, ...d }));
    setUsedDefaults(true);
  };

  // areaText mirrors exactly what's typed, in whichever unit is currently
  // selected — converting through hectares on every keystroke would fight
  // the cursor while typing decimals. form.areaHa (always hectares) only
  // gets updated as a side effect, and areaText is only ever re-derived
  // from it deliberately, when the unit itself changes.
  const onAreaTextChange = (v) => {
    setAreaText(v);
    const num = parseFloat(v);
    if (!isNaN(num)) {
      set('areaHa', areaUnit === 'acre' ? num * HA_PER_ACRE : num);
    }
  };

  const onAreaUnitChange = (unit) => {
    setAreaUnit(unit);
    const ha = form.areaHa || 0;
    const display = unit === 'acre' ? ha / HA_PER_ACRE : ha;
    setAreaText(display ? String(Math.round(display * 100) / 100) : '');
  };

  // Same pattern as area: form.targetYield stays canonical in quintal/ha
  // (what the STCR formula actually uses), yieldText mirrors the typed
  // digits in whichever unit is selected.
  const onYieldTextChange = (v) => {
    setYieldText(v);
    const num = parseFloat(v);
    set('targetYield', isNaN(num) ? '' : num * QUINTAL_PER_UNIT[yieldUnit]);
  };

  const onYieldUnitChange = (unit) => {
    setYieldUnit(unit);
    const q = parseFloat(form.targetYield);
    if (!isNaN(q)) {
      const display = q / QUINTAL_PER_UNIT[unit];
      setYieldText(String(Math.round(display * 100) / 100));
    }
  };

  const yieldRange = (min, max) => {
    const f = QUINTAL_PER_UNIT[yieldUnit];
    const r = (n) => Math.round((n / f) * 100) / 100;
    return `${r(min)}–${r(max)}`;
  };

  const canNext =
    step === 1 ? form.areaHa > 0
    : step === 2 ? form.ph !== '' && form.n !== '' && form.p !== '' && form.k !== ''
    : step === 3 ? !!form.cropId && !!form.sowingDate
    : true;

  const submit = () => {
    onSubmit({
      cropId: form.cropId,
      zone: zoneId,
      soil: { ph: form.ph, oc: form.oc, n: form.n, p: form.p, k: form.k, ec: form.ec, s: form.s, zn: form.zn },
      targetYield: form.targetYield || undefined,
      areaHa: Number(form.areaHa) || 1,
      method: form.method,
      irrigation: form.irrigation,
      sowingDate: form.sowingDate,
      alreadySown: form.alreadySown,
      lat: form.lat, lon: form.lon,
      place: form.place || undefined,
      organic: form.organicId && form.organicTonnes
        ? { id: form.organicId, tonnesPerHa: Number(form.organicTonnes) } : null,
      waterlogged: form.waterlogged,
      budget: form.budget || undefined,
      lang,
    });
  };

  // Sowing cannot be in the future beyond one season, and can only be in the
  // past when the farmer says the crop is already in the ground.
  const today = new Date().toISOString().slice(0, 10);
  const dayOffset = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const minSown = dayOffset(-(crop?.seasonDays ?? 180));
  const maxSown = dayOffset(120);

  const TOTAL = 4;

  return (
    <div className="max-w-2xl mx-auto">
      {/* progress */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs font-bold text-leaf-600 mb-2 uppercase tracking-wider">
          <span>{t('step')} {step} {t('of')} {TOTAL}</span>
          <span className="tabular-nums">{Math.round((step / TOTAL) * 100)}%</span>
        </div>
        <div className="h-1 bg-leaf-200 overflow-hidden">
          <div
            className="h-full bg-leaf-700 transition-all duration-500 ease-out"
            style={{ width: `${(step / TOTAL) * 100}%` }}
          />
        </div>
      </div>

      <Card className="p-5 sm:p-7 fade-up" key={step}>
        {/* ---------------------------------------------------------- step 1 */}
        {step === 1 && (
          <div className="space-y-5">
            <Head title={t('s1Title')} sub={t('s1Sub')} />

            <LocationPicker
              lat={form.lat}
              lon={form.lon}
              onChange={(lat, lon) => setForm((f) => ({ ...f, lat, lon }))}
              onPlaceChange={(place) => set('place', place)}
              zones={meta.zones}
              t={t}
              lang={lang}
            />

            <div className="grid grid-cols-2 gap-4">
              <Field label={t('area')}>
                <div className="flex gap-2">
                  <input type="number" step="0.01" min="0.01" className="field tabular-nums flex-1"
                    value={areaText} onChange={(e) => onAreaTextChange(e.target.value)} />
                  <select className="field w-[6.5rem]" value={areaUnit} onChange={(e) => onAreaUnitChange(e.target.value)}>
                    <option value="ha">{t('unitHectare')}</option>
                    <option value="acre">{t('unitAcre')}</option>
                  </select>
                </div>
              </Field>
              <Field label={t('irrigation')}>
                <select className="field" value={form.irrigation} onChange={(e) => set('irrigation', e.target.value)}>
                  {['rainfed', 'canal', 'drip', 'sprinkler', 'flood'].map((k) => (
                    <option key={k} value={k}>{t(`irr.${k}`)}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------- step 2 */}
        {step === 2 && (
          <div className="space-y-5">
            <Head title={t('s2Title')} sub={t('s2Sub')} />

            <SoilUpload
              t={t}
              visionAvailable={!!meta.soilUpload?.vision}
              onApply={(vals) => { setForm((f) => ({ ...f, ...vals })); setUsedDefaults(false); }}
            />

            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-leaf-200" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-leaf-400">{t('orType')}</span>
              <span className="h-px flex-1 bg-leaf-200" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Num label={t('ph')} v={form.ph} on={(v) => set('ph', v)} step="0.1" ph />
              <Num label={t('oc')} v={form.oc} on={(v) => set('oc', v)} step="0.01" unit="%" badge={t('optional')} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Num label={t('availN')} v={form.n} on={(v) => set('n', v)} unit="kg/ha" />
              <Num label={t('availP')} v={form.p} on={(v) => set('p', v)} unit="kg/ha" />
              <Num label={t('availK')} v={form.k} on={(v) => set('k', v)} unit="kg/ha" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Num label={t('ec')} v={form.ec} on={(v) => set('ec', v)} step="0.1" unit="dS/m" badge={t('optional')} />
              <Num label={t('sulphur')} v={form.s} on={(v) => set('s', v)} step="0.1" unit="ppm" badge={t('optional')} />
              <Num label={t('zinc')} v={form.zn} on={(v) => set('zn', v)} step="0.01" unit="ppm" badge={t('optional')} />
            </div>

            <button type="button" onClick={fillDefaults}
              className="w-full border border-dashed border-leaf-400 bg-white px-4 py-3 text-sm font-bold text-leaf-700 hover:bg-sprout transition">
              {t(zoneId ? 'noCard' : 'noCardGeneric')}
            </button>
            {usedDefaults && (
              <p className="text-xs text-earth-700 bg-earth-50 border border-earth-300 px-3 py-2">
                {t(zoneId ? 'usedDefaults' : 'usedDefaultsGeneric')}
              </p>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------- step 3 */}
        {step === 3 && (
          <div className="space-y-5">
            <Head title={t('s3Title')} sub={t('s3Sub')} />

            <Field label={t('crop')}>
              <select className="field" value={form.cropId} onChange={(e) => { set('cropId', e.target.value); set('targetYield', ''); setYieldText(''); }}>
                {Object.entries(groups).map(([g, list]) => (
                  <optgroup key={g} label={g}>
                    {list.map((c) => <option key={c.id} value={c.id}>{c.name[lang] || c.name.en}</option>)}
                  </optgroup>
                ))}
              </select>
            </Field>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone={tier === 'A' ? 'leaf' : 'slate'}>
                {tier === 'A' ? `● ${t('tierA')}` : `○ ${t('tierB')}`}
              </Badge>
              <span className="text-xs text-leaf-600/80">
                {tier === 'A' ? t('tierAExplain') : t('tierBExplain')}
              </span>
            </div>

            {tier === 'A' && (
              <Field label={t('targetYield')} hint={crop ? yieldRange(crop.target.min, crop.target.max) : ''}>
                <div className="flex gap-2">
                  <input type="number" step="0.01" className="field tabular-nums flex-1"
                    placeholder={crop ? String(Math.round((crop.target.default / QUINTAL_PER_UNIT[yieldUnit]) * 100) / 100) : ''}
                    value={yieldText} onChange={(e) => onYieldTextChange(e.target.value)} />
                  <select className="field w-28" value={yieldUnit} onChange={(e) => onYieldUnitChange(e.target.value)}>
                    <option value="quintal">{t('unitQuintal')}</option>
                    <option value="tonne">{t('unitTonne')}</option>
                    <option value="kg">{t('unitKg')}</option>
                  </select>
                </div>
              </Field>
            )}

            <Field label={t('sowingDate')} hint={form.alreadySown ? t('sownHintPast') : t('sownHintFuture')}>
              <input
                type="date"
                className="field"
                value={form.sowingDate}
                min={form.alreadySown ? minSown : today}
                max={maxSown}
                onChange={(e) => set('sowingDate', e.target.value)}
              />
              <label className="flex items-center gap-2.5 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-leaf-700"
                  checked={form.alreadySown}
                  onChange={(e) => { set('alreadySown', e.target.checked); set('sowingDate', ''); }}
                />
                <span className="text-sm text-leaf-800">{t('alreadySown')}</span>
              </label>
            </Field>
          </div>
        )}

        {/* ---------------------------------------------------------- step 4 */}
        {step === 4 && (
          <div className="space-y-5">
            <Head title={t('s4Title')} sub={t('s4Sub')} />

            <Field label={t('applyMethod')} hint={t('mHint')}>
              <Toggle
                cols={2}
                value={form.method}
                onChange={(v) => set('method', v)}
                options={['broadcast', 'incorporated', 'banded', 'fertigation'].map((k) => ({ value: k, label: t(`m.${k}`) }))}
              />
            </Field>

            <Field label={t('organicQ')}>
              <div className="grid grid-cols-2 gap-3">
                <select className="field" value={form.organicId} onChange={(e) => set('organicId', e.target.value)}>
                  <option value="">{t('organicNone')}</option>
                  {meta.organics.map((o) => <option key={o.id} value={o.id}>{o.name[lang] || o.name.en}</option>)}
                </select>
                <input type="number" step="0.5" min="0" disabled={!form.organicId}
                  placeholder={t('tonnesHa')} className="field tabular-nums disabled:bg-leaf-50/50"
                  value={form.organicTonnes} onChange={(e) => set('organicTonnes', e.target.value)} />
              </div>
            </Field>

            <Field label={t('budgetQ')} hint={t('budgetHint')}>
              <input
                type="number" min="0" step="100" inputMode="numeric"
                className="field tabular-nums"
                placeholder="₹"
                value={form.budget}
                onChange={(e) => set('budget', e.target.value)}
              />
            </Field>

            <label className="flex items-center gap-3 border border-leaf-300 bg-white px-4 py-3 cursor-pointer hover:bg-sprout transition">
              <input type="checkbox" className="w-4 h-4 accent-leaf-700"
                checked={form.waterlogged} onChange={(e) => set('waterlogged', e.target.checked)} />
              <span className="text-sm font-medium text-leaf-800">{t('waterlogged')}</span>
            </label>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-earth-700 bg-earth-50 border border-earth-300 px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 mt-7">
          {step > 1 && (
            <button type="button" className="btn-ghost" onClick={() => setStep((s) => s - 1)}>{t('back')}</button>
          )}
          {step < TOTAL ? (
            <button type="button" className="btn-primary flex-1" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
              {t('next')}
            </button>
          ) : (
            <button type="button" className="btn-primary flex-1" disabled={busy} onClick={submit}>
              {busy ? t('calculating') : t('calculate')}
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}

const Head = ({ title, sub }) => (
  <div>
    <h2 className="font-display text-3xl font-bold text-leaf-700 tracking-tightest">{title}</h2>
    <p className="text-sm text-leaf-900/70 mt-1.5">{sub}</p>
  </div>
);

function Num({ label, v, on, step = '1', unit, badge, ph }) {
  return (
    <Field label={label} badge={badge} hint={unit}>
      <input
        type="number" step={step} inputMode="decimal"
        min={ph ? 3 : 0} max={ph ? 10 : undefined}
        className="field tabular-nums text-lg font-semibold"
        value={v} onChange={(e) => on(e.target.value)} placeholder="—"
      />
    </Field>
  );
}
