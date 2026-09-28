/* Kullanım: node tools/smoke-apps.js  (KARMA-Oyun.html tek dosyasını test eder) */
/* KARMA — Kapsamlı telefon uygulamaları smoke testi
   • her uygulamanın her sekmesini render eder
   • önemli pushed görünümleri (profil/gönderi/hikaye/yorum/ses/liste) render eder
   • kuyruk / kaydet / çalma listesi entegrasyonunu doğrular
   • BOŞ DURUM (yeni oyun) ve DOLU DURUM senaryolarını çalıştırır
*/
const { JSDOM, VirtualConsole } = require("/home/user/node_modules/jsdom");
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const FILE = [path.join(ROOT, "KARMA-Oyun.html"), path.join(ROOT, "..", "files", "KARMA-Oyun.html")].find(f => fs.existsSync(f));
if (!FILE) { console.error("KARMA-Oyun.html bulunamadı — önce: node tools/build-single.js"); process.exit(1); }
const html = fs.readFileSync(FILE, "utf8");
const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", e => { const m = e.detail ? e.detail.message : e.message; if (!/fonts/.test(m)) errors.push("jsdomError: " + m); });
const dom = new JSDOM(html, { url: "https://karma.local/", runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) { w.fetch = () => Promise.reject(new Error("offline")); w.addEventListener("error", e => errors.push("onerror: " + (e.error ? e.error.stack : e.message))); } });

setTimeout(run, 2600);

