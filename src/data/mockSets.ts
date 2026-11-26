// Mock data for step 1 (no backend yet). Built from the attached real VBE examples.
import examples from "./exampleTasks.json";
import type { Task, TaskSet } from "@/lib/types";
import type { TaskFormat } from "@/config/examTemplates";

export interface ExampleTask {
  course: "A" | "B";
  exam_part: "I" | "II";
  topic: string;
  format: TaskFormat;
  points: number;
  statement: string;
  parts: { label: string; statement: string; points: number }[];
  answer: unknown[];
  solution: unknown[];
  source: string;
}
export const EXAMPLE_TASKS = examples as ExampleTask[];

const mockSolution = (pts: number) =>
  Array.from({ length: Math.max(1, pts) }, (_, i) => ({
    text: `${i + 1} žingsnis: pavyzdinis sprendimo žingsnis (bus sugeneruotas DI).`,
    points: 1,
  }));

function toTask(e: ExampleTask, i: number, verified = true): Task {
  const num = parseInt(e.parts[0]?.label ?? "", 10) || i + 1;
  return {
    id: `t${i}`,
    position: i,
    label: String(num),
    format: e.format,
    topic: e.topic,
    points: e.points,
    statement: e.statement,
    parts: e.parts,
    answer: e.parts.length ? e.parts.map((p) => `${p.label}. Atsakymas`) : ["Pavyzdinis atsakymas"],
    solution: mockSolution(e.points),
    verified,
    attempts: 1,
  };
}

const bII = EXAMPLE_TASKS.filter((e) => e.course === "B" && e.exam_part === "II");
const aII = EXAMPLE_TASKS.filter((e) => e.course === "A" && e.exam_part === "II");

const mcq: Task[] = [
  {
    id: "m1", position: 0, label: "1", format: "mcq", topic: "Logaritmai", points: 1,
    statement: "Apskaičiuokite $\\log_2 32$.", options: ["$4$", "$5$", "$16$", "$6$"],
    parts: [], answer: ["B"], solution: [{ text: "$2^5 = 32$, todėl $\\log_2 32 = 5$.", points: 1 }],
    verified: true, attempts: 1,
  },
  {
    id: "m2", position: 1, label: "2", format: "mcq", topic: "Šaknys", points: 1,
    statement: "Kuris skaičius lygus $\\sqrt{50} - \\sqrt{8}$?",
    options: ["$\\sqrt{42}$", "$3\\sqrt{2}$", "$7\\sqrt{2}$", "$2\\sqrt{3}$"],
    parts: [], answer: ["B"], solution: [{ text: "$5\\sqrt{2} - 2\\sqrt{2} = 3\\sqrt{2}$.", points: 1 }],
    verified: false, attempts: 2,
  },
  {
    id: "m3", position: 2, label: "3", format: "short", topic: "Progresijos", points: 2,
    statement:
      "Aritmetinės progresijos $a_1 = 3$, $d = 4$. Raskite $a_{10}$ ir $S_{10}$.\n\n| $n$ | 1 | 2 | 3 |\n|---|---|---|---|\n| $a_n$ | 3 | 7 | 11 |",
    parts: [], answer: ["$a_{10} = 39$, $S_{10} = 210$"],
    solution: [
      { text: "$a_{10} = 3 + 9\\cdot 4 = 39$", points: 1 },
      { text: "$S_{10} = \\frac{3 + 39}{2}\\cdot 10 = 210$", points: 1 },
    ],
    verified: true, attempts: 1,
  },
];

export const MOCK_SETS: TaskSet[] = [
  {
    id: "demo-b-ii",
    title: "Bandomasis egzaminas B, II dalis",
    mode: "mock", course: "B", examPart: "II",
    totalPoints: bII.reduce((s, e) => s + e.points, 0),
    createdAt: "2026-11-24T10:15:00Z",
    tasks: bII.map((e, i) => toTask(e, i, i !== 3)),
  },
  {
    id: "demo-a-ii",
    title: "Bandomasis egzaminas A, II dalis",
    mode: "mock", course: "A", examPart: "II",
    totalPoints: aII.reduce((s, e) => s + e.points, 0),
    createdAt: "2026-11-22T16:40:00Z",
    tasks: aII.map((e, i) => toTask(e, i)),
  },
  {
    id: "demo-topic",
    title: "Logaritmai ir progresijos",
    mode: "topic", course: "B", examPart: null,
    totalPoints: mcq.reduce((s, t) => s + t.points, 0),
    createdAt: "2026-11-20T08:05:00Z",
    tasks: mcq,
  },
];

export const getMockSet = (id: string) => MOCK_SETS.find((s) => s.id === id);
export const exampleToTask = toTask;
