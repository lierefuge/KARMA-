/* Kullanım: node tools/smoke-v1048.js
   KARMA — v10.48 Editoryal/playlist derinliği.

   A) EDİTORYAL LİSTELER — küratörlü, gerçek sanatçı şarkılarından derlenmiş
      listeler (~10 parça); oyuncunun şarkısı hak ederse aralarında görünür
   B) PITCH STRATEJİSİ  — standart / veri destekli / plugger; maliyet + kabul
   C) LİSTE BAKIMI      — listeye girdikten sonra orada kalma mekaniği
   D) ARAYÜZ            — editoryal liste kartları, pitch ve bakım çipleri

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

const { dom, errors } = H.bootDom(html, { seed: 20261048 });

H.whenReady(dom, {
  label: "v10.48 editoryal/playlist hazır",
  ready: (K) => !!(K && K.editorial && K.editorial.build && K.editorial.maintain && K.editorial.PITCH_STRATEGIES)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exitCode = 1;
});

function run() {
  const K = dom.window.K;
  const U = K.util;

  const makeSong = (id, extra) => Object.assign({
    id: id, title: "Test " + id, coverSeed: "seed" + id, genre: "trap", kind: "normal",
    publishedDay: 1, streams: 50000, dailyStreams: 800, lastDaily: 800, quality: 60,
    spotifyStreams: 20000, appleStreams: 8000, youtubeViews: 15000,
    chartRank: null, chartPeak: 999, lists: [], listPeak: 999, listLift: 0,
    viral: false, boosts: {}, socialPromo: {}, takenDown: false, explicit: false,
    decayRate: 1.5, platforms: { spotify: 0.46, apple: 0.19, youtube: 0.28, other: 0.07 }
  }, extra || {});

  const makeRel = (id, quality) => ({
    id: id, title: "Yayın " + id, coverSeed: "rc" + id, genre: "trap", type: "single",
    tracks: [{ name: "T1", quality: quality }], stage: "queued",
    startDay: 0, waitDays: 30, explicit: false, marketing: 0, featWith: null
  });

  const fresh = (day) => {
    K.state = K.newGame();
    K.state.player.stageName = "Test";
    K.state.balance = 50000000;
    K.state.player.songs = [];
    K.state.player.releases = [];
    K.state.player.albums = [];
    K.state.day = day || 10;
    return K.state;
  };

  /* ============ A) EDİTORYAL LİSTELER ============ */
  ok("A-0 · modül yüklendi", !!(K.EDITORIAL && K.editorial));
  ok("A-0 · 6 küratörlü liste", K.editorial.PLAYLISTS.length === 6, K.editorial.PLAYLISTS.length);
  ok("A-0 · her listenin sanatçı listesi var", K.editorial.PLAYLISTS.every(p => p.artists && p.artists.length >= 8));
  ok("A-0 · gerçek şarkı verisi mevcut", !!(K.REAL_SONGS && Object.keys(K.REAL_SONGS).length >= 30));

  {
    fresh(10);
    const pl = K.editorial.build("rapturkiye");
    ok("A-1 · liste kurulur", !!pl && pl.songs.length >= 8, pl && pl.songs.length);
    ok("A-1 · gerçek sanatçı şarkıları", pl.songs.every(s => s.title && s.artistName));
    ok("A-1 · hepsi gerçek şarkı (oyuncu hariç)", pl.songs.every(s => s.artistId !== "player"));
    ok("A-1 · ~10 parça", pl.songs.length >= 8 && pl.songs.length <= 13, pl.songs.length);
    ok("A-1 · künye", pl.name === "Rap Türkiye" && !!pl.curator);

    const pl2 = K.editorial.build("rapturkiye");
    ok("A-1 · deterministik", JSON.stringify(pl.songs.map(s => s.id)) === JSON.stringify(pl2.songs.map(s => s.id)));

    const trap = K.editorial.build("traptr");
    const ids1 = pl.songs.map(s => s.id), ids2 = trap.songs.map(s => s.id);
    ok("A-1 · listeler farklı kadro", ids1.filter(x => ids2.includes(x)).length === 0);

    ok("A-1 · bilinmeyen liste boş döner", K.editorial.build("zzz").songs.length === 0);
    ok("A-1 · platformlar küratörlü listeleri kullanır", K.platforms.editorialPlaylists().length === 6);
  }

  {
    /* oyuncu şarkısı hak edince listede görünür */
    fresh(10);
    const mine = makeSong("mine1", { genre: "rap", streams: 5000000, lists: [{ id: "sp_rapcaviar", name: "RapCaviar TR", platform: "Spotify", icon: "🔥", kind: "editoryal", rank: 8, enteredDay: 2, days: 3, pull: 70 }] });
    K.state.player.songs.push(mine);
    const pl = K.editorial.build("rapturkiye");
    const inList = pl.songs.find(s => s.mine);
    ok("A-2 · oyuncu şarkısı listede", !!inList && inList.id === "mine1");
    ok("A-2 · onEditorial aktif girişi bulur", K.editorial.onEditorial(mine).length === 1);
    ok("A-2 · placement raporlar", K.editorial.placement(mine).length === 1);

    /* yanlış tür listesinde görünmez */
    const drill = K.editorial.build("drilltr");
    ok("A-2 · tür uymayan listede görünmez", !drill.songs.some(s => s.mine));

    /* pitch kabulü türden bağımsız gösterir */
    fresh(10);
    const pitched = makeSong("pitched1", { genre: "pop", playlists: ["drilltr"] });
    K.state.player.songs.push(pitched);
    ok("A-2 · pitch kabulü listeye koyar", K.editorial.build("drilltr").songs.some(s => s.mine));

    /* çıkmış liste girişi sayılmaz */
    fresh(10);
    const gone = makeSong("gone1", { genre: "rap", lists: [{ id: "sp_rapcaviar", exitDay: 5 }] });
    K.state.player.songs.push(gone);
    ok("A-2 · çıkmış giriş editoryal sayılmaz", K.editorial.onEditorial(gone).length === 0);
  }

  /* ============ B) PITCH STRATEJİSİ ============ */
  ok("B-0 · 3 pitch stratejisi", K.editorial.PITCH_STRATEGIES.length === 3, K.editorial.PITCH_STRATEGIES.length);
  ok("B-0 · bilinmeyen strateji standarta düşer", K.editorial.strategyById("zzz").id === "standart");
  {
    const st = K.editorial.strategyById("standart"), pl = K.editorial.strategyById("plugger"), vr = K.editorial.strategyById("veri");
    ok("B-0 · maliyet artan sırada", st.cost < vr.cost && vr.cost < pl.cost, [st.cost, vr.cost, pl.cost].join("<"));
    ok("B-0 · plugger bonus + kabul avantajı", pl.bonus > 0 && pl.accept > st.accept, pl.accept + ">" + st.accept);
    ok("B-0 · veri destekli ara kademe", vr.bonus > 0 && vr.accept > st.accept);
  }

  {
    fresh(10);
    const rel = makeRel("r1", 60);
    K.state.player.releases.push(rel);
    const bal = K.state.balance;
    ok("B-1 · pitch yapılır", K.career.pitchPlaylist("r1", "veri") === true);
    ok("B-1 · strateji maliyeti düşer", K.state.balance === bal - K.editorial.strategyById("veri").cost);
    ok("B-1 · strateji kaydedilir", rel.playlistPitch && rel.playlistPitch.strategy === "veri");
    ok("B-1 · aynı yayına tek pitch", K.career.pitchPlaylist("r1", "plugger") === false);

    /* zamanlama penceresi dışında reddedilir */
    fresh(10);
    const late = makeRel("r2", 60); late.startDay = -20;   // remaining = -10
    K.state.player.releases.push(late);
    ok("B-1 · pencere dışında pitch yok", K.career.pitchPlaylist("r2", "standart") === false);

    /* yetersiz bakiye */
    fresh(10);
    const poor = makeRel("r3", 60);
    K.state.player.releases.push(poor);
    K.state.balance = 100;
    ok("B-1 · yetersiz bakiyede pitch engellenir", K.career.pitchPlaylist("r3", "plugger") === false);
  }

  {
    /* istatistiksel: plugger, standarttan daha çok kabul alır */
    fresh(10);
    let accStd = 0, accPlug = 0, n = 40;
    for (let i = 0; i < n; i++) {
      const a = makeRel("s" + i, 60); K.state.player.releases.push(a);
      if (K.career.pitchPlaylist(a.id, "standart") && a.playlistPitch.accepted) accStd++;
      const b = makeRel("p" + i, 60); K.state.player.releases.push(b);
      if (K.career.pitchPlaylist(b.id, "plugger") && b.playlistPitch.accepted) accPlug++;
    }
    ok("B-2 · plugger kabul oranı daha yüksek", accPlug > accStd, "standart " + accStd + "/" + n + " · plugger " + accPlug + "/" + n);
  }

  /* ============ C) LİSTE BAKIMI ============ */
  ok("C-0 · 3 bakım kademesi", K.editorial.MAINT.length === 3, K.editorial.MAINT.length);
  ok("C-0 · bilinmeyen bakım ilk kademeye düşer", K.editorial.maintById("zzz").id === "refresh");

  {
    fresh(10);
    const song = makeSong("m1", { genre: "rap" });
    K.state.player.songs.push(song);
    ok("C-1 · listede olmayan şarkıya bakım yok", K.editorial.canMaintain(song) === false && K.editorial.maintain("m1", "promo") === false);

    song.lists = [{ id: "sp_rapcaviar", name: "RapCaviar TR", platform: "Spotify", icon: "🔥", kind: "editoryal", rank: 12, enteredDay: 3, days: 2, pull: 60 }];
    ok("C-1 · listede olan şarkıya bakım var", K.editorial.canMaintain(song) === true);

    const bal = K.state.balance;
    ok("C-1 · bakım yapılır", K.editorial.maintain("m1", "curator") === true);
    ok("C-1 · maliyet düşer", K.state.balance === bal - K.editorial.maintById("curator").cost);
    ok("C-1 · bakım kaydedilir", song.listCare && song.listCare.tier === "curator");
    ok("C-1 · bakım süresi", song.listCare.untilDay === K.state.day + K.editorial.maintById("curator").days);
    ok("C-1 · bakım aktif", K.editorial.careActive(song) === true);
    ok("C-1 · aktifken yeni bakım engellenir", K.editorial.canMaintain(song) === false && K.editorial.maintain("m1", "refresh") === false);

    K.state.day = song.listCare.untilDay + 1;
    ok("C-1 · süre dolunca bakım biter", K.editorial.careActive(song) === false);

    /* kaldırılmış şarkıya bakım yok */
    fresh(10);
    const down = makeSong("m2", { takenDown: true, lists: [{ id: "sp_rapcaviar", rank: 5, days: 1 }] });
    K.state.player.songs.push(down);
    ok("C-1 · kaldırılmış şarkıya bakım yok", K.editorial.canMaintain(down) === false);
  }

  {
    /* liste mekaniği: bakım şarkıyı listede tutar */
    const mkListed = () => makeSong("d1", {
      lists: [{ id: "sp_rapcaviar", name: "RapCaviar TR", platform: "Spotify", icon: "🔥", kind: "editoryal", rank: 15, enteredDay: 0, days: 200, pull: 10 }]
    });
    /* bakımsız: süre aşımı → düşer */
    fresh(300);
    const a = mkListed(); K.state.player.songs.push(a);
    K.lists.daily();
    ok("C-2 · bakımsız şarkı listeden düşer", !!a.lists.find(e => e.id === "sp_rapcaviar" && e.exitDay));

    /* bakımlı: düşmez + sıra iyileşir */
    fresh(300);
    const b = mkListed(); K.state.player.songs.push(b);
    b.listCare = { tier: "curator", name: "Curator İlişkisi", icon: "🤝", day: 300, untilDay: 320, boost: 0.3 };
    const rank0 = b.lists[0].rank;
    K.lists.daily();
    const e = b.lists.find(x => x.id === "sp_rapcaviar");
    ok("C-2 · bakımlı şarkı listede kalır", e && !e.exitDay);
    ok("C-2 · bakım sırayı iyileştirir", e && e.rank < rank0, rank0 + "→" + (e && e.rank));
    ok("C-2 · giriş bakımlı işaretlenir", e && e.care === true);
  }

  /* ============ D) ARAYÜZ ============ */
  {
    fresh(10);
    const rel = makeRel("u1", 60);
    K.state.player.releases.push(rel);
    const h = K.careerUI.renderReleases();
    ok("D-1 · editoryal liste bölümü var", /Editoryal Listeler/.test(h));
    ok("D-1 · liste kartları var", /edito-card/.test(h));
    ok("D-1 · gerçek liste adı görünür", /Rap Türkiye/.test(h) && /Trap Zone TR/.test(h));
    ok("D-1 · 6 liste kartı", (h.match(/edito-card/g) || []).length === 6, (h.match(/edito-card/g) || []).length);
    ok("D-1 · pitch stratejisi çipleri var", (h.match(/data-act="pitch-playlist"/g) || []).length === 3, (h.match(/data-act="pitch-playlist"/g) || []).length);
    ok("D-1 · plugger çipi görünür", /Plugger/.test(h));
  }

  {
    fresh(10);
    const song = makeSong("u2", { genre: "rap", lists: [{ id: "sp_rapcaviar", name: "RapCaviar TR", platform: "Spotify", icon: "🔥", kind: "editoryal", rank: 9, enteredDay: 2, days: 2, pull: 60 }] });
    K.state.player.songs.push(song);
    const h = K.careerUI.renderReleases();
    ok("D-2 · liste bakımı çipleri var", /data-act="list-care"/.test(h));
    ok("D-2 · 3 bakım kademesi", (h.match(/data-act="list-care"/g) || []).length === 3, (h.match(/data-act="list-care"/g) || []).length);

    K.editorial.maintain("u2", "promo");
    const h2 = K.careerUI.renderReleases();
    ok("D-2 · bakım rozeti görünür", /Liste Promosyonu/.test(h2));
    ok("D-2 · bakım sürerken düğmeler gizlenir", !/data-act="list-care"/.test(h2));
  }

  /* ---- rapor ---- */
  const runtime = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
  console.log("=".repeat(58));
  console.log("KARMA · v10.48 EDİTORYAL / PLAYLIST DERİNLİĞİ");
  console.log("=".repeat(58));
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length + (runtime.length ? " · Runtime hata: " + runtime.length : ""));
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); }
  if (runtime.length) { console.log("\n⚠️ RUNTIME"); Array.from(new Set(runtime)).slice(0, 6).forEach(e => console.log("   · " + e)); }
  if (!fail.length && !runtime.length) console.log("\n✅ EDİTORYAL LİSTELER + PITCH + BAKIM TEMİZ");
  else process.exitCode = 1;
}