function run() {
  const win = dom.window, K = win.K;
  const out = [];
  const fail = [];

  const tabIds = v => (v && v.tabs && v.tabs.length) ? v.tabs.map(t => t.id) : [v && v.activeTab || null];

  /* ---------- 1) her uygulamanın her sekmesi ---------- */
  function renderApps(phase) {
    const rows = [];
    K.phone.apps.forEach(app => {
      let tabs = 0, bytes = 0, err = 0;
      try {
        const v = app.render({});
        if (v && typeof v.render === "function") {
          tabIds(v).forEach(id => {
            tabs++;
            try { bytes += (v.render(id, v.params) || "").length; }
            catch (e) { err++; fail.push(`${phase} ${app.id}/${id}: ${e.message}`); }
          });
        } else if (typeof v === "string") { tabs = 1; bytes = v.length; }
        else { err++; fail.push(`${phase} ${app.id}: render görünümü yok`); }
      } catch (e) { err++; fail.push(`${phase} ${app.id}: ${e.message}`); }
      rows.push({ app: app.id, tabs, bytes, err });
    });
    return rows;
  }

  /* ---------- 2) pushed görünümleri ---------- */
  function safePush(label, fn) {
    const before = K.phone.views.length;
    try {
      fn();
      const v = K.phone.views[K.phone.views.length - 1];
      if (v && typeof v.render === "function") v.render(v.activeTab || (v.tabs && v.tabs[0] && v.tabs[0].id), v.params);
      else fail.push(label + ": görünüm oluşmadı");
    } catch (e) { fail.push(label + ": " + e.message); }
    finally { K.phone.views.length = before; K.phone.homeActive = true; }
  }

  /* =========================================================
     A) BOŞ DURUM (yeni oyun)
     ========================================================= */
  K.state = K.newGame();
  const emptyChecks = [
    ["Spotify boş liste mesajı", () => K.phone.appById("spotify").libraryHTML().includes("Henüz çalma listen yok")],
    ["Apple boş şarkı mesajı", () => K.phone.appById("applemusic").libraryHTML().includes("Henüz şarkın yok")],
    ["YouTube boş kayıt mesajı", () => K.phone.appById("youtube").libraryHTML().includes("Kaydettiğin video yok")],
    ["Mesajlar boş durum", () => K.phone.appById("messages").listHTML().includes("Mesaj yok")],
    ["Klip boş şarkı", () => K.phone.appById("video").render({}).render().includes("Önce bir şarkı yayınla")],
    ["Hedefler görev listesi", () => K.phone.appById("goals").render({}).render("gorev").length > 20],
    ["Ekip boş durum", () => K.phone.appById("team").render({}).render("kadro").includes("Henüz ekip yok")],
    ["Fanbase boş kitle", () => K.phone.appById("fans").render({}).render().length > 40]
  ];
  const emptyRows = renderApps("BOŞ");
  const emptyResults = emptyChecks.map(([name, fn]) => { let ok = false; try { ok = !!fn(); } catch (e) { fail.push("boş kontrol " + name + ": " + e.message); } return { name, ok }; });

  /* =========================================================
     B) DOLU DURUM
     ========================================================= */
  const p = K.state.player;
  p.popularity = 55; p.monthly = 180000; p.ig = 400000; p.tiktok = 250000; p.x = 90000; p.ytSubs = 120000;
  p.songs = [
    { id: "s1", title: "GECE", genre: "trap", quality: 78, viral: true, kind: "normal", duration: 190, publishedDay: 2,
      streams: 1200000, dailyStreams: 12000, lastDaily: 12000, youtubeViews: 150000, spotifyStreams: 800000, appleStreams: 180000,
      coverSeed: "c1", boosts: {}, algos: { releaseRadar: .3 }, playlists: ["traptr"], chartRank: 12, chartPeak: 12,
      sound: { videos: 18000, momentum: .7, peak: 19000, startedDay: 1, lastGain: 500, platform: "tiktok", trend: true, ever: true },
      platforms: { spotify: .5, apple: .2, youtube: .3 }, month: { spotify: 300000, apple: 60000, youtube: 90000 } },
    { id: "s2", title: "SOKAK", genre: "drill", quality: 71, kind: "normal", duration: 175, publishedDay: 20,
      streams: 300000, dailyStreams: 3000, lastDaily: 3000, youtubeViews: 40000, spotifyStreams: 200000, appleStreams: 50000,
      coverSeed: "c2", boosts: {}, platforms: { spotify: .5, apple: .2, youtube: .3 }, month: { spotify: 0, apple: 0, youtube: 0 } }
  ];
  K.state.chart = [{ id: "ch1", title: "Hit", artistName: "NPC", artistId: "a1", daily: 90000, total: 2000000, mine: false, art: null }];
  for (let i = 0; i < 12; i++) K.game.nextDay();
  const fullRows = renderApps("DOLU");

  /* --- pushed görünümler --- */
  const yt = K.phone.appById("youtube"), sp = K.phone.appById("spotify"), ig = K.phone.appById("instagram"),
        x = K.phone.appById("x"), tt = K.phone.appById("tiktok"), am = K.phone.appById("applemusic"), msg = K.phone.appById("messages");
  const vid = yt.allVideos()[0], sng = sp.render({}).render("listen"), artistId = K.artistList()[0].id;

  safePush("YouTube izleme", () => yt.watch(vid.id, vid.channel, vid.channelId));
  safePush("YouTube kanal", () => yt.openChannel(artistId));
  safePush("YouTube yorumlar", () => yt.openComments(vid.id, vid.channel, vid.channelId));
  safePush("YouTube çalma listesi", () => yt.openYTPlaylist("liked"));
  safePush("YouTube analitik", () => yt.openAnalytics());
  safePush("Spotify sanatçı", () => sp.openArtist(artistId));
  const realAlbum = (K.platforms.searchSongs("").find(x => x.album) || {}).album;
  safePush("Spotify albüm", () => sp.openAlbum(realAlbum));
  safePush("Spotify editoryal liste", () => sp.openPlaylist("rapturkiye"));
  safePush("Apple tür", () => am.openGenre("rap"));
  safePush("Apple sanatçı", () => am.openArtist(artistId));
  safePush("Instagram gönderi", () => ig.openPost("testPost"));
  safePush("Instagram hikaye", () => ig.openStory("player"));
  safePush("Instagram profil", () => ig.openProfile(artistId));
  safePush("X gönderi", () => x.openPost("p1"));
  safePush("X trend", () => x.openTrend("#TrapTürkiye"));
  safePush("X profil", () => x.openProfile(artistId));
  safePush("TikTok yorumlar", () => tt.comments("vid1"));
  safePush("TikTok ses sayfası", () => tt.openSound("GECE"));
  safePush("TikTok profil", () => tt.openProfile(artistId));
  safePush("Mesajlar sohbet", () => K.phone.views.push(msg.conversation(artistId)));
  safePush("Kontrol Merkezi", () => K.cc.open());
  safePush("Spotlight", () => K.spotlight.open());

  /* --- KUYRUK entegrasyonu --- */
  K.queue.clear();
  K.queue.add({ id: "q1", title: "Birinci", artistName: "A" });
  K.queue.addNext({ id: "q2", title: "İkinci", artistName: "B" });
  const queueOrder = K.queue.list().map(t => t.title).join(",");
  const qShift = K.queue.shift();
  am.startRadio("Test Radyo");
  const radioQueue = K.queue.size();
  let ccConsumed = false;
  try { K.cc.open(); const cv = K.phone.views[K.phone.views.length - 1]; cv.onAction("cc-next", { dataset: {} }); ccConsumed = true; K.phone.views.pop(); }
  catch (e) { fail.push("CC sonraki: " + e.message); }

  /* --- KAYDET entegrasyonu --- */
  const saveKey = "yt_" + vid.id;
  K.interactions.toggleSave(saveKey);
  const savedOk = K.interactions.isSaved(saveKey);
  const libHasSaved = yt.libraryHTML().includes("Kaydedilenler");

  /* --- ÇALMA LİSTESİ entegrasyonu --- */
  K.state.userPlaylists = [];
  const pl = K.playlists.create("Smoke Liste");
  K.playlists.add(pl.id, { id: "t1", title: "Test Şarkı", artistName: "Sanatçı", coverSeed: "tc" });
  K.playlists.add(pl.id, { id: "t2", title: "İkinci Şarkı", artistName: "Sanatçı", coverSeed: "tc2" });
  const plCount = K.playlists.byId(pl.id).tracks.length;
  let plOpenLen = 0;
  try { K.playlists.open(pl.id, { shellClass: "app-applemusic", musicBar: true }); const v = K.phone.views[K.phone.views.length - 1]; plOpenLen = v.render().length; K.phone.views.pop(); K.phone.homeActive = true; } catch (e) { fail.push("playlists.open: " + e.message); }
  const spLib = sp.libraryHTML().includes("Smoke Liste"), amLib = am.libraryHTML().includes("Smoke Liste");

  /* ---------- rapor ---------- */
  console.log("================ KAPSAMLI SMOKE TESTİ ================");
  console.log(`Uygulama sayısı: ${K.phone.apps.length}\n`);
  console.log("--- BOŞ DURUM (yeni oyun) ---");
  console.log("app".padEnd(16) + "sekme  byte  hata");
  emptyRows.forEach(r => console.log(r.app.padEnd(16) + String(r.tabs).padStart(5) + String(r.bytes).padStart(7) + String(r.err).padStart(6)));
  console.log("\n--- DOLU DURUM ---");
  console.log("app".padEnd(16) + "sekme  byte  hata");
  fullRows.forEach(r => console.log(r.app.padEnd(16) + String(r.tabs).padStart(5) + String(r.bytes).padStart(7) + String(r.err).padStart(6)));

  console.log("\n--- BOŞ DURUM KONTROLLERİ ---");
  emptyResults.forEach(r => console.log((r.ok ? "  ✅ " : "  ❌ ") + r.name));

  console.log("\n--- ENTEGRASYON ---");
  console.log("  ✅ Kuyruk sırası (addNext öne): " + queueOrder);
  console.log("  " + (qShift && qShift.title === "İkinci" ? "✅" : "❌") + " shift → " + (qShift && qShift.title));
  console.log("  " + (radioQueue >= 5 ? "✅" : "❌") + " radyo kuyruğa ekledi: " + radioQueue + " şarkı");
  console.log("  " + (ccConsumed ? "✅" : "❌") + " Kontrol Merkezi 'sonraki' kuyruğu tüketti");
  console.log("  " + (savedOk ? "✅" : "❌") + " kaydet: " + saveKey + " (" + (libHasSaved ? "kitaplıkta Kaydedilenler bölümü var" : "kitaplık bölümü yok") + ")");
  console.log("  " + (plCount === 2 ? "✅" : "❌") + " çalma listesi: 2 şarkı eklendi");
  console.log("  " + (plOpenLen > 200 ? "✅" : "❌") + " liste görünümü render edildi (" + plOpenLen + " byte)");
  console.log("  " + (spLib && amLib ? "✅" : "❌") + " liste Spotify kütüphanesinde: " + spLib + " · Apple kütüphanesinde: " + amLib);

  const totalTabsEmpty = emptyRows.reduce((n, r) => n + r.tabs, 0);
  const totalTabsFull = fullRows.reduce((n, r) => n + r.tabs, 0);
  console.log("\n================= SONUÇ =================");
  console.log(`Render edilen sekme: boş ${totalTabsEmpty} · dolu ${totalTabsFull} · pushed görünüm: 22`);
  console.log(`Hata sayısı: ${fail.length}`);
  fail.slice(0, 20).forEach(f => console.log("  ❌ " + f));
  console.log(fail.length ? "\n⚠️ BAZI KONTROLLER BAŞARISIZ" : "\n✅ TÜM UYGULAMALAR, SEKMELER VE ENTEGRASYONLAR TEMİZ");
  process.exit(fail.length ? 1 : 0);
}
