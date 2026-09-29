#!/usr/bin/env node
/* ============================================================
   KARMA — tools/release.js   (v10.18)

   TEK KOMUTLUK YAYIN RİTÜELİ.

   Eskiden her yayın üç elle adımdı ve biri unutulabiliyordu:
     1) önbellek sürümünü artır  (?v=…)
     2) tek dosya build üret
     3) build'i commit'le
   Unutulması, "kod değişti ama oyuncuda değişmedi" hatasına yol açıyordu.

   Kullanım:
     node tools/release.js                 # yalnızca damgala + build
     node tools/release.js patch           # 10.18.0 → 10.18.1
     node tools/release.js minor           # 10.18.0 → 10.19.0
     node tools/release.js major           # 10.18.0 → 11.0.0
     node tools/release.js 10.20.0 --verify # açık sürüm + tam doğrulama
     node tools/release.js --verify        # sürümü değiştirme, sadece doğrula

   Ne yapar?
     · package.json ve js/version.js sürümünü aynı değere yazar
     · index.html'i içerik hash'i ile damgalar  (tools/bump-cache.js)
     · tek dosya build'i üretir                 (tools/build-single.js)
     · --verify verilirse tam doğrulama zincirini çalıştırır
       (tools/verify.js — 11 adım, ~2 dakika)
   ============================================================ */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const node = process.execPath;
const argv = process.argv.slice(2);
const DO_VERIFY = argv.includes("--verify");
const bumpArg = argv.find((a) => !a.startsWith("--"));

function sh(args, label) {
  const r = spawnSync(node, args, { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  const out = ((r.stdout || "") + (r.stderr || "")).trim();
  console.log((r.status === 0 ? "✅ " : "❌ ") + label);
  if (out) out.split("\n").forEach((l) => console.log("   " + l));
  return r.status === 0;
}

/* ---------- sürüm hesapla ---------- */
const pkgFile = path.join(ROOT, "package.json");
const verFile = path.join(ROOT, "js", "version.js");
let pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
const current = pkg.version || "0.0.0";

function nextVersion(cur, arg) {
  if (!arg) return cur;
  if (/^\d+\.\d+\.\d+$/.test(arg)) return arg;
  const [maj, min, pat] = cur.split(".").map((n) => parseInt(n, 10) || 0);
  if (arg === "major") return (maj + 1) + ".0.0";
  if (arg === "minor") return maj + "." + (min + 1) + ".0";
  if (arg === "patch") return maj + "." + min + "." + (pat + 1);
  console.error("❌ Geçersiz sürüm argümanı: " + arg + "\n   Kullanım: patch | minor | major | 10.20.0");
  process.exit(1);
}

const next = nextVersion(current, bumpArg);
const today = new Date().toISOString().slice(0, 10);

console.log("KARMA · YAYIN RİTÜELİ");
console.log("sürüm: " + current + (next !== current ? " → " + next : " (değişmiyor)") + "\n");

/* ---------- sürümü yaz ---------- */
if (next !== current) {
  pkg.version = next;
  fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + "\n");
  const v = fs.readFileSync(verFile, "utf8")
    .replace(/K\.VERSION = "[^"]*"/, 'K.VERSION = "' + next + '"')
    .replace(/K\.VERSION_DATE = "[^"]*"/, 'K.VERSION_DATE = "' + today + '"');
  fs.writeFileSync(verFile, v);
  console.log("✅ Sürüm yazıldı: package.json + js/version.js → " + next);
} else {
  /* sürüm değişmese bile tarih tazelensin */
  const v = fs.readFileSync(verFile, "utf8")
    .replace(/K\.VERSION_DATE = "[^"]*"/, 'K.VERSION_DATE = "' + today + '"');
  fs.writeFileSync(verFile, v);
  console.log("⏭  Sürüm aynı (" + current + "), yalnızca tarih tazelendi");
}
console.log("");

/* ---------- damgala + build ---------- */
let ok = sh(["tools/bump-cache.js"], "Önbellek sürümü damgalandı");
ok = sh(["tools/build-single.js"], "Tek dosya build üretildi") && ok;

/* ---------- doğrula ---------- */
if (DO_VERIFY) {
  console.log("");
  ok = sh(["tools/verify.js"], "Tam doğrulama (11 adım)") && ok;
} else {
  console.log("\nℹ  Tam doğrulama için:  node tools/verify.js   (veya --verify ekleyin)");
}

console.log("\n--------------------------------------------");
if (!ok) {
  console.log("❌ YAYIN HAZIR DEĞİL — yukarıdaki hataları giderin");
  process.exit(1);
}
console.log("✅ YAYIN HAZIR — sürüm " + next);
console.log("\nSon adım (elle):");
console.log("   git add -A && git commit -m \"v" + next + " — <özet>\"");
console.log("   git tag v" + next + " && git push --follow-tags");
