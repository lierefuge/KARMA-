/* Kullanım: node tools/smoke-v1046.js
   KARMA — v10.46 Katalog: remaster · deluxe sürüm · yıldönümü.

   A) MOTOR   — yaş eşikleri, remaster kalite/ivme etkisi, deluxe bonus
                parçaları, yıldönümü kutlaması
   B) ARAYÜZ  — şarkı kartında remaster çipleri (yaşa göre pasif),
                albüm kartında deluxe + yıldönümü çipleri
   C) DENGE   — katalog işlemleri parayı harcar, kalıcıdır (işlem başına 1)
                ve eski işi yeniden canlandırır

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

const { dom, errors } = H.bootDom(html, { seed: 20261046 });

H.whenReady(dom, {
  label: "v10.46 katalog hazır",
  ready: (K) => !!(K && K.reissue && K.reissue.remaster && K.reissue.deluxe && K.reissue.anniversary)
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

  const makeAlbum = (id, trackIds, releasedDay) => ({
    id: id, title: "Albüm " + id, conceptId: "c1", conceptName: "Sokak", conceptIcon: "💿",
    type: "album", cohesion: 70, critics: 75, releasedDay: releasedDay,
    trackIds: trackIds, trackCount: trackIds.length,
    streams: 100000, lastDaily: 0, chartRank: null, chartPeak: 999, risingRank: null
  });

  const fresh = (day) => {
    K.state = K.newGame();
    K.state.player.stageName = "Test";
    K.state.balance = 5000000;
    K.state.player.songs = [];
    K.state.player.albums = [];
    K.state.day = day || 1;
    return K.state;
  };

  /* ============ A) MOTOR ============ */
  ok("A-0 · modül yüklendi", !!(K.REISSUE && K.reissue));
  ok("A-0 · 2 remaster kademesi", K.reissue.REMASTER.length === 2, K.reissue.REMASTER.length);
  ok("A-0 · deluxe ayarları", K.reissue.DELUXE.cost > 0 && K.reissue.DELUXE.bonus >= 1);
  ok("A-0 · yıldönümü eşiği 1 yıl", K.reissue.ANNIV.minAge === 365, K.reissue.ANNIV.minAge);
  ok("A-0 · bilinmeyen remaster id ilk kademeye düşer", K.reissue.remasterById("zzz").id === "studio");

  {
    fresh(100);
    const song = makeSong("s1", { publishedDay: 5 });   // yaş 95
    K.state.player.songs.push(song);
    ok("A-1 · yaş hesabı", K.reissue.songAge(song) === 95, K.reissue.songAge(song));
    ok("A-1 · stüdyo remaster uygun (95≥90)", K.reissue.canRemaster(song, "studio") === true);
    ok("A-1 · analog remaster henüz erken (95<120)", K.reissue.canRemaster(song, "analog") === false);

    const bal = K.state.balance, q0 = song.quality, d0 = song.dailyStreams, dec0 = song.decayRate;
    ok("A-2 · remaster yapılır", K.reissue.remaster("s1", "studio") === true);
    ok("A-2 · maliyet düşer", K.state.balance === bal - K.reissue.remasterById("studio").cost);
    ok("A-2 · kalite yükselir", song.quality === q0 + K.reissue.remasterById("studio").q, song.quality);
    ok("A-2 · ivme eklenir", (song.boosts.remaster || 0) > 0, song.boosts.remaster);
    ok("A-2 · günlük dinlenme artar", song.dailyStreams > d0, song.dailyStreams);
    ok("A-2 · çürüme yavaşlar", song.decayRate < dec0, song.decayRate);
    ok("A-2 · kayıt işlenir", song.remaster && song.remaster.tier === "studio");
    ok("A-2 · şarkı başına tek remaster", K.reissue.hasRemaster(song) === true && K.reissue.remaster("s1", "analog") === false);
  }

  {
    /* analog kademesi yaş eşiği */
    fresh(130);
    const song = makeSong("s2", { publishedDay: 5 });   // yaş 125
    K.state.player.songs.push(song);
    ok("A-3 · analog remaster uygun (125≥120)", K.reissue.canRemaster(song, "analog") === true);
    const q0 = song.quality;
    K.reissue.remaster("s2", "analog");
    ok("A-3 · analog daha çok kalite verir", song.quality === q0 + 6, song.quality);
    ok("A-3 · analog kaydı", song.remaster.tier === "analog");
  }

  {
    /* genç şarkı reddedilir */
    fresh(50);
    const young = makeSong("s3", { publishedDay: 45 });   // yaş 5
    K.state.player.songs.push(young);
    ok("A-4 · genç şarkıya remaster yok", K.reissue.canRemaster(young) === false && K.reissue.remaster("s3", "studio") === false);

    /* kaldırılmış şarkı reddedilir */
    fresh(200);
    const down = makeSong("s4", { publishedDay: 1, takenDown: true });
    K.state.player.songs.push(down);
    ok("A-4 · kaldırılmış şarkıya remaster yok", K.reissue.canRemaster(down) === false);

    /* yetersiz bakiye */
    fresh(200);
    const poor = makeSong("s5", { publishedDay: 1 });
    K.state.player.songs.push(poor);
    K.state.balance = 1000;
    ok("A-4 · yetersiz bakiyede remaster engellenir", K.reissue.remaster("s5", "studio") === false);
  }

  {
    /* deluxe sürüm */
    fresh(200);
    const a1 = makeSong("a1", { publishedDay: 1, quality: 62 });
    const a2 = makeSong("a2", { publishedDay: 1, quality: 70 });
    K.state.player.songs.push(a1, a2);
    K.state.player.albums.push(makeAlbum("alb1", ["a1", "a2"], 60));  // yaş 140
    const album = K.state.player.albums[0];
    ok("A-5 · albüm yaşı", K.reissue.albumAge(album) === 140, K.reissue.albumAge(album));
    ok("A-5 · deluxe uygun (140≥120)", K.reissue.canDeluxe(album) === true);

    const bal = K.state.balance, n0 = K.state.player.songs.length, rep0 = K.state.player.reputation;
    const d1 = a1.dailyStreams, d2 = a2.dailyStreams;
    ok("A-5 · deluxe yapılır", K.reissue.deluxe("alb1") === true);
    ok("A-5 · maliyet düşer", K.state.balance === bal - K.reissue.DELUXE.cost);
    ok("A-5 · bonus parçalar eklendi", K.state.player.songs.length === n0 + K.reissue.DELUXE.bonus,
      n0 + "→" + K.state.player.songs.length);
    ok("A-5 · bonus parçalar işaretli", K.state.player.songs.slice(n0).every(s => s.isBonus === true));
    ok("A-5 · bonus albüme bağlı", K.state.player.songs.slice(n0).every(s => s.albumId === "alb1"));
    ok("A-5 · mevcut parçalara ivme", (a1.boosts.deluxe || 0) > 0 && (a2.boosts.deluxe || 0) > 0);
    ok("A-5 · günlük dinlenme artar", a1.dailyStreams > d1 && a2.dailyStreams > d2);
    ok("A-5 · albüm trackIds büyür", album.trackIds.length === 2 + K.reissue.DELUXE.bonus, album.trackIds.length);
    ok("A-5 · deluxe kaydı", album.deluxe && album.deluxe.bonus === K.reissue.DELUXE.bonus);
    ok("A-5 · itibar artar", K.state.player.reputation > rep0, rep0 + "→" + K.state.player.reputation);
    ok("A-5 · albüm başına tek deluxe", K.reissue.hasDeluxe(album) === true && K.reissue.deluxe("alb1") === false);
  }

  {
    /* genç albüm / yetersiz bakiye */
    fresh(150);
    K.state.player.songs.push(makeSong("b1", { publishedDay: 1 }));
    K.state.player.albums.push(makeAlbum("alb2", ["b1"], 100));  // yaş 50
    ok("A-6 · genç albüme deluxe yok", K.reissue.canDeluxe(K.state.player.albums[0]) === false);

    fresh(200);
    K.state.player.songs.push(makeSong("b2", { publishedDay: 1 }));
    K.state.player.albums.push(makeAlbum("alb3", ["b2"], 60));
    K.state.balance = 1000;
    ok("A-6 · yetersiz bakiyede deluxe engellenir", K.reissue.deluxe("alb3") === false);
  }

  {
    /* yıldönümü */
    fresh(400);
    const y1 = makeSong("y1", { publishedDay: 10 });
    const y2 = makeSong("y2", { publishedDay: 10 });
    K.state.player.songs.push(y1, y2);
    K.state.player.albums.push(makeAlbum("alb4", ["y1", "y2"], 30));  // yaş 370
    const album = K.state.player.albums[0];
    ok("A-7 · yıldönümü uygun (370≥365)", K.reissue.canAnniversary(album) === true);
    const rep0 = K.state.player.reputation, d1 = y1.dailyStreams;
    ok("A-7 · kutlama yapılır", K.reissue.anniversary("alb4") === true);
    ok("A-7 · parçalara nostalji ivmesi", (y1.boosts.anniversary || 0) > 0 && (y2.boosts.anniversary || 0) > 0);
    ok("A-7 · günlük dinlenme artar", y1.dailyStreams > d1);
    ok("A-7 · itibar artar", K.state.player.reputation > rep0);
    ok("A-7 · kayıt işlenir", !!album.anniversary);
    ok("A-7 · albüm başına tek kutlama", K.reissue.hasAnniversary(album) === true && K.reissue.anniversary("alb4") === false);

    /* genç albüm */
    fresh(300);
    K.state.player.songs.push(makeSong("y3", { publishedDay: 1 }));
    K.state.player.albums.push(makeAlbum("alb5", ["y3"], 100));  // yaş 200
    ok("A-7 · genç albüme yıldönümü yok", K.reissue.canAnniversary(K.state.player.albums[0]) === false);
  }

  /* ============ B) ARAYÜZ ============ */
  {
    fresh(200);
    const old = makeSong("u1", { publishedDay: 1 });        // yaş 199
    const young = makeSong("u2", { publishedDay: 190 });    // yaş 10
    K.state.player.songs.push(old, young);
    const htmlR = K.careerUI.renderReleases();
    ok("B-1 · remaster çipleri var", /data-act="song-remaster"/.test(htmlR));
    ok("B-1 · iki remaster kademesi düğmesi (yaşlı şarkı)", (htmlR.match(/data-act="song-remaster"/g) || []).length === 2,
      (htmlR.match(/data-act="song-remaster"/g) || []).length);
    ok("B-1 · genç şarkıda pasif çip", /camp-chip dim/.test(htmlR) && /disabled/.test(htmlR));

    K.reissue.remaster("u1", "studio");
    const htmlR2 = K.careerUI.renderReleases();
    ok("B-2 · remaster rozeti görünür", /Stüdyo Remaster/.test(htmlR2));
  }

  {
    fresh(200);
    const t1 = makeSong("v1", { publishedDay: 1 });
    K.state.player.songs.push(t1);
    K.state.player.albums.push(makeAlbum("albu1", ["v1"], 60));  // yaş 140 → deluxe uygun
    const htmlA = K.careerUI.renderAlbums();
    ok("B-3 · deluxe düğmesi var", /data-act="album-deluxe"/.test(htmlA));
    ok("B-3 · yıldönümü çipi var (henüz erken)", /Yıldönümü/.test(htmlA));

    K.reissue.deluxe("albu1");
    const htmlA2 = K.careerUI.renderAlbums();
    ok("B-4 · deluxe rozeti görünür", /Deluxe · \d+ bonus/.test(htmlA2));
    ok("B-4 · deluxeden sonra düğme gizlenir", !/data-act="album-deluxe"/.test(htmlA2));
  }

  {
    fresh(400);
    const w1 = makeSong("w1", { publishedDay: 1 });
    K.state.player.songs.push(w1);
    K.state.player.albums.push(makeAlbum("albu2", ["w1"], 30));  // yaş 370 → yıldönümü uygun
    const htmlA = K.careerUI.renderAlbums();
    ok("B-5 · yıldönümü düğmesi var", /data-act="album-anniv"/.test(htmlA));
    K.reissue.anniversary("albu2");
    const htmlA2 = K.careerUI.renderAlbums();
    ok("B-5 · kutlama rozeti görünür", /Yıldönümü kutlandı/.test(htmlA2));
    ok("B-5 · kutlamadan sonra düğme gizlenir", !/data-act="album-anniv"/.test(htmlA2));
  }

  /* ---- rapor ---- */
  const runtime = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
  console.log("=".repeat(56));
  console.log("KARMA · v10.46 KATALOG (REMASTER · DELUXE · YILDÖNÜMÜ)");
  console.log("=".repeat(56));
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length + (runtime.length ? " · Runtime hata: " + runtime.length : ""));
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); }
  if (runtime.length) { console.log("\n⚠️ RUNTIME"); Array.from(new Set(runtime)).slice(0, 6).forEach(e => console.log("   · " + e)); }
  if (!fail.length && !runtime.length) console.log("\n✅ KATALOG TEMİZ · REMASTER + DELUXE + YILDÖNÜMÜ");
  else process.exitCode = 1;
}
