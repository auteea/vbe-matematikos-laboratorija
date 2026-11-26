// Turns the user's choices (topic set) or an exam template (mock exam) into task slots.
// Each slot is one call to the generator. Reads topics.ts and examTemplates.ts, never hardcodes them.
import { areasForCourse, type Course, type TaskKind, type TopicArea } from "@/config/topics";
import { getTemplate, type ExamPart, type TaskFormat } from "@/config/examTemplates";

export type Rng = () => number;

/** Small seeded PRNG (mulberry32), so plans can be reproduced in tests. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}

export interface Slot {
  /** Unique within the set, e.g. "s11" (mock exam) or "t3" (topic set). */
  key: string;
  /** Task number shown on the sheet. */
  label: string;
  position: number;
  /** Index of the template section (always 0 for topic sets). */
  section: number;
  format: TaskFormat;
  /** null: the generator chooses the structure (topic sets). */
  points: number | null;
  /** Points per part for structured full-solution tasks; null when free. */
  parts: number[] | null;
  /** Short answer that asks for two values (2 points). */
  twoValues: boolean;
  topic: string;
  hint: string | null;
  kind: TaskKind;
}

export interface TopicSetRequest {
  course: Course;
  topics: string[];
  kind: TaskKind;
  count: number;
}

/** Teminis rinkinys: open-answer tasks, topics spread evenly over the chosen ones. */
export function planTopicSet(req: TopicSetRequest, rng: Rng = Math.random): Slot[] {
  const allowed = new Set(areasForCourse(req.course).flatMap((a) => a.topics.map((t) => t.name)));
  const topics = req.topics.filter((t) => allowed.has(t));
  if (topics.length === 0) throw new Error("Pasirinkite bent vieną šio kurso temą.");
  const count = Math.max(1, Math.floor(req.count));
  const order: string[] = [];
  while (order.length < count) order.push(...shuffle(topics, rng));
  return order.slice(0, count).map((topic, i) => ({
    key: `t${i + 1}`,
    label: String(i + 1),
    position: i,
    section: 0,
    format: "full",
    points: null,
    parts: null,
    twoValues: false,
    topic,
    hint: null,
    kind: req.kind,
  }));
}

interface TopicRef {
  area: string;
  name: string;
  order: number;
}

function topicRefs(areas: TopicArea[]): TopicRef[] {
  let order = 0;
  return areas.flatMap((a) => a.topics.map((t) => ({ area: a.id, name: t.name, order: order++ })));
}

/** Fills free slots with different topics, spread over the areas, in curriculum order. */
function assignDistinct(free: Slot[], areas: TopicArea[], rng: Rng): void {
  const refs = topicRefs(areas);
  const byArea = areas.map((a) =>
    shuffle(
      refs.filter((r) => r.area === a.id),
      rng,
    ),
  );
  const chosen: TopicRef[] = [];
  while (chosen.length < free.length && refs.length > 0) {
    let added = false;
    for (const pool of byArea) {
      const next = pool.shift();
      if (next && chosen.length < free.length) {
        chosen.push(next);
        added = true;
      }
    }
    if (!added)
      byArea.forEach((pool, i) =>
        pool.push(
          ...shuffle(
            refs.filter((r) => r.area === areas[i]?.id),
            rng,
          ),
        ),
      );
  }
  chosen.sort((x, y) => x.order - y.order);
  free.forEach((slot, i) => {
    slot.topic = chosen[i]?.name ?? "";
  });
}

/**
 * Fills free slots so that every topic appears at least once and the points per area
 * follow areaShares (e.g. 40 % Skaičiai ir skaičiavimai, 60 % Modeliai ir sąryšiai).
 */
function assignByShares(
  free: Slot[],
  areas: TopicArea[],
  shares: Record<string, number>,
  rng: Rng,
): void {
  const refs = topicRefs(areas);
  const pts = (s: Slot) => s.points ?? 1;
  const total = free.reduce((n, s) => n + pts(s), 0);
  const target = new Map(areas.map((a) => [a.id, (shares[a.id] ?? 0) * total]));
  const got = new Map(areas.map((a) => [a.id, 0]));
  const uses = new Map(refs.map((r) => [r.name, 0]));
  const give = (slot: Slot, ref: TopicRef) => {
    slot.topic = ref.name;
    got.set(ref.area, (got.get(ref.area) ?? 0) + pts(slot));
    uses.set(ref.name, (uses.get(ref.name) ?? 0) + 1);
  };

  // 1. Every topic once, on the cheapest slots.
  const cheapFirst = shuffle(free, rng).sort((a, b) => pts(a) - pts(b));
  shuffle(refs, rng).forEach((ref, i) => {
    const slot = cheapFirst[i];
    if (slot) give(slot, ref);
  });

  // 2. The rest goes to the area furthest below its target, least-used topic first.
  const rest = shuffle(
    free.filter((s) => !s.topic),
    rng,
  ).sort((a, b) => pts(b) - pts(a));
  for (const slot of rest) {
    const area = shuffle(areas, rng).sort(
      (a, b) =>
        (target.get(b.id) ?? 0) -
        (got.get(b.id) ?? 0) -
        ((target.get(a.id) ?? 0) - (got.get(a.id) ?? 0)),
    )[0];
    const candidates = shuffle(
      refs.filter((r) => r.area === area?.id),
      rng,
    ).sort((a, b) => (uses.get(a.name) ?? 0) - (uses.get(b.name) ?? 0));
    const ref = candidates[0] ?? refs[0];
    if (ref) give(slot, ref);
  }
}

/** Bandomasis egzaminas: one slot per template task, with topics for the slots that have none. */
export function planMockExam(course: Course, part: ExamPart, rng: Rng = Math.random): Slot[] {
  const tpl = getTemplate(course, part);
  const areas = areasForCourse(course).filter((a) => tpl.allowedGrades.includes(a.grade));
  const slots: Slot[] = [];
  tpl.sections.forEach((section, si) =>
    section.slots.forEach((s) =>
      slots.push({
        key: `s${s.number}`,
        label: String(s.number),
        position: slots.length,
        section: si,
        format: s.format,
        points: s.points,
        parts: s.parts ?? null,
        twoValues: s.twoValues ?? false,
        topic: s.topic ?? "",
        hint: s.hint ?? null,
        kind: "mixed",
      }),
    ),
  );
  const free = slots.filter((s) => !s.topic);
  if (free.length > 0) {
    if (tpl.areaShares) assignByShares(free, areas, tpl.areaShares, rng);
    else assignDistinct(free, areas, rng);
  }
  return slots;
}
