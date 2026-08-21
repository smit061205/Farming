import React from 'react';
import { Card, Section, Badge } from './ui.jsx';

/** Shared presentation for the same crop suggestions in Plan and Soil tabs. */
export default function CropRecommendations({ rec, t, lang, placement = 'plan' }) {
  const data = rec.cropRecommendations;
  if (!data) return null;

  const rows = (data.recommendations || []).slice(0, 3);
  const title = placement === 'soil' ? t('cropSuggestionsSoil') : t('cropSuggestionsPlan');

  if (data.status === 'loading') {
    return (
      <Section title={title} sub={t('cropSuggestionsSub')}>
        <Card className="p-5 text-sm text-leaf-600 animate-pulse">
          {t('cropSuggestionsLoading')}
        </Card>
      </Section>
    );
  }

  if (!rows.length) {
    return (
      <Section title={title} sub={t('cropSuggestionsSub')}>
        <Card className="p-5 text-sm text-earth-700 bg-earth-50 border-earth-300">
          {t('cropSuggestionsUnavailable')}
        </Card>
      </Section>
    );
  }

  return (
    <Section
      title={title}
      sub={t('cropSuggestionsSub')}
      right={<Badge tone={data.provider === 'groq' ? 'leaf' : 'slate'}>
        {data.provider === 'groq' ? 'AI · Groq' : t('cropSuggestionsCatalog')}
      </Badge>}
    >
      <div className="grid md:grid-cols-3 gap-3">
        {rows.map((row, index) => (
          <Card key={row.cropId} className="p-5 bg-white hover:border-leaf-700 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <span className="font-display text-4xl font-bold text-sprout leading-none tracking-tightest">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="chip bg-leaf-100 text-leaf-600">{row.group}</span>
            </div>
            <h3 className="font-display text-xl font-bold text-leaf-900 mt-4">
              {row.name}
            </h3>
            <p className="text-sm text-leaf-700/80 leading-relaxed mt-2">
              {row.reason}
            </p>
          </Card>
        ))}
      </div>
      <p className="text-[11px] text-leaf-500 mt-3 leading-relaxed">
        {t('cropSuggestionsNote')}
      </p>
    </Section>
  );
}
