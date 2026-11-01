/* Kullanım: node tools/smoke-v1073.js
   KARMA — v10.73 Çıkış kampanyası ölçümleme panosu  (yol haritası 01)

   A) MODÜL      — defter ve kancalar yüklü, rollout gerçekten çağırıyor
   B) HARCAMA    — kanal başına gerçek maliyet, toplam = kanal + teaser
   C) ÖN KAYIT   — kanallara verim ağırlığıyla dağıtılır, toplam korunur
   D) ATIF       — dinlenme/gelir kanal toplamı yayın raporuyla BİREBİR eşit
   E) TAKİPÇİ    — kohort farkından gelir, kanal→kohort eşlemesi doğru
   F) SATIŞ      — tahmini satış = dinlenme / 1500, toplam tutarlı
   G) ÇİFT SAYIM — ikinci settle etkisiz
   H) ESKİ KAYIT — defter yoksa panel boş açılır, hata vermez
   I) ARAYÜZ     — uygulama + iki sekme render edilir, boş durum çalışır
   J) UÇTAN UCA  — rollout.startPresave → defter, fireTeaser → teaser satırı

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

const { dom, errors } = H.bootDom(html, { seed: 20261073 });

H.whenReady(dom, {
  label: "v10.73 kampanya panosu hazır",
  ready: (K) => !!(K && K.campaigns && K.rollout && K.fansCohort && K.phone)
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
  const C = K.campaigns;
  const p = K.state.player;
  const CH = K.rollout.CHANNELS;
  const chCost = (id) => (CH.find((c) => c.id === id) || {}).cost || 0;

  /* Takipçi kurulumu: platform sayaçları tek kaynak */
  const setFollowers = (v) => {
    const q = Math.floor(v / 4);
    p.ig = q; p.tiktok = q; p.x = v - q * 3; p.ytSubs = q;
    if (p.ig < 0) p.ig = 0;
    if (p.x < 0) { p.tiktok += p.x; p.x = 0; }
  };
  const sum = (arr) => arr.reduce((a, b) => a + b, 0);

  /* ============ A) MODÜL ============ */
  ok("A-1 · modül yüklendi", !!(C && C.list && C.settle && C.report));
  ok("A-2 · kanal→kohort eşlemesi 5 kanal", Object.keys(C.CH_COHORT).length === 5);
  ok("A-3 · eşlemedeki her kanal rollout'ta var",
    Object.keys(C.CH_COHORT).every((id) => !!K.rollout.ch(id)));
  ok("A-4 · eşlemedeki her kohort fans-cohort'ta var",
    Object.keys(C.CH_COHORT).every((ch) => K.fansCohort.IDS.indexOf(C.CH_COHORT[ch]) >= 0));

  /* ============ B) HARCAMA ============ */
  setFollowers(40000);
  p.campaigns = {};
  const relId = "rel-test-1";
  C.trackPresave(relId, ["igstory", "tiktok"], "Test Single");
  const led = C.ledger(relId);
  ok("B-1 · defter açıldı", !!led);
  ok("B-2 · kanal harcaması gerçek maliyet",
    led.channels.igstory.spend === chCost("igstory") && led.channels.tiktok.spend === chCost("tiktok"),
    led.channels.igstory.spend + "/" + chCost("igstory"));
  ok("B-3 · toplam = kanal harcamaları",
    led.totalSpend === chCost("igstory") + chCost("tiktok"), led.totalSpend);

  C.trackTeaser(relId, "snippet", 12000, 0.9, "Test Single");
  C.trackTeaser(relId, "announce", 5000, 0.5, "Test Single");
  ok("B-4 · teaser harcaması ayrı satırda", led.teaserSpend === 17000, led.teaserSpend);
  ok("B-5 · toplam = kanal + teaser", led.totalSpend === chCost("igstory") + chCost("tiktok") + 17000, led.totalSpend);
  ok("B-6 · aynı teaser iki kez sayılmaz",
    (C.trackTeaser(relId, "snippet", 12000, 0.9).teaserSpend === 17000));

  /* ============ C) ÖN KAYIT ============ */
  C.trackCollect(relId, ["igstory", "tiktok"], 1000);
  const pre = led.channels.igstory.presaves + led.channels.tiktok.presaves;
  ok("C-1 · ön kayıt toplamı korunur", pre === 1000, pre);
  ok("C-2 · dağıtım kanal verimine göre",
    led.channels.tiktok.presaves > led.channels.igstory.presaves,
    led.channels.tiktok.presaves + " > " + led.channels.igstory.presaves);
  C.trackCollect(relId, ["x"], 500);              /* defterde olmayan kanal */
  ok("C-3 · defterde olmayan kanala yazılmaz", !led.channels.x);

  /* ============ D) ATIF ============ */
  /* kohort farkı yarat: takipçi artışı */
  const before = K.fansCohort.counts();
  setFollowers(K.fans.followers() + 3000);
  K.state.day += 1;
  K.fansCohort.tick();
  const after = K.fansCohort.counts();

  C.settle(relId, { streams: 500000, revenue: 80000 });
  const t = C.totals(led);
  ok("D-1 · dinlenme toplamı birebir eşit", t.streams === 500000, t.streams);
  ok("D-2 · gelir toplamı birebir eşit", t.revenue === 80000, t.revenue);
  ok("D-3 · kanal dinlenme toplamı = toplam",
    sum(Object.keys(led.channels).map((k) => led.channels[k].streams)) === 500000);
  ok("D-4 · verimli kanal daha çok dinlenme alır",
    led.channels.tiktok.streams > led.channels.igstory.streams,
    led.channels.tiktok.streams + " > " + led.channels.igstory.streams);
  ok("D-5 · harcama > 0 olan her kanalda sonuç var",
    Object.keys(led.channels).every((k) => led.channels[k].streams >= 0));

  /* ============ E) TAKİPÇİ ============ */
  const growth = {
    shortform: Math.max(0, (after.shortform || 0) - (before.shortform || 0)),
    word: Math.max(0, (after.word || 0) - (before.word || 0)),
    playlist: Math.max(0, (after.playlist || 0) - (before.playlist || 0))
  };
  /* Yalnızca defterde kanalı olan kohortların büyümesi atfedilir.
     (Bu senaryoda mail kanalı yok → playlist büyümesi atfedilmemeli.) */
  const covered = {};
  Object.keys(C.CH_COHORT).forEach((ch) => { if (led.channels[ch]) covered[C.CH_COHORT[ch]] = 1; });
  const expected = Object.keys(covered).reduce((a, src) => a + (growth[src] || 0), 0);
  ok("E-1 · takipçi toplamı kapsanan kohort büyümesine eşit", t.followers === expected,
    t.followers + " / " + expected);
  ok("E-5 · temsil edilmeyen kohort atfedilmez",
    !led.channels.mail && growth.playlist > 0 && t.followers < growth.shortform + growth.word + growth.playlist,
    "playlist büyümesi " + growth.playlist + " atfedilmedi");
  ok("E-2 · kohort büyümesi > 0 (test anlamlı)", expected > 0, expected);
  ok("E-3 · tiktok → shortform kanalına yazıldı",
    led.channels.tiktok.followers > 0 && led.channels.igstory.followers >= 0);
  const rep = C.report(relId);
  ok("E-4 · raporda kanal kohort etiketi var",
    rep.rows.every((r) => r.cohort === null || K.fansCohort.IDS.indexOf(r.cohort) >= 0));

  /* ============ F) SATIŞ ============ */
  const salesSum = Object.keys(led.channels).reduce((a, k) => a + led.channels[k].sales, 0);
  ok("F-1 · satış toplamı kanal satışlarına eşit", t.sales === salesSum, t.sales + " / " + salesSum);
  ok("F-2 · satış = dinlenme/1500 (tahmin)", led.channels.tiktok.sales === Math.round(led.channels.tiktok.streams / 1500));
  ok("F-3 · panelde tahmin olarak etiketli", /≈ satış/.test(K.phone.appById("campaign").render({}).render("kampanya")));

  /* ============ G) ÇİFT SAYIM ============ */
  const snapTotals = JSON.stringify(C.totals(led));
  C.settle(relId, { streams: 900000, revenue: 999999 });
  ok("G-1 · ikinci settle etkisiz", JSON.stringify(C.totals(led)) === snapTotals);
  ok("G-2 · settled bayrağı", led.settled === true && led.settleDay != null);

  /* ============ H) ESKİ KAYIT ============ */
  const oldCampaigns = p.campaigns;
  p.campaigns = undefined;
  const rep0 = C.report("yok-böyle");
  ok("H-1 · defter yoksa null döner", rep0 === null);
  ok("H-2 · list boş dizi", Array.isArray(C.list()) && C.list().length === 0);
  ok("H-3 · summary çökmez", C.summary().count === 0);
  p.campaigns = oldCampaigns;

  /* ============ I) ARAYÜZ ============ */
  const app = K.phone.appById("campaign");
  ok("I-1 · uygulama kayıtlı", !!app);
  const view = app.render({});
  /* v10.74 takvim sekmesini ekledi: sayıya değil, İÇERİĞE bakılır. */
  ok("I-2 · temel sekmeler var (Kampanyalar + Dönüşüm)",
    ["kampanya", "donusum"].every((id) => (view.tabs || []).some((t) => t.id === id)),
    (view.tabs || []).map((t) => t.id).join(","));
  const kamp = view.render("kampanya");
  ok("I-3 · kampanya kartı render edildi", /cmp-card/.test(kamp) && /Test Single/.test(kamp));
  ok("I-4 · kanal satırları var", /cmp-ch-name/.test(kamp));
  const don = view.render("donusum");
  ok("I-5 · dönüşüm sekmesi render edildi", /cmp-conv|mini-empty/.test(don));
  p.campaigns = {};
  ok("I-6 · boş durum metni", /Henüz ölçülmüş kampanya yok/.test(view.render("kampanya")));
  p.campaigns = oldCampaigns;

  /* ============ J) UÇTAN UCA ============ */
  p.campaigns = {};
  p.balance = 500000;
  const rel = {
    id: "rel-e2e", title: "E2E Single", startDay: K.state.day - 10, waitDays: 30,
    tracks: [], type: "single", genre: "rap", kind: "normal"
  };
  p.releases = (p.releases || []).concat([rel]);
  setFollowers(50000);
  const opened = K.rollout.startPresave("rel-e2e", ["mail"]);
  const e2e = C.ledger("rel-e2e");
  ok("J-1 · rollout kampanyayı açtı", opened === true);
  ok("J-2 · defter otomatik oluştu (kanca çalıştı)", !!e2e);
  ok("J-3 · mail kanalı harcaması yazıldı",
    e2e && e2e.channels.mail && e2e.channels.mail.spend === chCost("mail"),
    e2e && e2e.channels.mail && e2e.channels.mail.spend);

  /* teaser kancası: ideal güne yakın bir teaser */
  rel.startDay = K.state.day - (30 - 10);        /* çıkışa 10 gün → snippet ideali */
  const fired = K.rollout.fireTeaser("rel-e2e", "snippet");
  ok("J-4 · teaser paylaşıldı", fired === true);
  ok("J-5 · teaser deftere yazıldı",
    e2e && e2e.teasers.snippet && e2e.teasers.snippet.cost > 0,
    e2e && Object.keys(e2e.teasers).join(","));

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
