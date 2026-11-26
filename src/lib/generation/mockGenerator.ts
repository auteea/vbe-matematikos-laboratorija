// Stand-in for the generate-task backend until Lovable Cloud is connected.
// Builds tasks from the real VBE examples so every view can be tried; nothing here calls a model.
import type { ExampleTask, Task } from "@/lib/types";
import { shuffle, type Rng, type Slot } from "./plan";
import type { GenerateFn } from "./runner";

const DEMO_MCQ: Pick<Task, "topic" | "statement" | "options" | "answer">[] = [
  {
    topic: "Logaritmai",
    statement: "Apskaičiuokite $\\log_2 32$.",
    options: ["$4$", "$5$", "$16$", "$6$"],
    answer: [{ type: "choice", value: "B", display: "B" }],
  },
  {
    topic: "Šaknys",
    statement: "Kuris skaičius lygus $\\sqrt{50} - \\sqrt{8}$?",
    options: ["$\\sqrt{42}$", "$3\\sqrt{2}$", "$7\\sqrt{2}$", "$2\\sqrt{3}$"],
    answer: [{ type: "choice", value: "B", display: "B" }],
  },
  {
    topic: "Skaičių aibės",
    statement: "Kurie du skaičiai yra racionalieji?",
    options: ["$\\pi$", "$0{,}25$", "$\\sqrt{3}$", "$-\\frac{2}{7}$"],
    answer: [{ type: "choice", value: "B,D", display: "B ir D" }],
  },
];

function mockSolution(points: number, labels: string[]) {
  return Array.from({ length: Math.max(1, points) }, (_, i) => ({
    text: `${labels[i] ? `**${labels[i]}.** ` : ""}Pavyzdinis sprendimo žingsnis ${i + 1} (sugeneruos DI).`,
    points: 1,
  }));
}

/** Delay in ms is random between min and max so the progress counter can be seen moving. */
export function createMockGenerator(
  examples: readonly ExampleTask[],
  {
    course,
    minDelay = 250,
    maxDelay = 700,
    rng = Math.random,
  }: {
    course: "A" | "B";
    minDelay?: number;
    maxDelay?: number;
    rng?: Rng;
  },
): GenerateFn {
  let calls = 0;
  const used = new Set<ExampleTask>();
  return async (slot: Slot) => {
    calls++;
    await new Promise((r) => setTimeout(r, minDelay + rng() * (maxDelay - minDelay)));
    const base = {
      id: `${slot.key}-${calls}`,
      position: slot.position,
      label: slot.label,
      format: slot.format,
      topic: slot.topic,
      verified: calls % 7 !== 0,
      attempts: calls % 7 === 0 ? 3 : 1,
    };

    if (slot.format === "mcq") {
      const demo = DEMO_MCQ.filter((d) => (slot.points === 2) === d.answer[0]?.value.includes(","));
      const pick = shuffle(demo.length ? demo : DEMO_MCQ, rng)[0] ?? DEMO_MCQ[0]!;
      const points = slot.points ?? 1;
      return {
        ...base,
        points,
        statement: pick.statement,
        options: pick.options ?? [],
        parts: [],
        answer: pick.answer,
        solution: mockSolution(points, []),
      };
    }

    // Best match first: same topic, format and number of parts, not shown yet in this set.
    const wantParts = slot.parts && slot.parts.length > 1 ? slot.parts.length : 0;
    const score = (e: ExampleTask) =>
      (e.topic === slot.topic ? 8 : 0) +
      (e.format === slot.format ? 4 : 0) +
      (slot.format === "full" && e.parts.length === wantParts ? 2 : 0) +
      (e.course === course ? 1 : 0) -
      (used.has(e) ? 16 : 0);
    const ex = shuffle(examples, rng).sort((a, b) => score(b) - score(a))[0];
    if (ex) used.add(ex);
    const first = ex?.parts[0]?.statement;
    const statement =
      slot.format === "short" && ex && first
        ? `${ex.statement} ${first}`
        : (ex?.statement ?? "Pavyzdinis uždavinys.");
    const parts =
      slot.format === "full" && slot.parts && slot.parts.length > 1
        ? slot.parts.map((points, i) => ({
            label: `${slot.label}.${i + 1}`,
            statement: ex?.parts[i]?.statement ?? `Pavyzdinė ${i + 1} dalis.`,
            points,
          }))
        : slot.format === "full" && !slot.parts && ex
          ? ex.parts.map((p, i) => ({ ...p, label: `${slot.label}.${i + 1}` }))
          : [];
    const points =
      parts.length > 0 ? parts.reduce((n, p) => n + p.points, 0) : (slot.points ?? ex?.points ?? 2);
    const answerCount = parts.length || (slot.twoValues ? 2 : 1);
    return {
      ...base,
      points,
      statement,
      parts,
      answer: Array.from({ length: answerCount }, () => ({
        type: "number" as const,
        value: "",
        display: "Pavyzdinis atsakymas",
      })),
      solution: mockSolution(
        points,
        parts.map((p) => p.label),
      ),
    };
  };
}
