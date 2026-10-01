/* Kullanım: node tools/smoke-v1032.js
   KARMA — v10.32 "tek ana yuva" temizliği (B3–B8).

   B3) MERCH       : "Marka Ürünü" (sol panel) ↔ "Fan Merch" (telefon) ayrıldı
   B4) ŞİRKET/EKİP : "Şirket Ekibi" (sol panel) ↔ "Kişisel Ekip" (telefon) ayrıldı
   B5) AYARLAR     : oyun ayarları tek yuva (üst bar); telefondaki kopya girişler kaldırıldı
   B6) GÜNDEM      : haber okuma tek yuva (telefon → Haberler); sol panelde yalnız uyum özeti
   B7) STÜDYO      : tek yuva (sol panel); derin bağlantılar Stüdyo sekmesine yönlendirir
   B8) KİTLE       : fan katmanları tek yuva (Fanbase); Spotify app'i yalnız şehir gösterir

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
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

const pass = [], fail = [];
const ok = (n, c, e) => (c ? pass : fail).push(n + (e ? " — " + e : ""));

const { dom, errors } = H.bootDom(html, { seed: 20261032 });

H.whenReady(dom, {
  label: "v10.32 temizliği hazır",
  ready: (K) => !!(K && K.careerUI && K.phone && K.fans && K.merch && K.team)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exitCode = 1;
});

function run() {
  const K = dom.window.K, s = K.state, p = s.player;
  const careerSrc = read("js/ui/career-ui.js");
  const fansSrc = read("js/apps/fans.js");
  const teamSrc = read("js/apps/team.js");
  const phoneappsSrc = read("js/apps/phoneapps.js");
  const artSrc = read("js/apps/artistapps.js");
  const mainSrc = read("js/main.js");

  /* =========================================================
     B3) MERCH — marka ürünü ↔ fan merch
     ========================================================= */
  ok("B3 · sol panel 'Marka Ürünü' diyor", /Marka Ürünü/.test(careerSrc));
  ok("B3 · sol panelde streetwear vurgusu", /STREETWEAR|Streetwear/.test(careerSrc));
  ok("B3 · telefon 'Fan Merch' diyor", /Fan Merch/.test(fansSrc));
  ok("B3 · eski muğlak sekme adı kaldırıldı", !/label: "Merch & VIP"/.test(fansSrc));
  ok("B3 · fan merch kartı net", /Sınırlı Fan Merch/.test(fansSrc));

  /* =========================================================
     B4) ŞİRKET / EKİP
     ========================================================= */
  ok("B4 · telefon uygulaması 'Kişisel Ekip'", /name: "Kişisel Ekip"/.test(teamSrc));
  ok("B4 · telefon başlığı 'Kişisel Ekip'", /title: "Kişisel Ekip/.test(teamSrc));
  ok("B4 · telefon sekmesi 'Kişisel Ekip'", /label: "Kişisel Ekip"/.test(teamSrc));
  ok("B4 · sol panel 'Şirket Ekibi & Katalog'", /Şirket Ekibi & Katalog/.test(careerSrc));
  ok("B4 · sol panel 'Şirket Ekibi' başlığı", /<h2>Şirket Ekibi<\/h2>/.test(careerSrc));

  /* =========================================================
     B5) AYARLAR — tek yuva
     ========================================================= */
  ok("B5 · Kontrol Merkezi'nden oyun ayarı kaldırıldı", !/cc-game-settings/.test(phoneappsSrc));
  ok("B5 · Telefon Ayarları'ndan oyun ayarı kaldırıldı", !/ph-game/.test(phoneappsSrc));
  ok("B5 · telefondaki 'Karma Ayarları' metni kaldırıldı", !/Karma Ayarları/.test(phoneappsSrc));
  ok("B5 · üst bar ⚙️ tek yuva olarak duruyor", /btn-settings/.test(mainSrc) && /settings\.openUI/.test(mainSrc));

  /* =========================================================
     B6) GÜNDEM — tek yuva
     ========================================================= */
  ok("B6 · sol panelde haber listesi kalmadı", !/K\.news\.hot/.test(careerSrc));
  ok("B6 · sol panel telefona yönlendiriyor", /Haberler/.test(careerSrc));
  ok("B6 · uyum özeti (tema→gündem) duruyor", /Teman şu gündem konularına denk geliyor/.test(careerSrc));

  /* =========================================================
     B7) STÜDYO — tek yuva
     ========================================================= */
  ok("B7 · careerUI.goTab eklendi", /goTab\(name\)/.test(careerSrc));
  ok("B7 · stüdyo sihirbazı Stüdyo sekmesine yönlendiriyor", /openStudioModal[\s\S]{0,220}goTab\("studio"\)/.test(careerSrc));
  {
    let err = null;
    try {
      K.careerUI.goTab("analytics");
      K.careerUI.openStudioModal({ topic: { id: "t1", cat: "gundem", title: "Test gündem" } });
    } catch (e) { err = e; }
    const active = dom.window.document.querySelector("#career-tabs .tab.active");
    ok("B7 · sihirbaz açılınca Stüdyo sekmesi aktif", !err && active && active.dataset.tab === "studio",
      (err ? String(err.message) : (active && active.dataset.tab)));
    K.ui.closeModal();
  }

  /* =========================================================
     B8) KİTLE — tek yuva
     ========================================================= */
  ok("B8 · Spotify app'inde fan katmanları yok", !/fanModel|K\.fans\.model/.test(artSrc));
  ok("B8 · Spotify sekmesi 'Şehirler'", /label: "Şehirler"/.test(artSrc));
  ok("B8 · Fanbase'e yönlendirme var", /Fanbase/.test(artSrc));
  {
    const spView = K.phone.appById("spotifyartist").render({});
    const spKitle = spView.render("kitle", {});
    ok("B8 · Spotify 'Şehirler' sekmesi şehir gösteriyor", /Dinleyici Şehirleri/.test(spKitle));
    ok("B8 · Spotify 'Şehirler' sekmesinde katman yok", !/Dinleyici Katmanları/.test(spKitle));
  }

  /* =========================================================
     E) ENTEGRASYON
     ========================================================= */
  {
    const tabs = ["career", "studio", "jobs", "releases", "albums", "charts", "analytics", "concerts", "festivals", "label", "business", "events"];
    let okc = 0, bad = 0;
    tabs.forEach(t => {
      const el = dom.window.document.querySelector(`#career-tabs .tab[data-tab="${t}"]`);
      if (!el) return;
      try { el.click(); okc++; } catch (e) { bad++; }
    });
    ok("E · tüm sol panel sekmeleri render edildi", okc === tabs.length && bad === 0, okc + "/" + tabs.length);

    let apps = 0, appErr = 0;
    K.phone.apps.forEach(app => {
      try {
        const v = app.render({});
        const list = v.tabs && v.tabs.length ? v.tabs : [{ id: v.activeTab || "x" }];
        list.forEach(t => { const h = v.render(t.id, v.params || {}); if (typeof h !== "string") appErr++; });
        apps++;
      } catch (e) { appErr++; }
    });
    ok("E · tüm telefon uygulamaları render edildi", apps >= 18 && appErr === 0, apps + " app · " + appErr + " hata");

    let dayOK = true;
    try { K.game.nextDay(); } catch (e) { dayOK = false; }
    ok("E · gün geçişi çökmeden çalıştı", dayOK);
    K.ui.closeModal();
  }

  /* ---- rapor ---- */
  const runtime = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
  console.log("=".repeat(56));
  console.log("KARMA · v10.32 TEK ANA YUVA TEMİZLİĞİ (B3–B8)");
  console.log("=".repeat(56));
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length + (runtime.length ? " · Runtime hata: " + runtime.length : ""));
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); }
  if (runtime.length) { console.log("\n⚠️ RUNTIME"); Array.from(new Set(runtime)).slice(0, 6).forEach(e => console.log("   · " + e)); }
  if (!fail.length && !runtime.length) console.log("\n✅ TEMİZLİK TEMİZ");
  else process.exitCode = 1;
}
