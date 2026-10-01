/* Kullanım: node tools/smoke-silence.js
   KARMA — KATALOG SÖNÜMÜ / UNUTULMA testi (v10.32)

   Neden bu süit var?
   ------------------
   `tools/sim-balance.js` şunu buldu: 34 şarkılık ÖLÜ bir katalog, şarkı
   başına 5 dinlenmelik taban yüzünden aylık ~2.500 "dinleyici"yi SONSUZA
   KADAR koruyordu — en iyi şarkısı günde 5 dinlenirken. Taban katalog
   büyüklüğüyle DOĞRUSAL büyüyor ve hiç sönmüyordu. Sonuç: 120 gün
   yayınsız kalınca aylık dinleyici yalnızca %18 geriliyordu; oyuncuya
   "yayın yap" baskısı kalmıyordu.

   Bu süit düzeltmeyi iki yönden kilitler:
     A) MATEMATİK — sönüm eğrisi: aktifken etkisiz, sessizlikte derinleşir,
        tabana oturur, yeni yayında sıfırlanır.
     B) GÖRÜNÜRLÜK — oyuncu cezayı görmeden cezalandırılmaz: eşiklerde
        TEK SEFERLİK uyarı düşer, her gün tekrarlamaz.

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
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

const pass = [], fail = [];
const ok = (n, c, e) => (c ? pass : fail).push(n + (e ? " — " + e : ""));

const { dom, errors } = H.bootDom(html, { seed: 20261032 });

H.whenReady(dom, {
  label: "sönüm katmanı hazır",
  ready: (K) => !!(K && K.game && K.game.silenceDecay && K.game.daysSinceRelease)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exitCode = 1;
});

function run() {
  const K = dom.window.K, s = K.state, p = s.player;
  const gameSrc = read("js/core/game.js");
  const stateSrc = read("js/core/state.js");
  const ECON = K.ECON;

  /* =========================================================
     A) SABİTLER ve KÖK NEDEN DÜZELTİLDİ Mİ
     ========================================================= */
  ok("A1 · sönüm sabitleri ECON'da", typeof ECON.silenceGrace === "number" &&
    typeof ECON.silenceDecay === "number" && typeof ECON.silenceFloor === "number",
    "grace=" + ECON.silenceGrace + " decay=" + ECON.silenceDecay + " floor=" + ECON.silenceFloor);

  /* KÖK NEDEN: şarkı başına taban artık SABİT DEĞİL, sönümlü olmalı.
     Eski kod: Math.max(5, song.dailyStreams * ...) */
  ok("A2 · taban artık sönümlü (sabit 5 değil)",
    /Math\.max\(catFloor,/.test(gameSrc) && /catFloor\s*=\s*Math\.max\(/.test(gameSrc));
  ok("A3 · kredi tabanındaki yapay 5 kaldırıldı",
    !/const daily = Math\.max\(5,/.test(gameSrc));

  /* =========================================================
     B) SÖNÜM EĞRİSİ — matematik
     ========================================================= */
  const realSongs = p.songs;
  /* Gün sayacını sabit ve BÜYÜK tut: publishedDay negatife düşerse
     "hiç yayın yok" durumuyla karışır (bu tam olarak testte yakalandı). */
  const realDay = s.day;
  s.day = 1000;
  const setSongs = (daysAgo) => {
    p.songs = [{ id: "t", publishedDay: s.day - daysAgo, dailyStreams: 100 }];
  };

  setSongs(0);
  const d0 = K.game.daysSinceRelease(), m0 = K.game.silenceDecay();
  ok("B1 · yeni yayında sönüm yok (çarpan 1)",
    m0 === 1, "gün=" + d0 + " çarpan=" + m0);

  setSongs(ECON.silenceGrace);
  ok("B2 · lütuf süresi sonunda hâlâ ceza yok",
    K.game.silenceDecay() === 1, "çarpan=" + K.game.silenceDecay());

  setSongs(ECON.silenceGrace + 45);
  const m45 = K.game.silenceDecay();
  ok("B3 · lütuf sonrası ceza başlıyor", m45 < 1 && m45 > ECON.silenceFloor,
    "45 gün ek sessizlik → çarpan " + m45.toFixed(3));

  setSongs(ECON.silenceGrace + 120);
  const m120 = K.game.silenceDecay();
  ok("B4 · sönüm monoton derinleşiyor", m120 < m45,
    "45g=" + m45.toFixed(3) + " → 120g=" + m120.toFixed(3));

  setSongs(ECON.silenceGrace + 3650);
  const mLong = K.game.silenceDecay();
  ok("B5 · alt sınırda duruyor (tamamen sıfırlanmaz)",
    mLong === ECON.silenceFloor, "çarpan=" + mLong);

  /* kısa boşluk (iki single arası normal aralık) CEZALANMAMALI */
  setSongs(20);
  ok("B6 · normal yayın aralığı (20 gün) cezalanmıyor",
    K.game.silenceDecay() === 1);

  /* hiç yayın yoksa güvenli */
  p.songs = [];
  ok("B7 · yayın yokken çökmez, güvenli değer",
    K.game.silenceDecay() === ECON.silenceFloor && K.game.daysSinceRelease() >= 999);

  /* =========================================================
     C) UYARI — ceza görünür olmalı
     ========================================================= */
  ok("C1 · silenceWarning tanımlı", typeof K.game.silenceWarning === "function");

  const warnCount = () => (s.notifications || []).filter(n => /Katalog sönümleniyor/.test(n.title || "")).length;

  /* aktifken uyarı yok */
  s.notifications = [];
  p._silenceWarned = 0;
  setSongs(10);
  K.game.silenceWarning();
  ok("C2 · aktifken uyarı düşmez", warnCount() === 0);

  /* eşik geçilince TEK uyarı */
  setSongs(ECON.silenceGrace + 50);
  K.game.silenceWarning();
  K.game.silenceWarning();
  K.game.silenceWarning();
  ok("C3 · eşik geçilince uyarı düşer", warnCount() === 1, "adet=" + warnCount());
  ok("C4 · aynı eşikte TEKRARLAMAZ", warnCount() === 1);

  /* sonraki eşik yeni uyarı üretir */
  setSongs(ECON.silenceGrace + 100);
  K.game.silenceWarning();
  ok("C5 · sonraki eşikte yeni uyarı", warnCount() === 2, "adet=" + warnCount());

  /* yeni yayın sayacı sıfırlar */
  setSongs(0);
  K.game.silenceWarning();
  ok("C6 · yeni yayında sayaç sıfırlanır", (p._silenceWarned || 0) === 0);
  setSongs(ECON.silenceGrace + 50);
  K.game.silenceWarning();
  ok("C7 · sıfırlandıktan sonra uyarı yeniden çalışır",
    warnCount() === 3, "adet=" + warnCount());

  /* uyarı mesajı çarpanı oyuncuya SÖYLER */
  const last = (s.notifications || []).filter(n => /Katalog sönümleniyor/.test(n.title || "")).pop();
  ok("C8 · uyarı çarpanı ve gün sayısını bildirir",
    !!last && /%\d+/.test(last.msg) && /\d+ gündür/.test(last.msg),
    last ? last.msg.slice(0, 70) + "…" : "uyarı yok");

  /* =========================================================
     D) GÜNLÜK DÖNGÜYE BAĞLI MI
     ========================================================= */
  ok("D1 · silenceWarning günlük döngüde çağrılıyor",
    /K\.game\.silenceWarning\(\)/.test(gameSrc));
  ok("D2 · sönüm ECON üzerinden ayarlanabilir (sabit gömülü değil)",
    /K\.ECON\.silenceDecay/.test(gameSrc) && /K\.ECON\.silenceFloor/.test(gameSrc));

  /* eski kayıt göçü: _silenceWarned yoksa çökmeden çalışmalı */
  delete p._silenceWarned;
  let crashed = null;
  try { setSongs(ECON.silenceGrace + 60); K.game.silenceWarning(); }
  catch (e) { crashed = e; }
  ok("D3 · eski kayıtta (_silenceWarned yok) çökmez", !crashed,
    crashed ? String(crashed.message) : "temiz");

  /* =========================================================
     E) RUNTIME TEMİZ
     ========================================================= */
  const rt = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
  ok("E1 · süitte yakalanmamış runtime hatası yok", rt.length === 0, rt.slice(0, 2).join(" | "));

  /* state geri yükle */
  p.songs = realSongs;
  s.day = realDay;

  /* sıfır/negatif publishedDay güvenliği — gerçek kenar durum */
  p.songs = [{ id: "t0", publishedDay: 0, dailyStreams: 100 }];
  s.day = 0;
  ok("E2 · publishedDay=0 kenar durumu güvenli",
    K.game.daysSinceRelease() === 0, "gün=" + K.game.daysSinceRelease());
  p.songs = realSongs;
  s.day = realDay;

  H.report && H.report("KATALOG SÖNÜMÜ");
  console.log("============ KATALOG SÖNÜMÜ SONUCU ============");
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length);
  if (fail.length) {
    console.log("\n❌ BAŞARISIZ");
    fail.forEach((f) => console.log("   · " + f));
    process.exit(1);
  }
  console.log("\n✅ KATALOG SÖNÜMÜ SAĞLAM");
  process.exit(0);
}
