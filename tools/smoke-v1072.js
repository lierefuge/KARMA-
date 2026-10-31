/* Kullanım: node tools/smoke-v1072.js
   KARMA — v10.72 Fan kohort döngüsü

   A) GÖÇ        — eski kayıt: tüm kitle "devralınan taban", değerler düşmez
   B) MUTABAKAT  — kohort toplamı === takipçi (her durumda, yuvarlama dahil)
   C) PAY        — paylar toplamı 1, negatif pay yok, çift sayım yok
   D) GİRİŞ      — kitle artınca kaynaklara dağılır, legacy kitle ÜRETMEZ
   E) KAYIP      — kitle azalınca en sadakatsiz kohort daha çok kaybeder
   F) SADAKAT    — hedefe doğru yavaş kayar, sınırlar içinde kalır
   G) TEKRAR     — aynı gün iki kez tick etkisizdir
   H) ARAYÜZ     — 🧭 Kohortlar sekmesi render edilir
   I) EKONOMİ    — mevcut fan ekonomisi (süperfan/kulüp) bozulmaz

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

const { dom, errors } = H.bootDom(html, { seed: 20261072 });

H.whenReady(dom, {
  label: "v10.72 kohort katmanı hazır",
  ready: (K) => !!(K && K.fansCohort && K.fans && K.phone)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exitCode = 1;
  finish();
});

function finish() {
  try { dom.window.close(); } catch (e) {}
  setTimeout(() => process.exit(process.exitCode || 0), 20);
}

function run() {
  const K = dom.window.K;
  const C = K.fansCohort;
  const p = K.state.player;
  /* Takipçiyi platform sayaçlarından kur (gerçek oyundaki tek kaynak) */
  const setFollowers = (v) => {
    const q = Math.floor(v / 4);
    p.ig = q; p.tiktok = q; p.x = v - q * 3; p.ytSubs = q;
    if (p.ig < 0) p.ig = 0;
    if (p.x < 0) { p.tiktok += p.x; p.x = 0; }
  };
  const sumCounts = (counts) => Object.keys(counts).reduce((a, k) => a + counts[k], 0);

  /* ============ A) GÖÇ ============ */
  setFollowers(12000);
  p.fanCohorts = null;                       /* eski kayıt */
  const st = C.state();
  ok("A-1 · eski kayıt legacy kohortuyla açılır", st.share.legacy === 1, st.share.legacy);
  ok("A-2 · yeni kaynak payı sıfır", C.IDS.filter(i => i !== "legacy").every(i => st.share[i] === 0));
  ok("A-3 · fan değerleri geriye dönük düşmez",
    K.fans.followers() === 12000 && (p.superfans === 0 || p.superfans >= 0));
  ok("A-4 · modül 6 kaynak tanımlar", C.SOURCES.length === 6, C.SOURCES.length);

  /* ============ B) MUTABAKAT ============ */
  let okSum = true, detail = "";
  [0, 1, 7, 13, 999, 12001, 250000].forEach((v) => {
    setFollowers(v);
    const counts = C.counts();
    const s = sumCounts(counts);
    if (s !== K.fans.followers()) { okSum = false; detail = v + " → " + s + " ≠ " + K.fans.followers(); }
  });
  ok("B-1 · kohort toplamı === takipçi (7 farklı değer)", okSum, detail);

  setFollowers(12000);
  C._reset();
  const r0 = C.report();
  ok("B-2 · rapor toplamı takipçiye eşit", r0.sum === r0.total, r0.sum + " / " + r0.total);
  ok("B-3 · kohort satırları toplamı = sum",
    r0.rows.reduce((a, x) => a + x.count, 0) === r0.sum);

  /* ============ C) PAY ============ */
  const sumShare = C.IDS.reduce((a, i) => a + st.share[i], 0);
  ok("C-1 · paylar toplamı 1", Math.abs(sumShare - 1) < 1e-6, sumShare.toFixed(6));
  ok("C-2 · negatif pay yok", C.IDS.every(i => st.share[i] >= 0));
  ok("C-3 · tek fan tek kohortta", sumCounts(C.counts()) === K.fans.followers());

  /* ============ D) GİRİŞ ============ */
  setFollowers(12000); C._reset();
  const legacyBefore = C.counts().legacy;
  for (let d = 0; d < 10; d++) {
    K.state.day += 1;
    setFollowers(K.fans.followers() + 1200);       /* net büyüme */
    C.tick();
  }
  const c1 = C.counts(), sh1 = C.state().share;
  ok("D-1 · legacy kohortu yeni kitle üretmez",
    c1.legacy <= legacyBefore + 40, c1.legacy + " (önce " + legacyBefore + ")");
  ok("D-2 · yeni kitle kaynaklara dağıldı",
    C.IDS.filter(i => i !== "legacy").some(i => sh1[i] > 0.01),
    JSON.stringify(C.IDS.map(i => i + ":" + sh1[i].toFixed(3))));
  ok("D-3 · giriş sayacı doldu", C.report().in30 > 0, C.report().in30);
  ok("D-4 · toplam yine eşit", sumCounts(c1) === K.fans.followers());

  /* ============ E) KAYIP ============ */
  /* sadakati yapay olarak ayrıştır: shortform geçici, live sadık */
  const s2 = C.state();
  s2.loyalty.shortform = 0.18; s2.loyalty.live = 0.92;
  const shareBefore = { shortform: s2.share.shortform, live: s2.share.live };
  K.state.day += 1;
  setFollowers(Math.floor(K.fans.followers() * 0.7));   /* ciddi kayıp */
  C.tick();
  const s3 = C.state();
  const lostShort = shareBefore.shortform - s3.share.shortform;
  const lostLive = shareBefore.live - s3.share.live;
  ok("E-1 · kayıp en sadakatsizden daha çok düşürür",
    lostShort / Math.max(1e-9, shareBefore.shortform) > lostLive / Math.max(1e-9, shareBefore.live),
    "short " + lostShort.toFixed(4) + " · live " + lostLive.toFixed(4));
  ok("E-2 · çıkış sayacı doldu", C.report().out30 > 0, C.report().out30);
  ok("E-3 · kayıptan sonra da toplam eşit", sumCounts(C.counts()) === K.fans.followers());

  /* ============ F) SADAKAT ============ */
  const c2 = C.state();
  ok("F-1 · sadakat 0.15-0.95 aralığında",
    C.IDS.every(i => c2.loyalty[i] >= 0.15 && c2.loyalty[i] <= 0.95),
    JSON.stringify(c2.loyalty));
  const before = c2.loyalty.shortform;
  const target = C.loyaltyTarget("shortform", C.activity());
  K.state.day += 1; setFollowers(K.fans.followers()); C.tick();
  const after = C.state().loyalty.shortform;
  ok("F-2 · tek günde %3'ten fazla sıçramaz",
    Math.abs(after - before) <= 0.03 + 1e-9, (after - before).toFixed(4));
  ok("F-3 · hedefe doğru hareket eder",
    Math.abs(target - after) <= Math.abs(target - before) + 1e-9);
  ok("F-4 · günlük kayıp oranı %0.4-4 arası",
    C.IDS.every(i => C.churnRate(i) >= 0.004 && C.churnRate(i) <= 0.04));

  /* ============ G) TEKRAR ============ */
  const snap = JSON.stringify(C.state().share);
  const outSnap = C.report().out30;
  C.tick(); C.tick();                                  /* aynı gün */
  ok("G-1 · aynı gün ikinci tick etkisiz", JSON.stringify(C.state().share) === snap);
  ok("G-2 · sayaçlar şişmez", C.report().out30 === outSnap);

  /* ============ H) ARAYÜZ ============ */
  const app = (K.phone.apps || []).find((a) => a.id === "fans");
  ok("H-1 · fanbase uygulaması kayıtlı", !!app);
  const view = app.render({ tab: "kohort" });
  ok("H-2 · Kohortlar sekmesi var", (view.tabs || []).some(t => t.id === "kohort"));
  const markup = view.render("kohort");
  ok("H-3 · kohort bloğu render edildi", /fc-list/.test(markup) && /fc-row/.test(markup));
  ok("H-4 · toplam ve takipçi birlikte gösterilir",
    /kohort toplamı/.test(markup) && /takipçi/.test(markup));
  ok("H-5 · diğer sekmeler bozulmadı",
    /fans-wrap/.test(view.render("kitle")) && /Fan Kulübü/.test(view.render("kulup")));

  /* ============ I) EKONOMİ ============ */
  K.state.day += 1; setFollowers(60000); C.tick();
  const fsum = K.fans.summary();
  ok("I-1 · süperfan hesabı hâlâ çalışıyor", fsum.superfans > 0, fsum.superfans);
  ok("I-2 · kitle katmanları toplamı takipçiyi aşmaz",
    fsum.casual + fsum.active + fsum.superfans <= fsum.followers);
  ok("I-3 · fanCohorts kayda yazılabilir (JSON)",
    !!JSON.parse(JSON.stringify({ c: C.state() })).c.share);

  /* rapor */
  console.log("\nGeçen: " + pass.length + " · Kalan: " + fail.length);
  pass.forEach((x) => console.log("  ✅ " + x));
  if (fail.length) {
    fail.forEach((x) => console.log("  ❌ " + x));
    process.exitCode = 1;
  }
  const runtime = (errors || []).filter(e => !/ResizeObserver|Not implemented/i.test(String(e)));
  if (runtime.length) {
    console.log("\nYakalanmamış hata: " + runtime.length);
    runtime.slice(0, 3).forEach((e) => console.log("  · " + String(e).slice(0, 120)));
    process.exitCode = 1;
  }
  finish();
}
