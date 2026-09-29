#!/usr/bin/env node
/* ============================================================
   KARMA — tek dosyalık oyun üretici (build)
   index.html + css/* + js/* dosyalarını TEK bir HTML dosyasına
   gömer. Çıktı: KARMA-Oyun.html (harici CSS/JS gerektirmez).

   Kullanım:
     node tools/build-single.js [cikti-dosyasi]
   Varsayılan çıktı: ./KARMA-Oyun.html
   ============================================================ */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.resolve(process.argv[2] || path.join(ROOT, "KARMA-Oyun.html"));

/* v10.16 (P-1) — tembel veri katmanı.
   js/data/lazy.js kayıt defteri hangi dosyaların tembel olduğunu söyler.
   Bu dosyalar tek dosya build'ine <script type="application/json"> olarak
   gömülür: tarayıcı JSON bloklarını YORUMLAMAZ, içerik ihtiyaç anında
   JSON.parse edilir. Böylece 375 KB'lık veri için JS yürütme maliyeti
   tamamen kalkar ve JSON biçimi JS'ten daha küçüktür. */
const LAZY = require(path.join(ROOT, "js", "data", "lazy.js")).MAP;

/* veri dosyasını izole bir bağlamda çalıştırıp global değerini al.
   Regex ile JS ayrıştırmak kırılgan olurdu; gerçekten çalıştırıp
   JSON.stringify ediyoruz — çıktı her zaman geçerli JSON. */
function extractData(file, globalName) {
  const sandbox = { window: { K: {} } };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), "utf8"), sandbox, { filename: file });
  return sandbox.window.K[globalName];
}

/* JSON'u <script> içine güvenle göm: `</script>` dizisi bloğu kapatmasın */
function safeJson(value) {
  return JSON.stringify(value).replace(/<\//g, "<\\/");
}

function lazyBlocks() {
  let out = "", bytes = 0;
  Object.keys(LAZY).forEach((name) => {
    const rec = LAZY[name];
    const data = extractData(rec.src, rec.global);
    const json = safeJson(data);
    bytes += Buffer.byteLength(json);
    const n = data && typeof data === "object" ? Object.keys(data).length : 0;
    console.log(`   · ${name.padEnd(14)} ${(Buffer.byteLength(json) / 1024).toFixed(1)} KB JSON (${n} kayıt) → id="karma-lazy-${name}"`);
    out += `<script type="application/json" id="karma-lazy-${name}">${json}</script>\n`;
  });
  return { out, bytes };
}

/* ?v=10.5 gibi önbellek sorgularını dosya yolundan ayır */
function stripQuery(p) {
  return String(p || "").split("?")[0].split("#")[0];
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, stripQuery(rel)), "utf8");
}

let html = read("index.html");

// 1) Yerel CSS <link> etiketlerini <style> olarak göm
html = html.replace(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (m, href) => {
  if (/^https?:/i.test(href)) return m; // Google Fonts gibi harici linkler kalsın
  const css = read(href);
  return `<style>\n/* ==== ${stripQuery(href)} ==== */\n${css}\n</style>`;
});

// 2) Yerel <script src> etiketlerini satır içi <script> olarak göm
let lazyBytes = 0;
html = html.replace(/<script[^>]*src="([^"]+)"[^>]*>\s*<\/script>/g, (m, src) => {
  if (/^https?:/i.test(src)) return m;
  const js = read(src);
  /* lazy.js görüldüğünde: önce tembel veri blokları, sonra motorun kendisi */
  let prefix = "";
  if (/js\/data\/lazy\.js$/.test(stripQuery(src))) {
    const b = lazyBlocks();
    prefix = b.out;
    lazyBytes = b.bytes;
  }
  return `${prefix}<script>\n/* ==== ${stripQuery(src)} ==== */\n${js}\n</script>`;
});

// 3) Harici CSS/JS kalmadığını doğrula
const leftover = [];
(html.match(/<link[^>]*rel="stylesheet"[^>]*>/g) || []).forEach(t => {
  if (!/^https?:/i.test((t.match(/href="([^"]+)"/) || [])[1] || "")) leftover.push(t);
});
(html.match(/<script[^>]*src="[^"]+"[^>]*>/g) || []).forEach(t => {
  if (!/^https?:/i.test((t.match(/src="([^"]+)"/) || [])[1] || "")) leftover.push(t);
});
if (leftover.length) {
  console.error("HATA: Gömülemeyen yerel kaynaklar:\n" + leftover.join("\n"));
  process.exit(1);
}

fs.writeFileSync(OUT, html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
const total = Buffer.byteLength(html);
const sizeKB = (n) => (n / 1024).toFixed(1) + " KB";
console.log(`✅ Tek dosyalık oyun üretildi: ${OUT}`);
console.log(`   Toplam: ${kb} KB · harici bağımlılık: sadece Google Fonts (opsiyonel)`);
if (lazyBytes) {
  /* JS sürümü ile JSON sürümünün ham boyut karşılaştırması (P-1 kazancı) */
  let jsBytes = 0;
  Object.keys(LAZY).forEach((n) => { jsBytes += fs.statSync(path.join(ROOT, LAZY[n].src)).size; });
  console.log(`   Tembel veri: ${sizeKB(lazyBytes)} JSON ` +
    `(eşdeğeri ${sizeKB(jsBytes)} JS · ${(100 - (lazyBytes / jsBytes) * 100).toFixed(1)}% küçülme, ` +
    `yürütme maliyeti 0) · toplamın %${((lazyBytes / total) * 100).toFixed(0)}'ı`);
}

/* ------------------------------------------------------------
   v10.15 — ÖNBELLEK SÜRÜMÜ DENETİMİ (B-8)
   Tek dosya build önbellek sürümüne ihtiyaç duymaz (her şey gömülü),
   ama MODÜLER sürüm (GitHub Pages'in sunduğu index.html) duyar.
   Burada uyarıyoruz: index.html elle artırılan bir sürüm taşıyorsa
   ve içerik ondan sonra değişmişse oyuncular eski kodu çalıştırır.
   ------------------------------------------------------------ */
try {
  const { readStampedVersion, computeVersion } = require("./cache-version.js");
  const stamped = readStampedVersion(read("index.html"));
  const { version, fileCount } = computeVersion(ROOT);
  if (stamped !== version) {
    console.warn("\n⚠️  ÖNBELLEK SÜRÜMÜ BAYAT — modüler sürüm eski kodu servis eder");
    console.warn(`   index.html ?v=${stamped} · içerik hash'i ?v=${version}  (${fileCount} yerel dosya)`);
    console.warn("   Düzelt: node tools/bump-cache.js\n");
  } else {
    console.log(`   Önbellek sürümü: v=${version} (güncel · ${fileCount} yerel dosya)`);
  }
} catch (e) {
  console.warn("   (önbellek denetimi atlandı: " + e.message + ")");
}
