import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchGlyph } from 'lucide-react';
import { useNav } from '../NavProvider';
import { navT, formatMeters } from '../i18n';
import { CATEGORIES, MUSEUM, categoryLabel, floorLabel, hallById, type ArtifactCategory } from '../../data/museum';

export function SearchPage() {
  const { lang, estimate, artifactPosition, recents, addRecent, clearRecents } = useNav();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ArtifactCategory | null>(null);

  const normalized = query.trim().toLowerCase();

  const results = useMemo(() => {
    const scored = MUSEUM.artifacts
      .filter((artifact) => (category ? artifact.category === category : true))
      .map((artifact) => {
        const hall = hallById(artifact.hallId);
        const haystack = [
          artifact.name.ar,
          artifact.name.en,
          artifact.short.ar,
          artifact.short.en,
          artifact.qrId,
          artifact.description.ar,
          artifact.description.en,
          hall?.name.ar ?? '',
          hall?.name.en ?? '',
          categoryLabel(artifact.category, 'ar'),
          categoryLabel(artifact.category, 'en')
        ]
          .join(' ')
          .toLowerCase();
        const position = artifactPosition(artifact.id) ?? artifact;
        const distanceM =
          estimate && estimate.floor === artifact.floor
            ? Math.hypot(position.x - estimate.x, position.y - estimate.y)
            : null;
        return { artifact, hall, distanceM, match: !normalized || haystack.includes(normalized) };
      })
      .filter((entry) => entry.match);

    scored.sort((a, b) => {
      if (a.distanceM != null && b.distanceM != null) return a.distanceM - b.distanceM;
      if (a.distanceM != null) return -1;
      if (b.distanceM != null) return 1;
      return a.artifact.name[lang].localeCompare(b.artifact.name[lang]);
    });
    return scored;
  }, [artifactPosition, category, estimate, lang, normalized]);

  const recentArtifacts = recents
    .map((id) => MUSEUM.artifacts.find((a) => a.id === id))
    .filter((a): a is (typeof MUSEUM.artifacts)[number] => Boolean(a));

  return (
    <div className="px-4 pb-4 pt-4">
      <h1 className="text-lg leading-tight text-ink">{navT(lang, 'search.title')}</h1>

      <div className="relative mt-3">
        <SearchGlyph size={18} strokeWidth={1.6} className="pointer-events-none absolute inset-y-0 start-3 my-auto text-ink-muted" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={navT(lang, 'search.placeholder')}
          className="ui-field ps-10"
          autoComplete="off"
          dir="auto"
          aria-label={navT(lang, 'search.placeholder')}
        />
      </div>

      <div className="-mx-4 mt-3 flex gap-5 overflow-x-auto border-b border-rule px-4">
        <button
          type="button"
          onClick={() => setCategory(null)}
          aria-pressed={category === null}
          className={`flex min-h-11 min-w-11 shrink-0 items-center justify-center border-b-2 px-2 text-xs font-medium ${
            category === null ? 'border-ink text-ink' : 'border-transparent text-ink-muted'
          }`}
        >
          {navT(lang, 'search.all')} {MUSEUM.artifacts.length}
        </button>
        {CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setCategory(item.id)}
            aria-pressed={category === item.id}
            className={`flex min-h-11 min-w-11 shrink-0 items-center justify-center border-b-2 px-2 text-xs font-medium ${
              category === item.id ? 'border-ink text-ink' : 'border-transparent text-ink-muted'
            }`}
          >
            {item.label[lang]}
          </button>
        ))}
      </div>

      {!normalized && recentArtifacts.length > 0 && (
        <section className="mt-4">
          <div className="flex items-baseline justify-between">
            <h2 className="section-title">{navT(lang, 'search.recent')}</h2>
            <button type="button" onClick={clearRecents} className="inline-flex min-h-11 items-center text-xs text-ink-muted underline underline-offset-2">
              {navT(lang, 'search.clear')}
            </button>
          </div>
          <ul className="mt-1 divide-y divide-rule">
            {recentArtifacts.slice(0, 4).map((artifact) => (
              <li key={artifact.id}>
                <Link
                  to={`/item/${artifact.id}`}
                  onClick={() => addRecent(artifact.id)}
                  className="flex min-h-11 items-center justify-between gap-3 text-sm text-ink"
                >
                  <span className="truncate">{artifact.name[lang]}</span>
                  <span className="shrink-0 text-xs text-ink-muted">{floorLabel(artifact.floor, lang)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-4">
        <div className="flex items-baseline justify-between">
          <h2 className="section-title">{navT(lang, 'search.results')}</h2>
          <span className="num text-xs text-ink-muted">{results.length}</span>
        </div>

        {results.length === 0 && <p className="mt-2 text-sm text-ink-muted">{navT(lang, 'search.noResults')}</p>}

        <ul className="mt-1 divide-y divide-rule">
          {results.map(({ artifact, hall, distanceM }) => (
            <li key={artifact.id}>
              <Link to={`/item/${artifact.id}`} onClick={() => addRecent(artifact.id)} className="flex min-h-16 items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{artifact.name[lang]}</span>
                  <span className="block truncate text-xs text-ink-muted">{hall?.name[lang]}</span>
                  <span className="block truncate text-xs text-ink-muted">
                    {categoryLabel(artifact.category, lang)}
                    <span aria-hidden="true" className="mx-1.5 inline-block h-2.5 w-px bg-rule align-middle" />
                    {floorLabel(artifact.floor, lang)}
                  </span>
                </span>
                <span className="num shrink-0 text-end text-xs text-ink-soft">
                  {distanceM != null ? formatMeters(distanceM, lang) : artifact.qrId}
                  {distanceM != null && <span className="block text-micro text-ink-muted">{navT(lang, 'search.away')}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-5 border-t border-rule pt-3">
        <p className="label mb-2">{navT(lang, 'search.halls')}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {MUSEUM.halls.map((hall) => (
            <button
              key={hall.id}
              type="button"
              onClick={() => setQuery(hall.name[lang])}
              className="inline-flex min-h-11 items-center text-xs text-ink-soft underline underline-offset-4 decoration-rule hover:text-ink"
            >
              {hall.name[lang]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
