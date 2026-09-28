/* Kullanım: node tools/smoke-social.js
   KARMA — SOSYAL MEDYA + PROFİL RESMİ + DİSKOGRAFİ testi

   Neleri doğrular:
   1) PP (profil resmi): 36 sanatçının HEPSİNDE gerçek görsel var mı?
      · K.ARTIST_PHOTOS kaydı
      · K.imagery.byArtistId / K.ui.artistAvatar çıktısı
      · sosyal uygulama HTML'inde background-image gerçekten var mı?
   2) Instagram: hikâye şeridi (kesilme yok), gönderi medyası, alt sekme,
      DM gelen kutusu, kaydırma hareketleri (sağa→DM, sola→canlı),
      çift dokunarak beğenme.
   3) Diskografi: Şehinşah + wegh Rumi tam şarkı listesi ve önizleme oranı.
   4) TikTok / X / Mesajlar: PP kullanımı ve render hatasızlığı.
*/
const { JSDOM, VirtualConsole } = require("/home/user/node_modules/jsdom");
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const FILE = path.join(ROOT, "KARMA-Oyun.html");
if (!fs.existsSync(FILE)) { console.error("KARMA-Oyun.html yok — önce: node tools/build-single.js"); process.exit(1); }

const html = fs.readFileSync(FILE, "utf8");
const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => { const m = e.detail ? e.detail.message : e.message; if (!/fonts/.test(m)) errors.push("jsdomError: " + m); });

const dom = new JSDOM(html, {
  url: "https://karma.local/", runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) {
    w.fetch = () => Promise.reject(new Error("offline"));
    w.addEventListener("error", (e) => errors.push("onerror: " + (e.error ? e.error.stack : e.message)));
  }
});

setTimeout(run, 2600);

