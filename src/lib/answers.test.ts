import { describe, expect, it } from "vitest";
import {
  answersEqual,
  compareAnswers,
  evaluateNumber,
  latexToAscii,
  normalizeMath,
  parseIntervals,
} from "./answers";

describe("normalizeMath", () => {
  it("handles Lithuanian notation and Unicode", () => {
    expect(normalizeMath("0,6")).toBe("0.6");
    expect(normalizeMath("10 612,08")).toBe("10612.08");
    expect(normalizeMath("−3 · π")).toBe("-3 * pi");
    expect(normalizeMath("x = 5")).toBe("5");
    expect(normalizeMath("210°")).toBe("210");
  });
  it("turns LaTeX into ASCII math", () => {
    expect(evaluateNumber(latexToAscii("\\frac{3}{5}"))).toBeCloseTo(0.6);
    expect(evaluateNumber("2\\sqrt{13}")).toBeCloseTo(2 * Math.sqrt(13));
    expect(evaluateNumber("0{,}6")).toBeCloseTo(0.6);
    expect(evaluateNumber("\\sqrt[3]{125}")).toBeCloseTo(5);
    expect(evaluateNumber("log_2(32)")).toBeCloseTo(5);
    expect(evaluateNumber("lg 1000")).toBeCloseTo(3);
  });
});

describe("answersEqual", () => {
  it("numbers", () => {
    expect(answersEqual("number", "3/5", "0,6")).toBe(true);
    expect(answersEqual("number", "10612,08", "10612.08")).toBe(true);
    expect(answersEqual("number", "2*sqrt(13)", "sqrt(52)")).toBe(true);
    expect(answersEqual("number", "1260*pi", "1260π")).toBe(true);
    expect(answersEqual("number", "-1", "1")).toBe(false);
    expect(answersEqual("number", "sqrt(-4)", "0")).toBe(false);
  });
  it("expressions with variables", () => {
    expect(answersEqual("expression", "-1/3*a + b", "b - a/3")).toBe(true);
    expect(answersEqual("expression", "x^2 - 1", "(x-1)(x+1)")).toBe(true);
    expect(answersEqual("expression", "a + b", "a - b")).toBe(false);
    expect(answersEqual("expression", "6i - 4j", "-4j + 6i")).toBe(true);
  });
  it("sets compare as multisets", () => {
    expect(answersEqual("set", "{210;330}", "{330; 210}")).toBe(true);
    expect(answersEqual("set", "{210;330}", "{210}")).toBe(false);
    expect(answersEqual("set", "{0,5; 1}", "{1; 1/2}")).toBe(true);
    expect(answersEqual("set", "{AB; AD; A_1B_1; A_1D_1}", "{A1D1; AD; A1B1; AB}")).toBe(true);
    expect(answersEqual("set", "∅", "{}")).toBe(true);
  });
  it("intervals and unions", () => {
    expect(answersEqual("interval", "[-5;3)", "[−5; 3)")).toBe(true);
    expect(answersEqual("interval", "[-5;3)", "[-5;3]")).toBe(false);
    expect(answersEqual("interval", "(-inf;-3) U [2;+inf)", "[2; ∞) ∪ (−∞; −3)")).toBe(true);
    expect(answersEqual("interval", "x ∈ [-7; +inf)", "[-7;inf)")).toBe(true);
    expect(answersEqual("interval", "x >= -7", "[-7; Infinity)")).toBe(true);
    expect(parseIntervals("(-inf; 2]")[0]).toMatchObject({ loClosed: false, hiClosed: true });
  });
  it("choices and proofs", () => {
    expect(answersEqual("choice", "B,D", "D, B")).toBe(true);
    expect(answersEqual("choice", "B", "B,D")).toBe(false);
    expect(answersEqual("choice", "B ir D", "teisingi B ir D")).toBe(true);
    expect(answersEqual("proof", "", "valid")).toBe(true);
    expect(answersEqual("proof", "", "invalid")).toBe(false);
  });
  it("returns false instead of throwing on garbage", () => {
    expect(answersEqual("number", "abc(", "1")).toBe(false);
    expect(answersEqual("interval", "nope", "[1;2]")).toBe(false);
  });
});

describe("compareAnswers", () => {
  it("compares item by item and reports mismatches", () => {
    const expected = [
      { type: "number" as const, value: "10" },
      { type: "set" as const, value: "{210;330}" },
    ];
    expect(
      compareAnswers(expected, [
        { type: "number", value: "10,0" },
        { type: "set", value: "{330;210}" },
      ]),
    ).toEqual({ ok: true, mismatches: [] });
    expect(
      compareAnswers(expected, [
        { type: "number", value: "11" },
        { type: "set", value: "{330;210}" },
      ]),
    ).toEqual({ ok: false, mismatches: [0] });
  });
  it("fails when the solver sends a different number of answers", () => {
    expect(compareAnswers([{ type: "number", value: "1" }], []).ok).toBe(false);
  });
});
