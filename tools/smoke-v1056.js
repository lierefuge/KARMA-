/* Kullanım: node tools/smoke-v1056.js
   KARMA — v10.56: GERÇEKLİK DENETİMİ DÜZELTMELERİ

   Neden bu süit var?
   ------------------
   Gerçekçilik üzerine kurulu oyunda yapılan bağımsız bir denetim şu
   tutarsızlıkları buldu; hepsi burada kalıcı olarak kilitlenir:

     A) ZAMAN ÇİZELGESİ — oyun gerçek takvimden (dateStart = todayISO)
        başlıyordu ama NPC şarkı yılları `2008 + gün/365` ile üretiliyordu;
        gün 400'de (gerçek 2027) şarkı "2009" etiketi alıyordu.
     B) EKONOMİ — YouTube dinlenme ücreti gerçeğin 4–8 katıydı; enflasyon
        Türkiye gerçeğinin çok altındaydı; vergi dilimleri uydurmaydı.
     C) YAŞ KAPILARI — 15 yaşındaki oyuncu şirket kuruyor, gece kulübü/kafe
        ve araba alıyor, alkol ve BAHİS sponsorluğu alabiliyordu.
     D) SINIRSIZ BÜYÜME — NPC sanatçılar tavansız çarpımsal büyüyordu
        (~%31/yıl); ayrıca hiç yayın yapmayan oyuncunun "aylık dinleyicisi"
        oluyordu (dinleyicisiz dinleyici).
     E) HUKUKİ RİSK — gerçek sanatçılar kurgusal diss/beef senaryolarında
        yer alıyordu; artık varsayılan KAPALI bir güvenlik anahtarı var.

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

const { dom, errors } = H.bootDom(html, { seed: 20261056 });

H.whenReady(dom, {
  label: "v10.56 katmanı hazır",
  ready: (K) => !!(K && K.playerAge && K.settings && K.settings.beefReal)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exitCode = 1;
});

function run() {
  const K = dom.window.K, s = K.state, p = s.player;
  const gameSrc = read("js/core/game.js");
  const utilSrc = read("js/core/util.js");
  const stateSrc = read("js/core/state.js");
  const setSrc = read("js/systems/settings.js");
  const readme = read("README.md");

  /* =========================================================
     A) ZAMAN ÇİZELGESİ — tek takvim
     ========================================================= */
  ok("A1 · K.playerAge yardımcısı var", typeof K.playerAge === "function");
  ok("A2 · util.fromISO varsayılan yılı 2008 DEĞİL",
    K.util.fromISO("").y === new Date().getFullYear(), "y=" + K.util.fromISO("").y);
  ok("A3 · game.js'te 2008 tabanlı yıl formülü KALMADI",
    !/2008 \+ Math\.floor/.test(gameSrc));
  ok("A4 · NPC şarkı yılı gerçek takvimden türetilir",
    /dateForDay\(s\.day/.test(gameSrc));
  ok("A5 · index.html statik tarih yer tutucusu 2008 değil",
    !/id="stat-date">1 Oca 2008/.test(read("index.html")));

  /* davranış: gün 1 gerçek bugün, gün 400 bir yıl sonrası */
  const d1 = K.util.dateForDay(1), d400 = K.util.dateForDay(400);
  ok("A6 · gün 1 = gerçek başlangıç yılı", d1.y === new Date().getFullYear(), "y=" + d1.y);
  ok("A7 · gün 400 yılı gerçek takvimi izler", d400.y === d1.y + 1, d1.y + " → " + d400.y);

  /* =========================================================
     B) EKONOMİ — YouTube · enflasyon · vergi
     ========================================================= */
  ok("B1 · YouTube oranı gerçekçi aralıkta (<0.003 $)",
    K.ECON.streamRates.youtube < 0.003 && K.ECON.streamRates.youtube > 0,
    String(K.ECON.streamRates.youtube));
  ok("B2 · YouTube oranı Spotify'dan düşük",
    K.ECON.streamRates.youtube < K.ECON.streamRates.spotify);
  ok("B3 · enflasyon Türkiye gerçeğine yakın (>=%2,5/ay)",
    K.ECON.inflationMonthly >= 0.025, String(K.ECON.inflationMonthly));
  ok("B4 · vergi dilimleri kademeli ve üst oran %35",
    K.ECON.taxBrackets.some(b => b.rate === 0.35) && K.ECON.taxBrackets.length >= 4);
  ok("B5 · muafiyet eşiği gerçekçi (<=₺20.000/ay)",
    K.ECON.taxBrackets[0].upTo <= 20000, String(K.ECON.taxBrackets[0].upTo));
  ok("B6 · avgRate YouTube oranını yansıtır",
    K.econ.avgRate() > 0 && K.econ.avgRate() < 0.005934 * K.econ.ensure().fx * 1.2);

  /* =========================================================
     C) YAŞ KAPILARI
     ========================================================= */
  const realBal = s.balance, realPop = p.popularity, realAge = p.age, realLabel = s.label;
  s.balance = 5_000_000; p.popularity = 40; s.label = null;

  p.age = 16;
  const minorFound = K.label.found("Reşit Olmayan Müzik");
  ok("C1 · 16 yaşında şirket KURULAMAZ", minorFound === false && !s.label, "döndü=" + minorFound);
  ok("C2 · canFound yaşı da denetler",
    K.label.canFound() === false);

  p.age = 18; s.label = null;
  const adultFound = K.label.found("Yetişkin Müzik");
  ok("C3 · 18 yaşında şirket kurulabilir", adultFound === true && !!s.label);

  s.label = null; p.age = 16;
  const houseMinor = K.assets.canBuy("house");
  ok("C4 · 16 yaşında şehir evi ALINAMAZ", houseMinor.ok === false, houseMinor.why);
  const watchMinor = K.assets.canBuy("watch");
  ok("C5 · küçük gösteriş ürünü (saat) 16'da alınabilir", watchMinor.ok === true, watchMinor.why);
  p.age = 18;
  const houseAdult = K.assets.canBuy("house");
  ok("C6 · 18 yaşında ev alınabilir", houseAdult.ok === true, houseAdult.why);

  /* sponsorluk: alkol/bahis 18+ */
  p.age = 16; p.sponsors = [];
  s.pendingSponsor = { id: "x", brandId: "bet", name: "Şans Bahis", cat: "Bahis", icon: "🎲", fee: 100000, img: -6, day: s.day };
  K.sponsor.resolve(true);
  ok("C7 · 16 yaşında BAHİS sponsorluğu imzalanamaz",
    (p.sponsors || []).length === 0 && s.pendingSponsor === null);
  p.age = 18; p.sponsors = [];
  s.pendingSponsor = { id: "y", brandId: "bet", name: "Şans Bahis", cat: "Bahis", icon: "🎲", fee: 100000, img: -6, day: s.day };
  K.sponsor.resolve(true);
  ok("C8 · 18 yaşında bahis sponsorluğu imzalanabilir",
    (p.sponsors || []).length === 1);
  ok("C9 · sponsor teklif havuzu yaş filtresi içerir",
    /minAge \|\| age >= b\.minAge/.test(read("js/systems/sponsor.js")));

  /* geri yükle */
  s.balance = realBal; p.popularity = realPop; p.age = realAge; s.label = realLabel;
  p.sponsors = []; s.pendingSponsor = null;

  /* =========================================================
     D) SINIRSIZ BÜYÜME + DİNLEYİCİ TABANI
     ========================================================= */
  const realSongs = p.songs, realHist = p.dailyHistory;
  p.songs = []; p.dailyHistory = []; p.popularity = 50;
  K.game.refreshMonthly();
  ok("D1 · hiç yayın yapmayan oyuncunun aylık dinleyicisi 0",
    p.monthly === 0, "monthly=" + p.monthly);
  p.songs = [{ id: "t", title: "T", streams: 0 }]; p.dailyHistory = []; p.popularity = 50;
  K.game.refreshMonthly();
  ok("D2 · katalog varsa organik taban uygulanır", p.monthly === 50 * 30, "monthly=" + p.monthly);
  p.songs = realSongs; p.dailyHistory = realHist;

  /* NPC tavanı: tavana yaklaşan sanatçı büyümeyi durdurmalı */
  const a = K.artistList().find(x => x.id !== "player");
  const realBase = a._base, realBoost = a._boost, realMonthly = a.monthly;
  const cap = 500000 + (a.popularity || 50) * 110000;
  a._base = 1e12; a._boost = 0;
  K.game.accrueArtistWorld();
  ok("D3 · tavanı aşan NPC büyümez (lojistik tavan)",
    a._base <= 1e12 * 1.0001, "cap=" + cap + " base=" + Math.round(a._base));
  a._base = cap * 0.999; a._boost = 0;
  K.game.accrueArtistWorld();
  ok("D4 · tavana çok yakın NPC neredeyse hiç büyümez",
    a._base < cap * 1.0005, "base=" + Math.round(a._base) + " cap=" + cap);
  a._base = 100000; a._boost = 0;
  K.game.accrueArtistWorld();
  ok("D5 · tavanın altındaki NPC hâlâ büyür", a._base > 100000);
  a._base = realBase; a._boost = realBoost; a.monthly = realMonthly;

  /* =========================================================
     E) GERÇEK SANATÇI HUSUMETİ — güvenlik anahtarı
     ========================================================= */
  ok("E1 · beefReal varsayılan KAPALI", K.settings.beefReal() === false);
  ok("E2 · ayarlarda aç/kapa anahtarı var", /set-beefreal/.test(setSrc));

  const realArtist = K.artistList().find(x => x.id !== "player");
  const nm = realArtist.stageName;
  ok("E3 · husumet kapalıyken gerçek sanatçı HEDEF ALINAMAZ",
    K.beef.detectTarget(nm) === null, "hedef=" + K.beef.detectTarget(nm));
  const mentionsOff = K.beef.detectMentions(nm + " diss, sahte, boş iş");
  ok("E4 · husumet kapalıyken diss tonu nötrlenir",
    mentionsOff.length === 0 || mentionsOff.every(m => m.tone !== "diss"),
    JSON.stringify(mentionsOff.map(m => m.tone)));
  ok("E5 · husumet kapalıyken otomatik saldırı OLMAZ",
    K.beef.attackRandom("test") === null);

  K.settings.set({ beefReal: true });
  ok("E6 · açıkken hedefleme çalışır", K.beef.detectTarget(nm) === realArtist.id);
  const mentionsOn = K.beef.detectMentions(nm + " diss, sahte, boş iş");
  ok("E7 · açıkken diss tonu algılanır",
    mentionsOn.some(m => m.tone === "diss"), JSON.stringify(mentionsOn.map(m => m.tone)));
  K.settings.set({ beefReal: false });
  ok("E8 · kapatınca yeniden susar", K.beef.attackRandom("test") === null);

  /* =========================================================
     F) BELGE — içerik/hukuk notu
     ========================================================= */
  ok("F1 · README'de gerçek sanatçı içerik notu var",
    /gerçek sanatç|kurgusal|diss/i.test(readme) && /v10\.56/.test(readme));

  /* =========================================================
     G) RUNTIME TEMİZ
     ========================================================= */
  const rt = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
  ok("G1 · süitte yakalanmamış runtime hatası yok", rt.length === 0, rt.slice(0, 2).join(" | "));

  console.log("\n============================================");
  console.log("KARMA · v10.56 (gerçekçilik denetimi)");
  console.log("============================================");
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length);
  if (fail.length) {
    console.log("\n❌ BAŞARISIZ");
    fail.forEach((f) => console.log("   · " + f));
    process.exit(1);
  }
  console.log("\n✅ v10.56 TEMİZ");
  process.exit(0);
}
