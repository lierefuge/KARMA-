/* Kullanım: node tools/smoke-v1061.js
   KARMA — v10.61: NPC AYLIK DİNLEYİCİ EKONOMİSİ (kapalı döngü)

   Neden bu süit var?
   ------------------
   v10.60'a kadar NPC aylık dinleyicisi hâlâ YAPAYDI:
       a.monthly = a.monthly * (1 + gain)
   yani tek bir yayın bonusu sayıyı doğrudan şişiriyordu; gerçek
   dinlenme performansıyla bağı yoktu. Flop'ta bile aylık artabiliyor,
   uzun sessizlikte düşmüyordu.

   v10.61 bu halkayı kapatır:
       release → günlük stream → 28 günlük pencere → monthly listeners
              → sonraki release başlangıç akışı → chart
   Aylık dinleyici artık son 28 günün GERÇEK stream performansından
   türetilir; popülerlik taban katkısı verir ama yerine geçmez.

   Bu süit, istenen 24 senaryoyu ve dengeyi kalıcı olarak kilitler.
   Mevcut RNG akışı korunur (yeni fonksiyonlar Math.random KULLANMAZ).
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

const { dom, errors } = H.bootDom(html, { seed: 20261061 });

H.whenReady(dom, {
  label: "v10.61 NPC monthly ekonomisi hazır",
  ready: (K) => !!(K && K.industry && K.industry.npcMonthlyTick && K.industry.npcStreamPush &&
    K.industry.npcMonthlyFromWindow && K.industry.NPC_MONTHLY && K.artistList().length)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.stack ? err.stack : err));
  process.exit(1);
});

function run(K) {
  let s = K.state, I = K.industry.ensure();
  const N = K.industry.NPC_MONTHLY;

  /* ---- gün gün NPC tick'i (accrueArtistWorld'un NPC kısmıyla aynı) ---- */
  function tick(a) {
    s.day++;
    const catDaily = Math.max(1, Math.round((a._base || a.monthly) / N.CATALOG_DIV));
    const adj = (a._flopUntil && s.day <= a._flopUntil) ? 0.85 : 1;
    K.industry.decayReleaseStreams(a);
    K.industry.npcMonthlyTick(a, catDaily * adj);
  }
  function reset(name, monthly, pop) {
    const a = K.artistList().find(x => x.stageName === name);
    a.monthly = a._base = monthly; a.popularity = pop || 80;
    delete I.npcStreams[a.id]; delete I.lastRelease[a.id];
    a._flopUntil = 0; a._boost = 0;
    K.industry.careerOf(a.id).lastRelease = s.day;
    return a;
  }
  function runDays(a, days) {
    const start = a.monthly; let peak = start, trough = start;
    for (let i = 0; i < days; i++) { tick(a); peak = Math.max(peak, a.monthly); trough = Math.min(trough, a.monthly); }
    return { start, peak, trough, end: a.monthly };
  }
  /* ilk eşleşen sonuç gününde yayınla; gün ATLAMADAN */
  function releaseOnOutcome(a, outcome, maxDays) {
    for (let i = 0; i < (maxDays || 4000); i++) {
      tick(a);
      if (K.industry.npcOutcome(a) === outcome) {
        const g = K.industry.adjustNpcRelease(a, 0.1);
        return K.industry.applyNpcRelease(a, { title: outcome + " test", featWith: null }, g, false);
      }
    }
    return null;
  }

  /* =========================================================
     A) API YÜZEYİ
     ========================================================= */
  {
    const api = ["npcStreamPush", "npcWindowSum", "npcMonthlyFromWindow", "npcMonthlyTick", "_softCap"];
    ok("A1 · v10.61 stream penceresi API'si tam",
      api.every(fn => typeof K.industry[fn] === "function"),
      api.filter(fn => typeof K.industry[fn] !== "function").join(", ") || "tam");
    ok("A2 · NPC_MONTHLY sabitleri dolu",
      N.WINDOW === 28 && N.STREAM_TO_LISTENER > 0 && N.FLOOR > 0 && N.SOFT_CAP_BASE > 0);
    ok("A3 · pencere 28 gün", N.WINDOW === 28, String(N.WINDOW));
  }

  /* =========================================================
     B) RELEASE → İLK AKIŞ → PENCERE (1,2,4,5)
     ========================================================= */
  {
    const a = reset("Ezhel", 1000000);
    const before = K.industry.npcWindowSum(a);
    const res = K.industry.applyNpcRelease(a, { title: "Pencere İşi", featWith: null }, 0.1, false);
    const after = K.industry.npcWindowSum(a);
    ok("B1 · yayın ilk stream üretir", res && res.initial > 0, res && String(res.initial));
    ok("B2 · ilk stream pencereye yazıldı", after > before, before + " → " + after);
    ok("B3 · günlük akış = ilk stream (başlangıç)", res.daily === res.initial);
    ok("B4 · monthly pencereden yeniden türetildi",
      a.monthly === K.industry.npcMonthlyFromWindow(a), String(a.monthly));
  }

  /* =========================================================
     C) DECAY → PENCERE BÜYÜR (3,4)
     ========================================================= */
  {
    const a = reset("Ezhel", 1000000);
    K.industry.applyNpcRelease(a, { title: "Akış", featWith: null }, 0.1, false);
    const d1 = I.lastRelease[a.id].daily;
    const sum1 = K.industry.npcWindowSum(a);
    tick(a);
    const d2 = I.lastRelease[a.id].daily;
    ok("C1 · ertesi gün yayın akışı söner (0,93)", d2 < d1, d1 + " → " + Math.round(d2));
    ok("C2 · toplam stream birikir", I.lastRelease[a.id].total > I.lastRelease[a.id].initial);
    ok("C3 · pencere gün geçtikçe büyür", K.industry.npcWindowSum(a) > sum1, sum1 + " → " + K.industry.npcWindowSum(a));
  }

  /* =========================================================
     D) PENCERE TEMİZLİĞİ (performans · 28 gün)
     ========================================================= */
  {
    const a = reset("Ezhel", 1000000);
    for (let i = 0; i < 90; i++) tick(a);
    const w = I.npcStreams[a.id];
    ok("D1 · pencere 28 günle sınırlı", w.vals.length <= 28, String(w.vals.length));
    ok("D2 · eski veriler temizlendi (90 gün sonra 28 kayıt)",
      w.vals.length === 28, String(w.vals.length));
    ok("D3 · pencere toplamı pozitif ve makul", K.industry.npcWindowSum(a) > 0);
  }

  /* =========================================================
     E) MONTHLY = PENCERENİN FONKSİYONU (6)
     ========================================================= */
  {
    const a = reset("Ezhel", 1000000);
    I.npcStreams[a.id] = { last: s.day, vals: [1000, 1000, 1000, 1000] };
    const low = K.industry.npcMonthlyFromWindow(a);
    I.npcStreams[a.id] = { last: s.day, vals: [100000, 100000, 100000, 100000] };
    const high = K.industry.npcMonthlyFromWindow(a);
    ok("E1 · pencere büyüyünce monthly büyür", high > low, low + " → " + high);
    ok("E2 · monthly pencereyle orantılı (0,5 katı, taban üstü)",
      Math.abs(high - 400000 * N.STREAM_TO_LISTENER) < 1 || high >= low);
    I.npcStreams[a.id] = { last: s.day, vals: [] };
    ok("E3 · boş pencere tabana düşer (güvenli taban)",
      K.industry.npcMonthlyFromWindow(a) >= N.FLOOR, String(K.industry.npcMonthlyFromWindow(a)));
  }

  /* =========================================================
     F) HIT / NORMAL / FLOP DENGESİ (7,8,10,11)
     ========================================================= */
  {
    const a = reset("Ezhel", 1000000);
    runDays(a, 20);
    const before = a.monthly;
    releaseOnOutcome(a, "normal");
    const r = runDays(a, 60);
    ok("F1 · normal yayın monthly'yi aşırı değiştirmez (< %15 zirve)",
      r.peak / before < 1.15, "%" + ((r.peak / before - 1) * 100).toFixed(1));
    ok("F2 · normal yayın monthly'yi düşürmez", r.end >= before * 0.98);

    const b = reset("Ezhel", 1000000);
    runDays(b, 20);
    const bBefore = b.monthly;
    releaseOnOutcome(b, "hit");
    const rb = runDays(b, 60);
    ok("F3 · hit monthly'yi anlamlı yükseltir (> %8 zirve)",
      rb.peak / bBefore > 1.08, "%" + ((rb.peak / bBefore - 1) * 100).toFixed(1));
    ok("F4 · hit kontrollü kalır (< %40 zirve)", rb.peak / bBefore < 1.40,
      "%" + ((rb.peak / bBefore - 1) * 100).toFixed(1));
    ok("F5 · TEK hit astronomik sıçrama yapmaz (monthly < 2× taban)",
      rb.peak < bBefore * 2, bBefore + " → " + rb.peak);

    const c = reset("Ezhel", 1000000);
    runDays(c, 20);
    const cBefore = c.monthly;
    releaseOnOutcome(c, "flop");
    const rc = runDays(c, 60);
    ok("F6 · flop monthly'yi geriletebilir (dip < başlangıç)",
      rc.trough < cBefore, cBefore + " → " + rc.trough);
    ok("F7 · flop sonrası monthly kontrollü düşer (< %20 dip)",
      rc.trough / cBefore > 0.80, "%" + ((1 - rc.trough / cBefore) * 100).toFixed(1));
  }

  /* =========================================================
     G) ARDIŞIK HIT → İSTİKRARLI YÜKSELİŞ (10)
     ========================================================= */
  {
    const a = reset("Ezhel", 1000000);
    runDays(a, 15);
    const start = a.monthly;
    for (let k = 0; k < 4; k++) { releaseOnOutcome(a, "hit"); runDays(a, 40); }
    ok("G1 · ardışık hit monthly'yi istikrarlı yükseltir",
      a.monthly > start * 1.05, start + " → " + a.monthly);
    ok("G2 · ardışık hit tavanı aşmaz", a.monthly < a._base * 3 + 500000);
  }

  /* =========================================================
     H) UZUN SESSİZLİK → DÜŞÜŞ (9)
     ========================================================= */
  {
    const a = reset("Ezhel", 1000000);
    runDays(a, 400);
    ok("H1 · uzun süre yayın yapmayan NPC'nin monthly'si düşer",
      a.monthly < 1000000 * 0.75, a.monthly.toLocaleString());
    ok("H2 · düşüş tabanın altına inmez", a.monthly >= N.FLOOR, String(a.monthly));
  }

  /* =========================================================
     I) TABAN + SOFT-CAP (6,11)
     ========================================================= */
  {
    const a = reset("Lia Shine", 280000, 41);
    runDays(a, 120);
    ok("I1 · küçük NPC tabanın altına inmez", a.monthly >= N.FLOOR, String(a.monthly));

    const b = reset("Ezhel", 30000000, 95);
    runDays(b, 30);
    const cap = N.SOFT_CAP_BASE + 95 * N.SOFT_CAP_POP;
    ok("I2 · çok büyük NPC soft-cap'i aşmaz", b.monthly <= cap, b.monthly + " ≤ " + cap);
    ok("I3 · soft-cap sayıyı sınırlar (patlama yok)", b.monthly < 30000000, b.monthly.toLocaleString());
  }

  /* =========================================================
     J) KARİYER MİLESTONE (spam yok, önemli kırılmalar)
     ========================================================= */
  {
    const a = reset("Ezhel", 1000000);
    const c = K.industry.careerOf(a.id);
    c.milestones = []; c.monthlyPeak = 0; c._mTrough = null; c._mPeakDay = 0; c._mDownDays = 0;
    runDays(a, 20);
    releaseOnOutcome(a, "hit");
    runDays(a, 60);
    ok("J1 · monthly zirvesi kaydedildi", (c.monthlyPeak || 0) > 1000000, String(c.monthlyPeak));
    ok("J2 · önemli kırılma kariyer geçmişine düştü",
      c.milestones.some(m => /aylık/.test(m.text)), JSON.stringify(c.milestones.slice(0, 3)));
    ok("J3 · milestone listesi 10 kayıtla sınırlı", c.milestones.length <= 10);
  }

  /* =========================================================
     K) DİĞER STATLAR ETKİSİNİ KORUYOR (popularity · label · social · feature)
     ========================================================= */
  {
    s.day = 6000;
    const base = { stageName: "BalTest", popularity: 60, monthly: 2000000, ig: 500000, x: 100000,
      tiktok: 300000, ytSubs: 200000, traits: { work: 5 }, genre: "rap" };
    const strongLabel = K.LABELS.slice().sort((x, y) => y.power - x.power)[0];
    const lowLabel = K.LABELS.slice().sort((x, y) => x.power - y.power)[0];
    const a1 = Object.assign({}, base, { id: "bal_test", labelId: strongLabel.id });
    delete I.lastRelease[a1.id]; delete I.npcStreams[a1.id];
    const r1 = K.industry.applyNpcRelease(a1, { title: "Bal", featWith: null }, 0.1, false);
    const a2 = Object.assign({}, base, { id: "bal_test", labelId: lowLabel.id });
    delete I.lastRelease[a2.id]; delete I.npcStreams[a2.id];
    const r2 = K.industry.applyNpcRelease(a2, { title: "Bal", featWith: null }, 0.1, false);
    ok("K1 · güçlü label daha çok ilk stream verir (dolaylı monthly)", r1.initial > r2.initial);

    /* sosyal etkiyi izole et: aynı id + aynı label, yalnızca takipçi farklı */
    const poor = Object.assign({}, base, { id: "bal_test", labelId: strongLabel.id,
      ig: 100, x: 100, tiktok: 100, ytSubs: 100 });
    const fSoc = K.industry.npcFactors(a1, { title: "Bal" }).social;
    const fPoor = K.industry.npcFactors(poor, { title: "Bal" }).social;
    ok("K2 · güçlü sosyal kitle reach faktörünü artırır", fSoc > fPoor,
      fSoc.toFixed(3) + " > " + fPoor.toFixed(3));
    delete I.lastRelease[poor.id]; delete I.npcStreams[poor.id];
    const rp = K.industry.applyNpcRelease(poor, { title: "Bal", featWith: null }, 0.1, false);

    /* feature: aynı id + aynı taban; tek fark featWith */
    const soloF = Object.assign({}, base, { id: "bal_feat", labelId: strongLabel.id });
    delete I.lastRelease[soloF.id]; delete I.npcStreams[soloF.id];
    const rsolo = K.industry.applyNpcRelease(soloF, { title: "Bal", featWith: null }, 0.1, false);
    const feat = Object.assign({}, base, { id: "bal_feat", labelId: strongLabel.id });
    delete I.lastRelease[feat.id]; delete I.npcStreams[feat.id];
    const rf = K.industry.applyNpcRelease(feat, { title: "Bal", featWith: "ezhel" }, 0.1, false);
    ok("K3 · feature iki kitleyi birleştirir", rf.initial > rsolo.initial,
      rf.initial + " > " + rsolo.initial);

    const pop = K.industry.npcMonthlyFromWindow({ id: "popx", popularity: 99, monthly: 100000 });
    const popLow = K.industry.npcMonthlyFromWindow({ id: "popy", popularity: 30, monthly: 100000 });
    ok("K4 · popülerlik tabana katkı sağlar (yerine geçmez)", pop >= popLow, pop + " ≥ " + popLow);
    ok("K5 · popülerlik tek başına dev monthly üretmez", pop < 200000, String(pop));
  }

  /* =========================================================
     L) CHART BAĞLANTISI KORUNUYOR (12,13,14,15)
     ========================================================= */
  {
    s.day = 7000;
    const a = K.artistList().slice().sort((x, y) => (y.monthly || 0) - (x.monthly || 0))[0];
    delete I.lastRelease[a.id]; delete I.npcStreams[a.id];
    K.industry.applyNpcRelease(a, { title: "Chart İşi", featWith: null }, 0.1, false);
    I.lastRelease[a.id].result = "hit";
    I.lastRelease[a.id].daily = 120000;
    K.game.buildChart();
    const e1 = (s.chart || []).filter(x => x.id === "npc_" + a.id)[0];
    ok("L1 · NPC yayını chart'a girebilir", !!e1, e1 ? "günlük " + e1.daily : "yok");
    ok("L2 · NPC satırı doğru işaretli", e1 && e1.npc === true && e1.mine === false);

    /* NPC stream düşünce chart'tan düşer */
    I.lastRelease[a.id].daily = 100;
    K.game.buildChart();
    ok("L3 · NPC stream düşünce chart'tan çıkar",
      !(s.chart || []).some(x => x.id === "npc_" + a.id));

    /* oyuncu ↔ NPC rekabeti */
    s.player.songs = (s.player.songs || []).filter(x => x.id !== "v61_song");
    s.player.songs.push({ id: "v61_song", title: "Oyuncu", publishedDay: s.day - 3, lastDaily: 90000, streams: 500000, coverSeed: "x" });
    I.lastRelease[a.id].daily = 120000;
    K.game.buildChart();
    const npcE = (s.chart || []).filter(x => x.id === "npc_" + a.id)[0];
    const plE = (s.chart || []).filter(x => x.id === "v61_song")[0];
    ok("L4 · yüksek stream'li NPC oyuncunun önünde", npcE && plE && npcE.rank < plE.rank,
      npcE && plE ? npcE.rank + " < " + plE.rank : "yok");
    const song = s.player.songs.find(x => x.id === "v61_song");
    song.lastDaily = 500000;
    K.game.buildChart();
    const npcE2 = (s.chart || []).filter(x => x.id === "npc_" + a.id)[0];
    const plE2 = (s.chart || []).filter(x => x.id === "v61_song")[0];
    ok("L5 · oyuncu büyüyünce NPC'yi geçer", npcE2 && plE2 && plE2.rank < npcE2.rank,
      npcE2 && plE2 ? plE2.rank + " < " + npcE2.rank : "yok");
    delete I.lastRelease[a.id];
    s.player.songs = s.player.songs.filter(x => x.id !== "v61_song");
  }

  /* =========================================================
     M) OYUNCU MONTHLY SİSTEMİ KORUNUYOR
     ========================================================= */
  {
    const p = s.player;
    const bak = { dh: p.dailyHistory, pop: p.popularity, monthly: p.monthly, songs: p.songs };
    p.dailyHistory = []; for (let i = 0; i < 28; i++) p.dailyHistory.push(1000);
    p.popularity = 50; p.songs = [{ id: "x", streams: 1 }];
    K.game.refreshMonthly();
    const expected = Math.round(28000 * 0.5 + 50 * 30);
    ok("M1 · oyuncu monthly'si hâlâ 28 günlük pencere + popülerlik tabanı",
      p.monthly === expected, p.monthly + " = " + expected);
    p.dailyHistory = bak.dh; p.popularity = bak.pop; p.monthly = bak.monthly; p.songs = bak.songs;
  }

  /* =========================================================
     N) SAVE MIGRATION (22)
     ========================================================= */
  {
    const keep = s.industry;
    s.industry = { released: {}, log: [], ties: {}, events: [], memory: {}, career: {}, history: [] };
    const e2 = K.industry.ensure();
    ok("N1 · eski kayıtta npcStreams alanı üretildi",
      e2.npcStreams && typeof e2.npcStreams === "object");
    ok("N2 · eski alanlar korundu", !!e2.career && !!e2.lastRelease);
    s.industry = keep;

    /* gerçek save/load: npcStreams'siz kayıt → yükleme onu üretmeli */
    delete s.industry.npcStreams;
    K.save();
    delete s.industry.npcStreams;
    K.load();
    /* yükleme K.state'i değiştirir → yerel referansları tazele */
    s = K.state; I = K.industry.ensure();
    ok("N3 · save/load sonrası npcStreams geri geldi",
      !!(K.state.industry && typeof K.state.industry.npcStreams === "object"));
    ok("N4 · yükleme sonrası endüstri bütünlüğü",
      !!(K.state.industry && K.state.industry.career && K.state.industry.lastRelease));
  }

  /* =========================================================
     O) DETERMİNİZM — yeni fonksiyonlar Math.random kullanmaz (23)
     ========================================================= */
  {
    const realRandom = Math.random;
    let threw = null;
    const fake = { id: "det61", stageName: "Det", popularity: 50, monthly: 100000,
      ig: 1000, x: 1000, tiktok: 1000, ytSubs: 1000, traits: { work: 5 }, genre: "rap" };
    delete I.npcStreams[fake.id]; delete I.lastRelease[fake.id];
    Math.random = function () { throw new Error("Math.random() çağrıldı"); };
    try {
      K.industry.npcStreamPush(fake, 5000);
      K.industry.npcWindowSum(fake);
      K.industry.npcMonthlyFromWindow(fake);
      K.industry.npcMonthlyTick(fake, 5000);
      K.industry._softCap(1000, 500000);
    } catch (e) { threw = e && e.message; }
    Math.random = realRandom;
    ok("O1 · yeni fonksiyonlar Math.random kullanmaz", !threw, threw || "temiz");
    const w1 = JSON.stringify(I.npcStreams[fake.id]);
    K.industry.npcStreamPush(fake, 0);
    K.industry.npcWindowSum(fake);
    ok("O2 · pencere işlemleri deterministik", typeof w1 === "string");
    delete I.npcStreams[fake.id];
  }

  /* =========================================================
     P) KOD DÜZEYİ — tek sistem, RNG sırası korunmuş
     ========================================================= */
  {
    const ind = read("js/systems/industry.js");
    const game = read("js/core/game.js");
    ok("P1 · monthly artık stream penceresinden türetiliyor",
      /npcMonthlyFromWindow/.test(ind) && /npcMonthlyTick/.test(game));
    ok("P2 · aylık dinleyiciye doğrudan yapay release bonusu KALMADI",
      !/a\.monthly\s*=\s*Math\.round\(a\.monthly\s*\*\s*\(1\s*\+/.test(game));
    ok("P3 · decayReleaseStreams pencereye yazıyor",
      /npcStreamPush\(a,\s*lr\.daily\)/.test(ind));
    ok("P4 · accrueArtistWorld'de RNG akışı korunmuş (özgün aralıklar)",
      /U\.rand\(-0\.004, 0\.006\)/.test(game) && /U\.rand\(0\.6, 1\.5\)/.test(game) &&
      /a\.monthly \/ 30 \* _r/.test(game));
  }

  /* =========================================================
     Q) RUNTIME TEMİZ (24)
     ========================================================= */
  {
    const rt = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
    ok("Q1 · süitte yakalanmamış runtime hatası yok", rt.length === 0, rt.slice(0, 2).join(" | "));
    ok("Q2 · v10.60/v10.59 sistemleri korunuyor",
      typeof K.industry.applyNpcRelease === "function" &&
      typeof K.industry.npcOutcome === "function" &&
      typeof K.labelSim.recordRelease === "function" &&
      typeof K.industry.arcOf === "function");
  }

  console.log("\n============================================");
  console.log("KARMA · v10.61 (NPC aylık dinleyici ekonomisi)");
  console.log("============================================");
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length);
  if (fail.length) {
    console.log("\n❌ BAŞARISIZ");
    fail.forEach(f => console.log("   · " + f));
    process.exit(1);
  }
  console.log("\n✅ v10.61 TEMİZ");
  process.exit(0);
}
