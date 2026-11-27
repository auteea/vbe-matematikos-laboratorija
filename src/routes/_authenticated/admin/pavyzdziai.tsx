import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { exampleToTask } from "@/data/mockSets";
import { SheetFrame } from "@/components/exam/ExamSheet";
import { TaskBlock } from "@/components/exam/TaskBlock";
import { COURSE_NAMES } from "@/config/topics";
import { deleteExample, isAdmin, listExamples, saveExample, type ExampleInput, type ExampleRow } from "@/lib/db";
import type { ExampleTask } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/pavyzdziai")({
  head: () => ({ meta: [ { title: "Pavyzdžiai – VBE uždavinių generatorius" }, { name: "description", content: "Pavyzdinių VBE uždavinių valdymas." }, { property: "og:title", content: "Pavyzdžiai – VBE uždavinių generatorius" }, { property: "og:description", content: "Pavyzdinių VBE uždavinių valdymas." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" } ] }),
  beforeLoad: async () => { if (!(await isAdmin())) throw redirect({ to: "/generuoti" }); },
  component: Examples,
});

const blank: ExampleInput = { ref: null, course: "B", exam_part: "II", topic: "", format: "short", points: 1, statement: "", parts: [], answer: [], solution: [], source: "" };

function fromRow(r: ExampleRow): ExampleInput {
  return {
    ref: r.ref, course: r.course as ExampleTask["course"], exam_part: r.exam_part as ExampleTask["exam_part"], topic: r.topic,
    format: r.format as ExampleTask["format"], points: r.points, statement: r.statement, parts: r.parts as unknown as ExampleTask["parts"],
    answer: r.answer as unknown[], solution: r.solution as unknown[], source: r.source,
  };
}

function Examples() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ["examples"], queryFn: listExamples });
  const [edit, setEdit] = useState<{ id: string | null; t: ExampleInput } | null>(null);
  const set = (k: keyof ExampleInput, v: string | number) => setEdit((e) => e && { ...e, t: { ...e.t, [k]: v } });
  const refresh = () => qc.invalidateQueries({ queryKey: ["examples"] });
  const save = useMutation({
    mutationFn: (e: { id: string | null; t: ExampleInput }) => saveExample(e.id, { ...e.t, ref: e.t.ref?.trim() || null }),
    onSuccess: () => { refresh(); setEdit(null); toast.success("Išsaugota"); },
    onError: (e) => toast.error(`Nepavyko išsaugoti: ${e.message}`),
  });
  const remove = useMutation({ mutationFn: deleteExample, onSuccess: refresh, onError: () => toast.error("Nepavyko ištrinti") });
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold">Pavyzdiniai uždaviniai ({items.length})</h1>
        <button className="btn-primary" onClick={() => setEdit({ id: null, t: blank })}>Pridėti</button>
      </div>
      {edit && (
        <div className="mb-8 grid gap-6 border border-foreground p-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <label><span className="exam-label">Kursas</span><select className="exam-input mt-1" value={edit.t.course} onChange={(e) => set("course", e.target.value)}><option>B</option><option>A</option></select></label>
              <label><span className="exam-label">Dalis</span><select className="exam-input mt-1" value={edit.t.exam_part} onChange={(e) => set("exam_part", e.target.value)}><option>I</option><option>II</option></select></label>
              <label><span className="exam-label">Formatas</span><select className="exam-input mt-1" value={edit.t.format} onChange={(e) => set("format", e.target.value)}><option value="mcq">mcq</option><option value="short">short</option><option value="full">full</option></select></label>
              <label><span className="exam-label">Taškai</span><input type="number" className="exam-input mt-1" value={edit.t.points} onChange={(e) => set("points", Number(e.target.value))} /></label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label className="col-span-2 block"><span className="exam-label">Tema</span><input className="exam-input mt-1" value={edit.t.topic} onChange={(e) => set("topic", e.target.value)} /></label>
              <label className="block"><span className="exam-label">Nr.</span><input className="exam-input mt-1" value={edit.t.ref ?? ""} onChange={(e) => set("ref", e.target.value)} placeholder="ex-58" /></label>
            </div>
            <label className="block"><span className="exam-label">Sąlyga (Markdown + LaTeX)</span><textarea rows={8} className="exam-input mt-1 font-mono" value={edit.t.statement} onChange={(e) => set("statement", e.target.value)} /></label>
            <label className="block"><span className="exam-label">Šaltinis</span><input className="exam-input mt-1" value={edit.t.source} onChange={(e) => set("source", e.target.value)} /></label>
            <div className="flex gap-2">
              <button className="btn-primary" disabled={save.isPending} onClick={() => save.mutate(edit)}>Išsaugoti</button>
              <button className="btn-secondary" onClick={() => setEdit(null)}>Atšaukti</button>
            </div>
          </div>
          <SheetFrame title="Peržiūra" right={COURSE_NAMES[edit.t.course]}>
            <TaskBlock task={exampleToTask(edit.t, 0)} interactive={false} />
          </SheetFrame>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead><tr className="double-rule text-left">{["Nr.", "Kursas", "Dalis", "Tema", "Formatas", "Taškai", ""].map((h) => <th key={h} className="exam-label p-2">{h}</th>)}</tr></thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-b border-rule">
                <td className="p-2 font-mono text-xs">{r.ref}</td>
                <td className="p-2">{r.course}</td><td className="p-2">{r.exam_part}</td><td className="p-2">{r.topic}</td>
                <td className="p-2">{r.format}</td><td className="p-2">{r.points}</td>
                <td className="whitespace-nowrap p-2 text-right">
                  <button className="btn-secondary !px-2 !py-1 !text-xs" onClick={() => setEdit({ id: r.id, t: fromRow(r) })}>Redaguoti</button>{" "}
                  <button className="btn-secondary !px-2 !py-1 !text-xs" onClick={() => confirm("Ištrinti?") && remove.mutate(r.id)}>Ištrinti</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
