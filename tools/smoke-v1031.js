/* Kullanım: node tools/smoke-v1031.js
   KARMA — v10.31 "çoklu erişim" temizliği testi.

   A) ÖLÜ KOD      : renderStats · open-settings · Kariyer Detayı modalı kaldırıldı
   B) RÖPORTAJ     : tek motor (K.press) — arama ve DM yalnızca yönlendirir
   C) ANALİZ       : sol panel = tüm-platform yönetim özeti
   D) TELEFON      : artist uygulamaları YALNIZ kendi platformunun verisini gösterir
   E) ENTEGRASYON  : tüm sekmeler çökmeden render edilir

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

const { dom, errors } = H.bootDom(html, { seed: 20261031 });

H.whenReady(dom, {
  label: "v10.31 temizliği hazır",
  ready: (K) => !!(K && K.careerUI && K.calls && K.dms && K.press && K.phone)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exitCode = 1;
});

function run() {
  const K = dom.window.K, s = K.state, p = s.player, U = K.util;
  const careerSrc = read("js/ui/career-ui.js");
  const callsSrc = read("js/systems/calls.js");
  const dmsSrc = read("js/systems/dms.js");
  const msgSrc = read("js/apps/messages.js");
  const artSrc = read("js/apps/artistapps.js");

  /* =========================================================
     A) ÖLÜ KOD KALDIRILDI
     ========================================================= */
  ok("A1 · renderStats() kaldırıldı", !/renderStats/.test(careerSrc));
  ok("A2 · open-settings ölü handler kaldırıldı", !/open-settings/.test(careerSrc));
  ok("A3 · Kariyer Detayı modalı kaldırıldı", !/openAdvancedCareer/.test(careerSrc) && !/data-act="advanced-career"/.test(careerSrc));

  /* =========================================================
     B) RÖPORTAJ: TEK MOTOR
     ========================================================= */
  ok("B · arama gazetecisi röportaj motoruna bağlı", /interview:\s*true/.test(callsSrc));
  ok("B · DM gazetecisi röportaj motoruna bağlı", /interview:\s*true/.test(dmsSrc));
  ok("B · arama seçimi interview bayrağı döndürüyor", /interview:\s*!!opt\.interview/.test(callsSrc));
  ok("B · DM yanıtı interview bayrağı döndürüyor", /interview:\s*!!opt\.interview/.test(dmsSrc));
  ok("B · mesajlar UI röportajı açıyor", /res\.interview[\s\S]{0,80}press\.interview/.test(msgSrc));
  ok("B · arama UI röportajı açıyor", /res\.interview[\s\S]{0,80}press\.interview/.test(callsSrc));
  ok("B · tek karar ekranı K.press.resolveInterview", typeof K.press.resolveInterview === "function");

  /* canlı: DM gazeteci → interview bayrağı */
  K.dms.ensure();
  const press = K.dms.list().find(x => x.role === "gazeteci");
  s.dmRequests = {};
  K.dms.send(press.id, "gazeteci");
  const gres = K.dms.reply(press.id, "accept");
  ok("B · DM gazeteci kabulü interview=true", !!(gres && gres.interview === true));
  K.press.interview();
  ok("B · röportaj karar ekranı state'e yazıldı", !!s.pendingInterview);
  const repB = p.reputation;
  K.press.resolveInterview("humble");
  ok("B · röportaj sonucu itibarı değiştirdi", p.reputation > repB, repB + " → " + p.reputation);
  K.ui.closeModal();
  s.dmRequests = {};

  /* =========================================================
     C) ANALİZ: SOL PANEL = TÜM-PLATFORM YÖNETİM ÖZETİ
     ========================================================= */
  {
    p.songs = p.songs || [];
    if (!p.songs.length) {
      p.songs.push({ id: "a1", title: "Test", quality: 70, streams: 5000, dailyStreams: 50,
        boosts: {}, platforms: { spotify: .46, apple: .19, youtube: .28, other: .07 }, publishedDay: s.day });
    }
    const out = K.careerUI.renderAnalytics();
    ok("C · Analiz render edildi", typeof out === "string" && out.length > 200);
    ok("C · Analiz tüm-platform toplamı gösteriyor", /Toplam Dinlenme/.test(out));
    ok("C · Analiz platform kırılımı gösteriyor", /Platform kırılımı/.test(out) && /Spotify/.test(out) && /Apple Music/.test(out));
    ok("C · Analiz kariyer durumu paneli içeriyor", /Kariyer durumu/.test(out) && /Görünürlük/.test(out));
    ok("C · Analiz en iyi sıra gösteriyor", /En İyi Sıra/.test(out));
  }

  /* =========================================================
     D) TELEFON ARTIST UYGULAMALARI: YALNIZ KENDİ PLATFORMU
     ========================================================= */
  {
    /* statik: artist uygulamalarında global metrik kalmadı */
    ok("D · artist uygulamalarında global 'Aylık Dinleyici' yok", !/Aylık Dinleyici/.test(artSrc));
    ok("D · artist uygulamalarında global albüm listesi yok", !/albumChart/.test(artSrc));
    ok("D · artist uygulamalarında global monthly serisi yok", !/series\(\s*["']monthly["']/.test(artSrc));
    ok("D · artist uygulamalarında global takipçi (p.ig) yok", !/p\.ig\b/.test(artSrc));

    /* canlı: her sekme çökmeden render edilir + platforma özel başlık var */
    const apps = ["spotifyartist", "appleartist", "royalty"];
    let rendered = 0, errs = 0;
    apps.forEach(id => {
      const app = K.phone.appById(id);
      if (!app) return;
      const view = app.render({});
      (view.tabs || [{ id: view.activeTab || "x" }]).forEach(t => {
        try { const h = view.render(t.id, view.params); if (typeof h === "string") rendered++; else errs++; }
        catch (e) { errs++; }
      });
    });
    ok("D · üç artist uygulaması tüm sekmeleriyle render edildi", rendered >= 10 && errs === 0, rendered + " sekme · " + errs + " hata");

    const spView = K.phone.appById("spotifyartist").render({});
    const spOzet = spView.render("gen", {});
    ok("D · Spotify uygulaması Spotify'a özel metrik gösteriyor", /Spotify Dinlenme/.test(spOzet));
    ok("D · Spotify uygulaması kaydetme/liste gösteriyor", /Kaydetme/.test(spOzet) && /Listedeki/.test(spOzet));

    const apView = K.phone.appById("appleartist").render({});
    const apGen = apView.render("gen", {});
    ok("D · Apple uygulaması Apple'a özel metrik gösteriyor", /Apple Dinlenme/.test(apGen) && /Shazam/.test(apGen));
  }

  /* =========================================================
     E) ENTEGRASYON — tüm sol panel sekmeleri çökmeden render
     ========================================================= */
  {
    const tabs = ["career", "studio", "jobs", "releases", "albums", "charts", "analytics", "concerts", "festivals", "label", "business", "events"];
    let okCount = 0, badCount = 0;
    tabs.forEach(t => {
      const el = dom.window.document.querySelector(`#career-tabs .tab[data-tab="${t}"]`);
      if (!el) return;
      try { el.click(); okCount++; } catch (e) { badCount++; }
    });
    ok("E · tüm sol panel sekmeleri tıklanabilir", okCount === tabs.length && badCount === 0, okCount + "/" + tabs.length);

    /* gün geçişi hâlâ temiz */
    let dayOK = true;
    try { K.game.nextDay(); } catch (e) { dayOK = false; }
    ok("E · gün geçişi çökmeden çalıştı", dayOK);
    K.ui.closeModal();
  }

  /* ---- rapor ---- */
  const runtime = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
  console.log("=".repeat(54));
  console.log("KARMA · v10.31 ÇOKLU ERİŞİM TEMİZLİĞİ");
  console.log("=".repeat(54));
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length + (runtime.length ? " · Runtime hata: " + runtime.length : ""));
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); }
  if (runtime.length) { console.log("\n⚠️ RUNTIME"); Array.from(new Set(runtime)).slice(0, 6).forEach(e => console.log("   · " + e)); }
  if (!fail.length && !runtime.length) console.log("\n✅ TEMİZLİK TEMİZ");
  else process.exitCode = 1;
}
