import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const PRESETS: Record<string, { host: string; port: number; secure: boolean }> = {
  gmail: { host: "smtp.gmail.com", port: 465, secure: true },
  outlook: { host: "smtp.office365.com", port: 587, secure: false },
  yahoo: { host: "smtp.mail.yahoo.com", port: 465, secure: true },
  apple: { host: "smtp.mail.me.com", port: 587, secure: false },
};

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save_provider"),
    provider: z.enum(["sendgrid", "gmail", "outlook", "yahoo", "apple", "smtp"]),
    from_email: z.string().email().max(255),
    from_name: z.string().max(120).optional().default("SocialMotive"),
    smtp_host: z.string().max(255).optional(),
    smtp_port: z.number().int().min(1).max(65535).optional(),
    smtp_secure: z.boolean().optional(),
    smtp_username: z.string().max(255).optional(),
    secret: z.string().min(1).max(2000).optional(),
  }),
  z.object({ action: z.literal("disconnect") }),
  z.object({ action: z.literal("test"), to: z.string().email().max(255) }),
  z.object({ action: z.literal("run") }),
  z.object({ action: z.literal("brief_event"), brief_id: z.string().uuid(), event: z.enum(["submitted", "needs_revision", "approved"]) }),
]);

type Provider = {
  provider: string; from_email: string | null; from_name: string | null; smtp_host: string | null;
  smtp_port: number | null; smtp_secure: boolean; smtp_username: string | null;
};

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
let APP_URL = "https://socialmotive.nudaze.com";
async function loadAppUrl() {
  const { data } = await admin.from("workspace_settings").select("app_domain").eq("id", true).maybeSingle();
  const d = String(data?.app_domain ?? "").trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (d) APP_URL = `https://${d}`;
}

async function sendMail(p: Provider, secret: string, to: string, subject: string, html: string, text: string) {
  const fromName = p.from_name || "SocialMotive";
  if (p.provider === "sendgrid") {
    const r = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: p.from_email, name: fromName },
        subject,
        content: [{ type: "text/plain", value: text }, { type: "text/html", value: html }],
      }),
    });
    if (!r.ok) throw new Error(`SendGrid [${r.status}]: ${await r.text()}`);
    return;
  }
  const preset = PRESETS[p.provider];
  const host = preset?.host ?? p.smtp_host;
  const port = preset?.port ?? p.smtp_port ?? 587;
  const secure = preset?.secure ?? p.smtp_secure;
  if (!host) throw new Error("No mail server host configured");
  const client = new SMTPClient({
    connection: { hostname: host, port, tls: secure, auth: { username: p.smtp_username || p.from_email!, password: secret } },
  });
  try {
    await client.send({ from: `${fromName} <${p.from_email}>`, to, subject, content: text, html });
  } finally {
    await client.close().catch(() => {});
  }
}

async function loadProvider() {
  const { data: p } = await admin.from("email_provider_settings").select("*").eq("id", true).maybeSingle();
  const { data: s } = await admin.from("email_provider_secrets").select("secret").eq("id", true).maybeSingle();
  if (!p || p.provider === "none" || !s?.secret || !p.from_email) return null;
  return { p: p as Provider, secret: s.secret as string };
}

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const sm = (n: number | null) => (n ? `SM-${String(n).padStart(4, "0")}` : "SM-—");
const shell = (title: string, inner: string) => `<div style="font-family:Arial,sans-serif;background:#ffffff;color:#241B2E;padding:24px;max-width:600px">
<p style="font-size:12px;letter-spacing:1px;color:#71677C;margin:0 0 8px">SOCIALMOTIVE</p>
<h1 style="font-size:20px;margin:0 0 16px">${esc(title)}</h1>${inner}
<p style="font-size:12px;color:#71677C;margin-top:24px">You get this because notifications are on for your address. <a href="${APP_URL}/settings/notifications" style="color:#71677C">Manage notification settings</a>.</p></div>`;

async function logSend(row: Record<string, unknown>) {
  await admin.from("notification_log").insert(row);
}

