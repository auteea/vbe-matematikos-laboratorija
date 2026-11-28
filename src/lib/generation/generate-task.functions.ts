import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";
import { DAILY_TASK_LIMIT, MAX_TASKS_PER_SET } from "@/config/topics";
import type { ExampleTask, TaskSet } from "@/lib/types";
import { toTask } from "@/lib/db";
import { selectExamples } from "./prompts";
import { generateCheckedTask } from "./pipeline";
import { callGenerationTool } from "./gateway.server";
import { assertGenerationAccess, assertSlotCourse, dailyBounds, generationInputSchema, slotSchema } from "./access";

async function countToday(supabase: SupabaseClient<Database>, userId: string) {
  const { from, to } = dailyBounds();
  const { count, error } = await supabase.from("tasks")
    .select("id, task_sets!inner(user_id, created_at)", { count: "exact", head: true })
    .eq("task_sets.user_id", userId).gte("task_sets.created_at", from).lt("task_sets.created_at", to);
  if (error) throw new Error("Nepavyko patikrinti dienos limito.");
  return count ?? 0;
}
export const getDailyUsage = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const used = await countToday(context.supabase, context.userId);
  return { used, remaining: Math.max(0, DAILY_TASK_LIMIT - used) };
});

const setInputSchema = z.object({
  title: z.string().trim().min(1).max(300), mode: z.enum(["topic", "mock"]), course: z.enum(["B", "A"]),
  examPart: z.enum(["I", "II"]).nullable(),
  settings: z.object({ topics: z.array(z.string()).max(100), kind: z.enum(["calc", "text", "mixed"]), count: z.number().int().min(1).max(100), slots: z.array(slotSchema).min(1).max(100) }),
});
export const createGenerationSet = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof setInputSchema>) => setInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<TaskSet> => {
    const used = await countToday(context.supabase, context.userId);
    if (data.settings.slots.length > DAILY_TASK_LIMIT - used) throw new Error("Šiandien nepakanka likusių uždavinių šiam rinkiniui.");
    if (data.mode === "topic" && data.settings.slots.length > MAX_TASKS_PER_SET) throw new Error("Viršytas rinkinio uždavinių kiekis.");
    if ((data.mode === "mock") !== (data.examPart !== null)) throw new Error("Neteisinga egzamino dalis.");
    data.settings.slots.forEach((s) => assertSlotCourse(s, data.course));
    const { data: row, error } = await context.supabase.from("task_sets").insert({
      user_id: context.userId, title: data.title, mode: data.mode, course: data.course, exam_part: data.examPart,
      settings: data.settings, total_points: 0,
    }).select("id, title, mode, course, exam_part, total_points, created_at").single();
    if (error) throw new Error("Nepavyko išsaugoti naujo rinkinio.");
    return { id: row.id, title: row.title, mode: data.mode, course: data.course, examPart: data.examPart, totalPoints: row.total_points, createdAt: row.created_at, tasks: [] };
  });

export const generateTask = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof generationInputSchema>) => generationInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: set, error } = await context.supabase.from("task_sets").select("user_id, course, exam_part, settings").eq("id", data.setId).eq("user_id", context.userId).maybeSingle();
    if (error) throw new Error("Nepavyko patikrinti rinkinio.");
    assertGenerationAccess(context.userId, set, await countToday(context.supabase, context.userId));
    if (!set) throw new Error("Rinkinys nerastas.");
    if (set.course !== data.course || set.exam_part !== data.examPart) throw new Error("Rinkinio nustatymai nesutampa.");
    assertSlotCourse(data.slot, data.course);
    const settings = setInputSchema.shape.settings.parse(set.settings);
    const planned = settings.slots.find((s) => s.position === data.slot.position);
    if (!planned || JSON.stringify(planned) !== JSON.stringify(data.slot)) throw new Error("Uždavinys nepriklauso šio rinkinio planui.");
    // Auth + ownership have already been verified; examples are intentionally admin-only for browser clients.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error: examplesError } = await supabaseAdmin.from("example_tasks")
      .select("course, exam_part, topic, format, points, statement, parts, answer, solution, source").eq("topic", data.slot.topic).order("id").limit(1000);
    if (examplesError) throw new Error("Nepavyko įkelti pavyzdžių.");
    const examples: ExampleTask[] = rows.map((r) => ({
      course: z.enum(["B", "A"]).parse(r.course), exam_part: z.enum(["I", "II"]).parse(r.exam_part),
      topic: r.topic, format: z.enum(["mcq", "short", "full"]).parse(r.format), points: r.points, statement: r.statement,
      parts: z.array(z.object({ label: z.string(), statement: z.string(), points: z.number() })).parse(r.parts),
      answer: z.array(z.unknown()).parse(r.answer), solution: z.array(z.unknown()).parse(r.solution), source: r.source,
    }));
    const task = await generateCheckedTask({ slot: data.slot, course: data.course, examPart: data.examPart,
      examples: selectExamples(examples, data.slot, data.course), avoid: data.avoid, callTool: callGenerationTool });
    const payload: Json = JSON.parse(JSON.stringify({ ...task, format: data.slot.format }));
    const { data: saved, error: saveError } = await supabaseAdmin.rpc("save_generated_task", {
      p_user_id: context.userId, p_set_id: data.setId, p_position: data.slot.position, p_label: data.slot.label, p_task: payload,
    });
    if (saveError) {
      if (saveError.message.includes("100 uždavinių")) throw new Error("Pasiektas 100 uždavinių dienos limitas.");
      console.error("Generated task save failed", { code: saveError.code });
      throw new Error("Nepavyko išsaugoti uždavinio.");
    }
    return toTask(saved);
  });
