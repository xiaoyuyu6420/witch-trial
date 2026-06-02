"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export type Locale = "zh-CN" | "zh-TW" | "en" | "ja";

const STORAGE_KEY = "witch-trial-locale";
const LOCALE_MAP: Record<string, Locale> = {
  zh: "zh-CN", "zh-CN": "zh-CN", "zh-Hans": "zh-CN", "zh-Hans-CN": "zh-CN",
  "zh-TW": "zh-TW", "zh-Hant": "zh-TW", "zh-Hant-TW": "zh-TW", "zh-HK": "zh-TW", "zh-MO": "zh-TW",
  en: "en", "en-US": "en", "en-GB": "en", "en-AU": "en", "en-CA": "en",
  ja: "ja", "ja-JP": "ja",
};

function detectLocale(): Locale {
  if (typeof window === "undefined") return "zh-CN";
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && LOCALE_MAP[stored]) return stored;
  const nav = navigator.language;
  return LOCALE_MAP[nav] ?? (nav.startsWith("zh") ? (nav.includes("Hant") || nav.includes("TW") || nav.includes("HK") ? "zh-TW" : "zh-CN") : "zh-CN");
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  translations: Record<string, unknown>;
  mounted: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loaders: Record<Locale, () => Promise<any>> = {
  "zh-CN": () => import("@/i18n/zh-CN").then((m) => m.default),
  "zh-TW": () => import("@/i18n/zh-TW").then((m) => m.default),
  en: () => import("@/i18n/en").then((m) => m.default),
  ja: () => import("@/i18n/ja").then((m) => m.default),
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh-CN");
  const [translations, setTranslations] = useState<Record<string, unknown>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setLocaleState(detectLocale());
    });
  }, []);

  useEffect(() => {
    loaders[locale]().then((t) => {
      setTranslations(t);
      setMounted(true);
    });
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
    loaders[l]().then(setTranslations);
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    if (!mounted) return key;
    const keys = key.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let val: any = translations;
    for (const k of keys) {
      if (val == null || typeof val !== "object") return key;
      val = val[k];
    }
    if (typeof val !== "string") return key;
    if (vars) {
      return val.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`));
    }
    return val;
  }, [translations, mounted]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, translations, mounted }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export const LOCALE_LABELS: Record<Locale, string> = {
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  en: "English",
  ja: "日本語",
};
