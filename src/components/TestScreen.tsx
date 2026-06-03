"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useI18n } from "@/lib/i18n";

export interface QuizQuestion {
  id: number; dim: string; text: string; order: number; type: string; meta: string;
  translations?: string;
  options: QuizOption[];
}

export interface QuizOption {
  id: number; label: string; score?: number; value?: string | null; trigger?: string | null;
}

interface TestScreenProps {
  questions: QuizQuestion[];
  onComplete: (result: {
    answers: { questionId: number; optionId: number }[];
    gateValue?: string;
  }) => void;
  onExit: () => void;
}

const STORAGE_KEY = "witch-trial-progress";
const ROMAN = ["I", "II", "III", "IV", "V"];

function readSavedProgress(): {
  currentIndex: number;
  answers: { questionId: number; optionId: number }[];
  gateValue: string | undefined;
} {
  if (typeof window === "undefined") {
    return { currentIndex: 0, answers: [], gateValue: undefined };
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { currentIndex: 0, answers: [], gateValue: undefined };
    const data = JSON.parse(saved) as {
      currentIndex?: unknown;
      answers?: unknown;
      gateValue?: unknown;
    };
    if (!Array.isArray(data.answers) || typeof data.currentIndex !== "number" || data.currentIndex <= 0) {
      return { currentIndex: 0, answers: [], gateValue: undefined };
    }
    return {
      currentIndex: data.currentIndex,
      answers: data.answers as { questionId: number; optionId: number }[],
      gateValue: typeof data.gateValue === "string" ? data.gateValue : undefined,
    };
  } catch {
    return { currentIndex: 0, answers: [], gateValue: undefined };
  }
}

export default function TestScreen({ questions, onComplete, onExit }: TestScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: number; optionId: number }[]>([]);
  const [gateValue, setGateValue] = useState<string | undefined>();
  const [isAnimating, setIsAnimating] = useState(false);
  const { t, locale } = useI18n();
  const [stageFadeOut, setStageFadeOut] = useState(false);
  const [showKeyboardHint, setShowKeyboardHint] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<{
    answers: { questionId: number; optionId: number }[];
    gateValue: string | undefined;
    isLast: boolean;
  } | null>(null);
  const touchFeedbackRef = useRef(false);
  const timerRef = useRef<number>(0);
  const fadeTimerRef = useRef<number>(0);

  useEffect(() => {
    queueMicrotask(() => {
      const saved = readSavedProgress();
      setAnswers(saved.answers);
      setCurrentIndex(saved.currentIndex);
      setGateValue(saved.gateValue);
      const isTouchLike = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
      touchFeedbackRef.current = isTouchLike;
      setShowKeyboardHint(!isTouchLike);
    });
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentIndex, answers, gateValue })); } catch { /* ignore */ }
  }, [currentIndex, answers, gateValue]);

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(fadeTimerRef.current);
    };
  }, []);

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
      const progressLine = document.getElementById("progress-line");
      if (progressLine) progressLine.style.width = "100%";
      localStorage.removeItem(STORAGE_KEY);
      setIsCompleted(true);
      onComplete({ answers: p.answers, gateValue: p.gateValue });
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

    const answer = { questionId: current.id, optionId: option.id };
    const newAnswers = [...answers, answer];
    let newGateValue = gateValue;
    if (current.type === "gate" && option.value) { newGateValue = option.value; setGateValue(option.value); }

    const parent = selectedBlock.parentElement;
    if (parent) {
      const allBlocks = Array.from(parent.children) as HTMLElement[];
      allBlocks.forEach((b) => { b.style.pointerEvents = "none"; });
      selectedBlock.classList.add("is-selected");
      allBlocks.forEach((b) => { if (b !== selectedBlock) b.classList.add("is-dimmed"); });
    }
    const isTouchFeedback = touchFeedbackRef.current;
    if (navigator.vibrate) navigator.vibrate(isTouchFeedback ? 12 : 40);

    const isLast = currentIndex >= displayQuestions.length - 1;
    pendingRef.current = { answers: newAnswers, gateValue: newGateValue, isLast };

    const feedbackDelay = isTouchFeedback ? 120 : 400;
    const totalDelay = isTouchFeedback ? 280 : 700;
    fadeTimerRef.current = window.setTimeout(() => {
      setStageFadeOut(true);
    }, feedbackDelay);
    timerRef.current = window.setTimeout(() => {
      flushPending();
    }, totalDelay);
  }, [current, answers, gateValue, currentIndex, displayQuestions.length, isAnimating, flushPending]);

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
      if (blocks && blocks[idx] && current.options[idx]) handleSelect(blocks[idx] as HTMLElement, current.options[idx]);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [current, isAnimating, handleSelect, flushPending]);

  // Update progress line
  useEffect(() => {
    const el = document.getElementById("progress-line");
    if (el) el.style.width = `${progress}%`;
  }, [progress]);

  if (isCompleted || !current) return null;

  const isGateOrTrigger = current.type === "gate" || current.type === "trigger";
  const questionLabelId = `q-text-${current.id}`;

  return (
    <div className="view-test" style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* EXIT button */}
      <button type="button" onClick={() => { localStorage.removeItem(STORAGE_KEY); onExit(); }}
        style={{
          position: "absolute",
          top: "max(1.2rem, env(safe-area-inset-top, 1.2rem))",
          right: "max(1.2rem, env(safe-area-inset-right, 1.2rem))",
          zIndex: 30,
          background: "transparent",
          border: "none",
          color: "rgba(255,255,255,0.4)",
          fontFamily: "var(--f-title)",
          fontSize: "0.7rem",
          letterSpacing: "0.15em",
          padding: "0.3rem 0.5rem",
          cursor: "pointer",
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "rgba(184, 10, 31, 0.8)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "rgba(255,255,255,0.4)";
        }}
      >
        {t("test.exit")}
      </button>
      <div className="watermark-index" aria-hidden="true">{ROMAN[currentIndex] || (currentIndex + 1)}</div>
      <div ref={stageRef} id="test-stage-wrapper" className={stageFadeOut ? "stage-fade-out" : ""}>
        <div className="question-stage">
          <div className="q-meta">
            <span>
              {isGateOrTrigger && <span className="gate-badge">{current.type === "gate" ? t("test.gateBadge") : t("test.triggerBadge")}</span>}
              {isGateOrTrigger ? "" : `${current.meta || "审判"} \u00B7 ${String(currentIndex + 1).padStart(2, "0")} / ${String(displayQuestions.length).padStart(2, "0")}`}
            </span>
            <span className="q-hint">{showKeyboardHint ? t("test.keyHint") : ""}</span>
          </div>
          <div className="q-text" id={questionLabelId}>{current.text}</div>
        </div>
        <div className="options-stage" role="radiogroup" aria-labelledby={questionLabelId}>
          {current.options.map((option, idx) => (
            <button
              type="button"
              key={option.id}
              className="opt-block"
              role="radio"
              aria-checked={false}
              aria-label={option.label}
              style={{ animationDelay: `${idx * 0.1}s` }}
              onClick={(e) => handleSelect(e.currentTarget, option)}
            >
              <div className="opt-content">
                <div className="opt-index" aria-hidden="true">{ROMAN[idx]}</div>
                <div className="opt-text">{option.label}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
