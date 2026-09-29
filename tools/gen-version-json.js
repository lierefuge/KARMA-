#!/usr/bin/env node
/* ============================================================
   KARMA — tools/gen-version-json.js  (v10.19)
   version.json — GÜNCELLEME KONTROL NOKTASI

   Neden gerekli?
   --------------
   Önbellek hash'i (?v=…) tarayıcının ESKİ dosyayı kullanmasını
   engeller; ama açık kalmış bir sekmede oyuncu yine de eski sürümü
   çalıştırır. `version.json` statik ve küçüktür; Service Worker
   bunu ağdan okuyup çalışan K.VERSION ile karşılaştırır ve
   "yeni sürüm var" bildirimini gösterebilir.

   Çıktı örneği:
     { "version": "10.19.0", "cache": "7fb8ddc6",
       "date": "2026-09-29", "built": "2026-09-29T06:40:00.000Z" }

   Kullanım:
     node tools/gen-version-json.js
   ============================================================ */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

let cache = "";
try {
  cache = require("./cache-version.js").computeVersion(ROOT).version || "";
} catch (e) { cache = ""; }

let date = "";
try {
  const m = fs.readFileSync(path.join(ROOT, "js", "version.js"), "utf8")
    .match(/K\.VERSION_DATE\s*=\s*"([^"]*)"/);
  date = m ? m[1] : "";
} catch (e) { date = ""; }

const out = {
  version: pkg.version || "0.0.0",
  cache,
  date,
  built: new Date().toISOString()
};

const dest = path.join(ROOT, "version.json");
fs.writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");

/* sw.js içindeki önbellek adını da aynı sürüme damgala.
   Neden? Worker önbellek adı sabit kalırsa activate adımı eski
   önbelleği silmez ve oyuncu iki sürümü karışık çalıştırabilir. */
try {
  const swPath = path.join(ROOT, "sw.js");
  if (fs.existsSync(swPath)) {
    const sw = fs.readFileSync(swPath, "utf8");
    const patched = sw.replace(/const VERSION = "[^"]*";/, `const VERSION = "${out.version}";`);
    if (patched !== sw) {
      fs.writeFileSync(swPath, patched);
      console.log(`   sw.js sürümü damgalandı: ${out.version}`);
    }
  }
} catch (e) {
  console.warn("   sw.js damgalanamadı: " + e.message);
}

console.log(`✅ version.json yazıldı — sürüm ${out.version} · önbellek ${out.cache || "?"}`);
