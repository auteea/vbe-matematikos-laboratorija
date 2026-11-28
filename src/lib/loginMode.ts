/** Keep sign-up links explicit while unknown or missing modes remain sign-in. */
export function loginSearch(search: Record<string, unknown>): { mode?: string } {
  return typeof search["mode"] === "string" ? { mode: search["mode"] } : {};
}

export function loginMode(mode: string | undefined): "in" | "up" {
  return mode === "up" ? "up" : "in";
}