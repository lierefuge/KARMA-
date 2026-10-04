/* Kullanım: node tools/smoke-label.js
   KARMA — ŞİRKET EKONOMİSİ testi (v10.24)

   Neden?
   ------
   v10.24'ten önce oyuncunun şirketi (label) geliri İKİ katmanlı hatalıydı:
     1) `K.ECON.royaltyPerStream` (0,0011 ₺, "eski" sabit) kullanılıyordu —
        kur dönüşümü, enflasyon, platform karması ve 30 sn eşiği yoktu.
     2) Sözleşme payı tersti: şirket %30 yerine %70 alıyordu.
   Bu süit bu iki hatanın sessizce geri dönmesini engeller ve şirket
   gelirinin gerçekçi bantta kaldığını ölçer.

   A) VERİ      : yeni sabitler var mı, ölü sabitler gitti mi?
   B) KUR       : `avgRate()` ağırlıklı ortalamayı doğru veriyor mu?
   C) SIFIR     : şirket yokken / kadro boşken gelir 0 mı?
   D) GELİR     : kadro kurulunca pozitif ve formülle tutarlı mı?
   E) PAY YÖNÜ  : `royalty` artınca gelir ARTAR mı? (eski hata: azalıyordu)
   F) GERÇEKÇİ  : 1M dinleyici/ay → aylık gelir makul bantta mı?
   G) KUR/ENF   : kur ve enflasyon geliri oransal büyütüyor mu?
   H) KATALOG   : `releaseForArtist` gerçek kayıt id'si yazıyor mu?
   I) GÜVENLİK  : eksik veri / NaN koruması
   J) KADRO     : kadro dinleyicisi popülerlik tavanını aşıyor mu?
                  (v10.24 öncesi üstel/sınırsız büyüyordu → para makinesi)

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
const near = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 0.02 : tol);

const { dom, errors } = H.bootDom(html, { seed: 20261024 });

H.whenReady(dom, { label: "şirket ekonomisi hazır", ready: K => !!(K && K.label && K.economy && K.econ) })
  .then(run).catch((err) => { console.error("test çöktü: " + (err && err.message ? err.message : err)); process.exitCode = 1; });

function run() {
  const K = dom.window.K, s = K.state;

  /* ---------- A) VERİ ---------- */
  ok("A · ölü sabit royaltyPerStream kaldırıldı", K.ECON.royaltyPerStream === undefined);
  ok("A · ölü sabit taxRate kaldırıldı", K.ECON.taxRate === undefined);
  ok("A · ölü sabit taxFreeMonthly kaldırıldı", K.ECON.taxFreeMonthly === undefined);
  ok("A · ölü sabit streamRevenueShare kaldırıldı", K.ECON.streamRevenueShare === undefined);
  ok("A · ölü sabit messageCooldown kaldırıldı", K.ECON.messageCooldown === undefined);
  ok("A · labelBillableShare tanımlı (0.5–1)", K.ECON.labelBillableShare > 0.5 && K.ECON.labelBillableShare <= 1, String(K.ECON.labelBillableShare));
  ok("A · labelOpexShare tanımlı (0–1)", K.ECON.labelOpexShare > 0 && K.ECON.labelOpexShare < 1, String(K.ECON.labelOpexShare));
  ok("A · gider oranı sözleşme payından küçük (kâr mümkün)",
    K.ECON.labelOpexShare < 0.30, K.ECON.labelOpexShare + " < 0.30");
  ok("A · storeMix var ve toplamı ~1",
    (() => { const m = K.ECON.storeMix || {}; const t = Object.values(m).reduce((a, b) => a + b, 0); return near(t, 1); })(),
    (() => { const m = K.ECON.storeMix || {}; return Object.values(m).reduce((a, b) => a + b, 0).toFixed(3); })());
  ok("A · taxBrackets hâlâ kademeli", Array.isArray(K.ECON.taxBrackets) && K.ECON.taxBrackets.length >= 3);

  /* ---------- B) KUR ---------- */
  {
    const mix = K.ECON.storeMix;
    const expected = K.econ.STORES.reduce((n, st) => n + K.econ.rate(st) * (mix[st] || 0), 0) /
      K.econ.STORES.reduce((n, st) => n + (mix[st] || 0), 0);
    const got = K.econ.avgRate();
    ok("B · avgRate ağırlıklı ortalama", near(got, expected, 1e-9), got.toFixed(6) + " vs " + expected.toFixed(6));
    ok("B · avgRate > 0", got > 0, got.toFixed(6));
    ok("B · avgRate tek bir mağaza oranına eşit değil", near(got, K.econ.rate("spotify")) === false);
    /* kur ve enflasyon avgrRate içinde */
    const fx0 = K.econ.ensure().fx;
    /* v10.56 — beklenen değer artık sabit değil, streamRates×storeMix'ten
       türetilir; oranlar değişince test kendiliğinden uyum sağlar. */
    const _expRate = K.econ.STORES.reduce((n, st) => n + (K.ECON.streamRates[st] || 0) * (mix[st] || 0), 0) /
      K.econ.STORES.reduce((n, st) => n + (mix[st] || 0), 0);
    ok("B · avgRate ≈ streamRates×fx (enflasyon 1 iken)", near(got, _expRate * fx0, 1e-6), got.toFixed(6) + " vs " + (_expRate * fx0).toFixed(6));
  }

  /* ---------- C) SIFIR ---------- */
  ok("C · şirket yokken gelir 0", K.economy.labelDailyNet() === 0);

  /* ---------- D) GELİR ---------- */
  s.balance = 5_000_000;
  s.player.popularity = 40;
  /* v10.56 — şirket kurmak artık 18+ gerektirir; test yetişkin oyuncu kurar. */
  s.player.age = 25;
  const founded = K.label.found("Test Müzik");
  ok("D · şirket kurulabildi", founded === true && !!s.label);

  const rosterPool = K.artistList().filter(a => a.id !== "player").slice(0, 2);
  const savedLabelId = rosterPool.map(a => a.labelId);
  rosterPool.forEach(a => { a.labelId = K.MY_LABEL_ID; a.monthly = 1_000_000; });
  s.label.roster = rosterPool.map(a => a.id);
  s.label.monthlyStreams = K.label.rosterArtists().reduce((x, ar) => x + ar.monthly, 0);

  {
    const net = K.economy.labelDailyNet();
    ok("D · kadroyla gelir pozitif", net > 0, net + " ₺/gün");

    /* formül kilidi: net = brüt × (pay − opex) */
    const billable = K.ECON.labelBillableShare;
    const streamsDay = s.label.monthlyStreams / 30 * billable;
    const gross = streamsDay * K.econ.avgRate();
    const expectedNet = gross * (s.label.royalty / 100) - gross * K.ECON.labelOpexShare;
    ok("D · formül kilidi (net = brüt×(pay−gider))",
      Math.abs(net - expectedNet) <= Math.max(2, expectedNet * 0.01),
      "net " + net + " · beklenen " + Math.round(expectedNet));
    ok("D · NaN yok", !Number.isNaN(net) && Number.isFinite(net));
    ok("D · gelir düşük kadroyla sıfıra yakın", (() => {
      const bak = s.label.roster; s.label.roster = [];
      const z = K.economy.labelDailyNet(); s.label.roster = bak; return z === 0;
    })());
  }

  /* ---------- E) PAY YÖNÜ ---------- */
  {
    const bak = s.label.royalty;
    s.label.royalty = 20; const low = K.economy.labelDailyNet();
    s.label.royalty = 50; const high = K.economy.labelDailyNet();
    ok("E · royalty artınca gelir ARTAR (terslik yok)", high > low, low + " → " + high);
    s.label.royalty = 90; const vhigh = K.economy.labelDailyNet();
    ok("E · monoton artış", vhigh > high, high + " → " + vhigh);
    /* düşük pay zarar yazdırabilmeli (gerçekçilik) */
    s.label.royalty = Math.round(K.ECON.labelOpexShare * 100) - 5;
    ok("E · giderin altındaki pay zarar (0) verir", K.economy.labelDailyNet() === 0,
      "pay %" + s.label.royalty);
    s.label.royalty = bak;
  }

  /* ---------- F) GERÇEKÇİLİK BANDI ---------- */
  {
    const bak = s.label.roster;
    const a = K.label.rosterArtists()[0];
    s.label.roster = [a.id];
    a.monthly = 1_000_000;                      // tam 1M dinleyici/ay
    const perMonth = K.economy.labelDailyNet() * 30;
    ok("F · 1M dinleyici/ay → aylık gelir 10–60 bin ₺",
      perMonth >= 10000 && perMonth <= 60000, Math.round(perMonth).toLocaleString() + " ₺");
    ok("F · gelir oyuncunun kendi telifinden bağımsız değil (aynı ₺ tabanı)", (() => {
      /* aynı 1M dinlenme için şirket geliri, mağaza telifinin makul bir dilimi olmalı */
      const grossMonth = 1_000_000 * K.econ.avgRate();
      const ratio = perMonth / grossMonth;
      return ratio > 0.05 && ratio < 0.20;      // pay − gider = %12 beklenir
    })(), (() => {
      const grossMonth = 1_000_000 * K.econ.avgRate();
      return "%" + ((perMonth / grossMonth) * 100).toFixed(1);
    })());
    ok("F · büyük sanatçı daha çok getirir", (() => {
      a.monthly = 4_000_000;
      const big = K.economy.labelDailyNet();
      a.monthly = 1_000_000;
      const small = K.economy.labelDailyNet();
      return big > small * 3.5;
    })());
    s.label.roster = bak;
  }

  /* ---------- G) KUR / ENFLASYON ---------- */
  {
    const base = K.economy.labelDailyNet();
    const fx0 = K.econ.ensure().fx;
    K.econ.ensure().fx = fx0 * 2;
    const dbl = K.economy.labelDailyNet();
    ok("G · kur ×2 → gelir ~×2", near(dbl / base, 2, 0.05), (dbl / base).toFixed(3));
    K.econ.ensure().fx = fx0;

    const infl0 = K.econ.ensure().inflationIndex;
    K.econ.ensure().inflationIndex = infl0 * 2;
    const inf = K.economy.labelDailyNet();
    ok("G · enflasyon ×2 → gelir ~×2", near(inf / base, 2, 0.05), (inf / base).toFixed(3));
    K.econ.ensure().inflationIndex = infl0;

    ok("G · menajer personeli geliri artırır", (() => {
      s.staff = s.staff || {};
      const b0 = K.economy.labelDailyNet();
      s.staff.manager = 5;
      const b5 = K.economy.labelDailyNet();
      s.staff.manager = 0;
      return b5 > b0;
    })());
  }

  /* ---------- H) KATALOG ---------- */
  {
    s.label.catalog = [];
    s.catalog = [];
    K.label.releaseForArtist(s.label.roster[0], { title: "Katalog Testi" });
    const ids = s.label.catalog || [];
    const known = new Set((s.catalog || []).map(c => c.id));
    ok("H · yayın sonrası katalog id yazıldı", ids.length >= 1, ids.length + " id");
    ok("H · katalog id'leri GERÇEK kayda karşılık geliyor (boşa düşen id yok)",
      ids.every(id => known.has(id)), ids.filter(id => !known.has(id)).length + " boşa düşen");
  }

  /* ---------- I) GÜVENLİK ---------- */
  {
    ok("I · eksik monthly ile çökmüyor", (() => {
      const bak = s.label.roster;
      const a = K.label.rosterArtists()[0];
      const m = a.monthly;
      delete a.monthly;
      const r = K.economy.labelDailyNet();
      a.monthly = m; s.label.roster = bak;
      return Number.isFinite(r) && r >= 0;
    })());
    ok("I · royalty tanımsızsa varsayılan 30", (() => {
      const bak = s.label.royalty;
      delete s.label.royalty;
      const r = K.economy.labelDailyNet();
      s.label.royalty = bak;
      return Number.isFinite(r) && r > 0;
    })());
    ok("I · şirket yokken çökmüyor", (() => {
      const bak = s.label; s.label = null;
      const r = K.economy.labelDailyNet();
      s.label = bak;
      return r === 0;
    })());
  }

  /* ---------- J) KADRO TAVANI (üstel büyüme kırıldı mı?) ---------- */
  {
    const a = K.label.rosterArtists()[0];
    const bak = { monthly: a.monthly, pop: a.popularity };
    a.monthly = 1_000_000;
    a.popularity = 60;                       // tavan ≈ 60²×700 = 2,52M
    let violated = false, maxSeen = 0;
    for (let i = 0; i < 400; i++) {
      try { K.label.dailyTick(); } catch (e) { break; }
      const ceiling = Math.pow(a.popularity || 10, 2) * 700;
      maxSeen = Math.max(maxSeen, a.monthly);
      if (a.monthly > ceiling * 1.05) { violated = true; break; }
    }
    ok("J · 400 gün boyunca kadro popülerlik tavanını aşmıyor", !violated,
      "en yüksek " + (maxSeen / 1e6).toFixed(2) + "M");
    ok("J · kadro dinleyicisi mutlak sınırda (≤ ~6,9M × 1.05)",
      maxSeen <= 6.86e6 * 1.06, (maxSeen / 1e6).toFixed(2) + "M");
    ok("J · kadro büyümeyi sürdürdü (tavan büyümeyi durdurmadı)",
      a.monthly > 1_200_000, (a.monthly / 1e6).toFixed(2) + "M");
    a.monthly = bak.monthly; a.popularity = bak.pop;
  }

  /* ---- rapor ---- */
  const runtime = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
  console.log("=".repeat(48));
  console.log("KARMA · ŞİRKET EKONOMİSİ");
  console.log("=".repeat(48));
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length + (runtime.length ? " · Runtime hata: " + runtime.length : ""));
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); }
  if (runtime.length) { console.log("\n⚠️ RUNTIME"); Array.from(new Set(runtime)).slice(0, 6).forEach(e => console.log("   · " + e)); }
  if (!fail.length && !runtime.length) console.log("\n✅ ŞİRKET EKONOMİSİ TEMİZ");
  else process.exitCode = 1;
}
