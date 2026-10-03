/* Kullanım: node tools/smoke-v1045.js
   KARMA — v10.45 Yayın Sonrası Kariyer: radyo kampanyası · remix · klip.

   A) MOTOR     — radyo kademeleri, kampanya süresi/maliyeti, remix üretimi
   B) ARAYÜZ    — yayınlanan şarkı kartındaki "Yayın sonrası" satırı,
                  klip/radyo/remix düğmeleri ve durum rozetleri
   C) DENGE     — radyo kampanyası şarkıya ivme ekler; remix orijinali
                  canlandırır ve katalogda yeni sürüm olarak görünür

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

const { dom, errors } = H.bootDom(html, { seed: 20261045 });

H.whenReady(dom, {
  label: "v10.45 yayın sonrası kariyer hazır",
  ready: (K) => !!(K && K.postRelease && K.postRelease.runRadio && K.postRelease.makeRemix)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exitCode = 1;
});

function run() {
  const K = dom.window.K;
  const U = K.util;

  const makeSong = (id, extra) => Object.assign({
    id: id, title: "Test Şarkı", coverSeed: "seed" + id, genre: "trap", kind: "normal",
    publishedDay: 10, streams: 50000, dailyStreams: 800, lastDaily: 800, quality: 60,
    spotifyStreams: 20000, appleStreams: 8000, youtubeViews: 15000,
    chartRank: null, chartPeak: 999, lists: [], listPeak: 999, listLift: 0,
    viral: false, boosts: {}, socialPromo: {}, takenDown: false, explicit: false,
    decayRate: 1.5, platforms: { spotify: 0.46, apple: 0.19, youtube: 0.28, other: 0.07 }
  }, extra || {});

  const fresh = () => {
    K.state = K.newGame();
    K.state.player.stageName = "Test";
    K.state.balance = 5000000;
    K.state.player.songs = [];
    return K.state;
  };

  /* ============ A) MOTOR ============ */
  ok("A-0 · modül yüklendi", !!(K.POSTRELEASE && K.postRelease));
  ok("A-0 · 3 radyo kademesi", K.postRelease.RADIO.length === 3, K.postRelease.RADIO.length);
  ok("A-0 · 3 remix kademesi", K.postRelease.REMIX.length === 3, K.postRelease.REMIX.length);
  ok("A-0 · klip sistemi mevcut (K.video)", !!(K.video && K.video.TIERS && K.video.TIERS.length === 3));

  {
    ok("A-1 · bilinmeyen radyo id ilk kademeye düşer", K.postRelease.radioById("zzz").id === "yerel");
    ok("A-1 · bilinmeyen remix id ilk kademeye düşer", K.postRelease.remixById("zzz").id === "prod");
    const ulusal = K.postRelease.radioById("ulusal");
    ok("A-1 · ulusal radyo en pahalı ve en etkili",
      ulusal.cost > K.postRelease.radioById("yerel").cost && ulusal.boost > K.postRelease.radioById("yerel").boost);
    ok("A-1 · kademeler farklı süre taşır", new Set(K.postRelease.RADIO.map(r => r.days)).size >= 2);
  }

  {
    fresh();
    const song = makeSong("s1");
    K.state.player.songs.push(song);
    ok("A-2 · başlangıçta kampanya yok", K.postRelease.radioActive(song) === false && K.postRelease.canRadio(song) === true);
    ok("A-2 · başlangıçta remix yok", K.postRelease.hasRemix(song) === false && K.postRelease.canRemix(song) === true);

    const bal = K.state.balance;
    const okRun = K.postRelease.runRadio("s1", "ulusal");
    ok("A-3 · radyo kampanyası başlar", okRun === true);
    ok("A-3 · maliyet bakiyeden düşer", K.state.balance === bal - K.postRelease.radioById("ulusal").cost,
      bal + "→" + K.state.balance);
    ok("A-3 · kampanya şarkıya işlenir", song.radioCampaign && song.radioCampaign.tier === "ulusal");
    ok("A-3 · kampanya süresi doğru", song.radioCampaign.untilDay === K.state.day + K.postRelease.radioById("ulusal").days,
      song.radioCampaign.untilDay);
    ok("A-3 · radyo ivmesi eklendi", (song.boosts.radio || 0) > 0, song.boosts.radio);
    ok("A-3 · kampanya aktif görünür", K.postRelease.radioActive(song) === true);
    ok("A-3 · kalan gün doğru", K.postRelease.radioDaysLeft(song) === K.postRelease.radioById("ulusal").days,
      K.postRelease.radioDaysLeft(song));
    ok("A-3 · aktifken yeni kampanya engellenir", K.postRelease.canRadio(song) === false && K.postRelease.runRadio("s1", "yerel") === false);

    /* süre dolunca tekrar açılabilir */
    K.state.day += K.postRelease.radioById("ulusal").days + 1;
    ok("A-4 · süre dolunca kampanya biter", K.postRelease.radioActive(song) === false);
    ok("A-4 · tekrar kampanya açılabilir", K.postRelease.canRadio(song) === true);
  }

  {
    fresh();
    const song = makeSong("s2");
    K.state.player.songs.push(song);
    const bal = K.state.balance;
    const n0 = K.state.player.songs.length;
    const okRemix = K.postRelease.makeRemix("s2", "feat");
    ok("A-5 · remix üretilir", okRemix === true);
    ok("A-5 · maliyet düşer", K.state.balance === bal - K.postRelease.remixById("feat").cost);
    ok("A-5 · katalogda yeni şarkı", K.state.player.songs.length === n0 + 1);
    const remix = K.state.player.songs[K.state.player.songs.length - 1];
    ok("A-5 · remix işaretli", remix.isRemix === true && remix.remixOf === "s2", remix.remixOf);
    ok("A-5 · remix başlığı", /\(Remix\)/.test(remix.title), remix.title);
    ok("A-5 · remix sıfırdan başlar", remix.streams === 0 && remix.publishedDay === K.state.day);
    ok("A-5 · remix kendi ivmesine sahip", remix.dailyStreams > 0, remix.dailyStreams);
    ok("A-5 · orijinal remix kaydı taşır", song.remix && song.remix.songId === remix.id);
    ok("A-5 · orijinal ivme kazanır", (song.boosts.remix || 0) > 0, song.boosts.remix);
    ok("A-5 · şarkı başına tek remix", K.postRelease.hasRemix(song) === true && K.postRelease.makeRemix("s2", "buyuk") === false);

    /* remix kalitesi kademeye göre değişir */
    fresh();
    const s3 = makeSong("s3", { quality: 60 });
    K.state.player.songs.push(s3);
    K.postRelease.makeRemix("s3", "prod");
    const r3 = K.state.player.songs[1];
    ok("A-6 · prodüktör remixi kaliteyi hafif düşürür", r3.quality === 58, r3.quality);
    fresh();
    const s4 = makeSong("s4", { quality: 60 });
    K.state.player.songs.push(s4);
    K.postRelease.makeRemix("s4", "buyuk");
    const r4 = K.state.player.songs[1];
    ok("A-6 · büyük remix kaliteyi yükseltir", r4.quality === 64, r4.quality);
    ok("A-6 · büyük remix daha çok dinlenme getirir", r4.dailyStreams > r3.dailyStreams, r4.dailyStreams + " > " + r3.dailyStreams);
  }

  {
    /* yetersiz bakiye */
    fresh();
    const song = makeSong("s5");
    K.state.player.songs.push(song);
    K.state.balance = 1000;
    ok("A-7 · yetersiz bakiyede radyo engellenir", K.postRelease.runRadio("s5", "ulusal") === false);
    ok("A-7 · yetersiz bakiyede remix engellenir", K.postRelease.makeRemix("s5", "buyuk") === false);
    ok("A-7 · kaldırılmış şarkıya kampanya yok",
      K.postRelease.canRadio(makeSong("s6", { takenDown: true })) === false);
  }

  /* ============ B) ARAYÜZ ============ */
  {
    fresh();
    const song = makeSong("u1");
    K.state.player.songs.push(song);
    const html1 = K.careerUI.renderReleases();
    ok("B-1 · yayın sonrası satırı var", /Yayın sonrası/.test(html1));
    ok("B-1 · klip düğmeleri var", /data-act="song-video"/.test(html1));
    ok("B-1 · radyo düğmeleri var", /data-act="song-radio"/.test(html1));
    ok("B-1 · remix düğmeleri var", /data-act="song-remix"/.test(html1));
    ok("B-1 · üç klip kademesi", (html1.match(/data-act="song-video"/g) || []).length === 3);
    ok("B-1 · üç radyo kademesi", (html1.match(/data-act="song-radio"/g) || []).length === 3);
    ok("B-1 · üç remix kademesi", (html1.match(/data-act="song-remix"/g) || []).length === 3);

    K.postRelease.runRadio("u1", "internet");
    const html2 = K.careerUI.renderReleases();
    ok("B-2 · aktif kampanya rozeti görünür", /gün kaldı/.test(html2));
    ok("B-2 · aktifken radyo düğmeleri gizlenir", !/data-act="song-radio"/.test(html2));

    K.postRelease.makeRemix("u1", "feat");
    const html3 = K.careerUI.renderReleases();
    ok("B-3 · remix yayınlandı rozeti", /Remix\) yayınlandı|yayınlandı/.test(html3));
    ok("B-3 · remixten sonra remix düğmeleri gizlenir", !/data-act="song-remix"/.test(html3));
    ok("B-3 · klip düğmeleri hâlâ var", /data-act="song-video"/.test(html3));

    /* kaldırılmış şarkıda kampanya satırı olmamalı */
    const down = makeSong("u2", { takenDown: true });
    K.state.player.songs.push(down);
    const html4 = K.careerUI.renderReleases();
    const cards = html4.split("release-card");
    const downCard = cards.find(c => c.indexOf("u2") >= 0) || "";
    ok("B-4 · kaldırılmış şarkıda kampanya yok", !/song-radio/.test(downCard));
  }

  /* ---- rapor ---- */
  const runtime = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
  console.log("=".repeat(56));
  console.log("KARMA · v10.45 YAYIN SONRASI KARİYER (RADYO · REMİX · KLİP)");
  console.log("=".repeat(56));
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length + (runtime.length ? " · Runtime hata: " + runtime.length : ""));
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); }
  if (runtime.length) { console.log("\n⚠️ RUNTIME"); Array.from(new Set(runtime)).slice(0, 6).forEach(e => console.log("   · " + e)); }
  if (!fail.length && !runtime.length) console.log("\n✅ YAYIN SONRASI KARİYER TEMİZ · RADYO + REMİX + KLİP");
  else process.exitCode = 1;
}
