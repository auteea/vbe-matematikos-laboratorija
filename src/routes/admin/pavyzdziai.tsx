import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { EXAMPLE_TASKS, exampleToTask, type ExampleTask } from "@/data/mockSets";
import { SheetFrame } from "@/components/exam/ExamSheet";
import { TaskBlock } from "@/components/exam/TaskBlock";
import { COURSE_NAMES } from "@/config/topics";

export const Route = createFileRoute("/admin/pavyzdziai")({
  head: () => ({ meta: [ { title: "Pavyzdžiai – VBE uždavinių generatorius" }, { name: "description", content: "Pavyzdinių VBE uždavinių valdymas." }, { property: "og:title", content: "Pavyzdžiai – VBE uždavinių generatorius" }, { property: "og:description", content: "Pavyzdinių VBE uždavinių valdymas." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" } ] }),
  component: Examples,
});

const blank: ExampleTask = { course: "B", exam_part: "II", topic: "", format: "short", points: 1, statement: "", parts: [], answer: [], solution: [], source: "" };

function Examples() {
  const [items, setItems] = useState(EXAMPLE_TASKS);
  const [edit, setEdit] = useState<{ i: number; t: ExampleTask } | null>(null);
  const set = (k: keyof ExampleTask, v: string | number) => setEdit((e) => e && { ...e, t: { ...e.t, [k]: v } });
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold">Pavyzdiniai uždaviniai ({items.length})</h1>
        <button className="btn-primary" onClick={() => setEdit({ i: -1, t: blank })}>Pridėti</button>
      </div>
      {edit && (
        <div className="mb-8 grid gap-6 border border-foreground p-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <label><span className="exam-label">Kursas</span><select className="exam-input mt-1" value={edit.t.course} onChange={(e) => set("course", e.target.value)}><option>B</option><option>A</option></select></label>
              <label><span className="exam-label">Formatas</span><select className="exam-input mt-1" value={edit.t.format} onChange={(e) => set("format", e.target.value)}><option value="mcq">mcq</option><option value="short">short</option><option value="full">full</option></select></label>
              <label><span className="exam-label">Taškai</span><input type="number" className="exam-input mt-1" value={edit.t.points} onChange={(e) => set("points", Number(e.target.value))} /></label>
            </div>
            <label className="block"><span className="exam-label">Tema</span><input className="exam-input mt-1" value={edit.t.topic} onChange={(e) => set("topic", e.target.value)} /></label>
            <label className="block"><span className="exam-label">Sąlyga (Markdown + LaTeX)</span><textarea rows={8} className="exam-input mt-1 font-mono" value={edit.t.statement} onChange={(e) => set("statement", e.target.value)} /></label>
            <label className="block"><span className="exam-label">Šaltinis</span><input className="exam-input mt-1" value={edit.t.source} onChange={(e) => set("source", e.target.value)} /></label>
            <div className="flex gap-2">
              <button className="btn-primary" onClick={() => { setItems((x) => edit.i < 0 ? [edit.t, ...x] : x.map((y, j) => j === edit.i ? edit.t : y)); setEdit(null); }}>Išsaugoti</button>
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
          <thead><tr className="double-rule text-left">{["Kursas", "Dalis", "Tema", "Formatas", "Taškai", ""].map((h) => <th key={h} className="exam-label p-2">{h}</th>)}</tr></thead>
          <tbody>
            {items.map((t, i) => (
              <tr key={i} className="border-b border-rule">
                <td className="p-2">{t.course}</td><td className="p-2">{t.exam_part}</td><td className="p-2">{t.topic}</td>
                <td className="p-2">{t.format}</td><td className="p-2">{t.points}</td>
                <td className="whitespace-nowrap p-2 text-right">
                  <button className="btn-secondary !px-2 !py-1 !text-xs" onClick={() => setEdit({ i, t })}>Redaguoti</button>{" "}
                  <button className="btn-secondary !px-2 !py-1 !text-xs" onClick={() => confirm("Ištrinti?") && setItems((x) => x.filter((_, j) => j !== i))}>Ištrinti</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
