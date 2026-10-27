/* ============================================================
   KARMA — tools/smoke-v1064.js
   v10.64 · STÜDYO 2.0

   Dört yeni yetenek:
     A) öneri → sihirbaz ÖN DOLUMU (tür / bütçe / pazarlama)
     B) yayın hattı kontrolü: iptal (kısmi iade) · hızlandır · ad düzenle
     C) üretim takvimi (7 gün · çıkış işaretleri · çakışma uyarısı)
     D) parça detayı (kalite kırılımı · platform dağılımı · dinle)

   Deterministik: harness seed'li oyun kurar, ağ kapalıdır.
   ============================================================ */
const fs = require("fs");
const path = require("path");
const H = require("./harness.js");

const ROOT = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "KARMA-Oyun.html"), "utf8");

const r = H.makeReport("KARMA · v10.64 (STÜDYO 2.0)");

const { dom, errors } = H.bootDom(html, { seed: 20261064 });

H.whenReady(dom, { label: "v1064" }).then((K) => {
  const w = dom.window, doc = w.document;
  const ok = (n, c, e) => r.ok(n, c, e);
  const q = (s, root) => (root || doc).querySelector(s);
  const qa = (s, root) => Array.prototype.slice.call((root || doc).querySelectorAll(s));
  const click = (el) => {
    if (!el) return false;
    try { el.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true })); }
    catch (e) { return false; }
    return true;
  };
  const closeModal = () => { if (K.ui && q("#modal-root.open")) K.ui.closeModal(); };
  /* DİKKAT: sekme zaten aktifken tıklamak render TETİKLEMEZ; state'i
     değiştirdikten sonra taze DOM için setTab kullanılmalı. */
  const toStudio = () => { K.careerUI.setTab("studio"); };

  const throws = [];
  const tryFn = (name, fn) => { try { return fn(); } catch (e) { throws.push(name + " :: " + (e && e.message)); return undefined; } };

  const s = K.state;
  const day = s.day;

  /* yayın hattı + kütüphane kur */
  const mkRel = (id, extra) => Object.assign({
    id, title: "Proje " + id, genre: "trap", type: "single",
    tracks: [{ name: "Parça " + id, quality: 70 }],
    startDay: day - 2, waitDays: 12, cost: 20000, grossCost: 20000,
    budget: 12000, marketing: 3000, progress: 0.17, stage: "prep",
    coverSeed: "cv" + id, regionReach: 1, langFit: 1, releaseDayFit: 1
  }, extra || {});

  K.state.player.releases = [mkRel("r1"), mkRel("r2", { stage: "editorial", progress: 0.75, viaLabel: true })];
  K.state.player.songs = [{
    id: "s1", title: "Beton Çiçeği", genre: "trap", quality: 78,
    beatQuality: 72, vocalQuality: 80, mixQuality: 66, hookStrength: 74, lyricScore: 69,
    streams: 250000, lastDaily: 3200, spotifyStreams: 150000, appleStreams: 60000,
    youtubeViews: 40000, revenue: 12000, publishedDay: day - 20,
    chartRank: 12, chartPeak: 12, decayRate: 1.4, coverSeed: "cv9",
    distributorName: "KARMA Distro", isrc: "TRKAR2600001"
  }];
  K.state.balance = 100000;
  toStudio();

  /* ============================================================
     A) ÖNERİ → SİHİRBAZ ÖN DOLUMU
     ============================================================ */
  ok("A1 · öneri CTA'ları preset taşıyor",
    qa('.gh-advice [data-preset]').length >= 1,
    qa('.gh-advice [data-preset]').length + " CTA");

  ok("A2 · studioPreset('trend') pazarlamayı yükseltiyor", (function () {
    const base = K.careerUI.studioPreset("all");
    const trend = K.careerUI.studioPreset("trend");
    return trend.marketing > base.marketing && trend.genre === K.state.player.genre;
  })());

  ok("A3 · sihirbaz ön dolumlu açılıyor (tür + bütçe)", (function () {
    K.careerUI.openStudioModal({ genre: "pop", budget: 15000, marketing: 7000 });
    const st = K.careerUI._studio;
    const okAll = st.genre === "pop" && st.budget === 15000 && st.marketing === 7000;
    closeModal();
    return okAll;
  })());

  ok("A4 · preset'siz açılışta oyuncunun türü kullanılıyor", (function () {
    K.careerUI.openStudioModal();
    const g = K.careerUI._studio.genre === K.state.player.genre;
    closeModal();
    return g;
  })());

  ok("A5 · öneri kartına tıklamak sihirbazı preset ile açıyor", (function () {
    const btn = q('.gh-advice [data-preset="trend"]') || q('.gh-advice [data-preset]');
    if (!btn) return false;
    const preset = btn.dataset.preset;
    click(btn);
    const st = K.careerUI._studio;
    const expected = K.careerUI.studioPreset(preset);
    const good = !!st && st.marketing === expected.marketing && !!q(".studio-app");
    closeModal();
    toStudio();
    return good;
  })(), "preset = " + ((q('.gh-advice [data-preset]') || {}).dataset || {}).preset);

  /* ============================================================
     B) YAYIN HATTI KONTROLÜ
     ============================================================ */
  ok("B1 · iade oranı ilerledikçe düşüyor", (function () {
    const early = K.career.cancelRefundRate({ progress: 0 });
    const mid = K.career.cancelRefundRate({ progress: 0.5 });
    const late = K.career.cancelRefundRate({ progress: 0.95 });
    return early > mid && mid > late && early <= 0.55 && late >= 0.15;
  })(), "0 → " + K.career.cancelRefundRate({ progress: 0 }) + " · 0.95 → " + K.career.cancelRefundRate({ progress: 0.95 }));

  ok("B2 · hızlandırma kalan süreyi kısaltıyor ve ücret alıyor", (function () {
    const before = K.career.releaseById("r1");
    const beforeWait = before.waitDays, beforeBal = K.state.balance;
    const fee = K.career.rushFee(before);
    const res = K.career.rushRelease("r1");
    const after = K.career.releaseById("r1");
    return res.ok && after.waitDays < beforeWait && K.state.balance === beforeBal - fee
      && res.days > 0 && res.fee === fee;
  })());

  ok("B3 · hızlandırma kaliteyi düşürüyor (bedava hız yok)", (function () {
    const t = K.career.releaseById("r1").tracks[0];
    return t.quality === 67;   /* 70 − 3 */
  })(), "kalite = " + (K.career.releaseById("r1").tracks[0] || {}).quality);

  ok("B4 · aynı proje iki kez hızlandırılamaz", (function () {
    const r2 = K.career.rushRelease("r1");
    return r2.ok === false && r2.reason === "already";
  })());

  ok("B5 · editoryal aşamada hızlandırma reddediliyor", (function () {
    const r2 = K.career.rushRelease("r2");
    return r2.ok === false && r2.reason === "too-late";
  })());

  ok("B6 · editoryal aşamada ad değiştirilemiyor", (function () {
    const r2 = K.career.renameRelease("r2", "Yeni Ad");
    return r2.ok === false && r2.reason === "locked";
  })());

  ok("B7 · hazırlık aşamasında ad değişiyor", (function () {
    const res = K.career.renameRelease("r1", "Karanlık Oda");
    return res.ok && K.career.releaseById("r1").title === "Karanlık Oda";
  })());

  ok("B8 · çok kısa ad reddediliyor", (function () {
    const res = K.career.renameRelease("r1", "A");
    return res.ok === false && res.reason === "short";
  })());

  ok("B9 · iptal projeyi hattan çıkarıp kısmi iade yapıyor", (function () {
    const rel = K.career.releaseById("r1");
    const rate = K.career.cancelRefundRate(rel);
    const beforeBal = K.state.balance;
    const beforeCount = K.state.player.releases.length;
    const res = K.career.cancelRelease("r1");
    return res.ok && Math.abs(res.refund - Math.round(rel.cost * rate)) <= 1
      && K.state.balance === beforeBal + res.refund
      && K.state.player.releases.length === beforeCount - 1
      && !K.career.releaseById("r1");
  })());

  ok("B10 · şirket yayınını iptal etmek nakit iade etmiyor", (function () {
    const beforeBal = K.state.balance;
    const res = K.career.cancelRelease("r2");
    return res.ok && res.refund === 0 && K.state.balance === beforeBal;
  })());

  ok("B11 · olmayan proje güvenli", (function () {
    return K.career.cancelRelease("yok").ok === false
      && K.career.rushRelease("yok").ok === false
      && K.career.renameRelease("yok", "abc").ok === false;
  })());

  /* ============================================================
     C) ÜRETİM TAKVİMİ
     ============================================================ */
  {
    K.state.player.releases = [
      mkRel("c1", { startDay: day - 3, waitDays: 8 }),   /* 5 gün sonra */
      mkRel("c2", { startDay: day - 3, waitDays: 8 })    /* aynı gün → çakışma */
    ];
    toStudio();
    ok("C1 · takvim 7 gün gösteriyor", qa(".gh-cal-day").length === 7, qa(".gh-cal-day").length + " gün");
    ok("C2 · bugün işaretli", !!q(".gh-cal-day.today") && qa(".gh-cal-day")[0].classList.contains("today"));
    ok("C3 · çıkış günü işaretleniyor", (function () {
      const cells = qa(".gh-cal-day");
      return cells.some(c => /çıkış/.test(c.textContent) && c.querySelectorAll(".gh-cal-marks i").length >= 2);
    })());
    ok("C4 · çakışma uyarısı çıkıyor", /Çakışma/.test((q(".gh-cal") || {}).textContent || ""));
    ok("C5 · takvim başlık/ay etiketleri var", qa(".gh-cal-dow").length === 7 && qa(".gh-cal-dom").length === 7);

    /* tek çıkış varsa çakışma uyarısı kaybolmalı */
    K.state.player.releases = [mkRel("c3", { startDay: day - 3, waitDays: 8 })];
    toStudio();
    ok("C6 · tek çıkışta uyarı yok", !/Çakışma/.test((q(".gh-cal") || {}).textContent || ""));
  }

  /* ============================================================
     D) PARÇA DETAYI
     ============================================================ */
  ok("D1 · kütüphanede detay düğmesi var", !!q('.gh-track [data-act="song-detail"]'));

  ok("D2 · detay modalı açılıyor ve kalite kırılımı gösteriyor", (function () {
    const btn = q('.gh-track [data-act="song-detail"]');
    click(btn);
    const openNow = !!q("#modal-root.open") && !!q(".gh-detail");
    const txt = (q(".gh-detail") || {}).textContent || "";
    const good = openNow && /Genel kalite/.test(txt) && /Spotify/.test(txt) && /Zirve/.test(txt);
    closeModal();
    return good;
  })());

  ok("D3 · detaydaki 'Dinle' oynatıcıyı açıyor", (function () {
    click(q('.gh-track [data-act="song-detail"]'));
    const before = (K.phone.views || []).length;
    const playBtn = qa("#modal-root button").find(b => /Dinle/.test(b.textContent || ""));
    if (!playBtn) { closeModal(); return false; }
    click(playBtn);
    const after = (K.phone.views || []).length;
    closeModal();
    while (K.phone.views && K.phone.views.length > 1) K.phone.back();
    if (K.phone.home) K.phone.home();
    toStudio();
    return after > before;
  })());

  ok("D4 · olmayan parça çökertmiyor", (function () {
    const res = tryFn("D4", () => K.careerUI.openSongDetail("yok-boyle"));
    closeModal();
    return res === null || res === undefined;
  })());

  /* ============================================================
     E) SEKME DÜĞMELERİ — bilinmeyen eylem yok
     ============================================================ */
  {
    K.state.player.releases = [mkRel("e1"), mkRel("e2", { stage: "editorial", progress: 0.8 })];
    toStudio();
    const KNOWN = ["open-studio", "go-tab", "lib-filter", "preview-song", "practice",
      "mh-rest", "rel-rush", "rel-cancel", "rel-rename", "song-detail",
      "presale-open", "store-preview", "store-prev-tab", "clause-negotiate", "dept-up"];
    const targets = qa("#career-body button").map(b => ({
      act: b.dataset.act, arg: b.dataset.arg, rel: b.dataset.rel,
      disabled: !!b.disabled, sroom: b.dataset.sroom, label: (b.textContent || "").trim()
    }));
    const unknown = targets.filter(t => t.act && KNOWN.indexOf(t.act) < 0);
    /* v10.70 — stüdyo odası düğmeleri (data-sroom) kendi işleyicisine sahiptir */
    const noAct = targets.filter(t => !t.act && !t.disabled && !t.sroom);
    const noLabel = targets.filter(t => !t.label && !t.disabled);

    ok("E1 · bilinmeyen eylem yok", unknown.length === 0, unknown.map(t => t.act).join(",") || "temiz");
    ok("E2 · eylemsiz düğme yok", noAct.length === 0, noAct.length + " düğme");
    ok("E3 · etiketsiz düğme yok", noLabel.length === 0, noLabel.length + " düğme");

    /* hızlandır düğmesi gerçekten çalışıyor */
    const rushBtn = q('#career-body [data-act="rel-rush"]:not([disabled])');
    ok("E4 · hızlandır düğmesi var ve etkin", !!rushBtn);
    if (rushBtn) {
      const relId = rushBtn.dataset.rel;
      const beforeWait = (K.career.releaseById(relId) || {}).waitDays;
      click(rushBtn);
      const afterWait = (K.career.releaseById(relId) || {}).waitDays;
      ok("E5 · hızlandır düğmesi süreyi kısalttı", afterWait < beforeWait, beforeWait + " → " + afterWait);
    } else {
      ok("E5 · hızlandır düğmesi süreyi kısalttı", false);
    }

    /* iptal düğmesi onay istiyor (kaza ile silme yok) */
    const cancelBtn = q('#career-body [data-act="rel-cancel"]');
    if (cancelBtn) {
      const beforeCount = K.state.player.releases.length;
      click(cancelBtn);
      const asked = !!q("#modal-root.open");
      const stillThere = K.state.player.releases.length === beforeCount;
      closeModal();
      ok("E6 · iptal önce onay istiyor", asked && stillThere);
    } else {
      ok("E6 · iptal önce onay istiyor", false);
    }

    /* ad düzenleme modalı */
    const renameBtn = q('#career-body [data-act="rel-rename"]:not([disabled])');
    if (renameBtn) {
      click(renameBtn);
      const hasInput = !!q("#rel-title");
      closeModal();
      toStudio();
      ok("E7 · ad düzenleme modalı input içeriyor", hasInput);
    } else {
      ok("E7 · ad düzenleme modalı input içeriyor", true, "bu state'te etkin düğme yok");
    }
  }

  r.setRuntime(errors.filter(e => !/HTMLMediaElement|Not implemented|fonts/i.test(e)).concat(throws.map(t => "throw: " + t)));
  r.report();
  process.exit(process.exitCode || 0);
}).catch((e) => {
  console.error("BOOT HATASI:", e);
  process.exit(1);
});
