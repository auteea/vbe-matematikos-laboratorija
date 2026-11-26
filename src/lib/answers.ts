// Compares the creator's and the solver's answers (spec: "Compare in code").
// Pure TypeScript + mathjs, so it runs in the browser, in Node and in edge/server functions.
import { all, create, type MathNode } from "mathjs";
import type { AnswerItem, AnswerType } from "./types";

const math = create(all!, { number: "number" });
const evaluateSafe = math.evaluate.bind(math);
const parseSafe = math.parse.bind(math);
// Model output is untrusted: switch off the functions that could change mathjs itself.
const disabled = (name: string) => () => {
  throw new Error(`${name} is disabled`);
};
math.import(
  {
    import: disabled("import"),
    createUnit: disabled("createUnit"),
    evaluate: disabled("evaluate"),
    parse: disabled("parse"),
    simplify: disabled("simplify"),
    derivative: disabled("derivative"),
    resolve: disabled("resolve"),
  },
  { override: true },
);

const TOLERANCE = 1e-6;

/** Turns the LaTeX a model may still send ("\frac{3}{5}", "2\sqrt{13}", "0{,}6") into ASCII math. */
export function latexToAscii(input: string): string {
  let t = input;
  t = t.replace(/\\left|\\right/g, "");
  t = t.replace(/\{,\}/g, ",");
  t = t.replace(/\\[,;!: ]/g, "");
  t = t.replace(/\^\s*\{?\\circ\}?/g, "");
  t = t.replace(/\\(?:cdot|times)/g, "*");
  t = t.replace(/\\div/g, "/");
  t = t.replace(/\\pi/g, "pi");
  t = t.replace(/\\infty/g, "Infinity");
  t = t.replace(/\\cup/g, " U ");
  t = t.replace(/\\(?:emptyset|varnothing)/g, "∅");
  t = t.replace(/\\in(?![a-z])/g, "∈");
  t = t.replace(/\\operatorname\{([a-z]+)\}/g, "$1");
  t = t.replace(/\\([{}])/g, "$1");
  for (let i = 0; i < 10; i++) {
    const next = t
      .replace(/\\d?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "(($1)/($2))")
      .replace(/\\sqrt\s*\[([^\]]*)\]\s*\{([^{}]*)\}/g, "nthRoot(($2),($1))")
      .replace(/\\sqrt\s*\{([^{}]*)\}/g, "sqrt($1)")
      .replace(/\^\{([^{}]*)\}/g, "^($1)");
    if (next === t) break;
    t = next;
  }
  return t.replace(/\\/g, "");
}

