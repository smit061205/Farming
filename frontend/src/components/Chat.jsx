import React, { useState, useRef, useEffect } from 'react';
import { Card, Badge } from './ui.jsx';
import { chat } from '../api.js';

const SPEECH_LANG = { en: 'en-IN', hi: 'hi-IN', gu: 'gu-IN' };

export default function Chat({ rec, t, lang, aiStatus }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: rec.explanation?.[lang] || rec.explanation?.en || '' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const endRef = useRef(null);
  const recogRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages, busy]);

  // Re-explain in the new language when the user switches
  useEffect(() => {
    setMessages((m) => (m.length === 1
      ? [{ role: 'assistant', content: rec.explanation?.[lang] || rec.explanation?.en || '' }]
      : m));
  }, [lang, rec.explanation]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    const next = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const res = await chat({ messages: next.filter((m) => m.content), recommendation: rec, lang });
      setMessages([...next, { role: 'assistant', content: res.text, provider: res.provider }]);
    } catch (err) {
      setMessages([...next, { role: 'assistant', content: String(err.message || err) }]);
    } finally {
      setBusy(false);
    }
  };

  const listen = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) { recogRef.current?.stop(); setListening(false); return; }
    const r = new SR();
    recogRef.current = r;
    r.lang = SPEECH_LANG[lang] || 'en-IN';
    r.interimResults = false;
    r.onresult = (e) => { const txt = e.results[0][0].transcript; setListening(false); send(txt); };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    setListening(true);
    r.start();
  };

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = SPEECH_LANG[lang] || 'en-IN';
    window.speechSynthesis.speak(u);
  };

  const suggestions = [t('suggest1'), t('suggest2'), t('suggest3'), t('suggest4')];
  const hasSpeech = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

  return (
    <div className="fade-up">
      <div className="flex items-end justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-leaf-700 tracking-tightest">{t('advisor')}</h2>
          <p className="text-sm text-leaf-700/80 mt-1 max-w-xl leading-relaxed">{t('advisorSub')}</p>
        </div>
        <Badge tone={aiStatus?.enabled ? 'leaf' : 'slate'}>
          {aiStatus?.enabled ? `AI · ${aiStatus.provider}` : 'Rule-based'}
        </Badge>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="space-y-3 max-h-[26rem] overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-leaf-700 text-leaf-50'
                  : 'bg-leaf-100 text-leaf-900 border border-leaf-200'
              }`}>
                {m.content}
                {m.role === 'assistant' && (
                  <button onClick={() => speak(m.content)}
                    className="ml-2 text-leaf-500 hover:text-leaf-700 align-middle" aria-label="Read aloud">
                    🔊
                  </button>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="bg-leaf-100 border border-leaf-200 px-4 py-3">
                <span className="inline-flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-leaf-500 animate-bounce"
                      style={{ animationDelay: `${i * 120}ms` }} />
                  ))}
                </span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="flex gap-2 flex-wrap mt-4">
          {suggestions.map((s) => (
            <button key={s} onClick={() => send(s)} disabled={busy}
              className="text-xs rounded-full border border-leaf-300 bg-white px-3 py-1.5 text-leaf-700 hover:bg-sprout hover:border-leaf-700 transition disabled:opacity-40">
              {s}
            </button>
          ))}
        </div>

        <form className="flex gap-2 mt-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
          {hasSpeech && (
            <button type="button" onClick={listen}
              className={`btn px-4 border transition ${listening ? 'bg-earth-500 border-earth-500 text-leaf-50 animate-pulse' : 'bg-white border-leaf-300 text-leaf-700 hover:bg-sprout'}`}
              aria-label={t('speak')}>
              🎤
            </button>
          )}
          <input
            className="field flex-1"
            placeholder={listening ? t('listening') : t('placeholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
          />
          <button type="submit" className="btn-primary px-5 py-3" disabled={busy || !input.trim()}>
            {t('send')}
          </button>
        </form>
      </Card>
    </div>
  );
}
