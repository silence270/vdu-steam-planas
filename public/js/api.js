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
      ["Judita Žukauskienė", "Vadovė", "admin", "#7C3AED"],
      ["Gabrielė Viduolytė", "Pavaduotoja", "admin", "#0E9F6E"],
      ["Gabrielius Plungė", "Administratorius", "admin", "#5B5BD6"],
      ["Edvina Kudakienė", "", "darbuotojas", "#D946EF"],
      ["Aritonė Gilė", "", "darbuotojas", "#F59E0B"],
      ["Emilija Jankaitytė", "", "darbuotojas", "#10B981"],
      ["Simona Jokubauskienė", "", "darbuotojas", "#3B82F6"],
      ["Simona Paul", "", "darbuotojas", "#EF4444"],
      ["Ugnė Filomena Gaudėšiūtė", "", "darbuotojas", "#8B5CF6"],
      ["Tomas Ūksas", "", "darbuotojas", "#14B8A6"],
      ["Povilas Dryža", "", "darbuotojas", "#F97316"],
      ["Artūras Karpavičius", "", "darbuotojas", "#6366F1"],
      ["Marius Kaminskas", "", "darbuotojas", "#0EA5E9"],
      ["Marta Baranauskaitė", "", "darbuotojas", "#EC4899"],
      ["Lina Ragelienė", "", "darbuotojas", "#84CC16"]
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
      { pavadinimas: "STEAM dirbtuvių programa mokykloms", darbuotojas_id: "d04", valandos: 12, terminas: day(4), prioritetas: "aukstas", statusas: "vykdoma" },
      { pavadinimas: "Laboratorijos inventoriaus patikra", darbuotojas_id: "d10", valandos: 6, terminas: day(2), prioritetas: "vidutinis", statusas: "vykdoma" },
      { pavadinimas: "Mokytojų kvalifikacijos seminaras", darbuotojas_id: "d01", valandos: 8, terminas: day(8), prioritetas: "aukstas", statusas: "laukia" },
      { pavadinimas: "Renginio „Tyrėjų naktis“ planas", darbuotojas_id: "d02", valandos: 10, terminas: day(11), prioritetas: "vidutinis", statusas: "vykdoma" },
      { pavadinimas: "Svetainės naujienų atnaujinimas", darbuotojas_id: "d03", valandos: 3, terminas: day(3), prioritetas: "zemas", statusas: "laukia" },
      { pavadinimas: "Chemijos pamokų metodinė medžiaga", darbuotojas_id: "d06", valandos: 9, terminas: day(9), prioritetas: "vidutinis", statusas: "vykdoma" },
      { pavadinimas: "Ekskursijų grafiko derinimas", darbuotojas_id: "d07", valandos: 4, terminas: day(1), prioritetas: "vidutinis", statusas: "atlikta" },
      { pavadinimas: "Robotikos būrelio užsiėmimai", darbuotojas_id: "d09", valandos: 14, terminas: day(10), prioritetas: "aukstas", statusas: "vykdoma" },
      { pavadinimas: "Ataskaitos ministerijai juodraštis", darbuotojas_id: "d01", valandos: 6, terminas: day(5), prioritetas: "aukstas", statusas: "laukia" },
      { pavadinimas: "Naujų mikroskopų užsakymas", darbuotojas_id: null, valandos: 3, terminas: day(7), prioritetas: "vidutinis", statusas: "laukia" },
      { pavadinimas: "Vasaros stovyklos programos idėjos", darbuotojas_id: null, valandos: 8, terminas: day(14), prioritetas: "vidutinis", statusas: "laukia" },
      { pavadinimas: "Socialinių tinklų įrašai (birželis)", darbuotojas_id: null, valandos: 5, terminas: day(12), prioritetas: "zemas", statusas: "laukia" }
    ].map(function (t) {
      t.id = uid();
      t.aprasymas = t.aprasymas || "";
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

    return { version: 1, employees: employees, tasks: tasks, shifts: shifts };
  }

  function demoLoad() {
    try {
      var raw = localStorage.getItem(DEMO_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.employees) return parsed;
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
    if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase) {
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
      sb.auth.onAuthStateChange(function () { setTimeout(cb, 0); });
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
      return {
        employees: results[0].data || [],
        tasks: results[1].data || [],
        shifts: (results[2].data || []).map(function (s) {
          s.nuo = String(s.nuo).slice(0, 5);
          s.iki = String(s.iki).slice(0, 5);
          return s;
        })
      };
    }
    var d = demoLoad();
    return { employees: d.employees.slice(), tasks: d.tasks.slice(), shifts: d.shifts.slice() };
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
    if (mode === "supabase") return sbInsert("darbuotojai", obj);
    return demoMutate(function (d) {
      obj.id = uid();
      obj.user_id = null;
      d.employees.push(obj);
      return obj;
    });
  }
  async function updateEmployee(id, patch) {
    if (mode === "supabase") return sbUpdate("darbuotojai", id, patch);
    return demoMutate(function (d) {
      var e = d.employees.find(function (x) { return x.id === id; });
      if (e) Object.assign(e, patch);
      return e;
    });
  }

  async function addTask(obj) {
    if (mode === "supabase") return sbInsert("uzduotys", obj);
    return demoMutate(function (d) {
      obj.id = uid();
      d.tasks.unshift(obj);
      return obj;
    });
  }
  async function updateTask(id, patch) {
    if (mode === "supabase") return sbUpdate("uzduotys", id, patch);
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
    if (mode === "supabase") return sbInsert("tvarkarastis", obj);
    return demoMutate(function (d) {
      obj.id = uid();
      d.shifts.push(obj);
      return obj;
    });
  }
  async function updateShift(id, patch) {
    if (mode === "supabase") return sbUpdate("tvarkarastis", id, patch);
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
      channel = sb.channel("db-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "darbuotojai" }, debouncedRefetch)
        .on("postgres_changes", { event: "*", schema: "public", table: "uzduotys" }, debouncedRefetch)
        .on("postgres_changes", { event: "*", schema: "public", table: "tvarkarastis" }, debouncedRefetch)
        .subscribe(function (status) {
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
    subscribe: subscribe
  };
})();
