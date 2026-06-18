// Duomenų sluoksnis. Du režimai:
//  - "supabase": tikra duomenų bazė su prisijungimais ir gyvu atsinaujinimu
//  - "demo": duomenys saugomi tik šiame įrenginyje (localStorage), kol
//    config.js dar neįrašyti Supabase raktai
window.API = (function () {
  "use strict";

  var cfg = window.APP_CONFIG || {};
  var mode = "demo";
  var sb = null;
  var pollTimer = null;
  var channel = null;
  var lastDataHash = "";
  var authCallbacks = [];
  // Ar duomenų bazėje jau yra naujesni stulpeliai/lentelės (atnaujinimas-1.sql).
  // Optimistiškai true; fetchAll patikslina. Jei dar ne — appsas nemeta klaidų,
  // tik tų funkcijų neleidžia, kol adminas paleidžia atnaujinimą.
  var caps = { taskExtras: true, extraTables: true, availability: true, curator: true, taskTime: true, lists: true, mokykla: true };

  var DEMO_KEY = "steamPlanas.demo.v1";
  var DEMO_USER_KEY = "steamPlanas.demoUser";

  // ---------- bendri pagalbininkai ----------

  function uid() {
    return "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function iso(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function translateAuthError(msg) {
    msg = String(msg || "");
    if (msg.indexOf("Invalid login credentials") !== -1) return "Neteisingas el. paštas arba slaptažodis.";
    if (msg.indexOf("User already registered") !== -1) return "Šis el. paštas jau užregistruotas — bandykite prisijungti.";
    if (msg.indexOf("Password should be at least") !== -1) return "Slaptažodis turi būti bent 6 simbolių.";
    if (msg.indexOf("Email not confirmed") !== -1) return "El. paštas dar nepatvirtintas. Patikrinkite pašto dėžutę arba kreipkitės į administratorių.";
    if (msg.indexOf("rate limit") !== -1 || msg.indexOf("Too many") !== -1) return "Per daug bandymų. Palaukite minutę ir bandykite vėl.";
    if (msg.indexOf("valid email") !== -1) return "Įveskite teisingą el. pašto adresą.";
    return "Nepavyko: " + msg;
  }

  // ---------- DEMO režimo duomenys ----------

  function demoSeed() {
    var people = [
      ["Demo Vadovė", "Vadovė", "admin", "#7C3AED"],
      ["Demo Pavaduotoja", "Pavaduotoja", "admin", "#0E9F6E"],
      ["Demo Administratorius", "Administratorius", "admin", "#5B5BD6"],
      ["Darbuotojas 1", "", "darbuotojas", "#D946EF"],
      ["Darbuotojas 2", "", "darbuotojas", "#F59E0B"],
      ["Darbuotojas 3", "", "darbuotojas", "#10B981"],
      ["Darbuotojas 4", "", "darbuotojas", "#3B82F6"],
      ["Darbuotojas 5", "", "darbuotojas", "#EF4444"],
      ["Darbuotojas 6", "", "darbuotojas", "#8B5CF6"],
      ["Darbuotojas 7", "", "darbuotojas", "#14B8A6"],
      ["Darbuotojas 8", "", "darbuotojas", "#F97316"],
      ["Darbuotojas 9", "", "darbuotojas", "#6366F1"],
      ["Darbuotojas 10", "", "darbuotojas", "#0EA5E9"],
      ["Darbuotojas 11", "", "darbuotojas", "#EC4899"],
      ["Darbuotojas 12", "", "darbuotojas", "#84CC16"]
    ];
    var employees = people.map(function (p, i) {
      return {
        id: "d" + String(i + 1).padStart(2, "0"),
        user_id: null,
        vardas: p[0],
        email: null,
        pareigos: p[1],
        atsakomybes: "",
        savaites_valandos: 40,
        role: p[2],
        spalva: p[3],
        aktyvus: true
      };
    });

    var today = new Date();
    var monday = new Date(today);
    var wd = (today.getDay() + 6) % 7;
    monday.setDate(today.getDate() - wd);
    function day(offset) {
      var d = new Date(monday);
      d.setDate(monday.getDate() + offset);
      return iso(d);
    }

    var tasks = [
      { pavadinimas: "STEAM dirbtuvių programa mokykloms", darbuotojas_id: "d04", valandos: 12, terminas: day(4), prioritetas: "aukstas", statusas: "vykdoma", kategorija: "Edukacija" },
      { pavadinimas: "Laboratorijos inventoriaus patikra", darbuotojas_id: "d10", valandos: 6, terminas: day(2), prioritetas: "vidutinis", statusas: "vykdoma", kategorija: "Administracija" },
      { pavadinimas: "Mokytojų kvalifikacijos seminaras", darbuotojas_id: "d01", valandos: 8, terminas: day(8), prioritetas: "aukstas", statusas: "laukia", kategorija: "Metodinė veikla" },
      { pavadinimas: "Renginio „Tyrėjų naktis“ planas", darbuotojas_id: "d02", valandos: 10, terminas: day(11), prioritetas: "vidutinis", statusas: "vykdoma", kategorija: "Renginys" },
      { pavadinimas: "Svetainės naujienų atnaujinimas", darbuotojas_id: "d03", valandos: 3, terminas: day(3), prioritetas: "zemas", statusas: "laukia", kategorija: "Administracija" },
      { pavadinimas: "Chemijos pamokų metodinė medžiaga", darbuotojas_id: "d06", valandos: 9, terminas: day(9), prioritetas: "vidutinis", statusas: "vykdoma", kategorija: "Metodinė veikla" },
      { pavadinimas: "Ekskursijų grafiko derinimas", darbuotojas_id: "d07", valandos: 4, terminas: day(1), prioritetas: "vidutinis", statusas: "atlikta", kategorija: "Edukacija" },
      { pavadinimas: "Robotikos būrelio užsiėmimai", darbuotojas_id: "d09", valandos: 14, terminas: day(10), prioritetas: "aukstas", statusas: "vykdoma", kategorija: "Edukacija" },
      { pavadinimas: "Ataskaitos ministerijai juodraštis", darbuotojas_id: "d01", valandos: 6, terminas: day(5), prioritetas: "aukstas", statusas: "laukia", kategorija: "Administracija" },
      { pavadinimas: "Naujų mikroskopų užsakymas", darbuotojas_id: null, valandos: 3, terminas: day(7), prioritetas: "vidutinis", statusas: "laukia", kategorija: "Administracija" },
      { pavadinimas: "Vasaros stovyklos programos idėjos", darbuotojas_id: null, valandos: 8, terminas: day(14), prioritetas: "vidutinis", statusas: "laukia", kategorija: "Projektas" },
      { pavadinimas: "Socialinių tinklų įrašai (birželis)", darbuotojas_id: null, valandos: 5, terminas: day(12), prioritetas: "zemas", statusas: "laukia", kategorija: "Administracija" }
    ].map(function (t) {
      t.id = uid();
      t.aprasymas = t.aprasymas || "";
      if (t.statusas === "atlikta") t.atlikta_at = day(1) + "T12:00:00";
      return t;
    });

    var shifts = [];
    var pattern = [
      ["d01", [0, 1, 2, 3, 4], "08:00", "16:00", ""],
      ["d02", [0, 1, 2, 3, 4], "09:00", "17:00", ""],
      ["d03", [0, 2, 4], "08:30", "16:30", ""],
      ["d04", [0, 1, 3], "10:00", "18:00", "Dirbtuvės"],
      ["d06", [1, 2, 3], "08:00", "14:00", ""],
      ["d09", [2, 3, 4], "12:00", "18:00", "Robotika"],
      ["d10", [0, 4], "08:00", "17:00", "Laboratorija"]
    ];
    pattern.forEach(function (p) {
      p[1].forEach(function (offset) {
        shifts.push({
          id: uid(),
          darbuotojas_id: p[0],
          data: day(offset),
          nuo: p[2],
          iki: p[3],
          pastaba: p[4]
        });
      });
    });

    var komentarai = [
      { id: uid(), uzduotis_id: tasks[0].id, darbuotojas_id: "d01", tekstas: "Programą derinam su Kauno mokyklomis — laukiu jų atsakymo.", created_at: day(1) + "T10:30:00" }
    ];
    var pranesimai = [
      { id: uid(), darbuotojas_id: "d03", tekstas: "Demo: taip atrodys pranešimai apie priskirtus darbus", vaizdas: "darbai", perskaityta: false, created_at: day(2) + "T09:00:00" }
    ];
    var atostogos = [
      { id: uid(), darbuotojas_id: "d15", nuo: day(0), iki: day(6), tipas: "atostogos", pastaba: "" }
    ];

    var sarasaiSeed = [];
    [["veiklos_tipas", ["Susirinkimas", "Veikla", "Mokymai", "Dirbtuvės"]],
     ["kategorija", ["Edukacija", "Renginys", "Susirinkimas", "Administracija", "Metodinė veikla", "Projektas", "Kita"]],
     ["nedarbo_tipas", ["Atostogos", "Liga", "Kita"]]
    ].forEach(function (g) { g[1].forEach(function (r, i) { sarasaiSeed.push({ id: uid(), grupe: g[0], reiksme: r, tvarka: i + 1 }); }); });
    return {
      version: 1, employees: employees, tasks: tasks, shifts: shifts,
      komentarai: komentarai, pranesimai: pranesimai, atostogos: atostogos,
      app_sarasai: sarasaiSeed,
      prieinamumas_sablonas: [
        { id: uid(), darbuotojas_id: "d01", savaite_diena: 1, nuo: "09:00", iki: "13:00", nedirba: false },
        { id: uid(), darbuotojas_id: "d01", savaite_diena: 3, nuo: "09:00", iki: "13:00", nedirba: false },
        { id: uid(), darbuotojas_id: "d04", savaite_diena: 2, nuo: "10:00", iki: "16:00", nedirba: false },
        { id: uid(), darbuotojas_id: "d04", savaite_diena: 5, nuo: null, iki: null, nedirba: true },
        { id: uid(), darbuotojas_id: "d06", savaite_diena: 4, nuo: "08:00", iki: "12:00", nedirba: false }
      ],
      prieinamumas: []
    };
  }

  function demoLoad() {
    try {
      var raw = localStorage.getItem(DEMO_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.employees) {
          parsed.tasks = parsed.tasks || [];
          parsed.shifts = parsed.shifts || [];
          parsed.komentarai = parsed.komentarai || [];
          parsed.pranesimai = parsed.pranesimai || [];
          parsed.atostogos = parsed.atostogos || [];
          parsed.prieinamumas_sablonas = parsed.prieinamumas_sablonas || [];
          parsed.prieinamumas = parsed.prieinamumas || [];
          parsed.app_sarasai = parsed.app_sarasai || [];
          return parsed;
        }
      }
    } catch (e) { /* sugadinti duomenys — perkuriame */ }
    var seeded = demoSeed();
    demoSave(seeded);
    return seeded;
  }

  function demoSave(data) {
    data.version = (data.version || 0) + 1;
    localStorage.setItem(DEMO_KEY, JSON.stringify(data));
  }

  // ---------- vieša sąsaja ----------

  async function init() {
    // Adresas su ?demo=1 įjungia demo režimą (išbandymui, tikri duomenys neliečiami)
    var forceDemo = false;
    try { forceDemo = new URLSearchParams(window.location.search).has("demo"); } catch (e) {}
    if (!forceDemo && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase) {
      sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      mode = "supabase";
    } else {
      mode = "demo";
    }
    return mode;
  }

  function getMode() { return mode; }

  async function getSession() {
    if (mode === "supabase") {
      var res = await sb.auth.getSession();
      return res.data.session;
    }
    var id = localStorage.getItem(DEMO_USER_KEY);
    if (!id) return null;
    return { user: { id: "demo-auth-" + id, email: "" }, demoEmployeeId: id };
  }

  function onAuthChange(cb) {
    authCallbacks.push(cb);
    if (mode === "supabase") {
      // setTimeout būtinas: supabase-js viduje laiko užraktą, ir auth
      // kvietimai tiesiai iš šio callback'o užstrigtų (žinoma kliūtis).
      sb.auth.onAuthStateChange(function (event) { setTimeout(function () { cb(event); }, 0); });
    }
  }

  function fireAuth() {
    authCallbacks.forEach(function (cb) { try { cb(); } catch (e) {} });
  }

  async function signIn(email, password) {
    var res = await sb.auth.signInWithPassword({ email: email, password: password });
    if (res.error) throw new Error(translateAuthError(res.error.message));
    return res.data.session;
  }

  async function signUp(email, password) {
    var res = await sb.auth.signUp({ email: email, password: password });
    if (res.error) throw new Error(translateAuthError(res.error.message));
    if (!res.data.session) {
      throw new Error("Registracija priimta, bet reikia patvirtinti el. paštą. Patikrinkite pašto dėžutę.");
    }
    return res.data.session;
  }

  async function resetPassword(email) {
    var res = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    if (res.error) throw new Error(translateAuthError(res.error.message));
  }

  async function updatePassword(newPassword) {
    var res = await sb.auth.updateUser({ password: newPassword });
    if (res.error) throw new Error(translateAuthError(res.error.message));
  }

  async function signOut() {
    if (mode === "supabase") {
      await sb.auth.signOut();
    } else {
      localStorage.removeItem(DEMO_USER_KEY);
      fireAuth();
    }
  }

  function demoUsers() {
    return demoLoad().employees.filter(function (e) { return e.aktyvus; });
  }

  function demoSignIn(employeeId) {
    localStorage.setItem(DEMO_USER_KEY, employeeId);
    fireAuth();
  }

  async function fetchAll() {
    if (mode === "supabase") {
      var results = await Promise.all([
        sb.from("darbuotojai").select("*").order("vardas"),
        sb.from("uzduotys").select("*").order("created_at", { ascending: false }),
        sb.from("tvarkarastis").select("*").order("data")
      ]);
      for (var i = 0; i < results.length; i++) {
        if (results[i].error) throw new Error("Nepavyko gauti duomenų: " + results[i].error.message);
      }
      // Naujesnės lentelės: jei jų dar nėra (nepaleistas atnaujinimo SQL),
      // sistema veikia toliau, tik parodo priminimą administratoriui.
      var extras = await Promise.all([
        sb.from("komentarai").select("*").order("created_at"),
        sb.from("pranesimai").select("*").order("created_at", { ascending: false }).limit(200),
        sb.from("atostogos").select("*").order("nuo")
      ]);
      var migrationNeeded = extras.some(function (r) { return !!r.error; });
      // Atskirai patikrinam, ar uzduotys turi naujus stulpelius (atlikta_at, kategorija)
      var colProbe = await sb.from("uzduotys").select("atlikta_at, kategorija").limit(1);
      caps.taskExtras = !colProbe.error;
      var curProbe = await sb.from("darbuotojai").select("kuratorius_id").limit(1);
      caps.curator = !curProbe.error;
      var ttProbe = await sb.from("uzduotys").select("terminas_laikas").limit(1);
      caps.taskTime = !ttProbe.error;
      caps.extraTables = !migrationNeeded;
      // Prieinamumas (atnaujinimas-4) — jei lentelių dar nėra, tyliai praleidžiam.
      var avail = await Promise.all([
        sb.from("prieinamumas_sablonas").select("*"),
        sb.from("prieinamumas").select("*")
      ]);
      caps.availability = !avail[0].error && !avail[1].error;
      var listsRes = await sb.from("app_sarasai").select("*").order("tvarka");
      caps.lists = !listsRes.error;
      // Mokykla + mokinių skaičius (atnaujinimas-8) — abiejose lentelėse.
      var mkProbe = await Promise.all([
        sb.from("uzduotys").select("mokykla").limit(1),
        sb.from("tvarkarastis").select("mokykla").limit(1)
      ]);
      caps.mokykla = !mkProbe[0].error && !mkProbe[1].error;
      function trimT(rows) {
        return (rows || []).map(function (r) {
          if (r.nuo != null) r.nuo = String(r.nuo).slice(0, 5);
          if (r.iki != null) r.iki = String(r.iki).slice(0, 5);
          return r;
        });
      }
      return {
        employees: results[0].data || [],
        tasks: results[1].data || [],
        shifts: (results[2].data || []).map(function (s) {
          s.nuo = String(s.nuo).slice(0, 5);
          s.iki = String(s.iki).slice(0, 5);
          return s;
        }),
        comments: extras[0].data || [],
        notifications: extras[1].data || [],
        vacations: extras[2].data || [],
        availTemplate: trimT(avail[0].data),
        availability: trimT(avail[1].data),
        sarasai: listsRes.data || [],
        migrationNeeded: migrationNeeded || !caps.taskExtras || !caps.availability || !caps.taskTime || !caps.lists || !caps.mokykla
      };
    }
    caps.taskExtras = true;
    caps.extraTables = true;
    var d = demoLoad();
    return {
      employees: d.employees.slice(), tasks: d.tasks.slice(), shifts: d.shifts.slice(),
      comments: d.komentarai.slice(), notifications: d.pranesimai.slice(), vacations: d.atostogos.slice(),
      availTemplate: d.prieinamumas_sablonas.slice(), availability: d.prieinamumas.slice(),
      sarasai: d.app_sarasai.slice(),
      migrationNeeded: false
    };
  }

  // Pašalina laukus, kurių DB dar neturi, kad nemestų klaidos.
  function stripUnsupported(obj) {
    if (mode !== "supabase") return obj;
    var drop = null;
    if (!caps.taskExtras) drop = { atlikta_at: 1, kategorija: 1 };
    if (!caps.taskTime) { drop = drop || {}; drop.terminas_laikas = 1; }
    if (!caps.mokykla) { drop = drop || {}; drop.mokykla = 1; drop.mokiniu_skaicius = 1; }
    if (!drop) return obj;
    var copy = {};
    for (var k in obj) {
      if (obj.hasOwnProperty(k) && !drop[k]) copy[k] = obj[k];
    }
    return copy;
  }
  // Pašalina kuratorius_id, jei DB stulpelio dar nėra (atnaujinimas-2 nepaleistas).
  function stripEmp(obj) {
    if (mode === "supabase" && !caps.curator && obj && obj.hasOwnProperty("kuratorius_id")) {
      var copy = {};
      for (var k in obj) { if (obj.hasOwnProperty(k) && k !== "kuratorius_id") copy[k] = obj[k]; }
      return copy;
    }
    return obj;
  }
  // Pašalina tvarkaraščio laukus, kurių DB dar neturi:
  // tipas/vieta (atnaujinimas-6) ir mokykla/mokinių skaičius (atnaujinimas-8).
  function stripShift(obj) {
    if (mode !== "supabase" || !obj) return obj;
    var drop = {};
    if (!caps.lists) { drop.tipas = 1; drop.vieta = 1; }
    if (!caps.mokykla) { drop.mokykla = 1; drop.mokiniu_skaicius = 1; }
    var has = false;
    for (var d in drop) { if (drop[d]) { has = true; break; } }
    if (!has) return obj;
    var copy = {};
    for (var k in obj) { if (obj.hasOwnProperty(k) && !drop[k]) copy[k] = obj[k]; }
    return copy;
  }
  function needExtraTables() {
    if (mode === "supabase" && !caps.extraTables) {
      throw new Error("Šiai funkcijai reikia duomenų bazės atnaujinimo. Administratorius: Supabase SQL Editor paleiskite atnaujinimas-1.sql.");
    }
  }

  // ---------- įrašų keitimas ----------

  async function sbInsert(table, obj) {
    var res = await sb.from(table).insert(obj).select().single();
    if (res.error) throw new Error("Nepavyko išsaugoti: " + res.error.message);
    return res.data;
  }
  async function sbUpdate(table, id, patch) {
    var res = await sb.from(table).update(patch).eq("id", id).select().single();
    if (res.error) throw new Error("Nepavyko atnaujinti: " + res.error.message);
    return res.data;
  }
  async function sbDelete(table, id) {
    var res = await sb.from(table).delete().eq("id", id);
    if (res.error) throw new Error("Nepavyko ištrinti: " + res.error.message);
  }

  function demoMutate(fn) {
    var d = demoLoad();
    var out = fn(d);
    demoSave(d);
    return out;
  }

  async function addEmployee(obj) {
    if (mode === "supabase") return sbInsert("darbuotojai", stripEmp(obj));
    return demoMutate(function (d) {
      obj.id = uid();
      obj.user_id = null;
      d.employees.push(obj);
      return obj;
    });
  }
  async function updateEmployee(id, patch) {
    if (mode === "supabase") return sbUpdate("darbuotojai", id, stripEmp(patch));
    return demoMutate(function (d) {
      var e = d.employees.find(function (x) { return x.id === id; });
      if (e) Object.assign(e, patch);
      return e;
    });
  }

  async function addTask(obj) {
    if (mode === "supabase") return sbInsert("uzduotys", stripUnsupported(obj));
    return demoMutate(function (d) {
      obj.id = uid();
      d.tasks.unshift(obj);
      return obj;
    });
  }
  async function updateTask(id, patch) {
    if (mode === "supabase") return sbUpdate("uzduotys", id, stripUnsupported(patch));
    return demoMutate(function (d) {
      var t = d.tasks.find(function (x) { return x.id === id; });
      if (t) Object.assign(t, patch);
      return t;
    });
  }
  async function deleteTask(id) {
    if (mode === "supabase") return sbDelete("uzduotys", id);
    return demoMutate(function (d) {
      d.tasks = d.tasks.filter(function (x) { return x.id !== id; });
    });
  }

  async function addShift(obj) {
    if (mode === "supabase") return sbInsert("tvarkarastis", stripShift(obj));
    return demoMutate(function (d) {
      obj.id = uid();
      d.shifts.push(obj);
      return obj;
    });
  }
  async function updateShift(id, patch) {
    if (mode === "supabase") return sbUpdate("tvarkarastis", id, stripShift(patch));
    return demoMutate(function (d) {
      var s = d.shifts.find(function (x) { return x.id === id; });
      if (s) Object.assign(s, patch);
      return s;
    });
  }
  async function deleteShift(id) {
    if (mode === "supabase") return sbDelete("tvarkarastis", id);
    return demoMutate(function (d) {
      d.shifts = d.shifts.filter(function (x) { return x.id !== id; });
    });
  }

  async function addComment(obj) {
    needExtraTables();
    if (mode === "supabase") return sbInsert("komentarai", obj);
    return demoMutate(function (d) {
      obj.id = uid();
      obj.created_at = new Date().toISOString();
      d.komentarai.push(obj);
      return obj;
    });
  }
  async function deleteComment(id) {
    if (mode === "supabase") return sbDelete("komentarai", id);
    return demoMutate(function (d) {
      d.komentarai = d.komentarai.filter(function (x) { return x.id !== id; });
    });
  }

  async function addNotifications(list) {
    if (!list || !list.length) return;
    if (mode === "supabase" && !caps.extraTables) return; // tyliai praleidžiam, kol nėra lentelės
    if (mode === "supabase") {
      var res = await sb.from("pranesimai").insert(list);
      if (res.error) throw new Error("Nepavyko sukurti pranešimo: " + res.error.message);
      return;
    }
    return demoMutate(function (d) {
      list.forEach(function (n) {
        n.id = uid();
        n.perskaityta = false;
        n.created_at = new Date().toISOString();
        d.pranesimai.unshift(n);
      });
    });
  }

  async function savePushSubscription(s) {
    if (mode !== "supabase") return; // demo režime push nėra
    var res = await sb.rpc("save_push_subscription", {
      p_endpoint: s.endpoint, p_p256dh: s.p256dh, p_auth: s.auth, p_ua: s.ua || ""
    });
    if (res.error) throw new Error(res.error.message || "Nepavyko išsaugoti prenumeratos");
  }

  async function markNotificationsRead(ids) {
    if (!ids || !ids.length) return;
    if (mode === "supabase" && !caps.extraTables) return;
    if (mode === "supabase") {
      var res = await sb.from("pranesimai").update({ perskaityta: true }).in("id", ids);
      if (res.error) throw new Error("Nepavyko: " + res.error.message);
      return;
    }
    return demoMutate(function (d) {
      d.pranesimai.forEach(function (n) {
        if (ids.indexOf(n.id) !== -1) n.perskaityta = true;
      });
    });
  }

  async function addVacation(obj) {
    needExtraTables();
    if (mode === "supabase") return sbInsert("atostogos", obj);
    return demoMutate(function (d) {
      obj.id = uid();
      d.atostogos.push(obj);
      return obj;
    });
  }
  async function deleteVacation(id) {
    if (mode === "supabase") return sbDelete("atostogos", id);
    return demoMutate(function (d) {
      d.atostogos = d.atostogos.filter(function (x) { return x.id !== id; });
    });
  }

  // ---------- Prieinamumas (kada gali dirbti / vesti veiklas) ----------

  function needAvailability() {
    if (mode === "supabase" && !caps.availability) {
      throw new Error("Šiai funkcijai reikia duomenų bazės atnaujinimo. Administratorius: Supabase SQL Editor paleiskite atnaujinimas-4.sql.");
    }
  }
  async function addAvailTemplate(obj) {
    needAvailability();
    if (mode === "supabase") return sbInsert("prieinamumas_sablonas", obj);
    return demoMutate(function (d) {
      obj.id = uid(); obj.created_at = new Date().toISOString();
      d.prieinamumas_sablonas.push(obj);
      return obj;
    });
  }
  async function deleteAvailTemplate(id) {
    if (mode === "supabase") return sbDelete("prieinamumas_sablonas", id);
    return demoMutate(function (d) {
      d.prieinamumas_sablonas = d.prieinamumas_sablonas.filter(function (x) { return x.id !== id; });
    });
  }
  async function addAvailability(obj) {
    needAvailability();
    if (mode === "supabase") return sbInsert("prieinamumas", obj);
    return demoMutate(function (d) {
      obj.id = uid(); obj.created_at = new Date().toISOString();
      d.prieinamumas.push(obj);
      return obj;
    });
  }
  async function deleteAvailability(id) {
    if (mode === "supabase") return sbDelete("prieinamumas", id);
    return demoMutate(function (d) {
      d.prieinamumas = d.prieinamumas.filter(function (x) { return x.id !== id; });
    });
  }
  // Pašalina visus konkrečios datos override įrašus (perrašant dieną iš naujo / grįžtant į šabloną).
  async function clearAvailabilityForDate(empId, dateIso) {
    if (mode === "supabase") {
      var res = await sb.from("prieinamumas").delete().eq("darbuotojas_id", empId).eq("data", dateIso);
      if (res.error) throw new Error("Nepavyko: " + res.error.message);
      return;
    }
    return demoMutate(function (d) {
      d.prieinamumas = d.prieinamumas.filter(function (x) { return !(x.darbuotojas_id === empId && x.data === dateIso); });
    });
  }
  // Pašalina visus šablono įrašus tai savaitės dienai (perrašant „negaliu" / iš naujo).
  async function clearAvailTemplateForWeekday(empId, wd) {
    if (mode === "supabase") {
      var res = await sb.from("prieinamumas_sablonas").delete().eq("darbuotojas_id", empId).eq("savaite_diena", wd);
      if (res.error) throw new Error("Nepavyko: " + res.error.message);
      return;
    }
    return demoMutate(function (d) {
      d.prieinamumas_sablonas = d.prieinamumas_sablonas.filter(function (x) { return !(x.darbuotojas_id === empId && x.savaite_diena === wd); });
    });
  }

  // ---------- Valdomi sąrašai (kategorijos, veiklų tipai ir kt.) ----------
  function needLists() {
    if (mode === "supabase" && !caps.lists) {
      throw new Error("Šiai funkcijai reikia duomenų bazės atnaujinimo: atnaujinimas-6.sql.");
    }
  }
  async function addListItem(obj) {
    needLists();
    if (mode === "supabase") return sbInsert("app_sarasai", obj);
    return demoMutate(function (d) { obj.id = uid(); obj.created_at = new Date().toISOString(); d.app_sarasai.push(obj); return obj; });
  }
  async function deleteListItem(id) {
    if (mode === "supabase") return sbDelete("app_sarasai", id);
    return demoMutate(function (d) { d.app_sarasai = d.app_sarasai.filter(function (x) { return x.id !== id; }); });
  }

  // ---------- gyvas atsinaujinimas ----------

  function subscribe(onData, onStatus) {
    var stopped = false;
    var debounceTimer = null;

    function refetch() {
      if (stopped) return;
      fetchAll().then(function (data) {
        if (stopped) return;
        var hash = JSON.stringify(data);
        if (hash !== lastDataHash) {
          lastDataHash = hash;
          onData(data);
        }
      }).catch(function () { /* tinklo klaida — bandysime kitą kartą */ });
    }

    function debouncedRefetch() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(refetch, 150);
    }

    function startPolling() {
      if (pollTimer) return;
      pollTimer = setInterval(refetch, cfg.POLL_INTERVAL_MS || 3000);
    }
    function stopPolling() {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    }

    if (mode === "supabase") {
      onStatus("poll");
      startPolling();
      // Prenumeruojam tik egzistuojančias lenteles (kitaip kanalas nukristų į poll).
      var rtTables = ["darbuotojai", "uzduotys", "tvarkarastis"];
      if (caps.extraTables) rtTables = rtTables.concat(["komentarai", "pranesimai", "atostogos"]);
      if (caps.availability) rtTables = rtTables.concat(["prieinamumas_sablonas", "prieinamumas"]);
      if (caps.lists) rtTables = rtTables.concat(["app_sarasai"]);
      channel = sb.channel("db-changes");
      rtTables.forEach(function (tbl) {
        channel = channel.on("postgres_changes", { event: "*", schema: "public", table: tbl }, debouncedRefetch);
      });
      channel.subscribe(function (status) {
          if (stopped) return;
          if (status === "SUBSCRIBED") {
            onStatus("live");
            stopPolling();
            debouncedRefetch();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            onStatus("poll");
            startPolling();
          }
        });
    } else {
      onStatus("demo");
      window.addEventListener("storage", debouncedRefetch);
      startPolling();
    }

    return function unsubscribe() {
      stopped = true;
      stopPolling();
      clearTimeout(debounceTimer);
      window.removeEventListener("storage", debouncedRefetch);
      if (channel && sb) { sb.removeChannel(channel); channel = null; }
    };
  }

  return {
    init: init,
    getMode: getMode,
    getSession: getSession,
    onAuthChange: onAuthChange,
    signIn: signIn,
    signUp: signUp,
    signOut: signOut,
    resetPassword: resetPassword,
    updatePassword: updatePassword,
    demoUsers: demoUsers,
    demoSignIn: demoSignIn,
    fetchAll: fetchAll,
    addEmployee: addEmployee,
    updateEmployee: updateEmployee,
    addTask: addTask,
    updateTask: updateTask,
    deleteTask: deleteTask,
    addShift: addShift,
    updateShift: updateShift,
    deleteShift: deleteShift,
    addComment: addComment,
    deleteComment: deleteComment,
    addNotifications: addNotifications,
    markNotificationsRead: markNotificationsRead,
    savePushSubscription: savePushSubscription,
    addVacation: addVacation,
    deleteVacation: deleteVacation,
    addAvailTemplate: addAvailTemplate,
    deleteAvailTemplate: deleteAvailTemplate,
    addAvailability: addAvailability,
    deleteAvailability: deleteAvailability,
    clearAvailabilityForDate: clearAvailabilityForDate,
    clearAvailTemplateForWeekday: clearAvailTemplateForWeekday,
    addListItem: addListItem,
    deleteListItem: deleteListItem,
    getCaps: function () { return { taskExtras: caps.taskExtras, extraTables: caps.extraTables, availability: caps.availability, curator: caps.curator, taskTime: caps.taskTime, lists: caps.lists, mokykla: caps.mokykla }; },
    subscribe: subscribe
  };
})();
