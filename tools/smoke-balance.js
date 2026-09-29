#!/usr/bin/env node
/* ============================================================
   KARMA — tools/smoke-balance.js   (v10.17)
   KARİYER EĞRİSİ testi: "yüksel → zirve → düş"

   Neden ayrı bir test?
   --------------------
   sim-balance.js bir POLİTİKA simülasyonudur: sürekli yayın yapan bir
   oyuncuyu 420 gün koşturur ve ekonomi sağlığını ölçer. Ama sürekli
   yayın yapan bir sanatçının büyümesi normaldir; "zirve sonrası düşüş"
   ancak yayın YAVAŞLADIĞINDA görünür. Bu yüzden burada kontrollü
   senaryolarla eğrinin ŞEKLİ doğrulanır.

   Ölçülen davranış (v10.17 dikkat dalgası modeli):
     · tek yayın + uzun sessizlik → yükselir, zirve yapar, sert düşer
     · uzun yayın serisi + ara → zirve yapar, sonra geriler
     · sürekli yayın → dalga tavanı ve doygunluk sayesinde yavaşlar
     · eski kayıtlar (att alanı olmayan) bozulmaz

   Kullanım: node tools/smoke-balance.js
   ============================================================ */
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const FILE = path.join(ROOT, "KARMA-Oyun.html");
const SEED = 20260928;

function resolveJsdom() {
  const cands = [
    process.env.KARMA_JSDOM,
    "jsdom",
    path.join(process.env.HOME || "/home/user", "node_modules", "jsdom")
  ].filter(Boolean);
  for (const c of cands) { try { return require(c); } catch (e) {} }
  console.error("jsdom bulunamadı. Kur: npm install jsdom");
  process.exit(1);
}
const { JSDOM, VirtualConsole } = resolveJsdom();

if (!fs.existsSync(FILE)) {
  console.error("KARMA-Oyun.html yok — önce: node tools/build-single.js");
  process.exit(1);
}

const pass = [], fail = [];
const ok = (name, cond, extra) => (cond ? pass : fail).push(name + (extra ? " — " + extra : ""));
const pct = (a, b) => "%" + (100 * (1 - b / Math.max(1, a))).toFixed(0) + " düşüş";

/* ---------------- boot ---------------- */
const HTML = fs.readFileSync(FILE, "utf8");
const ALL_ERRORS = [];

/* Yeni ve BAĞIMSIZ bir oyun örneği kur.
   Determinizm ancak böyle ölçülebilir: aynı pencere içinde ikinci kez
   senaryo koşturmak işe yaramaz, çünkü bazı sistemler gün-bazlı durumu
   pencere ömrü boyunca tutar ve RNG akışı ilerler. */
function bootDom(seed) {
  const errsLocal = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", e => {
    const m = e.detail ? e.detail.message : e.message;
    if (!/fonts/.test(m)) { errsLocal.push(m); ALL_ERRORS.push(m); }
  });
  const dom2 = new JSDOM(HTML, {
    url: "https://karma.local/", runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.fetch = () => Promise.reject(new Error("offline"));
      let a = seed >>> 0;
      w.Math.random = function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      w.addEventListener("error", e => {
        const s = "onerror: " + (e.error ? e.error.message : e.message);
        errsLocal.push(s); ALL_ERRORS.push(s);
      });
    }
  });
  return { dom: dom2, errs: errsLocal };
}

function whenReady(d) {
  return new Promise((res, rej) => {
    let n = 0;
    const t = setInterval(() => {
      const K = d.window.K;
      if (K && K.phone && K.career && K.game) { clearInterval(t); res(K); }
      else if (++n > 300) { clearInterval(t); rej(new Error("oyun boot edilemedi")); }
    }, 25);
  });
}

let RESULT_A = null;   // determinizm karşılaştırması için saklanır

/* ---------------- yardımcılar ---------------- */
const JOB_IDS = ["prod", "set", "dj", "jingle", "ses", "studyokirala", "ders", "beat", "studio", "kurye", "market", "kafe", "street"];

function doJobs(K, max) {
  let done = 0;
  for (const id of JOB_IDS) {
    if (done >= max) break;
    const job = K.jobs.LIST.find(j => j.id === id);
    if (!job) continue;
    const cap = job.perDay || 1;
    for (let i = 0; i < cap; i++) {
      if (done >= max) break;
      if (!K.jobs.unlocked(job)) break;
      if (K.jobs.todayCount(id) >= cap) break;
      try { if (K.jobs.work(id)) done++; else break; } catch (e) { break; }
    }
  }
}

