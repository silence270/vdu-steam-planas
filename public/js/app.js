// VDU STEAM didaktikos centro komandos planas — sąsajos logika.
(function () {
  "use strict";

  var S = {
    mode: "demo",
    session: null,
    me: null,
    employees: [],
    tasks: [],
    shifts: [],
    view: "apzvalga",
    weekOffset: 0,
    selDay: null,
    filters: { emp: "", status: "aktyvus", q: "", kat: "" },
    authMode: "login",
    liveStatus: "",
    unsub: null,
    booted: false,
    comments: [],
    notifications: [],
    vacations: [],
    migrationNeeded: false,
    recovery: false,
    tv: false,
    tvPanel: 0,
    tvTimer: null,
    schedMode: "week",
    monthOffset: 0,
    teamQ: "",
    viewChanged: true,
    realMe: null,
    viewAsId: null,
    availability: [],
    availTemplate: [],
    availEmpId: null,
    availMode: "savaite",
    availWeekOffset: 0
  };

  var RING_COLORS = { "fill-low": "#AEAEB2", "fill-ok": "#34C759", "fill-warn": "#FF9F0A", "fill-high": "#FF453A" };
  function ringColor(pct) { return RING_COLORS[fillClass(pct)]; }

  function shortName(v) {
    var parts = String(v || "").trim().split(/\s+/);
    if (parts.length >= 2 && /^[^\d]/.test(parts[1])) return parts[0] + " " + parts[1].charAt(0) + ".";
    return v;
  }

  // Vardas šauksmininku (kreipiniui): Gabrielius->Gabrieliau, Tomas->Tomai, Gabrielė->Gabriele, Marius->Mariau.
  function vocative(name) {
    var n = String(name || "");
    if (!n) return n;
    if (n.slice(-3) === "ius") return n.slice(0, -3) + "iau";
    if (n.slice(-2) === "us")  return n.slice(0, -2) + "au";
    if (n.slice(-2) === "as")  return n.slice(0, -2) + "ai";
    if (n.slice(-2) === "ys")  return n.slice(0, -2) + "y";
    if (n.slice(-2) === "is")  return n.slice(0, -2) + "i";
    if (n.slice(-1) === "ė")   return n.slice(0, -1) + "e";
    return n; // -a, -ija, balsiai/priebalsiai — paliekam kaip yra
  }
  function greetingText() {
    var h = new Date().getHours();
    var g = h < 6 ? "Labos nakties" : h < 12 ? "Labas rytas" : h < 18 ? "Laba diena" : "Labas vakaras";
    var name = S.me ? vocative(String(S.me.vardas).split(/\s+/)[0]) : "";
    return name ? g + ", " + name : g;
  }
  function todayLongLabel() {
    var d = new Date();
    return DAYS_LONG[(d.getDay() + 6) % 7].toLowerCase() + ", " + MONTHS_GEN[d.getMonth()] + " " + d.getDate() + " d.";
  }

  var STATUS = { laukia: "Laukia", vykdoma: "Vykdoma", atlikta: "Atlikta" };
  var PRIO = { zemas: "Žemas", vidutinis: "Vidutinis", aukstas: "Aukštas" };
  var PRIO_CHIP = { zemas: "chip-gray", vidutinis: "chip-amber", aukstas: "chip-red" };
  var DAYS_LONG = ["Pirmadienis", "Antradienis", "Trečiadienis", "Ketvirtadienis", "Penktadienis", "Šeštadienis", "Sekmadienis"];
  var DAYS_SHORT = ["Pr", "An", "Tr", "Kt", "Pn", "Št", "Sk"];
  var MONTHS_GEN = ["sausio", "vasario", "kovo", "balandžio", "gegužės", "birželio", "liepos", "rugpjūčio", "rugsėjo", "spalio", "lapkričio", "gruodžio"];
  var MONTHS_NOM = ["Sausis", "Vasaris", "Kovas", "Balandis", "Gegužė", "Birželis", "Liepa", "Rugpjūtis", "Rugsėjis", "Spalis", "Lapkritis", "Gruodis"];
  var VAC_LABEL = { atostogos: "Atostogos", liga: "Liga", kita: "Kita" };
  var CATEGORIES = ["Edukacija", "Renginys", "Susirinkimas", "Administracija", "Metodinė veikla", "Projektas", "Kita"];
  var MONTHS_SHORT = ["saus.", "vas.", "kov.", "bal.", "geg.", "birž.", "liep.", "rugp.", "rugs.", "spal.", "lapkr.", "gruod."];

  var ICONS = {
    apzvalga: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="12" width="4" height="8" rx="1"/><rect x="10" y="7" width="4" height="13" rx="1"/><rect x="17" y="3" width="4" height="17" rx="1"/></svg>',
    tvarkarastis: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    darbai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>',
    komanda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M16.5 14.6c2.5.3 4.4 1.9 5 4.4"/></svg>',
    prieinamumas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5l3 2"/></svg>'
  };

  var VIEWS = [
    { id: "apzvalga", label: "Apžvalga" },
    { id: "tvarkarastis", label: "Tvarkaraštis" },
    { id: "darbai", label: "Darbai" },
    { id: "prieinamumas", label: "Prieinamumas" },
    { id: "komanda", label: "Komanda" }
  ];

  // ---------- programėlės diegimas ----------

  var installEvt = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    installEvt = e;
  });
  window.addEventListener("appinstalled", function () {
    toast("Programėlė įdiegta! Ieškokite ikonos pagrindiniame ekrane.");
  });

  function isStandalone() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      window.navigator.standalone === true;
  }

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function installBtnHtml() {
    if (isStandalone()) return "";
    return '<button class="btn-outline" data-action="install-app" style="width:100%;justify-content:center;margin-top:12px">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M12 7v7M9 11.5L12 14.5l3-3M10 18.5h4"/></svg>' +
      "Įdiegti telefone kaip programėlę</button>";
  }

  function installModal() {
    var ios = '<div class="section-label" style="margin-top:0">iPhone / iPad</div>' +
      '<ol style="margin:0 0 8px;padding-left:20px;line-height:1.8">' +
        "<li>Atidarykite šią svetainę per <b>Safari</b> (kitos naršyklės netinka).</li>" +
        "<li>Apačioje spauskite <b>dalinimosi mygtuką</b> (kvadratėlis su rodykle į viršų).</li>" +
        "<li>Slinkite žemyn ir spauskite <b>„Add to Home Screen“ / „Pridėti į pradžios ekraną“</b>.</li>" +
        "<li>Spauskite <b>„Add“ / „Pridėti“</b> — ikona atsiras ekrane.</li>" +
      "</ol>";
    var android = '<div class="section-label">Android</div>' +
      '<ol style="margin:0 0 8px;padding-left:20px;line-height:1.8">' +
        "<li>Atidarykite šią svetainę per <b>Chrome</b>.</li>" +
        "<li>Viršuje dešinėje spauskite <b>⋮</b> (tris taškus).</li>" +
        "<li>Spauskite <b>„Įdiegti programą“</b> arba <b>„Pridėti prie pagrindinio ekrano“</b>.</li>" +
        "<li>Patvirtinkite — ikona atsiras tarp programų.</li>" +
      "</ol>";
    var content = isIOS() ? ios + android : android + ios;
    openModal(
      "<h2>Kaip įsidiegti programėlę</h2>" +
      '<div class="hint" style="margin-bottom:12px">Įdiegta programėlė atsidaro per visą ekraną, be naršyklės juostų, ir veikia kaip įprasta programa.</div>' +
      content +
      '<div class="modal-actions"><button type="button" class="btn" data-action="close-modal">Supratau</button></div>'
    );
  }

  // ---------- pagalbininkai ----------

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function isoFromDate(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function dateFromIso(s) {
    var p = String(s).slice(0, 10).split("-");
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  function todayIso() { return isoFromDate(new Date()); }

  function startOfWeek(offset) {
    var t = new Date();
    var wd = (t.getDay() + 6) % 7;
    t.setHours(0, 0, 0, 0);
    t.setDate(t.getDate() - wd + (offset || 0) * 7);
    return t;
  }
  function addDays(d, n) {
    var x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }
  function weekRangeLabel(mon) {
    var sun = addDays(mon, 6);
    var label;
    if (mon.getMonth() === sun.getMonth()) {
      label = MONTHS_GEN[mon.getMonth()] + " " + mon.getDate() + "–" + sun.getDate();
    } else {
      label = MONTHS_GEN[mon.getMonth()] + " " + mon.getDate() + " – " + MONTHS_GEN[sun.getMonth()] + " " + sun.getDate();
    }
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  function fmtShort(isoStr) {
    if (!isoStr) return "";
    var d = dateFromIso(isoStr);
    return MONTHS_SHORT[d.getMonth()] + " " + d.getDate();
  }

  function initials(name) {
    var parts = String(name || "").trim().split(/\s+/);
    var out = parts.slice(0, 2).map(function (p) { return p.charAt(0).toUpperCase(); }).join("");
    return out || "?";
  }

  function getEmp(id) {
    for (var i = 0; i < S.employees.length; i++) {
      if (S.employees[i].id === id) return S.employees[i];
    }
    return null;
  }
  function activeEmployees() {
    return S.employees.filter(function (e) { return e.aktyvus; });
  }
  function isAdmin() { return !!(S.me && S.me.role === "admin"); }
  // Vadovas arba administratorius — mato komandos užkrovą, valdo daugiau.
  function isManager() { return !!(S.me && (S.me.role === "admin" || S.me.role === "vadovas")); }
  // Ar dabartinis vartotojas kuruoja darbuotoją empId (gali valdyti jo darbus/grafiką)?
  function managesEmp(empId) {
    if (!S.me || !empId) return false;
    var e = getEmp(empId);
    return !!(e && e.kuratorius_id && e.kuratorius_id === S.me.id);
  }
  // Ar vartotojas gali valdyti šio darbuotojo įrašus (admin / pats / kuratorius)?
  function canManageEmp(empId) {
    return isAdmin() || (S.me && (S.me.id === empId || managesEmp(empId)));
  }
  function canEditTask(t) {
    return isAdmin() || (S.me && (t.darbuotojas_id === S.me.id || managesEmp(t.darbuotojas_id)));
  }
  function canEditShift(s) {
    return isAdmin() || (S.me && (s.darbuotojas_id === S.me.id || managesEmp(s.darbuotojas_id)));
  }

  function loadOf(empId) {
    var hours = 0;
    S.tasks.forEach(function (t) {
      if (t.darbuotojas_id === empId && t.statusas !== "atlikta") hours += Number(t.valandos) || 0;
    });
    var emp = getEmp(empId);
    var cap = emp ? Number(emp.savaites_valandos) || 40 : 40;
    var pct = Math.round((hours / cap) * 100);
    return { hours: Math.round(hours * 10) / 10, cap: cap, pct: pct };
  }
  // Valandos -> etato dalis (40 val. = 1 etatas).
  function etatoStr(hours) { return Math.round((Number(hours) || 0) / 40 * 100) / 100; }
  function fillClass(pct) {
    if (pct >= 95) return "fill-high";
    if (pct >= 75) return "fill-warn";
    if (pct >= 15) return "fill-ok";
    return "fill-low";
  }
  function loadBadge(pct) {
    if (pct >= 110) return '<span class="chip chip-red">Perkrauta</span>';
    if (pct >= 95) return '<span class="chip chip-amber">Riba</span>';
    if (pct < 15) return '<span class="chip chip-gray">Laisva</span>';
    return "";
  }

  function poolTasks() {
    return S.tasks.filter(function (t) { return !t.darbuotojas_id && t.statusas !== "atlikta"; });
  }

  function avatarHtml(emp, lg) {
    if (!emp) return '<span class="avatar' + (lg ? " lg" : "") + '" style="background:#C3C6CF">—</span>';
    return '<span class="avatar' + (lg ? " lg" : "") + '" style="background:' + esc(emp.spalva || "#5B5BD6") + '">' + esc(initials(emp.vardas)) + "</span>";
  }

  function toast(msg) {
    var el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2600);
  }

  // ---------- duomenys ----------

  function applyData(data) {
    S.employees = data.employees;
    S.tasks = data.tasks;
    S.shifts = data.shifts;
    S.comments = data.comments || [];
    S.notifications = data.notifications || [];
    S.vacations = data.vacations || [];
    S.availability = data.availability || [];
    S.availTemplate = data.availTemplate || [];
    S.migrationNeeded = !!data.migrationNeeded;
    resolveMe();
    detectNewNotifications();
  }

  var knownNotifIds = {};
  function detectNewNotifications() {
    if (!S.me) return;
    var fresh = [];
    S.notifications.forEach(function (n) {
      if (n.darbuotojas_id !== S.me.id) return;
      if (!knownNotifIds[n.id]) {
        knownNotifIds[n.id] = true;
        if (!n.perskaityta) fresh.push(n);
      }
    });
    if (!S.booted) return;
    fresh.forEach(function (n) {
      toast(n.tekstas);
      maybeSystemNotify(n.tekstas);
    });
  }

  function maybeSystemNotify(text) {
    try {
      if (window.Notification && Notification.permission === "granted" && document.hidden) {
        new Notification("VDU STEAM planas", { body: text, icon: "icons/icon-192.png" });
      }
    } catch (e) {}
  }

  function myNotifs() {
    if (!S.me) return [];
    return S.notifications.filter(function (n) { return n.darbuotojas_id === S.me.id; });
  }
  function myUnreadCount() {
    return myNotifs().filter(function (n) { return !n.perskaityta; }).length;
  }

  function notifyUser(empId, tekstas, vaizdas) {
    if (!empId || (S.me && empId === S.me.id)) return;
    API.addNotifications([{ darbuotojas_id: empId, tekstas: tekstas, vaizdas: vaizdas || "darbai" }]).catch(function () {});
  }
  function notifyAdmins(tekstas, vaizdas) {
    var list = activeEmployees()
      .filter(function (e) { return e.role === "admin" && (!S.me || e.id !== S.me.id); })
      .map(function (e) { return { darbuotojas_id: e.id, tekstas: tekstas, vaizdas: vaizdas || "darbai" }; });
    API.addNotifications(list).catch(function () {});
  }

  function vacationOf(empId, dateIso) {
    for (var i = 0; i < S.vacations.length; i++) {
      var v = S.vacations[i];
      if (v.darbuotojas_id === empId && v.nuo <= dateIso && dateIso <= v.iki) return v;
    }
    return null;
  }

  function fmtAgo(ts) {
    var diff = Date.now() - new Date(ts).getTime();
    var min = Math.round(diff / 60000);
    if (min < 1) return "ką tik";
    if (min < 60) return "prieš " + min + " min.";
    var h = Math.round(min / 60);
    if (h < 24) return "prieš " + h + " val.";
    var d = Math.round(h / 24);
    if (d < 7) return "prieš " + d + " d.";
    return fmtShort(String(ts).slice(0, 10));
  }

  function resolveMe() {
    S.realMe = null;
    S.me = null;
    if (!S.session) return;
    if (S.mode === "demo") {
      S.realMe = S.employees.find(function (e) { return e.id === S.session.demoEmployeeId; }) || null;
    } else {
      S.realMe = S.employees.find(function (e) { return e.user_id === S.session.user.id; }) || null;
    }
    S.me = S.realMe;
    // Admino „žiūrėti kaip narys" peržiūra — visą sąsają matom to nario akimis.
    if (S.realMe && S.realMe.role === "admin" && S.viewAsId) {
      var as = S.employees.find(function (e) { return e.id === S.viewAsId; });
      if (as) S.me = as; else S.viewAsId = null;
    }
  }

  async function refreshData() {
    try {
      applyData(await API.fetchAll());
    } catch (e) {
      toast(e.message || "Nepavyko atnaujinti duomenų");
    }
    render();
  }

  function ensureSubscribed() {
    if (S.unsub) return;
    S.unsub = API.subscribe(
      function (data) { applyData(data); render(); },
      function (status) {
        S.liveStatus = status;
        var el = document.getElementById("live-indicator");
        if (el) el.outerHTML = liveHtml();
      }
    );
  }
  function teardownSubscription() {
    if (S.unsub) { S.unsub(); S.unsub = null; }
  }

  async function mutate(promise, okMsg) {
    try {
      await promise;
      if (okMsg) toast(okMsg);
      await refreshData();
      return true;
    } catch (e) {
      toast(e.message || "Įvyko klaida");
      return false;
    }
  }

  // ---------- bendras karkasas ----------

  function liveHtml() {
    var cls = "live", txt = "";
    if (S.liveStatus === "live") { cls += " live-on"; txt = "Gyvai"; }
    else if (S.liveStatus === "poll") { cls += " live-poll"; txt = "Kas 3 s"; }
    else if (S.liveStatus === "demo") { cls += " live-demo"; txt = "Demo"; }
    else { txt = "Jungiamasi…"; }
    return '<span class="' + cls + '" id="live-indicator"><span class="dot"></span><span class="txt">' + txt + "</span></span>";
  }

  function shellHtml(content) {
    var navBtns = VIEWS.map(function (v) {
      return '<button data-action="nav" data-view="' + v.id + '" class="' + (S.view === v.id ? "active" : "") + '">' + v.label + "</button>";
    }).join("");
    var bottomBtns = VIEWS.map(function (v) {
      return '<button data-action="nav" data-view="' + v.id + '" class="' + (S.view === v.id ? "active" : "") + '">' + ICONS[v.id] + "<span>" + v.label + "</span></button>";
    }).join("");
    return '' +
      '<header class="topbar">' +
        '<div class="brand"><img src="icons/icon-192.png" alt=""><span>STEAM planas<small>VDU didaktikos centras</small></span></div>' +
        '<nav class="nav">' + navBtns + "</nav>" +
        '<div class="topbar-right">' +
          liveHtml() +
          bellHtml() +
          '<div class="user-chip">' + avatarHtml(S.me) +
            '<button class="btn-ghost" data-action="logout">Atsijungti</button>' +
          "</div>" +
        "</div>" +
      "</header>" +
      '<main class="main' + (S.viewChanged ? " view-enter" : "") + '">' + migrationBannerHtml() + viewAsBanner() + content + "</main>" +
      '<nav class="bottom-nav">' + bottomBtns + "</nav>";
  }

  function bellHtml() {
    var n = myUnreadCount();
    return '<button class="btn-ghost bell-btn" data-action="open-notifs" title="Pranešimai">' +
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9.5a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 19.5a2.2 2.2 0 0 0 4 0"/></svg>' +
      (n ? '<span class="bell-badge">' + (n > 9 ? "9+" : n) + "</span>" : "") +
      "</button>";
  }

  function viewAsBanner() {
    if (!(S.realMe && S.realMe.role === "admin" && S.viewAsId && S.me && S.me.id !== S.realMe.id)) return "";
    return '<div class="card" style="border-color:#7C3AED;background:rgba(124,58,237,.08);margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">' +
      '<div><b>👁 Žiūrite kaip:</b> ' + esc(S.me.vardas) + ' <span class="hint">— administratoriaus peržiūra</span></div>' +
      '<button class="btn-outline btn-sm" data-action="view-as-exit">Grįžti į savo vaizdą</button>' +
    "</div>";
  }

  function migrationBannerHtml() {
    if (!S.migrationNeeded || !isAdmin()) return "";
    return '<div class="card" style="border-color:#F2A33C;margin-bottom:14px"><b>Reikia duomenų bazės atnaujinimo.</b>' +
      '<div class="hint">Naujoms funkcijoms (komentarai, pranešimai, atostogos) Supabase SQL Editor lange paleiskite failą <b>supabase/atnaujinimas-1.sql</b>. Iki tol sistema veikia kaip anksčiau.</div></div>';
  }

  function notifsModal() {
    var list = myNotifs().slice(0, 50);
    var items = list.length ? list.map(function (n) {
      return '<div class="notif-row' + (n.perskaityta ? "" : " unread") + '" data-action="notif-click" data-id="' + n.id + '" data-view="' + esc(n.vaizdas || "darbai") + '">' +
        '<span class="notif-dot"></span>' +
        '<div class="notif-main"><div>' + esc(n.tekstas) + '</div><small>' + fmtAgo(n.created_at) + "</small></div>" +
      "</div>";
    }).join("") : '<div class="empty">Pranešimų nėra.</div>';
    var pushBtn = "";
    if (window.Notification && Notification.permission === "default") {
      pushBtn = '<button type="button" class="btn-outline btn-sm" data-action="enable-push">Rodyti pranešimus ir įrenginio ekrane</button>';
    }
    openModal(
      "<h2>Pranešimai</h2>" + items +
      '<div class="modal-actions">' +
        (myUnreadCount() ? '<button type="button" class="btn-outline left" data-action="notifs-read-all">Pažymėti skaitytais</button>' : "") +
        pushBtn +
        '<button type="button" class="btn" data-action="close-modal">Uždaryti</button>' +
      "</div>"
    );
  }

  // ---------- Apžvalga ----------

  function metricsHtml() {
    var today = todayIso();
    var active = S.tasks.filter(function (t) { return t.statusas !== "atlikta"; });
    var pool = poolTasks();
    var poolHours = pool.reduce(function (a, t) { return a + (Number(t.valandos) || 0); }, 0);
    var late = active.filter(function (t) { return t.terminas && t.terminas < today; });
    var workingToday = {};
    S.shifts.forEach(function (s) { if (s.data === today) workingToday[s.darbuotojas_id] = true; });
    var wtCount = Object.keys(workingToday).length;
    function val(n) { return '<div class="value" data-count="' + n + '">' + (S.viewChanged ? 0 : n) + "</div>"; }
    return '<div class="metrics">' +
      '<div class="metric"><div class="label">Aktyvūs darbai</div>' + val(active.length) + "</div>" +
      '<div class="metric"><div class="label">Nepriskirtos veiklos</div>' + val(pool.length) + '<div class="sub">' + (Math.round(poolHours * 10) / 10) + " val.</div></div>" +
      '<div class="metric"><div class="label">Šiandien dirba</div>' + val(wtCount) + "</div>" +
      '<div class="metric' + (late.length ? " alert" : "") + '"><div class="label">Vėluojantys darbai</div>' + val(late.length) + "</div>" +
    "</div>";
  }

  function ringHtml(emp, l, vac, size) {
    size = size || 96;
    var stroke = Math.round(size * 0.095);
    var r = (size - stroke) / 2 - 1;
    var c = 2 * Math.PI * r;
    var pct = Math.min(100, l.pct);
    var dash = (c * pct / 100).toFixed(1) + " " + c.toFixed(1);
    var col = vac ? "#AEAEB2" : ringColor(l.pct);
    var cx = size / 2;
    return '<div class="ring" style="width:' + size + "px;height:" + size + 'px">' +
      '<svg viewBox="0 0 ' + size + " " + size + '" width="' + size + '" height="' + size + '">' +
        '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="var(--gray-soft)" stroke-width="' + stroke + '"/>' +
        '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' + dash + '" transform="rotate(-90 ' + cx + " " + cx + ')" class="ring-arc"/>' +
      "</svg>" +
      '<div class="ring-pct">' + l.pct + '<span>%</span></div>' +
    "</div>";
  }

  function loadRingsHtml() {
    var today = todayIso();
    var rows = activeEmployees().map(function (e) {
      return { e: e, l: loadOf(e.id), vac: vacationOf(e.id, today) };
    });
    rows.sort(function (a, b) { return b.l.pct - a.l.pct; });
    if (!rows.length) return '<div class="empty">Nėra darbuotojų.</div>';
    return '<div class="ring-grid">' + rows.map(function (r) {
      return '<div class="ring-item" data-action="goto-emp-tasks" data-id="' + r.e.id + '" title="Rodyti darbus">' +
        ringHtml(r.e, r.l, r.vac) +
        '<div class="ring-name">' + esc(shortName(r.e.vardas)) + "</div>" +
        '<div class="ring-sub">' + (r.vac ? VAC_LABEL[r.vac.tipas] : r.l.hours + " / " + r.l.cap + " val.") + "</div>" +
      "</div>";
    }).join("") + "</div>";
  }

  function loadRowsHtml() {
    var today = todayIso();
    var rows = activeEmployees().map(function (e) {
      return { e: e, l: loadOf(e.id), vac: vacationOf(e.id, today) };
    });
    rows.sort(function (a, b) { return b.l.pct - a.l.pct; });
    if (!rows.length) return '<div class="empty">Nėra darbuotojų.</div>';
    return rows.map(function (r) {
      return '<div class="load-row" data-action="goto-emp-tasks" data-id="' + r.e.id + '" title="Rodyti darbus">' +
        '<div class="who">' + avatarHtml(r.e) +
          '<div style="min-width:0"><div class="name">' + esc(r.e.vardas) + '</div><div class="role">' + esc(r.e.pareigos || "") + "</div></div>" +
        "</div>" +
        '<div class="track"><div class="fill ' + fillClass(r.l.pct) + '" style="width:' + Math.min(100, r.l.pct) + '%"></div></div>' +
        '<div class="nums">' + r.l.pct + "% " + (r.vac ? '<span class="chip chip-blue">' + VAC_LABEL[r.vac.tipas] + "</span>" : loadBadge(r.l.pct)) + "<small>" + r.l.hours + " val. iš " + r.l.cap + "</small></div>" +
      "</div>";
    }).join("");
  }

  function dueBadge(t) {
    if (!t.terminas || t.statusas === "atlikta") return "";
    var today = todayIso();
    if (t.terminas === today) return '<span class="chip chip-red">Šiandien</span>';
    if (t.terminas === isoFromDate(addDays(new Date(), 1))) return '<span class="chip chip-amber">Rytoj</span>';
    return "";
  }

  function komBadge(t) {
    var n = S.comments.filter(function (c) { return c.uzduotis_id === t.id; }).length;
    if (!n) return "";
    return '<span class="kom-badge"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-8 8H4l2.5-3A8 8 0 1 1 21 12z"/></svg>' + n + "</span>";
  }

  function katBadge(t) {
    if (!t.kategorija) return "";
    return '<span class="chip chip-cat">' + esc(t.kategorija) + "</span>";
  }

  function poolCardHtml(t) {
    var actions = "";
    if (isAdmin()) {
      actions = '<button class="btn btn-sm" data-action="assign-task" data-id="' + t.id + '">Priskirti</button>' +
        '<button class="btn-outline btn-sm" data-action="split-task" data-id="' + t.id + '">Padalinti</button>' +
        '<button class="btn-ghost btn-sm" data-action="open-task" data-id="' + t.id + '">Redaguoti</button>';
    } else {
      actions = '<button class="btn btn-sm" data-action="take-task" data-id="' + t.id + '">Pasiimti sau</button>';
    }
    return '<div class="pool-card">' +
      '<div class="t-main"><div class="t-title">' + esc(t.pavadinimas) + "</div>" +
        '<div class="t-meta"><span>' + (Number(t.valandos) || 0) + " val.</span>" +
        (t.terminas ? "<span>Iki " + fmtShort(t.terminas) + "</span>" : "") +
        '<span class="chip ' + PRIO_CHIP[t.prioritetas] + '">' + PRIO[t.prioritetas] + "</span>" + katBadge(t) + "</div>" +
      "</div>" +
      '<div class="t-actions">' + actions + "</div>" +
    "</div>";
  }

  function viewApzvalga() {
    var pool = poolTasks();
    var mine = S.me ? S.tasks.filter(function (t) { return t.darbuotojas_id === S.me.id && t.statusas !== "atlikta"; }) : [];
    var html = '<div class="view-title"><div><h1>' + esc(greetingText()) + '</h1><div class="view-sub">' + todayLongLabel() + "</div></div><div class=\"actions\">" +
      (isManager() ? '<button class="btn-outline desktop-only" data-action="tv-on">TV režimas</button>' : "") +
      (isAdmin() ? '<button class="btn" data-action="new-task">+ Naujas darbas</button>' : "") +
      "</div></div>";
    html += metricsHtml();
    if (isManager()) {
      html += '<div class="card"><h2>Komandos užkrova</h2><div class="hint" style="margin-bottom:14px">Aktyvių darbų valandos, palyginus su savaitės valandomis. Paspauskite žmogų — pamatysite jo darbus.</div>' + loadRingsHtml() + "</div>";
    }
    html += '<div class="card"><h2>Bendros veiklos — dar nepriskirtos</h2>';
    if (pool.length) {
      html += pool.map(poolCardHtml).join("");
    } else {
      html += '<div class="empty">Visos veiklos išskirstytos.</div>';
    }
    if (isAdmin()) html += '<button class="btn-outline btn-sm" data-action="new-pool-task">+ Nauja bendra veikla</button>';
    html += "</div>";
    html += '<div class="card"><h2>Mano darbai</h2>';
    if (mine.length) {
      html += mine.map(taskRowHtml).join("");
    } else {
      html += '<div class="empty">Aktyvių darbų neturite.</div>';
    }
    html += "</div>";
    if (!isStandalone()) {
      html += '<div class="card"><h2>Programėlė telefone</h2>' +
        '<div class="hint" style="margin-bottom:4px">Įsidiekite sistemą į telefoną — atsidarys per visą ekraną, be naršyklės.</div>' +
        installBtnHtml() + "</div>";
    }
    return html;
  }

  // ---------- Darbai ----------

  function taskRowHtml(t) {
    var emp = t.darbuotojas_id ? getEmp(t.darbuotojas_id) : null;
    var editable = canEditTask(t);
    var today = todayIso();
    var overdue = t.terminas && t.terminas < today && t.statusas !== "atlikta";
    var statusCtl;
    if (editable) {
      statusCtl = '<select class="status-select st-' + t.statusas + '" data-change="task-status" data-id="' + t.id + '">' +
        Object.keys(STATUS).map(function (k) {
          return '<option value="' + k + '"' + (t.statusas === k ? " selected" : "") + ">" + STATUS[k] + "</option>";
        }).join("") + "</select>";
    } else {
      var chipCls = t.statusas === "atlikta" ? "chip-green" : (t.statusas === "vykdoma" ? "chip-blue" : "chip-gray");
      statusCtl = '<span class="chip ' + chipCls + '">' + STATUS[t.statusas] + "</span>";
    }
    return '<div class="task-row">' +
      avatarHtml(emp) +
      '<div class="t-main"><div class="t-title' + (t.statusas === "atlikta" ? " done" : "") + '">' + esc(t.pavadinimas) + "</div>" +
        '<div class="t-meta">' +
          "<span>" + (emp ? esc(emp.vardas) : "Nepriskirta") + "</span>" +
          "<span>" + (Number(t.valandos) || 0) + " val.</span>" +
          (t.terminas ? '<span class="' + (overdue ? "overdue" : "") + '">Iki ' + fmtShort(t.terminas) + (overdue ? " (vėluoja)" : "") + "</span>" : "") +
          dueBadge(t) +
          '<span class="chip ' + PRIO_CHIP[t.prioritetas] + '">' + PRIO[t.prioritetas] + "</span>" +
          katBadge(t) +
          komBadge(t) +
        "</div>" +
      "</div>" +
      '<div class="t-actions">' + statusCtl +
        (editable ? '<button class="btn-ghost btn-sm" data-action="open-task" data-id="' + t.id + '">Keisti</button>' : "") +
      "</div>" +
    "</div>";
  }

  function viewDarbai() {
    var f = S.filters;
    var q = f.q.trim().toLowerCase();
    function matchQ(t) {
      if (!q) return true;
      var emp = t.darbuotojas_id ? getEmp(t.darbuotojas_id) : null;
      return (t.pavadinimas + " " + (t.aprasymas || "") + " " + (emp ? emp.vardas : "")).toLowerCase().indexOf(q) !== -1;
    }
    function matchStatus(t) {
      if (f.status === "aktyvus") return t.statusas !== "atlikta";
      if (!f.status) return true;
      return t.statusas === f.status;
    }
    function matchKat(t) {
      if (!f.kat) return true;
      return (t.kategorija || "") === f.kat;
    }

    var pool = poolTasks().filter(matchQ).filter(matchKat);
    var list = S.tasks.filter(function (t) {
      if (!t.darbuotojas_id) return false;
      if (f.emp === "pool") return false;
      if (f.emp && t.darbuotojas_id !== f.emp) return false;
      return matchQ(t) && matchStatus(t) && matchKat(t);
    });
    list.sort(function (a, b) {
      var doneA = a.statusas === "atlikta" ? 1 : 0;
      var doneB = b.statusas === "atlikta" ? 1 : 0;
      if (doneA !== doneB) return doneA - doneB;
      var ta = a.terminas || "9999-12-31";
      var tb = b.terminas || "9999-12-31";
      return ta < tb ? -1 : ta > tb ? 1 : 0;
    });

    var empOpts = '<option value="">Visi darbuotojai</option><option value="pool"' + (f.emp === "pool" ? " selected" : "") + ">Tik nepriskirtos veiklos</option>" +
      activeEmployees().map(function (e) {
        return '<option value="' + e.id + '"' + (f.emp === e.id ? " selected" : "") + ">" + esc(e.vardas) + "</option>";
      }).join("");

    var html = '<div class="view-title"><h1>Darbai</h1><div class="actions">' +
      (isAdmin() ? '<button class="btn-outline" data-action="import">Importuoti</button>' : "") +
      (isAdmin() ? '<button class="btn-outline" data-action="report">Ataskaita</button>' : "") +
      '<button class="btn-outline" data-action="export">Eksportuoti į Excel</button>' +
      '<button class="btn" data-action="new-task">+ Naujas darbas</button>' +
    "</div></div>";

    html += '<div class="toolbar">' +
      '<input type="search" id="task-search" placeholder="Paieška…" value="' + esc(f.q) + '" data-input="search">' +
      '<select data-change="filter-emp">' + empOpts + "</select>" +
      '<select data-change="filter-status">' +
        '<option value="aktyvus"' + (f.status === "aktyvus" ? " selected" : "") + ">Aktyvūs</option>" +
        '<option value=""' + (f.status === "" ? " selected" : "") + ">Visi</option>" +
        '<option value="laukia"' + (f.status === "laukia" ? " selected" : "") + ">Laukia</option>" +
        '<option value="vykdoma"' + (f.status === "vykdoma" ? " selected" : "") + ">Vykdomi</option>" +
        '<option value="atlikta"' + (f.status === "atlikta" ? " selected" : "") + ">Atlikti</option>" +
      "</select>" +
      '<select data-change="filter-kat"><option value="">Visos kategorijos</option>' +
        CATEGORIES.map(function (c) { return '<option value="' + esc(c) + '"' + (f.kat === c ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") +
      "</select>" +
    "</div>";

    if (!f.emp || f.emp === "pool") {
      html += '<div class="card"><h2>Bendros veiklos — dar nepriskirtos (' + pool.length + ")</h2>";
      html += pool.length ? pool.map(poolCardHtml).join("") : '<div class="empty">Nepriskirtų veiklų nėra.</div>';
      if (isAdmin()) html += '<button class="btn-outline btn-sm" data-action="new-pool-task">+ Nauja bendra veikla</button>';
      html += "</div>";
    }

    if (f.emp !== "pool") {
      var title = f.emp ? "Darbai: " + esc((getEmp(f.emp) || {}).vardas || "") : "Priskirti darbai";
      html += '<div class="card"><h2>' + title + " (" + list.length + ")</h2>";
      html += list.length ? list.map(taskRowHtml).join("") : '<div class="empty">Darbų pagal pasirinktus filtrus nėra.</div>';
      html += "</div>";
    }
    return html;
  }

  // ---------- Tvarkaraštis ----------

  function shiftsFor(empId, dayIso) {
    return S.shifts.filter(function (s) { return s.darbuotojas_id === empId && s.data === dayIso; })
      .sort(function (a, b) { return a.nuo < b.nuo ? -1 : 1; });
  }

  function viewTvarkarastis() {
    var mon = startOfWeek(S.weekOffset);
    var days = [];
    for (var i = 0; i < 7; i++) days.push(addDays(mon, i));
    var today = todayIso();
    var emps = activeEmployees();

    var html = '<div class="view-title"><h1>Tvarkaraštis</h1><div class="actions">' +
      (isAdmin() && S.schedMode === "week" ? '<button class="btn-outline" data-action="copy-week">Kopijuoti praėjusią savaitę</button>' : "") +
      '<button class="btn" data-action="new-shift">+ Naujas įrašas</button>' +
    "</div></div>";

    html += '<div class="card"><div class="week-nav">' +
      '<div class="wn-left">' +
        '<button class="btn-outline btn-sm wn-arrow" data-action="week-prev">‹</button>' +
        '<span class="range">' + (S.schedMode === "week" ? weekRangeLabel(mon) : monthLabel()) + "</span>" +
        '<button class="btn-outline btn-sm wn-arrow" data-action="week-next">›</button>' +
        '<button class="btn-ghost btn-sm" data-action="week-today">' + (S.schedMode === "week" ? "Ši savaitė" : "Šis mėnuo") + "</button>" +
      "</div>" +
      '<div class="segmented">' +
        '<button class="' + (S.schedMode === "week" ? "active" : "") + '" data-action="sched-week">Savaitė</button>' +
        '<button class="' + (S.schedMode === "month" ? "active" : "") + '" data-action="sched-month">Mėnuo</button>' +
      "</div>" +
    "</div></div>";

    if (S.schedMode === "month") {
      return html + monthGridHtml();
    }

    // Stalo vaizdas (kompiuteriui)
    var thead = "<tr><th style='width:150px'>Darbuotojas</th>" + days.map(function (d, idx) {
      var dIso = isoFromDate(d);
      return "<th class='" + (dIso === today ? "today" : "") + "'>" + DAYS_SHORT[idx] + "<br>" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") + "</th>";
    }).join("") + "</tr>";

    var tbody = emps.map(function (e) {
      var canRow = canManageEmp(e.id);
      var cells = days.map(function (d) {
        var dIso = isoFromDate(d);
        var vac = vacationOf(e.id, dIso);
        var vacHtml = vac ? '<span class="shift-pill vac-pill"' +
          (canRow ? ' data-action="open-vacations" data-id="' + e.id + '"' : "") + ">" +
          VAC_LABEL[vac.tipas] + "</span>" : "";
        var items = shiftsFor(e.id, dIso).map(function (s) {
          var canS = canEditShift(s);
          return '<span class="shift-pill" style="background:' + esc(e.spalva || "#5B5BD6") + '"' +
            (canS ? ' data-action="open-shift" data-id="' + s.id + '"' : "") + ">" +
            esc(s.nuo) + "–" + esc(s.iki) +
            (s.pastaba ? "<small>" + esc(s.pastaba) + "</small>" : "") +
          "</span>";
        }).join("");
        var add = (canRow && !vac) ? '<button class="cell-add" data-action="new-shift" data-emp="' + e.id + '" data-date="' + dIso + '" title="Pridėti">+</button>' : "";
        return "<td class='" + (dIso === today ? "today" : "") + "'>" + vacHtml + items + add + "</td>";
      }).join("");
      return "<tr><td class='emp-cell'>" + esc(e.vardas) + '<span class="role">' + esc(e.pareigos || "") + "</span></td>" + cells + "</tr>";
    }).join("");

    html += '<div class="card desktop-only" style="overflow-x:auto"><table class="sched-table">' + thead + tbody + "</table></div>";

    // Dienos vaizdas (telefonui)
    if (S.selDay == null) {
      S.selDay = S.weekOffset === 0 ? (new Date().getDay() + 6) % 7 : 0;
    }
    var chips = days.map(function (d, idx) {
      return '<button class="day-chip' + (idx === S.selDay ? " active" : "") + '" data-action="day-chip" data-i="' + idx + '">' +
        '<span class="d">' + DAYS_SHORT[idx] + '</span><span class="n">' + d.getDate() + "</span></button>";
    }).join("");
    var selIso = isoFromDate(days[S.selDay]);
    var dayShifts = S.shifts.filter(function (s) { return s.data === selIso; })
      .sort(function (a, b) { return a.nuo < b.nuo ? -1 : 1; });
    var dayList = dayShifts.length ? dayShifts.map(function (s) {
      var e = getEmp(s.darbuotojas_id);
      var canS = canEditShift(s);
      return '<div class="task-row">' + avatarHtml(e) +
        '<div class="t-main"><div class="t-title">' + esc(e ? e.vardas : "?") + "</div>" +
          '<div class="t-meta"><span>' + esc(s.nuo) + "–" + esc(s.iki) + "</span>" + (s.pastaba ? "<span>" + esc(s.pastaba) + "</span>" : "") + "</div>" +
        "</div>" +
        (canS ? '<button class="btn-ghost btn-sm" data-action="open-shift" data-id="' + s.id + '">Keisti</button>' : "") +
      "</div>";
    }).join("") : '<div class="empty">' + DAYS_LONG[S.selDay] + " — įrašų nėra.</div>";

    var vacToday = emps.filter(function (e) { return vacationOf(e.id, selIso); });
    var vacLine = vacToday.length
      ? '<div class="hint" style="margin-bottom:8px">Nedirba: ' + vacToday.map(function (e) { return esc(e.vardas); }).join(", ") + "</div>"
      : "";

    html += '<div class="mobile-only"><div class="day-chips">' + chips + "</div>" +
      '<div class="card"><h2>' + DAYS_LONG[S.selDay] + ", " + MONTHS_GEN[days[S.selDay].getMonth()] + " " + days[S.selDay].getDate() + " d.</h2>" + vacLine + dayList +
      '<button class="btn-outline btn-sm" data-action="new-shift" data-date="' + selIso + '" style="margin-top:8px">+ Pridėti įrašą</button>' +
      "</div></div>";

    return html;
  }

  function monthDate() {
    var n = new Date();
    return new Date(n.getFullYear(), n.getMonth() + S.monthOffset, 1);
  }
  function monthLabel() {
    var d = monthDate();
    return d.getFullYear() + " m. " + MONTHS_NOM[d.getMonth()].toLowerCase();
  }

  function monthGridHtml() {
    var first = monthDate();
    var lastIso = isoFromDate(new Date(first.getFullYear(), first.getMonth() + 1, 0));
    var d = new Date(first);
    d.setDate(first.getDate() - (first.getDay() + 6) % 7);
    var today = todayIso();
    var month = first.getMonth();
    var emps = activeEmployees();
    var rows = "";
    for (var w = 0; w < 6; w++) {
      var cells = "";
      for (var i = 0; i < 7; i++) {
        var dIso = isoFromDate(d);
        var inMonth = d.getMonth() === month;
        var dayShifts = S.shifts.filter(function (s) { return s.data === dIso; });
        var dots = dayShifts.slice(0, 8).map(function (s) {
          var e = getEmp(s.darbuotojas_id);
          return '<span class="m-dot" title="' + esc(e ? e.vardas : "") + '" style="background:' + esc(e ? e.spalva : "#999") + '"></span>';
        }).join("") + (dayShifts.length > 8 ? "<small>+" + (dayShifts.length - 8) + "</small>" : "");
        var vacN = emps.filter(function (e) { return vacationOf(e.id, dIso); }).length;
        cells += '<td class="m-cell' + (inMonth ? "" : " m-out") + (dIso === today ? " today" : "") + '" data-action="month-day" data-date="' + dIso + '">' +
          '<div class="m-num">' + d.getDate() + "</div>" +
          '<div class="m-dots">' + dots + "</div>" +
          (vacN ? '<div class="m-vac">' + vacN + " nedirba</div>" : "") +
        "</td>";
        d.setDate(d.getDate() + 1);
      }
      rows += "<tr>" + cells + "</tr>";
      if (isoFromDate(d) > lastIso) break;
    }
    var head = DAYS_SHORT.map(function (x) { return "<th>" + x + "</th>"; }).join("");
    return '<div class="card" style="overflow-x:auto"><div class="hint" style="margin-bottom:8px">Taškai — tvarkaraščio įrašai (spalva pagal žmogų). Paspauskite dieną — atsidarys jos savaitė.</div>' +
      '<table class="sched-table month-table"><tr>' + head + "</tr>" + rows + "</table></div>";
  }

  async function copyPrevWeek() {
    var curMon = startOfWeek(S.weekOffset);
    var prevMon = startOfWeek(S.weekOffset - 1);
    var dateMap = {};
    for (var i = 0; i < 7; i++) dateMap[isoFromDate(addDays(prevMon, i))] = isoFromDate(addDays(curMon, i));
    var toCopy = S.shifts.filter(function (s) { return dateMap[s.data]; });
    if (!toCopy.length) { toast("Praėjusioje savaitėje įrašų nėra."); return; }
    if (!confirm("Nukopijuoti " + toCopy.length + " praėjusios savaitės įrašų į rodomą savaitę?")) return;
    var existing = {};
    S.shifts.forEach(function (s) { existing[s.darbuotojas_id + "|" + s.data + "|" + s.nuo] = true; });
    var created = 0, skipped = 0;
    for (var j = 0; j < toCopy.length; j++) {
      var s = toCopy[j];
      var nd = dateMap[s.data];
      if (existing[s.darbuotojas_id + "|" + nd + "|" + s.nuo]) { skipped++; continue; }
      try {
        await API.addShift({ darbuotojas_id: s.darbuotojas_id, data: nd, nuo: s.nuo, iki: s.iki, pastaba: s.pastaba || "" });
        created++;
      } catch (e) { skipped++; }
    }
    toast("Nukopijuota: " + created + (skipped ? " (praleista: " + skipped + ")" : ""));
    await refreshData();
  }

  // ---------- Komanda ----------

  function teamCardHtml(e) {
    var l = loadOf(e.id);
    var vac = vacationOf(e.id, todayIso());
    var canVac = canManageEmp(e.id);
    var showLoad = isManager() || (S.me && e.id === S.me.id);
    return '<div class="team-card">' +
      '<div class="head">' + avatarHtml(e, true) +
        '<div style="min-width:0"><div class="name">' + esc(e.vardas) + (e.role === "admin" ? ' <span class="chip chip-primary">Admin</span>' : (e.role === "vadovas" ? ' <span class="chip chip-amber">Vadovas</span>' : "")) +
        (vac ? ' <span class="chip chip-blue">' + VAC_LABEL[vac.tipas] + "</span>" : "") + "</div>" +
        '<div class="pareigos">' + esc(e.pareigos || "—") + "</div></div>" +
      "</div>" +
      '<div class="resp">' + (e.atsakomybes ? esc(e.atsakomybes) : '<span style="opacity:.6">Atsakomybės dar neaprašytos.</span>') + "</div>" +
      (showLoad ? '<div class="mini-track"><div class="mini-fill ' + fillClass(l.pct) + '" style="width:' + Math.min(100, l.pct) + '%"></div></div>' : "") +
      '<div class="foot"><span>' + (showLoad ? l.hours + " val. iš " + l.cap + " (" + etatoStr(l.cap) + " et., " + l.pct + "%)" : esc(e.pareigos || "")) + "</span><span>" +
        (canVac ? '<button class="btn-ghost btn-sm" data-action="open-vacations" data-id="' + e.id + '">Atostogos</button>' : "") +
        (isAdmin() && S.me && e.id !== S.me.id ? '<button class="btn-ghost btn-sm" data-action="view-as" data-id="' + e.id + '">Žiūrėti kaip</button>' : "") +
        (isAdmin() ? '<button class="btn-ghost btn-sm" data-action="open-emp" data-id="' + e.id + '">Redaguoti</button>' : "") +
      "</span></div>" +
      (!e.aktyvus ? '<div style="margin-top:8px"><span class="chip chip-gray">Neaktyvus</span></div>' : "") +
    "</div>";
  }

  function viewKomanda() {
    var q = S.teamQ.trim().toLowerCase();
    function matchEmp(e) {
      if (!q) return true;
      return (e.vardas + " " + (e.pareigos || "") + " " + (e.atsakomybes || "")).toLowerCase().indexOf(q) !== -1;
    }
    var act = activeEmployees().filter(matchEmp);
    var inact = S.employees.filter(function (e) { return !e.aktyvus && matchEmp(e); });
    var html = '<div class="view-title"><h1>Komanda</h1><div class="actions">' +
      (isAdmin() ? '<button class="btn" data-action="new-emp">+ Pridėti darbuotoją</button>' : "") +
    "</div></div>";
    html += '<div class="toolbar"><input type="search" id="team-search" placeholder="Ieškoti žmogaus…" value="' + esc(S.teamQ) + '" data-input="team-search"></div>';
    if (isAdmin() && S.mode === "supabase") {
      var noEmail = act.filter(function (e) { return !e.email; }).length;
      if (noEmail) {
        html += '<div class="card" style="border-color:#F2A33C"><div class="hint">' + noEmail + " darbuotojo (-ų) profiliai dar be el. pašto. Įrašykite el. paštą (Redaguoti), kad žmogus galėtų užsiregistruoti ir prisijungti.</div></div>";
      }
    }
    html += '<div class="team-grid">' + act.map(teamCardHtml).join("") + "</div>";
    if (inact.length && isAdmin()) {
      html += '<div class="section-label">Neaktyvūs</div><div class="team-grid">' + inact.map(teamCardHtml).join("") + "</div>";
    }
    return html;
  }

  // ---------- Prieinamumas ----------

  function availEditableEmps() {
    var list = activeEmployees();
    if (isAdmin()) return list;
    if (!S.me) return [];
    return list.filter(function (e) { return e.id === S.me.id || managesEmp(e.id); });
  }
  function weekdayOfIso(iso) { return ((dateFromIso(iso).getDay() + 6) % 7) + 1; }

  function resolveAvail(empId, dateIso, wd) {
    var ov = S.availability.filter(function (a) { return a.darbuotojas_id === empId && a.data === dateIso; });
    if (ov.length) {
      if (ov.some(function (a) { return a.nedirba; })) return { type: "override", nedirba: true, blocks: [] };
      return { type: "override", nedirba: false, blocks: ov.filter(function (a) { return a.nuo; }).sort(function (a, b) { return a.nuo < b.nuo ? -1 : 1; }) };
    }
    var tmpl = S.availTemplate.filter(function (t) { return t.darbuotojas_id === empId && t.savaite_diena === wd; })
      .sort(function (a, b) { return a.nuo < b.nuo ? -1 : 1; });
    if (tmpl.length) return { type: "sablonas", nedirba: false, blocks: tmpl };
    return { type: "none", nedirba: false, blocks: [] };
  }

  function availBlockHtml(b, canDel, kind) {
    return '<div class="avail-block' + (kind === "sablonas" ? " tmpl" : "") + '">' +
      "<span>" + esc(String(b.nuo).slice(0, 5)) + "–" + esc(String(b.iki).slice(0, 5)) + "</span>" +
      (canDel ? '<button class="avail-x" data-action="avail-del" data-id="' + b.id + '" data-kind="' + (kind === "tmpl" ? "tmpl" : "date") + '" title="Pašalinti">×</button>' : "") +
    "</div>";
  }

  function viewPrieinamumas() {
    if (!S.me) return "";
    var editable = availEditableEmps();
    var empId = (S.availEmpId && editable.some(function (e) { return e.id === S.availEmpId; })) ? S.availEmpId : S.me.id;
    var canEdit = canManageEmp(empId);

    var html = '<div class="view-title"><div><h1>Prieinamumas</h1><div class="view-sub">Kada gali dirbti ar vesti veiklas</div></div></div>';

    html += '<div class="avail-controls">';
    if (editable.length > 1) {
      html += '<select class="avail-emp-sel" data-change="avail-emp">' + editable.map(function (e) {
        return '<option value="' + e.id + '"' + (e.id === empId ? " selected" : "") + ">" + esc(e.vardas) + (e.id === S.me.id ? " (aš)" : "") + "</option>";
      }).join("") + "</select>";
    }
    html += '<div class="segmented avail-seg">' +
      '<button class="' + (S.availMode === "savaite" ? "active" : "") + '" data-action="avail-mode" data-m="savaite">Savaitė</button>' +
      '<button class="' + (S.availMode === "sablonas" ? "active" : "") + '" data-action="avail-mode" data-m="sablonas">Šablonas</button>' +
    "</div></div>";

    if (S.availMode === "sablonas") {
      html += '<div class="hint" style="margin-bottom:12px">Šablonas galioja <b>kas savaitę</b>. Konkrečią savaitę gali pakoreguoti atskirai (skiltis „Savaitė").</div>';
      html += '<div class="avail-grid">';
      for (var wd = 1; wd <= 7; wd++) {
        var tb = S.availTemplate.filter(function (t) { return t.darbuotojas_id === empId && t.savaite_diena === wd; })
          .sort(function (a, b) { return a.nuo < b.nuo ? -1 : 1; });
        html += '<div class="avail-day"><div class="avail-day-h">' + DAYS_LONG[wd - 1] + "</div>" +
          (tb.length ? tb.map(function (b) { return availBlockHtml(b, canEdit, "tmpl"); }).join("") : '<div class="avail-empty">—</div>') +
          (canEdit ? '<button class="btn-ghost btn-sm avail-addbtn" data-action="avail-add" data-emp="' + empId + '" data-wd="' + wd + '">+ Laikas</button>' : "") +
        "</div>";
      }
      html += "</div>";
    } else {
      var mon = startOfWeek(S.availWeekOffset);
      html += '<div class="card" style="margin-bottom:14px"><div class="week-nav"><div class="wn-left">' +
        '<button class="btn-outline btn-sm wn-arrow" data-action="avail-week-prev">‹</button>' +
        '<span class="range">' + esc(weekRangeLabel(mon)) + (S.availWeekOffset === 0 ? " · ši savaitė" : "") + "</span>" +
        '<button class="btn-outline btn-sm wn-arrow" data-action="avail-week-next">›</button>' +
        '<button class="btn-ghost btn-sm" data-action="avail-week-today">Ši savaitė</button>' +
      "</div></div></div>";
      html += '<div class="avail-grid">';
      for (var i = 0; i < 7; i++) {
        var d = addDays(mon, i);
        var iso = isoFromDate(d);
        var r = resolveAvail(empId, iso, i + 1);
        var inner;
        if (r.nedirba) inner = '<div class="avail-block neg">Negaliu</div>';
        else if (r.blocks.length) {
          inner = r.blocks.map(function (b) { return availBlockHtml(b, canEdit && r.type === "override", r.type); }).join("");
          if (r.type === "sablonas") inner += '<div class="avail-tag">pagal šabloną</div>';
        } else inner = '<div class="avail-empty">—</div>';
        html += '<div class="avail-day' + (iso === todayIso() ? " today" : "") + '">' +
          '<div class="avail-day-h">' + DAYS_SHORT[i] + " <span>" + d.getDate() + "</span></div>" + inner +
          (canEdit ? '<div class="avail-actions">' +
            '<button class="btn-ghost btn-sm" data-action="avail-add" data-emp="' + empId + '" data-date="' + iso + '">+ Laikas</button>' +
            (r.nedirba || r.type === "override"
              ? '<button class="btn-ghost btn-sm" data-action="avail-reset" data-emp="' + empId + '" data-date="' + iso + '">Pagal šabloną</button>'
              : '<button class="btn-ghost btn-sm" data-action="avail-negaliu" data-emp="' + empId + '" data-date="' + iso + '">Negaliu</button>') +
          "</div>" : "") +
        "</div>";
      }
      html += "</div>";
    }
    if (!canEdit) html += '<div class="hint" style="margin-top:12px">Šio žmogaus prieinamumą keisti gali tik jis pats, kuratorius arba administratorius.</div>';
    return html;
  }

  function availAddModal(empId, opts) {
    var ov = openModal(
      "<h2>Pridėti laiką</h2>" +
      '<form id="avail-form"><div class="form-grid">' +
        '<div class="form-row"><label>Nuo</label><input type="time" name="nuo" required value="09:00"></div>' +
        '<div class="form-row"><label>Iki</label><input type="time" name="iki" required value="12:00"></div>' +
      "</div>" +
      '<div class="form-error" id="avail-err"></div>' +
      '<div class="modal-actions"><button type="button" class="btn-outline" data-action="close-modal">Atšaukti</button>' +
      '<button type="submit" class="btn">Pridėti</button></div></form>'
    );
    ov.querySelector("#avail-form").addEventListener("submit", async function (ev) {
      ev.preventDefault();
      var fd = new FormData(ev.target);
      var nuo = String(fd.get("nuo") || ""), iki = String(fd.get("iki") || "");
      var err = ov.querySelector("#avail-err");
      if (!nuo || !iki || iki <= nuo) { err.textContent = "Pabaiga turi būti vėlesnė už pradžią."; return; }
      try {
        if (opts.wd) {
          await API.addAvailTemplate({ darbuotojas_id: empId, savaite_diena: opts.wd, nuo: nuo, iki: iki });
        } else {
          var hasOv = S.availability.some(function (a) { return a.darbuotojas_id === empId && a.data === opts.date; });
          if (!hasOv) {
            var tmpl = S.availTemplate.filter(function (t) { return t.darbuotojas_id === empId && t.savaite_diena === weekdayOfIso(opts.date); });
            for (var k = 0; k < tmpl.length; k++) {
              await API.addAvailability({ darbuotojas_id: empId, data: opts.date, nuo: tmpl[k].nuo, iki: tmpl[k].iki, nedirba: false });
            }
          }
          await API.addAvailability({ darbuotojas_id: empId, data: opts.date, nuo: nuo, iki: iki, nedirba: false });
        }
        closeModal();
        toast("Pridėta");
        await refreshData();
      } catch (e) {
        err.textContent = e.message || "Nepavyko";
      }
    });
  }

  // ---------- Datų parinkiklis (Apple stilius, ISO 2026-06-01) ----------

  function datePickerHtml(name, value) {
    value = value || "";
    return '<div class="dp">' +
      '<button type="button" class="dp-field" data-action="dp-toggle">' +
        '<span class="dp-val' + (value ? "" : " empty") + '">' + (value ? esc(value) : "Pasirinkti datą") + "</span>" +
        '<svg class="dp-ic" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>' +
      "</button>" +
      '<input type="hidden" name="' + name + '" value="' + esc(value) + '">' +
      '<div class="dp-cal" hidden></div>' +
    "</div>";
  }
  function dpCalHtml(year, month, selected) {
    var first = new Date(year, month, 1);
    var startWd = (first.getDay() + 6) % 7;
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var todayI = todayIso();
    var head = DAYS_SHORT.map(function (d) { return '<span class="dp-wd">' + d + "</span>"; }).join("");
    var cells = "";
    for (var b = 0; b < startWd; b++) cells += '<span class="dp-cell empty"></span>';
    for (var dd = 1; dd <= daysInMonth; dd++) {
      var iso = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(dd).padStart(2, "0");
      var cls = "dp-cell";
      if (iso === selected) cls += " sel";
      if (iso === todayI) cls += " today";
      cells += '<button type="button" class="' + cls + '" data-action="dp-day" data-val="' + iso + '">' + dd + "</button>";
    }
    return '<div class="dp-cal-inner" data-ym="' + year + "-" + String(month + 1).padStart(2, "0") + '">' +
      '<div class="dp-cal-head"><button type="button" class="dp-nav" data-action="dp-prev">‹</button>' +
      '<span class="dp-month">' + MONTHS_NOM[month] + " " + year + "</span>" +
      '<button type="button" class="dp-nav" data-action="dp-next">›</button></div>' +
      '<div class="dp-wds">' + head + "</div>" +
      '<div class="dp-grid">' + cells + "</div>" +
      '<div class="dp-foot"><button type="button" class="dp-today-btn" data-action="dp-today">Šiandien</button>' +
      '<button type="button" class="dp-clear-btn" data-action="dp-clear">Išvalyti</button></div>' +
    "</div>";
  }

  // ---------- Modalai ----------

  function openModal(innerHtml) {
    closeModal();
    var ov = document.createElement("div");
    ov.className = "modal-overlay";
    ov.id = "modal-overlay";
    ov.innerHTML = '<div class="modal">' + innerHtml + "</div>";
    ov.addEventListener("mousedown", function (ev) {
      if (ev.target === ov) closeModal();
    });
    document.body.appendChild(ov);
    var first = ov.querySelector("input, select, textarea");
    if (first) first.focus();
    return ov;
  }
  function closeModal() {
    var ov = document.getElementById("modal-overlay");
    if (ov) ov.remove();
  }

  function empSelectOptions(selectedId, includeNone, includeAll) {
    var opts = includeNone ? '<option value="">— Nepriskirta (bendra veikla) —</option>' : "";
    if (includeAll) opts += '<option value="__ALL__"' + (selectedId === "__ALL__" ? " selected" : "") + ">— Visi darbuotojai (kiekvienam po kopiją) —</option>";
    var list;
    if (isAdmin()) {
      list = activeEmployees();
    } else if (S.me) {
      // pats + kuruojami darbuotojai
      list = [S.me].concat(activeEmployees().filter(function (e) { return e.id !== S.me.id && managesEmp(e.id); }));
    } else {
      list = [];
    }
    opts += list.map(function (e) {
      return '<option value="' + e.id + '"' + (selectedId === e.id ? " selected" : "") + ">" + esc(e.vardas) + "</option>";
    }).join("");
    return opts;
  }

  function taskModal(task, opts) {
    opts = opts || {};
    var isNew = !task;
    var t = task || {
      pavadinimas: "", aprasymas: "", valandos: 4, terminas: "",
      prioritetas: "vidutinis", statusas: "laukia", kategorija: "",
      darbuotojas_id: opts.pool ? null : (isAdmin() ? null : (S.me ? S.me.id : null))
    };
    var ov = openModal(
      "<h2>" + (isNew ? (opts.pool ? "Nauja bendra veikla" : "Naujas darbas") : "Darbo redagavimas") + "</h2>" +
      '<form id="task-form">' +
        '<div class="form-row"><label>Pavadinimas *</label><input type="text" name="pavadinimas" required maxlength="200" value="' + esc(t.pavadinimas) + '"></div>' +
        '<div class="form-row"><label>Kam priskirta</label><select name="darbuotojas_id">' + empSelectOptions(t.darbuotojas_id, isAdmin(), isAdmin() && isNew) + "</select></div>" +
        '<div class="form-grid">' +
          '<div class="form-row"><label>Valandos</label><input type="number" name="valandos" min="0" step="0.5" value="' + esc(t.valandos) + '"></div>' +
          '<div class="form-row"><label>Terminas</label>' + datePickerHtml("terminas", t.terminas || "") + "</div>" +
          '<div class="form-row"><label>Prioritetas</label><select name="prioritetas">' +
            Object.keys(PRIO).map(function (k) { return '<option value="' + k + '"' + (t.prioritetas === k ? " selected" : "") + ">" + PRIO[k] + "</option>"; }).join("") +
          "</select></div>" +
          '<div class="form-row"><label>Statusas</label><select name="statusas">' +
            Object.keys(STATUS).map(function (k) { return '<option value="' + k + '"' + (t.statusas === k ? " selected" : "") + ">" + STATUS[k] + "</option>"; }).join("") +
          "</select></div>" +
          '<div class="form-row"><label>Kategorija</label><select name="kategorija"><option value="">—</option>' +
            CATEGORIES.map(function (c) { return '<option value="' + esc(c) + '"' + (t.kategorija === c ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") +
          "</select></div>" +
        "</div>" +
        '<div class="form-row"><label>Aprašymas</label><textarea name="aprasymas">' + esc(t.aprasymas || "") + "</textarea></div>" +
        '<div class="form-error" id="task-err"></div>' +
        '<div class="modal-actions">' +
          (!isNew && canEditTask(task) ? '<button type="button" class="btn-ghost left" id="task-del" style="color:var(--red)">Ištrinti</button>' : "") +
          '<button type="button" class="btn-outline" data-action="close-modal">Atšaukti</button>' +
          '<button type="submit" class="btn">Išsaugoti</button>' +
        "</div>" +
      "</form>" +
      (!isNew ? '<div class="kom-sec"><div class="section-label" style="margin-top:16px">Komentarai</div>' +
        '<div id="kom-list">' + komListHtml(task.id) + "</div>" +
        '<div class="kom-form"><input type="text" id="kom-input" maxlength="500" placeholder="Rašyti komentarą…"><button type="button" class="btn btn-sm" id="kom-send">Siųsti</button></div></div>' : "")
    );
    ov.querySelector("#task-form").addEventListener("submit", async function (ev) {
      ev.preventDefault();
      var fd = new FormData(ev.target);
      var obj = {
        pavadinimas: String(fd.get("pavadinimas")).trim(),
        darbuotojas_id: fd.get("darbuotojas_id") || null,
        valandos: Number(fd.get("valandos")) || 0,
        terminas: fd.get("terminas") || null,
        prioritetas: fd.get("prioritetas"),
        statusas: fd.get("statusas"),
        kategorija: fd.get("kategorija") || "",
        aprasymas: String(fd.get("aprasymas") || "").trim()
      };
      if (!obj.pavadinimas) return;
      if (obj.statusas === "atlikta") {
        if (isNew || task.statusas !== "atlikta") obj.atlikta_at = new Date().toISOString();
      } else {
        obj.atlikta_at = null;
      }
      // Priskyrimas visai komandai — po kopiją kiekvienam darbuotojui
      if (isNew && obj.darbuotojas_id === "__ALL__") {
        var emps = activeEmployees();
        if (!emps.length) { closeModal(); return; }
        var base = Object.assign({}, obj); delete base.darbuotojas_id;
        try {
          for (var i = 0; i < emps.length; i++) {
            await API.addTask(Object.assign({}, base, { darbuotojas_id: emps[i].id }));
            notifyUser(emps[i].id, "Jums priskirta veikla: „" + obj.pavadinimas + "“", "darbai");
          }
          toast("Priskirta visai komandai (" + emps.length + ")");
          closeModal();
          await refreshData();
        } catch (e) {
          toast(e.message || "Nepavyko");
          await refreshData();
        }
        return;
      }
      var ok = isNew
        ? await mutate(API.addTask(obj), "Darbas išsaugotas")
        : await mutate(API.updateTask(task.id, obj), "Pakeitimai išsaugoti");
      if (ok) {
        var prevAssignee = isNew ? null : task.darbuotojas_id;
        if (obj.darbuotojas_id && obj.darbuotojas_id !== prevAssignee) {
          notifyUser(obj.darbuotojas_id, "Jums priskirtas darbas: „" + obj.pavadinimas + "“", "darbai");
        }
        closeModal();
      }
    });
    var del = ov.querySelector("#task-del");
    if (del) del.addEventListener("click", async function () {
      if (!confirm("Tikrai ištrinti šį darbą?")) return;
      if (await mutate(API.deleteTask(task.id), "Darbas ištrintas")) closeModal();
    });
    var komSend = ov.querySelector("#kom-send");
    if (komSend) {
      var sendComment = async function () {
        var inp = ov.querySelector("#kom-input");
        var txt = String(inp.value || "").trim();
        if (!txt || !S.me) return;
        try {
          await API.addComment({ uzduotis_id: task.id, darbuotojas_id: S.me.id, tekstas: txt });
          if (task.darbuotojas_id && task.darbuotojas_id !== S.me.id) {
            notifyUser(task.darbuotojas_id, S.me.vardas + " pakomentavo „" + task.pavadinimas + "“", "darbai");
          }
          inp.value = "";
          applyData(await API.fetchAll());
          var listEl = ov.querySelector("#kom-list");
          if (listEl) listEl.innerHTML = komListHtml(task.id);
        } catch (e) {
          toast(e.message || "Nepavyko išsiųsti komentaro");
        }
      };
      komSend.addEventListener("click", sendComment);
      ov.querySelector("#kom-input").addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") { ev.preventDefault(); sendComment(); }
      });
    }
  }

  function komListHtml(taskId) {
    var list = S.comments.filter(function (c) { return c.uzduotis_id === taskId; });
    if (!list.length) return '<div class="hint">Komentarų dar nėra.</div>';
    return list.map(function (c) {
      var emp = getEmp(c.darbuotojas_id);
      var canDel = isAdmin() || (S.me && c.darbuotojas_id === S.me.id);
      return '<div class="kom-row">' + avatarHtml(emp) +
        '<div class="kom-main"><div class="kom-head"><b>' + esc(emp ? emp.vardas : "?") + "</b><small>" + fmtAgo(c.created_at) + "</small>" +
        (canDel ? '<button class="btn-ghost btn-sm" data-action="del-comment" data-id="' + c.id + '" data-task="' + taskId + '" title="Ištrinti">×</button>' : "") +
        "</div><div class='kom-text'>" + esc(c.tekstas) + "</div></div></div>";
    }).join("");
  }

  function assignModal(task) {
    var todayI = todayIso();
    var rows = activeEmployees().map(function (e) {
      return { e: e, l: loadOf(e.id), vac: vacationOf(e.id, todayI) };
    }).sort(function (a, b) {
      if (!!a.vac !== !!b.vac) return a.vac ? 1 : -1;
      return a.l.pct - b.l.pct;
    });
    var ov = openModal(
      "<h2>Kam priskirti: " + esc(task.pavadinimas) + "</h2>" +
      '<div class="hint" style="margin-bottom:10px">Sąrašas surikiuotas nuo mažiausios užkrovos.</div>' +
      rows.map(function (r, i) {
        return '<div class="pick-row" data-pick="' + r.e.id + '">' + avatarHtml(r.e) +
          '<span style="font-weight:600;white-space:nowrap">' + esc(r.e.vardas) + "</span>" +
          (i === 0 && !r.vac ? '<span class="chip chip-green">Siūloma</span>' : "") +
          (r.vac ? '<span class="chip chip-blue">' + VAC_LABEL[r.vac.tipas] + "</span>" : "") +
          '<div class="track"><div class="fill ' + fillClass(r.l.pct) + '" style="width:' + Math.min(100, r.l.pct) + '%"></div></div>' +
          '<span class="pct">' + r.l.pct + "%</span>" +
        "</div>";
      }).join("") +
      '<div class="modal-actions">' +
        '<button type="button" class="btn-ghost left" id="assign-all">Priskirti visiems</button>' +
        '<button type="button" class="btn-outline" data-action="close-modal">Atšaukti</button>' +
        '<button type="button" class="btn" id="assign-ok" disabled>Priskirti</button>' +
      "</div>"
    );
    var selected = null;
    ov.querySelector("#assign-all").addEventListener("click", async function () {
      var emps = activeEmployees();
      if (!emps.length) return;
      if (!confirm("Priskirti šią veiklą visiems (" + emps.length + ") komandos nariams? Kiekvienas gaus po atskirą kopiją.")) return;
      try {
        for (var i = 0; i < emps.length; i++) {
          await API.addTask({
            pavadinimas: task.pavadinimas, aprasymas: task.aprasymas || "",
            darbuotojas_id: emps[i].id, valandos: Number(task.valandos) || 0,
            terminas: task.terminas || null, prioritetas: task.prioritetas,
            statusas: "laukia", kategorija: task.kategorija || ""
          });
          notifyUser(emps[i].id, "Jums priskirta veikla: „" + task.pavadinimas + "“", "darbai");
        }
        await API.deleteTask(task.id);
        toast("Priskirta visai komandai (" + emps.length + ")");
        closeModal();
        await refreshData();
      } catch (e) {
        toast(e.message || "Nepavyko");
        await refreshData();
      }
    });
    ov.querySelectorAll(".pick-row").forEach(function (row) {
      row.addEventListener("click", function () {
        ov.querySelectorAll(".pick-row").forEach(function (r) { r.classList.remove("selected"); });
        row.classList.add("selected");
        selected = row.getAttribute("data-pick");
        ov.querySelector("#assign-ok").disabled = false;
      });
    });
    ov.querySelector("#assign-ok").addEventListener("click", async function () {
      if (!selected) return;
      var emp = getEmp(selected);
      if (await mutate(API.updateTask(task.id, { darbuotojas_id: selected }), "Priskirta: " + (emp ? emp.vardas : ""))) {
        notifyUser(selected, "Jums priskirta veikla: „" + task.pavadinimas + "“", "darbai");
        closeModal();
      }
    });
  }

  function splitModal(task) {
    var emps = activeEmployees().map(function (e) { return { e: e, l: loadOf(e.id) }; })
      .sort(function (a, b) { return a.l.pct - b.l.pct; });
    var ov = openModal(
      "<h2>Padalinti: " + esc(task.pavadinimas) + "</h2>" +
      '<div class="hint" style="margin-bottom:10px">Iš viso ' + (Number(task.valandos) || 0) + " val. Pažymėkite žmones — valandos pasidalins po lygiai, skaičius galite pasikoreguoti.</div>" +
      emps.map(function (r) {
        return '<label class="pick-row" style="cursor:pointer">' +
          '<input type="checkbox" class="split-check" value="' + r.e.id + '">' +
          avatarHtml(r.e) +
          '<span style="flex:1;font-weight:600">' + esc(r.e.vardas) + ' <span style="font-weight:400;color:var(--muted);font-size:12px">' + r.l.pct + "%</span></span>" +
          '<input type="number" class="split-hours" data-emp="' + r.e.id + '" min="0" step="0.5" value="0" disabled> val.' +
        "</label>";
      }).join("") +
      '<div class="form-error" id="split-err"></div>' +
      '<div class="modal-actions">' +
        '<button type="button" class="btn-outline" data-action="close-modal">Atšaukti</button>' +
        '<button type="button" class="btn" id="split-ok">Padalinti</button>' +
      "</div>"
    );
    function recalc() {
      var checks = Array.prototype.slice.call(ov.querySelectorAll(".split-check:checked"));
      var n = checks.length;
      var each = n ? Math.round(((Number(task.valandos) || 0) / n) * 2) / 2 : 0;
      ov.querySelectorAll(".split-hours").forEach(function (inp) {
        var on = checks.some(function (c) { return c.value === inp.getAttribute("data-emp"); });
        inp.disabled = !on;
        inp.value = on ? each : 0;
      });
    }
    ov.querySelectorAll(".split-check").forEach(function (c) { c.addEventListener("change", recalc); });
    ov.querySelector("#split-ok").addEventListener("click", async function () {
      var parts = [];
      ov.querySelectorAll(".split-check:checked").forEach(function (c) {
        var inp = ov.querySelector('.split-hours[data-emp="' + c.value + '"]');
        parts.push({ emp: c.value, hours: Number(inp.value) || 0 });
      });
      if (parts.length < 1) {
        ov.querySelector("#split-err").textContent = "Pažymėkite bent vieną darbuotoją.";
        return;
      }
      try {
        for (var i = 0; i < parts.length; i++) {
          await API.addTask({
            pavadinimas: task.pavadinimas,
            aprasymas: task.aprasymas || "",
            darbuotojas_id: parts[i].emp,
            valandos: parts[i].hours,
            terminas: task.terminas || null,
            prioritetas: task.prioritetas,
            statusas: "laukia"
          });
        }
        await API.deleteTask(task.id);
        parts.forEach(function (p) {
          notifyUser(p.emp, "Jums priskirta veiklos dalis: „" + task.pavadinimas + "“ (" + p.hours + " val.)", "darbai");
        });
        toast("Veikla padalinta " + parts.length + " žmonėms");
        closeModal();
        await refreshData();
      } catch (e) {
        ov.querySelector("#split-err").textContent = e.message || "Įvyko klaida";
        await refreshData();
      }
    });
  }

  function shiftModal(shift, presetEmp, presetDate) {
    var isNew = !shift;
    var s = shift || {
      darbuotojas_id: presetEmp || (isAdmin() ? "" : (S.me ? S.me.id : "")),
      data: presetDate || todayIso(),
      nuo: "08:00", iki: "17:00", pastaba: ""
    };
    var ov = openModal(
      "<h2>" + (isNew ? "Naujas tvarkaraščio įrašas" : "Įrašo redagavimas") + "</h2>" +
      '<form id="shift-form">' +
        '<div class="form-row"><label>Darbuotojas *</label><select name="darbuotojas_id" required>' +
          (isAdmin() && !s.darbuotojas_id ? '<option value="">— Pasirinkite —</option>' : "") +
          empSelectOptions(s.darbuotojas_id, false) +
        "</select></div>" +
        '<div class="form-row"><label>Data *</label>' + datePickerHtml("data", s.data || todayIso()) + "</div>" +
        '<div class="form-grid">' +
          '<div class="form-row"><label>Nuo</label><input type="time" name="nuo" required value="' + esc(s.nuo) + '"></div>' +
          '<div class="form-row"><label>Iki</label><input type="time" name="iki" required value="' + esc(s.iki) + '"></div>' +
        "</div>" +
        '<div class="form-row"><label>Pastaba</label><input type="text" name="pastaba" maxlength="120" value="' + esc(s.pastaba || "") + '" placeholder="pvz., dirbtuvės, renginys…"></div>' +
        '<div class="form-error" id="shift-err"></div>' +
        '<div class="modal-actions">' +
          (!isNew && canEditShift(shift) ? '<button type="button" class="btn-ghost left" id="shift-del" style="color:var(--red)">Ištrinti</button>' : "") +
          '<button type="button" class="btn-outline" data-action="close-modal">Atšaukti</button>' +
          '<button type="submit" class="btn">Išsaugoti</button>' +
        "</div>" +
      "</form>"
    );
    ov.querySelector("#shift-form").addEventListener("submit", async function (ev) {
      ev.preventDefault();
      var fd = new FormData(ev.target);
      var obj = {
        darbuotojas_id: fd.get("darbuotojas_id"),
        data: fd.get("data"),
        nuo: fd.get("nuo"),
        iki: fd.get("iki"),
        pastaba: String(fd.get("pastaba") || "").trim()
      };
      if (!obj.darbuotojas_id) {
        ov.querySelector("#shift-err").textContent = "Pasirinkite darbuotoją.";
        return;
      }
      if (obj.iki <= obj.nuo) {
        ov.querySelector("#shift-err").textContent = "Pabaigos laikas turi būti vėlesnis už pradžios.";
        return;
      }
      var ok = isNew
        ? await mutate(API.addShift(obj), "Įrašas išsaugotas")
        : await mutate(API.updateShift(shift.id, obj), "Pakeitimai išsaugoti");
      if (ok) {
        if (isNew) notifyUser(obj.darbuotojas_id, "Naujas tvarkaraščio įrašas: " + obj.data + " " + obj.nuo + "–" + obj.iki, "tvarkarastis");
        closeModal();
      }
    });
    var del = ov.querySelector("#shift-del");
    if (del) del.addEventListener("click", async function () {
      if (!confirm("Tikrai ištrinti šį įrašą?")) return;
      if (await mutate(API.deleteShift(shift.id), "Įrašas ištrintas")) closeModal();
    });
  }

  function empModal(emp) {
    var isNew = !emp;
    var e = emp || {
      vardas: "", email: "", pareigos: "", atsakomybes: "",
      savaites_valandos: 40, role: "darbuotojas", spalva: "#5B5BD6", aktyvus: true
    };
    var ov = openModal(
      "<h2>" + (isNew ? "Naujas darbuotojas" : "Darbuotojo redagavimas") + "</h2>" +
      '<form id="emp-form">' +
        '<div class="form-row"><label>Vardas, pavardė *</label><input type="text" name="vardas" required maxlength="120" value="' + esc(e.vardas) + '"></div>' +
        '<div class="form-row"><label>El. paštas (prisijungimui)</label><input type="email" name="email" value="' + esc(e.email || "") + '" placeholder="vardas@vdu.lt">' +
          '<div class="hint" style="margin-top:4px">Įrašius el. paštą, žmogus galės užsiregistruoti šiuo adresu ir prisijungti prie sistemos.</div></div>' +
        '<div class="form-grid">' +
          '<div class="form-row"><label>Pareigos</label><input type="text" name="pareigos" maxlength="120" value="' + esc(e.pareigos || "") + '"></div>' +
          '<div class="form-row"><label>Rolė</label><select name="role">' +
            '<option value="darbuotojas"' + (e.role === "darbuotojas" ? " selected" : "") + ">Darbuotojas</option>" +
            '<option value="vadovas"' + (e.role === "vadovas" ? " selected" : "") + ">Vadovas</option>" +
            '<option value="admin"' + (e.role === "admin" ? " selected" : "") + ">Administratorius</option>" +
          "</select></div>" +
          '<div class="form-row"><label>Etato dalis (1 = 40 val.)</label><input type="number" id="emp-etatas" name="etatas" min="0.1" max="2" step="0.05" value="' + esc(Math.round((Number(e.savaites_valandos) || 40) / 40 * 100) / 100) + '"><div class="hint" id="emp-etato-hint" style="margin-top:4px">= ' + (Number(e.savaites_valandos) || 40) + ' val. per savaitę</div></div>' +
          '<div class="form-row"><label>Spalva</label><input type="color" name="spalva" value="' + esc(e.spalva || "#5B5BD6") + '" style="height:40px;padding:4px"></div>' +
        "</div>" +
        '<div class="form-row"><label>Atsakomybės</label><textarea name="atsakomybes" placeholder="Už ką žmogus atsakingas — matys visa komanda">' + esc(e.atsakomybes || "") + "</textarea></div>" +
        (!isNew ? '<div class="form-row"><label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" name="aktyvus" style="width:auto"' + (e.aktyvus ? " checked" : "") + "> Aktyvus (rodomas sąrašuose)</label></div>" : "") +
        '<div class="form-error" id="emp-err"></div>' +
        '<div class="modal-actions">' +
          '<button type="button" class="btn-outline" data-action="close-modal">Atšaukti</button>' +
          '<button type="submit" class="btn">Išsaugoti</button>' +
        "</div>" +
      "</form>"
    );
    ov.querySelector("#emp-form").addEventListener("submit", async function (ev) {
      ev.preventDefault();
      var fd = new FormData(ev.target);
      var obj = {
        vardas: String(fd.get("vardas")).trim(),
        email: String(fd.get("email") || "").trim().toLowerCase() || null,
        pareigos: String(fd.get("pareigos") || "").trim(),
        role: fd.get("role"),
        savaites_valandos: (function () { var et = Number(fd.get("etatas")); return et > 0 ? Math.round(et * 40 * 100) / 100 : 40; })(),
        spalva: fd.get("spalva"),
        atsakomybes: String(fd.get("atsakomybes") || "").trim(),
        aktyvus: isNew ? true : fd.get("aktyvus") === "on"
      };
      if (!obj.vardas) return;
      var ok = isNew
        ? await mutate(API.addEmployee(obj), "Darbuotojas pridėtas")
        : await mutate(API.updateEmployee(emp.id, obj), "Pakeitimai išsaugoti");
      if (ok) closeModal();
    });
    var etIn = ov.querySelector("#emp-etatas");
    var etHint = ov.querySelector("#emp-etato-hint");
    if (etIn && etHint) {
      etIn.addEventListener("input", function () {
        var v = Number(etIn.value);
        etHint.textContent = "= " + (v > 0 ? Math.round(v * 40 * 100) / 100 : 0) + " val. per savaitę";
      });
    }
  }

  function vacationsModal(emp) {
    var canEdit = canManageEmp(emp.id);
    var list = S.vacations.filter(function (v) { return v.darbuotojas_id === emp.id; })
      .sort(function (a, b) { return a.nuo < b.nuo ? 1 : -1; });
    var items = list.length ? list.map(function (v) {
      return '<div class="task-row"><div class="t-main"><div class="t-title">' + VAC_LABEL[v.tipas] + "</div>" +
        '<div class="t-meta"><span>' + v.nuo + " – " + v.iki + "</span>" + (v.pastaba ? "<span>" + esc(v.pastaba) + "</span>" : "") + "</div></div>" +
        (canEdit ? '<button class="btn-ghost btn-sm" data-action="del-vacation" data-id="' + v.id + '" data-emp="' + emp.id + '" style="color:var(--red)">Ištrinti</button>' : "") +
      "</div>";
    }).join("") : '<div class="empty">Įrašų nėra.</div>';
    openModal(
      "<h2>Atostogos: " + esc(emp.vardas) + "</h2>" + items +
      (canEdit ?
        '<form id="vac-form" style="margin-top:14px">' +
          '<div class="form-grid">' +
            '<div class="form-row"><label>Nuo</label>' + datePickerHtml("nuo", todayIso()) + "</div>" +
            '<div class="form-row"><label>Iki</label>' + datePickerHtml("iki", todayIso()) + "</div>" +
            '<div class="form-row"><label>Tipas</label><select name="tipas"><option value="atostogos">Atostogos</option><option value="liga">Liga</option><option value="kita">Kita</option></select></div>' +
            '<div class="form-row"><label>Pastaba</label><input type="text" name="pastaba" maxlength="120"></div>' +
          "</div>" +
          '<div class="form-error" id="vac-err"></div>' +
          '<div class="modal-actions"><button type="button" class="btn-outline" data-action="close-modal">Uždaryti</button><button type="submit" class="btn">Pridėti</button></div>' +
        "</form>"
        : '<div class="modal-actions"><button type="button" class="btn" data-action="close-modal">Uždaryti</button></div>')
    );
    var form = document.getElementById("vac-form");
    if (form) form.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      var fd = new FormData(form);
      var obj = {
        darbuotojas_id: emp.id,
        nuo: fd.get("nuo"), iki: fd.get("iki"),
        tipas: fd.get("tipas"),
        pastaba: String(fd.get("pastaba") || "").trim()
      };
      if (obj.iki < obj.nuo) {
        document.getElementById("vac-err").textContent = "„Iki“ negali būti ankstesnė už „Nuo“.";
        return;
      }
      try {
        await API.addVacation(obj);
        if (!isAdmin()) notifyAdmins(emp.vardas + ": pažymėta (" + VAC_LABEL[obj.tipas].toLowerCase() + ") " + obj.nuo + " – " + obj.iki, "komanda");
        applyData(await API.fetchAll());
        toast("Įrašyta");
        vacationsModal(getEmp(emp.id) || emp);
      } catch (e) {
        document.getElementById("vac-err").textContent = e.message || "Nepavyko";
      }
    });
  }

  function forgotModal() {
    openModal(
      "<h2>Slaptažodžio atstatymas</h2>" +
      '<div class="hint" style="margin-bottom:10px">Į jūsų el. paštą atsiųsime nuorodą naujam slaptažodžiui susikurti.</div>' +
      '<form id="forgot-form"><div class="form-row"><label>El. paštas</label><input type="email" name="email" required></div>' +
      '<div class="form-error" id="forgot-err"></div>' +
      '<div class="modal-actions"><button type="button" class="btn-outline" data-action="close-modal">Atšaukti</button><button type="submit" class="btn">Siųsti nuorodą</button></div></form>'
    );
    document.getElementById("forgot-form").addEventListener("submit", async function (ev) {
      ev.preventDefault();
      try {
        await API.resetPassword(String(new FormData(ev.target).get("email")).trim());
        closeModal();
        toast("Jei šis paštas registruotas — nuoroda išsiųsta.");
      } catch (e) {
        document.getElementById("forgot-err").textContent = e.message || "Nepavyko";
      }
    });
  }

  function renderRecovery() {
    return '<div class="login-wrap"><div class="login-card">' +
      '<div class="logo"><img src="icons/icon-192.png" alt=""><div><h1>Naujas slaptažodis</h1><div class="sub">VDU STEAM planas</div></div></div>' +
      '<form id="recovery-form">' +
        '<div class="form-row"><label>Naujas slaptažodis</label><input type="password" name="password" required minlength="6" autocomplete="new-password"></div>' +
        '<div class="form-error" id="rec-err"></div>' +
        '<button type="submit" class="btn">Išsaugoti ir tęsti</button>' +
      "</form>" +
    "</div></div>";
  }

  function bindRecoveryForm() {
    var form = document.getElementById("recovery-form");
    if (!form) return;
    form.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      try {
        await API.updatePassword(String(new FormData(form).get("password")));
        S.recovery = false;
        toast("Slaptažodis pakeistas");
        await onSignedIn();
      } catch (e) {
        document.getElementById("rec-err").textContent = e.message || "Nepavyko";
      }
    });
  }

  // ---------- Ataskaita ir importas ----------

  function reportModal() {
    var opts = [];
    var now = new Date();
    for (var i = 0; i < 12; i++) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var val = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      opts.push('<option value="' + val + '">' + d.getFullYear() + " m. " + MONTHS_NOM[d.getMonth()].toLowerCase() + "</option>");
    }
    openModal(
      "<h2>Mėnesio ataskaita</h2>" +
      '<div class="hint" style="margin-bottom:10px">Excel failas: atlikti darbai, suvestinė pagal žmogų ir atostogos.</div>' +
      '<div class="form-row"><label>Mėnuo</label><select id="report-month">' + opts.join("") + "</select></div>" +
      '<div class="modal-actions"><button type="button" class="btn-outline" data-action="close-modal">Atšaukti</button>' +
      '<button type="button" class="btn" data-action="report-download">Atsisiųsti Excel</button></div>'
    );
  }

  function exportReport(month) {
    if (!window.XLSX) { toast("Excel biblioteka neįkelta — atnaujinkite puslapį."); return; }
    var done = S.tasks.filter(function (t) { return t.atlikta_at && String(t.atlikta_at).slice(0, 7) === month; });
    var wb = XLSX.utils.book_new();
    var doneRows = done.map(function (t) {
      var emp = t.darbuotojas_id ? getEmp(t.darbuotojas_id) : null;
      return {
        "Darbas": t.pavadinimas,
        "Darbuotojas": emp ? emp.vardas : "—",
        "Kategorija": t.kategorija || "",
        "Valandos": Number(t.valandos) || 0,
        "Atlikta": String(t.atlikta_at).slice(0, 10)
      };
    });
    if (!doneRows.length) doneRows = [{ "Darbas": "Šį mėnesį atliktų darbų nėra", "Darbuotojas": "", "Kategorija": "", "Valandos": "", "Atlikta": "" }];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(doneRows), "Atlikti darbai");
    // Suvestinė pagal kategoriją
    var katMap = {};
    done.forEach(function (t) {
      var k = t.kategorija || "(be kategorijos)";
      if (!katMap[k]) katMap[k] = { n: 0, h: 0 };
      katMap[k].n++;
      katMap[k].h += Number(t.valandos) || 0;
    });
    var katRows = Object.keys(katMap).map(function (k) {
      return { "Kategorija": k, "Darbų": katMap[k].n, "Valandos": Math.round(katMap[k].h * 10) / 10 };
    });
    if (katRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(katRows), "Pagal kategoriją");
    var sumRows = activeEmployees().map(function (e) {
      var mine = done.filter(function (t) { return t.darbuotojas_id === e.id; });
      var hrs = mine.reduce(function (a, t) { return a + (Number(t.valandos) || 0); }, 0);
      return {
        "Vardas": e.vardas,
        "Atlikta darbų": mine.length,
        "Atliktos valandos": Math.round(hrs * 10) / 10,
        "Dabartinė užkrova (%)": loadOf(e.id).pct
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sumRows), "Suvestinė");
    var vacRows = S.vacations.filter(function (v) {
      return String(v.nuo).slice(0, 7) <= month && month <= String(v.iki).slice(0, 7);
    }).map(function (v) {
      var emp = getEmp(v.darbuotojas_id);
      return { "Vardas": emp ? emp.vardas : "?", "Tipas": VAC_LABEL[v.tipas], "Nuo": v.nuo, "Iki": v.iki, "Pastaba": v.pastaba || "" };
    });
    if (vacRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vacRows), "Atostogos");
    XLSX.writeFile(wb, "Ataskaita " + month + ".xlsx");
    toast("Ataskaita parsisiųsta");
  }

  function deacc(s) {
    return String(s || "").toLowerCase()
      .replace(/ą/g, "a").replace(/č/g, "c").replace(/ę/g, "e").replace(/ė/g, "e")
      .replace(/į/g, "i").replace(/š/g, "s").replace(/ų/g, "u").replace(/ū/g, "u").replace(/ž/g, "z")
      .replace(/\s+/g, " ").trim();
  }
  function impDate(v) {
    if (!v && v !== 0) return null;
    if (v instanceof Date) return isoFromDate(v);
    var s = String(v).trim().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  }
  function impTime(v) {
    if (v instanceof Date) return String(v.getHours()).padStart(2, "0") + ":" + String(v.getMinutes()).padStart(2, "0");
    var m = String(v || "").trim().match(/^(\d{1,2}):(\d{2})/);
    return m ? String(Number(m[1])).padStart(2, "0") + ":" + m[2] : null;
  }

  function parseImport(wb) {
    var empByName = {};
    S.employees.forEach(function (e) { empByName[deacc(e.vardas)] = e.id; });
    var out = { tasks: [], shifts: [], skipped: [] };
    var stMap = { laukia: "laukia", vykdoma: "vykdoma", vykdomi: "vykdoma", atlikta: "atlikta", atlikti: "atlikta" };
    var prMap = { zemas: "zemas", vidutinis: "vidutinis", aukstas: "aukstas" };
    var dSheet = wb.Sheets["Darbai"];
    if (dSheet) {
      XLSX.utils.sheet_to_json(dSheet).forEach(function (r) {
        var title = String(r["Pavadinimas"] || r["Darbas"] || "").trim();
        if (!title) return;
        var who = String(r["Darbuotojas"] || "").trim();
        var empId = null;
        if (who && deacc(who) !== "nepriskirta") {
          empId = empByName[deacc(who)] || null;
          if (!empId) { out.skipped.push(title + " (nerastas darbuotojas: " + who + ")"); return; }
        }
        out.tasks.push({
          pavadinimas: title,
          darbuotojas_id: empId,
          valandos: Number(r["Valandos"]) || 0,
          terminas: impDate(r["Terminas"]),
          kategorija: String(r["Kategorija"] || "").trim(),
          prioritetas: prMap[deacc(r["Prioritetas"])] || "vidutinis",
          statusas: stMap[deacc(r["Statusas"])] || "laukia",
          aprasymas: String(r["Aprašymas"] || r["Aprasymas"] || "").trim()
        });
      });
    }
    var tSheet = wb.Sheets["Tvarkarastis"] || wb.Sheets["Tvarkaraštis"];
    if (tSheet) {
      XLSX.utils.sheet_to_json(tSheet).forEach(function (r) {
        var who = String(r["Darbuotojas"] || "").trim();
        var empId = empByName[deacc(who)];
        var data = impDate(r["Data"]);
        var nuo = impTime(r["Nuo"]);
        var iki = impTime(r["Iki"]);
        if (!empId || !data || !nuo || !iki) {
          out.skipped.push("tvarkaraštis: " + (who || "?") + " " + (data || "be datos"));
          return;
        }
        out.shifts.push({ darbuotojas_id: empId, data: data, nuo: nuo, iki: iki, pastaba: String(r["Pastaba"] || "").trim() });
      });
    }
    return out;
  }

  function importModal() {
    openModal(
      "<h2>Importas iš Excel</h2>" +
      '<div class="hint" style="margin-bottom:10px">Tinka failas tokios pačios struktūros kaip eksportas: lapas „Darbai“ (Pavadinimas, Darbuotojas, Valandos, Terminas, Prioritetas, Statusas, Aprašymas) ir/arba „Tvarkarastis“ (Data, Darbuotojas, Nuo, Iki, Pastaba). Darbuotojai atpažįstami pagal vardą. Įrašai pridedami prie esamų.</div>' +
      '<div class="form-row"><input type="file" id="import-file" accept=".xlsx,.xls"></div>' +
      '<div id="import-preview"></div>' +
      '<div class="modal-actions"><button type="button" class="btn-outline" data-action="close-modal">Atšaukti</button>' +
      '<button type="button" class="btn" id="import-go" disabled>Importuoti</button></div>'
    );
    var parsed = null;
    document.getElementById("import-file").addEventListener("change", async function (ev) {
      var f = ev.target.files[0];
      if (!f) return;
      try {
        var wb = XLSX.read(await f.arrayBuffer(), { cellDates: true });
        parsed = parseImport(wb);
        document.getElementById("import-preview").innerHTML = '<div class="hint">Rasta: ' + parsed.tasks.length + " darbų, " + parsed.shifts.length + " tvarkaraščio įrašų." +
          (parsed.skipped.length ? "<br>Praleista: " + parsed.skipped.length + " (" + esc(parsed.skipped.slice(0, 5).join("; ")) + (parsed.skipped.length > 5 ? "…" : "") + ")" : "") + "</div>";
        document.getElementById("import-go").disabled = !(parsed.tasks.length || parsed.shifts.length);
      } catch (e) {
        document.getElementById("import-preview").innerHTML = '<div class="form-error">Nepavyko perskaityti failo: ' + esc(e.message) + "</div>";
      }
    });
    document.getElementById("import-go").addEventListener("click", async function () {
      if (!parsed) return;
      this.disabled = true;
      var n = 0;
      for (var i = 0; i < parsed.tasks.length; i++) { try { await API.addTask(parsed.tasks[i]); n++; } catch (e) {} }
      for (var j = 0; j < parsed.shifts.length; j++) { try { await API.addShift(parsed.shifts[j]); n++; } catch (e) {} }
      toast("Importuota įrašų: " + n);
      closeModal();
      await refreshData();
    });
  }

  // ---------- TV režimas ----------

  function enterTV() {
    S.tv = true;
    if (S.tvTimer) clearInterval(S.tvTimer);
    // Viskas rodoma vienu metu (be rotacijos) — kas 30 s atnaujinam laikrodį ir duomenis.
    S.tvTimer = setInterval(function () {
      if (!S.tv) return;
      render();
    }, 30000);
    render();
  }
  function exitTV() {
    S.tv = false;
    if (S.tvTimer) { clearInterval(S.tvTimer); S.tvTimer = null; }
    if (location.hash === "#tv") {
      try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    }
    render();
  }

  function tvStatsHtml() {
    var today = todayIso();
    var active = S.tasks.filter(function (t) { return t.statusas !== "atlikta"; });
    var pool = poolTasks();
    var late = active.filter(function (t) { return t.terminas && t.terminas < today; });
    var working = {};
    S.shifts.forEach(function (s) { if (s.data === today) working[s.darbuotojas_id] = true; });
    function tile(n, label, alert) {
      return '<div class="tv-stat' + (alert ? " alert" : "") + '"><div class="tv-stat-n">' + n + '</div><div class="tv-stat-l">' + label + "</div></div>";
    }
    return '<div class="tv-stats">' +
      tile(active.length, "Aktyvūs darbai") +
      tile(Object.keys(working).length, "Šiandien dirba") +
      tile(pool.length, "Nepriskirtos veiklos") +
      tile(late.length, "Vėluojantys darbai", late.length > 0) +
    "</div>";
  }

  function tvWeekHtml() {
    var mon = startOfWeek(0);
    var todayI = todayIso();
    var out = "";
    for (var i = 0; i < 7; i++) {
      var iso = isoFromDate(addDays(mon, i));
      var dnum = addDays(mon, i).getDate();
      var shifts = S.shifts.filter(function (s) { return s.data === iso; })
        .sort(function (a, b) { return a.nuo < b.nuo ? -1 : 1; });
      out += '<div class="tv-day' + (iso === todayI ? " today" : "") + '">' +
        '<div class="tv-day-h">' + DAYS_SHORT[i] + " <span>" + dnum + "</span></div>" +
        (shifts.length ? shifts.map(function (s) {
          var e = getEmp(s.darbuotojas_id);
          return '<div class="tv-shift"><span class="tv-shift-n">' + esc(shortName(e ? e.vardas : "?")) +
            '</span><span class="tv-shift-t">' + esc(String(s.nuo).slice(0, 5)) + "–" + esc(String(s.iki).slice(0, 5)) + "</span></div>";
        }).join("") : '<div class="tv-day-empty">—</div>') +
      "</div>";
    }
    return '<div class="tv-week">' + out + "</div>";
  }

  function tvDeadlinesHtml() {
    var today = todayIso();
    var up = S.tasks.filter(function (t) { return t.statusas !== "atlikta" && t.terminas && t.terminas >= today; })
      .sort(function (a, b) { return a.terminas < b.terminas ? -1 : 1; }).slice(0, 6);
    if (!up.length) return '<div class="empty">Artimiausių terminų nėra.</div>';
    return up.map(function (t) {
      var e = getEmp(t.darbuotojas_id);
      return '<div class="tv-line"><span class="tv-line-d">' + esc(fmtShort(t.terminas)) + "</span>" +
        '<span class="tv-line-t">' + esc(t.pavadinimas) + "</span>" +
        '<span class="tv-line-w">' + esc(e ? shortName(e.vardas) : "—") + "</span></div>";
    }).join("");
  }

  function tvOutHtml() {
    var today = todayIso();
    var out = S.vacations.filter(function (v) { return v.nuo <= today && today <= v.iki; });
    if (!out.length) return '<div class="empty">Šiandien visi darbe.</div>';
    return out.map(function (v) {
      var e = getEmp(v.darbuotojas_id);
      return '<div class="tv-line"><span class="tv-line-t">' + esc(e ? e.vardas : "?") + "</span>" +
        '<span class="chip chip-blue">' + VAC_LABEL[v.tipas] + "</span>" +
        '<span class="tv-line-w">iki ' + esc(fmtShort(v.iki)) + "</span></div>";
    }).join("");
  }

  function renderTV() {
    var now = new Date();
    var hh = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    var gen = MONTHS_GEN[now.getMonth()];
    var dateLabel = gen.charAt(0).toUpperCase() + gen.slice(1) + " " + now.getDate() + " d., " + DAYS_LONG[(now.getDay() + 6) % 7].toLowerCase();
    var mon = startOfWeek(0);
    return '<div class="tv-mode">' +
      '<div class="tv-head"><div><b>VDU STEAM didaktikos centras</b><small>' + dateLabel + "</small></div>" +
      '<div class="tv-clock">' + hh + "</div>" +
      '<button class="btn-ghost" data-action="tv-exit" style="font-size:22px" title="Uždaryti">×</button></div>' +
      '<div class="tv-dash">' +
        tvStatsHtml() +
        '<div class="tv-grid">' +
          '<section class="tv-card tv-span2"><h2 class="tv-title">Komandos užkrova</h2>' + loadRingsHtml() + "</section>" +
          '<section class="tv-card"><h2 class="tv-title">Ši savaitė · ' + esc(weekRangeLabel(mon)) + '</h2>' + tvWeekHtml() + "</section>" +
          '<div class="tv-col">' +
            '<section class="tv-card"><h2 class="tv-title">Artimiausi terminai</h2>' + tvDeadlinesHtml() + "</section>" +
            '<section class="tv-card"><h2 class="tv-title">Atostogos / nedarbingumas</h2>' + tvOutHtml() + "</section>" +
          "</div>" +
        "</div>" +
      "</div>" +
    "</div>";
  }

  // ---------- Excel eksportas ----------

  function exportExcel() {
    if (!window.XLSX) {
      toast("Excel biblioteka neįkelta — atnaujinkite puslapį.");
      return;
    }
    var wb = XLSX.utils.book_new();

    var tasksRows = S.tasks.map(function (t) {
      var emp = t.darbuotojas_id ? getEmp(t.darbuotojas_id) : null;
      return {
        "Pavadinimas": t.pavadinimas,
        "Darbuotojas": emp ? emp.vardas : "Nepriskirta",
        "Valandos": Number(t.valandos) || 0,
        "Terminas": t.terminas || "",
        "Kategorija": t.kategorija || "",
        "Prioritetas": PRIO[t.prioritetas] || t.prioritetas,
        "Statusas": STATUS[t.statusas] || t.statusas,
        "Aprašymas": t.aprasymas || ""
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tasksRows), "Darbai");

    var shiftRows = S.shifts.slice().sort(function (a, b) { return a.data < b.data ? -1 : 1; }).map(function (s) {
      var emp = getEmp(s.darbuotojas_id);
      var d = dateFromIso(s.data);
      return {
        "Data": s.data,
        "Diena": DAYS_LONG[(d.getDay() + 6) % 7],
        "Darbuotojas": emp ? emp.vardas : "",
        "Nuo": s.nuo,
        "Iki": s.iki,
        "Pastaba": s.pastaba || ""
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(shiftRows), "Tvarkarastis");

    var teamRows = S.employees.map(function (e) {
      var l = loadOf(e.id);
      return {
        "Vardas": e.vardas,
        "Pareigos": e.pareigos || "",
        "El. paštas": e.email || "",
        "Rolė": e.role === "admin" ? "Administratorius" : "Darbuotojas",
        "Val. per savaitę": Number(e.savaites_valandos) || 40,
        "Užkrova (val.)": l.hours,
        "Užkrova (%)": l.pct,
        "Atsakomybės": e.atsakomybes || "",
        "Aktyvus": e.aktyvus ? "Taip" : "Ne"
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(teamRows), "Komanda");

    XLSX.writeFile(wb, "VDU STEAM planas " + todayIso() + ".xlsx");
    toast("Excel failas parsisiųstas");
  }

  // ---------- prisijungimo langai ----------

  function renderLoginSupabase() {
    var isReg = S.authMode === "register";
    return '<div class="login-wrap"><div class="login-card">' +
      '<div class="logo"><img src="icons/icon-192.png" alt=""><div><h1>VDU STEAM<br>didaktikos centras</h1><div class="sub">Komandos planas</div></div></div>' +
      (isReg ? '<div class="demo-note">Registruotis gali tik komandos nariai, kurių el. paštą administratorius įrašė sistemoje.</div>' : "") +
      '<form id="auth-form">' +
        '<div class="form-row"><label>El. paštas</label><input type="email" name="email" required autocomplete="username"></div>' +
        '<div class="form-row"><label>Slaptažodis</label><input type="password" name="password" required minlength="6" autocomplete="' + (isReg ? "new-password" : "current-password") + '"></div>' +
        '<div class="form-error" id="auth-err"></div>' +
        '<button type="submit" class="btn" id="auth-submit">' + (isReg ? "Registruotis" : "Prisijungti") + "</button>" +
      "</form>" +
      '<div class="switch">' + (isReg
        ? 'Jau turite paskyrą? <a data-action="auth-toggle">Prisijungti</a>'
        : 'Pirmas kartas? <a data-action="auth-toggle">Registruotis</a>') +
      "</div>" +
      (!isReg ? '<div class="switch" style="margin-top:6px"><a data-action="forgot-pass">Pamiršau slaptažodį</a></div>' : "") +
      installBtnHtml() +
    "</div></div>";
  }

  function renderLoginDemo() {
    var users = API.demoUsers();
    return '<div class="login-wrap"><div class="login-card" style="max-width:440px">' +
      '<div class="logo"><img src="icons/icon-192.png" alt=""><div><h1>VDU STEAM<br>didaktikos centras</h1><div class="sub">Komandos planas</div></div></div>' +
      '<div class="demo-note">Demo režimas: duomenų bazė dar neprijungta, duomenys saugomi tik šiame įrenginyje. Pasirinkite, kieno akimis žiūrėti.</div>' +
      '<div style="max-height:330px;overflow-y:auto">' +
      users.map(function (e) {
        return '<button class="demo-user" data-action="demo-login" data-id="' + e.id + '">' + avatarHtml(e) +
          '<span style="font-weight:600">' + esc(e.vardas) + "</span>" +
          (e.role === "admin" ? '<span class="chip chip-primary role">Admin</span>' : "") +
        "</button>";
      }).join("") +
      "</div>" +
      installBtnHtml() +
    "</div></div>";
  }

  function renderUnlinked() {
    var email = (S.session && S.session.user && S.session.user.email) || "";
    return '<div class="login-wrap"><div class="login-card">' +
      '<div class="logo"><img src="icons/icon-192.png" alt=""><div><h1>Paskyra dar nepriskirta</h1></div></div>' +
      '<p style="color:var(--muted);font-size:14px">Prisijungėte kaip <b>' + esc(email) + "</b>, bet šis el. paštas dar nepriskirtas jokiam komandos nariui. Paprašykite administratoriaus įrašyti šį adresą prie jūsų profilio (Komanda → Redaguoti) — tada viskas atsiras automatiškai.</p>" +
      '<button class="btn" data-action="logout">Atsijungti</button>' +
    "</div></div>";
  }

  // ---------- atvaizdavimas ----------

  function render() {
    var root = document.getElementById("app");
    var ae = document.activeElement;
    var focusId = ae && ae.id;
    var selStart = null;
    try { selStart = ae && ae.selectionStart; } catch (e) {}

    var html;
    if (!S.session) {
      html = S.mode === "demo" ? renderLoginDemo() : renderLoginSupabase();
    } else if (S.recovery) {
      html = renderRecovery();
    } else if (!S.me) {
      html = renderUnlinked();
    } else if (S.tv) {
      root.innerHTML = renderTV();
      return;
    } else {
      var content = "";
      if (S.view === "apzvalga") content = viewApzvalga();
      else if (S.view === "tvarkarastis") content = viewTvarkarastis();
      else if (S.view === "darbai") content = viewDarbai();
      else if (S.view === "prieinamumas") content = viewPrieinamumas();
      else if (S.view === "komanda") content = viewKomanda();
      html = shellHtml(content);
    }
    root.innerHTML = html;

    if (S.viewChanged) { runCountUp(); }
    S.viewChanged = false;

    if (focusId) {
      var el = document.getElementById(focusId);
      if (el) {
        el.focus();
        if (selStart != null) { try { el.setSelectionRange(selStart, selStart); } catch (e) {} }
      }
    }

    if (!S.session) bindAuthForm();
    else if (S.recovery) bindRecoveryForm();
  }

  function runCountUp() {
    var els = document.querySelectorAll('.metric .value[data-count]');
    for (var i = 0; i < els.length; i++) {
      (function (el) {
        var target = Number(el.getAttribute("data-count")) || 0;
        if (target <= 0) { el.textContent = "0"; return; }
        var dur = 650, t0 = null;
        function step(ts) {
          if (t0 === null) t0 = ts;
          var p = Math.min(1, (ts - t0) / dur);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased);
          if (p < 1) requestAnimationFrame(step); else el.textContent = target;
        }
        requestAnimationFrame(step);
      })(els[i]);
    }
  }

  function bindAuthForm() {
    var form = document.getElementById("auth-form");
    if (!form) return;
    form.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      var fd = new FormData(form);
      var btn = document.getElementById("auth-submit");
      var err = document.getElementById("auth-err");
      btn.disabled = true;
      err.textContent = "";
      try {
        if (S.authMode === "register") {
          await API.signUp(String(fd.get("email")).trim(), String(fd.get("password")));
        } else {
          await API.signIn(String(fd.get("email")).trim(), String(fd.get("password")));
        }
        await onSignedIn();
      } catch (e) {
        err.textContent = e.message || "Nepavyko prisijungti.";
        btn.disabled = false;
      }
    });
  }

  async function onSignedIn() {
    S.session = await API.getSession();
    if (S.session) {
      applyData(await API.fetchAll());
      ensureSubscribed();
    }
    S.booted = true;
    render();
    if (location.hash === "#tv" && S.me) enterTV();
  }

  // ---------- įvykiai ----------

  document.addEventListener("click", function (ev) {
    var el = ev.target.closest("[data-action]");
    if (!el) return;
    var action = el.getAttribute("data-action");
    var id = el.getAttribute("data-id");

    switch (action) {
      case "nav":
        var nv = el.getAttribute("data-view");
        if (nv !== S.view) S.viewChanged = true;
        S.view = nv;
        render();
        window.scrollTo(0, 0);
        break;
      case "logout":
        teardownSubscription();
        API.signOut().then(function () {
          S.session = null; S.me = null; S.liveStatus = "";
          render();
        });
        break;
      case "demo-login":
        API.demoSignIn(id);
        onSignedIn();
        break;
      case "auth-toggle":
        S.authMode = S.authMode === "register" ? "login" : "register";
        render();
        break;
      case "close-modal":
        closeModal();
        break;
      case "install-app":
        if (installEvt) {
          installEvt.prompt();
        } else {
          installModal();
        }
        break;
      case "export":
        exportExcel();
        break;
      case "new-task":
        taskModal(null, {});
        break;
      case "new-pool-task":
        taskModal(null, { pool: true });
        break;
      case "open-task": {
        var t = S.tasks.find(function (x) { return x.id === id; });
        if (t) taskModal(t, {});
        break;
      }
      case "assign-task": {
        var t2 = S.tasks.find(function (x) { return x.id === id; });
        if (t2) assignModal(t2);
        break;
      }
      case "split-task": {
        var t3 = S.tasks.find(function (x) { return x.id === id; });
        if (t3) splitModal(t3);
        break;
      }
      case "take-task": {
        if (!S.me) break;
        var taken = S.tasks.find(function (x) { return x.id === id; });
        mutate(API.updateTask(id, { darbuotojas_id: S.me.id }), "Veikla priskirta jums").then(function (ok) {
          if (ok && taken) notifyAdmins(S.me.vardas + " pasiėmė veiklą: „" + taken.pavadinimas + "“", "darbai");
        });
        break;
      }
      case "goto-emp-tasks":
        if (!isManager()) break;
        S.view = "darbai";
        S.filters.emp = id;
        S.filters.status = "aktyvus";
        render();
        window.scrollTo(0, 0);
        break;
      case "week-prev":
        if (S.schedMode === "month") S.monthOffset--;
        else { S.weekOffset--; S.selDay = 0; }
        render();
        break;
      case "week-next":
        if (S.schedMode === "month") S.monthOffset++;
        else { S.weekOffset++; S.selDay = 0; }
        render();
        break;
      case "week-today":
        if (S.schedMode === "month") S.monthOffset = 0;
        else { S.weekOffset = 0; S.selDay = (new Date().getDay() + 6) % 7; }
        render();
        break;
      case "sched-week":
        S.schedMode = "week"; render();
        break;
      case "sched-month":
        S.schedMode = "month"; S.monthOffset = 0; render();
        break;
      case "month-day": {
        var dIso = el.getAttribute("data-date");
        var dd = dateFromIso(dIso);
        var wdd = (dd.getDay() + 6) % 7;
        var monThat = new Date(dd);
        monThat.setDate(dd.getDate() - wdd);
        monThat.setHours(0, 0, 0, 0);
        S.weekOffset = Math.round((monThat - startOfWeek(0)) / 604800000);
        S.selDay = wdd;
        S.schedMode = "week";
        render();
        break;
      }
      case "copy-week":
        copyPrevWeek();
        break;
      case "open-notifs":
        notifsModal();
        break;
      case "notifs-read-all": {
        var unreadIds = myNotifs().filter(function (n) { return !n.perskaityta; }).map(function (n) { return n.id; });
        API.markNotificationsRead(unreadIds).then(async function () {
          applyData(await API.fetchAll());
          render();
          notifsModal();
        }).catch(function (e) { toast(e.message || "Nepavyko"); });
        break;
      }
      case "enable-push":
        Notification.requestPermission().then(function (p) {
          toast(p === "granted" ? "Įrenginio pranešimai įjungti" : "Pranešimai neįjungti");
          notifsModal();
        });
        break;
      case "notif-click": {
        var nview = el.getAttribute("data-view") || "darbai";
        API.markNotificationsRead([id]).catch(function () {});
        closeModal();
        S.view = VIEWS.some(function (v) { return v.id === nview; }) ? nview : "darbai";
        refreshData();
        window.scrollTo(0, 0);
        break;
      }
      case "del-comment": {
        var komTask = el.getAttribute("data-task");
        API.deleteComment(id).then(async function () {
          applyData(await API.fetchAll());
          var listEl = document.getElementById("kom-list");
          if (listEl) listEl.innerHTML = komListHtml(komTask);
          else render();
        }).catch(function (e) { toast(e.message || "Nepavyko"); });
        break;
      }
      case "open-vacations": {
        var vemp = getEmp(id);
        if (vemp) vacationsModal(vemp);
        break;
      }
      case "del-vacation": {
        if (!confirm("Ištrinti šį įrašą?")) break;
        var vempId = el.getAttribute("data-emp");
        API.deleteVacation(id).then(async function () {
          applyData(await API.fetchAll());
          var ve = getEmp(vempId);
          if (ve) vacationsModal(ve); else { closeModal(); render(); }
        }).catch(function (e) { toast(e.message || "Nepavyko"); });
        break;
      }
      case "import":
        importModal();
        break;
      case "report":
        reportModal();
        break;
      case "report-download": {
        var msel = document.getElementById("report-month");
        if (msel) exportReport(msel.value);
        closeModal();
        break;
      }
      case "tv-on":
        if (!isManager()) break;
        enterTV();
        break;
      case "tv-exit":
        exitTV();
        break;
      case "forgot-pass":
        forgotModal();
        break;
      case "day-chip":
        S.selDay = Number(el.getAttribute("data-i")); render();
        break;
      case "new-shift":
        shiftModal(null, el.getAttribute("data-emp") || null, el.getAttribute("data-date") || null);
        break;
      case "open-shift": {
        var sh = S.shifts.find(function (x) { return x.id === id; });
        if (sh) shiftModal(sh);
        break;
      }
      case "new-emp":
        empModal(null);
        break;
      case "open-emp": {
        var em = S.employees.find(function (x) { return x.id === id; });
        if (em) empModal(em);
        break;
      }
      case "view-as":
        if (!(S.realMe && S.realMe.role === "admin")) break;
        S.viewAsId = id;
        S.view = "apzvalga";
        render();
        window.scrollTo(0, 0);
        break;
      case "view-as-exit":
        S.viewAsId = null;
        S.view = "apzvalga";
        render();
        window.scrollTo(0, 0);
        break;
      case "avail-mode":
        S.availMode = el.getAttribute("data-m") || "savaite";
        render();
        break;
      case "avail-week-prev": S.availWeekOffset--; render(); break;
      case "avail-week-next": S.availWeekOffset++; render(); break;
      case "avail-week-today": S.availWeekOffset = 0; render(); break;
      case "avail-add":
        availAddModal(el.getAttribute("data-emp"), el.getAttribute("data-wd")
          ? { wd: Number(el.getAttribute("data-wd")) }
          : { date: el.getAttribute("data-date") });
        break;
      case "avail-del":
        if (el.getAttribute("data-kind") === "tmpl") mutate(API.deleteAvailTemplate(id), "Pašalinta");
        else mutate(API.deleteAvailability(id), "Pašalinta");
        break;
      case "avail-negaliu": {
        var nEmp = el.getAttribute("data-emp"), nDate = el.getAttribute("data-date");
        (async function () {
          try {
            await API.clearAvailabilityForDate(nEmp, nDate);
            await mutate(API.addAvailability({ darbuotojas_id: nEmp, data: nDate, nuo: null, iki: null, nedirba: true }), "Pažymėta: negaliu");
          } catch (e) { toast(e.message || "Nepavyko"); }
        })();
        break;
      }
      case "avail-reset": {
        var rEmp = el.getAttribute("data-emp"), rDate = el.getAttribute("data-date");
        (async function () {
          try { await API.clearAvailabilityForDate(rEmp, rDate); toast("Grąžinta į šabloną"); await refreshData(); }
          catch (e) { toast(e.message || "Nepavyko"); }
        })();
        break;
      }
      case "dp-toggle": {
        var dpT = el.closest(".dp");
        var calT = dpT.querySelector(".dp-cal");
        var wasOpen = !calT.hasAttribute("hidden");
        document.querySelectorAll(".dp-cal").forEach(function (c) { if (c !== calT) { c.setAttribute("hidden", ""); c.innerHTML = ""; } });
        if (wasOpen) { calT.setAttribute("hidden", ""); calT.innerHTML = ""; }
        else {
          var vT = dpT.querySelector("input[type=hidden]").value;
          var baseT = vT ? dateFromIso(vT) : new Date();
          calT.innerHTML = dpCalHtml(baseT.getFullYear(), baseT.getMonth(), vT);
          calT.removeAttribute("hidden");
        }
        break;
      }
      case "dp-day": {
        var dpD = el.closest(".dp");
        var vD = el.getAttribute("data-val");
        dpD.querySelector("input[type=hidden]").value = vD;
        var vsD = dpD.querySelector(".dp-val"); vsD.textContent = vD; vsD.classList.remove("empty");
        var calD = dpD.querySelector(".dp-cal"); calD.setAttribute("hidden", ""); calD.innerHTML = "";
        break;
      }
      case "dp-prev":
      case "dp-next": {
        var innerN = el.closest(".dp-cal-inner");
        var ymN = innerN.getAttribute("data-ym").split("-");
        var yN = Number(ymN[0]), mN = Number(ymN[1]) - 1 + (action === "dp-next" ? 1 : -1);
        if (mN < 0) { mN = 11; yN--; } else if (mN > 11) { mN = 0; yN++; }
        var dpN = el.closest(".dp");
        dpN.querySelector(".dp-cal").innerHTML = dpCalHtml(yN, mN, dpN.querySelector("input[type=hidden]").value);
        break;
      }
      case "dp-today": {
        var dpY = el.closest(".dp");
        var tiY = todayIso();
        dpY.querySelector("input[type=hidden]").value = tiY;
        var vsY = dpY.querySelector(".dp-val"); vsY.textContent = tiY; vsY.classList.remove("empty");
        var calY = dpY.querySelector(".dp-cal"); calY.setAttribute("hidden", ""); calY.innerHTML = "";
        break;
      }
      case "dp-clear": {
        var dpC = el.closest(".dp");
        dpC.querySelector("input[type=hidden]").value = "";
        var vsC = dpC.querySelector(".dp-val"); vsC.textContent = "Pasirinkti datą"; vsC.classList.add("empty");
        var calC = dpC.querySelector(".dp-cal"); calC.setAttribute("hidden", ""); calC.innerHTML = "";
        break;
      }
    }
  });

  document.addEventListener("change", function (ev) {
    var el = ev.target.closest("[data-change]");
    if (!el) return;
    var what = el.getAttribute("data-change");
    if (what === "task-status") {
      var id = el.getAttribute("data-id");
      var t = S.tasks.find(function (x) { return x.id === id; });
      var patch = { statusas: el.value };
      if (el.value === "atlikta" && (!t || t.statusas !== "atlikta")) patch.atlikta_at = new Date().toISOString();
      if (el.value !== "atlikta") patch.atlikta_at = null;
      mutate(API.updateTask(id, patch), "Statusas: " + STATUS[el.value]);
    } else if (what === "filter-emp") {
      S.filters.emp = el.value;
      render();
    } else if (what === "filter-status") {
      S.filters.status = el.value;
      render();
    } else if (what === "filter-kat") {
      S.filters.kat = el.value;
      render();
    } else if (what === "avail-emp") {
      S.availEmpId = el.value;
      render();
    }
  });

  document.addEventListener("input", function (ev) {
    var el = ev.target.closest("[data-input]");
    if (!el) return;
    if (el.getAttribute("data-input") === "search") {
      S.filters.q = el.value;
      render();
    } else if (el.getAttribute("data-input") === "team-search") {
      S.teamQ = el.value;
      render();
    }
  });

  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") {
      if (document.getElementById("modal-overlay")) closeModal();
      else if (S.tv) exitTV();
    }
  });

  // ---------- paleidimas ----------

  async function boot() {
    S.mode = await API.init();
    S.session = await API.getSession();
    API.onAuthChange(async function (event) {
      if (event === "PASSWORD_RECOVERY") S.recovery = true;
      var newSession = await API.getSession();
      var had = !!S.session;
      S.session = newSession;
      if (newSession && !had) {
        applyData(await API.fetchAll());
        ensureSubscribed();
        render();
      } else if (!newSession && had) {
        teardownSubscription();
        S.me = null;
        render();
      }
    });
    if (S.session) {
      try {
        applyData(await API.fetchAll());
        ensureSubscribed();
      } catch (e) {
        toast(e.message || "Nepavyko gauti duomenų");
      }
    }
    S.booted = true;
    render();
    if (location.hash === "#tv" && S.me) enterTV();

    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  }

  boot();
})();
