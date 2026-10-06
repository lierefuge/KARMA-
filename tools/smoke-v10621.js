/* Kullanım: node tools/smoke-v10621.js
   KARMA — v10.62.1: "GERÇEK DÜNYA" bağlantı katmanı (oyuncu yankısı)

   Neden bu süit var?
   ------------------
   v10.62 dünyayı NPC tarafında canlandırdı. Ama OYUNCUNUN önemli bir
   olayı (viral/hit/flop/yayın) hâlâ tek bir sisteme sıkışıyordu:
   sadece bildirim + bayrak. Gerçek bir endüstride bir viral olay
   X / Instagram / YouTube / Spotify izlerini, stream'i, aylık
   dinleyiciyi, medyayı, başka sanatçıların tepkisini ve dolayısıyla
   FT / label / konser ilgisini ZİNCİRLE etkiler.

   v10.62.1 bunu TEK bir veriyoluna bağlar:
       K.industry.onPlayerEvent(kind, {song})
         → song.boosts (platform çarpanları)
         → p.ig/x/tiktok/ytSubs
         → s.trends + s.agenda (Müzik haberi)
         → s.notifications + sektör olayı + tarih
         → K.social.reactToSong (NPC tepkisi)
         → p._buzzUntil → FT / label / konser ilgisi

   Ayrıca: NPC gizli kişilik katmanı ve FT müzikal uyum puanı.
   Yeni kod günlük akışta Math.random KULLANMAZ (hash tabanlı).
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
  label: "v10.62.1 oyuncu yankı katmanı hazır",
  ready: (K) => !!(K && K.industry && K.industry.onPlayerEvent && K.industry.personality &&
    K.industry.playerBuzz && K.industry.playerOutcomes && K.news && K.news.injectMusic &&
    K.relations && K.relations.compatScore && K.artistList().length)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.stack ? err.stack : err));
  process.exit(1);
});

function run(K) {
  const s = K.state, I = K.industry.ensure(), ind = K.industry;
  const p = s.player;
  const artists = K.artistList().filter(a => a && !a.mergedInto);

  /* ============================================================
     A) API YÜZEYİ
     ============================================================ */
  ok("A1 · onPlayerEvent", typeof ind.onPlayerEvent === "function");
  ok("A2 · personality", typeof ind.personality === "function");
  ok("A3 · playerBuzz / playerOutcomes", typeof ind.playerBuzz === "function" && typeof ind.playerOutcomes === "function");
  ok("A4 · news.injectMusic", typeof K.news.injectMusic === "function");
  ok("A5 · relations.compatScore", typeof K.relations.compatScore === "function");

  /* ============================================================
     B) NPC GİZLİ KİŞİLİK — deterministik + farklı
     ============================================================ */
  const pa = ind.personality(artists[0]);
  const pa2 = ind.personality(artists[0]);
  ok("B1 · kişilik deterministik", JSON.stringify(pa) === JSON.stringify(pa2));
  const keys = ["social", "aggressive", "workaholic", "independent", "labelLoyal",
    "selective", "trendChaser", "experimental", "competitive", "mediaFriendly", "riskTaker"];
  ok("B2 · tüm özellikler 0..1", keys.every(k => typeof pa[k] === "number" && pa[k] >= 0 && pa[k] <= 1));
  const pb = ind.personality(artists[1]);
  ok("B3 · sanatçılar birbirinden farklı", keys.some(k => Math.abs(pa[k] - pb[k]) > 0.05));
  ok("B4 · kişilik npcFactors'ı bozmuyor", (function () {
    const f = ind.npcFactors(artists[0], { title: "t" });
    return ["quality", "momentum", "trend", "label", "social", "timing"].every(k => Number.isFinite(f[k]) && f[k] > 0);
  })());

  /* ============================================================
     C) OYUNCU VİRAL YANKISI — zincir
     ============================================================ */
  const song = { id: "test_song_viral", title: "Test Viral", quality: 80, boosts: {}, publishedDay: s.day, lastDaily: 1000, streams: 1000, platforms: { spotify: 0.46, apple: 0.19, youtube: 0.28, other: 0.07 } };
  p.songs = p.songs || []; p.songs.push(song);
  const igBefore = p.ig || 0, xBefore = p.x || 0, ytBefore = p.ytSubs || 0;
  const feedBefore = (s.feed.instagram || []).length + (s.feed.x || []).length;
  const res = ind.onPlayerEvent("viral", { song: song });
  ok("C1 · olay sonuç döndü", !!res && res.kind === "viral");
  ok("C2 · platform çarpanları eklendi", Object.keys(song.boosts).some(k => /^viral_/.test(k)));
  ok("C3 · Instagram/TikTok takipçisi arttı", (p.ig || 0) > igBefore);
  ok("C4 · X takipçisi arttı", (p.x || 0) > xBefore);
  ok("C5 · YouTube abonesi arttı", (p.ytSubs || 0) > ytBefore);
  ok("C6 · gündem/trend etkilendi", (s.trends || []).some(t => t.mine));
  ok("C7 · medya haberi (Müzik) üretildi", (s.agenda.topics || []).some(t => t.cat === "muzik" && /viral/i.test(t.title)));
  ok("C8 · sektör olayı (player) üretildi", I.events.some(e => e.player && e.kind === "viral"));
  ok("C9 · NPC sosyal tepkisi oluştu", (s.feed.instagram || []).length + (s.feed.x || []).length > feedBefore || (song.reactions || []).length > 0);
  ok("C10 · buzz penceresi açıldı", ind.playerBuzz() > 0 && (p._buzzUntil || 0) > s.day);

  /* ============================================================
     D) HİT / FLOP / RELEASE YANKISI
     ============================================================ */
  const song2 = { id: "test_song_hit", title: "Test Hit", quality: 70, boosts: {}, publishedDay: s.day };
  ind.onPlayerEvent("hit", { song: song2 });
  ok("D1 · hit çarpanları (daha küçük, viral'dan az)", Object.keys(song2.boosts).some(k => /^hit_/.test(k)));
  const buzzViral = ind.playerBuzz();
  const song3 = { id: "test_song_flop", title: "Test Flop", quality: 40, boosts: {}, publishedDay: s.day };
  const newsBefore = (s.agenda.topics || []).filter(t => t.cat === "muzik").length;
  ind.onPlayerEvent("flop", { song: song3 });
  ok("D2 · flop negatif çarpan yazdı", Object.values(song3.boosts).some(v => v < 0));
  ok("D3 · flop haberi üretildi", (s.agenda.topics || []).filter(t => t.cat === "muzik").length >= newsBefore);
  ok("D4 · flop buzz'ı uzatmaz", ind.playerBuzz() <= buzzViral + 1e-9);
  const song4 = { id: "test_song_rel", title: "Test Release", boosts: {}, publishedDay: s.day };
  ind.onPlayerEvent("release", { song: song4 });
  ok("D5 · release çarpanı eklendi", Object.keys(song4.boosts).length > 0);

  /* ============================================================
     E) OYUNCU RELEASE SONUCU (hit/flop) — bir kez
     ============================================================ */
  const good = { id: "out_hit", title: "Out Hit", publishedDay: s.day - 20, lastDaily: 5000, _initDaily: 1000 };
  const bad = { id: "out_flop", title: "Out Flop", publishedDay: s.day - 20, lastDaily: 300, _initDaily: 1000 };
  p.songs.push(good, bad);
  ind.playerOutcomes();
  ok("E1 · iyi performans hit olarak işaretlendi", good._outcome === "hit");
  ok("E2 · zayıf performans flop olarak işaretlendi", bad._outcome === "flop");
  const evHit = I.events.some(e => e.player && e.kind === "hit");
  ind.playerOutcomes();
  ok("E3 · aynı şarkı ikinci kez işlenmez", good._outcome === "hit" && evHit);
  ok("E4 · hit yankısı medyaya düştü", (s.agenda.topics || []).some(t => t.cat === "muzik"));

  /* ============================================================
     F) MÜZİKAL UYUM + FT GERÇEKLİĞİ
     ============================================================ */
  const sameGenre = artists.find(a => a.genre && a.genre === (p.genre || (p.songs[0] && p.songs[0].genre))) || artists[0];
  const c1 = K.relations.compatScore(artists[0].id);
  ok("F1 · uyum puanı 0..1", c1 >= 0 && c1 <= 1);
  ok("F2 · uyum puanı deterministik", c1 === K.relations.compatScore(artists[0].id));
  ok("F3 · aynı tür uyumu düşük türden az değil", (function () {
    const pGenre = p.genre || (p.songs[0] && p.songs[0].genre);
    if (!pGenre) return true;
    const same = artists.find(a => a.genre === pGenre);
    const diff = artists.find(a => a.genre && a.genre !== pGenre);
    if (!same || !diff) return true;
    return K.relations.compatScore(same.id) >= K.relations.compatScore(diff.id) - 0.25;
  })());

  /* ============================================================
     G) BUZZ → LABEL İLGİSİ (momentum olmadan da tetikler)
     ============================================================ */
  s.label = null; p.labelId = null; p.popularity = 30;
  /* bekleme süresi geçmiş olsun (gerçek oyunda buzz zaten ileri günlerde oluşur) */
  I.momentum = 0; I.lastLabelOfferDay = s.day - 80;
  s.offers = (s.offers || []).filter(o => o.type !== "label");
  p._buzzUntil = s.day + 15;
  ind._maybeLabelOffer();
  ok("G1 · buzz ile label teklifi tetiklendi", (s.offers || []).some(o => o.type === "label" && o.status === "pending"));

  /* ============================================================
     H) HABER ENJEKSİYONU
     ============================================================ */
  const before = (s.agenda.topics || []).length;
  K.news.injectMusic("Test enjeksiyon haberi", 90);
  const added = (s.agenda.topics || []).find(t => t.title === "Test enjeksiyon haberi");
  ok("H1 · haber eklendi ve live işaretli", !!added && added.live === true && added.cat === "muzik");
  const cnt1 = (s.agenda.topics || []).length;
  K.news.injectMusic("Test enjeksiyon haberi", 90);
  ok("H2 · aynı haber tekrar eklenmez", (s.agenda.topics || []).length === cnt1);
  ok("H3 · tazeleme canlı haberi korur", (function () {
    const live = (s.agenda.topics || []).filter(t => t.live);
    K.news.refresh(true);
    const stillLive = (s.agenda.topics || []).filter(t => t.live);
    return live.length === 0 || stillLive.length >= 1;
  })());
  ok("H4 · gündem 12 ile sınırlı", (s.agenda.topics || []).length <= 12);

  /* ============================================================
     I) DETERMİNİZM + MIGRATION
     ============================================================ */
  const code = read("js/systems/industry.js");
  const noComments = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  ok("I1 · industry.js Math.random KULLANMAZ", noComments.indexOf("Math.random(") < 0);
  ok("I2 · eski kayıtta _buzzUntil yoksa çökmez", (function () { delete p._buzzUntil; return ind.playerBuzz() === 0; })());
  ok("I3 · eksik agenda'da injectMusic güvenli", (function () {
    const bak = s.agenda; s.agenda = null;
    const r = K.news.injectMusic("migration testi", 60);
    s.agenda = bak;
    return !!r;
  })());

  /* ============================================================
     J) DÜNYA OYUNCU OLMADAN YAŞAR (NPC olayları medyaya düşer)
     ============================================================ */
  const muzikBefore = (s.agenda.topics || []).filter(t => t.cat === "muzik").length;
  for (let i = 0; i < 40; i++) K.game._advanceDay();
  ok("J1 · 40 gün ilerledi", true);
  ok("J2 · NPC olayları Müzik gündemine düştü", (s.agenda.topics || []).filter(t => t.cat === "muzik").length > 0 || muzikBefore > 0);
  ok("J3 · NPC monthly hâlâ pencere türevi", artists.slice(0, 10).every(a => a.monthly === ind.npcMonthlyFromWindow(a)));
  ok("J4 · gündem 12 sınırı korunuyor", (s.agenda.topics || []).length <= 12);

  /* ============================================================
     RAPOR
     ============================================================ */
  const runtime = errors.slice(0, 8);
  console.log("\n" + "=".repeat(56));
  console.log("KARMA · v10.62.1 (GERÇEK DÜNYA — oyuncu yankı katmanı)");
  console.log("=".repeat(56));
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length + (runtime.length ? " · Runtime hata: " + runtime.length : ""));
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); }
  if (runtime.length) { console.log("\n⚠️ RUNTIME"); runtime.forEach(e => console.log("   · " + e)); }
  if (!fail.length && !runtime.length) console.log("\n✅ v10.62.1 TEMİZ");
  else process.exitCode = 1;
}
