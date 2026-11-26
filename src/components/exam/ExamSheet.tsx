import type { ReactNode } from "react";
import type { TaskSet } from "@/lib/types";
import { COURSE_NAMES } from "@/config/topics";
import { getTemplate } from "@/config/examTemplates";
import { pointsLabel } from "@/lib/points";
import { TaskBlock } from "./TaskBlock";
import { Md } from "./Md";

export function SheetFrame({ title, right, children }: { title: string; right: string; children: ReactNode }) {
  return (
    <article className="exam-sheet">
      <header className="double-rule flex items-end justify-between gap-4 pb-1 text-sm">
        <span className="font-bold">{title}</span>
        <span>{right}</span>
      </header>
      {children}
      <footer className="double-rule-top mt-10 pt-2 text-center font-serif text-sm uppercase tracking-wider">
        Generuotas treniruotės variantas
      </footer>
    </article>
  );
}

export function SectionTitle({ title, instruction }: { title: string; instruction: string }) {
  return (
    <div className="mt-8 mb-2 text-center">
      <h2 className="font-serif text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm italic">{instruction}</p>
    </div>
  );
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("lt-LT");

export function ExamSheet({ set, interactive = true }: { set: TaskSet; interactive?: boolean }) {
  const tpl = set.examPart ? getTemplate(set.course, set.examPart) : null;
  const sections = tpl
    ? tpl.sections.map((s) => {
        const nums = new Set(s.slots.map((x) => String(x.number)));
        return { ...s, tasks: set.tasks.filter((t) => nums.has(t.label)) };
      })
    : [{ title: "", instruction: "", tasks: set.tasks }];

  return (
    <SheetFrame title={set.title} right={COURSE_NAMES[set.course]}>
      {set.mode === "mock" && tpl && (
        <div className="my-8 border border-foreground p-6 text-center">
          <div className="font-serif text-3xl font-bold tracking-widest">MATEMATIKA</div>
          <div className="mt-2 font-serif text-lg">VBE {set.examPart} dalies treniruotės variantas</div>
          <div className="mt-4 text-sm">{COURSE_NAMES[set.course]} · {fmtDate(set.createdAt)}</div>
          <div className="mt-1 text-sm">{tpl.durationLabel} · Iš viso {pointsLabel(tpl.totalPoints)}</div>
        </div>
      )}
      <div className="print-only mt-6 mb-2 text-sm">Vardas, pavardė ______________________________________</div>

      {sections.map((s, i) => (
        <section key={i}>
          {s.title && <SectionTitle title={s.title} instruction={s.instruction} />}
          {s.tasks.map((t) => <TaskBlock key={t.id} task={t} interactive={interactive} {...(interactive ? { onRegenerate: () => {} } : {})} />)}
        </section>
      ))}

      <section className="print-solutions print-only print-break">
        <h2 className="mb-3 text-center font-serif text-xl font-bold">Atsakymai ir sprendimai</h2>
        <table className="w-full border-collapse text-sm">
          <thead><tr>{["Užd.", "Sprendimas ir atsakymas", "Taškai"].map((h) => <th key={h} className="border border-foreground p-1">{h}</th>)}</tr></thead>
          <tbody>
            {set.tasks.map((t) => (
              <tr key={t.id} className="exam-task">
                <td className="border border-foreground p-1 text-center align-top font-bold">{t.label}</td>
                <td className="border border-foreground p-1">
                  {t.solution.map((s, i) => <Md key={i}>{s.text}</Md>)}
                  <div className="font-bold">Atsakymas: {t.answer.join("; ")}</div>
                </td>
                <td className="border border-foreground p-1 text-center align-top">{t.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </SheetFrame>
  );
}
