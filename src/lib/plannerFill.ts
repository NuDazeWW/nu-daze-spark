/** Pure helpers for the Content Planner: week coverage and auto-fill of approved posts into open slots. */
import { addDays, startOfWeek, format } from "date-fns";

export type PlanPost = { id: string; platform: string; content_type: string; scheduled_for: string | null };
export type CadenceTarget = { platform: string; content_type: string; weekly_target: number };
export type Assignment = { id: string; scheduled_for: string };

export const DEFAULT_HOUR: Record<string, number> = { linkedin: 9, instagram: 12, facebook: 15 };

export const weekStart = (d: Date) => startOfWeek(d, { weekStartsOn: 1 });
export const weekKey = (d: Date) => format(weekStart(d), "yyyy-MM-dd");
const targetKey = (p: string, t: string) => `${p}|${t}`;

/** Count scheduled posts per week per platform|type. */
export function weekCounts(posts: PlanPost[]) {
  const map = new Map<string, Map<string, number>>();
  for (const p of posts) {
    if (!p.scheduled_for) continue;
    const wk = weekKey(new Date(p.scheduled_for));
    const inner = map.get(wk) ?? new Map<string, number>();
    const k = targetKey(p.platform, p.content_type);
    inner.set(k, (inner.get(k) ?? 0) + 1);
    map.set(wk, inner);
  }
  return map;
}

export type Coverage = { key: string; platform: string; content_type: string; have: number; target: number }[];

export function weekCoverage(posts: PlanPost[], targets: CadenceTarget[], week: Date): Coverage {
  const counts = weekCounts(posts).get(weekKey(week)) ?? new Map();
  return targets
    .filter((t) => t.weekly_target > 0)
    .map((t) => ({ key: targetKey(t.platform, t.content_type), platform: t.platform, content_type: t.content_type,
      have: counts.get(targetKey(t.platform, t.content_type)) ?? 0, target: t.weekly_target }));
}

export function coverageTone(c: Coverage): "full" | "partial" | "empty" | "none" {
  if (!c.length) return "none";
  const have = c.reduce((s, x) => s + Math.min(x.have, x.target), 0);
  const need = c.reduce((s, x) => s + x.target, 0);
  if (have >= need) return "full";
  return have === 0 ? "empty" : "partial";
}

/**
 * Propose dates for unscheduled posts. Round-robins across weeks with gaps so stock is spread evenly,
 * never places two posts of the same platform in the same slot, and never schedules before `from`.
 */
export function proposeFill(opts: {
  pool: PlanPost[]; scheduled: PlanPost[]; targets: CadenceTarget[]; from: Date; to: Date;
}): Assignment[] {
  const { pool, scheduled, targets, from, to } = opts;
  const counts = weekCounts(scheduled);
  const taken = new Set(scheduled.filter((p) => p.scheduled_for).map((p) => slotKey(p.platform, new Date(p.scheduled_for!))));
  const weeks: Date[] = [];
  for (let w = weekStart(from); w <= to; w = addDays(w, 7)) weeks.push(w);

  const byTarget = new Map<string, PlanPost[]>();
  for (const p of pool) {
    const k = targetKey(p.platform, p.content_type);
    byTarget.set(k, [...(byTarget.get(k) ?? []), p]);
  }

  const out: Assignment[] = [];
  for (const t of targets.filter((x) => x.weekly_target > 0)) {
    const k = targetKey(t.platform, t.content_type);
    const queue = [...(byTarget.get(k) ?? [])];
    const placed = new Map<string, number>();
    let progressed = true;
    while (queue.length && progressed) {
      progressed = false;
      for (const w of weeks) {
        if (!queue.length) break;
        const wk = format(w, "yyyy-MM-dd");
        const have = (counts.get(wk)?.get(k) ?? 0) + (placed.get(wk) ?? 0);
        if (have >= t.weekly_target) continue;
        const date = pickSlot(w, have, t.weekly_target, t.platform, taken, from, to);
        if (!date) continue;
        const post = queue.shift()!;
        taken.add(slotKey(t.platform, date));
        placed.set(wk, (placed.get(wk) ?? 0) + 1);
        out.push({ id: post.id, scheduled_for: date.toISOString() });
        progressed = true;
      }
    }
  }
  return out;
}

function slotKey(platform: string, d: Date) {
  return `${platform}|${format(d, "yyyy-MM-dd-HH")}`;
}

function pickSlot(week: Date, index: number, target: number, platform: string, taken: Set<string>, from: Date, to: Date) {
  const span = target <= 5 ? 5 : 7; // weekdays for light cadences
  const base = DEFAULT_HOUR[platform] ?? 10;
  const preferred = Math.floor((index * span) / target);
  for (let i = 0; i < 7; i++) {
    const day = addDays(week, (preferred + i) % 7);
    for (let h = 0; h < 10; h++) {
      const d = new Date(day);
      d.setHours(base + h, 0, 0, 0);
      if (d < from || d > to) continue;
      if (!taken.has(slotKey(platform, d))) return d;
    }
  }
  return null;
}
