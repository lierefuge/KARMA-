/* Kullanım: node tools/smoke-v1037.js
   KARMA — v10.37: gerçek uygulama düzeni (2. dalga) + pil kaldırma.

   1) BEŞ UYGULAMA GERÇEK DÜZEN : X · YouTube · TikTok · Apple Music · Mesajlar
      alt sekmeleri emoji değil, gerçek SVG simge kullanıyor.
   2) PİL KALDIRILDI            : günlük boşalma, "telefon kapandı" ekranı,
      şarj düğmeleri ve pil tasarrufu yok. Telefon her zaman açık.
   3) SÜRÜM ETİKETİ HİZALI      : package.json · js/version.js · version.json

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
const exists = (p) => fs.existsSync(path.join(ROOT, p));

const pass = [], fail = [];
const ok = (n, c, e) => (c ? pass : fail).push(n + (e ? " — " + e : ""));

/* emoji var mı? (sekme simgesi SVG olmalı) */
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

const { dom, errors } = H.bootDom(html, { seed: 20261037 });

H.whenReady(dom, {
  label: "v10.37 hazır",
  ready: (K) => !!(K && K.phone && K.phoneOS && K.state && K.game)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exitCode = 1;
});

function run() {
  const K = dom.window.K, s = K.state, p = s.player;
  const REAL_APPS = ["x", "youtube", "tiktok", "applemusic", "messages"];

  /* =========================================================
     1) BEŞ UYGULAMA — alt sekmeler gerçek SVG simge
     ========================================================= */
  REAL_APPS.forEach(id => {
    const app = K.phone.appById(id);
    ok("U1 · " + id + " uygulaması kayıtlı", !!app);
    if (!app) return;
    let view = null;
    try { view = app.render({}); } catch (e) { fail.push("U1 · " + id + " render: " + e.message); return; }
    const tabs = (view && view.tabs) || [];
    ok("U1 · " + id + " alt sekmesi var", tabs.length >= 3, tabs.length + " sekme");
    const allSvg = tabs.length > 0 && tabs.every(t => typeof t.icon === "string" && t.icon.indexOf("<svg") >= 0);
    ok("U1 · " + id + " sekme simgeleri SVG", allSvg);
    const emojiTab = tabs.find(t => t.icon && EMOJI.test(t.icon));
    ok("U1 · " + id + " sekmede emoji yok", !emojiTab, emojiTab ? emojiTab.id : "");
  });

  /* aktif/pasif simge değişimi (dolu ↔ ince çizgi) tanımlı mı */
  const realCss = exists("css/apps-real.css") ? read("css/apps-real.css") : "";
  ["x", "y", "t", "m", "a"].forEach(pfx => {
    ok("U2 · ." + pfx + "-on / ." + pfx + "-off değişimi CSS'te var",
      realCss.indexOf("." + pfx + "-on") >= 0 && realCss.indexOf("." + pfx + "-off") >= 0);
  });
  ok("U2 · apps-real.css index.html'de yükleniyor", /css\/apps-real\.css/.test(read("index.html")));

  /* X gönderi eylemleri SVG */
  {
    const src = read("js/apps/x.js");
    /* xp-actions bloğunu tam olarak çıkar, sonra emoji ara */
    const m = src.match(/<div class="xp-actions">([\s\S]*?)<\/div>/);
    ok("U3 · X gönderi eylem bloğu bulundu", !!m);
    ok("U3 · X gönderi eylemleri SVG (emoji değil)", !!m && !EMOJI.test(m[1]) && /<svg|XI\./.test(m[1]));
    ok("U3 · X SVG simge takımı tanımlı", /const XI = \{/.test(src));
  }
  ok("U3 · YouTube SVG simge takımı tanımlı", /const YI = \{/.test(read("js/apps/youtube.js")));
  ok("U3 · TikTok SVG simge takımı tanımlı", /const TI = \{/.test(read("js/apps/tiktok.js")));
  ok("U3 · Apple Music SVG simge takımı tanımlı", /const AI = \{/.test(read("js/apps/applemusic.js")));
  ok("U3 · Mesajlar SVG simge takımı tanımlı", /const MI = \{/.test(read("js/apps/messages.js")));

  /* =========================================================
     2) PİL KALDIRILDI
     ========================================================= */
  ok("P1 · phoneOS.battery() yok", typeof K.phoneOS.battery !== "function");
  ok("P1 · phoneOS.charge() yok", typeof K.phoneOS.charge !== "function");
  ok("P1 · phoneOS.dead() yok", typeof K.phoneOS.dead !== "function");
  ok("P1 · player.battery alanı yok", p.battery === undefined, String(p.battery));
  ok("P1 · player.phoneDead alanı yok", p.phoneDead === undefined, String(p.phoneDead));

  /* günlük geçiş pili düşürmemeli ve telefonu kapatmamalı */
  {
    const before = p.battery;
    for (let i = 0; i < 40; i++) { try { K.game.nextDay(); } catch (e) {} }
    ok("P2 · 40 gün sonra pil alanı hâlâ yok", p.battery === undefined, String(p.battery));
    ok("P2 · 40 gün sonra telefon kapalı değil", !p.phoneDead);
    ok("P2 · telefon hâlâ kullanılabilir", (function () {
      try { K.phone.openApp("x"); const v = K.phone.views[K.phone.views.length - 1]; return !!(v && v.render); }
      catch (e) { return false; }
    })());
    K.phone.home();
  }

  /* pil arayüzü tamamen gitti mi */
  const phoneappsSrc = read("js/apps/phoneapps.js");
  ok("P3 · Kontrol Merkezi'nde pil kartı yok", !/cc-bat|cc-charge/.test(phoneappsSrc));
  ok("P3 · Ayarlar'da pil kartı yok", !/ph-charge|ph-saver/.test(phoneappsSrc));
  ok("P3 · 'Pil tasarrufu' anahtarı yok", !/batterySaver/.test(phoneappsSrc));
  ok("P3 · durum çubuğunda pil göstergesi yok", !/battery-level/.test(read("index.html")));
  ok("P3 · 'pil bitti' ekranı CSS'te yok", !/phone-dead-overlay/.test(read("css/phone-extras.css")));
  ok("P3 · phoneos.js'te boşalma mantığı yok", !/drain/.test(read("js/systems/phoneos.js")));

  /* =========================================================
     3) SÜRÜM ETİKETİ HİZALI
     ========================================================= */
  {
    const pkg = JSON.parse(read("package.json")).version;
    const vjs = (read("js/version.js").match(/K\.VERSION = "([^"]+)"/) || [])[1];
    const vjson = JSON.parse(read("version.json")).version;
    ok("S1 · package.json sürümü okunuyor", !!pkg, pkg);
    ok("S1 · js/version.js ile package.json aynı", pkg === vjs, pkg + " ≠ " + vjs);
    ok("S1 · version.json ile package.json aynı", pkg === vjson, pkg + " ≠ " + vjson);
    /* Sürüm en az 10.37 olmalı: v10.33–v10.36 işleri yapıldığı hâlde
       etiket 10.32'de kalmıştı. Bu kontrol o gerilemeyi kilitler. */
    const verNum = String(pkg).split(".").map(Number);
    const atLeast = (verNum[0] > 10) ||
      (verNum[0] === 10 && verNum[1] > 37) ||
      (verNum[0] === 10 && verNum[1] === 37 && (verNum[2] || 0) >= 0);
    ok("S1 · sürüm en az 10.37 (10.32 gerilemesi yok)", atLeast, String(pkg));
    ok("S1 · README'de v10.37 başlığı var", /GÜNCELLEME v10\.37/.test(read("README.md")));
    ok("S1 · README'de v10.33–v10.36 başlıkları var",
      /v10\.36/.test(read("README.md")) && /v10\.33/.test(read("README.md")));
  }

  /* =========================================================
     4) ENTEGRASYON — hiçbir şey bozulmadı
     ========================================================= */
  {
    let apps = 0, appErr = 0;
    K.phone.apps.forEach(app => {
      try {
        const v = app.render({});
        const list = v.tabs && v.tabs.length ? v.tabs : [{ id: v.activeTab || "x" }];
        list.forEach(t => { const h = v.render(t.id, v.params || {}); if (typeof h !== "string") appErr++; });
        apps++;
      } catch (e) { appErr++; }
    });
    ok("E1 · tüm telefon uygulamaları render edildi", apps >= 18 && appErr === 0, apps + " app · " + appErr + " hata");
  }

  /* ---- rapor ---- */
  const runtime = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
  console.log("=".repeat(56));
  console.log("KARMA · v10.37 GERÇEK UYGULAMA DÜZENİ + PİL KALDIRMA");
  console.log("=".repeat(56));
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length + (runtime.length ? " · Runtime hata: " + runtime.length : ""));
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); }
  if (runtime.length) { console.log("\n⚠️ RUNTIME"); Array.from(new Set(runtime)).slice(0, 6).forEach(e => console.log("   · " + e)); }
  if (!fail.length && !runtime.length) console.log("\n✅ GERÇEK DÜZEN TAM · PİL YOK");
  else process.exitCode = 1;
}
