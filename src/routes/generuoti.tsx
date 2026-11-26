import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { areasForCourse, COURSE_NAMES, DAILY_TASK_LIMIT, MAX_TASKS_PER_SET, TASK_KINDS, type Course, type TaskKind } from "@/config/topics";
import { getTemplate, templateSlotCount, type ExamPart } from "@/config/examTemplates";
import { ExamSheet } from "@/components/exam/ExamSheet";
import { EXAMPLE_TASKS } from "@/data/mockSets";
import { createMockGenerator } from "@/lib/generation/mockGenerator";
import { planMockExam, planTopicSet, type Slot } from "@/lib/generation/plan";
import { runGeneration, type GenerateFn } from "@/lib/generation/runner";
import type { Task, TaskSet } from "@/lib/types";

export const Route = createFileRoute("/generuoti")({
  head: () => ({ meta: [ { title: "Generuoti uždavinius – VBE uždavinių generatorius" }, { name: "description", content: "Teminiai rinkiniai ir bandomieji VBE matematikos egzaminai." }, { property: "og:title", content: "Generuoti uždavinius – VBE uždavinių generatorius" }, { property: "og:description", content: "Teminiai rinkiniai ir bandomieji VBE matematikos egzaminai." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" } ] }),
  component: Generate,
});

const USED_TODAY = 23; // mock

function Seg<T extends string>({ value, options, onChange }: { value: T; options: { id: T; name: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap">
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)}
          className={(value === o.id ? "btn-primary" : "btn-secondary") + " -ml-px first:ml-0"}>{o.name}</button>
      ))}
    </div>
  );
}

