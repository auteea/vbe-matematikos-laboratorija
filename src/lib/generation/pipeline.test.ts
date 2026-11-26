import { describe, expect, it } from "vitest";
import examples from "@/data/exampleTasks.json";
import type { ExampleTask } from "@/lib/types";
import type { Slot } from "./plan";
import { generateCheckedTask, proofsFor, type CallTool } from "./pipeline";
import { buildCreatorMessages, buildSolverMessages, selectExamples } from "./prompts";
import { validateCreatedTask } from "./validate";

const EXAMPLES = examples as ExampleTask[];

const slot: Slot = {
  key: "s11",
  label: "11",
  position: 10,
  section: 1,
  format: "full",
  points: 5,
  parts: [2, 3],
  twoValues: false,
  topic: "Lygtys",
  hint: null,
  kind: "mixed",
};

const goodTask = {
  statement: "Išspręskite lygtis:",
  parts: [
    { label: "x", statement: "$2x = 6$", points: 2 },
    { label: "y", statement: "$2\\sin x + 1 = 0$, kai $x \\in (0^\\circ; 360^\\circ)$", points: 3 },
  ],
  answer: [
    { type: "number", value: "3", display: "$x = 3$" },
    { type: "set", value: "{210;330}", display: "$x \\in \\{210^\\circ; 330^\\circ\\}$" },
  ],
  solution: [
    { text: "**11.1.** $x = 6 : 2$", points: 1 },
    { text: "$x = 3$", points: 1 },
    { text: "**11.2.** $\\sin x = -\\frac{1}{2}$", points: 1 },
    { text: "$x = 210^\\circ$ arba $x = 330^\\circ$", points: 2 },
  ],
  topic: "Lygtys",
};

function fakeCall(solverAnswers: string[][], creator: unknown = goodTask) {
  let solverCalls = 0;
  const calls: string[] = [];
  const call: CallTool = async (role) => {
    calls.push(role);
    if (role === "creator") return creator;
    const values = solverAnswers[Math.min(solverCalls++, solverAnswers.length - 1)] ?? [];
    return { answer: values.map((value, i) => ({ type: i === 0 ? "number" : "set", value })) };
  };
  return { call, calls };
}

describe("validateCreatedTask", () => {
  it("accepts a correct task and renumbers part labels", () => {
    const r = validateCreatedTask(goodTask, slot);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.task.parts.map((p) => p.label)).toEqual(["11.1", "11.2"]);
      expect(r.task.points).toBe(5);
    }
  });
  it("rejects wrong points, figures and missing answers", () => {
    const bad = {
      ...goodTask,
      statement: "Paveiksle pavaizduota…",
      answer: goodTask.answer.slice(0, 1),
    };
    const r = validateCreatedTask(bad, { ...slot, parts: [3, 2] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problems.join(" ")).toMatch(/paveiksl|points|answer item/);
  });
  it("checks mcq letters against the points", () => {
    const mcq: Slot = { ...slot, format: "mcq", points: 2, parts: null };
    const task = {
      statement: "Kurie skaičiai racionalieji?",
      options: ["$1$", "$\\pi$", "$0{,}5$", "$\\sqrt{2}$"],
      parts: [],
      answer: [{ type: "choice", value: "A,C", display: "A ir C" }],
      solution: [{ text: "$1$ ir $0{,}5$ – racionalieji.", points: 2 }],
      topic: "Skaičių aibės",
    };
    expect(validateCreatedTask(task, mcq).ok).toBe(true);
    expect(
      validateCreatedTask({ ...task, answer: [{ type: "choice", value: "A", display: "A" }] }, mcq)
        .ok,
    ).toBe(false);
  });
});

describe("prompts", () => {
  it("picks style examples of the same course and topic first", () => {
    const picked = selectExamples(EXAMPLES, slot, "B", 3, () => 0.3);
    expect(picked.length).toBeGreaterThan(0);
    expect(picked.every((e) => e.topic === "Lygtys")).toBe(true);
    expect(picked[0]?.course).toBe("B");
  });
  it("puts the slot settings, examples and feedback into the creator message", () => {
    const [system, user] = buildCreatorMessages({
      slot,
      course: "B",
      examPart: "II",
      examples: EXAMPLES.slice(0, 1),
      feedback: ["expected 2 parts"],
    });
    expect(system?.content).toMatch(/save_task/);
    expect(user?.content).toMatch(/11\.1, 11\.2/);
    expect(user?.content).toMatch(/Lygtys/);
    expect(user?.content).toMatch(/Example 1/);
    expect(user?.content).toMatch(/expected 2 parts/);
  });
  it("never shows the solver the creator's answers", () => {
    const [, user] = buildSolverMessages({
      statement: goodTask.statement,
      parts: goodTask.parts.map((p, i) => ({ ...p, label: `11.${i + 1}` })),
      expected: ["number", "set"],
    });
    expect(user?.content).not.toMatch(/210|330/);
    expect(user?.content).toMatch(/1\) number, 2\) set/);
  });
  it("hands the solver only the proof steps of a proof part", () => {
    const r = validateCreatedTask(
      {
        ...goodTask,
        answer: [goodTask.answer[0], { type: "proof", value: "", display: "Įrodyta" }],
      },
      slot,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(proofsFor(r.task)[1]).toBe("**11.2.** $\\sin x = -\\frac{1}{2}$");
  });
});

describe("generateCheckedTask", () => {
  it("verifies on the first try when the solver agrees", async () => {
    const { call, calls } = fakeCall([["3", "{330;210}"]]);
    const t = await generateCheckedTask({
      slot,
      course: "B",
      examPart: "II",
      examples: [],
      callTool: call,
    });
    expect(t.verified).toBe(true);
    expect(t.attempts).toBe(1);
    expect(calls).toEqual(["creator", "solver"]);
  });
  it("regenerates after a mismatch", async () => {
    const { call } = fakeCall([
      ["4", "{330;210}"],
      ["3", "{210;330}"],
    ]);
    const t = await generateCheckedTask({
      slot,
      course: "B",
      examPart: "II",
      examples: [],
      callTool: call,
    });
    expect(t).toMatchObject({ verified: true, attempts: 2 });
  });
  it("gives up after two retries and returns the task unverified", async () => {
    const { call, calls } = fakeCall([["4", "{1}"]]);
    const t = await generateCheckedTask({
      slot,
      course: "B",
      examPart: "II",
      examples: [],
      callTool: call,
    });
    expect(t).toMatchObject({ verified: false, attempts: 3 });
    expect(calls).toHaveLength(6);
  });
  it("throws when the creator never produces a valid task", async () => {
    const { call } = fakeCall([["3"]], { statement: "" });
    await expect(
      generateCheckedTask({ slot, course: "B", examPart: "II", examples: [], callTool: call }),
    ).rejects.toThrow();
  });
});
