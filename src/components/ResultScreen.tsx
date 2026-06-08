"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import RadarChart from "./RadarChart";
import DimensionBar from "./DimensionBar";
import { DIMENSIONS } from "@/data/quiz-content";
import { parseVector } from "@/lib/match";
import { useLocalizedContent } from "@/lib/use-localized-content";
import { toPng } from "html-to-image";
import { useI18n } from "@/lib/i18n";

interface ResultData {
  code: string; name: string; subtitle?: string; slogan: string; desc: string; keywords?: string;
  similarity: number; userVector: string; templateVector: string;
  top3: { code: string; name: string; similarity: number; translations?: string }[];
  group: string; borderType: boolean; special: boolean;
  translations?: string;
}

interface ResultScreenProps {
  result: ResultData;
  stats?: { totalParticipants: number; typePercentage: number; typeCount: number } | null;
  onRestart: () => void;
}

const MODEL_GROUPS = [
  { model: "S", label: "罪业之秤 · 审判", dims: ["S1", "S2", "S3"] },
  { model: "F", label: "堕落之翼 · 侵蚀", dims: ["F1", "F2", "F3"] },
  { model: "B", label: "羁绊之锁 · 羁绊", dims: ["B1", "B2", "B3"] },
  { model: "W", label: "因子觉醒 · 觉醒", dims: ["W1", "W2", "W3"] },
] as const;

