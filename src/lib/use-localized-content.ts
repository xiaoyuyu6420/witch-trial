"use client";

import { useMemo } from "react";
import { useI18n } from "./i18n";

interface LocalizedFields {
  name: string;
  slogan: string;
  desc: string;
  keywords: string;
  subtitle: string;
}

export function useLocalizedContent(
  code: string,
  name: string,
  slogan: string,
  desc: string,
  keywords: string | undefined,
  subtitle: string | undefined,
  translationsJson: string | undefined,
): LocalizedFields {
  const { t, locale } = useI18n();

  const dbTrans = useMemo(() => {
    try {
      return JSON.parse(translationsJson || "{}");
    } catch {
      return {};
    }
  }, [translationsJson]);

  return useMemo(() => {
    const resolve = (field: string, fallback: string) => {
      const localized = dbTrans[locale]?.[field];
      if (localized && localized !== code) return localized;
      const i18nKey = `types.${code}.${field}`;
      const i18nVal = t(i18nKey);
      return i18nVal !== i18nKey ? i18nVal : fallback;
    };

    return {
      name: resolve("name", name),
      slogan: resolve("slogan", slogan),
      desc: resolve("desc", desc),
      keywords: resolve("keywords", keywords || ""),
      subtitle: resolve("subtitle", subtitle || ""),
    };
  }, [dbTrans, locale, code, name, slogan, desc, keywords, subtitle, t]);
}
