/*
 * Daily Register prototype: local demo runtime.
 *
 * The original app runs inside Claude and keeps its data in a shared online store.
 * This file stands in for that store so the prototype runs as a plain website:
 * everything is saved in this browser only (localStorage) and is filled with
 * FICTIONAL demonstration learners. No real learner information is included.
 */
(function () {
  "use strict";
  var KEY = "daily-register-demo-v1";
  var TZ = "Africa/Johannesburg";

  /* ---------- storage ---------- */
  var mem = null;
  function load() {
    if (mem) return mem;
    try { mem = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { mem = null; }
    if (!mem || !mem.docs) { mem = { docs: seed() }; persist(); }
    return mem;
  }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) {} }
  var clone = function (v) { return v == null ? v : JSON.parse(JSON.stringify(v)); };

  /* ---------- fictional seed data ---------- */
  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
  function seed() {
    var r = rng(20261111), pick = function (a) { return a[Math.floor(r() * a.length)]; };
    var boys = ["Thabo", "Sipho", "Kagiso", "Lebo", "Neo", "Tumelo", "Pieter", "Johan", "Ruan", "Kabelo", "Tshepo", "Lwazi", "Bongani", "Mpho", "Daniel", "Liam", "Karabo", "Themba", "Wian", "Jaco"];
    var girls = ["Naledi", "Palesa", "Lerato", "Anika", "Zanele", "Mia", "Refilwe", "Ayanda", "Thandi", "Elna", "Nomsa", "Keabetswe", "Chante", "Precious", "Lindiwe", "Marike", "Dineo", "Kamogelo", "Busisiwe", "Karien"];
    var sur = ["MOLOI", "NKOSI", "VAN WYK", "MOKOENA", "DLAMINI", "BOTHA", "MAHLANGU", "KHUMALO", "NAUDE", "SITHOLE", "MOTAUNG", "PRETORIUS", "RADEBE", "MOLEFE", "DU PLESSIS", "TSHABALALA", "COETZEE", "MASHABA", "LOUW", "MOSIA", "NDLOVU", "STEYN", "MOTLOUNG", "FOURIE"];
    var classes = [["MID", "Year 1", "J1", 16], ["MID", "Year 2", "J2", 18], ["MID", "Year 3", "J3", 14], ["SID", "Grade 4A", "S4A", 15], ["SID", "Grade 5A", "S5A", 17], ["SID", "Grade 5B", "S5B", 13]];
    var docs = {}, acc = 4100, order = {};
    classes.forEach(function (c) {
      var id = (c[0] + "-" + c[1]).toLowerCase().replace(/[^a-z0-9]+/g, "-");
      order[c[0]] = (order[c[0]] || 0) + 1;
      var used = {}, learners = [];
      for (var i = 0; i < c[3]; i++) {
        var g = r() < 0.55 ? "M" : "F", first, s, k;
        do { first = pick(g === "M" ? boys : girls); s = pick(sur); k = s + first; } while (used[k]);
        used[k] = 1;
        learners.push({ surname: s, first: first, nick: null, acc: String(acc += 1 + Math.floor(r() * 7)), gender: g });
      }
      learners.sort(function (a, b) { return a.surname.localeCompare(b.surname) || a.first.localeCompare(b.first); });
      learners.forEach(function (l, i) { l.id = id + "-" + String(i + 1).padStart(2, "0"); });
      docs["classes/" + id] = { name: c[1], sasams: c[2], dept: c[0], order: order[c[0]], learners: learners };
    });
    docs["config/school"] = { name: "Demo School (prototype)" };

    /* about two weeks of past registers, so the log, rankings and reasons have something to show */
    var days = [], d = new Date();
    while (days.length < 9) { d = new Date(d.getTime() - 86400000); var dow = new Date(d.toLocaleDateString("en-CA", { timeZone: TZ }) + "T12:00:00Z").getUTCDay(); if (dow > 0 && dow < 6) days.push(d.toLocaleDateString("en-CA", { timeZone: TZ })); }
    var common = ["S", "S", "A", "MA", "T", "FR", "S", "EC", "LF"];
    var outReasons = ["Collected by parent/guardian", "Sick – sent home", "Medical appointment"];
    var mv = 0;
    days.forEach(function (date, di) {
      Object.keys(docs).filter(function (k) { return k.indexOf("classes/") === 0; }).forEach(function (k) {
        var cid = k.slice(8), c = docs[k], marks = {};
        var classBias = { "mid-year-1": 0.04, "mid-year-2": 0.08, "mid-year-3": 0.05, "sid-grade-4a": 0.11, "sid-grade-5a": 0.06, "sid-grade-5b": 0.09 }[cid] || 0.07;
        c.learners.forEach(function (l, li) {
          var x = r(), p = classBias + (li % 7 === 3 ? 0.12 : 0);
          if (x < p) marks[l.id] = di < 3 && r() < 0.6 ? "AB" : pick(common);
          else if (x < p + 0.03) marks[l.id] = "L";
          else marks[l.id] = "PR";
          if (marks[l.id] === "PR" && r() < 0.025) {
            docs["movements/demo" + (++mv)] = { date: date, classId: cid, learnerId: l.id, type: "out", time: "1" + Math.floor(r() * 3) + ":" + pick(["05", "20", "40", "55"]), reason: pick(outReasons), collectedBy: "Parent", note: "", at: date + "T10:00:00Z", by: "demo-office" };
          }
          if (marks[l.id] === "L") {
            docs["movements/demo" + (++mv)] = { date: date, classId: cid, learnerId: l.id, type: "in", time: "08:" + pick(["10", "25", "40"]), reason: pick(["Transport late", "No valid reason", "Medical appointment"]), collectedBy: "", note: "", at: date + "T06:30:00Z", by: "demo-office" };
            marks[l.id] = "PR";
          }
        });
        docs["registers/" + date + "_" + cid] = { date: date, classId: cid, status: "submitted", marks: marks, submittedTime: "07:5" + Math.floor(r() * 9), by: "demo-teacher", updatedAt: date + "T05:55:00Z" };
      });
    });
    return docs;
  }

  /* ---------- tiny document store with the same calls the app uses ---------- */
  var subs = [];
  function notify() { subs.slice().forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); }
  window.addEventListener("storage", function (e) { if (e.key === KEY) { mem = null; notify(); } });

  function test(doc, w) {
    var x = doc[w[0]], v = w[2];
    switch (w[1]) {
      case "==": return x === v; case "!=": return x !== v;
      case "<": return x < v; case "<=": return x <= v; case ">": return x > v; case ">=": return x >= v;
      case "in": return v.indexOf(x) >= 0; case "not-in": return v.indexOf(x) < 0;
      case "array-contains": return Array.isArray(x) && x.indexOf(v) >= 0;
    }
    return true;
  }
  function docSnap(path) { var v = load().docs[path]; return { id: path.split("/").pop(), exists: v !== undefined, data: function () { return clone(v); } }; }
  function querySnap(col, wheres) {
    var depth = col.split("/").length + 1, all = load().docs;
    var docs = Object.keys(all).filter(function (k) { return k.indexOf(col + "/") === 0 && k.split("/").length === depth && wheres.every(function (w) { return test(all[k], w); }); })
      .sort().map(docSnap);
    return { docs: docs, size: docs.length, empty: !docs.length, metadata: { fromCache: false, hasPendingWrites: false }, docChanges: function () { return []; } };
  }
  function later(f) { setTimeout(f, 0); }
  function merge(a, b) { Object.keys(b).forEach(function (k) { var v = b[k]; if (v && typeof v === "object" && !Array.isArray(v) && a[k] && typeof a[k] === "object" && !Array.isArray(a[k])) merge(a[k], v); else a[k] = clone(v); }); return a; }
  function query(col, wheres) {
    return {
      where: function (f, op, v) { return query(col, wheres.concat([[f, op, v]])); },
      orderBy: function () { return query(col, wheres); },
      limit: function () { return query(col, wheres); },
      get: function () { return Promise.resolve(querySnap(col, wheres)); },
      onSnapshot: function (next) { var f = function () { next(querySnap(col, wheres)); }; subs.push(f); later(f); return function () { subs = subs.filter(function (s) { return s !== f; }); }; },
      add: function (data) { var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8); load().docs[col + "/" + id] = clone(data); persist(); later(notify); return Promise.resolve({ id: id }); },
      doc: function (id) { return docRef(col + "/" + id); }
    };
  }
  function docRef(path) {
    return {
      id: path.split("/").pop(), path: path,
      get: function () { return Promise.resolve(docSnap(path)); },
      set: function (data) { load().docs[path] = clone(data); persist(); later(notify); return Promise.resolve(); },
      update: function (data) { var d = load().docs[path]; if (!d) return Promise.reject({ code: "invalid_argument", message: "Document does not exist" }); merge(d, data); persist(); later(notify); return Promise.resolve(); },
      delete: function () { delete load().docs[path]; persist(); later(notify); return Promise.resolve(); },
      onSnapshot: function (next) { var f = function () { next(docSnap(path)); }; subs.push(f); later(f); return function () { subs = subs.filter(function (s) { return s !== f; }); }; }
    };
  }
  var db = { collection: function (p) { return query(p, []); }, doc: docRef };

  var user = {
    id: function () { return Promise.resolve("demo-user"); },
    isOwner: function () { return Promise.resolve(true); },
    canEdit: function () { return true; },
    can: function () { return Promise.resolve(true); },
    me: function () { return Promise.resolve({ id: "demo-user", name: "Demo user" }); },
    profiles: function (ids) { var o = {}; ids.forEach(function (id) { o[id] = { id: id, name: id === "demo-office" ? "Office (demo)" : id === "demo-teacher" ? "Teacher (demo)" : "Demo user" }; }); return Promise.resolve(o); }
  };

  /* Outside Claude the browser can save files directly */
  var downloads = {
    save: function (o) {
      var blob = o.data instanceof Blob ? o.data : new Blob([o.data]);
      var url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = o.filename || "download"; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      return Promise.resolve();
    }
  };

  window.claude = { use: function (name) { return Promise.resolve({ db: db, user: user, downloads: downloads }[name] || null); } };
  window.demoReset = function () { try { localStorage.removeItem(KEY); } catch (e) {} mem = null; location.reload(); };
})();
