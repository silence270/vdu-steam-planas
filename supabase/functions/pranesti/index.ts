// ============================================================
// Supabase Edge Function: „pranesti"
//
// Paskirtis: kai į lentelę public.pranesimai įrašoma nauja eilutė
// (per Database Webhook), šis kodas gavėjui išsiunčia:
//   1) el. laišką (per Resend) — jei nustatytas RESEND_API_KEY;
//   2) telefono push pranešimą (Web Push / VAPID) — jei nustatytas
//      VAPID_KEYS ir žmogus įsijungęs push savo įrenginyje.
//
// Veikia PER SUPABASE (ne Netlify), tad nepriklauso nuo Netlify deploy.
// Diegimas ir „secrets" — žr. DIEGIMAS-PRANESIMAI.md.
//
// Push siuntimui naudojama „@negrel/webpush" (Web Crypto, veikia Deno /
// Supabase Edge aplinkoje; npm:web-push čia nepatikimas).
//
// Reikalingi „secrets" (Supabase → Edge Functions → Secrets):
//   VAPID_KEYS    — JWKS JSON ({publicKey, privateKey}); žr. DIEGIMAS-PRANESIMAI.md
//   VAPID_SUBJECT — pvz. "mailto:steam@vdu.lt"
//   RESEND_API_KEY  (nebūtina; be jo el. laiškų nebus)
//   RESEND_FROM     (pvz. "VDU STEAM planas <pranesimai@tavo-domenas.lt>")
//   WEBHOOK_SECRET  (nebūtina; jei nustatyta — tikrinamas header x-webhook-secret)
// SUPABASE_URL ir SUPABASE_SERVICE_ROLE_KEY įdedami automatiškai.
// ============================================================

import * as webpush from "jsr:@negrel/webpush@^0.5.0";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const RESEND_FROM = Deno.env.get("RESEND_FROM") || "VDU STEAM planas <onboarding@resend.dev>";
const VAPID_KEYS_JSON = Deno.env.get("VAPID_KEYS") || "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:steam@vdu.lt";
const HOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") || "";

// Push „application server" — kuriamas vieną kartą (lazy).
let appServerPromise: Promise<any> | null = null;
function getAppServer(): Promise<any> | null {
  if (!VAPID_KEYS_JSON) return null;
  if (!appServerPromise) {
    appServerPromise = (async () => {
      const vapidKeys = await webpush.importVapidKeys(JSON.parse(VAPID_KEYS_JSON), { extractable: false });
      return await webpush.ApplicationServer.new({
        contactInformation: VAPID_SUBJECT,
        vapidKeys,
      });
    })();
  }
  return appServerPromise;
}

function sbHeaders() {
  return {
    apikey: SERVICE,
    Authorization: "Bearer " + SERVICE,
    "Content-Type": "application/json",
  };
}

function escapeHtml(s: string) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function errStatus(err: any): number {
  if (!err) return 0;
  return (err.response && err.response.status) || err.statusCode || err.status || 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok", { status: 200 });

  // (nebūtinas) bendro slaptažodžio tikrinimas
  if (HOOK_SECRET && req.headers.get("x-webhook-secret") !== HOOK_SECRET) {
    return new Response("forbidden", { status: 401 });
  }

  let body: any = {};
  try { body = await req.json(); } catch { return new Response("bad json", { status: 200 }); }

  const rec = body.record;
  if (body.type !== "INSERT" || body.table !== "pranesimai" || !rec) {
    return new Response(JSON.stringify({ ignored: true }), { status: 200 });
  }

  const empId: string = rec.darbuotojas_id;
  const tekstas: string = rec.tekstas || "Naujas pranešimas";
  const vaizdas: string = rec.vaizdas || "darbai";
  const results: Record<string, unknown> = { email: "skip", push: 0, pushFail: 0 };

  // 1) gavėjo el. paštas
  let email = "";
  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/darbuotojai?id=eq.${empId}&select=email`,
      { headers: sbHeaders() },
    );
    const d = await r.json();
    if (Array.isArray(d) && d[0]) email = d[0].email || "";
  } catch (_e) { /* ignore */ }

  // 2) el. laiškas (Resend)
  if (RESEND && email) {
    try {
      const er = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + RESEND, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: [email],
          subject: "VDU STEAM planas: " + tekstas.slice(0, 90),
          text: tekstas + "\n\n— VDU STEAM planas",
          html: `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;line-height:1.5">
  <p>${escapeHtml(tekstas)}</p>
  <p style="color:#888;font-size:13px">— VDU STEAM planas</p>
</div>`,
        }),
      });
      results.email = er.ok ? "sent" : ("err " + er.status);
    } catch (_e) { results.email = "err"; }
  }

  // 3) telefono push (visiems šio darbuotojo įrenginiams)
  const appServer = getAppServer();
  if (appServer) {
    try {
      const server = await appServer;
      const r = await fetch(
        `${SB_URL}/rest/v1/push_subscriptions?darbuotojas_id=eq.${empId}&select=endpoint,p256dh,auth`,
        { headers: sbHeaders() },
      );
      const subs = await r.json();
      if (Array.isArray(subs)) {
        const payload = JSON.stringify({
          title: "VDU STEAM planas",
          body: tekstas,
          url: "./",
          tag: "steam-" + vaizdas,
        });
        for (const s of subs) {
          try {
            const subscriber = server.subscribe({
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth },
            });
            await subscriber.pushTextMessage(payload, {});
            results.push = (results.push as number) + 1;
          } catch (err) {
            results.pushFail = (results.pushFail as number) + 1;
            const code = errStatus(err);
            // Negaliojanti / pasibaigusi prenumerata — pašalinam
            if (code === 404 || code === 410) {
              await fetch(
                `${SB_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(s.endpoint)}`,
                { method: "DELETE", headers: sbHeaders() },
              );
            }
          }
        }
      }
    } catch (_e) { /* ignore */ }
  }

  return new Response(JSON.stringify(results), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
