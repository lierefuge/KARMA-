/* ============================================================
   KARMA — tools/smoke-v1065.js
   v10.65 · PARA AKIŞI · İLK 10 DAKİKA · TASLAKLAR

   Üç yetenek:
     A) para akışı defteri (kaynak bazlı gelir/gider) + Analiz paneli
     B) ilk 10 dakika rehberi (adımlar state'ten türer, tek seferlik ödül)
     C) proje taslakları (kaydet · devam et · sil · limit)

   Deterministik: harness seed'li oyun kurar, ağ kapalıdır.
   ============================================================ */
const fs = require("fs");
const path = require("path");
const H = require("./harness.js");

const ROOT = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "KARMA-Oyun.html"), "utf8");

const r = H.makeReport("KARMA · v10.65 (PARA AKIŞI · REHBER · TASLAK)");

const { dom, errors } = H.bootDom(html, { seed: 20261065 });

H.whenReady(dom, { label: "v1065" }).then((K) => {
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
  const throws = [];
  const tryFn = (name, fn) => { try { return fn(); } catch (e) { throws.push(name + " :: " + (e && e.message)); return undefined; } };
  const goTab = (t) => K.careerUI.setTab(t);

  /* ============================================================
     A) PARA AKIŞI DEFTERİ
     ============================================================ */
  {
    K.state.moneyLog = [];
    const before = K.state.balance;
    K.economy.earn(5000, "merch");
    K.economy.earn(3000, "merch");
    K.economy.earn(1000, "job");
    const spent = K.economy.spend(2000, "beat_purchase");

    ok("A1 · gelir deftere yazılıyor", (K.state.moneyLog || []).filter(e => e.dir === "in").length === 3,
      (K.state.moneyLog || []).length + " kayıt");
    ok("A2 · gider deftere yazılıyor", spent === true && (K.state.moneyLog || []).some(e => e.dir === "out" && e.reason === "beat_purchase"));
    ok("A3 · kasa gerçekten değişti", K.state.balance === before + 5000 + 3000 + 1000 - 2000);

    const led = K.economy.ledgerSummary(30);
    ok("A4 · özet toplamları doğru", led.totalIn === 9000 && led.totalOut === 2000 && led.net === 7000,
      "in " + led.totalIn + " · out " + led.totalOut);
    ok("A5 · kaynaklar tutara göre sıralı", led.ins[0].reason === "merch" && led.ins[0].amount === 8000,
      JSON.stringify(led.ins[0] || {}));
    ok("A6 · kaynak adları okunur", K.economy.reasonLabel("merch") === "Merch"
      && K.economy.reasonLabel("royalty_month") === "Telif (aylık)"
      && K.economy.reasonLabel("bilinmeyen_sey") === "Bilinmeyen sey",
      K.economy.reasonLabel("bilinmeyen_sey"));

    /* defter sınırı (save şişmesin) */
    for (let i = 0; i < 700; i++) K.economy.logMoney("in", 1, "job");
    ok("A7 · defter 600 kayıtla sınırlı", (K.state.moneyLog || []).length === 600, (K.state.moneyLog || []).length + " kayıt");
  }

  /* hat kontrolü de deftere yazıyor mu */
  {
    K.state.moneyLog = [];
    const day = K.state.day;
    K.state.player.releases = [{
      id: "rf", title: "Defter Testi", genre: "trap", type: "single",
      tracks: [{ name: "X", quality: 60 }], startDay: day - 2, waitDays: 10,
      cost: 20000, progress: 0.2, stage: "prep", coverSeed: "cvz"
    }];
    K.state.balance = 100000;
    K.career.rushRelease("rf");
    ok("A8 · hızlandırma ücreti deftere düşüyor", (K.state.moneyLog || []).some(e => e.reason === "rush_fee" && e.dir === "out"));
    K.career.cancelRelease("rf");
    ok("A9 · iptal iadesi deftere düşüyor", (K.state.moneyLog || []).some(e => e.reason === "cancel_refund" && e.dir === "in"));
  }

  /* analiz paneli */
  {
    K.state.player.songs = [{
      id: "s1", title: "Beton Çiçeği", genre: "trap", quality: 70, streams: 1000,
      publishedDay: K.state.day - 3, coverSeed: "cv1", stores: ["spotify"]
    }];
    K.economy.earn(4321, "merch");   /* panelin kaynak satırını görebilmek için */
    goTab("analytics");
    const html = (q("#career-body") || {}).innerHTML || "";
    ok("A10 · Analiz'de para akışı paneli var", /Para akışı/.test(html));
    ok("A11 · panel gerçek tutarları gösteriyor", /Giren/.test(html) && /Net/.test(html) && /Merch/.test(html));
  }

  /* ============================================================
     B) İLK 10 DAKİKA REHBERİ
     ============================================================ */
  {
    const p = K.state.player;
    p.persona = null; p.songs = []; p.releases = []; p.jobEarnings = 0;
    p.totalEarned = 0; p.onboardDismissed = false; p.onboardReward = false;
    p.jobShifts = 0;

    const steps = K.careerUI.onboardSteps();
    ok("B1 · altı adım tanımlı", steps.length === 6, steps.length + " adım");
    ok("B2 · yeni oyuncuda hiçbiri bitmemiş", steps.every(x => !x.done));

    goTab("career");
    ok("B3 · kariyer sekmesinde rehber görünüyor", /İlk 10 dakika/.test((q("#career-body") || {}).innerHTML || ""));
    ok("B4 · rehber adımları listeleniyor", qa(".ob-step").length === 6, qa(".ob-step").length + " satır");

    /* ilerleme: kimlik seçilince adım tamam */
    p.persona = (K.PLAYER_PERSONAS || [])[0] ? K.PLAYER_PERSONAS[0].id : "sokak";
    ok("B5 · kimlik seçilince adım tamamlanıyor",
      K.careerUI.onboardSteps().find(s2 => s2.id === "persona").done === true);

    /* ödül: tamamlanmadan verilmez */
    const balBefore = K.state.balance;
    K.game.nextDay();
    ok("B6 · eksik rehberde ödül yok", K.state.player.onboardReward !== true && K.state.balance === balBefore);

    /* tamamla → ödül bir kez */
    p.persona = p.persona || "sokak";
    p.songs = [{ id: "ob1", title: "İlk", genre: "trap", streams: 10, publishedDay: K.state.day, socialPromo: { instagram: true } }];
    p.jobEarnings = 500;
    p.totalEarned = 100;
    const bal2 = K.state.balance;
    K.game.nextDay();
    const gained = K.state.balance - bal2;
    ok("B7 · rehber bitince ödül verildi", K.state.player.onboardReward === true && gained >= 2000,
      "+" + gained + " ₺");
    const bal3 = K.state.balance;
    K.game.nextDay();
    ok("B8 · ödül ikinci kez verilmiyor", K.state.balance === bal3);

    /* gizleme */
    K.state.player.onboardDismissed = false;
    goTab("career");
    const dismiss = q('#career-body [data-act="ob-dismiss"]');
    ok("B9 · gizleme düğmesi var", !!dismiss);
    click(dismiss);
    ok("B10 · gizleyince rehber kalkıyor", K.state.player.onboardDismissed === true
      && !/İlk 10 dakika/.test((q("#career-body") || {}).innerHTML || ""));
    K.state.player.onboardDismissed = false;
  }

  /* ============================================================
     C) PROJE TASLAKLARI
     ============================================================ */
  {
    const p = K.state.player;
    p.drafts = [];
    K.state.balance = 50000;

    ok("C1 · sihirbazda 'Taslak' düğmesi var", (function () {
      K.careerUI.openStudioModal({ genre: "pop" });
      const has = !!q("#st-draft");
      return has;
    })());

    const balBefore = K.state.balance;
    const res = K.careerUI.saveStudioDraft();
    ok("C2 · taslak kaydediliyor", res.ok === true && (p.drafts || []).length === 1);
    ok("C3 · taslak para harcamıyor", K.state.balance === balBefore, balBefore + " → " + K.state.balance);
    ok("C4 · taslak türü taşıyor", (p.drafts[0] || {}).genre === "pop");

    /* devam et: sihirbaz aynı türle açılmalı */
    closeModal();
    const draftId = p.drafts[0].id;
    p.drafts[0].data.genre = "rnb";
    K.careerUI.resumeStudioDraft(draftId);
    ok("C5 · taslağa devam edince ayarlar geri geliyor",
      K.careerUI._studio && K.careerUI._studio.genre === "rnb", (K.careerUI._studio || {}).genre);
    closeModal();

    /* limit */
    for (let i = 0; i < 6; i++) {
      K.careerUI.openStudioModal({ genre: "trap" });
      K.careerUI.saveStudioDraft();
      closeModal();
    }
    ok("C6 · taslak limiti 5", (p.drafts || []).length === 5, (p.drafts || []).length + " taslak");

    /* silme */
    const delId = p.drafts[0].id;
    const del = K.careerUI.deleteStudioDraft(delId);
    ok("C7 · taslak siliniyor", del.ok === true && (p.drafts || []).length === 4
      && !p.drafts.some(d => d.id === delId));

    /* stüdyo sekmesinde liste */
    goTab("studio");
    ok("C8 · stüdyoda taslak paneli görünüyor", /Taslaklar/.test((q("#career-body") || {}).innerHTML || ""));
    ok("C9 · taslak satırları listeleniyor", qa(".gh-draft").length === 4, qa(".gh-draft").length + " satır");

    /* devam et düğmesi gerçekten sihirbazı açıyor */
    const resumeBtn = q('.gh-draft [data-act="draft-resume"]');
    ok("C10 · 'Devam et' düğmesi var", !!resumeBtn);
    if (resumeBtn) {
      click(resumeBtn);
      ok("C11 · devam et sihirbazı açıyor", !!q(".studio-app"));
      closeModal();
      goTab("studio");
    } else {
      ok("C11 · devam et sihirbazı açıyor", false);
    }

    /* olmayan taslak güvenli */
    ok("C12 · olmayan taslak çökertmiyor",
      K.careerUI.deleteStudioDraft("yok").ok === false &&
      K.careerUI.resumeStudioDraft("yok").ok === false);
  }

  /* ============================================================
     D) SEKME DÜĞMELERİ — bilinmeyen eylem yok
     ============================================================ */
  {
    goTab("studio");
    const KNOWN = ["open-studio", "go-tab", "lib-filter", "preview-song", "practice", "mh-rest",
      "rel-rush", "rel-cancel", "rel-rename", "song-detail", "draft-resume", "draft-del", "ob-dismiss",
      /* kariyer sekmesinde zaten var olan eylemler */
      "edit-identity", "persona", "mh-therapy", "mh-holiday", "mh-speak"];
    const acts = qa("#career-body button").map(b => b.dataset.act).filter(Boolean);
    const unknown = acts.filter(a => KNOWN.indexOf(a) < 0);
    ok("D1 · bilinmeyen eylem yok", unknown.length === 0, unknown.join(",") || "temiz");

    goTab("career");
    const cActs = qa("#career-body button").map(b => b.dataset.act).filter(Boolean);
    const cUnknown = cActs.filter(a => KNOWN.indexOf(a) < 0);
    ok("D2 · kariyer sekmesinde de bilinmeyen eylem yok", cUnknown.length === 0, cUnknown.join(",") || "temiz");
  }

  r.setRuntime(errors.filter(e => !/HTMLMediaElement|Not implemented|fonts/i.test(e)).concat(throws.map(t => "throw: " + t)));
  r.report();
  process.exit(process.exitCode || 0);
}).catch((e) => {
  console.error("BOOT HATASI:", e);
  process.exit(1);
});