function localParts(tz: string) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  const parts = Object.fromEntries(f.formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: (Number(parts.hour) % 24) * 60 + Number(parts.minute) };
}

// Start/end of a local calendar date in UTC, computed via offset at noon.
function dayRangeUtc(date: string, tz: string) {
  const noon = new Date(`${date}T12:00:00Z`);
  const local = new Date(noon.toLocaleString("en-US", { timeZone: tz }));
  const offsetMs = local.getTime() - noon.getTime();
  const start = new Date(new Date(`${date}T00:00:00Z`).getTime() - offsetMs);
  return { start: start.toISOString(), end: new Date(start.getTime() + 86400000).toISOString() };
}

async function runDue() {
  const prov = await loadProvider();
  if (prov && (prov.p as Provider & { sending_paused?: boolean }).sending_paused) return { sent: 0, paused: true };
  if (!prov) return { skipped: "no provider" };
  await loadAppUrl();
  const { data: prefs } = await admin.from("notification_preferences").select("*").eq("is_active", true);
  const { data: clients } = await admin.from("clients").select("id,name");
  const cname = new Map((clients ?? []).map((c) => [c.id, c.name]));
  let sent = 0;
  for (const pref of prefs ?? []) {
    const ids: string[] = pref.client_ids ?? [];
    const inScope = (cid: string | null) => !ids.length || (cid && ids.includes(cid));
    // Daily digest
    if (pref.daily_digest) {
      const { date, minutes } = localParts(pref.time_zone);
      const [h, m] = String(pref.send_time).split(":").map(Number);
      const key = `digest:${pref.id}:${date}`;
      if (minutes >= h * 60 + m) {
        const { data: done } = await admin.from("notification_log").select("id").eq("dedupe_key", key).maybeSingle();
        if (!done) {
          const { start, end } = dayRangeUtc(date, pref.time_zone);
          const { data: posts } = await admin.from("post_cards")
            .select("id,post_number,platform,content_type,scheduled_for,approval_status,client_id,draft_copy")
            .eq("is_sample", false).gte("scheduled_for", start).lt("scheduled_for", end).neq("approval_status", "archived").order("scheduled_for");
          const list = (posts ?? []).filter((p) => inScope(p.client_id));
          const yStart = new Date(new Date(start).getTime() - 86400000).toISOString();
          const { data: missed } = await admin.from("post_cards").select("id,post_number,platform,client_id")
            .eq("is_sample", false).gte("scheduled_for", yStart).lt("scheduled_for", start).in("approval_status", ["approved", "exported"]);
          const missedList = (missed ?? []).filter((p) => inScope(p.client_id));
          if (list.length || missedList.length) {
            const fmt = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { timeZone: pref.time_zone, hour: "numeric", minute: "2-digit" });
            const rows = list.map((p) => `<tr><td style="padding:6px 8px;font-family:monospace">${sm(p.post_number)}</td><td style="padding:6px 8px">${esc(fmt(p.scheduled_for!))}</td><td style="padding:6px 8px">${esc(p.platform)} ${esc(p.content_type)}</td><td style="padding:6px 8px">${esc(cname.get(p.client_id) ?? "")}</td><td style="padding:6px 8px">${esc(p.approval_status)}</td><td style="padding:6px 8px"><a href="${APP_URL}/queue?post=${p.id}">Open</a></td></tr>`).join("");
            const missedHtml = missedList.length ? `<p style="margin-top:16px"><strong>Not yet marked posted from yesterday:</strong> ${missedList.map((p) => `<a href="${APP_URL}/queue?post=${p.id}">${sm(p.post_number)}</a>`).join(", ")}</p>` : "";
            const html = shell(`${list.length} post${list.length === 1 ? "" : "s"} scheduled today`,
              (list.length ? `<table style="border-collapse:collapse;font-size:13px;width:100%">${rows}</table>` : "<p>Nothing scheduled today.</p>") + missedHtml);
            const text = list.map((p) => `${sm(p.post_number)} ${fmt(p.scheduled_for!)} ${p.platform} ${p.content_type} — ${cname.get(p.client_id) ?? ""} (${p.approval_status})`).join("\n");
            try {
              await sendMail(prov.p, prov.secret, pref.recipient_email, `Today: ${list.length} scheduled post${list.length === 1 ? "" : "s"}`, html, text || "Nothing scheduled today.");
              await logSend({ preference_id: pref.id, recipient_email: pref.recipient_email, kind: "daily_digest", dedupe_key: key, ok: true });
              sent++;
            } catch (e) {
              await logSend({ preference_id: pref.id, recipient_email: pref.recipient_email, kind: "daily_digest", dedupe_key: key, ok: false, error: String((e as Error).message).slice(0, 1000) });
            }
          } else {
            await logSend({ preference_id: pref.id, recipient_email: pref.recipient_email, kind: "daily_digest", dedupe_key: key, ok: true, error: "nothing scheduled" });
          }
        }
      }
    }
    // Weekly summary (Mondays, at the same morning hour)
    if (pref.weekly_summary) {
      const { date, minutes } = localParts(pref.time_zone);
      const [h, m] = String(pref.send_time).split(":").map(Number);
      const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
      const key = `weekly:${pref.id}:${date}`;
      if (dow === 1 && minutes >= h * 60 + m) {
        const { data: done } = await admin.from("notification_log").select("id").eq("dedupe_key", key).maybeSingle();
        if (!done) {
          const { start } = dayRangeUtc(date, pref.time_zone);
          const wStart = new Date(new Date(start).getTime() - 7 * 86400000).toISOString();
          const wNext = new Date(new Date(start).getTime() + 7 * 86400000).toISOString();
          const [{ data: posted }, { data: approvals }, { data: upcoming }, { data: results }] = await Promise.all([
            admin.from("post_cards").select("id,post_number,platform,client_id").eq("is_sample", false).eq("approval_status", "posted").gte("posted_at", wStart).lt("posted_at", start),
            admin.from("approval_log").select("action,post_cards!inner(client_id)").eq("post_cards.is_sample", false).gte("created_at", wStart).lt("created_at", start),
            admin.from("post_cards").select("id,client_id").eq("is_sample", false).gte("scheduled_for", start).lt("scheduled_for", wNext).neq("approval_status", "archived"),
            admin.from("post_results").select("post_card_id,client_id,impressions,reactions,comments,shares,clicks,saves").gte("recorded_at", wStart).lt("recorded_at", start),
          ]);
          const P = (posted ?? []).filter((p) => inScope(p.client_id));
          const A = (approvals ?? []).filter((a: any) => inScope(a.post_cards?.client_id));
          const U = (upcoming ?? []).filter((p) => inScope(p.client_id));
          const R = (results ?? []).filter((r) => inScope(r.client_id));
          const sum = (k: string) => R.reduce((t, r: any) => t + (r[k] ?? 0), 0);
          const approved = A.filter((a: any) => a.action === "approved").length;
          const revisions = A.filter((a: any) => a.action === "needs_revision").length;
          const row = (l: string, v: string | number) => `<tr><td style="padding:6px 8px">${esc(l)}</td><td style="padding:6px 8px;font-weight:bold;text-align:right">${esc(v)}</td></tr>`;
          const html = shell("Your week in SocialMotive", `<table style="border-collapse:collapse;font-size:14px;width:100%">${
            row("Posts that went out", P.length) + row("Approved", approved) + row("Sent back for revision", revisions) +
            row("Scheduled for the coming week", U.length) + row("Impressions logged", sum("impressions")) +
            row("Reactions + comments logged", sum("reactions") + sum("comments"))}</table>
            ${P.length ? `<p style="margin-top:16px">Posted: ${P.map((p) => `<a href="${APP_URL}/approved?post=${p.id}">${sm(p.post_number)}</a>`).join(", ")}</p>` : ""}
            <p><a href="${APP_URL}/publishing">Open Publishing Status</a></p>`);
          const text = `Last week: ${P.length} posted, ${approved} approved, ${revisions} sent back. ${U.length} scheduled next week. Impressions logged: ${sum("impressions")}.`;
          try {
            await sendMail(prov.p, prov.secret, pref.recipient_email, `Your week: ${P.length} posted, ${U.length} coming up`, html, text);
            await logSend({ preference_id: pref.id, recipient_email: pref.recipient_email, kind: "weekly_summary", dedupe_key: key, ok: true });
            sent++;
          } catch (e) {
            await logSend({ preference_id: pref.id, recipient_email: pref.recipient_email, kind: "weekly_summary", dedupe_key: key, ok: false, error: String((e as Error).message).slice(0, 1000) });
          }
        }
      }
    }
    // Publishing report (weekly on Mondays or monthly on the 1st, at the morning hour)
    if (pref.publishing_report) {
      const { date, minutes } = localParts(pref.time_zone);
      const [h, m] = String(pref.send_time).split(":").map(Number);
      const monthly = pref.report_frequency === "monthly";
      const due = monthly ? date.endsWith("-01") : new Date(`${date}T12:00:00Z`).getUTCDay() === 1;
      const key = `report:${pref.report_frequency}:${pref.id}:${date}`;
      if (due && minutes >= h * 60 + m) {
        const { data: done } = await admin.from("notification_log").select("id").eq("dedupe_key", key).maybeSingle();
        if (!done) {
          const { start } = dayRangeUtc(date, pref.time_zone);
          const from = new Date(new Date(start).getTime() - (monthly ? 30 : 7) * 86400000).toISOString();
          const [{ data: posts }, { data: results }] = await Promise.all([
            admin.from("post_cards").select("id,post_number,platform,client_id,publishing_status,delivery_status,approval_status,posted_at,scheduled_for")
              .eq("is_sample", false).or(`and(posted_at.gte.${from},posted_at.lt.${start}),and(scheduled_for.gte.${from},scheduled_for.lt.${start})`),
            admin.from("post_results").select("post_card_id,client_id,impressions,reactions,comments,shares,clicks,saves,recorded_at").gte("recorded_at", from).lt("recorded_at", start).order("recorded_at", { ascending: false }),
          ]);
          const P = (posts ?? []).filter((p) => inScope(p.client_id));
          const published = P.filter((p) => p.delivery_status === "platform_confirmed" || p.delivery_status === "manual_confirmed");
          const failed = P.filter((p) => p.publishing_status === "failed");
          const latest = new Map<string, any>();
          for (const r of (results ?? []).filter((r) => inScope(r.client_id))) if (!latest.has(r.post_card_id)) latest.set(r.post_card_id, r);
          const L = [...latest.values()];
          const sum = (k: string) => L.reduce((t, r) => t + (r[k] ?? 0), 0);
          const byPlat = new Map<string, number>();
          for (const p of published) byPlat.set(p.platform, (byPlat.get(p.platform) ?? 0) + 1);
          const row = (l: string, v: string | number) => `<tr><td style="padding:6px 8px">${esc(l)}</td><td style="padding:6px 8px;font-weight:bold;text-align:right">${esc(v)}</td></tr>`;
          const label = monthly ? "last 30 days" : "last 7 days";
          const html = shell(`Publishing report — ${label}`, `<table style="border-collapse:collapse;font-size:14px;width:100%">${
            row("Confirmed live or by hand", published.length) + row("Failed", failed.length) +
            [...byPlat].map(([k, v]) => row(`  ${k}`, v)).join("") +
            row("Impressions", sum("impressions")) + row("Reactions", sum("reactions")) + row("Comments", sum("comments")) +
            row("Shares", sum("shares")) + row("Clicks", sum("clicks")) + row("Saves", sum("saves"))}</table>
            ${failed.length ? `<p style="margin-top:16px">Needs attention: ${failed.map((p) => `<a href="${APP_URL}/publishing?post=${p.id}">${sm(p.post_number)}</a>`).join(", ")}</p>` : ""}
            <p><a href="${APP_URL}/publishing">Open Publishing Status to download the full PDF or CSV report</a></p>`);
          const text = `Publishing report (${label}): ${published.length} published, ${failed.length} failed, ${sum("impressions")} impressions logged.`;
          try {
            await sendMail(prov.p, prov.secret, pref.recipient_email, `Publishing report: ${published.length} published (${label})`, html, text);
            await logSend({ preference_id: pref.id, recipient_email: pref.recipient_email, kind: "publishing_report", dedupe_key: key, ok: true });
            sent++;
          } catch (e) {
            await logSend({ preference_id: pref.id, recipient_email: pref.recipient_email, kind: "publishing_report", dedupe_key: key, ok: false, error: String((e as Error).message).slice(0, 1000) });
          }
        }
      }
    }
    // Post went out
    if (pref.post_went_out) {
      const since = new Date(Math.max(Date.now() - 86400000, new Date(pref.created_at).getTime())).toISOString();
      const { data: posted } = await admin.from("post_cards").select("id,post_number,platform,content_type,client_id,posted_url,posted_at")
        .eq("is_sample", false).eq("confirmation_source", "platform").eq("approval_status", "posted").gte("posted_at", since);
      for (const p of (posted ?? []).filter((x) => inScope(x.client_id))) {
        const key = `posted:${pref.id}:${p.id}`;
        const { data: done } = await admin.from("notification_log").select("id").eq("dedupe_key", key).maybeSingle();
        if (done) continue;
        const link = p.posted_url ? `<p>Live post: <a href="${esc(p.posted_url)}">${esc(p.posted_url)}</a></p>` : "<p>No live link was saved.</p>";
        const html = shell(`${sm(p.post_number)} went out`, `<p>${esc(cname.get(p.client_id) ?? "")} · ${esc(p.platform)} ${esc(p.content_type)} was marked posted.</p>${link}<p><a href="${APP_URL}/approved?post=${p.id}">View in SocialMotive</a></p>`);
        try {
          await sendMail(prov.p, prov.secret, pref.recipient_email, `Posted: ${sm(p.post_number)} on ${p.platform}`, html, `${sm(p.post_number)} was marked posted. ${p.posted_url ?? ""}`);
          await logSend({ preference_id: pref.id, recipient_email: pref.recipient_email, kind: "post_went_out", dedupe_key: key, post_card_id: p.id, ok: true });
          sent++;
        } catch (e) {
          await logSend({ preference_id: pref.id, recipient_email: pref.recipient_email, kind: "post_went_out", dedupe_key: key, post_card_id: p.id, ok: false, error: String((e as Error).message).slice(0, 1000) });
        }
      }
    }
  }
  return { sent };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const body = parsed.data;

    // The scheduled run only sends already-due, de-duplicated notifications.
    if (body.action === "run") return json(await runDue());

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return json({ error: "Sign in required" }, 401);
    const { data: u, error: ue } = await admin.auth.getUser(token);
    if (ue || !u.user) return json({ error: "Sign in required" }, 401);
    const uid = u.user.id;
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });

    if (body.action === "test") {
      if (!isAdmin && body.to.toLowerCase() !== (u.user.email ?? "").toLowerCase()) return json({ error: "You can only send a test to your own address" }, 403);
      const prov = await loadProvider();
      if (!prov) return json({ error: "No email provider is connected yet. An admin can connect one in Settings › Email Provider." }, 400);
      try {
        await sendMail(prov.p, prov.secret, body.to, "SocialMotive test email", shell("Your notification email works", "<p>This is a test from SocialMotive.</p>"), "This is a test from SocialMotive.");
        if (isAdmin) await admin.from("email_provider_settings").update({ last_test_at: new Date().toISOString(), last_test_ok: true, last_test_error: null }).eq("id", true);
        return json({ ok: true });
      } catch (e) {
        const msg = String((e as Error).message);
        if (isAdmin) await admin.from("email_provider_settings").update({ last_test_at: new Date().toISOString(), last_test_ok: false, last_test_error: msg.slice(0, 1000) }).eq("id", true);
        return json({ error: msg }, 502);
      }
    }

    if (body.action === "brief_event") {
      // Only the three lifecycle events email anyone; recipients are derived server-side from the logged event.
      const { data: b } = await admin.from("campaign_briefs").select("id, title, client_id, created_by, assigned_approver_id").eq("id", body.brief_id).maybeSingle();
      if (!b) return json({ error: "Brief not found" }, 404);
      const { data: canSee } = await admin.rpc("user_can_access_client", { _user_id: uid, _client_id: b.client_id });
      if (!canSee) return json({ error: "Not allowed" }, 403);
      const { data: last } = await admin.from("brief_approval_log").select("action, notes, actor_id, created_at").eq("brief_id", b.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!last || last.action !== body.event || last.actor_id !== uid || Date.now() - new Date(last.created_at).getTime() > 10 * 60000) return json({ error: "No matching recent event" }, 400);
      let ids: string[] = [];
      if (body.event === "submitted") {
        if (b.assigned_approver_id) ids = [b.assigned_approver_id];
        else {
          const { data: r } = await admin.from("user_roles").select("user_id").in("role", ["reviewer", "admin"]);
          const all = [...new Set((r ?? []).map((x: any) => x.user_id))];
          for (const id of all) { const { data: ok } = await admin.rpc("user_can_access_client", { _user_id: id, _client_id: b.client_id }); if (ok) ids.push(id); }
        }
      } else ids = [b.created_by];
      ids = ids.filter((id) => id && id !== uid);
      const prov = await loadProvider();
      if (!prov || !ids.length) return json({ ok: true, sent: 0 });
      await loadAppUrl();
      const link = `${APP_URL}/campaign-briefs?brief=${b.id}`;
      const heading = body.event === "submitted" ? `Brief ready for your approval: ${b.title}` : body.event === "approved" ? `Brief approved: ${b.title}` : `Revisions requested: ${b.title}`;
      const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
      const note = last.notes ? `<p><strong>Notes:</strong> ${esc(last.notes)}</p>` : "";
      let sent = 0;
      for (const id of ids) {
        const { data: usr } = await admin.auth.admin.getUserById(id);
        const to = usr?.user?.email; if (!to) continue;
        try { await sendMail(prov.p, prov.secret, to, heading, shell(heading, `${note}<p><a href="${link}">Open the brief</a></p>`), `${heading}\n${last.notes ? `Notes: ${last.notes}\n` : ""}${link}`); sent++; }
        catch (e) { console.error("brief email failed", (e as Error).message); }
      }
      return json({ ok: true, sent });
    }

    if (!isAdmin) return json({ error: "Admin access required" }, 403);

    if (body.action === "disconnect") {
      await admin.from("email_provider_secrets").delete().eq("id", true);
      await admin.from("email_provider_settings").update({ provider: "none", connected_as: null, last_test_ok: null, last_test_error: null, updated_by: uid }).eq("id", true);
      return json({ ok: true });
    }

    // save_provider
    const { data: existing } = await admin.from("email_provider_secrets").select("id").eq("id", true).maybeSingle();
    if (!body.secret && !existing) return json({ error: "Enter the API key or app password" }, 400);
    if (body.provider === "smtp" && !body.smtp_host) return json({ error: "Enter the mail server host" }, 400);
    const preset = PRESETS[body.provider];
    await admin.from("email_provider_settings").update({
      provider: body.provider,
      from_email: body.from_email,
      from_name: body.from_name,
      smtp_host: body.provider === "sendgrid" ? null : preset?.host ?? body.smtp_host,
      smtp_port: body.provider === "sendgrid" ? null : preset?.port ?? body.smtp_port ?? 587,
      smtp_secure: preset?.secure ?? body.smtp_secure ?? true,
      smtp_username: body.provider === "sendgrid" ? null : body.smtp_username || body.from_email,
      connected_as: body.from_email,
      updated_by: uid,
      updated_at: new Date().toISOString(),
    }).eq("id", true);
    if (body.secret) await admin.from("email_provider_secrets").upsert({ id: true, secret: body.secret, updated_at: new Date().toISOString() });
    await admin.rpc("log_activity", { _action: "email_provider_saved", _target: body.provider, _details: {} }).then(() => {}, () => {});
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: String((e as Error).message) }, 500);
  }
});
