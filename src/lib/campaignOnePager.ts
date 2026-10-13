import { formatPostId } from "@/components/tracking/PostTracking";

const ANGLES = ["Data-Driven Insight", "Founder Story", "Bold Contrarian Take"];

/** Returns the strategic angle stored in a post's campaign pillar, if any. */
export function angleOf(p: { campaign_pillar?: string | null }) {
  return ANGLES.find((a) => p.campaign_pillar?.endsWith(`· ${a}`)) ?? null;
}

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

function latestScore(p: any): number | null {
  const r = [...(p.preflight_reviews ?? [])].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))[0];
  return r?.motive_score ?? null;
}

/**
 * Opens a print-ready one-page campaign summary; the browser's print dialog offers "Save as PDF".
 * Must be called directly from a click handler so the popup isn't blocked.
 */
export function printOnePager(brief: any, masters: any[]) {
  const w = window.open("", "_blank");
  if (!w) return;
  const posts = masters.flatMap((m) => m.post_cards ?? [])
    .sort((a: any, b: any) => (a.scheduled_for ?? "9").localeCompare(b.scheduled_for ?? "9"));
  const scores = posts.map(latestScore).filter((s): s is number => s != null);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const rows = posts.map((p: any) => {
    const s = latestScore(p);
    const id = (() => { try { return p.post_number ? formatPostId(p.post_number) : ""; } catch { return ""; } })();
    return `<tr><td>${p.scheduled_for ? new Date(p.scheduled_for).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}</td>
      <td>${esc(p.platform)} · ${esc(p.content_type)}${id ? ` <span class="m">${id}</span>` : ""}</td>
      <td>${esc(angleOf(p) ?? "")}</td>
      <td class="copy">${esc((p.draft_copy ?? "").split("\n")[0].slice(0, 110))}</td>
      <td>${esc(String(p.approval_status).replace("_", " "))}</td>
      <td class="n">${s ?? "—"}</td></tr>`;
  }).join("");
  const proof = (brief.proof_points ?? []).filter(Boolean).map((x: string) => `<li>${esc(x)}</li>`).join("");
  w.document.write(`<!doctype html><html><head><title>${esc(brief.title)} — Campaign one-pager</title>
<style>
@page{size:Letter;margin:12mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:Inter,system-ui,sans-serif;color:#0f172a;margin:0;font-size:11px;line-height:1.45}
header{background:#0f172a;color:#f8fafc;padding:18px 22px;border-radius:10px}
header h1{font-family:'Space Grotesk',Inter,sans-serif;font-size:22px;margin:4px 0 2px}
.k{font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#5eead4}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}
.c{border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;break-inside:avoid}
.c h3{margin:0 0 4px;font-size:9px;font-family:'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:.1em;color:#64748b}
.wide{grid-column:span 2}.stats{display:flex;gap:10px}.stats .c{flex:1;text-align:center}.stats b{display:block;font-size:20px;font-family:'Space Grotesk',sans-serif}
table{width:100%;border-collapse:collapse;margin-top:6px}th,td{text-align:left;padding:5px 6px;border-bottom:1px solid #e2e8f0;vertical-align:top}
th{font-size:9px;text-transform:uppercase;color:#64748b;letter-spacing:.08em}tr{break-inside:avoid}.n{text-align:right;font-weight:600}.copy{color:#334155}.m{font-family:monospace;color:#64748b}
ul{margin:0;padding-left:16px}footer{margin-top:12px;color:#94a3b8;font-size:9px}
</style></head><body>
<header><div class="k">SocialMotive · Campaign one-pager · v${esc(brief.version)}</div><h1>${esc(brief.title)}</h1><div>${esc(brief.core_message)}</div></header>
<div class="grid">
<div class="c"><h3>Objective</h3>${esc(brief.objective)}</div>
<div class="c"><h3>Audience</h3>${esc(brief.target_audience)}</div>
<div class="c"><h3>Primary CTA</h3>${esc(brief.primary_cta)}${brief.destination_url ? `<br><span class="m">${esc(brief.destination_url)}</span>` : ""}</div>
<div class="c"><h3>Success metric · Timing</h3>${esc(brief.success_metric)}${brief.timing_window ? ` · ${esc(brief.timing_window)}` : ""}</div>
${proof ? `<div class="c wide"><h3>Proof points</h3><ul>${proof}</ul></div>` : ""}
</div>
<div class="stats"><div class="c"><h3>Posts</h3><b>${posts.length}</b></div>
<div class="c"><h3>Channels</h3><b>${new Set(posts.map((p: any) => p.platform)).size}</b></div>
<div class="c"><h3>Approved / posted</h3><b>${posts.filter((p: any) => ["approved", "exported", "posted"].includes(p.approval_status)).length}</b></div>
<div class="c"><h3>Avg Motive Score™</h3><b>${avg ?? "—"}</b></div></div>
<div class="c" style="margin-top:10px"><h3>Post lineup</h3><table><thead><tr><th>Date</th><th>Channel</th><th>Angle</th><th>Hook</th><th>Status</th><th class="n">Score</th></tr></thead><tbody>${rows || `<tr><td colspan="6">No posts generated yet.</td></tr>`}</tbody></table></div>
<footer>Generated ${new Date().toLocaleString()} · Every post traces to this approved brief.</footer>
<script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
  w.document.close();
}
