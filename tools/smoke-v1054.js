/* Kullanım: node tools/smoke-v1054.js
   KARMA — v10.54 SÖZ GÖNDER (oyuncu → sanatçı, söz yazarı kredisi).

   A) ERİŞİM           — söz gönderme kilidi (tanışma + samimiyet ≥45)
   B) KISA SÖZ         — 12 kelimeden az söz reddedilir, kayıt açılmaz
   C) KABUL            — sanatçı kabul ederse şarkıyı KENDİ ADINA yayınlar;
                         oyuncu SÖZ YAZARI olarak kredilenir, peşin ücret alır
   D) YAYIN TELİFİ     — publishingTick günlük gelir üretir, günler bitince durur
   E) ÖZET/ARAYÜZ      — panel yayınlanan sözleri + telifi gösterir; DM çipi çıkar
   F) KAYIT            — endüstri kaydı + bildirim + sanatçı yükselişi

   Not: tek dosyalık KARMA-Oyun.html üzerinden test edilir;
   önce `node tools/build-single.js` çalıştırılmalı.
*/
const fs = require("fs");
const path = require("path");
const H = require("./harness.js");
const ROOT = path.resolve(__dirname, "..");

const FILE = path.join(ROOT, "KARMA-Oyun.html");
if (!fs.existsSync(FILE)) { console.error("KARMA-Oyun.html yok — önce: node tools/build-single.js"); process.exit(1); }
const html = fs.readFileSync(FILE, "utf8");

const pass = [], fail = [];
const ok = (n, c, e) => (c ? pass : fail).push(n + (e ? " — " + e : ""));

const { dom, errors } = H.bootDom(html, { seed: 20261054 });

H.whenReady(dom, {
  label: "v10.54 söz gönder hazır",
  ready: (K) => !!(K && K.writing && K.writing.sendLyrics && K.writing.publishingTick && K.writing.canSendLyrics)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exitCode = 1;
});

