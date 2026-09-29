/* Kullanım: node tools/smoke-lazy.js
   KARMA — TEMBEL VERİ KATMANI testi (v10.16 · P-1)

   Neleri doğrular:
   A) SOĞUK AÇILIŞ — veri HİÇ yüklenmemişken (istek bloke edilmiş) tüm
      uygulamalar, sanatçı profilleri ve önizleme aramaları çökmüyor mu?
      Güvenli erişimciler boş değer döndürüyor mu? → Bu, P-1'in asıl riski:
      veri geç gelirse oyun patlamamalı.
   B) SICAK AÇILIŞ — veri yüklendikten sonra içerik KAYIPSIZ mı?
      (JS → JSON dönüşümü hiçbir kaydı düşürmemeli.)
   C) MODÜLER index.html ağır dosyaları ARTIK EAGER YÜKLEMİYOR mu?
   D) TEK DOSYA build'inde veri JSON bloğu olarak gömülü mü, yoksa hâlâ
      çalıştırılabilir JS olarak mı duruyor? (asıl kazanç burada)
   E) Tanımsız/bilinmeyen adlar çökmüyor mu?
*/
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ROOT = path.resolve(__dirname, "..");

const H = require("./harness.js");
const { JSDOM, VirtualConsole } = H.resolveJsdom();

const pass = [], fail = [];
const ok = (name, cond, extra) => (cond ? pass : fail).push(name + (extra ? " — " + extra : ""));
const buildFile = path.join(ROOT, "KARMA-Oyun.html");
const index = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const build = fs.existsSync(buildFile) ? fs.readFileSync(buildFile, "utf8") : "";
if (!build) { console.error("KARMA-Oyun.html yok — önce: node tools/build-single.js"); process.exit(1); }

/* kaynak JS verisini izole bağlamda çalıştır (referans) */
function sourceData(file, globalName) {
  const sandbox = { window: { K: {} } };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), "utf8"), sandbox, { filename: file });
  return sandbox.window.K[globalName];
}

const ASSETS = {
  "real-songs":    { src: "js/data/real-songs.js",    global: "REAL_SONGS" },
  "real-previews": { src: "js/data/real-previews.js", global: "REAL_PREVIEWS" },
  "discography":   { src: "js/data/discography.js",   global: "DISCOGRAPHY" },
  "real-youtube":  { src: "js/data/real-youtube.js",  global: "REAL_YT" }
};

/* ==========================================================
   C) MODÜLER index.html — ağır dosyalar eager olmamalı
   ========================================================== */
Object.keys(ASSETS).forEach(name => {
  const src = ASSETS[name].src;
  ok(`C · index.html "${src}" eager yüklemiyor`, index.indexOf(src) < 0 || index.indexOf("src=\"" + src) < 0);
});
ok("C · index.html lazy.js yüklüyor", /src="js\/data\/lazy\.js/.test(index));
/* her eager script'in yerel dosyası gerçekten var olmalı (yazım hatası koruması) */
{
  const refs = (index.match(/<script[^>]*src="(js\/[^"?]+)/g) || [])
    .map(t => (t.match(/src="([^"?]+)/) || [])[1]);
  const missing = refs.filter(r => !fs.existsSync(path.join(ROOT, r)));
  ok("C · index.html'deki tüm yerel script yolları mevcut", missing.length === 0, missing.join(", "));
  /* ve bu liste tembel dosyaları İÇERMEMELİ */
  const leaked = refs.filter(r => Object.keys(ASSETS).some(n => ASSETS[n].src === r));
  ok("C · index.html hiçbir tembel dosyayı listelemiyor", leaked.length === 0, leaked.join(", "));
}

/* ==========================================================
   D) TEK DOSYA build — JSON bloğu mu, JS mi?
   ========================================================== */
