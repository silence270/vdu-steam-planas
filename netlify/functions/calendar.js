// Kalendoriaus „feed" (.ics) — išveda tvarkaraščio pamainas, kad Outlook
// (ar bet koks kalendorius) galėtų jas rodyti pagal nuorodą. Tik skaitymui.
// Duomenys imami per Supabase RPC „calendar_feed", apsaugotą slaptu raktu
// (CAL_TOKEN — Netlify aplinkos kintamasis, NĖRA repozitorijoje).

const SUPABASE_URL = "https://wiqvozhvfcxnvfoljjlu.supabase.co";
const ANON = "sb_publishable_277nGapf-HJ6EIvJQRLvyw_Xq0o_pph";

function pad(n) { return String(n).padStart(2, "0"); }

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/\\/g, "\\\\").replace(/;/g, "\\;")
    .replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function dt(dateStr, timeStr) {
  // "2026-06-16","08:00:00" -> "20260616T080000"
  var d = String(dateStr).slice(0, 10).replace(/-/g, "");
  var t = String(timeStr || "00:00:00").slice(0, 8).replace(/:/g, "");
  return d + "T" + (t.length === 6 ? t : (t + "0000").slice(0, 6));
}

exports.handler = async function (event) {
  var given = (event.queryStringParameters && event.queryStringParameters.token) || "";
  var rows = [];
  try {
    var res = await fetch(SUPABASE_URL + "/rest/v1/rpc/calendar_feed", {
      method: "POST",
      headers: { apikey: ANON, Authorization: "Bearer " + ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ p_token: given })
    });
    var data = await res.json();
    if (Array.isArray(data)) rows = data;
  } catch (e) { rows = []; }

  var now = new Date();
  var stamp = now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate()) +
    "T" + pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds()) + "Z";

  var ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//VDU STEAM//planas//LT",
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:VDU STEAM planas", "X-WR-TIMEZONE:Europe/Vilnius",
    "BEGIN:VTIMEZONE", "TZID:Europe/Vilnius",
    "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0300", "TZNAME:EEST",
    "DTSTART:19700329T030000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
    "BEGIN:STANDARD", "TZOFFSETFROM:+0300", "TZOFFSETTO:+0200", "TZNAME:EET",
    "DTSTART:19701025T040000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
    "END:VTIMEZONE"
  ];

  rows.forEach(function (r) {
    var summary = r.darbuotojas + (r.pastaba ? " — " + r.pastaba : "");
    ics.push("BEGIN:VEVENT");
    ics.push("UID:" + (r.id || (r.data + r.nuo + r.darbuotojas)) + "@vdu-steam-planas");
    ics.push("DTSTAMP:" + stamp);
    ics.push("DTSTART;TZID=Europe/Vilnius:" + dt(r.data, r.nuo));
    ics.push("DTEND;TZID=Europe/Vilnius:" + dt(r.data, r.iki));
    ics.push("SUMMARY:" + esc(summary));
    ics.push("END:VEVENT");
  });
  ics.push("END:VCALENDAR");

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "inline; filename=steam.ics",
      "Cache-Control": "public, max-age=300"
    },
    body: ics.join("\r\n")
  };
};
