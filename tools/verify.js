#!/usr/bin/env node
/* ============================================================
   KARMA — tools/verify.js   (v10.18)

   TEK KOMUTTA TAM DOĞRULAMA.  `npm run verify`

   Sırayla şunları yapar ve herhangi biri başarısız olursa 1 döner:
     0) JSDOM SÜRÜMÜ       : uzun simülasyonlar için jsdom 30+ zorunlu
     1) ÖNBİLEK SÜRÜMÜ      : index.html içindeki ?v= içerik hash'iyle uyumlu mu?
     2) TEK DOSYA BUILD      : geçici dosyaya üretilir (çalışma ağacı bozulmaz)
     3) BUILD GÜNCEL Mİ      : üretilen build, depodaki KARMA-Oyun.html ile
                               bayt bayt aynı mı? (Build'i güncellemeyi unutmayı
                               yapısal olarak imkânsız kılar)
     4) TEST PAKETLERİ       : tooling · mobile · lazy · balance · personality · apps · social
                               · festivals · rollout · certs · label · previews · expansion
     5) DENGE SİMÜLASYONU    : YÜKSEK önem bulgusu var mı?
     6) RUNTIME SAĞLIĞI      : süitlerde beklenmedik çıktı var mı?

   Neden ayrı bir araç?
   --------------------
   Bu projede doğrulanmamış bir güncelleme dört kez canlıya çıktı (v10.14–v10.17
   arasında). Sorun güncelleme sayısı değil, DOĞRULANMAMIŞ güncellemeydi. Bu
   araç yerelde tek komuta, CI'da ise her push'ta aynı zinciri çalıştırır.
   ============================================================ */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const ROOT = path.resolve(__dirname, "..");
const node = process.execPath;

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail: detail || "" });
  const mark = ok ? "✅" : "❌";
  console.log(mark + " " + name + (detail ? "  — " + detail : ""));
}

function run(args, opts) {
  const o = opts || {};
  const r = spawnSync(node, args, {
    cwd: ROOT, encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: process.env
  });
  return {
    code: r.status == null ? 1 : r.status,
    out: (r.stdout || "") + (r.stderr || "")
  };
}

console.log("============================================");
/* NOT: başlıkta adım SAYISI yazılmaz. Eskiden "11 adım" yazıyordu ama
   gerçek sayı 13'tü, sonra 15 oldu — sabit sayı her eklemede sürükleniyor.
   Sayı zaten altta "SONUÇ: n/m" satırında doğru biçimde görünür. */
console.log("KARMA · TAM DOĞRULAMA");
console.log("============================================\n");

/* ---------- 0) jsdom sürüm kapısı ----------
   Uzun simülasyon süitleri (kariyer eğrisi ~1100 oyun günü) jsdom 24 ve
   öncesinde heap'i tüketiyordu: "FATAL ERROR: Reached heap limit".
   Bu, CI'da yaşandı; tek nedeni sürümdü. Erken ve anlaşılır hata ver. */
{
  let ver = null;
  try { ver = require("./harness.js").jsdomVersion(); } catch (e) {}
  const min = 30;
  const major = ver ? parseInt(String(ver).split(".")[0], 10) : 0;
  if (!ver) {
    record("jsdom sürümü", false, "jsdom bulunamadı — `npm install` çalıştırın");
  } else {
    record("jsdom sürümü >= " + min, major >= min,
      "kurulu: " + ver + (major < min
        ? " — YÜKSELTİN: `npm install jsdom@^30` (eski sürümler uzun testlerde OOM veriyor)"
        : ""));
  }
}

/* ---------- 1) önbellek sürümü ---------- */
{
  const r = run(["tools/bump-cache.js", "--check"]);
  const line = r.out.trim().split("\n").filter(Boolean).pop() || "";
  record("Önbellek sürümü güncel", r.code === 0, line.replace(/^[✅❌]\s*/, ""));
  if (r.code !== 0) {
    console.log("   ⚠️  Düzeltme: node tools/bump-cache.js\n");
  }
}

/* ---------- 2) build (geçici dosyaya) ---------- */
const tmpOut = path.join(os.tmpdir ? os.tmpdir() : "/tmp", "karma-verify-" + process.pid + ".html");
let built = false;
{
  const r = run(["tools/build-single.js", tmpOut]);
  built = r.code === 0 && fs.existsSync(tmpOut);
  const size = built ? (fs.statSync(tmpOut).size / 1024).toFixed(1) + " KB" : "";
  record("Tek dosya build üretildi", built, size);
  if (!built) console.log(r.out.trim().split("\n").slice(-6).join("\n"));
}

