export type DateRangePreset = "all" | "week" | "next7" | "month" | "custom";

/** "YYYY-MM-DD" in the viewer's own time zone. */
export const localIsoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Parse "YYYY-MM-DD" as local midnight (not UTC, which shifts the day for US users). */
export function parseLocalDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/** Explicit [from, to) bounds for a preset; `to` is exclusive. Null means no date filter. */
export function rangeBounds(r: DateRangePreset, from: string, to: string, now = new Date()): { from: Date; to: Date } | null {
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  if (r === "all") return null;
  if (r === "week") { const s = new Date(today); s.setDate(today.getDate() - ((today.getDay() + 6) % 7)); const e = new Date(s); e.setDate(s.getDate() + 7); return { from: s, to: e }; }
  if (r === "next7") { const e = new Date(today); e.setDate(today.getDate() + 7); return { from: today, to: e }; }
  if (r === "month") return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: new Date(today.getFullYear(), today.getMonth() + 1, 1) };
  const f = parseLocalDate(from), t = parseLocalDate(to);
  if (!f || !t) return null;
  const [a, b] = f <= t ? [f, t] : [t, f];
  const e = new Date(b); e.setDate(e.getDate() + 1);
  return { from: a, to: e };
}

export function inRange(iso: string | null | undefined, b: { from: Date; to: Date } | null) {
  if (!b) return true;
  if (!iso) return false;
  const d = new Date(iso);
  return d >= b.from && d < b.to;
}
