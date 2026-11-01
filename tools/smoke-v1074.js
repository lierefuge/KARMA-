/* Kullanım: node tools/smoke-v1074.js
   KARMA — v10.74 Sosyal medya içerik takvimi  (yol haritası 16)

   A) MODÜL      — takvim + platform/format tabloları tutarlı
   B) PLANLAMA   — içerik TEK kez planlanır, geçmiş güne plan yok
   C) FORMAT     — format yalnızca desteklediği platformda planlanır
   D) DOYGUNLUK  — aynı gün 3'ten fazla plan uyarı üretir
   E) TİCK       — kaçan plan "missed" olur, eski kayıtlar düşer
   F) YAYIN      — yayınlama sosyal sisteme devredilir, postId bağlanır
   G) KAMPANYA   — platform ↔ kanal harcaması panosuyla eşleşir, tempo etiketi
   H) ÖNERİ      — yayına göre iskelet takvim, mevcut plana dokunmaz
   I) KAYIT      — plan çevrimdışı kayıtta (JSON) korunur
   J) ARAYÜZ     — 🗓 sekme render edilir, boş durum ve eylemler çalışır

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

const { dom, errors } = H.bootDom(html, { seed: 20261074 });

H.whenReady(dom, {
  label: "v10.74 içerik takvimi hazır",
  ready: (K) => !!(K && K.contentCalendar && K.social && K.campaigns && K.phone)
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
  const CC = K.contentCalendar;
  const p = K.state.player;
  const day = K.state.day;

  /* ============ A) MODÜL ============ */
  ok("A-1 · modül yüklendi", !!(CC && CC.plan && CC.report));
  ok("A-2 · 4 platform tanımlı", CC.PLATFORMS.length === 4, CC.PLATFORMS.length);
  ok("A-3 · her platform bir kampanya kanalına bağlı",
    CC.PLATFORMS.every((pf) => !!K.rollout.ch(pf.channel)),
    CC.PLATFORMS.map((pf) => pf.id + "→" + pf.channel).join(","));
  ok("A-4 · her format en az bir platformda geçerli",
    CC.FORMATS.every((f) => f.plats.length > 0 && f.plats.every((id) => !!CC.plat(id))));
  ok("A-5 · format gönderi türleri sosyal sistemde var",
    CC.FORMATS.every((f) => !!K.social.POST_TYPES[f.postType]));

  /* ============ B) PLANLAMA ============ */
  CC._reset();
  const it1 = CC.plan("ig", "story", day + 1);
  ok("B-1 · plan oluştu", !!it1 && it1.status === "planned");
  ok("B-2 · aynı içerik ikinci kez planlanamaz", CC.plan("ig", "story", day + 1) === null);
  ok("B-3 · farklı gün planlanabilir", !!CC.plan("ig", "story", day + 2));
  ok("B-4 · geçmiş güne plan yok", CC.plan("ig", "story", day - 1) === null);
  ok("B-5 · iptal planı siler", CC.cancel(it1.id) === true && CC.items().length === 1);
  ok("B-6 · yayınlanmış plan iptal edilemez",
    (() => { const it = CC.plan("tiktok", "shortform", day + 1); CC.publish(it.id); return CC.cancel(it.id) === false; })());

  /* ============ C) FORMAT ============ */
  ok("C-1 · hikâye yalnızca Instagram'da",
    CC.plan("tiktok", "story", day + 3) === null && !!CC.plan("ig", "story", day + 3));
  ok("C-2 · klip X'te planlanamaz", CC.plan("x", "clip", day + 4) === null);
  ok("C-3 · kısa video üç platformda",
    ["tiktok", "yt", "ig"].every((pl, i) => !!CC.plan(pl, "shortform", day + 5 + i)));

  /* ============ D) DOYGUNLUK ============ */
  CC._reset();
  const dd = day + 1;
  CC.plan("ig", "story", dd); CC.plan("tiktok", "shortform", dd); CC.plan("x", "post", dd);
  const check = CC.canPlan("yt", "clip", dd);
  ok("D-1 · 3 plan sonrası doygunluk uyarısı", check.ok === true && check.saturated === true, check.why);
  CC.plan("yt", "clip", dd);
  const rep0 = CC.report();
  ok("D-2 · rapor doygun günü listeler", rep0.saturatedCount === 1 && rep0.saturated[0] === dd);

  /* ============ E) TİCK ============ */
  CC._reset();
  const past = CC.plan("ig", "story", day + 1);
  const future = CC.plan("ig", "story", day + 5);
  K.state.day += 3;
  const missed = CC.tick();
  ok("E-1 · geçen plan missed oldu", missed === 1 && past.status === "missed", missed);
  ok("E-2 · gelecek plan korunur", future.status === "planned");
  const stale = { id: "old", platform: "ig", format: "story", day: K.state.day - 200, status: "published" };
  CC.items().push(stale);
  CC.tick();
  ok("E-3 · 90 günden eski kayıt düşer", !CC.items().some((x) => x.id === "old"));
  K.state.day = day;

  /* ============ F) YAYIN ============ */
  CC._reset();
  const toPub = CC.plan("tiktok", "shortform", K.state.day);
  const feedBefore = (K.state.feed.tiktok || []).length;
  const pub = CC.publish(toPub.id);
  ok("F-1 · yayınlama başarılı", pub === true && toPub.status === "published");
  ok("F-2 · sosyal akışa gönderi düştü",
    (K.state.feed.tiktok || []).length === feedBefore + 1,
    feedBefore + " → " + (K.state.feed.tiktok || []).length);
  ok("F-3 · gönderi kimliği plana bağlandı", !!toPub.postId);
  ok("F-4 · yayın günü yazıldı", toPub.publishedDay === K.state.day);
  ok("F-5 · yayınlanmış plan ikinci kez yayınlanmaz", CC.publish(toPub.id) === false);

  /* ============ G) KAMPANYA BAĞI ============ */
  /* kanal harcaması olan bir kampanya defteri kur */
  p.campaigns = {};
  K.campaigns.trackPresave("rel-cal", ["tiktok"], "Takvim Test");
  const chStats = CC.channelStats("tiktok");
  ok("G-1 · kanal harcaması panodan okunuyor", chStats.spend === K.rollout.ch("tiktok").cost, chStats.spend);
  const rep1 = CC.report();
  const rowTiktok = rep1.rows.find((r) => r.id === "tiktok");
  ok("G-2 · platform satırında harcama görünür", rowTiktok.spend > 0);
  ok("G-3 · platform ↔ kanal eşleşmesi doğru", rowTiktok.channel === "tiktok");
  /* harcama var, plan yok → idle */
  CC._reset();
  const rep2 = CC.report();
  ok("G-4 · harcama var plan yok → 'idle'",
    rep2.rows.find((r) => r.id === "tiktok").tempo === "idle",
    rep2.rows.find((r) => r.id === "tiktok").tempo);
  /* plan var, harcama yok → organic */
  p.campaigns = {};
  CC._reset();
  CC.plan("ig", "story", K.state.day + 1);
  ok("G-5 · plan var harcama yok → 'organic'",
    CC.report().rows.find((r) => r.id === "ig").tempo === "organic");
  ok("G-6 · toplam harcama tüm kanalların toplamı",
    CC.report().totalSpend === CC.PLATFORMS.reduce((a, pf) => a + CC.channelStats(pf.channel).spend, 0));

  /* ============ H) ÖNERİ ============ */
  CC._reset();
  const rel = { id: "rel-sug", title: "Öneri Single", startDay: K.state.day - 20, waitDays: 30, tracks: [], type: "single", genre: "rap", kind: "normal" };
  p.releases = (p.releases || []).concat([rel]);
  const added = CC.suggest("rel-sug");
  ok("H-1 · iskelet plan üretildi", added.length >= 5, added.length);
  ok("H-2 · geçmiş slot planlanmaz", added.every((it) => it.day >= K.state.day));
  ok("H-3 · çıkış günü planı var",
    added.some((it) => it.day === rel.startDay + rel.waitDays && it.format === "shortform"));
  const before = CC.items().length;
  CC.suggest("rel-sug");
  ok("H-4 · ikinci öneri mevcut planı çoğaltmaz", CC.items().length === before);

  /* ============ I) KAYIT ============ */
  const saved = JSON.parse(JSON.stringify({ contentPlan: p.contentPlan }));
  ok("I-1 · plan JSON ile serileşir", Array.isArray(saved.contentPlan.items) && saved.contentPlan.items.length > 0);
  const backup = p.contentPlan;
  p.contentPlan = JSON.parse(JSON.stringify(backup));
  ok("I-2 · çevrimdışı kayıttan geri yüklenir", K.contentCalendar.items().length === backup.items.length);
  p.contentPlan = undefined;
  ok("I-3 · plan yoksa boş takvim açılır",
    CC.items().length === 0 && CC.report().counts.planned === 0);

  /* ============ J) ARAYÜZ ============ */
  p.contentPlan = backup;
  const app = K.phone.appById("campaign");
  ok("J-1 · uygulama kayıtlı", !!app);
  const view = app.render({});
  ok("J-2 · üç sekme var", (view.tabs || []).length === 3, (view.tabs || []).length);
  ok("J-3 · takvim sekmesi tanımlı", (view.tabs || []).some((t) => t.id === "takvim"));
  const kamp = view.render("takvim");
  ok("J-4 · takvim render edildi", /cc-plat/.test(kamp) && /İçerik takvimi/.test(kamp));
  ok("J-5 · hızlı plan düğmeleri var", /data-pact="cal-plan"/.test(kamp));
  p.contentPlan = undefined;
  ok("J-6 · boş durumda da render edilir", /Planlanmış içerik yok/.test(view.render("takvim")));
  ok("J-7 · diğer sekmeler bozulmadı",
    /Kampanya ölçümü|fans-card/.test(view.render("kampanya")) && /Kohort dönüşümü|Dönüşüm/.test(view.render("donusum")));

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