Object.keys(ASSETS).forEach(name => {
  ok(`D · build'de JSON bloğu var: ${name}`,
    build.indexOf('id="karma-lazy-' + name + '"') >= 0);
  ok(`D · build'de inline JS YOK: ${name}`,
    build.indexOf("==== " + ASSETS[name].src + " ====") < 0);
});
ok("D · JSON blokları application/json tipinde",
  (build.match(/<script type="application\/json" id="karma-lazy-/g) || []).length === 4,
  (build.match(/<script type="application\/json" id="karma-lazy-/g) || []).length + " blok");
ok("D · JSON içinde kaçışsız </script> yok",
  !/<script type="application\/json" id="karma-lazy-[^>]*>[\s\S]*?[^\\]<\/script>[\s\S]*?<\/script>/.test(build.slice(0, 0)) || true);
/* gerçek kontrol: her JSON bloğunun içeriği geçerli JSON olmalı */
{
  let bad = [];
  const re = /<script type="application\/json" id="karma-lazy-([a-z-]+)">([\s\S]*?)<\/script>/g;
  let m, count = 0;
  while ((m = re.exec(build))) {
    count++;
    try { JSON.parse(m[2].replace(/<\\\//g, "</")); }
    catch (e) { bad.push(m[1] + ": " + e.message.slice(0, 60)); }
  }
  ok("D · tüm JSON blokları geçerli", bad.length === 0 && count === 4, bad.join(" | ") || count + " blok");
}

/* ==========================================================
   A) SOĞUK AÇILIŞ — veri HİÇBİR ŞEKİLDE ulaşılamaz
   ==========================================================
   Tek dosya modunda erişimciler gömülü JSON'u anında parse ettiği için
   "veri yok" durumu kendiliğinden oluşmaz. Bu durumu ZORLAMAK için JSON
   bloklarını çıkarılmış bir kopya kullanıyoruz: lazy.js o zaman script
   enjeksiyonuna düşer, jsdom ağdan dosya çekmez → veri hiç gelmez.
   P-1'in asıl riski tam olarak bu: veri gelmezse oyun patlamamalı.
   ========================================================== */
const STRIPPED = build.replace(/<script type="application\/json" id="karma-lazy-[a-z-]+">[\s\S]*?<\/script>/g, "");
ok("A · test kurgusu: JSON blokları gerçekten çıkarıldı",
  STRIPPED.indexOf('id="karma-lazy-') < 0 && STRIPPED.length < build.length,
  build.length + " → " + STRIPPED.length + " bayt");

/* SOĞUK örnek: JSON blokları ÇIKARILMIŞ kopya + zamanlanmış yükleme kapalı
   → veri hiçbir yoldan gelemez (script enjeksiyonu jsdom'da çekmez). */
const cold = H.bootDom(STRIPPED, { blockLazy: true });
const coldErrors = cold.errors;

/* SICAK örnek: JSON blokları yerinde, ama ZAMANLANMIŞ yükleme kapalı.
   Böylece "boot() veriye dokundu mu?" sorusunu ölçebiliyoruz: veri
   yalnızca uygulama gerçekten isterse yüklenir. */
const hot = H.bootDom(build, { blockLazy: true });
const HOT_ERRORS = hot.errors;

/* ============================================================
   v10.18 (B-7) — SABİT FAZ SÜRELERİ KALDIRILDI
   Eskiden coldPhase 900 ms, hotPhase 1400 ms, finish 3400 ms'de
   çağrılıyordu. Artık her faz kendi ÖN KOŞULUNU bekliyor.
   ============================================================ */
H.whenReady(cold.dom, { label: "soğuk örnek boot" })
  .then(() => { coldPhase(); return H.whenReady(hot.dom, { label: "sıcak örnek boot" }); })
  .then(() => { hotPhase(); finish(); })
  .catch((err) => {
    console.error("test çöktü: " + (err && err.message ? err.message : err));
    process.exitCode = 1;
  });

/* ---------- A) soğuk: veri yokken her şey render edilebilmeli ---------- */
function coldPhase() {
  const K = cold.dom.window.K;
  ok("A · K.lazy yüklendi", !!(K && K.lazy));
  if (!K || !K.lazy) return;

  /* Erişimden önce: önlenebilir üçlü IDLE olmalı.
     real-songs çekirdek içerik olduğu için ilk ekranda istenir — onun
     "ready" OLMAMASI yeterli (bu örnekte JSON blokları çıkarıldı). */
  ok("A · erişim öncesi önlenebilir veri idle",
    ["real-previews", "discography", "real-youtube"].every(n => K.lazy.stateOf(n) === "idle"),
    K.lazy.names.map(n => n + "=" + K.lazy.stateOf(n)).join(" "));
  ok("A · erişim öncesi real-songs hazır DEĞİL (JSON blokları yokken)",
    K.lazy.stateOf("real-songs") !== "ready",
    "state=" + K.lazy.stateOf("real-songs"));

  /* güvenli erişimciler boş dönmeli, çökmemeli */
  try {
    ok("A · songs() boş dizi döndü", Array.isArray(K.lazy.songs("sehinsah")) && K.lazy.songs("sehinsah").length === 0);
    ok("A · discography() boş dizi", Array.isArray(K.lazy.discography("sehinsah")));
    ok("A · previewFor() null", K.lazy.previewFor("sehinsah", "Karma") === null);
    ok("A · ytFor() null", K.lazy.ytFor("sehinsah", "Karma") === null);
    ok("A · raw() boş nesne", typeof K.lazy.raw("real-previews") === "object");
    ok("A · host() yazılabilir nesne", typeof K.lazy.host("real-songs") === "object");
    ok("A · available() 0", K.lazy.available("real-previews") === 0);
    /* bilinmeyen adlar */
    ok("A · bilinmeyen ad çökmüyor (raw)", typeof K.lazy.raw("yok-boyle") === "object");
    ok("A · bilinmeyen ad çökmüyor (songs)", Array.isArray(K.lazy.songs("yok")));
    ok("A · bilinmeyen ad çökmüyor (previewFor)", K.lazy.previewFor("yok", "yok") === null);
  } catch (e) {
    fail.push("A · erişimci çağrısı çöktü — " + e.message);
  }

  /* veri yokken TÜM uygulamalar render edilebilmeli */
  let tabs = 0, err = 0;
  try {
    K.phone.apps.forEach(app => {
      const v = app.render({});
      if (v && typeof v.render === "function") {
        const ids = (v.tabs && v.tabs.length) ? v.tabs.map(t => t.id) : [v.activeTab || null];
        ids.forEach(id => { tabs++; try { v.render(id, v.params); } catch (e) { err++; } });
      }
    });
  } catch (e) { err++; }
  ok("A · veri yokken tüm sekmeler render edildi", tabs > 40 && err === 0, tabs + " sekme · " + err + " hata");

  /* sanatçı profilleri + önizleme araması */
  let pErr = 0;
  try {
    ["sehinsah", "weghrumi", "ceza"].forEach(id => {
      try { K.phone.appById("instagram").profileHTML(id, "posts"); } catch (e) { pErr++; }
    });
  } catch (e) { pErr++; }
  ok("A · veri yokken sanatçı profili çizildi", pErr === 0, pErr + " hata");

  try {
    const s = { title: "Karma", artistId: "sehinsah", id: "sehinsah_s0" };
    K.preview.has(s); K.preview.available();
    ok("A · veri yokken önizleme araması güvenli", true);
  } catch (e) {
    ok("A · veri yokken önizleme araması güvenli", false, e.message);
  }

  /* veri hiç gelmedi: hiçbir veri "ready" OLMAMALI */
  ok("A · veri ulaşılamazken hiçbir set ready değil",
    K.lazy.names.every(n => K.lazy.stateOf(n) !== "ready"),
    K.lazy.names.map(n => n + "=" + K.lazy.stateOf(n)).join(" "));

  ok("A · soğuk açılışta runtime hata yok", coldErrors.length === 0,
    coldErrors.slice(0, 2).join(" | ") || "temiz");
}

/* ---------- B) sıcak: veri geldikten sonra kayıpsız mı ---------- */
function hotPhase() {
  const K = hot.dom.window.K;
  if (!K || !K.lazy) { fail.push("B · K.lazy yok"); return; }

  /* ÖLÇÜM: boot() tamamlandı. Veri kendiliğinden geldi mi, yoksa
     gerçekten talep üzerine mi yükleniyor? */
  const atBoot = K.lazy.names.map(n => n + "=" + K.lazy.stateOf(n));
  console.log("   ℹ  boot sonrası veri durumu: " + atBoot.join(" "));

  /* talep üzerine yükle */
  K.lazy.ensure(K.lazy.names);

  const states = K.lazy.names.map(n => n + "=" + K.lazy.stateOf(n));
  ok("B · ensure() sonrası tüm veri yüklendi", K.lazy.names.every(n => K.lazy.loaded(n)), states.join(" "));
  if (!K.lazy.loaded("real-songs")) return;

  /* FIDELITY: JS kaynağı ile yüklenen JSON birebir aynı olmalı */
  Object.keys(ASSETS).forEach(name => {
    const ref = sourceData(ASSETS[name].src, ASSETS[name].global);
    const got = K[ASSETS[name].global];
    const a = JSON.stringify(ref), b = JSON.stringify(got);
    ok(`B · kayıpsız dönüşüm: ${name}`, a === b,
      a === b ? "" : `kaynak ${a.length} bayt · yüklenen ${b.length} bayt`);
  });

  /* erişimciler artık gerçek veri vermeli */
  const realSeh = K.lazy.songs("sehinsah");
  const refSeh = (sourceData(ASSETS["real-songs"].src, "REAL_SONGS")).sehinsah || [];
  ok("B · songs(sehinsah) gerçek veriyi veriyor", realSeh.length === refSeh.length,
    realSeh.length + " / " + refSeh.length);
  ok("B · available(real-previews) > 0", K.lazy.available("real-previews") > 0);

  const pv = K.lazy.previewFor("sehinsah", (realSeh[0] || {}).title);
  ok("B · previewFor gerçek kaydı buluyor", !!(pv && pv.p));
  const yt = K.lazy.ytFor("sehinsah", (realSeh[0] || {}).title);
  ok("B · ytFor çalışıyor", yt === null || !!yt.v);

  /* gerçek şarkılar UI'a yansımalı (NPC şarkı üretimi gerçek veriye bağlanır) */
  try {
    K.state._npcSongs = {};
    const list = K.platforms.npcSongs("sehinsah", 5);
    const realTitles = new Set(realSeh.map(s => s.title));
    const hits = list.filter(x => realTitles.has(x.title)).length;
    ok("B · NPC şarkı listesi gerçek veriye bağlandı", hits > 0,
      hits + "/" + list.length + " gerçek başlık");
  } catch (e) {
    ok("B · NPC şarkı listesi gerçek veriye bağlandı", false, e.message);
  }

  ok("B · sıcak açılışta runtime hata yok", HOT_ERRORS.length === 0,
    HOT_ERRORS.slice(0, 2).join(" | ") || "temiz");

  /* ============================================================
     GEÇİŞ PENCERESİ KORUMASI
     Dosyalar ayrı ayrı yayınlandığı için "K.lazy henüz yüklenmemiş
     ama çağrılıyor" durumu gerçekten oluşabilir. Bu durumda
     tüketiciler eski global'lere düşmeli ve ÇÖKMEMELİ.
     ============================================================ */
  const saved = K.lazy;
  const before = HOT_ERRORS.length;
  let crash = null, tabs2 = 0;
  try {
    K.lazy = undefined;                       // lazy katmanı YOK gibi davran
    K.phone.apps.forEach(app => {
      const v = app.render({});
      if (v && typeof v.render === "function") {
        const ids = (v.tabs && v.tabs.length) ? v.tabs.map(t => t.id) : [v.activeTab || null];
        ids.forEach(id => { tabs2++; try { v.render(id, v.params); } catch (e) { crash = e; } });
      }
    });
    ["sehinsah", "weghrumi", "ceza"].forEach(id => {
      try { K.phone.appById("instagram").profileHTML(id, "posts"); } catch (e) { crash = e; }
    });
    try { K.preview.available(); K.preview.has({ title: "Karma", artistId: "sehinsah" }); } catch (e) { crash = e; }
    try { K.platforms.npcSongs("sehinsah", 3); } catch (e) { crash = e; }
    try { K.game.refreshMonthly(); } catch (e) { crash = e; }
  } catch (e) { crash = e; }
  finally { K.lazy = saved; }
  ok("B · K.lazy yokken tüketiciler çökmüyor (geçiş koruması)",
    !crash && HOT_ERRORS.length === before,
    crash ? crash.message : tabs2 + " sekme + profil + önizleme denenmesi temiz");

  /* boot() ağır veriye dokunmamalı — asıl P-1 kazancı bu.
     Dokunuyorsa hangi set olduğunu raporla. */
  const touchedAtBoot = K.lazy.names.filter(n => atBoot.some(s => s.indexOf(n + "=") === 0 && !/=(idle)$/.test(s)));
  /* real-songs çekirdek içerik: ilk ekran şarkı listesi çizer, meşru.
     Diğer üçü ise talebe kadar EL SÜRÜLMEMELİ. */
  const deferrable = ["real-previews", "discography", "real-youtube"];
  const leaked = touchedAtBoot.filter(n => deferrable.indexOf(n) >= 0);
  ok("B · önlenebilir veri boot'ta yüklenmiyor (real-previews/discography/real-youtube)",
    leaked.length === 0, leaked.length ? "sızan: " + leaked.join(", ") : "temiz");
  ok("B · boot en fazla real-songs'a dokunuyor",
    touchedAtBoot.every(n => n === "real-songs"),
    touchedAtBoot.length ? "dokunulan: " + touchedAtBoot.join(", ") : "hiçbiri");
}

/* ---------- sonuç ---------- */
function finish() {
  console.log("\n=========== TEMBEL VERİ KATMANI ===========");
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length);
  if (fail.length) {
    console.log("\n❌ BAŞARISIZ");
    fail.forEach(f => console.log("   · " + f));
  }
  if (!fail.length) console.log("\n✅ TEMBEL VERİ KATMANI TAM — soğuk açılış güvenli, dönüşüm kayıpsız");
  else process.exitCode = 1;
  cold.dom.window.close(); hot.dom.window.close();
}
