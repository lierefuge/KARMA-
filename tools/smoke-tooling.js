/* Kullanım: node tools/smoke-tooling.js
   KARMA — GELİŞTİRME ALTYAPISI testi (v10.18)

   Neleri doğrular:
     A) package.json: script'ler var olan dosyalara mı işaret ediyor,
        jsdom bağımlılığı tanımlı mı, sürüm js/version.js ile aynı mı?
     B) CI iş akışı: geçerli YAML mı, `npm run verify` çağırıyor mu?
     C) B-7 İNVARYANTI: hiçbir test aracı sabit boot beklemesi
        (setTimeout(run, …)) kullanmamalı — hazır olma sinyali kullanmalı.
     D) B-5 İNVARYANTI: motor (systems/chat.js) veri içermemeli,
        veri (data/chat-profiles.js) motordan önce yüklenmeli.
     E) Sürüm tutarlılığı: package.json ↔ js/version.js ↔ index.html
     F) Yerel önizleme sunucusu ve harness mevcut mu?
     G) verify.js "build güncel mi" kontrolünü gerçekten yapıyor mu?
   jsdom gerektirmez (hızlı, ~50 ms).
*/
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));
/* yorumları çıkar — düzeltme açıklamalarındaki örnek kod gerçek sanılmasın */
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const pass = [], fail = [];
const ok = (name, cond, extra) => (cond ? pass : fail).push(name + (extra ? " — " + extra : ""));

/* ============================================================
   A) package.json
   ============================================================ */
let pkg = null;
try { pkg = JSON.parse(read("package.json")); } catch (e) { pkg = null; }
ok("A · package.json geçerli JSON", !!pkg);
if (pkg) {
  ok("A · jsdom devDependency tanımlı", !!(pkg.devDependencies && pkg.devDependencies.jsdom),
    pkg.devDependencies ? Object.keys(pkg.devDependencies).join(",") : "yok");
  const want = ["verify", "test", "build", "release", "serve"];
  ok("A · beklenen script'ler var", want.every((k) => pkg.scripts && pkg.scripts[k]),
    Object.keys(pkg.scripts || {}).join(", "));
  /* her script'in işaret ettiği dosya gerçekten var olmalı */
  const missing = [];
  Object.keys(pkg.scripts || {}).forEach((k) => {
    const m = String(pkg.scripts[k]).match(/node\s+(\S+\.js)/);
    if (m && !exists(m[1])) missing.push(k + " → " + m[1]);
  });
  ok("A · tüm script hedefleri mevcut", missing.length === 0, missing.join(", ") || "temiz");
}

/* ============================================================
   B) CI iş akışı
   ============================================================ */
const CI = ".github/workflows/tests.yml";
ok("B · CI iş akışı mevcut", exists(CI));
if (exists(CI)) {
  const y = read(CI);
  ok("B · CI `npm run verify` çağırıyor", /npm run verify/.test(y));
  ok("B · CI push ve pull_request'te tetikleniyor",
    /push:/.test(y) && /pull_request:/.test(y));
  ok("B · CI jsdom kuruyor", /npm install/.test(y));
  ok("B · CI zaman aşımı tanımlı", /timeout-minutes:/.test(y));
  /* YAML'i gerçekten ayrıştır — `run:` satırındaki ": " nested mapping
     sanılabilir; bu hata bizzat yaşandı ve blok skalar ile çözüldü. */
  let parsed = null, err = null;
  for (const p of ["/home/user/node_modules/yaml", "yaml"]) {
    try { const YAML = require(p); parsed = YAML.parse(y); break; } catch (e) { err = e; }
  }
  if (parsed) {
    ok("B · CI YAML geçerli", true);
    const jobs = Object.keys(parsed.jobs || {});
    ok("B · CI'da verify işi tanımlı", jobs.indexOf("verify") >= 0, jobs.join(","));
    const steps = ((parsed.jobs || {}).verify || {}).steps || [];
    ok("B · CI adımları eksiksiz (≥5)", steps.length >= 5, steps.length + " adım");
    /* her adımın ya name ya uses/run alanı olmalı */
    const badStep = steps.findIndex((s) => !s || (!s.name && !s.uses && !s.run));
    ok("B · tüm CI adımları geçerli", badStep < 0, badStep < 0 ? "" : "adım #" + (badStep + 1));
  } else {
    /* yaml paketi yoksa yapısal yedek kontrol */
    ok("B · CI YAML yapısı (yedek kontrol)",
      /jobs:/.test(y) && /steps:/.test(y) && /runs-on:/.test(y),
      "yaml paketi yok: " + (err && err.code));
  }
}

