// ============================================================
// Supabase Edge Function: „kalendorius" — .ics sklaida (Outlook/Google).
//
// Pakeičia buvusią Netlify funkciją netlify/functions/calendar.js, kad
// frontend'ą būtų galima talpinti bet kur (Netlify drag-drop, Cloudflare,
// GitHub Pages) be serverio funkcijos. Duomenys imami per tą patį
// Supabase RPC „calendar_feed", apsaugotą slaptu raktu (?token=...).
//
// SVARBU diegiant: IŠJUNK „Verify JWT" (verify_jwt = false) šiai funkcijai —
// Outlook/Google nesiunčia Supabase rakto, todėl su JWT tikrinimu gautų 401.
//
// Naujas prenumeratos adresas (vietoj seno Netlify /kalendorius.ics):
//   https://wiqvozhvfcxnvfoljjlu.supabase.co/functions/v1/kalendorius?token=RAKTAS
// ============================================================

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function pad(n: number) { return String(n).padStart(2, "0"); }

function esc(s: unknown) {
  return String(s == null ? "" : s)
    .replace(/\\/g, "\\\\").replace(/;/g, "\\;")
    .replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function dt(dateStr: string, timeStr: string) {
  // "2026-06-16","08:00:00" -> "20260616T080000"
  const d = String(dateStr).slice(0, 10).replace(/-/g, "");
  const t = String(timeStr || "00:00:00").slice(0, 8).replace(/:/g, "");
  return d + "T" + (t.length === 6 ? t : (t + "0000").slice(0, 6));
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";

  let rows: any[] = [];
  try {
    const res = await fetch(SB_URL + "/rest/v1/rpc/calendar_feed", {
      method: "POST",
      headers: { apikey: SERVICE, Authorization: "Bearer " + SERVICE, "Content-Type": "application/json" },
      body: JSON.stringify({ p_token: token }),
    });
    const data = await res.json();
    if (Array.isArray(data)) rows = data;
  } catch (_e) { rows = []; }

  const now = new Date();
  const stamp = now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate()) +
    "T" + pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds()) + "Z";

  const ics: string[] = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//VDU STEAM//planas//LT",
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:VDU STEAM planas", "X-WR-TIMEZONE:Europe/Vilnius",
    "BEGIN:VTIMEZONE", "TZID:Europe/Vilnius",
    "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0300", "TZNAME:EEST",
    "DTSTART:19700329T030000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
    "BEGIN:STANDARD", "TZOFFSETFROM:+0300", "TZOFFSETTO:+0200", "TZNAME:EET",
    "DTSTART:19701025T040000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
    "END:VTIMEZONE",
  ];

  rows.forEach((r) => {
    const summary = r.darbuotojas + (r.pastaba ? " — " + r.pastaba : "");
    ics.push("BEGIN:VEVENT");
    ics.push("UID:" + (r.id || (r.data + r.nuo + r.darbuotojas)) + "@vdu-steam-planas");
    ics.push("DTSTAMP:" + stamp);
    ics.push("DTSTART;TZID=Europe/Vilnius:" + dt(r.data, r.nuo));
    ics.push("DTEND;TZID=Europe/Vilnius:" + dt(r.data, r.iki));
    ics.push("SUMMARY:" + esc(summary));
    ics.push("END:VEVENT");
  });
  ics.push("END:VCALENDAR");

  return new Response(ics.join("\r\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "inline; filename=steam.ics",
      "Cache-Control": "public, max-age=300",
    },
  });
});
