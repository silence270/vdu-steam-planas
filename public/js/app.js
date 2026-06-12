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
    filters: { emp: "", status: "aktyvus", q: "" },
    authMode: "login",
    liveStatus: "",
    unsub: null,
    booted: false
  };

  var STATUS = { laukia: "Laukia", vykdoma: "Vykdoma", atlikta: "Atlikta" };
  var PRIO = { zemas: "Žemas", vidutinis: "Vidutinis", aukstas: "Aukštas" };
  var PRIO_CHIP = { zemas: "chip-gray", vidutinis: "chip-amber", aukstas: "chip-red" };
  var DAYS_LONG = ["Pirmadienis", "Antradienis", "Trečiadienis", "Ketvirtadienis", "Penktadienis", "Šeštadienis", "Sekmadienis"];
  var DAYS_SHORT = ["Pr", "An", "Tr", "Kt", "Pn", "Št", "Sk"];
  var MONTHS_GEN = ["sausio", "vasario", "kovo", "balandžio", "gegužės", "birželio", "liepos", "rugpjūčio", "rugsėjo", "spalio", "lapkričio", "gruodžio"];
  var MONTHS_SHORT = ["saus.", "vas.", "kov.", "bal.", "geg.", "birž.", "liep.", "rugp.", "rugs.", "spal.", "lapkr.", "gruod."];

  var ICONS = {
    apzvalga: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="12" width="4" height="8" rx="1"/><rect x="10" y="7" width="4" height="13" rx="1"/><rect x="17" y="3" width="4" height="17" rx="1"/></svg>',
    tvarkarastis: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    darbai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>',
    komanda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M16.5 14.6c2.5.3 4.4 1.9 5 4.4"/></svg>'
  };

  var VIEWS = [
    { id: "apzvalga", label: "Apžvalga" },
    { id: "tvarkarastis", label: "Tvarkaraštis" },
    { id: "darbai", label: "Darbai" },
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
  function canEditTask(t) {
    return isAdmin() || (S.me && t.darbuotojas_id === S.me.id);
  }
  function canEditShift(s) {
    return isAdmin() || (S.me && s.darbuotojas_id === S.me.id);
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
    resolveMe();
  }

  function resolveMe() {
    S.me = null;
    if (!S.session) return;
    if (S.mode === "demo") {
      S.me = S.employees.find(function (e) { return e.id === S.session.demoEmployeeId; }) || null;
    } else {
      S.me = S.employees.find(function (e) { return e.user_id === S.session.user.id; }) || null;
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
          '<div class="user-chip">' + avatarHtml(S.me) +
            '<button class="btn-ghost" data-action="logout">Atsijungti</button>' +
          "</div>" +
        "</div>" +
      "</header>" +
      '<main class="main">' + content + "</main>" +
      '<nav class="bottom-nav">' + bottomBtns + "</nav>";
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
    return '<div class="metrics">' +
      '<div class="metric"><div class="label">Aktyvūs darbai</div><div class="value">' + active.length + "</div></div>" +
      '<div class="metric"><div class="label">Nepriskirtos veiklos</div><div class="value">' + pool.length + '</div><div class="sub">' + (Math.round(poolHours * 10) / 10) + " val.</div></div>" +
      '<div class="metric"><div class="label">Šiandien dirba</div><div class="value">' + wtCount + "</div></div>" +
      '<div class="metric' + (late.length ? " alert" : "") + '"><div class="label">Vėluojantys darbai</div><div class="value">' + late.length + "</div></div>" +
    "</div>";
  }

  function loadRowsHtml() {
    var rows = activeEmployees().map(function (e) {
      var l = loadOf(e.id);
      return { e: e, l: l };
    });
    rows.sort(function (a, b) { return b.l.pct - a.l.pct; });
    if (!rows.length) return '<div class="empty">Nėra darbuotojų.</div>';
    return rows.map(function (r) {
      return '<div class="load-row" data-action="goto-emp-tasks" data-id="' + r.e.id + '" title="Rodyti darbus">' +
        '<div class="who">' + avatarHtml(r.e) +
          '<div style="min-width:0"><div class="name">' + esc(r.e.vardas) + '</div><div class="role">' + esc(r.e.pareigos || "") + "</div></div>" +
        "</div>" +
        '<div class="track"><div class="fill ' + fillClass(r.l.pct) + '" style="width:' + Math.min(100, r.l.pct) + '%"></div></div>' +
        '<div class="nums">' + r.l.pct + "% " + loadBadge(r.l.pct) + "<small>" + r.l.hours + " val. iš " + r.l.cap + "</small></div>" +
      "</div>";
    }).join("");
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
        '<span class="chip ' + PRIO_CHIP[t.prioritetas] + '">' + PRIO[t.prioritetas] + "</span></div>" +
      "</div>" +
      '<div class="t-actions">' + actions + "</div>" +
    "</div>";
  }

  function viewApzvalga() {
    var pool = poolTasks();
    var mine = S.me ? S.tasks.filter(function (t) { return t.darbuotojas_id === S.me.id && t.statusas !== "atlikta"; }) : [];
    var html = '<div class="view-title"><h1>Apžvalga</h1><div class="actions">' +
      (isAdmin() ? '<button class="btn" data-action="new-task">+ Naujas darbas</button>' : "") +
      "</div></div>";
    html += metricsHtml();
    html += '<div class="card"><h2>Komandos užkrova</h2><div class="hint" style="margin-bottom:8px">Aktyvių darbų valandos, palyginus su savaitės valandomis. Paspauskite eilutę — pamatysite žmogaus darbus.</div>' + loadRowsHtml() + "</div>";
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
          '<span class="chip ' + PRIO_CHIP[t.prioritetas] + '">' + PRIO[t.prioritetas] + "</span>" +
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

    var pool = poolTasks().filter(matchQ);
    var list = S.tasks.filter(function (t) {
      if (!t.darbuotojas_id) return false;
      if (f.emp === "pool") return false;
      if (f.emp && t.darbuotojas_id !== f.emp) return false;
      return matchQ(t) && matchStatus(t);
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
      '<button class="btn" data-action="new-shift">+ Naujas įrašas</button>' +
    "</div></div>";

    html += '<div class="card"><div class="week-nav">' +
      '<button class="btn-outline btn-sm" data-action="week-prev">‹</button>' +
      '<span class="range">' + weekRangeLabel(mon) + "</span>" +
      '<button class="btn-outline btn-sm" data-action="week-next">›</button>' +
      '<button class="btn-ghost btn-sm" data-action="week-today">Ši savaitė</button>' +
    "</div></div>";

    // Stalo vaizdas (kompiuteriui)
    var thead = "<tr><th style='width:150px'>Darbuotojas</th>" + days.map(function (d, idx) {
      var dIso = isoFromDate(d);
      return "<th class='" + (dIso === today ? "today" : "") + "'>" + DAYS_SHORT[idx] + "<br>" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") + "</th>";
    }).join("") + "</tr>";

    var tbody = emps.map(function (e) {
      var canRow = isAdmin() || (S.me && S.me.id === e.id);
      var cells = days.map(function (d) {
        var dIso = isoFromDate(d);
        var items = shiftsFor(e.id, dIso).map(function (s) {
          var canS = canEditShift(s);
          return '<span class="shift-pill" style="background:' + esc(e.spalva || "#5B5BD6") + '"' +
            (canS ? ' data-action="open-shift" data-id="' + s.id + '"' : "") + ">" +
            esc(s.nuo) + "–" + esc(s.iki) +
            (s.pastaba ? "<small>" + esc(s.pastaba) + "</small>" : "") +
          "</span>";
        }).join("");
        var add = canRow ? '<button class="cell-add" data-action="new-shift" data-emp="' + e.id + '" data-date="' + dIso + '" title="Pridėti">+</button>' : "";
        return "<td class='" + (dIso === today ? "today" : "") + "'>" + items + add + "</td>";
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

    html += '<div class="mobile-only"><div class="day-chips">' + chips + "</div>" +
      '<div class="card"><h2>' + DAYS_LONG[S.selDay] + ", " + MONTHS_GEN[days[S.selDay].getMonth()] + " " + days[S.selDay].getDate() + " d.</h2>" + dayList +
      '<button class="btn-outline btn-sm" data-action="new-shift" data-date="' + selIso + '" style="margin-top:8px">+ Pridėti įrašą</button>' +
      "</div></div>";

    return html;
  }

  // ---------- Komanda ----------

  function teamCardHtml(e) {
    var l = loadOf(e.id);
    return '<div class="team-card">' +
      '<div class="head">' + avatarHtml(e, true) +
        '<div style="min-width:0"><div class="name">' + esc(e.vardas) + (e.role === "admin" ? ' <span class="chip chip-primary">Admin</span>' : "") + "</div>" +
        '<div class="pareigos">' + esc(e.pareigos || "—") + "</div></div>" +
      "</div>" +
      '<div class="resp">' + (e.atsakomybes ? esc(e.atsakomybes) : '<span style="opacity:.6">Atsakomybės dar neaprašytos.</span>') + "</div>" +
      '<div class="mini-track"><div class="mini-fill ' + fillClass(l.pct) + '" style="width:' + Math.min(100, l.pct) + '%"></div></div>' +
      '<div class="foot"><span>' + l.hours + " val. iš " + l.cap + " (" + l.pct + "%)</span>" +
        (isAdmin() ? '<button class="btn-ghost btn-sm" data-action="open-emp" data-id="' + e.id + '">Redaguoti</button>' : "") +
      "</div>" +
      (!e.aktyvus ? '<div style="margin-top:8px"><span class="chip chip-gray">Neaktyvus</span></div>' : "") +
    "</div>";
  }

  function viewKomanda() {
    var act = activeEmployees();
    var inact = S.employees.filter(function (e) { return !e.aktyvus; });
    var html = '<div class="view-title"><h1>Komanda</h1><div class="actions">' +
      (isAdmin() ? '<button class="btn" data-action="new-emp">+ Pridėti darbuotoją</button>' : "") +
    "</div></div>";
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

  function empSelectOptions(selectedId, includeNone) {
    var opts = includeNone ? '<option value="">— Nepriskirta (bendra veikla) —</option>' : "";
    var list = isAdmin() ? activeEmployees() : (S.me ? [S.me] : []);
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
      prioritetas: "vidutinis", statusas: "laukia",
      darbuotojas_id: opts.pool ? null : (isAdmin() ? null : (S.me ? S.me.id : null))
    };
    var ov = openModal(
      "<h2>" + (isNew ? (opts.pool ? "Nauja bendra veikla" : "Naujas darbas") : "Darbo redagavimas") + "</h2>" +
      '<form id="task-form">' +
        '<div class="form-row"><label>Pavadinimas *</label><input type="text" name="pavadinimas" required maxlength="200" value="' + esc(t.pavadinimas) + '"></div>' +
        '<div class="form-row"><label>Kam priskirta</label><select name="darbuotojas_id">' + empSelectOptions(t.darbuotojas_id, isAdmin()) + "</select></div>" +
        '<div class="form-grid">' +
          '<div class="form-row"><label>Valandos</label><input type="number" name="valandos" min="0" step="0.5" value="' + esc(t.valandos) + '"></div>' +
          '<div class="form-row"><label>Terminas</label><input type="date" name="terminas" value="' + esc(t.terminas || "") + '"></div>' +
          '<div class="form-row"><label>Prioritetas</label><select name="prioritetas">' +
            Object.keys(PRIO).map(function (k) { return '<option value="' + k + '"' + (t.prioritetas === k ? " selected" : "") + ">" + PRIO[k] + "</option>"; }).join("") +
          "</select></div>" +
          '<div class="form-row"><label>Statusas</label><select name="statusas">' +
            Object.keys(STATUS).map(function (k) { return '<option value="' + k + '"' + (t.statusas === k ? " selected" : "") + ">" + STATUS[k] + "</option>"; }).join("") +
          "</select></div>" +
        "</div>" +
        '<div class="form-row"><label>Aprašymas</label><textarea name="aprasymas">' + esc(t.aprasymas || "") + "</textarea></div>" +
        '<div class="form-error" id="task-err"></div>' +
        '<div class="modal-actions">' +
          (!isNew && canEditTask(task) ? '<button type="button" class="btn-ghost left" id="task-del" style="color:var(--red)">Ištrinti</button>' : "") +
          '<button type="button" class="btn-outline" data-action="close-modal">Atšaukti</button>' +
          '<button type="submit" class="btn">Išsaugoti</button>' +
        "</div>" +
      "</form>"
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
        aprasymas: String(fd.get("aprasymas") || "").trim()
      };
      if (!obj.pavadinimas) return;
      var ok = isNew
        ? await mutate(API.addTask(obj), "Darbas išsaugotas")
        : await mutate(API.updateTask(task.id, obj), "Pakeitimai išsaugoti");
      if (ok) closeModal();
    });
    var del = ov.querySelector("#task-del");
    if (del) del.addEventListener("click", async function () {
      if (!confirm("Tikrai ištrinti šį darbą?")) return;
      if (await mutate(API.deleteTask(task.id), "Darbas ištrintas")) closeModal();
    });
  }

  function assignModal(task) {
    var rows = activeEmployees().map(function (e) {
      return { e: e, l: loadOf(e.id) };
    }).sort(function (a, b) { return a.l.pct - b.l.pct; });
    var ov = openModal(
      "<h2>Kam priskirti: " + esc(task.pavadinimas) + "</h2>" +
      '<div class="hint" style="margin-bottom:10px">Sąrašas surikiuotas nuo mažiausios užkrovos.</div>' +
      rows.map(function (r, i) {
        return '<div class="pick-row" data-pick="' + r.e.id + '">' + avatarHtml(r.e) +
          '<span style="font-weight:600;white-space:nowrap">' + esc(r.e.vardas) + "</span>" +
          (i === 0 ? '<span class="chip chip-green">Siūloma</span>' : "") +
          '<div class="track"><div class="fill ' + fillClass(r.l.pct) + '" style="width:' + Math.min(100, r.l.pct) + '%"></div></div>' +
          '<span class="pct">' + r.l.pct + "%</span>" +
        "</div>";
      }).join("") +
      '<div class="modal-actions">' +
        '<button type="button" class="btn-outline" data-action="close-modal">Atšaukti</button>' +
        '<button type="button" class="btn" id="assign-ok" disabled>Priskirti</button>' +
      "</div>"
    );
    var selected = null;
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
      if (await mutate(API.updateTask(task.id, { darbuotojas_id: selected }), "Priskirta: " + (emp ? emp.vardas : ""))) closeModal();
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
        '<div class="form-row"><label>Data *</label><input type="date" name="data" required value="' + esc(s.data) + '"></div>' +
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
      if (ok) closeModal();
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
            '<option value="admin"' + (e.role === "admin" ? " selected" : "") + ">Administratorius</option>" +
          "</select></div>" +
          '<div class="form-row"><label>Valandų per savaitę</label><input type="number" name="savaites_valandos" min="1" max="80" step="1" value="' + esc(e.savaites_valandos) + '"></div>' +
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
        savaites_valandos: Number(fd.get("savaites_valandos")) || 40,
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
    } else if (!S.me) {
      html = renderUnlinked();
    } else {
      var content = "";
      if (S.view === "apzvalga") content = viewApzvalga();
      else if (S.view === "tvarkarastis") content = viewTvarkarastis();
      else if (S.view === "darbai") content = viewDarbai();
      else if (S.view === "komanda") content = viewKomanda();
      html = shellHtml(content);
    }
    root.innerHTML = html;

    if (focusId) {
      var el = document.getElementById(focusId);
      if (el) {
        el.focus();
        if (selStart != null) { try { el.setSelectionRange(selStart, selStart); } catch (e) {} }
      }
    }

    if (!S.session) bindAuthForm();
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
    render();
  }

  // ---------- įvykiai ----------

  document.addEventListener("click", function (ev) {
    var el = ev.target.closest("[data-action]");
    if (!el) return;
    var action = el.getAttribute("data-action");
    var id = el.getAttribute("data-id");

    switch (action) {
      case "nav":
        S.view = el.getAttribute("data-view");
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
        mutate(API.updateTask(id, { darbuotojas_id: S.me.id }), "Veikla priskirta jums");
        break;
      }
      case "goto-emp-tasks":
        S.view = "darbai";
        S.filters.emp = id;
        S.filters.status = "aktyvus";
        render();
        window.scrollTo(0, 0);
        break;
      case "week-prev":
        S.weekOffset--; S.selDay = 0; render();
        break;
      case "week-next":
        S.weekOffset++; S.selDay = 0; render();
        break;
      case "week-today":
        S.weekOffset = 0; S.selDay = (new Date().getDay() + 6) % 7; render();
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
    }
  });

  document.addEventListener("change", function (ev) {
    var el = ev.target.closest("[data-change]");
    if (!el) return;
    var what = el.getAttribute("data-change");
    if (what === "task-status") {
      var id = el.getAttribute("data-id");
      mutate(API.updateTask(id, { statusas: el.value }), "Statusas: " + STATUS[el.value]);
    } else if (what === "filter-emp") {
      S.filters.emp = el.value;
      render();
    } else if (what === "filter-status") {
      S.filters.status = el.value;
      render();
    }
  });

  document.addEventListener("input", function (ev) {
    var el = ev.target.closest("[data-input]");
    if (!el) return;
    if (el.getAttribute("data-input") === "search") {
      S.filters.q = el.value;
      render();
    }
  });

  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") closeModal();
  });

  // ---------- paleidimas ----------

  async function boot() {
    S.mode = await API.init();
    S.session = await API.getSession();
    API.onAuthChange(async function () {
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
    render();

    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  }

  boot();
})();