function Generate() {
  const [tab, setTab] = useState<"topic" | "mock">("topic");
  const [course, setCourse] = useState<Course>("B");
  const [part, setPart] = useState<ExamPart>("II");
  const [kind, setKind] = useState<TaskKind>("mixed");
  const [count, setCount] = useState(5);
  const [topics, setTopics] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [preview, setPreview] = useState<TaskSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const slotsRef = useRef<Slot[]>([]);
  const generatorRef = useRef<GenerateFn | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const areas = areasForCourse(course);
  const remaining = DAILY_TASK_LIMIT - USED_TODAY;
  const total = tab === "topic" ? count : templateSlotCount(getTemplate(course, part));
  const toggle = (name: string) => setTopics((s) => { const n = new Set(s); n.has(name) ? n.delete(name) : n.add(name); return n; });
  const toggleArea = (names: string[]) => setTopics((s) => {
    const n = new Set(s); const all = names.every((x) => n.has(x)); names.forEach((x) => all ? n.delete(x) : n.add(x)); return n;
  });

  /** Puts a task in its place on the sheet (new or regenerated). */
  const upsert = (task: Task) =>
    setPreview((p) => {
      if (!p) return p;
      const tasks = [...p.tasks.filter((t) => t.label !== task.label), task].sort(
        (a, b) => a.position - b.position,
      );
      return { ...p, tasks, totalPoints: tasks.reduce((n, t) => n + t.points, 0) };
    });

  async function start() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    let slots: Slot[];
    try {
      slots =
        tab === "topic"
          ? planTopicSet({ course, topics: [...topics], kind, count })
          : planMockExam(course, part);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return;
    }
    slotsRef.current = slots;
    // Until Lovable Cloud is connected, tasks come from the mock generator (no model calls).
    const generate = createMockGenerator(EXAMPLE_TASKS, { course });
    generatorRef.current = generate;
    const chosen = [...topics];
    setPreview({
      id: "preview",
      title:
        tab === "mock"
          ? `Bandomasis egzaminas ${course}, ${part} dalis`
          : `Teminis rinkinys: ${chosen.slice(0, 3).join(", ")}${chosen.length > 3 ? " …" : ""}`,
      mode: tab,
      course,
      examPart: tab === "mock" ? part : null,
      totalPoints: 0,
      createdAt: new Date().toISOString(),
      tasks: [],
    });
    setProgress({ done: 0, total: slots.length });
    const { failed } = await runGeneration(slots, generate, {
      signal: controller.signal,
      onTask: upsert,
      onProgress: (done, total) => setProgress({ done, total }),
    });
    if (failed > 0 && !controller.signal.aborted) {
      setError(`Nepavyko sugeneruoti ${failed} uždavinių. Pabandykite dar kartą.`);
    }
  }

  async function regenerate(task: Task) {
    const slot = slotsRef.current.find((s) => s.label === task.label);
    const generate = generatorRef.current;
    if (!slot || !generate) return;
    try {
      upsert(await generate(slot));
    } catch {
      setError(`Nepavyko iš naujo sugeneruoti ${task.label} uždavinio.`);
    }
  }

  const busy = !!progress && progress.done < progress.total;

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <div className="mb-6 flex border-b border-foreground">
        {([["topic", "Teminis rinkinys"], ["mock", "Bandomasis egzaminas"]] as const).map(([id, name]) => (
          <button key={id} onClick={() => setTab(id)}
            className={"-mb-px border border-b-0 px-4 py-2 text-sm font-bold " + (tab === id ? "border-foreground bg-background" : "border-transparent text-muted-foreground")}>{name}</button>
        ))}
      </div>

      <div className="space-y-6">
        <div><div className="exam-label mb-2">Kursas</div>
          <Seg value={course} onChange={(c) => { setCourse(c); setTopics(new Set()); }} options={[{ id: "B", name: COURSE_NAMES.B }, { id: "A", name: COURSE_NAMES.A }]} /></div>

        {tab === "topic" ? (
          <>
            <div>
              <div className="exam-label mb-2">Temos</div>
              <div className="grid gap-4 sm:grid-cols-2">
                {areas.map((a) => {
                  const names = a.topics.map((t) => t.name);
                  return (
                    <fieldset key={a.id} className="border border-foreground p-3">
                      <legend className="px-1 text-sm font-bold">{a.grade} kl. · {a.name}</legend>
                      <button type="button" className="mb-2 text-xs font-bold underline" onClick={() => toggleArea(names)}>Pažymėti visą sritį</button>
                      {a.topics.map((t) => (
                        <label key={t.id} className="flex items-center gap-2 py-0.5 text-sm">
                          <input type="checkbox" className="size-4 accent-foreground" checked={topics.has(t.name)} onChange={() => toggle(t.name)} />
                          {t.name}{t.advancedOnly && <span className="text-muted-foreground"> (A)</span>}
                        </label>
                      ))}
                    </fieldset>
                  );
                })}
              </div>
            </div>
            <div><div className="exam-label mb-2">Pobūdis</div>
              <Seg value={kind} onChange={setKind} options={TASK_KINDS.map((k) => ({ id: k.id, name: k.name }))} /></div>
            <label className="block max-w-32"><span className="exam-label">Kiekis (1–{MAX_TASKS_PER_SET})</span>
              <input type="number" min={1} max={MAX_TASKS_PER_SET} value={count} className="exam-input mt-1"
                onChange={(e) => setCount(Math.max(1, Math.min(MAX_TASKS_PER_SET, Number(e.target.value) || 1)))} /></label>
          </>
        ) : (
          <div><div className="exam-label mb-2">Dalis</div>
            <Seg value={part} onChange={setPart} options={[{ id: "I", name: "I dalis (40 taškų, 120 min.)" }, { id: "II", name: "II dalis (60 taškų, 240 min.)" }]} /></div>
        )}

        <div className="flex flex-wrap items-center gap-4 border-t border-rule pt-4">
          <button className="btn-primary !px-8" disabled={busy || (tab === "topic" && topics.size === 0) || remaining < total} onClick={start}>Generuoti</button>
          <span className="text-sm text-muted-foreground">Šiandien liko {remaining} iš {DAILY_TASK_LIMIT} uždavinių.</span>
          {progress && <span className="text-sm font-bold">{busy ? `Generuojama ${progress.done} / ${progress.total}` : "Sugeneruota"}</span>}
          {progress && !busy && <Link to="/rinkinys/$id" params={{ id: "demo-b-ii" }} className="btn-secondary">Atidaryti pavyzdinį rinkinį</Link>}
        </div>
        {remaining < total && <p className="border border-foreground p-3 text-sm">Šiandienos limitas beveik išnaudotas. Rytoj vėl galėsite generuoti naujų uždavinių.</p>}
        {error && <p className="border border-foreground p-3 text-sm font-bold">{error}</p>}
      </div>

      {preview && (
        <div className="-mx-4 mt-8 sm:mx-0">
          <ExamSheet set={preview} onRegenerate={regenerate} />
        </div>
      )}
    </div>
  );
}