export default function ResultScreen({ result, stats, onRestart }: ResultScreenProps) {
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const { t, locale } = useI18n();
  const localized = useLocalizedContent(
    result.code, result.name, result.slogan, result.desc, result.keywords, result.subtitle, result.translations
  );

  const resolveTypeName = (entry: { code: string; name: string; translations?: string }) => {
    try {
      const dbVal = JSON.parse(entry.translations || "{}")[locale]?.name;
      if (dbVal) return dbVal;
    } catch { /* ignore */ }
    if (locale === "zh-CN") return entry.name;
    const i18nKey = `types.${entry.code}.name`;
    const i18nVal = t(i18nKey);
    return i18nVal !== i18nKey ? i18nVal : entry.name;
  };

  // 添加 revealed 类使结果页面可见
  useEffect(() => {
    document.body.classList.add("revealed");
    return () => {
      document.body.classList.remove("revealed");
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowDetail(false); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const userVals = parseVector(result.userVector || "");
  const tplVals = parseVector(result.templateVector || "");

  const shareText = t("result.shareText", { name: localized.name, slogan: localized.slogan, url: typeof window !== "undefined" ? window.location.href : "" });

  const generateShareImage = useCallback(async (): Promise<Blob | null> => {
    if (!shareCardRef.current) return null;
    try {
      const dataUrl = await toPng(shareCardRef.current, { pixelRatio: 2 });
      const res = await fetch(dataUrl);
      return await res.blob();
    } catch (e) {
      console.error("Failed to generate share image:", e);
      return null;
    }
  }, []);

  const handleShare = useCallback(async () => {
    setSharing(true);
    try {
      const imageBlob = await generateShareImage();
      const imageFile = imageBlob ? new File([imageBlob], `witch-trial-${result.code}.png`, { type: "image/png" }) : undefined;
      const shareTitle = t("meta.title");
      if (navigator.share && imageFile) {
        await navigator.share({ title: shareTitle, text: shareText, url: window.location.href, files: [imageFile] });
      } else if (navigator.share) {
        await navigator.share({ title: shareTitle, text: shareText, url: window.location.href });
      } else if (imageBlob && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": imageBlob })]);
      } else {
        await navigator.clipboard.writeText(shareText);
      }
    } catch {
      try { await navigator.clipboard.writeText(shareText); } catch { /* ignore */ }
    } finally {
      setSharing(false);
    }
  }, [result, shareText, generateShareImage, t]);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(window.location.href); } catch { /* ignore */ }
  };

  const radarData = userVals.length === 12
    ? DIMENSIONS.map((d, i) => ({ dimension: t(`dims.${d.code}`), user: userVals[i] ?? 1, template: tplVals[i] ?? 1 }))
    : [];

  return (
    <div id="view-result">
      <div className="result-layout">
        <div className="r-left">
          <div className="r-arch">
            {t("result.archetype")}
            {result.special && <span style={{ marginLeft: "0.8rem", fontSize: "0.6em", color: "#8b5cf6" }}>{t("result.hidden")}</span>}
            {result.borderType && <span style={{ marginLeft: "0.8rem", fontSize: "0.6em", color: "#888" }}>{t("result.border")}</span>}
          </div>
          <div className="r-name">{localized.name}</div>
          {localized.subtitle && (
            <div style={{ fontFamily: "var(--f-title)", fontSize: "clamp(0.8rem, 1.5vw, 1rem)", letterSpacing: "0.2em", color: "#888", marginBottom: "0.5rem" }}>
              {localized.subtitle}
            </div>
          )}

          <div className="r-stats">
            <span>{result.similarity}%</span>
            {result.top3.length > 1 && <span>{resolveTypeName(result.top3[1])} {result.top3[1].similarity}%</span>}
            {result.top3.length > 2 && <span>{resolveTypeName(result.top3[2])} {result.top3[2].similarity}%</span>}
          </div>

          <div className="r-slogan">{localized.slogan}</div>

          {stats && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", margin: "0.8rem 0 0.3rem", padding: "0.5rem 0.8rem", background: "rgba(0,0,0,0.03)", borderRadius: 6, borderLeft: "3px solid rgba(139,0,0,0.3)" }}>
              <div style={{ fontFamily: "var(--f-title)", fontSize: "1.1rem", fontWeight: 700, color: "#8b0000" }}>{stats.typePercentage}%</div>
              <div style={{ fontSize: "0.7rem", color: "#888", lineHeight: 1.4, letterSpacing: "0.03em" }}>
                {t("result.factorResonanceLabel")}
              </div>
            </div>
          )}

          <div className="r-actions">
            <button className="btn-restart" onClick={handleShare} disabled={sharing}>{sharing ? "..." : t("result.share")}</button>
            <button className="btn-restart" onClick={handleCopy}>{t("result.copyLink")}</button>
            <button className="btn-restart" onClick={onRestart}>{t("result.rebirth")}</button>
          </div>
        </div>

        <div className="r-right">
          <div className="r-desc">{localized.desc}</div>

          {localized.keywords && (
            <div className="r-keywords">
              {localized.keywords.split(/[、,，]/).map((kw: string, i: number) => (
                <span key={i} className="r-keyword-tag">{kw.trim()}</span>
              ))}
            </div>
          )}

          <div style={{ marginTop: "1rem" }}>
            <button onClick={() => setShowDetail(true)}
              style={{
                fontFamily: "var(--f-title)", fontSize: "0.7rem", letterSpacing: "0.15em",
                color: "#888", background: "none", border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 999, padding: "0.35rem 1.2rem", cursor: "pointer",
                transition: "all 0.3s ease",
              }}>
              {t("result.analysis")}
            </button>
          </div>
        </div>
      </div>

      {showDetail && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center" }}
          onClick={() => setShowDetail(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fafafa", color: "#0a0a0a", borderRadius: 16,
              maxWidth: 560, width: "92vw", maxHeight: "88vh", overflow: "auto",
              padding: "2rem", position: "relative",
              boxShadow: "0 25px 80px rgba(0,0,0,0.3)",
            }}
          >
            <button onClick={() => setShowDetail(false)}
              style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", fontSize: "1.4rem", color: "#888", cursor: "pointer", lineHeight: 1 }}>
              &times;
            </button>

            <div style={{ fontFamily: "var(--f-title)", fontSize: "0.65rem", letterSpacing: "0.3em", color: "#888", marginBottom: "1.5rem" }}>
              {t("result.dimAnalysis")}
            </div>

            {radarData.length > 0 && (
              <>
                <RadarChart data={radarData} templateName={localized.name} youLabel={t("result.you")} />

                {MODEL_GROUPS.map((group) => (
                  <div key={group.model} style={{ marginBottom: "1rem" }}>
                    <div style={{ fontFamily: "var(--f-title)", fontSize: "0.6rem", letterSpacing: "0.15em", color: "#888", marginBottom: "0.4rem" }}>
                      {t(`dimGroups.${group.model}`)}
                    </div>
                    {group.dims.map((dimCode) => {
                      const idx = DIMENSIONS.findIndex((d) => d.code === dimCode);
                      const uv = userVals[idx] ?? 1;
                      const tv = tplVals[idx] ?? uv;
                      return (
                        <DimensionBar key={dimCode} label={t(`dims.${dimCode}`)} value={uv} compareValue={tv} />
                      );
                    })}
                  </div>
                ))}

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1rem", paddingTop: "0.8rem", borderTop: "1px solid rgba(0,0,0,0.06)", fontSize: "0.75rem" }}>
                  <span style={{ color: "#888", fontFamily: "var(--f-title)", letterSpacing: "0.1em" }}>{t("result.you").toUpperCase()}</span>
                  <span style={{ fontFamily: "var(--f-title)", fontWeight: 600, letterSpacing: "0.1em" }}>{result.userVector || "—"}</span>
                  <span style={{ color: "#888", fontFamily: "var(--f-title)", letterSpacing: "0.1em" }}>{t("result.ideal")}</span>
                  <span style={{ fontFamily: "var(--f-title)", fontWeight: 600, letterSpacing: "0.1em" }}>{result.templateVector}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div ref={shareCardRef} aria-hidden="true" style={{ position: "fixed", top: "-9999px", left: "-9999px", width: 390, height: 693, background: "#050308", color: "#e6e6e6", fontFamily: "'Noto Serif SC', serif", padding: "2rem 1.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: "0.55rem", letterSpacing: "0.5em", color: "rgba(212,175,55,0.6)", marginBottom: "1.2rem" }}>WITCH TRIAL</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, lineHeight: 1.15, color: "#fff", marginBottom: "0.4rem" }}>{localized.name}</div>
          {localized.subtitle && <div style={{ fontSize: "0.75rem", color: "#888", letterSpacing: "0.15em", marginBottom: "0.3rem" }}>{localized.subtitle}</div>}
          <div style={{ fontSize: "0.75rem", fontStyle: "italic", color: "#d4af37", marginTop: "0.8rem", lineHeight: 1.6 }}>{localized.slogan}</div>
        </div>
        <div>
          {localized.keywords && (
            <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              {localized.keywords.split(/[、,，]/).map((kw: string, i: number) => (
                <span key={i} style={{ fontSize: "0.55rem", padding: "0.15rem 0.45rem", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 999, color: "rgba(212,175,55,0.7)" }}>{kw.trim()}</span>
              ))}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.8rem" }}>
            <div>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: "1.6rem", fontWeight: 900, color: "#d4af37" }}>{result.similarity}%</div>
              <div style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em" }}>SIMILARITY</div>
            </div>
            {stats && (
              <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.3)", textAlign: "right", lineHeight: 1.5 }}>
                {t("result.statsShort", { percentage: stats.typePercentage })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
