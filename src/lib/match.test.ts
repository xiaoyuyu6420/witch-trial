import { describe, it, expect } from "vitest";
import { parseVector, formatVector, scoreToTier, weightedManhattan, similarity, match } from "./match";
import { DIMENSIONS } from "@/data/quiz-content";

describe("parseVector", () => {
  it("parses LHH-LLM-HHH-LLL correctly", () => {
    expect(parseVector("LHH-LLM-HHH-LLL")).toEqual([0, 2, 2, 0, 0, 1, 2, 2, 2, 0, 0, 0]);
  });

  it("parses all-L vector", () => {
    expect(parseVector("LLL-LLL-LLL-LLL")).toEqual(Array(12).fill(0));
  });

  it("parses all-X vector", () => {
    expect(parseVector("XXX-XXX-XXX-XXX")).toEqual(Array(12).fill(3));
  });

  it("defaults unknown char to 1 (M)", () => {
    expect(parseVector("ZZZ-ZZZ-ZZZ-ZZZ")).toEqual(Array(12).fill(1));
  });
});

describe("formatVector", () => {
  it("formats [0,2,2,0,0,1,2,2,2,0,0,0] as LHH-LLM-HHH-LLL", () => {
    expect(formatVector([0, 2, 2, 0, 0, 1, 2, 2, 2, 0, 0, 0])).toBe("LHH-LLM-HHH-LLL");
  });

  it("is inverse of parseVector", () => {
    const v = "MHM-LMH-HHH-LHH";
    expect(formatVector(parseVector(v))).toBe(v);
  });
});

describe("scoreToTier", () => {
  it("maps score 0-2 to L (0)", () => {
    expect(scoreToTier(0)).toBe(0);
    expect(scoreToTier(2)).toBe(0);
  });

  it("maps score 3-4 to M (1)", () => {
    expect(scoreToTier(3)).toBe(1);
    expect(scoreToTier(4)).toBe(1);
  });

  it("maps score 5 to H (2)", () => {
    expect(scoreToTier(5)).toBe(2);
  });

  it("maps score 6 to X (3)", () => {
    expect(scoreToTier(6)).toBe(3);
  });

  it("maps very high score to X (3)", () => {
    expect(scoreToTier(100)).toBe(3);
  });
});

describe("weightedManhattan", () => {
  it("returns 0 for identical vectors", () => {
    const v = [0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2];
    expect(weightedManhattan(v, v)).toBe(0);
  });

  it("returns positive for different vectors", () => {
    const a = Array(12).fill(0);
    const b = Array(12).fill(3);
    expect(weightedManhattan(a, b)).toBeGreaterThan(0);
  });

  it("is symmetric", () => {
    const a = [0, 2, 1, 3, 0, 2, 1, 0, 3, 2, 1, 0];
    const b = [1, 0, 3, 2, 1, 0, 2, 1, 0, 3, 2, 1];
    expect(weightedManhattan(a, b)).toBeCloseTo(weightedManhattan(b, a));
  });
});

describe("similarity", () => {
  it("returns 100 for identical vectors", () => {
    const v = [1, 2, 0, 3, 1, 2, 0, 1, 2, 3, 0, 1];
    const dist = weightedManhattan(v, v);
    expect(similarity(dist)).toBe(100);
  });

  it("returns 0 for maximally different vectors", () => {
    const a = Array(12).fill(0);
    const b = Array(12).fill(3);
    const dist = weightedManhattan(a, b);
    expect(similarity(dist)).toBe(0);
  });

  it("returns value between 0 and 100", () => {
    const a = [1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0];
    const b = [0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2];
    const sim = similarity(weightedManhattan(a, b));
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThanOrEqual(100);
  });
});

const makeTypes = () => [
  { code: "EMMA", name: "樱羽艾玛", subtitle: null, group: "B", vector: "LHH-LLM-HHH-LLL", slogan: "s", desc: "d", keywords: null, special: false, translations: "{}" },
  { code: "SHERRY", name: "橘雪莉", subtitle: null, group: "B", vector: "MHM-LMH-HHH-LHH", slogan: "s", desc: "d", keywords: null, special: false, translations: "{}" },
  { code: "HIRO", name: "二阶堂希罗", subtitle: null, group: "F", vector: "HLL-HMH-LHH-HHM", slogan: "s", desc: "d", keywords: null, special: false, translations: "{}" },
  { code: "UNSET", name: "未定之魂", subtitle: null, group: "fallback", vector: "MMM-MMM-MMM-MMM", slogan: "s", desc: "d", keywords: null, special: false, translations: "{}" },
  { code: "YUKI", name: "月代雪", subtitle: "大魔女", group: "special", vector: "HHH-LLL-LLL-LLL", slogan: "s", desc: "d", keywords: null, special: true, translations: "{}" },
  { code: "ETL", name: "不灭雪华", subtitle: "梅露露真身", group: "special", vector: "LLL-HHH-HHH-HHH", slogan: "s", desc: "d", keywords: null, special: true, translations: "{}" },
];

describe("match", () => {
  it("returns a result with valid structure", () => {
    const dimScores: Record<string, number> = {};
    DIMENSIONS.forEach((d) => { dimScores[d.code] = 3; });
    const result = match({ dimScores }, makeTypes());
    expect(result.code).toBeTruthy();
    expect(result.similarity).toBeGreaterThanOrEqual(0);
    expect(result.similarity).toBeLessThanOrEqual(100);
    expect(result.userVector).toBeTruthy();
    expect(result.top3).toHaveLength(3);
  });

  it("triggers special type with destroy gate + triggerFired", () => {
    const dimScores: Record<string, number> = {};
    DIMENSIONS.forEach((d) => { dimScores[d.code] = 3; });
    const result = match({ dimScores, gateValue: "destroy", triggerFired: "YUKI" }, makeTypes());
    expect(result.special).toBe(true);
    expect(result.code).toBe("YUKI");
    expect(result.similarity).toBe(100);
  });

  it("resolves seeded SPECIAL_A trigger aliases through the gate branch", () => {
    const dimScores: Record<string, number> = {};
    DIMENSIONS.forEach((d) => { dimScores[d.code] = 3; });

    const destroyResult = match({ dimScores, gateValue: "destroy", triggerFired: "SPECIAL_A" }, makeTypes());
    const endureResult = match({ dimScores, gateValue: "endure", triggerFired: "SPECIAL_A" }, makeTypes());

    expect(destroyResult.special).toBe(true);
    expect(destroyResult.code).toBe("YUKI");
    expect(endureResult.special).toBe(true);
    expect(endureResult.code).toBe("ETL");
  });

  it("does not trigger special without gateValue", () => {
    const dimScores: Record<string, number> = {};
    DIMENSIONS.forEach((d) => { dimScores[d.code] = 3; });
    const result = match({ dimScores, triggerFired: "YUKI" }, makeTypes());
    expect(result.special).toBe(false);
  });

  it("returns fallback for ambiguous low-similarity results", () => {
    const dimScores: Record<string, number> = {};
    DIMENSIONS.forEach((d) => { dimScores[d.code] = 3; });
    const types = makeTypes();
    const result = match({ dimScores }, types);
    expect(result.code).toBeTruthy();
  });

  it("applies gate normal bonus to S2", () => {
    const dimScores: Record<string, number> = {};
    DIMENSIONS.forEach((d) => { dimScores[d.code] = 3; });
    const resultNormal = match({ dimScores, gateValue: "normal" }, makeTypes());
    const resultDefault = match({ dimScores }, makeTypes());
    expect(resultNormal.userVector).toBeTruthy();
    expect(resultDefault.userVector).toBeTruthy();
  });
});
