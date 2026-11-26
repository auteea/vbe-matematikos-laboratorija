// Prompts and tool schemas for the two model calls of generate-task:
// the creator writes one task (save_task), the solver solves it blind (submit_answers).
// Pure data and string building: safe to import from server code.
import { COURSE_NAMES, TASK_KINDS, type Course } from "@/config/topics";
import type { ExamPart } from "@/config/examTemplates";
import { ANSWER_TYPES, type AnswerType, type ExampleTask, type TaskPart } from "@/lib/types";
import { shuffle, type Rng, type Slot } from "./plan";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export const CREATOR_SYSTEM_PROMPT = `You write mathematics tasks for the Lithuanian VBE (valstybinis brandos egzaminas) together with their marking schemes. Everything a student reads is in Lithuanian.

Style and difficulty
- Follow the wording and structure of real VBE papers and of the style examples: "Apskaičiuokite", "Nustatykite", "Išspręskite", "Raskite", "Pagrįskite", "Parodykite".
- Bendrasis kursas (B): standard tasks with clear steps. Išplėstinis kursas (A): more steps, proofs and less familiar contexts.
- Never copy an example: change the context, the numbers and the structure.

Notation (Markdown with LaTeX: $...$ inline, $$...$$ display)
- Decimal comma inside LaTeX is written as {,}: $0{,}5$.
- Semicolons in sets, intervals and coordinates: $\\{1; 3; 5\\}$, $[-5; 3)$, $A(2; 3)$.
- tg, lg, ln and logarithms with a base: $\\operatorname{tg} x$, $\\lg x$, $\\log_2 x$.
- Degrees with ° unless radians are needed: $30^\\circ$.

Content rules
- No images. Every task must be solvable from the text alone: describe figures, solids and diagrams in words. Never write "paveiksle" or "paveikslo".
- Prefer answers that can be checked automatically: numbers, finite sets, intervals. Give trigonometric equations an interval, e.g. $x \\in [0^\\circ; 360^\\circ)$.
- Answers are exact unless the task says how to round.

Structure
- Use exactly the format, part labels and points you are given. A part statement does not repeat its label.
- mcq: exactly four options, in A–D order, without the letters. A 1-point task has one correct option, a 2-point task has two.
- short: one final answer, or two values when two values are asked.
- full: the solution is a marking scheme like NŠA's vertinimo instrukcija. Steps earn points for choosing a correct strategy (formula, theorem or equation), for the key calculations and for the answer. The step points add up to the task's points. In structured tasks start each step with its part label in bold, e.g. "**11.1.** ...".

Answers for the automatic check
- One answer item per part. A task without parts has one item, or two items when two values are asked.
- type and value use plain ASCII math:
  number: "3/5", "0.6", "2*sqrt(13)", "1260*pi"
  set: "{210;330}" (numbers or labels separated by semicolons)
  interval: "[-5;3)", "(-inf;-3) U [2;inf)"
  choice: "B" or "B,D"
  expression: "b - a/3"
  proof: value "" (the proof itself goes into the solution)
- display: the same answer for students in Markdown + LaTeX, e.g. "$x = 0{,}6$".

Reply only by calling save_task.`;

export const SOLVER_SYSTEM_PROMPT = `You are an independent solver who checks Lithuanian VBE mathematics tasks. Solve the task carefully, step by step, before you answer. Use only the data in the statement.

Reply only by calling submit_answers with exactly the requested number of answer items, in the requested order and of the requested types, using plain ASCII math:
number "3/5", set "{210;330}", interval "[-5;3)" or "(-inf;-3) U [2;inf)", choice "B" or "B,D", expression "b - a/3".
For a proof item, read the proof you are given and set the value to "valid" if it is correct and complete, otherwise "invalid".
Give exact values unless the task says how to round; when it does, round exactly as asked.`;

const answerItemSchema = (withDisplay: boolean) => ({
  type: "object",
  additionalProperties: false,
  properties: {
    type: { type: "string", enum: [...ANSWER_TYPES] },
    value: { type: "string" },
    ...(withDisplay ? { display: { type: "string" } } : {}),
  },
  required: withDisplay ? ["type", "value", "display"] : ["type", "value"],
});

/** OpenAI-compatible tool for the creator call (Lovable AI gateway). */
export const SAVE_TASK_TOOL = {
  type: "function",
  function: {
    name: "save_task",
    description: "Save the new task, its answers and its marking scheme.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        statement: {
          type: "string",
          description:
            "Statement in Lithuanian, Markdown + LaTeX. For structured tasks the common stem.",
        },
        options: {
          type: "array",
          items: { type: "string" },
          description: "mcq only: exactly four options without letters.",
        },
        parts: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              label: { type: "string" },
              statement: { type: "string" },
              points: { type: "integer" },
            },
            required: ["label", "statement", "points"],
          },
        },
        answer: { type: "array", items: answerItemSchema(true) },
        solution: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: { text: { type: "string" }, points: { type: "integer" } },
            required: ["text", "points"],
          },
        },
        topic: { type: "string" },
      },
      required: ["statement", "parts", "answer", "solution", "topic"],
    },
  },
} as const;

/** OpenAI-compatible tool for the solver call. */
export const SUBMIT_ANSWERS_TOOL = {
  type: "function",
  function: {
    name: "submit_answers",
    description: "Submit the final answers, one item per requested answer.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: { answer: { type: "array", items: answerItemSchema(false) } },
      required: ["answer"],
    },
  },
} as const;

