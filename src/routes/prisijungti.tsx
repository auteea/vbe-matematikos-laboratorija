import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SheetFrame } from "@/components/exam/ExamSheet";

export const Route = createFileRoute("/prisijungti")({
  head: () => ({ meta: [ { title: "Prisijungimas – VBE uždavinių generatorius" }, { name: "description", content: "Prisijunkite prie VBE uždavinių generatoriaus." }, { property: "og:title", content: "Prisijungimas – VBE uždavinių generatorius" }, { property: "og:description", content: "Prisijunkite prie VBE uždavinių generatoriaus." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" } ] }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  return (
    <div className="px-0 pt-10 sm:px-4">
      <div className="mx-auto max-w-lg">
        <SheetFrame title="VBE uždavinių generatorius" right="Matematika">
          <h1 className="mt-8 text-center font-serif text-2xl font-bold">{mode === "in" ? "Prisijungimas" : "Registracija"}</h1>
          <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); nav({ to: "/generuoti" }); }}>
            <label className="block"><span className="exam-label">El. paštas</span><input type="email" required className="exam-input mt-1" /></label>
            <label className="block"><span className="exam-label">Slaptažodis</span><input type="password" required minLength={6} className="exam-input mt-1" /></label>
            <button className="btn-primary w-full">{mode === "in" ? "Prisijungti" : "Registruotis"}</button>
            <button type="button" className="btn-secondary w-full" onClick={() => nav({ to: "/generuoti" })}>Prisijungti su Google</button>
          </form>
          <p className="mt-4 text-center text-sm">
            {mode === "in" ? "Neturite paskyros? " : "Jau turite paskyrą? "}
            <button className="font-bold underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>{mode === "in" ? "Registruotis" : "Prisijungti"}</button>
          </p>
        </SheetFrame>
      </div>
    </div>
  );
}
