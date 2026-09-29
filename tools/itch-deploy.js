#!/usr/bin/env node
/* ============================================================
   KARMA — tools/itch-deploy.js  (v10.19)
   itch.io DAĞITIMI (butler)

   Neden itch.io?
   --------------
   HTML5 oyunlar için en doğal dağıtım kanalı: oyuncular tarayıcıda
   tek tıkla oynar, itch istemcisinden güncelleme alır ve sayfa
   görünürlük kazandırır. KARMA zaten statik bir site olduğu için
   ek iş gerekmez.

   Tek seferlik kurulum (hesap tarafı):
     1. itch.io → Settings → API keys → yeni anahtar oluştur
     2. Proje: Tools → Butler → ikili dosyayı indir (`butler`)
     3. Ortam değişkeni: BUTLER_API_KEY=<anahtar>
     4. Oyun adı: ITCH_TARGET="<kullanıcı>/<oyun>:html5"

   Kullanım:
     node tools/itch-deploy.js              # paketle + (butler varsa) gönder
     node tools/itch-deploy.js --dry        # yalnızca paketle
     node tools/itch-deploy.js --version 10.20.0

   GÜVENLİK: anahtar ASLA koda yazılmaz; yalnızca ortam değişkeninden
   okunur (CI'da depo secret'ı olarak tanımlanır).
   ============================================================ */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const argv = process.argv.slice(2);
const DRY = argv.includes("--dry");
const vIdx = argv.indexOf("--version");
const VERSION = vIdx >= 0 ? argv[vIdx + 1] : JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version;

/* itch.io HTML5 paketinde index.html kökte OLMALIDIR.
   tools/, docs/, .git/, node_modules/ pakete girmez. */
const INCLUDE = ["index.html", "KARMA-Oyun.html", "version.json", "sw.js", ".nojekyll", "css", "js"];
const EXCLUDE_ARGS = ["-x", "*.DS_Store", "-x", "*/node_modules/*"];

function zipName() {
  return `karma-web-v${VERSION}.zip`;
}

function makeZip() {
  const outDir = process.env.KARMA_DIST || path.join(os.tmpdir(), "karma-dist");
  fs.mkdirSync(outDir, { recursive: true });
  const zipPath = path.join(outDir, zipName());
  const present = INCLUDE.filter((f) => fs.existsSync(path.join(ROOT, f)));
  const missing = INCLUDE.filter((f) => !fs.existsSync(path.join(ROOT, f)));
  if (missing.length) console.warn("   (atlanan, depoda yok: " + missing.join(", ") + ")");

  const r = spawnSync("zip", ["-r", "-q", zipPath, ...present, ...EXCLUDE_ARGS], { cwd: ROOT, encoding: "utf8" });
  if (r.error && r.error.code === "ENOENT") {
    console.error("❌ `zip` komutu bulunamadı. Kur: apt-get install zip  (veya CI'da zip adımı ekleyin)");
    process.exit(1);
  }
  if (r.status !== 0) {
    console.error("❌ Paketleme başarısız:\n" + (r.stderr || ""));
    process.exit(1);
  }
  return zipPath;
}

console.log("KARMA · ITCH.IO DAĞITIMI");
console.log("sürüm: " + VERSION + (DRY ? " (yalnızca paket)" : "") + "\n");

/* Tek dosya build ve version.json taze olsun */
if (!fs.existsSync(path.join(ROOT, "KARMA-Oyun.html"))) {
  console.warn("⚠  KARMA-Oyun.html yok — önce: node tools/build-single.js");
}
if (!fs.existsSync(path.join(ROOT, "version.json"))) {
  console.warn("⚠  version.json yok — önce: node tools/gen-version-json.js");
}

const zipPath = makeZip();
const size = (fs.statSync(zipPath).size / 1024 / 1024).toFixed(1);
console.log("✅ Paket hazır: " + zipPath + " (" + size + " MB)");

if (DRY) {
  console.log("\nℹ  --dry verildi; itch.io'ya gönderilmedi.");
  process.exit(0);
}

const KEY = process.env.BUTLER_API_KEY;
const TARGET = process.env.ITCH_TARGET;
if (!KEY || !TARGET) {
  console.log("\nℹ  itch.io gönderimi ATLANDI — eksik ortam değişkeni:");
  if (!KEY) console.log("     · BUTLER_API_KEY  (itch.io → Settings → API keys)");
  if (!TARGET) console.log("     · ITCH_TARGET     (örn. kullanici/karma:html5)");
  console.log("\n   Elle gönderim:");
  console.log("     butler push \"" + zipPath + "\" <kullanıcı>/<oyun>:html5");
  console.log("   CI'da: depo Secrets'a BUTLER_API_KEY ekleyin.");
  process.exit(0);
}

const args = ["push", zipPath, TARGET, "--userversion", VERSION];
const r = spawnSync("butler", args, { encoding: "utf8", env: { ...process.env } });
if (r.error && r.error.code === "ENOENT") {
  console.error("❌ `butler` bulunamadı. İndir: https://itch.io/docs/butler/");
  process.exit(1);
}
process.stdout.write(r.stdout || "");
process.stderr.write(r.stderr || "");
if (r.status !== 0) { console.error("❌ butler push başarısız (çıkış " + r.status + ")"); process.exit(1); }
console.log("✅ itch.io'ya yüklendi: " + TARGET + " (v" + VERSION + ")");