function run() {
  const win = dom.window, K = win.K;
  const pass = [], fail = [];
  const ok = (name, cond, extra) => (cond ? pass : fail).push(name + (extra ? " — " + extra : ""));
  const hasBg = (s) => /background-image:\s*url\(/.test(s || "");
  const hasImg = (s) => hasBg(s) || /<img[^>]+src=/.test(s || "");

  /* =========================================================
     1) PROFİL RESMİ (PP) KAPSAMI
     ========================================================= */
  const artists = K.artistList();
  const photos = K.ARTIST_PHOTOS || {};
  const missingRecord = artists.filter((a) => !photos[a.id]);
  ok("PP veri kaydı: tüm sanatçılar", missingRecord.length === 0,
    missingRecord.length ? "eksik: " + missingRecord.map((a) => a.stageName).join(", ") : artists.length + " sanatçı");

  const missingResolve = artists.filter((a) => !K.imagery.byArtistId(a.id));
  ok("PP çözümlemesi: tüm sanatçılar", missingResolve.length === 0,
    missingResolve.length ? "eksik: " + missingResolve.map((a) => a.stageName).join(", ") : "36/36");

  const missingAvatar = artists.filter((a) => !hasImg(K.ui.artistAvatar(a.id, 40, true)));
  ok("Avatar bileşeni görsel döndürüyor", missingAvatar.length === 0,
    missingAvatar.length ? "eksik: " + missingAvatar.map((a) => a.stageName).join(", ") : "36/36");

  /* =========================================================
     2) INSTAGRAM
     ========================================================= */
  K.state = K.newGame();
  const ig = K.phone.appById("instagram");

  artists.slice(0, 10).forEach((a) => K.interactions.toggleFollow(a.id));
  const feed = ig.feedHTML();

  const storyCount = (feed.match(/class="ig-story"/g) || []).length;
  ok("Hikâye şeridi render edildi", storyCount >= 6, storyCount + " hikâye");
  ok("Hikâye şeridi sınıfı doğru", /class="ig-stories"/.test(feed));

  const storyImgs = (feed.split('class="ig-story"').slice(1))
    .map((chunk) => chunk.slice(0, 600))
    .filter((chunk) => hasBg(chunk));
  ok("Hikâyelerde gerçek PP", storyImgs.length >= storyCount - 1, storyImgs.length + "/" + storyCount);

  const postCount = (feed.match(/class="ig-post"/g) || []).length;
  ok("Akışta gönderi var", postCount >= 1, postCount + " gönderi");
  ok("Gönderi medya kutusu", /class="ig-media/.test(feed));
  ok("Çift dokunma hedefi tanımlı", /data-ig-dbl="/.test(feed));
  ok("Beğeni düğmesi var", /data-pact="like"/.test(feed));

  const view = ig.render({});
  ok("Kaydırma: sağa → DM", !!(view.swipe && typeof view.swipe.right === "function"));
  ok("Kaydırma: sola → canlı", !!(view.swipe && typeof view.swipe.left === "function"));

  const profileIconHTML = (view.tabs.find((t) => t.id === "profile") || {}).icon || "";
  ok("Alt sekme: profil ikonu", /ig-tab-av/.test(profileIconHTML), hasBg(profileIconHTML) ? "gerçek PP" : "baş harf rozeti");

  const inbox = ig.inboxView();
  const inboxHTML = inbox.render();
  ok("DM gelen kutusu render", inboxHTML.length > 200, inboxHTML.length + " bayt");
  ok("DM gelen kutusunda PP", hasBg(inboxHTML));
  ok("DM satırı eylemli", /data-pact="ig-thread"/.test(inboxHTML));

  const swipeTest = (dir, expect) => {
    K.phone.views = [ig.render({})];
    K.phone.homeActive = false;
    const before = K.phone.views.length;
    try {
      const handled = K.phone.doGesture(dir === "right" ? 120 : -120);
      const top = K.phone.views[K.phone.views.length - 1];
      const okRes = handled && K.phone.views.length > before;
      ok("Hareket çalışıyor: " + expect, okRes, okRes ? "yeni görünüm: " + (top.title || "") : "görünüm açılmadı");
    } catch (e) { ok("Hareket çalışıyor: " + expect, false, e.message); }
    finally { K.phone.views = []; K.phone.homeActive = true; }
  };
  swipeTest("right", "sağa → DM gelen kutusu");
  swipeTest("left", "sola → canlı yayın");

  try {
    const before = K.interactions.isLiked("ig_dbltest");
    ig.doubleLike("dbltest", null);
    const after = K.interactions.isLiked("ig_dbltest");
    ok("Çift dokunma beğeniyor", before === false && after === true);
  } catch (e) { ok("Çift dokunma beğeniyor", false, e.message); }

  ["feed", "explore", "reels", "profile"].forEach((t) => {
    try {
      const out = view.render(t) || "";
      ok("Instagram sekmesi: " + t, out.length > 120, out.length + " bayt");
    } catch (e) { ok("Instagram sekmesi: " + t, false, e.message); }
  });

  const safePush = (label, fn) => {
    const before = K.phone.views.length;
    try {
      fn();
      const v = K.phone.views[K.phone.views.length - 1];
      const out = v && typeof v.render === "function" ? v.render(v.activeTab, v.params) : "";
      ok("Instagram görünüm: " + label, (out || "").length > 60, (out || "").length + " bayt");
    } catch (e) { ok("Instagram görünüm: " + label, false, e.message); }
    finally { K.phone.views.length = before; K.phone.homeActive = true; }
  };
  safePush("gönderi detayı", () => ig.openPost("testPost"));
  safePush("hikâye", () => ig.openStory("player"));
  safePush("sanatçı profili (pushed)", () => ig.openProfile(artists[0].id));
  safePush("Spotify tüm şarkılar", () => K.phone.appById("spotify").openAllSongs("sehinsah"));
  safePush("Apple tüm şarkılar kabuğu", () => K.phone.appById("spotify").openAllSongs("weghrumi", { shellClass: "app-applemusic" }));

  /* =========================================================
     3) DİSKOGRAFİ — Şehinşah + wegh Rumi
     ========================================================= */
  [["sehinsah", "Şehinşah", 180], ["weghrumi", "wegh Rumi", 45]].forEach(([id, name, min]) => {
    const songs = (K.REAL_SONGS || {})[id] || [];
    const pv = (K.REAL_PREVIEWS || {})[id] || {};
    const albums = (K.DISCOGRAPHY || {})[id] || [];
    ok(`${name}: tam şarkı listesi (>=${min})`, songs.length >= min, songs.length + " şarkı");
    ok(`${name}: her şarkıda 30 sn önizleme`, Object.keys(pv).length === songs.length,
      Object.keys(pv).length + "/" + songs.length);
    ok(`${name}: albüm listesi`, albums.length >= 20, albums.length + " yayın");
    try {
      const prof = K.platforms.artistProfile(id);
      ok(`${name}: profil tüm şarkıları taşıyor`, (prof.songs || []).length === songs.length,
        (prof.songs || []).length + "/" + songs.length);
    } catch (e) { ok(`${name}: profil`, false, e.message); }
  });

  /* =========================================================
     4) DİĞER SOSYAL UYGULAMALAR — PP + render
     ========================================================= */
  ["tiktok", "x", "messages", "youtube", "spotify", "applemusic"].forEach((id) => {
    const app = K.phone.appById(id);
    if (!app) { ok("Uygulama kayıtlı: " + id, false); return; }
    let bytes = 0, err = null, withPhoto = 0, tabs = 0;
    try {
      const v = app.render({});
      const ids = v.tabs && v.tabs.length ? v.tabs.map((t) => t.id) : [null];
      ids.forEach((t) => { tabs++; const out = v.render(t, v.params) || ""; bytes += out.length; if (hasImg(out)) withPhoto++; });
    } catch (e) { err = e.message; }
    ok("Render: " + id, !err && bytes > 200, err || bytes + " bayt / " + tabs + " sekme");
    ok("PP kullanımı: " + id, withPhoto > 0, withPhoto + "/" + tabs + " sekmede görsel");
  });

  /* =========================================================
     SONUÇ
     ========================================================= */
  console.log("\n================= SOSYAL MEDYA + PP + DİSKOGRAFİ =================");
  pass.forEach((p) => console.log("  ✅ " + p));
  fail.forEach((f) => console.log("  ❌ " + f));
  if (errors.length) { console.log("\n  ⚠️ Çalışma zamanı hataları:"); errors.slice(0, 10).forEach((e) => console.log("   " + e)); }
  console.log("\nGeçen: " + pass.length + " · Kalan: " + fail.length + " · Runtime hata: " + errors.length);
  console.log(fail.length === 0 && errors.length === 0 ? "\n✅ TÜM SOSYAL MEDYA, PP VE DİSKOGRAFİ KONTROLLERİ TEMİZ" : "\n❌ BAZI KONTROLLER BAŞARISIZ");
  process.exit(fail.length || errors.length ? 1 : 0);
}
