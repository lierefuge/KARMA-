/* Kullanım: node tools/smoke-festivals.js
   KARMA — FESTİVAL DEVRESİ testi (v10.19)

   Neleri doğrular:
   A) VERİ: her festivalin zorunlu alanları var mı, sezon yaz mı (6-9),
      slot merdiveni para/prestij bakımından artan mı, tier eşikleri
      gerçekten artan mı?
   B) SLOT MERDİVENİ: popülerlik arttıkça slot asla GERİ düşmüyor mu,
      eşik altında uygun slot null dönüyor mu?
   C) TAKVİM: edisyonlar gelecekte mi, başvuru penceresi doğru mu?
   D) UÇTAN UCA: başvuru → kayıt → edisyon günü çözüm; kasa/hayran/
      itibar gerçekten değişiyor mu?
   E) ÇAKIŞMA KORUMASI: aynı gün ikinci taahhüt engelleniyor mu?
   F) KALICILIK: yeni oyun ve kayıt şeması festivals alanını içeriyor mu?

   Not: tek dosyalık KARMA-Oyun.html üzerinden test edilir;
   önce `node tools/build-single.js` çalıştırılmalı.
*/
const fs = require("fs");
const path = require("path");
const H = require("./harness.js");
const ROOT = path.resolve(__dirname, "..");

const FILE = path.join(ROOT, "KARMA-Oyun.html");
if (!fs.existsSync(FILE)) {
  console.error("KARMA-Oyun.html yok — önce: node tools/build-single.js");
  process.exit(1);
}
const html = fs.readFileSync(FILE, "utf8");

const ok = (n, c, e) => (c ? pass : fail).push(n + (e ? " — " + e : ""));
const pass = [], fail = [];
const { dom, errors } = H.bootDom(html, { seed: 20261019 });

H.whenReady(dom, { label: "festival verisi hazır", ready: K => !!(K && K.festivals && K.FESTIVALS) })
  .then(run).catch((err) => {
    console.error("test çöktü: " + (err && err.message ? err.message : err));
    process.exitCode = 1;
  });