async function run() {
  const K = dom.window.K;
  dom.window.Math.random = () => 0.01;   // kabul olasılığını sabitle

  const fresh = (day) => {
    K.state = K.newGame();
    K.state.player.stageName = "Test";
    K.state.balance = 50000000;
    K.state.day = day == null ? 10 : day;
    return K.state;
  };
  const prime = (id, aff) => {
    const r = K.relation(id);
    r.met = true; r.affinity = aff == null ? 70 : aff; r.discovered = true;
    return r;
  };
  const SÖZ = "Betonun üstünde büyüdük biz her iz bir hikaye bıraktı bu mahalle bize her şeyi öğretti ve biz yine de gülümsedik";

  /* ============ A) ERİŞİM ============ */
  {
    fresh(10);
    prime("sehinsah", 70);
    ok("A-1 · samimi sanatçıya söz gönderilebilir", K.writing.canSendLyrics("sehinsah") === true);
    prime("weghrumi", 30);
    ok("A-2 · düşük samimiyette gönderilemez", K.writing.canSendLyrics("weghrumi") === false);
    const r = K.relation("ceza"); r.met = false; r.affinity = 90;
    ok("A-3 · tanışılmadan gönderilemez", K.writing.canSendLyrics("ceza") === false);
  }

  /* ============ B) KISA SÖZ ============ */
  {
    fresh(10);
    prime("sehinsah", 70);
    const before = (K.state.player.writing.sent || []).length;
    const res = K.writing.sendLyrics("sehinsah", "çok kısa söz", "street");
    ok("B-1 · kısa söz reddedilir", res.accepted === false && res.reason === "short", JSON.stringify(res));
    ok("B-2 · kayıt açılmaz", (K.state.player.writing.sent || []).length === before);
  }

  /* ============ C) KABUL + KREDİ ============ */
  {
    fresh(10);
    const id = "sehinsah";
    prime(id, 70);
    const a = K.artistById(id);
    const popBefore = a.popularity;
    const balBefore = K.state.balance;
    const relBefore = (K.state.player.releases || []).length;

    const res = K.writing.sendLyrics(id, SÖZ, "street");
    const w = K.state.player.writing;
    ok("C-1 · söz kabul edildi", res.accepted === true, JSON.stringify(res));
    ok("C-2 · yayın kaydı açıldı", w.sent.length === 1 && w.sent[0].artistId === id);
    ok("C-3 · oyuncu SÖZ YAZARI olarak kredilendi",
      w.sent[0].credit && w.sent[0].credit.role === "songwriter" && w.sent[0].credit.holder === "Sen");
    ok("C-4 · kredili iş sayısı arttı", w.credited >= 1, w.credited);
    ok("C-5 · peşin ücret ödendi", K.state.balance > balBefore, "res.fee:" + res.fee);
    ok("C-6 · oyuncu kendi yayınını çıkarmadı (sanatçı yayınladı)",
      (K.state.player.releases || []).length === relBefore);
    ok("C-7 · kalite ve telif hesaplandı", res.quality > 0 && res.royaltyPerDay > 0,
      "q:" + res.quality + " roy:" + res.royaltyPerDay);
    ok("C-8 · sanatçı yükseldi (endüstri etkisi)", a.popularity >= popBefore, popBefore + "→" + a.popularity);
  }

  /* ============ D) YAYIN TELİFİ ============ */
  {
    fresh(10);
    const id = "weghrumi";
    prime(id, 70);
    K.writing.sendLyrics(id, SÖZ, "street");
    const song = K.state.player.writing.sent[0];
    const bal0 = K.state.balance;
    const earned0 = song.earned;
    const d0 = song.daysLeft;

    K.writing.publishingTick();
    ok("D-1 · günlük telif üretir", K.state.balance > bal0, "kazanç:" + (K.state.balance - bal0));
    ok("D-2 · kazanç kayda işlenir", song.earned > earned0, song.earned);
    ok("D-3 · telif günü azalır", song.daysLeft === d0 - 1, song.daysLeft);

    /* günler bitince durur */
    for (let i = 0; i < song.royaltyDays + 5; i++) K.writing.publishingTick();
    const balEnd = K.state.balance;
    K.writing.publishingTick();
    ok("D-4 · telif süresi bitince ödeme durur", K.state.balance === balEnd && song.daysLeft <= 0, song.daysLeft);
  }

  /* ============ E) ÖZET / ARAYÜZ ============ */
  {
    fresh(10);
    const id = "lierefuge";
    prime(id, 70);
    K.writing.sendLyrics(id, SÖZ, "street");
    const sum = K.writing.summary();
    ok("E-1 · özet yayınlanan söz sayısını verir", sum.publishedCount === 1, sum.publishedCount);
    ok("E-2 · özet günlük telifi verir", sum.publishingDaily > 0, sum.publishingDaily);
    ok("E-3 · özet sent listesini taşır", Array.isArray(sum.sent) && sum.sent.length === 1);

    const conv = K.phone.appById("messages").conversation(id).render();
    ok("E-4 · DM'de 'Söz Gönder' çipi görünür", conv.indexOf('data-pact="send-lyrics"') >= 0);

    /* modal açılabiliyor */
    K.phone.appById("messages").lyricsPrompt(id);
    const modal = dom.window.document.querySelector("#modal-root");
    ok("E-5 · söz modalı açılır", !!(modal && modal.classList.contains("open")));
    ok("E-6 · modalda söz alanı + tema seçici var",
      !!dom.window.document.querySelector("#lz-text") && !!dom.window.document.querySelector("#lz-theme"));
    K.ui.closeModal();
  }

  /* ============ F) KAYIT ============ */
  {
    fresh(10);
    const id = "liashine";
    prime(id, 70);
    K.writing.sendLyrics(id, SÖZ, "love");
    const w = K.state.player.writing;
    ok("F-1 · yazarlık geçmişine düştü",
      (w.done || []).some(d => d.via === "sent" && d.mode === "credit"));
    ok("F-2 · endüstri kaydına eklendi",
      !!(K.state.industry && K.state.industry.written && K.state.industry.written.some(x => x.artistId === id && x.byPlayer)));
    ok("F-3 · bildirim üretildi",
      (K.state.notifications || []).some(n => /Sözün yayınlandı/i.test(n.title || "")));
    ok("F-4 · tema kayda geçti", w.sent[0].theme === "love", w.sent[0].theme);
  }

  /* ---- rapor ---- */
  console.log("==========================================================");
  console.log("KARMA · v10.54 SÖZ GÖNDER (söz yazarı kredisi)");
  console.log("==========================================================");
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length);
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); process.exitCode = 1; }
  else console.log("\n✅ SÖZ GÖNDER AKIŞI TEMİZ");
  if (errors && errors.length) {
    console.log("\n⚠ tarayıcı hataları (" + errors.length + "):");
    errors.slice(0, 6).forEach(e => console.log("   · " + String(e).slice(0, 140)));
  }
}
