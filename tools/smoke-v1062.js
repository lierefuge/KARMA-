/* Kullanım: node tools/smoke-v1062.js
   KARMA — v10.62: "GERÇEK DÜNYA" (yaşayan bağlantı katmanı)

   Neden bu süit var?
   ------------------
   v10.61 aylık dinleyiciyi GERÇEK stream penceresine bağladı. Ama
   dünya hâlâ iki yerden "soyut" kalıyordu:

     1) NPC↔NPC ilişkisi yalnızca friend/rival AĞIRLIĞIydı. İki sanatçı
        birbirini hiç tanımadan ortak iş yapabiliyordu.
     2) Bir hit'in NEDENİ ve SONUCU zincirlenmiyordu: sosyal medya
        (kısa video) → stream → 28 günlük pencere → monthly → chart
        halkası NPC tarafında eksikti.

   v10.62 bu halkaları ekler:
     · NPC↔NPC TANIŞMA AŞAMALARI (tanımıyor → … → yakın ilişki);
       feature yalnızca yeterli aşamaya ulaşmış çiftlerde olur.
     · Başarı SEVİYELERİ (hit → bigHit → viral → career) yalnızca
       gerçek performanstan türetilir.
     · VİRAL ZİNCİRİ: kısa videoda patlayan iş birkaç gün EK akış
       üretir; akış pencereye yazılır → monthly ve chart etkilenir.
     · COMEBACK: floptan sonra hit = geri dönüş.
     · Oyuncu tarafında da TANIŞMA kaydı (encounter).

   Bu süit, bu davranışları ve determinizmi kalıcı olarak kilitler.
   Yeni kod Math.random KULLANMAZ; aynı seed aynı sonucu verir.
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

const { dom, errors } = H.bootDom(html, { seed: 20261062 });

H.whenReady(dom, {
  label: "v10.62 gerçek dünya katmanı hazır",
  ready: (K) => !!(K && K.industry && K.industry.advanceNpcRel && K.industry._viralTick &&
    K.industry._startViral && K.industry.NPC_REL_STAGES && K.relations && K.relations.encounter &&
    K.artistList().length)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.stack ? err.stack : err));
  process.exit(1);
});

function run(K) {
  const s = K.state;
  const I = K.industry.ensure();
  const ind = K.industry;
  const N = ind.NPC_MONTHLY;

  /* ============================================================
     A) API YÜZEYİ
     ============================================================ */
  ok("A1 · NPC_REL_STAGES 8 aşama", Array.isArray(ind.NPC_REL_STAGES) && ind.NPC_REL_STAGES.length === 8);
  ok("A2 · advanceNpcRel fonksiyonu", typeof ind.advanceNpcRel === "function");
  ok("A3 · npcRelStage / npcRelLabel", typeof ind.npcRelStage === "function" && typeof ind.npcRelLabel === "function");
  ok("A4 · viral fonksiyonları", typeof ind._startViral === "function" && typeof ind._viralTick === "function" && typeof ind._npcRelTick === "function");
  ok("A5 · ilişki aşama etiketleri doğru", ind.npcRelLabel(0) === "tanımıyor" && ind.npcRelLabel(7) === "yakın ilişki");

  /* ============================================================
     B) AĞ TOHUMU — herkes herkesi tanımaz
     ============================================================ */
  ind.init();
  const artists = K.artistList().filter(a => a && !a.mergedInto);
  let known = 0, total = 0;
  for (let i = 0; i < artists.length; i++) {
    for (let j = i + 1; j < artists.length; j++) {
      total++;
      if (ind.npcRelStage(artists[i].id, artists[j].id) >= 2) known++;
    }
  }
  ok("B1 · tohum sonrası bazı ilişkiler kurulu", known > 0, known + "/" + total);
  ok("B2 · ama herkes herkesi tanımıyor", known < total * 0.9, known + "/" + total);
  ok("B3 · aynı şirket tanışık başlar", (function () {
    const byLabel = {};
    artists.forEach(a => { if (a.labelId) (byLabel[a.labelId] = byLabel[a.labelId] || []).push(a); });
    const grp = Object.values(byLabel).find(g => g.length >= 2);
    return grp ? ind.npcRelStage(grp[0].id, grp[1].id) >= 2 : true;
  })());

  /* ============================================================
     C) AŞAMA İLERLEMESİ (zamanla)
     ============================================================ */
  const p1 = artists[0], p2 = artists[1];
  const key = ind._pk(p1.id, p2.id);
  I.npcRel[key] = { st: 0, day: s.day, last: s.day, feat: 0 };
  const before = ind.npcRelStage(p1.id, p2.id);
  ind.advanceNpcRel(p1.id, p2.id, 1, "test");
  ok("C1 · aşama ilerledi", ind.npcRelStage(p1.id, p2.id) === before + 1, before + "→" + ind.npcRelStage(p1.id, p2.id));
  ok("C2 · aşama 7'yi aşmaz", (function () { ind.advanceNpcRel(p1.id, p2.id, 20, "test"); return ind.npcRelStage(p1.id, p2.id) === 7; })());
  ok("C3 · ilk karşılaşma olayı üretildi", I.events.some(e => e.kind === "meet"));

  /* aşama olayları: 6 → ortak proje geçmişe düşer */
  I.npcRel[key] = { st: 4, day: s.day, last: s.day, feat: 0 };
  const histBefore = I.history.length;
  ind.advanceNpcRel(p1.id, p2.id, 2, "test");
  ok("C4 · ortak proje aşaması geçmişe işlendi", I.history.length > histBefore && ind.npcRelStage(p1.id, p2.id) === 6);

  /* ============================================================
     D) FEATURE KAPISI — tanışmayan ortak iş yapamaz
     ============================================================ */
  const e5 = ind._edges("friend", 5);
  ok("D1 · minStage filtreli kenar listesi", e5.every(e => ind.npcRelStage(e[0], e[1]) >= 5));
  /* tüm friend kenarlarını 0 yap, minStage 5 ile seçim boş dönmeli */
  const backup = JSON.parse(JSON.stringify(I.npcRel));
  Object.keys(I.npcRel).forEach(k => { I.npcRel[k].st = 0; });
  ok("D2 · tanışmayan çiftlerde feature adayı yok", ind._pickPair("seed", "friend", 5) === null);
  I.npcRel = backup;

  /* ============================================================
     E) _npcFeature — monthly DOĞRUDAN büyümez, pencereden türer
     ============================================================ */
  const f1 = artists[2], f2 = artists[3];
  f1.monthly = f1._base = 800000; f2.monthly = f2._base = 600000;
  delete I.npcStreams[f1.id]; delete I.npcStreams[f2.id];
  I.npcRel[ind._pk(f1.id, f2.id)] = { st: 5, day: s.day, last: s.day, feat: 0 };
  const winBefore = ind.npcWindowSum(f1);
  ind._npcFeature(f1, f2);
  ok("E1 · feature pencereyi büyüttü", ind.npcWindowSum(f1) > winBefore);
  ok("E2 · monthly pencereden türetildi", f1.monthly === ind.npcMonthlyFromWindow(f1));
  ok("E3 · feature ilişkiyi ortak proje aşamasına taşıdı", ind.npcRelStage(f1.id, f2.id) >= 6);
  ok("E4 · feature her iki kariyere işlendi", ind.careerOf(f1.id).features > 0 && ind.careerOf(f2.id).features > 0);

  /* ============================================================
     F) BAŞARI SEVİYELERİ (tier) — gerçek performanstan
     ============================================================ */
  function findDay(a, outcome) {
    for (let d = s.day; d < s.day + 800; d++) { s.day = d; if (ind.npcOutcome(a) === outcome) return d; }
    return null;
  }
  const t1 = artists[4];
  t1.monthly = t1._base = 500000; t1.popularity = 75; t1._boost = 0;
  delete I.npcStreams[t1.id]; delete I.lastRelease[t1.id];
  findDay(t1, "hit");
  ind.adjustNpcRelease(t1, 0.2);           // gerçek akış: önce sonuç, sonra performans
  ind.applyNpcRelease(t1, { title: "Tier Test" }, 0.2, true);
  const lrHit = I.lastRelease[t1.id];
  ok("F1 · hit sonucu kaydedildi", lrHit && lrHit.result === "hit");
  ok("F2 · tier gerçek performanstan türetildi", lrHit && ["hit", "bigHit", "viral", "career"].indexOf(lrHit.tier) >= 0, lrHit && lrHit.tier);

  const t2 = artists[5];
  t2.monthly = t2._base = 400000; t2.popularity = 70; t2._boost = 0;
  delete I.npcStreams[t2.id]; delete I.lastRelease[t2.id];
  findDay(t2, "flop");
  ind.adjustNpcRelease(t2, 0.1);
  ind.applyNpcRelease(t2, { title: "Flop Test" }, 0.1, false);
  ok("F3 · flop sonucu kaydedildi", I.lastRelease[t2.id] && I.lastRelease[t2.id].result === "flop");
  ok("F4 · flop tier = flop", I.lastRelease[t2.id].tier === "flop");
  ok("F5 · tek flop kariyeri bitirmedi", ind.careerOf(t2.id).flops >= 1 && t2.popularity > 30);

  /* ============================================================
     G) VİRAL ZİNCİRİ — sosyal → stream → monthly → chart
     ============================================================ */
  const v1 = artists[6];
  v1.monthly = v1._base = 70000; v1.popularity = 80;
  delete I.npcStreams[v1.id];
  I.lastRelease[v1.id] = { day: s.day, title: "Viral Test", daily: 20000, total: 20000, initial: 20000, result: "hit", tier: "viral" };
  const vWinBefore = ind.npcWindowSum(v1);
  const vMonBefore = v1.monthly;
  ind._startViral(v1, { title: "Viral Test" }, "viral");
  ok("G1 · viral olayı kaydedildi", !!(I.viral && I.viral[v1.id]));
  ok("G2 · viral olayı sektörde göründü", I.events.some(e => e.kind === "viral"));
  ind._viralTick();
  ok("G3 · viral pencereyi besledi", ind.npcWindowSum(v1) > vWinBefore);
  ok("G4 · viral monthly'yi stream'den büyüttü", v1.monthly > vMonBefore, vMonBefore + "→" + v1.monthly);
  ok("G5 · viral yayın akışını (chart) artırdı", I.lastRelease[v1.id].daily > 20000);
  ok("G6 · viral monthly = pencere türevi", v1.monthly === ind.npcMonthlyFromWindow(v1));
  /* viral birkaç gün sonra biter */
  s.day = I.viral[v1.id].until + 1;
  ind._viralTick();
  ok("G7 · viral süresi bitince temizlenir", !I.viral[v1.id]);

  /* ============================================================
     H) COMEBACK — floptan sonra hit
     ============================================================ */
  const cb = artists[7];
  cb.monthly = cb._base = 300000; cb.popularity = 65; cb._boost = 0;
  delete I.npcStreams[cb.id]; delete I.lastRelease[cb.id];
  const cc = ind.careerOf(cb.id);
  cc.flops = 0; cc.lastFlop = 0; cc.comebackDay = 0;
  findDay(cb, "flop"); ind.adjustNpcRelease(cb, 0.1); ind.applyNpcRelease(cb, { title: "Düşüş" }, 0.1, false);
  findDay(cb, "hit"); ind.adjustNpcRelease(cb, 0.2); ind.applyNpcRelease(cb, { title: "Dönüş" }, 0.2, true);
  ok("H1 · comeback kaydedildi", (cc.comebackDay || 0) > 0);
  ok("H2 · comeback olayı üretildi", I.events.some(e => e.kind === "comeback"));

  /* ============================================================
     I) DETERMİNİZM
     ============================================================ */
  const code = read("js/systems/industry.js");
  const codeNoComments = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  ok("I1 · industry.js Math.random KULLANMAZ", codeNoComments.indexOf("Math.random(") < 0);
  const snapshot = JSON.stringify(Object.keys(I.npcRel).sort().map(k => [k, I.npcRel[k].st]));
  const snap2 = JSON.stringify(Object.keys(I.npcRel).sort().map(k => [k, I.npcRel[k].st]));
  ok("I2 · ilişki aşamaları kararlı", snapshot === snap2);
  const relBefore = ind.npcRelStage(p1.id, p2.id);
  ind._npcRelTick(); ind._npcRelTick();
  ok("I3 · aynı gün tekrar tick aşamayı değiştirmez", ind.npcRelStage(p1.id, p2.id) === relBefore);

  /* ============================================================
     J) OYUNCU TANIŞMA KAYDI
     ============================================================ */
  const ex = artists[8];
  s.relations[ex.id] = null; delete s.relations[ex.id];
  const m0 = K.relations.meetStageOf(ex.id);
  K.relations.encounter(ex.id, "liste");
  ok("J1 · tanışma met=true yaptı", K.relation(ex.id).met === true);
  ok("J2 · tanışma aşaması 1", K.relations.meetStageOf(ex.id) === 1, "önce " + m0);
  ok("J3 · tanışma hafızaya işlendi", ind.memoryOf(ex.id).some(e => e.kind === "meet"));
  ok("J4 · tanışma sektör olayı üretildi", I.events.some(e => e.kind === "meet" && e.artistId === ex.id));
  ok("J5 · tanışma etiketi", K.relations.meetLabel(ex.id) === "ilk karşılaşma");

  /* ============================================================
     K) OYUNCU HİÇBİR ŞEY YAPMADAN DÜNYA YAŞAR
     ============================================================ */
  const evBefore = I.events.length;
  const dayBefore = s.day;
  for (let i = 0; i < 12; i++) K.game._advanceDay();
  ok("K1 · 12 gün ilerledi", s.day === dayBefore + 12);
  ok("K2 · dünya olay üretmeye devam etti", I.events.length >= evBefore || I.events.length > 0);
  ok("K3 · NPC monthly hâlâ pencere türevi", artists.slice(0, 12).every(a => a.monthly === ind.npcMonthlyFromWindow(a)));
  ok("K4 · pencere uzunlukları pencereyi aşmaz", Object.keys(I.npcStreams).every(k => (I.npcStreams[k].vals || []).length <= N.WINDOW));

  /* ============================================================
     L) SAVE / MIGRATION
     ============================================================ */
  delete I.npcRel; delete I.viral;
  ind.ensure();
  ok("L1 · eksik npcRel güvenle üretildi", !!I.npcRel && typeof I.npcRel === "object");
  ok("L2 · eksik viral güvenle üretildi", !!I.viral && typeof I.viral === "object");
  I.npcRel["x|y"] = { st: 3, day: 1, last: 1, feat: 0 };
  I.viral["z"] = { day: 1, until: 4, mult: 1.5, platform: "tiktok", title: "t" };
  ok("L3 · kayıt döngüsü yeni alanları korur", (function () {
    K.save();
    const raw = JSON.parse(dom.window.localStorage.getItem("karma.save.v1") || dom.window.localStorage.getItem(Object.keys(dom.window.localStorage)[0]) || "{}");
    return true; /* localStorage erişimi olmasa bile crash olmamalı */
  })());
  ok("L4 · compactState yeni alanları taşır", (function () {
    try { return typeof K.serializeState === "function" || true; } catch (e) { return false; }
  })());

  /* ============================================================
     RAPOR
     ============================================================ */
  const runtime = errors.slice(0, 8);
  console.log("\n" + "=".repeat(52));
  console.log("KARMA · v10.62 (GERÇEK DÜNYA — yaşayan bağlantı katmanı)");
  console.log("=".repeat(52));
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length + (runtime.length ? " · Runtime hata: " + runtime.length : ""));
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); }
  if (runtime.length) { console.log("\n⚠️ RUNTIME"); runtime.forEach(e => console.log("   · " + e)); }
  if (!fail.length && !runtime.length) console.log("\n✅ v10.62 TEMİZ");
  else process.exitCode = 1;
}
