// The whole generate-task flow for one slot, independent of where the models run.
// The backend only supplies `callTool` (one Lovable AI gateway call that returns the tool arguments).
import type { Course } from "@/config/topics";
import type { ExamPart } from "@/config/examTemplates";
import { compareAnswers } from "@/lib/answers";
import type { AnswerItem, ExampleTask } from "@/lib/types";
import type { Slot } from "./plan";
import {
  buildCreatorMessages,
  buildSolverMessages,
  SAVE_TASK_TOOL,
  SUBMIT_ANSWERS_TOOL,
  type ChatMessage,
} from "./prompts";
import { validateCreatedTask, type CreatedTask } from "./validate";

/** creator = Lovable AI default model; solver = a different, stronger reasoning model. */
export type ModelRole = "creator" | "solver";
export type GenerationTool = typeof SAVE_TASK_TOOL | typeof SUBMIT_ANSWERS_TOOL;
/** Calls the model with tool_choice forced to `tool` and returns the parsed tool arguments. */
export type CallTool = (
  role: ModelRole,
  messages: ChatMessage[],
  tool: GenerationTool,
) => Promise<unknown>;

export interface CheckedTask extends CreatedTask {
  verified: boolean;
  attempts: number;
  /** Why the last attempt failed, when verified is false. */
  problems: string[];
}

function solverAnswer(raw: unknown): AnswerItem[] {
  const list = typeof raw === "object" && raw !== null ? (raw as { answer?: unknown }).answer : [];
  if (!Array.isArray(list)) return [];
  return list.map((a) => ({
    type: (a as AnswerItem)?.type ?? "number",
    value: String((a as AnswerItem)?.value ?? ""),
  }));
}

/** The proof the solver must check, per proof item: the steps of that part (or all steps). */
export function proofsFor(task: CreatedTask): Record<number, string> {
  const out: Record<number, string> = {};
  task.answer.forEach((a, i) => {
    if (a.type !== "proof") return;
    const label = task.parts[i]?.label;
    const own = label
      ? task.solution.filter((s) => s.text.replace(/\*/g, "").trimStart().startsWith(`${label}.`))
      : [];
    out[i] = (own.length > 0 ? own : task.solution).map((s) => s.text).join("\n");
  });
  return out;
}

/**
 * Creator → validate → solver → compare. A failed validation or a different answer triggers
 * a new task (at most `maxRetries` times, default 2). After that the last valid task is
 * returned with verified = false.
 */
export async function generateCheckedTask(args: {
  slot: Slot;
  course: Course;
  examPart: ExamPart | null;
  examples: readonly ExampleTask[];
  avoid?: readonly string[];
  callTool: CallTool;
  maxRetries?: number;
}): Promise<CheckedTask> {
  const maxAttempts = 1 + (args.maxRetries ?? 2);
  let last: CreatedTask | null = null;
  let problems: string[] = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const raw = await args.callTool(
      "creator",
      buildCreatorMessages({
        slot: args.slot,
        course: args.course,
        examPart: args.examPart,
        examples: args.examples,
        avoid: args.avoid ?? [],
        feedback: problems,
      }),
      SAVE_TASK_TOOL,
    );
    const checked = validateCreatedTask(raw, args.slot);
    if (!checked.ok) {
      problems = checked.problems;
      continue;
    }
    const task = checked.task;
    last = task;
    const solved = await args.callTool(
      "solver",
      buildSolverMessages({
        statement: task.statement,
        options: task.options ?? null,
        parts: task.parts,
        expected: task.answer.map((a) => a.type),
        proofs: proofsFor(task),
      }),
      SUBMIT_ANSWERS_TOOL,
    );
    const result = compareAnswers(task.answer, solverAnswer(solved));
    if (result.ok) return { ...task, verified: true, attempts: attempt, problems: [] };
    problems = [
      `an independent solver got a different answer for item(s) ${result.mismatches
        .map((i) => i + 1)
        .join(", ")}; make sure the task and its answers are correct and unambiguous`,
    ];
  }
  if (!last) throw new Error(`Nepavyko sukurti tinkamo uždavinio: ${problems.join("; ")}`);
  return { ...last, verified: false, attempts: maxAttempts, problems };
}