function startRelease(K) {
  const s = K.state, p = s.player;
  const cash = Math.max(0, s.balance);
  const budget = Math.min(300000, Math.max(20000, Math.round(cash * 0.30)));
  const marketing = Math.min(120000, Math.max(0, Math.round(cash * 0.08)));
  return K.career.createRelease({
    title: K.career.suggestTitle() + " " + s.day,
    genre: p.genre || "trap", kind: "normal", trackCount: 1,
    budget, marketing, waitDays: 18, trackBudgets: [budget],
    tracks: K.career.suggestTracks(1).map(nm => ({ name: nm, budget, source: "study" })),
    lyricsTheme: "street",
    lyricSections: { intro: "", verse: "Betonun üstünde büyüdük biz\nHer iz bir hikâye bıraktı", hook: "Hayat bize gülmedi ama biz gülümsedik", chorus: "", bridge: "", outro: "" },
    conceptId: "open", strategy: "standard", stores: (K.defaultStores ? K.defaultStores() : [])
  });
}

/* deterministik koşu: releaseEvery gün arayla yayın, stopAfter'dan sonra sessizlik */
function runScenario(K, opts) {
  K.state = K.newGame();
  const p = K.state.player;
  p.stageName = "SIMBAL"; p.genre = "trap"; p.popularity = 3; p.age = 19; p.birth = null;
  K.state.started = true;

  const rows = [];
  let last = -999;
  for (let d = 0; d < opts.days; d++) {
    const s = K.state;
    if (s.balance < 45000 || p.debt > 0) doJobs(K, 5);
    const canRelease = opts.releaseEvery && (!opts.stopAfter || s.day <= opts.stopAfter);
    if (canRelease && (s.day - last) >= opts.releaseEvery && s.balance >= 15000) {
      if (startRelease(K)) last = s.day;
    }
    K.game.nextDay();
    const daily = (p.songs || []).reduce((a, x) => a + (x.dailyStreams || 0), 0);
    rows.push({
      day: s.day,
      monthly: Math.round(p.monthly || 0),
      daily: Math.round(daily),
      pop: +(p.popularity || 0).toFixed(1),
      att: +(p.att == null ? 1 : p.att).toFixed(3),
      fatigue: +(p.fatigueAtt || 0).toFixed(3),
      songs: (p.songs || []).length
    });
  }
  const peak = rows.reduce((a, r) => (r.monthly > a.monthly ? r : a), rows[0]);
  const peakDaily = rows.reduce((a, r) => (r.daily > a.daily ? r : a), rows[0]);
  return { rows, peak, peakDaily, last: rows[rows.length - 1] };
}