/** How many answer items a slot needs, given the number of parts the task ended up with. */
export function expectedAnswerCount(slot: Slot, partsCount: number): number {
  if (partsCount > 0) return partsCount;
  return slot.format === "short" && slot.twoValues ? 2 : 1;
}

/** Up to `max` style examples: same course, topic and format first, then the same topic. */
export function selectExamples(
  examples: readonly ExampleTask[],
  slot: Slot,
  course: Course,
  max = 3,
  rng: Rng = Math.random,
): ExampleTask[] {
  const sameTopic = examples.filter((e) => e.topic === slot.topic);
  const tiers = [
    sameTopic.filter((e) => e.course === course && e.format === slot.format),
    sameTopic.filter((e) => e.course === course && e.format !== slot.format),
    sameTopic.filter((e) => e.course !== course),
  ];
  return tiers.flatMap((t) => shuffle(t, rng)).slice(0, max);
}

function formatLine(slot: Slot): string {
  const l = slot.label;
  if (slot.format === "mcq") {
    return slot.points === 2
      ? "mcq – 2 points, four options, exactly two correct"
      : "mcq – 1 point, four options, exactly one correct";
  }
  if (slot.format === "short") {
    return slot.twoValues
      ? "short – 2 points, the student finds two values (one point each)"
      : "short – 1 point, one final answer";
  }
  if (slot.parts && slot.parts.length > 1) {
    const labels = slot.parts.map((_, i) => `${l}.${i + 1}`).join(", ");
    const total = slot.parts.reduce((a, b) => a + b, 0);
    return `full – ${slot.parts.length} parts labelled ${labels}, worth ${slot.parts.join(", ")} points (${total} in total)`;
  }
  if (slot.parts && slot.parts.length === 1) {
    return `full – no parts, ${slot.parts[0]} points in total`;
  }
  return `full – choose the structure: no parts or 2–3 parts labelled ${l}.1, ${l}.2 …, 2–8 points in total`;
}

function exampleText(e: ExampleTask, i: number): string {
  const parts = e.parts.map((p) => `${p.label}. ${p.statement} (${p.points} t.)`).join("\n");
  return `Example ${i + 1} (${e.source}; ${e.points} t.)\n${e.statement}${parts ? `\n${parts}` : ""}`;
}

/** Messages for the creator call. `avoid` lists statements already in the same set. */
export function buildCreatorMessages(args: {
  slot: Slot;
  course: Course;
  examPart: ExamPart | null;
  examples: readonly ExampleTask[];
  avoid?: readonly string[];
  /** Problems with the previous attempt, so the model can fix them. */
  feedback?: readonly string[];
}): ChatMessage[] {
  const { slot, course, examPart, examples, avoid = [], feedback = [] } = args;
  const kind = TASK_KINDS.find((k) => k.id === slot.kind)?.name ?? "Mišrus";
  const lines = [
    "Write one new task with these settings:",
    `- Course: ${course} (${COURSE_NAMES[course].toLowerCase()})`,
    `- Paper: ${examPart ? `VBE ${examPart} dalis, mock exam` : "Teminis rinkinys, practice set"}`,
    `- Task number: ${slot.label}`,
    `- Topic: ${slot.topic}`,
    `- Format: ${formatLine(slot)}`,
    `- Kind: ${kind}`,
  ];
  if (slot.hint) lines.push(`- Extra requirement: ${slot.hint}`);
  if (examples.length > 0) {
    lines.push("", "Style examples (real VBE tasks; imitate the style, never copy):");
    examples.forEach((e, i) => lines.push("", exampleText(e, i)));
  }
  if (avoid.length > 0) {
    lines.push("", "Do not repeat these tasks from the same set:");
    avoid.forEach((s) => lines.push(`- ${s.slice(0, 160)}`));
  }
  if (feedback.length > 0) {
    lines.push(
      "",
      "Your previous attempt was rejected. Write a different task and avoid these problems:",
    );
    feedback.forEach((p) => lines.push(`- ${p}`));
  }
  return [
    { role: "system", content: CREATOR_SYSTEM_PROMPT },
    { role: "user", content: lines.join("\n") },
  ];
}

/** Messages for the solver call. Only the statement goes in, never the creator's answers. */
export function buildSolverMessages(args: {
  statement: string;
  options?: readonly string[] | null;
  parts: readonly TaskPart[];
  expected: readonly AnswerType[];
  /** For each proof item (by index), the proof to check. */
  proofs?: Readonly<Record<number, string>>;
}): ChatMessage[] {
  const { statement, options, parts, expected, proofs = {} } = args;
  const lines = ["Task:", statement];
  if (options && options.length > 0) {
    lines.push("", "Options:", ...options.map((o, i) => `${"ABCD"[i] ?? "?"}) ${o}`));
  }
  if (parts.length > 0) {
    lines.push("", "Parts:", ...parts.map((p) => `${p.label}. ${p.statement} (${p.points} t.)`));
  }
  lines.push(
    "",
    `Return ${expected.length} answer item(s) in this order: ${expected
      .map((t, i) => `${i + 1}) ${t}`)
      .join(", ")}.`,
  );
  Object.entries(proofs).forEach(([i, proof]) =>
    lines.push("", `Proof to check for item ${Number(i) + 1}:`, proof),
  );
  return [
    { role: "system", content: SOLVER_SYSTEM_PROMPT },
    { role: "user", content: lines.join("\n") },
  ];
}
