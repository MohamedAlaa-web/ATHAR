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
    const local = localStorage.getItem(KEY);
    if (local === 'ar' || local === 'en' || local === 'fr') return local;
    const session = sessionStorage.getItem(KEY);
    if (session === 'ar' || session === 'en' || session === 'fr') return session;
  } catch { /* ignore */ }
  return 'ar';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
      sessionStorage.setItem(KEY, l);
    } catch { /* ignore */ }
  }, []);
  const dir: 'ltr' | 'rtl' = lang === 'ar' ? 'rtl' : 'ltr';
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    document.title =
      lang === 'ar' ? 'أثر · ATHAR — اعرف طريقك. بلا أثر رقمي.'
      : lang === 'fr' ? 'ATHAR · أثر — Chaque objet a une histoire'
      : 'ATHAR · أثر — Find your way. Leave no trace.';
  }, [lang, dir]);
  const tr = useCallback((key: string) => t(lang, key), [lang]);
  const value = useMemo(() => ({ lang, dir, setLang, tr }), [lang, dir, setLang, tr]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang(): LangCtx {
  return useContext(LanguageContext);
}
