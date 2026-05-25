"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import TestScreen from "@/components/TestScreen";
import ResultScreen from "@/components/ResultScreen";
import FullscreenButton from "@/components/FullscreenButton";
import { trackEvent } from "@/components/GoogleAnalytics";
import { useI18n } from "@/lib/i18n";
import type { QuizQuestion } from "@/components/TestScreen";

interface MatchResult {
  code: string; name: string; subtitle?: string; slogan: string; desc: string; keywords?: string;
  similarity: number; userVector: string; templateVector: string;
  top3: { code: string; name: string; similarity: number; translations?: string }[];
  group: string; borderType: boolean; special: boolean;
  translations?: string;
}

export default function TestPage() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [stats, setStats] = useState<{ totalParticipants: number; typePercentage: number; typeCount: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { t } = useI18n();
  const startedAtRef = useRef<number>(0);

  const loadQuiz = useCallback(() => {
    fetch("/api/quiz")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const qs: QuizQuestion[] = data.questions.map((q: Record<string, unknown>) => ({
          id: q.id as number, dim: q.dim as string, text: q.text as string,
          order: q.order as number, type: q.type as string, meta: (q.meta as string) || "",
          translations: (q.translations as string) || "{}",
          options: (q.options as Record<string, unknown>[]).map((o) => ({
            id: o.id as number, label: o.label as string,
            value: (o.value as string | null) ?? null,
          })),
        }));
        setQuestions(qs);
        setLoadError(null);
      })
      .catch((err) => {
        console.error(err);
        setLoadError(err instanceof Error ? err.message : "Failed to load quiz");
      });
  }, []);

  useEffect(() => {
    startedAtRef.current = Date.now();
    loadQuiz();
  }, [loadQuiz]);

  const handleComplete = useCallback(async (data: {
    answers: { questionId: number; optionId: number }[];
  }) => {
    setLoading(true);
    try {
      const matchRes = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: data.answers }),
      });
      const matchData: MatchResult = await matchRes.json();
      setResult(matchData);
      trackEvent("quiz_complete", { result_code: matchData.code, similarity: matchData.similarity, special: matchData.special ? 1 : 0 });

      const sessionId = `anon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const duration = startedAtRef.current ? Date.now() - startedAtRef.current : null;
      const statsRes = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          answers: data.answers,
          userAgent: navigator.userAgent,
          screenRes: `${window.screen.width}x${window.screen.height}`,
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          startedAt: startedAtRef.current ? new Date(startedAtRef.current).toISOString() : null,
          completedAt: new Date().toISOString(),
          duration,
        }),
      });
      const statsData = await statsRes.json();
      setStats({ totalParticipants: statsData.totalParticipants, typePercentage: statsData.typePercentage, typeCount: statsData.typeCount });
      setShowResult(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRestart = useCallback(() => {
    localStorage.removeItem("witch-trial-progress");
    window.location.href = "/";
  }, []);

  const handleExit = useCallback(() => {
    window.location.href = "/";
  }, []);

  return (
    <ErrorBoundary>
      <div style={{
        background: "#030303",
        minHeight: "100vh",
        color: "#EFEFEF",
        fontFamily: "'Space Mono', monospace"
      }}>
        {showResult && result ? (
          <ResultScreen result={result} stats={stats} onRestart={handleRestart} />
        ) : loadError && !questions.length ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            minHeight: "100vh", padding: "2rem", textAlign: "center",
            fontFamily: "'Noto Serif SC', serif",
          }}>
            <div style={{ fontSize: "1.2rem", color: "#d4af37", marginBottom: "1rem", fontFamily: "'Cinzel', serif", letterSpacing: "0.2em" }}>审判通道中断</div>
            <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: "1.5rem" }}>
              无法连接到审判庭，请稍后再试。
            </div>
            <button
              onClick={() => { setLoadError(null); loadQuiz(); }}
              style={{
                fontFamily: "'Cinzel', serif", fontSize: "0.7rem", letterSpacing: "0.2em",
                color: "#d4af37", background: "none", border: "1px solid rgba(212,175,55,0.3)",
                padding: "0.5rem 1.5rem", cursor: "pointer", borderRadius: 2,
              }}
            >
              重新尝试
            </button>
          </div>
        ) : (
          questions.length > 0 && (
            <TestScreen
              questions={questions}
              onComplete={handleComplete}
              onExit={handleExit}
            />
          )
        )}

        {loading && (
          <div style={{
            position: "fixed",
            inset: 0,
            zIndex: 8000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(3,3,3,0.9)",
            backdropFilter: "blur(4px)"
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "2px solid rgba(184,10,31,0.2)",
              borderTopColor: "#b80a1f",
              animation: "spin 1s linear infinite"
            }} />
            <p style={{
              marginTop: "1.5rem",
              color: "#b80a1f",
              fontSize: "0.8rem",
              letterSpacing: "0.3em"
            }}>{t("loading.text")}</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        <FullscreenButton />
      </div>
    </ErrorBoundary>
  );
}
