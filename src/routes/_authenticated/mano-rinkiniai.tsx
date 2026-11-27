import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { COURSE_NAMES } from "@/config/topics";
import { deleteSet, listSets, renameSet } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/mano-rinkiniai")({
  head: () => ({ meta: [ { title: "Mano rinkiniai – VBE uždavinių generatorius" }, { name: "description", content: "Jūsų išsaugoti VBE uždavinių rinkiniai." }, { property: "og:title", content: "Mano rinkiniai – VBE uždavinių generatorius" }, { property: "og:description", content: "Jūsų išsaugoti VBE uždavinių rinkiniai." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" } ] }),
  component: MySets,
});

function MySets() {
  const qc = useQueryClient();
  const { data: sets = [], isLoading } = useQuery({ queryKey: ["sets"], queryFn: listSets });
  const refresh = () => qc.invalidateQueries({ queryKey: ["sets"] });
  const rename = useMutation({ mutationFn: (v: { id: string; title: string }) => renameSet(v.id, v.title), onSuccess: refresh, onError: () => toast.error("Nepavyko pervadinti") });
  const remove = useMutation({ mutationFn: deleteSet, onSuccess: refresh, onError: () => toast.error("Nepavyko ištrinti") });
  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <h1 className="mb-4 text-center font-serif text-2xl font-bold">Mano rinkiniai</h1>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead><tr className="double-rule text-left">
            {["Pavadinimas", "Data", "Kursas", "Tipas", ""].map((h) => <th key={h} className="exam-label p-2">{h}</th>)}
          </tr></thead>
          <tbody>
            {sets.map((s) => (
              <tr key={s.id} className="border-b border-rule">
                <td className="p-2 font-bold">{s.title}</td>
                <td className="p-2">{new Date(s.createdAt).toLocaleDateString("lt-LT")}</td>
                <td className="p-2">{COURSE_NAMES[s.course]}</td>
                <td className="p-2">{s.mode === "mock" ? `Bandomasis, ${s.examPart} dalis` : "Teminis"}</td>
                <td className="whitespace-nowrap p-2 text-right">
                  <Link to="/rinkinys/$id" params={{ id: s.id }} className="btn-primary !px-2 !py-1 !text-xs">Atidaryti</Link>{" "}
                  <button className="btn-secondary !px-2 !py-1 !text-xs" onClick={() => {
                    const t = prompt("Naujas pavadinimas", s.title); if (t?.trim()) rename.mutate({ id: s.id, title: t.trim() });
                  }}>Pervadinti</button>{" "}
                  <button className="btn-secondary !px-2 !py-1 !text-xs" onClick={() => confirm("Ištrinti rinkinį?") && remove.mutate(s.id)}>Ištrinti</button>
                </td>
              </tr>
            ))}
            {!isLoading && sets.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Rinkinių dar nėra.</td></tr>}
            {isLoading && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Įkeliama…</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
