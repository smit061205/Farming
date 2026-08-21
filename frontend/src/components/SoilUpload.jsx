import React, { useState, useRef } from 'react';
import { Card, Badge } from './ui.jsx';
import { extractSoil } from '../api.js';

const FIELDS = [
  { key: 'ph', label: 'ph', unit: '' },
  { key: 'oc', label: 'oc', unit: '%' },
  { key: 'n', label: 'availN', unit: 'kg/ha' },
  { key: 'p', label: 'availP', unit: 'kg/ha' },
  { key: 'k', label: 'availK', unit: 'kg/ha' },
  { key: 'ec', label: 'ec', unit: 'dS/m' },
  { key: 's', label: 'sulphur', unit: 'ppm' },
  { key: 'zn', label: 'zinc', unit: 'ppm' },
];

/**
 * Reads a Soil Health Card so the farmer does not have to type it.
 * Nothing extracted is ever used directly — every value lands in a review
 * step the farmer confirms or corrects first.
 */
export default function SoilUpload({ t, onApply, visionAvailable }) {
  const [state, setState] = useState('idle');   // idle | reading | review | failed
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [draft, setDraft] = useState({});
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const reset = () => {
    setState('idle'); setPreview(null); setResult(null); setDraft({}); setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const onFile = async (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setError(t('uploadNotImage')); setState('failed'); return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError(t('uploadTooBig')); setState('failed'); return;
    }

    setState('reading'); setError('');
    setPreview(URL.createObjectURL(file));

    try {
      const base64 = await toBase64(file);
      const res = await extractSoil({ imageBase64: base64, mime: file.type });
      const values = res.values || {};
      setResult(res);
      setDraft(Object.fromEntries(FIELDS.map((f) => [f.key, values[f.key] ?? ''])));
      setState(Object.keys(values).length ? 'review' : 'failed');
      if (!Object.keys(values).length) setError(res.notes || t('uploadNothingFound'));
    } catch (err) {
      setError(String(err.message || err));
      setState('failed');
    }
  };

  const apply = () => {
    const clean = {};
    for (const f of FIELDS) {
      const v = draft[f.key];
      if (v !== '' && v != null && !Number.isNaN(Number(v))) clean[f.key] = String(v);
    }
    onApply(clean);
    reset();
  };

  /* ------------------------------------------------------------- idle */
  if (state === 'idle') {
    return (
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          id="soil-card-upload"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <label
          htmlFor="soil-card-upload"
          className="flex items-center gap-4 w-full border border-dashed border-leaf-400 bg-white
                     px-5 py-4 cursor-pointer hover:bg-sprout transition"
        >
          <CardIcon className="w-9 h-9 text-leaf-700 shrink-0" />
          <span className="min-w-0">
            <span className="block font-bold text-leaf-800">{t('uploadTitle')}</span>
            <span className="block text-xs text-leaf-500 mt-0.5 leading-relaxed">{t('uploadSub')}</span>
          </span>
        </label>
        {!visionAvailable && (
          <p className="hint">{t('uploadNoKey')}</p>
        )}
      </div>
    );
  }

  /* ---------------------------------------------------------- reading */
  if (state === 'reading') {
    return (
      <Card className="p-5 flex items-center gap-4">
        {preview && <img src={preview} alt="" className="w-16 h-16 object-cover border border-leaf-200" />}
        <div>
          <div className="font-bold text-leaf-800">{t('uploadReading')}</div>
          <div className="flex gap-1 mt-2">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-leaf-500 animate-bounce"
                style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  /* ----------------------------------------------------------- failed */
  if (state === 'failed') {
    return (
      <Card className="p-5 border-earth-300 bg-earth-50">
        <div className="font-bold text-earth-700">{t('uploadFailed')}</div>
        <p className="text-sm text-leaf-900/75 mt-1 leading-relaxed">{error}</p>
        <button type="button" onClick={reset} className="btn-ghost mt-4 text-sm py-2 px-4">
          {t('uploadRetry')}
        </button>
      </Card>
    );
  }

  /* ----------------------------------------------------------- review */
  const lowConfidence = Object.entries(result?.confidence || {})
    .filter(([, v]) => v === 'low').map(([k]) => k);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-display text-lg font-bold text-leaf-900">{t('uploadReviewTitle')}</div>
          <p className="text-sm text-leaf-900/70 mt-1 max-w-md leading-relaxed">{t('uploadReviewSub')}</p>
        </div>
        {preview && <img src={preview} alt="" className="w-16 h-16 object-cover border border-leaf-200" />}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
        {FIELDS.map((f) => {
          const found = result?.values?.[f.key] != null;
          const low = lowConfidence.includes(f.key);
          return (
            <div key={f.key}>
              <label className="block text-[11px] font-bold text-leaf-700 mb-1">
                {t(f.label)}
                {low && <span className="text-earth-500 ml-1">?</span>}
              </label>
              <input
                type="number"
                step="0.01"
                value={draft[f.key]}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                placeholder="—"
                className={`field tabular-nums text-base font-semibold py-2 ${
                  found ? '' : 'border-leaf-200 text-leaf-400'
                } ${low ? 'border-earth-500' : ''}`}
              />
              <span className="text-[10px] text-leaf-400">{f.unit}</span>
            </div>
          );
        })}
      </div>

      {lowConfidence.length > 0 && (
        <p className="text-xs text-earth-700 bg-earth-50 border border-earth-300 px-3 py-2 mt-4">
          {t('uploadLowConfidence')}
        </p>
      )}

      <p className="text-[11px] text-leaf-500 mt-3">
        {t('uploadMethod')}: {result?.method || '—'}
      </p>

      <div className="flex gap-3 mt-5">
        <button type="button" onClick={reset} className="btn-ghost text-sm py-2.5 px-5">
          {t('uploadDiscard')}
        </button>
        <button type="button" onClick={apply} className="btn-primary text-sm py-2.5 px-5 flex-1">
          {t('uploadConfirm')}
        </button>
      </div>
    </Card>
  );
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

const CardIcon = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
    <rect x="3" y="6" width="26" height="20" stroke="currentColor" strokeWidth="1.8" />
    <path d="M3 12h26" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 17h7M8 21h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="23" cy="19" r="3" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);
