/* ============================================================
   KARMA — systems/error-monitor.js   (v10.62.2 · SELF-DIAGNOSTIC)

   NEDEN VAR?
   ----------
   v10.55'e kadar çalışma anı hataları yalnızca konsola düşüyordu;
   oyuncu oyunun sessizce bozulduğunu fark etmiyor, geliştirici de
   "hangi ekranda, hangi aksiyondan sonra, hangi state ile" olduğunu
   göremiyordu. Bu modül o boşluğu kapatır:

     · global runtime hata yakalama (error / unhandledrejection)
     · son kullanıcı AKSİYONLARI ve EVENT'leri (bağlam için)
     · NAVIGATION WATCHDOG (telefon görünümleri)
     · EVENT WATCHDOG (aynı olayın iki kez işlenmesi)
     · STATE VALIDATOR (NaN / Infinity / bozuk referans / kopya id)
     · oyuncunun elle "HATA BİLDİR" akışı
     · KARMA-BUG-REPORT.json dışa aktarma

   TASARIM İLKESİ — FAIL-SAFE
   --------------------------
   İzleyicinin KENDİSİ oyunu bozmamalı. Bu yüzden:
     · her genel metot try/catch içinde çalışır,
     · `_busy` bayrağı ile sonsuz hata döngüsü engellenir,
     · log yapıları SINIRLIDIR (ring buffer),
     · hiçbir yerde `throw` edilmez.

   MEVCUT SİSTEMLERİ KORUR
   -----------------------
   Yeni bir bildirim/olay/navigasyon sistemi KURMAZ. Var olan
   K.bus (core/events.js), K.phone (apps/phone.js) ve K.state
   üzerine YALNIZCA gözlemci olarak bağlanır. Normal oyuncu arayüzü
   değişmez; panel mevcut test panelinden (Ctrl+Shift+D) açılır.
   ============================================================ */
