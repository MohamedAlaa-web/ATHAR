import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Lang } from '../data/artifacts';
import { t } from '../i18n/dictionaries';

interface LangCtx {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  setLang: (l: Lang) => void;
  tr: (key: string) => string;
}

const LanguageContext = createContext<LangCtx>({
  lang: 'en',
  dir: 'ltr',
  setLang: () => {},
  tr: (k) => k
});

const KEY = 'athar-lang';

function initial(): Lang {
  try {
    const s = sessionStorage.getItem(KEY);
    if (s === 'ar' || s === 'en' || s === 'fr') return s;
  } catch { /* ignore */ }
  return 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { sessionStorage.setItem(KEY, l); } catch { /* ignore */ }
  }, []);
  const dir: 'ltr' | 'rtl' = lang === 'ar' ? 'rtl' : 'ltr';
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    document.title =
      lang === 'ar' ? 'أثر · ATHAR — وراء كل أثر حكاية'
      : lang === 'fr' ? 'ATHAR · أثر — Chaque objet a une histoire'
      : 'ATHAR · أثر — Every artifact has a story';
  }, [lang, dir]);
  const tr = useCallback((key: string) => t(lang, key), [lang]);
  const value = useMemo(() => ({ lang, dir, setLang, tr }), [lang, dir, setLang, tr]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang(): LangCtx {
  return useContext(LanguageContext);
}