/** Normalises Lithuanian notation and Unicode symbols to plain mathjs syntax. */
export function normalizeMath(input: string): string {
  let s = latexToAscii(input).replace(/\$/g, "").trim();
  s = s.replace(/[−–—]/g, "-");
  s = s.replace(/[·⋅×]/g, "*");
  s = s.replace(/÷/g, "/");
  s = s.replace(/π/g, "pi");
  s = s.replace(/∞/g, "Infinity");
  s = s.replace(/√\s*\(/g, "sqrt(");
  s = s.replace(/√\s*([0-9a-z.]+)/gi, "sqrt($1)");
  s = s.replace(/°/g, "");
  s = s.replace(/(\d)\s+(?=\d)/g, "$1"); // 10 612 → 10612
  s = s.replace(/(\d),(\d)/g, "$1.$2"); // decimal comma
  // log_2(x), log_{2} x → log(x, 2); lg → log10; ln → log; tg → tan; ctg → cot
  s = s.replace(/log_\{?([0-9.]+)\}?\s*\(([^()]*)\)/g, "log(($2),($1))");
  s = s.replace(/log_\{?([0-9.]+)\}?\s*([0-9.]+)/g, "log(($2),($1))");
  s = s.replace(/\blg\b/g, "log10");
  s = s.replace(/\bln\b/g, "log");
  s = s.replace(/\bctg\b/g, "cot");
  s = s.replace(/\btg\b/g, "tan");
  // "lg 1000", "sin x" → "log10(1000)", "sin(x)"
  s = s.replace(/\b(log10|log|sin|cos|tan|cot|sqrt)\s+([0-9.]+|[a-zA-Z]\w*)/g, "$1($2)");
  // "x = 5", "EF = b - a/3", "x ∈ [1; 2)" → keep only the answer
  s = s.replace(/^[a-zA-Z][a-zA-Z0-9_{}]*\s*(?:=|∈)\s*/, "");
  return s.replace(/\s+/g, " ").trim();
}

function toNumberValue(v: unknown): number {
  if (typeof v === "number") return v;
  if (v === null || v === undefined || typeof v === "boolean") return NaN;
  if (typeof v === "object" && (v as { isComplex?: boolean }).isComplex) {
    const c = v as { re: number; im: number };
    return c.im === 0 ? c.re : NaN;
  }
  return Number(v as never);
}

/** Evaluates a closed numeric expression ("3/5", "2*sqrt(13)", "1260*pi"). Throws if not a real number. */
export function evaluateNumber(input: string, allowInfinity = false): number {
  const s = normalizeMath(input);
  if (allowInfinity) {
    if (/^\+?inf(inity)?$/i.test(s)) return Infinity;
    if (/^-inf(inity)?$/i.test(s)) return -Infinity;
  }
  const n = toNumberValue(evaluateSafe(s, {}));
  if (Number.isNaN(n) || (!allowInfinity && !Number.isFinite(n))) {
    throw new Error(`Not a real number: ${input}`);
  }
  return n;
}

export function numbersEqual(a: number, b: number): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
  return Math.abs(a - b) <= TOLERANCE * Math.max(1, Math.abs(a), Math.abs(b));
}

function tryNumber(input: string): number | null {
  try {
    return evaluateNumber(input);
  } catch {
    return null;
  }
}

function freeSymbols(node: MathNode): string[] {
  const names = new Set<string>();
  node.traverse((n: MathNode, path: string) => {
    if (n.type !== "SymbolNode" || path === "fn") return;
    const name = (n as unknown as { name: string }).name;
    // "i" and "j" are unit vectors in school answers, not the imaginary unit.
    if (!(name in math) || name === "i" || name === "j") names.add(name);
  });
  return [...names];
}

/** Symbolic answers ("b - a/3", "(x-1)(x+1)") are compared by substituting sample values. */
export function expressionsEqual(a: string, b: string): boolean {
  const na = parseSafe(normalizeMath(a));
  const nb = parseSafe(normalizeMath(b));
  const vars = [...new Set([...freeSymbols(na), ...freeSymbols(nb)])];
  const ca = na.compile();
  const cb = nb.compile();
  let valid = 0;
  for (let k = 0; k < 8; k++) {
    const scope: Record<string, number> = {};
    vars.forEach((v, j) => {
      scope[v] = 0.5 + ((k * 7 + j * 13) % 17) / 10;
    });
    const va = toNumberValue(ca.evaluate(scope));
    const vb = toNumberValue(cb.evaluate(scope));
    if (!Number.isFinite(va) || !Number.isFinite(vb)) continue;
    if (!numbersEqual(va, vb)) return false;
    valid++;
    if (vars.length === 0) break;
  }
  return valid >= (vars.length === 0 ? 1 : 3);
}