function run() {
  const win = dom.window, K = win.K;
  const s = K.state;

  /* =========================================================
     A) VERİ BÜTÜNLÜĞÜ
     ========================================================= */
  ok("A · festival verisi yüklendi", Array.isArray(K.FESTIVALS) && K.FESTIVALS.length >= 8,
    (K.FESTIVALS || []).length + " festival");
  ok("A · slot merdiveni 5 basamak", K.FESTIVAL_SLOTS.length === 5, K.FESTIVAL_SLOTS.length + " slot");
  ok("A · tier etiketleri tam",
    ["local", "city", "national", "flagship"].every(t => K.FESTIVAL_TIER_LABEL && K.FESTIVAL_TIER_LABEL[t]));

  K.FESTIVALS.forEach(f => {
    const bad = ["id", "name", "city", "tier", "month", "dom", "capacity", "baseFee", "prestige", "travel"]
      .filter(k => f[k] == null);
    ok("A · zorunlu alanlar: " + f.id, bad.length === 0, bad.join(","));
    ok("A · sezon yaz (6-9): " + f.id, f.month >= 6 && f.month <= 9, "ay " + f.month);
    ok("A · tier eşikleri 5 elemanlı ve artan: " + f.id, (() => {
      const p = K.FESTIVAL_TIER_POPS[f.tier];
      if (!p || p.length !== 5) return false;
      for (let i = 1; i < p.length; i++) if (p[i] <= p[i - 1]) return false;
      return true;
    })());
  });

  /* slot değerleri monoton olmalı: sonraki basamak daha çok para/prestij */
  for (let i = 1; i < K.FESTIVAL_SLOTS.length; i++) {
    const a = K.FESTIVAL_SLOTS[i - 1], b = K.FESTIVAL_SLOTS[i];
    ok("A · slot sırası para artıyor: " + b.id, b.fee > a.fee);
    ok("A · slot sırası prestij artıyor: " + b.id, b.prestige > a.prestige);
  }

  /* =========================================================
     B) SLOT MERDİVENİ — popülerlikle asla geri düşmez
     ========================================================= */
  {
    /* festival BAŞINA ölç: kümülatif sayaç festivaller arası geçişte yanlış
       pozitif üretir, o yüzden her festival kendi içinde taranır. */
    let ok2 = true;
    K.FESTIVALS.forEach(f => {
      let last = -1;
      for (let pop = 0; pop <= 99; pop++) {
        const sl = K.festivals.slotFor(f.id, pop);
        const idx = sl ? K.festivals.slotIndex(sl.id) : -1;
        if (idx < last) ok2 = false;
        last = idx;
      }
    });
    ok("B · popülerlik arttıkça slot geri düşmüyor", ok2);
    ok("B · pop 99 → flagship headliner",
      (K.festivals.slotFor("buyuk-sahne", 99) || {}).id === "headliner");
    ok("B · düşük pop → flagship için slot yok",
      K.festivals.slotFor("buyuk-sahne", 5) === null);
  }

  /* =========================================================
     C) TAKVİM — edisyonlar gelecekte ve pencere tutarlı
     ========================================================= */
  {
    const cal = K.festivals.calendar();
    ok("C · takvim boş değil", cal.length > 0, cal.length + " kayıt");
    ok("C · tüm edisyonlar gelecekte", cal.every(x => x.editionDay > s.day));
    ok("C · açık pencere kuralı tutarlı",
      cal.every(x => x.open === (x.daysLeft <= K.festivals.OPEN_WINDOW && x.daysLeft >= 3)));
    ok("C · her kayıtta bir slot ya da uygun değil bilgisi var",
      cal.every(x => x.eligible === !!x.slot));
  }

  /* =========================================================
     D) UÇTAN UCA: başvuru → kayıt → çözüm
     ========================================================= */
  {
    const p = s.player;
    p.popularity = 85;          // headliner seviyesi
    p.reputation = 70;

    /* uygun bir festival seç: başvuru penceresine girecek şekilde günü kaydır */
    const target = K.FESTIVALS.find(f => f.tier === "city");

    /* edisyonun 20 gün öncesine git */
    let day = s.day;
    for (let probe = 1; probe < 400; probe++) {
      s.day = probe;
      const cal = K.festivals.calendar();
      const hit = cal.find(x => x.fest.id === target.id && x.open && x.eligible);
      if (hit) { day = probe; break; }
    }
    s.day = day;

    /* kabulü deterministik yap: Math.random'ı düşük tut */
    const realRandom = win.Math.random;
    win.Math.random = () => 0.02;
    const applied = K.festivals.apply(target.id, "exposure");
    win.Math.random = realRandom;

    ok("D · başvuru kabul edildi ve kaydedildi", applied === true && K.festivals.booked().length >= 1,
      "kayıtlı: " + K.festivals.booked().length);

    const entry = K.festivals.booked().find(b => b.festId === target.id);
    ok("D · kayıtta slot ve ücret bilgisi var", !!(entry && entry.slotId && entry.fee != null));

    /* E) ÇAKIŞMA — kayıt HÂLÂ 'booked' iken sınanmalı (çözülünce arşive geçer)
       Doğru davranış iki yönlüdür:
         · hiçbir şeyi yok saymazsan → MEVCUT kayıt çakışma olarak görünür
         · kendi kaydını yok sayarsan → temiz döner (kendisiyle çakışamaz) */
    if (entry) {
      const c = K.festivals.conflictDay(entry.editionDay, "__yok__");
      ok("E · mevcut kayıt çakışma olarak görünüyor", !!c && c.kind === "festival", c ? c.kind : "yok");
      const self = K.festivals.conflictDay(entry.editionDay, entry.festId);
      ok("E · kendi kaydını yok sayınca çakışma kalkıyor", self === null, self ? self.kind : "temiz");
      /* komşu gün de çakışmalı: turne/konser lojistiği ±1 gün toleranslıdır */
      const near = K.festivals.conflictDay(entry.editionDay + 1, "__yok__");
      ok("E · komşu gün de çakışma sayılıyor", !!near);
    }

    if (entry) {
      const igBefore = p.ig || 0, ttBefore = p.tiktok || 0, repBefore = p.reputation || 0;
      const idx = (s.festivals || []).indexOf(entry);
      s.day = entry.editionDay;                 // edisyon gününe atla
      K.festivals.tick();
      const done = (s.festivals || [])[idx];
      ok("D · performans çözüldü", !!done && done.status === "played");
      ok("D · sonuç kaydı eksiksiz",
        !!(done && done.result && done.result.crowd > 0 && done.result.fans > 0),
        done && done.result ? (done.result.crowd + " kişi") : "yok");
      ok("D · hayran kazancı hesaba yansıdı", (p.ig + p.tiktok) > (igBefore + ttBefore));
      ok("D · itibar değişti", (p.reputation || 0) !== repBefore || (done && done.result && done.result.repDelta !== 0));
      ok("D · headliner sayacı işledi", (p.festivalsPlayed || 0) >= 1);
    }
  }

  /* =========================================================
     F) KALICILIK / ŞEMA
     ========================================================= */
  {
    ok("F · state.festivals dizi", Array.isArray(s.festivals));
    const snap = K.newGame();
    ok("F · yeni oyunda festivals alanı var", Array.isArray(snap.festivals) && snap.festivals.length === 0);
    ok("F · özet üretilebiliyor", !!(K.festivals.summary && K.festivals.summary().playedCount >= 0));
  }

  /* ---------- rapor ---------- */
  const runtime = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
  console.log("=".repeat(46));
  console.log("KARMA · FESTİVAL DEVRESİ");
  console.log("=".repeat(46));
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length +
    (runtime.length ? " · Runtime hata: " + runtime.length : ""));
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); }
  if (runtime.length) { console.log("\n⚠️ RUNTIME"); Array.from(new Set(runtime)).slice(0, 6).forEach(e => console.log("   · " + e)); }
  if (!fail.length && !runtime.length) console.log("\n✅ FESTİVAL DEVRESİ TEMİZ");
  else process.exitCode = 1;
}
