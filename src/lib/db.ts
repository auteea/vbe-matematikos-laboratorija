import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { AnswerItem, ExampleTask, SolutionStep, Task, TaskPart, TaskSet } from "@/lib/types";

export type ExampleRow = Tables<"example_tasks">;

export async function isAdmin(): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
  return !!data;
}

function toSet(r: Tables<"task_sets">, tasks: Task[] = []): TaskSet {
  return {
    id: r.id, title: r.title, mode: r.mode as TaskSet["mode"], course: r.course as TaskSet["course"],
    examPart: (r.exam_part as TaskSet["examPart"]) ?? null, totalPoints: r.total_points, createdAt: r.created_at, tasks,
  };
}

function toTask(r: Tables<"tasks">): Task {
  const t: Task = {
    id: r.id, position: r.position, label: r.label, format: r.format as Task["format"], topic: r.topic, points: r.points,
    statement: r.statement, parts: (r.parts as unknown as TaskPart[]) ?? [], answer: (r.answer as unknown as AnswerItem[]) ?? [],
    solution: (r.solution as unknown as SolutionStep[]) ?? [], verified: r.verified, attempts: r.attempts,
  };
  if (Array.isArray(r.options)) t.options = r.options as string[];
  return t;
}

export async function listSets(): Promise<TaskSet[]> {
  const { data, error } = await supabase.from("task_sets").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data.map((r) => toSet(r));
}

export async function getSet(id: string): Promise<TaskSet | null> {
  const { data, error } = await supabase.from("task_sets").select("*, tasks(*)").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { tasks, ...set } = data;
  return toSet(set, tasks.map(toTask).sort((a, b) => a.position - b.position));
}

export async function renameSet(id: string, title: string) {
  const { error } = await supabase.from("task_sets").update({ title }).eq("id", id);
  if (error) throw error;
}

export async function deleteSet(id: string) {
  const { error } = await supabase.from("task_sets").delete().eq("id", id);
  if (error) throw error;
}

export async function listExamples(): Promise<ExampleRow[]> {
  const { data, error } = await supabase.from("example_tasks").select("*").order("ref", { ascending: true }).limit(1000);
  if (error) throw error;
  return data;
}

export type ExampleInput = ExampleTask & { ref: string | null };

export async function saveExample(id: string | null, e: ExampleInput) {
  const row = { ...e, parts: e.parts as never, answer: e.answer as never, solution: e.solution as never };
  const { error } = id
    ? await supabase.from("example_tasks").update(row).eq("id", id)
    : await supabase.from("example_tasks").insert(row);
  if (error) throw error;
}

export async function deleteExample(id: string) {
  const { error } = await supabase.from("example_tasks").delete().eq("id", id);
  if (error) throw error;
}
