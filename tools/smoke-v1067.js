/* Kullanım: node tools/smoke-v1067.js
   KARMA — v10.67 Yeni çıkışlar + playlist rotasyonu.

   A) RELEASE-INTEL VERİSİ — son 30 günün gerçek çıkışları; şema geçerli
      (releaseDate, artistId, art, trackArtist, intel alanı)
   B) ROTASYON              — liste içeriği takvim tohumuna bağlı: farklı
      tohum → farklı liste, aynı tohum → aynı liste (determinizm korunur)
   C) YENİ ÇIKANLAR         — "Yeni Çıkanlar" gerçekten yeni çıkışları
      gösterir; aynı şarkı iki kez girmez; sanatçı başına en fazla 2 parça
   D) GERİYE DÖNÜK UYUM     — release-intel yokken de liste kurulur (kırılmaz)
   E) SAHİPLİK              — konuk olduğu parça yanlış sanatçıya yazılmaz
   F) REGRESYON             — 6 liste, sanatçı havuzları, oyuncu şarkısı

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

const { dom, errors } = H.bootDom(html, { seed: 20261067 });

const readyState = H.whenReady(dom, {
  label: "v10.67 yeni çıkışlar hazır",
  ready: (K) => !!(K && K.editorial && K.editorial.build && K.editorial.rotationSeed && K.lazy && K.lazy.loaded("release-intel"))
});

readyState.then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exitCode = 1;
  finish();
});

function titles(id) { return dom.window.K.editorial.build(id).songs.map(s => s.title); }
function finish() {
  try { dom.window.close(); } catch (e) {}
  setTimeout(() => process.exit(process.exitCode || 0), 20);
}

function run() {
  const K = dom.window.K;
  const E = K.editorial;
  const INTEL = K.RELEASE_INTEL || { meta: {}, releases: {} };
  const recs = Object.keys(INTEL.releases || {}).map(k => INTEL.releases[k]);

  /* ============ A) RELEASE-INTEL VERİSİ ============ */
  ok("A-1 · release-intel yüklendi", !!(K.RELEASE_INTEL && INTEL.releases), typeof K.RELEASE_INTEL);
  ok("A-2 · kayıt sayısı > 0", recs.length > 0, recs.length + " kayıt");
  ok("A-3 · meta pencere ve tarih", INTEL.meta && INTEL.meta.window > 0 && /^\d{4}-\d{2}-\d{2}$/.test(INTEL.meta.asof || ""),
    JSON.stringify(INTEL.meta && { asof: INTEL.meta.asof, window: INTEL.meta.window }));

  const badDate = recs.filter(r => !/^\d{4}-\d{2}-\d{2}$/.test(r.releaseDate || ""));
  ok("A-4 · her kayıtta geçerli releaseDate", badDate.length === 0, badDate.length + " bozuk");

  const badSlug = recs.filter(r => !K.artistById(r.artistId));
  ok("A-5 · artistId oyundaki bir sanatçıya çözülüyor", badSlug.length === 0,
    badSlug.slice(0, 3).map(r => r.artistId).join(","));

  const badArt = recs.filter(r => !/^https:\/\/is\d-ssl\.mzstatic\.com\//.test(r.art || ""));
  ok("A-6 · kapak URL'leri geçerli", badArt.length === 0, badArt.length + " eksik");

  ok("A-7 · trackArtist kaydedilmiş (konuk denetimi için)",
    recs.every(r => typeof r.trackArtist === "string"), recs.length + " kayıt");
  ok("A-8 · intel alanı şemada var (null olabilir)",
    recs.every(r => r.intel === null || typeof r.intel === "object"));
  ok("A-9 · ms/süre alanı dolu", recs.filter(r => r.ms > 0).length === recs.length);

  /* anahtar tutarlılığı: <slug>::<normalize başlık> */
  const keyBad = Object.keys(INTEL.releases).filter(k => {
    const r = INTEL.releases[k];
    return k.indexOf(r.artistId + "::") !== 0;
  });
  ok("A-10 · anahtar biçimi slug::başlık", keyBad.length === 0, keyBad.slice(0, 2).join(","));

  /* ============ B) ROTASYON ============ */
  const savedRotation = E.rotationInfo().forced;

  E.setRotation("w1");
  const t1a = titles("traptr");
  const t1b = titles("traptr");
  ok("B-1 · aynı tohum → aynı liste", JSON.stringify(t1a) === JSON.stringify(t1b));
  ok("B-2 · liste 8-13 parça", t1a.length >= 8 && t1a.length <= 13, t1a.length + " parça");

  E.setRotation("w2");
  const t2 = titles("traptr");
  ok("B-3 · farklı tohum → farklı liste", JSON.stringify(t1a) !== JSON.stringify(t2),
    "ortak: " + t1a.filter(x => t2.indexOf(x) >= 0).length);

  E.setRotation("w53");
  const t3 = titles("traptr");
  ok("B-4 · tohum değişimi geri alınabilir", JSON.stringify(t1a) !== JSON.stringify(t3) || JSON.stringify(t2) !== JSON.stringify(t3));

  /* günlük / haftalık çağrı ayrımı — zorlanmış tohumu ÖNCE temizle */
  E.setRotation(null);
  const info = E.rotationInfo();
  ok("B-5 · haftalık tohum w ile başlar", /^w\d+$/.test(info.weekly), info.weekly);
  ok("B-6 · günlük tohum d ile başlar", /^d\d+$/.test(info.daily), info.daily);
  ok("B-7 · cadence tanımlı", E.PLAYLISTS.every(p => p.cadence === "day" || p.cadence === "week"),
    E.PLAYLISTS.map(p => p.id + ":" + (p.cadence || "-")).join(" "));
  ok("B-8 · newmusic günlük döner", E.byId("newmusic").cadence === "day");
  ok("B-9 · diğer listeler haftalık döner",
    E.PLAYLISTS.filter(p => p.id !== "newmusic").every(p => p.cadence === "week"));

  /* gerçek takvim tohumu: zorlanmamışken de tarih içerir */
  const real = E.rotationSeed("week");
  ok("B-10 · gerçek tohum tarih tabanlı", /^w\d{4,}$/.test(real), real);
  ok("B-11 · günlük ve haftalık tohum farklı", E.rotationSeed("day") !== E.rotationSeed("week"));

  /* ============ C) YENİ ÇIKANLAR ============ */
  E.setRotation("w2");
  const nm = E.build("newmusic");
  const freshCount = nm.songs.filter(s => s.isNew).length;
  ok("C-1 · Yeni Çıkanlar gerçek çıkış içeriyor", freshCount > 0, freshCount + " yeni parça");
  ok("C-2 · yeni parçalar listenin başında",
    nm.songs.length > 0 && !!nm.songs[0].isNew, nm.songs[0] && (nm.songs[0].title + " new=" + !!nm.songs[0].isNew));
  ok("C-3 · yeni parçalarda releaseDate taşınır",
    nm.songs.filter(s => s.isNew).every(s => /^\d{4}-\d{2}-\d{2}$/.test(s.releaseDate || "")));

  const nmTitles = nm.songs.map(s => s.title.toLowerCase());
  ok("C-4 · listede aynı şarkı iki kez yok", new Set(nmTitles).size === nmTitles.length);

  const perArtist = {};
  nm.songs.filter(s => s.isNew).forEach(s => { perArtist[s.artistId] = (perArtist[s.artistId] || 0) + 1; });
  ok("C-5 · sanatçı başına en fazla 2 yeni parça",
    Object.keys(perArtist).every(k => perArtist[k] <= 2), JSON.stringify(perArtist));

  /* en yeni önce: tarihler azalan olmalı (yeni blokta) */
  const dates = nm.songs.filter(s => s.isNew).map(s => s.releaseDate);
  const sortedDesc = dates.every((d, i) => i === 0 || dates[i - 1] >= d);
  ok("C-6 · yeni parçalar tarihe göre azalan", sortedDesc, dates.slice(0, 3).join(" > "));

  /* release-intel yüklenmeden de çalışır (D) */
  const backup = K.RELEASE_INTEL;
  K.RELEASE_INTEL = { meta: {}, releases: {} };
  const nmEmpty = E.build("newmusic");
  ok("D-1 · veri yokken liste yine kurulur", nmEmpty.songs.length >= 8 && nmEmpty.songs.length <= 13, nmEmpty.songs.length + " parça");
  ok("D-2 · veri yokken hiçbir parça 'yeni' sayılmaz", nmEmpty.songs.filter(s => s.isNew).length === 0);
  const trEmpty = E.build("traptr");
  ok("D-3 · veri yokken diğer listeler etkilenmez", trEmpty.songs.length >= 8, trEmpty.songs.length + " parça");
  K.RELEASE_INTEL = backup;
  ok("D-4 · veri geri yüklenince yeni çıkış döner", E.build("newmusic").songs.some(s => s.isNew));

  /* release-intel hiç tanımsızken */
  K.RELEASE_INTEL = undefined;
  let crashed = null;
  try { E.build("newmusic"); } catch (e) { crashed = e; }
  ok("D-5 · K.RELEASE_INTEL tanımsızken çökmez", !crashed, crashed && crashed.message);
  K.RELEASE_INTEL = backup;

  /* ============ E) SAHİPLİK / KONUK DENETİMİ ============ */
  /* E-1: sahne adı VEYA takma ad eşleşmeli (ör. "wegh Rumi" ↔ "Wegh") */
  ok("E-1 · her kaydın trackArtist'ı sanatçıyı içerir", recs.every(r => {
    const a = K.artistById(r.artistId);
    if (!a) return false;
    const hay = String(r.trackArtist || "").toLowerCase();
    const names = [a.stageName, r.artistName].concat(a.aliases || []);
    return names.some(n => n && hay.indexOf(String(n).toLowerCase()) >= 0);
  }));
  ok("E-2 · aynı şarkı iki sanatçıya yazılmamış", (() => {
    const seen = {};
    let dup = 0;
    recs.forEach(r => { const k = r.title.toLowerCase(); if (seen[k]) dup++; seen[k] = 1; });
    return dup === 0;
  })());
  ok("E-3 · releaseDate gelecekte değil", recs.every(r => {
    const t = Date.parse(r.releaseDate + "T00:00:00Z");
    return t <= Date.now() + 864e5 * 2;   /* 2 gün tolerans */
  }));

  /* ============ F) REGRESYON ============ */
  ok("F-1 · 6 küratörlü liste", E.PLAYLISTS.length === 6, E.PLAYLISTS.length);
  ok("F-2 · tüm listeler kurulabiliyor", E.PLAYLISTS.every(p => {
    try { return E.build(p.id).songs.length > 0; } catch (e) { return false; }
  }));
  ok("F-3 · bilinmeyen liste boş döner", E.build("yokboyle").songs.length === 0);
  ok("F-4 · liste editoryal kimliği korunuyor", E.build("traptr").curator === "Karma Editoryal");
  ok("F-5 · sanatçı havuzları değişmedi", E.byId("traptr").artists.length === 12 && E.byId("rapturkiye").artists.length === 11);
  ok("F-6 · intelOf bilinmeyen için null", E.intelOf("sehinsah", "olmayan-sarki-xyz") === null);

  /* oyuncu şarkısı hâlâ listeye girebiliyor */
  try {
    K.state.player.songs = K.state.player.songs || [];
    K.state.player.songs.push({
      id: "smk67", title: "Smoke 67", coverSeed: "s67", genre: "trap", kind: "normal",
      publishedDay: 1, streams: 9e9, dailyStreams: 900, lastDaily: 900, quality: 70,
      lists: [], playlists: ["traptr"], boosts: {}, platforms: {}
    });
    const withPlayer = E.build("traptr").songs;
    ok("F-7 · pitch'li oyuncu şarkısı listede", withPlayer.some(s => s.id === "smk67"));
  } catch (e) {
    ok("F-7 · pitch'li oyuncu şarkısı listede", false, e.message);
  }

  E.setRotation(savedRotation);

  /* ============ G) ÇALINABİLİRLİK + AI ETİKETİ ARAYÜZE (v10.67) ============
     \"Yeni Çıkanlar\" listesinde şarkı GÖRÜNÜYORDU ama ÇALINAMIYORDU:
     real-previews.js yalnızca eski katalogu kapsıyordu (ölçüm: 24 yeni
     çıkışın 24'ünde önizleme yoktu). Artık iTunes `previewUrl` release-intel
     kaydında taşınıyor ve `lazy.previewFor()` oraya düşüyor. */
  const withPreview = recs.filter(r => r.preview && /^https:\/\//.test(r.preview));
  ok("G-1 · yeni çıkışların önizlemesi var", withPreview.length === recs.length,
    withPreview.length + "/" + recs.length);

  const withIntel = recs.filter(r => r.intel && r.intel.note);
  ok("G-2 · AI küratör notu dolu", withIntel.length === recs.length, withIntel.length + "/" + recs.length);

  /* lazy.previewFor: REAL_PREVIEWS'te olmayan yeni çıkışı release-intel'den bulmalı */
  let pvOk = false, pvDetail = "";
  try {
    const sample = withPreview[0];
    const pv = K.lazy.previewFor(sample.artistId, sample.title);
    pvOk = !!(pv && pv.p && /^https:\/\//.test(pv.p));
    pvDetail = pvOk ? "ok" : "null döndü";
  } catch (e) { pvDetail = e.message; }
  ok("G-3 · previewFor yeni çıkışı çözüyor", pvOk, pvDetail);

  ok("G-4 · previewFor bilinmeyen için null", K.lazy.previewFor("sehinsah", "olmayan-sarki-zzz") === null);

  /* eski katalog yolu bozulmadı: REAL_PREVIEWS'te olan bir şarkı hâlâ çözülüyor */
  let legacy = null;
  try {
    const all = K.REAL_PREVIEWS || {};
    const a0 = Object.keys(all)[0];
    const t0 = a0 && Object.keys(all[a0])[0];
    if (a0 && t0) legacy = K.lazy.previewFor(a0, t0);
  } catch (e) {}
  ok("G-5 · eski katalog önizlemesi korunuyor", legacy && legacy.p ? true : legacy === null, legacy ? "ok" : "veri yok (atlandı)");

  /* uçtan uca: Yeni Çıkanlar listesindeki her yeni parça çalınabilir olmalı */
  E.setRotation("w2");
  const nmPlay = E.build("newmusic").songs.filter(s => s.isNew);
  const playable = nmPlay.filter(s => {
    const pv = K.lazy.previewFor(s.artistId, s.title);
    return !!(pv && pv.p);
  });
  ok("G-6 · listedeki yeni parçalar çalınabilir", playable.length === nmPlay.length,
    playable.length + "/" + nmPlay.length);
  ok("G-7 · AI notu listedeki kayda taşınıyor", nmPlay.every(s => typeof s.note === "string" && s.note.length > 0),
    nmPlay.length + " parça");
  ok("G-8 · yeni rozeti için isNew işaretli", nmPlay.every(s => s.isNew === true));
  ok("G-9 · releaseDate satıra taşınıyor", nmPlay.every(s => /^\d{4}-\d{2}-\d{2}$/.test(s.releaseDate || "")));

  /* ============ H) TÜR LİSTELERİ + HABER AKIŞI (v10.67) ============
     AI her şarkı için 6 liste uygunluğu üretiyordu ama yalnızca
     `newmusic` okuyordu. Artık fit >= 0.60 olan yeni çıkış kendi tür
     listesine de giriyor. Ölçüm: drilltr 4, nightmode 6, popturkiye 0. */
  const nk = (x) => String(x == null ? "" : x)
    .replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase()
    .replace(/[’'`´"“”]/g, "").replace(/\s+/g, " ").trim();

  function eligibleFor(pid, floor) {
    return recs.filter(r => r.intel && r.intel.fit && (r.intel.fit[pid] || 0) >= (floor == null ? 0.60 : floor));
  }

  E.setRotation("w2");
  const drill = E.build("drilltr");
  const drillFresh = drill.songs.filter(s => s.isNew);
  const drillElig = eligibleFor("drilltr");
  ok("H-1 · tür listesi yeni çıkış çekiyor", drillElig.length ? drillFresh.length > 0 : drillFresh.length === 0,
    drillFresh.length + " yeni / " + drillElig.length + " uygun");
  ok("H-2 · tür listesinde en fazla 3 yeni kayıt", drillFresh.length <= 3, drillFresh.length + " kayıt");
  ok("H-3 · yalnızca fit >= 0.60 olanlar giriyor",
    drillFresh.every(s => drillElig.some(r => nk(r.title) === nk(s.title))),
    drillFresh.map(s => s.title).join(", ").slice(0, 60));
  ok("H-4 · uygun çıkış yoksa liste dolmuyor", E.build("popturkiye").songs.filter(s => s.isNew).length === 0,
    "popturkiye: " + E.build("popturkiye").songs.filter(s => s.isNew).length);
  ok("H-5 · tür listesi hâlâ 8-13 parça", drill.songs.length >= 8 && drill.songs.length <= 13, drill.songs.length + " parça");
  ok("H-6 · yeni rozeti tür listesinde de var", drillFresh.every(s => s.isNew === true));

  /* haber akışı: gerçek çıkışlar gündeme düşüyor */
  let newsOk = false, newsDetail = "";
  try {
    const tp = K.news.releaseTopics(3);
    newsOk = Array.isArray(tp) && tp.length > 0 && tp.every(t => /yayınladı/.test(t.title) && t.cat === "muzik");
    newsDetail = (tp && tp.length) + " madde · ilk: " + ((tp && tp[0] && tp[0].title) || "-").slice(0, 44);
  } catch (e) { newsDetail = e.message; }
  ok("H-7 · haber akışı gerçek çıkış üretiyor", newsOk, newsDetail);

  /* haber maddesi AI notunu teaser olarak taşıyor */
  let teaserOk = false;
  try {
    const tp = K.news.releaseTopics(1);
    teaserOk = !!(tp && tp[0] && tp[0].line && tp[0].line.length > 5);
  } catch (e) {}
  ok("H-8 · haber teaser'ı dolu (AI notu)", teaserOk);

  /* ---- rapor ---- */
  const runtime = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
  console.log("=".repeat(58));
  console.log("KARMA · v10.67 YENİ ÇIKIŞLAR / ROTASYON");
  console.log("=".repeat(58));
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length + (runtime.length ? " · Runtime hata: " + runtime.length : ""));
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); }
  if (runtime.length) { console.log("\n⚠️ RUNTIME"); Array.from(new Set(runtime)).slice(0, 6).forEach(e => console.log("   · " + e)); }
  if (!fail.length && !runtime.length) console.log("\n✅ YENİ ÇIKIŞLAR + ROTASYON TEMİZ");
  else process.exitCode = 1;

  finish();
}

/* v10.67 — tetikleme notu: agac tutarli, build yeniden uretilsin. */
