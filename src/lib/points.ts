/** Lithuanian noun form for "taškas": 1 taškas, 2–9 taškai, 10–20 taškų, 21 taškas … */
export function pointsWord(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "taškas";
  if (m10 >= 2 && m10 <= 9 && !(m100 >= 12 && m100 <= 19)) return "taškai";
  return "taškų";
}
export const pointsLabel = (n: number) => `${n} ${pointsWord(n)}`;
