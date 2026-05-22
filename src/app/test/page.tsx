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
  top3: { code: string; name: string; similarity: number }[];
  group: string; borderType: boolean; special: boolean;
  translations?: string;
}

export default function TestPage() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [stats, setStats] = useState<{ totalParticipants: number; typePercentage: number; typeCount: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const { t } = useI18n();
  const startedAtRef = useRef<number>(0);

  // Fetch questions
  useEffect(() => {
    startedAtRef.current = Date.now();
    fetch("/api/quiz")
      .then((r) => r.json())
      .then((data) => {
        const qs: QuizQuestion[] = data.questions.map((q: Record<string, unknown>) => ({
          id: q.id as number, dim: q.dim as string, text: q.text as string,
          order: q.order as number, type: q.type as string, meta: (q.meta as string) || "",
          translations: (q.translations as string) || "{}",
          options: (q.options as Record<string, unknown>[]).map((o) => ({
            id: o.id as number, label: o.label as string, score: o.score as number,
            value: o.value as string | null, trigger: o.trigger as string | null,
          })),
        }));
        setQuestions(qs);
      })
      .catch(console.error);
  }, []);

  const handleComplete = useCallback(async (data: {
    answers: { questionId: number; optionId: number; dim: string; score: number }[];
    gateValue?: string; triggerFired?: string;
  }) => {
    setLoading(true);
    try {
      const matchRes = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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
          sessionId, resultCode: matchData.code, similarity: matchData.similarity,
          userVector: matchData.userVector, top3: matchData.top3, borderType: matchData.borderType,
          answers: data.answers, gateValue: data.gateValue,
          triggerFired: data.triggerFired ?? (matchData.special ? matchData.code : null),
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