(function (K) {
  "use strict";

  const LIMIT = { errors: 60, warnings: 40, actions: 24, events: 30, reports: 20 };

  /* aynı gün içinde iki kez işlenmesi ŞÜPHELİ olaylar (event watchdog) */
  const WATCH_EVENTS = ["release:published", "notif:new", "social:post", "offer:new", "offer:resolved"];

  const SEV_RANK = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

  function nowISO() { try { return new Date().toISOString(); } catch (e) { return ""; } }
  function ringPush(arr, item, max) { try { arr.unshift(item); if (arr.length > max) arr.length = max; } catch (e) {} }

  /* hatayı kategoriye ayır (mesaj + tip sezgisi) */
  function categorize(type, msg) {
    const m = String(msg || "").toLowerCase();
    if (/save|load|localstorage|quota|kayıt/.test(m)) return "save-load";
    if (/navigation|route|screen|view|render|phone|app/.test(m)) return "phone-app";
    if (/stream|listener|monthly|dinlen/.test(m)) return "stream";
    if (/chart|liste/.test(m)) return "chart";
    if (/label|şirket|sirket/.test(m)) return "label";
    if (/relation|affinity|samimiyet/.test(m)) return "relation";
    if (/balance|money|debt|economy|para/.test(m)) return "economy";
    if (/release|yayın|yayin/.test(m)) return "release";
    if (/social|feed|post/.test(m)) return "social";
    return "runtime";
  }

  function severityOf(cat, type) {
    if (cat === "save-load") return "CRITICAL";
    if (cat === "phone-app" && type === "error") return "HIGH";
    if (type === "promise" || type === "error") return "HIGH";
    if (type === "state") return "HIGH";
    if (type === "event") return "MEDIUM";
    if (type === "navigation") return "MEDIUM";
    return "MEDIUM";
  }

  K.err = {
    _ready: false,
    _busy: false,
    _nav: { app: null, screen: null, prevScreen: null },
    _evtSeen: {},
    _warned: {},
    _toastShown: 0,
    _stats: { captured: 0, suppressed: 0, lastAt: 0 },

    log: { errors: [], warnings: [], actions: [], events: [], reports: [] },

    /* ---------------- bağlam (context) ---------------- */
    _ctx(extra) {
      const out = { at: nowISO(), version: null, day: null, app: null, screen: null, prevScreen: null, lastAction: null, playerId: null };
      try {
        out.version = K.VERSION || null;
        const s = K.state;
        if (s) {
          out.day = s.day;
          out.playerId = (s.player && s.player.stageName) || null;
        }
        out.app = K.err._nav.app;
        out.screen = K.err._nav.screen;
        out.prevScreen = K.err._nav.prevScreen;
        const la = K.err.log.actions[0];
        out.lastAction = la ? (la.action + (la.detail ? " · " + la.detail : "")) : null;
      } catch (e) {}
      if (extra) { for (const k in extra) { if (extra[k] !== undefined) out[k] = extra[k]; } }
      return out;
    },

    /* ---------------- güvenli sarma ---------------- */
    /* fn() içinde hata olursa kaydeder ama ASLA dışarı fırlatmaz. */
    guard(fn, ctx) {
      try { return fn(); }
      catch (e) {
        try { K.err.capture({ type: "runtime", message: (e && e.message) || String(e), stack: e && e.stack, ...(ctx || {}) }); } catch (e2) {}
        return undefined;
      }
    },

    /* ---------------- kayıt ---------------- */
    capture(entry) {
      if (K.err._busy) { K.err._stats.suppressed++; return null; }
      K.err._busy = true;
      try {
        const e = entry || {};
        const msg = String(e.message || "bilinmeyen hata");
        const cat = e.category || categorize(e.type, msg);
        const sev = e.severity || severityOf(cat, e.type);
        const rec = {
          id: "e" + Date.now().toString(36) + Math.floor((K.err._stats.captured % 997)),
          at: nowISO(),
          version: (K.state && K.VERSION) || K.VERSION || null,
          day: (K.state && K.state.day) || null,
          type: e.type || "runtime",
          category: cat,
          severity: sev,
          message: msg,
          stack: String(e.stack || "").split("\n").slice(0, 6).join("\n"),
          app: e.app || K.err._nav.app || null,
          screen: e.screen || K.err._nav.screen || null,
          prevScreen: e.prevScreen || K.err._nav.prevScreen || null,
          lastAction: e.lastAction || (K.err.log.actions[0] ? K.err.log.actions[0].action : null),
          route: e.route || null,
          artistId: e.artistId || null,
          releaseId: e.releaseId || null,
          context: K.err._ctx()
        };
        ringPush(K.err.log.errors, rec, LIMIT.errors);
        K.err._stats.captured++;
        K.err._stats.lastAt = Date.now();
        K.lastError = { label: cat, detail: msg, at: Date.now() };

        /* oyuncuya SEYREK bildirim (spam yok) */
        if (sev === "CRITICAL" || sev === "HIGH") {
          if (K.err._toastShown < 3) {
            K.err._toastShown++;
            try { K.toast("⚠️ Beklenmedik hata", "Kaydedildi · Test Paneli → Son Hatalar", "bad"); } catch (e3) {}
          }
        }
        return rec;
      } catch (e4) {
        return null;
      } finally {
        K.err._busy = false;
      }
    },

    /* state uyarısı (exception değil, şüpheli değer)
       NOT: capture'dan farklı olarak _busy kapısı YOKTUR — validateState
       _busy tutarken çağırır ve yalnızca diziye ekler (özyineleme riski yok). */
    warn(cat, msg, extra) {
      try {
        const day = (K.state && K.state.day) || 0;
        const key = day + "|" + cat + "|" + msg;
        if (K.err._warned[key]) return null;      // aynı gün aynı uyarıyı tekrarlama
        K.err._warned[key] = 1;
        const rec = {
          id: "w" + Date.now().toString(36),
          at: nowISO(), day, version: K.VERSION || null,
          category: cat, severity: (extra && extra.severity) || "MEDIUM",
          message: String(msg), path: (extra && extra.path) || null,
          context: K.err._ctx()
        };
        ringPush(K.err.log.warnings, rec, LIMIT.warnings);
        return rec;
      } catch (e) { return null; }
    },

    /* ---------------- kullanıcı aksiyonu ---------------- */
    note(action, detail) {
      try {
        ringPush(K.err.log.actions, { at: nowISO(), day: (K.state && K.state.day) || null, action: String(action || "?"), detail: detail ? String(detail) : null }, LIMIT.actions);
      } catch (e) {}
    },

    /* ---------------- navigasyon izleyici ---------------- */
    noteNav(app, screen) {
      try {
        const n = K.err._nav;
        if (screen !== n.screen || app !== n.app) n.prevScreen = n.screen;
        n.app = app || n.app;
        n.screen = screen || n.screen;
        K.err.note("nav", (app || "") + " / " + (screen || ""));
      } catch (e) {}
    },

    /* bir görünüm gerçekten render edilebilir mi? (navigation watchdog) */
    checkView(view) {
      try {
        if (!view) { K.err.capture({ type: "navigation", message: "boş görünüm (view=null)" }); return false; }
        if (typeof view.render !== "function") {
          K.err.capture({ type: "navigation", message: "render fonksiyonu yok: " + (view.title || view.appId || "?"), screen: view.title || null, severity: "HIGH" });
          return false;
        }
        return true;
      } catch (e) { return false; }
    },

    /* ---------------- event izleyici ---------------- */
    noteEvent(evt, payload) {
      try {
        const eid = (payload && (payload.id || payload.songId || payload.releaseId || payload.artistId || (payload.n && payload.n.id))) || null;
        ringPush(K.err.log.events, { at: nowISO(), day: (K.state && K.state.day) || null, evt: evt, id: eid }, LIMIT.events);
        if (WATCH_EVENTS.indexOf(evt) < 0) return;
        /* varlık kimliği yoksa aynı gün tekrarı meşru olabilir (ör. birden
           çok bildirim) — yanlış pozitif üretmemek için atla. */
        if (eid == null) return;
        const id = eid;
        const day = (K.state && K.state.day) || 0;
        const key = evt + "|" + id + "|" + day;
        if (K.err._evtSeen[key]) {
          K.err.capture({
            type: "event", category: "event", severity: "MEDIUM",
            message: "olay aynı gün iki kez işlendi: " + evt + " (id=" + id + ")",
            releaseId: (payload && payload.releaseId) || null
          });
        } else {
          K.err._evtSeen[key] = 1;
          /* eski anahtarları buda (bellek sınırı) */
          const keys = Object.keys(K.err._evtSeen);
          if (keys.length > 400) keys.slice(0, 200).forEach(k => delete K.err._evtSeen[k]);
        }
      } catch (e) {}
    },

    /* ---------------- STATE VALIDATOR ---------------- */
    _num(v) { return typeof v === "number" && isFinite(v); },

    validateState() {
      if (K.err._busy) return [];
      K.err._busy = true;
      const found = [];
      try {
        const s = K.state;
        if (!s) return found;
        const chk = (cond, cat, msg, extra) => { if (!cond) { const w = K.err.warn(cat, msg, extra); if (w) found.push(w); } };

        /* --- para & oyuncu --- */
        chk(K.err._num(s.balance), "economy", "balance sayı değil/NaN: " + s.balance);
        const p = s.player || {};
        chk(K.err._num(p.monthly) && p.monthly >= 0, "stream", "monthly geçersiz: " + p.monthly);
        chk(K.err._num(p.streams) && p.streams >= 0, "stream", "streams geçersiz: " + p.streams);
        chk(K.err._num(p.popularity), "runtime", "popularity geçersiz: " + p.popularity);
        ["ig", "x", "tiktok", "ytSubs"].forEach(k => chk(K.err._num(p[k]) && p[k] >= 0, "social", k + " geçersiz: " + p[k]));
        if (p.stress != null) chk(K.err._num(p.stress), "runtime", "stress geçersiz: " + p.stress);
        chk(K.err._num(p.debt || 0), "economy", "debt geçersiz: " + p.debt);

        /* --- şarkılar: kimlik + sayılar + kopya id --- */
        const ids = {};
        (p.songs || []).slice(0, 300).forEach((sg, i) => {
          if (!sg) { chk(false, "release", "songs[" + i + "] null"); return; }
          if (!sg.id) chk(false, "release", "şarkıda id yok: " + (sg.title || i));
          else if (ids[sg.id]) chk(false, "release", "kopya şarkı id: " + sg.id);
          else ids[sg.id] = 1;
          if (sg.streams != null) chk(K.err._num(sg.streams) && sg.streams >= 0, "stream", "şarkı streams geçersiz: " + sg.id);
          if (sg.dailyStreams != null) chk(K.err._num(sg.dailyStreams) && sg.dailyStreams >= 0, "stream", "şarkı dailyStreams geçersiz: " + sg.id);
        });

        /* --- teklifler --- */
        chk(Array.isArray(s.offers), "runtime", "offers dizi değil");
        const oids = {};
        (Array.isArray(s.offers) ? s.offers : []).slice(0, 200).forEach((o, i) => {
          if (!o) { chk(false, "runtime", "offers[" + i + "] null"); return; }
          if (!o.id) chk(false, "runtime", "teklifte id yok");
          else if (oids[o.id]) chk(false, "runtime", "kopya teklif id: " + o.id);
          else oids[o.id] = 1;
          chk(!!o.type && !!o.status, "runtime", "teklif eksik alan: " + o.id);
        });

        /* --- ilişkiler: affinity + bozuk referans --- */
        const rel = s.relations || {};
        const rkeys = Object.keys(rel).slice(0, 500);
        rkeys.forEach(id => {
          const r = rel[id];
          if (!r) { chk(false, "relation", "ilişki null: " + id); return; }
          if (r.affinity != null) chk(K.err._num(r.affinity), "relation", "affinity geçersiz: " + id);
          if (K.artistById && !K.artistById(id)) chk(false, "relation", "ilişki bilinmeyen sanatçıya bağlı: " + id, { severity: "LOW" });
        });

        /* --- chart --- */
        if (s.chart) {
          chk(Array.isArray(s.chart), "chart", "chart dizi değil");
          (Array.isArray(s.chart) ? s.chart : []).slice(0, 200).forEach((e, i) => {
            if (!e) { chk(false, "chart", "chart[" + i + "] null"); return; }
            if (!K.err._num(e.rank)) chk(false, "chart", "chart rank geçersiz: " + (e.title || i));
          });
        }

        /* --- NPC aylık pencere (v10.61) --- */
        const win = s.npcStreams || {};
        Object.keys(win).slice(0, 600).forEach(id => {
          const arr = win[id];
          if (arr == null) return;
          if (!Array.isArray(arr)) { chk(false, "stream", "npcStreams dizi değil: " + id); return; }
          arr.slice(-28).forEach(v => chk(K.err._num(v) && v >= 0, "stream", "npcStreams negatif/geçersiz: " + id));
        });

        /* --- feed yapısı --- */
        if (s.feed) {
          Object.keys(s.feed).forEach(k => chk(Array.isArray(s.feed[k]), "social", "feed." + k + " dizi değil"));
        }

        /* --- sosyal yığınlar --- */
        ["likes", "follows", "subs", "saved", "reposts"].forEach(k => {
          if (p[k] != null) chk(typeof p[k] === "object", "social", "player." + k + " nesne değil");
        });
      } catch (e) {
        K.err.capture({ type: "state", message: "validateState çöktü: " + (e && e.message) });
      } finally {
        K.err._busy = false;
      }
      return found;
    },

    /* ---------------- oyuncunun elle bildirimi ---------------- */
    report(text) {
      try {
        const s = K.state;
        const rep = {
          id: "r" + Date.now().toString(36),
          at: nowISO(),
          userReport: String(text || "").slice(0, 600),
          version: K.VERSION || null,
          day: s ? s.day : null,
          app: K.err._nav.app,
          screen: K.err._nav.screen,
          prevScreen: K.err._nav.prevScreen,
          lastAction: K.err.log.actions[0] ? K.err.log.actions[0].action : null,
          recentActions: K.err.log.actions.slice(0, 15).map(a => a.action + (a.detail ? " · " + a.detail : "")),
          recentEvents: K.err.log.events.slice(0, 15).map(e => e.evt + (e.id ? "#" + e.id : "")),
          recentErrors: K.err.log.errors.slice(0, 8).map(e => e.severity + " " + e.category + ": " + e.message),
          stateWarnings: K.err.log.warnings.slice(0, 10).map(w => w.category + ": " + w.message),
          saveState: K.err._stateSnapshot()
        };
        ringPush(K.err.log.reports, rep, LIMIT.reports);
        return rep;
      } catch (e) { return null; }
    },

    /* rapora gömülecek hafif state özeti (hassas/tam veri değil) */
    _stateSnapshot() {
      try {
        const s = K.state; if (!s) return null;
        const p = s.player || {};
        return {
          balance: Math.round(s.balance || 0),
          day: s.day,
          popularity: Math.round(p.popularity || 0),
          monthly: Math.round(p.monthly || 0),
          streams: Math.round(p.streams || 0),
          followers: { ig: p.ig || 0, x: p.x || 0, tiktok: p.tiktok || 0, ytSubs: p.ytSubs || 0 },
          songs: (p.songs || []).length,
          offers: (s.offers || []).length,
          relations: Object.keys(s.relations || {}).length,
          notifications: (s.notifications || []).length,
          chartTop: (s.chart || []).slice(0, 3).map(e => ({ rank: e.rank, title: e.title, mine: !!e.mine }))
        };
      } catch (e) { return null; }
    },

    /* ---------------- dışa aktarma ---------------- */
    exportObject() {
      try {
        return {
          format: "KARMA-BUG-REPORT",
          generatedAt: nowISO(),
          version: K.VERSION || null,
          day: (K.state && K.state.day) || null,
          stats: K.err._stats,
          nav: K.err._nav,
          state: K.err._stateSnapshot(),
          errors: K.err.log.errors,
          stateWarnings: K.err.log.warnings,
          navigationErrors: K.err.log.errors.filter(e => e.category === "phone-app" || e.category === "navigation"),
          eventErrors: K.err.log.errors.filter(e => e.category === "event"),
          userReports: K.err.log.reports,
          recentActions: K.err.log.actions,
          recentEvents: K.err.log.events
        };
      } catch (e) { return { format: "KARMA-BUG-REPORT", error: String(e && e.message) }; }
    },

    exportJSON() {
      try { return JSON.stringify(K.err.exportObject(), null, 2); }
      catch (e) { return JSON.stringify({ format: "KARMA-BUG-REPORT", error: String(e && e.message) }); }
    },

    /* tarayıcıda indir (test panelinden) */
    download() {
      try {
        const data = K.err.exportJSON();
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "KARMA-BUG-REPORT.json";
        document.body.appendChild(a); a.click();
        setTimeout(() => { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) {} }, 400);
        return true;
      } catch (e) { return false; }
    },

    clear() { K.err.log = { errors: [], warnings: [], actions: [], events: [], reports: [] }; K.err._evtSeen = {}; K.err._warned = {}; },

    /* ---------------- panel HTML (mevcut test paneli için) ---------------- */
    panelHTML() {
      const esc = (K.util && K.util.escape) ? K.util.escape : (x => String(x == null ? "" : x));
      const sev = { CRITICAL: "#ff4d4d", HIGH: "#ff8c42", MEDIUM: "#ffd166", LOW: "#8ab4f8" };
      const errs = K.err.log.errors.slice(0, 8);
      const warns = K.err.log.warnings.slice(0, 5);
      const reports = K.err.log.reports.slice(0, 5);
      const row = e => `<div class="err-row" data-err-id="${e.id}" style="border-left:3px solid ${sev[e.severity] || "#888"};padding:5px 8px;margin:4px 0;background:rgba(255,255,255,.03);border-radius:6px;cursor:pointer">
        <div style="font-weight:700;color:${sev[e.severity] || "#aaa"};font-size:11px">${esc(e.severity || "")} — ${esc(e.category || "")}${e.app ? " / " + esc(e.app) : ""}${e.screen ? " / " + esc(e.screen) : ""}</div>
        <div style="font-size:11.5px;color:var(--text-1,#ddd)">${esc((e.message || "").slice(0, 120))}</div>
        <div style="font-size:10px;color:#888">Gün ${e.day == null ? "?" : e.day} · ${esc(e.at || "")}</div>
        <div class="err-detail" style="display:none;font-size:10.5px;color:#9aa;white-space:pre-wrap;margin-top:4px">${esc((e.stack || "").slice(0, 500))}${e.lastAction ? "\nSon aksiyon: " + esc(e.lastAction) : ""}${e.prevScreen ? "\nÖnceki ekran: " + esc(e.prevScreen) : ""}</div>
      </div>`;
      const wrow = w => `<div style="font-size:11px;color:#ffd166;padding:2px 0">• ${esc(w.category)}: ${esc((w.message || "").slice(0, 110))}</div>`;
      const rrow = r => `<div style="font-size:11px;color:#8ab4f8;padding:2px 0">• ${esc((r.userReport || "").slice(0, 110))} <span style="color:#777">(Gün ${r.day})</span></div>`;
      return `
        <div class="dev-sec"><b>🩺 Son Hatalar (${K.err.log.errors.length})</b>
          <div class="dev-row">
            <button class="btn btn-ghost btn-sm" data-dev="err-report">✍️ HATA BİLDİR</button>
            <button class="btn btn-ghost btn-sm" data-dev="err-export">⬇️ Raporu indir</button>
            <button class="btn btn-ghost btn-sm" data-dev="err-validate">🔎 State doğrula</button>
            <button class="btn btn-ghost btn-sm" data-dev="err-clear">🧹 Temizle</button>
          </div>
          <div style="margin-top:6px">${errs.length ? errs.map(row).join("") : '<div style="font-size:11px;color:#777">Kayıtlı hata yok.</div>'}</div>
          ${warns.length ? `<div style="margin-top:8px"><b style="font-size:11px">State Uyarıları</b>${warns.map(wrow).join("")}</div>` : ""}
          ${reports.length ? `<div style="margin-top:8px"><b style="font-size:11px">Oyuncu Bildirimleri</b>${reports.map(rrow).join("")}</div>` : ""}
        </div>`;
    },

    /* ---------------- kurulum ---------------- */
    init() {
      if (K.err._ready) return;
      K.err._ready = true;
      try {
        window.addEventListener("error", (e) => {
          if (!e) return;
          /* kaynak (img/script) yükleme hataları: error alanı yoksa atla */
          if (!e.message && !e.error) return;
          K.err.capture({ type: "error", message: e.message || (e.error && e.error.message) || "hata", stack: e.error && e.error.stack });
        });
        window.addEventListener("unhandledrejection", (e) => {
          const r = e && e.reason;
          K.err.capture({ type: "promise", message: (r && (r.message || r)) || "promise reddi", stack: r && r.stack });
        });
      } catch (e) {}
    },

    /* boot SONRASI: bus ve telefon navigasyonuna gözlemci olarak bağlan */
    attach() {
      try {
        if (K.bus && K.bus.on) {
          K.bus.on("*", (msg) => { if (msg && msg.evt) K.err.noteEvent(msg.evt, msg.payload); });
          K.bus.on("day:passed", () => K.err.guard(() => K.err.validateState()));
        }
      } catch (e) {}
    }
  };
})(window.K = window.K || {});
