/* Kullanım: node tools/smoke-v1057.js
   KARMA — v10.57: GERÇEKÇİLİK DENETİMİ (2. tur)

   Neden bu süit var?
   ------------------
   İkinci gerçekçilik denetimi dört konuyu buldu ve bunlar burada
   kalıcı olarak kilitlenir:

     A) SERTİFİKA NOTU — kod, eşiklerin "gerçek RIAA ölçeğinden
        uyarlandığını" söylüyordu; oysa RIAA 1.500 dinlenme = 1 birim
        sayar ve platin ≈ 1,5 milyar dinlenmedir. Not dürüstleştirildi.
     B) ENFLASYON TUTARSIZLIĞI — giderler `K.econ.infl()` ile artarken
        varlık alım fiyatı, konser mekân/prodüksiyon/merch maliyeti,
        bilet tabanı, iş ücreti, sponsorluk ve yazarlık ücretleri SABİT
        nominal kalıyordu. 43%/yıl enflasyonda bunlar gerçekte
        ucuzluyordu. Hepsi endekse bağlandı.
     C) SEZON — konser talebi takvimden bağımsızdı. Artık yaz zirvesi
        (×1,15) ve kış durgunluğu (×0,90) var.
     D) ÖDÜL SEZONU — tören her 360 günde bir, yılın ortasında
        yapılıyordu. Artık her takvim yılının Ocak ayında yapılır.

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

const { dom, errors } = H.bootDom(html, { seed: 20261057 });

H.whenReady(dom, {
  label: "v10.57 katmanı hazır",
  ready: (K) => !!(K && K.concerts && K.concerts.seasonMult && K.awards && K.awards.dayForCal)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exit(1);
});

function run(K) {
  const s = K.state, p = s.player;
  const eco = K.econ.ensure();
  const oldInfl = eco.inflationIndex;

  /* =========================================================
     A) SERTİFİKA NOTU — dürüst RIAA açıklaması
     ========================================================= */
  {
    const src = read("js/systems/certifications.js");
    ok("A1 · RIAA birim kuralı (1.500 dinlenme) belirtiliyor",
      /RIAA/.test(src) && /1[.,]500/.test(src));
    ok("A2 · yanıltıcı 'gerçek RIAA ölçeğinden uyarlandı' ifadesi kaldırıldı",
      !/gerçek RIAA ölçeğinden oyuna uyarlanmıştır/.test(src));
    ok("A3 · eşiklerin oyun ölçeğine uyarlandığı açıkça yazıyor",
      /oyun ölçeğine/i.test(src));
    ok("A4 · üç kademe korunuyor",
      K.certifications.TIERS.length === 3 &&
      K.certifications.TIERS.every(t => t.streams > 0));
  }

  /* =========================================================
     B) ENFLASYON TUTARLILIĞI
     ========================================================= */
  {
    eco.inflationIndex = 2;

    const wDef = K.assets.def("watch");
    ok("B1 · varlık alım fiyatı enflasyonla artar",
      K.assets.costNow("watch") === Math.round(wDef.cost * 2),
      wDef.cost + " → " + K.assets.costNow("watch"));

    ok("B2 · bilet tabanı enflasyonla artar",
      K.concerts.baseTicket() === Math.round(K.concerts.BASE_TICKET * 2),
      K.concerts.BASE_TICKET + " → " + K.concerts.baseTicket());

    const job = K.jobs.LIST.find(j => j.id === "kafe");
    const pay2 = Math.round(job.pay * K.jobs.payMult(job));
    eco.inflationIndex = 1;
    const pay1 = Math.round(job.pay * K.jobs.payMult(job));
    ok("B3 · yan iş ücreti enflasyonla artar", pay2 > pay1, pay1 + " → " + pay2);

    /* konser maliyeti: aynı sahne/prodüksiyon, iki farklı enflasyon */
    p.monthly = 20000; p.popularity = 40;
    const c1 = K.concerts.estimate("İstanbul", "club", 850, "light", null, {});
    eco.inflationIndex = 2;
    const c2 = K.concerts.estimate("İstanbul", "club", 850, "light", null, {});
    ok("B4 · konser maliyeti enflasyonla artar", c2.cost > c1.cost, c1.cost + " → " + c2.cost);
    ok("B5 · prodüksiyon maliyeti de ölçeklenir", c2.prodCost > c1.prodCost,
      c1.prodCost + " → " + c2.prodCost);

    const spoSrc = read("js/systems/sponsor.js");
    ok("B6 · sponsorluk ücreti endekse bağlı", /b\.fee \* scale \* infl/.test(spoSrc));
    ok("B7 · yazarlık ücreti endekse bağlı",
      (read("js/systems/writing.js").match(/writingBase[^;]*infl\(\)/g) || []).length >= 2);

    eco.inflationIndex = oldInfl;
  }

  /* =========================================================
     C) SEZONLUK KONSER TALEBİ
     ========================================================= */
  {
    const curY = K.util.dateObjForDay(s.day).y;
    const july = K.awards.dayForCal(curY + 1, 7, 15);
    const jan  = K.awards.dayForCal(curY + 1, 1, 15);
    ok("C1 · yaz çarpanı 1.15", K.concerts.seasonMult(july) === 1.15, String(K.concerts.seasonMult(july)));
    ok("C2 · kış çarpanı 0.90", K.concerts.seasonMult(jan) === 0.90, String(K.concerts.seasonMult(jan)));
    ok("C3 · yaz talebi kıştan yüksek", K.concerts.seasonMult(july) > K.concerts.seasonMult(jan));

    /* talep formülüne gerçekten giriyor mu? aynı koşulda yaz > kış katılımı
       (küçük sanatçı seçildi ki kapasite tavanına takılmasın) */
    p.monthly = 3000; p.popularity = 45;
    const dayOld = s.day;
    s.day = july;
    const estSummer = K.concerts.estimate("İstanbul", "club", K.concerts.baseTicket(), "basic", null, {});
    s.day = jan;
    const estWinter = K.concerts.estimate("İstanbul", "club", K.concerts.baseTicket(), "basic", null, {});
    s.day = dayOld;
    ok("C4 · aynı koşulda yazın katılım daha yüksek",
      estSummer.attendance > estWinter.attendance,
      estWinter.attendance + " (kış) < " + estSummer.attendance + " (yaz)");
  }

  /* =========================================================
     D) ÖDÜL SEZONU — takvime bağlı tören
     ========================================================= */
  {
    ok("D1 · tören ayı Ocak · günü 15",
      K.awards.CEREMONY_MONTH === 1 && K.awards.CEREMONY_DOM === 15);
    const nc = K.awards.nextCeremony();
    const nd = K.util.dateForDay(nc);
    ok("D2 · sıradaki tören gelecekte ve Ocak 15",
      nc >= s.day && nd.m === 1 && nd.dayOfMonth === 15,
      nd.label + " (gün " + nc + ")");
    ok("D3 · dayForCal tersinir", K.awards.dayForCal(nd.y, 1, 15) === nc);

    /* takvim gün sayacından bağımsız: 360'ın katı olmak zorunda değil */
    ok("D4 · tören artık 360'ın katına sabitli değil",
      (nc - 1) % 360 !== 0 || K.util.dateForDay(nc).m === 1);
  }

  /* =========================================================
     E) RUNTIME TEMİZ
     ========================================================= */
  const rt = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
  ok("E1 · süitte yakalanmamış runtime hatası yok", rt.length === 0, rt.slice(0, 2).join(" | "));

  console.log("\n============================================");
  console.log("KARMA · v10.57 (gerçekçilik denetimi · 2)");
  console.log("============================================");
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length);
  if (fail.length) {
    console.log("\n❌ BAŞARISIZ");
    fail.forEach((f) => console.log("   · " + f));
    process.exit(1);
  }
  console.log("\n✅ v10.57 TEMİZ");
  process.exit(0);
}
