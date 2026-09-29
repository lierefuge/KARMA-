#!/usr/bin/env node
/* ============================================================
   KARMA — tools/bump-cache.js  (v10.15 · B-8)
   index.html içindeki yerel varlık sürümünü (?v=...) içerik
   hash'i ile damgalar. Ayrıntı: tools/cache-version.js
   ============================================================ */
const { bump, ROOT } = require("./cache-version.js");

const check = process.argv.includes("--check");
const r = bump(ROOT, { check });

if (!r.ok) { console.error("❌ " + r.error); process.exit(1); }

if (check) {
  if (r.stale) {
    console.error("❌ ÖNBELLEK SÜRÜMÜ BAYAT — index.html v=" + r.current + ", beklenen v=" + r.version);
    console.error("   Düzelt: node tools/bump-cache.js");
    process.exit(1);
  }
  console.log("✅ Önbellek sürümü güncel: v=" + r.version + " (" + r.fileCount + " dosya)");
} else if (r.changed) {
  console.log("✅ Damgalandı: v=" + (r.previous || "?") + " → v=" + r.version + " · " + r.changed + " referans");
} else {
  console.log("⏭  Sürüm zaten güncel: v=" + r.version);
}