/* ---------------- koşular ---------------- */
function run(K) {
  /* ============================================================
     1) DALGA MEKANİĞİ (birim testleri)
     ============================================================ */
  const p0 = K.state.player;
  const EC = K.ECON;

  ok("1 · ECON dalga sabitleri tanımlı",
    EC.attentionGain > 0 && EC.attentionMax > 1 && EC.attentionDecay > 0 && EC.attentionDecay < 1 &&
    EC.fatigueStep > 0 && EC.fatigueMax > 0 && EC.fatigueRecovery > 0 && EC.fatigueRecovery < 1,
    `gain=${EC.attentionGain} max=${EC.attentionMax} decay=${EC.attentionDecay}`);

  /* nötr değer */
  p0.att = 1; p0.fatigueAtt = 0;
  ok("1 · nötr dalga 1", Math.abs(K.game.attention() - 1) < 1e-9);

  /* eski kayıt uyumluluğu: alan yoksa çökmemeli */
  delete p0.att; delete p0.fatigueAtt;
  let compat = null;
  try { compat = K.game.attention(); } catch (e) { compat = null; }
  ok("1 · eski kayıt (att alanı yok) güvenli", compat === 1, "dönen: " + compat);

  /* doygunluk kazancı kısmalı — artışlar azalmalı.
     DİKKAT: tam güçte (1,0) dalga tavana çarpar ve artışlar 0'a düşer;
     bu tavan etkisi değil doygunluk etkisi olmalı. Bu yüzden orta güç
     kullanılır ki tavana değmesin. */
  p0.att = 1; p0.fatigueAtt = 0;
  const gains = [];
  for (let i = 0; i < 6; i++) {
    const before = p0.att;
    K.game.bumpAttention(0.5);
    gains.push(+(p0.att - before).toFixed(4));
  }
  const hitCap = p0.att >= EC.attentionMax - 1e-9;
  const strictlyDown = gains.every((g, i) => i === 0 || g < gains[i - 1]);
  ok("1 · doygunluk her yayında kazancı kısıyor", strictlyDown && !hitCap,
    "artışlar: " + gains.join(" → ") + (hitCap ? " (TAVANA DEĞDİ)" : ""));

  /* tavanlar aşılmamalı */
  p0.att = 1; p0.fatigueAtt = 0;
  for (let i = 0; i < 60; i++) K.game.bumpAttention(1.4);
  ok("1 · dalga tavanı aşılmıyor", p0.att <= EC.attentionMax + 1e-9, "att=" + p0.att.toFixed(3));
  ok("1 · doygunluk tavanı aşılmıyor", p0.fatigueAtt <= EC.fatigueMax + 1e-9, "fatigue=" + p0.fatigueAtt.toFixed(3));

  /* dalga nötre çöker */
  p0.att = 2.0; p0.fatigueAtt = 0.5;
  const before1 = { att: p0.att, fat: p0.fatigueAtt };
  for (let i = 0; i < 300; i++) K.game.tickAttention();
  ok("1 · dalga zamanla nötre çöküyor", Math.abs(p0.att - 1) < 0.01,
    before1.att.toFixed(2) + " → " + p0.att.toFixed(3));
  ok("1 · doygunluk zamanla azalıyor", p0.fatigueAtt < before1.fat * 0.7,
    before1.fat.toFixed(2) + " → " + p0.fatigueAtt.toFixed(3));

  /* ============================================================
     2) SENARYO A — tek yayın + uzun sessizlik
        Beklenen: yüksel → zirve → sert düşüş
     ============================================================ */
  const A = runScenario(K, { days: 303, releaseEvery: 30, stopAfter: 3 });
  ok("2 · A: yayın gerçekleşti", A.peak.monthly > 300, "zirve aylık " + A.peak.monthly);
  ok("2 · A: zirve yayından SONRA oluşuyor", A.peak.day > 3 && A.peak.day < 200,
    "zirve gün " + A.peak.day);
  ok("2 · A: zirveden sonra anlamlı düşüş (≥%60)", A.last.monthly <= A.peak.monthly * 0.40,
    `zirve ${A.peak.monthly} → son ${A.last.monthly} (${pct(A.peak.monthly, A.last.monthly)})`);
  ok("2 · A: düşüş tek yönlü (yeni zirve yok)",
    A.rows.filter(r => r.day > A.peak.day).every(r => r.monthly <= A.peak.monthly),
    "zirve gün " + A.peak.day);

  /* ============================================================
     3) SENARYO B — uzun yayın serisi, sonra ara
        Beklenen: seri boyunca yüksel → zirve → sessizlikte gerile
     ============================================================ */
  const B = runScenario(K, { days: 420, releaseEvery: 30, stopAfter: 240 });
  ok("3 · B: seri boyunca büyüdü", B.peak.monthly > 5000, "zirve aylık " + B.peak.monthly);
  ok("3 · B: zirve yayın serisinin sonunda/hemen sonrasında",
    B.peak.day >= 180 && B.peak.day <= 340, "zirve gün " + B.peak.day);
  ok("3 · B: sessizlikte anlamlı gerileme (≥%40)", B.last.monthly <= B.peak.monthly * 0.60,
    `zirve ${B.peak.monthly} → son ${B.last.monthly} (${pct(B.peak.monthly, B.last.monthly)})`);
  ok("3 · B: popülerlik de geriliyor", B.last.pop < B.peak.pop,
    `zirve pop ${B.peak.pop} → son ${B.last.pop}`);

  /* ============================================================
     4) SENARYO C — sürekli yayın: sınırsız üstel büyüme OLMAMALI
     ============================================================ */
  const C = runScenario(K, { days: 420, releaseEvery: 30, stopAfter: 0 });
  /* ÜSTEL BÜYÜME TESTİ (ilkesel): büyüme oranı zamanla DÜŞMELİ.
     Eğer eğri içbükey (konkav) ise ikinci dönemin çoğaltma katsayısı
     birinci dönemden küçüktür:  son/orta ≤ orta/baş.
     Sabit bir % eşiği uydurmak yerine eğrinin ŞEKLİ ölçülür. */
  const first = Math.max(1, C.rows[0].monthly);
  const mid = Math.max(1, C.rows[Math.floor(C.rows.length / 2)].monthly);
  const lastM = C.rows[C.rows.length - 1].monthly;
  const r1 = mid / first, r2 = lastM / mid;
  ok("4 · C: büyüme üstel değil, içbükey (ikinci dönem çoğaltması daha küçük)",
    r2 <= r1,
    `1. dönem ×${r1.toFixed(1)} · 2. dönem ×${r2.toFixed(2)}`);
  ok("4 · C: dalga tavanı içinde kaldı",
    C.rows.every(r => r.att >= 0.35 && r.att <= EC.attentionMax + 1e-9),
    "en yüksek att=" + Math.max(...C.rows.map(r => r.att)).toFixed(3));
  ok("4 · C: doygunluk tavanı içinde kaldı",
    C.rows.every(r => r.fatigue >= 0 && r.fatigue <= EC.fatigueMax + 1e-9),
    "en yüksek fatigue=" + Math.max(...C.rows.map(r => r.fatigue)).toFixed(3));
  ok("4 · C: sürekli yayın hâlâ ÖDÜLLENDİRİCİ (ödül kısılmadı)",
    C.last.daily > C.rows[59].daily * 2, `gün 60 günlük ${C.rows[59].daily} → son ${C.last.daily}`);

  /* ============================================================
     5) SAYISAL SAĞLIK — NaN / sonsuz / negatif sızması yok
     ============================================================ */
  [["A", A], ["B", B], ["C", C]].forEach(([nm, R]) => {
    const bad = R.rows.filter(r =>
      !isFinite(r.monthly) || !isFinite(r.daily) || !isFinite(r.att) ||
      !isFinite(r.fatigue) || r.monthly < 0 || r.daily < 0);
    ok(`5 · ${nm}: NaN/sonsuz/negatif yok`, bad.length === 0,
      bad.length ? "ilk hatalı gün " + bad[0].day : "temiz");
  });

  RESULT_A = A;   // determinizm fazı bunu bağımsız bir boot ile karşılaştırır
  return { A, B, C };
}

