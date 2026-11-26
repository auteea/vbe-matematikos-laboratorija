// Client-side queue: runs one generator call per slot, at most 3 at a time,
// and hands each task over as soon as it arrives (spec: "up to 3 calls in parallel").
import type { Task } from "@/lib/types";
import type { Slot } from "./plan";

/** Generates one task for a slot. Today: the mock generator; with Cloud: the generate-task call. */
export type GenerateFn = (slot: Slot, signal?: AbortSignal) => Promise<Task>;

export interface RunOptions {
  concurrency?: number;
  signal?: AbortSignal;
  onTask?: (task: Task, slot: Slot) => void;
  onError?: (error: unknown, slot: Slot) => void;
  onProgress?: (done: number, total: number) => void;
}

export async function runGeneration(
  slots: readonly Slot[],
  generate: GenerateFn,
  { concurrency = 3, signal, onTask, onError, onProgress }: RunOptions = {},
): Promise<{ done: number; failed: number }> {
  let next = 0;
  let done = 0;
  let failed = 0;
  const worker = async () => {
    while (next < slots.length && !signal?.aborted) {
      const slot = slots[next++] as Slot;
      try {
        const task = await generate(slot, signal);
        if (!signal?.aborted) onTask?.(task, slot);
      } catch (error) {
        failed++;
        if (!signal?.aborted) onError?.(error, slot);
      } finally {
        done++;
        if (!signal?.aborted) onProgress?.(done, slots.length);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, slots.length) }, worker));
  return { done, failed };
}
