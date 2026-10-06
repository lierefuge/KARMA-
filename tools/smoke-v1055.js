/* Kullanım: node tools/smoke-v1055.js
   KARMA — v10.55: KAYIT SAĞLAMLIĞI · ERİŞİLEBİLİRLİK · YÜKSELEN LİSTE

   Neden bu süit var?
   ------------------
   Bağımsız bir kod incelemesi üç somut kusur buldu ve bunlar burada
   kalıcı olarak kilitlenir:

     A) KAYIT ŞİŞMESİ — `_npcSongs` TÜRETİLMİŞ bir önbellekti ama state
        kökünde yaşadığı için her kayıtta diske yazılıyordu. Ölçüm:
        500 günlük oyunda kaydın ~%30'u (194 KB) yalnızca bu önbellekti;
        uzun oyunda localStorage kotasını doldurup kaydı bozabiliyordu.
     B) SESSİZ KAYIT HATASI — `K.save()` false dönse bile arayüz
        "Kaydedildi" diyordu; oyuncu kaydının gittiğini anlamıyordu.
     C) ULAŞILAMAZ LİSTE — ulusal KARMA Top 30'un en alt sırası bile
        günlük ~58.000 dinlenme ister; normal oynayışta (denge simülasyonu:
        512 gün, tepe ~1.500/gün) oyuncu oraya hiç giremiyordu.
        "Yükselen 20" erken kariyer basamağı olarak eklendi.
     D) ERİŞİLEBİLİRLİK — sekmeler/ikon düğmeleri/telefon ekranı için
        ARIA durumu ve global hata görünürlüğü eklendi.

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

const { dom, errors } = H.bootDom(html, { seed: 20261055 });

H.whenReady(dom, {
  label: "v10.55 katmanı hazır",
  ready: (K) => !!(K && K.game && K.game.buildRisingChart && K.serializeState)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exitCode = 1;
});

function run() {
  const K = dom.window.K, s = K.state, p = s.player;
  const gameSrc = read("js/core/game.js");
  const stateSrc = read("js/core/state.js");
  const mainSrc = read("js/main.js");
  const indexSrc = read("index.html");
  /* v10.62.2 — global hata yakalayıcı tek sistem olarak
     systems/error-monitor.js'e taşındı; main.js onu kurar. */
  const errMonSrc = read("js/systems/error-monitor.js");

  /* =========================================================
     A) KAYIT ŞİŞMESİ — türetilmiş veri diske yazılmamalı
     ========================================================= */
  ok("A1 · serializeState tanımlı", typeof K.serializeState === "function");

  const realNpcSongs = s._npcSongs;
  s._npcSongs = { big: { x: "y".repeat(5000) } };
  const json = K.serializeState(s);
  ok("A2 · _npcSongs kayda GİRMEZ", !/_npcSongs/.test(json));
  ok("A3 · diğer state korunur", /"player"/.test(json) && /"day"/.test(json));

  const full = JSON.stringify(s);
  ok("A4 · kayıt boyutu türetilmiş veri kadar küçülür",
    json.length < full.length, full.length + " → " + json.length);
  s._npcSongs = realNpcSongs;

  /* slot kaydı ve dışa aktarma da aynı serileştiriciyi kullanmalı */
  const setSrc = read("js/systems/settings.js");
  ok("A5 · slot kaydı türetilmiş veriyi yazmaz",
    /serializeState/.test(setSrc) && !/setItem\(key\(n\), JSON\.stringify\(K\.state\)\)/.test(setSrc));
  ok("A6 · dışa aktarma türetilmiş veriyi yazmaz",
    /const data = \(K\.serializeState/.test(setSrc));

  /* =========================================================
     B) SESSİZ KAYIT HATASI — arayüz sonucu bildirmeli
     ========================================================= */
  ok("B1 · K.save boolean döner", typeof K.save() === "boolean");
  ok("B2 · başarılı kayıtta hata durumu temizlenir",
    K.lastSaveError === null || K.lastSaveError === undefined, "lastSaveError=" + K.lastSaveError);
  ok("B3 · kota hatasında kırpılmış kayıt denenir",
    /compactState/.test(stateSrc) && /quota/.test(stateSrc));
  ok("B4 · arayüz kayıt sonucunu kontrol eder (dürüst geri bildirim)",
    /saveWithFeedback/.test(mainSrc) && /if \(!ok\)/.test(mainSrc));
  ok("B5 · kayıt başarısızlığında kırmızı uyarı var",
    /Kaydedilemedi/.test(mainSrc) && /"bad"/.test(mainSrc));

  /* =========================================================
     C) YÜKSELEN 20 — erken kariyer basamağı
     ========================================================= */
  ok("C1 · buildRisingChart tanımlı", typeof K.game.buildRisingChart === "function");
  ok("C2 · anonim çıkış sanatçısı havuzu var",
    Array.isArray(K.game.RISING_NAMES) && K.game.RISING_NAMES.length >= 20);

  const realSongs = p.songs, realDay = s.day, realRising = s.chartRising;
  s.day = 100;
  p.songs = [{ id: "rise_t", title: "Deneme", publishedDay: 95, lastDaily: 40, coverSeed: "t", streams: 0 }];
  K.game.buildRisingChart();
  const rising = s.chartRising || [];
  ok("C3 · liste dolu (20 satır)", rising.length === 20, "satır=" + rising.length);
  ok("C4 · oyuncunun düşük dinlenmeli şarkısı listeye girer",
    rising.some(e => e.mine), "oyuncu sıraları: " + rising.filter(e => e.mine).map(e => "#" + e.rank).join(","));
  ok("C5 · oyuncu şarkısına yükselen sırası yazılır",
    typeof p.songs[0].risingRank === "number" && p.songs[0].risingRank >= 1);
  ok("C6 · günlük dinlenme azalan sıralı",
    rising.every((e, i) => i === 0 || rising[i - 1].daily >= e.daily));

  /* erken kariyerde ulusal Top 30 HÂLÂ ulaşılamaz olmalı (tasarım gereği),
     ama yükselen liste oyuncuya görünür bir basamak sunmalı */
  ok("C7 · ulusal liste eşiği yüksek kalır (yükselen listenin varlık nedeni)",
    /age < 2/.test(gameSrc) && /< 500/.test(gameSrc));
  ok("C8 · yükselen eşiği ulusaldan ÇOK düşük", /< 10/.test(gameSrc));

  /* göç: chartRising alanı olmayan eski kayıt çökmeden yüklenmeli */
  ok("C9 · eski kayıt göçünde chartRising varsayılanı var",
    /chartRising = K\.state\.chartRising \|\| \[\]/.test(stateSrc));
  p.songs = realSongs; s.day = realDay; s.chartRising = realRising;

  /* =========================================================
     D) ERİŞİLEBİLİRLİK + GLOBAL HATA GÖRÜNÜRLÜĞÜ
     ========================================================= */
  ok("D1 · sekme listesi role=tablist", /id="career-tabs"[^>]*role="tablist"/.test(indexSrc));
  ok("D2 · sekmeler role=tab + aria-selected", /role="tab"[^>]*aria-selected="true"/.test(indexSrc));
  ok("D3 · seçili sekme JS'te güncellenir", /setAttribute\("aria-selected"/.test(read("js/ui/career-ui.js")));
  ok("D4 · ikon düğmesinde aria-label", /id="btn-settings"[^>]*aria-label=/.test(indexSrc));
  ok("D5 · toast canlı bölge (aria-live)", /id="toast-stack"[^>]*aria-live="polite"/.test(indexSrc));
  ok("D6 · ana ekran düğmesi gerçek <button> + aria-label",
    /<button class="home-indicator"[^>]*aria-label=/.test(indexSrc));
  ok("D7 · telefon ekranı bölge olarak etiketli",
    /id="phone-viewport"[^>]*role="region"/.test(indexSrc));
  ok("D8 · global hata yakalayıcı kurulur",
    /installErrorReporting/.test(mainSrc) &&
    (/addEventListener\("error"/.test(mainSrc) || /addEventListener\("error"/.test(errMonSrc)));

  /* gerçekten çalışıyor mu: sentetik bir hata olayı K.lastError yazmalı */
  let dispatched = false;
  try {
    const win = dom.window;
    let ev;
    try { ev = new win.ErrorEvent("error", { message: "KARMA test hatası", error: new Error("KARMA test hatası") }); }
    catch (e) { ev = new win.Event("error"); ev.message = "KARMA test hatası"; ev.error = new Error("KARMA test hatası"); }
    win.dispatchEvent(ev);
    dispatched = !!(K.lastError && /KARMA test hatası/.test(String(K.lastError.detail || "") + String(K.lastError.label || "")));
  } catch (e) {}
  ok("D9 · hata yakalandığında K.lastError yazılır", dispatched);

  /* =========================================================
     E) TEMİZLİK — bayat yorum ve türetilmiş-veri kuralı
     ========================================================= */
  ok("E1 · state.js'teki mükerrer bayat B-6 yorumu kaldırıldı",
    !/data\/player-persona\.js/.test(stateSrc) && !/data\/npc-personality\.js/.test(stateSrc));

  /* =========================================================
     F) RUNTIME TEMİZ
     ========================================================= */
  const rt = (errors || []).filter(m => !/fonts|Not implemented|KARMA test hatası/i.test(m));
  ok("F1 · süitte yakalanmamış runtime hatası yok", rt.length === 0, rt.slice(0, 2).join(" | "));

  console.log("\n============================================");
  console.log("KARMA · v10.55 (kayıt · erişilebilirlik · yükselen liste)");
  console.log("============================================");
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length);
  if (fail.length) {
    console.log("\n❌ BAŞARISIZ");
    fail.forEach((f) => console.log("   · " + f));
    process.exit(1);
  }
  console.log("\n✅ v10.55 TEMİZ");
  process.exit(0);
}
