import type { Course } from "@/config/topics";
import type { ExamPart, TaskFormat } from "@/config/examTemplates";

export interface TaskPart { label: string; statement: string; points: number }
export interface SolutionStep { text: string; points: number }

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
  answer: string[];
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
