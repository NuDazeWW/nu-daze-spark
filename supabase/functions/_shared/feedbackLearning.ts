// Builds a prompt block from real reviewer feedback and logged post results for one client,
// so new drafts avoid repeated revision requests and lean toward what performed.
// Only stored data is used — nothing is inferred or invented.
// deno-lint-ignore no-explicit-any
export async function buildLearningBlock(sb: any, clientId: string | null): Promise<string> {
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  let rev = sb.from("approval_log").select("notes, post_card_id, created_at, post_cards!inner(client_id)").eq("action", "needs_revision")
    .not("notes", "is", null).gte("created_at", since).order("created_at", { ascending: false }).limit(12);
  if (clientId) rev = rev.eq("post_cards.client_id", clientId);
  const { data: notes } = await rev;
  let res = sb.from("post_results").select("post_card_id, impressions, reactions, comments, shares, clicks, saves")
    .gte("recorded_at", since).order("recorded_at", { ascending: false }).limit(200);
  if (clientId) res = res.eq("client_id", clientId);
  const { data: results } = await res;

  // Latest result per post, ranked by engagement.
  const latest = new Map<string, any>();
  for (const r of results ?? []) if (!latest.has(r.post_card_id)) latest.set(r.post_card_id, r);
  const ranked = [...latest.values()]
    .map((r) => ({ id: r.post_card_id, eng: r.reactions + r.comments * 2 + r.shares * 3 + r.clicks + r.saves * 2, imp: r.impressions }))
    .filter((r) => r.eng > 0).sort((a, b) => b.eng - a.eng).slice(0, 3);
  let top: any[] = [];
  if (ranked.length) {
    const { data } = await sb.from("post_cards").select("id, platform, content_type, draft_copy").in("id", ranked.map((r) => r.id));
    top = ranked.map((r) => ({ ...r, post: (data ?? []).find((p: any) => p.id === r.id) })).filter((r) => r.post);
  }
  let briefRev = sb.from("brief_approval_log").select("notes").eq("action", "needs_revision").not("notes", "is", null)
    .gte("created_at", since).order("created_at", { ascending: false }).limit(6);
  if (clientId) briefRev = briefRev.eq("client_id", clientId);
  const { data: briefNotes } = await briefRev;
  const noteLines = [...(notes ?? []), ...(briefNotes ?? [])].map((n: any) => String(n.notes).trim()).filter((n: string) => n.length > 3).slice(0, 10);
  if (!noteLines.length && !top.length) return "";
  return `
LEARNED FROM THIS TEAM'S FEEDBACK (apply, do not quote)
${noteLines.length ? `Recent revision requests from reviewers — avoid repeating these problems:\n${noteLines.map((n: string) => `- ${n.slice(0, 240)}`).join("\n")}` : ""}
${top.length ? `Best-performing posted content (logged results) — match its qualities, not its wording:\n${top.map((t) => `- [${t.post.platform} ${t.post.content_type}, ${t.imp} impressions] ${String(t.post.draft_copy).slice(0, 200)}`).join("\n")}` : ""}`;
}
