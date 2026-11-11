/*
 * Daily Register prototype: local demo runtime.
 *
 * The original app keeps its data in a shared online store. This file stands in for
 * that store so the prototype runs as a plain website. It loads the anonymised CSV
 * snapshot in /data (real learner names and Acc Nos removed; each learner has an invented name) and keeps any changes in this browser only (localStorage).
 */
(function () {
  "use strict";
  var KEY = "daily-register-demo-v2";
  var TZ = "Africa/Johannesburg";

  /* ---------- storage ----------
   * Base data comes from the CSV files in /data (a snapshot of the school's real
   * registers; learners carry invented names and no Acc Nos). Changes made in the demo are
   * kept in this browser only, on top of that snapshot. */
  var DATA_FILES = ["classes", "learners", "registers", "movements"];
  var mem = null, ready = null;
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) {} }
  var clone = function (v) { return v == null ? v : JSON.parse(JSON.stringify(v)); };
  function load() { return mem; }

  function parseCSV(text) {
    var rows = [], row = [], f = "", q = false, i, c;
    for (i = 0; i < text.length; i++) {
      c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === ",") { row.push(f); f = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); f = ""; if (row.length > 1 || row[0] !== "") rows.push(row); row = []; }
      else f += c;
    }
    if (f !== "" || row.length) { row.push(f); rows.push(row); }
    var head = rows.shift() || [];
    return rows.map(function (r) { var o = {}; head.forEach(function (h, j) { o[h] = r[j] == null ? "" : r[j]; }); return o; });
  }
  function fetchCSV(name) {
    return fetch("data/" + name + ".csv", { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("Couldn't load data/" + name + ".csv (" + r.status + ")");
      return r.text();
    }).then(function (t) { return { name: name, text: t }; });
  }
  function hash(str) { var h = 5381; for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return String(h >>> 0); }

  function build(t) {
    var docs = {}, classes = parseCSV(t.classes), learners = parseCSV(t.learners);
    classes.forEach(function (c) {
      docs["classes/" + c.class_id] = {
        name: c.class_name, sasams: c.sasams_class, dept: c.department, order: Number(c.order) || 0,
        learners: learners.filter(function (l) { return l.class_id === c.class_id; })
          .map(function (l) { return { id: l.learner_id, surname: l.surname, first: l.first_name, nick: null, acc: null, gender: l.gender }; })
          .sort(function (a, b) { return a.surname.localeCompare(b.surname) || a.first.localeCompare(b.first); })
      };
    });
    parseCSV(t.registers).forEach(function (r) {
      var k = "registers/" + r.date + "_" + r.class_id;
      var d = docs[k] || (docs[k] = { date: r.date, classId: r.class_id, status: r.register_status || "submitted", submittedTime: r.submitted_time, marks: {} });
      d.marks[r.learner_id] = r.mark;
    });
    parseCSV(t.movements).forEach(function (m, i) {
      docs["movements/csv" + i] = { date: m.date, classId: m.class_id, learnerId: m.learner_id, type: m.type, time: m.time, reason: m.reason, note: "", collectedBy: "", at: m.date + "T" + m.time + ":00+02:00", by: "snapshot" };
    });
    docs["config/school"] = { name: "Johan Slabbert School" };
    return docs;
  }
  function init() {
    return Promise.all(DATA_FILES.map(fetchCSV)).then(function (list) {
      var t = {}; list.forEach(function (x) { t[x.name] = x.text; });
      var version = hash(DATA_FILES.map(function (n) { return t[n]; }).join("|"));
      var saved = null;
      try { saved = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
      if (saved && saved.version === version && saved.docs) mem = saved;
      else { mem = { version: version, docs: build(t) }; persist(); }
    });
  }
  ready = init();

  /* ---------- tiny document store with the same calls the app uses ---------- */
  var subs = [];
  function notify() { subs.slice().forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); }
  window.addEventListener("storage", function (e) { if (e.key === KEY) { try { mem = JSON.parse(e.newValue) || mem; } catch (x) {} notify(); } });

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

  window.claude = { use: function (name) {
    return ready.then(function () { return { db: db, user: user, downloads: downloads }[name] || null; },
      function (e) { console.error(e); var m = document.getElementById("app"); if (m) m.innerHTML = '<div class="panel"><h2>The demo data didn\'t load</h2><p class="muted">' + String(e.message || e).replace(/</g, "&lt;") + '. Reload the page to try again.</p></div>'; return null; });
  } };
  window.demoReset = function () { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); };
})();
