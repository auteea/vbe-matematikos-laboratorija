import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ExamSheet } from "@/components/exam/ExamSheet";
import { getSet, renameSet } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/rinkinys/$id")({
  head: () => ({ meta: [ { title: "Uždavinių rinkinys – VBE uždavinių generatorius" }, { name: "description", content: "Sugeneruotas VBE matematikos uždavinių rinkinys." }, { property: "og:title", content: "Uždavinių rinkinys – VBE uždavinių generatorius" }, { property: "og:description", content: "Sugeneruotas VBE matematikos uždavinių rinkinys." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" } ] }),
  loader: async ({ params }) => { const set = await getSet(params.id); if (!set) throw notFound(); return { set }; },
  component: SetPage,
});

function printAs(mode: "tasks" | "solutions") {
  document.body.dataset["print"] = mode;
  window.print();
}

function SetPage() {
  const { set } = Route.useLoaderData();
  const [title, setTitle] = useState(set.title);
  const [saved, setSaved] = useState(set.title);
  const save = async () => {
    const t = title.trim();
    if (!t) { setTitle(saved); return; }
    if (t === saved) return;
    try { await renameSet(set.id, t); setSaved(t); toast.success("Pavadinimas išsaugotas"); }
    catch { toast.error("Nepavyko išsaugoti pavadinimo"); }
  };
  return (
    <div className="mx-auto max-w-[800px] pt-6">
      <div className="no-print mb-4 flex flex-wrap items-end gap-2 px-4 sm:px-0">
        <label className="min-w-0 flex-1"><span className="exam-label">Pavadinimas</span>
          <input className="exam-input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} /></label>
        <button className="btn-secondary" onClick={() => printAs("tasks")}>Spausdinti užduotis</button>
        <button className="btn-primary" onClick={() => printAs("solutions")}>Spausdinti su sprendimais</button>
      </div>
      <ExamSheet set={{ ...set, title }} />
    </div>
  );
}
