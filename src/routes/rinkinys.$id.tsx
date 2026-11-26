import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ExamSheet } from "@/components/exam/ExamSheet";
import { getMockSet } from "@/data/mockSets";

export const Route = createFileRoute("/rinkinys/$id")({
  head: () => ({ meta: [ { title: "Uždavinių rinkinys – VBE uždavinių generatorius" }, { name: "description", content: "Sugeneruotas VBE matematikos uždavinių rinkinys." }, { property: "og:title", content: "Uždavinių rinkinys – VBE uždavinių generatorius" }, { property: "og:description", content: "Sugeneruotas VBE matematikos uždavinių rinkinys." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" } ] }),
  loader: ({ params }) => { const set = getMockSet(params.id); if (!set) throw notFound(); return { set }; },
  component: SetPage,
});

function printAs(mode: "tasks" | "solutions") {
  document.body.dataset["print"] = mode;
  window.print();
}

function SetPage() {
  const { set } = Route.useLoaderData();
  const [title, setTitle] = useState(set.title);
  return (
    <div className="mx-auto max-w-[800px] pt-6">
      <div className="no-print mb-4 flex flex-wrap items-end gap-2 px-4 sm:px-0">
        <label className="min-w-0 flex-1"><span className="exam-label">Pavadinimas</span>
          <input className="exam-input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <button className="btn-secondary" onClick={() => printAs("tasks")}>Spausdinti užduotis</button>
        <button className="btn-primary" onClick={() => printAs("solutions")}>Spausdinti su sprendimais</button>
      </div>
      <ExamSheet set={{ ...set, title }} />
    </div>
  );
}
