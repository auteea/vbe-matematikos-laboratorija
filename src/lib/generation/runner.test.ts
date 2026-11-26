import { describe, expect, it } from "vitest";
import examples from "@/data/exampleTasks.json";
import type { ExampleTask, Task } from "@/lib/types";
import { createMockGenerator } from "./mockGenerator";
import { planMockExam, seededRng, type Slot } from "./plan";
import { runGeneration } from "./runner";

describe("runGeneration", () => {
  it("runs at most 3 calls at a time and delivers every task", async () => {
    const slots = planMockExam("B", "II", seededRng(1));
    let running = 0;
    let peak = 0;
    const got: Task[] = [];
    const progress: number[] = [];
    const result = await runGeneration(
      slots,
      async (slot: Slot) => {
        running++;
        peak = Math.max(peak, running);
        await new Promise((r) => setTimeout(r, 5));
        running--;
        return { id: slot.key, position: slot.position, label: slot.label } as Task;
      },
      { onTask: (t) => got.push(t), onProgress: (d) => progress.push(d) },
    );
    expect(peak).toBeLessThanOrEqual(3);
    expect(result).toEqual({ done: 18, failed: 0 });
    expect(got.map((t) => t.label).sort()).toEqual(slots.map((s) => s.label).sort());
    expect(progress.at(-1)).toBe(18);
  });

  it("keeps going when one call fails", async () => {
    const slots = planMockExam("A", "II", seededRng(2)).slice(0, 5);
    const errors: string[] = [];
    const result = await runGeneration(
      slots,
      async (slot) => {
        if (slot.label === "3") throw new Error("boom");
        return { id: slot.key } as Task;
      },
      { onError: (_, s) => errors.push(s.label) },
    );
    expect(result).toEqual({ done: 5, failed: 1 });
    expect(errors).toEqual(["3"]);
  });
});

describe("createMockGenerator", () => {
  it("fills mock-exam slots with the template's numbers, parts and points", async () => {
    const gen = createMockGenerator(examples as ExampleTask[], {
      course: "B",
      minDelay: 0,
      maxDelay: 0,
      rng: seededRng(4),
    });
    const slots = planMockExam("B", "II", seededRng(4));
    const tasks = await Promise.all(slots.map((s) => gen(s)));
    expect(tasks.reduce((n, t) => n + t.points, 0)).toBe(60);
    const t11 = tasks.find((t) => t.label === "11");
    expect(t11?.parts.map((p) => [p.label, p.points])).toEqual([
      ["11.1", 2],
      ["11.2", 2],
      ["11.3", 3],
      ["11.4", 3],
    ]);
    expect(t11?.answer).toHaveLength(4);
  });
});
