"use client";

import { useState, useEffect } from "react";
import { useI18n, LOCALE_LABELS, type Locale } from "@/lib/i18n";

interface WelcomeScreenProps {
  onStart: () => void;
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const { locale, setLocale, t } = useI18n();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/count")
      .then((r) => r.json())
      .then((d) => setCount(d.total))
      .catch(() => {});
  }, []);

  const badge = t("welcome.badge");
  const title = t("welcome.title");

  return (
    <>
      {badge && (
        <div className="hero-badge">
          {badge.split(/([的の])/).map((part, i) =>
            /^[的の]$/.test(part) ? (
              <span key={i} style={{ display: "inline-block", margin: "0 0.4em", opacity: 0.3, transform: "rotate(15deg)", fontWeight: 300 }}>{part}</span>
            ) : part
          )}
        </div>
      )}
      <h1 className="hero-title" data-title={title}>{title}</h1>
      <div className="hero-subtitle">{t("welcome.subtitle")}</div>

      {count !== null && (
        <div style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.7rem", letterSpacing: "0.15em", marginTop: "0.5rem", marginBottom: "0.5rem", fontFamily: "var(--f-title)" }}>
          {t("welcome.participants", { count: count.toLocaleString() })}
        </div>
      )}

      <div className="hero-divider" />

      <div className="hero-lang">
        {(Object.keys(LOCALE_LABELS) as Locale[]).map((l) => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            className={locale === l ? "is-active" : ""}
          >
            {LOCALE_LABELS[l]}
          </button>
        ))}
      </div>

      <div
        className="art-btn-enter"
        role="button"
        tabIndex={0}
        data-label={t("welcome.startButton")}
        onClick={onStart}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onStart(); }}
      />
      <div className="art-btn-hint">{t("welcome.startHint")}</div>
    </>
  );
}
