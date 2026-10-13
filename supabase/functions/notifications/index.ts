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
]);

type Provider = {
  provider: string; from_email: string | null; from_name: string | null; smtp_host: string | null;
  smtp_port: number | null; smtp_secure: boolean; smtp_username: string | null;
};

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const APP_URL = "https://socialmotive.nudaze.com";

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
            .gte("scheduled_for", start).lt("scheduled_for", end).neq("approval_status", "archived").order("scheduled_for");
          const list = (posts ?? []).filter((p) => inScope(p.client_id));
          const yStart = new Date(new Date(start).getTime() - 86400000).toISOString();
          const { data: missed } = await admin.from("post_cards").select("id,post_number,platform,client_id")
            .gte("scheduled_for", yStart).lt("scheduled_for", start).in("approval_status", ["approved", "exported"]);
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
    // Post went out
    if (pref.post_went_out) {
      const since = new Date(Math.max(Date.now() - 86400000, new Date(pref.created_at).getTime())).toISOString();
      const { data: posted } = await admin.from("post_cards").select("id,post_number,platform,content_type,client_id,posted_url,posted_at")
        .eq("approval_status", "posted").gte("posted_at", since);
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