/* ---------- 3) build güncel mi ---------- */
{
  const committed = path.join(ROOT, "KARMA-Oyun.html");
  if (!built) {
    record("Build güncel (bayt bayt aynı)", false, "build üretilemedi");
  } else if (!fs.existsSync(committed)) {
    record("Build güncel (bayt bayt aynı)", false, "KARMA-Oyun.html yok");
  } else {
    const a = fs.readFileSync(tmpOut);
    const b = fs.readFileSync(committed);
    const same = a.length === b.length && a.equals(b);
    record("Build güncel (bayt bayt aynı)", same,
      same ? (a.length / 1024).toFixed(1) + " KB"
           : "DEPODAKİ BUILD BAYAT — `node tools/build-single.js` çalıştırın");
  }
  try { fs.unlinkSync(tmpOut); } catch (e) {}
}

/* ---------- 4) test paketleri ---------- */
const SUITES = [
  /* altyapı en önce: CI/sürüm/motor-veri ayrımı bozuksa diğer adımların
     sonucu da anlamsızlaşır (hızlıdır, ~50 ms) */
  { id: "tooling",     script: "tools/smoke-tooling.js",     label: "Geliştirme altyapısı" },
  { id: "mobile",      script: "tools/smoke-mobile.js",      label: "Mobil katman" },
  { id: "lazy",        script: "tools/smoke-lazy.js",        label: "Tembel veri katmanı" },
  { id: "balance",     script: "tools/smoke-balance.js",     label: "Kariyer eğrisi" },
  { id: "personality", script: "tools/smoke-personality.js", label: "Kişilik katmanı" },
  { id: "apps",        script: "tools/smoke-apps.js",        label: "Uygulamalar" },
  { id: "social",      script: "tools/smoke-social.js",      label: "Sosyal medya + diskografi" },
  { id: "festivals",   script: "tools/smoke-festivals.js",   label: "Festival devresi" },
  { id: "rollout",     script: "tools/smoke-rollout.js",     label: "Çıkış haftası" },
  { id: "certs",       script: "tools/smoke-certifications.js", label: "Plak + Wrapped" },
  { id: "label",       script: "tools/smoke-label.js",       label: "Şirket ekonomisi" },
  { id: "previews",    script: "tools/smoke-previews.js",    label: "Önizleme + YouTube verisi" },
  { id: "expansion",   script: "tools/smoke-expansion.js",   label: "Genişleme paketi (6 sistem)" },
  { id: "v1030",       script: "tools/smoke-v1030.js",       label: "v10.30 güncelleme (aramalar · gönderi türü · teklif · DM)" },
  { id: "v1031",       script: "tools/smoke-v1031.js",       label: "v10.31 çoklu erişim temizliği (ölü kod · röportaj · analiz)" },
  /* güncelleme akışı: "güncelle dedim, güncellenmedi" sınıfını kilitler.
     Sürüm/damga/worker üçlüsü tutarsızsa yayın burada durur. */
  { id: "updater",     script: "tools/smoke-updater.js",     label: "Güncelleme akışı (sürüm · damga · worker)" },
  /* katalog sönümü: "yayın yapmazsan kitle erir" halkasını ve cezanın
     oyuncuya GÖRÜNÜR olmasını kilitler. */
  { id: "silence",     script: "tools/smoke-silence.js",     label: "Katalog sönümü (unutulma · uyarı)" },
  /* gerçek uygulama düzeni (2. dalga) + pil kaldırma: beş uygulamanın
     alt sekmesi SVG kalmalı, pil mekaniği geri gelmemeli. */
  { id: "v1037",       script: "tools/smoke-v1037.js",       label: "v10.37 gerçek uygulama düzeni + pil kaldırma" },
  /* kapak sistemi: yazı taşması, görünmez desen/şekil ve "Rastgele
     Kapak" ayarları silme hatalarının kalıcı kilidi. */
  { id: "cover",       script: "tools/smoke-cover.js",       label: "v10.38 kapak üreticisi + düzenleyici" },
  { id: "v1039",       script: "tools/smoke-v1039.js",       label: "v10.39 parça adımı + parça başına sözler" },
  /* gerçek dağıtım formu: parça seviyesi (sıra/feat/explicit/ISRC/sample),
     metadata (kredi/split/bölge/dil/etiket/barkod) ve teknik gereksinimler
     (kapak px, format reddi, çuma çıkışı, Content ID, takedown). */
  { id: "v1040",       script: "tools/smoke-v1040.js",       label: "v10.40 dağıtım formu (parça · metadata · teknik)" },
  /* şarkı biçimi: parça başına sıralı bölüm dizisi (verse2/verse3,
     chorusLast), 8 hazır biçim, süre + biçim puanı yapıdan türer. */
  { id: "v1041",       script: "tools/smoke-v1041.js",       label: "v10.41 şarkı biçimi (yuva · şablon · süre · puan)" },
  /* distribütör & sözleşme: kim dağıtıyor (ücret/kesinti/teslim/mağaza),
     master sahipliği, teliften kesinti, şirket sözleşmesi + imza. */
  { id: "v1042",       script: "tools/smoke-v1042.js",       label: "v10.42 distribütör & sözleşme (ücret · kesinti · teslim)" },
  /* yan işler: başvuru akışı, günlük vardiya bütçesi, yorgunluk yönetimi
     ve gelir dengesi. Yan iş "tek tık" olmaktan çıkıp işe girme sürecine bağlandı. */
  { id: "v1043",       script: "tools/smoke-v1043.js",       label: "v10.43 yan işler (başvuru · vardiya · yorgunluk)" },
  /* prodüksiyon süreci: kayıt oturumu, mix-master ve revizyon kararları
     kaliteyi/maliyeti/gecikmeyi belirler; revizyon azalan verimle çalışır. */
  { id: "v1044",       script: "tools/smoke-v1044.js",       label: "v10.44 prodüksiyon süreci (kayıt · mix · revizyon)" },
  /* yayın sonrası kariyer: radyo kampanyası, remix yayını ve klip;
     şarkı yayınlandıktan sonra da kariyer devam eder. */
  { id: "v1045",       script: "tools/smoke-v1045.js",       label: "v10.45 yayın sonrası kariyer (radyo · remix · klip)" }
];

