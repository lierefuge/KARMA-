/* Kullanım: node tools/smoke-v1060.js
   KARMA — v10.60: NPC RELEASE → EKONOMİ ENTEGRASYONU

   Neden bu süit var?
   ------------------
   v10.59'a kadar NPC yayını oyuncunun dünyasından KOPUK bir sayı
   sistemiydi:
     · ilk stream hesaplanmıyordu (sadece `monthly *= (1+gain)`)
     · flop'ta bile aylık dinleyici artıyordu
     · NPC kendi şarkısıyla chart'a GİREMİYORDU (yalnızca statik
       gerçek liste satırını `_boost` ile çarpıyordu)
     · trend ↔ release bağı yoktu
     · label gücü/prestiji NPC yayınını etkilemiyordu
     · feature yalnızca başlıkta "(feat. X)" idi, kitle etkisi yoktu
     · kariyer geçmişine stream/title/result yazılmıyordu
     · sosyal etkileşim HER platformda Instagram takipçisinden
       hesaplanıyordu (X→TikTok kitlesi, YouTube→IG kitlesi)

   v10.60 bu kopuklukları giderir ve oyuncunun mevcut ekonomisini
   BOZMAZ (mevcut RNG akışı korunur; ek hesaplar deterministiktir).

   Bu süit, istenen 16 senaryoyu kalıcı olarak kilitler:
     1 release oluşturma  2 hit  3 flop  4 stream  5 popularity
     6 monthly  7 chart etkisi  8 trend  9 label gücü  10 feature
     11 career history  12 career arc  13 player-NPC rekabeti
     14 platforma özel social  15 save migration  16 deterministik RNG

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

const { dom, errors } = H.bootDom(html, { seed: 20261060 });

H.whenReady(dom, {
  label: "v10.60 NPC release pipeline hazır",
  ready: (K) => !!(K && K.industry && K.industry.applyNpcRelease && K.industry.npcOutcome &&
    K.industry.npcFactors && K.social && K.social.platformFollowers && K.artistList().length)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exit(1);
});

function run(K) {
  const s = K.state;
  const I = K.industry.ensure();

  /* gün seç: verilen sanatçı + sonuç için deterministik bir gün bul */
  function findDayFor(a, outcome, from) {
    const start = from || 1;
    for (let d = start; d <= start + 3000; d++) {
      s.day = d;
      if (K.industry.npcOutcome(a) === outcome) return d;
    }
    return null;
  }

  const strong = K.artistList().slice().sort((x, y) => (y.monthly || 0) - (x.monthly || 0))[0];
  const lowLabel = K.LABELS.slice().sort((x, y) => x.power - y.power)[0];
  const strongLabel = K.LABELS.slice().sort((x, y) => y.power - x.power)[0];

  /* =========================================================
     A) MODÜL & API YÜZEYİ
     ========================================================= */
  {
    const api = ["applyNpcRelease", "npcOutcome", "npcFactors", "labelFactor", "trendMatch",
      "decayReleaseStreams", "_npcTrends", "careerOf", "recordCareer", "arcOf", "reactToCareer"];
    ok("A1 · v10.60 pipeline API'si tam", api.every(fn => typeof K.industry[fn] === "function"),
      api.filter(fn => typeof K.industry[fn] !== "function").join(", ") || "tam");
    ok("A2 · platformFollowers helper var", typeof K.social.platformFollowers === "function");
    ok("A3 · labelSim.recordRelease var", typeof K.labelSim.recordRelease === "function");
    ok("A4 · TREND_TAGS haritası dolu", Object.keys(K.industry.TREND_TAGS).length >= 5);
  }

  /* =========================================================
     B) NPC RELEASE OLUŞTURMA (1)
     ========================================================= */
  {
    s.day = 100;
    const a = strong;
    delete I.lastRelease[a.id];
    const res = K.industry.applyNpcRelease(a, { title: "Süit Single", art: null, featWith: null }, 0.1, false);
    ok("B1 · release sonucu üretildi", !!res && res.title === "Süit Single");
    ok("B2 · ilk stream > 0", res && res.initial > 0, res && String(res.initial));
    ok("B3 · günlük akış = ilk stream (başlangıç)", res && res.daily === res.initial);
    ok("B4 · sonuç tipi geçerli", res && ["hit", "flop", "normal"].indexOf(res.result) >= 0, res && res.result);
    ok("B5 · faktör kaydı tutuldu", res && res.factors && typeof res.factors.quality === "number");
  }

  /* =========================================================
     C) NPC HIT (2) + FLOP (3)
     ========================================================= */
  {
    const a = strong;
    const hitDay = findDayFor(a, "hit", 200);
    ok("C1 · deterministik hit günü bulundu", hitDay != null);
    const cBefore = K.industry.careerOf(a.id).hits || 0;
    K.industry.adjustNpcRelease(a, 0.1);
    K.industry.applyNpcRelease(a, { title: "Hit İş", featWith: null }, 0.1, false);
    ok("C2 · hit kariyer sayacına işlendi", (K.industry.careerOf(a.id).hits || 0) > cBefore, String(K.industry.careerOf(a.id).hits));
    ok("C3 · lastRelease sonucu 'hit'", I.lastRelease[a.id] && I.lastRelease[a.id].result === "hit");

    const b = K.artistList()[1];
    const flopDay = findDayFor(b, "flop", 200);
    ok("C4 · deterministik flop günü bulundu", flopDay != null);
    const fBefore = K.industry.careerOf(b.id).flops || 0;
    K.industry.adjustNpcRelease(b, 0.1);
    K.industry.applyNpcRelease(b, { title: "Flop İş", featWith: null }, 0.1, false);
    ok("C5 · flop kariyer sayacına işlendi", (K.industry.careerOf(b.id).flops || 0) > fBefore, String(K.industry.careerOf(b.id).flops));
    ok("C6 · lastRelease sonucu 'flop'", I.lastRelease[b.id] && I.lastRelease[b.id].result === "flop");
  }

  /* =========================================================
     D) STREAM ZİNCİRİ (4)
     ========================================================= */
  {
    s.day = 300;
    const a = K.artistList()[2];
    delete I.lastRelease[a.id];
    a._base = a.monthly;
    K.industry.applyNpcRelease(a, { title: "Akış İşi", featWith: null }, 0.1, false);
    const before = a.streams || 0;
    K.industry.decayReleaseStreams(a);
    ok("D1 · release sonrası akış sanatçıya yazıldı", (a.streams || 0) > before, (a.streams || 0) + " > " + before);
    ok("D2 · günlük akış söndü (0,93 kat)", I.lastRelease[a.id] && I.lastRelease[a.id].daily < I.lastRelease[a.id].initial);
    const t1 = I.lastRelease[a.id].total;
    K.industry.decayReleaseStreams(a);
    ok("D3 · toplam stream birikiyor", I.lastRelease[a.id].total > t1);

    const c = K.artistList()[3];
    delete I.lastRelease[c.id];
    const cb = c.streams || 0;
    K.industry.decayReleaseStreams(c);
    ok("D4 · release yoksa akış eklenmez", (c.streams || 0) === cb);
  }

  /* =========================================================
     E) POPULARITY ETKİSİ (5)
     ========================================================= */
  {
    const a = K.artistList()[4];
    findDayFor(a, "hit", 500);
    a.popularity = 60;
    K.industry.adjustNpcRelease(a, 0.1);
    const afterHit = a.popularity;
    ok("E1 · hit popülerliği artırdı", afterHit > 60, "60 → " + afterHit);

    const b = K.artistList()[5];
    findDayFor(b, "flop", 500);
    b.popularity = 60;
    K.industry.adjustNpcRelease(b, 0.1);
    ok("E2 · flop popülerliği azalttı", b.popularity < 60, "60 → " + b.popularity);
    ok("E3 · popülerlik 30–99 aralığında", a.popularity >= 30 && a.popularity <= 99 && b.popularity >= 30 && b.popularity <= 99);
    ok("E4 · hit kazancı pozitif ve ölçülü (< 1,2)", afterHit - 60 > 0 && afterHit - 60 < 1.2, String(afterHit - 60));
    ok("E5 · flop kaybı ölçülü (< 1,0)", 60 - b.popularity < 1.0, String(60 - b.popularity));
  }

  /* =========================================================
     F) MONTHLY LISTENER (6)
     ========================================================= */
  {
    const a = K.artistList()[6];
    a._base = a.monthly = 1000000;
    findDayFor(a, "hit", 700);
    K.industry.applyNpcRelease(a, { title: "Aylık Hit", featWith: null }, 0.1, false);
    ok("F1 · hit aylık tabanı büyüttü", a._base > 1000000, String(Math.round(a._base)));
    ok("F2 · hit artışı ılımlı (< %2)", a._base / 1000000 < 1.02, String(a._base / 1000000));

    const b = K.artistList()[7];
    b._base = b.monthly = 1000000;
    findDayFor(b, "flop", 700);
    K.industry.applyNpcRelease(b, { title: "Aylık Flop", featWith: null }, 0.1, false);
    ok("F3 · flop aylık tabanı küçülttü", b._base < 1000000, String(Math.round(b._base)));
    ok("F4 · flop düşüşü ılımlı (< %2)", 1 - b._base / 1000000 < 0.02);
    ok("F5 · taban 50.000 altına inmez", b._base >= 50000);

    const c = K.artistList()[8];
    c._base = c.monthly = 1000000;
    findDayFor(c, "normal", 700);
    K.industry.applyNpcRelease(c, { title: "Aylık Normal", featWith: null }, 0.1, false);
    ok("F6 · normal sonuç tabanı değiştirmez", Math.abs(c._base - 1000000) < 1, String(Math.round(c._base)));
  }

  /* =========================================================
     G) CHART ETKİSİ (7)
     ========================================================= */
  {
    const a = strong;
    findDayFor(a, "hit", 900);
    K.industry.adjustNpcRelease(a, 0.1);
    K.industry.applyNpcRelease(a, { title: "Chart Hit", featWith: null }, 0.1, false);
    K.game.buildChart();
    const entry = (s.chart || []).filter(e => e.id === "npc_" + a.id)[0];
    ok("G1 · NPC yayını chart'a girdi", !!entry, entry ? "günlük " + entry.daily : "yok");
    ok("G2 · NPC chart satırı doğru işaretli", entry && entry.npc === true && entry.mine === false);
    ok("G3 · chart satırında günlük dinlenme var", entry && entry.daily > 0);
    ok("G4 · chart 50 satırla sınırlı", (s.chart || []).length <= 50);
  }

  /* =========================================================
     H) TREND BAĞLANTISI (8)
     ========================================================= */
  {
    s.trends = [{ tag: "#TrapTürkiye", count: 800000 }];
    ok("H1 · trend eşleşmesi pozitif", K.industry.trendMatch("trap") > 0, String(K.industry.trendMatch("trap")));
    ok("H2 · trend dışı tür 0 döner", K.industry.trendMatch("klasik") === 0);
    s.trends = [{ tag: "#Rap", count: 500000 }];
    ok("H3 · rap trendi rap türüyle eşleşir", K.industry.trendMatch("rap") > 0);

    s.day = 1000;
    I.lastRelease = I.lastRelease || {};
    I.lastRelease["tr_test"] = { day: 1000, title: "Trend Parçası", initial: 500000, daily: 500000, total: 500000, result: "hit" };
    s.trends = [{ tag: "#Eski", count: 1000 }];
    K.industry._npcTrends();
    ok("H4 · NPC hit'i gündeme trend olarak düştü", s.trends.some(t => t.npc === true), JSON.stringify(s.trends.map(t => t.tag)));
    delete I.lastRelease["tr_test"];
  }

  /* =========================================================
     I) LABEL GÜCÜ / PRESTİJ (9)
     ========================================================= */
  {
    const fStrong = K.industry.labelFactor({ labelId: strongLabel.id });
    const fWeak = K.industry.labelFactor({ labelId: lowLabel.id });
    ok("I1 · güçlü label faktörü daha yüksek", fStrong > fWeak, fStrong.toFixed(3) + " > " + fWeak.toFixed(3));
    ok("I2 · label faktörü 0,9–1,25 aralığında", fStrong <= 1.25 && fWeak >= 0.9);
    ok("I3 · labelsiz sanatçı nötr faktör alır", Math.abs(K.industry.labelFactor({}) - 0.95) < 0.001);

    /* AYNI id + gün + başlık → kalite tohumu aynı; TEK fark label.
       Böylece "güçlü label daha çok ilk stream" izole biçimde ölçülür. */
    s.day = 1100;
    const base = { stageName: "LblTest", popularity: 60, monthly: 2000000, ig: 500000, x: 100000, tiktok: 300000, ytSubs: 200000, traits: { work: 5 }, genre: "rap" };
    const a1 = Object.assign({}, base, { id: "lbl_test", labelId: strongLabel.id });
    delete I.lastRelease[a1.id];
    const r1 = K.industry.applyNpcRelease(a1, { title: "Lbl", featWith: null }, 0.1, false);
    const a2 = Object.assign({}, base, { id: "lbl_test", labelId: lowLabel.id });
    delete I.lastRelease[a2.id];
    const r2 = K.industry.applyNpcRelease(a2, { title: "Lbl", featWith: null }, 0.1, false);
    ok("I4 · güçlü label daha çok ilk stream verir", r1.initial > r2.initial, r1.initial + " > " + r2.initial);
    ok("I5 · label başarıyı GARANTİ etmez (faktör ≤ 1,25)", r1.factors.label <= 1.25, String(r1.factors.label));
  }

  /* =========================================================
     J) FEATURE KİTLESİ (10)
     ========================================================= */
  {
    s.day = 1200;
    const base = { stageName: "FeatTest", popularity: 60, monthly: 2000000, ig: 500000, x: 100000, tiktok: 300000, ytSubs: 200000, traits: { work: 5 }, genre: "rap" };
    const solo = Object.assign({}, base, { id: "feat_test" });
    delete I.lastRelease[solo.id];
    const rs = K.industry.applyNpcRelease(solo, { title: "Aynı", featWith: null }, 0.1, false);
    const duet = Object.assign({}, base, { id: "feat_test" });
    delete I.lastRelease[duet.id];
    const rd = K.industry.applyNpcRelease(duet, { title: "Aynı", featWith: strong.id }, 0.1, false);
    ok("J1 · feature'lı iş daha çok ilk stream alır", rd.initial > rs.initial, rd.initial + " > " + rs.initial);
    ok("J2 · feature ortağı kaydedildi", rd.featWith === strong.id);
    ok("J3 · feature ortağının adı kaydedildi", rd.featName === strong.stageName);
    ok("J4 · feature iki kitlenin takipçisini birleştirir", (duet.ig || 0) > (solo.ig || 0), (duet.ig || 0) + " > " + (solo.ig || 0));
  }

  /* =========================================================
     K) KARİYER GEÇMİŞİ (11)
     ========================================================= */
  {
    s.day = 1300;
    const a = K.artistList()[10];
    const cBefore = K.industry.careerOf(a.id).streams || 0;
    K.industry.applyNpcRelease(a, { title: "Kariyer İşi", featWith: null }, 0.1, false);
    const c = K.industry.careerOf(a.id);
    ok("K1 · kariyer toplam stream arttı", (c.streams || 0) > cBefore, String(c.streams));
    ok("K2 · release log kaydı oluştu", c.releaseLog && c.releaseLog.length > 0);
    ok("K3 · log'da başlık/stream/sonuç var", c.releaseLog[0].title === "Kariyer İşi" && c.releaseLog[0].streams > 0 && !!c.releaseLog[0].result);
    ok("K4 · lastReleaseInfo güncellendi", c.lastReleaseInfo && c.lastReleaseInfo.title === "Kariyer İşi");
    ok("K5 · release log 10 kayıtla sınırlı", c.releaseLog.length <= 10);
  }

  /* =========================================================
     L) KARİYER YAYI (12)
     ========================================================= */
  {
    const a = K.artistList()[11];
    a.popularity = 60;
    const c = K.industry.careerOf(a.id);
    c.peakPop = 90; c.releases = 6; c.hits = 4; c.flops = 0; c.recent = [1, 1, 1, 1]; c.lastFlop = 0;
    s.day = 1400;
    const arc1 = K.industry.arcOf(a.id);
    ok("L1 · hit serisi yükselen/viral yay üretir", ["yukselen", "viral", "zirvede"].indexOf(arc1) >= 0, arc1);

    c.recent = [-1, -1, -1, -1]; c.flops = 4; c.hits = 0; c.lastFlop = s.day - 30;
    const arc2 = K.industry.arcOf(a.id);
    ok("L2 · flop serisi düşüş yayı üretir", arc2 === "dususte", arc2);
    ok("L3 · arcOf deterministik", K.industry.arcOf(a.id) === arc2);
    ok("L4 · arcInfo sanatçı için yay bilgisi verir", !!K.industry.arcInfo(a.id) && !!K.industry.arcInfo(a.id).label);
  }

  /* =========================================================
     M) OYUNCU ↔ NPC CHART REKABETİ (13)
     ========================================================= */
  {
    s.day = 1500;
    const npc = strong;
    I.lastRelease[npc.id] = { day: 1500, title: "NPC Rakip", initial: 150000, daily: 150000, total: 150000, result: "normal" };
    s.player.songs = (s.player.songs || []).filter(x => x.id !== "cmp_song");
    s.player.songs.push({ id: "cmp_song", title: "Oyuncu Şarkısı", publishedDay: 1497, lastDaily: 100000, streams: 300000, coverSeed: "x" });
    K.game.buildChart();
    const npcE = (s.chart || []).filter(e => e.id === "npc_" + npc.id)[0];
    const plE = (s.chart || []).filter(e => e.id === "cmp_song")[0];
    ok("M1 · NPC ve oyuncu aynı chart'ta", !!npcE && !!plE, "npc " + (npcE && npcE.rank) + " · oyuncu " + (plE && plE.rank));
    ok("M2 · yüksek stream'li NPC oyuncunun önünde", npcE && plE && npcE.rank < plE.rank, npcE && plE ? npcE.rank + " < " + plE.rank : "yok");

    const cmp = s.player.songs.filter(x => x.id === "cmp_song")[0];
    cmp.lastDaily = 400000; cmp.streams = 2000000;
    K.game.buildChart();
    const npcE2 = (s.chart || []).filter(e => e.id === "npc_" + npc.id)[0];
    const plE2 = (s.chart || []).filter(e => e.id === "cmp_song")[0];
    ok("M3 · oyuncu büyüyünce NPC'nin önüne geçer", npcE2 && plE2 && plE2.rank < npcE2.rank, npcE2 && plE2 ? plE2.rank + " < " + npcE2.rank : "yok");
    ok("M4 · sıralama günlük dinlenmeye göre gerçek", !!npcE2 && !!plE2 && npcE2.daily < plE2.daily);
    delete I.lastRelease[npc.id];
  }

  /* =========================================================
     N) PLATFORMA ÖZEL SOSYAL ETKİLEŞİM (14)
     ========================================================= */
  {
    const a = { ig: 1000, x: 2000, tiktok: 3000, ytSubs: 4000, popularity: 50 };
    ok("N1 · X gönderisi X takipçisini kullanır", K.social.platformFollowers(a, "x") === 2000);
    ok("N2 · TikTok gönderisi TikTok takipçisini kullanır", K.social.platformFollowers(a, "tiktok") === 3000);
    ok("N3 · YouTube gönderisi abone sayısını kullanır", K.social.platformFollowers(a, "youtube") === 4000);
    ok("N4 · Instagram gönderisi IG takipçisini kullanır", K.social.platformFollowers(a, "instagram") === 1000);
    ok("N5 · eksik platform verisi IG'ye düşer", K.social.platformFollowers({ ig: 1000, popularity: 50 }, "x") === 1000);
    ok("N6 · tüm veri yoksa popülerlikten türetir", K.social.platformFollowers({ popularity: 50 }, "x") > 0);
  }

  /* =========================================================
     O) DETERMİNİSTİK RNG (16)
     ========================================================= */
  {
    const realRandom = Math.random;
    let threw = null;
    const fake = { id: "det_x", stageName: "Det", popularity: 50, monthly: 100000, ig: 1000, x: 1000, tiktok: 1000, ytSubs: 1000, traits: { work: 5 }, genre: "rap" };
    Math.random = function () { throw new Error("Math.random() çağrıldı"); };
    try {
      K.industry.npcOutcome(fake);
      K.industry.npcFactors(fake, { title: "D" });
      K.industry.labelFactor(fake);
      K.industry.trendMatch("rap");
      K.industry.applyNpcRelease(fake, { title: "Det Single", featWith: null }, 0.1, false);
      K.industry.decayReleaseStreams(fake);
      K.industry._npcTrends();
    } catch (e) { threw = e && e.message; }
    Math.random = realRandom;
    ok("O1 · yeni fonksiyonlar Math.random kullanmaz", !threw, threw || "temiz");
    ok("O2 · npcOutcome aynı girdi → aynı sonuç", K.industry.npcOutcome(fake) === K.industry.npcOutcome(fake));
    const f1 = K.industry.npcFactors(fake, { title: "D" });
    const f2 = K.industry.npcFactors(fake, { title: "D" });
    ok("O3 · npcFactors deterministik", f1.quality === f2.quality && f1.label === f2.label && f1.trend === f2.trend);
    ok("O4 · labelFactor deterministik", K.industry.labelFactor(fake) === K.industry.labelFactor(fake));
    delete I.lastRelease[fake.id];
  }

  /* =========================================================
     P) ESKİ SAVE MIGRATION (15)
     ========================================================= */
  {
    const keep = s.industry;
    s.industry = { released: {}, log: [], ties: {}, events: [], memory: {}, career: {}, history: [] };
    const e2 = K.industry.ensure();
    ok("P1 · migration lastRelease üretti", e2.lastRelease && typeof e2.lastRelease === "object");
    ok("P2 · eski alanlar korundu", !!e2.ties && !!e2.memory && !!e2.career);
    s.industry = keep;

    /* gerçek save/load döngüsü: lastRelease'siz kayıt → yükleme onu üretmeli */
    delete s.industry.lastRelease;
    K.save();
    delete s.industry.lastRelease;
    K.load();
    ok("P3 · save/load sonrası lastRelease geri geldi", !!(K.state.industry && typeof K.state.industry.lastRelease === "object"));
    ok("P4 · yükleme sonrası endüstri bütünlüğü", !!(K.state.industry && K.state.industry.released && K.state.industry.career));
  }

  /* =========================================================
     Q) RUNTIME TEMİZ
     ========================================================= */
  {
    const rt = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
    ok("Q1 · süitte yakalanmamış runtime hatası yok", rt.length === 0, rt.slice(0, 2).join(" | "));
    ok("Q2 · v10.59 sistemleri korunuyor",
      typeof K.industry.memoryOf === "function" && typeof K.labelSim.transfer === "function" &&
      typeof K.industry.reactToCareer === "function" && typeof K.industry.memoryBetween === "function");
  }

  console.log("\n============================================");
  console.log("KARMA · v10.60 (NPC release → ekonomi)");
  console.log("============================================");
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length);
  if (fail.length) {
    console.log("\n❌ BAŞARISIZ");
    fail.forEach(f => console.log("   · " + f));
    process.exit(1);
  }
  console.log("\n✅ v10.60 TEMİZ");
  process.exit(0);
}
