import { DIMENSIONS, WEIGHTS, ALGO_CONFIG, type DimCode } from "@/data/quiz-content";

// --- 向量解析与计算 ---

const TIER_CHAR_TO_NUM: Record<string, number> = { L: 0, M: 1, H: 2, X: 3 };
const TIER_NUM_TO_CHAR = ["L", "M", "H", "X"] as const;
const DIM_CODES = DIMENSIONS.map((d) => d.code) as DimCode[];
const DIM_WEIGHTS = DIM_CODES.map((c) => WEIGHTS[c] ?? 1.0);
const MAX_DISTANCE = DIM_WEIGHTS.reduce((s, w) => s + w * 3, 0);

/** 将 "LHH-LLM-HHH-LLL" 解析为 [0,2,2, 0,1,0, 2,2,2, 0,0,0] */
export function parseVector(v: string): number[] {
  return v.replace(/-/g, "").split("").map((c) => TIER_CHAR_TO_NUM[c] ?? 1);
}

/** 将 12 个数值转为 "LHH-LLM-HHH-LLL" 格式 */
export function formatVector(values: number[]): string {
  const chars = values.map((v) => TIER_NUM_TO_CHAR[Math.min(v, 3)]);
  return [chars.slice(0, 3).join(""), chars.slice(3, 6).join(""), chars.slice(6, 9).join(""), chars.slice(9, 12).join("")].join("-");
}

/** 分数转档位 */
export function scoreToTier(total: number): number {
  for (const tier of ALGO_CONFIG.tiers) {
    if (total <= tier.max) return tier.value;
  }
  return 3;
}

/** 加权曼哈顿距离 */
export function weightedManhattan(a: number[], b: number[]): number {
  let dist = 0;
  for (let i = 0; i < 12; i++) {
    dist += DIM_WEIGHTS[i] * Math.abs(a[i] - b[i]);
  }
  return dist;
}

/** 最大可能距离 */
export function maxDistance(): number {
  return MAX_DISTANCE;
}

/** 相似度 % */
export function similarity(dist: number): number {
  return Math.round(((1 - dist / MAX_DISTANCE) * 100) * 10) / 10;
}

// --- 匹配主函数 ---

export interface MatchInput {
  // dimCode → sum of scores (raw, before tier conversion)
  dimScores: Record<string, number>;
  gateValue?: string;   // "destroy" | "endure" | "normal" | "normal_alt"
  triggerFired?: string; // "SPECIAL_A" | "SPECIAL_B" etc
}

export interface MatchResult {
  code: string;
  name: string;
  subtitle?: string;
  slogan: string;
  desc: string;
  keywords?: string;
  similarity: number;
  userVector: string;
  templateVector: string;
  top3: { code: string; name: string; similarity: number; translations?: string }[];
  group: string;
  borderType: boolean;
  special: boolean;
  translations?: string;
}

function resolveSpecialCode(trigger: string, candidates: string[]): string | undefined {
  if (candidates.includes(trigger)) return trigger;

  const match = /^SPECIAL_([A-Z]|\d+)$/i.exec(trigger);
  if (!match) return undefined;

  const token = match[1].toUpperCase();
  const index = /^\d+$/.test(token)
    ? Number(token) - 1
    : token.charCodeAt(0) - "A".charCodeAt(0);

  return index >= 0 ? candidates[index] : undefined;
}