const suiteOut = {};
for (const s of SUITES) {
  const r = run([s.script]);
  suiteOut[s.id] = r.out;
  /* "Geçen: 41 · Kalan: 0" veya "Hata sayısı: 0" satırını özetle */
  const m = r.out.match(/Geçen:\s*(\d+)\s*·\s*Kalan:\s*(\d+)/);
  const m2 = r.out.match(/Hata sayısı:\s*(\d+)/);
  let detail = "";
  if (m) detail = m[1] + " geçti" + (m[2] !== "0" ? " · " + m[2] + " KALDI" : "");
  else if (m2) detail = "0 hata" + "";
  else detail = "özet okunamadı";
  if (r.code !== 0 && !detail.includes("KALDI")) detail += " (çıkış kodu " + r.code + ")";
  record(s.label, r.code === 0, detail);
}

/* ---------- 5) denge simülasyonu ---------- */
{
  const r = run(["tools/sim-balance.js"]);
  const high = (r.out.match(/🔴/g) || []).length;
  const med = (r.out.match(/🟠/g) || []).length;
  record("Denge simülasyonu (YÜKSEK bulgu yok)", r.code === 0 && high === 0,
    high + " yüksek · " + med + " orta");
}

/* ---------- 6) güncelleme noktası: version.json ---------- */
{
  const vjPath = path.join(ROOT, "version.json");
  let vj = null, err = null;
  try { vj = JSON.parse(fs.readFileSync(vjPath, "utf8")); } catch (e) { err = e; }
  if (!vj) {
    record("Güncelleme noktası (version.json)", false,
      err ? "okunamadı — node tools/gen-version-json.js" : "yok — node tools/gen-version-json.js");
  } else {
    const pkgVer = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version;
    const { computeVersion } = require("./cache-version.js");
    const cache = computeVersion(ROOT).version;
    const okV = vj.version === pkgVer;
    const okC = !vj.cache || vj.cache === cache;
    record("Güncelleme noktası (version.json)", okV && okC,
      okV && okC ? "sürüm " + vj.version + " · önbellek " + (vj.cache || "?") :
        "uyumsuz (sürüm " + vj.version + "≠" + pkgVer + (okC ? "" : ", önbellek " + vj.cache + "≠" + cache) + ") — node tools/gen-version-json.js");
  }
}

/* ---------- 7) runtime sağlığı ---------- */
{
  /* süitlerin hiçbirinde "test çöktü" veya yakalanmamış hata olmamalı */
  const bad = Object.keys(suiteOut).filter((k) => /test çöktü|ReferenceError|TypeError:/.test(suiteOut[k]));
  record("Süitlerde yakalanmamış hata yok", bad.length === 0,
    bad.length ? bad.join(", ") : "temiz");
}

/* ---------- özet ---------- */
const failed = results.filter((r) => !r.ok);
console.log("\n============================================");
console.log("SONUÇ: " + (results.length - failed.length) + "/" + results.length + " adım geçti");
if (failed.length) {
  console.log("BAŞARISIZ ADIMLAR:");
  failed.forEach((f) => console.log("   · " + f.name + (f.detail ? " — " + f.detail : "")));
  console.log("============================================");
  process.exit(1);
}
console.log("✅ HER ŞEY TEMİZ — yayına hazır");
console.log("============================================");
