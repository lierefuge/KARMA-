/* Kullanım: node tools/smoke-updater.js
   KARMA — GÜNCELLEME AKIŞI testi (v10.33)

   Neden bu süit var?
   ------------------
   2026-10-01'de canlıda şu oldu: oyuncuya "Yeni sürüm hazır" şeridi
   çıktı, Güncelle'ye bastı ve HİÇBİR ŞEY değişmedi. Şerit her açılışta
   geri geldi. Üç ayrı hata üst üste binmişti:

     1. version.json (10.33.0) ile çalışan kod (10.31.0) uyuşmuyordu.
        Yani "yeni sürüm" hiç var olmayan bir sürümdü; düğme onu asla
        tatmin edemezdi → sonsuz döngü.
     2. index.html'deki ?v= damgası bayattı (78d3c1e8) ama içerik
        değişmişti (5b103d3b). Worker ?v= URL'lerini DEĞİŞMEZ sayıp
        cache-first karşıladığı için oyuncu eski JS/CSS'i sonsuza kadar
        çalıştırıyordu.
     3. Worker önbellek adı insan sürümünden ("karma-10.31.0") türüyordu.
        Sürüm artmadığı için activate eski önbelleği SİLMİYORDU.

   Bu süit üçünü de yapısal olarak imkânsız kılar ve updater.apply()'ın
   "hiçbir şey yapmayan reload" ile bitmediğini doğrular.

   Neleri doğrular:
   U-1  version.json sürümü === package.json === js/version.js (K.VERSION)
   U-2  version.json önbelleği === gerçek içerik hash'i
   U-3  index.html ?v= damgası === gerçek içerik hash'i (bayat damga yok)
   U-4  sw.js CACHE_KEY === gerçek içerik hash'i
   U-5  sw.js önbellek adı insan sürümüne DEĞİL içerik hash'ine bağlı
   U-6  sw.js kendini onaran damga kontrolü içeriyor
   U-7  updater.js sert sıfırlama (worker + önbellek) yolu sunuyor
   U-8  updater.apply() bekleyen worker yokken SADE reload ile bitmiyor
   U-9  sonsuz döngü koruması var (deneme kaydı + "uygulanamadı" şeridi)
   U-10 build (KARMA-Oyun.html) güncelleme katmanını gömüyor
*/
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const { readStampedVersion, computeVersion } = require("./cache-version.js");

const pass = [], fail = [];
const ok = (name, cond, extra) => (cond ? pass : fail).push(name + (extra ? " — " + extra : ""));

function read(rel) {
  const p = path.join(ROOT, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

const index = read("index.html");
const sw = read("sw.js");
const updater = read("js/systems/updater.js");
const build = read("KARMA-Oyun.html");

const cacheHash = computeVersion(ROOT).version;
const pkgVer = JSON.parse(read("package.json") || "{}").version;
const verMatch = read("js/version.js").match(/K\.VERSION\s*=\s*"([^"]*)"/);
const runningVer = verMatch ? verMatch[1] : null;

let vj = {};
try { vj = JSON.parse(read("version.json") || "{}"); } catch (e) { vj = {}; }

/* ---------- 0) dosyalar var mı ---------- */
ok("sw.js mevcut", sw.length > 0);
ok("js/systems/updater.js mevcut", updater.length > 0);
ok("version.json okunabilir", !!vj.version);
if (!sw.length || !updater.length) report();

/* ---------- U-1) sürüm üçlüsü aynı mı ---------- */
ok("U-1 version.json sürümü çalışan kodla aynı",
  !!vj.version && vj.version === runningVer && vj.version === pkgVer,
  "version.json " + (vj.version || "?") + " · js/version.js " + (runningVer || "?") +
  " · package.json " + (pkgVer || "?"));

/* ---------- U-2) version.json önbelleği içerik hash'i mi ---------- */
ok("U-2 version.json önbelleği güncel içerik hash'i",
  vj.cache === cacheHash,
  "version.json " + (vj.cache || "?") + " · içerik " + cacheHash);

/* ---------- U-3) index.html damgası bayat değil ---------- */
const stamp = readStampedVersion(index);
ok("U-3 index.html ?v= damgası güncel",
  stamp === cacheHash,
  "index " + (stamp || "?") + " · içerik " + cacheHash);

/* ---------- U-4) sw.js CACHE_KEY içerik hash'i mi ---------- */
const ckMatch = sw.match(/const CACHE_KEY\s*=\s*"([^"]*)"/);
const cacheKey = ckMatch ? ckMatch[1] : null;
ok("U-4 sw.js CACHE_KEY içerik hash'i ile damgalı",
  cacheKey === cacheHash,
  "sw " + (cacheKey || "?") + " · içerik " + cacheHash);

