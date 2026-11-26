import type { Course } from "@/config/topics";
import type { ExamPart, TaskFormat } from "@/config/examTemplates";

export interface TaskPart {
  label: string;
  statement: string;
  points: number;
}
export interface SolutionStep {
  text: string;
  points: number;
}

/**
 * Machine-checkable answer, one per part (or one per value for a short task without parts).
 * value: plain ASCII math, e.g. "3/5", "{210;330}", "[-5;3)", "B,D", "b - a/3";
 *        for proofs the solver sends "valid" or "invalid".
 * display: the same answer in Markdown + LaTeX for students, e.g. "$x = 0{,}6$".
 */
export type AnswerType = "number" | "set" | "interval" | "choice" | "expression" | "proof";
export const ANSWER_TYPES: readonly AnswerType[] = [
  "number",
  "set",
  "interval",
  "choice",
  "expression",
  "proof",
];
export interface AnswerItem {
  type: AnswerType;
  value: string;
  display?: string;
}

export interface Task {
  id: string;
  position: number;
  label: string;
  format: TaskFormat;
  topic: string;
  points: number;
  statement: string;
  options?: string[];
  parts: TaskPart[];
  answer: AnswerItem[];
  solution: SolutionStep[];
  verified: boolean;
  attempts: number;
}

export interface TaskSet {
  id: string;
  title: string;
  mode: "topic" | "mock";
  course: Course;
  examPart: ExamPart | null;
  totalPoints: number;
  createdAt: string;
  tasks: Task[];
}

/** Row shape of example_tasks and of src/data/exampleTasks.json. */
export interface ExampleTask {
  course: Course;
  exam_part: ExamPart;
  topic: string;
  format: TaskFormat;
  points: number;
  statement: string;
  parts: TaskPart[];
  answer: unknown[];
  solution: unknown[];
  source: string;
}
