"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useI18n } from "@/lib/i18n";

export interface QuizQuestion {
  id: number; dim: string; text: string; order: number; type: string; meta: string;
  translations?: string;
  options: QuizOption[];
}

export interface QuizOption {
  id: number; label: string; score: number; value: string | null; trigger: string | null;
}

interface TestScreenProps {
  questions: QuizQuestion[];
  onComplete: (result: {
    answers: { questionId: number; optionId: number; dim: string; score: number }[];
    gateValue?: string; triggerFired?: string;
  }) => void;
  onExit: () => void;
}

const STORAGE_KEY = "witch-trial-progress";
const ROMAN = ["I", "II", "III", "IV", "V"];

export default function TestScreen({ questions, onComplete, onExit }: TestScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: number; optionId: number; dim: string; score: number }[]>([]);
  const [gateValue, setGateValue] = useState<string | undefined>();
  const [isAnimating, setIsAnimating] = useState(false);
  const { t, locale } = useI18n();
  const [stageFadeOut, setStageFadeOut] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<{
    answers: { questionId: number; optionId: number; dim: string; score: number }[];
    gateValue: string | undefined;
    triggerFired: string | undefined;
    isLast: boolean;
  } | null>(null);
  const timerRef = useRef<number>(0);
  const fadeTimerRef = useRef<number>(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.answers && data.currentIndex > 0) {
          setAnswers(data.answers);
          setCurrentIndex(data.currentIndex);
          if (data.gateValue) setGateValue(data.gateValue);
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentIndex, answers, gateValue })); } catch { /* ignore */ }
  }, [currentIndex, answers, gateValue]);

  const displayQuestions = useMemo(() => {
    if (locale === "zh-CN") {
      return questions.filter((q) => {
        if (q.type === "trigger") return gateValue === "destroy" || gateValue === "endure";
        return true;
      });
    }

    return questions.map((q) => {
      try {
        const trans = JSON.parse(q.translations || "{}");
        const lt = trans[locale] as { text?: string; meta?: string; options?: string[] } | undefined;
        if (!lt) return q;
        return {
          ...q,
          text: lt.text || q.text,
          meta: lt.meta || q.meta,
          options: q.options.map((opt, i) => ({
            ...opt,
            label: lt.options?.[i] || opt.label,
          })),
        };
      } catch {
        return q;
      }
    }).filter((q) => {
      if (q.type === "trigger") return gateValue === "destroy" || gateValue === "endure";
      return true;
    });
  }, [questions, locale, gateValue]);

  const current = displayQuestions[currentIndex];
  const progress = displayQuestions.length > 0 ? (currentIndex / displayQuestions.length) * 100 : 0;

  const flushPending = useCallback(() => {
    clearTimeout(timerRef.current);
    clearTimeout(fadeTimerRef.current);
    const p = pendingRef.current;
    if (!p) return;
    pendingRef.current = null;
    if (p.isLast) {
      document.getElementById("progress-line")!.style.width = "100%";
      localStorage.removeItem(STORAGE_KEY);
      onComplete({ answers: p.answers, gateValue: p.gateValue, triggerFired: p.triggerFired });
    } else {
      setAnswers(p.answers);
      setCurrentIndex((i) => i + 1);
      setStageFadeOut(false);
    }
    setIsAnimating(false);
  }, [onComplete]);

  const handleSelect = useCallback((selectedBlock: HTMLElement, option: QuizOption) => {
    // If animating, skip current animation and apply pending state first
    if (isAnimating) {
      flushPending();
      // Return — the next keypress on the NEW question will be a fresh handleSelect
      return;
    }
    setIsAnimating(true);
    document.body.classList.remove("hovering");

    const answer = { questionId: current.id, optionId: option.id, dim: current.dim, score: option.score };
    const newAnswers = [...answers, answer];
    let newGateValue = gateValue;
    if (current.type === "gate" && option.value) { newGateValue = option.value; setGateValue(option.value); }
    let triggerFired: string | undefined;
    if (current.type === "trigger" && option.trigger) triggerFired = option.trigger;

    const parent = selectedBlock.parentElement;
    if (parent) {
      const allBlocks = Array.from(parent.children) as HTMLElement[];
      allBlocks.forEach((b) => { b.style.pointerEvents = "none"; });
      selectedBlock.classList.add("is-selected");
      allBlocks.forEach((b) => { if (b !== selectedBlock) b.classList.add("is-dimmed"); });
    }
    if (navigator.vibrate) navigator.vibrate(40);

    const isLast = currentIndex >= displayQuestions.length - 1;
    pendingRef.current = { answers: newAnswers, gateValue: newGateValue, triggerFired, isLast };

    // Original timing: 400ms visual feedback, then 300ms fade-out
    fadeTimerRef.current = window.setTimeout(() => {
      setStageFadeOut(true);
    }, 400);
    timerRef.current = window.setTimeout(() => {
      flushPending();
    }, 700);
  }, [current, answers, gateValue, currentIndex, displayQuestions.length, onComplete, isAnimating, flushPending]);

  // Keyboard support
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!current) return;
      const keyMap: Record<string, number> = { "1": 0, "2": 1, "3": 2, "4": 3 };
      const idx = keyMap[e.key];
      if (idx === undefined) return;
      if (isAnimating) {
        // Skip animation, then process new key after state updates
        flushPending();
        return;
      }
      const blocks = stageRef.current?.querySelectorAll(".opt-block");
      if (blocks && blocks[idx]) handleSelect(blocks[idx] as HTMLElement, current.options[idx]);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [current, isAnimating, handleSelect, flushPending]);

  // Update progress line
  useEffect(() => {
    const el = document.getElementById("progress-line");
    if (el) el.style.width = `${progress}%`;
  }, [progress]);

  if (!current) return null;

  const isGateOrTrigger = current.type === "gate" || current.type === "trigger";

  return (
    <div className="view-test" style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* EXIT button */}
      <button type="button" onClick={() => { localStorage.removeItem(STORAGE_KEY); onExit(); }}
        style={{ position: "absolute", top: "1.2rem", left: "1.2rem", zIndex: 30, background: "transparent", border: "none", color: "rgba(255,255,255,0.2)", fontFamily: "var(--f-title)", fontSize: "0.7rem", letterSpacing: "0.15em", padding: "0.3rem 0.6rem" }}>
        {t("test.exit")}
      </button>
      <div className="watermark-index">{ROMAN[currentIndex] || (currentIndex + 1)}</div>
      <div ref={stageRef} id="test-stage-wrapper" className={stageFadeOut ? "stage-fade-out" : ""}>
        <div className="question-stage">
          <div className="q-meta">
            <span>
              {isGateOrTrigger && <span className="gate-badge">{current.type === "gate" ? t("test.gateBadge") : t("test.triggerBadge")}</span>}
              {isGateOrTrigger ? "" : `${current.meta || "审判"} \u00B7 ${String(currentIndex + 1).padStart(2, "0")} / ${String(displayQuestions.length).padStart(2, "0")}`}
            </span>
            <span className="q-hint">{typeof window !== "undefined" && !("ontouchstart" in window) ? t("test.keyHint") : ""}</span>
          </div>
          <div className="q-text">{current.text}</div>
        </div>
        <div className="options-stage">
          {current.options.map((option, idx) => (
            <div key={option.id} className="opt-block" style={{ animationDelay: `${idx * 0.1}s` }} onClick={(e) => handleSelect(e.currentTarget, option)}>
              <div className="opt-content">
                <div className="opt-index">{ROMAN[idx]}</div>
                <div className="opt-text">{option.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
