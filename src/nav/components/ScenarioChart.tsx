import type { ScenarioMatrix } from '../../positioning/core/scenario';
import type { UiLang } from '../../data/museum';

/*
 * One colour, direct labels, no legend. Each bar is its own row, so the reader
 * never has to match a swatch to a name — this is a report, not a dashboard.
 */

const CONFIGS = ['beacons', 'beacons-pdr', 'full'] as const;

export const SHORT: Record<string, string> = {
  beacons: 'BLE',
  'beacons-pdr': 'BLE + PDR',
  full: 'FULL + QR'
};

const CROWDS = ['low', 'medium', 'high'] as const;

const CROWD_LABEL: Record<string, { ar: string; en: string }> = {
  low: { ar: 'ازدحام منخفض', en: 'Low crowd' },
  medium: { ar: 'ازدحام متوسط', en: 'Medium crowd' },
  high: { ar: 'ازدحام مرتفع', en: 'High crowd' }
};

export function ScenarioChart({ matrix, lang }: { matrix: ScenarioMatrix; lang: UiLang }) {
  const rows = matrix.summary;
  const max = Math.max(0.001, ...rows.map((row) => row.meanErrorM));

  return (
    <div className="mt-1">
      <div className="flex items-baseline justify-between border-b border-rule pb-1 text-micro text-ink-muted">
        <span>{lang === 'ar' ? 'متوسط الخطأ' : 'Mean error'}</span>
        <span>{lang === 'ar' ? 'متر' : 'metres'}</span>
      </div>
      {CROWDS.map((crowd) => (
        <div key={crowd} className="mt-2">
          <p className="text-micro font-medium text-ink-soft">{CROWD_LABEL[crowd][lang]}</p>
          {CONFIGS.map((config) => {
            const row = rows.find((r) => r.crowd === crowd && r.config === config);
            if (!row) return null;
            const width = Math.max(1.5, (row.meanErrorM / max) * 100);
            return (
              <div key={config} className="flex items-center gap-2 py-[3px]">
                <span className="w-[68px] shrink-0 truncate text-micro text-ink-soft">{SHORT[config]}</span>
                <span className="h-2.5 min-w-0 flex-1 bg-stone-200" aria-hidden="true">
                  <span className="block h-full bg-lapis" style={{ width: `${width}%` }} />
                </span>
                <span className="num w-14 shrink-0 text-end text-xs text-ink" dir="ltr">
                  {row.meanErrorM.toFixed(2)} m
                </span>
              </div>
            );
          })}
        </div>
      ))}
      <p className="mt-2 text-micro leading-relaxed text-ink-muted">
        {lang === 'ar'
          ? 'نفس المقياس في الصفوف الثلاثة؛ الأعمدة تُقرأ بالطول داخل كل مستوى ازدحام.'
          : 'One scale across all rows; compare bar lengths within each crowd level.'}
      </p>
    </div>
  );
}
