// Mock exam templates (NŠA VBE aprašas 2026). Edit freely.
import type { Course } from "./topics";

export type ExamPart = "I" | "II";
export type TaskFormat = "mcq" | "short" | "full";

export interface TemplateSlot {
  number: number;
  format: TaskFormat;
  points: number;
  /** Fixed topic, or undefined = chosen by the generator from allowedGrades. */
  topic?: string;
  /** Extra hint for the generator, e.g. "tekstinis", "optimizavimas". */
  hint?: string;
  /** Points per part for full-solution tasks. */
  parts?: number[];
  /** Short answer that asks for two values. */
  twoValues?: boolean;
}

export interface ExamTemplate {
  course: Course;
  part: ExamPart;
  totalPoints: number;
  durationMin: number;
  durationLabel: string;
  allowedGrades: (11 | 12)[];
  /** Target share of points per topic area id (see topics.ts) for slots without a fixed topic. */
  areaShares?: Record<string, number>;
  rules: string[];
  sections: { title: string; instruction: string; slots: TemplateSlot[] }[];
}

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

const partI = (course: Course): ExamTemplate => ({
  course,
  part: "I",
  totalPoints: 40,
  durationMin: 120,
  durationLabel: "Trukmė – 2 val. (120 min.)",
  allowedGrades: [11],
  areaShares: { "11-skaiciai": 0.4, "11-modeliai": 0.6 },
  rules: [
    "Tik 11 kl. temos.",
    "Apie 40 % taškų – Skaičiai ir skaičiavimai, apie 60 % – Modeliai ir sąryšiai.",
    "Kiekviena 11 kl. tema bent kartą.",
  ],
  sections: [
    {
      title: "Pasirenkamojo atsakymo uždaviniai",
      instruction:
        "Kiekviename 1–15 uždavinyje pateikti keturi atsakymai, iš kurių tik vienas teisingas. Uždaviniai 1–10 vertinami 1 tašku, 11–15 – 2 taškais.",
      slots: range(1, 15).map((n) => ({ number: n, format: "mcq", points: n <= 10 ? 1 : 2 })),
    },
    {
      title: "Trumpojo atsakymo uždaviniai",
      instruction:
        "Uždaviniai 16–25 vertinami 1 tašku, 26–30 – 2 taškais (reikia nurodyti dvi reikšmes).",
      slots: range(16, 30).map((n) => ({
        number: n,
        format: "short",
        points: n <= 25 ? 1 : 2,
        twoValues: n > 25,
      })),
    },
  ],
});

const shortII = (): TemplateSlot[] =>
  range(1, 10).map((n) => ({ number: n, format: "short", points: 1 }));

const full = (number: number, topic: string, parts: number[], hint?: string): TemplateSlot => ({
  number,
  format: "full",
  topic,
  parts,
  points: parts.reduce((a, b) => a + b, 0),
  ...(hint ? { hint } : {}),
});

const partII = (course: Course, fullSlots: TemplateSlot[]): ExamTemplate => ({
  course,
  part: "II",
  totalPoints: 60,
  durationMin: 240,
  durationLabel: "Trukmė – 4 val. (240 min.)",
  allowedGrades: [11, 12],
  rules: ["Uždaviniai 1–10 – dešimt skirtingų temų."],
  sections: [
    {
      title: "I dalis",
      instruction: "Kiekvieno šios dalies uždavinio (1–10) teisingas atsakymas vertinamas 1 tašku.",
      slots: shortII(),
    },
    {
      title: "II dalis",
      instruction: `Išspręskite ${fullSlots[0]!.number}–${fullSlots.at(-1)!.number} uždavinius. Užrašykite sprendimą ir atsakymą.`,
      slots: fullSlots,
    },
  ],
});

export const EXAM_TEMPLATES: ExamTemplate[] = [
  partI("B"),
  partI("A"),
  partII("B", [
    full(11, "Lygtys", [2, 2, 3, 3]),
    full(12, "Progresijos", [2, 2, 3], "tekstinis"),
    full(13, "Briaunainiai, sukiniai", [3, 2, 2], "tekstinis"),
    full(14, "Logaritmai", [3], "logaritminė funkcija, realaus turinio modelis"),
    full(15, "Skaičių aibės", [3], "tekstinis"),
    full(16, "Funkcijos išvestinė", [2, 1, 3, 2], "optimizavimas"),
    full(17, "Rinkiniai (kėliniai, gretiniai, deriniai) ir tikimybės", [2, 2, 4]),
    full(18, "Tiesės, plokštumos, kampai erdvėje", [2, 2]),
  ]),
  partII("A", [
    full(11, "Nelygybės", [3, 2, 3]),
    full(12, "Sinusas, kosinusas ir tangentas", [2], "trigonometrinio reiškinio prastinimas"),
    full(13, "Progresijos", [2, 2, 2], "tekstinis"),
    full(14, "Vektoriai", [2, 3]),
    full(15, "Funkcijos išvestinė", [3, 2, 4], "optimizavimas"),
    full(16, "Briaunainiai, sukiniai", [2, 2]),
    full(17, "Rinkiniai (kėliniai, gretiniai, deriniai) ir tikimybės", [1, 2, 3]),
    full(18, "Logaritmai", [3], "įrodymas"),
    full(19, "Lygtys", [4], "tekstinis"),
    full(20, "Tiesės, plokštumos, kampai erdvėje", [3]),
  ]),
];

export function getTemplate(course: Course, part: ExamPart): ExamTemplate {
  return EXAM_TEMPLATES.find((t) => t.course === course && t.part === part)!;
}

export function templateSlotCount(t: ExamTemplate): number {
  return t.sections.reduce((n, s) => n + s.slots.length, 0);
}
