"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import BackgroundEffect from "@/components/BackgroundEffect";
import WelcomeScreen from "@/components/WelcomeScreen";
import TestScreen from "@/components/TestScreen";
import ResultScreen from "@/components/ResultScreen";
import { trackEvent } from "@/components/GoogleAnalytics";
import { useI18n } from "@/lib/i18n";
import type { QuizQuestion } from "@/components/TestScreen";

type Screen = "welcome" | "test" | "result";

interface MatchResult {
  code: string; name: string; subtitle?: string; slogan: string; desc: string; keywords?: string;
  similarity: number; userVector: string; templateVector: string;
  top3: { code: string; name: string; similarity: number }[];
  group: string; borderType: boolean; special: boolean;
  translations?: string;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function Home() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [stats, setStats] = useState<{ totalParticipants: number; typePercentage: number; typeCount: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [testKey, setTestKey] = useState(0);
  const { t } = useI18n();
  const screenRef = useRef<Screen>("welcome");
  const startedAtRef = useRef<number>(0);
  const ringX = useRef(0);
  const ringY = useRef(0);
  const mouseX = useRef(0);
  const mouseY = useRef(0);
  const animRef = useRef<number>(0);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const blindRef = useRef<HTMLDivElement>(null);
  const viewsRef = useRef<Map<Screen, HTMLDivElement>>(new Map());

  // Fetch questions
  useEffect(() => {
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

  // View switching
  const switchView = useCallback(async (to: Screen, callback?: () => void) => {
    const blind = blindRef.current;
    if (!blind) return;
    const from = screenRef.current;

    blind.classList.add("blinding");
    if (to === "test") document.body.classList.add("in-test");
    else document.body.classList.remove("in-test");

    await wait(700);

    if (from && from !== to) {
      const fromEl = viewsRef.current.get(from);
      if (fromEl) fromEl.classList.remove("is-active");
    }
    const toEl = viewsRef.current.get(to);
    if (toEl) toEl.classList.add("is-active");

    screenRef.current = to;
    if (callback) callback();

    blind.classList.remove("blinding");
  }, []);

  const handleStart = useCallback(() => {
    localStorage.removeItem("witch-trial-progress");
    startedAtRef.current = Date.now();
    trackEvent("quiz_start");
    switchView("test");
  }, [switchView]);

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

      // Result page: blind closes → switch view → blind opens with "revealed"
      const blind = blindRef.current;
      if (blind) {
        document.body.classList.remove("in-test");
        document.body.classList.remove("revealed");
        blind.classList.add("blinding");
        await wait(700);
        const fromEl = viewsRef.current.get(screenRef.current);
        if (fromEl) fromEl.classList.remove("is-active");
        screenRef.current = "result";
        const toEl = viewsRef.current.get("result");
        if (toEl) toEl.classList.add("is-active");
        // Keep blind closed, then reveal
        blind.classList.remove("blinding");
        blind.style.transform = "scaleY(1)";
        blind.style.transformOrigin = "top";
        blind.style.transition = "transform 1.2s cubic-bezier(0.85, 0, 0.15, 1)";
        await wait(500);
        document.body.classList.add("revealed");
        blind.style.transform = "scaleY(0)";
        blind.style.transformOrigin = "bottom";
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRestart = useCallback(() => {
    localStorage.removeItem("witch-trial-progress");
    setResult(null);
    setStats(null);
    setTestKey((k) => k + 1);
    document.body.classList.remove("revealed");
    const blind = blindRef.current;
    if (blind) {
      blind.style.transform = "";
      blind.style.transformOrigin = "";
      blind.style.transition = "";
    }
    switchView("welcome");
  }, [switchView]);

  // Cursor — exact replica of the HTML's cursor logic
  useEffect(() => {
    const isTouchDevice = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
    if (isTouchDevice) return;

    document.body.style.cursor = "none";

    const handleMove = (e: MouseEvent) => {
      mouseX.current = e.clientX; mouseY.current = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(calc(${e.clientX}px - 50%), calc(${e.clientY}px - 50%))`;
      }
    };

    const renderCursor = () => {
      ringX.current += (mouseX.current - ringX.current) * 0.2;
      ringY.current += (mouseY.current - ringY.current) * 0.2;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(calc(${ringX.current}px - 50%), calc(${ringY.current}px - 50%))`;
      }
      animRef.current = requestAnimationFrame(renderCursor);
    };

    mouseX.current = window.innerWidth / 2;
    mouseY.current = window.innerHeight / 2;
    ringX.current = mouseX.current;
    ringY.current = mouseY.current;

    window.addEventListener("mousemove", handleMove);
    renderCursor();

    // Hover detection — dynamic like the HTML's MutationObserver
    const handleOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".art-btn-enter, .opt-block, .btn-restart, button")) {
        document.body.classList.add("hovering");
      }
    };
    const handleOut = () => document.body.classList.remove("hovering");

    document.addEventListener("mouseover", handleOver);
    document.addEventListener("mouseout", handleOut);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(animRef.current);
      document.removeEventListener("mouseover", handleOver);
      document.removeEventListener("mouseout", handleOut);
      document.body.style.cursor = "";
      document.body.classList.remove("hovering");
    };
  }, []);

  // Keyboard support — matches the HTML
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!document.body.classList.contains("in-test")) return;
      if (screen !== "test") return;
      const blocks = document.querySelectorAll(".opt-block");
      const keyMap: Record<string, number> = { "1": 0, "2": 1, "3": 2, "4": 3 };
      const idx = keyMap[e.key];
      if (idx !== undefined && blocks[idx]) (blocks[idx] as HTMLElement).click();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [screen]);

  const setViewRef = useCallback((name: Screen, el: HTMLDivElement | null) => {
    if (el) viewsRef.current.set(name, el);
  }, []);

  // Trigger welcome animation on first mount
  // Double rAF ensures the browser has painted the initial state (width: 0)
  // before adding is-active, so the CSS transition actually triggers
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = viewsRef.current.get("welcome");
        if (el) el.classList.add("is-active");
      });
    });
  }, []);

  return (
    <>
      <div id="progress-line" />

      <div id="cursor-dot" ref={dotRef} />
      <div id="cursor-ring" ref={ringRef} />

      <BackgroundEffect />

      <div id="transition-blind" ref={blindRef} />

      <div ref={(el) => setViewRef("welcome", el)} className="view-layer view-welcome">
        <WelcomeScreen onStart={handleStart} />
      </div>

      <div ref={(el) => setViewRef("test", el)} className="view-layer view-test">
        {questions.length > 0 && <TestScreen key={testKey} questions={questions} onComplete={handleComplete} onExit={handleRestart} />}
      </div>

      <div ref={(el) => setViewRef("result", el)} className="view-layer view-result">
        {result && <ResultScreen result={result} stats={stats} onRestart={handleRestart} />}
      </div>

      {loading && (
        <div style={{ position: "fixed", inset: 0, zIndex: 8000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(5,3,8,0.85)", backdropFilter: "blur(4px)" }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(212,175,55,0.2)", borderTopColor: "#d4af37", animation: "spin 1s linear infinite" }} />
          <p style={{ marginTop: "1.5rem", color: "#d4af37", fontSize: "0.8rem", letterSpacing: "0.3em", animation: "pulse 1.5s ease-in-out infinite" }}>{t("loading.text")}</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }`}</style>
        </div>
      )}
    </>
  );
}