/* ============================================================
   C) B-7 İNVARYANTI — sabit boot beklemesi yasak
   ============================================================ */
{
  const suites = fs.readdirSync(path.join(ROOT, "tools"))
    .filter((f) => /^smoke-.*\.js$/.test(f));
  ok("C · test süitleri bulundu", suites.length >= 6, suites.length + " süit");
  const offenders = [];
  suites.forEach((f) => {
    const src = stripComments(read("tools/" + f));
    if (/setTimeout\(\s*run\s*,/.test(src)) offenders.push(f);
    if (/setTimeout\(\s*(cold|hot)Phase\s*,/.test(src)) offenders.push(f);
  });
  ok("C · hiçbir süit sabit boot beklemesi kullanmıyor", offenders.length === 0,
    offenders.join(", ") || "temiz");
  /* harness gerçekten koşul tabanlı mı */
  const h = stripComments(read("tools/harness.js"));
  ok("C · harness hazır olma sinyali sunuyor", /function whenReady/.test(h));
  ok("C · harness ek koşul (ready) destekliyor", /o\.ready/.test(h));
  ok("C · harness sabit süre ile boot etmiyor",
    !/setTimeout\(\s*resolve/.test(h));
}

/* ============================================================
   D) B-5 İNVARYANTI — motor ve veri ayrı
   ============================================================ */
{
  const chat = stripComments(read("js/systems/chat.js"));
  const prof = exists("js/data/chat-profiles.js") ? read("js/data/chat-profiles.js") : "";
  ok("D · chat-profiles.js mevcut", prof.length > 0);
  ok("D · motor profilleri DIŞARIDAN okuyor", /K\.CHAT_PROFILES/.test(chat));
  ok("D · motor artık profil VERİSİ içermiyor",
    !/\bpool:\s*\{/.test(chat), "chat.js içinde `pool: {` bulundu");
  ok("D · veri dosyası profilleri kuruyor", /K\.CHAT_PROFILES\s*=\s*\{/.test(prof));
  ok("D · veri dosyası sanatçı profillerini taşıyor",
    /sehinsah\s*:/.test(prof) && /weghrumi\s*:/.test(prof) && /lierefuge\s*:/.test(prof));

  /* boyut ayrımı: motor veriden büyük kalmamalı */
  const cs = fs.statSync(path.join(ROOT, "js/systems/chat.js")).size;
  const ps = fs.statSync(path.join(ROOT, "js/data/chat-profiles.js")).size;
  ok("D · chat.js artık 60 KB altında", cs < 60 * 1024, (cs / 1024).toFixed(1) + " KB");
  ok("D · profil verisi ayrı dosyada (≥30 KB)", ps >= 30 * 1024, (ps / 1024).toFixed(1) + " KB");

  /* yükleme SIRASI: veri motordan önce olmalı */
  const idx = read("index.html");
  const pi = idx.indexOf("js/data/chat-profiles.js");
  const ci = idx.indexOf("js/systems/chat.js");
  ok("D · index.html: profil verisi motordan ÖNCE yükleniyor",
    pi >= 0 && ci >= 0 && pi < ci, "profiles@" + pi + " · chat@" + ci);
}

/* ============================================================
   E) Sürüm tutarlılığı
   ============================================================ */
{
  ok("E · js/version.js mevcut", exists("js/version.js"));
  const v = read("js/version.js");
  const mv = v.match(/K\.VERSION\s*=\s*"([^"]+)"/);
  ok("E · K.VERSION tanımlı", !!mv, mv ? mv[1] : "yok");
  if (pkg && mv) {
    ok("E · package.json ↔ js/version.js sürümü aynı", pkg.version === mv[1],
      pkg.version + " vs " + mv[1]);
  }
  ok("E · index.html version.js'i yüklüyor", /js\/version\.js/.test(read("index.html")));
  const st = read("js/systems/settings.js");
  ok("E · sürüm arayüzde gösteriliyor", /K\.VERSION/.test(st));
}

/* ============================================================
   F) Araçlar mevcut ve doğru işi yapıyor
   ============================================================ */
{
  ["tools/harness.js", "tools/verify.js", "tools/release.js", "tools/serve.js",
   "tools/bump-cache.js", "tools/cache-version.js", "tools/build-single.js"]
    .forEach((f) => ok("F · " + f + " mevcut", exists(f)));

  const rel = stripComments(read("tools/release.js"));
  ok("F · release.js sürümü yükseltebiliyor", /patch|minor|major/.test(rel));
  ok("F · release.js hem package.json hem version.js yazıyor",
    /package\.json/.test(rel) && /version\.js/.test(rel));

  const srv = stripComments(read("tools/serve.js"));
  ok("F · serve.js HTTP sunucusu kuruyor", /createServer/.test(srv));
  ok("F · serve.js dizin kaçışını engelliyor", /startsWith\(ROOT\)/.test(srv));
}

/* ============================================================
   G) verify.js — "build güncel mi" kontrolü gerçekten var mı
   ============================================================ */
{
  const v = stripComments(read("tools/verify.js"));
  ok("G · verify.js önbellek denetimi yapıyor", /bump-cache\.js/.test(v));
  ok("G · verify.js tüm süitleri çalıştırıyor",
    ["smoke-mobile", "smoke-lazy", "smoke-balance", "smoke-personality", "smoke-apps", "smoke-social"]
      .every((s) => v.indexOf(s + ".js") >= 0));
  ok("G · verify.js build'i geçici dosyaya üretiyor",
    /build-single\.js", tmpOut|build-single\.js.*tmpOut/.test(v) || /tmpOut/.test(v));
  ok("G · verify.js depodaki build ile BAYT karşılaştırıyor",
    /\.equals\(/.test(v));
  ok("G · verify.js denge simülasyonunu çalıştırıyor", /sim-balance\.js/.test(v));
  ok("G · verify.js başarısızlıkta 1 dönüyor", /process\.exit\(1\)/.test(v));
}

/* ============================================================
   H) .gitignore doğru: node_modules yok sayılı, build tutuluyor
   ============================================================ */
{
  const g = read(".gitignore");
  ok("H · .gitignore node_modules'ü yok sayıyor", /node_modules\//.test(g));
  ok("H · .gitignore KARMA-Oyun.html'i YOK SAYMIYOR",
    !/^\s*KARMA-Oyun\.html\s*$/m.test(g));
}

/* ---------- rapor ---------- */
console.log("\n=========== GELİŞTİRME ALTYAPISI ===========");
console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
console.log("Geçen: " + pass.length + " · Kalan: " + fail.length);
if (fail.length) {
  console.log("\n❌ BAŞARISIZ");
  fail.forEach((f) => console.log("   · " + f));
  process.exitCode = 1;
} else {
  console.log("\n✅ ALTYAPI TAM — CI, doğrulama, sürüm ve motor/veri ayrımı yerinde");
}
