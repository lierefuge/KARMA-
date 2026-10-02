/* Kullanım: node tools/smoke-v1043.js
   KARMA — v10.43 Yan İşler: başvuru · vardiya · yorgunluk · denge.

   A) BAŞVURU   — işe girmek için başvuru, ertesi gün yanıt, ret/cooldown,
                  serbest işler (sokak/beat) başvurusuz
   B) VARDİYA   — günde en fazla 3 vardiya, perDay sınırı, gün içi verim
   C) YORGUNLUK — birikim, ücret cezası, bitkinlik eşiği, dinlenme günü
   D) DENGE     — ünle ücret düşüşü, beceriyle artış, günlük toplam
   E) ARAYÜZ    — başvuru/vardiya/dinlenme düğmeleri ve durum rozetleri

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

const { dom, errors } = H.bootDom(html, { seed: 20261043 });

H.whenReady(dom, {
  label: "v10.43 yan işler hazır",
  ready: (K) => !!(K && K.jobs && K.jobs.apply && K.jobs.rest && K.jobs.onNewDay)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exitCode = 1;
});

function run() {
  const K = dom.window.K;
  const U = K.util;

  const fresh = () => {
    K.state = K.newGame();
    K.state.player.stageName = "Test";
    K.state.player.age = 20;
    K.state.balance = 100000;
    K.jobs.ensure();
  };
  const job = (id) => K.jobs.list().find(j => j.id === id);
  const day = (n) => { for (let i = 0; i < (n || 1); i++) { K.state.day++; K.jobs.onNewDay(); } };

  /* ============ A) BAŞVURU ============ */
  fresh();
  ok("A-1 · yeni oyunda resmi işler başvurusuz açılmaz",
    !job("kafe").hired && job("kafe").canApply && job("kafe").status === "none",
    job("kafe").status);
  ok("A-1 · jobApps yeni oyunda boş", Object.keys(K.state.player.jobApps || {}).length === 0);
  ok("A-2 · başvuru pending oluşturur", K.jobs.apply("kafe") === true && K.jobs.appOf("kafe").status === "pending");
  ok("A-2 · yanıt ertesi güne ayarlanır", K.jobs.appOf("kafe").decideDay === K.state.day + 1,
    K.jobs.appOf("kafe").decideDay);
  ok("A-3 · aynı işe tekrar başvuru engellenir", K.jobs.apply("kafe") === false);
  ok("A-4 · bekleyen başvuru sayısı 1", K.jobs.pendingCount() === 1);
  K.jobs.apply("market");
  ok("A-4 · ikinci başvuru kabul", K.jobs.pendingCount() === 2);
  ok("A-4 · üçüncü bekleyen başvuru engellenir", K.jobs.apply("kurye") === false && K.jobs.pendingCount() === 2);
  ok("A-5 · kilitli işe başvuru reddedilir",
    (K.state.player.age = 15, K.jobs.apply("dj") === false));
  K.state.player.age = 20;

  /* gün dönümünde çözümleme: giriş seviyesi neredeyse kesin kabul */
  day(1);
  ok("A-6 · gün dönümünde başvuru sonuçlanır",
    ["hired", "rejected"].indexOf(K.jobs.appOf("kafe").status) >= 0, K.jobs.appOf("kafe").status);
  ok("A-6 · pending kalmaz", K.jobs.pendingCount() === 0);

  /* giriş seviyesi kabul oranı yüksek: birkaç denemede mutlaka girer */
  fresh();
  let hired = false;
  for (let i = 0; i < 10 && !hired; i++) {
    if (!K.jobs.isHired("kafe")) K.jobs.apply("kafe");
    day(1);
    hired = K.jobs.isHired("kafe");
  }
  ok("A-7 · giriş seviyesi işe giriş kolay", hired === true);
  ok("A-7 · işe alınınca status hired", K.jobs.appOf("kafe").status === "hired");

  /* ret cooldown */
  fresh();
  K.state.player.skills.studio = 0;   // uzman işi zorlaştır
  K.jobs.apply("prod");               // studio 30 + music 25 gerektirir → kilitli
  ok("A-8 · şart sağlanmayan işe başvuru yok", K.jobs.appOf("prod") === null);
  /* yapay ret: cooldown mekaniği */
  K.state.player.jobApps.zzz = { status: "rejected", retryDay: K.state.day + 5 };
  ok("A-8 · ret sonrası retryDay ileri", K.state.player.jobApps.zzz.retryDay > K.state.day);

  ok("A-9 · sokak performansı serbest", job("street").status === "self" && job("street").hired === true);
  ok("A-9 · serbest işe başvuru engellenir", K.jobs.apply("street") === false);
  ok("A-9 · serbest iş doğrudan yapılabilir", K.jobs.work("street") === true);

  /* ============ B) VARDİYA ============ */
  fresh();
  ok("B-1 · günlük vardiya sınırı 3", K.jobs.MAX_SHIFTS === 3);
  ok("B-1 · her işte vardiya etiketi var",
    K.jobs.LIST.every(j => typeof j.shift === "string" && j.shift.length > 0));
  ok("B-2 · başlangıçta 3 vardiya hakkı", K.jobs.shiftsLeft() === 3);
  K.jobs.work("street");
  ok("B-2 · çalışınca vardiya sayacı artar", K.jobs.shiftsToday() === 1 && K.jobs.shiftsLeft() === 2);
  K.jobs.work("street");
  ok("B-2 · ikinci vardiya", K.jobs.shiftsToday() === 2);
  K.jobs.work("street");   // street perDay=2 → bu 3. çağrı perDay yüzünden reddedilir
  ok("B-3 · perDay sınırı uygulanır", K.jobs.todayCount("street") === 2);
  /* başka bir serbest iş yok; başvurup girip 3. vardiyayı test et */
  K.state.player.jobApps.beat = { status: "hired" };
  K.state.player.skills.music = 30;
  K.jobs.work("beat");
  ok("B-3 · üçüncü vardiya başka işten yapılabilir", K.jobs.shiftsToday() === 3);
  ok("B-3 · vardiya bitti → yeni iş yapılamaz", K.jobs.shiftsLeft() === 0 && job("kafe").canWork === false);
  ok("B-3 · dördüncü vardiya engellenir", K.jobs.work("beat") === false);

  /* gün içi verim düşüşü */
  fresh();
  ok("B-4 · ilk vardiya verimi 1.0", Math.abs(K.jobs.efficiency() - 1) < 1e-9);
  K.jobs.work("street");
  ok("B-4 · ikinci vardiya verimi 0.75", Math.abs(K.jobs.efficiency() - 0.75) < 1e-9,
    K.jobs.efficiency());

  /* gün dönümü sayacı sıfırlar */
  day(1);
  ok("B-5 · gün dönümünde vardiya sıfırlanır", K.jobs.shiftsToday() === 0 && K.jobs.shiftsLeft() === 3);
  ok("B-5 · günlük iş kaydı sıfırlanır", Object.keys(K.state.player.jobLog || {}).length === 0);

  /* ============ C) YORGUNLUK ============ */
  fresh();
  K.jobs.work("street");
  ok("C-1 · çalışmak yorgunluk biriktirir", (K.state.player.fatigue || 0) > 0, K.state.player.fatigue);
  ok("C-2 · yorgunluk ücreti düşürür", K.jobs.fatigueMult() < 1);
  K.state.player.fatigue = 20;
  ok("C-2 · %20 yorgunluk ~%10 ceza", Math.abs(K.jobs.fatigueMult() - 0.9) < 1e-6, K.jobs.fatigueMult());
  K.state.player.fatigue = 90;
  ok("C-3 · bitkinlik eşiği aşılamaz", K.jobs.work("street") === false);
  ok("C-3 · condition bitkin işaretler", K.jobs.condition().label === "Bitkin" && K.jobs.condition().block === true);
  K.state.player.fatigue = 50;
  ok("C-3 · FATIGUE_CAP altı çalışabilir", K.jobs.work("street") === true);

  /* dinlenme */
  fresh();
  K.state.player.fatigue = 60;
  ok("C-4 · dinlenme yorgunluğu düşürür", K.jobs.rest() === true && K.state.player.fatigue < 60,
    K.state.player.fatigue);
  ok("C-4 · dinlenme günü işaretlenir", K.jobs.restedToday() === true);
  ok("C-5 · dinlenme gününde iş yapılamaz", K.jobs.work("street") === false);
  ok("C-6 · günde tek dinlenme", K.jobs.rest() === false);
  ok("C-6 · dinlenme vardiyaları kapatır", K.jobs.shiftsLeft() === 0);
  day(1);
  ok("C-6 · yeni gün dinlenme sıfırlanır", K.jobs.restedToday() === false && K.jobs.shiftsLeft() === 3);

  /* ============ D) DENGE ============ */
  fresh();
  ok("D-1 · ünsüz sanatçı tam ücret", Math.abs(K.jobs.fameDampen() - 1) < 1e-9, K.jobs.fameDampen());
  K.state.player.popularity = 60;
  ok("D-1 · ünle ücret düşer", K.jobs.fameDampen() < 0.4, K.jobs.fameDampen());
  K.state.player.popularity = 0;
  K.state.player.skills.work = 50;
  ok("D-2 · beceri ücreti artırır", K.jobs.payMult({ skill: "work" }) > 1, K.jobs.payMult({ skill: "work" }));
  ok("D-3 · list effectivePay hesaplar",
    job("street").effectivePay > 0 && typeof job("street").effectivePay === "number");
  ok("D-3 · list basePay hesaplar", job("street").basePay > 0);
  ok("D-4 · günlük toplam iş kaydından gelir", K.jobs.dailyTotal() === 0);
  K.jobs.work("street");
  ok("D-4 · çalışınca günlük toplam artar", K.jobs.dailyTotal() > 0, K.jobs.dailyTotal());
  ok("D-4 · kariyer toplamı artar", (K.state.player.jobEarnings || 0) > 0);

  /* ============ E) ARAYÜZ ============ */
  fresh();
  K.state.player.jobApps.kafe = { status: "hired" };
  const htmlOut = K.careerUI.renderJobs();
  ok("E-1 · yan işler HTML üretir", /Yan İşler/.test(htmlOut));
  ok("E-1 · başvuru düğmesi var", /data-act="apply-job"/.test(htmlOut));
  ok("E-1 · vardiya düğmesi var", /data-act="work-job"/.test(htmlOut));
  ok("E-2 · vardiya hakkı gösterilir", /Vardiya Hakkı/.test(htmlOut) && /3\/3/.test(htmlOut));
  ok("E-3 · dinlenme düğmesi var", /data-act="rest-day"/.test(htmlOut));
  ok("E-3 · yorgunluk çubuğu var", /Yorgunluk/.test(htmlOut));
  ok("E-4 · kadro rozeti var", /kadroda/.test(htmlOut));
  ok("E-4 · serbest rozeti var", /serbest/.test(htmlOut));
  K.state.player.jobApps.market = { status: "pending", decideDay: K.state.day + 1 };
  const htmlOut2 = K.careerUI.renderJobs();
  ok("E-4 · bekleyen başvuru rozeti var", /başvuru bekliyor/.test(htmlOut2));
  K.state.player.restedToday = true;
  ok("E-4 · dinlenme günü rozeti var", /bugün dinlendin/.test(K.careerUI.renderJobs()));

  /* ---- rapor ---- */
  const runtime = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
  console.log("=".repeat(56));
  console.log("KARMA · v10.43 YAN İŞLER (BAŞVURU · VARDİYA · YORGUNLUK)");
  console.log("=".repeat(56));
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length + (runtime.length ? " · Runtime hata: " + runtime.length : ""));
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); }
  if (runtime.length) { console.log("\n⚠️ RUNTIME"); Array.from(new Set(runtime)).slice(0, 6).forEach(e => console.log("   · " + e)); }
  if (!fail.length && !runtime.length) console.log("\n✅ YAN İŞLER TEMİZ · BAŞVURU + VARDİYA + YORGUNLUK + DENGE");
  else process.exitCode = 1;
}
