import React, { useEffect, useState } from 'react';
import { LANGS, useT } from './i18n.js';
import { getMeta, recommend, saveField, savedFields, cacheLast, readLast } from './api.js';
import { Leaf, Card, Badge, rs } from './components/ui.jsx';
import { renderEngine } from './engineStrings.js';
import Wizard from './components/Wizard.jsx';
import Plan from './components/Plan.jsx';
import Timing from './components/Timing.jsx';
import Season from './components/Season.jsx';
import Soil from './components/Soil.jsx';
import Chat from './components/Chat.jsx';
import { SmsSim, Methodology } from './components/Extras.jsx';

const TABS = ['plan', 'timing', 'season', 'soil', 'ask'];

export default function App() {
  const [lang, setLang] = useState(() => localStorage.getItem('agrisense.lang') || 'en');
  const [meta, setMeta] = useState(null);
  const [view, setView] = useState('home');       // home | wizard | result | method | sms
  const [tab, setTab] = useState('plan');
  const [rec, setRec] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState(savedFields());

  const t = useT(lang);

  useEffect(() => { localStorage.setItem('agrisense.lang', lang); }, [lang]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  useEffect(() => {
    getMeta().then(setMeta).catch((e) => setError(String(e.message)));
    const last = readLast();
    if (last) setRec(last);
  }, []);

  const submit = async (payload) => {
    setBusy(true); setError('');
    try {
      const r = await recommend(payload);
      setRec(r); cacheLast(r);
      setFields(saveField(r));
      setTab('plan'); setView('result');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(String(e.message || e));
    } finally { setBusy(false); }
  };

  if (!meta) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center">
          <Leaf className="w-12 h-12 text-leaf-700 mx-auto animate-pulse" />
          <p className="mt-3 text-sm text-leaf-600">{error || 'Loading…'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* -------------------------------------------------------- header */}
      <header className="sticky top-0 z-30 bg-leaf-50/95 backdrop-blur-sm border-b border-leaf-200">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center gap-4">
          <button onClick={() => setView('home')} className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 bg-leaf-700 text-leaf-50 grid place-items-center shrink-0">
              <Leaf className="w-5 h-5" />
            </span>
            <span className="font-display font-bold text-lg text-leaf-900 tracking-tightest">
              {t('appName')}
            </span>
          </button>

          <div className="flex-1" />

          <nav className="hidden sm:flex items-center gap-6 text-sm font-semibold text-leaf-700">
            <NavBtn on={view === 'method'} onClick={() => setView('method')}>{t('methodology')}</NavBtn>
            <NavBtn on={view === 'sms'} onClick={() => setView('sms')}>{t('smsTitle')}</NavBtn>
          </nav>

          <div className="flex border border-leaf-300">
            {LANGS.map((l) => (
              <button key={l.id} onClick={() => setLang(l.id)}
                className={LANG_BTN(lang === l.id)}>
                {l.short}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-5 py-10 sm:py-16">
        {/* ------------------------------------------------------- home */}
        {view === 'home' && (
          <div className="fade-up">
            {/* hero */}
            <div className="max-w-3xl">
              <p className="eyebrow">{t('eyebrow')}</p>
              <h1 className="mt-5 font-display font-bold text-leaf-700 leading-[.92] tracking-tightest text-[clamp(2.75rem,10vw,6rem)]">
                {t('tagline').split('|').map((line, i) => <span key={i} className="block">{line}</span>)}
              </h1>
              <p className="mt-6 text-lg text-leaf-900/75 leading-relaxed max-w-2xl">{t('heroLead')}</p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button className="btn-primary text-base" onClick={() => setView('wizard')}>
                  {t('start')} <span aria-hidden="true">&rarr;</span>
                </button>
                {rec && (
                  <button onClick={() => setView('result')}
                    className="text-sm font-bold text-leaf-700 underline underline-offset-4 hover:text-leaf-900">
                    {t('backToLast')}
                  </button>
                )}
              </div>
            </div>

            {/* what the farmer gets */}
            <div className="mt-16 grid sm:grid-cols-3 border-t border-l border-leaf-200">
              {[t('heroPoint1'), t('heroPoint2'), t('heroPoint3')].map((text, i) => (
                <div key={i} className="border-r border-b border-leaf-200 p-6 bg-white">
                  <span className="font-display text-2xl font-bold text-leaf-300 tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="mt-3 font-semibold text-leaf-900 leading-snug">{text}</p>
                </div>
              ))}
            </div>

            {/* live capability strip — what is actually switched on right now */}
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone={meta.weatherConfigured ? 'leaf' : 'slate'}>
                {meta.weatherConfigured ? t('capWeatherOn') : t('capWeatherOff')}
              </Badge>
              <Badge tone={meta.ai?.enabled ? 'leaf' : 'slate'}>
                {meta.ai?.enabled ? `${t('capAdvisorOn')} · ${meta.ai.provider}` : t('capAdvisorOff')}
              </Badge>
              <Badge tone={meta.soilUpload?.vision ? 'leaf' : 'slate'}>
                {meta.soilUpload?.vision ? t('capCardOn') : t('capCardOff')}
              </Badge>
              <Badge tone="slate">{meta.crops.length} {t('capCrops')}</Badge>
            </div>

            {/* methodology */}
            <section className="mt-20">
              <p className="eyebrow">{t('methodEyebrow')}</p>
              <h2 className="mt-4 font-display text-4xl sm:text-5xl font-bold text-leaf-700 tracking-tightest">
                {t('methodTitle')}
              </h2>
              <div className="mt-8 grid md:grid-cols-3 gap-px bg-leaf-200 border border-leaf-200">
                {[['01', t('m1'), t('m1d')], ['02', t('m2'), t('m2d')], ['03', t('m3'), t('m3d')]].map((row) => (
                  <div key={row[0]} className="bg-white p-7">
                    <span className="font-display text-5xl font-bold text-sprout leading-none">{row[0]}</span>
                    <h3 className="mt-4 font-display text-xl font-bold text-leaf-900">{row[1]}</h3>
                    <p className="mt-2 text-sm text-leaf-900/70 leading-relaxed">{row[2]}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* saved fields */}
            {fields.length > 0 && (
              <section className="mt-20">
                <p className="eyebrow">{t('saved')}</p>
                <div className="mt-4 border-t border-l border-leaf-200 grid sm:grid-cols-2">
                  {fields.slice(0, 4).map((f) => (
                    <div key={f.id} className="border-r border-b border-leaf-200 bg-white p-5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-display font-bold text-leaf-900 truncate">
                          {f.cropNames?.[lang] || f.cropNames?.en}
                        </div>
                        <div className="text-xs text-leaf-500 tabular-nums mt-0.5">
                          {f.areaHa} ha &middot; N {f.dose.N} &middot; P {f.dose.P} &middot; K {f.dose.K}
                        </div>
                      </div>
                      {f.savedTotal > 0 && (
                        <span className="chip bg-sprout text-leaf-700 shrink-0">{rs(f.savedTotal)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* close */}
            <section className="mt-20 bg-leaf-700 text-leaf-50 p-10 sm:p-14">
              <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tightest leading-[.95]">
                {t('ctaTitle').split('|').map((line, i) => <span key={i} className="block">{line}</span>)}
              </h2>
              <button className="btn mt-8 bg-leaf-50 text-leaf-700 px-7 py-3.5 hover:bg-sprout" onClick={() => setView('wizard')}>
                {t('start')} <span aria-hidden="true">&rarr;</span>
              </button>
            </section>
          </div>
        )}

        {/* ----------------------------------------------------- wizard */}
        {view === 'wizard' && (
          <div className="fade-up">
            <div className="max-w-2xl mx-auto mb-8">
              <p className="eyebrow">{t('eyebrow')}</p>
              <h1 className="mt-3 font-display text-3xl sm:text-4xl font-bold text-leaf-700 tracking-tightest leading-[1.05]">
                {t('wizardTitle')}
              </h1>
              {(rec || fields.length > 0) && (
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                  {rec && (
                    <button onClick={() => setView('result')}
                      className="font-bold text-leaf-700 underline underline-offset-4 hover:text-leaf-900">
                      {t('backToLast')}
                    </button>
                  )}
                  {fields.slice(0, 3).map((f) => (
                    <span key={f.id} className="text-leaf-500 tabular-nums">
                      {f.cropNames?.[lang] || f.cropNames?.en} &middot; {f.areaHa} ha
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Wizard meta={meta} t={t} lang={lang} onSubmit={submit} busy={busy} error={error} />
          </div>
        )}

        {/* ----------------------------------------------------- result */}
        {view === 'result' && rec && (
          <div>
            <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
              <div>
                <h1 className="font-display text-4xl sm:text-5xl font-bold text-leaf-700 tracking-tightest">
                  {rec.cropNames?.[lang] || rec.cropName}
                </h1>
                <p className="text-sm text-leaf-500 mt-1.5">
                  {rec.areaHa} {t('hectare')} · {rec.zoneName?.[lang] || rec.zoneName?.en} · {renderEngine({ ...rec.confidence, params: { ...rec.confidence.params, zone: rec.zoneName?.[lang] || rec.zoneName?.en } }, lang)}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="btn-ghost text-sm py-2.5 px-5" onClick={() => window.print()}>{t('print')}</button>
                <button className="btn-primary text-sm py-2.5 px-5" onClick={() => setView('wizard')}>{t('startAgain')}</button>
              </div>
            </div>

            {/* tabs */}
            <div className="sticky top-16 z-20 -mx-5 px-5 bg-leaf-50/95 backdrop-blur-sm mb-8 border-b border-leaf-200">
              <div className="flex gap-7 overflow-x-auto">
                {TABS.map((k) => (
                  <button key={k} onClick={() => setTab(k)}
                    className={`whitespace-nowrap py-3 -mb-px border-b-2 text-sm font-bold uppercase tracking-wider transition ${
                      tab === k ? 'border-leaf-700 text-leaf-900' : 'border-transparent text-leaf-500 hover:text-leaf-700'
                    }`}>
                    {t(`tabs.${k}`)}
                    {k === 'timing' && rec.advisory && (
                      <span className={`ml-2 inline-block w-2 h-2 rounded-full align-middle ${
                        rec.advisory.verdict === 'GO' ? 'bg-leaf-600'
                        : rec.advisory.verdict === 'MODIFY' ? 'bg-[#A8730F]' : 'bg-earth-500'
                      }`} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div key={tab}>
              {tab === 'plan' && <Plan rec={rec} t={t} lang={lang} />}
              {tab === 'timing' && <Timing rec={rec} t={t} lang={lang} />}
              {tab === 'season' && <Season rec={rec} t={t} lang={lang} />}
              {tab === 'soil' && <Soil rec={rec} t={t} lang={lang} />}
              {tab === 'ask' && <Chat rec={rec} t={t} lang={lang} aiStatus={meta.ai} />}
            </div>

            <Card className="p-5 mt-12 bg-transparent border-dashed border-leaf-300">
              <div className="eyebrow">{t('disclaimerTitle')}</div>
              <p className="text-xs text-leaf-900/70 mt-2 leading-relaxed max-w-3xl">{t('disclaimer')}</p>
            </Card>
          </div>
        )}

        {view === 'method' && <Methodology meta={meta} t={t} />}
        {view === 'sms' && <SmsSim t={t} />}
      </main>

      <footer className="border-t border-leaf-200 mt-10">
        <div className="max-w-6xl mx-auto px-5 py-6 text-xs text-leaf-500 flex flex-wrap gap-x-6 gap-y-1.5 justify-between">
          <span>AgriSense · Team SNORLEX · Institute of Advanced Research, Gandhinagar</span>
          <span className="flex gap-3">
            <button onClick={() => setView('method')} className="underline underline-offset-2 hover:text-leaf-800 sm:hidden">
              {t('methodology')}
            </button>
            <span>{meta.weatherConfigured ? 'Live weather' : 'Sample weather'}</span>
            <span>{meta.ai?.enabled ? `AI: ${meta.ai.provider}` : 'AI: rule-based'}</span>
          </span>
        </div>
      </footer>
    </div>
  );
}

const LANG_BTN = (active) =>
  'px-2.5 py-1.5 text-[11px] font-bold tracking-wide transition ' +
  (active ? 'bg-leaf-700 text-leaf-50' : 'text-leaf-600 hover:bg-leaf-100');

const NavBtn = ({ on, children, ...rest }) => (
  <button
    className={'pb-0.5 border-b-2 transition ' + (on ? 'border-leaf-700 text-leaf-900' : 'border-transparent hover:border-leaf-300')}
    {...rest}
  >
    {children}
  </button>
);
