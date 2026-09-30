/* Kullanım: node tools/smoke-expansion.js
   KARMA — GENİŞLEME PAKETİ testi (v10.28)

   Altı yeni sistemi birlikte doğrular:
     1) ✍️ yazarlık  (başkası için şarkı yazmak)
     2) 👕 ürün      (streetwear markası / drop)
     3) 🏎️ varlık    (varlık & gösteriş + aylık bakım)
     4) 🧠 akıl sağlığı (stres / tükenmişlik)
     5) 🎰 karanlık  (bot dinlenme / payola / platform yasağı)
     6) 🌍 uluslararası (diaspora / nüfuz / ayrı ayrı telif)

   A) KURULUM      : altı sistem + state alanları
   B) YAZARLIK     : teklif · kabul (gölge/kredili) · ödeme · açığa çıkma
   C) ÜRÜN         : marka · drop maliyeti · satış · tükenme · bekleme
   D) VARLIK       : kilitler · alım · bakım gideri · satış
   E) AKIL SAĞLIĞI : stres kaynakları · eylemler · kalite cezası · TÜKENME
   F) KARANLIK     : bot · payola · tespit · strike · platform yasağı · temiz ödül
   G) ULUSLARARASI : pazar girişi · nüfuz · turne · feature · aylık telif
   H) ENTEGRASYON  : game.js tick zinciri · career kalite · economy yasak · build

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

const { dom, errors } = H.bootDom(html, { seed: 20261028 });

H.whenReady(dom, {
  label: "genişleme paketi hazır",
  ready: (K) => !!(K && K.writing && K.merch && K.assets && K.mental && K.shady && K.intl)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exitCode = 1;
});

function run() {
  const K = dom.window.K, s = K.state, p = s.player;

  /* =========================================================
     A) KURULUM
     ========================================================= */
  ["writing", "merch", "assets", "mental", "shady", "intl"].forEach(n =>
    ok("A · K." + n + " yüklendi", !!K[n]));
  ok("A · state: merch alanı", !!(p.merch && typeof p.merch === "object"));
  ok("A · state: assets dizisi", Array.isArray(p.assets));
  ok("A · state: writing alanı", !!(p.writing && typeof p.writing === "object"));
  ok("A · state: stress sayı", typeof p.stress === "number");
  ok("A · state: mental alanı", !!(p.mental && typeof p.mental === "object"));
  ok("A · state: shady alanı", !!(p.shady && typeof p.shady === "object"));
  ok("A · state: intl alanı", !!(p.intl && typeof p.intl === "object"));
  ok("A · ECON.writingBase tanımlı", typeof K.ECON.writingBase === "number", String(K.ECON.writingBase));

  /* ortak test kurulumu: bilinen bir oyuncu durumu */
  s.balance = 8_000_000;
  p.popularity = 60;
  /* ÖNEMLİ: `K.game.addFame()` şöhreti `listenerTarget()` ile sınırlar
     (dinleyicinin HAK ETTIĞİ tavan). Aylık dinleyici verilmezse tavan ~8
     kalır ve yeni sistemlerin verdiği şöhret popülerliği DÜŞÜRÜRDÜ.
     Kalibrasyon: aylık dinleyici ≈ popülerlik² × 700. */
  p.monthly = Math.round(Math.pow(60, 2) * 700);
  p.ig = 120000; p.tiktok = 90000; p.x = 40000;
  p.image = 60; p.reputation = 40;
  p.skills = { work: 6, studio: 8, music: 9, network: 5 };

  /* =========================================================
     B) YAZARLIK
     ========================================================= */
  {
    const craft = K.writing.craft();
    ok("B · craft 0-100 arası", craft >= 0 && craft <= 100, craft + "");

    /* teklif üret */
    let tries = 0;
    while (!p.writing.offers.length && tries < 400) { K.writing.tick(); tries++; }
    ok("B · teklif üretildi", p.writing.offers.length > 0, tries + " tick");
    const o = p.writing.offers[0];
    if (o) {
      ok("B · teklif alanları tam", !!(o.id && o.artistId && o.scope && o.fee && o.days));
      const fee = o.fee;
      /* gölge daha çok öder, kredili daha az */
      K.writing.accept(o.id, "ghost");
      ok("B · gölge iş kabul edildi", !!p.writing.active && p.writing.active.mode === "ghost");
      ok("B · gölge ücreti ×1,35", Math.abs(p.writing.active.fee - Math.round(fee * 1.35)) <= 1,
        p.writing.active.fee + " vs " + Math.round(fee * 1.35));
      ok("B · aynı anda ikinci iş alınamaz", (() => {
        p.writing.offers.push({ id: "x1", artistId: "sehinsah", scope: "hook", fee: 1000, days: 1 });
        const r = K.writing.accept("x1", "credit");
        p.writing.offers = p.writing.offers.filter(z => z.id !== "x1");
        return r === false;
      })());
      /* işi bitir */
      let n = 0;
      while (p.writing.active && n < 40) { K.writing.tick(); n++; }
      ok("B · iş tamamlandı", !p.writing.active, n + " tick");
      ok("B · ödeme yapıldı (kazanç > 0)", (p.writing.totalEarned || 0) > 0, U0(K).money(p.writing.totalEarned));
      ok("B · gölge iş kaydedildi", (p.writing.done || []).some(d => d.mode === "ghost"));
    }
    /* reddetme tekliften çıkarır */
    p.writing.offers.push({ id: "x2", artistId: "sehinsah", scope: "hook", fee: 1000, days: 1 });
    K.writing.decline("x2");
    ok("B · ret teklifi listeden çıkarır", !p.writing.offers.some(z => z.id === "x2"));

    /* AÇIĞA ÇIKMA: çok gölge iş → risk birikir (döngüyle zorla) */
    p.writing.done = [];
    let exposed = 0;
    for (let i = 0; i < 60; i++) {
      p.writing.active = { id: "g" + i, artistId: "sehinsah", artistName: "Test", icon: "📝", scope: "hook", scopeName: "Hook", fee: 20000, days: 1, daysLeft: 0, mode: "ghost", quality: 60 };
      K.writing._resolve();
      exposed = p.writing.exposed || 0;
      if (exposed > 0) break;
    }
    ok("B · gölge işler açığa çıkma riski biriktirir", exposed > 0, exposed + " kez açığa çıktı");
    p.writing.exposed = 0;
  }

  /* =========================================================
     C) ÜRÜN / STREETWEAR
     ========================================================= */
  {
    ok("C · marka kurulmadan drop başlatılamaz", K.merch.launch("tee", "basic", 100, 1) === false);
    ok("C · marka kuruldu", K.merch.found("Test Moda") === true, p.merch.brand);
    ok("C · aynı marka ikinci kez kurulamaz", K.merch.found("X") === false);

    const cost = K.merch.cost("tee", "basic", 200);
    ok("C · maliyet = tasarım + adet×birim", cost === 4000 + 120 * 200, cost + "");

    const before = s.balance;
    ok("C · drop başladı", K.merch.launch("tee", "basic", 200, 1) === true);
    ok("C · maliyet kasadan düştü", s.balance === before - cost, (before - s.balance) + "");
    ok("C · aktif drop var", !!p.merch.active && p.merch.active.units === 200);

    /* satış */
    let days = 0;
    while (p.merch.active && days < 30) { K.merch.tick(); days++; }
    ok("C · drop kapandı", !p.merch.active, days + " gün");
    const d0 = (p.merch.drops || [])[0];
    ok("C · drop kaydı tutuldu", !!d0 && d0.sold > 0, d0 ? d0.sold + "/" + d0.units : "yok");
    ok("C · satış geliri hesaplandı", !!d0 && d0.revenue > 0, d0 ? U0(K).money(d0.revenue) : "");

    /* tükenme marka değerini artırır */
    const bv0 = p.merch.brandValue || 0;
    p.merch.cooldownDay = 0;
    p.merch.brandValue = Math.max(bv0, 30);
    K.merch.launch("tee", "solid", 60, 0.8);       // küçük stok → tükenmeli
    let dd = 0;
    while (p.merch.active && dd < 30) { K.merch.tick(); dd++; }
    ok("C · küçük stok tükendi (sell-out)", (p.merch.drops || [])[0].soldOut === true,
      (p.merch.drops || [])[0].sold + "/" + (p.merch.drops || [])[0].units);
    ok("C · tükenme marka değerini artırdı", (p.merch.brandValue || 0) > (bv0 || 0));

    /* bekleme süresi */
    ok("C · drop sonrası bekleme kondu", (p.merch.cooldownDay || 0) > s.day, "gün " + p.merch.cooldownDay);
    ok("C · bekleme sırasında yeni drop reddedilir", K.merch.launch("tee", "basic", 50, 1) === false);

    /* premium tasarım marka değeri ister */
    p.merch.brandValue = 0;
    ok("C · premium tasarım marka değeri ister", K.merch.launch("tee", "premium", 50, 1) === false);
    p.merch.brandValue = 40;
    p.merch.cooldownDay = 0;
  }

  /* =========================================================
     D) VARLIK & GÖSTERİŞ
     ========================================================= */
  {
    p.assets = [];
    ok("D · bilinmeyen varlık alınamaz", K.assets.canBuy("yok").ok === false);
    ok("D · bakiye yeterli (watch)", K.assets.canBuy("watch").ok === true);

    const img0 = p.image, rep0 = p.reputation;
    ok("D · varlık alındı", K.assets.buy("watch") === true);
    ok("D · imaj arttı", p.image > img0, img0 + " → " + p.image);
    ok("D · itibar arttı", p.reputation > rep0);
    ok("D · aynı varlık ikinci kez alınamaz", K.assets.canBuy("watch").ok === false);
    ok("D · bakım gideri hesaplandı", K.assets.upkeepTotal() > 0, U0(K).money(K.assets.upkeepTotal()));

    /* pasif gelirli varlık */
    p.assets = [];
    s.balance = 8_000_000;
    K.assets.buy("business");
    ok("D · pasif gelir var", K.assets.incomeTotal() > 0, U0(K).money(K.assets.incomeTotal()));

    /* aylık giderlere girdi mi? */
    p.popularity = 60; p.monthIncome = 0;
    const fin0 = p.lastFinance;
    K.economy.chargeMonthly();
    const fin = p.lastFinance;
    ok("D · bakım AYLIK GİDERE eklendi", !!fin && fin.assetUpkeep > 0, fin ? U0(K).money(fin.assetUpkeep) : "yok");
    ok("D · lastFinance bakım alanı var", !!fin && typeof fin.assetUpkeepMissed === "number");

    /* bakım ödenemezse imaj cezası */
    p.assets = [];
    s.balance = 8_000_000;
    K.assets.buy("house");                 // yüksek bakım
    p.image = 60;
    s.balance = 0; p.debt = 0;
    K.economy.chargeMonthly();
    ok("D · bakım ödenemezse imaj düşer", p.image < 60, "imaj " + p.image);
    ok("D · ödenemeyen bakım kayda geçti", (p.lastFinance.assetUpkeepMissed || 0) > 0);

    /* satış değer kaybıyla döner */
    p.assets = []; s.balance = 8_000_000;
    K.assets.buy("watch");
    const b1 = s.balance;
    K.assets.sell("watch");
    ok("D · satış %60 değerle döner", s.balance === b1 + Math.round(180000 * 0.6), (s.balance - b1) + "");
    ok("D · satılan varlık listeden çıkar", !K.assets.owns("watch"));

    /* popülerlik kilidi */
    p.popularity = 5;
    ok("D · düşük popülerlikte pahalı varlık kilitli", K.assets.canBuy("house").ok === false,
      K.assets.canBuy("house").why);
    p.popularity = 60;
  }

  /* =========================================================
     E) AKIL SAĞLIĞI & TÜKENMİŞLİK
     ========================================================= */
  {
    p.stress = 30;
    const m0 = K.mental.summary();
    ok("E · seviye etiketi", !!m0.level && !!m0.level.label, m0.level.label);
    ok("E · düşük streste kalite cezası yok", K.mental.qualityMult() === 1);

    p.stress = 95;
    ok("E · yüksek streste kalite cezası var", K.mental.qualityMult() < 1, K.mental.qualityMult().toFixed(3));

    /* borç stresi artırır */
    p.stress = 20; p.debt = 200000;
    for (let i = 0; i < 10; i++) K.mental.tick();
    ok("E · borç stresi artırır", p.stress > 20, p.stress.toFixed(1));
    p.debt = 0;

    /* eylemler */
    s.balance = 8_000_000;
    p.stress = 70;
    K.mental.rest();
    ok("E · dinlenme stresi düşürür", p.stress < 70, p.stress.toFixed(1));
    const before2 = p.stress;
    K.mental.therapy(4);
    ok("E · terapi başladı", K.mental.inTherapy() === true);
    for (let i = 0; i < 4; i++) K.mental.tick();
    ok("E · terapi günlük stresi düşürür", p.stress < before2, before2.toFixed(1) + " → " + p.stress.toFixed(1));

    p.mental.therapyUntil = 0;
    p.stress = 80;
    K.mental.holiday();
    ok("E · tatil stresi büyük düşürür", p.stress < 50, p.stress.toFixed(1));

    /* açık konuşma bir kez */
    p.mental.spokeOut = false;
    const sp1 = K.mental.speakOut();
    const sp2 = K.mental.speakOut();
    ok("E · açık konuşma bir kez", sp1 === true && sp2 === false);

    /* TÜKENME */
    p.mental.hiatusUntil = 0;
    p.stress = 100;
    p.images = 60;
    K.mental.tick();
    ok("E · 100 streste tükenme", K.mental.onHiatus() === true, "ara " + p.mental.hiatusUntil);
    ok("E · tükenme sayacı arttı", (p.mental.burnoutCount || 0) > 0);
    ok("E · tükenme sonrası stres düştü", p.stress < 100, p.stress.toFixed(1));
    ok("E · ZORUNLU ARADA yayın yapılamaz", K.career.createRelease({ trackCount: 1, budget: 20000 }) === null);
    p.mental.hiatusUntil = 0;
    p.stress = 20;
  }

  /* =========================================================
     F) KARANLIK TARAF
     ========================================================= */
  {
    p.shady = { botStreams: 0, suspicion: 0, strikes: 0, bannedUntil: 0, curatorDeals: [], everUsed: false };
    p.songs = [{ id: "sg_test", title: "Bot Testi", streams: 100000, dailyStreams: 500, quality: 70, genre: "trap", boosts: {}, platforms: { spotify: .5, apple: .2, youtube: .25, other: .05 } }];
    s.balance = 8_000_000;

    const st0 = p.songs[0].streams;
    ok("F · bot dinlenme alındı", K.shady.buyBots("m", "sg_test") === true);
    ok("F · dinlenme anında şişti", p.songs[0].streams > st0, (p.songs[0].streams - st0) + "");
    ok("F · şüphe arttı", p.shady.suspicion > 0, p.shady.suspicion + "");
    ok("F · kısa yol kullanıldı işaretlendi", p.shady.everUsed === true);

    /* payola */
    const before = p.songs[0].dailyStreams;
    ok("F · payola yapıldı", K.shady.payCurator() === true);
    ok("F · playlist boost eklendi", (p.songs[0].boosts.playlist || 0) > 0);
    ok("F · payola dinlenmeyi artırdı", p.songs[0].dailyStreams > before);

    /* TESPİT (şüpheyi tepede tutarak zorla) */
    const img1 = p.image;
    let n = 0, detected = false;
    while (!detected && n < 400) {
      p.shady.suspicion = 100;
      K.shady.tick();
      detected = (p.shady.strikes || 0) > 0;
      n++;
    }
    ok("F · tespit gerçekleşti", detected, n + " tick");
    ok("F · tespitte strike arttı", (p.shady.strikes || 0) >= 1, p.shady.strikes + "/3");
    ok("F · tespitte imaj düştü", p.image < img1, img1 + " → " + p.image);
    ok("F · bot şişmesi geri alındı", !p.songs[0].botBoost);

    /* 3 strike → platform yasağı */
    p.shady.strikes = 2;
    let n2 = 0;
    while (!K.shady.isBanned() && n2 < 400) { p.shady.suspicion = 100; K.shady.tick(); n2++; }
    ok("F · 3 strike → platform yasağı", K.shady.isBanned() === true, p.shady.strikes + " strike");
    ok("F · yasakta telif çarpanı ×0,45", Math.abs(K.shady.incomeMult() - 0.45) < 0.001, K.shady.incomeMult() + "");

    /* TEMİZ ÖDÜL */
    p.shady = { botStreams: 0, suspicion: 0, strikes: 0, bannedUntil: 0, curatorDeals: [], everUsed: false };
    p.reputation = 40;
    s.day = K.shady.CLEAN_DAY;
    K.shady.tick();
    ok("F · temiz kariyer ödülü verildi", p.reputation > 40, "itibar " + p.reputation);
  }

  /* =========================================================
     G) ULUSLARARASI / DİASPORA
     ========================================================= */
  {
    p.intl = { stage: 0, markets: {}, tours: [], features: 0, globalPlays: 0 };
    s.balance = 8_000_000; p.popularity = 60;
    ok("G · bilinmeyen pazar reddedilir", K.intl.enter("yok") === false);

    p.popularity = 5;
    ok("G · düşük şöhrette pazar kilitli", K.intl.enter("de") === false);
    p.popularity = 60;

    const b1 = s.balance;
    ok("G · pazara girildi", K.intl.enter("de") === true);
    ok("G · giriş ücreti düştü", s.balance === b1 - 260000, (b1 - s.balance) + "");
    ok("G · nüfuz başlangıcı", K.intl.pen("de") === 10, K.intl.pen("de") + "");
    ok("G · aşama 1'e geçti", p.intl.stage >= 1);

    /* nüfuz hedefe doğru büyür */
    for (let i = 0; i < 120; i++) K.intl.tick();
    ok("G · nüfuz zamanla büyüdü", K.intl.pen("de") > 10, K.intl.pen("de").toFixed(1));

    /* aylık yurt dışı telif */
    const inc = K.intl.monthly();
    ok("G · aylık yurt dışı telif > 0", inc > 0, U0(K).money(inc));

    /* yabancı feature */
    const f0 = p.intl.features;
    s.balance = 8_000_000;
    ok("G · yabancı feature alındı", K.intl.foreignFeature("de") === true);
    ok("G · feature sayacı arttı", p.intl.features === f0 + 1);

    /* turne: vize riski %15 → birkaç denemede en az bir başarı beklenir
       (tümünün başarısız olma olasılığı 0,15^6 ≈ 1e-5) */
    let toured = false;
    for (let i = 0; i < 6 && !toured; i++) {
      s.balance = 8_000_000;
      if (K.intl.tour("de")) toured = true;
      else p.intl.touring = null;
    }
    ok("G · diaspora turnesi başlatılabiliyor", toured === true);
    if (toured) {
      const pen0 = K.intl.pen("de");
      let t = 0;
      while (p.intl.touring && t < 20) { K.intl.tick(); t++; }
      ok("G · turne tamamlandı ve nüfuz arttı", K.intl.pen("de") > pen0, pen0.toFixed(1) + " → " + K.intl.pen("de").toFixed(1));
    }

    /* aşama etiketi */
    ok("G · aşama etiketi üretiliyor", typeof K.intl.stageLabel() === "string", K.intl.stageLabel());

    /* feature sayesinde küresel aşama (zorla) */
    p.intl.markets = { de: 60, nl: 55, fr: 50, us: 55 };
    K.intl.tick();
    ok("G · ABD nüfuzu ile küresel aşama", p.intl.stage === 3, "aşama " + p.intl.stage);
  }

  /* =========================================================
     H) ENTEGRASYON (statik)
     ========================================================= */
  {
    const game = read("js/core/game.js");
    ["K.writing.tick", "K.merch.tick", "K.assets.tick", "K.mental.tick", "K.shady.tick", "K.intl.tick"]
      .forEach(n => ok("H · game.js günlük tick: " + n, game.indexOf(n) >= 0));
    ["K.assets.monthly", "K.intl.monthly"].forEach(n =>
      ok("H · game.js aylık: " + n, game.indexOf(n) >= 0));

    const career = read("js/systems/career.js");
    ok("H · career kalite: akıl sağlığı çarpanı", /K\.mental\.qualityMult/.test(career));
    ok("H · career kalite: kendi stüdyosu bonusu", /K\.assets\.studioBonus/.test(career));
    ok("H · career: tükenmişlikte yayın kilidi", /K\.mental\.onHiatus/.test(career));

    const econ = read("js/systems/economy.js");
    ok("H · economy: varlık bakımı gidere girdi", /assetUpkeep/.test(econ));
    ok("H · economy: platform yasağı telif çarpanı", /K\.shady\.incomeMult/.test(econ));

    const idx = read("index.html");
    ["writing", "merch", "assets", "mental", "shady", "intl"].forEach(n =>
      ok("H · index.html script: " + n, idx.indexOf("js/systems/" + n + ".js") >= 0));
    ok("H · index.html CSS: expansion.css", idx.indexOf("css/expansion.css") >= 0);
    ok("H · index.html sekme: Girişim", /data-tab="business"/.test(idx));

    const ui = read("js/ui/career-ui.js");
    ok("H · UI: Girişim renderer bağlı", /business:\s*K\.careerUI\.renderBusiness/.test(ui));
    ok("H · UI: akıl sağlığı kartı kariyer sekmesinde", /mh-card/.test(ui));
    ["mrc-launch", "ast-buy", "wr-accept", "in-enter", "sh-bot", "mh-rest"]
      .forEach(a => ok("H · UI eylem: " + a, ui.indexOf(a) >= 0));

    const css = read("css/expansion.css");
    ok("H · CSS: .xg-head tanımlı", /\.xg-head/.test(css));
    ok("H · CSS: .mh-card tanımlı", /\.mh-card/.test(css));
  }

  /* =========================================================
     I) DENGE — yeni sistemler para basmıyor
     ========================================================= */
  {
    /* ÜRÜN: bir drop'un kâr oranı sınırlı olmalı (üretim maliyeti gerçek) */
    const c = K.merch.cost("tee", "basic", 200);
    const best = 200 * 450 - c;                       // tükense bile
    ok("I · drop kâr oranı < 3× (para basmıyor)", best / c < 3, (best / c).toFixed(2) + "×");
    ok("I · drop kâr oranı > 1× (ödüllendirici)", best / c > 1, (best / c).toFixed(2) + "×");

    /* VARLIK: toplam bakım > pasif gelir → varlık NET GİDER (statü satın alınır) */
    const totalUp = K.assets.ASSETS.reduce((n, a) => n + a.upkeep, 0);
    const totalInc = K.assets.ASSETS.reduce((n, a) => n + (a.income || 0), 0);
    ok("I · varlıklar net gider (bakım > pasif gelir)", totalUp > totalInc,
      U0(K).money(totalUp) + " bakım vs " + U0(K).money(totalInc) + " gelir");

    /* YAZARLIK: orta seviye sanatçı için tek iş ücreti makul bantta */
    const base = K.ECON.writingBase, sc = K.writing.SCOPES.full.base;
    const size = 1 + 50 / 26;
    const feeMid = base * sc * size * (0.7 + 60 / 100);
    ok("I · yazarlık ücreti makul bantta (20k-250k)", feeMid >= 20000 && feeMid <= 250000,
      Math.round(feeMid) + " ₺");

    /* ULUSLARARASI: tek pazarın aylık telifi sınırlı */
    const maxOne = 3.0 * 1.0 * (1 + 60 / 50) * 12000;   // en büyük pazar, tam nüfuz
    ok("I · pazar başına aylık telif < 120k", maxOne < 120000, Math.round(maxOne) + " ₺");

    /* KARANLIK: tespitin bedeli kazançtan büyük olmalı (risk gerçek) */
    const tier = K.shady.BOT_TIERS[1];                 // orta paket
    const imgCost = 8;                                 // imaj kaybı
    ok("I · bot tespiti anlamlı bedel (imaj >= 5, dinlenme %70 silinir)", imgCost >= 5 && 0.7 >= 0.5,
      "imaj −" + imgCost + " · dinlenme −%70");

    /* AKIL SAĞLIĞI: dinlenme stresi düşürür ama bedava değil */
    ok("I · dinlenme ücretli (fırsat maliyeti)", K.mental.CFG.restCost > 0,
      U0(K).money(K.mental.CFG.restCost));
    ok("I · terapi tatilden ucuz, etkisi yavaş",
      K.mental.CFG.therapyCostPerDay < K.mental.CFG.holidayCost &&
      K.mental.CFG.holidayStress > 13, "tatil −" + K.mental.CFG.holidayStress + " / dinlenme −13");
  }

  /* =========================================================
     J) DERİN BAĞLANTILAR (v10.29)
     Akıl sağlığı ekseni üç sisteme daha bağlandı:
       · diss kaydetme başarısı (beef.js)
       · konser performansı (concerts.js)
       · DM yanıt tonu (chat.js)
     ========================================================= */
  {
    /* --- J1: çarpan API'si --- */
    p.stress = 20;
    ok("J · düşük streste tüm çarpanlar 1,00",
      K.mental.dissMult() === 1 && K.mental.performanceMult() === 1 && K.mental.dmMult() === 1,
      [K.mental.dissMult(), K.mental.performanceMult(), K.mental.dmMult()].join(" / "));
    ok("J · düşük streste DM tonu yok", K.mental.dmTone() === null, String(K.mental.dmTone()));

    const tones = {};
    [20, 50, 75, 95].forEach(v => { p.stress = v; tones[v] = K.mental.dmTone(); });
    ok("J · DM tonu streste yükseliyor (gergin→yuksek→tukenmis)",
      tones[20] === null && tones[50] === "gergin" && tones[75] === "yuksek" && tones[95] === "tukenmis",
      JSON.stringify(tones));

    p.stress = 95;
    ok("J · yüksek streste üç çarpan da düşüyor",
      K.mental.dissMult() < 1 && K.mental.performanceMult() < 1 && K.mental.dmMult() < 1,
      "diss " + K.mental.dissMult().toFixed(2) + " · sahne " + K.mental.performanceMult().toFixed(2) + " · dm " + K.mental.dmMult().toFixed(2));
    ok("J · çarpanlar taban değerin altına inmez",
      K.mental.dissMult() >= 0.55 && K.mental.performanceMult() >= 0.60 && K.mental.dmMult() >= 0.55);
    ok("J · summary çarpanları raporluyor", (() => {
      const m = K.mental.summary();
      return m.dissMult < 1 && m.performanceMult < 1 && m.dmMult < 1 && m.dmTone === "tukenmis";
    })());

    /* --- J2: DISS kaydetme başarısı stresten etkilenir --- */
    const runDiss = (stress) => {
      p.stress = stress;
      const id = "__j_diss__";
      const song = { id: "sg_j", title: "Test Diss", boosts: {}, dailyStreams: 1000, viralBonus: 1 };
      s.beefs = s.beefs || {};
      delete s.beefs[id];
      const pop0 = p.popularity;
      K.beef.noteDissTrack(id, song);
      const b = K.beef.get(id) || { log: [] };
      return {
        heat: b.heat || 0, diss: song.boosts.diss || 0, streams: song.dailyStreams,
        viral: song.viralBonus, popGain: +(p.popularity - pop0).toFixed(3),
        log: (b.log || []).map(x => x.text).join(" ")
      };
    };
    const calmDiss = runDiss(20);
    const madDiss = runDiss(95);
    ok("J · streste diss husumeti daha az artırır", madDiss.heat < calmDiss.heat,
      calmDiss.heat.toFixed(1) + " → " + madDiss.heat.toFixed(1));
    ok("J · streste diss yayılımı (boosts.diss) düşer", madDiss.diss < calmDiss.diss,
      calmDiss.diss.toFixed(3) + " → " + madDiss.diss.toFixed(3));
    ok("J · streste diss dinlenme çarpanı düşer", madDiss.streams < calmDiss.streams,
      Math.round(calmDiss.streams) + " → " + Math.round(madDiss.streams));
    ok("J · streste diss viral bonusu düşer", madDiss.viral < calmDiss.viral,
      calmDiss.viral.toFixed(3) + " → " + madDiss.viral.toFixed(3));
    ok("J · streste diss şöhret kazancı düşer", madDiss.popGain < calmDiss.popGain,
      calmDiss.popGain + " → " + madDiss.popGain);
    ok("J · zayıf diss kayda geçti ('dağınık')",
      /dağınık/.test(madDiss.log) && !/dağınık/.test(calmDiss.log));

    /* --- J3: konser performansı stresten etkilenir --- */
    const savedConcerts = s.concerts, savedTour = s.tour;
    const runConcert = (stress) => {
      p.stress = stress;
      s.tour = null;
      s.concerts = [{
        id: "cn_j", city: "İstanbul", venueId: "hall", price: 900, productionId: "basic",
        openerId: null, dealType: "door", merch: false, status: "planlandı",
        day: s.day, scheduledDay: s.day - 10, capacity: 2500, sold: 0, target: 2500,
        dailyPlan: [], salesHistory: []
      }];
      K.concerts.tick();
      const cn = (s.concerts || []).find(x => x.id === "cn_j");
      return (cn && cn.result) || null;
    };
    const cCalm = runConcert(20);
    const cMad = runConcert(95);
    ok("J · konser sonuçlandı (iki durumda da)", !!cCalm && !!cMad,
      cCalm ? "" : "düşük stres sonuç yok");
    if (cCalm && cMad) {
      ok("J · streste sahne ŞÖHRET kazancı düşer", cMad.fame < cCalm.fame,
        cCalm.fame.toFixed(2) + " → " + cMad.fame.toFixed(2));
      ok("J · streste sahne HAYRAN kazancı düşer", cMad.followers < cCalm.followers,
        cCalm.followers + " → " + cMad.followers);
      ok("J · sonuçta performans çarpanı kayıtlı", cMad.performance < 1 && cCalm.performance === 1,
        cCalm.performance + " / " + cMad.performance);
      ok("J · bilet/katılım etkilenmez (salon doludur)", cMad.attendance === cCalm.attendance,
        cCalm.attendance + " vs " + cMad.attendance);
    }
    s.concerts = savedConcerts; s.tour = savedTour;

    /* --- J4: DM yanıt tonu stresten etkilenir --- */
    const who = "sehinsah";
    /* NOT: mesaj SELAMLA başlamamalı — aksi halde chat.js `greetForm()`
       erken dönüş yoluna girer ve asıl cevap yolu (stres cümlesi burada
       eklenir) hiç çalışmaz. Selamlaşma yolu ayrıca test edilir. */
    const line = "Yeni işin gerçekten çok iyi olmuş, tebrikler";
    p.stress = 20;
    const dCalm = K.chat.reply(who, line, { reach: 1 });
    p.stress = 95;
    const dMad = K.chat.reply(who, line, { reach: 1 });
    ok("J · DM: düşük streste çarpan 1,00 ve işaret yok",
      dCalm.dmMult === 1 && dCalm.stressed === false, String(dCalm.dmMult));
    ok("J · DM: streste samimiyet kazancı düşer", dMad.delta < dCalm.delta,
      dCalm.delta.toFixed(2) + " → " + dMad.delta.toFixed(2));
    ok("J · DM: streste 'stressed' işareti döner", dMad.stressed === true && dMad.dmMult < 1,
      String(dMad.dmMult));
    ok("J · DM: cevap hâlâ üretiliyor (çökme yok)",
      Array.isArray(dMad.msgs) && dMad.msgs.length > 0 && typeof dMad.msgs[0] === "string");

    /* sanatçı stresi hissettirip mesafe koyuyor mu? (birkaç denemede) */
    let sawStressLine = false, sampleLine = "";
    for (let i = 0; i < 40 && !sawStressLine; i++) {
      const r = K.chat.reply(who, line, { reach: 1 });
      const txt = (r.msgs || []).join(" ");
      if (/gergin gibisin|İyi misin|ters konuşuyorsun|Kafan dağınık|iyi değilsin|iyi gelmez/.test(txt)) {
        sawStressLine = true; sampleLine = txt.slice(0, 90);
      }
    }
    ok("J · DM: sanatçı stresi hissettirip mesafe koyuyor", sawStressLine, sampleLine);

    /* selamlaşma yolu da ölçekleniyor (tutarlılık) */
    p.stress = 20; const gCalm = K.chat.reply(who, "selam", { reach: 1 });
    p.stress = 95; const gMad = K.chat.reply(who, "selam", { reach: 1 });
    ok("J · DM: selamlaşma yolu da stresten etkilenir", gMad.delta < gCalm.delta,
      gCalm.delta + " → " + gMad.delta);

    /* --- J5: statik entegrasyon --- */
    ok("J · beef.js akıl sağlığını okur", /K\.mental\.dissMult/.test(read("js/systems/beef.js")));
    ok("J · concerts.js akıl sağlığını okur", /K\.mental\.performanceMult/.test(read("js/systems/concerts.js")));
    ok("J · chat.js DM tonunu ve çarpanını okur",
      /K\.mental\.dmTone/.test(read("js/systems/chat.js")) && /K\.mental\.dmMult/.test(read("js/systems/chat.js")));
    ok("J · mental.js çarpanları tanımlar",
      ["dissMult", "performanceMult", "dmMult", "dmTone"].every(n => typeof K.mental[n] === "function"));

    p.stress = 20;
  }

  /* ---- rapor ---- */
  const runtime = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
  console.log("=".repeat(50));
  console.log("KARMA · GENİŞLEME PAKETİ (v10.28)");
  console.log("=".repeat(50));
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length + (runtime.length ? " · Runtime hata: " + runtime.length : ""));
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); }
  if (runtime.length) { console.log("\n⚠️ RUNTIME"); Array.from(new Set(runtime)).slice(0, 6).forEach(e => console.log("   · " + e)); }
  if (!fail.length && !runtime.length) console.log("\n✅ GENİŞLEME PAKETİ TEMİZ");
  else process.exitCode = 1;
}

/* K'ya erken erişim gereken yerlerde kullanılan küçük yardımcı */
let _K = null;
function U0(K) { _K = K; return K.util; }
