import { useState } from "react";
import type { AnswerItem, Task } from "@/lib/types";
import { pointsLabel } from "@/lib/points";
import { Md } from "./Md";

export function Points({ n }: { n: number }) {
  return <span className="shrink-0 italic">({pointsLabel(n)})</span>;
}

/** Shows the LaTeX display form of an answer, or the plain checker value when there is none. */
export function AnswerText({ answer }: { answer: AnswerItem }) {
  return answer.display ? (
    <Md inline>{answer.display}</Md>
  ) : (
    <span className="font-mono text-sm">{answer.value}</span>
  );
}

/** "11.1. … ; 11.2. …" for the printed answer key. */
export function answerSummary(task: Task): string {
  return task.answer
    .map((a, i) => {
      const label = task.parts[i] ? `${task.parts[i].label}. ` : "";
      return label + (a.display ?? a.value);
    })
    .join("; ");
}

export function TaskBlock({ task, interactive = true, onRegenerate }: {
  task: Task; interactive?: boolean; onRegenerate?: () => void;
}) {
  const [showAns, setShowAns] = useState(false);
  const [showSol, setShowSol] = useState(false);
  return (
    <div className="exam-task border-b border-rule py-5 last:border-b-0">
      <div className="flex items-start gap-3">
        <span className="font-bold">{task.label}.</span>
        <div className="min-w-0 flex-1"><Md>{task.statement}</Md></div>
        {task.parts.length === 0 && <Points n={task.points} />}
      </div>

      {task.options && (
        <div className="mt-2 flex flex-wrap gap-x-10 gap-y-1 pl-7">
          {task.options.map((o, i) => (
            <span key={i} className="flex items-baseline gap-2">
              <b>{"ABCD"[i]}</b><Md inline>{o}</Md>
            </span>
          ))}
        </div>
      )}

      {task.parts.map((p) => (
        <div key={p.label} className="mt-3 pl-7">
          <div className="flex items-start gap-3">
            <span className="font-bold">{p.label}.</span>
            <div className="min-w-0 flex-1"><Md>{p.statement}</Md></div>
            <Points n={p.points} />
          </div>
          <div className="print-only mt-2 h-40">
            <span className="text-sm italic text-muted-foreground">Juodraštis</span>
          </div>
        </div>
      ))}

      {interactive && (
        <div className="no-print mt-3 flex flex-wrap items-center gap-2 pl-7">
          <button className="btn-secondary !px-3 !py-1 !text-xs" onClick={() => setShowAns((v) => !v)}>
            {showAns ? "Slėpti atsakymą" : "Rodyti atsakymą"}
          </button>
          <button className="btn-secondary !px-3 !py-1 !text-xs" onClick={() => setShowSol((v) => !v)}>
            {showSol ? "Slėpti sprendimą" : "Rodyti sprendimą"}
          </button>
          {onRegenerate && (
            <button className="btn-secondary !px-3 !py-1 !text-xs" onClick={onRegenerate}>Generuoti iš naujo</button>
          )}
          {!task.verified && <span className="exam-label border border-foreground px-2 py-0.5">Nepatikrinta</span>}
        </div>
      )}
      {interactive && showAns && (
        <div className="no-print mt-3 ml-7 border-l-2 border-foreground pl-3">
          <div className="exam-label mb-1">Atsakymas</div>
          {task.answer.map((a, i) => (
            <div key={i} className="flex items-baseline gap-2">
              {task.parts[i] && <b>{task.parts[i].label}.</b>}
              <AnswerText answer={a} />
            </div>
          ))}
        </div>
      )}
      {interactive && showSol && (
        <div className="no-print mt-3 ml-7 border-l-2 border-foreground pl-3">
          <div className="exam-label mb-1">Sprendimas</div>
          {task.solution.map((s, i) => (
            <div key={i} className="flex gap-3"><div className="flex-1"><Md>{s.text}</Md></div><span className="italic">{s.points}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}