export function match(
  input: MatchInput,
  types: {
    code: string;
    name: string;
    subtitle?: string | null;
    group: string;
    vector: string;
    slogan: string;
    desc: string;
    keywords?: string | null;
    special: boolean;
    translations?: string;
  }[],
): MatchResult {
  // Convert DB type objects (null → undefined for optional fields)
  const allTypes = types.map((t) => ({
    ...t,
    subtitle: t.subtitle ?? undefined,
    keywords: t.keywords ?? undefined,
  }));

  const regularTypes = allTypes.filter((t) => !t.special && t.group !== "fallback");
  const specialTypes = allTypes.filter((t) => t.special);
  const unsetType = allTypes.find((t) => t.group === "fallback")!;

  // ① 特殊触发
  if (input.triggerFired && input.gateValue) {
    const gateToSpecial: Record<string, string[]> = {
      destroy: specialTypes.map((t) => t.code),
      endure: specialTypes.filter((_, i) => i % 2 === 1).map((t) => t.code),
    };
    const candidates = gateToSpecial[input.gateValue] ?? specialTypes.map((t) => t.code);
    const specialCode = resolveSpecialCode(input.triggerFired, candidates);
    if (specialCode) {
      const t = allTypes.find((p) => p.code === specialCode)!;
      // Compute user vector for special trigger too
      let specialUserVec = "";
      {
        const scores = { ...input.dimScores };
        if (input.gateValue === "normal") {
          scores["S2"] = Math.min((scores["S2"] ?? 0) + 1, 6);
        } else if (input.gateValue === "normal_alt") {
          scores["W1"] = Math.min((scores["W1"] ?? 0) + 1, 6);
        }
        specialUserVec = formatVector(DIM_CODES.map((code) => scoreToTier(scores[code] ?? 3)));
      }

      return {
        code: t.code,
        name: t.name,
        subtitle: t.subtitle,
        slogan: t.slogan,
        desc: t.desc,
        keywords: t.keywords,
        similarity: 100,
        userVector: specialUserVec,
        templateVector: t.vector,
        top3: [{ code: t.code, name: t.name, similarity: 100, translations: t.translations }],
        group: "special",
        borderType: false,
        special: true,
        translations: t.translations,
      };
    }
  }

  // ② 计算用户向量
  let userValues: number[];

  {
    // 微调：门控题 normal 选项
    const scores = { ...input.dimScores };
    if (input.gateValue === "normal") {
      // S2 +1 (直觉度微调)
      const key = "S2";
      scores[key] = Math.min((scores[key] ?? 0) + 1, 6);
    } else if (input.gateValue === "normal_alt") {
      // W1 +1 (压抑力微调)
      const key = "W1";
      scores[key] = Math.min((scores[key] ?? 0) + 1, 6);
    }

    userValues = DIM_CODES.map((code) => {
      const total = scores[code] ?? 3; // default mid
      return scoreToTier(total);
    });
  }

  const userVec = formatVector(userValues);

  // ③ 向量匹配
  const ranked = regularTypes
    .map((t) => {
      const tplValues = parseVector(t.vector);
      const dist = weightedManhattan(userValues, tplValues);
      return { type: t, dist, sim: similarity(dist) };
    })
    .sort((a, b) => a.dist - b.dist);

  const top3 = ranked.slice(0, 3);
  const best = top3[0];

  // ④ 边界检查
  const delta = ALGO_CONFIG.delta;
  const threshold = ALGO_CONFIG.threshold;
  let borderType = false;
  const resultCode = best.type.code;

  if (top3.length >= 2) {
    const gap = best.sim - top3[1].sim;
    if (gap < delta) {
      if (best.sim < threshold) {
        // 兜底
        return {
          code: unsetType.code,
          name: unsetType.name,
          subtitle: unsetType.subtitle,
          slogan: unsetType.slogan,
          desc: unsetType.desc,
          keywords: unsetType.keywords,
          similarity: best.sim,
          userVector: userVec,
          templateVector: unsetType.vector,
          top3: top3.map((r) => ({ code: r.type.code, name: r.type.name, similarity: r.sim, translations: r.type.translations })),
          group: "fallback",
          borderType: true,
          special: false,
          translations: unsetType.translations,
        };
      }
      borderType = true;
    }
  }

  return {
    code: resultCode,
    name: best.type.name,
    subtitle: best.type.subtitle,
    slogan: best.type.slogan,
    desc: best.type.desc,
    keywords: best.type.keywords,
    similarity: best.sim,
    userVector: userVec,
    templateVector: best.type.vector,
    top3: top3.map((r) => ({ code: r.type.code, name: r.type.name, similarity: r.sim, translations: r.type.translations })),
    group: best.type.group,
    borderType,
    special: false,
    translations: best.type.translations,
  };
}
