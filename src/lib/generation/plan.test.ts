import { describe, expect, it } from "vitest";
import { areasForCourse, TOPIC_AREAS } from "@/config/topics";
import { getTemplate } from "@/config/examTemplates";
import { planMockExam, planTopicSet, seededRng } from "./plan";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const topicsOf = (course: "A" | "B", grades: number[]) =>
  areasForCourse(course)
    .filter((a) => grades.includes(a.grade))
    .flatMap((a) => a.topics.map((t) => t.name));
const areaOf = (name: string) => TOPIC_AREAS.find((a) => a.topics.some((t) => t.name === name))?.id;

describe("planMockExam – I dalis", () => {
  for (const course of ["B", "A"] as const) {
    it(`${course}: 30 tasks, 40 points, every 11 kl. topic, ~40/60 split (20 seeds)`, () => {
      for (let seed = 1; seed <= 20; seed++) {
        const slots = planMockExam(course, "I", seededRng(seed));
        expect(slots).toHaveLength(30);
        expect(sum(slots.map((s) => s.points ?? 0))).toBe(40);
        const used = new Set(slots.map((s) => s.topic));
        for (const t of topicsOf(course, [11])) expect(used.has(t)).toBe(true);
        expect([...used].every((t) => topicsOf(course, [11]).includes(t))).toBe(true);
        const skaiciai = sum(
          slots.filter((s) => areaOf(s.topic) === "11-skaiciai").map((s) => s.points ?? 0),
        );
        expect(skaiciai).toBeGreaterThanOrEqual(14);
        expect(skaiciai).toBeLessThanOrEqual(18);
      }
    });
  }
  it("B never gets the A-only Vektoriai", () => {
    const slots = planMockExam("B", "I", seededRng(3));
    expect(slots.some((s) => s.topic === "Vektoriai")).toBe(false);
  });
});

describe("planMockExam – II dalis", () => {
  it("B: 18 tasks, 60 points, tasks 1–10 on ten different topics in curriculum order", () => {
    const slots = planMockExam("B", "II", seededRng(7));
    expect(slots).toHaveLength(18);
    expect(sum(slots.map((s) => s.points ?? 0))).toBe(60);
    const first = slots.slice(0, 10).map((s) => s.topic);
    expect(new Set(first).size).toBe(10);
    const order = topicsOf("B", [11, 12]);
    expect(first.map((t) => order.indexOf(t))).toEqual(
      [...first.map((t) => order.indexOf(t))].sort((a, b) => a - b),
    );
    expect(first.every((t) => order.includes(t))).toBe(true);
  });
  it("A: fixed topics and part points come from the template", () => {
    const slots = planMockExam("A", "II", seededRng(1));
    const tpl = getTemplate("A", "II");
    const fixed = tpl.sections[1]?.slots ?? [];
    expect(slots.slice(10).map((s) => [s.label, s.topic, s.parts])).toEqual(
      fixed.map((s) => [String(s.number), s.topic, s.parts]),
    );
    expect(slots[13]?.hint).toBe(fixed[3]?.hint ?? null);
  });
});

describe("planTopicSet", () => {
  it("spreads the chosen topics and numbers the tasks 1..n", () => {
    const slots = planTopicSet(
      { course: "B", topics: ["Logaritmai", "Progresijos"], kind: "text", count: 5 },
      seededRng(2),
    );
    expect(slots.map((s) => s.label)).toEqual(["1", "2", "3", "4", "5"]);
    const counts = slots.reduce<Record<string, number>>(
      (m, s) => ({ ...m, [s.topic]: (m[s.topic] ?? 0) + 1 }),
      {},
    );
    expect(Object.values(counts).sort()).toEqual([2, 3]);
    expect(slots.every((s) => s.format === "full" && s.points === null && s.kind === "text")).toBe(
      true,
    );
  });
  it("drops topics the course does not have", () => {
    expect(() =>
      planTopicSet({ course: "B", topics: ["Vektoriai"], kind: "mixed", count: 2 }),
    ).toThrow();
  });
});