function setElements(input: string): string[] {
  let t = normalizeMath(input);
  if (t === "∅" || t === "{}" || t === "") return [];
  if (t.startsWith("{") && t.endsWith("}")) t = t.slice(1, -1);
  const sep = t.includes(";") ? ";" : ",";
  return t
    .split(sep)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Sets compare as multisets: numbers with tolerance, labels like "A_1B_1" as text. */
export function setsEqual(a: string, b: string): boolean {
  const split = (s: string) => {
    const nums: number[] = [];
    const tokens: string[] = [];
    for (const el of setElements(s)) {
      const n = tryNumber(el);
      if (n === null) tokens.push(el.replace(/[\s_{}]/g, "").toUpperCase());
      else nums.push(n);
    }
    return { nums: nums.sort((x, y) => x - y), tokens: tokens.sort() };
  };
  const sa = split(a);
  const sb = split(b);
  if (sa.nums.length !== sb.nums.length || sa.tokens.length !== sb.tokens.length) return false;
  return (
    sa.nums.every((n, i) => numbersEqual(n, sb.nums[i] ?? NaN)) &&
    sa.tokens.every((t, i) => t === sb.tokens[i])
  );
}

interface Interval {
  lo: number;
  hi: number;
  loClosed: boolean;
  hiClosed: boolean;
}

function inequalityToInterval(s: string): string {
  const m = s.match(/^x\s*(<=|>=|<|>|≤|≥)\s*(.+)$/);
  if (!m) return s;
  const [, op, v] = m;
  if (op === ">=" || op === "≥") return `[${v}; Infinity)`;
  if (op === ">") return `(${v}; Infinity)`;
  if (op === "<=" || op === "≤") return `(-Infinity; ${v}]`;
  return `(-Infinity; ${v})`;
}

export function parseIntervals(input: string): Interval[] {
  const t = inequalityToInterval(normalizeMath(input));
  if (t === "∅" || t === "{}") return [];
  if (/^(R|ℝ)$/.test(t)) return [{ lo: -Infinity, hi: Infinity, loClosed: false, hiClosed: false }];
  return t
    .split(/\s*(?:∪|\bU\b)\s*/)
    .map((piece) => {
      const m = piece.trim().match(/^([[(])\s*([^;]+?)\s*;\s*([^;]+?)\s*([\])])$/);
      if (!m) throw new Error(`Not an interval: ${piece}`);
      const lo = evaluateNumber(m[2] ?? "", true);
      const hi = evaluateNumber(m[3] ?? "", true);
      return {
        lo,
        hi,
        loClosed: m[1] === "[" && Number.isFinite(lo),
        hiClosed: m[4] === "]" && Number.isFinite(hi),
      };
    })
    .sort((x, y) => x.lo - y.lo || x.hi - y.hi);
}

export function intervalsEqual(a: string, b: string): boolean {
  const ia = parseIntervals(a);
  const ib = parseIntervals(b);
  return (
    ia.length === ib.length &&
    ia.every((x, i) => {
      const y = ib[i];
      return (
        !!y &&
        numbersEqual(x.lo, y.lo) &&
        numbersEqual(x.hi, y.hi) &&
        x.loClosed === y.loClosed &&
        x.hiClosed === y.hiClosed
      );
    })
  );
}

export function choicesEqual(a: string, b: string): boolean {
  const letters = (s: string) =>
    [...new Set(s.toUpperCase().match(/\b[A-E]\b/g) ?? [])].sort().join();
  return letters(a) !== "" && letters(a) === letters(b);
}

const PROOF_OK = new Set(["valid", "true", "taip", "teisinga", "teisingas"]);

/** true when the two answers of the given type are equivalent; false on a mismatch or parse error. */
export function answersEqual(type: AnswerType, expected: string, actual: string): boolean {
  try {
    switch (type) {
      case "number": {
        const a = tryNumber(expected);
        const b = tryNumber(actual);
        return a !== null && b !== null ? numbersEqual(a, b) : expressionsEqual(expected, actual);
      }
      case "expression":
        return expressionsEqual(expected, actual);
      case "set":
        return setsEqual(expected, actual);
      case "interval":
        return intervalsEqual(expected, actual);
      case "choice":
        return choicesEqual(expected, actual);
      case "proof":
        return PROOF_OK.has(actual.trim().toLowerCase());
    }
  } catch {
    return false;
  }
}

export interface CompareResult {
  ok: boolean;
  /** Indexes of answer items that differ (or could not be parsed). */
  mismatches: number[];
}

/** Compares the creator's answers with the solver's, item by item. */
export function compareAnswers(expected: AnswerItem[], actual: AnswerItem[]): CompareResult {
  if (expected.length === 0 || expected.length !== actual.length) {
    return { ok: false, mismatches: expected.map((_, i) => i) };
  }
  const mismatches = expected
    .map((e, i) => (answersEqual(e.type, e.value, actual[i]?.value ?? "") ? -1 : i))
    .filter((i) => i >= 0);
  return { ok: mismatches.length === 0, mismatches };
}
