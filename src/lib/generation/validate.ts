// Structural checks on the creator's save_task output before the solver sees it.
import { ANSWER_TYPES, type AnswerItem, type SolutionStep, type TaskPart } from "@/lib/types";
import { expectedAnswerCount } from "./prompts";
import type { Slot } from "./plan";

export interface CreatedTask {
  statement: string;
  options?: string[];
  parts: TaskPart[];
  answer: AnswerItem[];
  solution: SolutionStep[];
  topic: string;
  points: number;
}

export type ValidationResult = { ok: true; task: CreatedTask } | { ok: false; problems: string[] };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const int = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : NaN);

/** Validates and normalises the raw tool arguments for one slot. */
export function validateCreatedTask(raw: unknown, slot: Slot): ValidationResult {
  const problems: string[] = [];
  if (!isObj(raw)) return { ok: false, problems: ["save_task arguments are not an object"] };

  const statement = str(raw["statement"]).trim();
  if (!statement) problems.push("statement is empty");

  const partsRaw = Array.isArray(raw["parts"]) ? raw["parts"] : [];
  // Labels are ours: renumber whatever the model wrote.
  const parts: TaskPart[] = partsRaw.map((p, i) => ({
    label: `${slot.label}.${i + 1}`,
    statement: isObj(p) ? str(p["statement"]).trim() : "",
    points: isObj(p) ? int(p["points"]) : NaN,
  }));
  if (parts.some((p) => !p.statement || !(p.points > 0)))
    problems.push("a part has no statement or points");

  const optionsRaw = Array.isArray(raw["options"]) ? raw["options"].map(str) : [];
  const options = optionsRaw.map((o) => o.trim()).filter(Boolean);

  const answer: AnswerItem[] = (Array.isArray(raw["answer"]) ? raw["answer"] : []).map((a) => {
    const item: AnswerItem = {
      type: (isObj(a) ? str(a["type"]) : "") as AnswerItem["type"],
      value: isObj(a) ? str(a["value"]).trim() : "",
    };
    const display = isObj(a) ? str(a["display"]).trim() : "";
    if (display) item.display = display;
    return item;
  });
  if (answer.some((a) => !ANSWER_TYPES.includes(a.type))) problems.push("unknown answer type");
  if (answer.some((a) => a.type !== "proof" && !a.value)) problems.push("an answer value is empty");

  const solution: SolutionStep[] = (Array.isArray(raw["solution"]) ? raw["solution"] : []).map(
    (s) => ({
      text: isObj(s) ? str(s["text"]).trim() : "",
      points: isObj(s) ? int(s["points"]) : NaN,
    }),
  );
  if (solution.length === 0 || solution.some((s) => !s.text || !(s.points >= 0))) {
    problems.push("the solution is missing or has a step without text or points");
  }

  const texts = [statement, ...parts.map((p) => p.statement), ...options];
  if (texts.some((t) => /paveiksl/i.test(t)))
    problems.push('the task refers to a figure ("paveiksl…")');

  // Format-specific structure.
  if (slot.format === "mcq") {
    if (options.length !== 4) problems.push("an mcq task needs exactly four options");
    if (parts.length > 0) problems.push("an mcq task has no parts");
    const letters = (answer[0]?.value.toUpperCase().match(/\b[A-D]\b/g) ?? []).length;
    if (answer.length !== 1 || answer[0]?.type !== "choice" || letters !== (slot.points ?? 1)) {
      problems.push(`an mcq task needs one choice answer with ${slot.points ?? 1} letter(s)`);
    }
  } else if (slot.format === "short") {
    if (parts.length > 0) problems.push("a short task has no parts");
  } else if (slot.parts && slot.parts.length > 1) {
    if (parts.length !== slot.parts.length) {
      problems.push(`expected ${slot.parts.length} parts, got ${parts.length}`);
    } else if (parts.some((p, i) => p.points !== slot.parts?.[i])) {
      problems.push(`part points must be ${slot.parts.join(", ")}`);
    }
  } else if (slot.parts?.length === 1 && parts.length > 0) {
    problems.push("this task has no parts");
  } else if (!slot.parts && parts.length > 3) {
    problems.push("use at most three parts");
  }

  const expected = expectedAnswerCount(slot, parts.length);
  if (answer.length !== expected)
    problems.push(`expected ${expected} answer item(s), got ${answer.length}`);

  const solutionPoints = solution.reduce((n, s) => n + (Number.isNaN(s.points) ? 0 : s.points), 0);
  const points =
    parts.length > 0 ? parts.reduce((n, p) => n + p.points, 0) : (slot.points ?? solutionPoints);
  if (slot.points !== null && points !== slot.points)
    problems.push(`the task must be worth ${slot.points} points`);
  if (slot.points === null && (points < 2 || points > 8))
    problems.push("a practice task is worth 2–8 points");
  if (slot.format === "full" && solutionPoints !== points) {
    problems.push(
      `marking scheme points (${solutionPoints}) must equal the task points (${points})`,
    );
  }

  if (problems.length > 0) return { ok: false, problems };
  const task: CreatedTask = {
    statement,
    parts,
    answer,
    solution,
    topic: str(raw["topic"]).trim() || slot.topic,
    points,
  };
  if (slot.format === "mcq") task.options = options;
  return { ok: true, task };
}