/* ---------- U-5) önbellek adı insan sürümüne bağlı DEĞİL ---------- */
const cacheLine = (sw.match(/const CACHE\s*=\s*[^;]+;/) || [""])[0];
ok("U-5 önbellek adı insan sürümünden türetilmiyor",
  /CACHE_KEY/.test(cacheLine) && !/CACHE\s*=\s*"karma-"\s*\+\s*VERSION/.test(sw),
  cacheLine.trim() || "const CACHE satırı bulunamadı");

/* ---------- U-6) kendini onaran damga kontrolü ---------- */
ok("U-6 sw.js kendini onaran damga kontrolü içeriyor",
  /stampOf/.test(sw) && /purgeAll/.test(sw) && /CACHE_KEY/.test(sw));

/* ---------- U-7) sert sıfırlama yolu var mı ---------- */
ok("U-7a updater.js worker'ı kayıttan düşürüyor",
  /_unregister/.test(updater) && /unregister\(\)/.test(updater));
ok("U-7b updater.js önbellekleri siliyor",
  /_resetCaches/.test(updater) && /caches\.delete/.test(updater));
ok("U-7c updater.js sert sıfırlamayı dışa açıyor",
  /_hardReset/.test(updater) && /_hardReload/.test(updater));

/* ---------- U-8) apply() sade reload ile bitmiyor ----------
   Kural: apply() gövdesinde, worker yoksa/sonuç gelmezse
   _hardReset() çağrılmalı. Yalnızca doReload() ile biten bir yol
   "güncelledim ama değişmedi" hatasının ta kendisidir. */
const applyBody = (updater.match(/apply\(\)\s*\{([\s\S]*?)\n    \},/) || [])[1] || "";
ok("U-8a apply() gövdesi bulundu", applyBody.length > 0);
ok("U-8b apply() sert sıfırlama çağırıyor",
  /_hardReset\(\)/.test(applyBody));
ok("U-8c apply() güncellemeyi arayıp sonucu bekliyor",
  /registration\.update\(\)/.test(applyBody) && /registration\.waiting/.test(applyBody));

/* ---------- U-9) sonsuz döngü koruması ---------- */
ok("U-9a updater.js deneme kaydı tutuyor",
  /rememberAttempt/.test(updater) && /sessionStorage/.test(updater));
ok("U-9b updater.js 'uygulanamadı' şeridi gösteriyor",
  /showStuckBanner/.test(updater) && /kub-warn/.test(updater));
ok("U-9c şerit döngüye girmiyor (denendi ise stuck şerit)",
  /attemptedRecently\(\)\)\s*showStuckBanner/.test(updater.replace(/\s+/g, " ")));

/* ---------- U-10) build güncelleme katmanını gömüyor ---------- */
if (build.length) {
  ok("U-10 build güncelleme katmanını gömüyor",
    /karma-update-banner/.test(build) && /_hardReset/.test(build));
} else {
  ok("U-10 build güncelleme katmanını gömüyor", false, "KARMA-Oyun.html yok");
}

report();

function report() {
  console.log("============ GÜNCELLEME AKIŞI SONUCU ============");
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length);
  if (fail.length) {
    console.log("\n❌ BAŞARISIZ");
    fail.forEach((f) => console.log("   · " + f));
    process.exit(1);
  }
  console.log("\n✅ GÜNCELLEME AKIŞI SAĞLAM");
  process.exit(0);
}
