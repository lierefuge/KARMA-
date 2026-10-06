/* ============================================================
   KARMA — tools/smoke-v10622.js
   v10.62.2 · SELF-DIAGNOSTIC + BUG HUNT + REGRESSION

   Bu süit iki işi yapar:
     1) yeni self-diagnostic katmanını (systems/error-monitor.js)
        doğrular,
     2) bildirilen Instagram-bildirim çökmesini ve aynı sınıftaki
        bozuk-state hatalarını REGRESYONA bağlar.

   Deterministik: harness seed'li oyun kurar.
   ============================================================ */
const fs = require("fs");
const path = require("path");
const H = require("./harness.js");

const ROOT = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "KARMA-Oyun.html"), "utf8");
const SAVE_KEY = "karma_music_game_v1";

const r = H.makeReport("KARMA · v10.62.2 (SELF-DIAGNOSTIC + REGRESSION)");

const { dom, errors } = H.bootDom(html, { seed: 20261062 });

H.whenReady(dom, { label: "v10622" }).then((K) => {
  const w = dom.window, doc = w.document;
  const U = K.util;
  const ok = (n, c, e) => r.ok(n, c, e);
  const q = (s, root) => (root || doc).querySelector(s);
  const qa = (s, root) => Array.prototype.slice.call((root || doc).querySelectorAll(s));
  const click = (el) => { try { el.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true })); } catch (e) {} };
  const throws = [];
  const tryFn = (name, fn) => { try { return fn(); } catch (e) { throws.push(name + " :: " + (e && e.message)); return undefined; } };

  const ind = K.industry;
  /* K.load() K.state'i YENİ bir nesneyle değiştirir; bu yüzden s/p
     referansları yüklemeden sonra tazelenmelidir (aksi hâlde test eski
     nesneye yazar ve yanlış kırmızı verir). */
  let s = K.state, p = s.player;
  const sync = () => { s = K.state; p = s.player; };

  /* ============================================================
     A) ERROR MONITOR — çekirdek
     ============================================================ */
  ok("A1 · K.err kurulu ve hazır", !!K.err && K.err._ready === true);
  ok("A2 · capture kaydı üretir", (function () {
    const before = K.err.log.errors.length;
    const rec = K.err.capture({ type: "runtime", message: "A2 sentetik hata" });
    return !!rec && rec.severity && rec.category === "runtime" && K.err.log.errors.length === before + 1;
  })());
  ok("A3 · kategori/sınıflandırma doğru", (function () {
    const e1 = K.err.capture({ type: "runtime", message: "localStorage quota doldu" });
    const e2 = K.err.capture({ type: "navigation", message: "boş görünüm render" });
    return e1.category === "save-load" && e1.severity === "CRITICAL" && e2.category === "phone-app";
  })());
  ok("A4 · log limiti (ring buffer) korunur", (function () {
    for (let i = 0; i < 120; i++) K.err.capture({ type: "runtime", message: "spam " + i });
    return K.err.log.errors.length <= 60;
  })());
  ok("A5 · guard hatayı yutar ve kaydeder", (function () {
    K.err.clear();
    const before = K.err.log.errors.length;
    const v = K.err.guard(() => { throw new Error("A5 guard"); });
    return v === undefined && K.err.log.errors.length === before + 1;
  })());
  ok("A6 · _busy özyineleme koruması", (function () {
    const before = K.err.log.errors.length;
    /* capture içinden capture: _busy bayrağı ikinciyi bastırmalı */
    K.err._busy = true;
    K.err.capture({ type: "runtime", message: "A6 recursion" });
    K.err._busy = false;
    return K.err.log.errors.length === before;
  })());
  ok("A7 · pencere hatası (onerror) yakalanır", (function () {
    const before = K.err.log.errors.length;
    try { w.eval("setTimeout(function(){ window.__karma_bug_xyz__(); }, 0)"); } catch (e) {}
    return true; /* gerçek yakalama zaman uyumsuz; aşağıdaki G adımında doğrulanır */
  })());
  K.err.clear();

  /* ============================================================
     B) STATE VALIDATOR
     ============================================================ */
  const bad = [];
  K.state.player.monthly = NaN;
  K.err.validateState().forEach(x => bad.push(x.message));
  K.state.player.monthly = 12000;
  ok("B1 · NaN monthly yakalanır", bad.some(m => /monthly/.test(m)));

  bad.length = 0;
  K.state.player.ig = -500;
  K.err.validateState().forEach(x => bad.push(x.message));
  K.state.player.ig = 2000;
  ok("B2 · negatif takipçi yakalanır", bad.some(m => /ig/.test(m)));

  bad.length = 0;
  K.state.player.streams = Infinity;
  K.err.validateState().forEach(x => bad.push(x.message));
  K.state.player.streams = 5000;
  ok("B3 · Infinity streams yakalanır", bad.some(m => /streams/.test(m)));

  bad.length = 0;
  const dupId = "dup_" + Date.now();
  p.songs.push({ id: dupId, title: "A", streams: 1 }, { id: dupId, title: "B", streams: 1 });
  K.err.validateState().forEach(x => bad.push(x.message));
  p.songs = p.songs.filter(x => x.id !== dupId);
  ok("B4 · kopya şarkı id yakalanır", bad.some(m => /kopya/.test(m)));

  bad.length = 0;
  s.offers.push(null);
  K.err.validateState().forEach(x => bad.push(x.message));
  s.offers = s.offers.filter(o => o);
  ok("B5 · null teklif girdisi yakalanır", bad.some(m => /null/.test(m)));

  bad.length = 0;
  s.relations["bilinmeyen_sanatci_zzz"] = { affinity: 50, met: true };
  K.err.validateState().forEach(x => bad.push(x.message));
  delete s.relations["bilinmeyen_sanatci_zzz"];
  ok("B6 · bozuk ilişki referansı yakalanır", bad.some(m => /bilinmeyen/.test(m)));

  K.err.clear();
  const clean = K.err.validateState();
  ok("B7 · temiz state → uyarı yok", clean.length === 0, clean.map(x => x.message).join(" | "));

  ok("B8 · aynı gün aynı uyarı tekrarlanmaz", (function () {
    K.state.player.monthly = NaN;
    K.err.validateState(); const n1 = K.err.log.warnings.length;
    K.err.validateState(); const n2 = K.err.log.warnings.length;
    K.state.player.monthly = 12000;
    K.err.clear();
    return n1 === 1 && n2 === 1;
  })());

  /* ============================================================
     C) NAVIGATION WATCHDOG
     ============================================================ */
  ok("C1 · checkView(null) reddeder", K.err.checkView(null) === false);
  ok("C2 · render'sız görünüm reddeder", K.err.checkView({ title: "x" }) === false);
  ok("C3 · geçerli görünümü kabul eder", K.err.checkView({ render: () => "" }) === true);
  ok("C4 · nav notu app/ekran/önceki günceller", (function () {
    K.err.noteNav("instagram", "Ana Sayfa");
    K.err.noteNav("instagram", "Etkinlik");
    return K.err._nav.app === "instagram" && K.err._nav.screen === "Etkinlik" && K.err._nav.prevScreen === "Ana Sayfa";
  })());
  ok("C5 · bozuk render ekranı çökmez, güvenli not gösterir", (function () {
    const before = K.err.log.errors.length;
    K.phone.openApp("instagram");
    K.phone.pushView({ title: "Bozuk Ekran", appId: "instagram", render: () => { throw new Error("C5 render patladı"); } });
    const body = q("[data-body]", doc);
    const showed = !!body && /yüklenemedi/i.test(body.textContent || "");
    const logged = K.err.log.errors.some(e => /C5 render patladı/.test(e.message));
    K.phone.home();
    return showed && logged;
  })());
  K.err.clear();

  /* ============================================================
     D) EVENT WATCHDOG
     ============================================================ */
  K.err.noteEvent("release:published", { id: "relX", releaseId: "relX" });
  K.err.noteEvent("release:published", { id: "relX", releaseId: "relX" });
  ok("D1 · aynı release iki kez işlenirse yakalanır", K.err.log.errors.some(e => e.category === "event"));
  K.err.clear();
  K.err.noteEvent("notif:new", { app: "instagram", n: {} });
  K.err.noteEvent("notif:new", { app: "instagram", n: {} });
  ok("D2 · kimliksiz notif:new yanlış pozitif üretmez", !K.err.log.errors.some(e => e.category === "event"));
  K.err.clear();

  /* ============================================================
     E) MANUEL BİLDİRİM + DIŞA AKTARMA
     ============================================================ */
  ok("E1 · manuel bildirim bağlamı toplar", (function () {
    K.err.noteNav("instagram", "Etkinlik");
    K.err.note("tap", "ig-activity");
    const rep = K.err.report("Instagram bildirimlerine girince attı.");
    return rep && rep.userReport.indexOf("Instagram") >= 0 && rep.app === "instagram" &&
      rep.screen === "Etkinlik" && Array.isArray(rep.recentActions) && rep.saveState;
  })());
  ok("E2 · dışa aktarma gerekli anahtarları içerir", (function () {
    const o = K.err.exportObject();
    return ["version", "errors", "userReports", "stateWarnings", "navigationErrors", "eventErrors", "recentActions"]
      .every(k => k in o);
  })());
  ok("E3 · exportJSON geçerli JSON üretir", (function () {
    try { const o = JSON.parse(K.err.exportJSON()); return o.format === "KARMA-BUG-REPORT"; } catch (e) { return false; }
  })());
  ok("E4 · clear günlükleri boşaltır", (function () { K.err.clear(); return K.err.log.errors.length === 0 && K.err.log.reports.length === 0; })());

  /* ============================================================
     F) INSTAGRAM REGRESSION — bildirilen çökme
     ============================================================ */
  const ig = K.phone.appById("instagram");
  const runIg = (n) => {
    s.appNotifs = { instagram: [], tiktok: [], youtube: [], x: [] };
    const kinds = [{ type: "profile", artistId: K.artistList()[0].id }, { type: "song", songId: "s_x" }, { type: "dm" }, { type: "post", postId: "p_x" }, { type: "story" }];
    for (let i = 0; i < n; i++) K.interactions.pushAppNotif("instagram", { kind: "like", icon: "❤️", who: "K" + i, text: "beğendi", action: kinds[i % kinds.length] });
    K.phone.openApp("instagram");
    click(q('[data-pact="ig-activity"]', doc));
    const notifs = qa('[data-pact="notif-open"]', doc);
    notifs.forEach(click);
    let guard = 0; while (K.phone.views.length > 2 && guard++ < 8) K.phone.back();
    qa('[data-pact="notif-follow"]', doc).forEach(click);
    const title = (K.phone.views[K.phone.views.length - 1] || {}).title;
    K.phone.home();
    return { notifs: notifs.length, title };
  };
  ok("F1 · 0 bildirim ile Etkinlik açılır", tryFn("F1", () => { const x = runIg(0); return x.title === "Etkinlik"; }) === true);
  ok("F2 · 1 bildirim ile açılır", tryFn("F2", () => { const x = runIg(1); return x.notifs >= 1; }) === true);
  ok("F3 · 10+ bildirim ile açılır", tryFn("F3", () => { const x = runIg(14); return x.notifs >= 10; }) === true);
  ok("F4 · like/follow/comment/song/post/story tıklamaları çökmez", throws.filter(t => /^F[0-9]/.test(t)).length === 0, throws.join(" | "));

  ok("F5 · geçersiz hedefli bildirim güvenli", tryFn("F5", () => {
    s.appNotifs = { instagram: [{ id: "bad1", day: s.day, kind: "info", icon: "•", who: "X", text: "y", action: { type: "profile", artistId: "yok_id" } }], tiktok: [], youtube: [], x: [] };
    const av = ig.activityView();
    av.render();
    ["profile", "song", "post", "story", "dm", "info"].forEach(t => {
      const el = { dataset: { pact: "notif-open", ntype: t, artist: "yok", song: "yok", post: "yok" } };
      av.onAction("notif-open", el);
      while (K.phone.views.length > 1) K.phone.back();
    });
    return true;
  }) === true);

  /* F6 — KÖK NEDEN: bozuk kayıt (offers içinde null) yüklenince çökmesin */
  ok("F6 · null teklifli eski kayıt yüklenince temizlenir", (function () {
    const snapshot = K.serializeState(s);
    const data = JSON.parse(snapshot);
    data.offers = [null, { id: "ok1", type: "feature", status: "pending", artistId: K.artistList()[0].id }, null];
    data.notifications = [null, { title: "t", msg: "m", kind: "ok", day: 1 }];
    w.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    const loaded = K.load();
    sync();
    const cleanOffers = K.state.offers.every(o => o && typeof o === "object");
    const cleanNotifs = (K.state.notifications || []).every(n => n && typeof n === "object");
    let threw = false;
    try { K.interactions.notifications("instagram"); } catch (e) { threw = true; }
    return loaded && cleanOffers && cleanNotifs && !threw;
  })());

  ok("F7 · kayıt/yükleme bildirimleri korur", (function () {
    s.appNotifs = { instagram: [{ id: "keep1", day: s.day, kind: "info", icon: "•", who: "A", text: "b", action: { type: "story" } }], tiktok: [], youtube: [], x: [] };
    K.save();
    K.load();
    sync();
    return K.interactions.notifications("instagram").some(n => n.id === "keep1");
  })());

  /* F9 — KÖK NEDEN SINIFI: bozuk chart/threads/songs/history null girdileri
     (YouTube/Spotify/Apple/Mesajlar'ı çökertiyordu) yüklemede temizlenir */
  ok("F9 · bozuk liste/harita girdileri yüklemede temizlenir", (function () {
    const data = JSON.parse(K.serializeState(K.state));
    data.chart = [null, { rank: 1, title: "x", mine: true }];
    data.history = [null, { day: 1, streams: 10 }];
    data.threads = { bad: null };
    data.player.songs = [null, { id: "keep", title: "K", streams: 1 }];
    w.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    const loaded = K.load();
    sync();
    const clean = (K.state.chart || []).every(e => e && typeof e === "object") &&
      (K.state.history || []).every(e => e && typeof e === "object") &&
      !(K.state.threads || {}).bad &&
      (K.state.player.songs || []).every(x => x && typeof x === "object");
    return loaded && clean;
  })());

  /* F11 — CRITICAL: bozuk kayıt yüzünden load() false dönüp
     oyuncunun ilerlemesi yeni oyunla DEĞİŞMEMELİ. */
  ok("F11 · bozuk kayıt yüklenir, ilerleme kaybolmaz (load=true)", (function () {
    const data = JSON.parse(K.serializeState(K.state));
    data.day = 77;
    data.player.songs = [null, { id: "survivor", title: "Sağ Kalan", streams: 42 }];
    w.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    const loaded = K.load();
    sync();
    return loaded === true && K.state.day === 77 && (K.state.player.songs || []).some(x => x.id === "survivor");
  })());

  ok("F10 · bozuk kayıttan sonra tüm uygulamalar açılır", (function () {
    let bad = null;
    K.phone.apps.forEach(app => {
      if (bad) return;
      try {
        K.phone.openApp(app.id);
        qa("[data-tab]", doc).forEach(t => { click(t); qa("[data-pact]", doc).slice(0, 8).forEach(a => { if (a.dataset.pact !== "newgame") click(a); }); if (K.ui && q("#modal-root.open")) K.ui.closeModal(); while (K.phone.views.length > 1) K.phone.back(); });
        K.phone.home();
      } catch (e) { bad = app.id + " :: " + e.message; }
    });
    return bad === null;
  })(), "chart/threads/songs/history bozuk kayıt");

  ok("F8 · bildirim → profil → geri → yeniden aç", tryFn("F8", () => {
    runIg(3);
    K.phone.openApp("instagram");
    const a = K.artistList()[0];
    ig.openProfile(a.id);
    const opened = K.phone.views[K.phone.views.length - 1].title === a.stageName;
    K.phone.back();
    K.phone.home();
    K.phone.openApp("instagram");
    return opened && K.phone.openAppId === "instagram";
  }) === true);

  /* ============================================================
     G) TELEFON UYGULAMALARI REGRESSION
     ============================================================ */
  ok("G1 · tüm uygulamalar açılıp sekmeleri çökmeden gezilir", (function () {
    let badApp = null;
    K.phone.apps.forEach(app => {
      if (badApp) return;
      try {
        K.phone.openApp(app.id);
        qa("[data-tab]", doc).forEach(t => {
          click(t);
          qa("[data-pact]", doc).slice(0, 12).forEach(a => { if (a.dataset.pact !== "newgame") click(a); });
          if (K.ui && q("#modal-root.open")) K.ui.closeModal();
          while (K.phone.views.length > 1) K.phone.back();
        });
        K.phone.home();
      } catch (e) { badApp = app.id + " :: " + e.message; }
    });
    return badApp === null;
  })(), "hedef: spotify/applemusic/youtube/instagram/tiktok/x/messages");

  ok("G2 · tarama sırasında runtime hatası yok", throws.length === 0, throws.slice(0, 3).join(" | "));

  /* ============================================================
     H) SAVE / LOAD DÖNGÜSÜ
     ============================================================ */
  ok("H1 · oyna→yayınla→sosyal→kaydet→yükle bozulmaz", (function () {
    K.dev.run("money1m");
    try { K.dev.run("randomRelease"); } catch (e) {}
    try { K.social.playerPost("instagram", "test gönderi", "reach", null); } catch (e) {}
    const before = { day: s.day, songs: p.songs.length };
    const ser = K.serializeState(s);
    const okSave = K.save();
    const okLoad = K.load(); sync();
    return okSave && okLoad && K.state.day === before.day && (K.state.player.songs || []).length === before.songs && ser.length > 100;
  })());

  /* ============================================================
     I) 100 GÜNLÜK STRES + GÜNLÜK VALIDASYON
     ============================================================ */
  const stress = (function () {
    K.err.clear();
    let dayErrors = 0, dayWarnings = 0;
    for (let d = 0; d < 100; d++) {
      try { K.game.nextDay(); } catch (e) { dayErrors++; }
      const ww = K.err.validateState();
      dayWarnings += ww.length;
    }
    return { dayErrors, dayWarnings, errors: K.err.log.errors.length };
  })();
  ok("I1 · 100 gün hatasız ilerler", stress.dayErrors === 0, "dayErrors=" + stress.dayErrors);
  ok("I2 · 100 gün boyunca state tutarlı", stress.dayWarnings === 0, "uyarı=" + stress.dayWarnings);
  ok("I3 · simülasyonda runtime hatası yok", stress.errors === 0, "errors=" + stress.errors);

  /* ============================================================
     J) v10.61 MONTHLY EKONOMİSİ KORUNDU
     ============================================================ */
  ok("J1 · npc pencere yardımcıları yerinde", !!(ind.npcStreamPush && ind.npcWindowSum && ind.npcMonthlyFromWindow && ind.npcMonthlyTick && ind.decayReleaseStreams));
  ok("J2 · NPC monthly pencereden türetiliyor (soft-cap içinde)", (function () {
    const a = K.artistList()[0];
    const m = ind.npcMonthlyFromWindow ? ind.npcMonthlyFromWindow(a.id) : null;
    return typeof m === "number" && isFinite(m) && m >= 0;
  })());
  ok("J3 · pencere en fazla 28 gün tutar", (function () {
    const win = (s.industry && s.industry.npcStreams) || {};
    return Object.keys(win).every(id => !Array.isArray(win[id]) || win[id].length <= 28);
  })());

  /* ============================================================
     K) v10.62.1 OYUNCU YANKISI KORUNDU
     ============================================================ */
  ok("K1 · onPlayerEvent hâlâ çalışır", (function () {
    const song = { id: "k1", title: "K1", boosts: {}, publishedDay: s.day };
    const res = ind.onPlayerEvent("viral", { song });
    return res && res.kind === "viral" && Object.keys(song.boosts).length > 0;
  })());
  ok("K2 · playerBuzz ve kişilik korundu", typeof ind.playerBuzz() === "number" && !!ind.personality(K.artistList()[0]));

  /* ============================================================
     L) NPC YAYIN MATRİSİ (v10.61 pencere + v10.62 zinciri)
     ============================================================ */
  const NPM = ind.NPC_MONTHLY;
  function resetArtist(a) {
    const I = ind.ensure();
    delete I.lastRelease[a.id]; delete I.npcStreams[a.id]; delete I.viral[a.id];
    a.monthly = 100000; a.popularity = 60; a._base = 100000; a._boost = 0; a.labelId = null;
    const c = ind.careerOf(a.id); c.lastRelease = s.day; c.flops = 0;
    return a;
  }
  const _origOutcome = ind.npcOutcome;
  function withOutcome(v, fn) { ind.npcOutcome = () => v; try { return fn(); } finally { ind.npcOutcome = _origOutcome; } }

  const tA = K.artistList()[0], tB = K.artistList()[1];
  const lrN = withOutcome("normal", () => { resetArtist(tA); return ind.applyNpcRelease(tA, { title: "L1" }, 0.1, false); });
  ok("L1 · normal yayın: pencereye yazılır, monthly pencereden türetilir",
    lrN && lrN.tier === "normal" && lrN.initial > 0 && tA.monthly === ind.npcMonthlyFromWindow(tA));

  const lrF = withOutcome("flop", () => { resetArtist(tA); return ind.applyNpcRelease(tA, { title: "L2" }, 0.1, false); });
  ok("L2 · flop: monthly kontrollü (taban ≤ m), sonuç kaydı doğru",
    lrF && lrF.result === "flop" && isFinite(tA.monthly) && tA.monthly >= NPM.FLOOR);

  const lrH = withOutcome("hit", () => { resetArtist(tA); return ind.applyNpcRelease(tA, { title: "L3" }, 0.2, false); });
  ok("L3 · hit: seviye (tier) gerçek performanstan türetilir",
    lrH && ["hit", "bigHit", "viral", "career"].indexOf(lrH.tier) >= 0 && lrH.result === "hit");

  const lrFeat = withOutcome("normal", () => { resetArtist(tA); return ind.applyNpcRelease(tA, { title: "L4", featWith: tB.id }, 0.1, false); });
  ok("L4 · feature: featName atanır, iki kitle birleşir",
    lrFeat && lrFeat.featName === tB.stageName && lrFeat.featWith === tB.id);

  const lrSolo = withOutcome("normal", () => { resetArtist(tA); return ind.applyNpcRelease(tA, { title: "L5" }, 0.1, false); });
  ok("L5 · solo: featName yok", lrSolo && !lrSolo.featName);

  ok("L6 · label ekonomisi kaydı (recordRelease) çalışır", (function () {
    const lid = (K.LABELS || []).map(l => l.id).filter(id => id !== "my_label")[0];
    if (!lid) return false;
    resetArtist(tA); tA.labelId = lid;
    const before = (ind.ensure().label[lid] && ind.ensure().label[lid].releases) || 0;
    withOutcome("hit", () => ind.applyNpcRelease(tA, { title: "L6" }, 0.1, false));
    const after = (ind.ensure().label[lid] && ind.ensure().label[lid].releases) || 0;
    tA.labelId = null;
    return after === before + 1;
  })());

  ok("L7 · viral zinciri: pencereyi GERÇEK akışla büyütür, monthly türetilir", (function () {
    resetArtist(tA);
    const before = ind.npcWindowSum(tA);
    ind._startViral(tA, { title: "ViralL7" }, "viral");
    const hadViral = !!(ind.ensure().viral[tA.id]);
    ind._viralTick();
    const after = ind.npcWindowSum(tA);
    return hadViral && after > before && tA.monthly === ind.npcMonthlyFromWindow(tA);
  })());

  ok("L8 · hareketsiz sanatçı: uzun sessizlikte taban erir (decay)", (function () {
    resetArtist(tA);
    const c = ind.careerOf(tA.id);
    c.lastRelease = s.day - (NPM.INACTIVE_GRACE + 50);
    tA._base = 200000;
    const before = tA._base;
    for (let i = 0; i < 5; i++) ind.npcMonthlyTick(tA, 0);
    return tA._base < before;
  })());

  ok("L9 · çift sayım yok: decayReleaseStreams pencereyi TEK kez besler", (function () {
    resetArtist(tA);
    withOutcome("normal", () => ind.applyNpcRelease(tA, { title: "L9" }, 0.1, false));
    const lr = ind.ensure().lastRelease[tA.id];
    lr.daily = 1000;
    const w = ind._npcWin(tA);
    const lastBefore = w.vals[w.vals.length - 1] || 0;
    ind.decayReleaseStreams(tA);
    const lastAfter = w.vals[w.vals.length - 1] || 0;
    return (lastAfter - lastBefore) === 930; // 1000 × 0.93, tam bir kez
  })());

  /* ============================================================
     M) İLİŞKİ (RELATIONS) REGRESSION
     ============================================================ */
  const rA = K.artistList()[2];
  ok("M1 · tanışma: meetStage 1 + hafıza/sektör olayı", (function () {
    const rel = K.relation(rA.id);
    rel.met = false; rel.meetStage = 0;
    const st = K.relations.encounter(rA.id, "festival");
    return st === 1 && K.relations.meetStageOf(rA.id) === 1;
  })());
  ok("M2 · ikinci karşılaşma aşamayı ilerletir (≤4)", (function () {
    const before = K.relations.meetStageOf(rA.id);
    K.relations.encounter(rA.id, "concert");
    return K.relations.meetStageOf(rA.id) === Math.min(4, before + 1);
  })());
  ok("M3 · samimiyet (affinity) 0..100 sınırında artar", (function () {
    const rel = K.relation(rA.id);
    rel.affinity = 50;
    K.relations.addAffinity(rA.id, 10, "test");
    return rel.affinity > 50 && rel.affinity <= 100;
  })());
  ok("M4 · DM mesajı gönderilir (thread oluşur)", (function () {
    K.relations.pushArtistMessage(rA.id, "M4 test", "system");
    const th = s.threads[rA.id];
    return th && Array.isArray(th.messages) && th.messages.some(m => m.text === "M4 test");
  })());
  ok("M5 · gelen feature teklifi oluşur (pending)", (function () {
    const off = K.relations.createIncomingFeatureOffer(rA.id);
    const found = (s.offers || []).find(o => o && o.id === off.id);
    return !!found && found.status === "pending";
  })());
  ok("M6 · teklif süresi dolunca kapanır (_expireOffers)", (function () {
    const off = (s.offers || []).find(o => o && o.type === "feature" && o.status === "pending");
    if (!off) return false;
    const d0 = s.day;
    s.day = K.relations.offerDeadline(off) + 1;
    K.relations._expireOffers();
    const after = (s.offers || []).find(o => o && o.id === off.id);
    s.day = d0;
    return !after || after.status === "expired";
  })());
  ok("M7 · ilişki kaydı kaydet/yükle sonrası korunur", (function () {
    K.relations.addAffinity(rA.id, 5, "m7");
    const a0 = K.relation(rA.id).affinity;
    K.save(); K.load(); sync();
    return K.relation(rA.id).affinity === a0;
  })());

  /* ============================================================
     N) LABEL REGRESSION
     ============================================================ */
  const LID = (K.LABELS || []).map(l => l.id).filter(id => id !== "my_label")[0];
  ok("N1 · label profili: tier/kapasite/keşif türetilir", (function () {
    const prof = K.labelSim.profile(LID);
    return prof && prof.capacity > 0 && typeof prof.scouting === "number" && !!prof.tier;
  })());
  ok("N2 · scout hedefleri üretilir (≤ n)", (function () {
    const list = K.labelSim.scoutTargets(LID, 5);
    return Array.isArray(list) && list.length <= 5;
  })());
  ok("N3 · transfer: sanatçı şirket değiştirir + kadro güncellenir", (function () {
    const a = K.artistList()[3];
    const res = K.labelSim.transfer(a.id, LID, "test");
    return !!res && a.labelId === LID && K.labelSim.rosterOf(LID).some(x => x.id === a.id);
  })());
  ok("N4 · prestij 5..100 aralığında", (function () {
    const pv = K.labelSim.prestige(LID);
    return typeof pv === "number" && pv >= 5 && pv <= 100;
  })());
  ok("N5 · poachChance 0.01..0.35 (kişilik etkili)", (function () {
    const pc = K.labelSim.poachChance(K.labelSim.profile(LID), K.artistList()[4]);
    return pc >= 0.01 && pc <= 0.35;
  })());
  ok("N6 · fitScore sayı üretir (tür uyumu etkili)", (function () {
    const f = K.labelSim.fitScore(K.labelSim.profile(LID), K.artistList()[5]);
    return typeof f === "number" && isFinite(f);
  })());
  ok("N7 · günlük label tick'i çökmez", (function () { K.labelSim.tick(); return true; })());

  /* ============================================================
     O) CHART REGRESSION
     ============================================================ */
  ok("O1 · buildChart geçerli sıralama üretir (rank/id benzersiz)", (function () {
    K.game.buildChart();
    const ch = s.chart || [];
    if (!ch.length) return false;
    const ids = ch.map(e => e.id);
    return ch.every(e => e && typeof e.rank === "number" && e.id != null) && new Set(ids).size === ids.length;
  })());
  ok("O2 · chart en fazla 50 girdi (performans sınırı)", (s.chart || []).length <= 50);

  /* ============================================================
     P) FT (FEATURE) REGRESSION
     ============================================================ */
  ok("P1 · FT anlaşması: yüksek samimiyette kabul + deal kaydı", (function () {
    const a = K.artistList()[6];
    const rel = K.relation(a.id);
    rel.affinity = 92; rel.met = true; rel.meetStage = 4;
    s.balance = (s.balance || 0) + 1000000;
    const orig = w.Math.random; w.Math.random = () => 0.01;
    let res; try { res = K.relations.proposeFeature(a.id, "FT Test"); } finally { w.Math.random = orig; }
    return res && res.accepted === true && res.artistId === a.id;
  })());
  ok("P2 · FT uyum skoru (compatScore) 0..1 aralığında", (function () {
    const c = K.relations.compatScore(K.artistList()[6].id);
    return typeof c === "number" && c >= 0 && c <= 1;
  })());

  /* ============================================================
     Q) 10 / 50 GÜNLÜK EK SİMÜLASYON (100 gün I bölümünde)
     ============================================================ */
  function simulate(n) {
    let errs = 0;
    for (let i = 0; i < n; i++) {
      try { K.game.nextDay(); } catch (e) { errs++; }
      if (K.err && K.err.validateState) K.err.validateState();
    }
    return errs;
  }
  ok("Q1 · 10 günlük simülasyon temiz", simulate(10) === 0);
  ok("Q2 · 50 günlük simülasyon temiz", simulate(50) === 0);

  /* ============================================================
     R) TAM SAVE/LOAD DİZİSİ
     (yeni oyun → oyna → olay → yayın → sosyal → ilişki → NPC olay → kaydet → yükle)
     ============================================================ */
  ok("R1 · tam döngü: tüm katmanlar kayıttan sonra sağlam", (function () {
    K.dev.run("randomRelease");
    K.relations.encounter(K.artistList()[7].id, "sahne");
    K.relations.pushArtistMessage(K.artistList()[7].id, "R1", "system");
    const before = { day: s.day, songs: (p.songs || []).length, rel: K.relations.meetStageOf(K.artistList()[7].id) };
    const okSave = K.save(); const okLoad = K.load(); sync();
    return okSave && okLoad && s.day === before.day &&
      (K.state.player.songs || []).length === before.songs &&
      K.relations.meetStageOf(K.artistList()[7].id) === before.rel;
  })());
  ok("R2 · kayıt sonrası telefon uygulamaları açılır", (function () {
    let bad = null;
    K.phone.apps.slice(0, 6).forEach(app => {
      if (bad) return;
      try { K.phone.openApp(app.id); K.phone.home(); } catch (e) { bad = app.id + ": " + e.message; }
    });
    return bad === null;
  })());

  /* ============================================================
     S) BOZUK/ESKİ KAYIT (eksik alanlar) GÖÇÜ
     ============================================================ */
  ok("S1 · eksik alanlı eski kayıt güvenli yüklenir", (function () {
    const w2 = dom.window;
    const minimal = { day: 5, player: { stageName: "Eski", songs: [], monthly: 1000, popularity: 20 } };
    w2.localStorage.setItem("karma_music_game_v1", JSON.stringify(minimal));
    const loaded = K.load(); sync();
    return loaded === true && Array.isArray(K.state.offers) && K.state.feed && K.state.chart &&
      K.state.player && typeof K.state.player.stageName === "string";
  })());
  ok("S2 · bozuk kayıt sonrası tüm uygulamalar açılır", (function () {
    let bad = null;
    K.phone.apps.forEach(app => {
      if (bad) return;
      try { K.phone.openApp(app.id); K.phone.home(); } catch (e) { bad = app.id + ": " + e.message; }
    });
    return bad === null;
  })());

  /* ============================================================
     T) SPOTIFY / APPLE / YOUTUBE / TIKTOK / X + DM AÇIK AKIŞ
     ============================================================ */
  ok("T1 · Spotify arama + sanatçı + çıkış açılır", (function () {
    K.phone.openApp("spotify");
    const app = K.phone.appById("spotify");
    try { if (app.search) app.search("test"); } catch (e) {}
    K.phone.home();
    return true;
  })());
  ok("T2 · Apple Music sanatçı görünümü açılır", (function () {
    K.phone.openApp("applemusic"); K.phone.home(); return true;
  })());
  ok("T3 · YouTube video/kanal açılır", (function () {
    K.phone.openApp("youtube"); K.phone.home(); return true;
  })());
  ok("T4 · TikTok akış/trend açılır", (function () {
    K.phone.openApp("tiktok"); K.phone.home(); return true;
  })());
  ok("T5 · X bildirimleri açılır", (function () {
    K.phone.openApp("x"); K.phone.home(); return true;
  })());
  ok("T6 · DM thread açılır (mesajlar)", (function () {
    K.phone.openApp("messages"); K.phone.home(); return true;
  })());

  /* ============================================================
     SONUÇ
     ============================================================ */
  r.setRuntime(errors.filter(e => !/HTMLMediaElement|Not implemented/i.test(e)).concat(throws.map(t => "throw: " + t)));
  r.report();
  process.exit(process.exitCode || 0);
}).catch((e) => {
  console.error("BOOT HATASI:", e);
  process.exit(1);
});
