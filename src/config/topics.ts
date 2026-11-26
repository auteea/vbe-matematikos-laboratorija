// VBE topic catalogue (NŠA 11–12 kl. turinio minimumas). Edit freely.
// advancedOnly = true → only for išplėstinis kursas (A).
export type Course = "B" | "A";

export interface Topic {
  id: string;
  name: string;
  advancedOnly?: boolean;
}

export interface TopicArea {
  id: string;
  grade: 11 | 12;
  name: string;
  topics: Topic[];
}

export const TOPIC_AREAS: TopicArea[] = [
  {
    id: "11-skaiciai",
    grade: 11,
    name: "Skaičiai ir skaičiavimai",
    topics: [
      { id: "skaiciu-aibes", name: "Skaičių aibės" },
      { id: "modulis", name: "Realiojo skaičiaus modulis" },
      { id: "saknys", name: "Šaknys" },
      { id: "laipsnis", name: "Laipsnis su racionaliuoju rodikliu" },
      { id: "logaritmai", name: "Logaritmai" },
      { id: "trigonometrija", name: "Sinusas, kosinusas ir tangentas" },
    ],
  },
  {
    id: "11-modeliai",
    grade: 11,
    name: "Modeliai ir sąryšiai",
    topics: [
      { id: "progresijos", name: "Progresijos" },
      { id: "funkcijos", name: "Funkcijos" },
      { id: "lygtys", name: "Lygtys" },
      { id: "nelygybes", name: "Nelygybės" },
      { id: "vektoriai", name: "Vektoriai", advancedOnly: true },
    ],
  },
  {
    id: "12-modeliai",
    grade: 12,
    name: "Modeliai ir sąryšiai",
    topics: [
      { id: "trig-lygtys", name: "Trigonometrinės lygtys ir nelygybės" },
      { id: "isvestine", name: "Funkcijos išvestinė" },
      { id: "integralas", name: "Pirmykštė funkcija ir integralas", advancedOnly: true },
    ],
  },
  {
    id: "12-geometrija",
    grade: 12,
    name: "Geometrija ir matavimai",
    topics: [
      { id: "erdve", name: "Tiesės, plokštumos, kampai erdvėje" },
      { id: "briaunainiai", name: "Briaunainiai, sukiniai" },
    ],
  },
  {
    id: "12-tikimybes",
    grade: 12,
    name: "Duomenys ir tikimybės",
    topics: [
      { id: "tikimybes", name: "Rinkiniai (kėliniai, gretiniai, deriniai) ir tikimybės" },
      { id: "atsitiktiniai", name: "Atsitiktiniai dydžiai" },
    ],
  },
];

export const TASK_KINDS = [
  { id: "calc", name: "Skaičiavimo" },
  { id: "text", name: "Tekstinis (realaus turinio)" },
  { id: "mixed", name: "Mišrus" },
] as const;
export type TaskKind = (typeof TASK_KINDS)[number]["id"];

export const MAX_TASKS_PER_SET = 10;
/** Generated tasks allowed per user per day. */
export const DAILY_TASK_LIMIT = 100;

export function areasForCourse(course: Course): TopicArea[] {
  return TOPIC_AREAS.map((a) => ({
    ...a,
    topics: a.topics.filter((t) => course === "A" || !t.advancedOnly),
  })).filter((a) => a.topics.length > 0);
}

export const COURSE_NAMES: Record<Course, string> = {
  B: "Bendrasis kursas",
  A: "Išplėstinis kursas",
};
