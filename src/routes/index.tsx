import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Check, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskBlock } from "@/components/exam/TaskBlock";
import { supabase } from "@/integrations/supabase/client";
import examples from "@/data/exampleTasks.json";
import type { Task } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "VBE uždavinių generatorius" },
    { name: "description", content: "Generuokite VBE matematikos uždavinius ir bandomuosius egzaminus." },
    { property: "og:title", content: "VBE uždavinių generatorius" },
    { property: "og:description", content: "Generuokite VBE matematikos uždavinius ir bandomuosius egzaminus." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session) navigate({ to: "/generuoti", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate({ to: "/generuoti", replace: true });
    });
    return () => { mounted = false; data.subscription.unsubscribe(); };
  }, [navigate]);

  const sampleTasks: Task[] = examples.slice(0, 2).map((example, index) => ({
    id: `landing-example-${index + 1}`, position: index + 1, label: String(index + 1),
    format: "short", topic: example.topic, points: example.points,
    statement: example.statement, parts: example.parts, answer: [], solution: [],
    verified: false, attempts: 0,
  }));

  return (
    <div className="bg-background text-foreground">
      <header className="double-rule">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-5 sm:px-8">
          <Link to="/" className="font-serif text-xl font-bold">VBE uždavinių generatorius</Link>
          <nav aria-label="Paskyra" className="flex items-center gap-4">
            <Button asChild variant="link" className="h-auto p-0 font-bold"><Link to="/prisijungti" search={{ mode: "in" }}>Prisijungti</Link></Button>
            <Button asChild variant="outline" className="btn-secondary"><Link to="/prisijungti" search={{ mode: "up" }}>Registruotis</Link></Button>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <section className="double-rule py-12 sm:py-16">
          <p className="mb-5 text-sm font-bold">MATEMATIKA · 11–12 KLASĖ</p>
          <h1 className="max-w-4xl font-serif text-3xl font-bold leading-tight sm:text-5xl">Generuoja valstybinių brandos egzaminų užduotis atitinkančius matematikos uždavinius</h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed sm:text-lg">Bendrasis (B) ir išplėstinis (A) kursai, I ir II egzamino dalys. Pasirinkite uždavinius pagal temą arba visą bandomąjį egzaminą.</p>
          <Button asChild className="btn-primary mt-8 h-auto min-h-11 whitespace-normal text-center"><Link to="/prisijungti" search={{ mode: "up" }}>Registruotis ir generuoti <ArrowRight aria-hidden="true" /></Link></Button>
        </section>

        <section aria-labelledby="how-title" className="border-b border-rule py-9 sm:py-12">
          <h2 id="how-title" className="font-serif text-2xl font-bold sm:text-3xl">Kaip tai veikia</h2>
          <ol className="mt-7 grid gap-7 sm:grid-cols-3">
            {[
              ["Pasirenkate", "Pasirinkite temas arba visą egzamino variantą, kursą ir egzamino dalį."],
              ["DI kuria uždavinius", "Dirbtinis intelektas kuria uždavinius pagal oficialų VBE aprašą ir 11–12 klasių matematikos programą."],
              ["Antras DI patikrina", "Antras dirbtinis intelektas savarankiškai išsprendžia kiekvieną uždavinį. Abiejų atsakymai palyginami."],
            ].map(([title, text], index) => (
              <li key={title} className="border-t border-foreground pt-4">
                <span className="font-serif text-3xl">0{index + 1}</span>
                <h3 className="mt-3 font-serif text-xl font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="examples-title" className="border-b border-rule py-9 sm:py-12">
          <div className="double-rule flex flex-wrap items-baseline justify-between gap-2 pb-4">
            <h2 id="examples-title" className="font-serif text-2xl font-bold sm:text-3xl">Uždavinių pavyzdžiai</h2>
            <p className="text-sm">B kursas · II dalis</p>
          </div>
          {sampleTasks.map((task) => <TaskBlock key={task.id} task={task} interactive={false} />)}
          <p className="mt-4 text-xs text-muted-foreground">Šaltinis: 2026 m. VBE II dalies bandomasis patikrinimas, bendrasis kursas.</p>
        </section>

        <section aria-labelledby="benefits-title" className="py-9 sm:py-12">
          <h2 id="benefits-title" className="font-serif text-2xl font-bold sm:text-3xl">Ką gaunate</h2>
          <ul className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2">
            {[
              "Uždavinius pagal temą arba visą bandomąjį egzaminą",
              "B ir A kursus, I ir II egzamino dalis",
              "Atsakymų raktą ir nuoseklius sprendimus",
              "Spausdinamą užduočių lapą arba PDF",
            ].map((text, index) => <li key={text} className="flex items-start gap-3">{index === 3 ? <Printer aria-hidden="true" className="mt-0.5 size-5 shrink-0" /> : <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0" />}<span>{text}</span></li>)}
          </ul>
          <Button asChild className="btn-primary mt-8"><Link to="/prisijungti" search={{ mode: "up" }}>Registruotis <ArrowRight aria-hidden="true" /></Link></Button>
        </section>
      </div>

      <footer className="double-rule-top">
        <p className="mx-auto max-w-5xl px-5 py-6 text-sm text-muted-foreground sm:px-8">Neoficialus mokymosi įrankis, nesusijęs su Nacionaline švietimo agentūra.</p>
      </footer>
    </div>
  );
}
