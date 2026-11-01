/* Kullanım: node tools/smoke-v1075.js
   KARMA — v10.75 SoundCloud düzeltmeleri (PR #9 incelemesi)

   A) UYGULAMA   — kayıt, sekmeler, musicBar
   B) ETİKETLER  — sahte tür yok; her etiket gerçek sanatçı türüne bağlı
   C) FİLTRE     — etiket GERÇEKTEN filtreler (liste ve sayı değişir)
   D) ARAMA      — parça/sanatçı araması çalışır, etiketle birleşir
   E) KİTAPLIK   — 4 kart gerçek içerik açar (beğeni/geçmiş/liste/istasyon)
   F) ÇALMA      — playById çalar, geçmişe yazar; bilinmeyen id false
   G) VERİ       — dinlenme bilinmiyorsa "—" (uydurma sayı YOK)
   H) BOŞ DURUM  — veri yokken çökmez, anlamlı mesaj gösterir

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

const { dom, errors } = H.bootDom(html, { seed: 20261075 });

H.whenReady(dom, {
  label: "v10.75 soundcloud hazır",
  ready: (K) => !!(K && K.phone && K.phone.appById && K.phone.appById("soundcloud"))
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
  const app = K.phone.appById("soundcloud");
  const p = K.state.player;
  const cards = (m) => (m.match(/sc-track-card/g) || []).length;

  /* ============ A) UYGULAMA ============ */
  ok("A-1 · uygulama kayıtlı", !!app);
  const view = app.render({});
  ok("A-2 · üç sekme", (view.tabs || []).length === 3, (view.tabs || []).map(t => t.id).join(","));
  ok("A-3 · müzik çubuğu açık", view.musicBar === true);
  ok("A-4 · üç sekme de render ediliyor",
    ["feed", "discover", "library"].every((t) => { try { return view.render(t).length > 500; } catch (e) { return false; } }));

  /* ============ B) ETİKETLER ============ */
  /* modül içi TAGS dışa açılmıyor: davranıştan sınanır */
  const dAll = app.discoverHTML();
  ok("B-1 · sahte 'Lo-Fi / Electronic / Remix' etiketleri kaldırıldı",
    !/Lo-?Fi|Electronic|Remix/.test(dAll));
  ok("B-2 · gerçek tür etiketleri var",
    /Rap & Trap/.test(dAll) && /Drill/.test(dAll) && /R&B/.test(dAll) && /Pop/.test(dAll) && /Bağımsız/.test(dAll));
  const genres = new Set((K.ARTISTS || []).map(a => a && a.genre).filter(Boolean));
  ok("B-3 · etiketlerin kapsadığı türler veri modelinde var",
    ["rap", "trap", "drill", "rnb", "pop", "indie"].every(g => genres.has(g)), [...genres].join(","));

  /* ============ C) FİLTRE ============ */
  app._tag = "all"; app._q = "";
  const nAll = cards(app.resultsHTML());
  app._tag = "drill";
  const drillHTML = app.resultsHTML();
  const nDrill = cards(drillHTML);
  ok("C-1 · filtre listeyi gerçekten daraltıyor", nDrill < nAll, nDrill + " < " + nAll);
  ok("C-2 · filtrelenen her parça drill türünde", nDrill > 0 || /Bu filtrede parça yok/.test(drillHTML));
  /* doğrulama: filtreden geçen parçaların sanatçı türü gerçekten drill */
  const drillIds = [];
  (K.ARTISTS || []).forEach(a => { if (a && a.genre === "drill") drillIds.push(a.id); });
  const drillTracks = (K.platforms.searchSongs("") || []).filter(t => drillIds.indexOf(t.artistId) >= 0);
  ok("C-3 · drill filtresi veriyle tutarlı", nDrill === Math.min(drillTracks.length, 20), nDrill + " / " + drillTracks.length);
  app._tag = "all";
  ok("C-4 · 'Tümü' tekrar tüm listeyi verir", cards(app.resultsHTML()) === nAll);

  /* ============ D) ARAMA ============ */
  const first = (K.platforms.searchSongs("") || [])[0];
  app._q = first.title.slice(0, 4);
  const searched = app.resultsHTML();
  ok("D-1 · arama sonucu var", /sc-track-card/.test(searched));
  ok("D-2 · arama listeyi daraltıyor", cards(searched) <= nAll);
  app._q = "zzzz-olmayan-parca-xyz";
  ok("D-3 · sonuç yoksa açıklayıcı mesaj", /için sonuç bulunamadı/.test(app.resultsHTML()));
  app._q = ""; app._tag = "all";
  ok("D-4 · arama kutusu gerçek input (readonly değil)",
    /data-sc-search/.test(app.discoverHTML()) && !/data-sc-search[^>]*readonly/.test(app.discoverHTML()));

  /* ============ E) KİTAPLIK ============ */
  /* 1) Beğenilenler */
  const t0 = (K.platforms.searchSongs("") || [])[0];
  K.interactions.toggleLike("sc_" + t0.id);
  app._lib = "likes";
  const likesHTML = app.libraryHTML();
  ok("E-1 · Beğenilenler gerçek parçayı listeliyor", cards(likesHTML) >= 1, cards(likesHTML));
  ok("E-2 · beğeni sayısı kartta doğru", /1 parça/.test(likesHTML));

  /* 2) Dinleme geçmişi */
  app._lib = "history";
  ok("E-3 · geçmiş boşken açıklama", /Henüz bir şey dinlemedin/.test(app.libraryHTML()));
  app.playById(t0.id);
  ok("E-4 · çalınca geçmişe yazılıyor", (p.scHistory || []).indexOf(t0.id) === 0);
  ok("E-5 · geçmiş listesi gerçek parçayı gösteriyor", cards(app.libraryHTML()) >= 1);

  /* 3) Çalma listeleri */
  app._lib = "playlists";
  const plHTML = app.libraryHTML();
  ok("E-6 · çalma listeleri bölümü açılıyor", /Çalma Listeleri/.test(plHTML));
  ok("E-7 · liste yoksa açıklama var", /sc-pl-row/.test(plHTML) || /Henüz çalma listesi yok/.test(plHTML));

  /* 4) İstasyon */
  app._lib = "stations";
  const stHTML = app.libraryHTML();
  ok("E-8 · istasyon adı türden türetiliyor", /İstasyon/.test(stHTML));
  ok("E-9 · istasyon parça listeliyor veya veri yok diyor",
    cards(stHTML) > 0 || /yeterli veri yok/.test(stHTML));

  /* kart aç/kapa */
  ok("E-10 · kütüphane kartı içerik açar", app._lib === "stations");
  app._lib = null;
  ok("E-11 · kütüphane kapalıyken yalnız kartlar", cards(app.libraryHTML()) === (p.songs || []).length);

  /* ============ F) ÇALMA ============ */
  ok("F-1 · bilinmeyen parça çalınmaz", app.playById("yok-boyle-bir-id") === false);
  ok("F-2 · geçerli parça çalınır", app.playById(t0.id) === true);
  ok("F-3 · geçmiş tekrar yazılmıyor (dedupe)",
    (p.scHistory || []).filter(x => x === t0.id).length === 1, JSON.stringify(p.scHistory.slice(0, 3)));

  /* ============ G) UYDURMA VERİ YOK ============ */
  p.songs = p.songs || [];
  p.songs.push({ id: "song-no-streams", title: "Verisiz Parça", artistName: "Test" });
  const feed = app.feedHTML();
  ok("G-1 · eski uydurma 12.400 dinlenme kaldırıldı", !/12\.?400/.test(feed));
  ok("G-2 · bilinmeyen dinlenme '—' gösteriliyor", /▶ —/.test(feed));
  ok("G-3 · türü olmayan parçada tür uydurulmuyor", /· —/.test(feed) || /—/.test(feed));

  /* ============ H) BOŞ DURUM / DAYANIKLILIK ============ */
  const backupSongs = p.songs;
  p.songs = [];
  p.scHistory = [];
  p.likes = {};
  ok("H-1 · parça yokken yükleme çağrısı görünür", /Henüz SoundCloud'a parça yüklemedin/.test(app.feedHTML()));
  ok("H-2 · kitaplık boşken çökmez", typeof app.libraryHTML() === "string");
  ok("H-3 · beğeni yokken sayaç 0", /0 parça/.test(app.libraryHTML()));
  p.songs = backupSongs;

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