/* senaryo A'yı tek başına koştur (determinizm karşılaştırması için) */
function scenarioAOnly(K) {
  return runScenario(K, { days: 303, releaseEvery: 30, stopAfter: 3 });
}

/* ---------------- rapor ---------------- */
function report(A, B, C) {
  console.log("\n=========== KARİYER EĞRİSİ (yüksel→zirve→düş) ===========");
  const line = (nm, R) => {
    console.log(`\n${nm}`);
    console.log(`   başlangıç aylık ${R.rows[0].monthly} → ZİRVE ${R.peak.monthly} (gün ${R.peak.day})` +
      ` → son ${R.last.monthly}  [${pct(R.peak.monthly, R.last.monthly)}]`);
    console.log(`   zirve günlük dinlenme ${R.peakDaily.daily} (gün ${R.peakDaily.day}) · şarkı ${R.last.songs}` +
      ` · pop ${R.rows[0].pop}→${R.peak.pop}→${R.last.pop}`);
  };
  line("A · 1 yayın + 300 gün sessizlik", A);
  line("B · 240 gün yayın + 180 gün sessizlik", B);
  line("C · 420 gün kesintisiz yayın", C);

  const errs = Array.from(new Set(ALL_ERRORS));
  console.log("\nDeğerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length + " · Runtime hata: " + errs.length);
  if (fail.length) {
    console.log("\n❌ BAŞARISIZ");
    fail.forEach(f => console.log("   · " + f));
  }
  if (errs.length) {
    console.log("\n⚠️ RUNTIME");
    errs.slice(0, 5).forEach(e => console.log("   · " + e));
  }
  if (!fail.length && !errs.length) console.log("\n✅ KARİYER EĞRİSİ TAM — yükseliş, zirve ve düşüş doğrulandı");
  else process.exitCode = 1;
}

/* ---------------- ana akış ---------------- */
(async function main() {
  let first, second;
  try {
    /* 1. koşu: birim testleri + üç senaryo */
    first = bootDom(SEED);
    const K1 = await whenReady(first.dom);
    const res = run(K1);

    /* ============================================================
       6) DETERMİNİZM — BAĞIMSIZ İKİNCİ BOOT
       Aynı tohum, temiz pencere → aynı eğri. Aynı pencere içinde
       tekrar koşmak yanıltıcıdır (sistemlerin gün-bazlı durumu ve
       RNG akışı pencere ömrü boyunca devam eder).
       ============================================================ */
    second = bootDom(SEED);
    const K2 = await whenReady(second.dom);
    const a2 = scenarioAOnly(K2);
    const a1 = res.A;
    const same = a2.peak.monthly === a1.peak.monthly &&
                 a2.last.monthly === a1.last.monthly &&
                 a2.peak.day === a1.peak.day;
    ok("6 · determinizm: bağımsız boot + aynı tohum = aynı eğri", same,
      `1. koşu zirve ${a1.peak.monthly} (gün ${a1.peak.day}) son ${a1.last.monthly} · ` +
      `2. koşu zirve ${a2.peak.monthly} (gün ${a2.peak.day}) son ${a2.last.monthly}`);

    report(res.A, res.B, res.C);
  } catch (e) {
    console.error("test çöktü: " + (e && e.stack || e));
    process.exitCode = 1;
  } finally {
    try { if (first) first.dom.window.close(); } catch (e) {}
    try { if (second) second.dom.window.close(); } catch (e) {}
  }
})();
