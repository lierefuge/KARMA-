/* ============================================================
   KARMA — tools/cache-version.js  (v10.15 · B-8)
   Önbellek (cache) sürümünü İÇERİK HASH'İNDEN üretir.

   Sorun neydi?
   ------------
   index.html içindeki ~100 yerel dosya referansı `?v=10.14` gibi ELLE
   artırılan bir numara taşıyordu. Bir güncellemede bu numara
   artırılmayı unutulursa tarayıcı eski JS/CSS'i önbellekten çalıştırır:
   kod değişir ama oyuncuda hiçbir şey değişmez. Teşhisi zor, etkisi
   büyük bir hata sınıfı.

   Çözüm
   -----
   Yerel css/ ve js/ dosyalarının içeriğinden kısa bir hash üretilir.
   İçerik değişmedikçe hash sabit kalır (gereksiz önbellek kaybı yok);
   herhangi bir dosya değişince hash değişir ve istemci yeni dosyayı
   kesin olarak indirir. Sürüm numarasını insan artık takip etmez.

   Kullanım:
     node tools/bump-cache.js          → index.html'i hash ile damgala
     node tools/bump-cache.js --check  → sadece kontrol et (yazmaz), 1 döner
   ============================================================ */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");

/* yerel varlıkları topla: css altındaki .css dosyaları +
   js altındaki tüm .js dosyaları (tools/ klasörü hariç) */
function collectAssets(root) {
  const out = [];
  const push = (dir, ext) => {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) return;
    const walk = (d) => {
      for (const name of fs.readdirSync(d).sort()) {
        const p = path.join(d, name);
        const st = fs.statSync(p);
        if (st.isDirectory()) walk(p);
        else if (name.endsWith(ext)) out.push(p);
      }
    };
    walk(abs);
  };
  push("css", ".css");
  push("js", ".js");
  return out.sort();
}

/* içerik hash'i: yol + içerik birleşiminin sha256'sı, ilk 8 hane */
function computeVersion(root) {
  const files = collectAssets(root || ROOT);
  const h = crypto.createHash("sha256");
  for (const f of files) {
    h.update(path.relative(root || ROOT, f).split(path.sep).join("/"));
    h.update("\0");
    h.update(fs.readFileSync(f));
    h.update("\0");
  }
  return {
    version: h.digest("hex").slice(0, 8),
    fileCount: files.length,
  };
}

/* index.html içindeki href/src "...?v=XXX" değerlerini oku */
function readStampedVersion(indexHtml) {
  const m = indexHtml.match(/[?&]v=([A-Za-z0-9._-]+)/);
  return m ? m[1] : null;
}

/* index.html'i damgala — yalnızca href/src içindeki ?v= değerleri.
   Düz metin/yorum içindeki "?v=" geçişlerine DOKUNMAZ. */
function stampIndexHtml(indexHtml, version) {
  let changed = 0;
  const re = /(\b(?:href|src)="[^"]*?[?&]v=)[A-Za-z0-9._-]+/g;
  const out = indexHtml.replace(re, (full, prefix) => {
    changed++;
    return prefix + version;
  });
  return { html: out, changed };
}

/* index.html'i okuyup gerekiyorsa günceller */
function bump(root, opts) {
  const base = root || ROOT;
  const indexFile = path.join(base, "index.html");
  if (!fs.existsSync(indexFile)) {
    return { ok: false, error: "index.html bulunamadı: " + indexFile };
  }
  const { version, fileCount } = computeVersion(base);
  const before = fs.readFileSync(indexFile, "utf8");
  const current = readStampedVersion(before);
  const stale = current !== version;

  if (!stale || (opts && opts.check)) {
    return { ok: true, stale, current, version, fileCount, changed: 0 };
  }
  const { html, changed } = stampIndexHtml(before, version);
  fs.writeFileSync(indexFile, html);
  return { ok: true, stale: false, previous: current, current: version, version, fileCount, changed };
}

module.exports = { computeVersion, stampIndexHtml, readStampedVersion, bump, collectAssets, ROOT };

/* ---- CLI ---- */
if (require.main === module) {
  const check = process.argv.includes("--check");
  const r = bump(ROOT, { check });
  if (!r.ok) { console.error("❌ " + r.error); process.exit(1); }
  if (check) {
    if (r.stale) {
      console.error(
        "❌ ÖNBELLEK SÜRÜMÜ BAYAT\n" +
        "   index.html : v=" + r.current + "\n" +
        "   beklenen   : v=" + r.version + "  (" + r.fileCount + " yerel dosya)\n" +
        "   Düzelt     : node tools/bump-cache.js"
      );
      process.exit(1);
    }
    console.log("✅ Önbellek sürümü güncel: v=" + r.version + " · " + r.fileCount + " dosya");
    process.exit(0);
  }
  if (r.changed) {
    console.log("✅ index.html damgalandı: v=" + (r.previous || "?") + " → v=" + r.version);
    console.log("   güncellenen referans: " + r.changed + " · taranan dosya: " + r.fileCount);
  } else {
    console.log("⏭  Değişiklik yok, sürüm zaten güncel: v=" + r.version);
  }
}
