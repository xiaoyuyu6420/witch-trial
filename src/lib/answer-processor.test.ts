import { describe, it, expect } from "vitest";
import { processAnswers } from "./answer-processor";

function makeOption(overrides: Partial<{
  id: number;
  questionId: number;
  score: number | null;
  value: string | null;
  trigger: string | null;
  dim: string;
  type: string;
}> = {}) {
  return {
    id: overrides.id ?? 1,
    questionId: overrides.questionId ?? 1,
    score: overrides.score ?? 1,
    value: overrides.value ?? null,
    trigger: overrides.trigger ?? null,
    question: {
      id: overrides.questionId ?? 1,
      dim: overrides.dim ?? "S1",
      type: overrides.type ?? "normal",
    },
  };
}

describe("processAnswers", () => {
  it("accumulates dim scores from normal questions", () => {
    const options = [
      makeOption({ id: 1, questionId: 1, score: 2, dim: "S1" }),
      makeOption({ id: 2, questionId: 2, score: 3, dim: "S1" }),
      makeOption({ id: 3, questionId: 3, score: 1, dim: "F2" }),
    ];
    const result = processAnswers(
      [
        { questionId: 1, optionId: 1 },
        { questionId: 2, optionId: 2 },
        { questionId: 3, optionId: 3 },
      ],
      options,
    );
    expect(result.dimScores.S1).toBe(5);
    expect(result.dimScores.F2).toBe(1);
    expect(result.validAnswers).toHaveLength(3);
  });

  it("extracts gateValue from gate question", () => {
    const options = [
      makeOption({ id: 10, questionId: 100, value: "destroy", dim: "GATE", type: "gate" }),
    ];
    const result = processAnswers(
      [{ questionId: 100, optionId: 10 }],
      options,
    );
    expect(result.gateValue).toBe("destroy");
    expect(result.dimScores).toEqual({});
  });

  it("extracts triggerFired from trigger question", () => {
    const options = [
      makeOption({ id: 20, questionId: 200, trigger: "YUKI", dim: "TRIGGER", type: "trigger" }),
    ];
    const result = processAnswers(
      [{ questionId: 200, optionId: 20 }],
      options,
    );
    expect(result.triggerFired).toBe("YUKI");
  });

  it("skips invalid optionId", () => {
    const options = [makeOption({ id: 1, questionId: 1 })];
    const result = processAnswers(
      [{ questionId: 1, optionId: 999 }],
      options,
    );
    expect(result.validAnswers).toHaveLength(0);
  });

  it("skips answer where optionId doesn't match questionId", () => {
    const options = [
      makeOption({ id: 1, questionId: 1 }),
      makeOption({ id: 2, questionId: 2 }),
    ];
    const result = processAnswers(
      [{ questionId: 1, optionId: 2 }],
      options,
    );
    expect(result.validAnswers).toHaveLength(0);
  });

  it("handles empty answers array", () => {
    const result = processAnswers([], []);
    expect(result.dimScores).toEqual({});
    expect(result.validAnswers).toHaveLength(0);
    expect(result.gateValue).toBeUndefined();
    expect(result.triggerFired).toBeUndefined();
  });

  it("accepts all valid gate values", () => {
    for (const val of ["destroy", "endure", "normal", "normal_alt"] as const) {
      const options = [
        makeOption({ id: 1, questionId: 1, value: val, dim: "GATE", type: "gate" }),
      ];
      const result = processAnswers([{ questionId: 1, optionId: 1 }], options);
      expect(result.gateValue).toBe(val);
    }
  });
});
