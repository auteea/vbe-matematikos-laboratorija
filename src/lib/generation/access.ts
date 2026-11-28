import { z } from "zod";
import { DAILY_TASK_LIMIT, areasForCourse } from "@/config/topics";
import type { Slot } from "./plan";
import type { Course } from "@/config/topics";

export const slotSchema = z.object({
  key: z.string().min(1).max(80), label: z.string().min(1).max(40),
  position: z.number().int().min(0).max(99), section: z.number().int().min(0).max(20),
  format: z.enum(["mcq", "short", "full"]), points: z.number().int().min(1).max(20).nullable(),
  parts: z.array(z.number().int().min(1).max(20)).max(10).nullable(),
  twoValues: z.boolean(), topic: z.string().min(1).max(200),
  hint: z.string().max(2000).nullable(), kind: z.enum(["calc", "text", "mixed"]),
});
export const generationInputSchema = z.object({
  setId: z.uuid(), slot: slotSchema, course: z.enum(["B", "A"]),
  examPart: z.enum(["I", "II"]).nullable(), avoid: z.array(z.string().max(10000)).max(100),
});
export type GenerationInput = z.infer<typeof generationInputSchema>;

export function assertGenerationAccess(userId: string, set: { user_id: string; course: string; exam_part: string | null } | null, used: number) {
  if (!userId || !set || set.user_id !== userId) throw new Error("Rinkinys nerastas arba nepriklauso jums.");
  if (used >= DAILY_TASK_LIMIT) throw new Error(`Pasiektas ${DAILY_TASK_LIMIT} uždavinių dienos limitas.`);
}
export function assertSlotCourse(slot: Slot, course: Course) {
  if (!areasForCourse(course).some((a) => a.topics.some((t) => t.name === slot.topic))) {
    throw new Error("Pasirinkta tema nepriklauso šiam kursui.");
  }
}

/** Local calendar boundaries; no browser timezone or rolling 24-hour approximation. */
export function dailyBounds(now = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Vilnius", year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = fmt.formatToParts(now);
  const n = (key: string) => Number(parts.find((p) => p.type === key)?.value);
  const midnight = Date.UTC(n("year"), n("month") - 1, n("day"));
  function localMidnight(utc: number) {
    let result = utc;
    for (let i = 0; i < 3; i++) {
      const local = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Vilnius", timeZoneName: "shortOffset" }).formatToParts(new Date(result));
      const offset = local.find((p) => p.type === "timeZoneName")?.value.match(/GMT([+-])(\d+)(?::(\d+))?/);
      const minutes = offset ? (offset[1] === "-" ? -1 : 1) * (Number(offset[2]) * 60 + Number(offset[3] ?? 0)) : 0;
      result = utc - minutes * 60000;
    }
    return new Date(result).toISOString();
  }
  return { from: localMidnight(midnight), to: localMidnight(midnight + 86400000) };
}
